// Задания: шаблоны, генерация трёх активных, учёт событий забега.

export const MISSION_TEMPLATES = [
  { id: 'kill_any', text: (n) => `Убей ${n} комаров`, event: 'kill', target: [30, 60, 120], reward: [40, 80, 150] },
  { id: 'kill_squeaker', text: (n) => `Прихлопни ${n} Пискунов`, event: 'kill', filter: { type: 'squeaker' }, target: [15, 30], reward: [40, 80] },
  { id: 'kill_darter', text: (n) => `Поймай ${n} Стрелков`, event: 'kill', filter: { type: 'darter' }, target: [8, 20], reward: [60, 120] },
  { id: 'kill_ghost', text: (n) => `Найди и убей ${n} Тихонь`, event: 'kill', filter: { type: 'ghost' }, target: [5, 12], reward: [80, 160] },
  { id: 'kill_bomber', text: (n) => `Раздави ${n} Бомбардиров`, event: 'kill', filter: { type: 'bomber' }, target: [4, 10], reward: [80, 160] },
  { id: 'kill_perched', text: (n) => `Поймай ${n} Хамелеонов на стене`, event: 'kill', filter: { type: 'chameleon', perched: true }, target: [3, 8], reward: [100, 200] },
  { id: 'kill_queen', text: () => 'Убей Матку', event: 'kill', filter: { type: 'queen' }, target: [1], reward: [200] },
  { id: 'quiet_hour', text: (n) => `Пройди ${n} час(а) без укусов`, event: 'quiet_hour', target: [1, 3], reward: [80, 200] },
  { id: 'combo', text: (n) => `Набери комбо ×${n}`, event: 'combo', max: true, target: [5, 8, 10], reward: [60, 120, 250] },
  { id: 'tools', text: (n) => `Используй ${n} разных инструмента за час`, event: 'tools_in_hour', max: true, target: [3, 4], reward: [80, 160] },
  { id: 'sleep', text: (n) => `Выспись на ${n} % за час`, event: 'hour_sleep', max: true, target: [90, 100], reward: [80, 160] },
  { id: 'kill_tool', text: (n, extra) => `Убей ${n} комаров ${extra}`, event: 'kill', filterTool: ['swatter', 'racket', 'vacuum', 'spray'], toolText: { swatter: 'мухобойкой', racket: 'ракеткой', vacuum: 'пылесосом', spray: 'спреем' }, target: [15, 40], reward: [80, 160] },
  { id: 'survive', text: () => 'Дотяни до утра', event: 'win', target: [1], reward: [300] },
];

export function createMission(template, tier, rng, unlockedTools = []) {
  const idx = Math.min(tier, template.target.length - 1);
  const m = { id: template.id, tier: idx, target: template.target[idx], reward: template.reward[idx], progress: 0, done: false, claimed: false };
  if (template.filterTool) {
    const avail = template.filterTool.filter((t) => unlockedTools.includes(t));
    if (!avail.length) return null;
    m.tool = rng.pick(avail);
    m.text = template.text(m.target, template.toolText[m.tool]);
  } else {
    m.text = template.text(m.target);
  }
  return m;
}

export function generateMissions(rng, tiers = {}, active = [], unlockedTools = []) {
  const out = [...active];
  const usedIds = new Set(out.map((m) => m.id));
  const candidates = rng.shuffle(MISSION_TEMPLATES.filter((t) => !usedIds.has(t.id) && (tiers[t.id] || 0) < t.target.length));
  for (const t of candidates) {
    if (out.length >= 3) break;
    const m = createMission(t, tiers[t.id] || 0, rng, unlockedTools);
    if (m) out.push(m);
  }
  return out;
}

/**
 * Применяет событие к активным заданиям.
 * event: { kind:'kill', type, perched, tool } | { kind:'quiet_hour' } | { kind:'combo', value }
 *        | { kind:'tools_in_hour', value } | { kind:'hour_sleep', value } | { kind:'win' }
 * Возвращает список только что выполненных заданий.
 */
export function applyMissionEvent(missions, event) {
  const completed = [];
  for (const m of missions) {
    if (m.done) continue;
    const t = MISSION_TEMPLATES.find((x) => x.id === m.id);
    if (!t || t.event !== event.kind) continue;
    if (t.filter) {
      if (t.filter.type && event.type !== t.filter.type) continue;
      if (t.filter.perched && !event.perched) continue;
    }
    if (m.tool && event.tool !== m.tool) continue;
    if (t.max) m.progress = Math.max(m.progress, event.value || 0);
    else m.progress += 1;
    if (m.progress >= m.target) {
      m.progress = m.target;
      m.done = true;
      completed.push(m);
    }
  }
  return completed;
}
