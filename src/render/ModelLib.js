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
let LIB = null;
/** The game's model library (for code that builds things without the game to hand, like interiors). */
export const models = () => LIB;

export class ModelLib {
  constructor(game) {
    this.game = game; this.list = {}; this.cache = new Map(); this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder); this.live = new Set(); this.tick = 0; LIB = this;
    this.ready = this.init();
  }
  async init() {
    try { const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' }); if (r.ok) this.list = (await r.json()).assets || {}; } catch (e) { /* no checked models yet */ }
    const all = Object.keys(this.list).map((name) => this.load(name));   // all small: fetched in the background at the start
    if (all.length) Promise.all(all).then(() => { const B = this.game.buildings; if (B && B.refreshInteriors) B.refreshInteriors(); });   // rooms already built with the old block models are rebuilt with the real ones
    return this;
  }
  /** A copy if it's loaded already, else null (interiors fall back to their old block model). */
  copy(name) { const e = this.cache.get(name); return e && e.v ? this.spawn(name) : null; }
  has(name) { return !!this.list[name]; }
  /** Names of the checked models (in one category, or all). */
  names(cat) { return Object.keys(this.list).filter((k) => !cat || this.list[k].cat === cat); }
  /** Load a model's versions (once; every later call gets the same promise). Resolves to { levels, info } or null. */
  load(name) {
    const c = this.cache.get(name); if (c) return c.p; const info = this.list[name]; if (!info) return Promise.resolve(null);
    const e = { p: null, v: null }; this.cache.set(name, e);
    e.p = Promise.all(info.files.map((f) => this.loader.loadAsync(BASE + f).then((g) => prep(g.scene)))).then((levels) => { if (levels.length > 1) shareMaterials(levels); return (e.v = { levels, info }); }).catch((err) => { console.warn('model failed to load:', name, err); return null; });
    return e.p;
  }
  /** A copy for the world: a THREE.LOD, or null if it isn't loaded yet (loading starts now). */
  spawn(name) {
    const e = this.cache.get(name); if (!e || !e.v) { this.load(name); return null; }
    const { levels, info } = e.v, lod = new THREE.LOD(), parts = {}; if (levels.length === 1 && !info.far) { const o = levels[0].clone(true); o.traverse((m) => { if (m.name && m.parent) (parts[m.name] ||= []).push(m); }); o.userData = { asset: name, parts, tris: info.tris }; return o; }   // (one version, always drawn: no need for an LOD)
    levels.forEach((lv, i) => {
      const o = lv.clone(true); o.traverse((m) => { if (m.isMesh) { m.castShadow = i < 2; m.receiveShadow = true; } if (m.name && m.parent) (parts[m.name] ||= []).push(m); });   // (the furthest version casts no shadow)
      lod.addLevel(o, info.dist[i] || 0);
    });
    if (info.far) lod.addLevel(new THREE.Object3D(), info.far);   // too far to see: nothing drawn
    lod.userData = { asset: name, parts, tris: info.tris }; return lod;
  }
  /** Turn a moving part (all its distance versions) to an angle about one of its own axes: a wheel about x (distance rolled / radius), a clock hand about z. */
  turn(obj, part, angle, axis = 'x') { const P = obj.userData.parts && obj.userData.parts[part]; if (P) for (const m of P) m.rotation[axis] = angle; }
  /** Keep a placed model moving by itself: 'clock' (hands show the town's time). */
  animate(obj, kind) { obj.userData.anim = kind; this.live.add(obj); this.drive(obj); }
  drive(obj) {
    if (obj.userData.anim === 'clock') {   // hands turn clockwise seen from the front (+z): negative about z; 0 = pointing at twelve
      const h = this.game.clock ? this.game.clock.hour : 10.17; this.turn(obj, 'move_hand_hour', -((h % 12) / 12) * Math.PI * 2, 'z'); this.turn(obj, 'move_hand_min', -(h % 1) * Math.PI * 2, 'z');
    }
  }
  /** Four times a second: everything animated that's still in the world (interiors that were thrown away drop out). */
  update(dt) {
    if ((this.tick -= dt) > 0 || !this.live.size) return; this.tick = 0.25; const scene = this.game.scene;
    for (const o of this.live) { let p = o; while (p.parent) p = p.parent; if (p !== scene) { if (this.live.size > 400) this.live.delete(o); continue; } this.drive(o); }
  }
}

/** The distance versions come without textures: give them the full version's materials (matched by name), one texture in memory, not three. */
function shareMaterials(levels) {
  const by = new Map(); levels[0].traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) by.set(o.material.name, o.material); }); const only = by.size === 1 ? [...by.values()][0] : null;
  for (const lv of levels.slice(1)) lv.traverse((o) => { if (!o.isMesh || Array.isArray(o.material)) return; const m = by.get(o.material.name) || only; if (m && m !== o.material) { o.material.dispose(); o.material = m; } });
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
