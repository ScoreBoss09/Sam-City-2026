import { UNIT, WALL_T } from '../config.js';
import { BUILDINGS } from './buildings.js';
import { FURN } from '../render/Furniture.js';
import { levelPlan, laneRect, placeAlongWalls } from '../world/Levels.js';
import { homePlan, wallPieces } from './homes.js';
import { ID_LAYOUTS } from './interiors/index.js';

/**
 * Interior layouts in building-local space (origin = footprint centre, +z = front/door side).
 * Pure data -> in Unity these become prefabs with child anchors (Bed_0, Desk_0, Terminal_0...).
 */
export function doorOffset(w) { return (Math.floor((w - 1) / 2) + 0.5 - w / 2) * UNIT; }
const totalJobs = (def) => Object.values(def.jobs || {}).reduce((a, b) => a + b, 0);

function empty() { return { furniture: [], walls: [], beds: [], work: [], terminals: [], idle: [], visit: [], pickup: [] }; }

function deskRows(def, lay, count, opts = {}) {
  const W = def.w * UNIT, D = def.d * UNIT, step = 2.7, cols = Math.max(1, Math.floor((W - 2) / step));
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
  const W = def.w * UNIT, D = def.d * UNIT; let i = 0;
  while (lay.work.length < min) { lay.work.push({ x: -W / 2 + 1.5 + (i++ % 4) * 2, z: -D / 2 + 1.2 }); }
}

function oldHouse(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT, bx = [-2.4, 0, 2.4, 2.4];
    for (let i = 0; i < def.beds; i++) {
      const x = i < 3 ? bx[i] : -3.0, z = i < 3 ? -D / 2 + 1.7 : 0.6;
      l.furniture.push({ t: 'bed', x, z, r: 0 }); l.beds.push({ x, z, ax: x + (i < 3 ? 0 : 1.6), az: i < 3 ? z + 2.0 : z });
    }
    l.furniture.push({ t: 'sofa', x: 3.0, z: -0.1, r: 3 }, { t: 'tv', x: -3.4, z: -0.1, r: 1 }, { t: 'table', x: 0.6, z: 1.4, r: 0 }, { t: 'chair', x: -0.55, z: 1.4, r: 1 }, { t: 'chair', x: 1.75, z: 1.4, r: 3 }, { t: 'kitchen', x: W / 2 - 0.4, z: 2.4, r: 3 }, { t: 'gasfire', x: -W / 2 + 0.25, z: 2.4, r: 1 }, { t: 'plant', x: -W / 2 + 0.6, z: D / 2 - 0.7, r: 0 });
    l.furniture.push({ t: 'rug', x: 0.6, z: 1.4, r: 0 }, { t: 'picture', x: -1.2, z: -D / 2 + 0.36, r: 0 }, { t: 'picture', x: 1.2, z: -D / 2 + 0.36, r: 0 }, { t: 'lamp', x: 3.4, z: -0.95, r: 0 });
    l.idle.push({ x: 0.6, z: 2.6 }, { x: -1, z: 0.5 }, { x: 1.6, z: 0 });
    return l;
  }

const LAYOUTS = {
  none: () => empty(),
  chapel(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'altar', x: 0, z: -D / 2 + 0.9, r: 0 }); for (const z of [-0.4, 0.9, 2.2]) l.furniture.push({ t: 'pew', x: 0, z, r: 0 });
    l.furniture.push({ t: 'shelfbooks', x: W / 2 - 0.35, z: -1.4, r: 3 }); l.work.push({ x: 0, z: -D / 2 + 1.9 }); l.idle.push({ x: -2.6, z: 2.6 }); return l;
  },
  surgery(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'desk', x: -1.4, z: -D / 2 + 0.9, r: 0 }, { t: 'chair', x: -1.4, z: -D / 2 + 1.8, r: 2 }, { t: 'hbed', x: W / 2 - 0.8, z: -1.2, r: 0 }, { t: 'bench', x: -1.6, z: 2.4, r: 0 }, { t: 'bench', x: 1.2, z: 2.4, r: 0 }, { t: 'locker', x: W / 2 - 0.5, z: 1.4, r: 3 });
    l.beds.push({ x: W / 2 - 0.8, z: -1.2, ax: W / 2 - 2.0, az: -0.4 }); l.work.push({ x: -1.4, z: -D / 2 + 1.8 }); l.idle.push({ x: 0, z: 1.4 }); return l;
  },
  // ---- 1990s high street ----
  butcher(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'meatcase', x: 0, z: 0.2, r: 0 }, { t: 'workbench', x: -1.2, z: -D / 2 + 0.7, r: 0 }, { t: 'rack', x: 1.4, z: -D / 2 + 0.5, r: 0 }, { t: 'clock', x: W / 2 - 0.4, z: -0.8, r: 3 });
    l.work.push({ x: -0.6, z: -1.0 }); l.visit.push({ x: -0.6, z: 1.6 }, { x: 0.8, z: 1.6 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  kebab(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'counter', x: 0, z: -0.2, r: 0 }, { t: 'spit', x: -1.2, z: -D / 2 + 0.7, r: 0 }, { t: 'spit', x: -0.4, z: -D / 2 + 0.7, r: 0 }, { t: 'fryer', x: 1.2, z: -D / 2 + 0.8, r: 0 }, { t: 'stool', x: -2.6, z: 1.6, r: 1 }, { t: 'stool', x: -2.6, z: 2.4, r: 1 }, { t: 'table', x: 2.4, z: 2.0, r: 0 });
    l.work.push({ x: -0.8, z: -1.2 }); l.visit.push({ x: -0.4, z: 0.9 }, { x: 0.8, z: 0.9 }); l.idle.push({ x: 0, z: 2.4 }); return l;
  },
  snooker(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-W / 4 - 0.3, W / 4 + 0.3]) { l.furniture.push({ t: 'snookertable', x, z: -0.6, r: 0 }); l.visit.push({ x: x + 1.4, z: -0.6 }, { x: x - 1.4, z: 0.4 }); }
    l.furniture.push({ t: 'bar', x: 0, z: D / 2 - 1.0, r: 2 }, { t: 'board', x: 0, z: -D / 2 + 0.2, r: 0 }); l.work.push({ x: 0, z: D / 2 - 2.0 }); l.idle.push({ x: 0, z: 1.8 }); return l;
  },
  bingo(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'bingostand', x: 0, z: -D / 2 + 0.8, r: 0 }, { t: 'board', x: 2.2, z: -D / 2 + 0.2, r: 0 }, { t: 'counter', x: W / 2 - 1.6, z: D / 2 - 1.0, r: 0 });
    for (const x of [-3.2, 0, 3.2]) for (const z of [0, 2.4]) { l.furniture.push({ t: 'table', x, z, r: 0 }, { t: 'chair', x: x - 0.9, z, r: 1 }, { t: 'chair', x: x + 0.9, z, r: 3 }); }
    l.work.push({ x: 0, z: -D / 2 + 1.8 }, { x: W / 2 - 1.6, z: D / 2 - 1.9 }); l.visit.push({ x: -3.2, z: 1.2 }, { x: 0, z: 1.2 }, { x: 3.2, z: 1.2 }); l.idle.push({ x: -4.4, z: 3.4 }); return l;
  },
  salon(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-1.6, 0, 1.6]) { l.furniture.push({ t: 'salonchair', x, z: -D / 2 + 1.0, r: 0 }); }
    l.furniture.push({ t: 'sofa', x: 0, z: D / 2 - 1.3, r: 2 }, { t: 'counter', x: W / 2 - 0.6, z: 0.6, r: 3 }, { t: 'plant', x: -W / 2 + 0.6, z: 1.6, r: 0 });
    l.work.push({ x: -1.6, z: -D / 2 + 2.0 }, { x: 0, z: -D / 2 + 2.0 }); l.visit.push({ x: -1.6, z: -D / 2 + 1.1 }, { x: 1.6, z: -D / 2 + 1.1 }); l.idle.push({ x: -1.4, z: 1.6 }); return l;
  },
  tanning(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'sunbed', x: -1.4, z: -D / 2 + 1.4, r: 0 }, { t: 'sunbed', x: 0.4, z: -D / 2 + 1.4, r: 0 }, { t: 'counter', x: W / 2 - 0.6, z: 1.0, r: 3 }, { t: 'plant', x: -W / 2 + 0.6, z: 2.2, r: 0 }, { t: 'radio', x: 1.8, z: -D / 2 + 0.4, r: 0 });
    l.work.push({ x: W / 2 - 1.5, z: 1.0 }); l.visit.push({ x: -1.4, z: 0.6 }, { x: 0.4, z: 0.6 }); l.idle.push({ x: -1.0, z: 2.4 }); return l;
  },
  computers(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-1.6, 0.4]) { l.furniture.push({ t: 'pcdesk', x, z: -D / 2 + 0.7, r: 0 }); l.visit.push({ x, z: -D / 2 + 1.6 }); }
    l.furniture.push({ t: 'shelf', x: -W / 2 + 0.4, z: 0.6, r: 1 }, { t: 'counter', x: W / 2 - 0.6, z: 1.0, r: 3 }, { t: 'pcdesk', x: -0.6, z: 1.0, r: 2 }); l.visit.push({ x: -0.6, z: 1.9 });
    l.work.push({ x: W / 2 - 1.5, z: 1.0 }); l.idle.push({ x: 0.6, z: 2.6 }); return l;
  },
  bowling(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-3.6, -2.0, -0.4, 1.2]) { l.furniture.push({ t: 'lane', x, z: -1.2, r: 0 }); l.visit.push({ x, z: 3.2 }); }
    l.furniture.push({ t: 'reception', x: W / 2 - 1.8, z: D / 2 - 1.2, r: 2 }, { t: 'rack', x: W / 2 - 0.4, z: -1.0, r: 3 }); l.work.push({ x: W / 2 - 1.8, z: D / 2 - 2.1 }, { x: W / 2 - 1.2, z: -1.0 }); l.idle.push({ x: 3.4, z: 2.6 }); return l;
  },
  laser(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const [x, z] of [[-3.6, -1.6], [-1.6, 0.2], [0.6, -1.6], [2.6, 0.4], [-3.0, 1.8], [1.4, 2.0]]) l.furniture.push({ t: 'pillar', x, z, r: 0 });
    l.furniture.push({ t: 'counter', x: W / 2 - 1.2, z: D / 2 - 0.8, r: 0 }); l.work.push({ x: W / 2 - 1.2, z: D / 2 - 1.7 });
    for (const [x, z] of [[-2.6, -0.6], [-0.4, -0.8], [1.6, -0.6], [-1.6, 1.4], [0.4, 1.2], [3.6, -1.2]]) l.visit.push({ x, z }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  youthclub(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'pingpong', x: -2.6, z: -0.2, r: 1 }, { t: 'snookertable', x: 1.6, z: -0.4, r: 1 }, { t: 'counter', x: W / 2 - 1.4, z: D / 2 - 0.9, r: 0 }, { t: 'sofa', x: -3.4, z: 2.4, r: 2 }, { t: 'tv', x: -3.4, z: -D / 2 + 0.4, r: 0 }, { t: 'radio', x: 0, z: -D / 2 + 0.4, r: 0 });
    l.work.push({ x: W / 2 - 1.4, z: D / 2 - 1.8 }); l.visit.push({ x: -2.6, z: 1.6 }, { x: -2.6, z: -2.0 }, { x: 1.6, z: 1.6 }); l.idle.push({ x: 0, z: 2.0 }); return l;
  },
  // ---- working buildings, each with the kit of its trade ----
  stables(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-W / 2 + 1.2, -W / 2 + 2.6, -W / 2 + 4.0]) { l.furniture.push({ t: 'horse', x, z: -D / 2 + 1.6, r: 0 }); l.work.push({ x: x + 0.7, z: -D / 2 + 3.0 }); }
    l.furniture.push({ t: 'haycart', x: W / 2 - 1.4, z: -D / 2 + 1.6, r: 0 }, { t: 'hay', x: W / 2 - 1.0, z: 1.6, r: 0 }, { t: 'barrel', x: -W / 2 + 0.6, z: 1.8, r: 0 }, { t: 'rack', x: 0.8, z: -D / 2 + 0.4, r: 0 });
    l.idle.push({ x: 0, z: 1.6 }); return l;
  },
  cycleshop(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (let i = 0; i < 4; i++) l.furniture.push({ t: 'bike', x: -W / 2 + 0.8 + i * 0.75, z: -D / 2 + 1.3, r: 0 });
    l.furniture.push({ t: 'workbench', x: W / 2 - 1.3, z: -D / 2 + 0.7, r: 0 }, { t: 'counter', x: W / 2 - 1.2, z: 1.3, r: 1 }, { t: 'tyres', x: -W / 2 + 0.6, z: 1.6, r: 0 }, { t: 'bike', x: 0.4, z: 0.6, r: 1 });
    l.work.push({ x: W / 2 - 1.3, z: -D / 2 + 1.6 }, { x: W / 2 - 2.4, z: 1.3 }); l.visit.push({ x: -1.0, z: -0.3 }, { x: 0, z: 1.8 }); l.idle.push({ x: -1.5, z: 2.4 }); return l;
  },
  garage(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'car', x: -1.2, z: -0.4, r: 0 }, { t: 'workbench', x: W / 2 - 1.2, z: -D / 2 + 0.7, r: 0 }, { t: 'tyres', x: W / 2 - 0.7, z: 0.8, r: 0 }, { t: 'tyres', x: W / 2 - 0.7, z: 2.0, r: 0 }, { t: 'rack', x: -W / 2 + 0.5, z: 0, r: 1 });
    l.work.push({ x: 0.3, z: 0.2 }, { x: W / 2 - 1.2, z: -D / 2 + 1.6 }); l.idle.push({ x: 1.6, z: 2.6 }); return l;
  },
  station(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'ticket', x: 0, z: -D / 2 + 0.8, r: 0 }, { t: 'clock', x: W / 2 - 0.5, z: -D / 2 + 0.5, r: 0 }, { t: 'bench', x: -W / 2 + 1.6, z: 1.0, r: 0 }, { t: 'bench', x: W / 2 - 1.6, z: 1.0, r: 0 }, { t: 'board', x: -W / 2 + 0.25, z: -0.6, r: 1 });
    l.work.push({ x: 0, z: -D / 2 + 1.7 }); l.visit.push({ x: -1.4, z: -0.2 }, { x: 1.4, z: -0.2 }); l.idle.push({ x: 0, z: 1.8 }); return l;
  },
  nightclub(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'decks', x: 0, z: -D / 2 + 0.8, r: 0 }, { t: 'speaker', x: -1.8, z: -D / 2 + 0.6, r: 0 }, { t: 'speaker', x: 1.8, z: -D / 2 + 0.6, r: 0 }, { t: 'bar', x: W / 2 - 0.6, z: 0.4, r: 1 }, { t: 'mirrorball', x: 0, z: 0.2, r: 0 });
    l.work.push({ x: 0, z: -D / 2 + 1.7 }, { x: W / 2 - 1.6, z: 0.4 }); for (const [x, z] of [[-1.5, -0.4], [-0.4, 0.6], [0.8, -0.2], [-1.0, 1.2], [0.5, 1.4]]) l.visit.push({ x, z }); l.idle.push({ x: -2.5, z: 1.8 }); return l;
  },
  arcade(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (let i = 0; i < 5; i++) { const x = -W / 2 + 0.8 + i * 1.1; l.furniture.push({ t: 'arcade', x, z: -D / 2 + 0.75, r: 0 }); l.visit.push({ x, z: -D / 2 + 1.7 }); }
    l.furniture.push({ t: 'arcade', x: -W / 2 + 0.75, z: 0.6, r: 1 }, { t: 'counter', x: W / 2 - 0.6, z: 1.2, r: 3 }); l.work.push({ x: W / 2 - 1.5, z: 1.2 }); l.idle.push({ x: 0, z: 2.2 }); return l;
  },
  bank(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'bankcounter', x: 0, z: -0.6, r: 0 }, { t: 'rope', x: -1.2, z: 1.4, r: 0 }, { t: 'poster', x: W / 2 - 0.25, z: 1.2, r: 3 }, { t: 'safe', x: -W / 2 + 0.8, z: -D / 2 + 0.6, r: 0 }, { t: 'safe', x: W / 2 - 0.8, z: -D / 2 + 0.6, r: 0 }, { t: 'bench', x: 0, z: 2.4, r: 0 });
    l.work.push({ x: -0.8, z: -1.5 }, { x: 0.8, z: -1.5 }); l.visit.push({ x: -0.8, z: 0.4 }, { x: 0.8, z: 0.4 }); l.idle.push({ x: -2.4, z: 1.8 }); return l;
  },
  cinema(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'screen', x: 0, z: -D / 2 + 0.4, r: 0 }, { t: 'counter', x: W / 2 - 1.6, z: D / 2 - 1.2, r: 0 });
    for (const z of [-1.2, 0.2, 1.6]) l.furniture.push({ t: 'pew', x: -1.6, z, r: 0 }, { t: 'pew', x: 1.8, z, r: 0 });
    l.work.push({ x: W / 2 - 1.6, z: D / 2 - 2.0 }); l.idle.push({ x: -4.2, z: 2.6 }); return l;
  },
  firestation(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'firetruck', x: -W / 4, z: 0, r: 0 }, { t: 'locker', x: W / 2 - 0.6, z: -D / 2 + 0.6, r: 0 }, { t: 'locker', x: W / 2 - 1.6, z: -D / 2 + 0.6, r: 0 }, { t: 'table', x: W / 4 + 0.4, z: 0.6, r: 0 }, { t: 'board', x: W / 4, z: -D / 2 + 0.2, r: 0 });
    l.work.push({ x: -W / 4 + 1.6, z: 0.4 }, { x: W / 4 - 0.6, z: 0.6 }, { x: W / 4 + 1.4, z: 0.6 }); l.idle.push({ x: W / 4, z: 2.2 }); return l;
  },
  leisure(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'pool', x: -1.2, z: -1.4, r: 0 }, { t: 'weights', x: W / 2 - 1.2, z: -D / 2 + 0.8, r: 0 }, { t: 'reception', x: W / 2 - 1.8, z: D / 2 - 1.4, r: 0 }, { t: 'bench', x: -1.2, z: 1.8, r: 0 });
    l.work.push({ x: W / 2 - 1.8, z: D / 2 - 2.3 }, { x: 2.3, z: -1.4 }); for (const [x, z] of [[-3.2, -1.4], [-1.2, -1.4], [0.8, -1.4], [W / 2 - 1.2, -D / 2 + 1.8]]) l.visit.push({ x, z }); l.idle.push({ x: -1.2, z: 2.7 }); return l;
  },
  watchhouse(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'cells', x: -W / 2 + 1.8, z: -D / 2 + 1.1, r: 0 }, { t: 'desk', x: W / 2 - 1.4, z: -0.4, r: 3 }, { t: 'chair', x: W / 2 - 2.3, z: -0.4, r: 1 }, { t: 'board', x: W / 2 - 0.25, z: 1.6, r: 3 }, { t: 'locker', x: -W / 2 + 0.6, z: 1.6, r: 1 });
    l.work.push({ x: W / 2 - 2.3, z: -0.4 }, { x: 0, z: 1.4 }); l.idle.push({ x: 0, z: 2.0 }); return l;
  },
  shack(def) {
    const l = empty(), D = def.d * UNIT;
    l.furniture.push({ t: 'strawbed', x: -0.85, z: -D / 2 + 1.3, r: 0 }, { t: 'stool', x: 1.0, z: 0.5, r: 3 }, { t: 'chest', x: 1.1, z: -1.15, r: 1 });
    l.furniture.push({ t: 'picture', x: 1.0, z: -D / 2 + 0.36, r: 0 });
    l.beds.push({ x: -0.85, z: -D / 2 + 1.3, ax: 0.3, az: 0.4 }); l.idle.push({ x: 0.3, z: 0.6 }); return l;
  },
  hut(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (let i = 0; i < def.beds; i++) { const x = -1.7 + i * 3.4, z = -D / 2 + 1.5; l.furniture.push({ t: 'strawbed', x, z, r: 0 }); l.beds.push({ x, z, ax: x, az: z + 2.0 }); }
    l.furniture.push({ t: 'firepit', x: 0.4, z: 0.4, r: 0 }, { t: 'table', x: 2.8, z: 1.4, r: 0 }, { t: 'stool', x: 1.5, z: 1.4, r: 1 }, { t: 'stool', x: 4.0 - 0.3, z: 1.4, r: 3 }, { t: 'chest', x: -W / 2 + 0.7, z: 1.0, r: 1 }, { t: 'barrel', x: -W / 2 + 0.7, z: 2.6, r: 0 });
    l.idle.push({ x: -1.5, z: 1.8 }, { x: 0.4, z: 2.4 }); return l;
  },
  cabin(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (let i = 0; i < def.beds; i++) { const x = -2.7 + i * 1.8, z = -D / 2 + 1.6; l.furniture.push({ t: 'strawbed', x, z, r: 0 }); l.beds.push({ x, z, ax: x, az: z + 2.0 }); }
    l.furniture.push({ t: 'hearth', x: W / 2 - 0.6, z: 0.4, r: 3 }, { t: 'table', x: -0.6, z: 1.6, r: 0 }, { t: 'chair', x: -1.8, z: 1.6, r: 1 }, { t: 'chair', x: 0.6, z: 1.6, r: 3 }, { t: 'chest', x: -W / 2 + 0.6, z: 0.2, r: 1 }, { t: 'barrel', x: -W / 2 + 0.6, z: -0.9, r: 0 });
    l.furniture.push({ t: 'rug', x: -0.6, z: 1.6, r: 0 }, { t: 'picture', x: W / 2 - 0.36, z: -1.6, r: 3 });
    l.idle.push({ x: -1.0, z: 2.8 }, { x: 1.4, z: 0.4 }); return l;
  },
  shed(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT; const n = Math.max(2, Object.values(def.jobs || {}).reduce((a, b) => a + b, 0));
    l.furniture.push({ t: 'workbench', x: -W / 4, z: -D / 2 + 0.8, r: 0 }, { t: 'rack', x: W / 4, z: -D / 2 + 0.5, r: 0 }, { t: 'barrel', x: -W / 2 + 0.6, z: 0.4, r: 0 }, { t: 'crate', x: W / 2 - 0.7, z: 0.5, r: 0 }, { t: 'crate', x: W / 2 - 0.7, z: 1.5, r: 0 }, { t: 'stool', x: -W / 4 + 1.4, z: -D / 2 + 1.6, r: 0 });
    for (let i = 0; i < n; i++) l.work.push({ x: -W / 4 + i * 1.6, z: -D / 2 + 2.0 }); l.idle.push({ x: 0, z: 1.2 }); return l;
  },
  tavern(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    // the bar across the back with the landlord behind it, the optics and the till on the back bar
    l.furniture.push({ t: 'bar', x: 0, z: -D / 2 + 2.0, r: 0 }, { t: 'hearth', x: W / 2 - 0.6, z: 0.5, r: 3 }, { t: 'barrel', x: W / 2 - 0.7, z: -D / 2 + 0.8, r: 0 });
    // the kitchen in the back corner: pub grub (pie and chips, a ploughman's, scampi in a basket)
    l.furniture.push({ t: 'kitchen', x: -W / 2 + 1.75, z: -D / 2 + 0.45, r: 0 }, { t: 'stove', x: -W / 2 + 0.55, z: -D / 2 + 1.7, r: 1 });
    l.work.push({ x: -0.8, z: -D / 2 + 1.15 }, { x: 0.8, z: -D / 2 + 1.15 }, { x: -W / 2 + 1.75, z: -D / 2 + 1.3 });
    for (const [x, z] of [[-3.6, 0.4], [-3.6, 3.4], [2.6, 3.4], [2.4, 0.4]]) { l.furniture.push({ t: 'table', x, z, r: 0 }, { t: 'chair', x: x - 1.15, z, r: 1 }, { t: 'chair', x: x + 1.15, z, r: 3 }); }
    for (const x of [-1.2, 0, 1.2]) l.furniture.push({ t: 'stool', x, z: -D / 2 + 2.95, r: 2 });
    l.furniture.push({ t: 'backbar', x: 0, z: -D / 2 + 0.5, r: 0 }, { t: 'fruitmachine', x: -W / 2 + 0.55, z: -1.5, r: 1 }, { t: 'jukebox', x: W / 2 - 0.4, z: -1.6, r: 3 });
    l.furniture.push({ t: 'dartboard', x: -W / 2 + 0.36, z: 2.0, r: 1 }, { t: 'picture', x: -2.4, z: -D / 2 + 0.36, r: 0 }, { t: 'picture', x: 2.4, z: -D / 2 + 0.36, r: 0 }, { t: 'clock', x: W / 2 - 0.5, z: 3.6, r: 3 });
    l.idle.push({ x: 0.6, z: 1.6 }, { x: -2, z: 2 }); l.visit.push({ x: 0.6, z: 1.6 }); return l;
  },
  school(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'board', x: 0, z: -D / 2 + 0.3, r: 0 }, { t: 'desk', x: -4.2, z: -D / 2 + 1.2, r: 0 }); l.work.push({ x: -4.2, z: -D / 2 + 2.2 }); l.furniture.push({ t: 'chair', x: -4.2, z: -D / 2 + 2.2, r: 2 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = -3.6 + c * 2.4, z = -0.4 + r * 2.0; l.furniture.push({ t: 'desk', x, z, r: 0 }, { t: 'chair', x, z: z + 0.9, r: 2 }); }
    l.furniture.push({ t: 'pegs', x: W / 2 - 1.4, z: D / 2 - 0.35, r: 2 }, { t: 'globe', x: -W / 2 + 0.6, z: -D / 2 + 1.0, r: 0 }, { t: 'poster', x: -2.4, z: -D / 2 + 0.25, r: 0 }, { t: 'poster', x: 2.4, z: -D / 2 + 0.25, r: 0 }, { t: 'shelfbooks', x: W / 2 - 0.4, z: -0.6, r: 3 });
    l.idle.push({ x: 0, z: 3 }); return l;
  },
  terminalhut(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'terminal', x: -1.4, z: -D / 2 + 0.9, r: 0 }, { t: 'chair', x: -1.4, z: -D / 2 + 1.9, r: 2 }, { t: 'table', x: 1.8, z: -0.4, r: 0 }, { t: 'stool', x: 1.8, z: 0.9, r: 2 }, { t: 'crate', x: W / 2 - 0.7, z: D / 2 - 1.2, r: 0 }, { t: 'rack', x: 1.6, z: -D / 2 + 0.4, r: 0 });
    l.terminals.push({ x: -1.4, z: -D / 2 + 2.3 }); l.idle.push({ x: 0, z: 1.8 }); return l;
  },
  yard(def) { const l = empty(); l.pickup.push({ x: 0, z: 0.4 }); l.idle.push({ x: -2, z: 1.2 }, { x: 2, z: 1.2 }); return l; },
  house(def) { return def.w === 2 && def.d === 2 ? homePlan(def) : oldHouse(def); },
  apartments(def) {
    const l = empty(), D = def.d * UNIT; let n = 0;
    for (const row of [-D / 2 + 1.8, -D / 2 + 4.8, -D / 2 + 7.8]) for (const x of [-4.4, -2.4, 2.4, 4.4]) {
      if (n++ >= def.beds) break; const side = x < 0 ? 1 : -1;
      l.furniture.push({ t: 'bed', x, z: row, r: 0 }); l.beds.push({ x, z: row, ax: x + side * 1.3, az: row + 0.6 });
    }
    l.furniture.push({ t: 'reception', x: 0, z: -D / 2 + 1.1, r: 0 }, { t: 'plant', x: -1.2, z: D / 2 - 0.9, r: 0 }, { t: 'plant', x: 1.2, z: D / 2 - 0.9, r: 0 });
    l.idle.push({ x: 0, z: 1 }, { x: 0, z: -2 });
    return l;
  },
  townhall(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-4, 0, 4]) { l.furniture.push({ t: 'terminal', x, z: -D / 2 + 1.0, r: 0 }); l.terminals.push({ x, z: -D / 2 + 2.3 }); l.furniture.push({ t: 'chair', x, z: -D / 2 + 2.0, r: 2 }); }
    l.furniture.push({ t: 'reception', x: -2.5, z: 0.2, r: 0 }, { t: 'reception', x: 2.5, z: 0.2, r: 0 }, { t: 'bench', x: -4.5, z: 3.8, r: 0 }, { t: 'bench', x: 4.5, z: 3.8, r: 0 }, { t: 'plant', x: -W / 2 + 0.7, z: -0.5, r: 0 }, { t: 'plant', x: W / 2 - 0.7, z: -0.5, r: 0 });
    l.work.push({ x: -2.5, z: -0.9 }, { x: 2.5, z: -0.9 }); l.idle.push({ x: 0, z: 2.5 }, { x: -4.5, z: 2.4 });
    return l;
  },
  depot(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-4.2, -1.4, 1.4, 4.2]) l.furniture.push({ t: 'shelf', x, z: -D / 2 + 0.6, r: 0 });
    l.furniture.push({ t: 'crate', x: -4.4, z: 0, r: 0 }, { t: 'crate', x: -3.4, z: 0.3, r: 0 }, { t: 'crate', x: 4.4, z: 0.2, r: 0 }, { t: 'crate', x: 4.4, z: 1.2, r: 0 }, { t: 'reception', x: 0, z: -1.2, r: 0 });
    l.pickup.push({ x: 0, z: -0.2 }); l.idle.push({ x: -2, z: 1.8 }, { x: 2, z: 1.8 });
    return l;
  },
  contractor(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'terminal', x: -4.2, z: -D / 2 + 0.9, r: 0 }, { t: 'chair', x: -4.2, z: -D / 2 + 1.9, r: 2 }); l.terminals.push({ x: -4.2, z: -D / 2 + 2.1 });
    for (const x of [-1.2, 1.6, 4.2]) { l.furniture.push({ t: 'drafting', x, z: -D / 2 + 1.0, r: 0 }); l.work.push({ x, z: -D / 2 + 2.1 }); }
    l.furniture.push({ t: 'locker', x: W / 2 - 0.5, z: 0.4, r: 3 }, { t: 'locker', x: W / 2 - 0.5, z: 1.4, r: 3 }, { t: 'table', x: -3, z: 0.8, r: 0 });
    l.idle.push({ x: 0, z: 1 }); fillWork(def, l, 4); return l;
  },
  shop(def) {
    // a proper shop: the till by the door, aisles down the middle, the chiller along the back, shelves on the walls.
    // What's on the shelves depends on the shop (toys, wine, everything-a-pound...). Bigger shops get more aisles and checkouts.
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT, door = doorOffset(def.w), big = def.w >= 3, wall = def.id === 'toyshop' ? 'toyshelf' : def.id === 'offy' ? 'winerack' : 'shelf';
    const tillX = door > 0 ? -W / 2 + 1.4 : W / 2 - 1.4;
    if (big) for (let k = 0; k < 2; k++) { const x = tillX + k * (door > 0 ? 1.6 : -1.6); l.furniture.push({ t: 'checkout', x, z: D / 2 - 2.2, r: 0 }); l.work.push({ x: x + 0.75, z: D / 2 - 2.4 }); }
    else { l.furniture.push({ t: 'till', x: tillX, z: D / 2 - 1.9, r: 0 }); l.work.push({ x: tillX, z: D / 2 - 2.65 }); }
    const aisles = Math.max(1, Math.floor((W - 3.2) / 2.2)), ax0 = -((aisles - 1) * 2.2) / 2 - (big ? 0 : 0.6);
    for (let a = 0; a < aisles; a++) for (let zz = -D / 2 + 2.4; zz < D / 2 - 3.6; zz += 2.6) l.furniture.push({ t: wall === 'shelf' ? 'gondola' : wall, x: ax0 + a * 2.2, z: zz + 0.9, r: 1 });
    for (let x = -W / 2 + 1.3; x < W / 2 - 1.0; x += 2.0) l.furniture.push({ t: def.id === 'toyshop' || def.id === 'offy' ? wall : 'fridge', x, z: -D / 2 + 0.5, r: 0 });
    for (let z = -D / 2 + 2.0; z < D / 2 - 3.0; z += 2.3) l.furniture.push({ t: wall, x: door > 0 ? W / 2 - 0.4 : -W / 2 + 0.4, z, r: door > 0 ? 3 : 1 });
    l.furniture.push({ t: 'magrack', x: door + (door > 0 ? -2.0 : 2.0), z: D / 2 - 0.4, r: 2 }, { t: 'baskets', x: door + (door > 0 ? -1.0 : 1.0), z: D / 2 - 1.0, r: 0 });
    for (let a = 0; a <= aisles; a++) l.visit.push({ x: ax0 + a * 2.2 - 1.1, z: -0.4 }); l.visit.push({ x: tillX, z: D / 2 - 1.1 }, { x: 0, z: -D / 2 + 1.4 });
    l.idle.push({ x: door, z: D / 2 - 1.4 }); fillWork(def, l, totalJobs(def)); return l;
  },
  office(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT; deskRows(def, l, 7, { t: 'pcdesk' });
    l.furniture.push({ t: 'filing', x: -W / 2 + 0.5, z: D / 2 - 2.0, r: 1 }, { t: 'filing', x: -W / 2 + 0.5, z: D / 2 - 2.7, r: 1 }, { t: 'copier', x: W / 2 - 0.6, z: D / 2 - 2.2, r: 3 }, { t: 'cooler', x: W / 2 - 0.4, z: D / 2 - 1.2, r: 3 });
    l.furniture.push({ t: 'terminal', x: 0, z: D / 2 - 3.0, r: 0 }); l.terminals.push({ x: 0, z: D / 2 - 1.9 }); // reception terminal
    l.furniture.push({ t: 'plant', x: 4.8, z: D / 2 - 0.9, r: 0 }, { t: 'plant', x: -4.8, z: D / 2 - 0.9, r: 0 });
    // the terminal near the door: desk faces the door so player stands on the +z side
    l.idle.push({ x: 4, z: 2 }); fillWork(def, l, totalJobs(def)); return l;
  },
  factory(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT; let i = 0;
    for (const x of [-5.5, -2, 1.5, 5]) { l.furniture.push({ t: 'machine', x, z: -D / 2 + 1.7, r: 0 }); l.work.push({ x, z: -D / 2 + 3.2 }); }
    for (const x of [-5.5, -2, 1.5, 5]) { l.furniture.push({ t: 'machine', x, z: -0.8, r: 0 }); l.work.push({ x, z: 0.8 }); }
    l.furniture.push({ t: 'crate', x: W / 2 - 0.8, z: D / 2 - 1.2, r: 0 }, { t: 'crate', x: -W / 2 + 0.8, z: D / 2 - 1.2, r: 0 }); l.idle.push({ x: 0, z: 3.2 }); return l;
  },
  clinic(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (let i = 0; i < 4; i++) { const x = -4.2 + i * 2.8; l.furniture.push({ t: 'hbed', x, z: -D / 2 + 1.6, r: 0 }); l.beds.push({ x, z: -D / 2 + 1.6, ax: x, az: -D / 2 + 3.4 }); }
    l.furniture.push({ t: 'reception', x: 0, z: 0.8, r: 2 }, { t: 'bench', x: -4.4, z: 3.6, r: 0 }, { t: 'bench', x: 4.4, z: 3.6, r: 0 }, { t: 'plant', x: -W / 2 + 0.7, z: 1.5, r: 0 });
    l.work.push({ x: 0, z: 0 }, { x: -2, z: -1.6 }, { x: 2, z: -1.6 }); l.idle.push({ x: 0, z: 3 }); return l;
  },
  police(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'reception', x: 0, z: 0.4, r: 0 }); l.work.push({ x: 0, z: -0.6 });
    for (const x of [-4, 4]) { l.furniture.push({ t: 'desk', x, z: -D / 2 + 1.2, r: 0 }, { t: 'chair', x, z: -D / 2 + 2.2, r: 2 }); l.work.push({ x, z: -D / 2 + 2.2 }); }
    l.furniture.push({ t: 'locker', x: -W / 2 + 0.5, z: -0.5, r: 1 }, { t: 'bench', x: 0, z: 2.6, r: 0 }); l.idle.push({ x: 0, z: 1.8 }); return l;
  },
  power(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (const x of [-3.2, 0, 3.2]) { l.furniture.push({ t: 'generator', x, z: -D / 2 + 2.2, r: 0 }); l.work.push({ x, z: -D / 2 + 4.1 }); }
    l.furniture.push({ t: 'terminal', x: W / 2 - 1.2, z: 1, r: 3 }, { t: 'chair', x: W / 2 - 2.2, z: 1, r: 3 }); l.terminals.push({ x: W / 2 - 2.4, z: 1 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  pump(def) {
    const l = empty(); l.furniture.push({ t: 'generator', x: 0, z: -1, r: 0 }); l.work.push({ x: 0, z: 0.8 }); l.idle.push({ x: -1.5, z: 1.5 }); return l;
  },
  lobby(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'reception', x: 0, z: -2, r: 0 }, { t: 'sofa', x: -3.8, z: 2.4, r: 0 }, { t: 'sofa', x: 3.8, z: 2.4, r: 0 }, { t: 'plant', x: -4.8, z: -D / 2 + 1, r: 0 }, { t: 'plant', x: 4.8, z: -D / 2 + 1, r: 0 });
    l.furniture.push({ t: 'terminal', x: 0, z: -D / 2 + 0.9, r: 0 }); l.terminals.push({ x: 0, z: -D / 2 + 2.1 });
    l.furniture.push({ t: 'keyrack', x: 2.4, z: -D / 2 + 0.25, r: 0 }, { t: 'trolley', x: 2.6, z: 1.0, r: 0 });
    l.work.push({ x: 0, z: -3.0 }, { x: 1.4, z: -3.0 }, { x: -1.4, z: -3.0 }); l.idle.push({ x: 0, z: 2.5 }, { x: -3, z: 0 }, { x: 3, z: 0 });
    fillWork(def, l, totalJobs(def)); return l;
  },
};

Object.assign(LAYOUTS, {
  kiosk(def) {
    // the corner newsagent or the offy: a counter with the sweets (or the spirits) behind, papers by the door
    const l = empty(); l.furniture.push({ t: 'counter', x: 0.3, z: -0.6, r: 0 }, { t: def.id === 'offy' ? 'winerack' : 'sweetjars', x: -0.6, z: -1.55, r: 0 }, { t: 'magrack', x: -1.3, z: 1.4, r: 1 });
    l.work.push({ x: 0.3, z: -1.25 }); l.visit.push({ x: 0, z: 0.5 }); l.idle.push({ x: -0.6, z: 0.8 }); return l;
  },
  bakery(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'oven', x: -W / 2 + 1.4, z: -D / 2 + 0.9, r: 0 }, { t: 'workbench', x: 1.6, z: -D / 2 + 0.8, r: 0 }, { t: 'counter', x: 0.6, z: 0.2, r: 0 }, { t: 'shelf', x: -W / 2 + 0.5, z: 1.4, r: 1 }, { t: 'barrel', x: W / 2 - 0.6, z: -0.6, r: 0 });
    l.work.push({ x: -W / 2 + 1.4, z: -D / 2 + 2.1 }, { x: 0.6, z: -0.7 }); l.visit.push({ x: 0.4, z: 1.4 }, { x: 1.8, z: 1.8 }); l.idle.push({ x: -0.6, z: 2.2 }); return l;
  },
  chippy(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'fryer', x: 0.4, z: -D / 2 + 0.75, r: 0 }, { t: 'counter', x: 0.4, z: -0.5, r: 0 });
    l.work.push({ x: -0.4, z: -D / 2 + 1.7 }, { x: 1.3, z: -D / 2 + 1.7 });
    for (const [x, z] of [[-2.6, -0.4]]) l.furniture.push({ t: 'table', x, z, r: 0 }, { t: 'chair', x, z: z + 1.0, r: 2 }, { t: 'chair', x: x + 1.1, z, r: 3 });
    l.furniture.push({ t: 'stool', x: 1.6, z: 1.8, r: 2 }, { t: 'stool', x: 2.4, z: 1.8, r: 2 });
    l.visit.push({ x: 0.4, z: 0.6 }, { x: 1.4, z: 0.7 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  launderette(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    for (let i = 0; i < 6; i++) l.furniture.push({ t: 'washer', x: -W / 2 + 0.9 + i * 0.95, z: -D / 2 + 0.7, r: 0 });
    l.furniture.push({ t: 'counter', x: W / 2 - 1.6, z: 0.6, r: 1 }, { t: 'bench', x: -1.3, z: 1.6, r: 0 });
    l.work.push({ x: W / 2 - 0.6, z: 0.6 }); l.visit.push({ x: -1.6, z: -0.6 }, { x: 0.4, z: -0.6 }); l.idle.push({ x: 0.5, z: 2.4 }); return l;
  },
  video(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'vhs', x: -1.2, z: -D / 2 + 0.5, r: 0 }, { t: 'vhs', x: 1.2, z: -D / 2 + 0.5, r: 0 }, { t: 'vhs', x: -W / 2 + 0.5, z: 0.4, r: 1 }, { t: 'counter', x: 1.4, z: 1.2, r: 1 }, { t: 'tv', x: W / 2 - 0.5, z: -0.6, r: 3 });
    l.work.push({ x: 2.4, z: 1.2 }); l.visit.push({ x: -1.2, z: -0.6 }, { x: 0.8, z: -0.6 }, { x: -0.6, z: 0.9 }); l.idle.push({ x: 0, z: 2.4 }); return l;
  },
  bookies(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'reception', x: 0, z: -D / 2 + 1.0, r: 0 }, { t: 'tv', x: -W / 2 + 0.5, z: -0.4, r: 1 }, { t: 'tv', x: -W / 2 + 0.5, z: 1.2, r: 1 }, { t: 'table', x: 1.4, z: 1.2, r: 0 }, { t: 'stool', x: 0.4, z: 1.2, r: 1 }, { t: 'stool', x: 2.4, z: 1.2, r: 3 });
    l.work.push({ x: 0, z: -D / 2 + 0.3 }); l.visit.push({ x: -0.8, z: 0.2 }, { x: -1.4, z: 1.4 }); l.idle.push({ x: 0.4, z: 2.4 }); return l;
  },
  postoffice(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'reception', x: 0, z: -D / 2 + 1.2, r: 0 }, { t: 'shelf', x: -W / 2 + 0.5, z: 0.6, r: 1 }, { t: 'bench', x: 1.6, z: 1.8, r: 0 }, { t: 'plant', x: W / 2 - 0.6, z: 0.2, r: 0 });
    l.work.push({ x: -0.8, z: -D / 2 + 0.4 }, { x: 0.8, z: -D / 2 + 0.4 }); l.visit.push({ x: -0.6, z: -0.2 }, { x: -0.6, z: 0.8 }, { x: -0.6, z: 1.8 }); l.idle.push({ x: 0, z: 2.6 }); return l;
  },
  hall(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'table', x: -3.6, z: -D / 2 + 1.2, r: 0 }, { t: 'table', x: -2.0, z: -D / 2 + 1.2, r: 0 }, { t: 'counter', x: 3.6, z: -D / 2 + 0.7, r: 0 }, { t: 'board', x: 0, z: -D / 2 + 0.2, r: 0 });
    for (const x of [-3.6, -1.2, 1.2, 3.6]) l.furniture.push({ t: 'chair', x, z: 1.2, r: 2 }, { t: 'chair', x, z: 2.4, r: 2 });
    l.work.push({ x: 3.6, z: -D / 2 + 1.6 }); l.visit.push({ x: 0, z: -0.4 }); l.idle.push({ x: 0, z: 0.2 }, { x: -2, z: 0 }); return l;
  },
  library(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'shelfbooks', x: -1.4, z: -D / 2 + 0.55, r: 0 }, { t: 'shelfbooks', x: 1.4, z: -D / 2 + 0.55, r: 0 }, { t: 'shelfbooks', x: -W / 2 + 0.55, z: 0.4, r: 1 }, { t: 'reception', x: 2.2, z: 1.0, r: 1 }, { t: 'table', x: -0.9, z: 0.4, r: 0 }, { t: 'chair', x: -0.9, z: 1.35, r: 2 }, { t: 'chair', x: -0.9, z: -0.55, r: 0 }, { t: 'lamp', x: 0.4, z: -1.6, r: 0 });
    l.work.push({ x: 3.0, z: 1.0 }, { x: 0.2, z: -2.6 }); l.visit.push({ x: -1.4, z: -2.2 }, { x: 0.2, z: 0.6 }); l.idle.push({ x: 0.6, z: 2.4 }); return l;
  },
  church(def) {
    const l = empty(), W = def.w * UNIT, D = def.d * UNIT;
    l.furniture.push({ t: 'altar', x: 0, z: -D / 2 + 1.0, r: 0 }, { t: 'plant', x: -2, z: -D / 2 + 0.8, r: 0 }, { t: 'plant', x: 2, z: -D / 2 + 0.8, r: 0 });
    for (const z of [-1.6, 0.2, 2.0, 3.8]) for (const x of [-2.9, 2.9]) l.furniture.push({ t: 'pew', x, z, r: 2 });
    l.work.push({ x: 0, z: -D / 2 + 2.0 }); l.idle.push({ x: 0, z: 1 }); l.visit.push({ x: 0, z: 0.5 }); return l;
  },
});

/** Move any standing spot that ended up inside solid furniture (or the doorway) to the nearest clear bit of floor. */
function unclutter(def, l, keep = []) {
  const W = def.w * UNIT, D = def.d * UNIT, door = doorOffset(def.w), M = 0.38, rects = keep.map((r) => r.slice());
  for (const f of l.furniture) { const d = FURN[f.t]; if (!d || !d.solid) continue; let [sx, sz] = d.s; if ((f.r || 0) % 2) [sx, sz] = [sz, sx]; rects.push([f.x - sx / 2, f.x + sx / 2, f.z - sz / 2, f.z + sz / 2]); }
  for (const w of l.walls || []) if (!w.k) rects.push(...wallPieces(w).pieces);   // and the inside walls
  const lim = [-W / 2 + WALL_T + 0.45, W / 2 - WALL_T - 0.45, -D / 2 + WALL_T + 0.45, D / 2 - WALL_T - 0.45];
  const bad = (x, z, used) => x < lim[0] || x > lim[1] || z < lim[2] || z > lim[3] || rects.some((r) => x > r[0] - M && x < r[1] + M && z > r[2] - M && z < r[3] + M) || (Math.abs(x - door) < 0.9 && z > D / 2 - 1.6) || used.some((u) => Math.hypot(u.x - x, u.z - z) < 0.7);
  const used = [];
  for (const list of [l.work, l.visit, l.idle]) for (const p of list) {
    if (bad(p.x, p.z, used)) { let best = null; for (let r = 0.3; r < 4.5 && !best; r += 0.3) for (let a = 0; a < 16 && !best; a++) { const x = p.x + Math.cos(a / 16 * Math.PI * 2) * r, z = p.z + Math.sin(a / 16 * Math.PI * 2) * r; if (!bad(x, z, used)) best = { x, z }; } if (best) { p.x = best.x; p.z = best.z; } }
    used.push(p);
  }
  for (const b of l.beds) if (b.ax !== undefined && rects.some((r) => b.ax > r[0] - 0.2 && b.ax < r[1] + 0.2 && b.az > r[2] - 0.2 && b.az < r[3] + 0.2) && !(Math.abs(b.ax - b.x) < 0.01 && Math.abs(b.az - b.z) < 0.01)) {
    for (let r = 0.3; r < 3; r += 0.3) { let done = false; for (let a = 0; a < 16; a++) { const x = b.ax + Math.cos(a / 16 * Math.PI * 2) * r, z = b.az + Math.sin(a / 16 * Math.PI * 2) * r; if (!bad(x, z, [])) { b.ax = x; b.az = z; done = true; break; } } if (done) break; }
  }
}

/** Little touches that make a room feel lived in (or worked in): plants, pictures, lamps, clocks, shelves, crates. */
const DECOR = {
  home: ['picture', 'plant', 'lamp', 'clock', 'shelfbooks', 'picture', 'rug'], rustic: ['barrel', 'crate', 'picture', 'chest'],
  shop: ['plant', 'picture', 'clock', 'shelf', 'lamp', 'crate'], civic: ['plant', 'board', 'clock', 'picture', 'shelfbooks', 'plant', 'locker'],
  work: ['crate', 'barrel', 'rack', 'crate', 'lamp', 'clock'], dine: ['plant', 'picture', 'dartboard', 'clock', 'lamp', 'picture'],
};
function dress(def, l, keep) {
  const W = def.w * UNIT, D = def.d * UNIT, door = doorOffset(def.w); if (W * D < 15) return;
  const kit = ['hut', 'cabin', 'shack', 'terminalhut'].includes(def.layout) ? DECOR.rustic : def.cat === 'res' ? DECOR.home : def.dining ? DECOR.dine : def.shopping || def.cat === 'com' ? DECOR.shop : def.cat === 'civic' ? DECOR.civic : DECOR.work;
  const block = keep.map((r) => r.slice()); block.push([door - 1.3, door + 1.3, D / 2 - 2.2, D / 2]);
  for (const f of l.furniture) { const d = FURN[f.t]; let [sx, sz] = d ? d.s : [0.5, 0.5]; if ((f.r || 0) % 2) [sx, sz] = [sz, sx]; block.push([f.x - sx / 2, f.x + sx / 2, f.z - sz / 2, f.z + sz / 2]); }
  for (const p of [...l.work, ...l.idle, ...l.visit, ...l.pickup, ...l.terminals]) block.push([p.x - 0.5, p.x + 0.5, p.z - 0.5, p.z + 0.5]);
  const have = (t) => l.furniture.filter((f) => f.t === t).length, n = Math.min(kit.length, Math.max(2, Math.round(W * D / 14)));
  for (const f of placeAlongWalls(W, D, kit.filter((t) => have(t) < 2).slice(0, n), block, 0.3)) l.furniture.push({ t: f.t, x: f.x, z: f.z, r: f.r });
}
export function rawLayout(def) { const fn = ID_LAYOUTS[def.id] || LAYOUTS[def.layout]; if (!fn) return empty(); const l = fn(def); for (const k of ['furniture', 'walls', 'beds', 'work', 'terminals', 'idle', 'visit', 'pickup']) if (!l[k]) l[k] = []; return l; }
/** Stairwells and lift shafts (plus room to step on and off) that the ground-floor furniture must keep clear of. */
export function stairKeepout(def) {
  const p = levelPlan(def), out = []; if (!p) return out;
  if (p.lift) out.push([p.lift.x0 - 0.2, p.lift.x1, p.lift.z0, p.lift.z1 + 1.0]);
  if (p.stair) for (const ln of p.stair.lanes) { const r = laneRect(p.stair, ln), e = 0.9; out.push(p.stair.ax === 'x' ? [r[0] - e, r[1] + e, r[2], r[3] + 0.1] : [r[0] - 0.1, r[1] + 0.1, r[2] - e, r[3] + e]); }
  return out;
}
export function layoutFor(def) {
  const l = rawLayout(def), keep = stairKeepout(def);
  if (keep.length) {
    const hits = (f) => { const d = FURN[f.t]; let [sx, sz] = d ? d.s : [0.5, 0.5]; if ((f.r || 0) % 2) [sx, sz] = [sz, sx]; return keep.some((r) => f.x + sx / 2 > r[0] && f.x - sx / 2 < r[1] && f.z + sz / 2 > r[2] && f.z - sz / 2 < r[3]); };
    const gone = l.furniture.filter(hits); l.furniture = l.furniture.filter((f) => !hits(f));
    for (const b of l.beds) if (gone.some((f) => Math.abs(f.x - b.x) < 0.05 && Math.abs(f.z - b.z) < 0.05)) { b.up = true; b.x = b.ax = 0; b.z = b.az = def.d * UNIT / 2 - 1.8; }   // that bed moves upstairs
    l.terminals = l.terminals.filter((t) => !gone.some((f) => Math.hypot(f.x - t.x, f.z - t.z) < 1.5));
    for (const list of [l.work, l.idle, l.visit, l.pickup]) for (const q of list) if (keep.some((r) => q.x > r[0] && q.x < r[1] && q.z > r[2] && q.z < r[3])) { q.x = 0; q.z = def.d * UNIT / 2 - 1.8; }
  }
  const need = Object.values(def.jobs || {}).reduce((a, b) => a + b, 0); fillWork(def, l, need);
  if (!l.idle.length) l.idle.push({ x: 0, z: 1.5 });
  if (def.layout && def.layout !== 'none' && def.layout !== 'yard') { if (!l.noDress) dress(def, l, keep); unclutter(def, l, keep); }
  return l;
}
