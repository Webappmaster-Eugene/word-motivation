# tts-worker — Python 3.11 + torch CPU + Silero v4_ru.
#
# Почему не Alpine:
#   - PyTorch wheels собраны под glibc; под musl (Alpine) нужна компиляция из
#     исходников, что долго и ломко.
#   - Debian slim даёт совместимость + минимальный размер (~120 МБ базовый
#     python:3.11-slim).
#
# Почему модель НЕ скачиваем на build: вес ~60 МБ, перестройка контейнера при
# любом изменении кода — лишний трафик. Скачиваем при первом старте в volume
# `/models` (persistent), повторный старт уже не скачивает.
FROM python:3.11-slim AS base

# Минимальный набор рантайм-пакетов. torch дистрибутив самодостаточен, но
# requests (torch.hub download) требует ssl-сертификатов.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TORCH_HOME=/models \
    TTS_MODEL_PATH=/models/v4_ru.pt \
    TTS_TORCH_THREADS=4

WORKDIR /app

# Отдельный слой под requirements: кешируем установку torch (большой пакет)
# между билдами, если зависимости не менялись.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY main.py ./

# Создаём non-root пользователя и папку для модели.
RUN useradd -r -u 1001 -g root tts \
    && mkdir -p /models \
    && chown -R tts:root /models
USER tts

EXPOSE 5000

# Запуск через uvicorn. workers=1 — Silero держит модель в shared-памяти,
# несколько workers'ов = несколько копий модели в RAM (~60 МБ × N).
# Для CPU-only inference один worker с 4 threads эффективнее.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "1", "--timeout-keep-alive", "30"]
