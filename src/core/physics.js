import { COURT } from './court.js';

export const G = 9.8;
export const RESTITUTION = 0.62;
export const FRICTION = 0.85;

const STEP = 1 / 120;
const NET_DEAD_TIME = 1.5;
const NET_DEAD_SPEED = 0.3;

export function createBall(p, v) {
  return { p: { ...p }, v: { ...v }, bounces: 0, lastBounce: null, netHit: false, dead: false, netT: 0 };
}

function copyBall(b) {
  return { ...b, p: { ...b.p }, v: { ...b.v }, lastBounce: b.lastBounce && { ...b.lastBounce } };
}

function horizontal(from, to, T) {
  return { x: (to.x - from.x) / T, z: (to.z - from.z) / T };
}

export function launch(from, to, horizSpeed) {
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  const T = dist / horizSpeed;
  const h = horizontal(from, to, T);
  return { x: h.x, y: (-from.y + 0.5 * G * T * T) / T, z: h.z };
}

export function launchApex(from, to, apexY) {
  const vy = Math.sqrt(2 * G * (apexY - from.y));
  const T = vy / G + Math.sqrt((2 * apexY) / G);
  const h = horizontal(from, to, T);
  return { x: h.x, y: vy, z: h.z };
}

export function stepBall(ball, dt) {
  const events = [];
  if (dt <= 0 || ball.dead) return { ball, events };
  const { p, v } = ball;
  const z0 = p.z;
  const y0 = p.y;

  v.y -= G * dt;
  p.x += v.x * dt;
  p.y += v.y * dt;
  p.z += v.z * dt;

  if (!ball.netHit && ((z0 < 0 && p.z >= 0) || (z0 > 0 && p.z <= 0))) {
    const k = z0 / (z0 - p.z);
    if (y0 + (p.y - y0) * k < COURT.NET_H) {
      ball.netHit = true;
      p.z = z0;
      v.z = -0.2 * v.z;
      events.push({ type: 'net' });
    }
  }

  if (p.y < 0 && v.y < 0) {
    p.y = 0;
    v.y = -v.y * RESTITUTION;
    v.x *= FRICTION;
    v.z *= FRICTION;
    ball.bounces++;
    ball.lastBounce = { x: p.x, z: p.z };
    events.push({ type: 'bounce', x: p.x, z: p.z });
  }

  if (ball.netHit) {
    ball.netT += dt;
    if (ball.netT > NET_DEAD_TIME || Math.hypot(v.x, v.y, v.z) < NET_DEAD_SPEED) ball.dead = true;
  }
  return { ball, events };
}

export function predictAt(ball, predicate, maxT = 3) {
  const b = copyBall(ball);
  for (let t = STEP; t <= maxT + 1e-9 && !b.dead; t += STEP) {
    stepBall(b, STEP);
    if (predicate(b)) return { t, p: { ...b.p } };
  }
  return null;
}
