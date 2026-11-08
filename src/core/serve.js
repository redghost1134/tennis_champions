export const SERVE = {
  green: { speed: 9, fault: 0 },
  yellow: { speed: 13, fault: 0.08 },
  red: { speed: 18, fault: 0.45 },
};

const HALF = 0.6;

export function gaugeValue(t) {
  const p = ((t % (2 * HALF)) + 2 * HALF) % (2 * HALF);
  return p <= HALF ? p / HALF : (2 * HALF - p) / HALF;
}

export function gaugeZone(v) {
  return v < 0.5 ? 'green' : v < 0.8 ? 'yellow' : 'red';
}

export function rollServe(zone, rng) {
  const { speed, fault } = SERVE[zone];
  if (rng() < fault) return { fault: rng() < 0.5 ? 'net' : 'long', speed };
  return { fault: null, speed };
}

const SLOT_X = [0.5, 1.75, 3.0];

export function aimPoint(box, slot, server) {
  const xs = box.xMax <= 0 ? -1 : 1;
  const zs = box.zMax <= 0 ? -1 : 1;
  return { x: xs * SLOT_X[slot], z: zs * 3.2 };
}
