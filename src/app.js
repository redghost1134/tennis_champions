import { createProgress } from './core/progress.js';
import { OPPONENTS } from './core/opponents.js';
import { renderPortrait } from './render/portraits.js';
import { createEffects } from './render/effects.js';
import { createBallView } from './render/ball.js';
import { createSfx } from './audio/sfx.js';
import { createScreens } from './ui/screens.js';
import { matchOutcome } from './ui/flow.js';
import { createMatchSession } from './game.js';
import { createLessonSession } from './lesson-run.js';
import { createQualityGovernor } from './core/quality.js';

// Screen flow: profile → menu → gallery → format → match → end (→ replay / menu).
// Owns the animation loop: a slow orbiting camera behind the menus, the match session while playing.
export function startApp(ctx, school, cam, ui) {
  const progress = createProgress();
  const sfx = createSfx(progress);
  const app = {
    ctx, cam, ui, progress, sfx,
    effects: createEffects(ctx, { shake: (a) => cam.shake(a) }),
    ballView: createBallView(ctx),
  };
  const portrait = (id) => renderPortrait(ctx, id);
  let session = null;
  let level = 1, format = 'quick';
  const opp = () => OPPONENTS[level - 1];

  // keep the screen awake while playing (ignored where the API is missing or refused)
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener?.('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch {
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session) keepAwake(true);
  });

  function endSession() {
    session?.destroy();
    session = null;
    keepAwake(false);
  }
  function inMenus(name, data) {
    endSession();
    sfx.music(true);
    screens.show(name, data);
  }
  const menu = () => inMenus('menu', { profile: progress.getProfile(), muted: progress.muted() });
  const gallery = () => inMenus('gallery', { unlocked: progress.unlocked(), lessonDone: progress.unlocked() >= 1, lessonPortrait: 'roger' });

  function startLesson() {
    endSession();
    screens.hide();
    sfx.music(false);
    keepAwake(true);
    session = createLessonSession(app, {
      portrait: portrait('roger'),
      onQuit: menu,
      onDone: () => {
        const first = progress.unlocked() === 0;
        progress.recordWin(0);
        screens.show('lessonDone', {
          profile: progress.getProfile(),
          unlocks: first ? { id: OPPONENTS[0].id, name: OPPONENTS[0].name } : null,
        });
      },
    });
    if (import.meta.env.DEV) window.__session = session;
  }

  function startMatch() {
    endSession();
    screens.hide();
    sfx.music(false);
    keepAwake(true);
    session = createMatchSession(app, {
      level,
      format,
      onQuit: menu,
      onEnd: ({ winner, score, names }) => {
        const out = matchOutcome({ winner, level, unlocked: progress.unlocked() });
        if (out.won) progress.recordWin(level);
        const next = out.unlocks ? OPPONENTS[out.unlocks - 1] : null;
        screens.show('end', {
          won: out.won, names, score, profile: progress.getProfile(), oppId: opp().id,
          unlocks: next ? { id: next.id, name: next.name } : null,
        });
      },
    });
    if (import.meta.env.DEV) window.__session = session; // dev-only: lets a test harness drive tick() directly
  }

  const screens = createScreens(ui, {
    portrait,
    click: () => sfx.play('click'),
    onProfile: (id) => { progress.setProfile(id); menu(); },
    onChangeProfile: () => inMenus('profile'),
    onToggleMute: () => { const m = !progress.muted(); sfx.setMuted(m); return m; },
    onChallenge: gallery,
    onLesson: startLesson,
    onBack: (from) => (from === 'format' ? gallery() : menu()),
    onPickLevel: (l) => {
      level = l;
      inMenus('format', { profile: progress.getProfile(), oppId: opp().id });
    },
    onPickFormat: (f) => { format = f; startMatch(); },
    onReplay: startMatch,
    onMenu: menu,
  });

  if (progress.getProfile()) menu();
  else inMenus('profile');

  const governor = createQualityGovernor({ start: 'medium', warmup: 2 });
  let last = performance.now(), t = 0;
  ctx.renderer.setAnimationLoop((now) => {
    const raw = (now - last) / 1000;
    const dt = Math.min(raw, 0.05);
    last = now;
    const q = governor.tick(raw);
    if (q) ctx.setQuality(q);
    if (import.meta.env.DEV) window.__quality = governor.level;
    t += dt;
    school.tick(t, dt);
    if (session) session.tick(dt, t);
    else {
      // slow orbit around the court behind the menus
      const a = t * 0.08;
      cam.camera.position.set(Math.sin(a) * 15, 8.5, Math.cos(a) * 15);
      cam.camera.lookAt(0, 0.5, 0);
      app.effects.tick(dt);
    }
    ctx.render(cam.camera);
  });
}
