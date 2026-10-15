import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { box, cyl } from '../render/furniture/kit.js';
import { mergeByMaterial, colorize } from '../render/BuildingFactory.js';

/**
 * The plaza: paving for people. No cars (vehicles keep to the tracks and roads), and it fills up on its own:
 *  - a café, pub or chippy whose door opens onto it puts tables and parasols out on the paving next to the door, and
 *    on a fine day its customers drink and eat outside;
 *  - here and there a planter with a bench either side, where people sit and watch the world go by;
 *  - bollards where the paving meets a road, so nobody's in any doubt;
 *  - and people come just to stand about in twos and threes and talk.
 * Tables, benches and bollards are drawn as one merged group, rebuilt when the paving or the buildings change.
 */
const TERRACE = new Set(['tavern', 'local', 'irish', 'wmc', 'cafe', 'chippy', 'curryhouse', 'kebab', 'bakery']);
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const BROLLY = [0xc0392b, 0x2a6ab0, 0x2a8a4a, 0xe8b830];

export class Plaza {
  constructor(game) {
    this.game = game; this.group = null; this.seats = []; this.tiles = []; this.dirty = true; this.t = 0; this.col = { colliders: [] };
    const ev = game.world.events; ev.on('tile', () => (this.dirty = true)); for (const e of ['building:done', 'building:removed']) ev.on(e, () => (this.dirty = true));
  }
  at(tx, tz) { const w = this.game.world; return w.inBounds(tx, tz) && w.road[w.idx(tx, tz)] === 3; }
  /** Is it a day for sitting out? (dry, daytime or a summer evening, more often in summer) */
  fine() {
    const g = this.game, h = g.clock.hour, m = g.clock.month, rain = g.weather ? g.weather.rain : 0;
    if (rain > 0.2 || h < 10 || h >= 22.5) return 0; return m >= 4 && m <= 8 ? 1 : m === 3 || m === 9 ? 0.6 : 0.2;
  }
  /** Free seats outside this building (its tables on the plaza). */
  terrace(b) { return this.seats.filter((s) => s.b === b && (!s.taken || s.taken.remove)); }
  benches() { return this.seats.filter((s) => s.kind === 'bench' && !s.b && (!s.taken || s.taken.remove)); }
  /** Somewhere to stand on the plaza, near others already there if there are any. */
  spot() {
    if (!this.tiles.length) return null; const P = this.game.population.sims, busy = this.tiles.filter(([x, z]) => P.some((s) => s.plazaT === x + ',' + z));
    const [tx, tz] = busy.length && Math.random() < 0.7 ? busy[Math.floor(Math.random() * busy.length)] : this.tiles[Math.floor(Math.random() * this.tiles.length)];
    for (let k = 0; k < 8; k++) { const a = Math.random() * Math.PI * 2, r = 2.3 + Math.random() * 1.2, x = (tx + 0.5) * TILE + Math.cos(a) * r, z = (tz + 0.5) * TILE + Math.sin(a) * r; if (!P.some((s) => Math.hypot(s.x - x, s.z - z) < 0.8)) return { x, z, key: tx + ',' + tz }; }
    return { x: (tx + 0.5) * TILE + 2.6, z: (tz + 0.5) * TILE, key: tx + ',' + tz };
  }
  update(dt) {
    if (!this.dirty || (this.t -= dt) > 0) return; this.t = 1; this.dirty = false; this.rebuild();
  }
  rebuild() {
    const g = this.game, w = g.world;
    for (const s of this.seats) if (s.taken && s.taken.sitting === s) s.taken.standUp();   // (anyone sat out gets up: the tables are being moved)
    if (this.group) { g.scene.remove(this.group); this.group.traverse((o) => { if (o.geometry && o.geometry.userData.own) o.geometry.dispose(); }); this.group = null; }
    this.seats = []; this.tiles = []; if (this.col.colliders.length) w.removeColliders(this.col); this.col.colliders = [];
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) if (this.at(x, z)) this.tiles.push([x, z]);
    if (!this.tiles.length) return;
    const grp = new THREE.Group(); grp.name = 'plaza'; const used = new Set(), doors = new Set();
    for (const b of g.buildings.list) if (b.doorTile) doors.add(b.doorTile.x + ',' + b.doorTile.z);
    // tables out in front of the cafés and pubs: on the paving either side of their door (the door's own square is left clear to walk)
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || !TERRACE.has(b.id) || !b.doorTile) continue; const d = b.doorTile, cand = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const x = d.x + dx, z = d.z + dz, k = x + ',' + z; if ((dx || dz) && this.at(x, z) && !used.has(k) && !doors.has(k)) cand.push([x, z, Math.abs(dx) + Math.abs(dz)]); }
      cand.sort((a, c) => a[2] - c[2]);
      for (const [x, z] of cand.slice(0, 3)) { used.add(x + ',' + z); this.table(grp, (x + 0.5) * TILE, (z + 0.5) * TILE, hash(x, z) < 0.5 ? 0 : Math.PI / 2, b, x + z); }
    }
    // a planter with a bench either side, now and then; bollards where the paving meets a road
    for (const [x, z] of this.tiles) {
      const k = x + ',' + z; if (used.has(k)) continue;
      if (!doors.has(k) && hash(x + 3, z + 7) < 0.4) { used.add(k); this.planter(grp, (x + 0.5) * TILE, (z + 0.5) * TILE, hash(x, z + 1) < 0.5 ? 0 : Math.PI / 2); }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz; if (!w.inBounds(nx, nz) || !w.drive(w.idx(nx, nz))) continue;
        const ex = (x + 0.5 + dx * 0.46) * TILE, ez = (z + 0.5 + dz * 0.46) * TILE;
        for (const o of [-1.4, 1.4]) { const bx = ex + (dz ? o : 0), bz = ez + (dx ? o : 0); cyl(grp, 0.11, 0.12, 0.85, 0x22262c, bx, 0, bz); this.solid(bx, bz, 0.25, 0.25, 0, 0.85); cyl(grp, 0.125, 0.125, 0.06, 0xd9b34a, bx, 0.62, bz); }
      }
    }
    colorize(grp); mergeByMaterial(grp); for (const o of grp.children) { o.castShadow = true; o.receiveShadow = true; }
    g.scene.add(grp); this.group = grp; w.addColliders(this.col);   // (Sam bumps into the tables, planters and bollards)
  }
  solid(x, z, sx, sz, rot, h) { if (Math.abs(Math.sin(rot)) > 0.5) [sx, sz] = [sz, sx]; this.col.colliders.push({ minx: x - sx / 2, maxx: x + sx / 2, minz: z - sz / 2, maxz: z + sz / 2, h }); }
  /** A picnic table with a parasol: four places, two on each bench, facing in. */
  table(grp, x, z, rot, b, k) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rot; grp.add(t); const wood = 0x9a7048; this.solid(x, z, 1.5, 0.7, rot, 0.8);
    box(t, 1.5, 0.07, 0.7, wood, 0, 0.72, 0); for (const sz of [-0.55, 0.55]) box(t, 1.5, 0.06, 0.26, wood, 0, 0.42, sz);
    for (const sx of [-0.6, 0.6]) { box(t, 0.07, 0.72, 0.07, 0x7a5638, sx, 0, 0); box(t, 0.07, 0.07, 1.36, 0x7a5638, sx, 0.36, 0); }
    box(t, 0.05, 2.2, 0.05, 0xd8d8d8, 0, 0, 0); const c = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.45, 8), new THREE.MeshStandardMaterial({ color: BROLLY[k % BROLLY.length], roughness: 0.8 })); c.geometry.userData.own = true; c.position.y = 2.25; t.add(c);
    for (const sz of [-0.55, 0.55]) for (const bx of [-0.4, 0.4]) this.seats.push({ x: x + bx * Math.cos(rot) + sz * Math.sin(rot), z: z - bx * Math.sin(rot) + sz * Math.cos(rot), heading: (sz > 0 ? Math.PI : 0) + rot, kind: 'terrace', t: 'bench', b, taken: null, pub: b });
  }
  /** A square stone planter with a little tree in it, and a bench on two sides facing out. */
  planter(grp, x, z, rot) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rot; grp.add(t); this.solid(x, z, 1.3, 1.3, rot, 0.6);
    box(t, 1.3, 0.55, 1.3, 0xb8a888, 0, 0, 0); box(t, 1.15, 0.05, 1.15, 0x4a3a28, 0, 0.55, 0); box(t, 0.12, 1.1, 0.12, 0x5a3b22, 0, 0.55, 0);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.9, flatShading: true })); crown.geometry.userData.own = true; crown.position.y = 2.0; t.add(crown);
    for (const s of [-1, 1]) {
      const bz = s * 1.35; box(t, 1.5, 0.06, 0.42, 0x8a5a33, 0, 0.42, bz); box(t, 1.5, 0.4, 0.06, 0x8a5a33, 0, 0.5, bz - s * 0.2); for (const bx of [-0.6, 0.6]) box(t, 0.08, 0.42, 0.38, 0x2a2a2e, bx, 0, bz);
      for (const bx of [-0.38, 0.38]) this.seats.push({ x: x + bx * Math.cos(rot) + (bz + s * 0.02) * Math.sin(rot), z: z - bx * Math.sin(rot) + (bz + s * 0.02) * Math.cos(rot), heading: rot + (s > 0 ? 0 : Math.PI), kind: 'bench', t: 'bench', b: null, taken: null });
    }
  }
}
