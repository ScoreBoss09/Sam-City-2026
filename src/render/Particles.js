import * as THREE from 'three';

/** Pooled little cubes for chips, dirt, sawdust and sparkles. */
export class Particles {
  constructor(scene, n = 160) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), n); this.mesh.frustumCulled = false; this.mesh.count = n;
    this.p = Array.from({ length: n }, () => ({ life: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, r: 0 })); this.i = 0; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.c = new THREE.Color();
    for (let k = 0; k < n; k++) { this.mesh.setColorAt(k, this.c.setHex(0xffffff)); this.hide(k); } scene.add(this.mesh);
  }
  hide(k) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(k, this.m); }
  burst(x, y, z, color, n = 8, spread = 1, up = 3.2, size = 0.1) {
    for (let j = 0; j < n; j++) {
      const k = this.i = (this.i + 1) % this.p.length, a = Math.random() * Math.PI * 2, sp = (0.8 + Math.random() * 1.8) * spread;
      Object.assign(this.p[k], { life: 0.6 + Math.random() * 0.5, x, y, z, vx: Math.cos(a) * sp, vy: up * (0.6 + Math.random() * 0.7), vz: Math.sin(a) * sp, s: size * (0.6 + Math.random() * 0.8), r: Math.random() * 6 });
      this.c.setHex(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.12); this.mesh.setColorAt(k, this.c);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let any = false;
    for (let k = 0; k < this.p.length; k++) {
      const p = this.p[k]; if (p.life <= 0) continue; any = true; p.life -= dt;
      if (p.life <= 0) { this.hide(k); continue; }
      p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y = Math.max(0.05, p.y + p.vy * dt); p.z += p.vz * dt; if (p.y <= 0.05) { p.vx *= 0.8; p.vz *= 0.8; } p.r += dt * 8;
      this.e.set(p.r, p.r * 0.7, 0); this.q.setFromEuler(this.e); const s = p.s * Math.min(1, p.life * 3); this.m.compose(new THREE.Vector3(p.x, p.y, p.z), this.q, new THREE.Vector3(s, s, s)); this.mesh.setMatrixAt(k, this.m);
    }
    if (any || this.dirty) { this.mesh.instanceMatrix.needsUpdate = true; this.dirty = any; }
  }
}
