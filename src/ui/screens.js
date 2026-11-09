import { galleryCards, FORMATS } from './flow.js';

// Menus for children who cannot read yet: big picture buttons, faces, icons; French text only as a complement.
const CSS = `
.tc-scr { position: absolute; inset: 0; pointer-events: auto; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 22px; padding: max(16px, env(safe-area-inset-top)) 16px 16px; box-sizing: border-box;
  background: linear-gradient(180deg, rgba(31,86,196,.55), rgba(28,29,34,.45)); font-family: 'Trebuchet MS', sans-serif;
  color: #fff; animation: tc-in .25s ease-out; overflow-y: auto; }
@keyframes tc-in { from { opacity: 0; transform: scale(.97) } }
.tc-title { font: 900 min(9vw, 64px)/1 'Trebuchet MS', sans-serif; color: #ffc72c; -webkit-text-stroke: 3px #1c1d22;
  paint-order: stroke fill; text-shadow: 0 5px 0 #1c1d22; text-align: center; }
.tc-row { display: flex; gap: 22px; flex-wrap: wrap; justify-content: center; }
.tc-card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  background: #f7f7f2; color: #1c1d22; border: 5px solid #1c1d22; border-radius: 26px; box-shadow: 0 7px 0 #1c1d22;
  cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; transition: transform .07s; }
.tc-card:active { transform: translateY(5px); box-shadow: 0 2px 0 #1c1d22; }
.tc-card b { font: 900 26px/1.1 'Trebuchet MS', sans-serif; text-align: center; }
.tc-card small { font: 700 17px/1 'Trebuchet MS', sans-serif; color: #555; }
.tc-big { width: min(38vw, 280px); height: min(52vh, 300px); }
.tc-big img { width: 70%; }
.tc-big .tc-ico { font-size: min(14vw, 110px); line-height: 1; }
.tc-yellow { background: #ffc72c; }
.tc-blue { background: #1f56c4; color: #fff; }
.tc-blue small { color: #dfe8ff; }
.tc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; width: min(96vw, 1100px); }
.tc-champ { height: 200px; padding: 6px; }
.tc-champ img { width: 120px; height: 120px; object-fit: contain; }
.tc-champ .tc-ico { font-size: 80px; line-height: 120px; }
.tc-champ b { font-size: 17px; }
.tc-stars { color: #f4a300; font-size: 18px; letter-spacing: 1px; }
.tc-lvl { position: absolute; top: 6px; left: 8px; background: #1f56c4; color: #fff; border-radius: 12px; padding: 2px 8px; font: 900 16px/1.2 'Trebuchet MS'; }
.tc-locked { filter: grayscale(1) brightness(.75); }
.tc-locked::after { content: '🔒'; position: absolute; font-size: 64px; top: 50%; left: 50%; transform: translate(-50%, -60%); filter: none; }
.tc-shake { animation: tc-shake .35s; }
@keyframes tc-shake { 25% { transform: translateX(-8px) } 75% { transform: translateX(8px) } }
.tc-corner { position: absolute; top: max(12px, env(safe-area-inset-top)); display: flex; gap: 12px; }
.tc-corner.l { left: max(14px, env(safe-area-inset-left)); }
.tc-corner.r { right: max(14px, env(safe-area-inset-right)); }
.tc-round { width: 72px; height: 72px; border-radius: 50%; font-size: 34px; overflow: hidden; }
.tc-round img { width: 100%; height: 100%; object-fit: cover; }
.tc-fmt { width: min(28vw, 220px); height: min(44vh, 230px); }
.tc-fmt .tc-ico { font-size: min(6vw, 48px); white-space: nowrap; }
.tc-vs { display: flex; align-items: center; gap: 14px; font: 900 30px 'Trebuchet MS'; }
.tc-vs img { width: 110px; height: 110px; background: rgba(255,255,255,.85); border-radius: 50%; border: 4px solid #1c1d22; }
.tc-score-big { font: 900 min(10vw, 76px)/1 'Trebuchet MS'; letter-spacing: 6px; }
.tc-unlock { display: flex; align-items: center; gap: 16px; background: #ffc72c; color: #1c1d22; border: 5px solid #1c1d22;
  border-radius: 24px; padding: 10px 22px; font: 900 26px 'Trebuchet MS'; animation: tc-unl 1s ease-out both .5s; }
.tc-unlock img { width: 96px; height: 96px; }
@keyframes tc-unl { 0% { transform: scale(0) rotate(-12deg) } 70% { transform: scale(1.12) rotate(3deg) } 100% { transform: scale(1) } }
.tc-act2 { width: min(30vw, 210px); height: 120px; }
.tc-act2 .tc-ico { font-size: 54px; }
`;

export function createScreens(root, deps) {
  if (!document.getElementById('tc-scr-css')) {
    const st = document.createElement('style');
    st.id = 'tc-scr-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const { portrait, click = () => {} } = deps;
  let cur = null;

  const h = (tag, cls, html, parent) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  };
  const tap = (node, fn) => node.addEventListener('pointerup', (e) => { e.preventDefault(); click(); fn(); });
  const card = (parent, cls, inner, fn) => {
    const c = h('div', `tc-card ${cls}`, inner, parent);
    if (fn) tap(c, () => fn(c));
    return c;
  };
  const img = (id) => `<img alt="" src="${portrait(id)}">`;
  const back = (scr, fn) => card(h('div', 'tc-corner l', '', scr), 'tc-round', '⬅', fn);

  const SCREENS = {
    profile(scr) {
      h('div', 'tc-title', 'Qui joue ?', scr);
      const row = h('div', 'tc-row', '', scr);
      for (const [id, name] of [['yazan', 'Yazan'], ['ghassan', 'Ghassan']]) {
        card(row, 'tc-big', `${img(id)}<b>${name}</b>`, () => deps.onProfile(id));
      }
    },
    menu(scr, d) {
      const tl = h('div', 'tc-corner l', '', scr);
      card(tl, 'tc-round', img(d.profile), () => deps.onChangeProfile());
      const tr = h('div', 'tc-corner r', '', scr);
      const mute = card(tr, 'tc-round', d.muted ? '🔇' : '🔊', () => {
        const m = deps.onToggleMute();
        mute.innerHTML = m ? '🔇' : '🔊';
      });
      h('div', 'tc-title', 'Tennis Champions', scr);
      const row = h('div', 'tc-row', '', scr);
      card(row, 'tc-big tc-yellow', '<div class="tc-ico">🏆</div><b>Défier un champion</b>', () => deps.onChallenge());
      card(row, 'tc-big tc-blue', '<div class="tc-ico">🎓</div><b>Cours</b><small>Apprendre à jouer</small>', () => deps.onLesson());
    },
    gallery(scr, d) {
      back(scr, () => deps.onBack('gallery'));
      h('div', 'tc-title', 'Champions', scr);
      const grid = h('div', 'tc-grid', '', scr);
      for (const c of galleryCards(d.unlocked)) {
        const face = c.level === 0
          ? `${d.lessonPortrait ? img(d.lessonPortrait) : '<div class="tc-ico">🎓</div>'}<b>Cours</b><small>${d.lessonDone ? '✅' : '👉'}</small>`
          : `${img(c.id)}<b>${c.name}</b><span class="tc-stars">${'★'.repeat(c.stars)}</span>`;
        const node = card(grid, `tc-champ ${c.level === 0 ? 'tc-blue' : ''} ${c.locked ? 'tc-locked' : ''}`, `<span class="tc-lvl">${c.level}</span>${face}`, (n) => {
          if (c.locked) {
            n.classList.remove('tc-shake');
            void n.offsetWidth;
            n.classList.add('tc-shake');
            return;
          }
          if (c.level === 0) deps.onLesson();
          else deps.onPickLevel(c.level);
        });
        void node;
      }
    },
    format(scr, d) {
      back(scr, () => deps.onBack('format'));
      h('div', 'tc-vs', `${img(d.profile)}<span>contre</span>${img(d.oppId)}`, scr);
      const row = h('div', 'tc-row', '', scr);
      for (const f of FORMATS) {
        card(row, 'tc-fmt', `<div class="tc-ico">${f.icon}</div><b>${f.label}</b><small>${f.hint}</small>`, () => deps.onPickFormat(f.id));
      }
    },
    end(scr, d) {
      scr.style.background = 'linear-gradient(180deg, rgba(31,86,196,.35), rgba(28,29,34,.25))';
      h('div', 'tc-title', d.won ? `${d.names.A} gagne ! 🏆` : `${d.names.B} gagne !`, scr);
      h('div', 'tc-vs', `${img(d.profile)}<span class="tc-score-big">${d.score.games.A} – ${d.score.games.B}</span>${img(d.oppId)}`, scr);
      if (d.unlocks) h('div', 'tc-unlock', `${img(d.unlocks.id)}<span>Nouveau champion débloqué !<br>${d.unlocks.name}</span>`, scr);
      const row = h('div', 'tc-row', '', scr);
      card(row, 'tc-act2 tc-yellow', '<div class="tc-ico">🔁</div><b>Rejouer</b>', () => deps.onReplay());
      card(row, 'tc-act2', '<div class="tc-ico">🏠</div><b>Menu</b>', () => deps.onMenu());
    },
  };

  return {
    show(name, data = {}) {
      cur?.remove();
      cur = h('div', 'tc-scr', '', root);
      SCREENS[name](cur, data);
    },
    hide() {
      cur?.remove();
      cur = null;
    },
  };
}
