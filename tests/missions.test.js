import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateMissions, applyMissionEvent, createMission, MISSION_TEMPLATES } from '../src/game/missions.js';

test('генерируется три задания, добор до трёх без дублей', () => {
  const ms = generateMissions(createRng(1));
  assert.equal(ms.length, 3);
  assert.equal(new Set(ms.map((m) => m.id)).size, 3);
  const more = generateMissions(createRng(2), {}, ms.slice(0, 1));
  assert.equal(more.length, 3);
  assert.equal(more[0].id, ms[0].id);
});

test('счётчик убийств с фильтром по типу и «на стене»', () => {
  const t = MISSION_TEMPLATES.find((x) => x.id === 'kill_perched');
  const m = createMission(t, 0, createRng(1));
  applyMissionEvent([m], { kind: 'kill', type: 'chameleon', perched: false });
  assert.equal(m.progress, 0);
  for (let i = 0; i < 3; i++) applyMissionEvent([m], { kind: 'kill', type: 'chameleon', perched: true });
  assert.equal(m.done, true);
  assert.equal(m.reward, 100);
});

test('задания «максимум» берут лучшее значение', () => {
  const t = MISSION_TEMPLATES.find((x) => x.id === 'combo');
  const m = createMission(t, 0, createRng(1));
  applyMissionEvent([m], { kind: 'combo', value: 3 });
  applyMissionEvent([m], { kind: 'combo', value: 2 });
  assert.equal(m.progress, 3);
  const done = applyMissionEvent([m], { kind: 'combo', value: 7 });
  assert.equal(done.length, 1);
  assert.equal(m.progress, 5);
});

test('задание на инструмент требует открытый инструмент', () => {
  const t = MISSION_TEMPLATES.find((x) => x.id === 'kill_tool');
  assert.equal(createMission(t, 0, createRng(1), []), null);
  const m = createMission(t, 0, createRng(1), ['racket']);
  assert.equal(m.tool, 'racket');
  assert.ok(m.text.includes('ракеткой'));
  applyMissionEvent([m], { kind: 'kill', type: 'squeaker', tool: 'palm' });
  assert.equal(m.progress, 0);
  applyMissionEvent([m], { kind: 'kill', type: 'squeaker', tool: 'racket' });
  assert.equal(m.progress, 1);
});

test('исчерпанные тиры не генерируются', () => {
  const tiers = Object.fromEntries(MISSION_TEMPLATES.map((t) => [t.id, t.target.length]));
  assert.equal(generateMissions(createRng(1), tiers).length, 0);
});
