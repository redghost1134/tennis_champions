// Match controller: state machine tying scoring, serve, physics, shots and players together.
// Geometry: net at z=0; A (z>0) hits toward -z, B (z<0) hits toward +z.
import { COURT, isInCourt, serviceBox, serverSpot } from './court.js';
import { createScore, awardPoint, serveSide } from './scoring.js';
import { gaugeValue, gaugeZone, rollServe, aimPoint } from './serve.js';
import { createBall, launch, launchApex, stepBall } from './physics.js';
import { REACH, resolveKind, errorChance, planShot, heightAtNet, netShot } from './shot.js';

const MAX_DT = 0.05;
const SUB_STEP = 1 / 120;
const POINT_OVER_T = 1.8;
const SWING_T = 0.35;
const RESOLVE_T = 6;
const SERVE_Y = 2.6;
const SERVE_CLEAR = 0.1;
const LONG_Z = 6.5;
const RECEIVE_Z = 8.5;
const RACKET = 0.5;
const HIT_Y = [0.15, 2.6];
const MAX_X = 5;
const Z_RANGE = [1.5, 11];
const IDLE = { move: { x: 0, z: 0 }, armed: null, servePress: false, aimDir: 0 };

const other = (s) => (s === 'A' ? 'B' : 'A');
// +1 for A, -1 for B: sign of z on the side's half, and world x of the side's "right".
const sign = (s) => (s === 'A' ? 1 : -1);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const inBox = (box, x, z) => x >= box.xMin && x <= box.xMax && z >= box.zMin && z <= box.zMax;

function clearingServe(from, to, speed) {
  for (let s = speed, i = 0; i < 25; i++, s *= 0.9) {
    const v = launch(from, to, s);
    if (heightAtNet(from, v) >= COURT.NET_H + SERVE_CLEAR) return v;
  }
  return launchApex(from, to, 4);
}

// Serve trajectory for a rollServe result: good → aimPoint, 'net' → into the net, 'long' → past the service line.
export function planServe(server, side, slot, roll) {
  const spot = serverSpot(server, side);
  const p = { x: spot.x, y: SERVE_Y, z: spot.z };
  const aim = aimPoint(serviceBox(server, side), slot, server);
  const dir = -sign(server);
  let v;
  if (roll.fault === 'net') v = netShot(p, { x: aim.x, z: dir * 1 }, roll.speed);
  else v = clearingServe(p, roll.fault === 'long' ? { x: aim.x, z: dir * LONG_Z } : aim, roll.speed);
  return { p, v };
}

// AI view for `side` (same shape for every caller).
export function viewFor(match, side) {
  const s = match.state;
  const me = s.players[side];
  const op = s.players[other(side)];
  return {
    me: { x: me.x, z: me.z },
    ball: s.ball,
    phase: s.phase,
    iAmServer: s.score.server === side,
    opponent: { x: op.x, z: op.z },
    gauge: s.gauge,
    lastHitter: s.lastHitter,
  };
}

export function createMatch({ format, rng, firstServer = 'A', speedA = 4.4, speedB = 4.4, errorScaleB = 1 }) {
  const speed = { A: speedA, B: speedB };
  const errorScale = { A: 1, B: errorScaleB };
  const player = () => ({ x: 0, z: 0, vx: 0, vz: 0, swing: null });
  const state = {
    phase: 'serve_aim',
    players: { A: player(), B: player() },
    ball: null,
    score: createScore({ format, firstServer }),
    serveAttempt: 1,
    aimSlot: 1,
    gauge: 0,
    lastHitter: null,
  };
  const held = { A: { press: false, slot: false }, B: { press: false, slot: false } };
  const swingT = { A: 0, B: 0 };
  let gaugeT = 0;
  let overT = 0;
  let shot = null; // { isServe, t, bouncedIn } for the ball in play
  let events = [];
  const emit = (e) => events.push(e);

  // ---- point lifecycle ----
  function setupServe() {
    const server = state.score.server;
    const side = serveSide(state.score);
    const spot = serverSpot(server, side);
    const box = serviceBox(server, side);
    const recv = other(server);
    Object.assign(state.players[server], { x: spot.x, z: spot.z, vx: 0, vz: 0 });
    Object.assign(state.players[recv], { x: (box.xMin + box.xMax) / 2, z: sign(recv) * RECEIVE_Z, vx: 0, vz: 0 });
    Object.assign(state, { phase: 'serve_aim', ball: null, lastHitter: null, gauge: 0 });
    shot = null;
    gaugeT = 0;
  }

  function newPoint() {
    state.aimSlot = 1;
    state.serveAttempt = 1;
    setupServe();
  }

  function award(winner, reason) {
    const r = awardPoint(state.score, winner);
    state.score = r.score;
    emit({ type: 'point', winner, reason });
    r.events.forEach((type) => emit({ type }));
    state.phase = 'point_over';
    overT = POINT_OVER_T;
  }

  function fault() {
    const server = state.lastHitter;
    if (state.serveAttempt === 1) {
      emit({ type: 'fault', side: server });
      state.serveAttempt = 2;
      setupServe();
    } else {
      emit({ type: 'double_fault', side: server });
      award(other(server), 'double_fault');
    }
  }

  // First bounce in the wrong place (or never bounced in).
  function badShot() {
    if (shot.isServe) return fault();
    const hitter = state.lastHitter;
    emit({ type: 'out', side: hitter, x: state.ball.p.x, z: state.ball.p.z });
    award(other(hitter), 'out');
  }

  // ---- serve ----
  function shiftSlot(server, pushed) {
    const worldDir = pushed * sign(server);
    const box = serviceBox(server, serveSide(state.score));
    const xs = [0, 1, 2].map((s) => aimPoint(box, s, server).x);
    const cur = state.aimSlot;
    for (const c of [cur - 1, cur + 1]) {
      if (c >= 0 && c <= 2 && (xs[c] - xs[cur]) * worldDir > 0) state.aimSlot = c;
    }
  }

  function swing(side, s) {
    state.players[side].swing = s;
    swingT[side] = SWING_T;
  }

  function serveBall() {
    const server = state.score.server;
    const roll = rollServe(gaugeZone(state.gauge), rng);
    const { p, v } = planServe(server, serveSide(state.score), state.aimSlot, roll);
    state.ball = createBall(p, v);
    state.lastHitter = server;
    state.phase = 'rally';
    shot = { isServe: true, t: 0, bouncedIn: false };
    swing(server, { kind: 'serve', side: 'sm' });
    emit({ type: 'serve', side: server });
  }

  function updateServe(dt, server, input, edge) {
    if (state.phase === 'serve_aim') {
      if (edge.slot) shiftSlot(server, Math.sign(input.move.x));
      if (edge.press) {
        emit({ type: 'toss', side: server });
        state.phase = 'serve_power';
        gaugeT = 0;
        state.gauge = gaugeValue(0);
      }
    } else if (edge.press) {
      serveBall(); // judged on the gauge value the player saw
    } else {
      gaugeT += dt;
      state.gauge = gaugeValue(gaugeT);
    }
  }

  // ---- players ----
  function movePlayer(side, input, dt) {
    const pl = state.players[side];
    let mx = input.move?.x ?? 0;
    let mz = input.move?.z ?? 0;
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const s = sign(side);
    const nx = clamp(pl.x + mx * s * speed[side] * dt, -MAX_X, MAX_X);
    const nz = s > 0 ? clamp(pl.z - mz * speed[side] * dt, Z_RANGE[0], Z_RANGE[1])
      : clamp(pl.z + mz * speed[side] * dt, -Z_RANGE[1], -Z_RANGE[0]);
    pl.vx = (nx - pl.x) / dt;
    pl.vz = (nz - pl.z) / dt;
    pl.x = nx;
    pl.z = nz;
  }

  // ---- rally: judging and hits ----
  function judge(e) {
    const b = state.ball;
    const hitter = state.lastHitter;
    if (e.type === 'net') return emit({ type: 'net', side: hitter, x: b.p.x, z: 0 });
    emit({ type: 'bounce', x: e.x, z: e.z });
    if (b.netHit) return;
    if (b.bounces === 1) {
      const ok = shot.isServe
        ? inBox(serviceBox(hitter, serveSide(state.score)), e.x, e.z)
        : isInCourt(e.x, e.z, other(hitter));
      if (ok) shot.bouncedIn = true;
      else badShot();
    } else if (b.bounces === 2) award(hitter, 'winner');
  }

  function checkResolution() {
    const b = state.ball;
    if (b.netHit && b.dead) return shot.isServe ? fault() : award(other(state.lastHitter), 'net');
    if (Math.abs(b.p.x) > 12 || Math.abs(b.p.z) > 20 || shot.t > RESOLVE_T) {
      if (shot.bouncedIn) award(state.lastHitter, 'winner');
      else badShot();
    }
  }

  function tryHit(inputs) {
    const b = state.ball;
    const side = b.p.z > 0 ? 'A' : 'B';
    const s = sign(side);
    if (b.v.z * s <= 0 || state.lastHitter === side || b.netHit || b.bounces > 1) return;
    if (shot.isServe && b.bounces !== 1) return; // no volley on the return of serve
    if (b.p.y < HIT_Y[0] || b.p.y > HIT_Y[1]) return;
    const pl = state.players[side];
    const dFh = Math.hypot(b.p.x - (pl.x + s * RACKET), b.p.z - pl.z);
    const dBh = Math.hypot(b.p.x - (pl.x - s * RACKET), b.p.z - pl.z);
    const dist = Math.min(dFh, dBh);
    if (dist > REACH) return;

    const input = inputs[side];
    const kind = resolveKind(input.armed, b.p.y);
    const errorP = errorChance({ kind, dist, speed: Math.hypot(pl.vx, pl.vz), maxSpeed: speed[side], errorScale: errorScale[side] });
    const { v, outcome } = planShot({ from: b.p, side, kind, aimDir: input.aimDir ?? 0, rng, errorP });
    state.ball = createBall(b.p, v);
    state.lastHitter = side;
    shot = { isServe: false, t: 0, bouncedIn: false };
    swing(side, { kind, side: kind === 'smash' ? 'sm' : dFh <= dBh ? 'fh' : 'bh' });
    emit({ type: 'hit', side, kind, outcome, x: b.p.x, z: b.p.z });
  }

  // Sub-steps the ball; judging and hits only while the rally is live.
  function stepWorld(dt, inputs) {
    const n = Math.ceil(dt / SUB_STEP - 1e-9);
    const h = dt / n;
    for (let i = 0; i < n && state.ball; i++) {
      const live = state.phase === 'rally';
      const r = stepBall(state.ball, h);
      if (!live) continue;
      shot.t += h;
      for (const e of r.events) {
        judge(e);
        if (state.phase !== 'rally') break;
      }
      if (state.phase === 'rally') checkResolution();
      if (state.phase === 'rally') tryHit(inputs);
    }
  }

  function tickSwings(dt) {
    for (const side of ['A', 'B']) {
      swingT[side] -= dt;
      if (swingT[side] <= 0) state.players[side].swing = null;
    }
  }

  newPoint();

  return {
    // Live object: read-only for callers (do not mutate).
    get state() {
      return state;
    },
    update(dt, inputA, inputB) {
      if (!(dt > 0) || !Number.isFinite(dt)) return [];
      dt = Math.min(dt, MAX_DT);
      events = [];
      const inputs = { A: inputA ?? IDLE, B: inputB ?? IDLE };
      const edges = {};
      for (const side of ['A', 'B']) {
        const press = !!inputs[side].servePress;
        const slot = Math.abs(inputs[side].move?.x ?? 0) > 0.5;
        edges[side] = { press: press && !held[side].press, slot: slot && !held[side].slot };
        held[side] = { press, slot };
      }
      tickSwings(dt);

      const phase = state.phase;
      if (phase === 'serve_aim' || phase === 'serve_power') {
        const server = state.score.server;
        const recv = other(server);
        state.players[server].vx = state.players[server].vz = 0;
        movePlayer(recv, inputs[recv], dt);
        updateServe(dt, server, inputs[server], edges[server]);
      } else if (phase === 'rally' || phase === 'point_over') {
        movePlayer('A', inputs.A, dt);
        movePlayer('B', inputs.B, dt);
        stepWorld(dt, inputs);
        if (phase === 'point_over') {
          overT -= dt;
          if (overT <= 0) {
            if (state.score.winner) {
              state.phase = 'match_over';
              for (const pl of Object.values(state.players)) pl.vx = pl.vz = 0;
            } else newPoint();
          }
        }
      }
      return events;
    },
  };
}
