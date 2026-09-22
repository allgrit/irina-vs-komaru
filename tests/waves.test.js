import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { planHour, budgetFor, availableTypes, speedFactor, queenHp, gapFor } from '../src/game/waves.js';
import { NIGHT, MOSQUITO_TYPES } from '../src/game/config.js';

test('бюджет растёт по часам и по ночам', () => {
  assert.ok(budgetFor(1, 1) > budgetFor(0, 1));
  assert.ok(budgetFor(0, 2) > budgetFor(0, 1));
  assert.ok(gapFor(6) < gapFor(0));
  assert.ok(gapFor(6) >= 0.6);
});

test('типы открываются по часу', () => {
  const h0 = availableTypes(0).map((t) => t.id);
  assert.deepEqual(h0, ['squeaker']);
  const h4 = availableTypes(4).map((t) => t.id);
  assert.ok(h4.includes('chameleon') && h4.includes('bomber') && !h4.includes('queen'));
});

test('план часа детерминирован по сиду и уважает границы', () => {
  const p1 = planHour(3, 1, createRng('s'));
  const p2 = planHour(3, 1, createRng('s'));
  assert.deepEqual(p1, p2);
  assert.ok(p1.length > 5);
  for (const s of p1) {
    assert.ok(s.t >= 0 && s.t < NIGHT.hourSeconds);
    assert.ok(MOSQUITO_TYPES[s.type]);
    if (s.type === 'gnat') assert.equal(s.count, 5);
  }
});

test('матка появляется только в часы боссов', () => {
  const rng = createRng(1);
  for (let h = 0; h < NIGHT.hours; h++) {
    const hasQueen = planHour(h, 1, rng).some((s) => s.type === 'queen');
    assert.equal(hasQueen, NIGHT.bossHours.includes(h), `hour ${h}`);
  }
});

test('перк «Плотные шторы» уменьшает число спавнов', () => {
  const a = planHour(5, 1, createRng(7)).length;
  const b = planHour(5, 1, createRng(7), { spawnMul: 0.5 }).length;
  assert.ok(b < a);
});

test('скорость и HP матки растут по ночам', () => {
  assert.ok(speedFactor(6, 3) > speedFactor(0, 1));
  assert.equal(queenHp(1), 12);
  assert.equal(queenHp(3), 20);
});
