import { META_SHOP, NIGHT } from './config.js';

// Мета-прогрессия: монеты, лавка, разблокировки, прогресс ночей.

export function defaultMeta() {
  return {
    coins: 0,
    unlocked: [],
    bestNight: 1, // максимальная открытая ночь
    stats: { runs: 0, kills: 0, wins: 0, bestScore: 0 },
    missionTiers: {},
    missions: [],
    name: '',
    sound: true,
  };
}

export function unlockedTools(meta) {
  return ['palm', 'clap', ...META_SHOP.filter((i) => i.kind === 'tool' && meta.unlocked.includes(i.id)).map((i) => i.tool)];
}

export function toolSlots(meta) {
  return 2 + (meta.unlocked.includes('slot3') ? 1 : 0) + (meta.unlocked.includes('slot4') ? 1 : 0);
}

export function startingHearts(meta) {
  const extra = ['heart1', 'heart2', 'heart3'].filter((h) => meta.unlocked.includes(h)).length;
  return Math.min(NIGHT.maxHearts, NIGHT.baseHearts + extra);
}

export function startSleep(meta) {
  return meta.unlocked.includes('startsleep') ? 20 : 0;
}

export function canBuy(meta, itemId) {
  const item = META_SHOP.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: 'нет такого' };
  if (meta.unlocked.includes(itemId)) return { ok: false, reason: 'куплено' };
  if (item.requires && !meta.unlocked.includes(item.requires)) return { ok: false, reason: 'сначала предыдущее' };
  if (meta.coins < item.price) return { ok: false, reason: 'не хватает монет' };
  return { ok: true };
}

export function buy(meta, itemId) {
  const c = canBuy(meta, itemId);
  if (!c.ok) return false;
  const item = META_SHOP.find((i) => i.id === itemId);
  meta.coins -= item.price;
  meta.unlocked.push(itemId);
  return true;
}

export function recordRun(meta, result) {
  meta.stats.runs += 1;
  meta.stats.kills += result.kills;
  meta.stats.bestScore = Math.max(meta.stats.bestScore, result.score);
  meta.coins += result.coins;
  if (result.won) {
    meta.stats.wins += 1;
    if (!result.daily) meta.bestNight = Math.max(meta.bestNight, result.night + 1);
  }
  return meta;
}
