// audio.js — a tiny WebAudio synth: every sound is an oscillator blip shaped
// in code, so the game ships no audio files and loads nothing at run time.

let context = null;

function audioContext() {
  if (!context) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

function blip({ freq, end = null, type = 'sine', dur = 0.12, gain = 0.16, when = 0 }) {
  const ctx = audioContext();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (end) osc.frequency.exponentialRampToValueAtTime(end, t0 + dur);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() { audioContext(); },
  pickup() { blip({ freq: 520, end: 760, type: 'triangle', dur: 0.07, gain: 0.12 }); },
  place() { blip({ freq: 300, end: 210, type: 'triangle', dur: 0.08, gain: 0.14 }); },
  chop() { blip({ freq: 190, end: 90, type: 'square', dur: 0.06, gain: 0.1 }); },
  chopDone() { blip({ freq: 660, end: 990, type: 'triangle', dur: 0.1, gain: 0.14 }); },
  sizzle() { blip({ freq: 1400, end: 900, type: 'sawtooth', dur: 0.16, gain: 0.03 }); },
  grillDone() { blip({ freq: 880, dur: 0.09, gain: 0.12 }); blip({ freq: 1318, dur: 0.14, gain: 0.12, when: 0.09 }); },
  burnt() { blip({ freq: 220, end: 110, type: 'sawtooth', dur: 0.25, gain: 0.12 }); },
  plate() { blip({ freq: 980, end: 1240, type: 'sine', dur: 0.07, gain: 0.1 }); },
  bell() { blip({ freq: 1568, dur: 0.3, gain: 0.14 }); blip({ freq: 2093, dur: 0.22, gain: 0.08, when: 0.02 }); },
  coin() { blip({ freq: 988, dur: 0.08, type: 'square', gain: 0.07 }); blip({ freq: 1319, dur: 0.2, type: 'square', gain: 0.07, when: 0.08 }); },
  error() { blip({ freq: 160, end: 120, type: 'square', dur: 0.16, gain: 0.1 }); },
  expire() { blip({ freq: 392, end: 196, type: 'triangle', dur: 0.3, gain: 0.12 }); },
  trash() { blip({ freq: 240, end: 70, type: 'triangle', dur: 0.14, gain: 0.12 }); },
};
