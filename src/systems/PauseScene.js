import * as THREE from 'three';

// While the game is paused (and Sam is about), children's faces appear at the windows of nearby houses, watching him.
// They duck out of sight the moment he looks their way, and bob back up when he looks away.
const skinM = new THREE.MeshStandardMaterial({ color: 0xe8c09a, roughness: 0.9 }), eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
const HAIR = [0x3b2a1a, 0xc9a45a, 0x7a3a1a, 0x1a1a1a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
function face(i) {
  const g = new THREE.Group(), head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.24), skinM); g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.26), HAIR[i % HAIR.length]); hair.position.y = 0.14; g.add(hair);
  for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), eyeM); e.position.set(x, 0.02, 0.125); g.add(e); }
  for (const x of [-0.1, 0.1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), skinM); h.position.set(x, -0.16, 0.1); g.add(h); }   // fingers on the sill
  return g;
}
export class PauseScene {
  constructor(game) { this.game = game; this.peeks = []; this.on = false; }
  update(dt) {
    const g = this.game, paused = g.started && !g.ending && !g.netVisitor && g.clock.speed === 0 && g.mode === 'sim' && !g.ui.modalOpen;
    if (paused && !this.on) this.begin(); else if (!paused && this.on) this.stop();
    if (!this.on) return;
    const cam = g.camera, fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    for (const k of this.peeks) {
      const dx = k.x - cam.position.x, dz = k.z - cam.position.z, d = Math.hypot(dx, dz) || 1, seen = (dx * fwd.x + dz * fwd.z) / d / Math.hypot(fwd.x, fwd.z) > 0.93;
      k.t = seen ? Math.max(0, k.t - dt * 6) : Math.min(1, k.t + dt * (0.35 + k.i * 0.1));   // duck fast, rise slowly
      k.g.position.y = k.y - 0.45 + k.t * 0.45; k.g.visible = k.t > 0.02;
    }
  }
  begin() {
    const g = this.game, P = g.player; this.on = true; g.pauseN = (g.pauseN || 0) + 1;
    const homes = g.buildings.list.filter((b) => b.state === 'done' && b.def.beds && !b.def.park && b !== g.starterHome && Math.hypot(b.cx - P.x, b.cz - P.z) < 40).sort((a, b) => Math.hypot(a.cx - P.x, a.cz - P.z) - Math.hypot(b.cx - P.x, b.cz - P.z)).slice(0, 4);
    homes.forEach((b, i) => {
      const W = b.def.w * 4, D = b.def.d * 4, lx = (i % 2 ? 1 : -1) * Math.min(W / 2 - 1, W / 4 + 0.4), [x, z] = b.toWorld(lx, D / 2 - 0.18), y = 1.45 + ((b.def.floors || 1) > 1 && i % 2 ? 3.2 : 0);
      const f = face(i); f.position.set(x, y - 0.45, z); const [ox, oz] = b.toWorld(0, 0), [fx, fz] = b.toWorld(0, 1); f.rotation.y = Math.atan2(fx - ox, fz - oz); g.scene.add(f);
      this.peeks.push({ g: f, x, z, y, t: 0, i });
    });
  }
  stop() { for (const k of this.peeks) { this.game.scene.remove(k.g); } this.peeks = []; this.on = false; }
}
