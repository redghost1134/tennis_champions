import { createRng } from '../../src/core/rng.js';
test('même graine → même suite', () => {
  const a = createRng(42), b = createRng(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
test('valeurs dans [0,1)', () => {
  const r = createRng(1);
  for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
