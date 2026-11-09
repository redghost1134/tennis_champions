// Adaptive render quality: rolling average fps over 3 s. Below 45 fps → one level down;
// above 58 fps for 10 s → one level up (never above 'high'). Pure logic; scene.js applies the level.
const LEVELS = ['low', 'medium', 'high'];
const WINDOW = 3;
const DOWN_FPS = 45;
const UP_FPS = 58;
const UP_AFTER = 10;
const MAX_FRAME = 0.5; // longer frames = tab in background / debugger: ignored

export function createQualityGovernor({ start = 'medium', warmup = 0 } = {}) {
  let i = Math.max(0, LEVELS.indexOf(start));
  let samples = [], total = 0, good = 0, age = 0;
  const reset = () => { samples = []; total = 0; good = 0; };

  return {
    get level() {
      return LEVELS[i];
    },
    // dt: real frame time in seconds (unclamped). Returns the new level when it changes, else null.
    tick(dt) {
      if (!(dt > 0) || !Number.isFinite(dt) || dt > MAX_FRAME) return null;
      age += dt;
      if (age <= warmup) return null;
      samples.push(dt);
      total += dt;
      while (total - samples[0] >= WINDOW) total -= samples.shift();
      const fps = samples.length / total;
      if (total >= WINDOW - 1e-6 && fps < DOWN_FPS) {
        reset();
        if (i > 0) { i--; return LEVELS[i]; }
        return null;
      }
      good = fps > UP_FPS ? good + dt : 0;
      if (good >= UP_AFTER - 1e-6 && i < LEVELS.length - 1) {
        reset();
        i++;
        return LEVELS[i];
      }
      return null;
    },
  };
}
