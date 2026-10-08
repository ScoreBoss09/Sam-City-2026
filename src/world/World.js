import { TILE, MAP } from '../config.js';
import { Emitter, mulberry32 } from '../util.js';

export const T = { WATER: 0, LAND: 1, FOREST: 2, SAND: 3 };
export const ZONE = { NONE: 0, RES: 1, COM: 2, IND: 3 };
const N = MAP * MAP;

/** Pure data: terrain, roads, zones, occupancy, collision and A* pathfinding. No rendering. */
export class World {
  constructor() {
    this.terrain = new Uint8Array(N);
    this.road = new Uint8Array(N);
    this.zone = new Uint8Array(N);
    this.occ = new Int32Array(N);     // building uid occupying the tile (0 = none)
    this.block = new Uint8Array(N);   // 1 = pedestrians cannot walk here
    this.res = new Int16Array(N);     // resource node seed id + 1 (rocks, ore, clay, berries): not buildable
    this.nodeSeeds = [];
    this.buildings = new Map();
    this.colBuckets = new Map();      // tile index -> array of collider AABBs
    this.events = new Emitter();
    this._g = new Float32Array(N); this._f = new Float32Array(N);
    this._came = new Int32Array(N); this._state = new Uint8Array(N);
    this.generate();
  }

  idx(x, z) { return z * MAP + x; }
  inBounds(x, z) { return x >= 0 && z >= 0 && x < MAP && z < MAP; }
  tileOf(wx, wz) { return [Math.floor(wx / TILE), Math.floor(wz / TILE)]; }
  center(x, z) { return [(x + 0.5) * TILE, (z + 0.5) * TILE]; }
  isLand(x, z) { if (!this.inBounds(x, z)) return false; const t = this.terrain[this.idx(x, z)]; return t === T.LAND || t === T.SAND; }
  walkable(x, z) { return this.isLand(x, z) && !this.block[this.idx(x, z)]; }
  buildingAt(x, z) { return this.inBounds(x, z) ? this.buildings.get(this.occ[this.idx(x, z)]) || null : null; }

  generate() {
    const h = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233 + 4.1) * 43758.5453; return s - Math.floor(s); };
    let land = new Uint8Array(N);
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
      const nx = x - (MAP - 1) / 2, nz = z - (MAP - 1) / 2, half = 17.2 + (h(x * 0.5, z * 0.5) - 0.5) * 2.2;
      const qx = Math.max(Math.abs(nx) - (half - 5), 0), qz = Math.max(Math.abs(nz) - (half - 5), 0);
      land[this.idx(x, z)] = Math.hypot(qx, qz) < 5.2 + (h(x, z) - 0.5) * 1.4 && Math.abs(nx) < half && Math.abs(nz) < half ? 1 : 0;
    }
    // majority filter: removes isolated tiles and ragged one-tile spikes along the coast
    for (let pass = 0; pass < 2; pass++) {
      const nl = land.slice();
      for (let z = 1; z < MAP - 1; z++) for (let x = 1; x < MAP - 1; x++) {
        let n = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && land[this.idx(x + dx, z + dz)]) n++;
        const i = this.idx(x, z); if (land[i] && n <= 3) nl[i] = 0; else if (!land[i] && n >= 5) nl[i] = 1;
      }
      land = nl;
    }
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
      const i = this.idx(x, z); if (!land[i]) { this.terrain[i] = T.WATER; continue; }
      const nx = x - (MAP - 1) / 2, nz = z - (MAP - 1) / 2;
      let d = 99; for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= MAP || Z >= MAP || !land[this.idx(X, Z)]) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dz))); }
      let t = T.LAND;
      if (d <= 2 + Math.floor(h(x, z) * 2) && (nz < -4 || nx > 4) && !(nz > 4)) t = T.FOREST;
      else if (d <= 2 && (nz > 2 || nx < -4)) t = T.SAND;
      this.terrain[i] = t;
    }
    // clearings for the Lift (north) and Service Tunnel (east)
    this.clear(15, 20, 1, 7); this.clear(30, 38, 17, 23);
    for (let z = 2; z <= 24; z++) for (let x = 15; x <= 24; x++) if (this.terrain[this.idx(x, z)] === T.WATER) this.terrain[this.idx(x, z)] = T.LAND;
    this.seedResources();
  }
  /** Rocks, iron ore, clay pits and berry bushes are placed deterministically around the island. */
  seedResources() {
    const rnd = mulberry32(777), cands = [];
    for (let z = 3; z < MAP - 3; z++) for (let x = 3; x < MAP - 3; x++) if (this.terrain[this.idx(x, z)] === T.LAND) cands.push([x, z]);
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    const nearForest = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (this.inBounds(x + dx, z + dz) && this.terrain[this.idx(x + dx, z + dz)] === T.FOREST) return true; return false; };
    const nearWater = (x, z) => { for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (this.inBounds(x + dx, z + dz) && this.terrain[this.idx(x + dx, z + dz)] === T.WATER) return true; return false; };
    const startD = (x, z) => Math.hypot(x - 20, z - 15);
    const used = []; const free = (x, z, gap) => !used.some(([a, b]) => Math.hypot(a - x, b - z) < gap) && !this.road[this.idx(x, z)] && !this.occ[this.idx(x, z)];
    const place = (kind, n, pred, gap, amount, regen) => { let c = 0; for (const [x, z] of cands) { if (c >= n) break; if (!pred(x, z) || !free(x, z, gap)) continue; used.push([x, z]); const id = this.nodeSeeds.length; this.nodeSeeds.push({ kind, tx: x, tz: z, amount, max: amount, regen }); this.res[this.idx(x, z)] = id + 1; if (kind === 'rock' || kind === 'ore') this.block[this.idx(x, z)] = 1; c++; } };
    place('rock', 9, (x, z) => startD(x, z) > 6 && startD(x, z) < 22 && !nearForest(x, z), 3, 10, 1 / 50);
    place('ore', 4, (x, z) => nearForest(x, z) && x > 22 && z < 20, 4, 8, 1 / 90);
    place('clay', 4, (x, z) => nearWater(x, z) && z > 20, 3, 20, 1 / 20);
    place('berry', 12, (x, z) => nearForest(x, z) && startD(x, z) < 20, 3, 6, 1 / 30);
  }
  clear(x0, x1, z0, z1) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (this.inBounds(x, z)) this.terrain[this.idx(x, z)] = T.LAND;
    }
  }

  // ---- roads & zones
  canRoad(x, z, type = 1) { const i = this.idx(x, z); return this.isLand(x, z) && !this.occ[i] && !this.res[i] && this.road[i] < type; }
  addRoad(x, z, type = 1) {
    if (!this.canRoad(x, z, type)) return false;
    this.road[this.idx(x, z)] = type; this.events.emit('tile', x, z); return true;
  }
  removeRoad(x, z) {
    if (!this.inBounds(x, z) || !this.road[this.idx(x, z)]) return false;
    this.road[this.idx(x, z)] = 0; this.events.emit('tile', x, z); return true;
  }
  setZone(x, z, zn) {
    if (!this.isLand(x, z) || this.road[this.idx(x, z)] || this.occ[this.idx(x, z)]) return false;
    const i = this.idx(x, z); if (this.zone[i] === zn) return false;
    this.zone[i] = zn; this.events.emit('zone', x, z); return true;
  }

  // ---- footprints
  canPlace(x0, z0, w, d) {
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
      if (!this.isLand(x, z)) return false;
      const i = this.idx(x, z);
      if (this.occ[i] || this.road[i] || this.res[i]) return false;
    }
    return true;
  }
  fill(b, walkable) {
    for (let z = b.z0; z < b.z0 + b.d; z++) for (let x = b.x0; x < b.x0 + b.w; x++) {
      const i = this.idx(x, z); this.occ[i] = b.uid; this.block[i] = walkable ? 0 : 1; this.zone[i] = 0;
    }
  }
  unfill(b) {
    for (let z = b.z0; z < b.z0 + b.d; z++) for (let x = b.x0; x < b.x0 + b.w; x++) {
      const i = this.idx(x, z); if (this.occ[i] === b.uid) { this.occ[i] = 0; this.block[i] = 0; }
    }
  }

  // ---- colliders (world-space AABBs registered per tile bucket)
  addColliders(b) {
    for (const c of b.colliders) {
      const x0 = Math.floor(c.minx / TILE), x1 = Math.floor(c.maxx / TILE), z0 = Math.floor(c.minz / TILE), z1 = Math.floor(c.maxz / TILE);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        if (!this.inBounds(x, z)) continue;
        const k = this.idx(x, z); let a = this.colBuckets.get(k); if (!a) this.colBuckets.set(k, a = []); a.push(c);
      }
    }
  }
  removeColliders(b) {
    for (const c of b.colliders) {
      const x0 = Math.floor(c.minx / TILE), x1 = Math.floor(c.maxx / TILE), z0 = Math.floor(c.minz / TILE), z1 = Math.floor(c.maxz / TILE);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        if (!this.inBounds(x, z)) continue;
        const a = this.colBuckets.get(this.idx(x, z)); if (!a) continue;
        const i = a.indexOf(c); if (i >= 0) a.splice(i, 1);
      }
    }
  }
  /** Circle-vs-world test used by the player. wallsOnly: ignore water/forest tiles (camera). */
  /** y: how high off the ground (jumping) - low things like fences (c.h) are cleared once you're above them. */
  collides(x, z, r, wallsOnly = false, y = 0) {
    const [tx0, tz0] = this.tileOf(x - r, z - r), [tx1, tz1] = this.tileOf(x + r, z + r);
    for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!this.inBounds(tx, tz)) return true;
      const t = this.terrain[this.idx(tx, tz)];
      if (!wallsOnly && (t === T.WATER || t === T.FOREST)) return true;
      const a = this.colBuckets.get(this.idx(tx, tz));
      if (a) for (const c of a) {
        if (c.h !== undefined && y > c.h) continue;
        const cx = Math.max(c.minx, Math.min(x, c.maxx)), cz = Math.max(c.minz, Math.min(z, c.maxz));
        if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  // ---- A* (4-neighbour). roadOnly is used by delivery trucks.
  nearestWalkable(x, z, roadOnly = false) {
    for (let r = 0; r <= 5; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const tx = x + dx, tz = z + dz;
      if (roadOnly ? (this.inBounds(tx, tz) && this.road[this.idx(tx, tz)]) : this.walkable(tx, tz)) return [tx, tz];
    }
    return null;
  }
  findPath(sx, sz, ex, ez, roadOnly = false) {
    const ok = (x, z) => this.inBounds(x, z) && (roadOnly ? this.road[this.idx(x, z)] > 0 : this.walkable(x, z));
    if (!ok(sx, sz)) { const n = this.nearestWalkable(sx, sz, roadOnly); if (!n) return null; [sx, sz] = n; }
    if (!ok(ex, ez)) { const n = this.nearestWalkable(ex, ez, roadOnly); if (!n) return null; [ex, ez] = n; }
    const g = this._g, f = this._f, came = this._came, st = this._state;
    g.fill(1e9); st.fill(0); came.fill(-1);
    const heap = []; const goal = this.idx(ex, ez), start = this.idx(sx, sz);
    const push = (i) => { heap.push(i); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (f[heap[p]] <= f[heap[k]]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l; if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    g[start] = 0; f[start] = Math.abs(sx - ex) + Math.abs(sz - ez); st[start] = 1; push(start);
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (heap.length) {
      const cur = pop(); if (cur === goal) break;
      st[cur] = 2; const cx = cur % MAP, cz = (cur / MAP) | 0;
      for (const [dx, dz] of D) {
        const nx = cx + dx, nz = cz + dz; if (!ok(nx, nz)) continue;
        const ni = this.idx(nx, nz); if (st[ni] === 2) continue;
        const cost = roadOnly ? 1 : (this.road[ni] ? 1 : 1.9);
        const ng = g[cur] + cost; if (ng >= g[ni]) continue;
        g[ni] = ng; came[ni] = cur; f[ni] = ng + Math.abs(nx - ex) + Math.abs(nz - ez);
        if (st[ni] !== 1) { st[ni] = 1; push(ni); } else push(ni);
      }
    }
    if (came[goal] < 0 && goal !== start) return null;
    const out = []; for (let i = goal; i !== -1; i = came[i]) { out.push([i % MAP, (i / MAP) | 0]); if (i === start) break; }
    out.reverse();
    // drop collinear points
    const sm = [out[0]];
    for (let i = 1; i < out.length - 1; i++) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) sm.push(b);
    }
    if (out.length > 1) sm.push(out[out.length - 1]);
    return sm;
  }
}
