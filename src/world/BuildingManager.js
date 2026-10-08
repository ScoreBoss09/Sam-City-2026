import * as THREE from 'three';
import { TILE, WALL_T } from '../config.js';
import { BUILDINGS } from '../data/buildings.js';
import { doorOffset, layoutFor } from '../data/layouts.js';
import { buildExterior, buildSite, buildInterior, furnitureColliders } from '../render/BuildingFactory.js';

let _contact = null;
function contactMat() {
  if (_contact) return _contact; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 10, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.62, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (_contact = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false }));
}
const COS = [1, 0, -1, 0], SIN = [0, 1, 0, -1];

/** Footprint, door and local->world transform for a def placed at tile (x0,z0) with rotation rot. */
export function geometry(def, x0, z0, rot) {
  const odd = rot % 2 === 1, w = odd ? def.d : def.w, d = odd ? def.w : def.d;
  const cx = (x0 + w / 2) * TILE, cz = (z0 + d / 2) * TILE, c = COS[rot], s = SIN[rot];
  const toWorld = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
  const D = def.d * TILE, off = doorOffset(def.w);
  const out = toWorld(off, D / 2 + 2.2);
  return { w, d, cx, cz, toWorld, off, doorOut: out, doorTile: [Math.floor(out[0] / TILE), Math.floor(out[1] / TILE)], rot };
}

export class BuildingManager {
  constructor(game) {
    this.game = game; this.world = game.world; this.scene = game.scene;
    this.list = []; this.nextUid = 1; this.interiorLight = new THREE.PointLight(0xffe2b0, 0, 24, 1.1); this.scene.add(this.interiorLight);
  }
  byDef(id, doneOnly = true) { return this.list.filter((b) => b.id === id && (!doneOnly || b.state === 'done')); }
  count(id, doneOnly = true) { return this.byDef(id, doneOnly).length; }

  /** Find a valid orientation for the cursor tile; returns the best candidate even when invalid (for the ghost). */
  evaluate(id, cx, cz, prefRot = 0) {
    const def = BUILDINGS[id]; let fallback = null;
    for (let k = 0; k < 4; k++) {
      const rot = (prefRot + k) % 4, odd = rot % 2, w = odd ? def.d : def.w, d = odd ? def.w : def.d;
      const x0 = cx - Math.floor(w / 2), z0 = cz - Math.floor(d / 2), geo = geometry(def, x0, z0, rot);
      const fits = this.world.canPlace(x0, z0, w, d);
      const needRoad = def.needsRoad !== false;
      const [dtx, dtz] = geo.doorTile;
      const roadOk = !needRoad || (this.world.inBounds(dtx, dtz) && (this.world.road[this.world.idx(dtx, dtz)] > 0 || (this.game.roadPlans && this.game.roadPlans.has(dtx, dtz))));
      let shoreOk = true; if (def.needsShore && fits) { shoreOk = false; for (let zz = z0 - 1; zz <= z0 + d && !shoreOk; zz++) for (let xx = x0 - 1; xx <= x0 + w; xx++) if (this.world.inBounds(xx, zz) && this.world.terrain[this.world.idx(xx, zz)] === 0) { shoreOk = true; break; } }
      const cand = { ok: fits && roadOk && shoreOk, reason: !fits ? 'Blocked' : (!roadOk ? 'Needs road frontage' : (!shoreOk ? 'Must be on the shore' : '')), rot, x0, z0, w, d, geo };
      if (cand.ok) return cand; if (!fallback || (fits && !fallback.fits)) { cand.fits = fits; fallback = cand; }
    }
    return fallback;
  }

  place(id, x0, z0, rot, { instant = false } = {}) {
    const def = { ...BUILDINGS[id], id }; const geo = geometry(def, x0, z0, rot);
    const b = {
      uid: this.nextUid++, id, def, x0, z0, w: geo.w, d: geo.d, rot, cx: geo.cx, cz: geo.cz, geo, toWorld: geo.toWorld,
      state: 'site', progress: 0, need: { ...(def.mat || {}) }, have: {}, reserved: {}, workers: [], residents: [], colliders: [],
      spots: { bed: [], work: [], idle: [], visit: [], pickup: [], terminal: [] }, ext: null, siteVis: null, interior: null, builders: 0,
    };
    b.doorOut = { x: geo.doorOut[0], z: geo.doorOut[1] }; b.doorTile = { x: geo.doorTile[0], z: geo.doorTile[1] };
    const dp = geo.toWorld(geo.off, def.d * TILE / 2 - 0.3); b.doorPos = { x: dp[0], z: dp[1] };
    const di = geo.toWorld(geo.off, def.d * TILE / 2 - 2.2); b.doorIn = { x: di[0], z: di[1] };
    this.world.buildings.set(b.uid, b); this.list.push(b); this.world.fill(b, !!def.park);
    const needT = Object.values(b.need).reduce((a, v) => a + v, 0);
    if (instant || needT === 0 && !def.work) { this.finish(b); }
    else {
      b.siteVis = buildSite(def); b.siteVis.group.position.set(b.cx, 0, b.cz); b.siteVis.group.rotation.y = rot * Math.PI / 2; this.scene.add(b.siteVis.group);
      b.siteVis.update(0, 0, needT || 1);
    }
    this.world.events.emit('building:added', b);
    return b;
  }

  needTotal(b) { return Object.values(b.need).reduce((a, v) => a + v, 0); }
  haveTotal(b) { return Object.values(b.have).reduce((a, v) => a + v, 0); }
  supply(b) { const n = this.needTotal(b); return n ? Math.min(1, this.haveTotal(b) / n) : 1; }
  missing(b, mat) { return (b.need[mat] || 0) - (b.have[mat] || 0) - (b.reserved[mat] || 0); }

  deliver(b, mat, qty) {
    b.have[mat] = (b.have[mat] || 0) + qty; b.reserved[mat] = Math.max(0, (b.reserved[mat] || 0) - qty);
    this.refreshSite(b);
  }
  refreshSite(b) { if (b.siteVis) b.siteVis.update(b.progress, this.haveTotal(b), this.needTotal(b) || 1); }
  /** amount is in builder-seconds. Progress can never run ahead of delivered materials. */
  addWork(b, amount) {
    if (b.state !== 'site') return;
    const cap = this.supply(b); const before = b.progress;
    b.progress = Math.min(cap, b.progress + amount / Math.max(1, b.def.work));
    if (b.progress !== before) this.refreshSite(b);
    if (b.progress >= 0.999 && cap >= 0.999) this.finish(b);
  }

  finish(b) {
    if (b.siteVis) { this.scene.remove(b.siteVis.group); b.siteVis = null; }
    const def = b.def, ext = buildExterior(def, b.uid); b.ext = ext;
    ext.group.position.set(b.cx, 0, b.cz); ext.group.rotation.y = b.rot * Math.PI / 2; this.scene.add(ext.group);
    ext.roof.position.add(new THREE.Vector3(b.cx, 0, b.cz)); ext.roof.rotation.y = b.rot * Math.PI / 2; this.scene.add(ext.roof);
    if (!def.park && !def.special) { const W = def.w * TILE, D = def.d * TILE; const dec = new THREE.Mesh(new THREE.PlaneGeometry(W + 5, D + 5), contactMat()); dec.rotation.x = -Math.PI / 2; dec.position.y = 0.045; dec.renderOrder = 1; ext.group.add(dec); }
    ext.group.traverse((o) => { if (o.isMesh) o.matrixAutoUpdate = true; });
    b.state = 'done'; b.progress = 1; b.layout = layoutFor(def);
    const odd = b.rot % 2 === 1, conv = (c) => { const [wx, wz] = b.toWorld(c.cx, c.cz); const sx = odd ? c.sz : c.sx, sz = odd ? c.sx : c.sz; return { minx: wx - sx / 2, maxx: wx + sx / 2, minz: wz - sz / 2, maxz: wz + sz / 2 }; };
    b.colliders = ext.colliders.map(conv).concat(furnitureColliders(b.layout).map(conv));
    if (def.id === 'lift' || def.id === 'tunnel') b.colliders = ext.colliders.map(conv);
    this.world.addColliders(b);
    const L = b.layout, tw = (p) => { const [x, z] = b.toWorld(p.x, p.z); return { x, z, b }; };
    b.spots.bed = L.beds.map((p) => { const [x, z] = b.toWorld(p.x, p.z), [ax, az] = b.toWorld(p.ax, p.az); return { x, z, ax, az, b, rotY: b.rot * Math.PI / 2, taken: null }; });
    b.spots.work = L.work.map(tw); b.spots.idle = L.idle.map(tw); b.spots.visit = L.visit.map(tw); b.spots.pickup = L.pickup.map(tw); b.spots.terminal = L.terminals.map(tw);
    // seats (chairs, sofas, benches) so sims can sit
    b.spots.seat = []; const head = (r) => (b.rot + r) * Math.PI / 2;
    const addSeat = (lx, lz, r, kind) => { const [x, z] = b.toWorld(lx, lz); b.spots.seat.push({ x, z, heading: head(r), kind, taken: null, b }); };
    const layoutKind = ['house', 'hut', 'shack', 'cabin', 'tavern', 'apartments'].includes(def.layout) ? 'dining' : (['clinic', 'townhall', 'police'].includes(def.layout) ? 'waiting' : 'desk');
    for (const f of L.furniture) {
      const rr = (f.r || 0) * Math.PI / 2, c = Math.round(Math.cos(rr)), sn = Math.round(Math.sin(rr));
      if (f.t === 'chair' || f.t === 'stool') addSeat(f.x, f.z, f.r || 0, f.t === 'stool' && def.layout === 'tavern' ? 'dining' : layoutKind);
      else if (f.t === 'sofa') for (const o of [-0.55, 0.55]) addSeat(f.x + o * c, f.z - o * sn, f.r || 0, 'sofa');
      else if (f.t === 'bench') for (const o of [-0.5, 0.5]) addSeat(f.x + o * c, f.z - o * sn, f.r || 0, 'waiting');
    }
    if (def.park === 'park') addSeat(1.4, 0.35, 0, 'bench');
    if (def.park === 'camp') for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, lx = Math.cos(a) * 2.5, lz = Math.sin(a) * 2.5; const [x, z] = b.toWorld(lx, lz); const [cx0, cz0] = b.toWorld(0, 0); b.spots.seat.push({ x, z, heading: Math.atan2(cx0 - x, cz0 - z), kind: 'bench', taken: null, b }); }
    if (def.park === 'plaza') { addSeat(-3.8, 0.3, 0, 'bench'); addSeat(3.8, 0.3, 0, 'bench'); }
    if (def.park === 'camp') { b.spots.idle = [[3.0, 0], [-3.0, 0], [0, 3.0], [0, -3.0]].map(([lx, lz]) => { const [x, z] = b.toWorld(lx, lz); return { x, z, b }; }); }
    else if (def.park === 'well') { b.spots.idle = [[1.4, 1.2], [-1.4, 1.2]].map(([lx, lz]) => { const [x, z] = b.toWorld(lx, lz); return { x, z, b }; }); }
    else if (def.park) { b.spots.idle = [0.2, -0.2].map((o, i) => { const [x, z] = b.toWorld((i ? 1.4 : -1.4), 0.4 + o); return { x, z, b }; }); }
    if (def.id === 'tunnel') { const [x, z] = b.toWorld(0, 3.6); b.trigger = { x, z }; }
    if (def.id === 'lift') { const [x, z] = b.toWorld(0, 0.5); b.trigger = { x, z }; }
    // chimney / smoke source (local coords) for the Decor smoke system
    const H = def.floors * 3.2, W = def.w * TILE, D = def.d * TILE; b.smoke = null;
    if (def.roof === 'thatch') b.smoke = { lx: 0, ly: H + 2.6, lz: 0 }; else if (def.roof === 'gable' && !def.special_ext) b.smoke = { lx: W * 0.2, ly: H + 2.4, lz: -D * 0.12 };
    else if (def.roof === 'factory') b.smoke = { lx: W / 2 - 1.5, ly: H + 8.4, lz: -D / 2 + 1.5 }; else if (def.roof === 'plant') b.smoke = { lx: -3.2, ly: H + 8, lz: -1.5 };
    if (ext.smokeSrc) b.smoke = { lx: ext.smokeSrc.x, ly: ext.smokeSrc.y, lz: ext.smokeSrc.z };
    if (ext.fire) b.fire = ext.fire;
    if (ext.fieldPlots && this.game.resources) this.game.resources.addFields(b, ext.fieldPlots);
    if (def.beds && def.cat === 'res' && !this.game.starterHome && !this.game.flags.noStarter) { this.game.starterHome = b; b.reservedForPlayer = true; if (b.spots.bed[0]) b.spots.bed[0].taken = 'player'; this.game.messages.push('Planning Office', 'This is Sam\'s home. Sleep in its bed (E) when you are tired.', 'good'); }
    this.world.events.emit('building:done', b);
  }

  remove(b) {
    if (this.game.resources) this.game.resources.removeFields(b);
    if (b.ext) { this.scene.remove(b.ext.group, b.ext.roof); }
    if (b.siteVis) this.scene.remove(b.siteVis.group);
    if (b.interior) this.scene.remove(b.interior);
    if (b.label) { this.scene.remove(b.label); b.label = null; }
    this.world.removeColliders(b); this.world.unfill(b); this.world.buildings.delete(b.uid);
    const i = this.list.indexOf(b); if (i >= 0) this.list.splice(i, 1);
    this.world.events.emit('building:removed', b);
  }

  /** Which finished building contains world point (x,z)? Used for roof cut-away and sim visibility. */
  buildingAtPoint(x, z) {
    const b = this.world.buildingAt(Math.floor(x / TILE), Math.floor(z / TILE)); return b && b.state === 'done' && !b.def.park ? b : null;
  }

  update(dt) {
    const g = this.game, pl = g.player, sim = g.mode === 'sim';
    const inside = sim ? this.buildingAtPoint(pl.x, pl.z) : null; this.playerInside = inside;
    for (const b of this.list) {
      if (b.state !== 'done' || !b.ext) continue;
      b.ext.roof.visible = b !== inside;
      const near = sim && Math.hypot(b.cx - pl.x, b.cz - pl.z) < 26 && b.layout && b.layout.furniture.length;
      if (near && !b.interior) { b.interior = buildInterior(b); b.interior.position.set(b.cx, 0, b.cz); b.interior.rotation.y = b.rot * Math.PI / 2; this.scene.add(b.interior); }
      if (b.interior) b.interior.visible = !!near;
    }
    // warm interior light follows the player indoors
    this._acc = (this._acc || 0) + dt; this.t = (this.t || 0) + dt; const tick = this._acc > 0.25; if (tick) this._acc = 0;
    for (const b of this.list) if (b.ext && b.ext.update && b.state === 'done') { if (b.def.park === 'camp' || tick) b.ext.update(dt, this.t, this.game.economy.stock, b); }
    const L = this.interiorLight;
    if (inside) { L.position.set(inside.cx, 2.6, inside.cz); L.intensity = 38; } else L.intensity = 0;
  }
}
