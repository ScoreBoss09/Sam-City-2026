import * as THREE from 'three';
import { TILE } from '../config.js';

const WORK = { 1: 3.2, 2: 5.5 };   // builder-seconds of digging per tile (dirt / paved)

/**
 * Ordered-but-unbuilt paths. God mode only draws the plan (tan stakes); somebody (Sam with a shovel, or a builder sim)
 * has to walk there and pack the earth before the tile becomes a real road. Paved roads also eat 1 stone per tile.
 */
export class RoadPlans {
  constructor(game) {
    this.game = game; this.plans = new Map(); this.group = new THREE.Group(); game.scene.add(this.group);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xe8c987, transparent: true, opacity: 0.55, depthWrite: false });
    this.matPaved = new THREE.MeshBasicMaterial({ color: 0xbfc6cf, transparent: true, opacity: 0.55, depthWrite: false });
    this.stakeMat = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 }); this.flagMat = new THREE.MeshBasicMaterial({ color: 0xff5a3a });
    this.stakeGeo = new THREE.BoxGeometry(0.12, 0.9, 0.12); this.flagGeo = new THREE.BoxGeometry(0.4, 0.22, 0.03); this.tileGeo = new THREE.BoxGeometry(TILE - 0.5, 0.06, TILE - 0.5);
  }
  key(x, z) { return z * 1000 + x; }
  has(x, z) { return this.plans.has(this.key(x, z)); }
  get(x, z) { return this.plans.get(this.key(x, z)); }
  get count() { return this.plans.size; }
  list() { return [...this.plans.values()]; }
  at(wx, wz) { return this.get(Math.floor(wx / TILE), Math.floor(wz / TILE)); }

  plan(x, z, type = 1) {
    const w = this.game.world; if (!w.canRoad(x, z, type) || this.has(x, z)) return false;
    const p = { x, z, type, progress: 0, reserved: null, paid: false, cx: (x + 0.5) * TILE, cz: (z + 0.5) * TILE }, m = new THREE.Group();
    const t = new THREE.Mesh(this.tileGeo, type === 2 ? this.matPaved : this.mat); t.position.y = 0.06; m.add(t);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const s = new THREE.Mesh(this.stakeGeo, this.stakeMat); s.position.set(sx * (TILE / 2 - 0.5), 0.45, sz * (TILE / 2 - 0.5)); m.add(s); if (sx === 1 && sz === 1) { const f = new THREE.Mesh(this.flagGeo, this.flagMat); f.position.set(sx * (TILE / 2 - 0.5) - 0.2, 0.85, sz * (TILE / 2 - 0.5)); m.add(f); } }
    m.position.set(p.cx, 0, p.cz); p.mesh = m; p.tile = t; this.group.add(m); this.plans.set(this.key(x, z), p); return p;
  }
  cancel(x, z) { const p = this.get(x, z); if (!p) return false; this.drop(p); return true; }
  drop(p) { this.group.remove(p.mesh); this.plans.delete(this.key(p.x, p.z)); if (p.reserved) p.reserved.roadPlan = null; }

  /** Work done by a sim or Sam. Returns true when the tile became a road. */
  work(p, dt) {
    const g = this.game, w = g.world; if (this.plans.get(this.key(p.x, p.z)) !== p) return true;
    if (p.type === 2 && !p.paid) { if (g.economy.stock.stone < 1) return false; g.economy.stock.stone -= 1; p.paid = true; }
    p.progress += dt / WORK[p.type]; p.tile.scale.y = 1 + p.progress * 2; p.tile.material.opacity = 0.55 + p.progress * 0.35;
    if (p.progress >= 1) { let felled = 0; for (const t of g.terrain.trees) if (t.alive && t.tx === p.x && t.tz === p.z) { g.terrain.removeTree(t); felled++; } if (felled && g.depot) g.economy.add('timber', felled); this.drop(p); w.addRoad(p.x, p.z, p.type); g.flags.pathsBuilt = (g.flags.pathsBuilt || 0) + 1; return true; }
    return false;
  }
  /** Nearest unclaimed plan for a builder sim (paved ones only if there is stone). */
  next(sim) {
    let best = null, bd = 1e9; const stone = this.game.economy.stock.stone;
    for (const p of this.plans.values()) { if (p.reserved && p.reserved !== sim) continue; if (p.type === 2 && !p.paid && stone < 1) continue; const d = Math.hypot(p.cx - sim.x, p.cz - sim.z); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  clear() { for (const p of [...this.plans.values()]) this.drop(p); }
  serialize() { return this.list().map((p) => [p.x, p.z, p.type, +p.progress.toFixed(2), p.paid ? 1 : 0]); }
  load(a) { this.clear(); for (const [x, z, t, pr, paid] of a || []) { const p = this.plan(x, z, t); if (p) { p.progress = pr; p.paid = !!paid; p.tile.scale.y = 1 + pr * 2; } } }
}
