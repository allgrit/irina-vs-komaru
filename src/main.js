import { WORLD, TOOLS, NIGHT } from './game/config.js';
import { createRun, updateRun, runAction, drainEvents, clockLabel } from './game/run.js';
import { defaultMeta, unlockedTools, toolSlots, startingHearts, startSleep, buy, recordRun } from './game/meta.js';
import { generateMissions, applyMissionEvent } from './game/missions.js';
import { insertEntry, rankOf, encodeResult, decodeResult, shareText } from './game/leaderboard.js';
import { dailySeed, hashString, createRng } from './core/rng.js';
import { browserStorage } from './core/storage.js';
import { createAudio } from './core/audio.js';
import { createInput } from './core/input.js';
import { createScene } from './render/scene.js';
import { createParticles } from './render/particles.js';
import * as S from './render/screens.js';

// ---------------------------------------------------------------- состояние
const storage = browserStorage();
const meta = Object.assign(defaultMeta(), storage.get('meta', {}));
meta.stats = Object.assign(defaultMeta().stats, meta.stats || {});
const boards = Object.assign({ normal: [], daily: [] }, storage.get('boards', {}));
const dailyDone = storage.get('dailyDone', {});
if (!meta.missions?.length) meta.missions = generateMissions(createRng(Date.now()), meta.missionTiers, [], unlockedTools(meta));

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hudEl = document.getElementById('hud');
const screensEl = document.getElementById('screens');
const toastsEl = document.getElementById('toasts');
const audio = createAudio();
audio.setEnabled(meta.sound !== false);
const scene = createScene(ctx);
const particles = createParticles();

let run = null;
let paused = false;
let screen = 'menu';
let loadout = storage.get('loadout', ['palm', 'clap']);
let night = Math.min(meta.bestNight, storage.get('night', 1));
let boardTab = 'normal';
let lastEntry = null;
let timeScale = 1;
let lastT = performance.now();
let time = 0;
let lastPhase = null;
let completedThisRun = [];
let comboShown = 1;
let toolButtons = {};

function saveAll() {
  storage.set('meta', meta);
  storage.set('boards', boards);
  storage.set('dailyDone', dailyDone);
  storage.set('loadout', loadout);
  storage.set('night', night);
}
saveAll();

// ---------------------------------------------------------------- масштаб
function fit() {
  const s = Math.min(window.innerWidth / WORLD.w, window.innerHeight / WORLD.h);
  document.getElementById('stage').style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

// ---------------------------------------------------------------- экраны
function show(name, html) {
  screen = name;
  screensEl.innerHTML = html || '';
  canvas.classList.toggle('cursor', !!html);
}

function toast(msg, cls = '') {
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.textContent = msg;
  toastsEl.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function todayKey() {
  return dailySeed();
}

function showMenu() {
  run = null;
  audio.stopAll();
  audio.setAmbient(false);
  hudEl.classList.add('hidden');
  show('menu', S.menuScreen(meta, !!dailyDone[todayKey()]));
}

function showLoadout() {
  const open = unlockedTools(meta);
  loadout = loadout.filter((t) => open.includes(t));
  if (!loadout.includes('palm')) loadout.unshift('palm');
  loadout = loadout.slice(0, toolSlots(meta));
  night = Math.min(night, meta.bestNight);
  show('loadout', S.loadoutScreen(meta, loadout, night));
}

// ---------------------------------------------------------------- забег
function startRun(opts) {
  completedThisRun = [];
  run = createRun(opts);
  run.lastSwat = 0;
  paused = false;
  lastPhase = null;
  comboShown = 1;
  buildToolbar();
  hudEl.classList.remove('hidden');
  audio.resume();
  audio.setAmbient(true);
  syncPhase();
}

function startNormal() {
  const tools = loadout.slice();
  startRun({ seed: `night-${night}-${Date.now()}`, night, tools, hearts: startingHearts(meta), startSleep: startSleep(meta), rarePool: meta.unlocked.includes('rarepool') });
}

function startDaily() {
  const seed = todayKey();
  startRun({ seed, night: 1, daily: true, tools: ['palm', 'clap', 'swatter', 'racket'], hearts: 4, startSleep: 0, rarePool: true });
}

function syncPhase() {
  if (!run || run.phase === lastPhase) return;
  lastPhase = run.phase;
  if (run.phase === 'draft') {
    audio.stopAll();
    show('draft', S.draftScreen(run));
  } else if (run.phase === 'play') {
    show('play', '');
    updateHud(true);
  } else if (run.phase === 'won' || run.phase === 'lost') {
    finishRun();
  }
}

function finishRun() {
  const r = run.result;
  audio.stopAll();
  audio.setAmbient(false);
  if (r.won) audio.sfx.win();
  else audio.sfx.lose();
  // задания
  for (const m of meta.missions) {
    if (m.done && !m.claimed) {
      m.claimed = true;
      meta.coins += m.reward;
      meta.missionTiers[m.id] = (meta.missionTiers[m.id] || 0) + 1;
      completedThisRun.push(m);
    }
  }
  meta.missions = meta.missions.filter((m) => !m.claimed);
  meta.missions = generateMissions(createRng(Date.now()), meta.missionTiers, meta.missions, unlockedTools(meta));
  recordRun(meta, r);
  // рекорды
  const name = (document.getElementById('player-name')?.value || meta.name || 'Ирина').trim().slice(0, 16) || 'Ирина';
  meta.name = name;
  const entry = { name, score: r.score, night: r.night, hours: r.hours, date: new Date().toISOString().slice(0, 10), seedHash: hashString(String(run.seed)), daily: r.daily };
  const key = r.daily ? 'daily' : 'normal';
  boards[key] = insertEntry(boards[key], entry);
  if (r.daily) dailyDone[todayKey()] = r.score;
  lastEntry = entry;
  const rank = rankOf(boards[key], entry);
  const code = encodeResult(entry);
  saveAll();
  hudEl.classList.add('hidden');
  const won = r.won;
  const finished = run;
  run = null;
  show('result', S.resultScreen(finished, entry, rank, code, completedThisRun, meta));
  if (won && !r.daily) night = Math.min(meta.bestNight, r.night + 1);
}

function buildToolbar() {
  const el = document.getElementById('hud-tools');
  el.innerHTML = run.tools.map((id, i) => S.toolButtonHtml(id, i)).join('');
  toolButtons = {};
  for (const b of el.querySelectorAll('.tool')) toolButtons[b.dataset.tool] = b;
}

function updateHud(force) {
  if (!run) return;
  document.getElementById('hud-clock').textContent = clockText();
  document.getElementById('hud-hour').style.width = `${Math.min(100, (run.hourT / NIGHT.hourSeconds) * 100)}%`;
  const hearts = document.getElementById('hud-hearts');
  const maxH = Math.max(run.maxHearts, run.hearts);
  let hs = '';
  for (let i = 0; i < maxH; i++) hs += `<span class="${i < run.hearts ? '' : 'lost'}">❤️</span>`;
  if (hearts.innerHTML !== hs) hearts.innerHTML = hs;
  const sleepFill = document.getElementById('hud-sleep');
  sleepFill.style.width = `${run.sleep}%`;
  const blocked = run.buzzing || run.wakeT > 0 || (run.toolState.vacuum && run.toolState.vacuum.active);
  sleepFill.classList.toggle('blocked', blocked);
  document.getElementById('hud-sleep-pct').textContent = `${Math.round(run.sleep)} %`;
  const status = document.getElementById('hud-status');
  status.textContent = run.wakeT > 0 ? '😠 Ирина проснулась!' : run.buzzing ? '🦟 Бзз у самого уха…' : run.toolState.vacuum?.active ? '🌀 Шумно, не уснуть' : run.lampOn && run.mods.lampSleepFactor < 1 ? '💡 Свет мешает спать' : run.sleep >= 99 ? '😴 Спит как младенец' : '';
  document.getElementById('hud-score').textContent = run.scoring.score;
  const combo = document.getElementById('hud-combo');
  if (run.scoring.combo !== comboShown || force) {
    comboShown = run.scoring.combo;
    combo.textContent = `×${comboShown}`;
    combo.classList.toggle('high', comboShown >= 5);
    combo.classList.remove('pop');
    void combo.offsetWidth;
    combo.classList.add('pop');
    setTimeout(() => combo.classList.remove('pop'), 120);
  }
  for (const id of run.tools) {
    const b = toolButtons[id];
    const st = run.toolState[id];
    const cfg = TOOLS[id];
    b.classList.toggle('active', run.tool === id);
    const cd = b.querySelector('.cd');
    cd.style.height = cfg.cooldown && st.cooldown > 0 ? `${(st.cooldown / (cfg.cooldown * run.mods.cooldownMul)) * 100}%` : '0';
    if (cfg.battery) b.querySelector('.meter i').style.width = `${(st.battery / cfg.battery) * 100}%`;
    if (cfg.charges) b.querySelector('.charges').textContent = `${st.charges}`;
  }
  document.getElementById('hud-lamp').classList.toggle('on', run.lampOn);
}

function clockText() {
  const h = (NIGHT.startHour + run.hour) % 24;
  const m = Math.floor((Math.min(run.hourT, NIGHT.hourSeconds) / NIGHT.hourSeconds) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- события забега
const BLOOD = ['#b0202a', '#8a1420', '#d43a3a'];

function handleEvents() {
  for (const ev of drainEvents(run)) {
    switch (ev.kind) {
      case 'kill': {
        particles.burst(ev.x, ev.y, { count: ev.m.type.boss ? 60 : 10 + ev.m.type.radius, color: BLOOD, speed: ev.m.type.boss ? 260 : 140, size: 2.5 });
        scene.addFx({ type: 'splat', x: ev.x, y: ev.y, life: 2.5, maxLife: 2.5, spots: Array.from({ length: 5 }, () => ({ dx: (Math.random() - 0.5) * 24, dy: (Math.random() - 0.5) * 18, r: 3 + Math.random() * 6, a: Math.random() * 3 })) });
        const col = ev.combo >= 5 ? '#ff4a6a' : ev.combo >= 2 ? '#ffcf6a' : '#fff';
        particles.text(ev.x, ev.y - 14, `+${ev.gained}${ev.combo > 1 ? ` ×${ev.combo}` : ''}`, { color: col, size: ev.combo >= 5 ? 20 : 16 });
        if (ev.tool === 'racket') {
          scene.addFx({ type: 'zap', x: ev.x, y: ev.y, life: 0.15, maxLife: 0.15 });
          audio.sfx.zap();
        } else audio.sfx.splat();
        if (ev.m.type.boss) {
          audio.sfx.bossKill();
          scene.shakeScreen(12, 0.5);
          scene.flash('white');
          timeScale = 0.3;
          particles.text(WORLD.w / 2, 200, 'МАТКА ПОВЕРЖЕНА', { color: '#ffcf6a', size: 34, life: 2, vy: -10, bold: true });
        }
        applyMission({ kind: 'kill', type: ev.type, perched: ev.perched, tool: ev.tool });
        applyMission({ kind: 'combo', value: ev.combo });
        break;
      }
      case 'hit':
        particles.burst(ev.x, ev.y, { count: 5, color: '#fff', speed: 90, size: 1.5, shape: 'spark', gravity: 0 });
        if (ev.tool === 'racket') {
          scene.addFx({ type: 'zap', x: ev.x, y: ev.y, life: 0.1, maxLife: 0.1 });
          audio.sfx.zap();
        } else audio.sfx.hit();
        break;
      case 'miss':
        particles.text(ev.x, ev.y - 10, 'мимо', { color: '#9aa3c7', size: 13, life: 0.6 });
        audio.sfx.miss();
        break;
      case 'gambler':
        particles.text(ev.x, ev.y - 10, 'Азарт!', { color: '#b48cff', size: 14 });
        audio.sfx.gambler();
        break;
      case 'swat':
        scene.addFx({ type: 'ring', x: ev.x, y: ev.y, r: ev.r, life: 0.2, maxLife: 0.2 });
        run.lastSwat = 0.1;
        audio.sfx.swat();
        break;
      case 'clap':
        scene.addFx({ type: 'ring', x: ev.x, y: ev.y, r: ev.r, life: 0.35, maxLife: 0.35, color: 'rgba(255,220,150,0.9)' });
        particles.burst(ev.x, ev.y, { count: 8, color: '#ffe9b0', speed: 100, size: 2, gravity: 0, life: 0.3 });
        scene.shakeScreen(ev.r / 30, 0.1);
        audio.sfx.clap(ev.r / 90);
        break;
      case 'swipe':
        scene.addFx({ type: 'swipe', ax: ev.ax, ay: ev.ay, bx: ev.bx, by: ev.by, w: TOOLS.swatter.width * run.mods.swatterMul, life: 0.25, maxLife: 0.25 });
        audio.sfx.swipe();
        break;
      case 'spray':
        audio.sfx.spray();
        particles.burst(ev.x, ev.y, { count: 14, color: '#cfc', speed: 60, size: 5, gravity: -10, life: 1.2, shape: 'smoke' });
        break;
      case 'holdStart':
        if (ev.id === 'vacuum') audio.setVacuum(true);
        break;
      case 'holdEnd':
        if (ev.id === 'vacuum') audio.setVacuum(false);
        break;
      case 'bite':
        scene.shakeScreen(8, 0.35);
        scene.flash('red');
        audio.sfx.bite();
        particles.text(ev.x, ev.y - 20, ev.dmg > 1 ? 'УКУС! −2' : 'УКУС!', { color: '#ff6b6b', size: 22, bold: true });
        particles.burst(ev.x, ev.y, { count: 8, color: '#ff8a8a', speed: 80, size: 2 });
        break;
      case 'absorb':
        particles.text(ev.x, ev.y - 20, 'Капюшон спас!', { color: '#7ee787', size: 16 });
        audio.sfx.absorb();
        break;
      case 'heal':
        particles.text(300, 260, '+❤️', { color: '#ff7a9a', size: 22 });
        audio.sfx.heal();
        break;
      case 'stuck':
        audio.sfx.stuck();
        break;
      case 'buzzStart':
        particles.text(ev.m.x + 10, ev.m.y - 12, 'бзз', { color: '#fff', size: 12, life: 0.6, vy: -20 });
        break;
      case 'hourStart':
        audio.sfx.chime();
        particles.text(WORLD.w / 2, 120, ev.clock, { color: '#ffcf6a', size: 42, life: 1.6, vy: -8, bold: true });
        break;
      case 'hourEnd':
        if (ev.quiet) applyMission({ kind: 'quiet_hour' });
        applyMission({ kind: 'hour_sleep', value: Math.round(ev.sleep) });
        applyMission({ kind: 'tools_in_hour', value: ev.toolsUsed });
        break;
      case 'perk':
        audio.sfx.perk();
        break;
      case 'lamp':
        audio.sfx.lamp(ev.on);
        break;
      case 'toolSelect':
        audio.sfx.select();
        break;
      case 'denied':
        audio.sfx.denied();
        break;
      case 'win':
        applyMission({ kind: 'win' });
        break;
      default:
        break;
    }
  }
}

function applyMission(event) {
  const done = applyMissionEvent(meta.missions, event);
  for (const m of done) {
    toast(`Задание выполнено: ${m.text} (+${m.reward} 🪙)`, 'good');
    audio.sfx.coin();
  }
}

// ---------------------------------------------------------------- ввод
const pointer = createInput(canvas, WORLD, {
  press(p) {
    audio.resume();
    if (!run || run.phase !== 'play' || paused) return;
    runAction(run, 'press', p);
  },
  release(p) {
    if (!run || run.phase !== 'play' || paused) return;
    runAction(run, 'release', p);
  },
  key(key) {
    if (!run) return;
    const k = key.toLowerCase();
    if (k === 'escape' || k === 'p') {
      togglePause();
      return;
    }
    if (run.phase !== 'play' || paused) return;
    if (k === 'l' || k === 'д') runAction(run, 'lamp');
    if (k === 'm' || k === 'ь') toggleSound();
    const idx = parseInt(key, 10) - 1;
    if (idx >= 0 && idx < run.tools.length) runAction(run, 'selectTool', { id: run.tools[idx] });
  },
  wheel(dir) {
    if (!run || run.phase !== 'play' || paused) return;
    const i = run.tools.indexOf(run.tool);
    const next = run.tools[(i + dir + run.tools.length) % run.tools.length];
    runAction(run, 'selectTool', { id: next });
  },
});

function togglePause() {
  if (!run || run.phase !== 'play') return;
  paused = !paused;
  if (paused) {
    audio.stopAll();
    show('pause', S.pauseScreen());
  } else show('play', '');
}

function toggleSound() {
  meta.sound = !meta.sound;
  audio.setEnabled(meta.sound);
  saveAll();
  if (screen === 'menu') showMenu();
}

document.getElementById('stage').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  audio.resume();
  const a = btn.dataset.action;
  switch (a) {
    case 'loadout':
      saveName();
      showLoadout();
      break;
    case 'toggle-tool': {
      const id = btn.dataset.tool;
      if (id === 'palm') break;
      if (loadout.includes(id)) loadout = loadout.filter((t) => t !== id);
      else if (loadout.length < toolSlots(meta)) loadout.push(id);
      else toast('Все слоты заняты');
      saveAll();
      showLoadout();
      break;
    }
    case 'night':
      night = Number(btn.dataset.night);
      saveAll();
      showLoadout();
      break;
    case 'start':
      saveAll();
      startNormal();
      break;
    case 'daily':
      saveName();
      if (dailyDone[todayKey()]) toast(`Сегодня уже сыграно: ${dailyDone[todayKey()]} очков. Новый вызов завтра.`);
      else startDaily();
      break;
    case 'perk':
      runAction(run, 'pickPerk', { id: btn.dataset.perk });
      break;
    case 'tool':
      runAction(run, 'selectTool', { id: btn.dataset.tool });
      break;
    case 'lamp':
      runAction(run, 'lamp');
      break;
    case 'pause':
    case 'resume':
      togglePause();
      break;
    case 'quit':
      run.hearts = 0;
      run.phase = 'lost';
      run.result = { won: false, score: run.scoring.score, kills: run.scoring.kills, bestCombo: run.scoring.bestCombo, hours: run.hour, night: run.night, daily: run.daily, avgSleep: 0, coins: Math.floor(run.scoring.score / 100), nightBonus: 0, perks: run.perks.slice() };
      paused = false;
      finishRun();
      break;
    case 'retry':
      if (lastEntry) startNormal();
      break;
    case 'menu':
      showMenu();
      break;
    case 'shop':
      show('shop', S.shopScreen(meta));
      break;
    case 'buy':
      if (buy(meta, btn.dataset.item)) {
        audio.sfx.coin();
        saveAll();
        show('shop', S.shopScreen(meta));
      }
      break;
    case 'missions':
      show('missions', S.missionsScreen(meta.missions));
      break;
    case 'board':
      show('board', S.boardScreen(boards, boardTab, lastEntry));
      break;
    case 'board-tab':
      boardTab = btn.dataset.tab;
      show('board', S.boardScreen(boards, boardTab, lastEntry));
      break;
    case 'import': {
      const code = document.getElementById('import-code').value;
      const entry = decodeResult(code);
      if (!entry) {
        toast('Код не распознан');
        break;
      }
      const key = entry.daily ? 'daily' : 'normal';
      boards[key] = insertEntry(boards[key], entry);
      boardTab = key;
      saveAll();
      toast(`Добавлен результат: ${entry.name}, ${entry.score}`, 'good');
      show('board', S.boardScreen(boards, boardTab, entry));
      break;
    }
    case 'copy': {
      const code = document.getElementById('share-code').textContent;
      const text = shareText(lastEntry, code);
      navigator.clipboard?.writeText(text).then(() => toast('Скопировано в буфер', 'good')).catch(() => toast('Выдели код и скопируй вручную'));
      break;
    }
    case 'help':
      show('help', S.helpScreen());
      break;
    case 'sound':
      toggleSound();
      break;
    default:
      break;
  }
});

function saveName() {
  const el = document.getElementById('player-name');
  if (el) meta.name = el.value.trim().slice(0, 16);
  saveAll();
}

// ---------------------------------------------------------------- цикл
function frame(now) {
  const raw = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  timeScale += (1 - timeScale) * Math.min(1, raw * 3);
  const dt = raw * timeScale;
  time += dt;
  if (run && run.phase === 'play' && !paused) {
    if (run.lastSwat > 0) run.lastSwat -= dt;
    updateRun(run, dt, { x: pointer.x, y: pointer.y });
    handleEvents();
    syncPhase();
    if (run && run.phase === 'play') {
      updateHud();
      const near = run.mosquitoes
        .filter((m) => m.alive && m.state !== 'hide')
        .map((m) => ({ id: m.id, x: m.x, y: m.y, dist: Math.hypot(m.x - 300, m.y - 306), buzzing: m.state === 'buzzing', big: m.type.boss, quiet: m.type.id === 'ghost' }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);
      audio.updateBuzz(near, 300, WORLD.w);
    }
  }
  particles.update(dt);
  scene.update(dt);
  scene.render(run, pointer, particles, time, !!run && run.phase === 'play' && !paused);
  requestAnimationFrame(frame);
}

// отладочный доступ для e2e-проверок
window.__ivk = { get run() { return run; }, meta, boards, runAction };

showMenu();
requestAnimationFrame(frame);
