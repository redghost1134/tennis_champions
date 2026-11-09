import { REACH, SMASH_MIN_Y, resolveKind, errorChance, planShot } from '../../src/core/shot.js';
import { COURT, isInCourt } from '../../src/core/court.js';
import { createBall, stepBall } from '../../src/core/physics.js';
import { createRng } from '../../src/core/rng.js';

const DT = 1 / 120;

function simulate(from, v) {
  const b = createBall(from, v);
  const events = [];
  for (let i = 0; i < 1200 && !events.some(e => e.type === 'bounce'); i++) events.push(...stepBall(b, DT).events);
  return events;
}
const opp = side => (side === 'A' ? 'B' : 'A');
const fromFor = (side, y = 1, z = 8) => ({ x: 0.5, y, z: side === 'A' ? z : -z });

test('constantes', () => expect([REACH, SMASH_MIN_Y]).toEqual([0.9, 1.6]));

test('smash sur balle basse devient normal', () => expect(resolveKind('smash', 1.0)).toBe('normal'));
test('smash sur balle haute reste smash', () => expect(resolveKind('smash', 2.0)).toBe('smash'));
test('lob armé et sans arme', () => {
  expect(resolveKind('lob', 0.5)).toBe('lob');
  expect(resolveKind(null, 3)).toBe('normal');
});

test('frappe parfaite immobile : risque = base', () =>
  expect(errorChance({ kind: 'normal', dist: 0, speed: 0, maxSpeed: 4.4 })).toBeCloseTo(0.03));
test('frappe en limite de portée en courant : risque plus élevé', () =>
  expect(errorChance({ kind: 'normal', dist: 0.9, speed: 4.4, maxSpeed: 4.4 })).toBeCloseTo(0.36));
test('errorScale et bornes', () => {
  expect(errorChance({ kind: 'smash', dist: 0, speed: 0, maxSpeed: 4.4, errorScale: 2 })).toBeCloseTo(0.2);
  expect(errorChance({ kind: 'smash', dist: 5, speed: 9, maxSpeed: 4.4 })).toBe(0.9);
  expect(errorChance({ kind: 'lob', dist: 0, speed: 0, maxSpeed: 4.4, errorScale: 0 })).toBe(0);
});

test('aimDir droite pour A vise +x', () => {
  const p = planShot({ from: fromFor('A'), side: 'A', kind: 'normal', aimDir: 1, rng: createRng(1), errorP: 0 });
  expect(p.target).toEqual({ x: 2.4, z: -6.5 });
  expect(p.outcome).toBe('in');
});
test('aimDir droite pour B vise -x', () => {
  const p = planShot({ from: fromFor('B'), side: 'B', kind: 'normal', aimDir: 1, rng: createRng(1), errorP: 0 });
  expect(p.target).toEqual({ x: -2.4, z: 6.5 });
});
test('aimDir 0 : x aléatoire dans [-1.2, 1.2]', () => {
  const rng = createRng(5);
  for (let i = 0; i < 50; i++) {
    const p = planShot({ from: fromFor('A'), side: 'A', kind: 'normal', aimDir: 0, rng, errorP: 0 });
    expect(Math.abs(p.target.x)).toBeLessThanOrEqual(1.2);
  }
});
test('profondeurs par type', () => {
  const t = kind => planShot({ from: fromFor('A', 2.2), side: 'A', kind, aimDir: -1, rng: createRng(1), errorP: 0 }).target;
  expect(t('normal')).toEqual({ x: -2.4, z: -6.5 });
  expect(t('lob')).toEqual({ x: -2.4, z: -7.5 });
  expect(t('smash')).toEqual({ x: -2.4, z: -5.5 });
});

test('errorP=0 → atterrit dans le terrain adverse (tous types, deux côtés)', () => {
  const rng = createRng(42);
  for (const side of ['A', 'B']) {
    for (const kind of ['normal', 'lob', 'smash']) {
      for (const aimDir of [-1, 0, 1]) {
        const from = fromFor(side, kind === 'smash' ? 2.2 : 1);
        const p = planShot({ from, side, kind, aimDir, rng, errorP: 0 });
        expect(p.outcome).toBe('in');
        const ev = simulate(from, p.v);
        expect(ev.some(e => e.type === 'net')).toBe(false);
        const bounce = ev.find(e => e.type === 'bounce');
        expect(bounce).toBeDefined();
        expect(isInCourt(bounce.x, bounce.z, opp(side))).toBe(true);
      }
    }
  }
});

test('balle basse frappée depuis le fond passe le filet et reste dedans', () => {
  for (const side of ['A', 'B']) {
    const from = fromFor(side, 0.3, 9);
    const p = planShot({ from, side, kind: 'normal', aimDir: 0, rng: createRng(3), errorP: 0 });
    const ev = simulate(from, p.v);
    expect(ev.some(e => e.type === 'net')).toBe(false);
    const bounce = ev.find(e => e.type === 'bounce');
    expect(isInCourt(bounce.x, bounce.z, opp(side))).toBe(true);
  }
});

test('balle basse près du filet passe quand même le filet', () => {
  const from = { x: 0, y: 0.3, z: 1.5 };
  const p = planShot({ from, side: 'A', kind: 'normal', aimDir: 0, rng: createRng(3), errorP: 0 });
  const ev = simulate(from, p.v);
  expect(ev.some(e => e.type === 'net')).toBe(false);
  expect(isInCourt(ev[0].x, ev[0].z, 'B')).toBe(true);
});

test('errorP=1 : toujours une erreur, outcome net ou out', () => {
  const rng = createRng(9);
  const seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(planShot({ from: fromFor('A'), side: 'A', kind: 'normal', aimDir: 0, rng, errorP: 1 }).outcome);
  expect(seen.has('net')).toBe(true);
  expect(seen.has('out')).toBe(true);
  expect(seen.has('in')).toBe(false);
});

test('outcome net → la balle touche le filet avant de rebondir', () => {
  const rng = createRng(11);
  let n = 0;
  for (let i = 0; i < 200 && n < 20; i++) {
    for (const side of ['A', 'B']) {
      for (const kind of ['normal', 'lob', 'smash']) {
        const from = fromFor(side, kind === 'smash' ? 2.2 : 1, i % 2 ? 8 : 2.5);
        const p = planShot({ from, side, kind, aimDir: 0, rng, errorP: 1 });
        if (p.outcome !== 'net') continue;
        n++;
        const ev = simulate(from, p.v);
        expect(ev[0].type).toBe('net');
      }
    }
  }
  expect(n).toBeGreaterThan(10);
});

test('outcome out → 1er rebond hors du terrain adverse, sans filet', () => {
  const rng = createRng(21);
  let n = 0;
  const kinds = new Set();
  for (let i = 0; i < 200; i++) {
    for (const side of ['A', 'B']) {
      for (const kind of ['normal', 'lob', 'smash']) {
        const from = fromFor(side, kind === 'smash' ? 2.2 : 1);
        const p = planShot({ from, side, kind, aimDir: ((i % 3) - 1), rng, errorP: 1 });
        if (p.outcome !== 'out') continue;
        n++;
        const ev = simulate(from, p.v);
        expect(ev.some(e => e.type === 'net')).toBe(false);
        const b = ev.find(e => e.type === 'bounce');
        expect(isInCourt(b.x, b.z, opp(side))).toBe(false);
        // sur la moitié adverse (côté filet respecté)
        expect(side === 'A' ? b.z < 0 : b.z > 0).toBe(true);
        kinds.add(Math.abs(b.x) > COURT.HALF_W ? 'wide' : 'long');
      }
    }
  }
  expect(n).toBeGreaterThan(50);
  expect(kinds.size).toBe(2);
});
