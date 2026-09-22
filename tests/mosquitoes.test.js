import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { createMosquito, updateMosquito, damageMosquito, visibleAlpha } from '../src/game/mosquitoes.js';
import { POINTS } from '../src/game/config.js';

function sim(m, seconds, envOver = {}) {
  const rng = createRng(3);
  const events = [];
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    updateMosquito(m, { dt, time: t, rng, hand: { x: 900, y: 500 }, lampOn: false, mods: {}, events, ...envOver });
  }
  return events;
}

test('пискун долетает до уха и кусает', () => {
  const m = createMosquito('squeaker', { x: 760, y: 190 }, createRng(1));
  const events = sim(m, 20);
  assert.ok(events.some((e) => e.kind === 'bite'), 'ожидался укус');
  assert.ok(['retreat', 'approach', 'buzzing'].includes(m.state));
});

test('беруши удлиняют время до укуса', () => {
  const a = createMosquito('squeaker', { x: 400, y: 300 }, createRng(1));
  a.state = 'buzzing';
  a.x = POINTS.ear.x;
  a.y = POINTS.ear.y;
  const evA = sim(a, 2.0);
  const b = createMosquito('squeaker', { x: 400, y: 300 }, createRng(1));
  b.state = 'buzzing';
  b.x = POINTS.ear.x;
  b.y = POINTS.ear.y;
  const evB = sim(b, 2.0, { mods: { buzzToBite: 2.5 } });
  assert.ok(evA.some((e) => e.kind === 'bite'));
  assert.ok(!evB.some((e) => e.kind === 'bite'));
});

test('лампа перехватывает цель: комар кружит у лампы и не кусает', () => {
  const m = createMosquito('squeaker', { x: 760, y: 190 }, createRng(1));
  const events = sim(m, 20, { lampOn: true });
  assert.ok(!events.some((e) => e.kind === 'bite'));
  assert.equal(m.state, 'orbit');
  assert.ok(Math.hypot(m.x - POINTS.lamp.x, m.y - POINTS.lamp.y) < 80);
});

test('стрелок уворачивается от руки', () => {
  const m = createMosquito('darter', { x: 500, y: 300 }, createRng(1));
  m.state = 'approach';
  m.stateT = 1;
  const rng = createRng(2);
  updateMosquito(m, { dt: 1 / 60, time: 0, rng, hand: { x: 510, y: 300 }, lampOn: false, mods: {}, events: [] });
  assert.equal(m.state, 'dodge');
});

test('урон и смерть; босс прячется после удара', () => {
  const m = createMosquito('bomber', { x: 0, y: 0 }, createRng(1));
  assert.equal(damageMosquito(m, 1), false);
  assert.equal(damageMosquito(m, 2), true);
  assert.equal(m.alive, false);
  const q = createMosquito('queen', { x: 0, y: 0 }, createRng(1), { hp: 12 });
  damageMosquito(q, 1);
  assert.equal(q.state, 'hide');
});

test('матка рожает мелочь по таймеру', () => {
  const q = createMosquito('queen', { x: 480, y: 100 }, createRng(1));
  const events = sim(q, 13);
  const spawns = events.filter((e) => e.kind === 'spawn');
  assert.ok(spawns.length >= 2);
  assert.equal(spawns[0].typeId, 'gnat');
});

test('видимость тихони зависит от перка и лампы', () => {
  const g = createMosquito('ghost', { x: POINTS.lamp.x + 10, y: POINTS.lamp.y }, createRng(1));
  assert.equal(visibleAlpha(g, false, {}), 0.15);
  assert.equal(visibleAlpha(g, false, { ghostVisible: true }), 0.6);
  assert.ok(visibleAlpha(g, true, {}) > 0.5);
});

test('комар не покидает границ мира', () => {
  const m = createMosquito('darter', { x: 5, y: 5 }, createRng(9));
  sim(m, 10);
  assert.ok(m.x >= 10 && m.x <= 950);
  assert.ok(m.y >= POINTS.ceiling - 20 && m.y <= POINTS.floor);
});
