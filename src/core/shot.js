import { COURT } from './court.js';
import { G, launch, launchApex } from './physics.js';

export const REACH = 0.9;
export const SMASH_MIN_Y = 1.6;

const BASE = { normal: 0.03, lob: 0.06, smash: 0.10 };
const DEPTH = { normal: 6.5, lob: 7.5, smash: 5.5 };
const SPEED = { normal: 12, lob: 12, smash: 20 };
const LOB_APEX = 5.5;
const CLEAR = 0.15;

export function resolveKind(armed, ballY) {
  if (armed === 'lob') return 'lob';
  if (armed === 'smash' && ballY >= SMASH_MIN_Y) return 'smash';
  return 'normal';
}

export function errorChance({ kind, dist, speed, maxSpeed, errorScale = 1 }) {
  const p = (BASE[kind] + 0.25 * (dist / REACH) ** 2 + 0.08 * Math.min(speed / maxSpeed, 1)) * errorScale;
  return Math.min(0.9, Math.max(0, p));
}

// Height of the ball when it crosses the net plane (z = 0); null if it never does.
function heightAtNet(from, v) {
  if (v.z === 0) return null;
  const t = -from.z / v.z;
  if (t <= 0) return null;
  return from.y + v.y * t - 0.5 * G * t * t;
}

// Trajectory landing on `to` that clears the net; lowers speed (higher arc) if needed.
function clearingShot(from, to, kind, speed) {
  if (kind === 'lob') return launchApex(from, to, LOB_APEX);
  for (let s = speed, i = 0; i < 25; i++, s *= 0.9) {
    const v = launch(from, to, s);
    if (heightAtNet(from, v) >= COURT.NET_H + CLEAR) return v;
  }
  return launchApex(from, to, 4);
}

// Trajectory aimed just past the net that is guaranteed to cross it below net height.
function netShot(from, to, speed) {
  const v = launch(from, to, speed);
  const h = heightAtNet(from, v);
  if (h !== null && h >= COURT.NET_H - 0.1) {
    const t = -from.z / v.z;
    v.y = (0.4 - from.y + 0.5 * G * t * t) / t;
  }
  return v;
}

export function planShot({ from, side, kind, aimDir, rng, errorP }) {
  const dirZ = side === 'A' ? -1 : 1;
  const sign = side === 'A' ? 1 : -1;
  const x = aimDir !== 0 ? aimDir * sign * 2.4 : (rng() * 2 - 1) * 1.2;
  const speed = SPEED[kind];
  let target = { x, z: dirZ * DEPTH[kind] };
  let outcome = 'in';
  let v;

  if (rng() < errorP) {
    if (rng() < 0.5) {
      outcome = 'net';
      target = { x, z: dirZ * 1 };
      v = netShot(from, target, speed * 1.2);
    } else {
      outcome = 'out';
      if (rng() < 0.5) target = { x, z: dirZ * 9.9 };
      else target = { x: (x === 0 ? (rng() < 0.5 ? -1 : 1) : Math.sign(x)) * 4.3, z: target.z };
    }
  }
  if (!v) v = clearingShot(from, target, kind, speed);
  return { v, outcome, target };
}
