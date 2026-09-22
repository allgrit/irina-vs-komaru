// Перки роглайта: пул, выбор карт, применение к модификаторам забега.

export const PERKS = [
  { id: 'deft', name: 'Ловкие руки', rarity: 'common', desc: 'Радиус ладони и хлопка +40 %.', apply: (m) => (m.radiusMul *= 1.4) },
  { id: 'light_sleeper', name: 'Чуткий сон', rarity: 'common', desc: 'Тихоня становится видимым.', apply: (m) => (m.ghostVisible = true) },
  { id: 'curtains', name: 'Плотные шторы', rarity: 'common', desc: 'Комаров прилетает на 20 % меньше.', apply: (m) => (m.spawnMul *= 0.8) },
  { id: 'blanket', name: 'Толстое одеяло', rarity: 'common', desc: 'Укус Бомбардира на 1 слабее.', apply: (m) => (m.bomberSoft = true) },
  { id: 'earplugs', name: 'Беруши', rarity: 'common', desc: 'До укуса 2.5 с вместо 1.5 с.', apply: (m) => (m.buzzToBite = 2.5) },
  { id: 'coffee', name: 'Кофе на ночь', rarity: 'rare', desc: 'Кулдауны −40 %, но сон растёт на 30 % медленнее.', apply: (m) => { m.cooldownMul *= 0.6; m.sleepMul *= 0.7; } },
  { id: 'fumigator', name: 'Фумигатор', rarity: 'rare', desc: 'У розетки зона: комары там вдвое медленнее.', apply: (m) => (m.fumigator = 160) },
  { id: 'second_wind', name: 'Второе дыхание', rarity: 'common', desc: '+2 терпения прямо сейчас.', instant: (run) => (run.hearts = Math.min(run.maxHearts + 2, run.hearts + 2)) },
  { id: 'tape', name: 'Липкая лента', rarity: 'rare', desc: 'Комары у окна застревают на 2 с.', apply: (m) => (m.tape = true) },
  { id: 'nightlight', name: 'Ночник-ловушка', rarity: 'epic', desc: 'Лампа больше не мешает сну.', apply: (m) => (m.lampSleepFactor = 1) },
  { id: 'bloodmark', name: 'Метка крови', rarity: 'rare', desc: 'Убитый комар ранит соседей в 40 px.', apply: (m) => (m.bloodmark = 40) },
  { id: 'cold_room', name: 'Холодная спальня', rarity: 'common', desc: 'Все комары на 15 % медленнее.', apply: (m) => (m.speedMul *= 0.85) },
  { id: 'gambler', name: 'Азарт', rarity: 'rare', desc: 'Раз в 10 с промах не сбрасывает комбо.', apply: (m) => (m.gambler = 10) },
  { id: 'deep_sleep', name: 'Крепкий сон', rarity: 'common', desc: 'Укус отнимает 10 сна вместо 25.', apply: (m) => (m.sleepLossOnBite = 10) },
  { id: 'reflex', name: 'Рефлекс', rarity: 'rare', desc: 'Первый удар после «бзз» вдвое шире.', apply: (m) => (m.reflex = true) },
  { id: 'hoodie', name: 'Пижама с капюшоном', rarity: 'epic', desc: 'Раз в час укус поглощается.', apply: (m) => (m.hoodie = true) },
  { id: 'lullaby', name: 'Колыбельная', rarity: 'common', desc: 'Сон растёт на 25 % быстрее.', apply: (m) => (m.sleepMul *= 1.25) },
  { id: 'moonlight', name: 'Лунный свет', rarity: 'common', desc: 'Хамелеон на стене заметнее.', apply: (m) => (m.moonlight = true) },
  { id: 'spray_extra', name: 'Запасной баллон', rarity: 'common', desc: 'Спрей: +2 заряда в час.', apply: (m) => (m.sprayExtra = (m.sprayExtra || 0) + 2), requiresTool: 'spray' },
  { id: 'big_battery', name: 'Мощный аккумулятор', rarity: 'common', desc: 'Электроракетка держит заряд на 50 % дольше.', apply: (m) => (m.batteryMul *= 1.5), requiresTool: 'racket' },
  { id: 'long_swatter', name: 'Длинная мухобойка', rarity: 'common', desc: 'Мухобойка шире и длиннее на 40 %.', apply: (m) => (m.swatterMul *= 1.4), requiresTool: 'swatter' },
  { id: 'turbo', name: 'Турбо-пылесос', rarity: 'rare', desc: 'Пылесос тянет вдвое сильнее.', apply: (m) => (m.vacuumMul *= 2), requiresTool: 'vacuum' },
  { id: 'vampire', name: 'Сладкая месть', rarity: 'epic', desc: 'Каждые 25 убийств возвращают 1 терпение.', apply: (m) => (m.vampire = 25) },
  { id: 'insomnia', name: 'Бессонница', rarity: 'epic', desc: 'Очки ×1.5, но сон не растёт выше 70 %.', apply: (m) => { m.scoreMul *= 1.5; m.sleepCap = 70; } },
];

export const RARITY_WEIGHT = { common: 10, rare: 4, epic: 1.5 };

export function defaultMods() {
  return {
    radiusMul: 1,
    spawnMul: 1,
    speedMul: 1,
    cooldownMul: 1,
    sleepMul: 1,
    scoreMul: 1,
    batteryMul: 1,
    swatterMul: 1,
    vacuumMul: 1,
    sleepCap: 100,
    lampSleepFactor: 0.5,
    sleepLossOnBite: 25,
    buzzToBite: 1.5,
    ghostVisible: false,
    bomberSoft: false,
    fumigator: 0,
    tape: false,
    bloodmark: 0,
    gambler: 0,
    reflex: false,
    hoodie: false,
    moonlight: false,
    sprayExtra: 0,
    vampire: 0,
  };
}

export function applyPerk(mods, perkId, run) {
  const p = PERKS.find((x) => x.id === perkId);
  if (!p) throw new Error(`unknown perk ${perkId}`);
  if (p.apply) p.apply(mods);
  if (p.instant && run) p.instant(run);
  return mods;
}

/**
 * Три карты на выбор. Учитывает уже взятые (не повторяются, кроме second_wind),
 * инструменты забега и открыт ли редкий пул с первого часа.
 */
export function draftPerks(rng, taken, tools, hour, opts = {}) {
  const pool = PERKS.filter((p) => {
    if (taken.includes(p.id) && p.id !== 'second_wind') return false;
    if (p.requiresTool && !tools.includes(p.requiresTool)) return false;
    if (p.rarity !== 'common' && hour === 0 && !opts.rarePool) return false;
    return true;
  });
  const chosen = [];
  const remaining = pool.slice();
  while (chosen.length < 3 && remaining.length) {
    const items = remaining.map((p) => ({ p, weight: RARITY_WEIGHT[p.rarity] }));
    const pick = rng.weighted(items).p;
    chosen.push(pick);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return chosen;
}
