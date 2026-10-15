import * as THREE from 'three';
import { TILE } from '../config.js';

/**
 * Buildings far from the camera, drawn in bulk. Every building's outside is already merged into one mesh per material,
 * and most of those materials are shared (each facade, roof colour and plain colour is one material for the whole
 * town), so a district of thirty houses can be a dozen draw calls instead of four hundred.
 *
 * The map is cut into districts (CH tiles square). A district further from the camera than NEAR metres is drawn from
 * its batch: the static parts of every building in it, copied into world space and merged by material. Nearer than
 * that (or with Sam inside one of its buildings) its buildings draw themselves, doors swinging and all. What changes on
 * its own stays out of the batch and is always live: windows (they light up, burn, break), curtains, door signs, the
 * upstairs floors (shown and hidden by the camera), anything with its own animation (the Lift, billboards, graves).
 * A district is rebuilt when a building in it is finished, knocked down, restyled or upgraded.
 *
 * ?nobatch turns it off (to compare).
 */
const CH = 6, NEAR = 26, _n = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();
/** Plain coloured parts (no picture, no glow, not see-through) all become one material with the colour in the vertices. */
const PLAIN = new Map(), plainMat = (side, flat) => { const k = side + (flat ? 'f' : ''); return PLAIN.get(k) || PLAIN.set(k, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05, side, flatShading: !!flat })).get(k); };
const plain = (m) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.map && !m.emissiveMap && !m.normalMap && !m.alphaMap && !m.transparent && !(m.alphaTest > 0 && m.opacity < m.alphaTest) && (!m.emissive || m.emissive.getHex() === 0);

export class TownBatch {
  constructor(game) {
    this.game = game; this.chunks = new Map(); this.t = 0; this.on = !(typeof location !== 'undefined' && /[?&]nobatch\b/.test(location.search));
    const ev = game.world.events; for (const e of ['building:done', 'building:removed']) ev.on(e, (b) => this.dirty(b));
    this.stats = { batched: 0, live: 0, rebuilds: 0 };
  }
  keyOf(b) { return Math.floor((b.x0 + b.w / 2) / CH) + ',' + Math.floor((b.z0 + b.d / 2) / CH); }
  chunk(k) {
    let c = this.chunks.get(k); if (c) return c; const [i, j] = k.split(',').map(Number), T = TILE;
    c = { k, x0: i * CH * T, z0: j * CH * T, x1: (i + 1) * CH * T, z1: (j + 1) * CH * T, group: null, batched: false, dirty: true, members: new Set() }; this.chunks.set(k, c); return c;
  }
  /** Something about this building changed (finished, gone, restyled, upgraded): its district's batch is out of date. */
  dirty(b) {
    if (!b) return; const k = this.keyOf(b), c = this.chunk(k); c.dirty = true;
    if (b._bk && b._bk !== k) { const o = this.chunks.get(b._bk); if (o) { o.dirty = true; o.members.delete(b); } }
    if (b._bparts) { for (const m of b._bparts) m.visible = true; b._bparts = null; }   // (its own meshes back until the new batch is in)
  }
  eligible(b) { const d = b.def; return b.state === 'done' && b.ext && !d.special && !d.ruin && !b.ext.update && b.id !== 'lift' && b.id !== 'tunnel'; }
  /** The parts of a building that never change by themselves (see above). */
  partsOf(b) {
    const ext = b.ext, skip = new Set([...(ext.glass || []), ext.curtains, b.signMesh, ext.liftCab, ext.roofDoor && ext.roofDoor.pivot, ...(ext.levels || [])].filter(Boolean)), out = [];
    const doors = new Set((ext.doors || []).map((d) => d.pivot));
    const walk = (o) => {
      if (skip.has(o)) return; if (o.userData && o.userData.keep && !doors.has(o)) return;   // (kept apart on purpose: it moves or comes and goes)
      if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && !Array.isArray(o.material) && !o.morphTargetInfluences && o.geometry.attributes.position) out.push(o);
      for (const c of o.children) walk(c);
    };
    walk(ext.group); walk(ext.roof); return out;
  }
  /** Merge a district's parts into one mesh per material, in world space. */
  build(c) {
    const g = this.game; if (c.group) { g.scene.remove(c.group); c.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); c.group = null; }
    for (const b of c.members) if (b._bparts) { for (const m of b._bparts) m.visible = true; b._bparts = null; }
    c.members.clear(); for (const b of g.buildings.list) if (this.keyOf(b) === c.k && this.eligible(b)) { c.members.add(b); b._bk = c.k; }
    const buckets = new Map();
    for (const b of c.members) {
      const D = (b.ext.doors || []).map((d) => [d.pivot, d.pivot.rotation.y]); for (const [p] of D) p.rotation.y = 0;   // doors go in shut
      b.ext.group.updateMatrixWorld(true); b.ext.roof.updateMatrixWorld(true);
      const parts = this.partsOf(b); b._bparts = parts;
      for (const o of parts) {
        const geo = o.geometry, pl = plain(o.material) && geo.attributes.normal, keys = pl ? ['color', 'normal', 'position'] : Object.keys(geo.attributes).filter((n) => n !== 'uv1' && n !== 'uv2').sort(), mat = pl ? plainMat(o.material.side, o.material.flatShading) : o.material;
        const k = mat.uuid + '|' + keys.join(',') + '|' + !!geo.index + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
        let bk = buckets.get(k); if (!bk) buckets.set(k, (bk = { mat, keys, plain: pl, indexed: !!geo.index, cast: o.castShadow, recv: o.receiveShadow, order: o.renderOrder, list: [], n: 0, ni: 0 }));
        bk.list.push([o, o.matrixWorld.clone()]); bk.n += geo.attributes.position.count; if (bk.indexed) bk.ni += geo.index.count;
      }
      for (const [p, r] of D) { p.rotation.y = r; p.updateMatrixWorld(true); }
    }
    const grp = new THREE.Group(); grp.name = 'townbatch:' + c.k; grp.matrixAutoUpdate = false;
    for (const bk of buckets.values()) {
      const first = bk.list[0][0].geometry, arr = {}, size = {}; for (const key of bk.keys) { size[key] = key === 'color' && bk.plain ? 3 : first.attributes[key].itemSize; arr[key] = new Float32Array(bk.n * size[key]); }
      const idx = bk.indexed ? (bk.n > 65535 ? new Uint32Array(bk.ni) : new Uint16Array(bk.ni)) : null; let off = 0, io = 0;
      for (const [o, M] of bk.list) {
        const geo = o.geometry, cnt = geo.attributes.position.count; _n.getNormalMatrix(M);
        if (bk.plain) {   // the material's colour into the vertices (times any vertex colours it had)
          const M0 = o.material, vc = M0.vertexColors && geo.attributes.color, A = arr.color; for (let i = 0; i < cnt; i++) { const d = (off + i) * 3; if (vc) _c.fromBufferAttribute(vc, i).multiply(M0.color); else _c.copy(M0.color); A[d] = _c.r; A[d + 1] = _c.g; A[d + 2] = _c.b; }
        }
        for (const key of bk.keys) {
          if (bk.plain && key === 'color') continue; const at = geo.attributes[key], s = size[key], A = arr[key]; if (!at || at.itemSize !== s) continue;
          for (let i = 0; i < cnt; i++) {
            const d = (off + i) * s;
            if (key === 'position') { _v.fromBufferAttribute(at, i).applyMatrix4(M); A[d] = _v.x; A[d + 1] = _v.y; A[d + 2] = _v.z; }
            else if (key === 'normal') { _v.fromBufferAttribute(at, i).applyMatrix3(_n).normalize(); A[d] = _v.x; A[d + 1] = _v.y; A[d + 2] = _v.z; }
            else { A[d] = at.getX(i); if (s > 1) A[d + 1] = at.getY(i); if (s > 2) A[d + 2] = at.getZ(i); if (s > 3) A[d + 3] = at.getW(i); }
          }
        }
        if (idx) { const I = geo.index; for (let i = 0; i < I.count; i++) idx[io++] = I.getX(i) + off; }
        off += cnt;
      }
      const geo = new THREE.BufferGeometry(); for (const key of bk.keys) geo.setAttribute(key, new THREE.BufferAttribute(arr[key], size[key])); if (idx) geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const m = new THREE.Mesh(geo, bk.mat); m.castShadow = bk.cast; m.receiveShadow = bk.recv; m.renderOrder = bk.order; m.matrixAutoUpdate = false; grp.add(m);
      if (bk.mat.isMeshBasicMaterial && bk.mat.map && !bk.mat.transparent) (grp.userData.signs || (grp.userData.signs = [])).push(m);   // (shop signs: too small to read from high up)
    }
    grp.visible = false; g.scene.add(grp); c.group = grp; c.dirty = false; c.batched = false; this.stats.rebuilds++;
  }
  show(c, batched) {
    c.batched = batched; if (c.group) c.group.visible = batched;
    for (const b of c.members) { b._batched = batched; if (b._bparts) for (const m of b._bparts) m.visible = !batched; }
  }
  update(dt) {
    if ((this.t -= dt) > 0) return; this.t = 0.2;
    const g = this.game, cam = g.camera.position, inside = g.buildings.playerInside, ik = inside ? this.keyOf(inside) : null;
    for (const b of g.buildings.list) if (this.eligible(b) && !b._bk) this.chunk(this.keyOf(b)).dirty = true, b._bk = this.keyOf(b);   // (new districts)
    const t0 = performance.now(); let nb = 0, nl = 0;
    for (const c of this.chunks.values()) {
      const dx = Math.max(c.x0 - cam.x, 0, cam.x - c.x1), dz = Math.max(c.z0 - cam.z, 0, cam.z - c.z1), d = Math.sqrt(dx * dx + dz * dz + cam.y * cam.y);
      const want = this.on && d > NEAR && c.k !== ik;
      if (want && c.dirty) { if (performance.now() - t0 > 4) { if (c.batched) this.show(c, false); continue; } this.build(c); }   // (a few milliseconds of rebuilding a moment: no hitch)
      if (want !== c.batched || (want && c.group && !c.group.visible)) this.show(c, want);
      if (c.batched && c.group && c.group.userData.signs) { const sv = d < 70; for (const m of c.group.userData.signs) m.visible = sv; }
      if (c.batched) nb++; else nl++;
    }
    this.stats.batched = nb; this.stats.live = nl;
  }
}
