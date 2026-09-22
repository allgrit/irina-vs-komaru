import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScoring, registerKill, breakCombo, hourBonus, nightBonus, coinsForScore, comboFromStreak } from '../src/game/scoring.js';
import { MOSQUITO_TYPES } from '../src/game/config.js';

test('комбо растёт каждые 3 убийства до 10 и сбрасывается', () => {
  const s = createScoring();
  for (let i = 0; i < 3; i++) registerKill(s, MOSQUITO_TYPES.squeaker);
  assert.equal(s.combo, 2);
  assert.equal(s.score, 10 + 10 + 20);
  breakCombo(s);
  assert.equal(s.combo, 1);
  assert.equal(comboFromStreak(100), 10);
});

test('босс даёт очки без множителя и не двигает комбо', () => {
  const s = createScoring();
  for (let i = 0; i < 6; i++) registerKill(s, MOSQUITO_TYPES.squeaker);
  const before = s.combo;
  const gained = registerKill(s, MOSQUITO_TYPES.queen);
  assert.equal(gained, 500);
  assert.equal(s.combo, before);
  assert.equal(s.killsByType.queen, 1);
});

test('бонусы и монеты', () => {
  assert.equal(hourBonus(80), 400);
  assert.equal(hourBonus(150), 500);
  assert.equal(nightBonus(3), 600);
  assert.equal(coinsForScore(1234), 12);
});
