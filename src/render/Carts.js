import * as THREE from 'three';

// Shared bits so a dozen carts cost almost nothing.
const unit = new THREE.BoxGeometry(1, 1, 1), wheelG = new THREE.CylinderGeometry(1, 1, 1, 10); wheelG.rotateZ(Math.PI / 2);
const M = { wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 }), dark: new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 }), iron: new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.6, metalness: 0.4 }) };
const LOAD = { timber: 0xb5834a, stone: 0x9a9a92, brick: 0xa8442f, steel: 0x7b8794, glass: 0x7ec8e3, food: 0x7aa63a };
const loadMats = {}; const loadMat = (m) => loadMats[m] || (loadMats[m] = new THREE.MeshStandardMaterial({ color: LOAD[m] || 0x9a8a6a, roughness: 0.85 }));
const box = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(unit, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };

/**
 * A hand cart (level 1: two wheels, handles) or a four-wheeled wagon (level 2). Built facing +z (handles towards +z),
 * so a person pulling it holds the handles in front of the cart.
 */
export function makeCart(level = 1) {
  const g = new THREE.Group(), big = level >= 2, W = big ? 1.15 : 0.9, L = big ? 1.6 : 1.1, y = big ? 0.62 : 0.5;
  box(g, W, 0.08, L, M.wood, 0, y, 0);
  box(g, 0.06, 0.3, L, M.dark, -W / 2, y + 0.15, 0); box(g, 0.06, 0.3, L, M.dark, W / 2, y + 0.15, 0); box(g, W, 0.3, 0.06, M.dark, 0, y + 0.15, -L / 2); box(g, W, 0.3, 0.06, M.dark, 0, y + 0.15, L / 2);
  for (const sx of [-1, 1]) box(g, 0.05, 0.05, 0.9, M.dark, sx * (W / 2 - 0.12), y + 0.2, L / 2 + 0.42);   // handles
  const wheels = [], r = big ? 0.32 : 0.4, zs = big ? [-L / 2 + 0.3, L / 2 - 0.3] : [-0.1];
  for (const z of zs) for (const sx of [-1, 1]) { const w = new THREE.Mesh(wheelG, M.iron); w.scale.set(0.08, r, r); w.position.set(sx * (W / 2 + 0.06), r, z); g.add(w); wheels.push(w); }
  const load = box(g, W - 0.16, 0.3, L - 0.16, loadMat('timber'), 0, y + 0.2, 0); load.visible = false;
  g.userData = { wheels, load, r, level };
  return g;
}
/** Show what's in the cart (or nothing) and turn the wheels by distance travelled. */
export function updateCart(cart, mat, qty, dist) {
  const u = cart.userData; if (mat) { u.load.material = loadMat(mat); u.load.visible = true; u.load.scale.y = Math.min(0.42, 0.08 + qty * 0.03); u.load.position.y = (u.level >= 2 ? 0.62 : 0.5) + 0.04 + u.load.scale.y / 2; } else u.load.visible = false;
  if (dist) for (const w of u.wheels) w.rotation.x += dist / u.r;
}
