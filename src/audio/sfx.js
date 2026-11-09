// Synthesised sound effects and a small menu tune (WebAudio, no files).
// The audio context is created/resumed on the first touch or key press (browser autoplay rules).

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);

export function createSfx(progress) {
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  let ac = null, master = null, noiseBuf = null, musicTimer = 0;
  let muted = !!progress?.muted?.();

  function ensure() {
    if (!AC) return null;
    if (!ac) {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', ensure, { passive: true });
    window.addEventListener('keydown', ensure);
  }

  function tone(freq, dur, { type = 'sine', vol = 0.3, to = null, at = 0, attack = 0.005 } = {}) {
    const t0 = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  function noise(dur, { vol = 0.3, filter = 'highpass', freq = 1500, at = 0, q = 1 } = {}) {
    const t0 = ac.currentTime + at;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.02);
  }

  const SOUNDS = {
    hit() { noise(0.05, { vol: 0.5, freq: 2000 }); tone(620, 0.09, { type: 'square', vol: 0.12, to: 260 }); },
    bounce() { tone(190, 0.08, { vol: 0.35, to: 90 }); },
    net() { noise(0.22, { vol: 0.35, filter: 'lowpass', freq: 700 }); tone(120, 0.2, { type: 'triangle', vol: 0.25, to: 80 }); },
    fault() { tone(440, 0.16, { type: 'square', vol: 0.12 }); tone(311, 0.26, { type: 'square', vol: 0.12, at: 0.16 }); },
    point() { [72, 76, 79].forEach((n, i) => tone(NOTE(n), 0.14, { type: 'triangle', vol: 0.25, at: i * 0.09 })); },
    win() {
      [72, 76, 79, 84, 79, 84].forEach((n, i) => tone(NOTE(n), i === 5 ? 0.6 : 0.16, { type: 'triangle', vol: 0.28, at: i * 0.13 }));
      for (let i = 0; i < 14; i++) noise(0.08, { vol: 0.12, filter: 'bandpass', freq: 1800 + Math.random() * 1500, q: 2, at: 0.2 + i * 0.09 + Math.random() * 0.05 });
    },
    click() { tone(880, 0.05, { vol: 0.15 }); },
  };

  // menu tune: cheerful pentatonic loop
  const MELODY = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 69, 67, 69, 72];
  const BASS = [48, 48, 55, 55, 53, 53, 55, 55];
  function startMusic() {
    let step = 0;
    musicTimer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      tone(NOTE(MELODY[step % MELODY.length]), 0.22, { type: 'triangle', vol: 0.07 });
      if (step % 2 === 0) tone(NOTE(BASS[(step / 2) % BASS.length]), 0.4, { type: 'sine', vol: 0.09 });
      step++;
    }, 240);
  }

  return {
    play(name) {
      if (muted || !SOUNDS[name] || !ensure()) return;
      SOUNDS[name]();
    },
    music(on) {
      clearInterval(musicTimer);
      musicTimer = 0;
      if (on && AC) startMusic();
    },
    setMuted(b) {
      muted = !!b;
      progress?.setMuted?.(muted);
      if (master) master.gain.value = muted ? 0 : 0.55;
    },
  };
}
