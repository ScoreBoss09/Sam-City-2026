import * as THREE from 'three';
import { Sfx } from '../core/Sfx.js';

/** Passing showers: rain streaks around the camera, a greyer sky, and the occasional rumble. Some days are dry. */
export class Weather {
  constructor(game) {
    this.game = game; this.rain = 0; this.want = 0; this.timer = 60 + Math.random() * 120;
    const N = 1400, pos = new Float32Array(N * 6); this.N = N; this.off = [];
    for (let i = 0; i < N; i++) this.off.push([(Math.random() - 0.5) * 70, Math.random() * 40, (Math.random() - 0.5) * 70, 0.7 + Math.random() * 0.6]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xbfd0e6, transparent: true, opacity: 0, depthWrite: false })); this.lines.frustumCulled = false; game.scene.add(this.lines);
    // a lightning bolt, re-shaped for every strike
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(26 * 6 * 3), 3));
    this.bolt = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: 0xf4f8ff, fog: false, toneMapped: false })); this.bolt.frustumCulled = false; this.bolt.visible = false; game.scene.add(this.bolt);
    this.flash = 0; this.storm = false; this.mist = 0; this.mistDay = -1; this.mistK = 0;
  }
  /** Fork of lightning from the clouds to the ground somewhere around Sam, then thunder a moment later. */
  strike() {
    const g = this.game, cam = g.camera.position, a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 90, x0 = cam.x + Math.cos(a) * r, z0 = cam.z + Math.sin(a) * r, p = this.bolt.geometry.attributes.position.array;
    let x = x0, y = 95, z = z0, k = 0; const seg = (x1, y1, z1) => { p[k++] = x; p[k++] = y; p[k++] = z; p[k++] = x1; p[k++] = y1; p[k++] = z1; x = x1; y = y1; z = z1; };
    for (let i = 0; i < 20; i++) seg(x + (Math.random() - 0.5) * 7, y - 95 / 20, z + (Math.random() - 0.5) * 7);
    const bx = x0 + (Math.random() - 0.5) * 6, by = 60, bz = z0; x = bx; y = by; z = bz; for (let i = 0; i < 6; i++) seg(x + (Math.random() - 0.3) * 6, y - 6, z + (Math.random() - 0.5) * 6);
    for (let j = 0; j < k; j += 3) { p[k + j] = p[j] + 0.35; p[k + j + 1] = p[j + 1]; p[k + j + 2] = p[j + 2]; p[2 * k + j] = p[j]; p[2 * k + j + 1] = p[j + 1]; p[2 * k + j + 2] = p[j + 2] + 0.35; }   // thicker: two offset copies
    this.bolt.geometry.attributes.position.needsUpdate = true; this.bolt.visible = true; this.boltT = 0.14; this.flash = 1; this.reflash = Math.random() < 0.6 ? 0.18 : 0;
    if (g.mode === 'sim') { const lag = Math.min(2.5, r / 120); Sfx.noise(2.4, { freq: 70, vol: 0.9, type: 'lowpass', delay: lag }); Sfx.noise(0.5, { freq: 300, vol: 0.4, type: 'lowpass', delay: lag }); }
    else Sfx.noise(1.6, { freq: 70, vol: 0.35, type: 'lowpass', delay: 0.6 });
  }
  /** Morning mist rolls in off the sea on some days, mostly autumn and winter, and burns off by mid-morning. */
  updateMist(dt) {
    const g = this.game, c = g.clock, h = c.hour;
    if (h >= 3 && h < 5 && this.mistDay !== c.totalDays) { this.mistDay = c.totalDays; const cold = c.month >= 9 || c.month <= 2; this.mistK = Math.random() < (cold ? 0.45 : 0.12) ? (cold ? 0.65 + Math.random() * 0.35 : 0.4 + Math.random() * 0.3) : 0; if (this.mistK && g.started) g.messages.push('Sam (thought)', 'A thick mist is rolling in off the sea.', ''); }
    const shape = h < 4 ? 0 : h < 6 ? (h - 4) / 2 : h < 8 ? 1 : h < 10.5 ? 1 - (h - 8) / 2.5 : 0;
    this.mist += (this.mistK * shape - this.mist) * Math.min(1, dt * 0.8); g.atmosphere.mist = this.mist;
  }
  update(dt) {
    const g = this.game, gdt = dt * Math.max(0, g.clock.speed);
    this.timer -= gdt; if (this.timer <= 0) { const wet = Math.random() < 0.3, m = g.clock.month; this.storm = wet && !this.snowy && m >= 4 && m <= 9 && Math.random() < 0.35; this.want = wet ? (this.storm ? 0.95 : 0.6 + Math.random() * 0.4) : 0; this.timer = wet ? 50 + Math.random() * 90 : 120 + Math.random() * 300; if (wet && g.started) { g.messages.push('Sam (thought)', this.snowy ? 'Snow\'s coming. Brass monkeys out here.' : this.storm ? 'Big black clouds. There\'s a storm coming.' : 'Smells like rain.', ''); } }
    this.rain += (this.want - this.rain) * Math.min(1, dt * 0.25); g.atmosphere.rain = this.rain;
    this.updateMist(dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 4); if (this.reflash && this.flash < 0.45) { this.flash = 0.9; this.reflash = 0; } }
    if (this.boltT > 0) { this.boltT -= dt; if (this.boltT <= 0) this.bolt.visible = false; }
    if (this.storm && !this.snowy && this.rain > 0.6 && Math.random() < dt * 0.09) this.strike();
    if (this.storm && this.rain < 0.05 && this.want === 0) this.storm = false;
    // ambience: birdsong by day, crickets at night (only when Sam is out and about)
    if (g.mode === 'sim' && g.clock.speed > 0 && this.rain < 0.3) {
      const night = g.atmosphere.night || 0;
      if (night < 0.3 && Math.random() < dt * 0.25) { const f = 1800 + Math.random() * 1400; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) Sfx.tone(f + Math.random() * 400, 0.06, { type: 'sine', vol: 0.035, slide: 500, delay: i * 0.09 }); }
      if (night > 0.6 && Math.random() < dt * 0.8) for (let i = 0; i < 3; i++) Sfx.tone(4200, 0.03, { type: 'square', vol: 0.012, delay: i * 0.05 });
    }
    const vis = this.rain > 0.02; this.lines.visible = vis; if (!vis) return;
    // in winter the showers come down as snow: slow, drifting little flakes
    const sn = !!this.snowy; this.lines.material.color.setHex(sn ? 0xffffff : 0xbfd0e6);
    this.lines.material.opacity = (sn ? 0.95 : 0.55) * this.rain; const cam = g.camera.position, p = this.lines.geometry.attributes.position.array, n = Math.floor(this.N * this.rain), t = performance.now() / 1000;
    for (let i = 0; i < this.N; i++) {
      const o = this.off[i]; o[1] -= dt * (sn ? 3.2 : 26) * o[3]; if (o[1] < 0) o[1] += 40;
      const wob = sn ? Math.sin(t * 1.3 + i) * 0.6 : 0, x = cam.x + o[0] + wob, y = (i < n ? Math.max(0, cam.y - 14) + o[1] : -999), z = cam.z + o[2], k = i * 6;
      p[k] = x; p[k + 1] = y; p[k + 2] = z; p[k + 3] = x + (sn ? 0.12 : 0.08); p[k + 4] = y - (sn ? 0.12 : 0.9); p[k + 5] = z + (sn ? 0.1 : 0.04);
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    if (!sn && this.rain > 0.7 && Math.random() < dt * 0.02) { Sfx.noise(1.6, { freq: 90, vol: 0.5, type: 'lowpass' }); }
    if (!sn && Math.random() < dt * 6 * this.rain) Sfx.noise(0.05, { freq: 5000, q: 0.5, vol: 0.03 * this.rain });
  }
}
