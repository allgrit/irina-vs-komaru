import { TOOLS, META_SHOP, MOSQUITO_TYPES, NIGHT } from '../game/config.js';
import { PERKS } from '../game/perks.js';
import { unlockedTools, toolSlots, canBuy } from '../game/meta.js';
import { clockLabel } from '../game/run.js';

// HTML-шаблоны экранов. Действия помечаются data-action, обработчики в main.js.

export const TOOL_ICONS = { palm: '✋', clap: '👏', swatter: '🏓', racket: '🎾', vacuum: '🌀', spray: '🧴' };
const RARITY_RU = { common: 'обычный', rare: 'редкий', epic: 'эпический' };

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function menuScreen(meta, dailyPlayed, opts = {}) {
  const s = meta.stats;
  return `<div class="screen"><div class="panel">
    <div class="menu-grid">
      <div>
        <h1>Ирина против комаров</h1>
        <p class="tagline">Ирочка только легла — и снова «бзз». Помоги ей дожить до утра.</p>
        <p class="lead">Семь часов ночи, шесть способов ловли, перки на каждый час и лавка между ночами. Сон Ирины — твой счёт.</p>
        <div class="stat-line">
          <span>Ночей сыграно: <b>${s.runs}</b></span>
          <span>Побед: <b>${s.wins}</b></span>
          <span>Комаров убито: <b>${s.kills}</b></span>
          <span>Рекорд: <b>${s.bestScore}</b></span>
        </div>
        <div class="row" style="margin-top:14px">
          <span class="coins">🪙 ${meta.coins}</span>
          <span class="stat-line">Открыта ночь <b>${meta.bestNight}</b></span>
        </div>
        <div class="field" style="margin-top:14px;max-width:320px">
          <label>Имя для таблицы рекордов</label>
          <input class="text" id="player-name" maxlength="16" placeholder="Ирина" value="${esc(meta.name || '')}" />
        </div>
      </div>
      <div class="menu-buttons">
        <button class="btn primary big" data-action="loadout">Новая ночь</button>
        <button class="btn" data-action="daily">${dailyPlayed ? '✅ ' : '📅 '}Ежедневный вызов</button>
        <button class="btn" data-action="shop">🛒 Лавка</button>
        <button class="btn" data-action="missions">📋 Задания</button>
        <button class="btn" data-action="board">🏆 Рекорды</button>
        <button class="btn ghost" data-action="help">❓ Как играть</button>
        <div class="row">
          <button class="btn ghost small" data-action="sound">${meta.sound ? '🔊 Звук вкл' : '🔇 Звук выкл'}</button>
          ${opts.fullscreen ? '<button class="btn ghost small" data-action="fullscreen">⛶ На весь экран</button>' : ''}
        </div>
      </div>
    </div>
    <div class="footer">${opts.touch ? 'Палец — рука Ирины: тап, зажать, провести. Кнопки инструментов и лампы внизу экрана.' : 'Мышь или палец — рука Ирины. Клавиши <span class="kbd">1</span>–<span class="kbd">4</span> инструменты, <span class="kbd">L</span> лампа, <span class="kbd">Esc</span> пауза.'}</div>
  </div></div>`;
}

export function loadoutScreen(meta, selected, night) {
  const tools = unlockedTools(meta);
  const slots = toolSlots(meta);
  const allTools = Object.keys(TOOLS);
  const chips = allTools
    .map((id) => {
      const t = TOOLS[id];
      const open = tools.includes(id);
      const sel = selected.includes(id);
      return `<button class="chip ${sel ? 'selected' : ''} ${open ? '' : 'locked'}" data-action="toggle-tool" data-tool="${id}" ${open ? '' : 'disabled'}>
        <span class="icon">${TOOL_ICONS[id]}</span><span><div class="t">${t.name}${open ? '' : ' 🔒'}</div><div class="d">${t.desc}</div></span></button>`;
    })
    .join('');
  const nights = [];
  for (let n = 1; n <= meta.bestNight; n++) nights.push(`<button class="chip ${n === night ? 'selected' : ''}" data-action="night" data-night="${n}">Ночь ${n}</button>`);
  return `<div class="screen"><div class="panel">
    <h2>Сборы ко сну</h2>
    <p class="lead">Выбери до ${slots} инструментов (ладонь всегда с собой) и уровень ночи. Чем выше ночь, тем злее комары.</p>
    <h3>Инструменты · выбрано ${selected.length}/${slots}</h3>
    <div class="chips">${chips}</div>
    <h3>Ночь</h3>
    <div class="night-select">${nights.join('')}</div>
    <div class="row between" style="margin-top:18px">
      <button class="btn ghost" data-action="menu">← Назад</button>
      <button class="btn primary big" data-action="start">Ложиться спать →</button>
    </div>
  </div></div>`;
}

export function draftScreen(run) {
  const last = run.hour > 0 ? run.sleepHistory[run.sleepHistory.length - 1] : null;
  const summary = last === null ? '' : `<div class="hour-summary">
      <div><b>${Math.round(last)} %</b><span>сон за час</span></div>
      <div><b>+${run.hourBonusLast}</b><span>бонус</span></div>
      <div><b>${run.scoring.kills}</b><span>убито всего</span></div>
      <div><b>${'❤️'.repeat(Math.max(0, run.hearts))}</b><span>терпение</span></div>
    </div>`;
  const cards = run.draft
    .map(
      (p) => `<button class="card ${p.rarity}" data-action="perk" data-perk="${p.id}">
      <div class="rarity">${RARITY_RU[p.rarity]}</div>
      <div class="title">${p.name}</div>
      <div class="desc">${p.desc}</div>
    </button>`
    )
    .join('');
  const title = run.hour === 0 ? 'Ирина ложится спать' : `Ирина переворачивается на другой бок`;
  return `<div class="screen"><div class="panel">
    <h2>${clockLabel(run.hour)} · ${title}</h2>
    ${summary}
    <p class="lead">Выбери одно усиление на ${run.hour === 0 ? 'эту ночь' : 'следующий час'}.</p>
    <div class="cards">${cards}</div>
  </div></div>`;
}

export function pauseScreen() {
  return `<div class="screen transparent"><div class="panel narrow" style="text-align:center">
    <h2>Пауза</h2>
    <p class="lead">Комары тоже отдыхают.</p>
    <div class="row center">
      <button class="btn primary" data-action="resume">Продолжить</button>
      <button class="btn ghost" data-action="quit">Сдаться и уйти на кухню</button>
    </div>
  </div></div>`;
}

export function resultScreen(run, entry, rank, code, completed, meta) {
  const r = run.result;
  const perks = r.perks.map((id) => PERKS.find((p) => p.id === id)?.name).filter(Boolean).join(', ') || 'без перков';
  const done = completed.length
    ? `<h3>Выполнены задания</h3><div class="missions">${completed.map((m) => `<div class="mission done"><div class="t">${m.text}</div><div class="reward">+${m.reward} 🪙</div></div>`).join('')}</div>`
    : '';
  const title = r.won ? 'Утро! Ирина выспалась' : 'Ирина ушла спать на кухню';
  const sub = r.won ? `Ночь ${r.night} пройдена. ${r.avgSleep >= 80 ? 'Отличный сон!' : r.avgSleep >= 50 ? 'Могло быть и лучше.' : 'Сон так себе, но живая.'}` : `Продержалась ${r.hours} из 7 часов.`;
  return `<div class="screen"><div class="panel">
    <div class="row between">
      <div><h2>${title}</h2><p class="lead">${sub}</p></div>
      <div class="big-score">${r.score}</div>
    </div>
    <div class="result-stats">
      <div><b>${r.kills}</b><span>комаров</span></div>
      <div><b>×${r.bestCombo}</b><span>макс. комбо</span></div>
      <div><b>${r.avgSleep} %</b><span>средний сон</span></div>
      <div><b>+${r.coins}</b><span>монет</span></div>
    </div>
    <p><b>Перки:</b> ${perks}</p>
    <p><b>Рекорды:</b> ${rank ? `место ${rank} в таблице ${r.daily ? 'ежедневки' : 'ночей'}` : 'в топ-10 не вошло'}. Всего монет: <span class="coins">🪙 ${meta.coins}</span></p>
    ${done}
    <h3>Поделиться результатом</h3>
    <div class="share-row"><div class="code" id="share-code">${code}</div><button class="btn small" data-action="copy">Копировать</button></div>
    <div class="row between" style="margin-top:18px">
      <button class="btn ghost" data-action="menu">В меню</button>
      <div class="row">
        <button class="btn" data-action="shop">🛒 Лавка</button>
        <button class="btn primary" data-action="${r.daily ? 'menu' : 'retry'}">${r.daily ? 'Готово' : r.won ? 'Следующая ночь →' : 'Ещё раз'}</button>
      </div>
    </div>
  </div></div>`;
}

export function shopScreen(meta) {
  const items = META_SHOP.map((it) => {
    const owned = meta.unlocked.includes(it.id);
    const c = canBuy(meta, it.id);
    const icon = it.kind === 'tool' ? TOOL_ICONS[it.tool] : it.kind === 'heart' ? '❤️' : it.kind === 'slot' ? '🎒' : it.kind === 'startSleep' ? '🥛' : '📖';
    return `<div class="shop-item ${owned ? 'owned' : ''}">
      <div class="t">${icon} ${it.name}</div>
      <div class="d">${it.desc}</div>
      <div class="row between"><span class="price">${owned ? 'куплено' : `🪙 ${it.price}`}</span>
      ${owned ? '' : `<button class="btn small ${c.ok ? 'primary' : ''}" data-action="buy" data-item="${it.id}" ${c.ok ? '' : 'disabled'} title="${c.ok ? '' : c.reason}">${c.ok ? 'Купить' : c.reason}</button>`}</div>
    </div>`;
  }).join('');
  return `<div class="screen"><div class="panel">
    <div class="row between"><h2>Лавка «Спокойной ночи»</h2><span class="coins">🪙 ${meta.coins}</span></div>
    <p class="lead">Монеты приходят за очки (1 за каждые 100) и за задания.</p>
    <div class="shop-grid">${items}</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-action="menu">← В меню</button></div>
  </div></div>`;
}

export function boardScreen(boards, tab, highlight) {
  const list = boards[tab] || [];
  const rows = list.length
    ? list
        .map(
          (e, i) => `<tr class="${highlight && e.date === highlight.date && e.score === highlight.score && e.name === highlight.name ? 'me' : ''}">
        <td>${i + 1}</td><td>${esc(e.name)}${e.imported ? ' <span title="импорт">🔗</span>' : ''}</td><td class="num">${e.score}</td><td>${e.daily ? 'ежедн.' : `ночь ${e.night}`}</td><td>${e.hours}/7</td><td>${e.date}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty">Пока пусто. Сыграй ночь!</td></tr>';
  return `<div class="screen"><div class="panel">
    <h2>Таблица рекордов</h2>
    <div class="tabs">
      <button class="btn small ${tab === 'normal' ? 'active' : ''}" data-action="board-tab" data-tab="normal">Ночи</button>
      <button class="btn small ${tab === 'daily' ? 'active' : ''}" data-action="board-tab" data-tab="daily">Ежедневный вызов</button>
    </div>
    <table class="board"><thead><tr><th>#</th><th>Имя</th><th>Очки</th><th>Режим</th><th>Часы</th><th>Дата</th></tr></thead><tbody>${rows}</tbody></table>
    <h3>Импорт результата друга</h3>
    <p class="lead">Вставь код вида <span class="kbd">IVK1-…</span>, и результат встанет в твою таблицу.</p>
    <div class="row"><input class="text" id="import-code" placeholder="IVK1-..." style="flex:1" /><button class="btn small" data-action="import">Добавить</button></div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-action="menu">← В меню</button></div>
  </div></div>`;
}

export function missionsScreen(missions) {
  const items = missions.length
    ? missions
        .map(
          (m) => `<div class="mission ${m.done ? 'done' : ''}">
        <div class="t">${m.done ? '✅ ' : ''}${m.text}</div><div class="reward">+${m.reward} 🪙</div>
        <div class="bar"><div class="fill" style="width:${Math.round((m.progress / m.target) * 100)}%"></div></div>
      </div>`
        )
        .join('')
    : '<div class="empty">Все задания выполнены. Ты легенда спальни.</div>';
  return `<div class="screen"><div class="panel narrow">
    <h2>Задания</h2>
    <p class="lead">Прогресс копится между ночами. Награда начисляется в конце забега, после чего задание сменяется новым.</p>
    <div class="missions">${items}</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-action="menu">← В меню</button></div>
  </div></div>`;
}

export function helpScreen() {
  const types = Object.values(MOSQUITO_TYPES)
    .map((t) => `<div><i style="background:${t.color}"></i><span><b>${t.name}</b> — ${typeHint(t.id)}</span></div>`)
    .join('');
  return `<div class="screen"><div class="panel">
    <h2>Как играть</h2>
    <div class="help-grid">
      <div>
        <h3>Цель</h3>
        <ul>
          <li>Ночь длится 7 часов по ${NIGHT.hourSeconds} с. Дотяни до 06:00.</li>
          <li><b>Сон</b> растёт, пока у уха тихо. Каждый % сна в конце часа — очки.</li>
          <li>Комар у уха жужжит ${NIGHT.buzzToBiteSeconds} с и <b>кусает</b>: −1 терпение, −25 сна, Ирина просыпается.</li>
          <li>Терпение кончилось — Ирина уходит на кухню. Забег окончен.</li>
          <li>Убийства подряд без промахов растят <b>комбо</b> до ×10.</li>
        </ul>
        <h3>Инструменты</h3>
        <ul>
          <li><b>Ладонь</b> — клик. Промах сбрасывает комбо.</li>
          <li><b>Хлопок</b> — зажми и отпусти, радиус растёт.</li>
          <li><b>Мухобойка</b> — проведи линию.</li>
          <li><b>Электроракетка</b> — держи, бьёт током, батарея.</li>
          <li><b>Пылесос</b> — держи, тянет комаров, но шумит.</li>
          <li><b>Спрей</b> — облако на 4 с, 3 заряда в час.</li>
          <li><b>Лампа</b> (L) — комары летят к ней, а не к уху, но сон растёт вдвое медленнее.</li>
        </ul>
      </div>
      <div>
        <h3>Комары</h3>
        <div class="legend">${types}</div>
        <h3>Роглайт</h3>
        <ul>
          <li>Перед каждым часом — выбор одного из трёх перков.</li>
          <li>Монеты за очки и задания тратятся в лавке: инструменты, слоты, сердца.</li>
          <li>Победа открывает следующую ночь: комаров больше, они быстрее.</li>
          <li><b>Ежедневный вызов</b> — одинаковая ночь для всех, фиксированный набор. Сравнивай результаты кодами.</li>
        </ul>
      </div>
    </div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" data-action="menu">← В меню</button></div>
  </div></div>`;
}

function typeHint(id) {
  return {
    squeaker: 'простой, летит к уху.',
    darter: 'уворачивается от руки — бей неожиданно.',
    ghost: 'почти невидим, слышен по кольцам; виден у лампы.',
    bomber: 'толстый, 3 удара, укус −2.',
    gnat: 'рой из пяти, дёшево, но много.',
    chameleon: 'садится на стену и замирает, пока рука рядом.',
    queen: 'босс: рожает мелочь, прячется за шторой после удара.',
  }[id];
}

export function toolButtonHtml(id, idx) {
  const t = TOOLS[id];
  return `<button class="tool" data-action="tool" data-tool="${id}" title="${t.name}: ${t.desc}">
    <span class="icon">${TOOL_ICONS[id]}</span><span class="key">${idx + 1}</span>
    <div class="cd"></div>${t.battery ? '<div class="meter"><i></i></div>' : ''}${t.charges ? '<div class="charges"></div>' : ''}
  </button>`;
}
