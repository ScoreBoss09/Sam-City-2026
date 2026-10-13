import { makeHorseCart } from '../render/Vehicles.js';
import { TILE } from '../config.js';
import { Sfx } from '../core/Sfx.js';
import * as THREE from 'three';
import { MATERIALS } from '../data/buildings.js';

const crate = new THREE.BoxGeometry(0.38, 0.3, 0.38), mats = {};
/** Fill the cart with what it's really carrying: planks, stone, bricks, steel, glass or sacks of food, a block per few. */
function loadCart(mesh, load) {
  const L = mesh.userData.load; L.clear(); let i = 0;
  for (const [m, n] of Object.entries(load)) for (let k = 0; k < Math.min(8, Math.ceil(n / 3)) && i < 18; k++, i++) { const b = new THREE.Mesh(crate, mats[m] || (mats[m] = new THREE.MeshStandardMaterial({ color: (MATERIALS[m] && MATERIALS[m].color) || 0xb5834a, roughness: 0.8 }))); b.position.set(-0.45 + (i % 3) * 0.45, 0.98 + Math.floor(i / 9) * 0.3, -1.25 + (Math.floor(i / 3) % 3) * 0.42); b.castShadow = true; L.add(b); }
}

// Carter's Yard carts. While a carter is on shift, he takes a horse and cart from the yard to the Stockyard, loads up to
// two dozen of whatever the next job on the work queue is short of, drives it round to the site and tips it off, then
// heads home for the next. Builders still carry the odd armful; the carts do the heavy lifting. The carter (a real
// resident) rides up front and isn't seen about town while he's out with the cart.
const LOAD = 24, SPEED = 3.6;
export class Carting {
  constructor(game) { this.game = game; this.carts = []; this.t = 2; }
  yards() { return this.game.buildings.list.filter((b) => b.state === 'done' && b.id === 'stables' && b.doorTile); }
  update(dt) {
    const g = this.game; if (!g.started || g.netVisitor) return; const k = Math.max(0, Math.min(8, g.clock.speed)); dt *= k; if (!dt) return;
    if ((this.t -= dt) <= 0) { this.t = 3; this.dispatch(); }
    for (const c of this.carts) this.drive(c, dt);
    this.carts = this.carts.filter((c) => !c.done);
  }
  /** A carter at work with no cart out, and a job that's short of something the Stockyard has: off he goes. */
  dispatch() {
    const g = this.game, depot = g.depot, h = g.clock.hour; if (!depot || h < 6 || h >= 20) return;
    for (const y of this.yards()) {
      const out = this.carts.filter((c) => c.yard === y).length, crew = y.workers.filter((w) => !w.remove && !w.down && !w.rescue && !w.carting && w.activity === 'work');
      if (out >= Math.min(2, y.workers.length) || !crew.length) continue;
      const job = this.nextJob(); if (!job) return;
      const route = this.route(y.doorTile, depot.doorTile), route2 = this.route(depot.doorTile, g.world.tileOf(job.at.x, job.at.z)), home = this.route(g.world.tileOf(job.at.x, job.at.z), y.doorTile);
      if (!route || !route2 || !home) continue;
      // load it now (so builders don't fetch the same goods twice)
      for (const [m, n] of Object.entries(job.load)) { g.economy.stock[m] -= n; g.economy.used(m, n); job.s.reserved[m] = (job.s.reserved[m] || 0) + n; }
      const w = crew[0]; w.carting = true; w.hidden = true;
      const mesh = makeHorseCart(); loadCart(mesh, job.load); mesh.userData.load.visible = false; g.scene.add(mesh); mesh.position.set(route[0].x, 0, route[0].z);
      this.carts.push({ yard: y, w, s: job.s, load: job.load, mesh, path: route, legs: [route2, home], stage: 'toYard', wait: 0 });
    }
  }
  /** The first job on the work queue (in order) that's short of goods the Stockyard has: what a cart would take it. */
  nextJob() {
    const g = this.game, B = g.buildings;
    for (const it of g.construction.queue()) {
      if (!it.s || this.carts.some((c) => c.s === it.s)) continue; const s = it.s, load = {}; let n = 0;
      for (const m of Object.keys(s.need)) { const q = Math.min(B.missing(s, m), Math.floor(g.economy.stock[m] || 0), LOAD - n); if (q > 0) { load[m] = q; n += q; } }
      if (n >= 6 || (n > 0 && Object.keys(s.need).every((m) => B.missing(s, m) <= (load[m] || 0)))) return { s, load, at: g.construction.perimeterPoint(s, { x: s.cx, z: s.cz }) };
    }
    return null;
  }
  route(from, to) {
    const w = this.game.world, p = w.findPath(from.x ?? from[0], from.z ?? from[1], to.x ?? to[0], to.z ?? to[1], true);
    return p && p.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE }));
  }
  drive(c, dt) {
    const g = this.game, m = c.mesh;
    if (c.wait > 0) { c.wait -= dt; return; }
    const p = c.path[0];
    if (!p) { this.arrive(c); return; }
    const dx = p.x - m.position.x, dz = p.z - m.position.z, d = Math.hypot(dx, dz), step = SPEED * dt;
    if (d > 0.1) { let da = Math.atan2(dx, dz) - m.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); m.rotation.y += da * Math.min(1, dt * 6); }
    if (d <= step) { m.position.x = p.x; m.position.z = p.z; c.path.shift(); } else { m.position.x += dx / d * step; m.position.z += dz / d * step; }
    const t = performance.now() / 120; m.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(t + i * 1.6) * 0.5; });
    if (g.mode === 'sim' && Math.random() < dt * 0.4 && Math.hypot(g.player.x - m.position.x, g.player.z - m.position.z) < 25) Sfx.tone(520 + Math.random() * 80, 0.05, { type: 'square', vol: 0.012 });   // clip-clop
  }
  arrive(c) {
    const g = this.game, s = c.s;
    if (c.stage === 'toYard') { c.stage = 'toSite'; c.path = c.legs[0]; c.wait = 2; c.mesh.userData.load.visible = true; return; }   // loading at the Stockyard
    if (c.stage === 'toSite') {
      const live = g.buildings.list.includes(s) || (g.upgrades && g.upgrades.orders.includes(s));
      for (const [m, n] of Object.entries(c.load)) { if (live && (s.state === 'site' || s.upgradeOf)) g.buildings.deliver(s, m, n); else { g.economy.add(m, n, false); s.reserved[m] = Math.max(0, (s.reserved[m] || 0) - n); } }
      g.particles && g.particles.burst(c.mesh.position.x, 0.6, c.mesh.position.z, 0xb5834a, 8, 0.8, 1.2, 0.08);
      c.mesh.userData.load.visible = false; c.stage = 'home'; c.path = c.legs[1]; c.wait = 2.5; return;
    }
    this.finish(c);
  }
  finish(c) { c.done = true; this.game.scene.remove(c.mesh); if (c.w) { c.w.carting = false; c.w.hidden = false; } }
  /** Out with a cart when the game is saved: the goods are already at the site, the carter is home. */
  serialize() { return null; }
}
