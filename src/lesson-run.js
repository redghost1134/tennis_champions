import { createMatch, viewFor } from './core/match.js';
import { createAI } from './core/ai.js';
import { createRng } from './core/rng.js';
import { serviceBox } from './core/court.js';
import { serveSide } from './core/scoring.js';
import { aimPoint } from './core/serve.js';
import { createLesson, LESSON_STEPS } from './core/lesson.js';
import { makeCharacter, animateCharacter, PRESETS } from './render/characters.js';
import { createControls } from './ui/controls.js';
import { createHud } from './ui/hud.js';
import { createCoach } from './ui/coach.js';
import { messagesFor } from './ui/messages.js';
import { createVoice, speakSeconds } from './audio/voice.js';

// Coach for the final point: gentler than Toto, never lobs or smashes.
export const COACH_AI = { speed: 1.4, reaction: 0.6, aimWide: 0, errorScale: 1.8, lob: 0, smash: 0, red: 0, yellow: 0 };
const IDLE = { move: { x: 0, z: 0 }, armed: null, servePress: false, aimDir: 0 };
const PAUSE_AFTER = 1.6; // seconds of "Bravo !" / "Pas grave" before the next attempt
const SFX_FOR = { hit: 'hit', serve: 'hit', bounce: 'bounce', net: 'net', fault: 'fault', double_fault: 'fault', out: 'fault' };

// The lesson session: same court and controls as a match, driven step by step by core/lesson.js.
export function createLessonSession(app, { portrait, onDone = () => {}, onQuit = () => {} }) {
  const { ctx, cam, ui, progress, sfx, effects, ballView } = app;
  const meId = progress.getProfile() ?? 'yazan';
  const names = { A: PRESETS[meId].name, B: PRESETS.roger.name };
  const voice = createVoice(progress);
  const lesson = createLesson();

  const hud = createHud(ui);
  const controls = createControls(ui, {
    onQuit: () => onQuit(),
    onClick: () => sfx.play('click'),
    muted: progress.muted(),
    onMute: (m) => { sfx.setMuted(m); if (m) voice.stop(); },
  });
  const coach = createCoach(ui, { portrait });

  const chars = { A: makeCharacter(ctx, meId), B: makeCharacter(ctx, 'roger') };
  chars.B.rotation.y = Math.PI;
  for (const c of Object.values(chars)) {
    ctx.scene.add(c);
    c.userData.onDust = (p) => effects.dust(p);
  }
  const facing = { A: 1, B: -1 };

  let match, ai = null;
  let wait = 0; // seconds before the coach feeds / the next attempt starts
  let pending = null; // 'build' (rebuild the match for the current step) after `wait`
  let fed = false;
  let finished = false;
  let ended = false; // lesson over: keep celebrating, stop playing
  let lastPoint = null;

  function speak(line) {
    coach.say(line);
    voice.say(line);
    return speakSeconds(line);
  }

  function build() {
    const st = lesson.step;
    const seed = (Math.random() * 2 ** 31) | 0;
    match = createMatch({ format: st.setup.match ? 'quick' : 'set', rng: createRng(seed), firstServer: st.setup.server,
      speedB: COACH_AI.speed, errorScaleB: COACH_AI.errorScale });
    ai = st.setup.match ? createAI(COACH_AI, createRng(seed ^ 0x9e3779b9), 'B') : null;
    if (import.meta.env.DEV) Object.assign(window, { __match: match, __lesson: lesson, __controls: controls });
    fed = false;
    lastPoint = null;
    controls.highlight(st.highlight);
    hud.showScore(!!st.setup.match);
    coach.progress(lesson.index, LESSON_STEPS.length);
  }

  function startStep() {
    build();
    wait = speak(lesson.step.line);
  }

  function feedIfNeeded() {
    const st = lesson.step;
    if (!st.setup.feed || fed || wait > 0) return;
    const a = match.state.players.A;
    // aim at the player's forehand so a still player can return it
    fed = match.feed({ to: { x: a.x + 0.5, z: 5.5 }, kind: st.setup.feed });
  }

  function handle(events, s, input) {
    for (const e of events) {
      const snd = SFX_FOR[e.type];
      if (snd) sfx.play(snd);
      if (e.type === 'hit' && e.side === 'A') controls.disarm();
      if (e.type === 'point') lastPoint = e.winner;
      effects.onEvent(e, s.ball ? s.ball.p : null);
    }
    if (lesson.step.setup.match) for (const m of messagesFor(events, s.score, names)) hud.flash(m.text, m.color);
    if (pending || finished) return;
    const r = lesson.onFrame(events, s, input);
    if (r === 'stay') return;
    speak(lesson.message);
    if (r === 'done') {
      finished = true;
      sfx.play('win');
      effects.onEvent({ type: 'point' }, { x: s.players.A.x, y: 2.5, z: s.players.A.z });
      controls.highlight(null);
      coach.point(null);
      wait = 2.4;
      return;
    }
    if (r === 'next') sfx.play('point');
    pending = r;
    wait = PAUSE_AFTER;
  }

  startStep();

  return {
    names,
    tick(dt, t) {
      const paused = controls.paused;
      if (!paused && !ended) {
        if (wait > 0) wait -= dt;
        if (wait <= 0 && pending) {
          const was = pending;
          pending = null;
          if (was === 'next') startStep();
          else {
            lesson.restart();
            build();
            wait = 0.6;
          }
        }
        if (finished && wait <= 0) {
          finished = false;
          ended = true;
          controls.setMode('hidden');
          coach.destroy(); // the end screen takes over
          hud.showScore(false);
          onDone();
        }
        if (!pending) feedIfNeeded();
        const input = controls.read();
        const inB = ai ? ai.decide(viewFor(match, 'B'), dt) : IDLE;
        handle(match.update(dt, input, inB), match.state, input);
        effects.tick(dt);
      }
      const s = match.state;

      const serving = s.phase === 'serve_aim' || s.phase === 'serve_power';
      const iServe = serving && s.score.server === 'A';
      controls.setMode(ended || s.phase === 'match_over' ? 'hidden' : iServe ? 'serve' : 'rally');
      if (lesson.step.setup.match) hud.setScore(s.score, names);
      hud.showGauge(iServe && s.phase === 'serve_power' ? s.gauge : null);
      hud.showAim(iServe && s.phase === 'serve_aim' ? s.aimSlot : null);
      const target = lesson.target ?? (iServe ? aimPoint(serviceBox('A', serveSide(s.score)), s.aimSlot, 'A') : null);
      ballView.setTarget(target, t);
      coach.point(lesson.done ? null : controls.rectOf(lesson.step.highlight));

      let bp = s.ball ? s.ball.p : null;
      if (!bp && s.phase === 'serve_power') {
        const sv = s.players[s.score.server];
        bp = { x: sv.x - 0.25 * facing[s.score.server], y: 2.25 + Math.sin(t * 3) * 0.12, z: sv.z };
      }
      const hitter = s.lastHitter ?? s.score.server;
      ballView.update(bp, dt, PRESETS[chars[hitter].userData.id].trail);

      const over = s.phase === 'point_over' || lesson.done;
      const winner = lesson.done ? 'A' : lastPoint;
      for (const side of ['A', 'B']) {
        const p = s.players[side], c = chars[side];
        c.position.set(p.x, 0, p.z);
        animateCharacter(c, {
          vx: paused ? 0 : p.vx, vz: paused ? 0 : p.vz, facing: facing[side], swing: p.swing, ballPos: bp,
          celebrate: (over && winner === side) || (lesson.done && side === 'B'), sad: !lesson.done && over && winner && winner !== side,
        }, t, paused ? 0 : dt);
      }
      cam.follow(s.players.A, 'A', dt);
    },
    destroy() {
      voice.stop();
      controls.destroy();
      hud.destroy();
      coach.destroy();
      ballView.update(null, 0);
      ballView.setTarget(null);
      for (const c of Object.values(chars)) {
        ctx.scene.remove(c);
        c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
    },
  };
}
