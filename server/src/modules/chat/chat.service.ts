import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ChatRole } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';

import { OpenRouterClient, type ChatMessage } from './openrouter.client';

export interface ChatHistoryEntry {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface ChatReplyInput {
  readonly childId: string;
  readonly sessionId: string;
  readonly animalId: string;
  readonly userText: string;
  readonly history: readonly ChatHistoryEntry[];
}

export interface ChatReplyResult {
  readonly reply: string;
  readonly source: 'llm' | 'scripted' | 'moderation-blocked';
  readonly moderationFlags: readonly string[];
}

const MAX_HISTORY_MESSAGES = 8;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly openrouter: OpenRouterClient,
  ) {}

  async reply(input: ChatReplyInput): Promise<ChatReplyResult> {
    await this.assertSessionOwnership(input.sessionId, input.childId);

    // 1. Проверяем вход — не пропускаем мат/попытки выманить персональные данные.
    const inputCheck = this.moderation.screenInput(input.userText);
    if (!inputCheck.allowed) {
      const scriptedReply = await this.fallbackReply(input.animalId, input.history.length);
      await this.logMessage(input, 'USER', input.userText, inputCheck.flags);
      await this.logMessage(input, 'ASSISTANT', scriptedReply, ['filtered-input']);
      return {
        reply: scriptedReply,
        source: 'moderation-blocked',
        moderationFlags: inputCheck.flags,
      };
    }

    const animal = await this.prisma.contentAnimal.findUnique({ where: { id: input.animalId } });
    if (!animal) {
      throw new NotFoundException('Животное не найдено');
    }

    // 2. Сохраняем входящее сообщение пользователя до вызова LLM.
    await this.logMessage(input, 'USER', input.userText, []);

    // 3. Формируем prompt: system + ограниченная история + новое сообщение.
    const systemPrompt = this.buildSystemPrompt(animal.systemPrompt);
    const trimmedHistory = input.history.slice(-MAX_HISTORY_MESSAGES).map<ChatMessage>((h) => ({
      role: h.role,
      content: h.content,
    }));

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: input.userText },
    ];

    // 4. Пытаемся получить LLM-ответ. При любой проблеме — scripted-фолбэк.
    let reply: string;
    let source: ChatReplyResult['source'] = 'llm';
    try {
      reply = await this.openrouter.complete(messages, { maxTokens: 200, temperature: 0.7 });
    } catch (err) {
      this.logger.warn(
        `LLM недоступен, фолбэк на scripted для ${input.animalId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      reply = await this.fallbackReply(input.animalId, input.history.length);
      source = 'scripted';
    }

    // 5. Пост-модерация ответа.
    const outputCheck = this.moderation.screenOutput(reply);
    if (!outputCheck.allowed) {
      const scripted = await this.fallbackReply(input.animalId, input.history.length);
      await this.logMessage(input, 'ASSISTANT', reply, ['filtered-output', ...outputCheck.flags]);
      return { reply: scripted, source: 'moderation-blocked', moderationFlags: outputCheck.flags };
    }

    await this.logMessage(input, 'ASSISTANT', reply, []);
    return { reply, source, moderationFlags: [] };
  }

  private async assertSessionOwnership(sessionId: string, childId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.childId !== childId) {
      throw new NotFoundException('Сессия не найдена');
    }
  }

  /**
   * Выбираем scripted-реплику так, чтобы она НЕ повторялась:
   *  - Первая реплика = greeting (индекс 0).
   *  - На каждый следующий ответ берём индекс `1 + (assistantMsgCount - 1) % (len - 1)`,
   *    т.е. циклически проходим по тематическим репликам.
   *  - Если scripted-реплик нет — возвращаем дежурное приветствие.
   *
   * `historyLength` = длина истории, которую прислал клиент. Используем её как
   * proxy для «сколько уже было обменов». У нас история содержит user+assistant
   * пары, так что деление на 2 даёт примерное число ассистентских сообщений.
   */
  private async fallbackReply(animalId: string, historyLength = 0): Promise<string> {
    const animal = await this.prisma.contentAnimal.findUnique({ where: { id: animalId } });
    if (!animal) return 'Давай поиграем!';
    const replies = Array.isArray(animal.scriptedReplies)
      ? (animal.scriptedReplies.filter(
          (s): s is string => typeof s === 'string',
        ) as readonly string[])
      : [];
    if (replies.length === 0) return `Привет! Я ${animal.title}.`;
    if (replies.length === 1) return replies[0]!;

    // `history` приходит от клиента БЕЗ текущего USER-сообщения (оно ещё не
    // в истории). Длина — это сколько user+assistant пар уже было до этого.
    // `Math.floor(historyLength / 2)` = порядковый номер будущего ответа ассистента.
    const assistantIndex = Math.floor(historyLength / 2);
    // Индекс 0 = greeting; ответы циклим по [1, len-1].
    const nonGreetingCount = replies.length - 1;
    const idx = 1 + (assistantIndex % nonGreetingCount);
    return replies[idx] ?? replies[0]!;
  }

  private buildSystemPrompt(animalPrompt: string): string {
    return [
      animalPrompt,
      'Общие правила:',
      '- Отвечай строго на русском языке.',
      '- Не более 30 слов.',
      '- Никаких жестоких, страшных или взрослых тем.',
      '- Если ребёнок спрашивает что-то не по теме — мягко переведи разговор на то, кто ты и как живёшь.',
      '- Не выдавай себя за человека, не проси персональных данных (имя, адрес, телефон).',
    ].join('\n');
  }

  private async logMessage(
    input: ChatReplyInput,
    role: ChatRole,
    content: string,
    flags: readonly string[],
  ): Promise<void> {
    try {
      await this.prisma.chatMessage.create({
        data: {
          sessionId: input.sessionId,
          animalId: input.animalId,
          role,
          content,
          moderationFlags: [...flags],
        },
      });
    } catch (err) {
      this.logger.warn(
        `Не удалось залогировать сообщение чата: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
