// Coordinates: side 'A' is z>0 facing -z (right = +x); side 'B' is z<0 facing +z (right = -x). Net at z=0.
export const COURT = { W: 7, L: 18, HALF_W: 3.5, HALF_L: 9, NET_H: 0.84, SERVICE_Z: 5 };

// +1 if the server's right is +x
const rightSign = (server) => (server === 'A' ? 1 : -1);

export function isInCourt(x, z, receivingSide) {
  if (Math.abs(x) > COURT.HALF_W) return false;
  return receivingSide === 'B' ? z >= -COURT.HALF_L && z <= 0 : z >= 0 && z <= COURT.HALF_L;
}

export function serviceBox(server, side) {
  // deuce: serve from the right, target diagonal (opposite x sign)
  const spotSign = rightSign(server) * (side === 'deuce' ? 1 : -1);
  const t = -spotSign;
  const xMin = t < 0 ? -COURT.HALF_W : 0;
  const xMax = t < 0 ? 0 : COURT.HALF_W;
  // server A targets B half (z<0); server B targets A half (z>0)
  return server === 'A' ? { xMin, xMax, zMin: -COURT.SERVICE_Z, zMax: 0 } : { xMin, xMax, zMin: 0, zMax: COURT.SERVICE_Z };
}

export function serverSpot(server, side) {
  const x = 1.2 * rightSign(server) * (side === 'deuce' ? 1 : -1);
  return { x, z: server === 'A' ? 9.4 : -9.4 };
}
