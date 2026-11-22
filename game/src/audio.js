// Synthesised WebAudio sounds for SIMMER — no audio files, everything is generated.
// Sizzle (filtered noise) for a simmering pot, a pluck for a played card, a bright
// ding for a finished dish, and a soft crowd swell for a match win.
let context = null;
let muted = false;

function ensureContext() {
  if (context) return context;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
  } catch {
    context = null;
  }
  return context;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

// Call from a user gesture so the browser allows audio to start.
export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(frequency, duration, type, volume, when = 0) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const start = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noiseBurst(duration, volume, filterFrequency, when = 0) {
  const ctx = ensureContext();
  if (!ctx || muted) return;
  const start = ctx.currentTime + when;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

export function playSound(name) {
  if (muted) return;
  if (name === 'place') {
    tone(520, 0.09, 'triangle', 0.12);
    noiseBurst(0.05, 0.05, 2400);
  } else if (name === 'sizzle') {
    noiseBurst(0.7, 0.16, 5200);
    noiseBurst(0.5, 0.08, 3400, 0.08);
  } else if (name === 'dish') {
    tone(660, 0.16, 'sine', 0.16);
    tone(880, 0.22, 'sine', 0.16, 0.09);
    tone(1320, 0.3, 'sine', 0.1, 0.18);
  } else if (name === 'spice') {
    tone(340, 0.12, 'square', 0.06);
    tone(510, 0.14, 'square', 0.05, 0.07);
  } else if (name === 'click') {
    tone(700, 0.05, 'triangle', 0.08);
  } else if (name === 'win') {
    [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.35, 'sine', 0.14, index * 0.12));
    noiseBurst(1.2, 0.05, 1800, 0.1);
  } else if (name === 'lose') {
    tone(392, 0.3, 'sine', 0.12);
    tone(311, 0.4, 'sine', 0.12, 0.2);
  }
}
