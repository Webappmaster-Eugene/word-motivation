import type { AlphabetContent, ContentRepo } from './types';

/**
 * Пытается получить контент из `primary` (обычно — backend).
 * Если падает по любой причине (network, API error, timeout) — возвращает
 * данные из `fallback` (локальный bundle), чтобы игра всегда запустилась.
 *
 * Коллбэк `onFallback` — для телеметрии/уведомления UI.
 */
export class ResilientContentRepo implements ContentRepo {
  constructor(
    private readonly primary: ContentRepo,
    private readonly fallback: ContentRepo,
    private readonly onFallback?: (err: unknown) => void,
  ) {}

  async getAlphabetContent(): Promise<AlphabetContent> {
    try {
      const result = await this.primary.getAlphabetContent();
      if (result.words.length === 0) {
        // Бэкенд без контента — тоже падаем на fallback, чтобы игра не зависла.
        this.onFallback?.(new Error('Бэкенд вернул пустой контент'));
        return this.fallback.getAlphabetContent();
      }
      return result;
    } catch (err) {
      this.onFallback?.(err);
      return this.fallback.getAlphabetContent();
    }
  }
}
