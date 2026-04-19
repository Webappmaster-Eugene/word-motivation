import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/env.schema';

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface OpenRouterOptions {
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly signal?: AbortSignal;
}

interface ChatCompletionResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string };
  }>;
  readonly error?: { readonly message?: string };
}

@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger(OpenRouterClient.name);

  constructor(private readonly config: ConfigService<AppConfig>) {}

  /**
   * Вызов чат-комплишена OpenRouter-a. Non-streaming (M8 MVP).
   * При отсутствии ключа / сетевой ошибке / 5xx — бросает, вызывающий код
   * должен применить ScriptedReply-фолбэк.
   */
  async complete(messages: readonly ChatMessage[], opts: OpenRouterOptions = {}): Promise<string> {
    const apiKey = this.config.getOrThrow('OPENROUTER_API_KEY', { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException('OpenRouter ключ не настроен');
    }
    const baseUrl = this.config.getOrThrow('OPENROUTER_BASE_URL', { infer: true });
    const model = this.config.getOrThrow('OPENROUTER_MODEL', { infer: true });

    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://90games.app',
        'X-Title': '90games',
      },
      body: JSON.stringify({
        model,
        messages: [...messages],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 200,
      }),
      signal: opts.signal,
    });

    const text = await response.text();
    let payload: ChatCompletionResponse;
    try {
      payload = JSON.parse(text) as ChatCompletionResponse;
    } catch {
      this.logger.error(`OpenRouter вернул не-JSON (${response.status}): ${text.slice(0, 200)}`);
      throw new ServiceUnavailableException('Некорректный ответ OpenRouter');
    }

    if (!response.ok) {
      const message = payload.error?.message ?? `HTTP ${response.status}`;
      this.logger.warn(`OpenRouter ошибка: ${message}`);
      throw new ServiceUnavailableException(`OpenRouter ошибка: ${message}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content || content.trim().length === 0) {
      throw new ServiceUnavailableException('OpenRouter вернул пустой ответ');
    }
    return content.trim();
  }
}
