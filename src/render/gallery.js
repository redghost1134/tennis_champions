import { makeCharacter, animateCharacter, PRESETS } from './characters.js';
import { renderPortrait } from './portraits.js';

// Dev check page (?gallery): the 12 characters in a row, bouncing and swinging in a loop.
const SIDES = [
  { kind: 'normal', side: 'fh' },
  { kind: 'normal', side: 'bh' },
  { kind: 'smash', side: 'sm' },
  { kind: 'serve', side: 'sm' },
];

export function startGallery(ctx, school, camera) {
  const ids = Object.keys(PRESETS);
  const gap = 0.95, z = 5;
  const chars = ids.map((id, i) => {
    const c = makeCharacter(ctx, id);
    c.position.set((i - (ids.length - 1) / 2) * gap, 0, z);
    c.rotation.y = Math.PI; // face the camera (+z)
    ctx.scene.add(c);
    return { c, i, swing: null, swingT: 0, next: 0.4 + i * 0.25, n: i };
  });

  const strip = document.createElement('div');
  strip.style.cssText = 'position:fixed;left:0;right:0;top:0;display:flex;justify-content:center;gap:2px;pointer-events:none';
  for (const id of ids) {
    const img = new Image();
    img.src = renderPortrait(ctx, id);
    img.title = PRESETS[id].name;
    img.style.cssText = 'width:7vw;max-width:96px;background:rgba(255,255,255,.35);border-radius:8px';
    strip.appendChild(img);
  }
  document.body.appendChild(strip);

  camera.position.set(0, 2.2, z + 9.5);
  camera.lookAt(0, 1.1, z);

  let last = performance.now(), t = 0;
  ctx.renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    school.tick(t, dt);
    for (const g of chars) {
      g.next -= dt;
      if (g.next <= 0) {
        g.swing = { ...SIDES[g.n++ % SIDES.length] };
        g.swingT = 0;
        g.next = 1.6;
      }
      if (g.swing) {
        g.swingT += dt;
        if (g.swingT > 0.35) g.swing = null;
      }
      const celebrate = Math.floor(t / 6) % 3 === 2 && g.i % 2 === 0;
      const sad = Math.floor(t / 6) % 3 === 2 && g.i % 2 === 1;
      animateCharacter(g.c, { vx: 0, vz: 0, facing: -1, swing: g.swing, swingT: g.swingT, celebrate, sad }, t, dt);
    }
    ctx.render(camera);
  });
}
