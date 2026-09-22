// Детерминированный генератор (mulberry32). Один сид — одна ночь для всех игроков ежедневки.

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function createRng(seed) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  const rng = {
    seed: a,
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + rng.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(rng.range(min, max + 1));
    },
    pick(arr) {
      return arr[Math.floor(rng.next() * arr.length)];
    },
    weighted(items) {
      // items: [{ weight, ...}]
      const total = items.reduce((s, it) => s + it.weight, 0);
      let r = rng.next() * total;
      for (const it of items) {
        r -= it.weight;
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
  return rng;
}

export function dailySeed(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}
