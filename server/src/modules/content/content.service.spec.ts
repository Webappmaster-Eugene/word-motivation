import { Test } from '@nestjs/testing';

import { PrismaService } from '../../common/prisma/prisma.service';

import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;
  let animalFindMany: jest.Mock;
  let wordFindMany: jest.Mock;

  beforeEach(async () => {
    animalFindMany = jest.fn().mockResolvedValue([]);
    wordFindMany = jest.fn().mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: {
            contentAnimal: { findMany: animalFindMany },
            contentWord: { findMany: wordFindMany },
          },
        },
      ],
    }).compile();
    service = module.get(ContentService);
  });

  it('listAnimals без фильтра — просто orderBy', async () => {
    await service.listAnimals();
    expect(animalFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ biome: 'asc' }, { title: 'asc' }],
    });
  });

  it('listAnimals фильтрует minAge и biome', async () => {
    await service.listAnimals({ minAge: 8, biome: 'FOREST' });
    const args = animalFindMany.mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ minAge: { lte: 8 }, biome: 'FOREST' });
  });

  it('listWords фильтрует по animalId', async () => {
    await service.listWords({ animalId: 'dog' });
    const args = wordFindMany.mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ animalId: 'dog' });
  });
});
