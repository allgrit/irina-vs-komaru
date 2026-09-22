import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { PERKS, defaultMods, applyPerk, draftPerks } from '../src/game/perks.js';

test('перки меняют модификаторы, мгновенные — забег', () => {
  const m = defaultMods();
  applyPerk(m, 'deft');
  assert.equal(m.radiusMul, 1.4);
  applyPerk(m, 'coffee');
  assert.equal(m.cooldownMul, 0.6);
  assert.equal(m.sleepMul, 0.7);
  const run = { hearts: 2, maxHearts: 3 };
  applyPerk(m, 'second_wind', run);
  assert.equal(run.hearts, 4);
  assert.throws(() => applyPerk(m, 'nope'));
});

test('драфт даёт три разных карты без повторов и без чужих инструментов', () => {
  const rng = createRng(5);
  const cards = draftPerks(rng, ['deft'], ['palm', 'clap'], 3);
  assert.equal(cards.length, 3);
  assert.equal(new Set(cards.map((c) => c.id)).size, 3);
  assert.ok(!cards.some((c) => c.id === 'deft'));
  assert.ok(!cards.some((c) => c.requiresTool));
});

test('в первый час без «Опыта» только обычные перки', () => {
  for (let s = 0; s < 30; s++) {
    const cards = draftPerks(createRng(s), [], ['palm', 'clap'], 0);
    assert.ok(cards.every((c) => c.rarity === 'common'), `seed ${s}`);
  }
  let sawRare = false;
  for (let s = 0; s < 30; s++) {
    if (draftPerks(createRng(s), [], ['palm', 'clap'], 0, { rarePool: true }).some((c) => c.rarity !== 'common')) sawRare = true;
  }
  assert.ok(sawRare);
});

test('у всех перков уникальные id и есть текст', () => {
  assert.equal(new Set(PERKS.map((p) => p.id)).size, PERKS.length);
  for (const p of PERKS) assert.ok(p.name && p.desc && (p.apply || p.instant));
});
