import { TILE, WALL_T } from '../config.js';
import { BUILDINGS } from './buildings.js';

/**
 * Interior layouts in building-local space (origin = footprint centre, +z = front/door side).
 * Pure data -> in Unity these become prefabs with child anchors (Bed_0, Desk_0, Terminal_0...).
 */
export function doorOffset(w) { return (Math.floor((w - 1) / 2) + 0.5 - w / 2) * TILE; }
const totalJobs = (def) => Object.values(def.jobs || {}).reduce((a, b) => a + b, 0);

function empty() { return { furniture: [], walls: [], beds: [], work: [], terminals: [], idle: [], visit: [], pickup: [] }; }

function deskRows(def, lay, count, opts = {}) {
  const W = def.w * TILE, D = def.d * TILE, step = 2.7, cols = Math.max(1, Math.floor((W - 2) / step));
  const x0 = -((cols - 1) * step) / 2; let n = 0;
  for (let z = -D / 2 + 1.7; z < D / 2 - 4.4 && n < count; z += 2.7) {
    for (let c = 0; c < cols && n < count; c++, n++) {
      const x = x0 + c * step;
      lay.furniture.push({ t: opts.t || 'desk', x, z, r: 0 });
      lay.work.push({ x, z: z + 1.05 });
      lay.furniture.push({ t: 'chair', x, z: z + 1.05, r: 2 });
    }
  }
  return n;
}
function fillWork(def, lay, min) {
  // make sure there are enough spots; extras stand along back wall
  const W = def.w * TILE, D = def.d * TILE; let i = 0;
  while (lay.work.length < min) { lay.work.push({ x: -W / 2 + 1.5 + (i++ % 4) * 2, z: -D / 2 + 1.2 }); }
}

const LAYOUTS = {
  none: () => empty(),
  shack(def) {
    const l = empty(), D = def.d * TILE;
    l.furniture.push({ t: 'strawbed', x: -0.85, z: -D / 2 + 1.3, r: 0 }, { t: 'stool', x: 1.0, z: 0.5, r: 3 }, { t: 'chest', x: 1.1, z: -1.15, r: 1 });
    l.beds.push({ x: -0.85, z: -D / 2 + 1.3, ax: 0.3, az: 0.4 }); l.idle.push({ x: 0.3, z: 0.6 }); return l;
  },
  hut(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (let i = 0; i < def.beds; i++) { const x = -1.7 + i * 3.4, z = -D / 2 + 1.5; l.furniture.push({ t: 'strawbed', x, z, r: 0 }); l.beds.push({ x, z, ax: x, az: z + 2.0 }); }
    l.furniture.push({ t: 'firepit', x: 0.4, z: 0.4, r: 0 }, { t: 'table', x: 2.8, z: 1.4, r: 0 }, { t: 'stool', x: 1.5, z: 1.4, r: 1 }, { t: 'stool', x: 4.0 - 0.3, z: 1.4, r: 3 }, { t: 'chest', x: -W / 2 + 0.7, z: 1.0, r: 1 }, { t: 'barrel', x: -W / 2 + 0.7, z: 2.6, r: 0 });
    l.idle.push({ x: -1.5, z: 1.8 }, { x: 0.4, z: 2.4 }); return l;
  },
  cabin(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (let i = 0; i < def.beds; i++) { const x = -2.7 + i * 1.8, z = -D / 2 + 1.6; l.furniture.push({ t: 'strawbed', x, z, r: 0 }); l.beds.push({ x, z, ax: x, az: z + 2.0 }); }
    l.furniture.push({ t: 'hearth', x: W / 2 - 0.6, z: 0.4, r: 3 }, { t: 'table', x: -0.6, z: 1.6, r: 0 }, { t: 'chair', x: -1.8, z: 1.6, r: 1 }, { t: 'chair', x: 0.6, z: 1.6, r: 3 }, { t: 'chest', x: -W / 2 + 0.6, z: 0.2, r: 1 }, { t: 'barrel', x: -W / 2 + 0.6, z: -0.9, r: 0 });
    l.idle.push({ x: -1.0, z: 2.8 }, { x: 1.4, z: 0.4 }); return l;
  },
  shed(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE; const n = Math.max(2, Object.values(def.jobs || {}).reduce((a, b) => a + b, 0));
    l.furniture.push({ t: 'workbench', x: -W / 4, z: -D / 2 + 0.8, r: 0 }, { t: 'rack', x: W / 4, z: -D / 2 + 0.5, r: 0 }, { t: 'barrel', x: -W / 2 + 0.6, z: 0.4, r: 0 }, { t: 'crate', x: W / 2 - 0.7, z: 0.5, r: 0 }, { t: 'crate', x: W / 2 - 0.7, z: 1.5, r: 0 }, { t: 'stool', x: -W / 4 + 1.4, z: -D / 2 + 1.6, r: 0 });
    for (let i = 0; i < n; i++) l.work.push({ x: -W / 4 + i * 1.6, z: -D / 2 + 2.0 }); l.idle.push({ x: 0, z: 1.2 }); return l;
  },
  tavern(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'bar', x: 0, z: -D / 2 + 1.2, r: 0 }, { t: 'hearth', x: W / 2 - 0.6, z: 0.5, r: 3 }, { t: 'barrel', x: -W / 2 + 0.7, z: -D / 2 + 0.8, r: 0 }, { t: 'barrel', x: W / 2 - 0.7, z: -D / 2 + 0.8, r: 0 });
    l.work.push({ x: -0.8, z: -D / 2 + 2.0 }, { x: 0.8, z: -D / 2 + 2.0 });
    for (const [x, z] of [[-3.6, 0.4], [-3.6, 3.4], [2.2, 3.4], [-0.2, 3.4]]) { l.furniture.push({ t: 'table', x, z, r: 0 }, { t: 'chair', x: x - 1.15, z, r: 1 }, { t: 'chair', x: x + 1.15, z, r: 3 }); }
    for (const x of [-1.2, 0, 1.2]) l.furniture.push({ t: 'stool', x, z: -D / 2 + 2.4, r: 2 });
    l.idle.push({ x: 0.6, z: 1.6 }, { x: -2, z: 2 }); l.visit.push({ x: 0.6, z: 1.6 }); return l;
  },
  school(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'board', x: 0, z: -D / 2 + 0.3, r: 0 }, { t: 'desk', x: -4.2, z: -D / 2 + 1.2, r: 0 }); l.work.push({ x: -4.2, z: -D / 2 + 2.2 }); l.furniture.push({ t: 'chair', x: -4.2, z: -D / 2 + 2.2, r: 2 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = -3.6 + c * 2.4, z = -0.4 + r * 2.0; l.furniture.push({ t: 'desk', x, z, r: 0 }, { t: 'chair', x, z: z + 0.9, r: 2 }); }
    l.idle.push({ x: 0, z: 3 }); return l;
  },
  terminalhut(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'terminal', x: -1.4, z: -D / 2 + 0.9, r: 0 }, { t: 'chair', x: -1.4, z: -D / 2 + 1.9, r: 2 }, { t: 'table', x: 1.8, z: -0.4, r: 0 }, { t: 'stool', x: 1.8, z: 0.9, r: 2 }, { t: 'crate', x: W / 2 - 0.7, z: D / 2 - 1.2, r: 0 }, { t: 'rack', x: 1.6, z: -D / 2 + 0.4, r: 0 });
    l.terminals.push({ x: -1.4, z: -D / 2 + 2.3 }); l.idle.push({ x: 0, z: 1.8 }); return l;
  },
  yard(def) { const l = empty(); l.pickup.push({ x: 0, z: 0.4 }); l.idle.push({ x: -2, z: 1.2 }, { x: 2, z: 1.2 }); return l; },
  house(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE, bx = [-2.4, 0, 2.4, 2.4];
    for (let i = 0; i < def.beds; i++) {
      const x = i < 3 ? bx[i] : -3.0, z = i < 3 ? -D / 2 + 1.7 : 0.6;
      l.furniture.push({ t: 'bed', x, z, r: 0 }); l.beds.push({ x, z, ax: x + (i < 3 ? 0 : 1.6), az: i < 3 ? z + 2.0 : z });
    }
    l.furniture.push({ t: 'sofa', x: 3.0, z: -0.1, r: 3 }, { t: 'tv', x: -3.4, z: -0.1, r: 1 }, { t: 'table', x: 0.6, z: 1.4, r: 0 }, { t: 'chair', x: -0.55, z: 1.4, r: 1 }, { t: 'chair', x: 1.75, z: 1.4, r: 3 }, { t: 'counter', x: W / 2 - 0.7, z: 2.4, r: 3 }, { t: 'plant', x: -W / 2 + 0.6, z: D / 2 - 0.7, r: 0 });
    l.idle.push({ x: 0.6, z: 2.6 }, { x: -1, z: 0.5 }, { x: 1.6, z: 0 });
    return l;
  },
  apartments(def) {
    const l = empty(), D = def.d * TILE; let n = 0;
    for (const row of [-D / 2 + 1.8, -D / 2 + 4.8, -D / 2 + 7.8]) for (const x of [-4.4, -2.4, 2.4, 4.4]) {
      if (n++ >= def.beds) break; const side = x < 0 ? 1 : -1;
      l.furniture.push({ t: 'bed', x, z: row, r: 0 }); l.beds.push({ x, z: row, ax: x + side * 1.3, az: row + 0.6 });
    }
    l.furniture.push({ t: 'reception', x: 0, z: -D / 2 + 1.1, r: 0 }, { t: 'plant', x: -1.2, z: D / 2 - 0.9, r: 0 }, { t: 'plant', x: 1.2, z: D / 2 - 0.9, r: 0 });
    l.idle.push({ x: 0, z: 1 }, { x: 0, z: -2 });
    return l;
  },
  townhall(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (const x of [-4, 0, 4]) { l.furniture.push({ t: 'terminal', x, z: -D / 2 + 1.0, r: 0 }); l.terminals.push({ x, z: -D / 2 + 2.3 }); l.furniture.push({ t: 'chair', x, z: -D / 2 + 2.0, r: 2 }); }
    l.furniture.push({ t: 'reception', x: -2.5, z: 0.2, r: 0 }, { t: 'reception', x: 2.5, z: 0.2, r: 0 }, { t: 'bench', x: -4.5, z: 3.8, r: 0 }, { t: 'bench', x: 4.5, z: 3.8, r: 0 }, { t: 'plant', x: -W / 2 + 0.7, z: -0.5, r: 0 }, { t: 'plant', x: W / 2 - 0.7, z: -0.5, r: 0 });
    l.work.push({ x: -2.5, z: -0.9 }, { x: 2.5, z: -0.9 }); l.idle.push({ x: 0, z: 2.5 }, { x: -4.5, z: 2.4 });
    return l;
  },
  depot(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (const x of [-4.2, -1.4, 1.4, 4.2]) l.furniture.push({ t: 'shelf', x, z: -D / 2 + 0.6, r: 0 });
    l.furniture.push({ t: 'crate', x: -4.4, z: 0, r: 0 }, { t: 'crate', x: -3.4, z: 0.3, r: 0 }, { t: 'crate', x: 4.4, z: 0.2, r: 0 }, { t: 'crate', x: 4.4, z: 1.2, r: 0 }, { t: 'reception', x: 0, z: -1.2, r: 0 });
    l.pickup.push({ x: 0, z: -0.2 }); l.idle.push({ x: -2, z: 1.8 }, { x: 2, z: 1.8 });
    return l;
  },
  contractor(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'terminal', x: -4.2, z: -D / 2 + 0.9, r: 0 }, { t: 'chair', x: -4.2, z: -D / 2 + 1.9, r: 2 }); l.terminals.push({ x: -4.2, z: -D / 2 + 2.1 });
    for (const x of [-1.2, 1.6, 4.2]) { l.furniture.push({ t: 'drafting', x, z: -D / 2 + 1.0, r: 0 }); l.work.push({ x, z: -D / 2 + 2.1 }); }
    l.furniture.push({ t: 'locker', x: W / 2 - 0.5, z: 0.4, r: 3 }, { t: 'locker', x: W / 2 - 0.5, z: 1.4, r: 3 }, { t: 'table', x: -3, z: 0.8, r: 0 });
    l.idle.push({ x: 0, z: 1 }); fillWork(def, l, 4); return l;
  },
  shop(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'counter', x: 1.2, z: -0.3, r: 0 }); l.work.push({ x: 1.2, z: -1.2 }, { x: -0.6, z: -1.2 });
    for (const z of [-2.2, 0.4]) l.furniture.push({ t: 'shelf', x: -W / 2 + 0.6, z, r: 1 });
    l.furniture.push({ t: 'shelf', x: 0, z: -D / 2 + 0.6, r: 0 }, { t: 'shelf', x: 2.6, z: -D / 2 + 0.6, r: 0 }, { t: 'crate', x: W / 2 - 0.9, z: 2.6, r: 0 });
    l.visit.push({ x: 0.4, z: 0.8 }, { x: -1.4, z: 1.4 }, { x: 1.6, z: 1.6 }); l.idle.push({ x: 0, z: 2 }); return l;
  },
  office(def) {
    const l = empty(), D = def.d * TILE; deskRows(def, l, 7, {});
    l.furniture.push({ t: 'terminal', x: 0, z: D / 2 - 3.0, r: 0 }); l.terminals.push({ x: 0, z: D / 2 - 1.9 }); // reception terminal
    l.furniture.push({ t: 'plant', x: 4.8, z: D / 2 - 0.9, r: 0 }, { t: 'plant', x: -4.8, z: D / 2 - 0.9, r: 0 });
    // the terminal near the door: desk faces the door so player stands on the +z side
    l.idle.push({ x: 4, z: 2 }); fillWork(def, l, totalJobs(def)); return l;
  },
  factory(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE; let i = 0;
    for (const x of [-5.5, -2, 1.5, 5]) { l.furniture.push({ t: 'machine', x, z: -D / 2 + 1.7, r: 0 }); l.work.push({ x, z: -D / 2 + 3.2 }); }
    for (const x of [-5.5, -2, 1.5, 5]) { l.furniture.push({ t: 'machine', x, z: -0.8, r: 0 }); l.work.push({ x, z: 0.8 }); }
    l.furniture.push({ t: 'crate', x: W / 2 - 0.8, z: D / 2 - 1.2, r: 0 }, { t: 'crate', x: -W / 2 + 0.8, z: D / 2 - 1.2, r: 0 }); l.idle.push({ x: 0, z: 3.2 }); return l;
  },
  clinic(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (let i = 0; i < 4; i++) { const x = -4.2 + i * 2.8; l.furniture.push({ t: 'hbed', x, z: -D / 2 + 1.6, r: 0 }); l.beds.push({ x, z: -D / 2 + 1.6, ax: x, az: -D / 2 + 3.4 }); }
    l.furniture.push({ t: 'reception', x: 0, z: 0.8, r: 2 }, { t: 'bench', x: -4.4, z: 3.6, r: 0 }, { t: 'bench', x: 4.4, z: 3.6, r: 0 }, { t: 'plant', x: -W / 2 + 0.7, z: 1.5, r: 0 });
    l.work.push({ x: 0, z: 0 }, { x: -2, z: -1.6 }, { x: 2, z: -1.6 }); l.idle.push({ x: 0, z: 3 }); return l;
  },
  police(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'reception', x: 0, z: 0.4, r: 0 }); l.work.push({ x: 0, z: -0.6 });
    for (const x of [-4, 4]) { l.furniture.push({ t: 'desk', x, z: -D / 2 + 1.2, r: 0 }, { t: 'chair', x, z: -D / 2 + 2.2, r: 2 }); l.work.push({ x, z: -D / 2 + 2.2 }); }
    l.furniture.push({ t: 'locker', x: -W / 2 + 0.5, z: -0.5, r: 1 }, { t: 'bench', x: 0, z: 2.6, r: 0 }); l.idle.push({ x: 0, z: 1.8 }); return l;
  },
  power(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (const x of [-3.2, 0, 3.2]) { l.furniture.push({ t: 'generator', x, z: -D / 2 + 2.2, r: 0 }); l.work.push({ x, z: -D / 2 + 4.1 }); }
    l.furniture.push({ t: 'terminal', x: W / 2 - 1.2, z: 1, r: 3 }, { t: 'chair', x: W / 2 - 2.2, z: 1, r: 3 }); l.terminals.push({ x: W / 2 - 2.4, z: 1 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  pump(def) {
    const l = empty(); l.furniture.push({ t: 'generator', x: 0, z: -1, r: 0 }); l.work.push({ x: 0, z: 0.8 }); l.idle.push({ x: -1.5, z: 1.5 }); return l;
  },
  lobby(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'reception', x: 0, z: -2, r: 0 }, { t: 'sofa', x: -3.8, z: 2.4, r: 0 }, { t: 'sofa', x: 3.8, z: 2.4, r: 0 }, { t: 'plant', x: -4.8, z: -D / 2 + 1, r: 0 }, { t: 'plant', x: 4.8, z: -D / 2 + 1, r: 0 });
    l.furniture.push({ t: 'terminal', x: 0, z: -D / 2 + 0.9, r: 0 }); l.terminals.push({ x: 0, z: -D / 2 + 2.1 });
    l.work.push({ x: 0, z: -3.0 }, { x: 1.4, z: -3.0 }, { x: -1.4, z: -3.0 }); l.idle.push({ x: 0, z: 2.5 }, { x: -3, z: 0 }, { x: 3, z: 0 });
    fillWork(def, l, totalJobs(def)); return l;
  },
};

Object.assign(LAYOUTS, {
  kiosk(def) {
    const l = empty(); l.furniture.push({ t: 'counter', x: 0.3, z: -0.6, r: 0 }, { t: 'shelf', x: -0.6, z: -1.55, r: 0 });
    l.work.push({ x: 0.3, z: -1.25 }); l.visit.push({ x: 0, z: 0.5 }); l.idle.push({ x: -0.6, z: 0.8 }); return l;
  },
  bakery(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'oven', x: -W / 2 + 1.4, z: -D / 2 + 0.9, r: 0 }, { t: 'workbench', x: 1.6, z: -D / 2 + 0.8, r: 0 }, { t: 'counter', x: 0.6, z: 0.2, r: 0 }, { t: 'shelf', x: -W / 2 + 0.5, z: 1.4, r: 1 }, { t: 'barrel', x: W / 2 - 0.6, z: -0.6, r: 0 });
    l.work.push({ x: -W / 2 + 1.4, z: -D / 2 + 2.1 }, { x: 0.6, z: -0.7 }); l.visit.push({ x: 0.4, z: 1.4 }, { x: 1.8, z: 1.8 }); l.idle.push({ x: -0.6, z: 2.2 }); return l;
  },
  chippy(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'fryer', x: 0.4, z: -D / 2 + 0.75, r: 0 }, { t: 'counter', x: 0.4, z: -0.5, r: 0 });
    l.work.push({ x: -0.4, z: -D / 2 + 1.7 }, { x: 1.3, z: -D / 2 + 1.7 });
    for (const [x, z] of [[-2.2, 1.6]]) l.furniture.push({ t: 'table', x, z, r: 0 }, { t: 'chair', x, z: z + 1.0, r: 2 }, { t: 'chair', x: x + 1.1, z, r: 3 });
    l.furniture.push({ t: 'stool', x: 1.6, z: 1.8, r: 2 }, { t: 'stool', x: 2.4, z: 1.8, r: 2 });
    l.visit.push({ x: 0.4, z: 0.6 }, { x: 1.4, z: 0.7 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  launderette(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    for (let i = 0; i < 6; i++) l.furniture.push({ t: 'washer', x: -W / 2 + 0.9 + i * 0.95, z: -D / 2 + 0.7, r: 0 });
    l.furniture.push({ t: 'counter', x: W / 2 - 1.6, z: 0.6, r: 1 }, { t: 'bench', x: -1.3, z: 1.6, r: 0 });
    l.work.push({ x: W / 2 - 0.6, z: 0.6 }); l.visit.push({ x: -1.6, z: -0.6 }, { x: 0.4, z: -0.6 }); l.idle.push({ x: 0.5, z: 2.4 }); return l;
  },
  video(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'vhs', x: -1.2, z: -D / 2 + 0.5, r: 0 }, { t: 'vhs', x: 1.2, z: -D / 2 + 0.5, r: 0 }, { t: 'vhs', x: -W / 2 + 0.5, z: 0.4, r: 1 }, { t: 'counter', x: 1.4, z: 1.2, r: 1 }, { t: 'tv', x: W / 2 - 0.5, z: -0.6, r: 3 });
    l.work.push({ x: 2.4, z: 1.2 }); l.visit.push({ x: -1.2, z: -0.6 }, { x: 0.8, z: -0.6 }, { x: -0.6, z: 0.9 }); l.idle.push({ x: 0, z: 2.4 }); return l;
  },
  bookies(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'reception', x: 0, z: -D / 2 + 1.0, r: 0 }, { t: 'tv', x: -W / 2 + 0.5, z: -0.4, r: 1 }, { t: 'tv', x: -W / 2 + 0.5, z: 1.2, r: 1 }, { t: 'table', x: 1.4, z: 1.2, r: 0 }, { t: 'stool', x: 0.4, z: 1.2, r: 1 }, { t: 'stool', x: 2.4, z: 1.2, r: 3 });
    l.work.push({ x: 0, z: -D / 2 + 0.3 }); l.visit.push({ x: -0.8, z: 0.2 }, { x: -1.4, z: 1.4 }); l.idle.push({ x: 0.4, z: 2.4 }); return l;
  },
  postoffice(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'reception', x: 0, z: -D / 2 + 1.2, r: 0 }, { t: 'shelf', x: -W / 2 + 0.5, z: 0.6, r: 1 }, { t: 'bench', x: 1.6, z: 1.8, r: 0 }, { t: 'plant', x: W / 2 - 0.6, z: 0.2, r: 0 });
    l.work.push({ x: -0.8, z: -D / 2 + 0.4 }, { x: 0.8, z: -D / 2 + 0.4 }); l.visit.push({ x: -0.6, z: -0.2 }, { x: -0.6, z: 0.8 }, { x: -0.6, z: 1.8 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  hall(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'table', x: -3.6, z: -D / 2 + 1.2, r: 0 }, { t: 'table', x: -2.0, z: -D / 2 + 1.2, r: 0 }, { t: 'counter', x: 3.6, z: -D / 2 + 0.7, r: 0 }, { t: 'board', x: 0, z: -D / 2 + 0.2, r: 0 });
    for (const x of [-3.6, -1.2, 1.2, 3.6]) l.furniture.push({ t: 'chair', x, z: 1.2, r: 2 }, { t: 'chair', x, z: 2.4, r: 2 });
    l.work.push({ x: 3.6, z: -D / 2 + 1.6 }); l.visit.push({ x: 0, z: -0.4 }); l.idle.push({ x: 0, z: 0.2 }, { x: -2, z: 0 }); return l;
  },
  church(def) {
    const l = empty(), W = def.w * TILE, D = def.d * TILE;
    l.furniture.push({ t: 'altar', x: 0, z: -D / 2 + 1.0, r: 0 }, { t: 'plant', x: -2, z: -D / 2 + 0.8, r: 0 }, { t: 'plant', x: 2, z: -D / 2 + 0.8, r: 0 });
    for (const z of [-1.6, 0.2, 2.0, 3.8]) for (const x of [-2.9, 2.9]) l.furniture.push({ t: 'pew', x, z, r: 2 });
    l.work.push({ x: 0, z: -D / 2 + 2.0 }); l.idle.push({ x: 0, z: 1 }); l.visit.push({ x: 0, z: 0.5 }); return l;
  },
});

export function layoutFor(def) {
  const fn = LAYOUTS[def.layout]; const l = fn ? fn(def) : empty();
  const need = Object.values(def.jobs || {}).reduce((a, b) => a + b, 0); fillWork(def, l, need);
  if (!l.idle.length) l.idle.push({ x: 0, z: 1.5 });
  return l;
}
