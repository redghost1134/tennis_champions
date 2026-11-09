const row = (level, id, name, speed, reaction, aimWide, errorScale, lob, smash, red, yellow) => ({
  id, level, name, ai: { speed, reaction, aimWide, errorScale, lob, smash, red, yellow },
});

export const OPPONENTS = [
  row(1, 'toto', 'Toto la Tortue', 1.6, 0.55, 0, 1.6, 0, 0, 0, 0),
  row(2, 'bobo', "Bobo l'Ourson", 1.9, 0.5, 0.3, 1.5, 0.05, 0, 0, 0.1),
  row(3, 'leo', 'Léo le Lapin', 3.2, 0.35, 0.5, 2.2, 0.05, 0.05, 0.1, 0.3),
  row(4, 'gaston', 'M. Gaston', 2.6, 0.35, 0.5, 1.0, 0.1, 0.1, 0.05, 0.4),
  row(5, 'pingo', 'Pingo le Pingouin', 3.4, 0.25, 0.55, 0.9, 0.1, 0.15, 0.1, 0.5),
  row(6, 'barbe', 'Capitaine Barbe-Bleue', 3.4, 0.22, 0.7, 0.8, 0.3, 0.2, 0.15, 0.5),
  row(7, 'kenta', 'Kenta le Ninja', 4.4, 0.15, 0.7, 0.7, 0.15, 0.3, 0.2, 0.5),
  row(8, 'noe', 'Super Noé', 4.2, 0.15, 0.8, 0.6, 0.15, 0.5, 0.25, 0.5),
  row(9, 'flamme', 'Flamme le Dragon', 4.4, 0.12, 0.85, 0.5, 0.15, 0.4, 0.35, 0.45),
  row(10, 'robomax', 'Robo-Max', 4.8, 0.08, 0.95, 0.35, 0.2, 0.6, 0.4, 0.5),
];
