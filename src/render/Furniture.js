import * as THREE from 'three';
import { Assets } from './Assets.js';

const unit = new THREE.BoxGeometry(1, 1, 1);
const cache = {};
// colours that stand in for wood / upholstery get the pack's greyscale textures, tinted by the colour
const TEXOF = { 0x8a5a33: 'fab_wood', 0x6e4528: 'fab_wood', 0x3a5f8f: 'fab_padded', 0x2d4a73: 'fab_padded', 0x3f6fae: 'fab_plaid', 0xd9d4c4: 'fab_plain' };
function mat(c, o = {}) {
  const tk = o.tk || TEXOF[c], { tk: _t, ...rest } = o, k = c + JSON.stringify(rest) + (tk || ''); if (cache[k]) return cache[k];
  return (cache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...rest, map: tk && Assets.has(tk) ? Assets.tex(tk) : null }));
}
function box(g, w, h, d, c, x, y, z, o) { const m = new THREE.Mesh(unit, mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); g.add(m); return m; }
const WOOD = 0x8a5a33, DARK = 0x3a3d44, WHITE = 0xe9ebee, FAB = 0x3a5f8f, SCREEN = { emissive: 0x66ccff, emissiveIntensity: 1.1 };

/** Footprint (x,z) and whether the player collides with it. */
export const FURN = {
  bed: { s: [1.3, 2.2], solid: true }, sofa: { s: [2.2, 0.95], solid: true }, table: { s: [1.4, 1.4], solid: true },
  chair: { s: [0.5, 0.5], solid: false }, counter: { s: [2.6, 0.8], solid: true }, desk: { s: [1.8, 0.9], solid: true },
  terminal: { s: [1.8, 0.9], solid: true }, shelf: { s: [2.1, 0.55], solid: true }, crate: { s: [0.9, 0.9], solid: true },
  machine: { s: [2.2, 1.5], solid: true }, hbed: { s: [1.1, 2.0], solid: true }, plant: { s: [0.6, 0.6], solid: false },
  reception: { s: [2.8, 0.9], solid: true }, locker: { s: [0.9, 1.0], solid: true }, bench: { s: [2.0, 0.6], solid: false },
  generator: { s: [2.2, 1.6], solid: true }, drafting: { s: [1.8, 1.0], solid: true }, tv: { s: [1.2, 0.5], solid: true }, strawbed: { s: [1.1, 2.0], solid: true }, stool: { s: [0.45, 0.45], solid: false }, chest: { s: [1.0, 0.6], solid: true }, barrel: { s: [0.7, 0.7], solid: true }, firepit: { s: [1.2, 1.2], solid: true }, stove: { s: [1.2, 0.8], solid: true }, bar: { s: [4.0, 0.9], solid: true }, anvil: { s: [0.8, 0.5], solid: true }, workbench: { s: [2.2, 0.9], solid: true }, rack: { s: [1.8, 0.4], solid: true }, board: { s: [3.0, 0.2], solid: false }, hearth: { s: [1.8, 0.8], solid: true },
};

const MAKE = {
  bed: (g) => { box(g, 1.3, 0.35, 2.2, WOOD, 0, 0, 0); box(g, 1.2, 0.2, 1.9, 0xd9d4c4, 0, 0.35, 0.1); box(g, 1.2, 0.08, 1.0, 0x3f6fae, 0, 0.55, 0.5); box(g, 0.9, 0.12, 0.4, 0xffffff, 0, 0.55, -0.75); },
  hbed: (g) => { box(g, 1.1, 0.5, 2.0, 0xcfd5dc, 0, 0.1, 0); box(g, 1.0, 0.15, 1.8, 0xffffff, 0, 0.6, 0); box(g, 0.8, 0.1, 0.4, 0xffffff, 0, 0.75, -0.7); },
  sofa: (g) => { box(g, 2.2, 0.45, 0.95, FAB, 0, 0, 0); box(g, 2.2, 0.55, 0.25, FAB, 0, 0.45, -0.35); box(g, 0.25, 0.3, 0.9, 0x2d4a73, -1.0, 0.45, 0); box(g, 0.25, 0.3, 0.9, 0x2d4a73, 1.0, 0.45, 0); },
  table: (g) => { box(g, 1.4, 0.1, 1.4, WOOD, 0, 0.75, 0); for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) box(g, 0.1, 0.75, 0.1, 0x6e4528, x, 0, z); },
  chair: (g) => { box(g, 0.45, 0.08, 0.45, DARK, 0, 0.45, 0); box(g, 0.45, 0.5, 0.08, DARK, 0, 0.5, -0.2); box(g, 0.08, 0.45, 0.08, 0x222, 0, 0, 0); },
  counter: (g) => { box(g, 2.6, 0.95, 0.8, 0xb9ad94, 0, 0, 0); box(g, 2.7, 0.08, 0.9, 0x4a4036, 0, 0.95, 0); },
  desk: (g) => { box(g, 1.8, 0.08, 0.9, WOOD, 0, 0.75, 0); box(g, 0.1, 0.75, 0.8, 0x6e4528, -0.8, 0, 0); box(g, 0.1, 0.75, 0.8, 0x6e4528, 0.8, 0, 0); box(g, 0.45, 0.04, 0.3, 0xffffff, -0.4, 0.83, 0.1); },
  terminal: (g) => {
    box(g, 1.8, 0.08, 0.9, 0xcfd3d8, 0, 0.75, 0); box(g, 0.1, 0.75, 0.8, 0x888d94, -0.8, 0, 0); box(g, 0.1, 0.75, 0.8, 0x888d94, 0.8, 0, 0);
    box(g, 0.8, 0.5, 0.06, 0x1d2025, 0, 0.9, -0.2); box(g, 0.7, 0.4, 0.02, 0x66ccff, 0, 0.95, -0.16, SCREEN); box(g, 0.15, 0.2, 0.1, 0x1d2025, 0, 0.83, -0.2); box(g, 0.5, 0.03, 0.2, 0x202226, 0, 0.83, 0.15);
  },
  drafting: (g) => { box(g, 1.8, 0.08, 1.0, 0xcdb98a, 0, 0.8, 0); box(g, 1.6, 0.02, 0.8, 0x6fa0d8, 0, 0.89, 0); box(g, 0.1, 0.8, 0.9, 0x6e4528, -0.8, 0, 0); box(g, 0.1, 0.8, 0.9, 0x6e4528, 0.8, 0, 0); },
  shelf: (g) => { box(g, 2.1, 2.0, 0.55, 0x6b5a45, 0, 0, 0); for (let i = 0; i < 4; i++) { box(g, 2.0, 0.3, 0.4, [0xb5834a, 0xa8442f, 0x7b8794, 0xe0c060][i % 4], 0, 0.15 + i * 0.5, 0.05); } },
  crate: (g) => { box(g, 0.9, 0.9, 0.9, 0xb5834a, 0, 0, 0); box(g, 0.95, 0.08, 0.95, 0x8a6236, 0, 0.4, 0); },
  machine: (g) => { box(g, 2.2, 1.2, 1.5, 0x59616d, 0, 0, 0); box(g, 1.6, 0.8, 1.2, 0x8a95a3, 0, 1.2, 0); box(g, 0.3, 0.3, 0.3, 0xd9532b, 0.8, 2.0, 0.3, { emissive: 0xd9532b, emissiveIntensity: 0.6 }); },
  generator: (g) => { box(g, 2.2, 1.6, 1.6, 0x4a5560, 0, 0, 0); box(g, 1.8, 0.4, 1.2, 0xd9732b, 0, 1.6, 0); box(g, 0.25, 1.0, 0.25, 0x333, 0.8, 2.0, 0.4); },
  plant: (g) => { box(g, 0.45, 0.4, 0.45, 0x8a5a33, 0, 0, 0); const m = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 5), mat(0x2f7a3a)); m.position.y = 0.95; g.add(m); },
  reception: (g) => { box(g, 2.8, 1.05, 0.9, 0xc4b79d, 0, 0, 0); box(g, 2.9, 0.07, 1.0, 0x3b3f46, 0, 1.05, 0); box(g, 0.5, 0.35, 0.05, 0x1d2025, 0.6, 1.12, -0.1); },
  locker: (g) => { box(g, 0.9, 1.9, 0.6, 0x5a7aa8, 0, 0, 0); box(g, 0.04, 1.4, 0.02, 0x222, 0, 0.3, 0.31); },
  tv: (g) => { box(g, 1.2, 0.5, 0.5, 0x5a4636, 0, 0, 0); box(g, 1.0, 0.65, 0.07, 0x15181d, 0, 0.55, -0.05); box(g, 0.9, 0.55, 0.02, 0x7ac4ff, 0, 0.6, -0.01, { emissive: 0x4a9ad8, emissiveIntensity: 0.9 }); },
  strawbed: (g) => { box(g, 1.1, 0.14, 2.0, 0x6e5230, 0, 0, 0); box(g, 1.0, 0.18, 1.9, 0xd6b85a, 0, 0.14, 0); box(g, 1.0, 0.06, 1.0, 0x8a5a4a, 0, 0.3, 0.45); box(g, 0.8, 0.1, 0.35, 0xe8dcc0, 0, 0.3, -0.7); },
  stool: (g) => { box(g, 0.4, 0.06, 0.4, 0x8a5a33, 0, 0.42, 0); for (const [x, z] of [[-.14, -.14], [.14, -.14], [-.14, .14], [.14, .14]]) box(g, 0.05, 0.42, 0.05, 0x6e4528, x, 0, z); },
  chest: (g) => { box(g, 1.0, 0.5, 0.6, 0x6e4a2a, 0, 0, 0); box(g, 1.02, 0.14, 0.62, 0x5a3a20, 0, 0.5, 0); box(g, 0.1, 0.12, 0.04, 0xd9b34a, 0, 0.32, 0.31); },
  barrel: (g) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.85, 10), mat(0x8a5a33)); m.position.y = 0.43; g.add(m); for (const y of [0.2, 0.65]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.05, 10), mat(0x333333)); r.position.y = y; g.add(r); } },
  firepit: (g) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(g, 0.28, 0.2, 0.28, 0x8a8880, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); } box(g, 0.5, 0.1, 0.5, 0x2a2420, 0, 0.02, 0); box(g, 0.3, 0.3, 0.3, 0xff8a2a, 0, 0.1, 0, { emissive: 0xff6a1a, emissiveIntensity: 1.4 }); box(g, 0.12, 0.3, 0.12, 0xffd24a, 0, 0.35, 0, { emissive: 0xffc040, emissiveIntensity: 1.6 }); },
  stove: (g) => { box(g, 1.2, 1.0, 0.8, 0x4a4a4e, 0, 0, 0); box(g, 0.3, 1.6, 0.3, 0x333338, 0.4, 1.0, -0.2); box(g, 0.5, 0.35, 0.05, 0xff8a2a, 0, 0.25, 0.41, { emissive: 0xff6a1a, emissiveIntensity: 1.2 }); },
  hearth: (g) => { box(g, 1.8, 1.3, 0.8, 0x8a867c, 0, 0, 0); box(g, 1.0, 0.7, 0.1, 0x1a1512, 0, 0.1, 0.36); box(g, 0.7, 0.3, 0.05, 0xff8a2a, 0, 0.15, 0.4, { emissive: 0xff6a1a, emissiveIntensity: 1.3 }); box(g, 1.9, 0.1, 0.9, 0x6a665e, 0, 1.3, 0); },
  bar: (g) => { box(g, 4.0, 1.0, 0.8, 0x6e4a2a, 0, 0, 0); box(g, 4.1, 0.08, 0.95, 0x3a2616, 0, 1.0, 0); for (const x of [-1.2, 0, 1.2]) box(g, 0.3, 0.2, 0.3, 0xc9a85a, x, 1.08, 0.1); },
  anvil: (g) => { box(g, 0.5, 0.5, 0.35, 0x4a4a50, 0, 0, 0); box(g, 0.8, 0.14, 0.3, 0x5a5a62, 0, 0.5, 0); },
  workbench: (g) => { box(g, 2.2, 0.1, 0.9, 0x9a7a4a, 0, 0.8, 0); for (const x of [-1, 1]) box(g, 0.12, 0.8, 0.8, 0x6e4a2a, x, 0, 0); box(g, 0.5, 0.12, 0.1, 0xaeb4bc, -0.5, 0.9, 0.1); box(g, 0.3, 0.3, 0.3, 0xb5834a, 0.6, 0.9, 0); },
  rack: (g) => { box(g, 1.8, 1.6, 0.12, 0x6e4a2a, 0, 0.3, -0.1); box(g, 0.05, 0.9, 0.05, 0x8a5a33, -0.5, 0.7, 0.0); box(g, 0.22, 0.12, 0.08, 0x8a929a, -0.5, 1.5, 0.0); box(g, 0.05, 0.9, 0.05, 0x8a5a33, 0.2, 0.7, 0.0); box(g, 0.2, 0.2, 0.06, 0x707880, 0.2, 1.5, 0.0); },
  board: (g) => { box(g, 3.0, 1.3, 0.1, 0x1f3a2a, 0, 1.0, 0); box(g, 3.2, 0.1, 0.14, 0x6e4a2a, 0, 0.95, 0); box(g, 0.6, 0.04, 0.02, 0xffffff, -0.8, 1.7, 0.06); },
  bench: (g) => { box(g, 2.0, 0.08, 0.5, WOOD, 0, 0.45, 0); box(g, 0.08, 0.45, 0.4, 0x333, -0.9, 0, 0); box(g, 0.08, 0.45, 0.4, 0x333, 0.9, 0, 0); box(g, 2.0, 0.45, 0.08, WOOD, 0, 0.5, -0.22); },
};

export function makeFurniture(type) { const g = new THREE.Group(); (MAKE[type] || MAKE.crate)(g); return g; }
