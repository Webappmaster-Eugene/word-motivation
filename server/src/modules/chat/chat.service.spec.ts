import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../../common/prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';

import { ChatService } from './chat.service';
import { OpenRouterClient } from './openrouter.client';

describe('ChatService', () => {
  let svc: ChatService;
  let sessionFindUnique: jest.Mock;
  let animalFindUnique: jest.Mock;
  let chatCreate: jest.Mock;
  let complete: jest.Mock;

  beforeEach(async () => {
    sessionFindUnique = jest.fn();
    animalFindUnique = jest.fn();
    chatCreate = jest.fn().mockResolvedValue({});
    complete = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        ModerationService,
        {
          provide: PrismaService,
          useValue: {
            session: { findUnique: sessionFindUnique },
            contentAnimal: { findUnique: animalFindUnique },
            chatMessage: { create: chatCreate },
          },
        },
        {
          provide: OpenRouterClient,
          useValue: { complete },
        },
      ],
    }).compile();
    svc = module.get(ChatService);
  });

  function arrangeSession(childId = 'c1') {
    sessionFindUnique.mockResolvedValue({ id: 's1', childId });
  }
  function arrangeAnimal() {
    animalFindUnique.mockResolvedValue({
      id: 'dog',
      title: 'Собака',
      systemPrompt: 'Ты дружелюбная собака.',
      scriptedReplies: ['Гав-гав!', 'Я рада тебя видеть.'],
    });
  }

  it('бросает NotFoundException если сессия не принадлежит ребёнку', async () => {
    arrangeSession('other');
    await expect(
      svc.reply({
        childId: 'c1',
        sessionId: 's1',
        animalId: 'dog',
        userText: 'привет',
        history: [],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('при мате на входе → scripted + source=moderation-blocked', async () => {
    arrangeSession();
    arrangeAnimal();
    const result = await svc.reply({
      childId: 'c1',
      sessionId: 's1',
      animalId: 'dog',
      userText: 'привет блять',
      history: [],
    });
    expect(result.source).toBe('moderation-blocked');
    expect(['Гав-гав!', 'Я рада тебя видеть.']).toContain(result.reply);
    expect(complete).not.toHaveBeenCalled();
  });

  it('при LLM-ошибке падает на scripted', async () => {
    arrangeSession();
    arrangeAnimal();
    complete.mockRejectedValueOnce(new Error('503'));
    const result = await svc.reply({
      childId: 'c1',
      sessionId: 's1',
      animalId: 'dog',
      userText: 'Что ты любишь?',
      history: [],
    });
    expect(result.source).toBe('scripted');
    expect(['Гав-гав!', 'Я рада тебя видеть.']).toContain(result.reply);
  });

  it('успешный LLM-ответ с русским текстом проходит модерацию', async () => {
    arrangeSession();
    arrangeAnimal();
    complete.mockResolvedValueOnce('Я ем кашку и сухарики.');
    const result = await svc.reply({
      childId: 'c1',
      sessionId: 's1',
      animalId: 'dog',
      userText: 'Что ты ешь?',
      history: [],
    });
    expect(result.source).toBe('llm');
    expect(result.reply).toBe('Я ем кашку и сухарики.');
  });

  it('LLM-ответ на английском блокируется post-moderation', async () => {
    arrangeSession();
    arrangeAnimal();
    complete.mockResolvedValueOnce('I like treats and walks.');
    const result = await svc.reply({
      childId: 'c1',
      sessionId: 's1',
      animalId: 'dog',
      userText: 'Что ты любишь?',
      history: [],
    });
    expect(result.source).toBe('moderation-blocked');
    expect(result.moderationFlags.some((f) => f.startsWith('language'))).toBe(true);
  });

  it('история обрезается до последних 8 сообщений перед передачей в LLM', async () => {
    arrangeSession();
    arrangeAnimal();
    complete.mockResolvedValueOnce('Здорово!');
    const longHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `сообщение ${i}`,
    }));
    await svc.reply({
      childId: 'c1',
      sessionId: 's1',
      animalId: 'dog',
      userText: 'ещё',
      history: longHistory,
    });
    const passedMessages = complete.mock.calls[0]![0] as ReadonlyArray<{ role: string }>;
    // system + 8 history + 1 user = 10
    expect(passedMessages).toHaveLength(10);
    expect(passedMessages[0]!.role).toBe('system');
  });
});
