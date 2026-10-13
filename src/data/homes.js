import { UNIT, WALL_T } from '../config.js';

/**
 * Real rooms for the 2x2 houses (8 m square), on the lines of an ordinary British home of the time:
 *  - one storey (cottage, bungalow): the front door opens straight into the front room; behind it the kitchen, the
 *    bathroom and the main bedroom, and a little second bedroom at the front;
 *  - two storeys (terrace, semi, townhouse, or a home with the Upstairs rooms upgrade): a hall with the stairs straight
 *    up the side wall, the front room and a kitchen-diner downstairs; upstairs the front (main) bedroom, the bathroom
 *    and the kids' room at the back.
 * Partition walls have 1.2 m doorways (wide enough for the indoor route finder). Furniture follows the upgrades
 * (def.heating: radiators) and, when drawn, the era (a coal range and no telly before electricity...).
 * Everything is in building-local metres (origin the middle, +z the front, door side). Pure data.
 */
const I = 4 - WALL_T;   // inner face of the outside walls (the houses are 8 m square)
const wall = (x0, z0, x1, z1, doors = [], k = 0, col) => ({ a: [x0, z0], b: [x1, z1], doors, k, col });
const floor = (x0, x1, z0, z1, kind, col, k = 0) => ({ x0, x1, z0, z1, kind, col, k });
const PAPERS = [0xe8dcc0, 0xd8e0c8, 0xe8d0d0, 0xd0d8e8, 0xf0e8c8, 0xe0d0e8];
const CARPETS = [0x8a3a3a, 0x3a5a7a, 0x7a6a4a, 0x5a7a4a, 0x9a8a6a, 0x6a4a6a];

export function homePlan(def) {
  const l = { furniture: [], walls: [], beds: [], work: [], terminals: [], idle: [], visit: [], pickup: [], floors: [], lights: [], upper: [], noDress: true };
  const two = (def.floors || 1) >= 2, seed = (def.id || '').length + (def.beds || 0) * 7, paper = (i) => PAPERS[(seed + i) % PAPERS.length], carpet = (i) => CARPETS[(seed + i * 2) % CARPETS.length];
  const F = (t, x, z, r = 0) => l.furniture.push({ t, x, z, r }), U = (t, x, z, r = 0, k = 1) => l.upper.push({ t, x, z, r, k });
  const heat = !!def.heating;
  if (def.id === 'terrace') return terrace(l, F, U, heat, paper, carpet, def);
  // sleepers: every bed in the plan gives one or two places; any more (bigger families) sleep on the sofa bed / upstairs
  const sleep = (x, z, n, up) => { for (let i = 0; i < n; i++) { const ox = n > 1 ? (i ? 0.35 : -0.35) : 0; l.beds.push({ x: x + ox, z, ax: x + ox, az: z + 1.45, up }); } };   // in from the foot of the bed
  if (two) {
    l.stairPref = 'left';   // straight up the left wall from the front door (see Levels.placeStairs)
    // ---- ground floor: hall (x < -1) with the stairs, the front room at the front, the kitchen-diner behind ----
    l.walls.push(wall(-1.0, -I, -1.0, I, [2.0, -1.8], 0, paper(0)), wall(-1.0, 0.2, I, 0.2, [2.75], 0, paper(1)));
    l.floors.push(floor(-I, -1.0, -I, I, 'boards', 0x8a6a4a), floor(-1.0, I, 0.2, I, 'carpet', carpet(0)), floor(-1.0, I, -I, 0.2, 'lino', 0xd8d0b0));
    // the front room: three-piece suite round the fire and the telly
    F('mantel', I - 0.2, 1.95, 3); F('sofa', 1.05, 0.78, 0); F('armchair', -0.35, 1.75, 1); F('armchair', 2.2, 3.1, 2); F('tvunit', -0.3, 3.3, 2); F('coffeetable', 1.25, 2.0, 0); F('rug', 1.3, 2.0, 0); F('lamp', I - 0.3, 0.55, 0); F('hifi', 3.1, 3.4, 2); F('picture', 1.0, 0.33, 0); F('plant', -0.65, 3.4, 0);
    if (heat) F('radiator', 0.9, I - 0.1, 2);
    // the kitchen-diner: fitted units along the back, fridge-freezer, washer, table for four
    F('kitchen', 2.2, -I + 0.36, 0); F('fridgefreezer', 0.4, -I + 0.36, 0); F('washer', I - 0.45, -1.7, 3); F('table', 1.3, -1.25, 0); for (const [x, z, r] of [[0.55, -1.25, 1], [2.05, -1.25, 3], [1.3, -0.5, 2], [1.3, -2.0, 0]]) F('chair', x, z, r);
    F('clock', -0.6, -0.3, 1); F('ironing', -0.4, -2.9, 1); if (heat) F('radiator', 3.2, -0.05, 2);
    // the hall: coats, the phone on its little table, a radiator
    F('phonetable', -1.35, -0.5, 3); F('pegs', -2.35, -I + 0.18, 0); if (heat) F('radiator', -1.15, 0.9, 3);
    l.lights.push({ x: 1.3, z: 2.0, k: 0 }, { x: 1.3, z: -1.7, k: 0 }, { x: -1.8, z: 0, k: 0 });
    l.idle.push({ x: 1.0, z: 1.7 }, { x: 0.6, z: 2.3 }, { x: 1.6, z: -2.5 }, { x: 2.6, z: -0.7 }, { x: -1.8, z: 3.0 });
    // ---- upstairs: the landing over the hall; the main bedroom at the front, the bathroom, the kids' room at the back ----
    l.walls.push(wall(-1.0, -I, -1.0, I, [2.35, 0.05, -2.3], 1, paper(2)), wall(-1.0, 1.0, I, 1.0, [], 1, paper(3)), wall(-1.0, -0.9, I, -0.9, [], 1, paper(4)));
    l.floors.push(floor(-1.0, I, 1.0, I, 'carpet', carpet(1), 1), floor(-1.0, I, -0.9, 1.0, 'tiles', 0xd8e8e0, 1), floor(-1.0, I, -I, -0.9, 'carpet', carpet(2), 1), floor(-2.6, -1.0, -I, I, 'carpet', carpet(3), 1));
    U('dbed', 2.55, 2.35, 3); U('bedside', 3.45, 1.35, 3); U('bedside', 3.45, 3.4, 3); U('wardrobe', 0.15, 1.38, 0); U('dresser', 0.85, I - 0.27, 2); if (heat) U('radiator', -0.45, I - 0.1, 2);
    U('bath', 2.7, 0.56, 0); U('toilet', 0.85, -0.5, 0); U('basin', 1.75, -0.65, 0); U('airer', -0.35, 0.3, 1);
    U('bunk', 3.15, -2.6, 0); U('bed', 1.55, -2.55, 0); U('homepc', 0.1, -1.25, 2); U('poster', 2.3, -I + 0.04, 0); U('chest', 0.1, -3.35, 0); if (heat) U('radiator', 2.3, -1.0, 2);
    U('plant', -1.7, I - 0.4, 0); U('picture', -1.12, -3.0, 3);
    l.lights.push({ x: 1.3, z: 2.35, k: 1 }, { x: 1.3, z: 0.05, k: 1 }, { x: 1.3, z: -2.3, k: 1 }, { x: -1.8, z: -1.5, k: 1 });
    // everyone sleeps upstairs (out of sight); the extra places, if any, are in the kids' room too
    for (let i = 0; i < (def.beds || 5); i++) l.beds.push({ x: 0, z: 0, ax: 0, az: 0, up: true });
  } else {
    // ---- one storey: straight in to the front room; kitchen, bathroom and main bedroom across the back ----
    l.walls.push(wall(-I, 0.8, I, 0.8, [-2.0, -0.2, 1.4], 0, paper(0)), wall(-1.1, -I, -1.1, 0.8, [], 0, paper(1)), wall(0.7, -I, 0.7, 0.8, [], 0, paper(2)), wall(2.0, 0.8, 2.0, I, [1.5], 0, paper(3)));
    l.floors.push(floor(-I, 2.0, 0.8, I, 'carpet', carpet(0)), floor(-I, -1.1, -I, 0.8, 'lino', 0xd8d0b0), floor(-1.1, 0.7, -I, 0.8, 'tiles', 0xd8e8e0), floor(0.7, I, -I, 0.8, 'carpet', carpet(1)), floor(2.0, I, 0.8, I, 'carpet', carpet(2)));
    // front room
    F('sofa', -3.2, 2.0, 1); F('tvunit', 1.6, 3.15, 3); F('armchair', -0.4, 3.2, 2); F('coffeetable', -1.3, 2.0, 1); F('rug', -1.2, 2.1, 0); F('lamp', 1.7, 2.25, 0); F('plant', -3.4, I - 0.35, 0); F('picture', -2.3, 0.87, 2);
    if (heat) F('radiator', 0.6, I - 0.1, 2);
    // kitchen
    F('kitchen', -3.37, -1.9, 1); F('fridgefreezer', -3.35, 0.15, 1); F('washer', -1.55, -I + 0.4, 0); F('table', -2.1, -2.75, 0); F('chair', -2.1, -2.0, 2); F('chair', -2.1, -3.45, 0);
    // bathroom
    F('bath', -0.2, -2.8, 1); F('toilet', 0.3, -1.25, 3); F('basin', -0.75, -1.15, 1); if (heat) F('radiator', -0.2, 0.68, 2);
    // main bedroom (back right)
    F('dbed', 2.3, -2.6, 0); F('bedside', 3.35, -3.4, 0); F('bedside', 1.25, -3.4, 0); F('wardrobe', 1.1, -0.9, 1); F('dresser', 3.4, -0.6, 3);
    // little bedroom (front right)
    F(def.beds >= 4 ? 'bunk' : 'bed', 2.95, 1.95, 0); F('chest', 2.95, I - 0.3, 2);
    l.lights.push({ x: -0.8, z: 2.2, k: 0 }, { x: -2.4, z: -1.5, k: 0 }, { x: -0.2, z: -1.5, k: 0 }, { x: 2.2, z: -1.5, k: 0 }, { x: 2.85, z: 2.2, k: 0 });
    l.idle.push({ x: -1.2, z: 2.9 }, { x: 0.4, z: 2.0 }, { x: -2.3, z: -1.2 }, { x: 1.4, z: 2.6 });
    sleep(2.3, -2.6, 2, false); sleep(2.95, 1.95, def.beds >= 4 ? 2 : 1, false);
    while (l.beds.length < (def.beds || 3)) l.beds.push({ x: -3.2, z: 2.0 + (l.beds.length % 2) * 0.6, ax: -2.4, az: 2.0, up: false });   // the sofa bed
    l.beds.length = Math.min(l.beds.length, Math.max(def.beds || 3, 1));
  }
  return l;
}
/**
 * The Victorian terrace (two up, two down and a scullery), fitted round the windows of its Blender shell
 * (tools/blender/terrace.py): the hall and stairs up the left party wall; the front parlour with the bay; the back
 * dining room; the kitchen across the back under its window. Upstairs: the front bedroom, the back bedroom (an L round
 * the bathroom) and the bathroom under the little back window. Nothing tall stands in front of a window.
 */
function terrace(l, F, U, heat, paper, carpet, def) {
  l.stairPref = 'left';
  // ---- ground floor ----
  l.walls.push(wall(-1.0, -I, -1.0, I, [3.0, -0.2, -2.9], 0, paper(0)), wall(-1.0, 1.0, I, 1.0, [], 0, paper(1)), wall(-1.0, -1.4, I, -1.4, [-0.2], 0, paper(2)));
  l.floors.push(floor(-I, -1.0, -I, I, 'boards', 0x8a6a4a), floor(-1.0, I, 1.0, I, 'carpet', carpet(0)), floor(-1.0, I, -1.4, 1.0, 'boards', 0x9a7450), floor(-1.0, I, -I, -1.4, 'lino', 0xd8d0b0));
  // the parlour: the settee and armchair against the back wall facing the bay, the telly low in the bay, the gas fire on
  // the party wall; a clear way across the middle from the hall door (Sam and the family walk round, not through, the suite)
  F('sofa', 1.2, 1.5, 0); F('armchair', 2.85, 1.5, 0); F('tvunit', 1.7, 3.4, 2); F('gasfire', I - 0.2, 2.4, 3); F('coffeetable', 1.2, 2.5, 0); F('rug', 1.4, 2.5, 0);
  F('lamp', -0.7, 1.95, 0); F('hifi', -0.6, 1.3, 1); F('picture', 1.3, 1.07, 0); if (heat) F('radiator', 1.7, I - 0.1, 2);
  // the back room: the dining table to the right, the dresser with the best plates, the clock; the left side is the way
  // through between the hall and the kitchen doors
  F('table', 2.1, -0.2, 0); for (const [x, z, r] of [[1.35, -0.2, 1], [2.85, -0.2, 3]]) F('chair', x, z, r);
  F('dresser', I - 0.3, -0.2, 3); F('clock', 0.4, 0.75, 2); if (heat) F('radiator', 1.6, 0.92, 2);
  // the kitchen: units and the sink under the back window, the twin-tub and the fridge-freezer along to the corner
  // (the hall door at the back left stays clear)
  F('kitchenlow', 0.9, -I + 0.36, 0); F('washer', 2.55, -I + 0.4, 0); F('fridgefreezer', I - 0.35, -I + 0.36, 0); F('ironing', 2.6, -1.85, 0);
  // the hall: coats on the pegs, the phone on its table, under the stairs at the back
  F('phonetable', -1.3, 1.6, 3); F('pegs', -2.2, -I + 0.18, 0); if (heat) F('radiator', -1.12, 0.6, 3);
  l.lights.push({ x: 1.4, z: 2.4, k: 0 }, { x: 1.6, z: -0.2, k: 0 }, { x: 1.4, z: -2.6, k: 0 }, { x: -1.8, z: 0, k: 0 });
  l.idle.push({ x: 0.2, z: 2.6 }, { x: 2.7, z: 2.6 }, { x: 0.3, z: -0.4 }, { x: 0.6, z: -2.3 }, { x: -1.7, z: 3.0 });
  // ---- upstairs ----
  l.walls.push(wall(-1.0, -I, -1.0, I, [2.0, -0.2, -2.4], 1, paper(3)), wall(-1.0, 0.6, I, 0.6, [], 1, paper(4)), wall(-1.0, -1.0, 1.3, -1.0, [], 1, paper(5)), wall(1.3, -I, 1.3, -1.0, [], 1, paper(5)));
  l.floors.push(floor(-1.0, I, 0.6, I, 'carpet', carpet(1), 1), floor(-1.0, I, -1.0, 0.6, 'carpet', carpet(2), 1), floor(1.3, I, -I, -1.0, 'carpet', carpet(2), 1), floor(-1.0, 1.3, -I, -1.0, 'tiles', 0xd8e8e0, 1), floor(-2.6, -1.0, -I, I, 'carpet', carpet(3), 1));
  // front bedroom: the double bed's head on the party wall, wardrobe by the door
  U('dbed', 2.6, 2.3, 3); U('bedside', 3.45, 1.2, 3); U('bedside', 3.45, 3.4, 3); U('wardrobe', 0.0, 0.93, 0); U('dresser', -0.4, I - 0.27, 2); if (heat) U('radiator', 0.4, 0.72, 0);
  // back bedroom: the bunks and a single bed side by side in the bit under the window, heads to the back wall, so the
  // floor from the door to the beds is clear; a chest of drawers by the door
  U('bunk', 3.15, -2.55, 0); U('bed', 2.0, -2.55, 0); U('chest', 0.2, -0.65, 0); U('poster', 2.0, 0.55, 2); if (heat) U('radiator', I - 0.1, -0.3, 3);
  // bathroom: the bath under the window
  U('bath', 0.3, -I + 0.4, 0); U('toilet', 0.9, -1.4, 2); U('basin', -0.05, -1.25, 2); if (heat) U('radiator', -0.88, -1.5, 1);
  U('plant', -1.7, I - 0.4, 0); U('picture', -1.12, -1.0, 3);
  l.lights.push({ x: 1.3, z: 2.2, k: 1 }, { x: 1.3, z: -0.2, k: 1 }, { x: 0.15, z: -2.4, k: 1 }, { x: -1.8, z: -1.5, k: 1 });
  for (let i = 0; i < (def.beds || 5); i++) l.beds.push({ x: 0, z: 0, ax: 0, az: 0, up: true });
  return l;
}
/** The solid stretches of a partition wall (the bits between the doorways), as local rects [minx, maxx, minz, maxz]. */
export function wallPieces(w, t = 0.12, dw = 1.2) {
  const [x0, z0] = w.a, [x1, z1] = w.b, alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), s0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), s1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1), c = alongX ? z0 : x0;
  const cuts = (w.doors || []).map((d) => [d - dw / 2, d + dw / 2]).sort((a, b) => a[0] - b[0]), out = []; let s = s0;
  for (const [a, b] of cuts) { if (a > s + 0.02) out.push([s, a]); s = Math.max(s, b); } if (s1 > s + 0.02) out.push([s, s1]);
  return { alongX, c, pieces: out.map(([a, b]) => (alongX ? [a, b, c - t / 2, c + t / 2] : [c - t / 2, c + t / 2, a, b])), doors: cuts };
}
void UNIT;
