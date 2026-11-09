import { createQualityGovernor } from '../../src/core/quality.js';

// feeds `seconds` of frames at `fps`; returns every level change
function run(g, fps, seconds) {
  const changes = [];
  for (let t = 0; t < seconds; t += 1 / fps) {
    const c = g.tick(1 / fps);
    if (c) changes.push(c);
  }
  return changes;
}

test('démarre au niveau demandé', () => {
  expect(createQualityGovernor({ start: 'medium' }).level).toBe('medium');
});

test('fluide à 60 i/s en medium : monte en high après 10 s, jamais au-dessus', () => {
  const g = createQualityGovernor({ start: 'medium' });
  expect(run(g, 60, 9)).toEqual([]);
  expect(run(g, 60, 2)).toEqual(['high']);
  expect(run(g, 60, 30)).toEqual([]);
  expect(g.level).toBe('high');
});

test('moyenne < 45 i/s sur 3 s : descend d’un niveau, puis encore si ça rame toujours', () => {
  const g = createQualityGovernor({ start: 'high' });
  expect(run(g, 30, 2.5)).toEqual([]);
  expect(run(g, 30, 1)).toEqual(['medium']);
  expect(run(g, 30, 3.5)).toEqual(['low']);
  expect(run(g, 30, 10)).toEqual([]); // never below low
});

test('entre 45 et 58 i/s : on ne bouge pas', () => {
  const g = createQualityGovernor({ start: 'medium' });
  expect(run(g, 50, 30)).toEqual([]);
});

test('après une descente, il faut 10 s fluides pour remonter (pas de yo-yo)', () => {
  const g = createQualityGovernor({ start: 'medium' });
  run(g, 30, 3.5);
  expect(g.level).toBe('low');
  expect(run(g, 60, 9)).toEqual([]);
  // the 3 s average still holds the slow frames for a moment, then 10 s above 58 fps are needed
  expect(run(g, 60, 5)).toEqual(['medium']);
});

test('les premières secondes (chargement) sont ignorées', () => {
  const g = createQualityGovernor({ start: 'medium', warmup: 2 });
  expect(run(g, 10, 2)).toEqual([]);
  expect(g.level).toBe('medium');
});

test('une image énorme (onglet en arrière-plan) ou dt invalide est ignorée', () => {
  const g = createQualityGovernor({ start: 'medium' });
  run(g, 60, 1);
  expect(g.tick(5)).toBe(null);
  expect(g.tick(0)).toBe(null);
  expect(g.tick(NaN)).toBe(null);
  expect(run(g, 60, 3)).toEqual([]);
  expect(g.level).toBe('medium');
});
