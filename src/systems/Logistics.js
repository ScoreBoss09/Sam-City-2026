import * as THREE from 'three';
import { TILE } from '../config.js';
import { stdMat } from '../render/BuildingFactory.js';

/** Delivery trucks: spawn at the Lift, drive along roads to the depot, unload, return. */
export class Logistics {
  constructor(game) { this.game = game; this.trucks = []; }
  makeTruck(color) {
    const g = new THREE.Group(), add = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
    add(2.2, 2.4, 4.4, color, 0, 1.9, -0.6); add(2.2, 1.6, 1.6, 0x2c3e50, 0, 1.4, 2.1); add(1.9, 0.6, 0.1, 0x9fd8f0, 0, 1.9, 2.92);
    for (const [x, z] of [[-1.0, 2], [1.0, 2], [-1.0, -1.8], [1.0, -1.8]]) { const w = add(0.4, 0.9, 0.9, 0x111111, x, 0.45, z); }
    add(2.0, 0.2, 5.8, 0x333333, 0, 0.6, 0);
    return g;
  }
  dispatch(order) {
    const g = this.game, lift = g.lift, depot = g.buildings.list.find((b) => b.id === 'depot' && b.state === 'done');
    if (!depot) { g.economy.deliverToDepot(order); return; }
    const to = g.world.findPath(lift.doorTile.x, lift.doorTile.z, depot.doorTile.x, depot.doorTile.z, true);
    if (!to) { g.messages.push('Logistics', 'Truck could not reach the depot (no road). Goods held at the Lift dock.', 'warn'); g.economy.deliverToDepot(order); return; }
    const mesh = this.makeTruck(order.mat === 'steel' ? 0x6a7a8c : order.mat === 'glass' ? 0x3aa0c8 : order.mat === 'brick' ? 0xb4442f : 0xc08a40);
    const pts = to.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE }));
    const back = pts.slice().reverse();
    const t = { mesh, path: pts.slice(), order, back, phase: 'in', wait: 0 };
    mesh.position.set(lift.doorOut.x, 0, lift.doorOut.z); g.scene.add(mesh); this.trucks.push(t);
  }
  update(dt) {
    for (const t of this.trucks) {
      if (t.phase === 'unload') { t.wait -= dt; if (t.wait <= 0) { t.phase = 'out'; t.path = t.back.slice(); } continue; }
      const p = t.path[0]; if (!p) { t.done = true; if (t.phase === 'in') { t.phase = 'unload'; t.wait = 1.5; t.done = false; this.game.economy.deliverToDepot(t.order); } continue; }
      const dx = p.x - t.mesh.position.x, dz = p.z - t.mesh.position.z, d = Math.hypot(dx, dz), step = 9 * dt;
      const ang = Math.atan2(dx, dz);
      if (d > 0.1) { let da = ang - t.mesh.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); t.mesh.rotation.y += da * Math.min(1, dt * 8); }
      if (d <= step) { t.mesh.position.x = p.x; t.mesh.position.z = p.z; t.path.shift(); } else { t.mesh.position.x += dx / d * step; t.mesh.position.z += dz / d * step; }
    }
    for (const t of this.trucks) if (t.done) this.game.scene.remove(t.mesh);
    this.trucks = this.trucks.filter((t) => !t.done);
  }
}
