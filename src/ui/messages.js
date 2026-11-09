// Pure mapping from match events to the big HUD messages (French, exact wording from the plan).

export const GAUGE_COLORS = { green: '#2ecc40', yellow: '#ffc72c', red: '#e63946' };
export const gaugeColor = (v) => (v < 0.5 ? GAUGE_COLORS.green : v < 0.8 ? GAUGE_COLORS.yellow : GAUGE_COLORS.red);

const RED = '#e63946', YELLOW = '#ffc72c', WHITE = '#ffffff';

// events: one frame's match events; score: the score after those events; names: { A, B }.
export function messagesFor(events, score, names) {
  const out = [];
  const types = new Set(events.map((e) => e.type));
  for (const e of events) {
    if (e.type === 'fault') out.push({ text: 'FAUTE !', color: RED });
    else if (e.type === 'double_fault') out.push({ text: 'DOUBLE FAUTE !', color: RED });
    else if (e.type === 'out') out.push({ text: 'OUT !', color: RED });
    else if (e.type === 'net') out.push({ text: 'FILET !', color: RED });
    else if (e.type === 'point') {
      const who = names[e.winner];
      if (types.has('game')) {
        out.push({ text: `Jeu ${who} ! 🏆`, color: YELLOW });
        continue;
      }
      out.push({ text: `Point ${who} ! 🎉`, color: WHITE });
      const { A, B } = score.points;
      if (!score.tiebreak && A >= 3 && B >= 3) {
        if (A === B) out.push({ text: 'Égalité', color: WHITE });
        else out.push({ text: `Avantage ${names[A > B ? 'A' : 'B']}`, color: YELLOW });
      }
    } else if (e.type === 'tiebreak_start') out.push({ text: 'Jeu décisif !', color: YELLOW });
  }
  return out;
}
