import * as THREE from 'three';

// Ball (with ground shadow and a short trail) and the blinking serve target.
const R = 0.12;
const TRAIL = 10;

export function createBallView(ctx) {
  const { scene, toonShared, mesh } = ctx;
  const ball = mesh(new THREE.SphereGeometry(R, 18, 14), toonShared('#e4f53b'), 0, 1, 0, scene, { ol: 1.12, cast: false });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.012, 6, 24), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  seam.rotation.x = 1.1;
  ball.add(seam);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(R * 1.3, 18), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const trailGeo = new THREE.SphereGeometry(R * 0.85, 10, 8);
  const trail = [];
  for (let i = 0; i < TRAIL; i++) {
    const m = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.visible = false;
    scene.add(m);
    trail.push(m);
  }
  const hist = [];

  // serve target: ring + dot on the court
  const target = new THREE.Group();
  const tRing = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.45, 32), new THREE.MeshBasicMaterial({ color: '#ffc72c', transparent: true, depthWrite: false }));
  const tDot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), tRing.material);
  for (const m of [tRing, tDot]) { m.rotation.x = -Math.PI / 2; target.add(m); }
  target.position.y = 0.03;
  target.visible = false;
  scene.add(target);

  const setVisible = (v) => { ball.visible = shadow.visible = v; };
  setVisible(false);

  return {
    // pos: {x,y,z} or null; trailColor: the last hitter's trail colour
    update(pos, dt, trailColor = '#ffffff') {
      if (!pos) {
        setVisible(false);
        hist.length = 0;
        trail.forEach((m) => { m.visible = false; });
        return;
      }
      setVisible(true);
      ball.position.set(pos.x, Math.max(R, pos.y), pos.z);
      ball.rotation.x += dt * 14;
      shadow.position.set(pos.x, 0.025, pos.z);
      const h = Math.max(0, pos.y);
      shadow.scale.setScalar(Math.max(0.5, 1 - h * 0.12));
      shadow.material.opacity = Math.max(0.08, 0.32 - h * 0.05);
      hist.unshift(ball.position.clone());
      if (hist.length > TRAIL) hist.pop();
      trail.forEach((m, i) => {
        const p = hist[i + 1];
        m.visible = !!p;
        if (!p) return;
        m.position.copy(p);
        const k = 1 - (i + 1) / (TRAIL + 1);
        m.scale.setScalar(k);
        m.material.opacity = 0.45 * k;
        m.material.color.set(trailColor);
      });
    },
    setTarget(p, t = 0) {
      target.visible = !!p;
      if (!p) return;
      target.position.x = p.x;
      target.position.z = p.z;
      const blink = 0.5 + 0.5 * Math.sin(t * 9);
      tRing.material.opacity = 0.45 + 0.55 * blink;
      tRing.material.color.set(blink > 0.5 ? '#ffc72c' : '#ffffff');
      target.scale.setScalar(1 + 0.12 * blink);
    },
  };
}
