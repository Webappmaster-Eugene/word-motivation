import { Injectable } from '@nestjs/common';

/**
 * Простой in-memory blocklist для детского приложения.
 * Не замена настоящей модерации (API OpenAI Moderation или Perspective API),
 * но базовое защитное сито для M8 MVP.
 *
 * Все списки — lowercase, сверка после `toLowerCase().replace(/ё/g, 'е')`.
 */
const PROFANITY: readonly string[] = [
  // базовый русский blocklist, сокращён для безопасности лога
  'хуй',
  'хуя',
  'пизд',
  'бля',
  'ебан',
  'ебат',
  'ебал',
  'сука',
  'мудак',
  'мудил',
  'гандон',
  'чмо',
  'педик',
  'пидор',
  'говно',
  'жопа',
  // взрослые темы
  'секс',
  'порно',
  'насил',
  'убий',
  'террор',
];

const CHILD_RED_FLAGS: readonly string[] = [
  // флаги собирать персональные данные ребёнка — LLM не должен поощрять обмен
  'адрес',
  'пароль',
  'номер телефона',
  'номер карты',
  'фамилия',
];

export interface ModerationResult {
  readonly allowed: boolean;
  readonly flags: readonly string[];
}

@Injectable()
export class ModerationService {
  /** Проверка входа от пользователя — допускается дружеский тон. */
  screenInput(text: string): ModerationResult {
    const normalised = normalise(text);
    const flags: string[] = [];
    for (const bad of PROFANITY) {
      if (normalised.includes(bad)) flags.push(`profanity:${bad}`);
    }
    for (const flag of CHILD_RED_FLAGS) {
      if (normalised.includes(flag)) flags.push(`child-safety:${flag}`);
    }
    return { allowed: flags.length === 0, flags };
  }

  /** Проверка ответа LLM перед отправкой клиенту. */
  screenOutput(text: string): ModerationResult {
    const normalised = normalise(text);
    const flags: string[] = [];
    for (const bad of PROFANITY) {
      if (normalised.includes(bad)) flags.push(`profanity:${bad}`);
    }
    // дополнительно: длина и язык
    if (text.length > 800) flags.push('length:too-long');
    if (!/[а-яё]/i.test(text)) flags.push('language:no-russian');
    return { allowed: flags.length === 0, flags };
  }
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}
