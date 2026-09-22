import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, dailySeed, hashString } from '../src/core/rng.js';

test('одинаковый сид даёт одинаковую последовательность', () => {
  const a = createRng('daily-2026-09-22');
  const b = createRng('daily-2026-09-22');
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('разные сиды дают разные последовательности', () => {
  const a = createRng('x');
  const b = createRng('y');
  assert.notEqual(a.next(), b.next());
});

test('значения в [0,1), int в границах, weighted уважает нулевые веса', () => {
  const r = createRng(42);
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    const n = r.int(3, 5);
    assert.ok(n >= 3 && n <= 5);
    const w = r.weighted([{ id: 'a', weight: 0 }, { id: 'b', weight: 1 }]);
    assert.equal(w.id, 'b');
  }
});

test('dailySeed зависит от даты по UTC', () => {
  assert.equal(dailySeed(new Date(Date.UTC(2026, 8, 22, 23, 59))), 'daily-2026-09-22');
  assert.equal(dailySeed(new Date(Date.UTC(2026, 8, 23, 0, 1))), 'daily-2026-09-23');
});

test('hashString стабилен', () => {
  assert.equal(hashString('irina'), hashString('irina'));
  assert.notEqual(hashString('irina'), hashString('komar'));
});
