import { createProgress } from '../../src/core/progress.js';

function memStore(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
function expectDefaults(p) {
  expect(p.getProfile()).toBe(null);
  expect(p.unlocked()).toBe(0); // only the lesson (level 0) is open
  expect(p.muted()).toBe(false);
}

test('progress : storage vide → défauts', () => expectDefaults(createProgress(memStore())));

test('progress : JSON corrompu → défauts', () => {
  expectDefaults(createProgress(memStore({ 'tc.v1': '{oops' })));
  expectDefaults(createProgress(memStore({ 'tc.v1': '42' })));
  expectDefaults(createProgress(memStore({ 'tc.v1': 'null' })));
});

test('progress : champs invalides remplacés champ par champ', () => {
  const p = createProgress(memStore({ 'tc.v1': JSON.stringify({ profile: 'bob', unlocked: 99.5, muted: true }) }));
  expect(p.getProfile()).toBe(null);
  expect(p.unlocked()).toBe(0);
  expect(p.muted()).toBe(true);
  const q = createProgress(memStore({ 'tc.v1': JSON.stringify({ profile: 'yazan', unlocked: 50, muted: 'x' }) }));
  expect(q.getProfile()).toBe('yazan');
  expect(q.unlocked()).toBe(10);
  expect(q.muted()).toBe(false);
});

test('progress : storage qui lève une exception → défauts', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const p = createProgress(bad);
  expectDefaults(p);
  expect(() => { p.setProfile('yazan'); p.recordWin(3); p.setMuted(true); }).not.toThrow();
  expect(p.unlocked()).toBe(4);
});

test('progress : localStorage global absent ou qui lève → défauts', () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('denied'); }, configurable: true });
  try {
    expectDefaults(createProgress());
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had);
    else delete globalThis.localStorage;
  }
  expectDefaults(createProgress());
});

test('progress : recordWin(3) débloque 4, recordWin(10) reste 10', () => {
  const p = createProgress(memStore());
  p.recordWin(3);
  expect(p.unlocked()).toBe(4);
  p.recordWin(10);
  expect(p.unlocked()).toBe(10);
});

test('progress : recordWin(1) après unlocked=5 ne régresse pas', () => {
  const p = createProgress(memStore({ 'tc.v1': JSON.stringify({ unlocked: 5 }) }));
  p.recordWin(1);
  expect(p.unlocked()).toBe(5);
});

test('progress : persistance entre instances', () => {
  const s = memStore();
  const p = createProgress(s);
  p.setProfile('ghassan');
  p.setMuted(true);
  p.recordWin(2);
  const q = createProgress(s);
  expect(q.getProfile()).toBe('ghassan');
  expect(q.muted()).toBe(true);
  expect(q.unlocked()).toBe(3);
});

test('progress : réussir le Cours (recordWin(0)) débloque le niveau 1', () => {
  const p = createProgress(memStore());
  expect(p.unlocked()).toBe(0);
  p.recordWin(0);
  expect(p.unlocked()).toBe(1);
});

test('progress : une tablette qui a déjà joué garde ses déblocages', () => {
  const p = createProgress(memStore({ 'tc.v1': JSON.stringify({ profile: 'ghassan', unlocked: 5 }) }));
  expect(p.unlocked()).toBe(5);
  p.recordWin(0);
  expect(p.unlocked()).toBe(5);
});

test('progress : unlocked négatif ramené à 0', () => {
  expect(createProgress(memStore({ 'tc.v1': JSON.stringify({ unlocked: -3 }) })).unlocked()).toBe(0);
});
