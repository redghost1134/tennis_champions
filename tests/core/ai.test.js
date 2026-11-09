import { createRng } from '../../src/core/rng.js';
import { OPPONENTS } from '../../src/core/opponents.js';
import { createAI } from '../../src/core/ai.js';
import { createBall, launch, stepBall } from '../../src/core/physics.js';
import { REACH } from '../../src/core/shot.js';
import { gaugeValue, gaugeZone } from '../../src/core/serve.js';

const DT = 1 / 60;

test("OPPONENTS : 10 niveaux 1..10 dans l'ordre", () => {
  expect(OPPONENTS).toHaveLength(10);
  OPPONENTS.forEach((o, i) => {
    expect(o.level).toBe(i + 1);
    expect(typeof o.id).toBe('string');
    expect(typeof o.name).toBe('string');
  });
  expect(OPPONENTS[0].id).toBe('toto');
  expect(OPPONENTS[9].ai).toEqual({ speed: 4.8, reaction: 0.08, aimWide: 0.95, errorScale: 0.35, lob: 0.2, smash: 0.6, red: 0.4, yellow: 0.5 });
});

function incomingBall() {
  const from = { x: 0, y: 1, z: 8 };
  return createBall(from, launch(from, { x: 0.5, z: -6 }, 12));
}

test('IA niveau 10 rejoint une balle centrée à temps', () => {
  const params = OPPONENTS[9].ai;
  const ai = createAI(params, createRng(1));
  const ball = incomingBall();
  const me = { x: 0, z: -8.5 };
  let reached = false;
  for (let t = 0; t < 2 && !reached; t += DT) {
    const input = ai.decide({ me, ball, phase: 'rally', iAmServer: false, opponent: { x: 0, z: 8 }, gauge: 0, lastHitter: 'A' }, DT);
    expect(Math.abs(input.move.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(input.move.z)).toBeLessThanOrEqual(1);
    // repère de B : x joueur = -x monde, z joueur = +z monde
    me.x += -input.move.x * params.speed * DT;
    me.z += input.move.z * params.speed * DT;
    stepBall(ball, DT);
    const rx = me.x - 0.5; // point de raquette coup droit de B
    const d = Math.hypot(ball.p.x - rx, ball.p.z - me.z);
    if (ball.p.z < 0 && ball.p.y >= 0.15 && ball.p.y <= 2.6 && d < REACH) reached = true;
  }
  expect(reached).toBe(true);
});

test('IA : move exprimé dans le repère du joueur (A et B)', () => {
  const view = (me) => ({ me, ball: null, phase: 'rally', iAmServer: false, opponent: { x: 0, z: 8 }, gauge: 0, lastHitter: null });
  const b = createAI(OPPONENTS[0].ai, createRng(1), 'B');
  const a = createAI(OPPONENTS[0].ai, createRng(1), 'A');
  // B depuis x=2 vise x=0 : va vers -x monde = sa droite (+1)
  expect(b.decide(view({ x: 2, z: -8.5 }), DT).move.x).toBeGreaterThan(0);
  // B trop près du filet (z=-3) : doit reculer (-z joueur)
  expect(b.decide(view({ x: 0, z: -3 }), DT).move.z).toBeLessThan(0);
  // A depuis x=2 va vers -x monde = sa gauche (-1) ; trop près du filet : reculer
  expect(a.decide(view({ x: 2, z: 8.5 }), DT).move.x).toBeLessThan(0);
  expect(a.decide(view({ x: 0, z: 3 }), DT).move.z).toBeLessThan(0);
  // zone morte : immobile
  const still = b.decide(view({ x: 0.02, z: -8.5 }), DT).move;
  expect(still.x === 0 && still.z === 0).toBe(true);
});

test('IA niveau 1 ne vise jamais les côtés (aimWide 0)', () => {
  const ai = createAI(OPPONENTS[0].ai, createRng(7));
  for (let n = 0; n < 40; n++) {
    const ball = incomingBall();
    const v = { me: { x: 0, z: -8.5 }, ball, phase: 'rally', iAmServer: false, opponent: { x: 0, z: 8 }, gauge: 0 };
    ai.decide({ ...v, lastHitter: 'B' }, DT);
    for (let k = 0; k < 60; k++) {
      expect(ai.decide({ ...v, lastHitter: 'A' }, DT).aimDir).toBe(0);
    }
  }
});

test('IA aimWide 1 vise toujours un côté', () => {
  const ai = createAI({ ...OPPONENTS[0].ai, aimWide: 1, reaction: 0.01 }, createRng(3));
  const seen = new Set();
  for (let n = 0; n < 30; n++) {
    const v = { me: { x: 0, z: -8.5 }, ball: incomingBall(), phase: 'rally', iAmServer: false, opponent: { x: 0, z: 8 }, gauge: 0 };
    ai.decide({ ...v, lastHitter: 'B' }, DT);
    let last;
    for (let k = 0; k < 5; k++) last = ai.decide({ ...v, lastHitter: 'A' }, DT);
    seen.add(last.aimDir);
  }
  expect(seen.has(0)).toBe(false);
  expect(seen.has(1) && seen.has(-1)).toBe(true);
});

test('IA au service relâche dans la zone choisie', () => {
  const params = { ...OPPONENTS[0].ai, red: 0.4, yellow: 0.5 };
  const zones = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const ai = createAI(params, createRng(seed));
    const base = { me: { x: 0, z: -9 }, ball: null, iAmServer: true, opponent: { x: 0, z: 8 }, gauge: 0, lastHitter: null };
    let pressed = false;
    for (let t = 0; t < 3 && !pressed; t += DT) {
      pressed = ai.decide({ ...base, phase: 'serve_aim' }, DT).servePress;
    }
    expect(pressed).toBe(true);
    let released = false;
    for (let t = 0; t < 3 && !released; t += DT) {
      const gauge = gaugeValue(t);
      if (ai.decide({ ...base, phase: 'serve_power', gauge }, DT).servePress) {
        released = true;
        expect(gaugeZone(gauge)).toBe(ai.lastServeZone);
        zones.add(ai.lastServeZone);
      }
    }
    expect(released).toBe(true);
  }
  expect(zones.size).toBe(3);
});

test('IA : deux points consécutifs avec lastHitter A repartent propres', () => {
  const params = { ...OPPONENTS[0].ai, aimWide: 1, lob: 1, reaction: 0.5 };
  const ai = createAI(params, createRng(5));
  const v = { me: { x: 0, z: -8.5 }, phase: 'rally', iAmServer: false, opponent: { x: 0, z: 8 }, gauge: 0, lastHitter: 'A' };
  let out;
  for (let t = 0; t < 0.7; t += DT) out = ai.decide({ ...v, ball: incomingBall() }, DT);
  expect(out.armed).toBe('lob');
  // fin du point 1 puis service de A (lastHitter reste 'A')
  ai.decide({ ...v, ball: null, phase: 'serve_aim' }, DT);
  ai.decide({ ...v, ball: null, phase: 'serve_power' }, DT);
  // point 2 : la balle repart, la réaction doit être attendue de nouveau
  out = ai.decide({ ...v, ball: incomingBall() }, DT);
  expect(out.armed).toBe(null);
  expect(out.aimDir).toBe(0);
  for (let t = 0; t < 0.6; t += DT) out = ai.decide({ ...v, ball: incomingBall() }, DT);
  expect(out.armed).toBe('lob');
  expect(out.aimDir).not.toBe(0);
});

test('IA : second service (après faute) appuie de nouveau sur la touche de lancer', () => {
  const ai = createAI({ ...OPPONENTS[0].ai }, createRng(2));
  const base = { me: { x: 0, z: -9 }, ball: null, iAmServer: true, opponent: { x: 0, z: 8 }, gauge: 0, lastHitter: null };
  for (let round = 0; round < 2; round++) {
    let pressed = false;
    for (let t = 0; t < 2 && !pressed; t += DT) pressed = ai.decide({ ...base, phase: 'serve_aim' }, DT).servePress;
    expect(pressed).toBe(true);
    let released = false;
    for (let t = 0; t < 2 && !released; t += DT) {
      const gauge = gaugeValue(t);
      released = ai.decide({ ...base, phase: 'serve_power', gauge }, DT).servePress;
    }
    expect(released).toBe(true);
  }
});
