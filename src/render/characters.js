import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Shared biped rig (ported from the art-direction mockup) + per-character heads/accessories.
// Characters face -z (back number at +z). Rig lives in group.userData.

const lerp = (a, b, f) => a + (b - a) * f;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fin = (v) => (Number.isFinite(v) ? v : 0);
const ss = (x) => x * x * (3 - 2 * x);
const PI = Math.PI;

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const hashId = (id) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

// ---------- presets
// shared fields: skin, shirt, trim, shorts, arm (sleeve/limb), hand, leg, sock, shoe, hair {style,c1,c2},
// brow, cheeks, ears (human ears), nose, eyeZ, mouthY/mouthZ, mouthColor, number, scale, trail, fx, extras(b)
const HUMAN = '#f6cfae';
export const PRESETS = {
  yazan: {
    name: 'Yazan', skin: HUMAN, shirt: '#06d6a0', trim: '#1f56c4', shorts: '#1c1d22',
    hair: { style: 'short', c1: '#4a2f1b', c2: '#5c3a22' }, number: '7', scale: 1.3, trail: '#c9fff0', fx: null,
  },
  ghassan: {
    name: 'Ghassan', skin: HUMAN, shirt: '#ff5d8f', trim: '#ffc72c', shorts: '#1f56c4',
    hair: { style: 'curly', c1: '#8b5a2b', c2: '#a06a35' }, number: '4', scale: 1.05, trail: '#ffd1e0', fx: null,
  },
  toto: {
    name: 'Toto la Tortue', skin: '#a7c957', shirt: '#e9d8a6', trim: '#6a994e', shorts: '#386641',
    sock: '#a7c957', shoe: '#6a994e', brow: '#386641', ears: false, nose: false, headScale: [1, 0.95, 1.1],
    scale: 1.0, trail: '#b5e48c', fx: null, extras: buildToto,
  },
  bobo: {
    name: "Bobo l'Ourson", skin: '#b08968', shirt: '#e76f51', trim: '#ffc72c', shorts: '#1f56c4',
    sock: '#b08968', shoe: '#9c6644', brow: '#6b4226', ears: false, nose: false, cheeks: false,
    mouthY: -0.12, mouthZ: -0.29, scale: 1.25, trail: '#ffd6a5', fx: null, extras: buildBobo,
  },
  leo: {
    name: 'Léo le Lapin', skin: '#ffffff', shirt: '#4cc9f0', trim: '#ffffff', shorts: '#1f56c4',
    sock: '#ffffff', shoe: '#1f56c4', brow: '#d8d8e0', ears: false, nose: false,
    scale: 1.0, trail: '#bde0fe', fx: null, extras: buildLeo,
  },
  gaston: {
    name: 'M. Gaston', skin: HUMAN, shirt: '#1f56c4', trim: '#15408f', shorts: '#1f56c4', leg: '#1f56c4',
    sock: '#1c1d22', shoe: '#1c1d22', brow: '#8a8a8a', mouthY: -0.115,
    scale: 1.45, trail: '#ffffff', fx: null, extras: buildGaston,
  },
  pingo: {
    name: 'Pingo le Pingouin', skin: '#1c1d22', shirt: '#1c1d22', trim: '#1c1d22', shorts: '#1c1d22',
    leg: '#ffb300', sock: '#ffb300', shoe: '#ffb300', brow: null, ears: false, nose: false,
    mouthY: -0.125, mouthZ: -0.2, scale: 0.95, trail: '#caf0f8', fx: null, extras: buildPingo,
  },
  barbe: {
    name: 'Capitaine Barbe-Bleue', skin: '#d9a066', shirt: '#f7f7f2', trim: '#1f56c4', shorts: '#1c1d22',
    hair: { style: 'short', c1: '#1f3a8a', c2: '#1f56c4' }, brow: '#1f3a8a', cheeks: false,
    scale: 1.4, trail: '#ffe066', fx: null, extras: buildBarbe,
  },
  kenta: {
    name: 'Kenta le Ninja', skin: '#1c1d22', hand: HUMAN, arm: '#1c1d22', shirt: '#1c1d22', trim: '#e63946',
    shorts: '#1c1d22', leg: '#1c1d22', sock: '#1c1d22', shoe: '#2a2b33', brow: '#1c1d22', ears: false,
    nose: false, cheeks: false, eyeZ: -0.208, mouthColor: '#2a2b33', scale: 1.15, trail: '#e63946', fx: 'smoke',
    extras: buildKenta,
  },
  noe: {
    name: 'Super Noé', skin: '#c68863', shirt: '#1f56c4', trim: '#ffc72c', shorts: '#e63946',
    hair: { style: 'short', c1: '#2b1a10', c2: '#3d2616' }, eyeZ: -0.21, cheeks: false,
    scale: 1.15, trail: '#ffd60a', fx: 'stars', extras: buildNoe,
  },
  flamme: {
    name: 'Flamme le Dragon', skin: '#06a77d', shirt: '#06a77d', trim: '#ffb300', shorts: '#e85d04',
    sock: '#06a77d', shoe: '#04694f', brow: '#04694f', ears: false, nose: false, cheeks: false,
    mouthY: -0.135, mouthZ: -0.3, scale: 1.15, trail: '#ff6b1a', fx: 'fire', extras: buildFlamme,
  },
  robomax: {
    name: 'Robo-Max', skin: '#9aa3ad', hand: '#6c757d', shirt: '#6c757d', trim: '#1f56c4', shorts: '#5a636d',
    leg: '#9aa3ad', sock: '#1f56c4', shoe: '#1f56c4', brow: null, ears: false, nose: false, cheeks: false,
    head: 'box', eyes: 'robot', mouthColor: '#1c1d22', scale: 1.35, trail: '#4cc9ff', fx: 'glow',
    extras: buildRobomax,
  },
};

// ---------- material cache per ctx (ctx.toon makes a new material per call)
const caches = new WeakMap();
function matFor(ctx) {
  let c = caches.get(ctx);
  if (!c) { c = new Map(); caches.set(ctx, c); }
  return (color) => {
    let m = c.get(color);
    if (!m) { m = ctx.toon(color); c.set(color, m); }
    return m;
  };
}
const basicCache = new Map();
const basic = (color) => {
  if (!basicCache.has(color)) basicCache.set(color, new THREE.MeshBasicMaterial({ color }));
  return basicCache.get(color);
};

let stringsTex = null;
function getStringsTex() {
  if (stringsTex) return stringsTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.strokeStyle = 'rgba(255,255,255,.95)';
  c.lineWidth = 3;
  for (let i = 6; i < 128; i += 13) {
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.stroke();
    c.beginPath(); c.moveTo(0, i); c.lineTo(128, i); c.stroke();
  }
  stringsTex = new THREE.CanvasTexture(cv);
  return stringsTex;
}

// ---------- rig
export function makeCharacter(ctx, presetId) {
  const o = PRESETS[presetId];
  if (!o) throw new Error(`unknown character preset: ${presetId}`);
  const toon = matFor(ctx);
  const rnd0 = seeded(hashId(presetId));
  const rnd = (a, b) => a + rnd0() * (b - a);
  const mesh = (geo, mat, x, y, z, parent, opts = {}) => ctx.mesh(geo, mat, x, y, z, parent, opts);

  const char = new THREE.Group();
  const root = new THREE.Group();
  const body = new THREE.Group();
  char.add(root);
  root.add(body);
  const skin = toon(o.skin), shirt = toon(o.shirt), trim = toon(o.trim), shorts = toon(o.shorts);
  const arm = toon(o.arm ?? o.skin), hand = toon(o.hand ?? o.arm ?? o.skin), legM = toon(o.leg ?? o.skin);
  const sock = toon(o.sock ?? '#ffffff'), shoe = toon(o.shoe ?? '#ffffff');
  const hairC1 = o.hair?.c1 ?? o.skin, hairC2 = o.hair?.c2 ?? hairC1;
  const hairM = toon(hairC1), hairM2 = toon(hairC2);

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.09, 0.47, 0);
    body.add(hip);
    mesh(new THREE.CapsuleGeometry(0.068, 0.2, 4, 12), legM, 0, -0.17, 0, hip, { ol: 1.1 });
    mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.08, 12), sock, 0, -0.32, 0, hip, { cast: false });
    const sh = mesh(new THREE.CapsuleGeometry(0.072, 0.12, 4, 12), shoe, 0, -0.41, -0.045, hip, { ol: 1.12 });
    sh.rotation.x = PI / 2;
    sh.scale.set(1, 1, 0.72);
    mesh(new THREE.BoxGeometry(0.14, 0.035, 0.26), trim, 0, -0.465, -0.045, hip, { cast: false });
    legs.push(hip);
  }
  mesh(new THREE.CylinderGeometry(0.185, 0.205, 0.2, 20), shorts, 0, 0.5, 0, body, { ol: 1.06 });
  const torso = mesh(new THREE.CapsuleGeometry(0.18, 0.2, 8, 20), shirt, 0, 0.74, 0, body, { ol: 1.06 });
  torso.scale.z = 0.84;
  const col = mesh(new THREE.TorusGeometry(0.095, 0.028, 8, 20), trim, 0, 0.94, 0, body, { cast: false });
  col.rotation.x = PI / 2;
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.02, 0.3, 0.14), trim, s * 0.181, 0.72, 0, body, { cast: false });
  if (o.number) {
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({ map: ctx.textTex(o.number, { fg: '#fff', stroke: '#1c1d22', w: 256, h: 256, font: 0.8 }), transparent: true }),
    );
    back.position.set(0, 0.74, 0.156);
    body.add(back);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.23, 0.88, 0);
    body.add(sh);
    mesh(new THREE.SphereGeometry(0.075, 12, 10), shirt, 0, -0.03, 0, sh, { ol: 1.08 });
    mesh(new THREE.CapsuleGeometry(0.046, 0.2, 4, 10), arm, 0, -0.19, 0, sh, { ol: 1.1 });
    mesh(new THREE.SphereGeometry(0.058, 12, 10), hand, 0, -0.35, 0, sh, { ol: 1.1 });
    arms.push(sh);
  }
  const racket = new THREE.Group();
  racket.position.set(0, -0.36, 0);
  arms[1].add(racket);
  mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.16, 10), toon('#1c1d22'), 0, -0.06, 0, racket);
  mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 8), trim, 0, -0.19, 0, racket, { cast: false });
  const frame = mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 28), trim, 0, -0.38, 0, racket, { ol: 1.12 });
  frame.scale.set(0.82, 1.1, 1);
  const str = new THREE.Mesh(
    new THREE.CircleGeometry(0.135, 28),
    new THREE.MeshBasicMaterial({ map: getStringsTex(), transparent: true, side: THREE.DoubleSide }),
  );
  str.position.set(0, -0.38, 0);
  str.scale.set(0.82, 1.1, 1);
  racket.add(str);
  racket.rotation.x = -0.3;

  // head
  const head = new THREE.Group();
  head.position.y = 1.16;
  body.add(head);
  if (o.head === 'box') {
    mesh(new THREE.BoxGeometry(0.46, 0.4, 0.42), skin, 0, 0, 0, head, { ol: 1.045 });
  } else {
    const hs = o.headScale ?? [1, 0.97, 1];
    mesh(new THREE.SphereGeometry(0.235, 28, 22), skin, 0, 0, 0, head, { ol: 1.045 }).scale.set(...hs);
  }
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.01, o.eyeZ ?? -0.2);
  head.add(eyes);
  for (const s of [-1, 1]) {
    if (o.eyes === 'robot') {
      const e = new THREE.Mesh(new THREE.CircleGeometry(0.048, 20), basic('#7fdbff'));
      e.position.set(s * 0.085, 0, -0.04);
      e.rotation.y = PI;
      eyes.add(e);
    } else {
      mesh(new THREE.SphereGeometry(0.046, 14, 12), basic('#ffffff'), s * 0.085, 0, 0, eyes, { cast: false }).scale.set(1, 1.18, 0.55);
      mesh(new THREE.SphereGeometry(0.031, 14, 12), toon(o.eyeColor ?? '#5a3a1e'), s * 0.085, -0.004, -0.02, eyes, { cast: false }).scale.z = 0.6;
      mesh(new THREE.SphereGeometry(0.017, 10, 8), basic('#111111'), s * 0.085, -0.004, -0.033, eyes, { cast: false });
      mesh(new THREE.SphereGeometry(0.01, 8, 6), basic('#ffffff'), s * 0.085 + 0.013, 0.014, -0.04, eyes, { cast: false });
    }
    if (o.ears !== false) mesh(new THREE.SphereGeometry(0.045, 14, 12), skin, s * 0.229, -0.01, 0, head, { cast: false });
    const brow = o.brow === undefined ? hairC1 : o.brow;
    if (brow) mesh(new THREE.BoxGeometry(0.075, 0.016, 0.02), toon(brow), s * 0.085, 0.085, -0.215, head, { cast: false }).rotation.z = -s * 0.18;
    if (o.cheeks !== false) {
      const ck = new THREE.Mesh(new THREE.CircleGeometry(0.036, 14), new THREE.MeshBasicMaterial({ color: '#ff8fa0', transparent: true, opacity: 0.6 }));
      ck.position.set(s * 0.135, -0.065, -0.188);
      ck.rotation.y = PI + s * 0.62;
      head.add(ck);
    }
  }
  if (o.nose !== false) mesh(new THREE.SphereGeometry(0.026, 10, 8), skin, 0, -0.035, -0.232, head, { cast: false });
  const my = o.mouthY ?? -0.085, mz = o.mouthZ ?? -0.217;
  let smile, mouth;
  if (o.eyes === 'robot') {
    smile = mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), toon('#1c1d22'), 0, -0.115, -0.215, head, { cast: false });
    mouth = mesh(new THREE.BoxGeometry(0.16, 0.075, 0.02), basic('#7fdbff'), 0, -0.115, -0.216, head, { cast: false });
  } else {
    smile = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16, PI), toon(o.mouthColor ?? '#8b2a2a'), 0, my, mz, head, { cast: false });
    smile.rotation.z = PI;
    mouth = mesh(new THREE.SphereGeometry(0.045, 14, 10), toon(o.mouthColor ?? '#7a1f1f'), 0, my - 0.013, mz + 0.007, head, { cast: false });
    mouth.scale.set(1, 0.75, 0.4);
  }
  mouth.visible = false;

  const style = o.hair?.style ?? 'none';
  if (style === 'short') {
    const cap = mesh(new THREE.SphereGeometry(0.25, 28, 16, 0, PI * 2, 0, PI * 0.5), hairM, 0, 0.02, 0.015, head, { ol: 1.03 });
    cap.rotation.x = -0.32;
    for (let i = 0; i < 6; i++) {
      const f = mesh(new THREE.SphereGeometry(0.06, 10, 8), i % 2 ? hairM : hairM2, -0.13 + i * 0.052, 0.16 - Math.abs(i - 2.5) * 0.008, -0.17, head, { cast: false });
      f.scale.set(1, 0.55, 0.8);
    }
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.09, 12, 10), hairM, s * 0.2, 0.06, 0.04, head).scale.set(0.45, 0.9, 1.1);
    mesh(new THREE.SphereGeometry(0.15, 14, 10), hairM, 0, 0.02, 0.13, head).scale.set(1.45, 1.1, 0.8);
  } else if (style === 'curly') {
    // ~130 curls merged into 3 draw calls (two hair colours + one outline shell)
    const blobs = [];
    const blob = (r, alt, x, y, z, ol) => blobs.push({ r, alt, x, y, z, ol });
    for (let i = 0; i < 110; i++) {
      const th = rnd0() * PI * 2, ph = rnd0() * PI * 0.66;
      const v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      if (v.z < -0.5 && v.y < 0.62) continue;
      const r = rnd(0.055, 0.08), alt = rnd0() < 0.35;
      blob(r, alt, v.x * 0.25, v.y * 0.25 + 0.025, v.z * 0.25, rnd0() < 0.25 ? 1.12 : 0);
    }
    for (let i = 0; i < 16; i++) {
      const a = PI * 0.12 + (i / 15) * PI * 0.76;
      blob(0.068, i % 3 === 0, Math.cos(a) * 0.225, rnd(-0.17, -0.09), Math.sin(a) * 0.2, 1.1);
    }
    for (let i = 0; i < 6; i++) blob(0.06, i % 2 === 0, -0.15 + i * 0.06, 0.165 + Math.sin(i) * 0.01, -0.185, 1.1);
    const sphere = (r, b) => new THREE.SphereGeometry(r, 10, 8).translate(b.x, b.y, b.z);
    const merged = (list) => mergeGeometries(list.map((b) => sphere(b.r, b)));
    const main = blobs.filter((b) => !b.alt), alt = blobs.filter((b) => b.alt), outl = blobs.filter((b) => b.ol);
    mesh(merged(main), hairM, 0, 0, 0, head);
    if (alt.length) mesh(merged(alt), hairM2, 0, 0, 0, head, { cast: false });
    if (outl.length) head.add(new THREE.Mesh(mergeGeometries(outl.map((b) => sphere(b.r * b.ol, b))), ctx.outlineMat));
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 24),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -PI / 2;
  shadow.position.y = 0.03;
  char.add(shadow);

  // racket trail: kept in the character group, positioned from world-space history each frame
  const swooshMat = new THREE.MeshBasicMaterial({ color: o.trail, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const swoosh = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry((0.12 * (1 - i / 16)) / o.scale, 10, 8), swooshMat.clone());
    m.visible = false;
    m.castShadow = false;
    char.add(m);
    swoosh.push(m);
  }

  char.scale.setScalar(o.scale);
  const u = {
    id: presetId, root, body, legs, arms, head, eyes, smile, mouth, frame, racket, torso, swoosh, shadow, scale: o.scale,
    trail: o.trail, fx: o.fx ?? null,
    // animation state
    sHist: [], swingObj: null, swEl: Infinity, swType: 'fh', serving: false, lastSwingT: 0,
    run: 0, blink: rnd(1, 3), dustT: 0, speed: 0, moving: false, swinging: false,
    // optional hooks: onDust(worldPos) for Task 10 particles; fxUpdate(u, info) per-character idle motion
    onDust: null, fxUpdate: null,
  };
  char.userData = u;
  if (o.extras) {
    const b = { ctx, toon, basic, mesh, head, body, root, u, o, rnd };
    const hook = o.extras(b);
    if (hook) u.fxUpdate = hook;
  }
  return char;
}

// ---------- per-character extras (head-space front is -z, head radius ~0.235)
function buildToto({ toon, mesh, head, body }) {
  const shell = mesh(new THREE.SphereGeometry(0.3, 24, 16), toon('#6a994e'), 0, 0.72, 0.16, body, { ol: 1.04 });
  shell.scale.set(1.05, 1.12, 0.62);
  const rim = mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), toon('#a7c957'), 0, 0.72, 0.13, body);
  rim.scale.set(1.05, 1.12, 1);
  const plate = toon('#87b35f');
  const spots = [[0, 0.8], [-0.14, 0.68], [0.14, 0.68], [0, 0.58], [-0.12, 0.88], [0.12, 0.88]];
  for (const [x, y] of spots) {
    const p = mesh(new THREE.SphereGeometry(0.07, 6, 4), plate, x, y, 0.33, body, { cast: false });
    p.scale.set(1, 1, 0.35);
  }
  // little turtle nostrils + chubby cheeks
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.01, 6, 4), toon('#386641'), s * 0.03, -0.025, -0.255, head, { cast: false });
}

function buildBobo({ toon, mesh, head }) {
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.085, 14, 10), toon('#9c6644'), s * 0.17, 0.2, 0.02, head, { ol: 1.08 });
    e.scale.z = 0.55;
    mesh(new THREE.SphereGeometry(0.05, 12, 8), toon('#ede0d4'), s * 0.17, 0.2, -0.02, head, { cast: false }).scale.z = 0.4;
  }
  const muz = mesh(new THREE.SphereGeometry(0.11, 16, 12), toon('#ede0d4'), 0, -0.07, -0.19, head, { ol: 1.05 });
  muz.scale.set(1.1, 0.8, 0.75);
  mesh(new THREE.SphereGeometry(0.035, 12, 8), toon('#1c1d22'), 0, -0.035, -0.27, head, { cast: false }).scale.set(1.3, 0.9, 0.8);
}

function buildLeo({ toon, mesh, head, body }) {
  const ears = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.08, 0.2, 0.03);
    pivot.rotation.z = -s * 0.15;
    head.add(pivot);
    mesh(new THREE.CapsuleGeometry(0.055, 0.3, 4, 12), toon('#ffffff'), 0, 0.2, 0, pivot, { ol: 1.08 }).scale.z = 0.6;
    mesh(new THREE.CapsuleGeometry(0.03, 0.24, 4, 10), toon('#ffb3c1'), 0, 0.2, -0.022, pivot, { cast: false }).scale.z = 0.4;
    ears.push(pivot);
  }
  mesh(new THREE.SphereGeometry(0.024, 10, 8), toon('#e07a5f'), 0, -0.035, -0.235, head, { cast: false }).scale.set(1.3, 0.9, 0.8);
  mesh(new THREE.BoxGeometry(0.05, 0.045, 0.015), toon('#ffffff'), 0, -0.125, -0.212, head, { cast: false, ol: 1.15 });
  mesh(new THREE.SphereGeometry(0.075, 12, 10), toon('#ffffff'), 0, 0.5, 0.2, body, { ol: 1.08 });
  return (u, { t, speed }) => {
    const flop = speed > 0.4 ? 0.25 + Math.sin(t * 14) * 0.12 : Math.sin(t * 3) * 0.05;
    ears[0].rotation.x = flop; ears[1].rotation.x = flop * 0.8;
  };
}

function buildGaston({ toon, mesh, head }) {
  const black = toon('#1c1d22');
  const cap = mesh(new THREE.SphereGeometry(0.252, 28, 14, 0, PI * 2, 0, PI * 0.5), black, 0, 0.03, 0.01, head, { ol: 1.03 });
  cap.scale.y = 0.85;
  const visor = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24, 1, false, PI * 0.5, PI), black, 0, 0.04, -0.17, head, { ol: 1.06 });
  visor.rotation.x = 0.12;
  mesh(new THREE.BoxGeometry(0.1, 0.06, 0.01), toon('#ffc72c'), 0, 0.12, -0.235, head, { cast: false }).rotation.x = -0.35;
  const grey = toon('#9a9a9a');
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.06, 10, 8), grey, s * 0.215, -0.01, 0.06, head).scale.set(0.5, 1, 1.2);
    const m = mesh(new THREE.SphereGeometry(0.045, 12, 8), toon('#7a4a24'), s * 0.042, -0.07, -0.222, head, { cast: false, ol: 1.1 });
    m.scale.set(1.35, 0.6, 0.6);
    m.rotation.z = s * 0.3;
  }
  // wider shoulders: a bit of a belly for the janitor
}

function buildPingo({ toon, mesh, head, body }) {
  const white = toon('#ffffff');
  const belly = mesh(new THREE.SphereGeometry(0.17, 18, 14), white, 0, 0.7, -0.075, body, { cast: false });
  belly.scale.set(0.95, 1.35, 0.6);
  const face = mesh(new THREE.SphereGeometry(0.2, 20, 14), white, 0, -0.03, -0.07, head, { cast: false });
  face.scale.set(1, 0.85, 0.9);
  const beak = mesh(new THREE.ConeGeometry(0.06, 0.15, 14), toon('#ffb300'), 0, -0.05, -0.29, head, { ol: 1.1 });
  beak.rotation.x = -PI / 2;
  beak.scale.set(1.2, 1, 0.7);
}

function buildBarbe({ toon, mesh, head, body, ctx }) {
  const black = toon('#1c1d22'), blue = toon('#1f56c4'), navy = toon('#1f3a8a');
  // pirate hat: crown + wide brim turned up at the front, skull badge
  const crown = mesh(new THREE.SphereGeometry(0.255, 28, 14, 0, PI * 2, 0, PI * 0.5), black, 0, 0.06, 0.01, head, { ol: 1.03 });
  crown.scale.y = 1.05;
  const brim = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 28), black, 0, 0.08, 0.01, head, { ol: 1.05 });
  brim.scale.z = 0.8;
  const front = mesh(new THREE.BoxGeometry(0.4, 0.13, 0.025), black, 0, 0.17, -0.25, head, { ol: 1.06 });
  front.rotation.x = -0.25;
  mesh(new THREE.BoxGeometry(0.42, 0.018, 0.03), toon('#ffc72c'), 0, 0.235, -0.267, head, { cast: false }).rotation.x = -0.25;
  const skull = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.11),
    new THREE.MeshBasicMaterial({ map: ctx.textTex('☠', { fg: '#f7f7f2', stroke: '#1c1d22', w: 256, h: 256, font: 0.9 }), transparent: true }),
  );
  skull.position.set(0, 0.165, -0.27);
  skull.rotation.set(-0.25, PI, 0);
  head.add(skull);
  // eye patch over the right eye + strap
  const patch = mesh(new THREE.SphereGeometry(0.052, 14, 10), black, 0.085, 0.012, -0.212, head, { cast: false, ol: 1.08 });
  patch.scale.set(1.05, 1, 0.35);
  const strap = mesh(new THREE.TorusGeometry(0.243, 0.008, 6, 32), black, 0, 0.03, 0, head, { cast: false });
  strap.rotation.set(PI / 2, 0.35, 0);
  // big blue beard under the mouth
  const tufts = [[0, -0.2, -0.17, 0.085], [-0.09, -0.16, -0.17, 0.07], [0.09, -0.16, -0.17, 0.07],
    [-0.16, -0.08, -0.11, 0.06], [0.16, -0.08, -0.11, 0.06], [-0.05, -0.25, -0.13, 0.06], [0.05, -0.25, -0.13, 0.06]];
  tufts.forEach(([x, y, z, r], i) => mesh(new THREE.SphereGeometry(r, 10, 8), i % 2 ? navy : blue, x, y, z, head, { ol: 1.08 }));
  for (const s of [-1, 1]) {
    const m = mesh(new THREE.SphereGeometry(0.04, 12, 8), navy, s * 0.045, -0.075, -0.222, head, { cast: false, ol: 1.1 });
    m.scale.set(1.4, 0.55, 0.6);
    m.rotation.z = s * 0.35;
  }
  // red sash across the shirt
  const sash = mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 24), toon('#e63946'), 0, 0.6, 0, body, { cast: false });
  sash.rotation.x = PI / 2;
  sash.scale.set(1, 0.84, 1);
}

function buildKenta({ toon, mesh, head }) {
  // skin-coloured eye band in the black hood
  const band = mesh(new THREE.SphereGeometry(0.238, 28, 6, PI * 1.12, PI * 0.76, PI * 0.4, PI * 0.19), toon(HUMAN), 0, 0, 0, head, { cast: false });
  band.scale.set(1, 0.97, 1);
  const red = toon('#e63946');
  const hb = mesh(new THREE.TorusGeometry(0.245, 0.028, 8, 32), red, 0, 0.11, 0, head, { ol: 1.08 });
  hb.rotation.x = PI / 2;
  const knot = mesh(new THREE.SphereGeometry(0.04, 10, 8), red, 0, 0.11, 0.25, head);
  knot.scale.set(1.2, 0.8, 0.8);
  const tails = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(s * 0.025, 0.1, 0.26);
    head.add(p);
    mesh(new THREE.BoxGeometry(0.05, 0.012, 0.2), red, 0, 0, 0.1, p, { ol: 1.15 });
    p.rotation.set(0.5, s * 0.35, 0);
    tails.push(p);
  }
  return (u, { t, speed }) => {
    for (let i = 0; i < 2; i++) tails[i].rotation.x = 0.55 - Math.min(speed, 6) * 0.08 + Math.sin(t * 12 + i) * 0.12;
  };
}

function buildNoe({ toon, mesh, head, body, ctx }) {
  mesh(new THREE.SphereGeometry(0.239, 28, 6, PI * 1.1, PI * 0.8, PI * 0.42, PI * 0.15), toon('#1f56c4'), 0, 0, 0, head, { cast: false, ol: 1.01 });
  const star = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.2),
    new THREE.MeshBasicMaterial({ map: ctx.textTex('★', { fg: '#ffc72c', stroke: '#1c1d22', w: 256, h: 256, font: 0.9 }), transparent: true }),
  );
  star.position.set(0, 0.76, -0.157);
  star.rotation.y = PI;
  body.add(star);
  const capeP = new THREE.Group();
  capeP.position.set(0, 0.93, 0.15);
  body.add(capeP);
  const cape = mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.72, 16, 1, true, -PI * 0.42, PI * 0.84), toon('#e63946'), 0, -0.36, 0, capeP);
  cape.material = cape.material.clone();
  cape.material.side = THREE.DoubleSide;
  cape.scale.z = 0.5;
  return (u, { t, speed }) => {
    capeP.rotation.x = 0.12 + Math.min(speed, 6) * 0.1 + Math.sin(t * 9) * 0.04;
  };
}

function buildFlamme({ toon, mesh, head, body }) {
  const lime = toon('#9ef01a'), gold = toon('#ffb300'), green = toon('#06a77d');
  const snout = mesh(new THREE.SphereGeometry(0.13, 18, 12), lime, 0, -0.08, -0.19, head, { ol: 1.05 });
  snout.scale.set(1.15, 0.75, 0.9);
  for (const s of [-1, 1]) {
    mesh(new THREE.SphereGeometry(0.014, 8, 6), toon('#1c1d22'), s * 0.04, -0.045, -0.3, head, { cast: false });
    const h = mesh(new THREE.ConeGeometry(0.045, 0.15, 12), gold, s * 0.11, 0.22, 0.02, head, { ol: 1.1 });
    h.rotation.z = -s * 0.35;
  }
  const belly = mesh(new THREE.SphereGeometry(0.15, 16, 12), lime, 0, 0.68, -0.08, body, { cast: false });
  belly.scale.set(1, 1.3, 0.55);
  for (let i = 0; i < 4; i++) {
    const sp = mesh(new THREE.ConeGeometry(0.035, 0.08, 8), gold, 0, 0.2 - i * 0.12, 0.2 + (i === 0 ? 0 : 0.03), head);
    sp.rotation.x = PI / 2 - 0.3 + i * 0.25;
  }
  for (let i = 0; i < 3; i++) {
    const sp = mesh(new THREE.ConeGeometry(0.04, 0.09, 8), gold, 0, 0.86 - i * 0.14, 0.17, body);
    sp.rotation.x = PI / 2;
  }
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.ConeGeometry(0.1, 0.24, 4), toon('#ffb300'), s * 0.13, 0.86, 0.17, body, { ol: 1.06 });
    w.rotation.set(-0.5, 0, -s * 1.0);
    w.scale.z = 0.3;
  }
  const tailP = new THREE.Group();
  tailP.position.set(0, 0.48, 0.15);
  body.add(tailP);
  const tail = mesh(new THREE.ConeGeometry(0.09, 0.5, 12), green, 0, 0.25, 0, tailP, { ol: 1.06 });
  tailP.rotation.x = PI / 2 + 0.45;
  mesh(new THREE.ConeGeometry(0.05, 0.1, 4), gold, 0, 0.5, 0, tailP);
  void tail;
  return (u, { t, speed }) => {
    tailP.rotation.z = Math.sin(t * (speed > 0.4 ? 12 : 3)) * 0.35;
  };
}

function buildRobomax({ toon, basic, mesh, head, body }) {
  const blueGlow = basic('#4cc9ff').clone();
  mesh(new THREE.BoxGeometry(0.38, 0.17, 0.03), toon('#1f56c4'), 0, 0.01, -0.215, head, { cast: false, ol: 1.04 });
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), toon('#1c1d22'), 0, 0.27, 0, head);
  const tip = mesh(new THREE.SphereGeometry(0.045, 14, 10), blueGlow, 0, 0.37, 0, head, { ol: 1.15 });
  const grey = toon('#6c757d');
  for (const s of [-1, 1]) {
    const bolt = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), grey, s * 0.245, 0, 0, head, { ol: 1.08 });
    bolt.rotation.z = PI / 2;
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), toon('#1f56c4'), s * 0.255, 0, 0, head, { cast: false }).rotation.z = PI / 2;
  }
  const light = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), blueGlow);
  light.position.set(0, 0.76, -0.158);
  light.rotation.y = PI;
  body.add(light);
  const ring = mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 20), toon('#1f56c4'), 0, 0.76, -0.157, body, { cast: false });
  void ring;
  void tip;
  const base = new THREE.Color('#4cc9ff'), hot = new THREE.Color('#d6f6ff');
  return (u, { t, swinging }) => {
    const k = swinging ? 1 : 0.5 + 0.5 * Math.sin(t * 4);
    blueGlow.color.copy(base).lerp(hot, k * 0.6);
  };
}

// ---------- animation
const KEYS = {
  fh: [[0, { ax: -0.4, ay: 0.6, az: 0.5, by: 0 }], [0.4, { ax: -0.2, ay: -1.4, az: 1.3, by: -0.75 }], [0.55, { ax: -0.3, ay: 0.3, az: 1.35, by: 0 }], [0.8, { ax: -0.7, ay: 1.95, az: 1.1, by: 0.7 }], [1, { ax: -0.4, ay: 0.6, az: 0.5, by: 0 }]],
  bh: [[0, { ax: -0.4, ay: 0.6, az: 0.5, by: 0 }], [0.4, { ax: -0.3, ay: 3.4, az: 1.1, by: 0.95 }], [0.55, { ax: -0.3, ay: 1.8, az: 1.3, by: 0 }], [0.8, { ax: -0.6, ay: 0.2, az: 1.9, by: -0.6 }], [1, { ax: -0.4, ay: 0.6, az: 0.5, by: 0 }]],
  sm: [[0, { ax: -0.4, ay: 0.6, az: 0.5, by: 0 }], [0.4, { ax: 0.9, ay: 0.2, az: 2.7, by: -0.4 }], [0.55, { ax: -0.4, ay: 0.2, az: 2.8, by: 0 }], [0.8, { ax: -1.8, ay: 0.4, az: 1.0, by: 0.45 }], [1, { ax: -0.4, ay: 0.6, az: 0.5, by: 0 }]],
};
function pose(type, p) {
  p = clamp(p, 0, 1);
  const k = KEYS[type] ?? KEYS.fh;
  for (let i = 0; i < k.length - 1; i++) {
    const [p0, a] = k[i], [p1, b] = k[i + 1];
    if (p <= p1) {
      const f = ss((p - p0) / (p1 - p0));
      const r = {};
      for (const n in a) r[n] = lerp(a[n], b[n], f);
      return r;
    }
  }
  return k[k.length - 1][1];
}
// The match sets `swing` at contact time and clears it after 0.35 s; the rig plays from just before
// contact (P0) to the end of the follow-through over SWING_DUR, continuing on its own after swing clears.
export const SWING_DUR = 0.4;
const P0 = 0.45;
const IDLE = { ax: -0.4, ay: 0.6, az: 0.5, by: 0 };
const tmpV = new THREE.Vector3();

export function animateCharacter(char, opts = {}, t = 0, dt = 0) {
  const u = char.userData;
  dt = dt > 0 && Number.isFinite(dt) ? dt : 0;
  const face = opts.facing === -1 ? -1 : 1;
  const vx = fin(opts.vx), vz = fin(opts.vz);
  const f = 1 - Math.exp(-dt * 16);
  const speed = Math.hypot(vx, vz), moving = speed > 0.4;
  const lvx = vx * face;
  const cele = !!opts.celebrate, sad = !cele && !!opts.sad;
  u.speed = speed;
  u.moving = moving;

  // swing state (kept here so the follow-through finishes after the match clears `swing`)
  const sw = opts.swing;
  if (sw) {
    const st = Number.isFinite(opts.swingT) ? opts.swingT : null;
    const isNew = sw !== u.swingObj || (st !== null && st + 1e-6 < u.lastSwingT);
    if (isNew) {
      u.swingObj = sw;
      u.serving = sw.kind === 'serve';
      u.swType = sw.kind === 'serve' || sw.kind === 'smash' || sw.side === 'sm' ? 'sm' : sw.side === 'bh' ? 'bh' : 'fh';
      u.swEl = st ?? 0;
      u.sHist.length = 0;
    } else {
      u.swEl = st ?? u.swEl + dt;
    }
    u.lastSwingT = st ?? u.swEl;
  } else {
    u.swingObj = null;
    u.lastSwingT = 0;
    if (u.swEl < SWING_DUR) u.swEl += dt;
  }
  const swinging = u.swEl < SWING_DUR;
  const p = swinging ? P0 + (1 - P0) * (u.swEl / SWING_DUR) : 1;
  u.swinging = swinging;

  u.run += moving ? dt * (5 + speed * 2.2) : 0;
  const a = moving ? Math.sin(u.run) * 0.8 : 0;
  u.legs[0].rotation.x = lerp(u.legs[0].rotation.x, a, f);
  u.legs[1].rotation.x = lerp(u.legs[1].rotation.x, -a, f);
  const spread = moving ? 0 : 0.13;
  u.legs[0].rotation.z = lerp(u.legs[0].rotation.z, -spread, f);
  u.legs[1].rotation.z = lerp(u.legs[1].rotation.z, spread, f);
  let by = moving ? Math.abs(Math.sin(u.run)) * 0.06 : -0.035 + Math.abs(Math.sin(t * 7 + face)) * 0.03;
  if (cele) by = Math.abs(Math.sin(t * 9)) * 0.38;
  u.body.position.y = lerp(u.body.position.y, by, dt > 0 ? 0.5 : 0);
  u.root.rotation.z = lerp(u.root.rotation.z, -lvx * 0.06, f);
  u.root.rotation.x = lerp(u.root.rotation.x, moving ? -0.14 : sad ? 0.12 : -0.07, f);

  // right (racket) arm
  let P = IDLE;
  if (swinging) P = pose(u.swType, p);
  if (cele) P = { ax: 0, ay: 0, az: 2.75, by: 0 };
  if (sad) P = { ax: 0, ay: 0, az: 0.15, by: 0 };
  const sf = swinging ? 1 - Math.exp(-dt * 40) : f, R = u.arms[1].rotation;
  R.x = lerp(R.x, P.ax, sf); R.y = lerp(R.y, P.ay, sf); R.z = lerp(R.z, P.az, sf);
  u.body.rotation.y = lerp(u.body.rotation.y, P.by, sf);

  // left arm (raised for the ball toss early in a serve)
  const Lr = u.arms[0].rotation;
  const toss = swinging && u.serving && p < 0.6;
  const lx = cele || toss ? 0 : moving ? -Math.sin(u.run) * 0.7 : sad ? 0 : -0.55;
  const lz = cele ? -2.75 : toss ? -2.4 : sad ? -0.1 : -0.3;
  Lr.x = lerp(Lr.x, lx, f); Lr.z = lerp(Lr.z, lz, f);

  // head: follows the ball, shakes when a point is lost
  if (sad) {
    u.head.rotation.y = Math.sin(t * 16) * 0.35;
    u.head.rotation.x = 0.25;
  } else if (opts.ballPos) {
    const ldx = (fin(opts.ballPos.x) - char.position.x) * face;
    u.head.rotation.y = clamp(-ldx * 0.12, -0.5, 0.5) - u.body.rotation.y * 0.6;
    u.head.rotation.x = clamp(-(fin(opts.ballPos.y) - 1.5) * 0.08, -0.3, 0.2);
  } else {
    u.head.rotation.y = lerp(u.head.rotation.y, -u.body.rotation.y * 0.6, f);
    u.head.rotation.x = lerp(u.head.rotation.x, 0, f);
  }

  // eyes / mouth
  u.blink -= dt;
  u.eyes.scale.y = u.blink < 0.12 ? 0.12 : 1;
  if (u.blink < 0) u.blink = 1.8 + Math.random() * 2.2;
  const open = (swinging && p > 0.3 && p < 0.85) || cele;
  u.mouth.visible = open;
  u.smile.visible = !open && !sad;

  // running dust (particles live in Task 10's effects; we only signal)
  if (moving && u.onDust) {
    u.dustT -= dt;
    if (u.dustT < 0) { u.dustT = 0.11; u.onDust(char.getWorldPosition(tmpV).clone(), u); }
  }

  // racket trail (world-space history, displayed in the character's local space)
  if (swinging && dt > 0) {
    u.frame.getWorldPosition(tmpV);
    u.sHist.unshift(tmpV.clone());
    if (u.sHist.length > 12) u.sHist.pop();
  } else if (u.sHist.length) u.sHist.pop();
  if (u.sHist.length) char.updateMatrixWorld();
  for (let i = 0; i < u.swoosh.length; i++) {
    const m = u.swoosh[i], h = u.sHist[i];
    m.visible = !!h;
    if (h) {
      m.position.copy(char.worldToLocal(tmpV.copy(h)));
      m.material.opacity = 0.45 * (1 - i / 12);
    }
  }

  if (u.fxUpdate) u.fxUpdate(u, { t, dt, speed, moving, swinging });
}
