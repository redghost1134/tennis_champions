import { createMatch, viewFor } from './core/match.js';
import { createAI } from './core/ai.js';
import { OPPONENTS } from './core/opponents.js';
import { createRng } from './core/rng.js';
import { serviceBox } from './core/court.js';
import { serveSide } from './core/scoring.js';
import { aimPoint } from './core/serve.js';
import { makeCharacter, animateCharacter, PRESETS } from './render/characters.js';
import { createControls } from './ui/controls.js';
import { createHud } from './ui/hud.js';
import { messagesFor } from './ui/messages.js';

const SFX_FOR = { hit: 'hit', serve: 'hit', bounce: 'bounce', net: 'net', fault: 'fault', double_fault: 'fault', out: 'fault', point: 'point', match: 'win' };
const END_DELAY = 2.2; // celebrate on court before the end screen

// One match: human = side A (z>0, camera behind), champion = side B.
// app = { ctx, cam, ui, progress, sfx, effects, ballView }. The app owns the animation loop and calls tick().
export function createMatchSession(app, { level, format, onEnd = () => {}, onQuit = () => {} }) {
  const { ctx, cam, ui, progress, sfx, effects, ballView } = app;
  const meId = progress.getProfile() ?? 'yazan';
  const opp = OPPONENTS[level - 1];
  const names = { A: PRESETS[meId].name, B: opp.name };

  const hud = createHud(ui);
  const controls = createControls(ui, {
    onQuit: () => onQuit(),
    onClick: () => sfx.play('click'),
    muted: progress.muted(),
    onMute: (m) => sfx.setMuted(m),
  });

  const chars = { A: makeCharacter(ctx, meId), B: makeCharacter(ctx, opp.id) };
  chars.B.rotation.y = Math.PI;
  for (const c of Object.values(chars)) {
    ctx.scene.add(c);
    c.userData.onDust = (p) => effects.dust(p);
  }
  const facing = { A: 1, B: -1 };

  const seed = (Math.random() * 2 ** 31) | 0;
  const match = createMatch({ format, rng: createRng(seed), speedB: opp.ai.speed, errorScaleB: opp.ai.errorScale });
  const ai = createAI(opp.ai, createRng(seed ^ 0x5bd1e995), 'B');
  if (import.meta.env.DEV) Object.assign(window, { __match: match, __controls: controls }); // dev-only, for manual checks
  let lastPoint = null;
  let endT = -1;

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
    if (events.some((e) => e.type === 'match')) endT = END_DELAY;
  }

  return {
    names,
    tick(dt, t) {
      const paused = controls.paused;
      if (!paused) {
        handle(match.update(dt, controls.read(), ai.decide(viewFor(match, 'B'), dt)), match.state);
        effects.tick(dt);
      }
      const s = match.state;

      if (endT > 0 && !paused) {
        endT -= dt;
        if (endT <= 0) onEnd({ winner: s.score.winner, score: s.score, names });
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
      ballView.update(s.phase === 'match_over' ? null : bp, dt, PRESETS[chars[hitter].userData.id].trail);

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
    },
    destroy() {
      controls.destroy();
      hud.destroy();
      ballView.update(null, 0);
      ballView.setTarget(null);
      for (const c of Object.values(chars)) {
        ctx.scene.remove(c);
        // per-character geometries only; materials/textures are shared caches
        c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
    },
  };
}
