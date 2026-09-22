// Частицы и всплывающий текст.

export function createParticles() {
  const list = [];
  const texts = [];

  function burst(x, y, opts = {}) {
    const n = opts.count ?? 12;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 120) * (0.4 + Math.random() * 0.8);
      list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.lift ?? 0),
        life: opts.life ?? 0.5,
        maxLife: opts.life ?? 0.5,
        size: (opts.size ?? 3) * (0.5 + Math.random()),
        color: Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color || '#c33',
        gravity: opts.gravity ?? 300,
        shape: opts.shape || 'dot',
        drag: opts.drag ?? 0.98,
      });
    }
  }

  function text(x, y, str, opts = {}) {
    texts.push({ x, y, str, life: opts.life ?? 0.9, maxLife: opts.life ?? 0.9, color: opts.color || '#fff', size: opts.size ?? 16, vy: opts.vy ?? -40, bold: opts.bold });
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) texts.splice(i, 1);
      else t.y += t.vy * dt;
    }
  }

  function draw(ctx) {
    for (const p of list) {
      const k = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.color;
      if (p.shape === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else if (p.shape === 'smoke') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      const k = t.life / t.maxLife;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `${t.bold ? '800' : '700'} ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  return { burst, text, update, draw, list, texts };
}
