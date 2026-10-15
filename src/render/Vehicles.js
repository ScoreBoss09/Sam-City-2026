import * as THREE from 'three';
import { stdMat, colorize, mergeByMaterial } from './BuildingFactory.js';
/** A carriage is dozens of boxes that never move apart: baked into a handful of meshes (one per material). */
const bake = (g) => { colorize(g); mergeByMaterial(g); return g; };

/**
 * Low-poly vehicles through the ages: penny-farthings, bicycles and motorbikes (ridden by Sam and the townsfolk),
 * horse-drawn carts, police cars, trains, monorail cars and sky-lift gondolas, and period street lamps.
 * Each returns a Group; wheels that spin are listed in userData.wheels ([mesh, radius]).
 */
const unit = new THREE.BoxGeometry(1, 1, 1);
function bx(g, w, h, d, c, x, y, z, o) { const m = new THREE.Mesh(unit, stdMat(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; }
function wheel(g, r, t, c, x, y, z, spokes = 0) {
  const w = new THREE.Group(); w.position.set(x, y, z); g.add(w);
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(r, t, 5, 16), stdMat(c)); tyre.rotation.y = Math.PI / 2; w.add(tyre);
  for (let i = 0; i < spokes; i++) { const s = new THREE.Mesh(unit, stdMat(0xb8bcc2)); s.scale.set(0.015, r * 2, 0.015); s.rotation.x = i / spokes * Math.PI; w.add(s); }
  (g.userData.wheels || (g.userData.wheels = [])).push([w, r]); return w;
}
const SEAT = { penny: 1.5, bicycle: 0.92, motorbike: 0.78 };
export const VEHICLE_NAMES = ['penny-farthing', 'bicycle', 'motorbike', 'car'];
export const VEHICLE_SPEED = [1.6, 2.0, 3.1, 3.6];   // times walking speed
export function seatHeight(level) { return [SEAT.penny, SEAT.bicycle, SEAT.motorbike, 0.55][level] || 0.9; }

/** level 0 penny-farthing, 1 bicycle, 2 motorbike. Facing +z. */
export function makeRide(level, color = 0x1a1a1a) {
  if (level === 3) { const c = makeCarMesh(color); c.userData.seat = seatHeight(3); c.userData.car = true; return c; }
  const g = new THREE.Group();
  if (level === 0) {
    wheel(g, 0.72, 0.03, 0x1a1a1a, 0, 0.74, 0.25, 8); wheel(g, 0.2, 0.025, 0x1a1a1a, 0, 0.21, -0.75, 4);
    const bb = bx(g, 0.05, 0.05, 1.25, color, 0, 1.15, -0.25); bb.rotation.x = -0.55;
    bx(g, 0.28, 0.06, 0.32, 0x5a3a20, 0, 1.47, 0.0); bx(g, 0.6, 0.04, 0.04, color, 0, 1.6, 0.28); bx(g, 0.04, 0.3, 0.04, color, 0, 1.45, 0.25);
  } else if (level === 1) {
    for (const z of [0.55, -0.55]) wheel(g, 0.34, 0.03, 0x1a1a1a, 0, 0.36, z, 6);
    const t = bx(g, 0.05, 0.05, 0.85, color, 0, 0.62, 0.02); t.rotation.x = 0.12; const d = bx(g, 0.05, 0.6, 0.05, color, 0, 0.62, -0.15); d.rotation.x = 0.3;
    bx(g, 0.05, 0.05, 0.55, color, 0, 0.38, -0.3); bx(g, 0.22, 0.05, 0.28, 0x2a2a2a, 0, 0.94, -0.22); bx(g, 0.05, 0.45, 0.05, color, 0, 0.75, 0.48); bx(g, 0.55, 0.04, 0.04, 0x9aa0a8, 0, 1.0, 0.45);
    bx(g, 0.2, 0.12, 0.14, 0x8a6a3a, 0, 0.82, 0.62);   // a little wicker basket
  } else {
    for (const z of [0.7, -0.65]) wheel(g, 0.32, 0.09, 0x111111, 0, 0.33, z, 0);
    bx(g, 0.3, 0.32, 0.9, color, 0, 0.62, 0.02); bx(g, 0.34, 0.24, 0.42, shade(color), 0, 0.86, 0.22); bx(g, 0.3, 0.1, 0.55, 0x1a1a1a, 0, 0.82, -0.3);
    bx(g, 0.14, 0.12, 0.5, 0xb8bcc2, 0.18, 0.38, -0.35); bx(g, 0.7, 0.05, 0.05, 0x9aa0a8, 0, 1.08, 0.5); bx(g, 0.05, 0.4, 0.05, 0x9aa0a8, 0, 0.9, 0.55);
    bx(g, 0.18, 0.16, 0.08, 0xfff4c0, 0, 0.92, 0.66, { emissive: 0xffe9a0, emissiveIntensity: 0.6 });
  }
  g.userData.seat = seatHeight(level); return g;
}
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffeeaa, emissiveIntensity: 0 }), tailMat = new THREE.MeshStandardMaterial({ color: 0x990000, emissive: 0xff2200, emissiveIntensity: 0 });
/** Headlights and tail lights on every car come on at night (0..1). */
export function carLights(n) { headMat.emissiveIntensity = n * 1.8; tailMat.emissiveIntensity = n * 1.2; }
/** A 90s hatchback (or a little van), facing +z. userData.wheels spin. */
export function makeCarMesh(col = 0xc0392b, van = false) {
  const g = new THREE.Group(), add = (w, h, d, c, x, y, z, m) => { const k = new THREE.Mesh(unit, m || stdMat(c)); k.scale.set(w, h, d); k.position.set(x, y, z); k.castShadow = true; g.add(k); return k; };
  add(1.7, 0.6, 3.8, col, 0, 0.65, 0); add(1.5, 0.55, van ? 2.6 : 1.9, col === 0x1a1a1a ? 0x2a2a2a : col, 0, 1.2, van ? -0.4 : -0.2); add(1.4, 0.38, 0.05, 0x9fd8f0, 0, 1.25, van ? 0.92 : 0.78); add(1.4, 0.3, 0.05, 0x9fd8f0, 0, 1.25, van ? -1.7 : -1.15);
  for (const x of [-0.76, 0.76]) add(0.03, 0.34, van ? 2.3 : 1.6, 0x9fd8f0, x, 1.22, van ? -0.4 : -0.2);   // side windows
  const wheels = []; for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) wheels.push([add(0.25, 0.6, 0.6, 0x111111, x, 0.3, z), 0.3]);
  add(0.3, 0.14, 0.05, 0, -0.55, 0.7, 1.92, headMat); add(0.3, 0.14, 0.05, 0, 0.55, 0.7, 1.92, headMat); add(0.3, 0.14, 0.05, 0, -0.55, 0.7, -1.92, tailMat); add(0.3, 0.14, 0.05, 0, 0.55, 0.7, -1.92, tailMat);
  g.userData.wheels = wheels; return g;
}
const shade = (hex, f = 0.8) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); };

/** A horse and a two-wheeled cart (a carter driving). userData.legs swing as it walks. */
/** A horse and cart, always with a carter up front holding the reins (no driverless horses). */
export function makeHorseCart(horseCol = 0x6b4a2a, cartCol = 0x8a6236, { coat = 0x8a6a3a, hat = 0x3a3020, load = true } = {}) {
  const g = new THREE.Group(), legs = [];
  bx(g, 0.55, 0.6, 1.5, horseCol, 0, 1.25, 1.55); const neck = bx(g, 0.3, 0.75, 0.35, horseCol, 0, 1.75, 2.25); neck.rotation.x = 0.55;
  bx(g, 0.26, 0.28, 0.6, horseCol, 0, 2.05, 2.55); bx(g, 0.08, 0.5, 0.25, 0x2a1a10, 0, 1.75, 2.2); bx(g, 0.12, 0.45, 0.12, 0x2a1a10, 0, 1.15, 0.78);
  for (const [x, z] of [[-0.18, 2.1], [0.18, 2.1], [-0.18, 1.0], [0.18, 1.0]]) { const p = new THREE.Group(); p.position.set(x, 0.95, z); g.add(p); const l = bx(p, 0.13, 0.95, 0.13, horseCol, 0, -0.47, 0); bx(p, 0.15, 0.12, 0.17, 0xeeeeee, 0, -0.9, 0); legs.push(p); void l; }
  for (const x of [-0.35, 0.35]) bx(g, 0.05, 0.05, 2.0, 0x5a3a20, x, 1.05, 1.1);   // shafts
  bx(g, 1.4, 0.12, 1.7, cartCol, 0, 0.75, -0.6); for (const x of [-0.68, 0.68]) bx(g, 0.06, 0.4, 1.7, cartCol, x, 0.95, -0.6); bx(g, 1.4, 0.4, 0.06, cartCol, 0, 0.95, -1.45);
  for (const x of [-0.78, 0.78]) wheel(g, 0.55, 0.05, 0x3a2a1a, x, 0.57, -0.6, 6);
  if (load) { const L = new THREE.Group(); g.add(L); bx(L, 0.9, 0.35, 0.7, 0xb5834a, 0, 0.98, -0.8); bx(L, 0.6, 0.3, 0.5, 0x7aa63a, -0.1, 1.3, -0.7); g.userData.load = L; }   // a load of crates and veg
  // the carter: on a plank across the front of the cart, knees up, reins in hand
  const skin = 0xe0b48c, D = new THREE.Group(); D.position.set(0, 0, 0.05); g.add(D);
  bx(D, 1.2, 0.08, 0.3, 0x5a3a20, 0, 1.12, 0);   // the seat
  for (const x of [-0.11, 0.11]) { bx(D, 0.15, 0.14, 0.42, 0x3a3020, x, 1.22, 0.2); bx(D, 0.14, 0.42, 0.14, 0x3a3020, x, 1.0, 0.4); bx(D, 0.16, 0.08, 0.22, 0x1a1410, x, 0.8, 0.45); }   // thighs, shins, boots
  bx(D, 0.42, 0.5, 0.26, coat, 0, 1.5, 0.0); bx(D, 0.44, 0.1, 0.28, 0x2a2018, 0, 1.3, 0.0);   // body and belt
  for (const x of [-0.25, 0.25]) { const a = bx(D, 0.11, 0.42, 0.12, coat, x, 1.52, 0.17); a.rotation.x = -1.0; bx(D, 0.1, 0.1, 0.1, skin, x * 0.8, 1.42, 0.38); }   // arms out to the reins
  bx(D, 0.22, 0.24, 0.22, skin, 0, 1.88, 0.0); bx(D, 0.26, 0.07, 0.3, hat, 0, 2.03, 0.03); bx(D, 0.24, 0.06, 0.12, hat, 0, 2.0, 0.17);   // head and flat cap
  for (const x of [-0.2, 0.2]) { const r = bx(D, 0.025, 0.025, 1.95, 0x2a1a10, x, 1.62, 1.35); r.rotation.x = -0.27; r.rotation.y = -x * 0.08; }   // reins up to the bridle
  g.userData.legs = legs; g.userData.driver = D; return g;
}

/** Panda car (blue-and-white, a light on top). */
export function makePoliceCar() {
  const g = new THREE.Group();
  bx(g, 1.7, 0.6, 3.8, 0xf2f2f2, 0, 0.65, 0); bx(g, 1.5, 0.55, 1.9, 0x2a5ab0, 0, 1.2, -0.2); bx(g, 1.72, 0.18, 3.82, 0x2a5ab0, 0, 0.75, 0);
  bx(g, 1.4, 0.38, 0.05, 0x9fd8f0, 0, 1.25, 0.78); bx(g, 0.5, 0.16, 0.3, 0x3a7aff, 0, 1.56, -0.2, { emissive: 0x2a5aff, emissiveIntensity: 1.2 });
  for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) bx(g, 0.25, 0.6, 0.6, 0x111111, x, 0.3, z);
  return g;
}

/** Trains: 'steam' (a little tank engine with green carriages), 'electric' and 'mono'. Facing +z, length ~7 m each. */
export function makeTrainCar(kind, lead) {
  const g = new THREE.Group();
  if (kind === 'steam' && lead) {
    bx(g, 1.9, 0.3, 6.4, 0x1a1a1a, 0, 0.35, 0); const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.6, 12), stdMat(0x1f4a2a)); boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.4, 1.1); g.add(boiler);
    bx(g, 0.35, 1.0, 0.35, 0x1a1a1a, 0, 2.3, 2.5); bx(g, 2.0, 1.9, 1.9, 0x1f4a2a, 0, 1.45, -1.9); bx(g, 2.1, 0.12, 2.1, 0x1a1a1a, 0, 2.45, -1.9); bx(g, 0.6, 0.25, 0.1, 0xd9b34a, 0, 1.3, 2.95);
    for (const z of [2.1, 0.8, -0.5]) for (const x of [-0.95, 0.95]) wheel(g, 0.48, 0.07, 0x8a2a1a, x, 0.48, z, 6);
  } else if (kind === 'mono') {
    bx(g, 2.2, 2.0, 6.6, 0xe8ecf0, 0, 0.2, 0); bx(g, 2.22, 0.6, 6.0, 0x2a7ab0, 0, 0.9, 0, { emissive: 0x6ab0e0, emissiveIntensity: 0.15 }); bx(g, 2.24, 0.22, 6.62, 0xd04030, 0, 0.0, 0);
    if (lead) bx(g, 1.8, 1.0, 0.6, 0x2a7ab0, 0, 0.7, 3.4);
  } else {
    const c = kind === 'electric' ? 0x2a4a8a : 0x5a2a20; bx(g, 2.0, 2.0, 6.4, c, 0, 1.2, 0); bx(g, 2.06, 0.5, 6.0, 0xe8e2c8, 0, 1.75, 0, { emissive: 0xffe0a0, emissiveIntensity: 0.12 }); bx(g, 2.1, 0.15, 6.5, 0x1a1a1a, 0, 2.25, 0);
    for (const z of [2.3, -2.3]) for (const x of [-0.9, 0.9]) wheel(g, 0.4, 0.06, 0x1a1a1a, x, 0.42, z, 0);
    if (lead && kind === 'electric') { bx(g, 1.6, 0.6, 0.1, 0x9fd8f0, 0, 2.0, 3.22); bx(g, 0.05, 0.9, 0.05, 0x333333, 0, 2.8, 0); }
  }
  return bake(g);
}
const carGlass = new THREE.MeshStandardMaterial({ color: 0x9fd8f0, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false });
/**
 * A passenger carriage you can see into and walk about in: floor, seats facing each other in pairs, windows all
 * down both sides, lamps in the ceiling. userData: floor (height of the floor), len, halfW, seats [{ x, z, face }].
 * kind: steam (the coaches behind a steam engine), electric, mono. With lead, steam gets its engine in front.
 */
export function makeCarriage(kind, lead) {
  if (kind === 'steam' && lead) { const g = makeTrainCar('steam', true); g.userData = { ...g.userData, floor: 0.65, len: 6.4, halfW: 0.95, seats: [], engine: true }; return g; }
  const g = new THREE.Group(), L = 6.4, W = 2.2, F = 0.65, mono = kind === 'mono';
  const body = mono ? 0xe8ecf0 : kind === 'electric' ? 0x2a4a8a : 0x5a2a20, trim = mono ? 0x2a7ab0 : 0xe8e2c8, seatC = mono ? 0x2a5a9a : 0x8a2a3a;
  bx(g, W, 0.3, L, mono ? 0xd04030 : 0x1a1a1a, 0, 0.5, 0);   // underframe; the floor is its top
  bx(g, W - 0.2, 0.02, L - 0.2, mono ? 0x9aa0a8 : 0x6a5040, 0, F + 0.01, 0);
  for (const sx of [-1, 1]) {
    bx(g, 0.08, 0.9, L, body, sx * (W / 2 - 0.04), F + 0.45, 0); bx(g, 0.1, 0.15, L, trim, sx * (W / 2 - 0.04), F + 1.72, 0);
    for (let k = 0; k <= 5; k++) bx(g, 0.08, 0.75, 0.2, body, sx * (W / 2 - 0.04), F + 1.27, -L / 2 + 0.1 + k * (L - 0.2) / 5);
    const gl = new THREE.Mesh(unit, carGlass); gl.scale.set(0.03, 0.75, L - 0.2); gl.position.set(sx * (W / 2 - 0.04), F + 1.27, 0); g.add(gl);
  }
  for (const sz of [-1, 1]) { bx(g, W, 0.9, 0.08, body, 0, F + 0.45, sz * (L / 2 - 0.04)); bx(g, 0.5, 0.8, 0.08, body, -(W / 2 - 0.25), F + 1.3, sz * (L / 2 - 0.04)); bx(g, 0.5, 0.8, 0.08, body, W / 2 - 0.25, F + 1.3, sz * (L / 2 - 0.04)); const gl = new THREE.Mesh(unit, carGlass); gl.scale.set(W - 1, 0.8, 0.03); gl.position.set(0, F + 1.3, sz * (L / 2 - 0.04)); g.add(gl); }
  bx(g, W + 0.1, 0.14, L + 0.05, mono ? 0xd8dce0 : 0x3a3a3a, 0, F + 1.87, 0);   // roof
  for (const z of [-1.6, 0, 1.6]) bx(g, 0.5, 0.04, 0.18, 0xfff0c0, 0, F + 1.78, z, { emissive: 0xffe0a0, emissiveIntensity: 0.6 });
  const seats = [];
  for (let k = 0; k < 4; k++) { const z = -L / 2 + 0.95 + k * 1.5, back = k % 2 ? 0.27 : -0.27; for (const sx of [-1, 1]) { const x = sx * 0.6; bx(g, 0.7, 0.12, 0.5, seatC, x, F + 0.42, z); bx(g, 0.7, 0.55, 0.1, seatC, x, F + 0.72, z + back); bx(g, 0.08, 0.36, 0.08, 0x333333, x, F + 0.18, z); seats.push({ x, z, face: k % 2 ? Math.PI : 0 }); } }
  if (mono && lead) bx(g, 1.8, 1.0, 0.6, 0x2a7ab0, 0, 1.2, L / 2 + 0.3);
  if (!mono) for (const z of [2.3, -2.3]) for (const x of [-0.9, 0.9]) wheel(g, 0.4, 0.06, 0x1a1a1a, x, 0.42, z, 0);
  if (kind === 'electric' && lead) bx(g, 0.05, 0.9, 0.05, 0x333333, 0, 3.0, 0);
  g.userData = { floor: F, len: L, halfW: W / 2 - 0.15, seats };
  return bake(g);
}
/** A sky-lift gondola hanging from its cable (cable at y = 0). */
export function makeGondola(color = 0xd04030) {
  // a cabin you can see into (and stand in): floor, low walls, glass all round, a roof, hung from a hanger arm
  const g = new THREE.Group(), F = -3.4, S = 1.9; bx(g, 0.08, 1.3, 0.08, 0x666d77, 0, -0.65, 0); bx(g, 0.6, 0.12, 0.6, 0x666d77, 0, -1.3, 0);
  bx(g, S, 0.12, S, 0x333333, 0, F - 0.06, 0); bx(g, S + 0.06, 0.14, S + 0.06, color, 0, -1.37, 0);
  for (const [x, z, w, d] of [[0, S / 2, S, 0.06], [0, -S / 2, S, 0.06], [S / 2, 0, 0.06, S], [-S / 2, 0, 0.06, S]]) { bx(g, w, 0.7, d, color, x, F + 0.35, z); const gl = new THREE.Mesh(unit, carGlass); gl.scale.set(Math.max(w, 0.03), 1.2, Math.max(d, 0.03)); gl.position.set(x, F + 1.3, z); g.add(gl); }
  for (const [x, z] of [[S / 2, S / 2], [-S / 2, S / 2], [S / 2, -S / 2], [-S / 2, -S / 2]]) bx(g, 0.08, 2.0, 0.08, color, x, F + 1.0, z);
  g.userData = { floor: F, len: S - 0.2, halfW: S / 2 - 0.15, seats: [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]].map(([x, z]) => ({ x, z, face: Math.atan2(-x, -z) })) };
  return bake(g);
}

/** Street lamps through the ages: 0 lantern on a post, 1 oil lamp on an iron bracket, 2 gas lamp, 3 sodium, 4 modern. */
export const LAMP_GLOW = [0xffa040, 0xffb050, 0xfff0c0, 0xff9a30, 0xf4f8ff];
export function makeStreetLamp(age, headMat) {
  const g = new THREE.Group();
  if (age === 0) { bx(g, 0.16, 2.6, 0.16, 0x5a3a20, 0, 1.3, 0); bx(g, 0.5, 0.08, 0.08, 0x5a3a20, 0.22, 2.55, 0); const h = new THREE.Mesh(unit, headMat); h.scale.set(0.24, 0.32, 0.24); h.position.set(0.42, 2.3, 0); g.add(h); }
  else if (age === 1) { bx(g, 0.12, 3.0, 0.12, 0x2a2a2a, 0, 1.5, 0); bx(g, 0.6, 0.06, 0.06, 0x2a2a2a, 0.28, 2.95, 0); const h = new THREE.Mesh(unit, headMat); h.scale.set(0.26, 0.36, 0.26); h.position.set(0.55, 2.7, 0); g.add(h); }
  else if (age === 2) { bx(g, 0.3, 0.5, 0.3, 0x1a1a1a, 0, 0.25, 0); bx(g, 0.14, 3.0, 0.14, 0x1a1a1a, 0, 1.75, 0); bx(g, 0.5, 0.06, 0.06, 0x1a1a1a, 0, 3.1, 0); const h = new THREE.Mesh(unit, headMat); h.scale.set(0.38, 0.48, 0.38); h.position.set(0, 3.5, 0); g.add(h); bx(g, 0.5, 0.1, 0.5, 0x1a1a1a, 0, 3.78, 0); }
  else if (age === 3) { bx(g, 0.2, 5.6, 0.2, 0x9a9890, 0, 2.8, 0); bx(g, 1.0, 0.14, 0.14, 0x9a9890, 0.45, 5.55, 0); const h = new THREE.Mesh(unit, headMat); h.scale.set(0.6, 0.16, 0.3); h.position.set(0.95, 5.45, 0); g.add(h); }
  else { bx(g, 0.16, 6.8, 0.16, 0x6a6e76, 0, 3.4, 0); bx(g, 1.3, 0.1, 0.1, 0x6a6e76, 0.6, 6.75, 0); const h = new THREE.Mesh(unit, headMat); h.scale.set(0.7, 0.1, 0.32); h.position.set(1.2, 6.68, 0); g.add(h); }
  return g;
}
