import { galleryCards, matchOutcome, FORMATS, starsFor } from '../../src/ui/flow.js';

test('galerie : carte Cours (niveau 0) puis les 10 champions dans l’ordre', () => {
  const cards = galleryCards(1);
  expect(cards).toHaveLength(11);
  expect(cards[0]).toMatchObject({ level: 0, id: 'lesson', locked: false });
  expect(cards.slice(1).map((c) => c.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(cards[1]).toMatchObject({ id: 'toto', name: 'Toto la Tortue' });
});

test('galerie : verrouillé au-delà du niveau débloqué', () => {
  const cards = galleryCards(3);
  expect(cards.filter((c) => !c.locked).map((c) => c.level)).toEqual([0, 1, 2, 3]);
  expect(galleryCards(0).filter((c) => !c.locked).map((c) => c.level)).toEqual([0]);
  expect(galleryCards(10).every((c) => !c.locked)).toBe(true);
});

test('étoiles de difficulté : 1 à 5', () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(starsFor)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

test('fin de match : victoire contre le dernier niveau débloqué → débloque le suivant', () => {
  expect(matchOutcome({ winner: 'A', level: 3, unlocked: 3 })).toEqual({ won: true, unlocks: 4 });
});

test('fin de match : victoire contre un niveau déjà battu → rien de nouveau', () => {
  expect(matchOutcome({ winner: 'A', level: 2, unlocked: 5 })).toEqual({ won: true, unlocks: null });
});

test('fin de match : défaite → rien', () => {
  expect(matchOutcome({ winner: 'B', level: 3, unlocked: 3 })).toEqual({ won: false, unlocks: null });
});

test('fin de match : battre Robo-Max (10) ne débloque rien de plus', () => {
  expect(matchOutcome({ winner: 'A', level: 10, unlocked: 10 })).toEqual({ won: true, unlocks: null });
});

test('durées : rapide, normal, set', () => {
  expect(FORMATS.map((f) => f.id)).toEqual(['quick', 'normal', 'set']);
});
