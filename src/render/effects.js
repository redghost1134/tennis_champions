import * as THREE from 'three';

// Hit sparks + ring + onomatopoeia, bounce ring + dust, net shake, point confetti, camera shake on smash.
// All particles share one InstancedMesh (one draw call), capped at MAX_PARTICLES.
const MAX_PARTICLES = 300;
const WORDS = ['PAF !', 'POK !', 'BIM !', 'TOC !'];
const CONFETTI = ['#ffc72c', '#1f56c4', '#ffffff', '#1c1d22'];
const GRAVITY = 9;

export function createEffects(ctx, { shake = () => {} } = {}) {
  const { scene, textTex } = ctx;

  // ---- particles
  const pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), MAX_PARTICLES);
  pMesh.frustumCulled = false;
  pMesh.count = 0;
  scene.add(pMesh);
  const parts = [];
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();

  function emit(n, pos, { colors, speed = 3, up = 2, size = 0.07, life = 0.6, grav = 1, spin = 0, drag = 0 }) {
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAX_PARTICLES) parts.shift();
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      parts.push({
        p: new THREE.Vector3(pos.x, pos.y, pos.z),
        v: new THREE.Vector3(Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s),
        r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin, size: size * (0.6 + Math.random() * 0.8), life, t: 0, grav, drag,
        color: colors[(Math.random() * colors.length) | 0],
        flat: spin > 0,
      });
    }
  }

  // ---- rings (6 pooled)
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 32), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    rings.push({ m, t: 1, life: 0.35, max: 1 });
  }
  let ringI = 0;
  function ring(pos, { flat = false, color = '#ffffff', max = 0.9, life = 0.35 } = {}) {
    const r = rings[ringI++ % rings.length];
    r.m.position.copy(pos);
    r.m.rotation.set(flat ? -Math.PI / 2 : 0, 0, 0);
    r.m.material.color.set(color);
    Object.assign(r, { t: 0, life, max, flat });
    r.m.visible = true;
  }

  // ---- onomatopoeia sprites (4 pooled, textures cached per word)
  const wordTex = new Map();
  const texFor = (w) => {
    if (!wordTex.has(w)) wordTex.set(w, textTex(w, { fg: '#ffc72c', stroke: '#1c1d22', w: 512, h: 160, font: 0.7 }));
    return wordTex.get(w);
  };
  const words = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
    s.renderOrder = 10;
    s.visible = false;
    scene.add(s);
    words.push({ s, t: 1, life: 0.8 });
  }
  let wordI = 0;
  function word(text, pos, color) {
    const w = words[wordI++ % words.length];
    w.s.material.map = texFor(text);
    w.s.material.color.set(color ?? '#ffffff');
    w.s.material.needsUpdate = true;
    w.s.position.set(pos.x, pos.y + 0.6, pos.z);
    w.t = 0;
    w.s.visible = true;
  }

  // ---- net shake
  let net = null, netAmp = 0, netT = 0;

  const at = (pos, y) => new THREE.Vector3(pos?.x ?? 0, pos?.y ?? y, pos?.z ?? 0);

  return {
    onEvent(e, worldPos) {
      switch (e.type) {
        case 'hit':
        case 'serve': {
          const p = at(worldPos, 1.2);
          const smash = e.kind === 'smash';
          emit(smash ? 22 : 14, p, { colors: ['#ffc72c', '#ffffff', '#fff3b0'], speed: smash ? 5 : 3.5, up: 2.5, size: 0.06, life: 0.45 });
          ring(p, { color: smash ? '#ffc72c' : '#ffffff', max: smash ? 1.3 : 0.8 });
          const w = smash ? 'SMASH !' : e.kind === 'lob' ? 'LOB !' : WORDS[(Math.random() * WORDS.length) | 0];
          word(w, p);
          if (smash) shake(0.28);
          break;
        }
        case 'bounce': {
          const p = new THREE.Vector3(e.x ?? worldPos?.x ?? 0, 0.03, e.z ?? worldPos?.z ?? 0);
          ring(p, { flat: true, max: 0.55, life: 0.4 });
          emit(6, p, { colors: ['#d8cfa8', '#c9c2a0', '#ffffff'], speed: 1.2, up: 0.9, size: 0.06, life: 0.5, drag: 2 });
          break;
        }
        case 'net': {
          net = net ?? scene.getObjectByName('net');
          netAmp = 0.12;
          netT = 0;
          emit(8, at(worldPos, 0.7), { colors: ['#ffffff', '#d0d0d0'], speed: 1.5, up: 1.2, size: 0.05, life: 0.4 });
          break;
        }
        case 'point': {
          emit(90, at(worldPos, 2.5), { colors: CONFETTI, speed: 3, up: 5, size: 0.11, life: 2.2, grav: 0.35, spin: 1, drag: 1.2 });
          break;
        }
        default:
      }
    },
    dust(pos) {
      emit(2, new THREE.Vector3(pos.x, 0.05, pos.z), { colors: ['#e2d9b8', '#cfc6a2'], speed: 0.5, up: 0.5, size: 0.08, life: 0.45, drag: 3 });
    },
    tick(dt) {
      if (!(dt > 0)) return;
      // particles
      let n = 0;
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.t += dt;
        if (q.t >= q.life) { parts.splice(i, 1); continue; }
        q.v.y -= GRAVITY * q.grav * dt;
        if (q.drag) q.v.multiplyScalar(Math.exp(-q.drag * dt));
        q.p.addScaledVector(q.v, dt);
        if (q.p.y < 0.02) { q.p.y = 0.02; q.v.y = 0; q.v.x *= 0.5; q.v.z *= 0.5; }
        q.r.x += dt * 8 * q.spin; q.r.y += dt * 6 * q.spin;
        const k = 1 - q.t / q.life;
        const sz = q.size * (q.flat ? 1 : 0.4 + 0.6 * k);
        tmpS.set(sz, q.flat ? sz * 0.15 : sz, q.flat ? sz * 0.6 : sz);
        tmpQ.setFromEuler(tmpE.set(q.r.x, q.r.y, q.r.z));
        tmpM.compose(q.p, tmpQ, tmpS);
        pMesh.setMatrixAt(n, tmpM);
        pMesh.setColorAt(n, tmpC.set(q.color));
        n++;
      }
      pMesh.count = n;
      pMesh.instanceMatrix.needsUpdate = true;
      if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;

      for (const r of rings) {
        if (!r.m.visible) continue;
        r.t += dt;
        const k = r.t / r.life;
        if (k >= 1) { r.m.visible = false; continue; }
        r.m.scale.setScalar(0.1 + r.max * k);
        r.m.material.opacity = 1 - k;
      }
      for (const w of words) {
        if (!w.s.visible) continue;
        w.t += dt;
        const k = w.t / w.life;
        if (k >= 1) { w.s.visible = false; continue; }
        const pop = k < 0.2 ? 0.4 + (k / 0.2) * 0.8 : 1.2 - (k - 0.2) * 0.25;
        w.s.scale.set(1.6 * pop, 0.5 * pop, 1);
        w.s.position.y += dt * 0.8;
        w.s.material.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      }
      if (net && netAmp > 0.001) {
        netT += dt;
        net.rotation.x = Math.sin(netT * 45) * netAmp;
        netAmp *= Math.exp(-dt * 6);
      } else if (net) net.rotation.x = 0;
    },
  };
}
