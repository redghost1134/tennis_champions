import { G, RESTITUTION, FRICTION, createBall, launch, launchApex, stepBall, predictAt } from '../../src/core/physics.js';

const DT = 1 / 120;

test('constantes', () => {
  expect([G, RESTITUTION, FRICTION]).toEqual([9.8, 0.62, 0.85]);
});

test('launch atterrit sur la cible', () => {
  const b = createBall({ x: 0, y: 1, z: 8 }, launch({ x: 0, y: 1, z: 8 }, { x: 1, z: -6 }, 12));
  let ev = [];
  for (let i = 0; i < 600 && !ev.some(e => e.type === 'bounce'); i++) ev = stepBall(b, DT).events;
  const bounce = ev.find(e => e.type === 'bounce');
  expect(bounce).toBeDefined();
  expect(Math.abs(bounce.x - 1)).toBeLessThan(0.05);
  expect(Math.abs(bounce.z + 6)).toBeLessThan(0.05);
});

test('launchApex atteint la hauteur', () => {
  const from = { x: 0, y: 1, z: 8 };
  const b = createBall(from, launchApex(from, { x: 0, z: -7 }, 5.5));
  let maxY = 0;
  for (let i = 0; i < 600 && b.bounces === 0; i++) { stepBall(b, DT); maxY = Math.max(maxY, b.p.y); }
  expect(maxY).toBeGreaterThan(5.4);
  expect(maxY).toBeLessThan(5.6);
});

test('rebond réduit vy de RESTITUTION et vitesse horizontale de FRICTION', () => {
  const b = createBall({ x: 0, y: 1, z: 5 }, { x: 4, y: -5, z: 1 });
  let vyBefore;
  let ev = [];
  while (!ev.some(e => e.type === 'bounce')) { vyBefore = b.v.y - G * DT; ev = stepBall(b, DT).events; }
  expect(b.v.y).toBeCloseTo(-vyBefore * RESTITUTION, 6);
  expect(b.v.y).toBeGreaterThan(0);
  expect(b.v.x).toBeCloseTo(4 * FRICTION, 6);
  expect(b.v.z).toBeCloseTo(1 * FRICTION, 6);
  expect(b.p.y).toBe(0);
  expect(b.bounces).toBe(1);
  expect(b.lastBounce).toEqual({ x: b.p.x, z: b.p.z });
});

test('balle trop basse touche le filet', () => {
  const from = { x: 0, y: 0.5, z: 6 };
  const b = createBall(from, launch(from, { x: 0, z: -6 }, 18));
  const events = [];
  for (let i = 0; i < 200; i++) events.push(...stepBall(b, DT).events);
  expect(events.filter(e => e.type === 'net')).toHaveLength(1);
  expect(b.netHit).toBe(true);
  expect(b.p.z).toBeGreaterThan(0);
});

test('balle au filet devient morte < 2 s', () => {
  const from = { x: 0, y: 0.5, z: 6 };
  const b = createBall(from, launch(from, { x: 0, z: -6 }, 18));
  let t = 0;
  while (!b.dead && t < 3) { stepBall(b, 1 / 60); t += 1 / 60; }
  expect(b.netHit).toBe(true);
  expect(b.dead).toBe(true);
  expect(t).toBeLessThan(2);
  const p = { ...b.p };
  stepBall(b, 0.05);
  expect(b.p).toEqual(p);
});

test('predictAt trouve la hauteur 1 m après rebond', () => {
  const b = createBall({ x: 0, y: 4, z: 5 }, { x: 0, y: 0, z: -3 });
  const snapshot = JSON.stringify(b);
  const r = predictAt(b, s => s.bounces >= 1 && s.p.y >= 1);
  expect(r).not.toBeNull();
  expect(r.t).toBeGreaterThan(1.05);
  expect(r.t).toBeLessThan(1.2);
  expect(r.p.y).toBeGreaterThanOrEqual(1);
  expect(r.p.y).toBeLessThan(1.1);
  expect(JSON.stringify(b)).toBe(snapshot);
  expect(predictAt(b, s => s.p.y > 100)).toBeNull();
});

test('stepBall avec dt=0 ne produit pas de NaN', () => {
  const b = createBall({ x: 1, y: 2, z: 3 }, { x: 1, y: 1, z: -1 });
  const before = JSON.stringify(b);
  const r = stepBall(b, 0);
  expect(r.events).toEqual([]);
  expect(JSON.stringify(b)).toBe(before);
  expect(Object.values(b.p).every(Number.isFinite)).toBe(true);
});
