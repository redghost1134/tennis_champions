import { createMatch, viewFor } from './core/match.js';
import { createAI } from './core/ai.js';
import { OPPONENTS } from './core/opponents.js';
import { createRng } from './core/rng.js';
import { createProgress } from './core/progress.js';
import { serviceBox } from './core/court.js';
import { serveSide } from './core/scoring.js';
import { aimPoint } from './core/serve.js';
import { makeCharacter, animateCharacter, PRESETS } from './render/characters.js';
import { createEffects } from './render/effects.js';
import { createBallView } from './render/ball.js';
import { createControls } from './ui/controls.js';
import { createHud } from './ui/hud.js';
import { messagesFor } from './ui/messages.js';
import { createSfx } from './audio/sfx.js';

const SFX_FOR = { hit: 'hit', serve: 'hit', bounce: 'bounce', net: 'net', fault: 'fault', double_fault: 'fault', out: 'fault', point: 'point', match: 'win' };
const RESTART_AFTER = 6;

// Human = side A (z>0, camera behind), champion = side B. Wires match ↔ render ↔ UI ↔ sound.
export function startQuickMatch(ctx, school, cam, uiRoot, { format = 'quick', level = 1 } = {}) {
  const progress = createProgress();
  const meId = progress.getProfile() ?? 'yazan';
  const opp = OPPONENTS[level - 1];
  const names = { A: PRESETS[meId].name, B: opp.name };

  const sfx = createSfx(progress);
  const hud = createHud(uiRoot);
  const controls = createControls(uiRoot, {
    onQuit: () => location.reload(),
    onClick: () => sfx.play('click'),
    muted: progress.muted(),
    onMute: (m) => sfx.setMuted(m),
  });
  const effects = createEffects(ctx, { shake: (a) => cam.shake(a) });
  const ballView = createBallView(ctx);

  const chars = { A: makeCharacter(ctx, meId), B: makeCharacter(ctx, opp.id) };
  chars.B.rotation.y = Math.PI;
  for (const c of Object.values(chars)) {
    ctx.scene.add(c);
    c.userData.onDust = (p) => effects.dust(p);
  }
  const facing = { A: 1, B: -1 };

  let match, ai, t = 0, lastPoint = null, overT = 0;
  function newMatch() {
    const seed = (Math.random() * 2 ** 31) | 0;
    match = createMatch({ format, rng: createRng(seed), speedB: opp.ai.speed, errorScaleB: opp.ai.errorScale });
    ai = createAI(opp.ai, createRng(seed ^ 0x5bd1e995), 'B');
    lastPoint = null;
    overT = 0;
    if (import.meta.env.DEV) Object.assign(window, { __match: match, __controls: controls }); // dev-only, for manual checks
  }
  newMatch();

  function handle(events, s) {
    for (const e of events) {
      const snd = SFX_FOR[e.type];
      if (snd) sfx.play(snd);
      if (e.type === 'hit' && e.side === 'A') controls.disarm();
      if (e.type === 'point') lastPoint = e.winner;
      let pos = s.ball ? s.ball.p : null;
      if (e.type === 'point') {
        const w = s.players[e.winner];
        pos = { x: w.x, y: 2.5, z: w.z };
      }
      effects.onEvent(e, pos);
    }
    for (const m of messagesFor(events, s.score, names)) hud.flash(m.text, m.color);
    if (events.some((e) => e.type === 'match')) {
      hud.flash(`${names[s.score.winner]} gagne ! 🏆`, '#ffc72c');
      overT = RESTART_AFTER;
    }
  }

  let last = performance.now();
  ctx.renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    school.tick(t, dt);

    const paused = controls.paused;
    if (!paused) {
      const inA = controls.read();
      const inB = ai.decide(viewFor(match, 'B'), dt);
      handle(match.update(dt, inA, inB), match.state);
      effects.tick(dt);
    }
    const s = match.state;

    if (s.phase === 'match_over' && !paused) {
      overT -= dt;
      if (overT <= 0) newMatch();
    }

    // UI mode, gauge, aim target
    const serving = s.phase === 'serve_aim' || s.phase === 'serve_power';
    const iServe = serving && s.score.server === 'A';
    controls.setMode(s.phase === 'match_over' ? 'hidden' : iServe ? 'serve' : 'rally');
    hud.setScore(s.score, names);
    hud.showGauge(iServe && s.phase === 'serve_power' ? s.gauge : null);
    hud.showAim(iServe && s.phase === 'serve_aim' ? s.aimSlot : null);
    ballView.setTarget(iServe ? aimPoint(serviceBox('A', serveSide(s.score)), s.aimSlot, 'A') : null, t);

    // ball: in play, or held up by the server during the toss
    let bp = s.ball ? s.ball.p : null;
    if (!bp && s.phase === 'serve_power') {
      const sv = s.players[s.score.server];
      bp = { x: sv.x - 0.25 * facing[s.score.server], y: 2.25 + Math.sin(t * 3) * 0.12, z: sv.z };
    }
    const hitter = s.lastHitter ?? s.score.server;
    ballView.update(bp, dt, PRESETS[chars[hitter].userData.id].trail);

    // characters
    const over = s.phase === 'point_over' || s.phase === 'match_over';
    const winner = s.phase === 'match_over' ? s.score.winner : lastPoint;
    for (const side of ['A', 'B']) {
      const p = s.players[side], c = chars[side];
      c.position.set(p.x, 0, p.z);
      animateCharacter(c, {
        vx: paused ? 0 : p.vx, vz: paused ? 0 : p.vz, facing: facing[side], swing: p.swing,
        ballPos: bp, celebrate: over && winner === side, sad: over && winner && winner !== side,
      }, t, paused ? 0 : dt);
    }

    cam.follow(s.players.A, 'A', dt);
    ctx.render(cam.camera);
  });
}
