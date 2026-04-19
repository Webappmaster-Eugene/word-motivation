import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  childIdFromRequest,
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../auth/jwt-auth.guard';

import { ChatService } from './chat.service';
import { chatReplySchema, type ChatReplyDto } from './dto/chat-reply.schema';
import { ChatReplyPresenter } from './presenter/chat-reply.presenter';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  async reply(
    @Req() req: AuthenticatedRequest,
    @Body(new ZodValidationPipe(chatReplySchema)) body: ChatReplyDto,
  ): Promise<ChatReplyPresenter> {
    const childId = childIdFromRequest(req);
    const result = await this.chat.reply({
      childId,
      sessionId: body.sessionId,
      animalId: body.animalId,
      userText: body.userText,
      history: body.history,
    });
    return new ChatReplyPresenter(result);
  }
}
