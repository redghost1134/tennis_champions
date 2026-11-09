// Coach voice: the device's built-in French speech (speechSynthesis), no audio files.
// Silent when sound is muted or the API is missing; a new line always cuts the previous one.
export function createVoice(progress) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  let voice = null;
  const pick = () => {
    const vs = synth?.getVoices?.() ?? [];
    voice = vs.find((v) => v.lang === 'fr-FR') ?? vs.find((v) => v.lang?.startsWith('fr')) ?? null;
  };
  if (synth) {
    pick();
    synth.addEventListener?.('voiceschanged', pick);
  }

  return {
    say(text) {
      if (!synth || progress?.muted?.()) return;
      synth.cancel();
      // emoji and symbols are not read aloud
      const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'’-]/gu, ' '));
      u.lang = 'fr-FR';
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1.05;
      synth.speak(u);
    },
    stop() {
      synth?.cancel();
    },
  };
}

// Rough speaking time, used to pace the lesson (speechSynthesis end events are unreliable on Android).
export const speakSeconds = (text) => Math.max(1.6, text.split(/\s+/).length * 0.36);
