import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertEntry, rankOf, encodeResult, decodeResult, shareText } from '../src/game/leaderboard.js';

const e = (score, name = 'Ира', date = '2026-09-22') => ({ name, score, night: 1, hours: 7, date, seedHash: 12345, daily: false });

test('таблица сортируется по очкам и режется до 10', () => {
  let board = [];
  for (let i = 0; i < 15; i++) board = insertEntry(board, e(i * 10));
  assert.equal(board.length, 10);
  assert.equal(board[0].score, 140);
  assert.equal(board[9].score, 50);
  const top = e(999);
  board = insertEntry(board, top);
  assert.equal(rankOf(board, top), 1);
  assert.equal(rankOf(board, e(1)), null);
});

test('код результата обратим', () => {
  const entry = e(4321, 'Ирина Ч', '2026-09-22');
  entry.night = 3;
  entry.hours = 5;
  const code = encodeResult(entry);
  assert.match(code, /^IVK1-/);
  const back = decodeResult(code);
  assert.equal(back.score, 4321);
  assert.equal(back.night, 3);
  assert.equal(back.hours, 5);
  assert.equal(back.date, '2026-09-22');
  assert.equal(back.name, 'Ирина Ч');
  assert.equal(back.seedHash, 12345);
  assert.equal(back.daily, false);
  assert.equal(back.imported, true);
});

test('порченый код отклоняется', () => {
  const code = encodeResult(e(100));
  assert.equal(decodeResult(code.slice(0, -1) + (code.endsWith('a') ? 'b' : 'a')), null);
  assert.equal(decodeResult(code.replace('IVK1', 'IVK2')), null);
  assert.equal(decodeResult('мусор'), null);
  assert.equal(decodeResult(null), null);
  // подмена очков ломает контрольную сумму
  const tampered = code.replace(/~([0-9a-z]+)\./, '~zzz.');
  assert.equal(decodeResult(tampered), null);
});

test('имя чистится от мусора и ограничено', () => {
  const code = encodeResult(e(1, '<script>оченьдлинноеимяигрокакоторое'));
  assert.equal(decodeResult(code).name.length <= 16, true);
  assert.ok(!decodeResult(code).name.includes('<'));
  assert.ok(shareText(e(5), code).includes(code));
});
