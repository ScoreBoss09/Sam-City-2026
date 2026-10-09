import * as THREE from 'three';
import { BUILDINGS, MATERIALS } from '../data/buildings.js';
import { upgradesFor } from '../data/upgrades.js';
import { makeCart } from '../render/Carts.js';
import { Sfx } from '../core/Sfx.js';
import { TILE } from '../config.js';

const unit = new THREE.BoxGeometry(1, 1, 1), poleMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.3 }), plankMat = new THREE.MeshStandardMaterial({ color: 0xa8804a, roughness: 0.9 });

/**
 * Upgrading a finished building: an order that looks like a building site to builders and to Sam (materials, then work),
 * while the people inside carry on. When it's done the building's def changes (an upstairs, a Tudor front, carts...).
 */
export class Upgrades {
  constructor(game) { this.game = game; this.orders = []; this.n = 0; }
  steps(b) { return upgradesFor(b.id, BUILDINGS[b.id]); }
  next(b) { const s = this.steps(b), l = b.level || 0; return l < s.length ? s[l] : null; }
  orderFor(b) { return this.orders.find((o) => o.upgradeOf === b) || null; }
  /** Buildings that could be upgraded right now (or are being), for the menu. */
  candidates() { return this.game.buildings.list.filter((b) => b.state === 'done' && (this.next(b) || this.orderFor(b))); }
  check(b) {
    const up = this.next(b), pop = this.game.population.count();
    if (b.state !== 'done') return { ok: false, why: 'Finish building it first' };
    if (this.orderFor(b)) return { ok: false, why: 'Already being upgraded' };
    if (!up) return { ok: false, why: 'Fully upgraded' };
    if (pop < up.pop) return { ok: false, why: `Needs ${up.pop} residents` };
    return { ok: true, up };
  }
  order(b, { quiet = false, prio, force = false } = {}) {
    const c = force && this.next(b) && !this.orderFor(b) ? { ok: true, up: this.next(b) } : this.check(b); if (!c.ok) return c; const g = this.game, up = c.up;
    const o = { uid: 'u' + (++this.n), upgradeOf: b, up, lvl: (b.level || 0) + 1, state: 'site', id: b.id, def: { name: `${b.def.name}: ${up.name}`, work: up.work, upgrade: true }, need: { ...up.mat }, have: {}, reserved: {}, progress: 0, builders: 0,
      x0: b.x0, z0: b.z0, w: b.w, d: b.d, cx: b.cx, cz: b.cz, rot: b.rot, doorOut: b.doorOut, prio: prio ?? g.construction.nextPrio() };
    o.scaffold = this.scaffold(b); this.orders.push(o);
    if (!quiet) { g.messages.push('Planning Office', `${o.def.name} ordered: ${Object.entries(up.mat).map(([m, n]) => `${n} ${m}`).join(', ')}. Builders work down the list in the Work queue.`, 'good'); Sfx.play('ui'); }
    return { ok: true, order: o };
  }
  cancel(o) {
    const g = this.game; for (const [m, n] of Object.entries(o.have)) g.economy.stock[m] += n; this.drop(o);
    g.messages.push('Planning Office', `${o.def.name} cancelled. Delivered materials went back to the Stockyard.`);
  }
  drop(o) { this.orders = this.orders.filter((q) => q !== o); if (o.scaffold) { this.game.scene.remove(o.scaffold); o.scaffold = null; } o.state = 'gone'; }
  complete(o) {
    const g = this.game, b = o.upgradeOf; this.drop(o); this.applyLevel(b, o.lvl);
    Sfx.play('done'); g.particles.burst(b.cx, (b.def.floors || 1) * 3.2 + 1.5, b.cz, 0xffd23f, 30, 2.5, 5, 0.16);
    g.messages.push('Planning Office', `${b.def.name} upgraded: ${o.up.name}!`, 'good'); if (g.started) g.ui.toast(`${o.up.icon} ${b.def.name}: ${o.up.name} finished!`, 3200);
    for (const s of b.residents.concat(b.workers)) s.moodBoost += 0.2;
    g.flags.upgrades = (g.flags.upgrades || 0) + 1;
  }
  /** Bring a building up to `lvl` (used on completion and when loading a save). */
  applyLevel(b, lvl) {
    const steps = this.steps(b), base = BUILDINGS[b.id];
    for (let i = b.level || 0; i < Math.min(lvl, steps.length); i++) steps[i].apply(b.def);
    b.level = lvl; if (b.def.bedsUp) b.def.beds = (base.beds || 0) + b.def.bedsUp;
    this.game.buildings.restyle(b, b.era ?? 0); this.addBeds(b); this.cartProp(b);
  }
  /** Beds upstairs: sleepers go up the stairs (out of sight) by the back of the room. */
  addBeds(b) {
    const want = b.def.bedsUp || 0, have = b.spots.bed.filter((s) => s.upstairs).length; if (want <= have) return;
    const st = b.spots.idle[0] || b.doorIn;
    for (let i = have; i < want; i++) b.spots.bed.push({ x: st.x, z: st.z, ax: st.x, az: st.z, b, rotY: b.rot * Math.PI / 2, taken: null, upstairs: true });
  }
  /** A cart parked beside the yard once it has carts. */
  cartProp(b) {
    if (!b.def.cart || !b.ext) return; const c = makeCart(b.def.cart); c.position.set(b.w * TILE / 2 + 0.9, 0, b.d * TILE / 2 - 1.2); c.rotation.y = 0.3; b.ext.group.add(c); b.ext.cart = c;
  }
  /** Poles and planks around the building while the work goes on. */
  scaffold(b) {
    const W = b.w * TILE, D = b.d * TILE, H = ((b.def.floors || 1) + 1) * 3.2, parts = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) parts.push([sx * (W / 2 + 0.5), H / 2, sz * (D / 2 + 0.5), 0.12, H, 0.12, poleMat]);
    for (let y = 1.6; y < H; y += 1.6) { parts.push([0, y, -(D / 2 + 0.5), W + 1.2, 0.08, 0.5, plankMat], [0, y, D / 2 + 0.5, W + 1.2, 0.08, 0.5, plankMat], [-(W / 2 + 0.5), y, 0, 0.5, 0.08, D + 1.2, plankMat], [W / 2 + 0.5, y, 0, 0.5, 0.08, D + 1.2, plankMat]); }
    const grp = new THREE.Group(); for (const [x, y, z, w, h, d, m] of parts) { const o = new THREE.Mesh(unit, m); o.position.set(x, y, z); o.scale.set(w, h, d); o.castShadow = true; grp.add(o); }
    grp.position.set(b.cx, 0, b.cz); grp.rotation.y = b.rot * Math.PI / 2; this.game.scene.add(grp); return grp;
  }
  serialize() { const L = this.game.buildings.list; return this.orders.map((o) => ({ b: L.indexOf(o.upgradeOf), have: o.have, progress: o.progress, prio: o.prio })); }
  load(arr, made) {
    for (const s of arr || []) { const b = made[s.b]; if (!b) continue; const r = this.order(b, { quiet: true, prio: s.prio, force: true }); if (r.ok) { r.order.have = s.have || {}; r.order.progress = s.progress || 0; } }
  }
  costText(up) { return Object.entries(up.mat).map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', '); }
}
