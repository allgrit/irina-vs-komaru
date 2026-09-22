import { MOSQUITO_TYPES, POINTS, WORLD, NIGHT } from './config.js';

// Поведение комаров. Чистая логика: обновляется по dt, не знает про canvas.

let nextId = 1;

export function spawnPoint(rng) {
  const src = rng.next() < 0.7 ? POINTS.window : POINTS.door;
  return { x: src.x + rng.range(-30, 30), y: src.y + rng.range(-20, 20) };
}

export function createMosquito(typeId, pos, rng, opts = {}) {
  const type = MOSQUITO_TYPES[typeId];
  const m = {
    id: nextId++,
    type,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    hp: opts.hp ?? type.hp,
    maxHp: opts.hp ?? type.hp,
    state: 'wander',
    stateT: 0,
    phase: rng.next() * Math.PI * 2,
    wobbleSeed: rng.next() * 100,
    speedMul: opts.speedMul ?? 1,
    buzzT: 0,
    alive: true,
    stuckT: 0,
    slowT: 0,
    spawnT: 0,
    target: null,
    hitFlash: 0,
    perchAt: null,
    age: 0,
  };
  if (type.boss) {
    m.state = 'circle';
    m.spawnT = type.spawnEvery;
  }
  return m;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function steer(m, tx, ty, speed, dt, wobble, time) {
  const dx = tx - m.x;
  const dy = ty - m.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const wob = Math.sin(time * 6 + m.wobbleSeed) * wobble * 40;
  const nx = -dy / d;
  const ny = dx / d;
  const ax = (dx / d) * speed + nx * wob;
  const ay = (dy / d) * speed + ny * wob;
  m.vx += (ax - m.vx) * Math.min(1, dt * 5);
  m.vy += (ay - m.vy) * Math.min(1, dt * 5);
  m.x += m.vx * dt;
  m.y += m.vy * dt;
}

function clampWorld(m) {
  m.x = Math.max(10, Math.min(WORLD.w - 10, m.x));
  m.y = Math.max(POINTS.ceiling - 20, Math.min(POINTS.floor - 10, m.y));
}

/**
 * Обновление одного комара.
 * env: { dt, time, rng, hand: {x,y}, lampOn, mods, events: [] }
 * events получают { kind: 'bite', m } и { kind: 'spawn', typeId, at }
 */
export function updateMosquito(m, env) {
  const { dt, time, hand, lampOn, mods, rng } = env;
  const t = m.type;
  m.age += dt;
  m.stateT += dt;
  if (m.hitFlash > 0) m.hitFlash -= dt;
  if (m.stuckT > 0) {
    m.stuckT -= dt;
    return;
  }
  let speed = t.speed * m.speedMul * (mods.speedMul ?? 1);
  if (m.slowT > 0) {
    m.slowT -= dt;
    speed *= 0.5;
  }
  const fumigator = mods.fumigator;
  if (fumigator && dist(m.x, m.y, POINTS.outlet.x, POINTS.outlet.y) < fumigator) speed *= 0.5;

  const goal = lampOn ? POINTS.lamp : POINTS.ear;
  const handD = dist(m.x, m.y, hand.x, hand.y);

  // --- босс ---
  if (t.boss) {
    if (m.state === 'hide') {
      steer(m, POINTS.curtain.x, POINTS.curtain.y, speed * 2, dt, 0, time);
      if (m.stateT > t.hideSeconds) {
        m.state = 'circle';
        m.stateT = 0;
      }
      return;
    }
    // кружит под потолком, периодически ныряет к уху
    m.spawnT -= dt;
    if (m.spawnT <= 0) {
      m.spawnT = t.spawnEvery;
      env.events.push({ kind: 'spawn', typeId: 'gnat', count: 3, at: { x: m.x, y: m.y } });
    }
    if (m.state === 'circle') {
      const cx = WORLD.w / 2 + Math.cos(time * 0.5) * 260;
      const cy = POINTS.ceiling + 40 + Math.sin(time * 0.9) * 30;
      steer(m, cx, cy, speed, dt, t.wobble, time);
      if (m.stateT > 7) {
        m.state = 'approach';
        m.stateT = 0;
      }
    } else if (m.state === 'approach') {
      steer(m, goal.x, goal.y, speed * 1.3, dt, t.wobble, time);
      if (dist(m.x, m.y, goal.x, goal.y) < 24) {
        m.state = 'buzzing';
        m.stateT = 0;
        m.buzzT = 0;
      }
    } else if (m.state === 'buzzing') {
      buzzStep(m, env, goal, speed, lampOn);
    } else if (m.state === 'retreat') {
      steer(m, WORLD.w / 2, POINTS.ceiling + 30, speed * 1.5, dt, 0.2, time);
      if (m.stateT > 2) {
        m.state = 'circle';
        m.stateT = 0;
      }
    }
    clampWorld(m);
    return;
  }

  // --- обычные ---
  switch (m.state) {
    case 'wander': {
      if (!m.target || m.stateT > 1.2) {
        m.target = { x: rng.range(80, WORLD.w - 80), y: rng.range(POINTS.ceiling, POINTS.floor - 80) };
        m.stateT = 0;
      }
      steer(m, m.target.x, m.target.y, speed * 0.8, dt, t.wobble, time);
      if (m.age > 1.5 + rng.next()) {
        m.state = 'approach';
        m.stateT = 0;
      }
      break;
    }
    case 'approach': {
      if (t.dodgeRadius && handD < t.dodgeRadius && m.stateT > 0.25) {
        m.state = 'dodge';
        m.stateT = 0;
        const ang = Math.atan2(m.y - hand.y, m.x - hand.x) + rng.range(-0.6, 0.6);
        m.vx = Math.cos(ang) * speed * 3;
        m.vy = Math.sin(ang) * speed * 3;
        break;
      }
      if (t.perchAlpha && rng.next() < dt * 0.35 && m.state !== 'perch') {
        m.state = 'perch';
        m.stateT = 0;
        m.perchAt = { x: m.x, y: m.y };
        m.vx = m.vy = 0;
        break;
      }
      steer(m, goal.x, goal.y, speed, dt, t.wobble, time);
      const goalD = dist(m.x, m.y, goal.x, goal.y);
      if (lampOn && goalD < 40) {
        m.state = 'orbit';
        m.stateT = 0;
      } else if (!lampOn && goalD < 18) {
        m.state = 'buzzing';
        m.stateT = 0;
        m.buzzT = 0;
      }
      break;
    }
    case 'dodge': {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vx *= 1 - dt * 3;
      m.vy *= 1 - dt * 3;
      if (m.stateT > 0.45) {
        m.state = 'approach';
        m.stateT = 0;
      }
      break;
    }
    case 'perch': {
      // сидит на стене, взлетает, когда рука далеко или прошло время
      if (handD > t.scareRadius && m.stateT > 1.2) {
        m.state = 'approach';
        m.stateT = 0;
      } else if (m.stateT > 4) {
        m.state = 'approach';
        m.stateT = 0;
      }
      break;
    }
    case 'orbit': {
      // кружит у лампы
      const a = time * 3 + m.phase;
      steer(m, POINTS.lamp.x + Math.cos(a) * 34, POINTS.lamp.y + Math.sin(a) * 22, speed * 1.2, dt, 0.2, time);
      if (!lampOn) {
        m.state = 'approach';
        m.stateT = 0;
      }
      break;
    }
    case 'buzzing': {
      buzzStep(m, env, goal, speed, lampOn);
      break;
    }
    case 'retreat': {
      if (!m.target) m.target = { x: rng.range(100, WORLD.w - 100), y: rng.range(POINTS.ceiling, POINTS.ceiling + 120) };
      steer(m, m.target.x, m.target.y, speed * 1.4, dt, t.wobble, time);
      if (m.stateT > 2) {
        m.state = 'approach';
        m.stateT = 0;
        m.target = null;
      }
      break;
    }
    default:
      m.state = 'approach';
  }
  clampWorld(m);
}

function buzzStep(m, env, goal, speed, lampOn) {
  const { dt, time, mods } = env;
  const a = time * 9 + m.phase;
  steer(m, goal.x + Math.cos(a) * 14, goal.y + Math.sin(a) * 10, speed, dt, 0.1, time);
  if (lampOn) {
    m.state = 'approach';
    m.stateT = 0;
    return;
  }
  m.buzzT += dt;
  const need = mods.buzzToBite ?? NIGHT.buzzToBiteSeconds;
  if (m.buzzT >= need) {
    env.events.push({ kind: 'bite', m });
    m.state = 'retreat';
    m.stateT = 0;
    m.buzzT = 0;
    m.target = null;
  }
}

export function isBuzzing(m) {
  return m.alive && m.state === 'buzzing';
}

/** Наносит урон; возвращает true, если комар погиб. */
export function damageMosquito(m, amount) {
  if (!m.alive) return false;
  m.hp -= amount;
  m.hitFlash = 0.15;
  if (m.hp <= 0) {
    m.alive = false;
    return true;
  }
  if (m.type.boss && m.state !== 'hide') {
    m.state = 'hide';
    m.stateT = 0;
  }
  return false;
}

/** Видимость для рендера с учётом лампы и перков. */
export function visibleAlpha(m, lampOn, mods = {}) {
  const t = m.type;
  let a = t.alpha;
  if (t.id === 'ghost') {
    a = mods.ghostVisible ? 0.6 : t.alpha;
    const dl = Math.hypot(m.x - POINTS.lamp.x, m.y - POINTS.lamp.y);
    if (lampOn && dl < 140) a = Math.max(a, 0.9 - dl / 200);
    if (m.state === 'buzzing') a = Math.max(a, 0.35);
  }
  if (m.state === 'perch') a = t.perchAlpha ?? a;
  if (m.state === 'hide') a = 0.15;
  return a;
}
