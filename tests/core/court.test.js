import { COURT, isInCourt, serviceBox, serverSpot } from '../../src/core/court.js';

test('constants', () => expect(COURT).toEqual({ W: 7, L: 18, HALF_W: 3.5, HALF_L: 9, NET_H: 0.84, SERVICE_Z: 5 }));
test('serviceBox A deuce', () => expect(serviceBox('A', 'deuce')).toEqual({ xMin: -3.5, xMax: 0, zMin: -5, zMax: 0 }));
test('serviceBox A ad', () => expect(serviceBox('A', 'ad')).toEqual({ xMin: 0, xMax: 3.5, zMin: -5, zMax: 0 }));
test('serviceBox B deuce', () => expect(serviceBox('B', 'deuce')).toEqual({ xMin: 0, xMax: 3.5, zMin: 0, zMax: 5 }));
test('serviceBox B ad', () => expect(serviceBox('B', 'ad')).toEqual({ xMin: -3.5, xMax: 0, zMin: 0, zMax: 5 }));
test('isInCourt : ligne = dedans', () => {
  expect(isInCourt(3.5, -9, 'B')).toBe(true);
  expect(isInCourt(3.51, -4, 'B')).toBe(false);
  expect(isInCourt(0, 2, 'B')).toBe(false);
});
test('isInCourt : côté A, filet et fond', () => {
  expect(isInCourt(0, 0, 'A')).toBe(true);
  expect(isInCourt(-3.5, 9, 'A')).toBe(true);
  expect(isInCourt(0, 9.01, 'A')).toBe(false);
  expect(isInCourt(0, -1, 'A')).toBe(false);
});
test('serverSpot', () => {
  expect(serverSpot('A', 'deuce')).toEqual({ x: 1.2, z: 9.4 });
  expect(serverSpot('A', 'ad')).toEqual({ x: -1.2, z: 9.4 });
  expect(serverSpot('B', 'deuce')).toEqual({ x: -1.2, z: -9.4 });
  expect(serverSpot('B', 'ad')).toEqual({ x: 1.2, z: -9.4 });
});
