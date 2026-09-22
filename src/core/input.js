// Единый поток указателя (мышь + тач) в логических координатах канваса.

export function createInput(canvas, world, handlers) {
  const state = { x: world.w / 2, y: world.h / 2, down: false, sx: 0, sy: 0 };

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * world.w, y: ((e.clientY - r.top) / r.height) * world.h };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    const p = toLogical(e);
    state.x = p.x;
    state.y = p.y;
    state.sx = p.x;
    state.sy = p.y;
    state.down = true;
    handlers.press?.(p);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    state.x = p.x;
    state.y = p.y;
    handlers.move?.(p);
  });
  const up = (e) => {
    if (!state.down) return;
    e.preventDefault();
    const p = toLogical(e);
    state.x = p.x;
    state.y = p.y;
    state.down = false;
    handlers.release?.({ ...p, sx: state.sx, sy: state.sy });
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    handlers.key?.(e.key, e);
  });
  window.addEventListener('wheel', (e) => handlers.wheel?.(Math.sign(e.deltaY)), { passive: true });
  return state;
}
