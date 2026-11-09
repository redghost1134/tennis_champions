import { createScene } from './render/scene.js';
import { buildSchool } from './render/school.js';
import { createCamera } from './render/camera.js';

const ctx = createScene(document.getElementById('c'));
const school = buildSchool(ctx);
const cam = createCamera(ctx);

if (location.search.includes('gallery')) {
  import('./render/gallery.js').then((m) => m.startGallery(ctx, school, cam.camera));
} else {
  let last = performance.now();
  let t = 0;
  ctx.renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    school.tick(t, dt);
    cam.follow({ x: 0, z: 8 }, 'A', dt);
    ctx.render(cam.camera);
  });
}
