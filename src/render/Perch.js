import * as THREE from 'three';
import { UNIT } from '../config.js';

/**
 * Somewhere for a bird to stand: the real top of a building at a point (a ray dropped onto its roof and walls), so a
 * gull on the stockyard or a pigeon on a gable stands on the slates, not in the air above them.
 */
const RC = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0), O = new THREE.Vector3();
export function surfaceY(b, x, z) {
  if (!b || !b.ext) return null; O.set(x, 90, z); RC.set(O, DOWN); RC.far = 120;
  const objs = [b.ext.roof, b.ext.group].filter(Boolean); for (const o of objs) o.updateMatrixWorld(true);
  for (const h of RC.intersectObjects(objs, true)) { const m = h.object; if (m.isSprite || m.isPoints || m.isLine || (m.material && (m.material.transparent || m.material.opacity < 1))) continue; return h.point.y; }
  return null;
}
/** A random standing place on top of a building (null if there's nothing high enough to stand on there). */
export function perchOn(b, tries = 5) {
  if (!b || !b.ext || b.state !== 'done' || b.def.park) return null; const W = b.def.w * UNIT, D = b.def.d * UNIT;
  for (let k = 0; k < tries; k++) {
    const lx = (Math.random() - 0.5) * W * (k < 2 ? 0.25 : 0.8), lz = (Math.random() - 0.5) * D * (k < 2 ? 0.25 : 0.8), [x, z] = b.toWorld(lx, lz), y = surfaceY(b, x, z);   // (the first tries near the middle: the ridge)
    if (y !== null && y > 1.6) return { x, y, z, b };
  }
  return null;
}
/** The building nearest a point that has a top to stand on. */
export function nearestPerch(buildings, x, z, maxD = 60) {
  const near = buildings.filter((b) => b.state === 'done' && b.ext && !b.def.park && Math.hypot(b.cx - x, b.cz - z) < maxD).sort((a, b) => Math.hypot(a.cx - x, a.cz - z) - Math.hypot(b.cx - x, b.cz - z));
  for (const b of near.slice(0, 6)) { const p = perchOn(b); if (p) return p; }
  return null;
}
