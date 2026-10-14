import * as THREE from 'three';

/**
 * Marks left on the world: bullet holes, scorch marks (and whatever a cutscene wants to leave behind). Each kind is one
 * instanced mesh with a fixed number of slots reused oldest-first, so a long fight costs one draw call per kind however
 * many marks there are, and nothing is ever created or thrown away mid-fight. Old marks fade (shrink away) after a while,
 * as the town tidies up.
 *   game.decals.add('hole', point, normal)          a bullet hole on a wall or floor
 *   game.decals.add('scorch', point, up, 2.6)        a blast mark on the ground
 */
const KINDS = {
  hole: { n: 320, size: 0.13, life: 480, tex: holeTex, jitter: 0.25 },
  chip: { n: 160, size: 0.16, life: 300, tex: chipTex, jitter: 0.3 },   // a bullet kicking up the ground: a scuffed pale mark
  scorch: { n: 32, size: 2.6, life: 600, tex: scorchTex, jitter: 0.15 },
  blood: { n: 96, size: 0.4, life: 45, tex: bloodTex, jitter: 0.35 },   // (dries up and goes after a while)
};
const FADE = 12;

function canvas(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function holeTex() {
  return canvas(64, (x, s) => {
    const c = s / 2, g = x.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(8,7,6,1)'); g.addColorStop(0.22, 'rgba(18,16,14,1)'); g.addColorStop(0.32, 'rgba(70,64,58,0.9)'); g.addColorStop(0.5, 'rgba(110,104,96,0.55)'); g.addColorStop(0.75, 'rgba(60,56,52,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.strokeStyle = 'rgba(30,28,26,0.55)'; x.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.random() * 0.6, r = c * (0.55 + Math.random() * 0.35); x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.25, c + Math.sin(a) * c * 0.25); x.lineTo(c + Math.cos(a + 0.15) * r, c + Math.sin(a + 0.15) * r); x.stroke(); }   // little cracks
  });
}
function chipTex() {
  return canvas(64, (x, s) => {
    const c = s / 2; for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * c * 0.6, rr = 2 + Math.random() * 6; x.fillStyle = `rgba(${40 + Math.random() * 40},${36 + Math.random() * 30},${30 + Math.random() * 20},${0.35 + Math.random() * 0.4})`; x.beginPath(); x.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, rr, 0, Math.PI * 2); x.fill(); }
    const g = x.createRadialGradient(c, c, 0, c, c, c * 0.3); g.addColorStop(0, 'rgba(15,13,11,0.95)'); g.addColorStop(1, 'rgba(15,13,11,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
  });
}
function bloodTex() {
  return canvas(64, (x, s) => {
    const c = s / 2; x.fillStyle = 'rgba(92,6,6,0.9)';
    x.beginPath(); x.arc(c, c, c * 0.42, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, r = c * (0.45 + Math.random() * 0.4), rr = 1.5 + Math.random() * 4.5; x.fillStyle = `rgba(${80 + Math.random() * 30},6,6,${0.6 + Math.random() * 0.3})`; x.beginPath(); x.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, rr, 0, Math.PI * 2); x.fill(); }
    const g = x.createRadialGradient(c, c, 0, c, c, c * 0.42); g.addColorStop(0, 'rgba(60,2,2,0.5)'); g.addColorStop(1, 'rgba(60,2,2,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
  });
}
function scorchTex() {
  return canvas(128, (x, s) => {
    const c = s / 2, g = x.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(10,9,8,0.92)'); g.addColorStop(0.35, 'rgba(22,19,16,0.82)'); g.addColorStop(0.65, 'rgba(40,34,28,0.4)'); g.addColorStop(1, 'rgba(40,34,28,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 34; i++) {   // soot thrown out from the middle
      const a = Math.random() * Math.PI * 2, r0 = c * (0.2 + Math.random() * 0.2), r1 = c * (0.45 + Math.random() * 0.5);
      x.strokeStyle = `rgba(12,10,9,${0.12 + Math.random() * 0.22})`; x.lineWidth = 3 + Math.random() * 9; x.lineCap = 'round';
      x.beginPath(); x.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); x.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); x.stroke();
    }
  });
}

export class Decals {
  constructor(game) { this.game = game; this.pools = {}; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.q2 = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.z = new THREE.Vector3(0, 0, 1); this.tidyT = 0; }
  pool(kind) {
    let P = this.pools[kind]; if (P) return P; const K = KINDS[kind];
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: K.tex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true }), K.n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.matrixAutoUpdate = false; mesh.castShadow = mesh.receiveShadow = false;
    this.game.scene.add(mesh);
    P = this.pools[kind] = { K, mesh, next: 0, used: 0, born: new Float32Array(K.n), size: new Float32Array(K.n), pos: new Float32Array(K.n * 3), rot: new Float32Array(K.n * 4) };
    return P;
  }
  /** Leave a mark: kind, a point on the surface, the surface's outward normal ({x,y,z}), an optional size in metres. */
  add(kind, p, n, size) {
    if (!KINDS[kind] || !Number.isFinite(p.x + p.y + p.z)) return; const P = this.pool(kind), K = P.K, i = P.next;
    P.next = (i + 1) % K.n; P.used = Math.min(K.n, P.used + 1); P.mesh.count = P.used;
    const nx = n ? n.x : 0, ny = n ? n.y : 1, nz = n ? n.z : 0, L = Math.hypot(nx, ny, nz) || 1;
    this.v.set(nx / L, ny / L, nz / L); this.q.setFromUnitVectors(this.z, this.v); this.q2.setFromAxisAngle(this.z, Math.random() * Math.PI * 2); this.q.multiply(this.q2);   // a random twist, so no two look alike
    const sz = (size || K.size) * (1 + (Math.random() - 0.5) * K.jitter * 2), lift = 0.012 + (i % 7) * 0.0015;   // (each a hair further out, so overlapping marks never flicker)
    P.pos[i * 3] = p.x + this.v.x * lift; P.pos[i * 3 + 1] = p.y + this.v.y * lift; P.pos[i * 3 + 2] = p.z + this.v.z * lift; this.q.toArray(P.rot, i * 4); P.size[i] = sz; P.born[i] = this.game.elapsed;
    this.place(P, i, sz); P.mesh.instanceMatrix.needsUpdate = true;
  }
  place(P, i, sc) { this.v.fromArray(P.pos, i * 3); this.q.fromArray(P.rot, i * 4); this.s.set(sc, sc, sc); this.m.compose(this.v, this.q, this.s); P.mesh.setMatrixAt(i, this.m); }
  /** Twice a second: marks past their time shrink away. */
  update(dt) {
    if ((this.tidyT -= dt) > 0) return; this.tidyT = 0.5; const now = this.game.elapsed;
    for (const k in this.pools) {
      const P = this.pools[k], L = P.K.life; let dirty = false;
      for (let i = 0; i < P.used; i++) { const age = now - P.born[i]; if (age < L || P.size[i] <= 0) continue; const f = Math.max(0, 1 - (age - L) / FADE); this.place(P, i, P.size[i] * f); if (f <= 0) P.size[i] = 0; dirty = true; }
      if (dirty) P.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  /** Wipe the lot (a new game, a cutscene that wants a clean street). */
  clear() { for (const k in this.pools) { const P = this.pools[k]; P.used = 0; P.next = 0; P.mesh.count = 0; } }
}
