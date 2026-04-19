import { Injectable } from '@nestjs/common';
import type { Biome, ContentAnimal, ContentWord } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

export interface ListAnimalsFilter {
  readonly minAge?: number;
  readonly biome?: Biome;
}

export interface ListWordsFilter {
  readonly minAge?: number;
  readonly animalId?: string;
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listAnimals(filter: ListAnimalsFilter = {}): Promise<ContentAnimal[]> {
    return this.prisma.contentAnimal.findMany({
      where: {
        ...(filter.minAge !== undefined ? { minAge: { lte: filter.minAge } } : {}),
        ...(filter.biome ? { biome: filter.biome } : {}),
      },
      orderBy: [{ biome: 'asc' }, { title: 'asc' }],
    });
  }

  listWords(filter: ListWordsFilter = {}): Promise<ContentWord[]> {
    return this.prisma.contentWord.findMany({
      where: {
        ...(filter.minAge !== undefined ? { minAge: { lte: filter.minAge } } : {}),
        ...(filter.animalId ? { animalId: filter.animalId } : {}),
      },
      orderBy: [{ minAge: 'asc' }, { word: 'asc' }],
    });
  }
}
