import * as THREE from 'three';
import { buildKidHead } from '../../src/render/kid-head.js';
import { PRESETS } from '../../src/render/characters.js';

// minimal stand-in for the scene ctx (src/render/scene.js): same mesh()/toon() contract, no WebGL
function fakeCtx() {
  const outlineMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  const toon = (color, opts = {}) => new THREE.MeshToonMaterial({ color, ...opts });
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent, { ol = 0 } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    if (ol) {
      const o = new THREE.Mesh(geo, outlineMat);
      o.scale.setScalar(ol);
      o.userData.outline = true;
      m.add(o);
    }
    return m;
  };
  return { toon, mesh, outlineMat };
}

function build() {
  const ctx = fakeCtx();
  const head = new THREE.Group();
  const parts = buildKidHead({ ctx, toon: ctx.toon, basic: (c) => new THREE.MeshBasicMaterial({ color: c }), mesh: ctx.mesh, head, o: PRESETS.yazan });
  head.updateMatrixWorld(true);
  return { head, ...parts };
}

test('Yazan utilise la tête enfant et la coiffure Kroos', () => {
  expect(PRESETS.yazan.face).toBeTruthy();
  expect(PRESETS.yazan.hair.style).toBe('kroos');
});

test('rend les yeux, le sourire et la bouche que l\'animation pilote', () => {
  const { eyes, smile, mouth } = build();
  expect(eyes).toBeInstanceOf(THREE.Object3D);
  expect(smile.visible).toBe(true);
  expect(mouth.visible).toBe(false);
});

test('le clignement (eyes.scale.y) écrase les yeux sur leur centre', () => {
  const { eyes } = build();
  const box = new THREE.Box3();
  for (const c of eyes.children) box.expandByObject(c);
  // box is in head space; centre it back into eyes space
  const centre = box.getCenter(new THREE.Vector3()).sub(eyes.position);
  expect(Math.abs(centre.y)).toBeLessThan(0.01);
});

test('yeux et sourire posés devant le crâne (visage vers -z), pas enfouis', () => {
  const { eyes, smile } = build();
  for (const part of [eyes, smile]) {
    const box = new THREE.Box3().setFromObject(part);
    expect(box.max.z).toBeLessThan(-0.1);
    expect(box.min.z).toBeLessThan(-0.2);
  }
});

test('le dessus des cheveux dépasse le crâne (volume Kroos)', () => {
  const { head } = build();
  const box = new THREE.Box3().setFromObject(head);
  expect(box.max.y).toBeGreaterThan(0.235 * 1.1);
});

test('budget tablette : peu d\'objets et de triangles', () => {
  const { head } = build();
  let meshes = 0, tris = 0;
  head.traverse((m) => {
    if (!m.isMesh || m.userData.outline) return;
    meshes++;
    const g = m.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  expect(meshes).toBeLessThanOrEqual(20);
  expect(tris).toBeLessThanOrEqual(14000);
});
