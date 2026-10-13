import * as THREE from 'three';

// Shared building blocks for furniture modules (src/render/furniture/*.js). A module exports SIZES ({ name: { s: [x, z],
// solid } }) and MAKERS ({ name: (g) => { ...build into group g... } }); Furniture.js merges them in. Pieces are built
// facing +z (their front), standing on y = 0, in metres.
export const unit = new THREE.BoxGeometry(1, 1, 1);
const cache = {};
export function mat(c, o = {}) { const k = c + JSON.stringify(o); return cache[k] || (cache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o })); }
/** A box of size w x h x d whose BOTTOM sits at y (x, z its centre). Returns the mesh. */
export function box(g, w, h, d, c, x, y, z, o) { const m = new THREE.Mesh(unit, mat(c, o)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); g.add(m); return m; }
export function cyl(g, rt, rb, h, c, x, y, z, o, seg = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c, o)); m.position.set(x, y + h / 2, z); g.add(m); return m; }
export const GLOW = (c, k = 1) => ({ emissive: c, emissiveIntensity: k });
export { THREE };
