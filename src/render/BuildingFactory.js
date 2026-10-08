import * as THREE from 'three';
import { TILE, WALL_H, WALL_T, DOOR_W } from '../config.js';
import { FACADES } from '../data/buildings.js';
import { doorOffset } from '../data/layouts.js';
import { facadeMaterial, signTexture } from './Textures.js';
import { makeFurniture, FURN } from './Furniture.js';
import { mulberry32 } from '../util.js';

const unit = new THREE.BoxGeometry(1, 1, 1);
const mcache = {};
export function stdMat(c, o = {}) { const k = c + JSON.stringify(o); return mcache[k] || (mcache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o })); }
function box(g, w, h, d, c, x, y, z, o) { const m = new THREE.Mesh(unit, stdMat(c, o)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; }

/** Box whose UVs are in metres, so the facade texture tiles at its real-world size. */
function wallGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / 4, uv.getY(i) * dims[f][1] / WALL_H); }
  return g;
}
function prism(w, h, d) { // gable roof, ridge along z, base y=0
  const a = [-w / 2, 0, -d / 2], b = [w / 2, 0, -d / 2], c = [0, h, -d / 2], a2 = [-w / 2, 0, d / 2], b2 = [w / 2, 0, d / 2], c2 = [0, h, d / 2];
  const tris = [a, c, b, a2, b2, c2, a, a2, c2, a, c2, c, b, c, c2, b, c2, b2];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3)); g.computeVertexNormals(); return g;
}

function addWall(g, cols, mat, cx, cz, sx, sz, h = null, y = 0) {
  const H = h; const m = new THREE.Mesh(wallGeo(sx, H, sz), mat); m.position.set(cx, y + H / 2, cz); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (y === 0) cols.push({ cx, cz, sx, sz });
}

/** Merge all static meshes of a group that share a material into one mesh (big draw-call saver). */
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || Array.isArray(o.material)) return;
    const a = o.geometry.attributes, k = o.material.uuid + '|' + Object.keys(a).join(',') + '|' + !!o.geometry.index + '|' + o.castShadow + o.receiveShadow;
    let bk = buckets.get(k); if (!bk) buckets.set(k, bk = { mat: o.material, list: [], cast: o.castShadow, recv: o.receiveShadow, keys: Object.keys(a), indexed: !!o.geometry.index });
    bk.list.push(o); remove.push(o);
  });
  const mtx = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const bk of buckets.values()) {
    if (bk.list.length < 2) continue; const arrays = {}; for (const key of bk.keys) arrays[key] = []; const idx = []; let off = 0;
    for (const o of bk.list) {
      mtx.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(mtx); const g = o.geometry, pos = g.attributes.position;
      for (const key of bk.keys) {
        const at = g.attributes[key];
        for (let i = 0; i < at.count; i++) {
          if (key === 'position') { v.fromBufferAttribute(at, i).applyMatrix4(mtx); arrays[key].push(v.x, v.y, v.z); }
          else if (key === 'normal') { v.fromBufferAttribute(at, i).applyMatrix3(nm).normalize(); arrays[key].push(v.x, v.y, v.z); }
          else for (let c = 0; c < at.itemSize; c++) arrays[key].push(at.array[i * at.itemSize + c]);
        }
      }
      if (bk.indexed) for (const i of g.index.array) idx.push(i + off); off += pos.count;
    }
    const geo = new THREE.BufferGeometry(); for (const key of bk.keys) geo.setAttribute(key, new THREE.Float32BufferAttribute(arrays[key], bk.list[0].geometry.attributes[key].itemSize)); if (bk.indexed) geo.setIndex(idx);
    const m = new THREE.Mesh(geo, bk.mat); m.castShadow = bk.cast; m.receiveShadow = bk.recv; root.add(m);
    for (const o of bk.list) o.parent.remove(o);
  }
  return root;
}

export function buildExterior(def, uid = 1) {
  const r = buildExterior0(def, uid); mergeByMaterial(r.group); mergeByMaterial(r.roof); return r;
}
function buildExterior0(def, uid = 1) {
  if (def.id === 'lift') return buildLift(def);
  if (def.id === 'tunnel') return buildTunnel(def);
  if (def.park) return buildPark(def, uid);
  const W = def.w * TILE, D = def.d * TILE, H = def.floors * WALL_H, T = WALL_T, rnd = mulberry32(uid * 7919 + 13);
  const g = new THREE.Group(), roof = new THREE.Group(), cols = [];
  const mat = facadeMaterial(def.wall), door = doorOffset(def.w), dw = DOOR_W;
  box(g, W + 0.7, 0.3, D + 0.7, 0x9a9b9c, 0, -0.18, 0);                       // pavement slab
  const floorCol = ['clinic', 'shop', 'lobby', 'office', 'townhall'].includes(def.layout) ? 0xcfd3d8 : 0xa6825a;
  box(g, W - 0.1, 0.12, D - 0.1, floorCol, 0, 0.0, 0);                           // interior floor
  addWall(g, cols, mat, 0, -D / 2 + T / 2, W, T, H);                              // back
  addWall(g, cols, mat, -W / 2 + T / 2, 0, T, D - 2 * T, H);                      // left
  addWall(g, cols, mat, W / 2 - T / 2, 0, T, D - 2 * T, H);                       // right
  const fz = D / 2 - T / 2, l0 = -W / 2, l1 = door - dw / 2, r0 = door + dw / 2, r1 = W / 2;
  addWall(g, cols, mat, (l0 + l1) / 2, fz, l1 - l0, T, H);
  addWall(g, cols, mat, (r0 + r1) / 2, fz, r1 - r0, T, H);
  if (H > 2.6) addWall(g, [], mat, door, fz, dw, T, H - 2.6, 2.6);               // lintel
  box(g, 0.12, 2.6, 0.5, 0x2a2d33, door - dw / 2, 0, fz); box(g, 0.12, 2.6, 0.5, 0x2a2d33, door + dw / 2, 0, fz); box(g, dw, 0.12, 0.5, 0x2a2d33, door, 2.55, fz);
  // ceiling (stays when the roof is cut away)
  const ceilH = Math.min(H, WALL_H * 1.7);
  box(g, W - 2 * T, 0.12, D - 2 * T, 0xe8e4da, 0, ceilH - 0.1, 0, { emissive: 0xfff2d0, emissiveIntensity: 0.55 });
  // sign above the door
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTexture(def.name) }));
  sign.position.set(door, Math.min(2.95, H - 0.4), D / 2 + 0.02); g.add(sign);
  // roof
  roof.position.y = H;
  const rc = def.roofColor || 0x666666;
  if (def.roof === 'gable') {
    const alongZ = D >= W; const p = new THREE.Mesh(prism(alongZ ? W + 0.9 : D + 0.9, 1.0 + Math.min(W, D) * 0.28, alongZ ? D + 0.9 : W + 0.9), stdMat(rc, { side: THREE.DoubleSide, flatShading: true }));
    if (!alongZ) p.rotation.y = Math.PI / 2; p.castShadow = true; roof.add(p);
    const chim = box(roof, 0.6, 1.8, 0.6, 0x7a4a3a, W * 0.2, 0.5, -D * 0.12);
  } else {
    box(roof, W + 0.3, 0.35, D + 0.3, rc, 0, 0, 0);
    for (const [x, z, sx, sz] of [[0, D / 2 + 0.1, W + 0.5, 0.3], [0, -D / 2 - 0.1, W + 0.5, 0.3], [W / 2 + 0.1, 0, 0.3, D + 0.5], [-W / 2 - 0.1, 0, 0.3, D + 0.5]]) box(roof, sx, 0.55, sz, 0xf2f2ee, x, 0.35, z);
    const props = def.roof === 'flatac' || def.roof === 'flat' ? 2 + Math.floor(rnd() * 3) : 0;
    for (let i = 0; i < props; i++) { const s = 0.7 + rnd() * 1.1; box(roof, s * 1.4, 0.7 + rnd() * 0.6, s, 0xaeb4bc, (rnd() - 0.5) * (W - 3), 0.35, (rnd() - 0.5) * (D - 3)); }
    if (def.roof === 'dome') {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 1.6, 12), stdMat(0xe6dfcc)); drum.position.y = 1.1; drum.castShadow = true; roof.add(drum);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(3.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stdMat(rc, { roughness: 0.5, metalness: 0.2 })); dome.position.y = 1.9; dome.castShadow = true; roof.add(dome);
      box(roof, 0.25, 1.4, 0.25, 0xd8c070, 0, 4.9, 0);
    }
    if (def.roof === 'plant') {
      for (const x of [-3.2, 3.2]) { for (let k = 0; k < 4; k++) box(roof, 1.5 - k * 0.1, 1.6, 1.5 - k * 0.1, k % 2 ? 0xf2f2ee : 0xc0392b, x, 0.35 + k * 1.6, -1.5); }
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.4, 10), stdMat(0xaeb4bc)); tank.position.set(0, 1.5, 2.2); tank.castShadow = true; roof.add(tank);
    }
    if (def.roof === 'factory') {
      for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(prism(2.8, 1.4, D - 0.6), stdMat(0x7a8088, { side: THREE.DoubleSide, flatShading: true })); s.position.set(-W / 2 + 2.4 + i * 3.6, 0.3, 0); s.castShadow = true; roof.add(s); }
      for (let k = 0; k < 5; k++) box(roof, 1.0, 1.6, 1.0, k % 2 ? 0xf2f2ee : 0xb23a2d, W / 2 - 1.5, 0.35 + k * 1.6, -D / 2 + 1.5);
    }
    if (def.roof === 'tank') {
      for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) box(roof, 0.18, 9, 0.18, 0x666d77, x, 0.2, z);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3, 12), stdMat(0xd7dde4, { metalness: 0.2 })); tank.position.y = 10.6; tank.castShadow = true; roof.add(tank);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 12), stdMat(0x445566)); cap.position.y = 12.7; roof.add(cap);
    }
    if (def.roof === 'spire') { box(roof, W - 2.5, 3, D - 2.5, 0x39434d, 0, 0.35, 0); box(roof, 0.35, 10, 0.35, 0xcccccc, 0, 3.3, 0); box(roof, 0.5, 0.5, 0.5, 0xff3030, 0, 13.3, 0, { emissive: 0xff2020, emissiveIntensity: 1.2 }); }
  }
  return { group: g, roof, colliders: cols, height: H };
}

function buildPark(def, uid) {
  const W = def.w * TILE, D = def.d * TILE, rnd = mulberry32(uid * 31 + 5), g = new THREE.Group(), roof = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.12, D - 0.3), stdMat(def.park === 'field' ? 0x6aa64f : 0x66a74e)); lawn.position.y = 0.04; lawn.receiveShadow = true; g.add(lawn);
  const tree = (x, z, s = 1) => { box(g, 0.35 * s, 1.2 * s, 0.35 * s, 0x5a3b22, x, 0, z); const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 * s, 3 * s, 6), stdMat(0x2f7a3a, { flatShading: true })); c.position.set(x, 2.4 * s, z); c.castShadow = true; g.add(c); };
  const cols = [];
  if (def.park === 'park') {
    box(g, 0.9, 0.02, D - 1, 0xcdb58a, 0, 0.1, 0);
    tree(-W / 2 + 1.4, -D / 2 + 1.4, 1.1); tree(W / 2 - 1.4, -D / 2 + 1.6, 0.9); tree(-W / 2 + 1.5, D / 2 - 1.6, 1.0); tree(W / 2 - 1.6, D / 2 - 1.4, 1.2);
    box(g, 1.8, 0.1, 0.5, 0x8a5a33, 1.4, 0.45, 0.3); box(g, 1.8, 0.45, 0.08, 0x8a5a33, 1.4, 0.5, 0.05);
  } else if (def.park === 'plaza') {
    box(g, W - 1, 0.04, D - 1, 0xc9bda3, 0, 0.1, 0);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.7, 14), stdMat(0xb9b4a8)); basin.position.y = 0.4; basin.castShadow = true; g.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.1, 14), stdMat(0x4aa3dc, { emissive: 0x1a5a99, emissiveIntensity: 0.4 })); water.position.y = 0.72; g.add(water);
    box(g, 0.5, 1.8, 0.5, 0xd6d0c0, 0, 0.7, 0); cols.push({ cx: 0, cz: 0, sx: 5.2, sz: 5.2 });
    tree(-W / 2 + 1.1, -D / 2 + 1.1, 1.0); tree(W / 2 - 1.1, -D / 2 + 1.1, 1.0); tree(-W / 2 + 1.1, D / 2 - 1.1, 1.0); tree(W / 2 - 1.1, D / 2 - 1.1, 1.0);
    box(g, 2, 0.1, 0.5, 0x8a5a33, -3.8, 0.45, 0.2); box(g, 2, 0.1, 0.5, 0x8a5a33, 3.8, 0.45, 0.2);
  } else { // ball field
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 0.05, W * 0.62), stdMat(0xc79a62)); dirt.rotation.y = Math.PI / 4; dirt.position.set(0, 0.11, 1.0); g.add(dirt);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(W * 0.38, 0.06, W * 0.38), stdMat(0x6aa64f)); inner.rotation.y = Math.PI / 4; inner.position.set(0, 0.12, 1.0); g.add(inner);
    for (const [x, z] of [[0, 1 + W * 0.43], [W * 0.31, 1 + W * 0.12 - 0.5], [-W * 0.31, 1 + W * 0.12 - 0.5], [0, 1 - W * 0.2]]) box(g, 0.7, 0.1, 0.7, 0xffffff, x, 0.14, z);
    box(g, W - 1, 1.6, 0.15, 0x777f88, 0, 0, -D / 2 + 0.5); tree(-W / 2 + 0.9, D / 2 - 0.9, 1.0); tree(W / 2 - 0.9, D / 2 - 0.9, 1.0);
  }
  return { group: g, roof, colliders: cols, height: 0.2 };
}

function buildLift(def) {
  const W = def.w * TILE, D = def.d * TILE, g = new THREE.Group(), roof = new THREE.Group(), cols = [];
  box(g, W, 0.35, D, 0x464c55, 0, -0.18, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 28), new THREE.MeshBasicMaterial({ color: 0xf1c40f })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.2, 0.5); g.add(ring);
  box(g, W, 11, 1.2, 0x39414b, 0, 0, -D / 2 + 0.6); cols.push({ cx: 0, cz: -D / 2 + 0.6, sx: W, sz: 1.2 });
  box(g, 5.2, 8, 0.3, 0x5b6572, -2.7, 0, -D / 2 + 1.3); box(g, 5.2, 8, 0.3, 0x5b6572, 2.7, 0, -D / 2 + 1.3);
  for (let i = 0; i < 6; i++) { box(g, 0.5, 8, 0.32, i % 2 ? 0x1a1a1a : 0xf1c40f, -5 + i * 0.9 - 0.2, 0, -D / 2 + 1.5); box(g, 0.5, 8, 0.32, i % 2 ? 0x1a1a1a : 0xf1c40f, 0.5 + i * 0.9, 0, -D / 2 + 1.5); }
  for (const x of [-W / 2 + 0.6, W / 2 - 0.6]) { box(g, 1.0, 7, 1.0, 0x59616d, x, 0, D / 2 - 1); cols.push({ cx: x, cz: D / 2 - 1, sx: 1, sz: 1 }); box(g, 0.5, 0.5, 0.5, 0xffa500, x, 7, D / 2 - 1, { emissive: 0xffa500, emissiveIntensity: 1.4 }); }
  box(g, W - 1, 0.7, 0.7, 0x59616d, 0, 6.4, D / 2 - 1);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: signTexture('THE LIFT - STAFF ONLY', '#3a1010') })); sign.position.set(0, 5.6, D / 2 - 0.62); g.add(sign);
  return { group: g, roof, colliders: cols, height: 11 };
}

function buildTunnel(def) {
  const W = def.w * TILE, D = def.d * TILE, g = new THREE.Group(), roof = new THREE.Group(), cols = [];
  box(g, W, 0.3, D, 0x55595f, 0, -0.16, 0);
  box(g, W + 4, 8, 6.5, 0x3f5f3a, 0, 0, -D / 2 + 3.25);                            // hill
  box(g, 1.2, 6, 1.4, 0xbfc2c7, -3, 0, -0.9); box(g, 1.2, 6, 1.4, 0xbfc2c7, 3, 0, -0.9); box(g, 7.4, 1.4, 1.4, 0xbfc2c7, 0, 5.6, -0.9);
  box(g, 4.8, 5.6, 0.4, 0x050505, 0, 0, -1.4);                                      // dark mouth
  cols.push({ cx: 0, cz: -D / 2 + 3.25, sx: W + 4, sz: 6.5 }, { cx: 0, cz: -1.6, sx: 7.4, sz: 3 });
  for (let i = 0; i < 6; i++) box(g, 0.5, 0.05, 6, i % 2 ? 0x111111 : 0xf1c40f, -2.75 + i, 0.05, 1.8 - 3.5);
  // boom barrier
  box(g, 0.5, 1.1, 0.5, 0x333, -3.2, 0, 3.2); for (let i = 0; i < 6; i++) box(g, 1.1, 0.16, 0.16, i % 2 ? 0xffffff : 0xcc2222, -2.6 + i * 1.1, 1.0, 3.2);
  cols.push({ cx: 0, cz: 3.2, sx: 7, sz: 0.4 });
  box(g, 2.4, 2.4, 2.4, 0x7a8088, W / 2 - 1.3, 0, 3.6); box(g, 2.7, 0.3, 2.7, 0x333b45, W / 2 - 1.3, 2.4, 3.6); box(g, 1.0, 0.8, 0.05, 0xffdd88, W / 2 - 1.3, 1.1, 2.4, { emissive: 0xffdd88, emissiveIntensity: 0.6 });
  cols.push({ cx: W / 2 - 1.3, cz: 3.6, sx: 2.4, sz: 2.4 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), new THREE.MeshBasicMaterial({ map: signTexture('RESTRICTED - NO ENTRY', '#5a0d0d') })); sign.position.set(0, 3.3, 3.45); g.add(sign);
  box(g, 0.2, 3.3, 0.2, 0x333, -2.2, 0, 3.3); box(g, 0.2, 3.3, 0.2, 0x333, 2.2, 0, 3.3);
  return { group: g, roof, colliders: cols, height: 8 };
}

// ---------- construction site ----------
export function buildSite(def) {
  const W = def.w * TILE, D = def.d * TILE, H = Math.max(2, (def.floors || 1) * WALL_H), g = new THREE.Group();
  box(g, W + 0.4, 0.2, D + 0.4, 0x8b7355, 0, -0.1, 0);
  const f = FACADES[def.wall] || FACADES.tan;
  const shell = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color: new THREE.Color(f.base), transparent: true, opacity: 0.88, roughness: 1 }));
  shell.castShadow = true; g.add(shell);
  const post = (x, z) => box(g, 0.14, H + 1.2, 0.14, 0xe0a21b, x, 0, z);
  post(-W / 2, -D / 2); post(W / 2, -D / 2); post(-W / 2, D / 2); post(W / 2, D / 2);
  const rails = new THREE.Group(); g.add(rails);
  const signP = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('Under construction', '#7a5a00') })); signP.position.set(0, 1.4, D / 2 + 0.3); g.add(signP);
  const crates = new THREE.Group(); g.add(crates);
  const state = { crates: -1, rails: -1 };
  function update(progress, haveTotal, needTotal) {
    const supply = needTotal ? haveTotal / needTotal : 1;
    const hh = Math.max(0.15, H * progress);
    shell.scale.set(W - 0.5, hh, D - 0.5); shell.position.set(0, hh / 2, 0);
    const nc = Math.min(9, Math.ceil(supply * 9)) * (progress < 1 ? 1 : 0);
    if (nc !== state.crates) {
      state.crates = nc; crates.clear();
      for (let i = 0; i < nc; i++) box(crates, 0.8, 0.8, 0.8, i % 3 ? 0xb5834a : 0xa8442f, -W / 2 - 1.1 + (i % 3) * 0.9, (i / 9 | 0) * 0.8, D / 2 + 0.2 + ((i / 3) | 0) * 0.9);
    }
    const nr = Math.floor(progress * 4); if (nr !== state.rails) {
      state.rails = nr; rails.clear();
      for (let k = 1; k <= nr + 1; k++) { const y = Math.min(H + 0.8, k * H / 3.2); box(rails, W + 0.3, 0.08, 0.08, 0xbdbdbd, 0, y, D / 2 + 0.1); box(rails, 0.08, 0.08, D + 0.3, 0xbdbdbd, W / 2 + 0.1, y, 0); }
    }
  }
  update(0, 0, 1);
  return { group: g, update, height: H };
}

// ---------- interior (built lazily) ----------
export function buildInterior(b) {
  const g = new THREE.Group(), lay = b.layout;
  if (!lay) return g;
  for (const f of lay.furniture) {
    const m = makeFurniture(f.t); m.position.set(f.x, 0.06, f.z); m.rotation.y = (f.r || 0) * Math.PI / 2; g.add(m);
  }
  return g;
}

export function furnitureColliders(lay) {
  const out = [];
  for (const f of lay.furniture) {
    const d = FURN[f.t]; if (!d || !d.solid) continue;
    let [sx, sz] = d.s; if ((f.r || 0) % 2) [sx, sz] = [sz, sx];
    out.push({ cx: f.x, cz: f.z, sx: sx * 0.92, sz: sz * 0.92 });
  }
  return out;
}
