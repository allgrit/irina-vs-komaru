import { WORLD, POINTS, NIGHT, TOOLS } from '../game/config.js';
import { visibleAlpha } from '../game/mosquitoes.js';

// Отрисовка спальни, Ирины, комаров, руки и эффектов. Никакой игровой логики.

const SKIN = '#f3cfb3';
const SKIN_DARK = '#d9a98a';

export function createScene(ctx) {
  const fx = [];
  const stars = [];
  for (let i = 0; i < 40; i++) stars.push({ x: 700 + Math.random() * 130, y: 120 + Math.random() * 120, s: Math.random() * 1.5 + 0.5, p: Math.random() * 6 });
  let shake = 0;
  let shakeT = 0;
  let redFlash = 0;
  let whiteFlash = 0;
  let wallpaper = null;

  function addFx(f) {
    fx.push(f);
  }

  function update(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) fx.splice(i, 1);
    }
    if (shakeT > 0) shakeT -= dt;
    else shake = 0;
    redFlash = Math.max(0, redFlash - dt * 1.5);
    whiteFlash = Math.max(0, whiteFlash - dt * 3);
  }

  function shakeScreen(power, t = 0.3) {
    shake = Math.max(shake, power);
    shakeT = t;
  }

  function flash(kind) {
    if (kind === 'red') redFlash = 1;
    else whiteFlash = 0.6;
  }

  // ---------------------------------------------------------------- фон
  function makeWallpaper() {
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    const g = c.getContext('2d');
    g.fillStyle = '#1b2140';
    g.fillRect(0, 0, 48, 48);
    g.strokeStyle = 'rgba(255,255,255,0.035)';
    g.lineWidth = 1;
    for (const [x, y] of [[12, 12], [36, 36]]) {
      g.beginPath();
      g.moveTo(x, y - 8);
      g.quadraticCurveTo(x + 8, y, x, y + 8);
      g.quadraticCurveTo(x - 8, y, x, y - 8);
      g.stroke();
    }
    return ctx.createPattern(c, 'repeat');
  }

  function drawRoom(run, time) {
    if (!wallpaper) wallpaper = makeWallpaper();
    const { w, h } = WORLD;
    // стена
    ctx.fillStyle = '#161b36';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = wallpaper;
    ctx.fillRect(0, 0, w, POINTS.floor);
    // потолочный градиент
    const g = ctx.createLinearGradient(0, 0, 0, POINTS.floor);
    g.addColorStop(0, 'rgba(0,0,0,0.45)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, POINTS.floor);
    // пол
    ctx.fillStyle = '#2a1f1a';
    ctx.fillRect(0, POINTS.floor, w, h - POINTS.floor);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let x = -40; x < w; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, POINTS.floor);
      ctx.lineTo(x + 40, h);
      ctx.stroke();
    }
    const fg = ctx.createLinearGradient(0, POINTS.floor, 0, h);
    fg.addColorStop(0, 'rgba(120,80,60,0.25)');
    fg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, POINTS.floor, w, h - POINTS.floor);
    // плинтус
    ctx.fillStyle = '#3a2d28';
    ctx.fillRect(0, POINTS.floor - 8, w, 8);
    // ковёр
    ctx.fillStyle = '#4a2a3a';
    ctx.beginPath();
    ctx.ellipse(600, 500, 210, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a3a4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(600, 500, 190, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    drawDoor();
    drawWindow(run, time);
    drawShelf();
    drawBed(run, time);
    drawNightstand(run, time);
    drawOutlet(run, time);
  }

  function drawDoor() {
    ctx.fillStyle = '#2b2233';
    ctx.fillRect(14, 150, 96, POINTS.floor - 150);
    ctx.fillStyle = '#4a3a55';
    ctx.fillRect(22, 158, 80, POINTS.floor - 158);
    ctx.fillStyle = '#3a2a45';
    ctx.fillRect(32, 170, 60, 110);
    ctx.fillRect(32, 300, 60, 120);
    ctx.fillStyle = '#c9a34a';
    ctx.beginPath();
    ctx.arc(92, 300, 4, 0, Math.PI * 2);
    ctx.fill();
    // щель сверху — тёплый свет из коридора
    ctx.fillStyle = 'rgba(255,200,120,0.35)';
    ctx.fillRect(22, 152, 80, 3);
  }

  function drawWindow(run, time) {
    const x = 690;
    const y = 110;
    const ww = 140;
    const wh = 160;
    // ночь за окном
    const sky = ctx.createLinearGradient(0, y, 0, y + wh);
    sky.addColorStop(0, '#060a1e');
    sky.addColorStop(1, '#101a3e');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, ww, wh);
    for (const s of stars) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 2 + s.p);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    // луна ползёт по небу за ночь
    const prog = run ? (run.hour + Math.min(1, run.hourT / NIGHT.hourSeconds)) / NIGHT.hours : 0.2;
    const mx = x + 20 + prog * (ww - 40);
    const my = y + 60 - Math.sin(prog * Math.PI) * 35;
    const mg = ctx.createRadialGradient(mx, my, 6, mx, my, 40);
    mg.addColorStop(0, 'rgba(255,250,220,0.35)');
    mg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(x, y, ww, wh);
    ctx.fillStyle = '#f6f1d3';
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.arc(mx + 6, my - 4, 12, 0, Math.PI * 2);
    ctx.fill();
    // силуэт дерева
    ctx.fillStyle = '#05081a';
    ctx.beginPath();
    ctx.moveTo(x + 100, y + wh);
    ctx.quadraticCurveTo(x + 110, y + 90, x + 130, y + 80);
    ctx.quadraticCurveTo(x + 140, y + 120, x + ww, y + 110);
    ctx.lineTo(x + ww, y + wh);
    ctx.fill();
    // рама
    ctx.strokeStyle = '#d8d2c4';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, ww, wh);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + ww / 2, y);
    ctx.lineTo(x + ww / 2, y + wh);
    ctx.moveTo(x, y + wh / 2);
    ctx.lineTo(x + ww, y + wh / 2);
    ctx.stroke();
    // приоткрытая створка
    ctx.fillStyle = 'rgba(216,210,196,0.9)';
    ctx.beginPath();
    ctx.moveTo(x + ww / 2, y);
    ctx.lineTo(x + ww / 2 + 22, y + 14);
    ctx.lineTo(x + ww / 2 + 22, y + wh / 2 + 6);
    ctx.lineTo(x + ww / 2, y + wh / 2);
    ctx.closePath();
    ctx.fill();
    // подоконник
    ctx.fillStyle = '#c9c2b2';
    ctx.fillRect(x - 12, y + wh, ww + 24, 10);
    // шторы
    drawCurtain(x - 40, y - 20, 48, wh + 40, false);
    drawCurtain(x + ww - 8, y - 20, 62, wh + 40, true);
    // карниз
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x - 50, y - 24, ww + 110, 6);
  }

  function drawCurtain(x, y, w, h, right) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, right ? '#5a2a4a' : '#3a1a30');
    g.addColorStop(0.5, right ? '#7a3a62' : '#5a2a4a');
    g.addColorStop(1, right ? '#3a1a30' : '#5a2a4a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.quadraticCurveTo(x + w + 10, y + h / 2, x + w - 4, y + h);
    ctx.lineTo(x + 4, y + h);
    ctx.quadraticCurveTo(x - 10, y + h / 2, x, y);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (w * i) / 4, y);
      ctx.quadraticCurveTo(x + (w * i) / 4 + 6, y + h / 2, x + (w * i) / 4, y + h);
      ctx.stroke();
    }
  }

  function drawShelf() {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(520, 130, 130, 8);
    const books = ['#a33', '#3a6', '#36a', '#ca4', '#a5a'];
    let bx = 528;
    books.forEach((c, i) => {
      const bw = 12 + (i % 3) * 4;
      const bh = 30 + (i % 2) * 8;
      ctx.fillStyle = c;
      ctx.fillRect(bx, 130 - bh, bw, bh);
      bx += bw + 2;
    });
    // фото в рамке
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(610, 92, 34, 38);
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(614, 96, 26, 30);
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(627, 108, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBed(run, time) {
    const bx = 150;
    const by = 300;
    const bw = 290;
    const bh = 120;
    // изголовье
    ctx.fillStyle = '#5a3a2a';
    roundRect(bx - 16, by - 60, 24, 180, 6);
    ctx.fill();
    // ножки и каркас
    ctx.fillStyle = '#4a2e20';
    ctx.fillRect(bx, by + bh - 10, bw, 14);
    ctx.fillRect(bx + 6, by + bh, 12, 26);
    ctx.fillRect(bx + bw - 18, by + bh, 12, 26);
    // матрас
    ctx.fillStyle = '#e9e2d4';
    roundRect(bx, by, bw, bh - 10, 8);
    ctx.fill();
    // подушка
    ctx.fillStyle = '#f7f3ea';
    roundRect(bx + 18, by - 14, 160, 54, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    roundRect(bx + 18, by - 14, 160, 54, 18);
    ctx.stroke();

    drawIrina(run, time);

    // одеяло поверх тела
    const bg = ctx.createLinearGradient(0, by + 10, 0, by + bh);
    bg.addColorStop(0, '#7a4aa0');
    bg.addColorStop(1, '#4a2a70');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(bx + 120, by + 24);
    ctx.quadraticCurveTo(bx + 150, by - 2, bx + 200, by + 12);
    ctx.lineTo(bx + bw - 6, by + 8);
    ctx.lineTo(bx + bw - 6, by + bh - 12);
    ctx.lineTo(bx + 110, by + bh - 12);
    ctx.closePath();
    ctx.fill();
    // складки и отворот
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 130, by + 30);
    ctx.quadraticCurveTo(bx + 220, by + 40, bx + bw - 20, by + 30);
    ctx.stroke();
    ctx.fillStyle = '#f7f3ea';
    ctx.beginPath();
    ctx.moveTo(bx + 120, by + 24);
    ctx.quadraticCurveTo(bx + 150, by - 2, bx + 200, by + 12);
    ctx.lineTo(bx + 200, by + 22);
    ctx.quadraticCurveTo(bx + 150, by + 10, bx + 122, by + 34);
    ctx.closePath();
    ctx.fill();
  }

  function drawIrina(run, time) {
    const hx = 285;
    const hy = 300;
    const awake = run && run.wakeT > 0;
    const worried = run && run.buzzing && !awake;
    const bob = awake ? Math.sin(time * 30) * 2 : Math.sin(time * 1.5) * 1.2;
    ctx.save();
    ctx.translate(0, bob);
    // волосы (сзади)
    ctx.fillStyle = '#5a2e1a';
    ctx.beginPath();
    ctx.ellipse(hx - 6, hy + 4, 34, 28, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx - 40, hy + 18, 26, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // шея/плечо
    ctx.fillStyle = SKIN_DARK;
    ctx.fillRect(hx + 10, hy + 12, 40, 18);
    // лицо
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 24, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // ухо
    ctx.fillStyle = SKIN_DARK;
    ctx.beginPath();
    ctx.ellipse(POINTS.ear.x, POINTS.ear.y, 6, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // чёлка
    ctx.fillStyle = '#6a3a22';
    ctx.beginPath();
    ctx.moveTo(hx - 26, hy - 4);
    ctx.quadraticCurveTo(hx - 10, hy - 34, hx + 22, hy - 14);
    ctx.quadraticCurveTo(hx + 10, hy - 18, hx - 4, hy - 8);
    ctx.quadraticCurveTo(hx - 14, hy - 12, hx - 26, hy - 4);
    ctx.fill();
    // румянец
    ctx.fillStyle = 'rgba(255,120,120,0.25)';
    ctx.beginPath();
    ctx.ellipse(hx - 14, hy + 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(hx + 12, hy + 6, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // глаза
    ctx.strokeStyle = '#3a2a2a';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#3a2a2a';
    if (awake) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(hx - 9, hy - 2, 5, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(hx + 9, hy - 2, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a1a';
      ctx.beginPath();
      ctx.arc(hx - 8, hy - 1, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + 10, hy - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // сердитые брови
      ctx.beginPath();
      ctx.moveTo(hx - 16, hy - 12);
      ctx.lineTo(hx - 4, hy - 8);
      ctx.moveTo(hx + 16, hy - 12);
      ctx.lineTo(hx + 4, hy - 8);
      ctx.stroke();
      // рот
      ctx.beginPath();
      ctx.ellipse(hx + 1, hy + 10, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (worried) {
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy - 2);
      ctx.lineTo(hx - 4, hy - 2);
      ctx.moveTo(hx + 4, hy - 4);
      ctx.quadraticCurveTo(hx + 9, hy + 2, hx + 14, hy - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 15, hy - 10);
      ctx.lineTo(hx - 5, hy - 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy + 10);
      ctx.lineTo(hx + 6, hy + 10);
      ctx.stroke();
    } else {
      // спит: закрытые глаза дугами, лёгкая улыбка
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy - 2);
      ctx.quadraticCurveTo(hx - 9, hy + 3, hx - 4, hy - 2);
      ctx.moveTo(hx + 4, hy - 2);
      ctx.quadraticCurveTo(hx + 9, hy + 3, hx + 14, hy - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy + 9);
      ctx.quadraticCurveTo(hx + 1, hy + 13, hx + 6, hy + 9);
      ctx.stroke();
      // ресницы
      ctx.lineWidth = 1.5;
      for (const ex of [hx - 12, hx - 6, hx + 6, hx + 12]) {
        ctx.beginPath();
        ctx.moveTo(ex, hy);
        ctx.lineTo(ex, hy + 3);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Zzz
    if (run && !awake && !run.buzzing && run.phase === 'play') {
      ctx.save();
      ctx.fillStyle = 'rgba(200,220,255,0.85)';
      for (let i = 0; i < 3; i++) {
        const k = ((time * 0.6 + i * 0.33) % 1);
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.font = `700 ${12 + i * 6 + k * 8}px "Segoe UI", system-ui, sans-serif`;
        ctx.fillText('z', hx + 30 + k * 40 + i * 12, hy - 20 - k * 50 - i * 10);
      }
      ctx.restore();
    }
  }

  function drawNightstand(run, time) {
    const x = 445;
    const y = 335;
    ctx.fillStyle = '#5a3a2a';
    roundRect(x, y, 66, 115, 4);
    ctx.fill();
    ctx.fillStyle = '#6a4a38';
    ctx.fillRect(x - 4, y - 4, 74, 8);
    ctx.fillStyle = '#4a2e20';
    ctx.fillRect(x + 8, y + 16, 50, 36);
    ctx.fillRect(x + 8, y + 62, 50, 36);
    ctx.fillStyle = '#c9a34a';
    ctx.fillRect(x + 30, y + 32, 8, 3);
    ctx.fillRect(x + 30, y + 78, 8, 3);
    // будильник
    ctx.fillStyle = '#222';
    roundRect(x + 4, y - 26, 34, 22, 4);
    ctx.fill();
    ctx.fillStyle = run && run.buzzing ? '#ff4a4a' : '#ff8a3a';
    ctx.font = '700 12px "Consolas", monospace';
    ctx.textAlign = 'left';
    const clock = run ? clockText(run) : '23:00';
    ctx.fillText(clock, x + 6, y - 10);
    // лампа
    const lx = POINTS.lamp.x;
    const ly = POINTS.lamp.y;
    const on = run && run.lampOn;
    if (on) {
      const gl = ctx.createRadialGradient(lx, ly + 10, 10, lx, ly + 10, 220);
      gl.addColorStop(0, 'rgba(255,220,150,0.45)');
      gl.addColorStop(0.4, 'rgba(255,200,120,0.15)');
      gl.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(lx - 240, ly - 240, 480, 480);
      // конус света вниз
      ctx.fillStyle = 'rgba(255,220,150,0.12)';
      ctx.beginPath();
      ctx.moveTo(lx - 22, ly + 16);
      ctx.lineTo(lx + 22, ly + 16);
      ctx.lineTo(lx + 90, POINTS.floor);
      ctx.lineTo(lx - 90, POINTS.floor);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(lx - 2, ly + 14, 4, 50);
    ctx.fillStyle = '#6a5a4a';
    ctx.beginPath();
    ctx.ellipse(lx, ly + 64, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? '#ffd88a' : '#7a6a58';
    ctx.beginPath();
    ctx.moveTo(lx - 14, ly - 16);
    ctx.lineTo(lx + 14, ly - 16);
    ctx.lineTo(lx + 24, ly + 16);
    ctx.lineTo(lx - 24, ly + 16);
    ctx.closePath();
    ctx.fill();
    if (on) {
      ctx.fillStyle = 'rgba(255,255,220,0.9)';
      ctx.beginPath();
      ctx.arc(lx, ly + 10, 5 + Math.sin(time * 20) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function clockText(run) {
    const h = (NIGHT.startHour + run.hour) % 24;
    const m = Math.floor((Math.min(run.hourT, NIGHT.hourSeconds) / NIGHT.hourSeconds) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function drawOutlet(run, time) {
    const { x, y } = POINTS.outlet;
    ctx.fillStyle = '#d8d2c4';
    roundRect(x - 10, y - 10, 20, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x - 4, y, 2, 0, Math.PI * 2);
    ctx.arc(x + 4, y, 2, 0, Math.PI * 2);
    ctx.fill();
    if (run && run.mods.fumigator) {
      ctx.fillStyle = '#e8e8f0';
      roundRect(x - 12, y - 4, 24, 26, 4);
      ctx.fill();
      ctx.fillStyle = '#4af';
      ctx.fillRect(x - 3, y + 14, 6, 3);
      const r = run.mods.fumigator;
      const g = ctx.createRadialGradient(x, y, 10, x, y, r);
      g.addColorStop(0, 'rgba(120,200,255,0.18)');
      g.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // дымок
      ctx.strokeStyle = 'rgba(200,230,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const t = time * 0.8;
      ctx.moveTo(x, y - 6);
      ctx.bezierCurveTo(x + Math.sin(t) * 10, y - 30, x - Math.sin(t) * 10, y - 50, x + Math.sin(t * 1.3) * 12, y - 80);
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------- комары
  function drawMosquito(m, run, time) {
    const alpha = visibleAlpha(m, run.lampOn, run.mods) * (m.state === 'perch' && run.mods.moonlight ? 2 : 1);
    const t = m.type;
    const r = t.radius;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.translate(m.x, m.y);
    if (m.state === 'buzzing') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const k = (time * 1.6 + i * 0.5) % 1;
        ctx.globalAlpha = Math.min(1, alpha) * (1 - k) * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, r + 6 + k * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = Math.min(1, alpha);
    } else if (t.id === 'ghost' && alpha < 0.3) {
      // тихоню слышно: слабые звуковые кольца
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#9cf';
      ctx.lineWidth = 1;
      const k = (time * 1.2 + m.phase) % 1;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + k * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, alpha);
    }
    const ang = Math.atan2(m.vy, m.vx || 0.001);
    ctx.rotate(m.state === 'perch' ? 0 : ang);
    if (t.boss) {
      const gl = ctx.createRadialGradient(0, 0, r, 0, 0, r * 2.4);
      gl.addColorStop(0, 'rgba(180,60,220,0.35)');
      gl.addColorStop(1, 'rgba(180,60,220,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // крылья
    const flap = Math.sin(time * 70 + m.phase) * 0.6;
    ctx.fillStyle = 'rgba(220,230,255,0.45)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, s * r * 0.5, r * 1.1, r * 0.45 * (0.6 + Math.abs(flap)), s * (0.6 + flap * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    // ножки
    ctx.strokeStyle = m.hitFlash > 0 ? '#fff' : 'rgba(30,30,40,0.9)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.4, s * r * 0.3);
        ctx.lineTo(i * r * 0.4 - r * 0.3, s * r * 1.2);
        ctx.lineTo(i * r * 0.4 - r * 0.1, s * r * 1.7);
        ctx.stroke();
      }
    }
    // тело
    ctx.fillStyle = m.hitFlash > 0 ? '#fff' : t.color;
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, 0, r * 1.05, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    if (t.id === 'bomber' || t.boss) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 3; i++) ctx.fillRect(-r * 1.1 + i * r * 0.5, -r * 0.5, r * 0.18, r);
    }
    // голова и хоботок
    ctx.fillStyle = m.hitFlash > 0 ? '#fff' : t.color;
    ctx.beginPath();
    ctx.arc(r * 0.8, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = m.hitFlash > 0 ? '#fff' : '#222';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 1.1, 0);
    ctx.lineTo(r * 2.0, 0);
    ctx.stroke();
    // глаз
    ctx.fillStyle = t.boss ? '#ff4a8a' : '#e33';
    ctx.beginPath();
    ctx.arc(r * 0.9, -r * 0.18, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    if (t.boss) {
      ctx.rotate(-ang);
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(-10, -r - 4);
      ctx.lineTo(-6, -r - 16);
      ctx.lineTo(0, -r - 6);
      ctx.lineTo(6, -r - 16);
      ctx.lineTo(10, -r - 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // полоска HP
    if (m.maxHp > 1 && m.hp < m.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(m.x - 16, m.y - r - 12, 32, 5);
      ctx.fillStyle = t.boss ? '#e4a' : '#e63';
      ctx.fillRect(m.x - 16, m.y - r - 12, 32 * Math.max(0, m.hp / m.maxHp), 5);
    }
    if (m.stuckT > 0) {
      ctx.strokeStyle = 'rgba(255,230,120,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x - 14, m.y - 10);
      ctx.lineTo(m.x + 14, m.y + 10);
      ctx.moveTo(m.x - 14, m.y + 10);
      ctx.lineTo(m.x + 14, m.y - 10);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- рука
  function drawHand(run, pointer, time) {
    const { x, y } = pointer;
    const id = run ? run.tool : 'palm';
    ctx.save();
    ctx.translate(x, y);
    if (id === 'palm') {
      const squash = run && run.lastSwat > 0 ? 0.8 : 1;
      drawPalm(0, 0, 1, squash);
    } else if (id === 'clap') {
      const k = run && run.charging ? Math.min(1, run.chargeT / TOOLS.clap.chargeSeconds) : 0;
      const gap = 40 - k * 24;
      if (run && run.charging) {
        ctx.strokeStyle = `rgba(255,220,120,${0.3 + k * 0.5})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, (TOOLS.clap.radiusMin + (TOOLS.clap.radiusMax - TOOLS.clap.radiusMin) * k) * run.mods.radiusMul, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(-gap, 0);
      ctx.rotate(-0.3);
      drawPalm(0, 0, 0.8, 1);
      ctx.restore();
      ctx.save();
      ctx.translate(gap, 0);
      ctx.scale(-1, 1);
      ctx.rotate(-0.3);
      drawPalm(0, 0, 0.8, 1);
      ctx.restore();
    } else if (id === 'swatter') {
      ctx.rotate(0.6);
      ctx.strokeStyle = '#c9a34a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, 110);
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,60,60,0.85)';
      roundRect(-22, -34, 44, 52, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      for (let i = -16; i <= 16; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -30);
        ctx.lineTo(i, 14);
        ctx.moveTo(-18, i);
        ctx.lineTo(18, i);
        ctx.stroke();
      }
    } else if (id === 'racket') {
      const active = run && run.toolState.racket.active;
      ctx.rotate(0.5);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(0, 120);
      ctx.stroke();
      ctx.fillStyle = active ? 'rgba(120,200,255,0.25)' : 'rgba(60,80,120,0.35)';
      ctx.strokeStyle = active ? '#8cf' : '#89a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = active ? 'rgba(160,220,255,0.7)' : 'rgba(140,160,190,0.5)';
      for (let i = -32; i <= 32; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -44);
        ctx.lineTo(i, 44);
        ctx.moveTo(-40, i);
        ctx.lineTo(40, i);
        ctx.stroke();
      }
      if (active) {
        ctx.strokeStyle = '#dff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          let px = -30 + Math.random() * 60;
          let py = -30 + Math.random() * 60;
          ctx.moveTo(px, py);
          for (let j = 0; j < 4; j++) {
            px += -12 + Math.random() * 24;
            py += -12 + Math.random() * 24;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    } else if (id === 'vacuum') {
      const active = run && run.toolState.vacuum.active;
      // шланг уходит вниз-вправо
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(10, 20);
      ctx.bezierCurveTo(60, 60, 120, 200, WORLD.w - x, WORLD.h - y + 40);
      ctx.stroke();
      ctx.fillStyle = '#777';
      ctx.beginPath();
      ctx.moveTo(-18, -14);
      ctx.lineTo(18, -14);
      ctx.lineTo(24, 24);
      ctx.lineTo(-24, 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(0, -14, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (active) {
        ctx.strokeStyle = 'rgba(200,220,255,0.35)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i - 3.5) * 0.35;
          const k = (time * 2 + i * 0.13) % 1;
          const rr = 160 * (1 - k);
          ctx.beginPath();
          ctx.arc(0, 0, rr, a - 0.08, a + 0.08);
          ctx.stroke();
        }
      }
    } else if (id === 'spray') {
      ctx.fillStyle = '#3a8a5a';
      roundRect(-12, -10, 24, 50, 4);
      ctx.fill();
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-6, -20, 12, 10);
      ctx.fillStyle = '#e33';
      ctx.fillRect(-4, -26, 8, 6);
      ctx.fillStyle = '#fff';
      ctx.font = '700 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KILL', 0, 18);
    }
    ctx.restore();
  }

  function drawPalm(x, y, s, squash) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s * squash);
    ctx.fillStyle = SKIN;
    ctx.strokeStyle = SKIN_DARK;
    ctx.lineWidth = 2;
    roundRect(-16, -10, 32, 34, 10);
    ctx.fill();
    ctx.stroke();
    const fingers = [[-12, -26, 7, 20], [-3, -32, 7, 24], [6, -30, 7, 22], [14, -22, 6, 18]];
    for (const [fx, fy, fw, fh] of fingers) {
      roundRect(fx - fw / 2, fy, fw, fh, fw / 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(-20, 4, 7, 12, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ----------------------------------------------------------- эффекты
  function drawFx(time) {
    for (const f of fx) {
      const k = 1 - f.life / f.maxLife;
      if (f.type === 'ring') {
        ctx.strokeStyle = f.color || 'rgba(255,255,255,0.8)';
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (0.5 + k * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.type === 'swipe') {
        ctx.strokeStyle = 'rgba(255,230,180,0.9)';
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = f.w * (1 - k * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.ax, f.ay);
        ctx.lineTo(f.bx, f.by);
        ctx.stroke();
      } else if (f.type === 'zap') {
        ctx.strokeStyle = '#cff';
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        for (let j = 0; j < 5; j++) ctx.lineTo(f.x + (Math.random() - 0.5) * 40, f.y + (Math.random() - 0.5) * 40);
        ctx.stroke();
      } else if (f.type === 'cloud') {
        ctx.globalAlpha = (1 - k) * 0.5;
        const g = ctx.createRadialGradient(f.x, f.y, 5, f.x, f.y, f.r);
        g.addColorStop(0, 'rgba(180,255,200,0.7)');
        g.addColorStop(1, 'rgba(180,255,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (0.8 + k * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.fillStyle = '#cfc';
        for (let j = 0; j < 6; j++) {
          const a = f.seed + j * 1.05 + time * 0.3;
          ctx.beginPath();
          ctx.arc(f.x + Math.cos(a) * f.r * 0.5, f.y + Math.sin(a) * f.r * 0.4, f.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (f.type === 'splat') {
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.fillStyle = f.color || '#b0202a';
        for (const s of f.spots) {
          ctx.beginPath();
          ctx.ellipse(f.x + s.dx, f.y + s.dy, s.r, s.r * 0.7, s.a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawOverlays(run) {
    const { w, h } = WORLD;
    // общая темнота ночи, лампа чуть светлит
    ctx.fillStyle = run && run.lampOn ? 'rgba(10,8,30,0.10)' : 'rgba(10,8,30,0.22)';
    ctx.fillRect(0, 0, w, h);
    // дремота: чем выше сон, тем синее края
    if (run && run.phase === 'play') {
      const s = Math.max(0, (run.sleep - 60) / 40);
      if (s > 0) {
        const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
        g.addColorStop(0, 'rgba(20,30,80,0)');
        g.addColorStop(1, `rgba(20,30,80,${0.45 * s})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }
    if (redFlash > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
      g.addColorStop(0, 'rgba(200,0,0,0)');
      g.addColorStop(1, `rgba(200,0,0,${0.55 * redFlash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (whiteFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${whiteFlash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render(run, pointer, particles, time, showHand) {
    ctx.save();
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2);
    drawRoom(run, time);
    if (run) {
      // облака спрея
      for (const c of run.clouds) {
        if (!fx.some((f) => f.cloud === c)) fx.push({ type: 'cloud', cloud: c, x: c.x, y: c.y, r: TOOLS.spray.radius, life: c.t, maxLife: TOOLS.spray.duration, seed: Math.random() * 6 });
      }
      for (const m of run.mosquitoes) if (m.alive) drawMosquito(m, run, time);
    }
    drawFx(time);
    particles.draw(ctx);
    drawOverlays(run);
    if (showHand) drawHand(run, pointer, time);
    ctx.restore();
  }

  return { render, update, addFx, shakeScreen, flash, fx };
}
