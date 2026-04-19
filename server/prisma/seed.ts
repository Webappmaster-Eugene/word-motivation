import { PrismaClient } from '@prisma/client';

import { ANIMAL_SEED } from './seed/animals';
import { WORD_SEED } from './seed/words';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const animal of ANIMAL_SEED) {
    await prisma.contentAnimal.upsert({
      where: { id: animal.id },
      update: {
        title: animal.title,
        biome: animal.biome,
        emoji: animal.emoji,
        color: animal.color,
        systemPrompt: animal.systemPrompt,
        scriptedReplies: [...animal.scriptedReplies],
        license: animal.license,
        attribution: animal.attribution ?? null,
        minAge: animal.minAge ?? 6,
      },
      create: {
        id: animal.id,
        title: animal.title,
        biome: animal.biome,
        emoji: animal.emoji,
        color: animal.color,
        systemPrompt: animal.systemPrompt,
        scriptedReplies: [...animal.scriptedReplies],
        license: animal.license,
        attribution: animal.attribution ?? null,
        minAge: animal.minAge ?? 6,
      },
    });
  }

  for (const word of WORD_SEED) {
    await prisma.contentWord.upsert({
      where: { id: word.id },
      update: {
        word: word.word,
        letters: [...word.letters],
        animalId: word.animalId,
        letterHints: { ...word.letterHints },
        minAge: word.minAge ?? 6,
      },
      create: {
        id: word.id,
        word: word.word,
        letters: [...word.letters],
        animalId: word.animalId,
        letterHints: { ...word.letterHints },
        minAge: word.minAge ?? 6,
      },
    });
  }

  const animalsCount = await prisma.contentAnimal.count();
  const wordsCount = await prisma.contentWord.count();
  // eslint-disable-next-line no-console
  console.log(`Сид выполнен. Животных в БД: ${animalsCount}, слов: ${wordsCount}.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Ошибка сида:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
