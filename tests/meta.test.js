import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultMeta, canBuy, buy, unlockedTools, toolSlots, startingHearts, recordRun, startSleep } from '../src/game/meta.js';
import { createStorage } from '../src/core/storage.js';

test('лавка не продаёт без монет и уважает зависимости', () => {
  const meta = defaultMeta();
  assert.equal(canBuy(meta, 'tool_swatter').ok, false);
  meta.coins = 1000;
  assert.equal(canBuy(meta, 'slot4').ok, false);
  assert.ok(buy(meta, 'slot3'));
  assert.ok(buy(meta, 'slot4'));
  assert.equal(toolSlots(meta), 4);
  assert.equal(meta.coins, 400);
  assert.equal(buy(meta, 'slot3'), false);
  assert.ok(buy(meta, 'tool_swatter'));
  assert.deepEqual(unlockedTools(meta), ['palm', 'clap', 'swatter']);
});

test('сердца и стартовый сон', () => {
  const meta = defaultMeta();
  assert.equal(startingHearts(meta), 3);
  meta.unlocked.push('heart1', 'heart2', 'heart3', 'startsleep');
  assert.equal(startingHearts(meta), 6);
  assert.equal(startSleep(meta), 20);
});

test('запись забега открывает следующую ночь только при победе не в ежедневке', () => {
  const meta = defaultMeta();
  recordRun(meta, { kills: 10, score: 500, coins: 5, won: false, night: 1 });
  assert.equal(meta.bestNight, 1);
  recordRun(meta, { kills: 10, score: 900, coins: 9, won: true, night: 1, daily: true });
  assert.equal(meta.bestNight, 1);
  recordRun(meta, { kills: 10, score: 900, coins: 9, won: true, night: 1 });
  assert.equal(meta.bestNight, 2);
  assert.equal(meta.coins, 23);
  assert.equal(meta.stats.bestScore, 900);
});

test('storage: roundtrip и порченый JSON', () => {
  const be = new Map();
  const st = createStorage({ getItem: (k) => be.get(k) ?? null, setItem: (k, v) => be.set(k, v), removeItem: (k) => be.delete(k) });
  st.set('meta', { a: 1 });
  assert.deepEqual(st.get('meta'), { a: 1 });
  be.set('ivk.meta', '{oops');
  assert.deepEqual(st.get('meta', { b: 2 }), { b: 2 });
  st.remove('meta');
  assert.equal(st.get('meta'), null);
});
