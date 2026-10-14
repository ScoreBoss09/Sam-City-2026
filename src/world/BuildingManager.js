import * as THREE from 'three';
import { TILE, UNIT, WALL_T, WALL_H } from '../config.js';
import { BUILDINGS } from '../data/buildings.js';
import { doorOffset, layoutFor } from '../data/layouts.js';
import { Sfx } from '../core/Sfx.js';
import { buildExterior, buildSite, buildInterior, furnitureColliders, upperColliders, roomColliders } from '../render/BuildingFactory.js';
import { laneRect } from './Levels.js';
import { styleDef } from '../data/ages.js';
import { windowGlow } from '../render/Textures.js';

let _contact = null;
function contactMat() {
  if (_contact) return _contact; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 10, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.62, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (_contact = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false }));
}
const COS = [1, 0, -1, 0], SIN = [0, 1, 0, -1];
/** Free GPU buffers that belong only to this object (merged/own geometry), never the shared ones. */
export function disposeOwned(root) { root.traverse((o) => { if (o.geometry && o.geometry.userData && o.geometry.userData.own) o.geometry.dispose(); }); }

/** Footprint, door and local->world transform for a def placed at tile (x0,z0) with rotation rot. */
/** Grid tiles a def covers along its own width / depth (buildings keep their size in metres; the plot rounds up to whole tiles). */
export function footprint(def) { return [Math.max(1, Math.ceil(def.w * UNIT / TILE - 1e-6)), Math.max(1, Math.ceil(def.d * UNIT / TILE - 1e-6))]; }
export function geometry(def, x0, z0, rot) {
  const odd = rot % 2 === 1, [fw, fd] = footprint(def), w = odd ? fd : fw, d = odd ? fw : fd, c = COS[rot], s = SIN[rot];
  // the building stands flush with the front of its plot (door onto the street), with any spare ground left as a back garden
  const W = def.w * UNIT, D = def.d * UNIT, shift = (fd * TILE - D) / 2, fx = (x0 + w / 2) * TILE, fz = (z0 + d / 2) * TILE;
  const cx = fx + shift * s, cz = fz + shift * c;
  const toWorld = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
  const off = doorOffset(def.w);
  const out = toWorld(off, D / 2 + 2.2);
  return { w, d, cx, cz, fx, fz, W, D, toWorld, off, doorOut: out, doorTile: [Math.floor(out[0] / TILE), Math.floor(out[1] / TILE)], rot };
}

export class BuildingManager {
  constructor(game) {
    this.game = game; this.world = game.world; this.scene = game.scene;
    this.list = []; this.nextUid = 1; this.interiorLight = new THREE.PointLight(0xffe2b0, 0, 24, 1.1); this.scene.add(this.interiorLight);
    { const s = new THREE.Group(), plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.025), new THREE.MeshStandardMaterial({ color: 0xf2ecdc, roughness: 0.5 })), rock = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.4 })); rock.position.z = 0.02; s.add(plate, rock); s.userData.rock = rock; s.visible = false; this.scene.add(s); this.switchMesh = s; }   // the light switch by the front door
  }
  byDef(id, doneOnly = true) { return this.list.filter((b) => b.id === id && (!doneOnly || b.state === 'done')); }
  count(id, doneOnly = true) { return this.byDef(id, doneOnly).length; }
  /** Places people go shopping / eat out (any finished building flagged shopping / dining). */
  shops() { const sv = this.game.service; return this.list.filter((b) => b.state === 'done' && b.def.shopping && b.spots.visit && b.spots.visit.length && (!sv || sv.open(b))); }   // (only those open: somebody behind the counter)
  diners() { const sv = this.game.service; return this.list.filter((b) => b.state === 'done' && b.def.dining && (!sv || sv.open(b))); }
  /** Village-wide happiness from parks, the church, the pub... (each extra copy of the same thing counts half as much). */
  townJoy() {
    if (this._joyT && this.game.elapsed - this._joyT < 2) return this._joy; const seen = {}; let j = 0;
    for (const b of this.list) if (b.state === 'done' && b.def.joy) { const n = seen[b.id] = (seen[b.id] || 0) + 1; j += b.def.joy / n; }
    this._joyT = this.game.elapsed || 0.001; return (this._joy = Math.min(0.4, j));
  }

  /** Find a valid orientation for the cursor tile; returns the best candidate even when invalid (for the ghost). */
  evaluate(id, cx, cz, prefRot = 0) {
    const def = BUILDINGS[id]; let fallback = null;
    for (let k = 0; k < 4; k++) {
      const rot = (prefRot + k) % 4, odd = rot % 2, [fw, fd] = footprint(def), w = odd ? fd : fw, d = odd ? fw : fd;
      const x0 = cx - Math.floor(w / 2), z0 = cz - Math.floor(d / 2), geo = geometry(def, x0, z0, rot);
      const fits = this.world.canPlace(x0, z0, w, d);
      const needRoad = def.needsRoad !== false;
      const [dtx, dtz] = geo.doorTile;
      const roadOk = !needRoad || (this.world.inBounds(dtx, dtz) && (this.world.road[this.world.idx(dtx, dtz)] > 0 || (this.game.roadPlans && this.game.roadPlans.has(dtx, dtz))));
      let shoreOk = true; if (def.needsShore && fits) { shoreOk = false; for (let zz = z0 - 1; zz <= z0 + d && !shoreOk; zz++) for (let xx = x0 - 1; xx <= x0 + w; xx++) if (this.world.inBounds(xx, zz) && this.world.terrain[this.world.idx(xx, zz)] === 0) { shoreOk = true; break; } }
      const cand = { ok: fits && roadOk && shoreOk, reason: !fits ? this.blockedWhy(x0, z0, w, d) : (!roadOk ? 'Needs road frontage' : (!shoreOk ? 'Must be on the shore' : '')), rot, x0, z0, w, d, geo };
      if (cand.ok) return cand; if (!fallback || (fits && !fallback.fits)) { cand.fits = fits; fallback = cand; }
    }
    return fallback;
  }

  place(id, x0, z0, rot, { instant = false, era } = {}) {
    const def = { ...BUILDINGS[id], id }; const geo = geometry(def, x0, z0, rot);
    const b = {
      uid: this.nextUid++, id, def, x0, z0, w: geo.w, d: geo.d, rot, cx: geo.cx, cz: geo.cz, geo, toWorld: geo.toWorld,
      state: 'site', progress: 0, need: { ...(def.mat || {}) }, have: {}, reserved: {}, workers: [], residents: [], colliders: [],
      spots: { bed: [], work: [], idle: [], visit: [], pickup: [], terminal: [] }, ext: null, siteVis: null, interior: null, builders: 0,
    };
    if (era !== undefined) b.era = era;
    b.doorOut = { x: geo.doorOut[0], z: geo.doorOut[1] }; b.doorTile = { x: geo.doorTile[0], z: geo.doorTile[1] };
    const dp = geo.toWorld(geo.off, def.d * UNIT / 2 - 0.3); b.doorPos = { x: dp[0], z: dp[1] };
    const di = geo.toWorld(geo.off, def.d * UNIT / 2 - 2.2); b.doorIn = { x: di[0], z: di[1] };
    this.world.buildings.set(b.uid, b); this.list.push(b); this.world.fill(b, !!def.park);
    const needT = Object.values(b.need).reduce((a, v) => a + v, 0);
    if (instant || needT === 0 && !def.work) { this.finish(b); }
    else {
      b.siteVis = buildSite(def); b.siteVis.group.position.set(b.cx, 0, b.cz); b.siteVis.group.rotation.y = rot * Math.PI / 2; this.scene.add(b.siteVis.group);
      b.siteVis.update(0, 0, needT || 1);
    }
    if (b.state === 'site' && this.game.construction) b.prio = this.game.construction.nextPrio();
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
    b.progress = Math.max(b.progress, Math.min(cap, b.progress + amount / Math.max(1, b.def.work)));
    if (b.progress !== before) this.refreshSite(b);
    if (b.progress >= 0.999 && cap >= 0.999) { if (b.upgradeOf) this.game.upgrades.complete(b); else this.finish(b); }
  }

  /** Chain bonus from Sam's minigame: a little progress even without materials (never completes a site that lacks them). */
  bonusWork(b, frac) {
    if (b.state !== 'site') return 0; const before = b.progress; b.progress = Math.max(b.progress, Math.min(Math.max(0.92, this.supply(b)), b.progress + frac)); this.refreshSite(b);
    if (b.progress >= 0.999 && this.supply(b) >= 0.999) { if (b.upgradeOf) this.game.upgrades.complete(b); else this.finish(b); } return b.progress - before;
  }
  finish(b) {
    { const f = this.game.flags, r = f.recent || (f.recent = []); if (!b.def.special && this.game.clock) { r.push({ id: b.id, name: b.def.name, day: this.game.clock.totalDays }); if (r.length > 10) r.shift(); } }   // for the townsfolk to talk about
    { const g = this.game, A = g.flags.asks; if (g.started && A && A[b.id]) { const who = g.population.sims.filter((s) => A[b.id].includes(s.id) && !s.remove); delete A[b.id];   // somebody asked for this
      if (who.length) { for (const s of who) { s.moodBoost += 0.25; s.samRel = Math.min(100, (s.samRel || 0) + 8); s.wishFor = null; if (s.mesh.visible && g.social) g.social.say(s, `A ${b.def.name}! I asked for that!`, 3); }
        g.messages.push('Town', `${who.length === 1 ? who[0].name + ' asked' : who.length + ' people asked'} for a ${b.def.name}. ${who.length === 1 ? (who[0].gender === 'f' ? 'She\'s' : 'He\'s') : 'They\'re all'} chuffed to bits.`, 'good'); } } }
    if (b.siteVis) { this.scene.remove(b.siteVis.group); b.siteVis = null; }
    const def = b.def; if (b.era === undefined) b.era = this.game.tech ? this.game.tech.era : 0;
    const ext = this.mountExterior(b);
    b.state = 'done'; b.progress = 1; b.layout = layoutFor(def); if (this.game.lamps) this.game.lamps.autoFor(b);
    this.setColliders(b);
    const L = b.layout, tw = (p) => { const [x, z] = b.toWorld(p.x, p.z); return { x, z, b }; };
    b.spots.bed = L.beds.map((p) => { const [x, z] = b.toWorld(p.x, p.z), [ax, az] = b.toWorld(p.ax, p.az); return { x, z, ax, az, b, rotY: b.rot * Math.PI / 2, taken: null, upstairs: !!p.up }; });
    b.spots.work = L.work.map(tw); b.spots.idle = L.idle.map(tw); b.spots.visit = L.visit.map(tw); b.spots.pickup = L.pickup.map(tw); b.spots.terminal = L.terminals.map(tw);
    // seats (chairs, sofas, benches) so sims can sit
    b.spots.seat = []; const head = (r) => (b.rot + r) * Math.PI / 2;
    const addSeat = (lx, lz, r, kind) => { const [x, z] = b.toWorld(lx, lz); b.spots.seat.push({ x, z, heading: head(r), kind, taken: null, b }); };
    const layoutKind = L.seatKind || (['house', 'hut', 'shack', 'cabin', 'tavern', 'apartments', 'chippy'].includes(def.layout) ? 'dining' : (['clinic', 'townhall', 'police', 'hall', 'bookies', 'postoffice'].includes(def.layout) ? 'waiting' : 'desk'));
    for (const f of L.furniture) {
      const rr = (f.r || 0) * Math.PI / 2, c = Math.round(Math.cos(rr)), sn = Math.round(Math.sin(rr));
      if (f.t === 'chair' || f.t === 'stool') addSeat(f.x, f.z, f.r || 0, f.t === 'stool' && (def.layout === 'tavern' || def.layout === 'chippy') ? 'dining' : layoutKind);
      else if (f.t === 'pew') for (const o of [-1, 0, 1]) addSeat(f.x + o * c, f.z - o * sn, f.r || 0, 'pew');
      else if (f.t === 'sofa') for (const o of [-0.55, 0.55]) addSeat(f.x + o * c, f.z - o * sn, f.r || 0, 'sofa');
      else if (f.t === 'bench') for (const o of [-0.5, 0.5]) addSeat(f.x + o * c, f.z - o * sn, f.r || 0, 'waiting');
    }
    for (const s of L.seats || []) addSeat(s.x, s.z, s.r || 0, s.kind || layoutKind);   // seats a layout lists itself (cinema rows, bar stools on a custom piece...)
    b.spots.counters = (L.counters || []).map((c) => ({ staff: tw(c.staff), cust: tw(c.cust), kind: c.kind || 'till', goods: c.goods || null, b }));
    b.spots.tables = (L.tables || []).map((t) => ({ ...tw(t), seats: (t.seats || []).map(tw) }));
    b.spots.kitchen = (L.kitchen || []).map(tw);
    if (def.park === 'park') addSeat(1.4, 0.35, 0, 'bench');
    if (def.park === 'camp') for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, lx = Math.cos(a) * 2.5, lz = Math.sin(a) * 2.5; const [x, z] = b.toWorld(lx, lz); const [cx0, cz0] = b.toWorld(0, 0); b.spots.seat.push({ x, z, heading: Math.atan2(cx0 - x, cz0 - z), kind: 'bench', taken: null, b }); }
    if (def.park === 'plaza') { addSeat(-3.8, 0.3, 0, 'bench'); addSeat(3.8, 0.3, 0, 'bench'); }
    if (def.park === 'bandstand') { addSeat(-2.9, 2.6, 0, 'bench'); addSeat(2.9, 2.6, 0, 'bench'); }
    if (def.park === 'busstop') addSeat(0, -0.9, 0, 'bench');
    if (def.park === 'camp') { b.spots.idle = [[3.0, 0], [-3.0, 0], [0, 3.0], [0, -3.0]].map(([lx, lz]) => { const [x, z] = b.toWorld(lx, lz); return { x, z, b }; }); }
    else if (def.park === 'well') { b.spots.idle = [[1.4, 1.2], [-1.4, 1.2]].map(([lx, lz]) => { const [x, z] = b.toWorld(lx, lz); return { x, z, b }; }); }
    else if (def.park) { b.spots.idle = [0.2, -0.2].map((o, i) => { const [x, z] = b.toWorld((i ? 1.4 : -1.4), 0.4 + o); return { x, z, b }; }); }
    if (def.id === 'tunnel') { const [x, z] = b.toWorld(0, 3.6); b.trigger = { x, z }; }
    if (def.id === 'lift') { const [x, z] = b.toWorld(0, 0.5); b.trigger = { x, z }; }
    // chimney / smoke source (local coords) for the Decor smoke system
    const H = def.floors * 3.2, W = def.w * UNIT, D = def.d * UNIT; b.smoke = null;
    if (def.roof === 'thatch') b.smoke = { lx: 0, ly: H + 2.6, lz: 0 }; else if (def.roof === 'gable' && !def.special_ext) b.smoke = { lx: W * 0.2, ly: H + 2.4, lz: -D * 0.12 };
    else if (def.roof === 'factory') b.smoke = { lx: W / 2 - 1.5, ly: H + 8.4, lz: -D / 2 + 1.5 }; else if (def.roof === 'plant') b.smoke = { lx: -3.2, ly: H + 8, lz: -1.5 };
    if (ext.smokeSrc) b.smoke = { lx: ext.smokeSrc.x, ly: ext.smokeSrc.y, lz: ext.smokeSrc.z };
    if (ext.fire) b.fire = ext.fire;
    if (ext.fieldPlots && this.game.resources) this.game.resources.addFields(b, ext.fieldPlots);
    if (def.beds && def.cat === 'res' && !this.game.starterHome && !this.game.flags.noStarter) { this.game.starterHome = b; b.reservedForPlayer = true; if (b.spots.bed[0]) b.spots.bed[0].taken = 'player'; this.game.messages.push('Planning Office', 'This is Sam\'s home. Sleep in its bed (E) when you are tired.', 'good'); }
    this.world.events.emit('building:done', b);
  }

  /** Why a plot can't be built on, in words (a bush or rock can be moved with the Move plants tool). */
  blockedWhy(x0, z0, w, d) {
    const W = this.world; let res = false, road = false, occ = false, water = false;
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) { if (!W.isLand(x, z)) { water = true; continue; } const i = W.idx(x, z); if (W.occ[i]) occ = true; else if (W.road[i]) road = true; else if (W.res[i]) res = true; }
    return occ ? 'Blocked by another building' : water ? 'Not on water' : road ? 'Blocked by a road' : res ? 'A bush, rock, ore or clay pit is in the way: move it with the Move tool (🌱, key 8)' : 'Blocked';
  }
  /** Walls, furniture (upstairs furniture only blocks up there) and, for the sims' route finder only, the stairs. */
  setColliders(b) {
    const def = b.def, ext = b.ext, odd = b.rot % 2 === 1, conv = (c) => { const [wx, wz] = b.toWorld(c.cx, c.cz); const sx = odd ? c.sz : c.sx, sz = odd ? c.sx : c.sz; return { minx: wx - sx / 2, maxx: wx + sx / 2, minz: wz - sz / 2, maxz: wz + sz / 2, h: c.h, lo: c.lo, top: c.top, navOnly: c.navOnly, cam: c.cam, furn: c.furn, vh: c.h ?? (c.lo !== undefined ? c.lo + 3.2 : ext.height) }; };   // vh: how high it really stands (bullet holes stop there)
    if (b.colliders && b.colliders.length) this.world.removeColliders(b);
    const st = ext.plan && ext.plan.stair, stairs = st ? st.lanes.map((ln) => { const r = laneRect(st, ln); return { cx: (r[0] + r[1]) / 2, cz: (r[2] + r[3]) / 2, sx: r[1] - r[0], sz: r[3] - r[2], navOnly: true }; }) : [];
    b.colliders = ext.colliders.map(conv).concat(furnitureColliders(b.layout).map(conv), upperColliders(def).map(conv), roomColliders(b.layout).map(conv), stairs.map(conv));
    if (def.id === 'lift' || def.id === 'tunnel') b.colliders = ext.colliders.map(conv);
    this.world.addColliders(b); b.nav = undefined;
  }
  /** After an upgrade adds a storey: the furniture makes room for the new stairs and the colliders follow. */
  refit(b) {
    if (b.state !== 'done' || !b.ext) return; const lay = layoutFor(b.def); for (const k of ['furniture', 'walls', 'floors', 'lights', 'upper']) b.layout[k] = lay[k]; this.setColliders(b);
    if (lay.beds.length && lay.beds.every((q) => q.up)) for (const s of b.spots.bed) s.upstairs = true;   // a home that's gone two-storey sleeps upstairs
    lay.beds.forEach((q, i) => { if (q.up && b.spots.bed[i]) b.spots.bed[i].upstairs = true; });   // beds that made way for the stairs are upstairs now
    if (b.interior) { this.scene.remove(b.interior); b.interior = null; }
  }
  /** Build and place the outside of a finished building (in the style of its era). */
  mountExterior(b) {
    const def = b.def, g = this.game; if (b.age === undefined) b.age = g.tech ? g.tech.age : 4; const ext = buildExterior(styleDef(def, b.age), b.uid, b.era ?? 0); b.ext = ext;
    ext.group.position.set(b.cx, 0, b.cz); ext.group.rotation.y = b.rot * Math.PI / 2; this.scene.add(ext.group);
    ext.roof.position.add(new THREE.Vector3(b.cx, 0, b.cz)); ext.roof.rotation.y = b.rot * Math.PI / 2; this.scene.add(ext.roof);
    if (!def.park && !def.special) { const W = def.w * UNIT, D = def.d * UNIT; const dec = new THREE.Mesh(new THREE.PlaneGeometry(W + 5, D + 5), contactMat()); dec.rotation.x = -Math.PI / 2; dec.position.y = 0.045; dec.renderOrder = 1; ext.group.add(dec); }
    ext.group.traverse((o) => { if (o.isMesh) o.matrixAutoUpdate = true; });
    if (b.glassMat) b.glassMat.dispose();
    if (ext.glass && ext.glass.length) { b.glassMat = ext.glass[0].material.clone(); for (const m of ext.glass) m.material = b.glassMat; b.litK = 0; }   // its own lights
    return ext;
  }
  /** Modernise a building: same footprint, colliders and people, new fittings for the new era. */
  restyle(b, era) {
    if (b.state !== 'done' || !b.ext || b.def.special || b.def.park) { b.era = era; return; }
    b.era = era; if (this.game.tech) b.age = this.game.tech.age; this.scene.remove(b.ext.group, b.ext.roof); disposeOwned(b.ext.group); disposeOwned(b.ext.roof); this.mountExterior(b); b.doorK = 0; if (b.def.cart && this.game.upgrades) this.game.upgrades.cartProp(b);
    if (b.interior) { this.scene.remove(b.interior); b.interior = null; }
    const g = this.game; if (g.particles) g.particles.burst(b.cx, (b.def.floors || 1) * 3.2 + 1, b.cz, 0xfff3a0, 14, 2.5, 3, 0.18);
  }
  remove(b) {
    if (b === this.game.starterHome) { this.game.starterHome = null; this.game.messages.push('Planning Office', 'Sam\'s home has been knocked down. The next house to be finished will be his.', 'warn'); }   // the H goes with it
    if (this.game.resources) this.game.resources.removeFields(b);
    if (this.game.upgrades) { const o = this.game.upgrades.orderFor(b); if (o) this.game.upgrades.drop(o); }
    if (b.ext) { this.scene.remove(b.ext.group, b.ext.roof); disposeOwned(b.ext.group); disposeOwned(b.ext.roof); }
    if (b.siteVis) this.scene.remove(b.siteVis.group);
    if (b.interior) this.scene.remove(b.interior);
    if (b.label) { this.scene.remove(b.label); b.label = null; }
    this.world.removeColliders(b); this.world.unfill(b); this.world.buildings.delete(b.uid);
    const i = this.list.indexOf(b); if (i >= 0) this.list.splice(i, 1);
    this.world.events.emit('building:removed', b);
  }

  church() { return this.list.find((b) => b.id === 'church' && b.state === 'done') || this.list.find((b) => b.id === 'chapel' && b.state === 'done') || null; }
  hospital() { return this.list.find((b) => b.id === 'clinic' && b.state === 'done') || this.list.find((b) => b.id === 'surgery' && b.state === 'done') || null; }
  /** Is anybody in there with the lights on? */
  isLit(b, h) {
    if (this.game.hazards && this.game.hazards.powerCut > 0 && this.game.tech && this.game.tech.era >= 1) return false;
    if (b.light !== undefined && b.lightDay === (this.game.clock.totalDays || 0)) return b.light;   // Sam flicked the switch today
    const awake = (s) => s.inside === b && s.pose !== 'sleep';
    if (b.def.cat === 'res') return b.residents.some(awake);
    if (b.workers.some(awake)) return true;
    if (b.def.dining || b.id === 'nightclub') return h >= 17 || h < (b.id === 'nightclub' ? 2 : 0.5);
    return (b.def.shopping || b.def.transit) && h >= 7 && h < 21;
  }
  /** Where the light switch is: on the inside wall beside the front door. */
  switchAt(b) {
    if (!b.doorPos || !b.doorIn) return null; const nx = b.doorIn.x - b.doorPos.x, nz = b.doorIn.z - b.doorPos.z, n = Math.hypot(nx, nz) || 1, ux = nx / n, uz = nz / n, k = -0.3 + WALL_T / 2 + 0.02;
    return { x: b.doorPos.x + ux * k + uz * 0.95, z: b.doorPos.z + uz * k - ux * 0.95, rot: Math.atan2(ux, uz) };
  }
  flipLight(b) { const on = !this.isLit(b, this.game.clock.hour); b.light = on; b.lightDay = this.game.clock.totalDays || 0; Sfx.play('ui'); return on; }
  /** Can Sam see the people inside? Yes when Sam is in there, or the front door is open and Sam is nearby. */
  canSeeInto(b) {
    if (b === this.playerInside) return true; const g = this.game; if (g.mode !== 'sim' || !b.doorPos) return false;
    const d = Math.hypot(g.player.x - b.cx, g.player.z - b.cz); return d < 24 || (b.doorK > 0.15 && d < 32);   // through the windows, or the open door
  }
  /** Is world point (x,z) on the building itself (not just its plot)? pad: extra metres around it. */
  onBuilding(b, x, z, pad = 0) { const c = COS[b.rot], s = SIN[b.rot], dx = x - b.cx, dz = z - b.cz, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) <= b.def.w * UNIT / 2 + pad && Math.abs(lz) <= b.def.d * UNIT / 2 + pad; }
  /** World-space box of a building's front doorway (what a closed door blocks). */
  doorRect(b) {
    if (b.doorRectC) return b.doorRectC; const def = b.def, D = def.d * UNIT, off = b.geo.off, hw = 1.0, pts = [[off - hw, D / 2 - 0.42], [off + hw, D / 2 - 0.42], [off - hw, D / 2 + 0.05], [off + hw, D / 2 + 0.05]].map(([x, z]) => b.toWorld(x, z));
    return (b.doorRectC = { minx: Math.min(...pts.map((p) => p[0])), maxx: Math.max(...pts.map((p) => p[0])), minz: Math.min(...pts.map((p) => p[1])), maxz: Math.max(...pts.map((p) => p[1])) });
  }
  doorRectHas(b, x, z, r) { const q = this.doorRect(b), cx = Math.max(q.minx, Math.min(x, q.maxx)), cz = Math.max(q.minz, Math.min(z, q.maxz)); return (x - cx) ** 2 + (z - cz) ** 2 < r * r; }
  /** Indoor route between two points inside a finished building that walks around the furniture (0.5 m grid A*, then smoothed). */
  navPath(b, x0, z0, x1, z1) {
    if (this.game.tracing) this.game.trace('navPath ' + b.def.id);
    const n = this.navGrid(b); if (!n) return [{ x: x1, z: z1 }];
    const { W, H, ox, oz, C, free } = n, cell = (x, z) => [Math.max(0, Math.min(W - 1, Math.floor((x - ox) / C))), Math.max(0, Math.min(H - 1, Math.floor((z - oz) / C)))];
    const near = (cx, cz) => { if (free[cz * W + cx]) return [cx, cz]; for (let r = 1; r < 6; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, z = cz + dz; if (x >= 0 && z >= 0 && x < W && z < H && free[z * W + x]) return [x, z]; } return null; };
    const a = near(...cell(x0, z0)), g = near(...cell(x1, z1)); if (!a || !g) return [{ x: x1, z: z1 }];
    const ctr = (x, z) => ({ x: ox + (x + 0.5) * C, z: oz + (z + 0.5) * C });
    const los = (p, q) => { const L = Math.hypot(q.x - p.x, q.z - p.z); if (!(L < 1e4)) return false; const st = Math.max(1, Math.ceil(L / (C * 0.4)));   // (a position gone wrong must never mean a loop that never ends)
      for (let i = 1; i < st; i++) { const t = i / st, [cx, cz] = cell(p.x + (q.x - p.x) * t, p.z + (q.z - p.z) * t); if (!free[cz * W + cx]) return false; } return true; };
    if (los({ x: x0, z: z0 }, { x: x1, z: z1 })) return [{ x: x1, z: z1 }];
    const N = W * H, gs = new Float64Array(N).fill(1e9), from = new Int32Array(N).fill(-1), open = [a[1] * W + a[0]], goal = g[1] * W + g[0], closed = new Uint8Array(N); gs[open[0]] = 0;
    const h = (i) => Math.hypot(i % W - g[0], Math.floor(i / W) - g[1]);
    let guard = N * 2; while (open.length && guard-- > 0) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (gs[open[i]] + h(open[i]) < gs[open[bi]] + h(open[bi])) bi = i;
      const c = open.splice(bi, 1)[0]; if (c === goal) break; closed[c] = 1; const cx = c % W, cz = Math.floor(c / W);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= H) continue; const i = z * W + x; if (!free[i] || closed[i]) continue; if (dx && dz && (!free[cz * W + x] || !free[z * W + cx])) continue; const ng = gs[c] + (dx && dz ? 1.414 : 1); if (ng < gs[i]) { gs[i] = ng; from[i] = c; if (!open.includes(i)) open.push(i); } }
    }
    if (from[goal] < 0 && goal !== open[0]) return [{ x: x1, z: z1 }];
    const cells = []; for (let i = goal, n = 0; i >= 0 && i !== a[1] * W + a[0] && n < N; i = from[i], n++) cells.unshift(ctr(i % W, Math.floor(i / W)));
    cells.push({ x: x1, z: z1 }); const out = []; let cur = { x: x0, z: z0 }, k = 0;
    while (k < cells.length) { let j = cells.length - 1; while (j > k && !los(cur, cells[j])) j--; out.push(cells[j]); cur = cells[j]; k = j + 1; }
    return out;
  }
  navGrid(b) {
    if (b.nav !== undefined) return b.nav; if (b.def.open || b.def.park || !b.colliders) return (b.nav = null);
    const C = 0.5, ox = b.x0 * TILE, oz = b.z0 * TILE, W = Math.round(b.w * TILE / C), H = Math.round(b.d * TILE / C), free = new Uint8Array(W * H), R = 0.28;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const px = ox + (x + 0.5) * C, pz = oz + (z + 0.5) * C; let ok = true; for (const c of b.colliders) if (c.lo === undefined && !c.cam && px > c.minx - R && px < c.maxx + R && pz > c.minz - R && pz < c.maxz + R) { ok = false; break; } free[z * W + x] = ok ? 1 : 0; }
    return (b.nav = { W, H, ox, oz, C, free });
  }
  /** Which finished building contains world point (x,z)? Used for roof cut-away and sim visibility. */
  /** Where you buy things in a building: the customer's side of its first counter (else the middle of the room). */
  counterSpot(b) { const c = b.spots && b.spots.counters && b.spots.counters[0]; return c && c.cust ? c.cust : { x: b.cx, z: b.cz }; }
  /**
   * Buying happens indoors, at the counter: inside (on the ground floor) Sam gets the offer near it; outside by the
   * door, a pointer to go in. offer: the interaction (kind 'act'); why: what the door says.
   */
  sale(b, P, consider, offer, why) {
    if (this.playerInside === b && (P.floorY || 0) < 0.5) { const at = this.counterSpot(b), d = Math.hypot(at.x - P.x, at.z - P.z); if (d < 3.6) consider(offer, d - 0.6, undefined, undefined, [at.x, at.z]); return; }
    if (!b.doorOut || this.playerInside) return; const d = Math.hypot(b.doorOut.x - P.x, b.doorOut.z - P.z); if (d < 4.2) consider({ kind: 'info', text: why }, d + 0.6);
  }
  buildingAtPoint(x, z) {
    const b = this.world.buildingAt(Math.floor(x / TILE), Math.floor(z / TILE)); return b && b.state === 'done' && !b.def.park ? b : null;
  }

  update(dt) {
    const g = this.game, pl = g.player, sim = g.mode === 'sim';
    const inside = sim ? this.buildingAtPoint(pl.x, pl.z) : null; this.playerInside = inside; this._builtThisFrame = false;   // at most one interior built per frame (no hitch)
    for (const b of this.list) {
      if (b.state !== 'done' || !b.ext) continue;
      const mine = b === inside, py = pl.floorY || 0, R = pl.ride && pl.ride.b === b ? Math.round(Math.max(pl.ride.to, pl.ride.from) / WALL_H) : 0, lvl = mine ? Math.max(Math.floor((py + 0.6) / WALL_H), R) : 99, P = b.ext.plan;   // in the lift: the floor you're going to is already there
      b.ext.roof.visible = !mine || !!(P && P.roof && py > P.H - 0.6);
      const cp = g.camera.position, far = (cp.x - b.cx) ** 2 + (cp.z - b.cz) ** 2 + cp.y * cp.y > 110 * 110;   // far off: skip the glass and the upstairs (draw calls)
      const LV = b.ext.levels; if (LV) for (let k = 1; k < LV.length; k++) LV[k].visible = (!far || (P.roof && k === P.n)) && k <= lvl + 1;   // the roof itself is always drawn
      const RD = b.ext.roofDoor; if (RD) { const want = b.roofDoorOpen ? 1 : 0; RD.open += (want - RD.open) * Math.min(1, dt * 6); RD.pivot.rotation.y = RD.open * 1.5; if (b.roofDoorOpen && g.elapsed > (b.roofDoorT || 0) && !(mine && py > P.H - 0.6 && Math.hypot(pl.x - b.cx, pl.z - b.cz) < 30)) b.roofDoorOpen = false; }
      if (b.ext.glass && b.ext._far !== far) { b.ext._far = far; for (const m of b.ext.glass) m.visible = !far; }
      if (b.ext.liftCab) b.ext.liftCab.position.y = 0.08 + (b.liftY || 0);
      const near = sim && Math.hypot(b.cx - pl.x, b.cz - pl.z) < 26 && b.layout && b.layout.furniture.length;
      const see = near && this.canSeeInto(b);   // furniture is only drawn when Sam is inside or looking through the open door
      if (see && !b.interior && !this._builtThisFrame) { this._builtThisFrame = true; b.interior = buildInterior(b); b.interior.position.set(b.cx, 0, b.cz); b.interior.rotation.y = b.rot * Math.PI / 2; b.interior.traverse((o) => { if (o.isMesh) o.castShadow = false; }); this.scene.add(b.interior); }
      if (b.interior) { b.interior.visible = !!see; const il = b.interior.userData.lv; if (il) for (let k = 1; k < il.length; k++) if (il[k]) il[k].visible = k <= lvl; }
    }
    // doors swing open when anyone is close, then shut behind them
    const cam = g.camera.position, sims = g.population.sims;
    for (const b of this.list) {
      const D = b.ext && b.ext.doors; if (!D || !D.length || b.state !== 'done') continue;
      if (Math.hypot(cam.x - b.cx, cam.z - b.cz) > 90) continue;
      const dp = b.doorPos; if (b.doorHeld && Math.hypot(pl.x - dp.x, pl.z - dp.z) > 10) b.doorHeld = false;   // Sam wandered off: it swings shut
      if (b.doorUseT > 0) b.doorUseT -= dt;
      // closed unless Sam opened it (C), someone is walking through it right now, or Sam is standing in the doorway
      const want = !!b.doorHeld || b.doorUseT > 0 || (sim && b.doorK > 0 && this.doorRectHas(b, pl.x, pl.z, 0.55)) || (sim && g.combat && g.combat.on && !pl.dead && Math.hypot(pl.x - dp.x, pl.z - dp.z) < 1.9);   // combat mode: doors swing open as Sam reaches them (C is crouch)
      const k = b.doorK || 0, nk = Math.max(0, Math.min(1, k + (want ? 4 : -2.2) * dt));
      if (nk !== k) { if (k === 0 && nk > 0 && sim && Math.hypot(pl.x - dp.x, pl.z - dp.z) < 14) Sfx.play('door'); b.doorK = nk; const e = nk * nk * (3 - 2 * nk); for (const d of D) d.pivot.rotation.y = d.open * e; }
    }
    // window lights: on while somebody in there is awake (or the place is open), off when they've gone to bed
    if (this._acc + dt > 0.25) {
      const glow = windowGlow(), h = g.clock.hour;
      for (const b of this.list) { if (!b.glassMat || b.state !== 'done' || b.burning) continue; const want = glow > 0.05 && this.isLit(b, h) ? 1 : 0; b.litK += (want - b.litK) * 0.35; b.glassMat.emissiveIntensity = glow * 0.45 * (0.03 + 0.97 * b.litK); if (b.ext && b.ext.curtains) b.ext.curtains.visible = glow > 0.25 && (b.residents.some((s) => s.inside === b) || b === this.playerInside || (b.residents.length > 0 && (h >= 22.5 || h < 6.5))); }   // curtains drawn after dark while anyone's home
    }
    // warm interior light follows the player indoors
    this._acc = (this._acc || 0) + dt; this.t = (this.t || 0) + dt; const tick = this._acc > 0.25; if (tick) this._acc = 0;
    for (const b of this.list) if (b.ext && b.ext.update && b.state === 'done') { if (b.def.park === 'camp' || b.ext.everyFrame || tick) b.ext.update(dt, this.t, this.game.economy.stock, b); }
    const L = this.interiorLight;
    const sw = this.switchMesh; sw.visible = false;
    if (inside && !inside.def.open) {
      const on = this.isLit(inside, g.clock.hour), day = g.atmosphere ? g.atmosphere.dayLevel ?? 1 : 1;   // off: just what comes in through the windows
      L.position.set(inside.cx, 2.6 + (pl.floorY || 0), inside.cz); L.intensity = inside.burning ? 28 + Math.random() * 30 : on ? ((pl.floorY || 0) > 0.5 ? 22 : 38) : 2 + 12 * day;
      const q = (pl.floorY || 0) < 0.5 && g.tech && g.tech.era >= 1 && this.switchAt(inside); if (q) { sw.visible = true; sw.position.set(q.x, 1.3, q.z); sw.rotation.y = q.rot; sw.userData.rock.rotation.x = on ? -0.35 : 0.35; }
    } else L.intensity = 0;
  }
}
