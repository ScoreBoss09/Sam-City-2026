import { UNIT, WALL_T } from '../../config.js';

// Helpers for interior layouts. Never import layouts.js from here (it imports these modules).
export { UNIT, WALL_T };
export function empty() { return { furniture: [], walls: [], beds: [], work: [], terminals: [], idle: [], visit: [], pickup: [], floors: [], lights: [], counters: [], tables: [], kitchen: [], seats: [], upper: [] }; }
/** The front door's x (the door is in the front wall, z = +D/2): keep ~1.6 m clear inside it. */
export function doorX(w) { return (Math.floor((w - 1) / 2) + 0.5 - w / 2) * UNIT; }
export const dims = (def) => ({ W: def.w * UNIT, D: def.d * UNIT, I: def.w * UNIT / 2 - WALL_T, J: def.d * UNIT / 2 - WALL_T, door: doorX(def.w) });
export const wall = (x0, z0, x1, z1, doors = [], k = 0, col = 0xe8dcc0) => ({ a: [x0, z0], b: [x1, z1], doors, k, col });
export const floor = (x0, x1, z0, z1, kind, col, k = 0) => ({ x0, x1, z0, z1, kind, col, k });
/** A serving point: staff stand at `staff` (behind the counter), the customer at `cust` (in front). kind: 'till', 'bar', 'hatch', 'desk'. */
export function counter(l, sx, sz, cx, cz, kind = 'till', goods = null) { l.counters.push({ staff: { x: sx, z: sz }, cust: { x: cx, z: cz }, kind, goods }); l.work.push({ x: sx, z: sz }); l.visit.push({ x: cx, z: cz }); }
/** A table with chairs round it (chairs become seats automatically); returns the table entry. */
export function table(l, x, z, n = 4, t = 'table', gap = 1.0) {
  const seats = [], at = [[-gap, 0, 1], [gap, 0, 3], [0, -gap, 0], [0, gap, 2]].slice(0, n);
  l.furniture.push({ t, x, z, r: 0 }); for (const [dx, dz, r] of at) { l.furniture.push({ t: 'chair', x: x + dx, z: z + dz, r }); seats.push({ x: x + dx, z: z + dz }); }
  const e = { x, z, seats }; l.tables.push(e); return e;
}
