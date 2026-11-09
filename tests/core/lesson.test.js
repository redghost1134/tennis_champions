import { createLesson, LESSON_STEPS } from '../../src/core/lesson.js';

const st = (o = {}) => ({
  phase: 'serve_aim', aimSlot: 1,
  players: { A: { x: 0, z: 8.5 }, B: { x: 0, z: -8.5 } },
  ...o,
});
const IN = { move: { x: 0, z: 0 }, armed: null, servePress: false, aimDir: 0 };
const go = (lesson, id) => {
  while (lesson.step.id !== id) lesson.skip();
};

test('10 étapes dans l’ordre du cours', () => {
  expect(LESSON_STEPS.map((s) => s.id)).toEqual([
    'move', 'serve_green', 'serve_red', 'serve_aim', 'return', 'aim_left', 'aim_right', 'lob', 'smash', 'point',
  ]);
  for (const s of LESSON_STEPS) {
    expect(s.line.length).toBeGreaterThan(5);
    expect(s.setup).toBeTruthy();
  }
});

test('move : trois cibles successives, puis étape suivante', () => {
  const l = createLesson();
  expect(l.step.id).toBe('move');
  const [t1, t2, t3] = l.step.targets;
  expect(l.target).toEqual(t1);
  expect(l.onFrame([], st({ players: { A: { x: 0, z: 8.5 } } }), IN)).toBe('stay');
  expect(l.onFrame([], st({ players: { A: { x: t1.x + 0.3, z: t1.z } } }), IN)).toBe('stay');
  expect(l.target).toEqual(t2);
  l.onFrame([], st({ players: { A: { ...t2 } } }), IN);
  expect(l.onFrame([], st({ players: { A: { ...t3 } } }), IN)).toBe('next');
  expect(l.step.id).toBe('serve_green');
});

test('serve_green : service vert bon → suivant ; jaune/rouge → recommencer ; faute → recommencer', () => {
  const l = createLesson();
  go(l, 'serve_green');
  expect(l.onFrame([{ type: 'serve', side: 'A', zone: 'red' }], st({ phase: 'rally' }), IN)).toBe('retry');
  expect(l.onFrame([{ type: 'serve', side: 'A', zone: 'green' }], st({ phase: 'rally' }), IN)).toBe('stay');
  expect(l.onFrame([{ type: 'bounce', x: -1, z: -3 }, { type: 'fault', side: 'A' }], st(), IN)).toBe('retry');
  l.onFrame([{ type: 'serve', side: 'A', zone: 'green' }], st({ phase: 'rally' }), IN);
  expect(l.onFrame([{ type: 'bounce', x: -1, z: -3 }], st({ phase: 'rally' }), IN)).toBe('next');
});

test('serve_red : un service rouge suffit (bon ou faute)', () => {
  const l = createLesson();
  go(l, 'serve_red');
  expect(l.onFrame([{ type: 'serve', side: 'A', zone: 'green' }], st({ phase: 'rally' }), IN)).toBe('retry');
  expect(l.onFrame([{ type: 'serve', side: 'A', zone: 'red' }], st({ phase: 'rally' }), IN)).toBe('next');
});

test('serve_aim : il faut changer de cible avant de servir, puis un service bon', () => {
  const l = createLesson();
  go(l, 'serve_aim');
  expect(l.onFrame([{ type: 'serve', side: 'A', zone: 'green' }], st({ phase: 'rally', aimSlot: 1 }), IN)).toBe('retry');
  l.onFrame([], st({ aimSlot: 2 }), IN);
  expect(l.onFrame([{ type: 'serve', side: 'A', zone: 'green' }], st({ phase: 'rally', aimSlot: 2 }), IN)).toBe('stay');
  expect(l.onFrame([{ type: 'bounce', x: -2, z: -3 }], st({ phase: 'rally', aimSlot: 2 }), IN)).toBe('next');
});

test('return : frappe bonne → suivant ; balle manquée (point) → recommencer', () => {
  const l = createLesson();
  go(l, 'return');
  expect(l.step.setup.feed).toBe('normal');
  expect(l.onFrame([{ type: 'point', winner: 'B', reason: 'winner' }], st({ phase: 'point_over' }), IN)).toBe('retry');
  expect(l.onFrame([{ type: 'hit', side: 'B', kind: 'normal', outcome: 'in' }], st({ phase: 'rally' }), IN)).toBe('stay');
  expect(l.onFrame([{ type: 'hit', side: 'A', kind: 'normal', outcome: 'net' }], st({ phase: 'rally' }), IN)).toBe('retry');
  expect(l.onFrame([{ type: 'hit', side: 'A', kind: 'normal', outcome: 'in' }], st({ phase: 'rally' }), IN)).toBe('next');
});

test('aim_left / aim_right : la visée armée doit être la bonne au moment de la frappe', () => {
  const l = createLesson();
  go(l, 'aim_left');
  const hitA = [{ type: 'hit', side: 'A', kind: 'normal', outcome: 'in' }];
  expect(l.onFrame(hitA, st({ phase: 'rally' }), { ...IN, aimDir: 1 })).toBe('retry');
  expect(l.onFrame(hitA, st({ phase: 'rally' }), { ...IN, aimDir: -1 })).toBe('next');
  expect(l.step.id).toBe('aim_right');
  expect(l.onFrame(hitA, st({ phase: 'rally' }), { ...IN, aimDir: 0 })).toBe('retry');
  expect(l.onFrame(hitA, st({ phase: 'rally' }), { ...IN, aimDir: 1 })).toBe('next');
});

test('lob puis smash (sur balle haute)', () => {
  const l = createLesson();
  go(l, 'lob');
  expect(l.onFrame([{ type: 'hit', side: 'A', kind: 'normal', outcome: 'in' }], st(), IN)).toBe('retry');
  expect(l.onFrame([{ type: 'hit', side: 'A', kind: 'lob', outcome: 'out' }], st(), IN)).toBe('next');
  expect(l.step.id).toBe('smash');
  expect(l.step.setup.feed).toBe('high');
  expect(l.onFrame([{ type: 'hit', side: 'A', kind: 'normal', outcome: 'in' }], st(), IN)).toBe('retry');
  expect(l.onFrame([{ type: 'hit', side: 'A', kind: 'smash', outcome: 'in' }], st(), IN)).toBe('next');
});

test('point : gagner un point termine le cours', () => {
  const l = createLesson();
  go(l, 'point');
  expect(l.onFrame([{ type: 'point', winner: 'A', reason: 'winner' }], st(), IN)).toBe('done');
  expect(l.done).toBe(true);
});

test('point : après 3 points perdus, le cours est réussi quand même', () => {
  const l = createLesson();
  go(l, 'point');
  const lost = [{ type: 'point', winner: 'B', reason: 'winner' }];
  expect(l.onFrame(lost, st(), IN)).toBe('retry');
  expect(l.onFrame(lost, st(), IN)).toBe('retry');
  expect(l.onFrame(lost, st(), IN)).toBe('done');
});

test('un message est prêt après chaque réussite ou échec', () => {
  const l = createLesson();
  go(l, 'serve_red');
  l.onFrame([{ type: 'serve', side: 'A', zone: 'green' }], st({ phase: 'rally' }), IN);
  expect(l.message).toMatch(/rouge/i);
  l.onFrame([{ type: 'serve', side: 'A', zone: 'red' }], st({ phase: 'rally' }), IN);
  expect(l.message).toMatch(/bravo/i);
});
