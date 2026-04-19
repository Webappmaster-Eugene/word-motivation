import type { ChatReplyResult } from '../chat.service';

export class ChatReplyPresenter {
  readonly reply: string;
  readonly source: 'llm' | 'scripted' | 'moderation-blocked';
  readonly moderated: boolean;

  constructor(result: ChatReplyResult) {
    this.reply = result.reply;
    this.source = result.source;
    this.moderated = result.source === 'moderation-blocked';
  }
}
