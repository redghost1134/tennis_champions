import * as THREE from 'three';
import { makeCharacter, animateCharacter } from './characters.js';

// Small dedicated renderer (own canvas/context) so the main renderer's size/state is never touched.
const SIZE = 256;
const cache = new Map();
let R = null;

function setup(ctx) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = ctx.renderer.outputColorSpace;
  renderer.toneMapping = ctx.renderer.toneMapping;
  renderer.toneMappingExposure = ctx.renderer.toneMappingExposure;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e3f3ff', '#5d616c', 1.4));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.4);
  sun.position.set(-3, 5, -6);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  return { renderer, scene, camera };
}

export function renderPortrait(ctx, presetId) {
  if (cache.has(presetId)) return cache.get(presetId);
  if (!R) R = setup(ctx);
  const ch = makeCharacter(ctx, presetId);
  const u = ch.userData;
  u.shadow.visible = false;
  u.blink = 1e9;
  for (let i = 0; i < 20; i++) animateCharacter(ch, { vx: 0, vz: 0, facing: 1 }, 0.2, 0.1);
  R.scene.add(ch);
  ch.updateMatrixWorld(true);
  const hp = u.head.getWorldPosition(new THREE.Vector3());
  const s = u.scale;
  // characters face -z: camera in front, slightly to the side for a 3/4 look
  R.camera.position.set(hp.x - 0.45 * s, hp.y + 0.05 * s, hp.z - 1.9 * s);
  R.camera.lookAt(hp.x, hp.y - 0.17 * s, hp.z);
  R.renderer.render(R.scene, R.camera);
  const url = R.renderer.domElement.toDataURL('image/png');
  R.scene.remove(ch);
  // per-character geometries only; materials/textures may be shared (cached toon materials, strings texture)
  ch.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  cache.set(presetId, url);
  return url;
}
