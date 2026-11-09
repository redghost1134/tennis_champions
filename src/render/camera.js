import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const tp = new THREE.Vector3();
  const tl = new THREE.Vector3();
  let first = true;
  let shakeAmt = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.fov = w < h ? 66 : 50;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    camera,
    // side 'A' is z>0 looking toward -z; 'B' is the mirror
    follow(player, side, dt) {
      const s = side === 'A' ? 1 : -1;
      tp.set(player.x * 0.5, 7.6, player.z + s * 7.4);
      tl.set(player.x * 0.25, 0, -s * 1.0);
      const f = first ? 1 : 1 - Math.exp(-dt * 3.5);
      first = false;
      camPos.lerp(tp, f);
      camLook.lerp(tl, f);
      camera.position.copy(camPos);
      camera.position.x += rnd(-1, 1) * shakeAmt;
      camera.position.y += rnd(-1, 1) * shakeAmt;
      camera.lookAt(camLook);
      shakeAmt *= Math.exp(-dt * 9);
    },
    shake(amount) { shakeAmt = Math.max(shakeAmt, amount); },
  };
}
