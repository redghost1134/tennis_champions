import { predictAt } from './physics.js';
import { gaugeZone } from './serve.js';

const READY_Z = 8.5;
const DEAD_ZONE = 0.05;
const GAIN = 1 / 0.25; // mouvement proportionnel à moins de 0.25 m de la cible
const TOSS_DELAY = 0.6;

const clamp = (v) => Math.max(-1, Math.min(1, v));

export function createAI(params, rng, side = 'B') {
  const own = side === 'B' ? -1 : 1; // signe de z côté IA
  const right = own === -1 ? -1 : 1; // x monde de « sa droite »
  const fwd = -own; // z monde « vers le filet »
  const opp = side === 'B' ? 'A' : 'B';

  let prevHitter = null;
  let waited = 0;
  let receiving = false;
  let incoming = { aimDir: 0, armed: null };
  let aimTimer = 0;
  let tossed = false;
  let zone = null;
  let prevPhase = null;

  const onMyHalf = (b) => b.p.z * own > 0;

  function pickIncoming() {
    const aimDir = rng() < params.aimWide ? (rng() < 0.5 ? -1 : 1) : 0;
    const armed = rng() < params.lob ? 'lob' : rng() < params.smash ? 'smash' : null;
    incoming = { aimDir, armed };
  }

  function target(ball) {
    const hit = predictAt(ball, (b) => b.bounces >= 1 && b.p.y <= 1.0 && b.v.y < 0 && onMyHalf(b), 3);
    const pred = hit ?? (ball.lastBounce ? { p: { x: ball.lastBounce.x, z: ball.lastBounce.z } } : predictAt(ball, (b) => b.bounces >= 1, 3));
    if (!pred) return null;
    // la balle doit tomber côté coup droit : B -> x+0.5, A -> x-0.5
    return { x: pred.p.x - right * 0.5, z: pred.p.z };
  }

  function steer(me, t) {
    const dx = t.x - me.x;
    const dz = t.z - me.z;
    const mx = Math.abs(dx) < DEAD_ZONE ? 0 : clamp(dx * right * GAIN);
    const mz = Math.abs(dz) < DEAD_ZONE ? 0 : clamp(dz * fwd * GAIN);
    return { x: mx, z: mz };
  }

  function serveInput(view, dt) {
    let servePress = false;
    if (view.phase === 'serve_aim') {
      zone = null;
      aimTimer += dt;
      if (!tossed && aimTimer >= TOSS_DELAY) {
        tossed = true;
        servePress = true;
      }
    } else if (view.phase === 'serve_power') {
      aimTimer = 0;
      tossed = false;
      if (zone === null) {
        zone = rng() < params.red ? 'red' : rng() < params.yellow ? 'yellow' : 'green';
        api.lastServeZone = zone;
      }
      servePress = gaugeZone(view.gauge) === zone;
    }
    return servePress;
  }

  const api = {
    lastServeZone: null,
    decide(view, dt) {
      // chaque point repart propre : service en cours ou balle absente
      if (view.phase.startsWith('serve') || !view.ball) {
        prevHitter = null;
        receiving = false;
        waited = 0;
        incoming = { aimDir: 0, armed: null };
      }
      if (view.phase === 'serve_aim' && prevPhase !== 'serve_aim') {
        aimTimer = 0;
        tossed = false;
      }
      prevPhase = view.phase;
      if (view.lastHitter !== prevHitter) {
        prevHitter = view.lastHitter;
        receiving = prevHitter === opp;
        waited = 0;
        if (receiving) pickIncoming();
      }
      if (receiving) waited += dt;

      const servePress = view.iAmServer ? serveInput(view, dt) : false;
      let t = { x: 0, z: own * READY_Z };
      let armed = null;
      let aimDir = 0;
      if (receiving && waited >= params.reaction && view.ball) {
        t = target(view.ball) ?? t;
        ({ aimDir, armed } = incoming);
      }
      const move = view.iAmServer && view.phase.startsWith('serve') ? { x: 0, z: 0 } : steer(view.me, t);
      return { move, armed, servePress, aimDir };
    },
  };
  return api;
}
