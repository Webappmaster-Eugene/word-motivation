import type { Biome, ContentAnimal, ContentLicense } from '@prisma/client';

export class AnimalPresenter {
  readonly id: string;
  readonly title: string;
  readonly biome: Biome;
  readonly emoji: string;
  readonly color: string;
  readonly glbUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly systemPrompt: string;
  readonly scriptedReplies: readonly string[];
  readonly license: ContentLicense;
  readonly attribution: string | null;
  readonly minAge: number;
  readonly version: number;

  constructor(animal: ContentAnimal) {
    this.id = animal.id;
    this.title = animal.title;
    this.biome = animal.biome;
    this.emoji = animal.emoji;
    this.color = animal.color;
    this.glbUrl = animal.glbUrl;
    this.thumbnailUrl = animal.thumbnailUrl;
    this.systemPrompt = animal.systemPrompt;
    // scriptedReplies — JSON колонка, кастим на string[] (предусматриваем defensive-default)
    this.scriptedReplies = Array.isArray(animal.scriptedReplies)
      ? (animal.scriptedReplies.filter(
          (x): x is string => typeof x === 'string',
        ) as readonly string[])
      : [];
    this.license = animal.license;
    this.attribution = animal.attribution;
    this.minAge = animal.minAge;
    this.version = animal.version;
  }

  static collection(animals: readonly ContentAnimal[]): AnimalPresenter[] {
    return animals.map((a) => new AnimalPresenter(a));
  }
}
