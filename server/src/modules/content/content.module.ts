import { Module } from '@nestjs/common';

import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
