import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.module.js';

/**
 * Models that have been through the asset check (tools/assets/check.mjs writes assets/models/lib/ and its manifest).
 *
 *   game.models.has('bikes/bmx')                    is there one by that name (category/file name)?
 *   const bike = game.models.spawn('bikes/bmx')     a copy to put in the world (null while it's loading: it loads in the
 *                                                   background, so ask again next time, or await game.models.load(name))
 *   game.models.turn(bike, 'wheel_front', angle)    spin a part kept separate by the check (wheels, doors, move_...)
 *
 * Each copy is a THREE.LOD: the full version close up, the cheaper ones further away (distances from the manifest),
 * nothing at all beyond the category's 'far' distance. Every copy shares its geometry and materials with the others,
 * so a hundred bikes cost a hundred positions, not a hundred models.
 */
const BASE = 'assets/models/lib/';

export class ModelLib {
  constructor(game) {
    this.game = game; this.list = {}; this.cache = new Map(); this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.ready = this.init();
  }
  async init() { try { const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' }); if (r.ok) this.list = (await r.json()).assets || {}; } catch (e) { /* no checked models yet */ } return this; }
  has(name) { return !!this.list[name]; }
  /** Names of the checked models (in one category, or all). */
  names(cat) { return Object.keys(this.list).filter((k) => !cat || this.list[k].cat === cat); }
  /** Load a model's versions (once; every later call gets the same promise). Resolves to { levels, info } or null. */
  load(name) {
    const c = this.cache.get(name); if (c) return c.p; const info = this.list[name]; if (!info) return Promise.resolve(null);
    const e = { p: null, v: null }; this.cache.set(name, e);
    e.p = Promise.all(info.files.map((f) => this.loader.loadAsync(BASE + f).then((g) => prep(g.scene)))).then((levels) => (e.v = { levels, info })).catch((err) => { console.warn('model failed to load:', name, err); return null; });
    return e.p;
  }
  /** A copy for the world: a THREE.LOD, or null if it isn't loaded yet (loading starts now). */
  spawn(name) {
    const e = this.cache.get(name); if (!e || !e.v) { this.load(name); return null; }
    const { levels, info } = e.v, lod = new THREE.LOD(), parts = {};
    levels.forEach((lv, i) => {
      const o = lv.clone(true); o.traverse((m) => { if (m.isMesh) { m.castShadow = i < 2; m.receiveShadow = true; } if (m.name && m.parent) (parts[m.name] ||= []).push(m); });   // (the furthest version casts no shadow)
      lod.addLevel(o, info.dist[i] || 0);
    });
    if (info.far) lod.addLevel(new THREE.Object3D(), info.far);   // too far to see: nothing drawn
    lod.userData = { asset: name, parts, tris: info.tris }; return lod;
  }
  /** Turn a moving part (all its distance versions) about its own x axis, e.g. a wheel by the distance rolled / radius. */
  turn(obj, part, angle) { const P = obj.userData.parts && obj.userData.parts[part]; if (P) for (const m of P) m.rotation.x = angle; }
}

/** Ready a loaded model for the town: shadows on, small palette textures crisp (no blurring between colours). */
function prep(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
    for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
      const t = mat && mat.map; if (t && t.image && Math.max(t.image.width || 0, t.image.height || 0) <= 256) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; }
    }
  });
  return scene;
}
