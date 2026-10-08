import * as THREE from 'three';
const unit = new THREE.BoxGeometry(1, 1, 1);
const mats = {};
const M = (c) => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));

/** Low-poly 1.8m person. Origin at the feet, facing +z. */
export function makeSimModel({ shirt = 0x3f8f5a, pants = 0x333a48, skin = 0xe0b48f, hair = 0x3b2a1a, hat = null } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const part = (w, h, d, c, x, y, z, parent = body) => { const m = new THREE.Mesh(unit, M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = false; parent.add(m); return m; };
  const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-0.13, 0.85, 0); legR.position.set(0.13, 0.85, 0); body.add(legL, legR);
  part(0.2, 0.85, 0.22, pants, 0, -0.425, 0, legL); part(0.2, 0.85, 0.22, pants, 0, -0.425, 0, legR);
  part(0.2, 0.08, 0.28, 0x222222, 0, -0.82, 0.03, legL); part(0.2, 0.08, 0.28, 0x222222, 0, -0.82, 0.03, legR);
  part(0.5, 0.6, 0.28, shirt, 0, 1.15, 0);
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-0.36, 1.4, 0); armR.position.set(0.36, 1.4, 0); body.add(armL, armR);
  part(0.14, 0.55, 0.16, shirt, 0, -0.27, 0, armL); part(0.14, 0.55, 0.16, shirt, 0, -0.27, 0, armR);
  part(0.12, 0.12, 0.14, skin, 0, -0.58, 0, armL); part(0.12, 0.12, 0.14, skin, 0, -0.58, 0, armR);
  part(0.34, 0.34, 0.32, skin, 0, 1.65, 0); part(0.36, 0.14, 0.34, hair, 0, 1.84, -0.01); part(0.36, 0.28, 0.1, hair, 0, 1.7, -0.14);
  if (hat) part(0.42, 0.1, 0.42, hat, 0, 1.96, 0);
  root.userData = { body, legL, legR, armL, armR };
  return root;
}
export function animateWalk(m, phase, amount) {
  const u = m.userData, s = Math.sin(phase) * 0.8 * amount;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
}
