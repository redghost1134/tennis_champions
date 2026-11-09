import { createMatch, viewFor, planServe } from '../../src/core/match.js';
import { serviceBox, serverSpot } from '../../src/core/court.js';
import { createBall, stepBall } from '../../src/core/physics.js';
import { REACH } from '../../src/core/shot.js';
import { gaugeZone, SERVE } from '../../src/core/serve.js';
import { createAI } from '../../src/core/ai.js';
import { OPPONENTS } from '../../src/core/opponents.js';
import { createRng } from '../../src/core/rng.js';

const DT = 1 / 60;
const IDLE = { move: { x: 0, z: 0 }, armed: null, servePress: false, aimDir: 0 };
const inp = (o = {}) => ({ ...IDLE, ...o });
const constRng = (v) => () => v;
const seqRng = (vals, dflt = 0.5) => {
  let i = 0;
  return () => (i < vals.length ? vals[i++] : dflt);
};
const idle = () => IDLE;

// Advances frame by frame until pred(m) or max frames; returns every event.
function runUntil(m, pred, max = 600, a = idle, b = idle) {
  const ev = [];
  for (let i = 0; i < max && !pred(m); i++) ev.push(...m.update(DT, a(m), b(m)));
  return ev;
}

// The current server tosses then hits when the gauge is in `zone`; `other` drives the receiver.
function serve(m, zone = 'green', other = idle) {
  const s = m.state.score.server;
  const ev = [];
  const step = (press) => {
    const me = inp({ servePress: press });
    ev.push(...(s === 'A' ? m.update(DT, me, other(m)) : m.update(DT, other(m), me)));
  };
  step(true);
  step(false);
  let prev = false;
  for (let k = 0; k < 300 && m.state.phase === 'serve_power'; k++) {
    const press = !prev && gaugeZone(m.state.gauge) === zone;
    step(press);
    prev = press;
  }
  return ev;
}

const types = (ev) => ev.map((e) => e.type);
const inBox = (box, p) => p.x >= box.xMin && p.x <= box.xMax && p.z >= box.zMin && p.z <= box.zMax;

test('double faute → point au receveur', () => {
  // red: fault (0.1 < 0.45) — first 'net' (0.1 < 0.5), then 'long' (0.9)
  const m = createMatch({ format: 'quick', rng: seqRng([0.1, 0.1, 0.1, 0.9]) });
  const ev1 = [...serve(m, 'red'), ...runUntil(m, (x) => x.state.phase !== 'rally')];
  expect(types(ev1)).toContain('net');
  expect(types(ev1)).toContain('fault');
  expect(m.state.phase).toBe('serve_aim');
  expect(m.state.serveAttempt).toBe(2);
  expect(m.state.ball).toBeNull();
  expect(m.state.lastHitter).toBeNull();

  const ev2 = [...serve(m, 'red'), ...runUntil(m, (x) => x.state.phase !== 'rally')];
  const bounce = ev2.find((e) => e.type === 'bounce');
  expect(Math.abs(bounce.z)).toBeGreaterThan(5); // long : past the service line
  expect(types(ev2)).toContain('double_fault');
  expect(ev2.find((e) => e.type === 'point')).toMatchObject({ winner: 'B', reason: 'double_fault' });
  expect(m.state.score.points).toEqual({ A: 0, B: 1 });
  expect(m.state.phase).toBe('point_over');

  runUntil(m, (x) => x.state.phase !== 'point_over', 200);
  expect(m.state.phase).toBe('serve_aim');
  expect(m.state.serveAttempt).toBe(1);
});

test('service dans le carré puis receveur immobile hors portée → point au serveur', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.5) });
  runUntil(m, () => false, 120, idle, () => inp({ move: { x: -1, z: 0 } })); // B's left = +x world
  const ev = [...serve(m, 'green'), ...runUntil(m, (x) => x.state.phase !== 'rally')];
  expect(m.state.players.B.x).toBe(5);
  const first = ev.find((e) => e.type === 'bounce');
  expect(inBox(serviceBox('A', 'deuce'), first)).toBe(true);
  expect(types(ev)).not.toContain('hit');
  expect(ev.find((e) => e.type === 'point')).toMatchObject({ winner: 'A', reason: 'winner' });
  expect(m.state.score.points).toEqual({ A: 1, B: 0 });
});

test('le receveur immobile sur la trajectoire frappe automatiquement', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.99) });
  const ev = [...serve(m, 'green'), ...runUntil(m, (x) => x.state.lastHitter === 'B')];
  const hit = ev.find((e) => e.type === 'hit');
  expect(hit).toMatchObject({ type: 'hit', side: 'B', kind: 'normal', outcome: 'in' });
  expect(m.state.players.B.swing).toMatchObject({ kind: 'normal' });
  expect(['fh', 'bh']).toContain(m.state.players.B.swing.side);
  expect(m.state.ball.v.z).toBeGreaterThan(0); // now heading to A
});

test('smash armé sur balle basse → event hit kind normal', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.99) });
  const smash = () => inp({ armed: 'smash' });
  const ev = [...serve(m, 'green', smash), ...runUntil(m, (x) => x.state.lastHitter === 'B', 600, idle, smash)];
  expect(ev.find((e) => e.type === 'hit')).toMatchObject({ side: 'B', kind: 'normal' });
});

test('balle dans le filet → point à l adversaire du frappeur', () => {
  // rng 0: green serve is good, B's return always errs and goes into the net
  const m = createMatch({ format: 'quick', rng: constRng(0) });
  serve(m, 'green');
  runUntil(m, (x) => x.state.lastHitter === 'B');
  // time from the net contact to the point (dead ball)
  let t = null;
  const ev = [];
  for (let i = 0; i < 600 && m.state.phase === 'rally'; i++) {
    const e = m.update(DT, IDLE, IDLE);
    if (t !== null) t += DT;
    if (e.some((x) => x.type === 'net')) t = 0;
    ev.push(...e);
  }
  expect(types(ev)).toContain('net');
  expect(ev.find((e) => e.type === 'point')).toMatchObject({ winner: 'A', reason: 'net' });
  expect(t).toBeLessThan(2);
});

test('balle out → point à l adversaire du frappeur', () => {
  // serve green (0.5), B return: x = 0 (0.5), error (0), out (0.9), long (0.1)
  const m = createMatch({ format: 'quick', rng: seqRng([0.5, 0.5, 0, 0.9, 0.1]) });
  serve(m, 'green');
  const aAway = () => inp({ move: { x: 1, z: 0 } }); // A must not volley the long ball
  const hitEv = runUntil(m, (x) => x.state.lastHitter === 'B', 600, aAway);
  expect(hitEv.find((e) => e.type === 'hit')).toMatchObject({ side: 'B', outcome: 'out' });
  const ev = runUntil(m, (x) => x.state.phase !== 'rally', 600, aAway);
  expect(ev.find((e) => e.type === 'out')).toMatchObject({ side: 'B' });
  expect(ev.find((e) => e.type === 'point')).toMatchObject({ winner: 'A', reason: 'out' });
});

test('un joueur ne re-frappe pas sa propre balle', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.99) });
  serve(m, 'green');
  const A = m.state.players.A;
  // Test-only mutation of the live state: a ball right on A's forehand, coming at A.
  const ball = () => {
    const b = createBall({ x: A.x + 0.5, y: 1, z: A.z - 0.3 }, { x: 0, y: 0, z: 3 });
    b.bounces = 1;
    return b;
  };
  m.state.ball = ball();
  expect(m.state.lastHitter).toBe('A');
  expect(types(m.update(DT, IDLE, IDLE))).not.toContain('hit');

  m.state.ball = ball();
  m.state.lastHitter = 'B'; // control: same ball from the opponent is hit
  expect(m.update(DT, IDLE, IDLE).find((e) => e.type === 'hit')).toMatchObject({ side: 'A' });
});

test('retour de service de volée impossible', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.99) });
  const fwd = (x) => (x.state.players.B.z < -2 ? inp({ move: { x: 0, z: 1 } }) : IDLE);
  serve(m, 'green', fwd);
  let wasInReach = false;
  const ev = runUntil(
    m,
    (x) => {
      const b = x.state.ball;
      const B = x.state.players.B;
      if (b && b.bounces === 0 && b.p.y >= 0.15 && b.p.y <= 2.6) {
        const d = Math.min(Math.hypot(b.p.x - (B.x - 0.5), b.p.z - B.z), Math.hypot(b.p.x - (B.x + 0.5), b.p.z - B.z));
        if (d <= REACH) wasInReach = true;
      }
      return x.state.phase !== 'rally';
    },
    600,
    idle,
    fwd,
  );
  expect(wasInReach).toBe(true);
  expect(types(ev)).not.toContain('hit');
});

test('dt=10 est plafonné, aucun NaN', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.5) });
  serve(m, 'green');
  const p0 = { ...m.state.ball.p };
  const speed = Math.hypot(m.state.ball.v.x, m.state.ball.v.y, m.state.ball.v.z);
  m.update(10, inp({ move: { x: 1, z: 1 } }), IDLE);
  const p1 = m.state.ball.p;
  expect(Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z)).toBeLessThanOrEqual(speed * 0.05 + 0.05);
  for (let i = 0; i < 400; i++) m.update(10, inp({ move: { x: 1, z: 1 } }), IDLE);
  // every numeric field must stay finite
  const { A, B } = m.state.players;
  for (const v of [A.x, A.z, A.vx, A.vz, B.x, B.z, m.state.gauge]) expect(Number.isFinite(v)).toBe(true);
  if (m.state.ball) for (const v of [...Object.values(m.state.ball.p), ...Object.values(m.state.ball.v)]) expect(Number.isFinite(v)).toBe(true);
});

test('dt=0 ne change rien', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.5) });
  serve(m, 'green');
  const before = JSON.stringify(m.state);
  const press = inp({ move: { x: 1, z: 1 }, servePress: true });
  expect(m.update(0, press, press)).toEqual([]);
  expect(m.update(-1, press, press)).toEqual([]);
  expect(m.update(NaN, press, press)).toEqual([]);
  expect(JSON.stringify(m.state)).toBe(before);
});

test('servePress maintenu : un seul toss, pas de service immédiat', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.5) });
  const hold = inp({ servePress: true });
  const ev = [];
  for (let i = 0; i < 60; i++) ev.push(...m.update(DT, hold, IDLE));
  expect(types(ev).filter((t) => t === 'toss')).toHaveLength(1);
  expect(types(ev)).not.toContain('serve');
  expect(m.state.phase).toBe('serve_power');
  expect(m.state.gauge).toBeGreaterThan(0);
});

test('serve_aim : placement et choix de visée au front montant', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.5) });
  const box = serviceBox('A', 'deuce');
  expect(m.state.players.A).toMatchObject(serverSpot('A', 'deuce'));
  expect(m.state.players.B).toMatchObject({ x: (box.xMin + box.xMax) / 2, z: -8.5 });
  expect(m.state.aimSlot).toBe(1);
  const right = inp({ move: { x: 1, z: 0 } });
  const left = inp({ move: { x: -1, z: 0 } });
  // deuce box of A is x<0: pushing right (+x) moves toward the centre line (slot 0)
  m.update(DT, right, IDLE);
  m.update(DT, right, IDLE); // held: no repeat
  expect(m.state.aimSlot).toBe(0);
  m.update(DT, IDLE, IDLE);
  m.update(DT, right, IDLE); // clamped
  expect(m.state.aimSlot).toBe(0);
  for (const expected of [1, 2, 2]) {
    m.update(DT, IDLE, IDLE);
    m.update(DT, left, IDLE);
    expect(m.state.aimSlot).toBe(expected);
  }
  expect(m.state.players.A).toMatchObject(serverSpot('A', 'deuce')); // server cannot move
});

test('service bon : rebond dans le carré pour tout slot × zone × serveur × côté', () => {
  for (const server of ['A', 'B'])
    for (const side of ['deuce', 'ad'])
      for (const slot of [0, 1, 2])
        for (const zone of Object.keys(SERVE)) {
          const { p, v } = planServe(server, side, slot, { fault: null, speed: SERVE[zone].speed });
          const b = createBall(p, v);
          let first = null;
          for (let i = 0; i < 600 && !first; i++) first = stepBall(b, 1 / 120).events.find((e) => e.type === 'bounce');
          expect(b.netHit, `${server} ${side} ${slot} ${zone}`).toBe(false);
          expect(inBox(serviceBox(server, side), first), `${server} ${side} ${slot} ${zone}`).toBe(true);
        }
});

test('trajectoires de faute : filet et long', () => {
  for (const server of ['A', 'B']) {
    const net = planServe(server, 'ad', 2, { fault: 'net', speed: 18 });
    const bn = createBall(net.p, net.v);
    for (let i = 0; i < 600 && !bn.netHit; i++) stepBall(bn, 1 / 120);
    expect(bn.netHit).toBe(true);
    const long = planServe(server, 'deuce', 1, { fault: 'long', speed: 13 });
    const bl = createBall(long.p, long.v);
    let first = null;
    for (let i = 0; i < 600 && !first; i++) first = stepBall(bl, 1 / 120).events.find((e) => e.type === 'bounce');
    expect(bl.netHit).toBe(false);
    expect(inBox(serviceBox(server, 'deuce'), first)).toBe(false);
  }
});

test('viewFor construit la vue IA', () => {
  const m = createMatch({ format: 'quick', rng: constRng(0.5), firstServer: 'B' });
  const v = viewFor(m, 'B');
  expect(v).toEqual({
    me: { x: m.state.players.B.x, z: m.state.players.B.z },
    ball: null,
    phase: 'serve_aim',
    iAmServer: true,
    opponent: { x: m.state.players.A.x, z: m.state.players.A.z },
    gauge: 0,
    lastHitter: null,
  });
  expect(viewFor(m, 'A').iAmServer).toBe(false);
});

test('match quick IA vs IA se termine avec un vainqueur', () => {
  const pa = OPPONENTS[9].ai;
  const pb = OPPONENTS[0].ai;
  const aiA = createAI(pa, createRng(11), 'A');
  const aiB = createAI(pb, createRng(12), 'B');
  const m = createMatch({ format: 'quick', rng: createRng(13), speedA: pa.speed, speedB: pb.speed, errorScaleB: pb.errorScale });
  let hits = 0;
  for (let i = 0; i < 20000 && m.state.phase !== 'match_over'; i++) {
    const ev = m.update(DT, aiA.decide(viewFor(m, 'A'), DT), aiB.decide(viewFor(m, 'B'), DT));
    hits += ev.filter((e) => e.type === 'hit').length;
  }
  expect(m.state.phase).toBe('match_over');
  expect(['A', 'B']).toContain(m.state.score.winner);
  expect(hits).toBeGreaterThan(0);
});
