// Локальные таблицы рекордов и код результата для обмена между игроками.

export const BOARD_LIMIT = 10;

export function insertEntry(board, entry, limit = BOARD_LIMIT) {
  const next = [...board, entry].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return next.slice(0, limit);
}

export function rankOf(board, entry) {
  const idx = board.findIndex((e) => e === entry || (e.score === entry.score && e.date === entry.date && e.name === entry.name));
  return idx === -1 ? null : idx + 1;
}

// --- Код результата ---------------------------------------------------------
// IVK1-<name>-<payload>-<checksum>. payload = base36 полей через точку.

function checksum(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return (h % 1296).toString(36).padStart(2, '0');
}

function cleanName(name) {
  return String(name || 'Гость')
    .replace(/[^\p{L}\p{N} _]/gu, '')
    .trim()
    .slice(0, 16) || 'Гость';
}

export function encodeResult(entry) {
  const dateNum = Number(entry.date.replace(/-/g, ''));
  const fields = [entry.score, entry.night, entry.hours, dateNum, entry.seedHash || 0, entry.daily ? 1 : 0];
  const payload = fields.map((n) => Math.max(0, Math.floor(n)).toString(36)).join('.');
  const name = cleanName(entry.name).replace(/ /g, '_');
  const body = `${name}~${payload}`;
  return `IVK1-${body}-${checksum(body)}`;
}

export function decodeResult(code) {
  if (typeof code !== 'string') return null;
  const m = code.trim().match(/^IVK1-(.+)-([0-9a-z]{2})$/i);
  if (!m) return null;
  const [, body, sum] = m;
  if (checksum(body) !== sum.toLowerCase()) return null;
  const [name, payload] = body.split('~');
  if (!payload) return null;
  const parts = payload.split('.').map((p) => parseInt(p, 36));
  if (parts.length < 6 || parts.some((n) => Number.isNaN(n))) return null;
  const [score, night, hours, dateNum, seedHash, daily] = parts;
  const ds = String(dateNum).padStart(8, '0');
  const date = `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`;
  const decodedName = cleanName(name.replace(/_/g, ' '));
  return { name: decodedName, score, night, hours, date, seedHash, daily: daily === 1, imported: true };
}

export function shareText(entry, code) {
  const what = entry.daily ? 'в ежедневном вызове' : `на ночи ${entry.night}`;
  return `${entry.name} набрал(а) ${entry.score} очков ${what} в «Ирина против комаров» (${entry.hours}/7 часов). Код: ${code}`;
}
