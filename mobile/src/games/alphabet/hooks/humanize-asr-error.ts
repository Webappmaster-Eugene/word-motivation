/**
 * Превращает сырую ошибку ASR (Web Speech API / нативный ASR) в дружелюбный
 * текст для ребёнка 6–12 лет. Ключи — стандартные коды Web Speech API:
 * https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error
 */
export function humanizeAsrError(raw: string): string {
  const key = raw.toLowerCase();
  if (key.includes('not-allowed') || key.includes('service-not-allowed')) {
    return 'Микрофон выключен. Попроси взрослого разрешить доступ.';
  }
  if (key.includes('no-speech')) {
    return 'Ничего не услышал. Давай попробуем ещё раз.';
  }
  if (key.includes('audio-capture')) {
    return 'Микрофон не работает. Можно отвечать кнопками.';
  }
  if (key.includes('network')) {
    return 'Нет интернета для микрофона. Пока отвечай кнопками.';
  }
  if (key.includes('language-not-supported') || key.includes('bad-grammar')) {
    return 'Микрофон не понимает по-русски. Отвечай кнопками.';
  }
  return 'Микрофон не услышал. Попробуй ещё раз или нажми кнопку.';
}
