import * as THREE from 'three';
import { MATERIALS } from '../data/buildings.js';

/** Things Sam has dropped on the ground: a little stack of crates that can be picked up again. */
export class Piles {
  constructor(game) { this.game = game; this.list = []; this.geo = new THREE.BoxGeometry(0.55, 0.42, 0.55); this.mats = {}; }
  mat(m) { return this.mats[m] || (this.mats[m] = new THREE.MeshStandardMaterial({ color: MATERIALS[m] ? MATERIALS[m].color : 0xb5834a, roughness: 0.85 })); }
  add(x, z, items) {
    const near = this.list.find((p) => Math.hypot(p.x - x, p.z - z) < 1.2);
    if (near) { for (const [m, n] of Object.entries(items)) near.items[m] = (near.items[m] || 0) + n; this.rebuild(near); return near; }
    const p = { x, z, items: { ...items }, mesh: new THREE.Group() }; p.mesh.position.set(x, 0, z); this.game.scene.add(p.mesh); this.list.push(p); this.rebuild(p); return p;
  }
  total(p) { return Object.values(p.items).reduce((a, b) => a + b, 0); }
  rebuild(p) {
    const g = p.mesh; while (g.children.length) g.remove(g.children[0]); let i = 0;
    for (const [m, n] of Object.entries(p.items)) for (let k = 0; k < Math.min(4, Math.ceil(n / 3)); k++, i++) {
      const b = new THREE.Mesh(this.geo, this.mat(m)); const layer = Math.floor(i / 4), slot = i % 4; b.position.set((slot % 2 - 0.5) * 0.6, 0.21 + layer * 0.43, (Math.floor(slot / 2) - 0.5) * 0.6); b.rotation.y = (i * 0.37) % 0.5; b.castShadow = true; g.add(b);
    }
  }
  remove(p) { this.game.scene.remove(p.mesh); this.list.splice(this.list.indexOf(p), 1); }
  clear() { for (const p of this.list.slice()) this.remove(p); }
  serialize() { return this.list.map((p) => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), items: p.items })); }
  load(a) { this.clear(); for (const p of a || []) this.add(p.x, p.z, p.items); }
}
