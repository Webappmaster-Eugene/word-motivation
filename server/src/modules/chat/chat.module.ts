import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ModerationModule } from '../moderation/moderation.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { OpenRouterClient } from './openrouter.client';

@Module({
  imports: [AuthModule, ModerationModule],
  providers: [ChatService, OpenRouterClient],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
