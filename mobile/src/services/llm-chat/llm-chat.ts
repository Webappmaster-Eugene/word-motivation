import type { ApiClient } from '@/services/api-client/api-client';
import type { DeviceAuthService } from '@/services/auth/device-auth-service';

export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryEntry {
  readonly role: ChatRole;
  readonly content: string;
}

export interface ChatReplyInput {
  readonly sessionId: string;
  readonly animalId: string;
  readonly userText: string;
  readonly history: readonly ChatHistoryEntry[];
}

export interface ChatReplyResponse {
  readonly reply: string;
  readonly source: 'llm' | 'scripted' | 'moderation-blocked';
  readonly moderated: boolean;
}

/**
 * Клиент к POST /chat. Сервер внутри выполняет модерацию, инъекцию system prompt
 * и обращение к OpenRouter. Здесь только HTTP-обёртка.
 */
export class LlmChatClient {
  constructor(
    private readonly api: ApiClient,
    private readonly auth: DeviceAuthService,
  ) {}

  async reply(input: ChatReplyInput): Promise<ChatReplyResponse> {
    const session = await this.auth.ensure();
    return this.api.request<ChatReplyResponse>({
      method: 'POST',
      path: '/chat',
      token: session.token,
      timeoutMs: 20_000,
      body: input,
    });
  }
}
