import { DIFFICULTY, MOSQUITO_TYPES, NIGHT } from './config.js';

// Генерация плана часа: список спавнов { t, type, count } в секундах от начала часа.

export function budgetFor(hour, night) {
  return (DIFFICULTY.budgetBase + DIFFICULTY.budgetPerHour * hour) * (1 + DIFFICULTY.budgetPerNight * (night - 1));
}

export function gapFor(hour) {
  return Math.max(DIFFICULTY.gapMin, DIFFICULTY.gapMax - DIFFICULTY.gapPerHour * hour);
}

export function speedFactor(hour, night) {
  return (1 + DIFFICULTY.speedPerHour * hour) * (1 + DIFFICULTY.speedPerNight * (night - 1));
}

export function availableTypes(hour) {
  return Object.values(MOSQUITO_TYPES).filter((t) => !t.boss && t.minHour <= hour && t.weight > 0);
}

export function queenHp(night) {
  return MOSQUITO_TYPES.queen.hp + DIFFICULTY.queenHpPerNight * (night - 1);
}

export function planHour(hour, night, rng, mods = {}) {
  const spawnMul = mods.spawnMul ?? 1;
  let budget = budgetFor(hour, night) * spawnMul;
  const gap = gapFor(hour);
  const types = availableTypes(hour);
  const plan = [];
  let t = 1.5;
  const maxT = NIGHT.hourSeconds - 6;
  while (budget > 0 && t < maxT) {
    const type = rng.weighted(types);
    const count = type.swarm || 1;
    plan.push({ t, type: type.id, count });
    budget -= type.swarm ? 2 : 1;
    t += gap * rng.range(0.6, 1.4);
  }
  if (NIGHT.bossHours.includes(hour)) {
    plan.push({ t: 8, type: 'queen', count: 1, boss: true });
  }
  return plan;
}
