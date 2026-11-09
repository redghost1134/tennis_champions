import { pickCoachVoice } from '../../src/audio/voice.js';

const v = (name, lang = 'fr-FR') => ({ name, lang });

test('Windows : choisit Microsoft Paul (masculin) plutôt que Hortense, Julie ou Google', () => {
  const voices = [v('Microsoft Hortense - French (France)'), v('Microsoft Julie - French (France)'), v('Microsoft Paul - French (France)'), v('Google français'), v('Google US English', 'en-US')];
  const r = pickCoachVoice(voices);
  expect(r.voice.name).toMatch(/Paul/);
  expect(r.pitch).toBe(1);
});

test('Android : variantes masculines Google (fr-fr-x-frb / frd) reconnues', () => {
  expect(pickCoachVoice([v('fr-fr-x-fra-local'), v('fr-fr-x-frd-local')]).voice.name).toBe('fr-fr-x-frd-local');
  expect(pickCoachVoice([v('fr-fr-x-frb-network'), v('fr-fr-x-vlf-local')]).voice.name).toBe('fr-fr-x-frb-network');
});

test('noms ou mentions masculines (Thomas, male, homme)', () => {
  expect(pickCoachVoice([v('Amélie'), v('Thomas')]).voice.name).toBe('Thomas');
  expect(pickCoachVoice([v('French female'), v('French male')]).voice.name).toBe('French male');
  expect(pickCoachVoice([v('Voix femme'), v('Voix homme')]).voice.name).toBe('Voix homme');
});

test('aucune voix masculine : voix française disponible, plus grave', () => {
  const r = pickCoachVoice([v('Google français'), v('Google UK English Male', 'en-GB')]);
  expect(r.voice.name).toBe('Google français');
  expect(r.pitch).toBeLessThan(0.85);
});

test('fr-CA ou fr-BE acceptées si pas de fr-FR', () => {
  expect(pickCoachVoice([v('Felix', 'fr-CA')]).voice.name).toBe('Felix');
});

test('aucune voix française : null, plus grave quand même', () => {
  const r = pickCoachVoice([v('Daniel', 'en-GB')]);
  expect(r.voice).toBe(null);
  expect(r.pitch).toBeLessThan(0.85);
});
