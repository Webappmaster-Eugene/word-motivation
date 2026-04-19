import { createActor } from 'xstate';

import { WORD_PACK } from '../../content/words';
import { alphabetMachine } from '../machine';
import type { AlphabetStateValue } from '../types';

function spawn(wordIndex = 0) {
  const actor = createActor(alphabetMachine, { input: { wordIndex } });
  actor.start();
  return actor;
}

function state(actor: ReturnType<typeof spawn>): AlphabetStateValue {
  return actor.getSnapshot().value as AlphabetStateValue;
}

function ctx(actor: ReturnType<typeof spawn>) {
  return actor.getSnapshot().context;
}

/**
 * Проигрывает happy-path по всем буквам слова и по самому слову.
 * Возвращает actor на этапе revealAnimal.
 */
function playThroughWord(actor: ReturnType<typeof spawn>, targetWord = WORD_PACK[0]!) {
  actor.send({ type: 'START' });
  for (const letter of targetWord.letters) {
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: letter });
  }
  actor.send({ type: 'LETTER_SHOWN' });
  actor.send({ type: 'SUBMIT_WORD', value: targetWord.word });
  return actor;
}

describe('alphabetMachine', () => {
  it('стартует в idle', () => {
    const actor = spawn();
    expect(state(actor)).toBe('idle');
  });

  it('через START переходит в loadingWord и дальше в showLetter', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    expect(state(actor)).toBe('showLetter');
    expect(ctx(actor).letterIndex).toBe(0);
    expect(ctx(actor).mode).toBe('normal');
  });

  it('LETTER_SHOWN переводит в listenLetter', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });
    expect(state(actor)).toBe('listenLetter');
  });

  it('правильная буква увеличивает letterIndex и correct-счётчик', () => {
    const actor = spawn(); // слово «собака»
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'с' });

    expect(state(actor)).toBe('showLetter');
    expect(ctx(actor).letterIndex).toBe(1);
    expect(ctx(actor).stats.correct).toBe(1);
  });

  it('неправильная буква уходит в hintLetter и увеличивает retry', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'я' });

    expect(state(actor)).toBe('hintLetter');
    expect(ctx(actor).letterRetries).toBe(1);
    expect(ctx(actor).stats.wrong).toBe(1);
  });

  it('HINT_DONE возвращает из hintLetter в listenLetter', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'я' });
    actor.send({ type: 'HINT_DONE' });
    expect(state(actor)).toBe('listenLetter');
  });

  it('fail-soft: после 3 ошибок буква автопродвигается', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });

    actor.send({ type: 'SUBMIT_LETTER', value: 'я' }); // wrong 1 → hint
    actor.send({ type: 'HINT_DONE' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'я' }); // wrong 2 → hint
    actor.send({ type: 'HINT_DONE' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'я' }); // wrong 3 → auto-advance

    expect(state(actor)).toBe('showLetter');
    expect(ctx(actor).letterIndex).toBe(1);
    expect(ctx(actor).stats.autoAdvanced).toBe(1);
    expect(ctx(actor).stats.wrong).toBe(3);
  });

  it('happy path по всем буквам «собаки» приводит к showWord', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    for (const letter of ['с', 'о', 'б', 'а', 'к', 'а']) {
      actor.send({ type: 'LETTER_SHOWN' });
      actor.send({ type: 'SUBMIT_LETTER', value: letter });
    }
    expect(state(actor)).toBe('showWord');
    expect(ctx(actor).stats.correct).toBe(6);
  });

  it('полный цикл «собака» → revealAnimal', () => {
    const actor = spawn();
    playThroughWord(actor, WORD_PACK[0]!);
    expect(state(actor)).toBe('revealAnimal');
  });

  it('SCENE_READY → sceneReady → EXIT_CONVERSATION → done; done продвигает wordIndex', () => {
    const actor = spawn();
    playThroughWord(actor, WORD_PACK[0]!);
    actor.send({ type: 'SCENE_READY' });
    expect(state(actor)).toBe('sceneReady');
    actor.send({ type: 'EXIT_CONVERSATION' });
    expect(state(actor)).toBe('done');
    expect(ctx(actor).wordIndex).toBe(1);
  });

  it('после done → START запускает следующее слово', () => {
    const actor = spawn();
    playThroughWord(actor, WORD_PACK[0]!);
    actor.send({ type: 'SCENE_READY' });
    actor.send({ type: 'EXIT_CONVERSATION' });
    actor.send({ type: 'START' });

    expect(state(actor)).toBe('showLetter');
    expect(ctx(actor).wordIndex).toBe(1);
    expect(ctx(actor).letterIndex).toBe(0);
  });

  it('цикл wordIndex после последнего слова возвращается в 0', () => {
    const actor = spawn(WORD_PACK.length - 1);
    playThroughWord(actor, WORD_PACK[WORD_PACK.length - 1]!);
    actor.send({ type: 'SCENE_READY' });
    actor.send({ type: 'EXIT_CONVERSATION' });
    expect(ctx(actor).wordIndex).toBe(0);
  });

  it('mode = letter_inside_word для Ы в слове «мышь» (позиция 1)', () => {
    // мышь: м ы ш ь — индексы 0,1,2,3
    const mouseIndex = WORD_PACK.findIndex((w) => w.id === 'mouse');
    expect(mouseIndex).toBeGreaterThan(-1);

    const actor = spawn(mouseIndex);
    actor.send({ type: 'START' });
    expect(ctx(actor).mode).toBe('normal'); // М — обычный режим

    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'м' });
    expect(ctx(actor).mode).toBe('letter_inside_word'); // Ы — специальный
    expect(ctx(actor).letterIndex).toBe(1);

    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'ы' });
    expect(ctx(actor).mode).toBe('normal'); // Ш — обычный
  });

  it('mode = letter_inside_word для Ь (последняя буква «мышь»)', () => {
    const mouseIndex = WORD_PACK.findIndex((w) => w.id === 'mouse');
    const actor = spawn(mouseIndex);
    actor.send({ type: 'START' });
    for (const letter of ['м', 'ы', 'ш']) {
      actor.send({ type: 'LETTER_SHOWN' });
      actor.send({ type: 'SUBMIT_LETTER', value: letter });
    }
    expect(ctx(actor).mode).toBe('letter_inside_word');
    expect(ctx(actor).letterIndex).toBe(3);
  });

  it('неправильное слово → hintWord → listenWord → retry', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    for (const letter of ['с', 'о', 'б', 'а', 'к', 'а']) {
      actor.send({ type: 'LETTER_SHOWN' });
      actor.send({ type: 'SUBMIT_LETTER', value: letter });
    }
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_WORD', value: 'кошка' });
    expect(state(actor)).toBe('hintWord');
    expect(ctx(actor).wordRetries).toBe(1);

    actor.send({ type: 'HINT_DONE' });
    actor.send({ type: 'SUBMIT_WORD', value: 'собака' });
    expect(state(actor)).toBe('revealAnimal');
  });

  it('fail-soft на уровне слова: 3 ошибки → revealAnimal с autoAdvanced', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    for (const letter of ['с', 'о', 'б', 'а', 'к', 'а']) {
      actor.send({ type: 'LETTER_SHOWN' });
      actor.send({ type: 'SUBMIT_LETTER', value: letter });
    }
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_WORD', value: 'xxx' });
    actor.send({ type: 'HINT_DONE' });
    actor.send({ type: 'SUBMIT_WORD', value: 'xxx' });
    actor.send({ type: 'HINT_DONE' });
    actor.send({ type: 'SUBMIT_WORD', value: 'xxx' });
    expect(state(actor)).toBe('revealAnimal');
    expect(ctx(actor).stats.autoAdvanced).toBe(1);
  });

  it('повторная буква «а» в «собаке» засчитывается каждый раз', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'с' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'о' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'б' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'а' });
    expect(ctx(actor).letterIndex).toBe(4); // на К
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'к' });
    actor.send({ type: 'LETTER_SHOWN' });
    actor.send({ type: 'SUBMIT_LETTER', value: 'а' });
    expect(state(actor)).toBe('showWord');
  });

  it('буква принимается с допуском Levenshtein ≤1 для многобуквенных — одиночные только точно', () => {
    const actor = spawn();
    actor.send({ type: 'START' });
    actor.send({ type: 'LETTER_SHOWN' });
    // «о» вместо «с» — расстояние >0, но мы сравниваем одиночные буквы → только точно
    actor.send({ type: 'SUBMIT_LETTER', value: 'о' });
    expect(state(actor)).toBe('hintLetter');
  });
});
