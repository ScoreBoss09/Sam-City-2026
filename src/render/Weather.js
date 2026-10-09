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
  }
  update(dt) {
    const g = this.game, gdt = dt * Math.max(0, g.clock.speed);
    this.timer -= gdt; if (this.timer <= 0) { const wet = Math.random() < 0.3; this.want = wet ? 0.6 + Math.random() * 0.4 : 0; this.timer = wet ? 50 + Math.random() * 90 : 120 + Math.random() * 300; if (wet && g.started) { g.messages.push('Sam (thought)', this.snowy ? 'Snow\'s coming. Brass monkeys out here.' : 'Smells like rain.', ''); } }
    this.rain += (this.want - this.rain) * Math.min(1, dt * 0.25); g.atmosphere.rain = this.rain;
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
