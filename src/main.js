import { createScene } from './render/scene.js';
import { buildSchool } from './render/school.js';
import { createCamera } from './render/camera.js';

const ctx = createScene(document.getElementById('c'));
const school = buildSchool(ctx);
const cam = createCamera(ctx);
if (import.meta.env.DEV) window.__tc = ctx; // dev-only handle for perf checks

if (location.search.includes('gallery')) {
  import('./render/gallery.js').then((m) => m.startGallery(ctx, school, cam.camera));
} else {
  import('./app.js').then((m) => m.startApp(ctx, school, cam, document.getElementById('ui')));
}
