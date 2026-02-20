// Inline base64 audio clips (short PCM tones encoded as data URIs)
// Using Web Audio API to synthesize sounds so no external files needed

function ctx() {
  if (!window._nyx_audio_ctx) {
    window._nyx_audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window._nyx_audio_ctx;
}

function tone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime);
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch {}
}

export function playMute() {
  tone(300, 0.08, 'sine', 0.12);
  setTimeout(() => tone(220, 0.1, 'sine', 0.08), 60);
}

export function playUnmute() {
  tone(220, 0.08, 'sine', 0.08);
  setTimeout(() => tone(330, 0.1, 'sine', 0.12), 60);
}

export function playDeafen() {
  tone(250, 0.08, 'sine', 0.12);
  setTimeout(() => tone(180, 0.08, 'sine', 0.10), 70);
  setTimeout(() => tone(130, 0.12, 'sine', 0.08), 140);
}

export function playUndeafen() {
  tone(180, 0.08, 'sine', 0.08);
  setTimeout(() => tone(250, 0.08, 'sine', 0.10), 70);
  setTimeout(() => tone(330, 0.12, 'sine', 0.12), 140);
}

export function playJoin() {
  tone(440, 0.12, 'sine', 0.12);
  setTimeout(() => tone(550, 0.15, 'sine', 0.10), 100);
  setTimeout(() => tone(660, 0.18, 'sine', 0.08), 200);
}

export function playLeave() {
  tone(660, 0.12, 'sine', 0.10);
  setTimeout(() => tone(550, 0.12, 'sine', 0.10), 100);
  setTimeout(() => tone(440, 0.18, 'sine', 0.08), 200);
}
