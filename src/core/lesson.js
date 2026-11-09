// The lesson (level 0): ten hands-on steps with coach Roger. Pure logic: the runner feeds it each frame's
// match events, the match state and the human input; it answers 'stay' | 'next' | 'retry' | 'done'.
// `setup` tells the runner how to (re)build the match for a step: who serves and which ball the coach feeds.
// Lines are short encouragements written for the game (never real quotes).

const NEAR = 0.6;
const MAX_LOST_POINTS = 3;

export const LESSON_STEPS = [
  {
    id: 'move', highlight: 'pad', setup: { server: 'B' },
    line: 'Salut ! Je suis Roger. Utilise les flèches pour aller sur le rond jaune !',
    targets: [{ x: -2.5, z: 7 }, { x: 2.5, z: 7 }, { x: 0, z: 3.5 }],
  },
  {
    id: 'serve_green', highlight: 'serve', setup: { server: 'A' },
    line: 'À toi de servir ! Appuie sur SERVICE pour lancer la balle, puis encore quand la barre est verte.',
  },
  {
    id: 'serve_red', highlight: 'serve', setup: { server: 'A' },
    line: 'Maintenant, essaie quand la barre est rouge : c’est très fort, mais ça rate souvent !',
  },
  {
    id: 'serve_aim', highlight: 'aimSlot', setup: { server: 'A' },
    line: 'Avant de servir, change la cible avec les flèches gauche et droite.',
  },
  {
    id: 'return', highlight: 'pad', setup: { server: 'B', feed: 'normal' },
    line: 'Je t’envoie la balle. Place-toi devant elle : ta raquette frappe toute seule !',
  },
  {
    id: 'aim_left', highlight: 'aimL', setup: { server: 'B', feed: 'normal' },
    line: 'Appuie sur la flèche avec la balle à gauche, puis renvoie : la balle partira à gauche.',
  },
  {
    id: 'aim_right', highlight: 'aimR', setup: { server: 'B', feed: 'normal' },
    line: 'Et maintenant, vise à droite !',
  },
  {
    id: 'lob', highlight: 'lob', setup: { server: 'B', feed: 'normal' },
    line: 'Appuie sur LOB, puis renvoie la balle : elle va passer très haut !',
  },
  {
    id: 'smash', highlight: 'smash', setup: { server: 'B', feed: 'high' },
    line: 'Une balle haute arrive ! Appuie sur SMASH et tape fort !',
  },
  {
    id: 'point', highlight: null, setup: { server: 'A', match: true },
    line: 'Bravo, tu sais tout ! On joue un vrai point ensemble ?',
  },
];

const RETRY = {
  move: 'Encore un peu !',
  serve_green: 'Presque ! Attends que la barre soit verte.',
  serve_red: 'Attends que la barre soit rouge !',
  serve_aim: 'Change d’abord la cible avec les flèches !',
  return: 'Pas grave, on recommence !',
  aim_left: 'Appuie d’abord sur la flèche gauche à côté de LOB !',
  aim_right: 'Appuie d’abord sur la flèche droite à côté de LOB !',
  lob: 'Appuie d’abord sur LOB !',
  smash: 'Appuie d’abord sur SMASH !',
  point: 'Pas grave, on en refait un !',
};
const CHEERS = ['Bravo !', 'Bravo, super !', 'Bravo, génial !', 'Bravo, bien joué !'];

export function createLesson() {
  let i = 0;
  let s = {}; // per-step scratch
  const api = {
    message: '',
    done: false,
    get step() {
      return LESSON_STEPS[i];
    },
    get index() {
      return i;
    },
    // current ground target of the 'move' step, else null
    get target() {
      const st = LESSON_STEPS[i];
      return st.targets ? st.targets[s.t ?? 0] ?? null : null;
    },
    // test helper / "skip" button: jump to the next step
    skip() {
      advance();
    },
    // the runner rebuilt the match after a 'retry': reset what one attempt tracks
    restart() {
      const lost = s.lost;
      s = { lost };
    },
    onFrame(events, state, input) {
      const st = LESSON_STEPS[i];
      const ev = (type, side) => events.find((e) => e.type === type && (side === undefined || e.side === side));
      const hitA = ev('hit', 'A');
      const pointWithoutHit = ev('point') && !hitA;

      switch (st.id) {
        case 'move': {
          const t = st.targets[s.t ?? 0];
          const a = state.players.A;
          if (Math.hypot(a.x - t.x, a.z - t.z) < NEAR) {
            s.t = (s.t ?? 0) + 1;
            if (s.t >= st.targets.length) return advance();
            api.message = CHEERS[s.t % CHEERS.length];
          }
          return 'stay';
        }
        case 'serve_green': {
          const sv = ev('serve', 'A');
          if (sv) {
            if (sv.zone !== 'green') return retry();
            s.served = true;
            return 'stay';
          }
          if (ev('fault') || ev('double_fault')) return retry();
          if (s.served && ev('bounce')) return advance();
          return 'stay';
        }
        case 'serve_red': {
          const sv = ev('serve', 'A');
          if (sv) return sv.zone === 'red' ? advance() : retry();
          return 'stay';
        }
        case 'serve_aim': {
          if (s.slot0 === undefined) s.slot0 = 1;
          if (state.aimSlot !== s.slot0 && state.phase === 'serve_aim') s.moved = true;
          const sv = ev('serve', 'A');
          if (sv) {
            if (!s.moved && state.aimSlot === s.slot0) return retry();
            s.moved = true;
            s.served = true;
            return 'stay';
          }
          if (ev('fault') || ev('double_fault')) return retry();
          if (s.served && ev('bounce')) return advance();
          return 'stay';
        }
        case 'return':
          if (hitA) return hitA.outcome === 'in' ? advance() : retry();
          return pointWithoutHit ? retry() : 'stay';
        case 'aim_left':
        case 'aim_right': {
          const want = st.id === 'aim_left' ? -1 : 1;
          if (hitA) return input.aimDir === want ? advance() : retry();
          return pointWithoutHit ? retry() : 'stay';
        }
        case 'lob':
        case 'smash':
          if (hitA) return hitA.kind === st.id ? advance() : retry();
          return pointWithoutHit ? retry() : 'stay';
        case 'point': {
          const p = ev('point');
          if (!p) return 'stay';
          if (p.winner === 'A') return finish('Bravo, champion ! Tu as gagné le point !');
          s.lost = (s.lost ?? 0) + 1;
          if (s.lost >= MAX_LOST_POINTS) return finish('Bien joué ! Tu es prêt pour les champions !');
          return retry();
        }
        default:
          return 'stay';
      }
    },
  };

  function advance() {
    if (i >= LESSON_STEPS.length - 1) return finish('Bravo !');
    i++;
    s = {};
    api.message = CHEERS[i % CHEERS.length];
    return 'next';
  }
  function retry() {
    api.message = RETRY[LESSON_STEPS[i].id];
    return 'retry';
  }
  function finish(msg) {
    api.done = true;
    api.message = msg;
    return 'done';
  }
  return api;
}
