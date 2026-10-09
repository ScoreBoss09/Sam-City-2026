import * as THREE from 'three';
import { Sfx } from '../core/Sfx.js';

const COLS = [0xff4040, 0x40ff70, 0x5080ff, 0xffe040, 0xff60ff, 0x60ffff, 0xffffff, 0xffa030];

/** Rockets and starbursts for Bonfire Night, New Year and weddings. One pooled instanced mesh of glowing specks. */
export class Fireworks {
  constructor(game, n = 420) {
    this.game = game; const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, n); this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.p = Array.from({ length: n }, () => ({ life: 0 })); this.i = 0; this.rockets = []; this.m = new THREE.Matrix4(); this.c = new THREE.Color(); this.v = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3();
    for (let k = 0; k < n; k++) { this.mesh.setColorAt(k, this.c.setHex(0xffffff)); this.mesh.setMatrixAt(k, this.m.makeScale(0, 0, 0)); }
    game.scene.add(this.mesh);
  }
  spark(x, y, z, vx, vy, vz, col, life, size, drag = 1.6, grav = 3) {
    const k = this.i = (this.i + 1) % this.p.length; Object.assign(this.p[k], { x, y, z, vx, vy, vz, life, max: life, size, drag, grav, col });
    this.mesh.setColorAt(k, this.c.setHex(col)); this.mesh.instanceColor.needsUpdate = true;
  }
  /** Launch a rocket from (x, z); it climbs, then bursts. */
  launch(x, z, opts = {}) {
    const col = opts.col ?? COLS[Math.floor(Math.random() * COLS.length)], h = opts.h ?? 20 + Math.random() * 14;
    this.rockets.push({ x: x + (Math.random() - 0.5) * 2, y: 1, z: z + (Math.random() - 0.5) * 2, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, top: h, col, kind: opts.kind || ['peony', 'peony', 'ring', 'willow', 'crackle'][Math.floor(Math.random() * 5)] });
    if (this.heard(x, z)) Sfx.noise(0.6, { freq: 2400, q: 3, vol: 0.08 });
  }
  heard(x, z) { const g = this.game; return g.mode === 'god' || Math.hypot(g.player.x - x, g.player.z - z) < 90; }
  burst(r) {
    const n = r.kind === 'ring' ? 36 : r.kind === 'willow' ? 40 : 48, sp = r.kind === 'willow' ? 6 : 9, col2 = COLS[Math.floor(Math.random() * COLS.length)];
    for (let j = 0; j < n; j++) {
      let dx, dy, dz;
      if (r.kind === 'ring') { const a = j / n * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a) * 0.3; dz = Math.sin(a); }
      else { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); dx = s * Math.cos(a); dy = u; dz = s * Math.sin(a); }
      const k = sp * (0.75 + Math.random() * 0.3), col = r.kind === 'crackle' && j % 2 ? 0xffffff : j % 5 === 0 ? col2 : r.col;
      this.spark(r.x, r.y, r.z, dx * k, dy * k + 1, dz * k, col, r.kind === 'willow' ? 2.6 : 1.6 + Math.random() * 0.5, 0.32, r.kind === 'willow' ? 0.9 : 1.6, r.kind === 'willow' ? 4 : 2.5);
    }
    if (this.heard(r.x, r.z)) { const g = this.game, d = g.mode === 'god' ? 40 : Math.hypot(g.player.x - r.x, g.player.z - r.z), lag = Math.min(0.5, d / 340); Sfx.noise(0.5, { freq: 180, vol: 0.5, type: 'lowpass', delay: lag }); if (r.kind === 'crackle') for (let i = 0; i < 6; i++) Sfx.noise(0.04, { freq: 4000, q: 2, vol: 0.12, delay: lag + 0.5 + i * 0.07 }); }
    // a flash on the town
    this.flash = Math.min(1, (this.flash || 0) + 0.5); this.flashCol = r.col;
  }
  get busy() { return this.rockets.length > 0 || this.alive > 0; }
  update(dt) {
    let alive = 0;
    for (const r of this.rockets) {
      r.vy = 22; r.x += r.vx * dt; r.z += r.vz * dt; r.y += r.vy * dt;
      if (Math.random() < 0.8) this.spark(r.x, r.y, r.z, (Math.random() - 0.5), -2, (Math.random() - 0.5), 0xffc070, 0.4, 0.18, 2, 2);
      if (r.y >= r.top) { r.done = true; this.burst(r); }
    }
    this.rockets = this.rockets.filter((r) => !r.done);
    for (let k = 0; k < this.p.length; k++) {
      const p = this.p[k]; if (p.life <= 0) continue; p.life -= dt;
      if (p.life <= 0) { this.mesh.setMatrixAt(k, this.m.makeScale(0, 0, 0)); continue; } alive++;
      const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy = p.vy * f - p.grav * dt; p.vz *= f; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.life / p.max, s = p.size * (t < 0.3 ? t / 0.3 : 1) * (Math.random() < 0.15 && t < 0.5 ? 0.3 : 1);
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, this.s.set(s, s, s)); this.mesh.setMatrixAt(k, this.m);
    }
    this.alive = alive; this.mesh.visible = alive > 0 || this.wasAlive; this.wasAlive = alive > 0;
    if (alive || this.mesh.visible) this.mesh.instanceMatrix.needsUpdate = true;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.5);
  }
}
