import * as THREE from 'three';
import { MATERIALS } from '../data/buildings.js';

/**
 * Things dropped on the ground: a little stack of crates that can be picked up again. Builders carry anything left lying
 * about to the Stockyard (Construction.dockPiles); hungry passers-by eat dropped food.
 */
export class Piles {
  constructor(game) { this.game = game; this.list = []; this.geo = new THREE.BoxGeometry(0.55, 0.42, 0.55); this.mats = {}; }
  mat(m) { return this.mats[m] || (this.mats[m] = new THREE.MeshStandardMaterial({ color: MATERIALS[m] ? MATERIALS[m].color : 0xb5834a, roughness: 0.85 })); }
  add(x, z, items) {
    const near = this.list.find((p) => Math.hypot(p.x - x, p.z - z) < 1.2);
    if (near) { for (const [m, n] of Object.entries(items)) near.items[m] = (near.items[m] || 0) + n; this.rebuild(near); return near; }
    const p = { x, z, items: { ...items }, mesh: new THREE.Group(), t0: this.game.elapsed || 0 }; p.mesh.position.set(x, 0, z); this.game.scene.add(p.mesh); this.list.push(p); this.rebuild(p); return p;
  }
  /** Now and then a hungry passer-by helps themselves to dropped food (there's no Stockyard for it, or nobody's fetched it yet). */
  update(dt) {
    if (!this.list.length || (this.t = (this.t || 0) - dt) > 0) return; this.t = 2; const g = this.game, now = g.elapsed;
    for (const p of this.list.slice()) {
      if (p.yard || !(p.items.food > 0) || now - (p.t0 ?? now) < 25) continue;   // (a farm's or forager's stack isn't dropped food)
      const s = g.population.sims.find((q) => (q.kind === 'resident' || q.kind === 'child') && !q.hidden && !q.inside && !q.down && q.hunger > 35 && !q.carry && Math.hypot(q.x - p.x, q.z - p.z) < 6); if (!s) continue;
      const n = Math.min(p.items.food, Math.ceil(s.hunger / 25)); p.items.food -= n; s.hunger = Math.max(0, s.hunger - n * 25); if (!p.items.food) delete p.items.food;
      if (s.mesh.visible && g.social) g.social.say(s, ['Ooh, free food!', 'Waste not, want not.', 'Someone\'s dropped their dinner. Lovely.'][Math.floor(Math.random() * 3)], 2.2);
      if (this.total(p) <= 0) this.remove(p); else this.rebuild(p);
    }
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
