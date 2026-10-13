import { UNIT, WALL_H, WALL_T } from '../config.js';
import { rawLayout, doorOffset } from '../data/layouts.js';
import { FURN } from '../render/Furniture.js';

/**
 * Walkable storeys, staircases, lifts and roofs. Pure data from a building def (the same def always gives the same plan),
 * so the renderer, the colliders and Sam's footing all agree. Coordinates are building-local (front door faces +z).
 *
 * A staircase is one or two side-by-side lanes. Flight k climbs from storey k to k+1 in lane k % 2; odd flights run the
 * other way, so the stairs zig-zag up in the same footprint. Four or more storeys get a lift instead.
 */
const ROOF_OK = ['flat', 'flatac', 'dome', 'spire'];
const cache = new Map();
export const LANE_W = 1.05;

export function levelPlan(def) {
  if (!def || def.open || def.park || def.special || def.special_ext || def.layout === 'church') return null;
  const n = Math.max(1, def.floors || 1), roof = ROOF_OK.includes(def.roof) && def.w * def.d >= 4 && (def.cat !== 'res' || n >= 3);
  if (n < 2 && !roof) return null;
  const key = def.id + '|' + n + '|' + def.w + 'x' + def.d + '|' + def.roof + '|' + def.layout;
  if (cache.has(key)) return cache.get(key);
  const W = def.w * UNIT, D = def.d * UNIT, T = WALL_T, H = n * WALL_H;
  const p = { n, W, D, H, roof, roofY: H, stair: null, lift: null, holes: [] };
  if (n >= 4) {
    const s = 2.2; p.lift = { x0: W / 2 - T - s, x1: W / 2 - T, z0: -D / 2 + T, z1: -D / 2 + T + s, door: W / 2 - T - s / 2 };
  } else p.stair = placeStairs(def, W, D, (n - 1) + (roof ? 1 : 0));
  // a little stair hut on the roof over the top flight, with a door you open to step outside
  if (roof && p.stair) {
    const st = p.stair, k = n - 1, ln = st.lanes.find((l) => l.flights.includes(k)), up = (k % 2 === 0) === (st.dir > 0), r = laneRect(st, ln);
    const half = (st.ax === 'x' ? W : D) / 2 - T, head = up ? st.s1 : st.s0, end = up ? half : -half, cc = (ln.c0 + ln.c1) / 2;
    // the landing runs from the top step to the wall; the door is in the side of the hut facing into the roof
    const s0 = Math.min(st.s0, end), s1 = Math.max(st.s1, end), c0 = ln.c0 - 0.15, c1 = ln.c1 + 0.15, sd = (head + end) / 2 + (up ? -0.25 : 0.25), ce = cc < 0 ? c1 : c0;
    p.hut = { rect: st.ax === 'x' ? [s0, s1, c0, c1] : [c0, c1, s0, s1], door: st.ax === 'x' ? { x: sd, z: ce, ax: 'z' } : { x: ce, z: sd, ax: 'x' } }; void r;
  }
  cache.set(key, p); return p;
}

function placeStairs(def, W, D, flights) {
  const T = WALL_T, lanes = flights > 1 ? 2 : 1, SW = lanes * LANE_W, door = doorOffset(def.w), raw = rawLayout(def), pref = raw.stairPref;
  const solid = raw.furniture.map((f) => { const d = FURN[f.t]; if (!d || !d.solid) return null; let [sx, sz] = d.s; if ((f.r || 0) % 2) [sx, sz] = [sz, sx]; return [f.x - sx / 2, f.x + sx / 2, f.z - sz / 2, f.z + sz / 2]; }).filter(Boolean);
  const over = (r) => solid.reduce((a, q) => a + Math.max(0, Math.min(r[1], q[1]) - Math.max(r[0], q[0])) * Math.max(0, Math.min(r[3], q[3]) - Math.max(r[2], q[2])), 0);
  const cands = [];
  const run = (len) => { const m = len >= 7 ? 1.1 : 0.6, L = Math.min(5.2, len - 2 * m); return L >= 1.8 ? { m, L } : null; };
  // along the back wall (runs in x), and along the left / right walls (runs in z, foot towards the front)
  { const len = W - 2 * T, r = run(len); if (r) for (const dir of [1, -1]) { const s0 = dir > 0 ? -W / 2 + T + r.m : W / 2 - T - r.m - r.L, c0 = -D / 2 + T + 0.05; cands.push({ ax: 'x', dir, s0, s1: s0 + r.L, c0, c1: c0 + SW, wallAt: 0 }); } }
  { const len = D - 2 * T, r = run(len); if (r) for (const side of [-1, 1]) { const c0 = side < 0 ? -W / 2 + T + 0.05 : W / 2 - T - 0.05 - SW, s0 = -D / 2 + T + r.m; cands.push({ ax: 'z', dir: -1, s0, s1: s0 + r.L, c0, c1: c0 + SW, wallAt: side < 0 ? 0 : 1 }); } }
  let best = null, bs = 1e9;
  for (const c of cands) {
    const r = c.ax === 'x' ? [c.s0 - 0.6, c.s1 + 0.6, c.c0, c.c1] : [c.c0, c.c1, c.s0 - 0.6, c.s1 + 0.6];
    const doorHit = c.ax === 'z' && Math.abs((c.c0 + c.c1) / 2 - door) < 1.6 + SW / 2 ? 50 : 0;
    const want = pref === 'left' ? c.ax === 'z' && c.wallAt === 0 : pref === 'right' ? c.ax === 'z' && c.wallAt === 1 : pref === 'back' ? c.ax === 'x' && c.dir > 0 : pref === 'backr' ? c.ax === 'x' && c.dir < 0 : true;
    const sc = (want ? 0 : 1e4) + (pref ? 0 : over(r) + doorHit); if (sc < bs) { bs = sc; best = c; }   // a planned home says where its stairs go
  }
  if (!best) return null;
  best.lanes = []; for (let i = 0; i < lanes; i++) best.lanes.push({ c0: best.c0 + i * LANE_W, c1: best.c0 + (i + 1) * LANE_W, flights: [] });
  for (let k = 0; k < flights; k++) best.lanes[k % lanes].flights.push(k);
  best.flights = flights; return best;
}

/** Local rect (minx, maxx, minz, maxz) of a stair lane. */
export function laneRect(st, lane) { return st.ax === 'x' ? [st.s0, st.s1, lane.c0, lane.c1] : [lane.c0, lane.c1, st.s0, st.s1]; }
/** Height of flight k at run position s. */
export function flightH(st, k, s) {
  const t = Math.max(0, Math.min(1, (s - st.s0) / (st.s1 - st.s0))), up = (k % 2 === 0) === (st.dir > 0);
  return k * WALL_H + (up ? t : 1 - t) * WALL_H;
}
/** Everything that blocks or holes the given storey (k >= 1): local rects. */
export function slabHoles(p, k) {
  const out = []; if (p.lift) out.push([p.lift.x0, p.lift.x1, p.lift.z0, p.lift.z1]);
  if (p.stair) for (const lane of p.stair.lanes) if (lane.flights.includes(k - 1)) out.push(laneRect(p.stair, lane));
  return out;
}
const inR = (r, x, z, pad = 0) => x > r[0] - pad && x < r[1] + pad && z > r[2] - pad && z < r[3] + pad;
export function inLift(p, x, z) { return !!p.lift && inR([p.lift.x0, p.lift.x1, p.lift.z0, p.lift.z1], x, z, -0.25); }

/**
 * Where Sam stands after stepping to local (x, z) from height y; null if that step isn't allowed
 * (a drop into a stairwell, the edge of the roof, the side of a flight at the wrong height...).
 */
export function stepLevel(p, x, z, y, roofCols, from = null, doorOpen = false) {
  const T = WALL_T, lim = (v, L) => Math.abs(v) < L / 2 - T - 0.22;
  if (y > 0.3 && !(lim(x, p.W) && lim(z, p.D))) return p.roof && y > p.H - 0.6 ? -1 : null;   // over the parapet: a long way down (-1 = falling)
  // the roof stair hut: in and out only through its door, and only when the door is open
  if (p.hut && from && Math.abs(y - p.H) < 0.6) { const h = p.hut, a = inR(h.rect, from[0], from[1], 0), b = inR(h.rect, x, z, 0); if (a !== b) { const d = h.door; if (!doorOpen || (d.ax === 'x' ? Math.abs(z - d.z) > 0.5 || Math.abs(x - d.x) > 0.6 : Math.abs(x - d.x) > 0.5 || Math.abs(z - d.z) > 0.6)) return null; } }
  const st = p.stair;
  if (st) {
    const s = st.ax === 'x' ? x : z, c = st.ax === 'x' ? z : x;
    if (s > st.s0 && s < st.s1) for (const lane of st.lanes) {
      if (c < lane.c0 || c > lane.c1) continue;
      let best = null, bd = 1e9; for (const k of lane.flights) { const h = flightH(st, k, s), d = Math.abs(h - y); if (d < bd) { bd = d; best = h; } }
      // a flight at this height: walk on it. Otherwise this is a stairwell (or the space under the stairs).
      return bd <= 0.45 ? best : null;
    }
  }
  if (p.lift && inR([p.lift.x0, p.lift.x1, p.lift.z0, p.lift.z1], x, z, 0.12)) return y;   // in (or stepping out of) the lift: any floor
  // flat surfaces: the ground, each storey and the roof
  const lv = Math.round(y / WALL_H), surf = lv * WALL_H; if (Math.abs(surf - y) > 0.45 || lv > p.n || (lv === p.n && !p.roof)) return null;
  if (lv >= 1) for (const r of slabHoles(p, lv)) if (inR(r, x, z, 0.05)) return null;
  if (lv === p.n && roofCols) for (const r of roofCols) if (inR(r, x, z, 0.3)) return null;
  return surf;
}

/**
 * Furniture for the storeys above the ground floor (pure data, so the colliders exist before the meshes are drawn).
 * Returns [{ t, x, z, r, k }] in local coords; k is the storey.
 */
const KITS = {
  home: ['bed', 'bed', 'rug', 'chest', 'shelf', 'lamp', 'picture', 'sofa', 'tv', 'plant'],
  hotel: ['bed', 'bed', 'bed', 'tv', 'rug', 'lamp', 'chest', 'bed', 'plant', 'picture', 'sofa', 'tv'],
  office: ['desk', 'desk', 'desk', 'terminal', 'shelf', 'plant', 'desk', 'board', 'locker', 'clock', 'desk', 'plant'],
  clinic: ['hbed', 'hbed', 'hbed', 'hbed', 'locker', 'plant', 'desk', 'clock'],
  pub: ['table', 'decks', 'table', 'speaker', 'sofa', 'table', 'speaker', 'picture', 'rug', 'plant'],   // the function room: weddings, wakes, 40ths and the darts club dinner
  store: ['shelf', 'crate', 'crate', 'table', 'chair', 'shelfbooks', 'crate', 'barrel', 'lamp'],
};
function kitFor(def) {
  if (def.id === 'hotel' || def.layout === 'apartments' || def.layout === 'house') return def.id === 'hotel' ? KITS.hotel : KITS.home;
  if (def.layout === 'tavern') return KITS.pub;
  if (def.layout === 'clinic') return KITS.clinic;
  if (['office', 'lobby', 'townhall', 'police', 'school', 'library', 'postoffice'].includes(def.layout)) return KITS.office;
  return KITS.store;
}
const upCache = new Map();
/** Put each item of a kit against the walls (back, left, right, front) where it fits; returns [{ t, x, z, r, solid, sx, sz }]. */
export function placeAlongWalls(W, D, kit, block, pad = 0.25) {
  const T = WALL_T, placed = [], out = [];
  for (const t of kit) {
    const d = FURN[t] || { s: [0.6, 0.6] }; let ok = false;
    for (const r of [0, 1, 3, 2]) {
      let [sx, sz] = d.s; if (r % 2) [sx, sz] = [sz, sx];
      for (let a = -1; a <= 1 && !ok; a += 0.08) {
        const along = a * ((r % 2 ? D : W) / 2 - T - 0.6);
        const x = r === 0 || r === 2 ? along : r === 1 ? -W / 2 + T + sx / 2 + 0.05 : W / 2 - T - sx / 2 - 0.05;
        const z = r === 1 || r === 3 ? along : r === 0 ? -D / 2 + T + sz / 2 + 0.05 : D / 2 - T - sz / 2 - 0.05;
        const q = [x - sx / 2, x + sx / 2, z - sz / 2, z + sz / 2];
        if (q[0] < -W / 2 + T || q[1] > W / 2 - T || q[2] < -D / 2 + T || q[3] > D / 2 - T) continue;
        if (block.concat(placed).some((b) => q[0] < b[1] + pad && q[1] > b[0] - pad && q[2] < b[3] + pad && q[3] > b[2] - pad)) continue;
        placed.push(q); out.push({ t, x, z, r, solid: !!(FURN[t] && FURN[t].solid), sx, sz }); ok = true;
      }
      if (ok) break;
    }
  }
  return out;
}
export function upperFurniture(def) {
  const p = levelPlan(def); if (!p || p.n < 2) return [];
  const key = def.id + '|' + p.n + '|' + def.w + 'x' + def.d + (def.heating ? 'h' : '') + (def.range ? 'r' : ''); if (upCache.has(key)) return upCache.get(key);
  const planned = rawLayout(def).upper; if (planned && planned.length) { const out = planned.filter((f) => f.k < p.n).map((f) => { const d = FURN[f.t] || { s: [0.6, 0.6] }; let [sx, sz] = d.s; if ((f.r || 0) % 2) [sx, sz] = [sz, sx]; return { ...f, solid: !!d.solid, sx, sz }; }); upCache.set(key, out); return out; }   // a planned home: its own upstairs rooms
  const out = [], kit = kitFor(def), W = p.W, D = p.D, T = WALL_T;
  for (let k = 1; k < p.n; k++) {
    const block = slabHoles(p, k).map((r) => [r[0] - 0.7, r[1] + 0.7, r[2] - 0.7, r[3] + 0.7]), placed = [];
    if (p.lift) block.push([p.lift.x0 - 0.4, p.lift.x1, p.lift.z1, p.lift.z1 + 2.4]);   // keep the way out of the lift clear
    if (p.stair) for (const ln of p.stair.lanes) if (ln.flights.includes(k)) { const r = laneRect(p.stair, ln); block.push([r[0] - 1.1, r[1] + 1.1, r[2] - 0.6, r[3] + 0.6]); }
    const want = Math.min(kit.length, Math.max(3, Math.round(W * D / 11)));
    for (const f of placeAlongWalls(W, D, kit.slice(k % kit.length).concat(kit.slice(0, k % kit.length)).slice(0, want), block)) out.push({ ...f, k });
  }
  upCache.set(key, out); return out;
}
