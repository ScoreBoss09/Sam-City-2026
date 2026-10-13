import * as THREE from 'three';
import { stdMat } from './BuildingFactory.js';

// Blocky models: the game's own art style as data, so mods can add furniture, whole buildings and hats without any
// 3D software. A model is a list of boxes: [width, height, depth, colour, x, y, z] (y is the bottom of the box, metres,
// colour "#rrggbb" or a number), optionally with { "glow": true } as an 8th item for lit-up parts. See docs/MODDING.md.
export const MODELS = {};
const col = (v) => (typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : v);
const unit = new THREE.BoxGeometry(1, 1, 1);
export function addModel(name, m) { MODELS[name] = (m.boxes || m).map((b) => [b[0], b[1], b[2], col(b[3]), b[4] || 0, b[5] || 0, b[6] || 0, b[7] || null]); }
/** A Group built from a model's boxes (null if there's no such model). */
export function buildModel(name) {
  const B = MODELS[name]; if (!B) return null; const g = new THREE.Group();
  for (const [w, h, d, c, x, y, z, o] of B) { const m = new THREE.Mesh(unit, stdMat(c, o && o.glow ? { emissive: c, emissiveIntensity: 0.8 } : undefined)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  return g;
}
/** The boxes of a model, for code that merges them into something else (hats on heads). */
export function modelBoxes(name) { return MODELS[name] || []; }
