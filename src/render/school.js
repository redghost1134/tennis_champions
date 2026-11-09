import * as THREE from 'three';
import { COURT } from '../core/court.js';
import { PALETTE as C } from './scene.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const { W, L, HALF_L, SERVICE_Z, NET_H } = COURT;

function makeNetTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const c = cv.getContext('2d');
  c.strokeStyle = '#15161a';
  c.lineWidth = 2;
  for (let x = 0; x <= 256; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 64); c.stroke(); }
  for (let y = 0; y <= 64; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

export function buildSchool(ctx) {
  // static decor: materials are shared per colour (toonShared) and geometries per shape; only big shapes cast shadows
  const { scene, toonShared: toon, mesh, textTex } = ctx;
  const geo = new Map();
  const G = (key, make) => { if (!geo.has(key)) geo.set(key, make()); return geo.get(key); };
  const NO = { cast: false };
  const flat = (geo, mat, x, y, z, rotY = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(-Math.PI / 2, 0, rotY);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  // clouds
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group(), n = 4 + Math.floor(Math.random() * 3), m = toon('#ffffff', { fog: false });
    for (let j = 0; j < n; j++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(rnd(2, 4.2), 18, 12), m);
      b.position.set(j * 2.8 - n * 1.4, rnd(0, 1.4) + (j > 0 && j < n - 1 ? 1 : 0), rnd(-1, 1));
      b.scale.y = 0.72;
      g.add(b);
    }
    g.position.set(rnd(-90, 90), rnd(26, 40), (i % 2 ? -1 : 1) * rnd(60, 100));
    scene.add(g);
    clouds.push(g);
  }

  // ground, court, lines
  mesh(new THREE.PlaneGeometry(120, 120), toon(C.asph), 0, 0, 0, scene, { cast: false, recv: true }).rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(W + 4, L + 5), toon(C.yellow), 0, 0.005, 0, scene, { cast: false, recv: true }).rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(W, L), toon(C.blue), 0, 0.01, 0, scene, { cast: false, recv: true }).rotation.x = -Math.PI / 2;
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const line = (w, d, x, z) => flat(new THREE.PlaneGeometry(w, d), lineMat, x, 0.02, z);
  line(W + 0.1, 0.1, 0, HALF_L); line(W + 0.1, 0.1, 0, -HALF_L);
  line(0.1, L, W / 2, 0); line(0.1, L, -W / 2, 0);
  line(W, 0.07, 0, SERVICE_Z); line(W, 0.07, 0, -SERVICE_Z);
  line(0.07, SERVICE_Z * 2, 0, 0);
  line(0.07, 0.35, 0, HALF_L - 0.17); line(0.07, 0.35, 0, -HALF_L + 0.17);
  for (const s of [-1, 1]) {
    const nameMat = new THREE.MeshBasicMaterial({ map: textTex('GEORGE VANIER', { fg: C.blue, stroke: '#ffffff' }), transparent: true });
    flat(new THREE.PlaneGeometry(7.5, 1.2), nameMat, 0, 0.02, s * (HALF_L + 1.4), s > 0 ? Math.PI : 0);
  }

  // net
  const netTex = makeNetTexture();
  const netG = new THREE.Group();
  scene.add(netG);
  mesh(new THREE.PlaneGeometry(W + 1, 0.8), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 }), 0, NET_H / 2, 0, netG, { cast: false });
  mesh(new THREE.BoxGeometry(W + 1, 0.09, 0.06), toon(C.white), 0, NET_H, 0, netG);
  for (const x of [-(W + 1) / 2, (W + 1) / 2]) {
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 14), toon(C.yellow), x, 0.5, 0, scene, { ol: 1.15 });
    mesh(new THREE.SphereGeometry(0.1, 12, 8), toon(C.blue), x, 1.02, 0, scene, NO);
  }

  // school buildings, one at each end
  function school(z, rotY) {
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
    const Wb = 26, Hb = 7;
    // facade details (windows, trims, clock ticks) sit flat on the wall: no shadow casting
    const b = (w, h, d, c, x, y, zz, cast = false) =>
      mesh(G(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), toon(c), x, y, zz, g, { recv: true, cast });
    b(Wb, Hb, 4, C.white, 0, Hb / 2, 0, true);
    b(Wb + 0.6, 0.6, 4.6, C.blue, 0, Hb + 0.3, 0, true);
    b(Wb + 0.2, 0.35, 4.1, C.yellow, 0, 3.3, 0);
    b(Wb + 0.2, 0.6, 4.1, C.black, 0, 0.3, 0);
    for (const fy of [1.9, 5.4]) {
      for (let i = -5; i <= 5; i++) {
        if (fy < 3 && Math.abs(i) <= 1) continue;
        if (fy > 3 && Math.abs(i) <= 3) continue;
        b(1.6, 1.7, 0.1, C.yellow, i * 2.3, fy, 2.02); b(1.3, 1.4, 0.12, C.black, i * 2.3, fy, 2.03);
        b(1.3, 0.07, 0.14, C.white, i * 2.3, fy, 2.04); b(0.07, 1.4, 0.14, C.white, i * 2.3, fy, 2.04);
        b(1.8, 0.12, 0.35, C.blue, i * 2.3, fy - 0.9, 2.1);
      }
    }
    b(3, 2.9, 0.15, C.blue, 0, 1.45, 2.05); b(3.4, 0.25, 0.3, C.yellow, 0, 3.0, 2.1); b(0.08, 2.7, 0.2, C.yellow, 0, 1.4, 2.1);
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ map: textTex('GV', { bg: C.blue, fg: C.yellow, w: 256, h: 256, font: 0.55 }) }));
      d.position.set(s * 2.3, 1.9, 2.07);
      g.add(d);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 32), toon(C.yellow));
      r.position.copy(d.position);
      g.add(r);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 1.7), new THREE.MeshBasicMaterial({ map: textTex('ÉCOLE GEORGE VANIER', { bg: C.yellow, fg: C.blue, w: 1600, h: 200 }) }));
    sign.position.set(0, 4.55, 2.12);
    g.add(sign);
    b(13.9, 0.18, 0.2, C.black, 0, 5.47, 2.1); b(13.9, 0.18, 0.2, C.black, 0, 3.63, 2.1);
    // clock
    b(2.6, 2.6, 1, C.blue, 0, Hb + 1.5, 1.35, true);
    const cf = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: C.white }));
    cf.position.set(0, Hb + 1.5, 1.87);
    g.add(cf);
    mesh(new THREE.TorusGeometry(0.95, 0.1, 8, 32), toon(C.black), 0, Hb + 1.5, 1.88, g, NO);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b(0.06, 0.16, 0.02, C.black, Math.sin(a) * 0.78, Hb + 1.5 + Math.cos(a) * 0.78, 1.9).rotation.z = -a;
    }
    b(0.09, 0.5, 0.02, C.black, 0, Hb + 1.75, 1.92);
    b(0.06, 0.72, 0.02, C.black, 0.36, Hb + 1.5, 1.93).rotation.z = -Math.PI / 2;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 3.2, 2.4, 4, 1), toon(C.black));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(4.3, 1, 0.78);
    roof.position.set(0, Hb + 1.8, -0.3);
    roof.castShadow = true;
    g.add(roof);
  }
  school(-HALF_L - 9, 0);
  school(HALF_L + 9, Math.PI);

  // side fences, pennants, benches
  const flags = [];
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 3.5);
    for (let i = 0; i <= 10; i++) {
      const z = -HALF_L - 2 + (i * (L + 4)) / 10;
      mesh(G('post', () => new THREE.BoxGeometry(0.16, 2.3, 0.16)), toon(i % 2 ? C.blue : C.yellow), x, 1.15, z);
      mesh(G('cap', () => new THREE.SphereGeometry(0.12, 10, 8)), toon(C.white), x, 2.35, z, scene, NO);
    }
    for (const y of [0.6, 1.4, 2.2]) mesh(G('rail', () => new THREE.BoxGeometry(0.07, 0.09, L + 4)), toon(C.white), x, y, 0, scene, NO);
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, 2.2), new THREE.MeshBasicMaterial({ map: netTex.clone(), transparent: true, opacity: 0.6, side: THREE.DoubleSide, alphaTest: 0.1 }));
    fence.material.map.repeat.set(10, 3);
    fence.material.map.needsUpdate = true;
    fence.rotation.y = Math.PI / 2;
    fence.position.set(x, 1.1, 0);
    scene.add(fence);
    for (let i = 0; i < 24; i++) {
      const z = -HALF_L - 1.6 + (i * (L + 3.2)) / 23;
      const sag = Math.sin(((i % 8) / 8) * Math.PI) * 0.3;
      const f = mesh(G('flag', () => new THREE.ConeGeometry(0.17, 0.38, 3)), toon([C.yellow, C.blue, C.white, C.black][i % 4]), x, 2.12 - sag, z, scene, NO);
      f.rotation.x = Math.PI;
      flags.push(f);
    }
    for (const z of [-SERVICE_Z, SERVICE_Z]) {
      const bx = x - sx * 1.1;
      mesh(G('seat', () => new THREE.BoxGeometry(0.55, 0.1, 2.6)), toon(C.blue), bx, 0.48, z, scene, { ol: 1.04 });
      mesh(G('backrest', () => new THREE.BoxGeometry(0.1, 0.5, 2.6)), toon(C.blue), bx + sx * 0.25, 0.75, z);
      for (const dz of [-1.1, 1.1]) mesh(G('benchLeg', () => new THREE.BoxGeometry(0.08, 0.48, 0.08)), toon(C.black), bx, 0.24, z + dz, scene, NO);
    }
  }

  // basketball hoop
  {
    const g = new THREE.Group();
    g.position.set(W / 2 + 6.5, 0, -3);
    scene.add(g);
    mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.3, 10), toon(C.black), 0, 1.65, 0, g);
    mesh(new THREE.BoxGeometry(0.1, 1.05, 1.6), toon(C.white), -0.3, 3.3, 0, g, { ol: 1.04 });
    mesh(new THREE.BoxGeometry(0.11, 0.5, 0.6), toon(C.blue), -0.31, 3.15, 0, g, NO);
    mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 20), toon(C.yellow), -0.66, 3, 0, g, NO).rotation.x = Math.PI / 2;
  }

  // hopscotch
  {
    const m = new THREE.MeshBasicMaterial({ color: C.yellow }), bx = -(W / 2 + 6), bz = 3;
    [[0, 0], [0, 0.9], [-0.45, 1.8], [0.45, 1.8], [0, 2.7], [-0.45, 3.6], [0.45, 3.6], [0, 4.5]].forEach(([dx, dz], i) => {
      flat(new THREE.RingGeometry(0.36, 0.43, 4, 1), m, bx + dx, 0.02, bz - dz, Math.PI / 4);
      const numMat = new THREE.MeshBasicMaterial({ map: textTex(String(i + 1), { fg: C.white, w: 128, h: 128 }), transparent: true });
      flat(new THREE.PlaneGeometry(0.4, 0.4), numMat, bx + dx, 0.025, bz - dz);
    });
  }

  // trees
  const trees = [];
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const t = new THREE.Group();
      mesh(G('trunk', () => new THREE.CylinderGeometry(0.22, 0.32, 2.2, 8)), toon('#6b4226'), 0, 1.1, 0, t, NO);
      const fo = new THREE.Group();
      fo.position.y = 2.9;
      t.add(fo);
      const fm = toon(['#3f9b3f', '#4caf50', '#2e8b3a'][i % 3]);
      [[0, 0, 0, 1.6], [0.9, -0.3, 0.2, 1.1], [-0.9, -0.2, -0.1, 1.15], [0, 0.9, 0, 1.1]].forEach(([x, y, z, r]) => mesh(G('leaf' + r, () => new THREE.IcosahedronGeometry(r, 1)), fm, x, y, z, fo, NO));
      t.position.set(-19 + i * 4.8, 0, sz * (HALF_L + 14 + rnd(0, 2)));
      t.rotation.y = rnd(0, 6);
      scene.add(t);
      trees.push(fo);
    }
  }

  return {
    tick(t, dt) {
      flags.forEach((f, i) => { f.rotation.z = Math.sin(t * 3 + i * 0.7) * 0.25; });
      trees.forEach((fo, i) => { fo.rotation.z = Math.sin(t * 1.2 + i) * 0.03; });
      clouds.forEach((c) => { c.position.x += dt * 0.8; if (c.position.x > 100) c.position.x = -100; });
    },
  };
}
