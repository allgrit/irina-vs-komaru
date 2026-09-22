import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun, runAction, drainEvents, clockLabel } from '../src/game/run.js';
import { createMosquito } from '../src/game/mosquitoes.js';
import { createRng } from '../src/core/rng.js';
import { NIGHT, POINTS } from '../src/game/config.js';

function start(opts = {}) {
  const run = createRun({ seed: 'test', ...opts });
  runAction(run, 'pickPerk', { id: run.draft[0].id });
  drainEvents(run);
  return run;
}

function step(run, seconds, hand) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) updateRun(run, dt, hand);
}

test('забег начинается с драфта, после выбора идёт первый час', () => {
  const run = createRun({ seed: 'a' });
  assert.equal(run.phase, 'draft');
  assert.equal(run.draft.length, 3);
  runAction(run, 'pickPerk', { id: 'nope' });
  assert.equal(run.phase, 'draft');
  runAction(run, 'pickPerk', { id: run.draft[0].id });
  assert.equal(run.phase, 'play');
  assert.equal(clockLabel(0), '23:00');
  assert.equal(clockLabel(6), '05:00');
});

test('в тишине сон растёт до 100 за ~30 с', () => {
  const run = start();
  run.plan = []; // без комаров
  step(run, 31);
  assert.ok(run.sleep >= 99.9, `sleep=${run.sleep}`);
});

test('лампа замедляет сон вдвое', () => {
  const run = start();
  run.plan = [];
  runAction(run, 'lamp');
  step(run, 15);
  assert.ok(run.sleep > 20 && run.sleep < 30, `sleep=${run.sleep}`);
});

test('ладонь убивает комара и даёт очки, промах сбрасывает комбо', () => {
  const run = start();
  run.plan = [];
  const m = createMosquito('squeaker', { x: 400, y: 300 }, createRng(1));
  run.mosquitoes.push(m);
  runAction(run, 'press', { x: 402, y: 300 });
  const ev = drainEvents(run);
  assert.ok(ev.some((e) => e.kind === 'kill'));
  assert.equal(run.scoring.score, 10);
  assert.equal(run.mosquitoes.length, 1); // фильтруется на update
  step(run, 0.1);
  assert.equal(run.mosquitoes.length, 0);
  run.scoring.streak = 5;
  run.scoring.combo = 2;
  runAction(run, 'press', { x: 50, y: 400 });
  assert.equal(run.scoring.combo, 1);
  assert.ok(drainEvents(run).some((e) => e.kind === 'miss'));
});

test('хлопок: заряд расширяет радиус', () => {
  const run = start();
  run.plan = [];
  runAction(run, 'selectTool', { id: 'clap' });
  const m = createMosquito('squeaker', { x: 400, y: 300 }, createRng(1));
  m.state = 'perch'; // стоит на месте, пока копится заряд
  run.mosquitoes.push(m);
  runAction(run, 'press', { x: 470, y: 300 }); // 70 px — ладонь бы не достала
  step(run, 1.0);
  runAction(run, 'release', { x: 470, y: 300 });
  assert.equal(m.alive, false);
  assert.ok(run.toolState.clap.cooldown > 0);
});

test('укус снимает сердце и сон, ноль сердец — проигрыш', () => {
  const run = start({ hearts: 1 });
  run.plan = [];
  run.sleep = 50;
  const m = createMosquito('squeaker', { x: POINTS.ear.x, y: POINTS.ear.y }, createRng(1));
  m.state = 'buzzing';
  run.mosquitoes.push(m);
  step(run, 2.0, { x: 900, y: 500 });
  const ev = drainEvents(run);
  assert.ok(ev.some((e) => e.kind === 'bite'));
  assert.equal(run.hearts, 0);
  assert.equal(run.phase, 'lost');
  assert.equal(run.result.won, false);
  assert.ok(ev.some((e) => e.kind === 'lose'));
});

test('пока комар жужжит у уха, сон не растёт', () => {
  const run = start();
  run.plan = [];
  const m = createMosquito('squeaker', { x: POINTS.ear.x, y: POINTS.ear.y }, createRng(1));
  m.state = 'buzzing';
  run.mosquitoes.push(m);
  run.mods.buzzToBite = 100;
  step(run, 3, { x: 900, y: 500 });
  assert.equal(run.sleep, 0);
});

test('час заканчивается бонусом за сон и новым драфтом; семь часов — победа', () => {
  const run = start({ hearts: 6 });
  for (let h = 0; h < NIGHT.hours; h++) {
    run.plan = [];
    run.sleep = 100;
    run.hourT = NIGHT.hourSeconds - 0.01;
    step(run, 0.05);
    if (h < NIGHT.hours - 1) {
      assert.equal(run.phase, 'draft', `hour ${h}`);
      assert.equal(run.hourBonusLast, 500);
      runAction(run, 'pickPerk', { id: run.draft[0].id });
    }
  }
  assert.equal(run.phase, 'won');
  assert.equal(run.result.hours, 7);
  assert.equal(run.result.nightBonus, run.hearts * 200);
  assert.ok(run.hearts >= 6);
  assert.equal(run.sleepHistory.length, 7);
  assert.equal(run.result.avgSleep, 100);
});

test('мухобойка бьёт вдоль линии и уходит в кулдаун', () => {
  const run = start({ tools: ['palm', 'swatter'] });
  run.plan = [];
  runAction(run, 'selectTool', { id: 'swatter' });
  run.mosquitoes.push(createMosquito('squeaker', { x: 300, y: 200 }, createRng(1)), createMosquito('squeaker', { x: 400, y: 205 }, createRng(1)));
  runAction(run, 'press', { x: 250, y: 200 });
  runAction(run, 'release', { x: 450, y: 200 });
  assert.equal(run.mosquitoes.filter((m) => m.alive).length, 0);
  assert.ok(!drainEvents(run).some((e) => e.kind === 'miss'));
  runAction(run, 'press', { x: 250, y: 200 });
  runAction(run, 'release', { x: 450, y: 200 });
  assert.ok(drainEvents(run).some((e) => e.kind === 'denied'));
});

test('электроракетка убивает касанием, пока зажата', () => {
  const run = start({ tools: ['palm', 'racket'] });
  run.plan = [];
  runAction(run, 'selectTool', { id: 'racket' });
  const m = createMosquito('bomber', { x: 500, y: 300 }, createRng(1));
  m.state = 'perch';
  run.mosquitoes.push(m);
  runAction(run, 'press', { x: 500, y: 300 });
  step(run, 0.1, { x: 500, y: 300 });
  assert.equal(m.alive, false);
  runAction(run, 'release', { x: 500, y: 300 });
  assert.equal(run.toolState.racket.active, false);
});

test('пылесос тянет комаров и мешает сну', () => {
  const run = start({ tools: ['palm', 'vacuum'] });
  run.plan = [];
  run.sleep = 50;
  runAction(run, 'selectTool', { id: 'vacuum' });
  const m = createMosquito('squeaker', { x: 600, y: 300 }, createRng(1));
  m.state = 'perch'; // не двигается сам
  run.mosquitoes.push(m);
  runAction(run, 'press', { x: 500, y: 300 });
  step(run, 1.5, { x: 500, y: 300 });
  assert.equal(m.alive, false);
  assert.equal(run.sleep, 50);
});

test('спрей: облако наносит урон со временем и тратит заряд', () => {
  const run = start({ tools: ['palm', 'spray'] });
  run.plan = [];
  runAction(run, 'selectTool', { id: 'spray' });
  const m = createMosquito('squeaker', { x: 500, y: 300 }, createRng(1));
  m.state = 'perch';
  run.mosquitoes.push(m);
  runAction(run, 'press', { x: 500, y: 300 });
  assert.equal(run.toolState.spray.charges, 2);
  step(run, 1.0);
  assert.equal(m.alive, true);
  step(run, 1.5);
  assert.equal(m.alive, false);
});

test('пижама с капюшоном поглощает один укус в час', () => {
  const run = start({ hearts: 3 });
  run.plan = [];
  run.mods.hoodie = true;
  const m = createMosquito('squeaker', { x: POINTS.ear.x, y: POINTS.ear.y }, createRng(1));
  m.state = 'buzzing';
  run.mosquitoes.push(m);
  step(run, 2, { x: 900, y: 500 });
  assert.equal(run.hearts, 3);
  assert.ok(drainEvents(run).some((e) => e.kind === 'absorb'));
});

test('ежедневный сид даёт одинаковый план часа', () => {
  const a = start({ seed: 'daily-2026-09-22', daily: true });
  const b = start({ seed: 'daily-2026-09-22', daily: true });
  assert.deepEqual(a.plan, b.plan);
  assert.deepEqual(a.perks, b.perks);
});
