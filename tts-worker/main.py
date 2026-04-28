"""Silero TTS sidecar — мини-FastAPI-сервис.

Загружает модель `v4_ru` один раз при старте и отвечает на POST /synthesize
бинарным WAV. Не содержит бизнес-логики: без кеша, без auth, без rate-limit —
это всё делает NestJS.

Доступен только из docker-network (expose портов наружу не делаем в compose).
"""

from __future__ import annotations

import io
import logging
import os
import wave

import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

logging.basicConfig(
    level=os.environ.get("TTS_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("tts-worker")

MODEL_URL = "https://models.silero.ai/models/tts/ru/v4_ru.pt"
MODEL_PATH = os.environ.get("TTS_MODEL_PATH", "/models/v4_ru.pt")
# Список доступных голосов в модели v4_ru. Должен совпадать с zod-енумом на стороне NestJS.
ALLOWED_SPEAKERS = {"xenia", "kseniya", "baya", "aidar", "eugene"}
# Silero v4_ru поддерживает две частоты — 24000 и 48000. 24k достаточно для
# речи и даёт файлы вдвое меньше. 48k лучше для музыкальных нюансов, но
# для детской игры избыточен.
SAMPLE_RATE = 24_000
# torch.set_num_threads — критично для latency на CPU-only. Хотим параллельный
# inference на всех доступных ядрах контейнера. 4 — разумный потолок, дальше
# начинается overhead от синхронизации.
TORCH_THREADS = int(os.environ.get("TTS_TORCH_THREADS", "4"))


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=400)
    voice: str = Field(..., pattern=r"^(xenia|kseniya|baya|aidar|eugene)$")
    rate: float = Field(1.0, ge=0.5, le=1.5)


class ModelNotReadyError(RuntimeError):
    """Модель ещё не загрузилась (startup-хук не завершился или упал)."""


class SileroEngine:
    """Обёртка над Silero-моделью.

    Поток: модель не thread-safe для parallel inference → держим lock.
    Python GIL + `torch.inference_mode` гарантируют корректность, но явный lock
    надёжнее на случай добавления GPU или многопоточного uvicorn workers.
    """

    def __init__(self) -> None:
        import threading

        self._lock = threading.Lock()
        self._model: torch.nn.Module | None = None

    def load(self) -> None:
        torch.set_num_threads(TORCH_THREADS)

        if not os.path.exists(MODEL_PATH):
            log.info("Модель не найдена локально, скачиваю из %s", MODEL_URL)
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            torch.hub.download_url_to_file(MODEL_URL, MODEL_PATH, progress=False)

        log.info("Загружаю модель %s", MODEL_PATH)
        device = torch.device("cpu")
        model = torch.package.PackageImporter(MODEL_PATH).load_pickle("tts_models", "model")
        model.to(device)
        self._model = model
        log.info("Модель готова, voices=%s, sample_rate=%d", sorted(ALLOWED_SPEAKERS), SAMPLE_RATE)

    def is_ready(self) -> bool:
        return self._model is not None

    def synthesize(self, text: str, voice: str, rate: float) -> np.ndarray:
        if self._model is None:
            # Модель ещё грузится (или загрузка упала). Вызывающему различим
            # этот случай от «внутренней ошибки» по типу исключения.
            raise ModelNotReadyError("Модель ещё не загружена")
        if voice not in ALLOWED_SPEAKERS:
            raise ValueError(f"Неизвестный голос: {voice}")

        with self._lock:
            # Silero возвращает torch.Tensor с float32 samples в диапазоне [-1, 1].
            audio_tensor = self._model.apply_tts(
                text=text,
                speaker=voice,
                sample_rate=SAMPLE_RATE,
                put_accent=True,
                put_yo=True,
            )

        samples: np.ndarray = audio_tensor.cpu().numpy().astype(np.float32)

        # Resample по времени через линейную интерполяцию — меняет длительность
        # без изменения тона. Для значений rate ∈ [0.8, 1.2] качество деградирует
        # минимально; за пределами — заметно, но всё ещё разборчиво.
        if abs(rate - 1.0) > 1e-3:
            samples = self._time_scale(samples, rate)

        return samples

    @staticmethod
    def _time_scale(samples: np.ndarray, rate: float) -> np.ndarray:
        """Простое resample через линейную интерполяцию (rate > 1 → быстрее / короче)."""
        n_old = samples.shape[0]
        n_new = max(1, int(round(n_old / rate)))
        x_old = np.linspace(0.0, 1.0, n_old, endpoint=False, dtype=np.float64)
        x_new = np.linspace(0.0, 1.0, n_new, endpoint=False, dtype=np.float64)
        return np.interp(x_new, x_old, samples).astype(np.float32)


def samples_to_wav(samples: np.ndarray, sample_rate: int) -> bytes:
    """Конвертируем float32 samples [-1, 1] → PCM16 WAV bytes."""
    # Клипуем на всякий случай — если самплы вышли за [-1, 1], int16 overflow
    # превратит пиковые значения в треск.
    clipped = np.clip(samples, -1.0, 1.0)
    pcm = (clipped * 32_767.0).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)  # mono
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())
    return buffer.getvalue()


app = FastAPI(title="Baby-funner TTS worker", docs_url=None, redoc_url=None)
engine = SileroEngine()


@app.on_event("startup")
def _load_model() -> None:
    engine.load()


@app.get("/health")
def health() -> dict[str, str | bool]:
    # `loaded=False` означает, что uvicorn уже отвечает, но startup-хук ещё не
    # дозагрузил Silero. NestJS-вызывающий должен трактовать это как «не готов»
    # и (при автомате) временно уйти на fallback-TTS.
    return {"status": "ok", "loaded": engine.is_ready()}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest) -> Response:
    try:
        samples = engine.synthesize(req.text, req.voice, req.rate)
    except ModelNotReadyError as e:
        # 503 + Retry-After: NestJS/клиент поймёт как «временно недоступен»
        # и сделает fallback или retry через секунду.
        raise HTTPException(
            status_code=503,
            detail=str(e),
            headers={"Retry-After": "2"},
        ) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:  # pragma: no cover — крайний случай
        log.exception("Ошибка синтеза")
        raise HTTPException(status_code=500, detail=f"Ошибка синтеза: {e}") from e

    wav_bytes = samples_to_wav(samples, SAMPLE_RATE)
    return Response(content=wav_bytes, media_type="audio/wav")
