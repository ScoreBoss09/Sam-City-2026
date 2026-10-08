export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
export const fmtMoney = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] || (this.h[e] = [])).push(f); return () => this.off(e, f); }
  off(e, f) { const a = this.h[e]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } }
  emit(e, ...a) { const l = this.h[e]; if (l) for (const f of l.slice()) f(...a); }
}
