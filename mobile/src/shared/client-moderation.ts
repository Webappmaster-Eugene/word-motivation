/**
 * Клиентский blocklist для «детской» санитизации.
 *
 * Зачем дублировать серверный `moderation.service.ts`? Потому что UI пишет
 * пользовательское сообщение в историю чата ДО ответа сервера — если дать
 * мату появиться в пузыре хотя бы на долю секунды, ребёнок его прочитает.
 *
 * Также фильтруем partial-transcript'ы микрофона, чтобы не показывать
 * сырой распознанный текст с матерной лексикой.
 *
 * Список короткий и осмысленный — для полной модерации остаётся серверная
 * логика, клиент работает как «первая линия защиты UI».
 */

const PROFANITY: readonly string[] = [
  'хуй',
  'хуя',
  'хуе',
  'пизд',
  'бля',
  'ебан',
  'ебат',
  'ебал',
  'еба',
  'сука',
  'мудак',
  'мудил',
  'гандон',
  'чмо',
  'педик',
  'пидор',
  'пидар',
  'говно',
  'жопа',
  'хер',
  'херн',
  'залуп',
];

const CHILD_RED_FLAGS: readonly string[] = [
  'адрес',
  'пароль',
  'номер телефон',
  'номер карт',
  'фамилия',
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е');
}

export interface ModerationResult {
  readonly clean: boolean;
  readonly flags: readonly string[];
}

export function checkText(text: string): ModerationResult {
  const n = normalise(text);
  const flags: string[] = [];
  for (const bad of PROFANITY) {
    if (n.includes(bad)) flags.push(`profanity:${bad}`);
  }
  for (const flag of CHILD_RED_FLAGS) {
    if (n.includes(flag)) flags.push(`child-safety:${flag}`);
  }
  return { clean: flags.length === 0, flags };
}

export const SAFE_USER_BUBBLE_PLACEHOLDER = 'Такие слова мы не повторяем 🙈';

/**
 * Возвращает безопасный текст для user-bubble: либо оригинал, либо заглушку.
 */
export function sanitizeUserMessage(text: string): {
  readonly safe: string;
  readonly clean: boolean;
} {
  const check = checkText(text);
  if (check.clean) return { safe: text, clean: true };
  return { safe: SAFE_USER_BUBBLE_PLACEHOLDER, clean: false };
}

/**
 * Для transcript-подсказки под MicButton: либо показываем, либо пусто.
 */
export function sanitizeTranscript(text: string): string {
  if (!text) return '';
  const check = checkText(text);
  if (!check.clean) return '';
  return text;
}
