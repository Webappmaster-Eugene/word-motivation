import { Controller, Get, Query } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { ContentService } from './content.service';
import {
  listAnimalsQuerySchema,
  listWordsQuerySchema,
  type ListAnimalsQueryDto,
  type ListWordsQueryDto,
} from './dto/list-animals.schema';
import { AnimalPresenter } from './presenter/animal.presenter';
import { WordPresenter } from './presenter/word.presenter';

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('animals')
  async listAnimals(
    @Query(new ZodValidationPipe(listAnimalsQuerySchema)) query: ListAnimalsQueryDto,
  ): Promise<AnimalPresenter[]> {
    const items = await this.content.listAnimals(query);
    return AnimalPresenter.collection(items);
  }

  @Get('words')
  async listWords(
    @Query(new ZodValidationPipe(listWordsQuerySchema)) query: ListWordsQueryDto,
  ): Promise<WordPresenter[]> {
    const items = await this.content.listWords(query);
    return WordPresenter.collection(items);
  }
}
