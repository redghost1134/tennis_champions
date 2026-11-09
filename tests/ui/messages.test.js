import { messagesFor, GAUGE_COLORS, gaugeColor } from '../../src/ui/messages.js';
import { createScore, awardPoint } from '../../src/core/scoring.js';

const names = { A: 'Yazan', B: 'Ghassan' };
const texts = (evs, score) => messagesFor(evs, score, names).map((m) => m.text);
const scoreAt = (a, b) => {
  let s = createScore({ format: 'normal', firstServer: 'A' });
  // alternate so the game never ends before reaching (a, b)
  for (let i = 0; i < Math.max(a, b); i++) {
    if (i < a) s = awardPoint(s, 'A').score;
    if (i < b) s = awardPoint(s, 'B').score;
  }
  return s;
};

test('faute et double faute', () => {
  expect(texts([{ type: 'fault', side: 'A' }], scoreAt(0, 0))).toEqual(['FAUTE !']);
  expect(texts([{ type: 'double_fault', side: 'A' }, { type: 'point', winner: 'B', reason: 'double_fault' }], scoreAt(0, 1))).toEqual([
    'DOUBLE FAUTE !',
    'Point Ghassan ! 🎉',
  ]);
});

test('OUT ! et FILET ! avant le point', () => {
  expect(texts([{ type: 'out', side: 'A' }, { type: 'point', winner: 'B', reason: 'out' }], scoreAt(0, 1))).toEqual(['OUT !', 'Point Ghassan ! 🎉']);
  expect(texts([{ type: 'net', side: 'B' }], scoreAt(0, 0))).toEqual(['FILET !']);
});

test('point simple', () => {
  expect(texts([{ type: 'point', winner: 'A', reason: 'winner' }], scoreAt(1, 0))).toEqual(['Point Yazan ! 🎉']);
});

test('égalité et avantage après le point', () => {
  expect(texts([{ type: 'point', winner: 'B', reason: 'winner' }], scoreAt(3, 3))).toEqual(['Point Ghassan ! 🎉', 'Égalité']);
  expect(texts([{ type: 'point', winner: 'A', reason: 'winner' }], scoreAt(4, 3))).toEqual(['Point Yazan ! 🎉', 'Avantage Yazan']);
  expect(texts([{ type: 'point', winner: 'B', reason: 'winner' }], scoreAt(3, 4))).toEqual(['Point Ghassan ! 🎉', 'Avantage Ghassan']);
});

test('jeu gagné remplace le message de point', () => {
  const s = createScore({ format: 'normal', firstServer: 'A' });
  expect(texts([{ type: 'point', winner: 'B', reason: 'winner' }, { type: 'game' }], s)).toEqual(['Jeu Ghassan ! 🏆']);
});

test('jeu décisif annoncé', () => {
  const s = createScore({ format: 'set', firstServer: 'A' });
  expect(texts([{ type: 'point', winner: 'A', reason: 'winner' }, { type: 'game' }, { type: 'tiebreak_start' }], s)).toEqual([
    'Jeu Yazan ! 🏆',
    'Jeu décisif ! ',
  ].map((t) => t.trim()));
});

test('événements sans message ignorés', () => {
  expect(texts([{ type: 'hit', side: 'A' }, { type: 'bounce' }, { type: 'toss' }, { type: 'serve' }], scoreAt(0, 0))).toEqual([]);
});

test('jauge : vert < 0.5 ≤ jaune < 0.8 ≤ rouge', () => {
  expect(gaugeColor(0.2)).toBe(GAUGE_COLORS.green);
  expect(gaugeColor(0.5)).toBe(GAUGE_COLORS.yellow);
  expect(gaugeColor(0.79)).toBe(GAUGE_COLORS.yellow);
  expect(gaugeColor(0.8)).toBe(GAUGE_COLORS.red);
});
