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
 * so a hundred bikes cost a hundred positions, not a hundred models. Models share textures and materials with each
 * other too (most are coloured from one palette), so a room full of different furniture merges into one draw call.
 *
 * Only what the game can use is loaded at the start (the furniture that stands in for block pieces, asked for with
 * wantFurniture / wantModel); anything else loads the first time it's spawned. Models held back in the review list
 * (assets/incoming/review.json) never stand in for furniture, unless the page is opened with ?allmodels to try them.
 */
const BASE = 'assets/models/lib/';
let LIB = null;
/** The game's model library (for code that builds things without the game to hand, like interiors). */
export const models = () => LIB;
const MADE_FOLDERS = ['furniture', 'props', 'animals', 'cars'];   // where a stand-in for a piece of furniture can come from
const WANT_T = new Set(), WANT_N = new Set();
/** Furniture types (block pieces) the game would swap for made models: theirs load at the start. */
export function wantFurniture(...types) { for (const t of types) WANT_T.add(t); }
/** Particular models to load at the start ('props/wall_clock'). */
export function wantModel(...names) { for (const n of names) WANT_N.add(n); }
const ALL = typeof location !== 'undefined' && /[?&]allmodels\b/.test(location.search);
const baseOf = (name) => name.slice(name.indexOf('/') + 1).replace(/_\d+$/, '');

/** A texture the check named after its contents (tex_ + hash) is decoded once and shared by every model that has it. */
const SHARED_TEX = new Map();
class SharedTextures {
  constructor(parser) { this.parser = parser; this.name = 'samcity_shared_textures'; }
  loadTexture(i) {
    const P = this.parser, t = P.json.textures[i], img = P.json.images[t.source]; if (!img || !/^tex_[0-9a-f]{12}$/.test(img.name || '')) return null;
    const key = img.name + JSON.stringify((P.json.samplers || [])[t.sampler] || {}); let p = SHARED_TEX.get(key);
    if (!p) { p = P.loadTextureImage(i, t.source, P.textureLoader); SHARED_TEX.set(key, p); } return p;
  }
}
/** Materials that come out the same (same texture, colour, shine, glow) are one material: one draw call once a room is merged. */
const SHARED_MAT = new Map();
function shareMaterial(m) {
  if (!m || !m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.normalMap || m.roughnessMap || m.metalnessMap || m.aoMap || m.alphaMap || m.lightMap || m.bumpMap || m.displacementMap) return m;
  const k = [m.map ? m.map.uuid : '-', m.color.getHexString(), m.roughness.toFixed(2), m.metalness.toFixed(2), m.emissive.getHexString(), m.emissiveIntensity.toFixed(2), m.emissiveMap ? m.emissiveMap.uuid : '-', m.transparent, m.opacity.toFixed(2), m.alphaTest, m.side, m.vertexColors, m.flatShading, m.depthWrite].join('|');
  const s = SHARED_MAT.get(k); if (s) { if (s !== m) m.dispose(); return s; } SHARED_MAT.set(k, m); return m;
}

export class ModelLib {
  constructor(game) {
    this.game = game; this.list = {}; this.cache = new Map(); this.loader = new GLTFLoader(); this.loader.setMeshoptDecoder(MeshoptDecoder); this.loader.register((parser) => new SharedTextures(parser)); this.live = new Set(); this.tick = 0; LIB = this;
    this.ready = this.init();
  }
  async init() {
    try { const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' }); if (r.ok) this.list = (await r.json()).assets || {}; } catch (e) { /* no checked models yet */ }
    // what the rooms can use, a few at a time in the background (hundreds at once would hold up the first frames)
    const want = Object.keys(this.list).filter((n) => WANT_N.has(n) || (MADE_FOLDERS.includes(n.slice(0, n.indexOf('/'))) && WANT_T.has(baseOf(n)) && (ALL || !this.list[n].hold)));
    if (!want.length) { this.done = true; return this; }
    const t0 = performance.now(); let next = 0;
    const worker = async () => { while (next < want.length) { await this.load(want[next++]); await new Promise((r) => setTimeout(r, 0)); } };   // (a breath between models)
    Promise.all([0, 1, 2, 3].map(worker)).then(() => {
      this.done = true; this.loadMs = performance.now() - t0; this._si = null;
      const B = this.game.buildings; if (B && B.refreshInteriors) B.refreshInteriors();   // rooms already built with the old block models are rebuilt with the real ones
    });
    return this;
  }
  /**
   * The made models standing in for a block piece of furniture (`chair`: chair, chair_2, chair_3 from the first folder
   * that has any), loaded and not held back: [] if none.
   */
  standIns(t) {
    const k = this._si || (this._si = new Map()); let v = k.get(t); if (v) return v;
    v = []; for (const f of MADE_FOLDERS) { v = Object.keys(this.list).filter((n) => n.startsWith(f + '/') && baseOf(n) === t && (ALL || !this.list[n].hold)).sort((a, c) => (a.length - c.length) || a.localeCompare(c)); if (v.length) break; }
    v = v.filter((n) => { const e = this.cache.get(n); return e && e.v; }); if (this.done) k.set(t, v); return v;   // (cached once everything's in)
  }
  /** The loaded versions of a model and its variations (name, name_1, name_2, name_3...), in order: [] if none are ready. */
  variants(name) {
    const k = this._vk || (this._vk = new Map()); let all = k.get(name);
    if (!all) { const re = new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(_\\d+)?$'); all = Object.keys(this.list).filter((n) => re.test(n)).sort((a, c) => (a.length - c.length) || a.localeCompare(c)); k.set(name, all); }
    return all.filter((n) => { const e = this.cache.get(n); return e && e.v; });
  }
  /** A plain copy of the full version (no distance versions), for things that get merged into a room: null if not loaded. */
  copyStatic(name) { const e = this.cache.get(name); if (!e || !e.v) return null; const o = e.v.levels[0].clone(true), parts = {}; o.traverse((m) => { if (m.name && m.parent) (parts[m.name] ||= []).push(m); }); o.userData = { asset: name, parts }; return o; }
  /** A copy if it's loaded already, else null (interiors fall back to their old block model). */
  copy(name) { const e = this.cache.get(name); return e && e.v ? this.spawn(name) : null; }
  has(name) { return !!this.list[name]; }
  /** Names of the checked models (in one category, or all). */
  names(cat) { return Object.keys(this.list).filter((k) => !cat || this.list[k].cat === cat); }
  /** Load a model's versions (once; every later call gets the same promise). Resolves to { levels, info } or null. */
  load(name) {
    const c = this.cache.get(name); if (c) return c.p; const info = this.list[name]; if (!info) return Promise.resolve(null);
    const e = { p: null, v: null }; this.cache.set(name, e);
    e.p = Promise.all(info.files.map((f, i) => this.loader.loadAsync(BASE + f).then((g) => prep(g.scene, i === 0)))).then((levels) => { if (levels.length > 1) shareMaterials(levels); return (e.v = { levels, info }); }).catch((err) => { console.warn('model failed to load:', name, err); return null; });
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
function prep(scene, share) {   // (distance versions get their full version's materials instead: shareMaterials)
  scene.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; if (share && !Array.isArray(o.material)) o.material = shareMaterial(o.material);
    for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
      const t = mat && mat.map; if (t && t.image && Math.max(t.image.width || 0, t.image.height || 0) <= 256) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; }
    }
  });
  return scene;
}
