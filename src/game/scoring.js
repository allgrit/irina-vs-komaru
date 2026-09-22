import { SCORE } from './config.js';

// Счёт и комбо забега. Чистая логика.
export function createScoring() {
  return { score: 0, kills: 0, streak: 0, combo: 1, bestCombo: 1, killsByType: {} };
}

export function comboFromStreak(streak) {
  return Math.min(SCORE.comboMax, 1 + Math.floor(streak / SCORE.comboStep));
}

export function registerKill(s, type) {
  s.kills += 1;
  s.killsByType[type.id] = (s.killsByType[type.id] || 0) + 1;
  let gained;
  if (type.boss) {
    gained = type.score;
  } else {
    s.streak += 1;
    s.combo = comboFromStreak(s.streak);
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    gained = type.score * s.combo;
  }
  s.score += gained;
  return gained;
}

export function breakCombo(s) {
  s.streak = 0;
  s.combo = 1;
}

export function hourBonus(sleepPercent) {
  return Math.round(Math.max(0, Math.min(100, sleepPercent)) * SCORE.hourSleepBonus);
}

export function nightBonus(hearts) {
  return Math.max(0, hearts) * SCORE.heartBonus;
}

export function coinsForScore(score) {
  return Math.floor(score / SCORE.coinsPerScore);
}
