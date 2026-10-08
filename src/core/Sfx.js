/**
 * Tiny synthesised sound effects (Web Audio, no files). Every call is safe before the first click:
 * the audio context is created lazily and stays silent until the browser allows it.
 */
let ctx = null, master = null, noiseBuf = null;
export const Sfx = {
  enabled: true,
  init() {
    if (ctx || typeof AudioContext === 'undefined') return;
    try { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch (e) { ctx = null; }
  },
  resume() { this.init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
  tone(freq, dur, { type = 'square', vol = 0.25, slide = 0, delay = 0 } = {}) {
    if (!this.enabled || !ctx || ctx.state !== 'running') return; const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, { freq = 1200, q = 1, vol = 0.4, type = 'bandpass', delay = 0 } = {}) {
    if (!this.enabled || !ctx || ctx.state !== 'running') return; const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  play(name) {
    switch (name) {
      case 'chop': this.noise(0.12, { freq: 900, q: 2, vol: 0.6 }); this.tone(140, 0.12, { type: 'triangle', vol: 0.4, slide: -60 }); break;
      case 'mine': this.noise(0.08, { freq: 3200, q: 4, vol: 0.4 }); this.tone(900, 0.1, { type: 'square', vol: 0.12, slide: -300 }); break;
      case 'dig': this.noise(0.18, { freq: 380, q: 0.8, vol: 0.55, type: 'lowpass' }); break;
      case 'hammer': this.tone(1300, 0.05, { type: 'square', vol: 0.18 }); this.noise(0.05, { freq: 2500, q: 3, vol: 0.3 }); break;
      case 'pick': this.noise(0.06, { freq: 1800, q: 1, vol: 0.25 }); this.tone(520, 0.06, { type: 'sine', vol: 0.15 }); break;
      case 'perfect': [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, { type: 'square', vol: 0.12, delay: i * 0.05 })); break;
      case 'good': this.tone(660, 0.09, { type: 'square', vol: 0.1 }); break;
      case 'miss': this.tone(180, 0.15, { type: 'sawtooth', vol: 0.1, slide: -60 }); break;
      case 'unit': this.tone(520, 0.07, { type: 'triangle', vol: 0.18 }); this.tone(780, 0.09, { type: 'triangle', vol: 0.18, delay: 0.06 }); break;
      case 'pickup': this.tone(440, 0.07, { type: 'square', vol: 0.12, slide: 400 }); break;
      case 'drop': this.noise(0.15, { freq: 250, vol: 0.5, type: 'lowpass' }); this.tone(90, 0.15, { type: 'sine', vol: 0.35 }); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(0.05, { freq: 2200, q: 2, vol: 0.3, delay: i * 0.09 }); break;
      case 'done': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.12, delay: i * 0.09 })); break;
      case 'ui': this.tone(740, 0.04, { type: 'square', vol: 0.08 }); break;
      case 'deny': this.tone(200, 0.12, { type: 'square', vol: 0.1 }); this.tone(150, 0.14, { type: 'square', vol: 0.1, delay: 0.1 }); break;
      case 'door': this.noise(0.25, { freq: 700, q: 6, vol: 0.06 }); this.tone(190, 0.22, { type: 'triangle', vol: 0.04, slide: 60 }); break;
      case 'jump': this.tone(300, 0.14, { type: 'square', vol: 0.09, slide: 500 }); break;
      case 'ring': for (let i = 0; i < 4; i++) { this.tone(440, 0.18, { type: 'sine', vol: 0.12, delay: i * 0.5 }); this.tone(480, 0.18, { type: 'sine', vol: 0.12, delay: i * 0.5 }); } break;
      case 'bell': [392, 330, 294, 262].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', vol: 0.16, delay: i * 0.55 })); break;
      case 'lift': this.tone(80, 1.6, { type: 'sawtooth', vol: 0.08, slide: 30 }); this.noise(1.4, { freq: 300, vol: 0.12, type: 'lowpass' }); this.tone(880, 0.2, { type: 'square', vol: 0.06, delay: 1.5 }); break;
      case 'cash': this.tone(1568, 0.08, { type: 'square', vol: 0.1 }); this.tone(2093, 0.18, { type: 'square', vol: 0.1, delay: 0.08 }); break;
      case 'horse': for (let i = 0; i < 8; i++) this.noise(0.04, { freq: 600, q: 1, vol: 0.35, delay: i * 0.13 + (i % 2) * 0.05 }); break;
      default: break;
    }
  },
};
