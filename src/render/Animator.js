import { HIP_H, setProp } from './SimRig.js';

// joint channel indices
const I = {};
['HY', 'HZ', 'HR', 'HYAW', 'HP', 'SPX', 'SPY', 'SPZ', 'NKX', 'NKY', 'NKZ', 'HDX', 'HDY', 'HDZ',
 'SLX', 'SLY', 'SLZ', 'ELL', 'WLL', 'SRX', 'SRY', 'SRZ', 'ERR', 'WRR',
 'TLX', 'TLZ', 'KL', 'AL', 'TRX', 'TRZ', 'KR', 'AR', 'MO', 'SM', 'EC', 'LIE', 'BR'].forEach((k, i) => (I[k] = i));
const N = 40;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FIDGETS = {
  cheerful: ['stretch', 'hips', 'lookup', 'shift', 'scratch', 'hum'],
  grumpy: ['crossarms', 'sigh', 'watch', 'shift', 'crossarms'],
  shy: ['scratch', 'crossarms', 'shift', 'lookdown', 'lookdown'],
  busy: ['watch', 'phone', 'sigh', 'shift', 'phone'],
};

/** Procedural animation: a lower-body module + an upper-body module, smoothed per joint. */
export class Animator {
  constructor(rig, style = {}) {
    this.rig = rig; this.cur = new Float32Array(N); this.tgt = new Float32Array(N);
    this.style = { trait: 'cheerful', bounce: 1, slouch: 0, swing: 1, stride: 1, fidget: 1, ...style };
    this.t = Math.random() * 50; this.ph = Math.random() * 6; this.shift = 0; this.shiftT = 0; this.shiftGoal = 0;
    this.fid = null; this.fidT = 0; this.fidDur = 0; this.nextFid = 2 + Math.random() * 5; this.blinkT = 2 + Math.random() * 3; this.blinking = 0;
    this.gest = 0; this.gestT = 0; this.upperT = 0; this.upper = 'idle'; this.lower = 'stand'; this.syl = 0; this.laugh = 0;
    this.cur[I.EC] = 0;
  }
  setUpper(u) { if (u !== this.upper) { this.upper = u; this.upperT = 0; } }
  /** o: {lower, upper, dist, speed, run, turning, lookYaw, lookPitch, mood, tired, speaking, laugh, prop:{handR,handL,chest}} */
  update(dt, o) {
    const T = this.tgt, c = this.cur; this.t += dt; this.upperT += dt; T.fill(0);
    this.lower = o.lower || 'stand'; this.setUpper(o.upper || 'idle');
    if (o.dist) this.ph += o.dist * Math.PI / (0.74 / this.style.stride);
    else if (o.turning) this.ph += dt * 3.2;
    // slow weight shift while still
    this.shiftT -= dt; if (this.shiftT <= 0) { this.shiftT = 3 + Math.random() * 5; this.shiftGoal = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
    this.shift += (this.shiftGoal - this.shift) * Math.min(1, dt * 1.4);
    this.doLower(dt, o); this.doUpper(dt, o); this.doHeadFace(dt, o);
    // smoothing
    const k = 1 - Math.exp(-dt * (this.upper === 'hammer' || this.upper === 'laugh' ? 24 : 15));
    for (let i = 0; i < N; i++) c[i] += (T[i] - c[i]) * (i === I.EC ? Math.min(1, dt * 30) : k);
    this.apply(o);
  }

  // ---------------- lower body ----------------
  doLower(dt, o) {
    const T = this.tgt, t = this.t, st = this.style, ph = this.ph, low = this.lower;
    // arm defaults hang slightly out
    T[I.SLZ] = -0.07; T[I.SRZ] = 0.07; T[I.TLZ] = -0.03; T[I.TRZ] = 0.03;
    const slouch = st.slouch;
    if (low === 'walk') {
      const run = o.run ? 1 : 0, amt = clamp((o.speed || 1.8) / 1.9, 0.35, 1.5) * (run ? 1.25 : 1), A = (0.55 + run * 0.35) * clamp(amt, 0.5, 1.3);
      const sl = Math.sin(ph), sr = -sl, cl = Math.cos(ph), cr = -cl;
      T[I.TLX] = -sl * A; T[I.TRX] = -sr * A;
      T[I.KL] = 0.08 + Math.max(0, cl) * (0.85 + run * 0.5); T[I.KR] = 0.08 + Math.max(0, cr) * (0.85 + run * 0.5);
      T[I.AL] = -T[I.TLX] * 0.45 - T[I.KL] * 0.35; T[I.AR] = -T[I.TRX] * 0.45 - T[I.KR] * 0.35;
      T[I.HY] = -0.015 - (Math.abs(Math.cos(ph)) * 0.04 + run * 0.03) * st.bounce; T[I.HR] = sl * 0.05 * (st.sway || 1); T[I.HYAW] = sl * 0.12; T[I.SPY] = -sl * 0.16;
      T[I.SPX] = 0.04 + run * 0.2 + slouch * 0.12 + (o.lean || 0); T[I.HZ] = 0;
      const sw = (0.5 + run * 0.5) * st.swing * clamp(amt, 0.6, 1.3);
      T[I.SLX] = sl * sw; T[I.SRX] = sr * sw; T[I.ELL] = -(0.18 + run * 1.0 + Math.max(0, -sl) * 0.2); T[I.ERR] = -(0.18 + run * 1.0 + Math.max(0, -sr) * 0.2);
      T[I.NKY] = sl * 0.05; T[I.HDX] = slouch * 0.15 - run * 0.05;
    } else if (low === 'sit') {
      T[I.HY] = -0.435; T[I.HZ] = -0.06; T[I.TLX] = T[I.TRX] = -1.5; T[I.KL] = T[I.KR] = 1.5; T[I.AL] = T[I.AR] = 0.0; T[I.TLZ] = -0.07; T[I.TRZ] = 0.07;
      T[I.SPX] = slouch * 0.2 + Math.sin(t * 1.7) * 0.012; T[I.HR] = this.shift * 0.02;
      T[I.SLX] = 0.0; T[I.SRX] = 0.0;
    } else if (low === 'lie') {
      T[I.LIE] = 1; T[I.KL] = T[I.KR] = 0.12; T[I.SPX] = Math.sin(t * 1.4) * 0.018; T[I.TLZ] = -0.06; T[I.TRZ] = 0.06; T[I.SLZ] = -0.12; T[I.SRZ] = 0.12; T[I.HDX] = 0;
    } else if (low === 'crouch') {
      T[I.HY] = -0.3; T[I.TLX] = T[I.TRX] = -1.15; T[I.KL] = T[I.KR] = 1.9; T[I.AL] = T[I.AR] = -0.7; T[I.SPX] = 0.35 + slouch * 0.1; T[I.HZ] = -0.06;
    } else { // stand
      const s = this.shift;
      T[I.HR] = s * 0.05; T[I.HY] = -Math.abs(s) * 0.015 - (Math.sin(t * 1.8) * 0.004); T[I.SPX] = slouch * 0.18 + Math.sin(t * 1.8) * 0.014 + (o.tired ? 0.1 : 0); T[I.SPZ] = -s * 0.03;
      T[I.TLX] = s > 0 ? -0.04 : 0; T[I.TRX] = s < 0 ? -0.04 : 0; T[I.KL] = s > 0.2 ? 0.14 : 0.03; T[I.KR] = s < -0.2 ? 0.14 : 0.03; T[I.AL] = T[I.AR] = 0;
      T[I.SLX] = Math.sin(t * 0.9) * 0.025; T[I.SRX] = Math.sin(t * 0.9 + 1) * 0.025; T[I.ELL] = -0.12; T[I.ERR] = -0.12;
      T[I.HDX] = slouch * 0.12;
    }
  }

  // ---------------- upper body ----------------
  doUpper(dt, o) {
    const T = this.tgt, t = this.t, ut = this.upperT, u = this.upper, st = this.style, rig = this.rig;
    let props = { handR: null, handL: null, chest: null };
    const still = this.lower !== 'walk';
    switch (u) {
      case 'idle': if (still && this.lower === 'stand') { this.fidgets(dt, o); if (this.fid === 'phone') props.handR = 'phone'; } else if (this.lower === 'sit') this.sitFidgets(dt, o); break;
      case 'carry':
        T[I.SLX] = T[I.SRX] = -1.3; T[I.SLZ] = 0.2; T[I.SRZ] = -0.2; T[I.ELL] = T[I.ERR] = -0.85; T[I.SPX] += 0.0; T[I.HDX] = 0.05; props.chest = 'crate'; break;
      case 'hammer': {
        const sw = Math.sin(ut * 7.5), up = Math.max(0, sw);
        T[I.SRX] = -1.25 - up * 1.1; T[I.ERR] = -0.9 - up * 0.7; T[I.WRR] = up * 0.3 - 0.4; T[I.SLX] = -0.8; T[I.ELL] = -1.3; T[I.SPX] += 0.14 + (1 - up) * 0.06; T[I.HDX] = 0.18; props.handR = 'hammer'; break; }
      case 'saw': { const sw = Math.sin(ut * 8); T[I.SRX] = -0.9 + sw * 0.25; T[I.ERR] = -1.1 + sw * 0.3; T[I.SLX] = -0.7; T[I.ELL] = -1.2; T[I.SPX] += 0.2; T[I.HDX] = 0.2; props.handR = 'wrench'; break; }
      case 'type': { T[I.SLX] = -0.62; T[I.SRX] = -0.62; T[I.ELL] = -1.25; T[I.ERR] = -1.25; T[I.WLL] = Math.sin(ut * 17) * 0.12 + 0.1; T[I.WRR] = Math.sin(ut * 15 + 1) * 0.12 + 0.1; T[I.SPX] += 0.1 + Math.sin(ut * 0.5) * 0.02; T[I.HDX] = 0.14 + Math.sin(ut * 0.8) * 0.05; T[I.HDY] = Math.sin(ut * 0.35) * 0.1; break; }
      case 'read': T[I.SLX] = -0.95; T[I.SRX] = -0.95; T[I.ELL] = -1.7; T[I.ERR] = -1.7; T[I.SLZ] = 0.1; T[I.SRZ] = -0.1; T[I.HDX] = 0.35; T[I.SPX] += 0.08; props.handR = 'book'; break;
      case 'eat': { const b = (Math.sin(ut * 1.6) + 1) / 2; T[I.SRX] = -0.5 - b * 0.9; T[I.ERR] = -0.6 - b * 1.7; T[I.SLX] = -0.35; T[I.ELL] = -0.7; T[I.HDX] = 0.15 - b * 0.1; T[I.MO] = b > 0.85 ? 0.5 : 0; T[I.SPX] += 0.08; props.handR = 'mug'; break; }
      case 'watch': T[I.SLX] = -0.3; T[I.SRX] = -0.3; T[I.ELL] = -0.9; T[I.ERR] = -0.9; T[I.SPX] -= 0.1; T[I.HDX] = -0.05; break;
      case 'phone': T[I.SRX] = -1.1; T[I.ERR] = -1.9; T[I.SLX] = -0.3; T[I.ELL] = -1.0; T[I.HDX] = 0.4; T[I.SPX] += 0.06; T[I.WRR] = -0.3; props.handR = 'phone'; break;
      case 'clipboard': T[I.SLX] = -0.9; T[I.ELL] = -1.7; T[I.SLZ] = 0.2; T[I.SRX] = -0.7 + Math.sin(ut * 3) * 0.04; T[I.ERR] = -1.3; T[I.HDX] = 0.28 + Math.sin(ut * 0.4) * 0.05; props.handL = 'clipboard'; break;
      case 'tablet': T[I.SLX] = -0.9; T[I.ELL] = -1.6; T[I.SRX] = -0.8; T[I.ERR] = -1.3 + Math.sin(ut * 4) * 0.1; T[I.HDX] = 0.3; props.handL = 'tablet'; break;
      case 'bag': T[I.SRX] = -0.1; T[I.ERR] = -0.5; props.handR = 'bag'; if (this.lower === 'walk') { T[I.SRX] = -0.15; } break;
      case 'broom': { const sw = Math.sin(ut * 2.2); T[I.SRX] = -0.8; T[I.ERR] = -0.7; T[I.SLX] = -0.9 + sw * 0.2; T[I.ELL] = -0.8; T[I.SPX] += 0.1; T[I.SPY] = sw * 0.25; props.handR = 'broom'; break; }
      case 'guard': T[I.SLX] = 0.35; T[I.SRX] = 0.35; T[I.ELL] = -0.5; T[I.ERR] = -0.5; T[I.SLZ] = 0.35; T[I.SRZ] = -0.35; T[I.SPX] -= 0.05; T[I.HDY] = Math.sin(t * 0.4) * 0.5; break;
      case 'panel': { const tap = Math.max(0, Math.sin(ut * 4)); T[I.SRX] = -1.2 - tap * 0.15; T[I.ERR] = -0.5; T[I.SLX] = -0.3; T[I.ELL] = -0.7; T[I.HDX] = 0.1; T[I.HDY] = Math.sin(ut * 0.6) * 0.3; break; }
      case 'lever': { const s = Math.sin(ut * 1.8); T[I.SLX] = -1.0 + s * 0.4; T[I.SRX] = -1.0 - s * 0.4; T[I.ELL] = -0.8; T[I.ERR] = -0.8; T[I.SPX] += 0.12 + s * 0.08; break; }
      case 'tidy': { const s = Math.sin(ut * 1.5); T[I.SRX] = -0.85; T[I.ERR] = -0.8 + s * 0.2; T[I.SRY] = s * 0.35; T[I.SLX] = -0.6; T[I.ELL] = -1.1; T[I.SPX] += 0.1; T[I.HDX] = 0.2; T[I.HDY] = s * 0.2; break; }
      case 'browse': { const s = Math.sin(ut * 0.9); T[I.SRX] = -1.0 + Math.max(0, s) * -0.7; T[I.ERR] = -0.5 - Math.max(0, s) * 0.5; T[I.SLX] = -0.2; T[I.ELL] = -0.6; T[I.HDX] = 0.1; T[I.HDY] = s * 0.35; T[I.SPX] += 0.06; break; }
      case 'wave': { const w = Math.sin(ut * 11); T[I.SRX] = -2.9; T[I.SRZ] = 0.25; T[I.ERR] = -0.5 + w * 0.5; T[I.WRR] = w * 0.3; T[I.SLX] = Math.sin(t * 0.9) * 0.025; T[I.ELL] = -0.12; T[I.SM] = 1; T[I.HDX] = -0.05; break; }
      case 'point': T[I.SRX] = -1.5; T[I.ERR] = -0.15; T[I.SLX] = 0; T[I.HDX] = 0; break;
      case 'nod': T[I.HDX] = Math.sin(ut * 8) * 0.18 * Math.exp(-ut * 1.2); break;
      case 'talk': case 'listen': case 'laugh': this.talk(dt, o, u); break;
      case 'sleep': T[I.EC] = 1; T[I.SLX] = 0.0; T[I.SRX] = 0.0; T[I.SLZ] = -0.14; T[I.SRZ] = 0.14; T[I.ELL] = -0.35; T[I.ERR] = -0.35; T[I.HDX] = -0.05; T[I.SPX] = Math.sin(t * 1.4) * 0.025; T[I.SM] = 0.0; T[I.MO] = 0.1 + (Math.sin(t * 1.4) > 0.6 ? 0.1 : 0); break;
      case 'sedated': T[I.EC] = 1; T[I.SLX] = 0.1; T[I.SRX] = 0.1; T[I.HDX] = 0.1; T[I.HDZ] = 0.2; break;
      case 'handsup': T[I.SLX] = -2.6; T[I.SRX] = -2.6; T[I.ELL] = -0.4; T[I.ERR] = -0.4; break;
      default: break;
    }
    // props
    const sp = o.prop || {};
    for (const slot of ['handR', 'handL', 'chest']) setProp(rig, slot, sp[slot] !== undefined ? sp[slot] : props[slot], slot === 'chest' ? o.crateColor : undefined);
  }

  fidgets(dt, o) {
    const T = this.tgt, t = this.t;
    this.nextFid -= dt;
    if (!this.fid && this.nextFid <= 0) {
      const pool = FIDGETS[this.style.trait] || FIDGETS.cheerful; this.fid = o.tired && Math.random() < 0.6 ? 'yawn' : pool[Math.floor(Math.random() * pool.length)]; this.fidT = 0;
      this.fidDur = { stretch: 2.2, yawn: 2.6, watch: 2.4, scratch: 2.0, crossarms: 6, hips: 5, lookup: 2.5, sigh: 2.2, shift: 1.5, phone: 6, lookdown: 3, hum: 4 }[this.fid] || 2;
    }
    if (this.fid) {
      this.fidT += dt; const f = this.fidT, k = Math.min(1, f / 0.4, (this.fidDur - f) / 0.4 + 0.0001);
      switch (this.fid) {
        case 'scratch': T[I.SRX] = -2.7 * k; T[I.SRZ] = 0.3 * k; T[I.ERR] = (-1.9 + Math.sin(f * 12) * 0.2) * k; T[I.HDZ] = 0.12 * k; break;
        case 'watch': T[I.SLX] = -0.85 * k; T[I.ELL] = -1.9 * k; T[I.HDX] = 0.35 * k; break;
        case 'stretch': T[I.SLX] = T[I.SRX] = -3.0 * k; T[I.ELL] = T[I.ERR] = -0.2 * k; T[I.SPX] = -0.18 * k; T[I.HDX] = -0.3 * k; T[I.MO] = 0.6 * k; T[I.EC] = 0.6 * k; break;
        case 'yawn': T[I.SRX] = -1.9 * k; T[I.ERR] = -2.4 * k; T[I.HDX] = -0.25 * k; T[I.MO] = 0.9 * k; T[I.EC] = 0.85 * k; T[I.SPX] = -0.05 * k; break;
        case 'crossarms': T[I.SLX] = -0.55 * k; T[I.SLZ] = 0.55 * k - 0.07 * (1 - k); T[I.ELL] = -2.3 * k; T[I.SRX] = -0.55 * k; T[I.SRZ] = -0.55 * k + 0.07 * (1 - k); T[I.ERR] = -2.3 * k; break;
        case 'hips': T[I.SLX] = 0.25 * k; T[I.SLZ] = -0.6 * k; T[I.ELL] = -1.5 * k; T[I.SRX] = 0.25 * k; T[I.SRZ] = 0.6 * k; T[I.ERR] = -1.5 * k; T[I.SPX] -= 0.04 * k; break;
        case 'lookup': T[I.HDX] = -0.5 * k; T[I.NKX] = -0.2 * k; break;
        case 'lookdown': T[I.HDX] = 0.4 * k; T[I.HDY] = 0.3 * k; T[I.SLX] = 0.15 * k; T[I.SRX] = 0.15 * k; break;
        case 'sigh': { const b = Math.sin(Math.min(1, f / this.fidDur) * Math.PI); T[I.SPX] = 0.12 * b; T[I.HDX] = 0.2 * b; T[I.MO] = 0.25 * b; T[I.SLX] = 0.1 * b; T[I.SRX] = 0.1 * b; break; }
        case 'shift': T[I.HR] = Math.sin(f * 4) * 0.1; T[I.TLX] = Math.max(0, Math.sin(f * 6)) * -0.25; break;
        case 'phone': T[I.SRX] = -1.1 * k; T[I.ERR] = -1.9 * k; T[I.SLX] = -0.3 * k; T[I.ELL] = -1.0 * k; T[I.HDX] = 0.4 * k; T[I.SPX] += 0.06 * k; break;
        case 'hum': T[I.SM] = 1; T[I.HR] += Math.sin(t * 4) * 0.04; T[I.HY] += Math.abs(Math.sin(t * 4)) * 0.012; T[I.HDZ] = Math.sin(t * 2) * 0.08; break;
      }
      if (this.fidT >= this.fidDur) { this.fid = null; this.nextFid = 3 + Math.random() * 7 / this.style.fidget; }
    }
  }
  sitFidgets(dt, o) {
    const T = this.tgt, t = this.t; T[I.SLX] = -0.45; T[I.SRX] = -0.45; T[I.ELL] = -1.0; T[I.ERR] = -1.0; T[I.WLL] = 0.1; T[I.HDX] = this.style.slouch * 0.15;
    T[I.HDY] = Math.sin(t * 0.3) * 0.25; T[I.HR] += Math.sin(t * 0.5) * 0.02;
  }

  talk(dt, o, mode) {
    const T = this.tgt, t = this.t;
    this.gestT -= dt; if (this.gestT <= 0) { this.gest = Math.floor(Math.random() * 6); this.gestT = 1 + Math.random() * 2; }
    const sit = this.lower === 'sit';
    if (mode === 'talk' || mode === 'laugh') {
      const g = this.gest, a = (Math.sin(t * 3.3) + 1) / 2, b = (Math.sin(t * 2.1 + 1) + 1) / 2;
      const hx = sit ? 0.3 : 0.0; // sitting: forearms near the desk/lap
      if (g === 0) { T[I.SLX] = -0.9 - a * 0.3; T[I.SRX] = -0.9 - b * 0.3; T[I.ELL] = -1.0; T[I.ERR] = -1.0; T[I.SLZ] = -0.35; T[I.SRZ] = 0.35; }
      else if (g === 1) { T[I.SRX] = -1.3 - a * 0.4; T[I.ERR] = -0.4 - a * 0.5; T[I.SLX] = -0.3; T[I.ELL] = -0.8; }
      else if (g === 2) { T[I.SRX] = -1.0 - a * 0.5; T[I.ERR] = -0.9; T[I.WRR] = -a * 0.5; T[I.SLX] = -0.2; T[I.ELL] = -0.6; }
      else if (g === 3) { T[I.SLX] = -1.5 - a * 0.5; T[I.SRX] = -1.5 - b * 0.5; T[I.ELL] = -0.7; T[I.ERR] = -0.7; T[I.SLZ] = -0.4; T[I.SRZ] = 0.4; }
      else if (g === 4) { T[I.SLX] = -0.5; T[I.SRX] = -0.5; T[I.ELL] = -1.4; T[I.ERR] = -1.4; T[I.SLZ] = -0.45; T[I.SRZ] = 0.45; T[I.SPX] += 0.02; }
      else { T[I.SRX] = -0.8 - a * 0.5; T[I.ERR] = -1.3; T[I.SRY] = Math.sin(t * 2) * 0.3; T[I.SLX] = -0.3; T[I.ELL] = -0.6; }
      if (sit) { T[I.SLX] = Math.min(T[I.SLX], -0.5); }
      this.syl += dt * (5 + Math.random() * 4); T[I.MO] = o.speaking !== false ? (Math.sin(this.syl) > -0.2 ? 0.55 : 0.1) : 0;
      T[I.HDX] += Math.sin(t * 3.1) * 0.06; T[I.HDY] += Math.sin(t * 1.3) * 0.12; T[I.HDZ] = Math.sin(t * 0.9) * 0.05; T[I.SM] = o.mood > 0.2 ? 0.6 : 0;
      if (mode === 'laugh') { T[I.HDX] = -0.25; T[I.SPX] += -0.08; T[I.SPY] = 0; T[I.HY] += Math.abs(Math.sin(t * 16)) * 0.012; T[I.SLX] = -0.7; T[I.SRX] = -0.7; T[I.ELL] = -1.1; T[I.ERR] = -1.1; T[I.MO] = 0.7; T[I.SM] = 1; T[I.EC] = 0.7; T[I.SPX] += Math.sin(t * 18) * 0.03; }
    } else { // listen
      T[I.HDX] = Math.max(0, Math.sin(t * 1.7 + 2)) * 0.12; T[I.SM] = o.mood > 0.2 ? 0.6 : 0; T[I.HDZ] = 0.06;
      if (this.style.trait === 'grumpy') { T[I.SLX] = -0.55; T[I.SLZ] = 0.55; T[I.ELL] = -2.3; T[I.SRX] = -0.55; T[I.SRZ] = -0.55; T[I.ERR] = -2.3; }
      else if (this.style.trait === 'shy') { T[I.SRX] = -0.9; T[I.ERR] = -2.0; T[I.SLX] = -0.5; T[I.ELL] = -1.0; T[I.HDX] += 0.15; }
      else { T[I.SLX] = -0.15; T[I.ELL] = -0.4; T[I.SRX] = -0.15; T[I.ERR] = -0.4; if (sit) { T[I.SLX] = -0.5; T[I.SRX] = -0.5; T[I.ELL] = -1.0; T[I.ERR] = -1.0; } }
    }
  }

  // ---------------- head & face ----------------
  doHeadFace(dt, o) {
    const T = this.tgt; const ly = clamp(o.lookYaw || 0, -1.2, 1.2), lp = clamp(o.lookPitch || 0, -0.5, 0.6);
    T[I.NKY] += ly * 0.4; T[I.HDY] += ly * 0.6; T[I.NKX] += lp * 0.35; T[I.HDX] += lp * 0.65;
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blinking = 0.13; this.blinkT = 2 + Math.random() * 4; }
    if (this.blinking > 0) { this.blinking -= dt; T[I.EC] = Math.max(T[I.EC], 1); }
    const mood = o.mood || 0; if (T[I.SM] === 0 && mood > 0.35) T[I.SM] = 0.6; if (mood < -0.35 && T[I.SM] === 0) T[I.SM] = -0.7;
    T[I.BR] = mood;
  }

  apply(o) {
    const c = this.cur, r = this.rig;
    r.body.rotation.x = -c[I.LIE] * Math.PI / 2; r.body.position.set(0, c[I.LIE] * 0.72, c[I.LIE] * 0.9);
    r.hips.position.set(0, HIP_H + c[I.HY], c[I.HZ]); r.hips.rotation.set(c[I.HP], c[I.HYAW], c[I.HR]);
    r.spine.rotation.set(c[I.SPX], c[I.SPY], c[I.SPZ]); r.neck.rotation.set(c[I.NKX], c[I.NKY], c[I.NKZ]); r.head.rotation.set(c[I.HDX], c[I.HDY], c[I.HDZ]);
    r.armL.sh.rotation.set(c[I.SLX], c[I.SLY], c[I.SLZ]); r.armL.el.rotation.x = c[I.ELL]; r.armL.wr.rotation.x = c[I.WLL];
    r.armR.sh.rotation.set(c[I.SRX], c[I.SRY], c[I.SRZ]); r.armR.el.rotation.x = c[I.ERR]; r.armR.wr.rotation.x = c[I.WRR];
    r.legL.th.rotation.set(c[I.TLX], 0, c[I.TLZ]); r.legL.kn.rotation.x = c[I.KL]; r.legL.an.rotation.x = c[I.AL];
    r.legR.th.rotation.set(c[I.TRX], 0, c[I.TRZ]); r.legR.kn.rotation.x = c[I.KR]; r.legR.an.rotation.x = c[I.AR];
    // face
    r.lids.visible = c[I.EC] > 0.5; const mo = c[I.MO], sm = c[I.SM];
    r.mouth.scale.set(1 + Math.abs(sm) * 0.4 + mo * -0.2, 1 + mo * 5, 1); r.mouth.position.y = 0.075 - mo * 0.015;
    const cy = 0.075 + sm * 0.02 - mo * 0.005; r.mouthL.position.set(-0.058 - Math.abs(sm) * 0.015, cy, 0.153); r.mouthR.position.set(0.058 + Math.abs(sm) * 0.015, cy, 0.153);
    r.mouthL.visible = r.mouthR.visible = Math.abs(sm) > 0.15;
  }
}
