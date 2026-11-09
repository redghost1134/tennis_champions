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
  // Task 10 preview: a quick match against level 1, no menus yet (Task 11 adds the screens).
  import('./game.js').then((m) => m.startQuickMatch(ctx, school, cam, document.getElementById('ui')));
}
