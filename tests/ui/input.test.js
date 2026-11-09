import { createInputState } from '../../src/ui/input.js';

test('repos : aucune entrée', () => {
  const s = createInputState();
  expect(s.read()).toEqual({ move: { x: 0, z: 0 }, armed: null, servePress: false, aimDir: 0 });
});

test('flèches : repère du joueur (droite = +x, haut = vers le filet = +z)', () => {
  const s = createInputState();
  s.set('right', true);
  s.set('up', true);
  expect(s.read().move).toEqual({ x: 1, z: 1 });
  s.set('right', false);
  s.set('left', true);
  s.set('up', false);
  s.set('down', true);
  expect(s.read().move).toEqual({ x: -1, z: -1 });
});

test('gauche + droite ensemble s’annulent', () => {
  const s = createInputState();
  s.set('left', true);
  s.set('right', true);
  expect(s.read().move.x).toBe(0);
});

test('se déplacer ne vise pas : aimDir reste 0 avec les flèches', () => {
  const s = createInputState();
  s.set('right', true);
  expect(s.read().aimDir).toBe(0);
});

test('visée armée comme LOB : gauche/droite exclusives, ré-appui annule', () => {
  const s = createInputState();
  s.toggleAim('left');
  expect(s.read().aimDir).toBe(-1);
  s.toggleAim('right');
  expect(s.read().aimDir).toBe(1);
  s.toggleAim('right');
  expect(s.read().aimDir).toBe(0);
});

test('courir à droite et frapper à gauche', () => {
  const s = createInputState();
  s.toggleAim('left');
  s.set('right', true);
  const r = s.read();
  expect(r.move.x).toBe(1);
  expect(r.aimDir).toBe(-1);
});

test('visée et type de coup se combinent, disarm() efface les deux après la frappe', () => {
  const s = createInputState();
  s.toggleAim('left');
  s.toggleArm('lob');
  expect(s.read()).toMatchObject({ armed: 'lob', aimDir: -1 });
  s.disarm();
  expect(s.read()).toMatchObject({ armed: null, aimDir: 0 });
});

test('LOB / SMASH : armement exclusif, ré-appui désarme, disarm() après la frappe', () => {
  const s = createInputState();
  s.toggleArm('lob');
  expect(s.read().armed).toBe('lob');
  s.toggleArm('smash');
  expect(s.read().armed).toBe('smash');
  s.toggleArm('smash');
  expect(s.read().armed).toBe(null);
  s.toggleArm('lob');
  s.disarm();
  expect(s.read().armed).toBe(null);
});

test('service : un tap plus court qu’une image est quand même vu une fois', () => {
  const s = createInputState();
  s.set('serve', true);
  s.set('serve', false);
  expect(s.read().servePress).toBe(true);
  expect(s.read().servePress).toBe(false);
});

test('service tenu reste vrai (le match ne réagit qu’au front montant)', () => {
  const s = createInputState();
  s.set('serve', true);
  expect(s.read().servePress).toBe(true);
  expect(s.read().servePress).toBe(true);
});

test('reset() relâche tout (pause, perte de focus)', () => {
  const s = createInputState();
  s.set('up', true);
  s.set('serve', true);
  s.toggleArm('lob');
  s.toggleAim('right');
  s.reset();
  expect(s.read()).toEqual({ move: { x: 0, z: 0 }, armed: null, servePress: false, aimDir: 0 });
});

test('deux taps entre deux lectures : vus tous les deux, séparés par un relâchement', () => {
  const s = createInputState();
  s.set('serve', true);
  s.set('serve', false);
  expect(s.read().servePress).toBe(true);
  // no frame ran between the two taps' release and the next tap
  s.set('serve', true);
  s.set('serve', false);
  s.set('serve', true);
  s.set('serve', false);
  expect([s.read(), s.read(), s.read(), s.read(), s.read()].map((r) => r.servePress)).toEqual([false, true, false, true, false]);
});

test('tap pendant qu’une image a déjà vu le service enfoncé : relâchement puis appui', () => {
  const s = createInputState();
  s.set('serve', true);
  s.set('serve', false);
  s.set('serve', true); // second tap before any read, still held
  expect([s.read(), s.read(), s.read()].map((r) => r.servePress)).toEqual([true, false, true]);
});
