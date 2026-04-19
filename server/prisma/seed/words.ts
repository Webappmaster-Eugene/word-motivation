export interface WordSeed {
  readonly id: string;
  readonly word: string;
  readonly letters: readonly string[];
  readonly animalId: string;
  readonly letterHints: Readonly<Record<string, string>>;
  readonly minAge?: number;
}

/**
 * M5 seed — 15 слов под 15 животных. Покрывает:
 *  - повторные буквы в одном слове (а-а в «собака»),
 *  - все основные буквы,
 *  - спец-буквы Ы / Ь через «мышь», «рысь»,
 *  - букву Ё через «ёж».
 *  Расширение до ~40 слов — M6.
 */
export const WORD_SEED: readonly WordSeed[] = [
  {
    id: 'dog',
    word: 'собака',
    letters: ['с', 'о', 'б', 'а', 'к', 'а'],
    animalId: 'dog',
    letterHints: {
      с: 'Это буква С. С-с-с, как шипит змея.',
      о: 'Это буква О. Округлая, как обруч.',
      б: 'Это буква Б. Б-б-б, как бабушка.',
      а: 'Это буква А. А-а-а, как у врача.',
      к: 'Это буква К. К-к-к, как кашель.',
    },
  },
  {
    id: 'cat',
    word: 'кошка',
    letters: ['к', 'о', 'ш', 'к', 'а'],
    animalId: 'cat',
    letterHints: {
      к: 'Это буква К.',
      о: 'Это буква О.',
      ш: 'Это буква Ш. Ш-ш-ш, как ветер.',
      а: 'Это буква А.',
    },
  },
  {
    id: 'cow',
    word: 'корова',
    letters: ['к', 'о', 'р', 'о', 'в', 'а'],
    animalId: 'cow',
    letterHints: {
      р: 'Это буква Р. Р-р-р, как рычит тигр.',
      в: 'Это буква В. В-в-в, как рокот.',
    },
  },
  {
    id: 'horse',
    word: 'лошадь',
    letters: ['л', 'о', 'ш', 'а', 'д', 'ь'],
    animalId: 'horse',
    letterHints: {
      л: 'Это буква Л. Л-л-л, как песня.',
      д: 'Это буква Д. Д-д-д.',
      ь: 'Это мягкий знак. Он не звучит, но делает соседнюю букву мягче.',
    },
  },
  {
    id: 'bear',
    word: 'медведь',
    letters: ['м', 'е', 'д', 'в', 'е', 'д', 'ь'],
    animalId: 'bear',
    letterHints: {
      м: 'Это буква М. М-м-м, как мычит корова.',
      е: 'Это буква Е.',
      ь: 'Мягкий знак смягчает звук.',
    },
  },
  {
    id: 'fox',
    word: 'лиса',
    letters: ['л', 'и', 'с', 'а'],
    animalId: 'fox',
    letterHints: {
      и: 'Это буква И. И-и-и.',
    },
  },
  {
    id: 'hedgehog',
    word: 'ёж',
    letters: ['ё', 'ж'],
    animalId: 'hedgehog',
    letterHints: {
      ё: 'Это буква Ё. Ё-ё-ё.',
      ж: 'Это буква Ж. Ж-ж-ж, как жужжит пчела.',
    },
  },
  {
    id: 'lion',
    word: 'лев',
    letters: ['л', 'е', 'в'],
    animalId: 'lion',
    letterHints: {
      в: 'Это буква В.',
    },
  },
  {
    id: 'giraffe',
    word: 'жираф',
    letters: ['ж', 'и', 'р', 'а', 'ф'],
    animalId: 'giraffe',
    letterHints: {
      ф: 'Это буква Ф. Ф-ф-ф, как ветер через губы.',
    },
  },
  {
    id: 'zebra',
    word: 'зебра',
    letters: ['з', 'е', 'б', 'р', 'а'],
    animalId: 'zebra',
    letterHints: {
      з: 'Это буква З. З-з-з, как звенит комар.',
    },
  },
  {
    id: 'dolphin',
    word: 'дельфин',
    letters: ['д', 'е', 'л', 'ь', 'ф', 'и', 'н'],
    animalId: 'dolphin',
    letterHints: {
      н: 'Это буква Н. Н-н-н.',
      ь: 'Мягкий знак.',
    },
  },
  {
    id: 'mouse',
    word: 'мышь',
    letters: ['м', 'ы', 'ш', 'ь'],
    animalId: 'mouse',
    letterHints: {
      ы: 'Это буква Ы. Ы-ы-ы. Она прячется внутри слов.',
      ь: 'Мягкий знак.',
    },
  },
  {
    id: 'lynx',
    word: 'рысь',
    letters: ['р', 'ы', 'с', 'ь'],
    animalId: 'lynx',
    letterHints: {
      ы: 'Это буква Ы.',
    },
  },
  {
    id: 'tiger',
    word: 'тигр',
    letters: ['т', 'и', 'г', 'р'],
    animalId: 'tiger',
    letterHints: {
      т: 'Это буква Т. Т-т-т.',
      г: 'Это буква Г. Г-г-г.',
    },
  },
  {
    id: 'monkey',
    word: 'обезьяна',
    letters: ['о', 'б', 'е', 'з', 'ь', 'я', 'н', 'а'],
    animalId: 'monkey',
    letterHints: {
      я: 'Это буква Я. Как в «яблоке».',
      ь: 'Мягкий знак.',
    },
  },
  {
    id: 'penguin',
    word: 'пингвин',
    letters: ['п', 'и', 'н', 'г', 'в', 'и', 'н'],
    animalId: 'penguin',
    letterHints: {
      п: 'Это буква П. П-п-п.',
    },
  },

  // ── Ферма (дополнения) ────────────────────────────────────────────────
  {
    id: 'pig',
    word: 'свинья',
    letters: ['с', 'в', 'и', 'н', 'ь', 'я'],
    animalId: 'pig',
    letterHints: {
      ь: 'Мягкий знак — смягчает соседнюю букву.',
      я: 'Это буква Я. Как в «яблоке».',
    },
  },
  {
    id: 'duck',
    word: 'утка',
    letters: ['у', 'т', 'к', 'а'],
    animalId: 'duck',
    letterHints: {
      у: 'Это буква У. У-у-у.',
    },
  },
  {
    id: 'hamster',
    word: 'хомяк',
    letters: ['х', 'о', 'м', 'я', 'к'],
    animalId: 'hamster',
    letterHints: {
      х: 'Это буква Х. Х-х-х.',
    },
  },
  {
    id: 'chicken',
    word: 'курица',
    letters: ['к', 'у', 'р', 'и', 'ц', 'а'],
    animalId: 'chicken',
    letterHints: {
      ц: 'Это буква Ц. Ц-ц-ц.',
    },
  },

  // ── Лес (дополнения) ──────────────────────────────────────────────────
  {
    id: 'wolf',
    word: 'волк',
    letters: ['в', 'о', 'л', 'к'],
    animalId: 'wolf',
    letterHints: {
      в: 'Это буква В.',
    },
  },
  {
    id: 'owl',
    word: 'сова',
    letters: ['с', 'о', 'в', 'а'],
    animalId: 'owl',
    letterHints: {},
  },
  {
    id: 'hare',
    word: 'заяц',
    letters: ['з', 'а', 'я', 'ц'],
    animalId: 'hare',
    letterHints: {
      я: 'Это буква Я.',
    },
  },
  {
    id: 'squirrel',
    word: 'белка',
    letters: ['б', 'е', 'л', 'к', 'а'],
    animalId: 'squirrel',
    letterHints: {},
  },
  {
    id: 'badger',
    word: 'барсук',
    letters: ['б', 'а', 'р', 'с', 'у', 'к'],
    animalId: 'badger',
    letterHints: {},
  },
  {
    id: 'raccoon',
    word: 'енот',
    letters: ['е', 'н', 'о', 'т'],
    animalId: 'raccoon',
    letterHints: {
      е: 'Это буква Е.',
    },
  },
  {
    id: 'woodpecker',
    word: 'дятел',
    letters: ['д', 'я', 'т', 'е', 'л'],
    animalId: 'woodpecker',
    letterHints: {},
  },
  {
    id: 'stork',
    word: 'аист',
    letters: ['а', 'и', 'с', 'т'],
    animalId: 'stork',
    letterHints: {
      а: 'Это буква А.',
    },
  },
  {
    id: 'snake',
    word: 'змея',
    letters: ['з', 'м', 'е', 'я'],
    animalId: 'snake',
    letterHints: {},
  },

  // ── Саванна (дополнения) ──────────────────────────────────────────────
  {
    id: 'elephant',
    word: 'слон',
    letters: ['с', 'л', 'о', 'н'],
    animalId: 'elephant',
    letterHints: {},
  },
  {
    id: 'cheetah',
    word: 'гепард',
    letters: ['г', 'е', 'п', 'а', 'р', 'д'],
    animalId: 'cheetah',
    letterHints: {
      г: 'Это буква Г. Г-г-г.',
    },
  },
  {
    id: 'rhino',
    word: 'носорог',
    letters: ['н', 'о', 'с', 'о', 'р', 'о', 'г'],
    animalId: 'rhino',
    letterHints: {
      н: 'Это буква Н.',
    },
  },
  {
    id: 'antelope',
    word: 'антилопа',
    letters: ['а', 'н', 'т', 'и', 'л', 'о', 'п', 'а'],
    animalId: 'antelope',
    letterHints: {},
  },
  {
    id: 'camel',
    word: 'верблюд',
    letters: ['в', 'е', 'р', 'б', 'л', 'ю', 'д'],
    animalId: 'camel',
    letterHints: {
      ю: 'Это буква Ю. Как в «юла».',
    },
  },
  {
    id: 'ostrich',
    word: 'страус',
    letters: ['с', 'т', 'р', 'а', 'у', 'с'],
    animalId: 'ostrich',
    letterHints: {},
  },

  // ── Море (дополнения) ────────────────────────────────────────────────
  {
    id: 'shark',
    word: 'акула',
    letters: ['а', 'к', 'у', 'л', 'а'],
    animalId: 'shark',
    letterHints: {},
  },
  {
    id: 'octopus',
    word: 'осьминог',
    letters: ['о', 'с', 'ь', 'м', 'и', 'н', 'о', 'г'],
    animalId: 'octopus',
    letterHints: {
      ь: 'Мягкий знак.',
    },
  },
  {
    id: 'whale',
    word: 'кит',
    letters: ['к', 'и', 'т'],
    animalId: 'whale',
    letterHints: {},
  },
  {
    id: 'turtle',
    word: 'черепаха',
    letters: ['ч', 'е', 'р', 'е', 'п', 'а', 'х', 'а'],
    animalId: 'turtle',
    letterHints: {
      ч: 'Это буква Ч. Ч-ч-ч.',
    },
  },
  {
    id: 'crab',
    word: 'краб',
    letters: ['к', 'р', 'а', 'б'],
    animalId: 'crab',
    letterHints: {},
  },
  {
    id: 'flamingo',
    word: 'фламинго',
    letters: ['ф', 'л', 'а', 'м', 'и', 'н', 'г', 'о'],
    animalId: 'flamingo',
    letterHints: {
      ф: 'Это буква Ф.',
    },
  },
  {
    id: 'seal',
    word: 'тюлень',
    letters: ['т', 'ю', 'л', 'е', 'н', 'ь'],
    animalId: 'seal',
    letterHints: {
      ю: 'Это буква Ю.',
      ь: 'Мягкий знак.',
    },
  },
  {
    id: 'polar-bear',
    word: 'морж',
    letters: ['м', 'о', 'р', 'ж'],
    animalId: 'polar-bear',
    letterHints: {},
  },

  // ── Джунгли (дополнения) ─────────────────────────────────────────────
  {
    id: 'iguana',
    word: 'игуана',
    letters: ['и', 'г', 'у', 'а', 'н', 'а'],
    animalId: 'iguana',
    letterHints: {
      и: 'Это буква И.',
    },
  },
  {
    id: 'parrot',
    word: 'попугай',
    letters: ['п', 'о', 'п', 'у', 'г', 'а', 'й'],
    animalId: 'parrot',
    letterHints: {
      й: 'Это буква Й. Помогает сделать «й»-звук.',
    },
  },
  {
    id: 'crocodile',
    word: 'крокодил',
    letters: ['к', 'р', 'о', 'к', 'о', 'д', 'и', 'л'],
    animalId: 'crocodile',
    letterHints: {},
  },
  {
    id: 'chameleon',
    word: 'хамелеон',
    letters: ['х', 'а', 'м', 'е', 'л', 'е', 'о', 'н'],
    animalId: 'chameleon',
    letterHints: {},
  },
  {
    id: 'toucan',
    word: 'тукан',
    letters: ['т', 'у', 'к', 'а', 'н'],
    animalId: 'toucan',
    letterHints: {},
  },
  {
    id: 'dinosaur',
    word: 'динозавр',
    letters: ['д', 'и', 'н', 'о', 'з', 'а', 'в', 'р'],
    animalId: 'dinosaur',
    letterHints: {},
  },
  {
    id: 'lizard',
    word: 'ящерица',
    letters: ['я', 'щ', 'е', 'р', 'и', 'ц', 'а'],
    animalId: 'lizard',
    letterHints: {
      щ: 'Это буква Щ. Щ-щ-щ, как щенок.',
    },
  },
  {
    id: 'pike',
    word: 'щука',
    letters: ['щ', 'у', 'к', 'а'],
    animalId: 'pike',
    letterHints: {
      щ: 'Это буква Щ.',
    },
  },
  {
    id: 'emu',
    word: 'эму',
    letters: ['э', 'м', 'у'],
    animalId: 'emu',
    letterHints: {
      э: 'Это буква Э. Э-э-э.',
    },
  },
  {
    id: 'bumblebee',
    word: 'шмель',
    letters: ['ш', 'м', 'е', 'л', 'ь'],
    animalId: 'bumblebee',
    letterHints: {},
  },
];
