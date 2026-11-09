import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Child head (Yazan): shaped skull, big iris eyes, open smile, Kroos haircut
// (short faded sides, longer top swept across from a side part).
// Head space: radius ~0.235, face toward -z. Small parts are merged to keep draw calls low on the tablet.

const PI = Math.PI;
const R = 0.235;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (t) => t * t * (3 - 2 * t);
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3();

// sphere squashed into a child's head: narrow soft jaw, rounder cranium, chubby cheeks
function headGeometry(sh, ws, hs) {
  const g = new THREE.SphereGeometry(R, ws, hs);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ny = v.y / R;
    if (ny < 0) {
      const t = ny * ny;
      v.x *= 1 - sh.jaw * t;
      v.z *= 1 - sh.jawZ * t;
      v.y *= sh.chin;
    } else v.y *= sh.top;
    if (v.z > 0) v.z *= sh.back;
    const cx = Math.abs(v.x) / R;
    if (v.z < 0) v.z -= sh.cheek * Math.exp(-((ny + 0.35) ** 2) / 0.04) * Math.exp(-((cx - 0.5) ** 2) / 0.05);
    v.x *= sh.wide;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// 0 = middle of the face, 1 = middle of the back
const around = (x, z) => Math.abs(Math.atan2(x, -z)) / PI;
const hairline = (x, z, front) => {
  const a = around(x, z);
  return a < 0.5 ? lerp(front, 0.05, ss(a / 0.5)) : lerp(0.05, -0.13, (a - 0.5) / 0.5);
};

// copy of the head surface pushed outward by scaleFn, keeping triangles whose centre passes keep()
function shell(base, scaleFn, keep, colorFn) {
  const g = base.toNonIndexed();
  const pos = g.attributes.position;
  const out = [], cols = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    m.copy(a).add(b).add(c).divideScalar(3);
    if (!keep(m.x, m.y, m.z)) continue;
    for (const q of [a, b, c]) {
      const [sx, sy, sz] = scaleFn(q.x, q.y, q.z);
      out.push(q.x * sx, q.y * sy, q.z * sz);
      if (colorFn) cols.push(...colorFn(q.x, q.y, q.z));
    }
  }
  g.dispose();
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  if (colorFn) r.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  r.computeVertexNormals();
  return r;
}

// geometry transformed by translate(x,y,z) * rotateZ(rz) * scale(sx,sy,sz)
const part = (geo, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rz = 0) =>
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Z, rz), new THREE.Vector3(sx, sy, sz)));
// merge mixed primitives (some indexed, some not) into one geometry
const merge = (list) => {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of geos) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  return mergeGeometries(geos);
};

export function buildKidHead({ ctx, toon, basic, mesh, head, o }) {
  const f = o.face;
  const sh = f.shape;
  const skin = toon(o.skin);
  const hg = headGeometry(sh, 40, 30);
  mesh(hg, skin, 0, 0, 0, head, { ol: 1.04 });

  // features are placed on the skull surface: ray from the front, oriented along the surface normal
  const probe = new THREE.Mesh(hg);
  probe.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const place = (x, y, lift = 0, rz = 0, origin = ORIGIN) => {
    ray.set(new THREE.Vector3(x, y, -1), Z);
    const hit = ray.intersectObject(probe, false)[0];
    const n = hit.face.normal.clone();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(n, ORIGIN, UP));
    if (rz) q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, rz));
    const p = hit.point.addScaledVector(n, lift).sub(origin);
    return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
  };

  // eyes: group at eye level so the blink (eyes.scale.y) closes them on their centre
  const eyes = new THREE.Group();
  eyes.position.set(0, f.eyeY, 0);
  head.add(eyes);
  const k = f.eyeSize;
  const whites = [], irises = [], darks = [];
  for (const s of [-1, 1]) {
    const M = place(s * f.eyeX, f.eyeY, 0, 0, eyes.position);
    const add = (list, g) => list.push(g.applyMatrix4(M));
    add(whites, part(new THREE.SphereGeometry(0.052 * k, 16, 12), 0, 0, 0, 0.9, 1.1, 0.4));
    add(irises, part(new THREE.SphereGeometry(0.037 * k, 16, 12), 0, -0.004 * k, 0.012 * k, 1, 1.05, 0.35));
    add(darks, part(new THREE.SphereGeometry(0.019 * k, 10, 8), 0, -0.004 * k, 0.019 * k, 1, 1, 0.4));
    add(whites, part(new THREE.SphereGeometry(0.011 * k, 8, 6), s * 0.011 * k, 0.014 * k, 0.026 * k));
    add(whites, part(new THREE.SphereGeometry(0.006 * k, 6, 4), -s * 0.012 * k, -0.014 * k, 0.026 * k));
    add(darks, part(new THREE.TorusGeometry(0.047 * k, 0.0075 * k, 6, 16, PI * 0.9), 0, 0.002, 0.012 * k, 1, 1.15, 1, PI * 0.05));
    add(darks, part(new THREE.CapsuleGeometry(0.004 * k, 0.014 * k, 3, 6), -s * 0.046 * k, 0.03 * k, 0.012 * k, 1, 1, 1, s * 0.9));
  }
  mesh(merge(whites), basic('#ffffff'), 0, 0, 0, eyes, { cast: false });
  mesh(merge(irises), toon(f.iris), 0, 0, 0, eyes, { cast: false });
  mesh(merge(darks), basic('#1e140c'), 0, 0, 0, eyes, { cast: false });

  // brows, cheeks, nose
  const hairC1 = o.hair.c1, hairC2 = o.hair.c2;
  const brows = [], cheeks = [];
  for (const s of [-1, 1]) {
    brows.push(part(new THREE.TorusGeometry(0.045, f.browW, 6, 12, PI * 0.55), 0, -0.045, 0, 1, 1, 1, PI * 0.225).applyMatrix4(place(s * f.eyeX, f.eyeY + f.browY, 0.004, -s * 0.12)));
    cheeks.push(new THREE.CircleGeometry(0.034, 16).applyMatrix4(place(s * 0.13, f.eyeY - 0.065, 0.003)));
  }
  mesh(merge(brows), toon(hairC1), 0, 0, 0, head, { cast: false });
  mesh(merge(cheeks), new THREE.MeshBasicMaterial({ color: '#ff8fa0', transparent: true, opacity: 0.5 }), 0, 0, 0, head, { cast: false });
  mesh(part(new THREE.SphereGeometry(0.022, 12, 8), 0, 0, 0, 1.15, 0.85, 1).applyMatrix4(place(0, f.eyeY - 0.045, 0.006)), skin, 0, 0, 0, head, { cast: false });

  // ears
  const inner = [];
  for (const s of [-1, 1]) {
    const x = s * (0.238 * sh.wide - 0.004);
    const ear = mesh(new THREE.SphereGeometry(0.056, 12, 10), skin, x, -0.02, 0.015, head, { cast: false, ol: 1.12 });
    ear.scale.set(0.42, 1, 0.72);
    ear.rotation.y = -s * 0.35;
    inner.push(part(new THREE.SphereGeometry(0.032, 10, 8), 0, 0, 0, 0.3, 0.8, 0.5).applyMatrix4(
      new THREE.Matrix4().compose(new THREE.Vector3(x + s * 0.012 * 0.42, -0.024, 0.01), new THREE.Quaternion().setFromAxisAngle(UP, -s * 0.35), new THREE.Vector3(1, 1, 1)),
    ));
  }
  mesh(merge(inner), toon('#eaa98a'), 0, 0, 0, head, { cast: false });

  // mouth: open smile by default, round open mouth when shouting (visibility driven by the animation)
  const mouthM = place(0, f.eyeY - f.mouthY, 0.004);
  const smile = new THREE.Group();
  smile.applyMatrix4(mouthM);
  head.add(smile);
  mesh(new THREE.CircleGeometry(0.04, 20, PI, PI), basic('#7a1f2a'), 0, 0, 0, smile, { cast: false });
  mesh(part(new THREE.CircleGeometry(0.02, 12, PI, PI), 0, -0.02, 0.001, 1.2, 0.8, 1), basic('#ff8a8a'), 0, 0, 0, smile, { cast: false });
  mesh(new THREE.PlaneGeometry(0.05, 0.009), basic('#ffffff'), 0, -0.005, 0.0015, smile, { cast: false });
  mesh(merge([part(new THREE.TorusGeometry(0.04, 0.005, 6, 20, PI), 0, 0, 0, 1, 1, 1, PI), new THREE.PlaneGeometry(0.082, 0.007)]), basic('#3a1414'), 0, 0, 0, smile, { cast: false });
  const mouth = mesh(new THREE.CircleGeometry(0.04, 20), basic('#7a1f2a'), 0, 0, 0, head, { cast: false });
  mouth.applyMatrix4(mouthM);
  mouth.scale.set(0.9, 1.1, 1);
  mouth.visible = false;

  buildKroos({ ctx, toon, basic, mesh, head, o, sh, place, hairC1, hairC2 });
  return { eyes, smile, mouth };
}

function buildKroos({ ctx, toon, basic, mesh, head, o, sh, place, hairC1, hairC2 }) {
  const H = o.hair;
  const hg = headGeometry(sh, 64, 48);
  // short sides and nape, fading toward the skin at the hairline
  const hairCol = new THREE.Color(hairC1);
  const fadeCol = hairCol.clone().lerp(new THREE.Color(o.skin), 0.22);
  const sideColor = (x, y, z) => {
    const t = around(x, z) < 0.25 ? 1 : clamp((y - hairline(x, z, H.front)) / H.fade, 0, 1);
    const c = fadeCol.clone().lerp(hairCol, t);
    return [c.r, c.g, c.b];
  };
  const side = shell(hg, () => [1.018, 1.018, 1.018], (x, y, z) => y > hairline(x, z, H.front), sideColor);
  mesh(side, ctx.toon('#ffffff', { vertexColors: true }), 0, 0, 0, head, { cast: false });
  // longer top, cut at the side part, tapering into the short sides (no hard step)
  const topEdge = (x, z) => H.topFrom - 0.12 * ss(clamp((around(x, z) - 0.4) / 0.6, 0, 1));
  const topKeep = (x, y, z) => y > topEdge(x, z) && (x > H.partX || z > 0.06 || y > 0.2);
  const topScale = (x, y, z) => {
    const t = ss(clamp((y - topEdge(x, z)) / 0.09, 0, 1));
    return [lerp(1.022, 1.05, t), lerp(1.022, H.vol, t), lerp(1.022, 1.055, t)];
  };
  mesh(shell(hg, topScale, topKeep), toon(hairC1), H.shiftX, 0, 0, head, { ol: 1.02 });
  hg.dispose();
  const partLine = mesh(new THREE.CapsuleGeometry(0.004, 0.12, 3, 6), basic('#2b1a0e'), H.partX + 0.006, 0.225 * H.vol, -0.04, head, { cast: false });
  partLine.rotation.x = PI / 2 - 0.35;
  // fringe locks swept from the part across the forehead, lifting slightly
  const locks = [[], []], outl = [];
  for (let i = 0; i < H.locks; i++) {
    const t = i / (H.locks - 1);
    const M = place(lerp(H.partX + 0.03, 0.16, t), H.fringeY + Math.sin(t * PI) * 0.012 - t * 0.01, H.lift);
    const lock = (s) => part(new THREE.SphereGeometry(1, 12, 8), 0, 0, 0, H.lockL * (1 - t * 0.2) * s, H.lockH * s, 0.026 * s, H.lockTilt).applyMatrix4(M);
    locks[i % 2].push(lock(1));
    outl.push(lock(1.06));
  }
  mesh(merge(locks[0]), toon(hairC1), 0, 0, 0, head);
  mesh(merge(locks[1]), toon(hairC2), 0, 0, 0, head, { cast: false });
  const ol = new THREE.Mesh(merge(outl), ctx.outlineMat);
  ol.userData.outline = true;
  head.add(ol);
}
