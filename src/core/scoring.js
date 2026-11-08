// Pure tennis scoring engine (immutable). Formats: 'quick' | 'normal' | 'set'.

const other = (s) => (s === 'A' ? 'B' : 'A');
const LABELS = ['0', '15', '30', '40'];

export function createScore({ format, firstServer }) {
  return {
    format,
    points: { A: 0, B: 0 },
    games: { A: 0, B: 0 },
    tiebreak: false,
    server: firstServer,
    tbFirstServer: null,
    winner: null,
  };
}

function matchWinnerAfterGame(format, games, side, inTiebreak) {
  if (format === 'quick') return side;
  if (format === 'normal') return games[side] >= 3 ? side : null;
  // set
  if (inTiebreak) return side; // tie-break win gives the set 7-6
  const g = games[side];
  const o = games[other(side)];
  return g >= 6 && g - o >= 2 ? side : null;
}

export function awardPoint(score, side) {
  if (score.winner) return { score, events: [] };
  const opp = other(side);
  const points = { ...score.points, [side]: score.points[side] + 1 };
  const events = [];

  const wonGame = score.tiebreak
    ? points[side] >= 7 && points[side] - points[opp] >= 2
    : points[side] >= 4 && points[side] - points[opp] >= 2;

  if (!wonGame) {
    const next = { ...score, points };
    if (score.tiebreak) {
      const n = points.A + points.B;
      const idx = Math.floor((n + 1) / 2) % 2;
      next.server = idx === 0 ? score.tbFirstServer : other(score.tbFirstServer);
    }
    return { score: next, events };
  }

  const games = { ...score.games, [side]: score.games[side] + 1 };
  events.push('game');
  const winner = matchWinnerAfterGame(score.format, games, side, score.tiebreak);
  if (winner) {
    events.push('match');
    return {
      score: { ...score, points: { A: 0, B: 0 }, games, winner },
      events,
    };
  }

  const server = other(score.tiebreak ? score.tbFirstServer : score.server);
  const next = { ...score, points: { A: 0, B: 0 }, games, server };
  if (score.format === 'set' && games.A === 6 && games.B === 6) {
    next.tiebreak = true;
    next.tbFirstServer = server;
    events.push('tiebreak_start');
  }
  return { score: next, events };
}

export function pointLabel(score) {
  const { A, B } = score.points;
  if (score.tiebreak) return { A: String(A), B: String(B) };
  if (A >= 3 && B >= 3) {
    if (A === B) return { A: 'Égalité', B: 'Égalité' };
    return A > B ? { A: 'AV', B: '' } : { A: '', B: 'AV' };
  }
  return { A: LABELS[A], B: LABELS[B] };
}

export function serveSide(score) {
  return (score.points.A + score.points.B) % 2 === 0 ? 'deuce' : 'ad';
}
