#!/usr/bin/env node
/**
 * Makes a deliberately heavy test model (a bicycle, about 26,000 triangles, eight separate materials: the kind of thing
 * a detailed Blender export gives you) to try the asset check on:
 *     node tools/assets/make-sample.mjs [out.glb]
 */
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';

const out = path.resolve(process.argv[2] || 'heavy_bike.glb');
const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene('bike'), root = doc.createNode('bike'); scene.addChild(root);
const mats = {};
const mat = (name, rgb, metal = 0, rough = 0.6) => (mats[name] ||= doc.createMaterial(name).setBaseColorFactor([...rgb, 1]).setMetallicFactor(metal).setRoughnessFactor(rough));
/** A mesh from raw arrays, hung off `parent`. */
function add(parent, name, P, N, I, material) {
  const prim = doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(I)).setBuffer(buf));
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)); parent.addChild(node); return node;
}
/** A torus round the x axis (a tyre or a rim) at the origin. */
function torus(R, r, seg, side) {
  const P = [], N = [], I = [];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; for (let j = 0; j <= side; j++) { const b = (j / side) * Math.PI * 2, cy = Math.cos(a), cz = Math.sin(a), nx = Math.sin(b), nr = Math.cos(b); P.push(r * nx, (R + r * nr) * cy, (R + r * nr) * cz); N.push(nx, nr * cy, nr * cz); } }
  for (let i = 0; i < seg; i++) for (let j = 0; j < side; j++) { const a = i * (side + 1) + j, b = a + side + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
  return [P, N, I];
}
/** A tube from p to q. */
function tube(p, q, r, seg, rings = 1) {
  const P = [], N = [], I = [], d = q.map((v, i) => v - p[i]), L = Math.hypot(...d), u = d.map((v) => v / L), a = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cr = (x, y) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]], nz = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); }, s = nz(cr(u, a)), t = cr(u, s);
  for (let k = 0; k <= rings; k++) for (let j = 0; j <= seg; j++) { const g = (j / seg) * Math.PI * 2, n = s.map((c, i) => c * Math.cos(g) + t[i] * Math.sin(g)); P.push(...p.map((c, i) => c + d[i] * (k / rings) + n[i] * r)); N.push(...n); }
  for (let k = 0; k < rings; k++) for (let j = 0; j < seg; j++) { const a0 = k * (seg + 1) + j, b0 = a0 + seg + 1; I.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1); }
  return [P, N, I];
}
const black = mat('tyre', [0.04, 0.04, 0.045], 0, 0.9), rim = mat('rim', [0.75, 0.76, 0.78], 1, 0.3), spoke = mat('spokes', [0.82, 0.82, 0.84], 1, 0.25), frame = mat('frame_paint', [0.75, 0.1, 0.08], 0.2, 0.35);
const seat = mat('saddle', [0.25, 0.14, 0.08], 0, 0.7), grip = mat('grips', [0.08, 0.08, 0.08], 0, 0.95), chain = mat('chain', [0.35, 0.35, 0.37], 1, 0.4), pedal = mat('pedals', [0.15, 0.15, 0.16], 0.5, 0.5);
const R = 0.34, wheelZ = [-0.52, 0.52];
for (const [k, z] of wheelZ.entries()) {
  const w = doc.createNode(k ? 'wheel_front' : 'wheel_rear').setTranslation([0, R + 0.03, z]); root.addChild(w);
  add(w, 'tyre', ...torus(R, 0.032, 64, 24), black); add(w, 'rim', ...torus(R - 0.035, 0.012, 72, 10), rim);
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; add(w, 'spoke' + i, ...tube([0, 0, 0], [0, Math.cos(a) * (R - 0.04), Math.sin(a) * (R - 0.04)], 0.0025, 6, 3), spoke); }
  add(w, 'hub', ...tube([-0.05, 0, 0], [0.05, 0, 0], 0.03, 32, 6), rim);
}
const H = (y, z) => [0, y, z];
for (const [a, b] of [[H(0.37, -0.52), H(0.72, -0.18)], [H(0.37, -0.52), H(0.38, -0.05)], [H(0.38, -0.05), H(0.72, -0.18)], [H(0.38, -0.05), H(0.82, 0.38)], [H(0.72, -0.18), H(0.82, 0.38)], [H(0.82, 0.38), H(0.37, 0.52)]]) add(root, 'frame', ...tube(a, b, 0.018, 40, 12), frame);
add(root, 'seatpost', ...tube(H(0.72, -0.18), H(0.9, -0.24), 0.013, 32, 10), rim); add(root, 'saddle', ...torus(0.06, 0.035, 48, 24).map((a, i) => (i === 0 ? a.map((v, j) => (j % 3 === 1 ? v * 0.3 + 0.93 : j % 3 === 2 ? v * 1.4 - 0.25 : v)) : a)), seat);
add(root, 'bars', ...tube([-0.27, 1.0, 0.36], [0.27, 1.0, 0.36], 0.012, 32, 16), rim); add(root, 'stem', ...tube(H(0.82, 0.38), H(1.0, 0.36), 0.014, 32, 10), rim);
for (const x of [-0.24, 0.24]) add(root, 'grip', ...tube([x - 0.05, 1.0, 0.36], [x + 0.05, 1.0, 0.36], 0.018, 24, 12), grip);
add(root, 'chainring', ...torus(0.1, 0.008, 96, 8), chain).setTranslation([0.03, 0.38, -0.05]); for (const z of [-0.52]) add(root, 'chainline', ...tube([0.03, 0.38, -0.05], [0.03, 0.37, z], 0.005, 12, 40), chain);
for (const s of [-1, 1]) add(root, 'pedal', ...tube([0.08 * s, 0.38 - 0.16 * s, -0.05], [0.16 * s, 0.38 - 0.16 * s, -0.05], 0.02, 24, 4), pedal);
await new NodeIO().write(out, doc);
let tris = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
console.log(`wrote ${out}: ${tris.toLocaleString('en-GB')} triangles, ${doc.getRoot().listMaterials().length} materials, ${doc.getRoot().listMeshes().length} parts`);
