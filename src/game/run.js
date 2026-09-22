import { NIGHT, TOOLS, POINTS, MOSQUITO_TYPES } from './config.js';
import { createRng } from '../core/rng.js';
import { planHour, speedFactor, queenHp } from './waves.js';
import { createMosquito, updateMosquito, damageMosquito, spawnPoint, isBuzzing } from './mosquitoes.js';
import { circleHits, segmentHits, clipSegment, clapRadius, palmRadius, createToolState, tickTools, canUse, startCooldown, resetHourCharges } from './tools.js';
import { createScoring, registerKill, breakCombo, hourBonus, nightBonus, coinsForScore } from './scoring.js';
import { defaultMods, applyPerk, draftPerks } from './perks.js';

/**
 * Забег = одна ночь. Чистая симуляция: update(dt, hand) и action(kind, payload).
 * Все события для рендера и звука складываются в run.events и снимаются вызывающим.
 */
export function createRun(opts) {
  const rng = createRng(opts.seed ?? Date.now());
  const tools = opts.tools?.length ? opts.tools.slice() : ['palm', 'clap'];
  const run = {
    rng,
    seed: opts.seed,
    daily: !!opts.daily,
    night: opts.night ?? 1,
    tools,
    tool: tools[0],
    toolState: createToolState(tools),
    mods: defaultMods(),
    perks: [],
    rarePool: !!opts.rarePool,
    hearts: opts.hearts ?? NIGHT.baseHearts,
    maxHearts: opts.hearts ?? NIGHT.baseHearts,
    startSleep: opts.startSleep ?? 0,
    hour: 0,
    hourT: 0,
    time: 0,
    sleep: opts.startSleep ?? 0,
    sleepHistory: [],
    wakeT: 0,
    phase: 'draft',
    draft: [],
    mosquitoes: [],
    plan: [],
    planIdx: 0,
    clouds: [],
    scoring: createScoring(),
    events: [],
    hand: { x: 480, y: 300 },
    lampOn: false,
    holding: false,
    charging: false,
    chargeT: 0,
    hoodieUsed: false,
    reflexReady: false,
    gamblerT: 0,
    bitesThisHour: 0,
    toolsUsedThisHour: new Set(),
    killsSinceHeal: 0,
    hourBonusLast: 0,
    result: null,
  };
  run.draft = draftPerks(rng, run.perks, run.tools, 0, { rarePool: run.rarePool });
  return run;
}

function emit(run, ev) {
  run.events.push(ev);
}

function beginHour(run) {
  run.phase = 'play';
  run.hourT = 0;
  run.sleep = run.startSleep;
  run.mosquitoes = [];
  run.clouds = [];
  run.plan = planHour(run.hour, run.night, run.rng, run.mods);
  run.planIdx = 0;
  run.bitesThisHour = 0;
  run.hoodieUsed = false;
  run.toolsUsedThisHour = new Set();
  resetHourCharges(run.toolState);
  if (run.mods.sprayExtra && run.toolState.spray) run.toolState.spray.charges += run.mods.sprayExtra;
  emit(run, { kind: 'hourStart', hour: run.hour, clock: clockLabel(run.hour) });
}

export function clockLabel(hour) {
  const h = (NIGHT.startHour + hour) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

function endHour(run) {
  const bonus = Math.round(hourBonus(run.sleep) * run.mods.scoreMul);
  run.scoring.score += bonus;
  run.hourBonusLast = bonus;
  run.sleepHistory.push(run.sleep);
  emit(run, { kind: 'hourEnd', hour: run.hour, sleep: run.sleep, bonus, quiet: run.bitesThisHour === 0, toolsUsed: run.toolsUsedThisHour.size });
  run.mosquitoes = [];
  run.hour += 1;
  if (run.hour >= NIGHT.hours) {
    finish(run, true);
    return;
  }
  run.phase = 'draft';
  run.draft = draftPerks(run.rng, run.perks, run.tools, run.hour, { rarePool: run.rarePool });
}

function finish(run, won) {
  const nb = won ? nightBonus(run.hearts) : 0;
  run.scoring.score += nb;
  const avgSleep = run.sleepHistory.length ? run.sleepHistory.reduce((a, b) => a + b, 0) / run.sleepHistory.length : 0;
  run.phase = won ? 'won' : 'lost';
  run.result = {
    won,
    score: run.scoring.score,
    kills: run.scoring.kills,
    bestCombo: run.scoring.bestCombo,
    hours: won ? NIGHT.hours : run.hour,
    night: run.night,
    daily: run.daily,
    avgSleep: Math.round(avgSleep),
    coins: coinsForScore(run.scoring.score),
    nightBonus: nb,
    perks: run.perks.slice(),
  };
  emit(run, { kind: won ? 'win' : 'lose', result: run.result });
}

function spawnFromPlan(run) {
  while (run.planIdx < run.plan.length && run.plan[run.planIdx].t <= run.hourT) {
    const s = run.plan[run.planIdx++];
    spawnGroup(run, s.type, s.count, null);
  }
}

function spawnGroup(run, typeId, count, at) {
  const sf = speedFactor(run.hour, run.night);
  for (let i = 0; i < count; i++) {
    const p = at ? { x: at.x + run.rng.range(-12, 12), y: at.y + run.rng.range(-12, 12) } : spawnPoint(run.rng);
    const extra = { speedMul: sf };
    if (typeId === 'queen') extra.hp = queenHp(run.night);
    const m = createMosquito(typeId, p, run.rng, extra);
    run.mosquitoes.push(m);
    emit(run, { kind: 'spawn', m });
  }
}

function killMosquito(run, m, tool, cause) {
  const perched = m.state === 'perch';
  const gainedBase = registerKill(run.scoring, m.type);
  const gained = Math.round(gainedBase * run.mods.scoreMul);
  run.scoring.score += gained - gainedBase;
  run.toolsUsedThisHour.add(tool);
  emit(run, { kind: 'kill', m, x: m.x, y: m.y, tool, cause, type: m.type.id, perched, gained, combo: run.scoring.combo });
  if (run.mods.vampire) {
    run.killsSinceHeal += 1;
    if (run.killsSinceHeal >= run.mods.vampire) {
      run.killsSinceHeal = 0;
      if (run.hearts < run.maxHearts) {
        run.hearts += 1;
        emit(run, { kind: 'heal' });
      }
    }
  }
  if (run.mods.bloodmark && cause !== 'bloodmark') {
    for (const o of circleHits(run.mosquitoes, m.x, m.y, run.mods.bloodmark)) {
      if (o !== m && damageMosquito(o, 0.5)) killMosquito(run, o, tool, 'bloodmark');
    }
  }
}

function hitList(run, list, tool, amount = 1) {
  let killed = 0;
  for (const m of list) {
    if (damageMosquito(m, amount)) {
      killMosquito(run, m, tool, tool);
      killed += 1;
    } else {
      emit(run, { kind: 'hit', m, x: m.x, y: m.y, tool });
    }
  }
  return killed;
}

function miss(run, tool, x, y) {
  if (run.mods.gambler && run.gamblerT <= 0) {
    run.gamblerT = run.mods.gambler;
    emit(run, { kind: 'gambler', x, y });
    return;
  }
  breakCombo(run.scoring);
  emit(run, { kind: 'miss', x, y, tool });
}

function useReflex(run) {
  if (run.mods.reflex && run.reflexReady) {
    run.reflexReady = false;
    return { ...run.mods, reflexBoost: true };
  }
  return run.mods;
}

function bite(run, m) {
  let dmg = m.type.biteDamage;
  if (m.type.id === 'bomber' && run.mods.bomberSoft) dmg -= 1;
  if (run.mods.hoodie && !run.hoodieUsed) {
    run.hoodieUsed = true;
    emit(run, { kind: 'absorb', x: m.x, y: m.y });
    return;
  }
  run.hearts -= dmg;
  run.sleep = Math.max(0, run.sleep - run.mods.sleepLossOnBite);
  run.wakeT = NIGHT.wakeSeconds;
  run.bitesThisHour += 1;
  breakCombo(run.scoring);
  emit(run, { kind: 'bite', m, dmg, x: m.x, y: m.y });
  if (run.hearts <= 0) {
    run.hearts = 0;
    finish(run, false);
  }
}

export function updateRun(run, dt, hand) {
  if (run.phase !== 'play') return;
  if (hand) run.hand = hand;
  run.time += dt;
  run.hourT += dt;
  if (run.gamblerT > 0) run.gamblerT -= dt;
  if (run.charging) run.chargeT += dt;
  tickTools(run.toolState, dt, run.mods);
  if (run.mods.batteryMul !== 1 && run.toolState.racket) {
    // расширенная батарея реализуется как замедленный разряд
    const s = run.toolState.racket;
    if (s.active) s.battery = Math.min(TOOLS.racket.battery, s.battery + dt * (1 - 1 / run.mods.batteryMul));
  }

  spawnFromPlan(run);

  // Комары
  const env = { dt, time: run.time, rng: run.rng, hand: run.hand, lampOn: run.lampOn, mods: run.mods, events: [] };
  let anyBuzz = false;
  for (const m of run.mosquitoes) {
    if (!m.alive) continue;
    const wasBuzz = m.state === 'buzzing';
    updateMosquito(m, env);
    if (run.mods.tape && !m.taped && m.age > 0.5 && Math.hypot(m.x - POINTS.window.x, m.y - POINTS.window.y) < 70) {
      m.taped = true;
      m.stuckT = 2;
      emit(run, { kind: 'stuck', m });
    }
    if (!wasBuzz && m.state === 'buzzing') {
      run.reflexReady = true;
      emit(run, { kind: 'buzzStart', m });
    }
    if (isBuzzing(m)) anyBuzz = true;
  }
  for (const ev of env.events) {
    if (ev.kind === 'bite') bite(run, ev.m);
    else if (ev.kind === 'spawn') spawnGroup(run, ev.typeId, ev.count, ev.at);
    if (run.phase !== 'play') return;
  }

  // Активные зоны: ракетка, пылесос, спрей
  const rs = run.toolState.racket;
  if (rs && rs.active) {
    hitList(run, circleHits(run.mosquitoes, run.hand.x, run.hand.y, TOOLS.racket.radius * run.mods.radiusMul), 'racket', 1);
  }
  const vs = run.toolState.vacuum;
  let vacuuming = false;
  if (vs && vs.active) {
    vacuuming = true;
    const cfg = TOOLS.vacuum;
    for (const m of run.mosquitoes) {
      if (!m.alive || m.state === 'hide') continue;
      const dx = run.hand.x - m.x;
      const dy = run.hand.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d < cfg.pullRadius) {
        const f = cfg.pullForce * run.mods.vacuumMul * (1 - d / cfg.pullRadius + 0.3);
        m.x += (dx / d) * f * dt;
        m.y += (dy / d) * f * dt;
      }
    }
    hitList(run, circleHits(run.mosquitoes, run.hand.x, run.hand.y, cfg.killRadius), 'vacuum', 1);
  }
  for (const c of run.clouds) {
    c.t -= dt;
    if (c.t <= 0) continue;
    hitList(run, circleHits(run.mosquitoes, c.x, c.y, TOOLS.spray.radius), 'spray', TOOLS.spray.dps * dt);
  }
  run.clouds = run.clouds.filter((c) => c.t > 0);
  run.mosquitoes = run.mosquitoes.filter((m) => m.alive);

  // Сон
  if (run.wakeT > 0) run.wakeT -= dt;
  const canSleep = run.wakeT <= 0 && !anyBuzz && !vacuuming;
  if (canSleep) {
    let rate = NIGHT.sleepPerSecond * run.mods.sleepMul;
    if (run.lampOn) rate *= run.mods.lampSleepFactor;
    run.sleep = Math.min(run.mods.sleepCap, run.sleep + rate * dt);
  }
  run.buzzing = anyBuzz;

  if (run.hourT >= NIGHT.hourSeconds) endHour(run);
}

/** Действия игрока. */
export function runAction(run, kind, p = {}) {
  if (kind === 'pickPerk') {
    if (run.phase !== 'draft') return;
    if (!run.draft.some((d) => d.id === p.id)) return;
    applyPerk(run.mods, p.id, run);
    run.perks.push(p.id);
    emit(run, { kind: 'perk', id: p.id });
    beginHour(run);
    return;
  }
  if (run.phase !== 'play') return;
  switch (kind) {
    case 'selectTool':
      if (run.tools.includes(p.id)) {
        stopHold(run);
        run.tool = p.id;
        run.charging = false;
        emit(run, { kind: 'toolSelect', id: p.id });
      }
      break;
    case 'lamp':
      run.lampOn = !run.lampOn;
      emit(run, { kind: 'lamp', on: run.lampOn });
      break;
    case 'press':
      press(run, p.x, p.y);
      break;
    case 'release':
      release(run, p.x, p.y, p.sx, p.sy);
      break;
    default:
      break;
  }
}

function stopHold(run) {
  for (const id of Object.keys(run.toolState)) run.toolState[id].active = false;
  run.holding = false;
}

function press(run, x, y) {
  const id = run.tool;
  const cfg = TOOLS[id];
  run.hand = { x, y };
  if (!canUse(run.toolState, id, run.mods)) {
    emit(run, { kind: 'denied', id });
    return;
  }
  run.toolsUsedThisHour.add(id);
  if (cfg.kind === 'tap') {
    if (id === 'palm') {
      const mods = useReflex(run);
      const r = palmRadius(mods);
      const hits = circleHits(run.mosquitoes, x, y, r);
      emit(run, { kind: 'swat', x, y, r });
      if (!hits.length) miss(run, 'palm', x, y);
      else hitList(run, hits, 'palm');
    } else if (id === 'spray') {
      run.toolState.spray.charges -= 1;
      run.clouds.push({ x, y, t: cfg.duration });
      startCooldown(run.toolState, id, run.mods);
      emit(run, { kind: 'spray', x, y });
    }
  } else if (cfg.kind === 'charge') {
    run.charging = true;
    run.chargeT = 0;
  } else if (cfg.kind === 'hold') {
    run.toolState[id].active = true;
    run.holding = true;
    emit(run, { kind: 'holdStart', id });
  } else if (cfg.kind === 'swipe') {
    run.swipeStart = { x, y };
  }
}

function release(run, x, y, sx, sy) {
  const id = run.tool;
  const cfg = TOOLS[id];
  if (cfg.kind === 'charge' && run.charging) {
    run.charging = false;
    const mods = useReflex(run);
    const r = clapRadius(run.chargeT, mods) * (mods.reflexBoost ? 2 : 1);
    startCooldown(run.toolState, id, run.mods);
    const hits = circleHits(run.mosquitoes, x, y, r);
    emit(run, { kind: 'clap', x, y, r });
    if (!hits.length) miss(run, 'clap', x, y);
    else hitList(run, hits, 'clap');
  } else if (cfg.kind === 'hold') {
    stopHold(run);
    emit(run, { kind: 'holdEnd', id });
  } else if (cfg.kind === 'swipe' && run.swipeStart) {
    const s = run.swipeStart;
    run.swipeStart = null;
    const ax = sx ?? s.x;
    const ay = sy ?? s.y;
    const len = Math.hypot(x - ax, y - ay);
    if (len < 12) return; // слишком короткий жест — не считаем ударом
    const seg = clipSegment(ax, ay, x, y, cfg.maxLength * run.mods.swatterMul);
    startCooldown(run.toolState, id, run.mods);
    const hits = segmentHits(run.mosquitoes, seg.ax, seg.ay, seg.bx, seg.by, (cfg.width / 2) * run.mods.swatterMul);
    emit(run, { kind: 'swipe', ...seg });
    if (!hits.length) miss(run, 'swatter', x, y);
    else hitList(run, hits, 'swatter');
  }
}

export function drainEvents(run) {
  const ev = run.events;
  run.events = [];
  return ev;
}

export function typeName(id) {
  return MOSQUITO_TYPES[id]?.name ?? id;
}
