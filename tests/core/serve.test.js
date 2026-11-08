import { createRng } from '../../src/core/rng.js';
import { serviceBox } from '../../src/core/court.js';
import { gaugeValue, gaugeZone, SERVE, rollServe, aimPoint } from '../../src/core/serve.js';

test('gaugeValue triangle', () => {
  expect(gaugeValue(0)).toBe(0);
  expect(gaugeValue(0.6)).toBeCloseTo(1);
  expect(gaugeValue(1.2)).toBeCloseTo(0);
  expect(gaugeValue(0.3)).toBeCloseTo(0.5);
  expect(gaugeValue(1.5)).toBeCloseTo(0.5);
});
test('gaugeZone seuils', () => {
  expect(gaugeZone(0.49)).toBe('green');
  expect(gaugeZone(0.5)).toBe('yellow');
  expect(gaugeZone(0.79)).toBe('yellow');
  expect(gaugeZone(0.8)).toBe('red');
});
test('SERVE', () => expect(SERVE).toEqual({ green: { speed: 9, fault: 0 }, yellow: { speed: 13, fault: 0.08 }, red: { speed: 18, fault: 0.45 } }));
test('vert ne fait jamais faute', () => { const r = createRng(3); for (let i = 0; i < 500; i++) expect(rollServe('green', r).fault).toBeNull(); });
test('rouge fait faute ≈45 %', () => {
  const r = createRng(5); let f = 0;
  for (let i = 0; i < 4000; i++) if (rollServe('red', r).fault) f++;
  expect(f / 4000).toBeGreaterThan(0.40); expect(f / 4000).toBeLessThan(0.50);
});
test('rollServe : fautes net/long et vitesse', () => {
  expect(rollServe('red', () => 0.1)).toEqual({ fault: 'net', speed: 18 });
  const seq = [0.1, 0.9]; let i = 0;
  expect(rollServe('red', () => seq[i++])).toEqual({ fault: 'long', speed: 18 });
  expect(rollServe('yellow', () => 0.5)).toEqual({ fault: null, speed: 13 });
});
test('aimPoint dans le carré', () => {
  for (const [srv, side] of [['A', 'deuce'], ['A', 'ad'], ['B', 'deuce'], ['B', 'ad']]) {
    const b = serviceBox(srv, side);
    for (const s of [0, 1, 2]) {
      const p = aimPoint(b, s, srv);
      expect(p.x).toBeGreaterThanOrEqual(b.xMin); expect(p.x).toBeLessThanOrEqual(b.xMax);
      expect(p.z).toBeGreaterThanOrEqual(b.zMin); expect(p.z).toBeLessThanOrEqual(b.zMax);
    }
  }
});
test('aimPoint valeurs', () => {
  const b = serviceBox('A', 'deuce');
  expect([0, 1, 2].map(s => aimPoint(b, s, 'A'))).toEqual([{ x: -0.5, z: -3.2 }, { x: -1.75, z: -3.2 }, { x: -3, z: -3.2 }]);
  expect(aimPoint(serviceBox('B', 'deuce'), 2, 'B')).toEqual({ x: 3, z: 3.2 });
});
