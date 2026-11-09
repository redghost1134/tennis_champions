import { createInputState } from './input.js';

// Touch + keyboard controls. Left: 4-arrow d-pad (moves only). Right: a matching cross — SMASH top, LOB
// bottom, aim ◀ / ▶ on the sides (armed = highlighted until the next hit) — replaced by SERVICE when serving. Top centre: pause and sound. Multi-touch via Pointer Events.
const CSS = `
.tc-ctl { position: absolute; pointer-events: auto; touch-action: none; -webkit-tap-highlight-color: transparent; }
.tc-btn { display: flex; align-items: center; justify-content: center; border-radius: 22px; border: 4px solid #1c1d22;
  background: rgba(255,255,255,.82); color: #1c1d22; font: 900 34px/1 'Trebuchet MS', sans-serif; box-shadow: 0 5px 0 #1c1d22;
  user-select: none; -webkit-user-select: none; cursor: pointer; transition: transform .06s; }
.tc-btn.down { transform: translateY(4px); box-shadow: 0 1px 0 #1c1d22; }
.tc-btn small { display: block; font-size: 15px; letter-spacing: .5px; margin-top: 2px; }
.tc-pad { left: max(18px, env(safe-area-inset-left)); bottom: max(18px, env(safe-area-inset-bottom));
  display: grid; grid-template: repeat(3, 84px) / repeat(3, 84px); gap: 6px; }
.tc-pad .tc-btn { width: 84px; height: 84px; background: rgba(31,86,196,.85); color: #fff; }
.tc-right { right: max(18px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom)); }
.tc-cross { display: grid; grid-template: repeat(3, 84px) / repeat(3, 84px); gap: 6px; }
.tc-act { width: 84px; height: 84px; font-size: 24px; }
.tc-word { font-size: 21px; letter-spacing: .5px; }
.tc-act.armed { background: #ffc72c; box-shadow: 0 0 0 6px #fff, 0 5px 0 #1c1d22; animation: tc-glow .6s ease-in-out infinite alternate; }
@keyframes tc-glow { to { box-shadow: 0 0 0 10px rgba(255,255,255,.6), 0 5px 0 #1c1d22; } }
.tc-serve { width: 132px; height: 132px; border-radius: 50%; background: #ffc72c; flex-direction: column; font-size: 52px; }
.tc-top { top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); display: flex; gap: 10px; }
.tc-top .tc-btn { width: 64px; height: 64px; font-size: 30px; border-radius: 50%; }
.tc-hide { display: none !important; }
.tc-pause { position: absolute; inset: 0; pointer-events: auto; background: rgba(28,29,34,.55); display: flex;
  align-items: center; justify-content: center; gap: 36px; }
.tc-pause .tc-btn { width: 180px; height: 150px; flex-direction: column; font-size: 64px; }
.tc-pause .tc-btn small { font-size: 22px; }
`;

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

export function createControls(root, { onQuit = () => {}, onClick = () => {}, muted = false, onMute = () => {} } = {}) {
  if (!document.getElementById('tc-ctl-css')) {
    const st = document.createElement('style');
    st.id = 'tc-ctl-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const state = createInputState();
  let mode = 'rally';
  let paused = false;
  let isMuted = muted;

  const el = (cls, html = '', parent = root) => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    parent.appendChild(d);
    return d;
  };

  // hold-style button: pressed while a pointer is down on it
  function holdButton(node, key) {
    const release = (e) => {
      if (e && node.hasPointerCapture?.(e.pointerId)) node.releasePointerCapture(e.pointerId);
      node.classList.remove('down');
      state.set(key, false);
    };
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      node.setPointerCapture?.(e.pointerId);
      node.classList.add('down');
      state.set(key, true);
    });
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);
    node.addEventListener('lostpointercapture', () => release());
  }
  function tapButton(node, fn) {
    node.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      node.classList.add('down');
      onClick();
      fn();
    });
    const up = () => node.classList.remove('down');
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('pointerleave', up);
  }

  // d-pad
  const pad = el('tc-ctl tc-pad');
  const cells = [null, ['up', '▲'], null, ['left', '◀'], null, ['right', '▶'], null, ['down', '▼'], null];
  for (const c of cells) {
    if (!c) { el('', '', pad); continue; }
    holdButton(el('tc-btn', c[1], pad), c[0]);
  }

  // action buttons
  // right cross (rally): SMASH top, aim left / right, LOB bottom; SERVICE replaces it during the serve
  const right = el('tc-ctl tc-right');
  const cross = el('tc-cross', '', right);
  const cell = () => el('', '', cross);
  cell();
  const smash = el('tc-btn tc-act tc-word', 'SMASH', cross);
  cell();
  const aimL = el('tc-btn tc-act', '◀🎾', cross);
  cell();
  const aimR = el('tc-btn tc-act', '🎾▶', cross);
  cell();
  const lob = el('tc-btn tc-act tc-word', 'LOB', cross);
  cell();
  tapButton(aimL, () => { state.toggleAim('left'); sync(); });
  tapButton(aimR, () => { state.toggleAim('right'); sync(); });
  const serve = el('tc-btn tc-serve', '🎾<small>SERVICE</small>', right);
  tapButton(lob, () => { state.toggleArm('lob'); sync(); });
  tapButton(smash, () => { state.toggleArm('smash'); sync(); });
  holdButton(serve, 'serve');

  // top: pause + sound
  const top = el('tc-ctl tc-top');
  const pauseBtn = el('tc-btn', '⏸', top);
  const muteBtn = el('tc-btn', muted ? '🔇' : '🔊', top);
  tapButton(pauseBtn, () => setPaused(true));
  tapButton(muteBtn, () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    onMute(isMuted);
  });

  // pause menu
  const menu = el('tc-pause tc-hide');
  const resume = el('tc-btn', '▶<small>Reprendre</small>', menu);
  const quit = el('tc-btn', '🏠<small>Quitter</small>', menu);
  tapButton(resume, () => setPaused(false));
  tapButton(quit, () => onQuit());

  function setPaused(p) {
    paused = p;
    state.reset();
    menu.classList.toggle('tc-hide', !p);
    sync();
  }

  function sync() {
    const a = state.armed;
    lob.classList.toggle('armed', a === 'lob');
    smash.classList.toggle('armed', a === 'smash');
    aimL.classList.toggle('armed', state.aim === -1);
    aimR.classList.toggle('armed', state.aim === 1);
    const hidden = mode === 'hidden';
    pad.classList.toggle('tc-hide', hidden);
    right.classList.toggle('tc-hide', hidden);
    serve.classList.toggle('tc-hide', mode !== 'serve');
    cross.classList.toggle('tc-hide', mode === 'serve');
  }

  // keyboard (letters read by character so AZERTY and QWERTY both work): Q lob, S smash, G / D aim left / right
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setPaused(!paused); return; }
    if (paused) return;
    if (KEYS[e.key]) { e.preventDefault(); state.set(KEYS[e.key], true); return; }
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) state.set('serve', true); return; }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'q') { state.toggleArm('lob'); sync(); }
    else if (k === 's') { state.toggleArm('smash'); sync(); }
    else if (k === 'g') { state.toggleAim('left'); sync(); }
    else if (k === 'd') { state.toggleAim('right'); sync(); }
  });
  window.addEventListener('keyup', (e) => {
    if (KEYS[e.key]) state.set(KEYS[e.key], false);
    else if (e.code === 'Space') state.set('serve', false);
  });
  window.addEventListener('blur', () => { state.reset(); sync(); });

  sync();
  return {
    read: () => state.read(),
    setMode(m) {
      if (m === mode) return;
      mode = m;
      if (m !== 'serve') state.set('serve', false);
      sync();
    },
    // called by the game on a hit by the human player: the armed shot and aim are used up
    disarm() {
      state.disarm();
      sync();
    },
    get paused() {
      return paused;
    },
  };
}
