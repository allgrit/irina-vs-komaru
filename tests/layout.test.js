import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, landscapeLayout, portraitLayout, applyLayout, remapRun, fitScale, PORTRAIT_MIN_H, PORTRAIT_MAX_H } from '../src/game/layout.js';
import { WORLD, POINTS } from '../src/game/config.js';
import { createRun, runAction, updateRun } from '../src/game/run.js';
import { createMosquito, spawnPoint } from '../src/game/mosquitoes.js';
import { createRng } from '../src/core/rng.js';

function inside(p, L) {
  return p.x >= 0 && p.x <= L.w && p.y >= 0 && p.y <= L.h;
}

test('ландшафт совпадает с константами конфига', () => {
  const L = landscapeLayout();
  assert.equal(L.w, 960);
  assert.equal(L.h, 540);
  assert.deepEqual(L.points.ear, { x: 300, y: 306 });
  assert.deepEqual(L.points.lamp, { x: 470, y: 268 });
});

test('портрет выбирается по пропорциям и подстраивает высоту в пределах', () => {
  assert.equal(computeLayout(1200, 700).mode, 'landscape');
  const L = computeLayout(390, 844);
  assert.equal(L.mode, 'portrait');
  assert.equal(L.w, 540);
  assert.ok(L.h >= PORTRAIT_MIN_H && L.h <= PORTRAIT_MAX_H);
  assert.equal(portraitLayout(100).h, PORTRAIT_MIN_H);
  assert.equal(portraitLayout(5000).h, PORTRAIT_MAX_H);
});

test('в портрете все точки внутри мира, ухо на подушке, пол ниже потолка', () => {
  for (const h of [860, 1000, 1200]) {
    const L = portraitLayout(h);
    for (const [k, p] of Object.entries(L.points)) {
      if (typeof p === 'object') assert.ok(inside(p, L), `${k} at h=${h}`);
    }
    assert.ok(L.points.ear.x > L.bed.x && L.points.ear.x < L.bed.x + L.bed.w);
    assert.ok(L.ceiling < L.floor && L.floor < L.h);
    assert.ok(L.bed.y + L.bed.h <= L.floor + 1);
  }
});

test('applyLayout переключает мир, спавн уходит из нового окна; обратно — эталон', () => {
  const P = portraitLayout(960);
  applyLayout(P);
  assert.equal(WORLD.w, 540);
  assert.equal(POINTS.ear.x, P.points.ear.x);
  const rng = createRng(1);
  for (let i = 0; i < 20; i++) assert.ok(inside(spawnPoint(rng), P));
  applyLayout(landscapeLayout());
  assert.equal(WORLD.w, 960);
  assert.equal(POINTS.ear.x, 300);
});

test('remapRun переносит комаров пропорционально', () => {
  const from = landscapeLayout();
  const to = portraitLayout(1080);
  const run = createRun({ seed: 'x' });
  runAction(run, 'pickPerk', { id: run.draft[0].id });
  const m = createMosquito('squeaker', { x: 480, y: 270 }, createRng(1));
  m.target = { x: 960, y: 540 };
  run.mosquitoes.push(m);
  remapRun(run, from, to);
  assert.equal(m.x, 270);
  assert.equal(m.y, 540);
  assert.equal(m.target.x, 540);
  remapRun(run, to, to); // без изменений
  assert.equal(m.x, 270);
});

test('комары в портрете остаются в границах и долетают до уха', () => {
  const P = portraitLayout(960);
  applyLayout(P);
  try {
    const run = createRun({ seed: 'p' });
    runAction(run, 'pickPerk', { id: run.draft[0].id });
    run.plan = [];
    const m = createMosquito('squeaker', spawnPoint(run.rng), run.rng);
    run.mosquitoes.push(m);
    for (let t = 0; t < 25; t += 1 / 60) {
      updateRun(run, 1 / 60, { x: 500, y: 900 });
      assert.ok(m.x >= 0 && m.x <= 540 && m.y >= 0 && m.y <= 960, `out of bounds ${m.x},${m.y}`);
    }
    assert.ok(run.hearts < 3, 'ожидался укус в портрете');
  } finally {
    applyLayout(landscapeLayout());
  }
});

test('fitScale ограничен меньшей стороной', () => {
  assert.equal(fitScale(landscapeLayout(), 1920, 1080), 2);
  assert.ok(Math.abs(fitScale(portraitLayout(960), 390, 844) - 390 / 540) < 1e-9);
});
