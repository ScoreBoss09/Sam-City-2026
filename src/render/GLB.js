import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';

// Furniture from model files (assets/models: Kenney's CC0 furniture kit plus our own Blender models). A furniture type is
// one or more parts: [file, x, z, width, quarterTurns, y] — each model is centred, stood on the floor and scaled so its
// width is `width` metres; y = 'top' sits it on the part before (a telly on its cabinet). Types without models (or
// before the files have loaded) fall back to the old block models.
const K = 'kenney/';
export const PARTS = {
  sofa: [[K + 'loungeSofa', 0, 0, 2.2]], armchair: [[K + 'loungeChair', 0, 0, 0.9]], coffeetable: [[K + 'tableCoffee', 0, 0, 1.0]],
  tvunit: [[K + 'cabinetTelevision', 0, 0, 1.2], [K + 'televisionVintage', 0, -0.05, 0.7, 0, 'top']], lamp: [[K + 'lampRoundFloor', 0, 0, 0.45]], plant: [[K + 'pottedPlant', 0, 0, 0.5]],
  rug: [[K + 'rugRectangle', 0, 0, 2.2]], table: [[K + 'table', 0, 0, 1.4]], chair: [[K + 'chair', 0, 0, 0.5]],
  kitchen: [[K + 'kitchenCabinet', -0.975, 0, 0.65], [K + 'kitchenSink', -0.325, 0, 0.65], [K + 'kitchenStove', 0.325, 0, 0.65], [K + 'kitchenCabinet', 0.975, 0, 0.65], [K + 'kitchenCabinetUpper', -0.65, -0.12, 0.65, 0, 1.45], [K + 'kitchenCabinetUpper', 0.975, -0.12, 0.65, 0, 1.45]],
  fridgefreezer: [[K + 'kitchenFridgeLarge', 0, 0, 0.6]], washer: [[K + 'washer', 0, 0, 0.75]],
  dbed: [[K + 'bedDouble', 0, 0, 1.6]], bed: [[K + 'bedSingle', 0, 0, 1.05]], bunk: [[K + 'bedBunk', 0, 0, 1.0]], wardrobe: [[K + 'bookcaseClosedDoors', 0, 0, 1.2]],
  dresser: [[K + 'sideTableDrawers', 0, 0, 1.0], [K + 'bathroomMirror', 0, -0.15, 0.6, 0, 'top']], bedside: [[K + 'cabinetBedDrawerTable', 0, 0, 0.45], [K + 'lampRoundTable', 0, 0, 0.22, 0, 'top']],
  bath: [[K + 'bathtub', 0, 0, 1.7]], toilet: [[K + 'toilet', 0, 0, 0.45]], basin: [[K + 'bathroomSink', 0, 0, 0.6], [K + 'bathroomMirror', 0, -0.17, 0.5, 0, 1.15]],
  radio: [[K + 'radio', 0, 0, 0.5]], pegs: [[K + 'coatRackStanding', 0, 0, 0.6]], shelfbooks: [[K + 'bookcaseOpen', 0, 0, 2.0]],
  kitchenlow: [[K + 'kitchenCabinet', -0.975, 0, 0.65], [K + 'kitchenSink', -0.325, 0, 0.65], [K + 'kitchenStove', 0.325, 0, 0.65], [K + 'kitchenCabinet', 0.975, 0, 0.65]],
  homepc: [[K + 'desk', 0, 0, 1.2], [K + 'computerScreen', -0.1, -0.05, 0.45, 0, 'top'], [K + 'computerKeyboard', -0.1, 0.18, 0.4, 0, 'top0']],
};
/** Whole-building shells modelled in Blender (tools/blender/*.py): nodes 'shell' (walls, windows, trim), 'glass', 'roof'. */
export const SHELLS = { terrace: 'buildings/terrace' };
const cache = {}; let ready = false;
export const modelsReady = () => ready;
export function preloadModels() {
  const files = [...new Set(Object.values(PARTS).flat().map((p) => p[0]).concat(Object.values(SHELLS)))], loader = new GLTFLoader();
  return Promise.all(files.map((f) => loader.loadAsync('assets/models/' + f + '.glb').then((g) => { cache[f] = normalise(g.scene); cache[f].raw = g.scene.clone(true); }).catch(() => {}))).then(() => { ready = true; });
}
function normalise(obj) {
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), g = new THREE.Group();
  obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z)); g.add(obj); obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return { group: g, size };
}
/** A building shell's parts { shell, glass, roof } as placed in the model (not re-centred), or null if not loaded. */
export function shellModel(name) {
  const c = ready && cache[SHELLS[name]]; if (!c) return null; const r = c.raw.clone(true), out = {};
  r.updateMatrixWorld(true); for (const k of ['shell', 'glass', 'roof']) { const n = r.getObjectByName(k); if (n) { const grp = new THREE.Group(); n.traverse((o) => { if (o.isMesh) { const m = o.clone(); m.geometry = o.geometry.clone().applyMatrix4(o.matrixWorld); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.castShadow = k !== 'glass'; m.receiveShadow = true; grp.add(m); } }); out[k] = grp; } }
  return out.shell ? out : null;
}
/** A furniture group built from models, or null (no models for this type, or not loaded yet). */
export function modelFurniture(type) {
  const P = PARTS[type]; if (!P || !ready) return null; const g = new THREE.Group(); let top = 0, top0 = 0;
  for (const [f, x, z, w, r = 0, y = 0] of P) {
    const c = cache[f]; if (!c) return null; const o = c.group.clone(true), s = w / c.size.x; o.scale.setScalar(s); o.rotation.y = r * Math.PI / 2;
    const yy = y === 'top' ? top : y === 'top0' ? top0 : y; o.position.set(x, yy, z); g.add(o); if (y !== 'top' && y !== 'top0') top0 = yy + c.size.y * s; top = yy + c.size.y * s;
  }
  return g;
}
