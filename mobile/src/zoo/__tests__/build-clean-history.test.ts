/**
 * Unit-тест helper'а, которым animal-detail-screen чистит историю перед
 * отправкой на сервер. Тестируем чистую функцию, а не сам экран.
 */

type Role = 'user' | 'assistant';
interface ChatMessage {
  readonly role: Role;
  readonly content: string;
  readonly sanitized?: boolean;
}

// Копия логики из animal-detail-screen.tsx — если там меняется, здесь тоже.
function buildCleanHistory(messages: readonly ChatMessage[]): Array<{
  role: Role;
  content: string;
}> {
  const out: Array<{ role: Role; content: string }> = [];
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i]!;
    if (m.sanitized) {
      const next = messages[i + 1];
      if (next && next.role === 'assistant') i += 1;
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

describe('buildCleanHistory', () => {
  it('пустая история → пустой массив', () => {
    expect(buildCleanHistory([])).toEqual([]);
  });

  it('чистые сообщения проходят как есть', () => {
    const msgs: ChatMessage[] = [
      { role: 'assistant', content: 'Гав!' },
      { role: 'user', content: 'Что ты ешь?' },
      { role: 'assistant', content: 'Косточки.' },
    ];
    expect(buildCleanHistory(msgs)).toHaveLength(3);
  });

  it('выбрасывает sanitized user + следующий assistant', () => {
    const msgs: ChatMessage[] = [
      { role: 'assistant', content: 'Гав!' },
      { role: 'user', content: 'Такие слова...', sanitized: true },
      { role: 'assistant', content: 'Хочешь косточку?' },
      { role: 'user', content: 'Привет' },
      { role: 'assistant', content: 'И тебе!' },
    ];
    const clean = buildCleanHistory(msgs);
    expect(clean).toEqual([
      { role: 'assistant', content: 'Гав!' },
      { role: 'user', content: 'Привет' },
      { role: 'assistant', content: 'И тебе!' },
    ]);
  });

  it('несколько sanitized подряд — все отфильтрованы', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'bad1', sanitized: true },
      { role: 'assistant', content: 'scripted1' },
      { role: 'user', content: 'bad2', sanitized: true },
      { role: 'assistant', content: 'scripted2' },
      { role: 'user', content: 'ok' },
      { role: 'assistant', content: 'ответ' },
    ];
    const clean = buildCleanHistory(msgs);
    expect(clean).toEqual([
      { role: 'user', content: 'ok' },
      { role: 'assistant', content: 'ответ' },
    ]);
  });

  it('sanitized в самом конце (ответ ещё не пришёл) — тоже убирается', () => {
    const msgs: ChatMessage[] = [
      { role: 'user', content: 'привет' },
      { role: 'assistant', content: 'привет!' },
      { role: 'user', content: 'bad', sanitized: true },
    ];
    expect(buildCleanHistory(msgs)).toEqual([
      { role: 'user', content: 'привет' },
      { role: 'assistant', content: 'привет!' },
    ]);
  });

  it('служебное поле sanitized не попадает в результат', () => {
    const msgs: ChatMessage[] = [{ role: 'user', content: 'hi' }];
    const r = buildCleanHistory(msgs);
    expect(r[0]).toEqual({ role: 'user', content: 'hi' });
    expect(Object.keys(r[0]!)).toEqual(['role', 'content']);
  });
});
