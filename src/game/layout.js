import { WORLD, POINTS } from './config.js';

// Планировка спальни под пропорции экрана. Ландшафт — эталон 960×540,
// портрет — 540×H, где H подстраивается под телефон. Все игровые точки
// (ухо, лампа, окно, розетка, штора, дверь) и рисуемые элементы — отсюда.

export const PORTRAIT_MIN_H = 860;
export const PORTRAIT_MAX_H = 1200;

export function landscapeLayout() {
  const bed = { x: 150, y: 300, w: 290, h: 120 };
  const nightstand = { x: 445, y: 335 };
  return {
    mode: 'landscape',
    w: 960,
    h: 540,
    ceiling: 70,
    floor: 450,
    door: { x: 14, y: 150, w: 96 },
    window: { x: 690, y: 110, w: 140, h: 160 },
    shelf: { x: 520, y: 130 },
    bed,
    nightstand,
    carpet: { cx: 600, cy: 500, rx: 210, ry: 30 },
    points: {
      ear: { x: bed.x + 150, y: bed.y + 6 },
      lamp: { x: nightstand.x + 25, y: nightstand.y - 67 },
      outlet: { x: 590, y: 402 },
      window: { x: 760, y: 190 },
      curtain: { x: 860, y: 200 },
      door: { x: 60, y: 200 },
      ceiling: 70,
      floor: 450,
    },
  };
}

export function portraitLayout(h) {
  const H = Math.round(Math.max(PORTRAIT_MIN_H, Math.min(PORTRAIT_MAX_H, h)));
  const floor = H - 170;
  const bed = { x: 100, y: floor - 190, w: 300, h: 120 };
  const nightstand = { x: 410, y: bed.y + 35 };
  const win = { x: 140, y: 200, w: 260, h: 170 };
  return {
    mode: 'portrait',
    w: 540,
    h: H,
    ceiling: 175,
    floor,
    door: { x: 8, y: 320, w: 72 },
    window: win,
    shelf: null,
    bed,
    nightstand,
    carpet: { cx: 270, cy: floor + 60, rx: 210, ry: 24 },
    points: {
      ear: { x: bed.x + 150, y: bed.y + 6 },
      lamp: { x: nightstand.x + 25, y: nightstand.y - 67 },
      outlet: { x: 480, y: floor - 40 },
      window: { x: win.x + win.w / 2, y: win.y + win.h / 2 },
      curtain: { x: win.x + win.w + 20, y: win.y + 80 },
      door: { x: 44, y: 330 },
      ceiling: 175,
      floor,
    },
  };
}

/** Выбор планировки под размер окна (CSS-пиксели). */
export function computeLayout(vw, vh) {
  if (vh > vw) return portraitLayout((540 * vh) / vw);
  return landscapeLayout();
}

/** Переключает общие константы мира: их читают комары, инструменты и сцена. */
export function applyLayout(layout) {
  WORLD.w = layout.w;
  WORLD.h = layout.h;
  Object.assign(POINTS, layout.points);
  return layout;
}

/** Переносит позиции сущностей забега из старой планировки в новую пропорционально. */
export function remapRun(run, from, to) {
  if (!run || (from.w === to.w && from.h === to.h)) return;
  const kx = to.w / from.w;
  const ky = to.h / from.h;
  const map = (p) => {
    p.x *= kx;
    p.y *= ky;
  };
  for (const m of run.mosquitoes) {
    map(m);
    if (m.target) map(m.target);
    if (m.perchAt) map(m.perchAt);
  }
  for (const c of run.clouds) map(c);
  map(run.hand);
}

/** Масштаб сцены под окно с учётом планировки. */
export function fitScale(layout, vw, vh) {
  return Math.min(vw / layout.w, vh / layout.h);
}
