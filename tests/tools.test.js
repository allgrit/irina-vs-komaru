import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { createMosquito } from '../src/game/mosquitoes.js';
import { circleHits, segmentHits, clipSegment, clapRadius, palmRadius, createToolState, tickTools, canUse, startCooldown } from '../src/game/tools.js';
import { TOOLS } from '../src/game/config.js';

const rng = createRng(1);
const mk = (id, x, y) => createMosquito(id, { x, y }, rng);

test('хлопок задевает комаров в радиусе с учётом их хитбокса', () => {
  const list = [mk('squeaker', 100, 100), mk('squeaker', 140, 100), mk('bomber', 145, 100)];
  const hits = circleHits(list, 100, 100, 28);
  assert.equal(hits.length, 1);
  const hits2 = circleHits(list, 120, 100, 28);
  // 140−120=20 ≤ 28+9; 145−120=25 ≤ 28+14
  assert.equal(hits2.length, 3);
});

test('спрятавшуюся матку не задеть', () => {
  const q = mk('queen', 100, 100);
  q.state = 'hide';
  assert.equal(circleHits([q], 100, 100, 50).length, 0);
});

test('мухобойка бьёт вдоль линии, обрезанной по длине', () => {
  const seg = clipSegment(0, 0, 1000, 0, 260);
  assert.equal(seg.bx, 260);
  const list = [mk('squeaker', 100, 5), mk('squeaker', 100, 40), mk('squeaker', 500, 0)];
  const hits = segmentHits(list, seg.ax, seg.ay, seg.bx, seg.by, 11);
  assert.deepEqual(hits.map((m) => m.x), [100]);
});

test('радиус хлопка растёт с зарядом и перком', () => {
  assert.equal(clapRadius(0), 30);
  assert.equal(clapRadius(5), 90);
  assert.ok(clapRadius(0.4) > 30 && clapRadius(0.4) < 90);
  assert.equal(palmRadius({ radiusMul: 1.4 }), 28 * 1.4);
  assert.equal(palmRadius({ reflexBoost: true }), 56);
  // тач-помощь прибавляется после множителей
  assert.equal(palmRadius({ radiusMul: 2, touchRadius: 10 }), 66);
  assert.equal(clapRadius(0, { touchRadius: 10 }), 40);
});

test('кулдауны, батарея и заряды', () => {
  const st = createToolState(['swatter', 'racket', 'spray']);
  assert.ok(canUse(st, 'swatter'));
  startCooldown(st, 'swatter');
  assert.ok(!canUse(st, 'swatter'));
  tickTools(st, 2);
  assert.ok(canUse(st, 'swatter'));
  // кофе ускоряет кулдаун
  startCooldown(st, 'swatter', { cooldownMul: 0.5 });
  assert.equal(st.swatter.cooldown, 0.75);
  // батарея садится при удержании и восстанавливается
  st.racket.active = true;
  tickTools(st, 3.5);
  assert.equal(st.racket.battery, 0);
  assert.equal(st.racket.active, false);
  assert.ok(!canUse(st, 'racket'));
  tickTools(st, TOOLS.racket.recharge);
  assert.ok(Math.abs(st.racket.battery - TOOLS.racket.battery) < 1e-6);
  // заряды спрея
  st.spray.charges = 0;
  assert.ok(!canUse(st, 'spray'));
});
