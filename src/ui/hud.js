import { pointLabel } from '../core/scoring.js';
import { gaugeColor } from './messages.js';

// Score bar (top left), serve power gauge and aim hint (right), big flashing messages (centre).
const CSS = `
.tc-score { position: absolute; top: max(10px, env(safe-area-inset-top)); left: max(14px, env(safe-area-inset-left));
  background: rgba(28,29,34,.82); border: 3px solid #ffc72c; border-radius: 16px; padding: 6px 10px;
  font: 900 24px/1.25 'Trebuchet MS', sans-serif; color: #fff; display: grid; grid-template-columns: 30px auto 40px 92px; column-gap: 8px; align-items: center; }
.tc-score .g { text-align: center; color: #ffc72c; }
.tc-score .p { text-align: center; background: #1f56c4; border-radius: 8px; padding: 0 6px; }
.tc-score .n { max-width: 34vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-gauge { position: absolute; right: max(170px, calc(env(safe-area-inset-right) + 170px)); bottom: 40px; width: 46px; height: 230px;
  border: 4px solid #1c1d22; border-radius: 14px; overflow: hidden;
  background: linear-gradient(to top, rgba(46,204,64,.35) 0 50%, rgba(255,199,44,.35) 50% 80%, rgba(230,57,70,.35) 80%); }
.tc-gauge i { position: absolute; left: 0; right: 0; bottom: 0; }
.tc-gauge b { position: absolute; left: -2px; right: -2px; height: 3px; background: #1c1d22; }
.tc-aim { position: absolute; right: max(18px, env(safe-area-inset-right)); bottom: 166px; background: rgba(28,29,34,.7); color: #fff;
  border-radius: 40px; padding: 8px 22px; font: 900 34px/1 'Trebuchet MS', sans-serif; }
.tc-flash { position: absolute; left: 50%; top: 36%; transform: translate(-50%, -50%); white-space: nowrap;
  font: 900 min(12vw, 92px)/1 'Trebuchet MS', sans-serif; -webkit-text-stroke: 4px #1c1d22; paint-order: stroke fill;
  text-shadow: 0 6px 0 #1c1d22; animation: tc-pop .9s ease-out both; }
@keyframes tc-pop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0 } 18% { transform: translate(-50%,-50%) scale(1.15); opacity: 1 }
  30% { transform: translate(-50%,-50%) scale(1) } 80% { opacity: 1 } 100% { transform: translate(-50%,-60%) scale(1); opacity: 0 } }
.tc-hide { display: none !important; }
`;

const FLASH_MS = 900;

export function createHud(root) {
  if (!document.getElementById('tc-hud-css')) {
    const st = document.createElement('style');
    st.id = 'tc-hud-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const div = (cls, parent = root) => {
    const d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
  };

  const score = div('tc-score');
  const gauge = div('tc-gauge tc-hide');
  const fill = document.createElement('i');
  gauge.appendChild(fill);
  for (const v of [0.5, 0.8]) {
    const b = document.createElement('b');
    b.style.bottom = `${v * 100}%`;
    gauge.appendChild(b);
  }
  const aim = div('tc-aim tc-hide');
  aim.textContent = '◀ 🎯 ▶';

  let lastScoreKey = '';
  const queue = [];
  let flashing = null;

  function nextFlash() {
    if (flashing || !queue.length) return;
    const { text, color } = queue.shift();
    const f = div('tc-flash');
    f.textContent = text;
    f.style.color = color;
    // keep up when several messages arrive together
    const ms = queue.length ? FLASH_MS * 0.75 : FLASH_MS;
    f.style.animationDuration = `${ms}ms`;
    flashing = setTimeout(() => {
      f.remove();
      flashing = null;
      nextFlash();
    }, ms);
  }

  return {
    destroy() {
      clearTimeout(flashing);
      queue.length = 0;
      root.querySelectorAll('.tc-flash').forEach((n) => n.remove());
      for (const n of [score, gauge, aim]) n.remove();
    },
    setScore(s, names) {
      const lab = pointLabel(s);
      const key = JSON.stringify([s.points, s.games, s.server, s.tiebreak, names]);
      if (key === lastScoreKey) return;
      lastScoreKey = key;
      score.innerHTML = '';
      for (const side of ['A', 'B']) {
        const cells = [s.server === side ? '🎾' : '', names[side], String(s.games[side]), lab[side] || '·'];
        cells.forEach((txt, i) => {
          const c = div(['', 'n', 'g', 'p'][i], score);
          c.textContent = txt;
        });
      }
    },
    showGauge(v) {
      if (v === null || v === undefined) { gauge.classList.add('tc-hide'); return; }
      gauge.classList.remove('tc-hide');
      fill.style.height = `${Math.max(0, Math.min(1, v)) * 100}%`;
      fill.style.background = gaugeColor(v);
    },
    // slot is shown in 3D (blinking target on the court); the HUD only reminds that ◀ ▶ move it
    showAim(slot) {
      aim.classList.toggle('tc-hide', slot === null || slot === undefined);
    },
    flash(text, color = '#ffffff') {
      queue.push({ text, color });
      if (queue.length > 3) queue.splice(0, queue.length - 3);
      nextFlash();
    },
  };
}
