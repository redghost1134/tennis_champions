// Pure data for the screens: gallery cards, match formats, end-of-match outcome.
import { OPPONENTS } from '../core/opponents.js';

export const FORMATS = [
  { id: 'quick', icon: '🎾', label: 'Rapide', hint: '1 jeu' },
  { id: 'normal', icon: '🎾🎾🎾', label: 'Normal', hint: '3 jeux' },
  { id: 'set', icon: '🏆', label: 'Set', hint: '6 jeux' },
];

export const starsFor = (level) => Math.ceil(level / 2);

// Level 0 is the lesson (Cours); champions are levels 1..10, locked above `unlocked`.
export function galleryCards(unlocked) {
  return [
    { level: 0, id: 'lesson', name: 'Cours', locked: false },
    ...OPPONENTS.map((o) => ({ level: o.level, id: o.id, name: o.name, stars: starsFor(o.level), locked: o.level > unlocked })),
  ];
}

export function matchOutcome({ winner, level, unlocked }) {
  const won = winner === 'A';
  return { won, unlocks: won && level === unlocked && level < OPPONENTS.length ? level + 1 : null };
}
