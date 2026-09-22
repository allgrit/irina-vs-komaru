import { TOOLS } from './config.js';

// Хит-тесты инструментов. Чистая геометрия над списком комаров.

export function circleHits(mosquitoes, cx, cy, radius, opts = {}) {
  const out = [];
  for (const m of mosquitoes) {
    if (!m.alive) continue;
    if (m.state === 'hide' && !opts.includeHidden) continue;
    const d = Math.hypot(m.x - cx, m.y - cy);
    if (d <= radius + m.type.radius) out.push(m);
  }
  return out;
}

function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function clipSegment(ax, ay, bx, by, maxLength) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len <= maxLength || len === 0) return { ax, ay, bx, by, len };
  const k = maxLength / len;
  return { ax, ay, bx: ax + (bx - ax) * k, by: ay + (by - ay) * k, len: maxLength };
}

export function segmentHits(mosquitoes, ax, ay, bx, by, halfWidth) {
  const out = [];
  for (const m of mosquitoes) {
    if (!m.alive || m.state === 'hide') continue;
    if (pointSegDist(m.x, m.y, ax, ay, bx, by) <= halfWidth + m.type.radius) out.push(m);
  }
  return out;
}

export function clapRadius(chargeSeconds, mods = {}) {
  const t = TOOLS.clap;
  const k = Math.max(0, Math.min(1, chargeSeconds / t.chargeSeconds));
  return (t.radiusMin + (t.radiusMax - t.radiusMin) * k) * (mods.radiusMul ?? 1);
}

export function palmRadius(mods = {}) {
  return TOOLS.palm.radius * (mods.radiusMul ?? 1) * (mods.reflexBoost ? 2 : 1);
}

/** Состояние инструментов забега: кулдауны, батареи, заряды. */
export function createToolState(ids) {
  const st = {};
  for (const id of ids) {
    st[id] = { cooldown: 0, battery: TOOLS[id].battery ?? 0, charges: TOOLS[id].charges ?? 0, active: false, chargeT: 0 };
  }
  return st;
}

export function tickTools(state, dt, mods = {}) {
  const cdMul = mods.cooldownMul ?? 1;
  for (const id of Object.keys(state)) {
    const s = state[id];
    const cfg = TOOLS[id];
    if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt / cdMul);
    if (cfg.battery) {
      if (s.active) s.battery = Math.max(0, s.battery - dt);
      else s.battery = Math.min(cfg.battery, s.battery + (dt * cfg.battery) / cfg.recharge / cdMul);
      if (s.battery <= 0) s.active = false;
    }
  }
}

export function resetHourCharges(state) {
  for (const id of Object.keys(state)) {
    if (TOOLS[id].charges) state[id].charges = TOOLS[id].charges;
  }
}

export function canUse(state, id, mods = {}) {
  const s = state[id];
  if (!s) return false;
  const cfg = TOOLS[id];
  if (s.cooldown > 0) return false;
  if (cfg.charges && s.charges <= 0) return false;
  if (cfg.battery && s.battery <= 0.05) return false;
  return true;
}

export function startCooldown(state, id, mods = {}) {
  const cfg = TOOLS[id];
  state[id].cooldown = cfg.cooldown * (mods.cooldownMul ?? 1);
}
