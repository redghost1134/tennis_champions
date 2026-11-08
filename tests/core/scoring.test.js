import { createScore, awardPoint, pointLabel, serveSide } from '../../src/core/scoring.js';

function play(score, letters) {
  let s = score;
  let events = [];
  for (const l of letters) {
    const r = awardPoint(s, l);
    s = r.score;
    events = events.concat(r.events);
  }
  return { score: s, events };
}
const mk = (format = 'set', firstServer = 'A') => createScore({ format, firstServer });
const game = (w) => w.repeat(4);
// Plays games alternately won by letters in order
const games = (s, seq) => play(s, seq.split('').map(game).join(''));

test('0-15-30-40-jeu', () => {
  let s = mk('set');
  s = play(s, 'AAA').score;
  expect(pointLabel(s)).toEqual({ A: '40', B: '0' });
  s = play(s, 'A').score;
  expect(s.games.A).toBe(1);
  expect(s.points).toEqual({ A: 0, B: 0 });
});

test('égalité puis avantage puis égalité', () => {
  let s = play(mk(), 'AAABBB').score;
  expect(pointLabel(s)).toEqual({ A: 'Égalité', B: 'Égalité' });
  s = play(s, 'A').score;
  expect(pointLabel(s)).toEqual({ A: 'AV', B: '' });
  s = play(s, 'B').score;
  expect(pointLabel(s)).toEqual({ A: 'Égalité', B: 'Égalité' });
});

test('avantage converti gagne le jeu', () => {
  const s = play(mk(), 'AAABBBAA').score;
  expect(s.games.A).toBe(1);
  expect(s.points).toEqual({ A: 0, B: 0 });
});

test('égalité répétée 5 fois reste correcte', () => {
  let s = play(mk(), 'AAABBB').score;
  for (let i = 0; i < 5; i++) {
    s = play(s, 'AB').score;
    expect(pointLabel(s)).toEqual({ A: 'Égalité', B: 'Égalité' });
    expect(s.games).toEqual({ A: 0, B: 0 });
  }
  s = play(s, 'BB').score;
  expect(s.games.B).toBe(1);
});

test('le serveur change à chaque jeu', () => {
  let s = mk('set', 'A');
  expect(s.server).toBe('A');
  s = play(s, 'AAAA').score;
  expect(s.server).toBe('B');
  s = play(s, 'BBBB').score;
  expect(s.server).toBe('A');
});

test('serveSide alterne deuce/ad', () => {
  let s = mk();
  expect(serveSide(s)).toBe('deuce');
  s = play(s, 'A').score;
  expect(serveSide(s)).toBe('ad');
  s = play(s, 'B').score;
  expect(serveSide(s)).toBe('deuce');
});

test('quick : 1 jeu gagne le match', () => {
  const r = play(mk('quick'), 'AAAA');
  expect(r.score.winner).toBe('A');
  expect(r.events).toContain('game');
  expect(r.events).toContain('match');
});

test('normal : 3 jeux gagnants', () => {
  let r = games(mk('normal'), 'AA');
  expect(r.score.winner).toBeNull();
  r = games(r.score, 'A');
  expect(r.score.winner).toBe('A');
  expect(r.events).toContain('match');
});

test('set : 6-4 gagne', () => {
  const r = games(mk(), 'ABABABABAA');
  expect(r.score.games).toEqual({ A: 6, B: 4 });
  expect(r.score.winner).toBe('A');
});

test('set : 6-5 ne gagne pas, 7-5 gagne', () => {
  let r = games(mk(), 'ABABABABABA');
  expect(r.score.games).toEqual({ A: 6, B: 5 });
  expect(r.score.winner).toBeNull();
  r = games(r.score, 'A');
  expect(r.score.games).toEqual({ A: 7, B: 5 });
  expect(r.score.winner).toBe('A');
});

test('set : tie-break à 6-6', () => {
  const r = games(mk(), 'ABABABABABAB');
  expect(r.score.games).toEqual({ A: 6, B: 6 });
  expect(r.score.tiebreak).toBe(true);
  expect(r.events).toContain('tiebreak_start');
  expect(r.score.winner).toBeNull();
});

test('tie-break gagné 7-5', () => {
  let s = games(mk(), 'ABABABABABAB').score;
  s = play(s, 'AAAAABBBBB').score; // 5-5
  expect(s.winner).toBeNull();
  expect(pointLabel(s)).toEqual({ A: '5', B: '5' });
  const r = play(s, 'AA');
  expect(r.score.winner).toBe('A');
  expect(r.score.games).toEqual({ A: 7, B: 6 });
  expect(r.events).toContain('match');
});

test('tie-break 6-6 → gagné 8-6 seulement', () => {
  let s = games(mk(), 'ABABABABABAB').score;
  s = play(s, 'AAAAAABBBBBB').score; // 6-6
  s = play(s, 'A').score; // 7-6
  expect(s.winner).toBeNull();
  s = play(s, 'A').score; // 8-6
  expect(s.winner).toBe('A');
  expect(s.games).toEqual({ A: 7, B: 6 });
});

test('tie-break : service 1 puis 2-2', () => {
  let s = games(mk('set', 'A'), 'ABABABABABAB').score;
  const servers = [];
  for (let i = 0; i < 5; i++) {
    servers.push(s.server);
    s = play(s, i % 2 === 0 ? 'A' : 'B').score;
  }
  // 12 games played -> 13th game would be served by A
  expect(servers).toEqual(['A', 'B', 'B', 'A', 'A']);
});

test('awardPoint après la fin ne change rien', () => {
  const done = play(mk('quick'), 'AAAA').score;
  const r = awardPoint(done, 'B');
  expect(r.score).toBe(done);
  expect(r.events).toEqual([]);
});

test('immuabilité', () => {
  const s = mk();
  const r = awardPoint(s, 'A');
  expect(s.points.A).toBe(0);
  expect(r.score).not.toBe(s);
});
