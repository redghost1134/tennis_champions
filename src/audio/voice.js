// Coach voice: the device's built-in French speech (speechSynthesis), no audio files.
// Silent when sound is muted or the API is missing; a new line always cuts the previous one.

// Roger is a man: prefer a male French voice by name (Windows "Paul", Android Google variants frb/frd, ...);
// when the device only has a female voice, use it with a lower pitch.
const MALE = /\b(paul|thomas|henri|mathieu|nicolas|claude|antoine|daniel|guillaume|jean|pierre|louis|olivier|s[eé]bastien|fabrice|vincent|r[eé]my|g[eé]rard|yves|male|homme|masculin)\b|fr-fr-x-fr[bd]/i;
const FEMALE = /\b(female|femme|f[eé]minin)\b/i;
const MALE_PITCH = 1;
const LOWERED_PITCH = 0.75;

export function pickCoachVoice(voices) {
  const fr = voices.filter((v) => v.lang?.toLowerCase().startsWith('fr'));
  const ranked = [...fr.filter((v) => v.lang === 'fr-FR'), ...fr.filter((v) => v.lang !== 'fr-FR')];
  const male = ranked.find((v) => MALE.test(v.name) && !FEMALE.test(v.name));
  if (male) return { voice: male, pitch: MALE_PITCH };
  return { voice: ranked[0] ?? null, pitch: LOWERED_PITCH };
}

export function createVoice(progress) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  let voice = null;
  let pitch = LOWERED_PITCH;
  const pick = () => {
    ({ voice, pitch } = pickCoachVoice(synth?.getVoices?.() ?? []));
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
      u.pitch = pitch;
      synth.speak(u);
    },
    stop() {
      synth?.cancel();
    },
  };
}

// Rough speaking time, used to pace the lesson (speechSynthesis end events are unreliable on Android).
export const speakSeconds = (text) => Math.max(1.6, text.split(/\s+/).length * 0.36);
