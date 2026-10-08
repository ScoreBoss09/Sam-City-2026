import * as THREE from 'three';
import { TILE, WALL_H, WALL_T, DOOR_W } from '../config.js';
import { FACADES } from '../data/buildings.js';
import { doorOffset } from '../data/layouts.js';
import { facadeMaterial, signTexture, roofMaterial } from './Textures.js';
import { makeFurniture, FURN } from './Furniture.js';
import { mulberry32 } from '../util.js';
import { Assets } from './Assets.js';

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
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3)); g.computeVertexNormals();
  const uv = []; for (const [x, y, z] of tris) uv.push((z * 0.55 + x * 0.12) , (y * 1.15 + Math.abs(x) * 0.35)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
}

/** Textured (or plain fallback) material for interiors; rx/ry = repeats. */
const imat = {};
function texMat(key, fallback, rx = 1, ry = 1, tint = 0xffffff, o = {}) {
  const k = key + '|' + fallback + '|' + rx + '|' + ry + '|' + tint + JSON.stringify(o); if (imat[k]) return imat[k];
  const map = key && Assets.has(key) ? Assets.tex(key, rx, ry) : null;
  return (imat[k] = new THREE.MeshStandardMaterial({ color: map ? tint : fallback, map, roughness: 0.9, ...o }));
}
/** Floor + wall-lining look per interior layout. */
const INTERIOR = {
  hut: ['floor_wood_dark', 0x8a6a44, 'int_planks', 0xa98660], cabin: ['floor_wood_dark', 0x8a6a44, 'int_planks', 0xa98660], shed: ['floor_wood_dark', 0x8a6a44, 'int_planks', 0xa98660],
  terminalhut: ['floor_wood_dark', 0x8a6a44, 'int_planks', 0xa98660], yard: ['ground_pavement', 0x999999, 'int_stucco', 0xc9bfa0],
  tavern: ['floor_wood_dark', 0x7a5a3a, 'int_wallpaper_red', 0xa04a40], school: ['floor_wood', 0xa6825a, 'int_paint_yellow', 0xe0cf8a],
  shop: ['floor_tile', 0xd8dade, 'int_paint_blue', 0x9ab4d0], clinic: ['floor_tile', 0xd8dade, 'int_paint_green', 0xa8d0b0], police: ['floor_tile_grey', 0xaaaeb4, 'int_paint_grey', 0xaab0b8],
  office: ['floor_carpet_green', 0x6a8a70, 'int_wallpaper_white', 0xe6e2d8], lobby: ['floor_tile_grey', 0xaaaeb4, 'int_wallpaper_white', 0xe6e2d8], townhall: ['floor_carpet_red', 0x9a4a40, 'int_wallpaper_white', 0xe6e2d8],
  factory: ['ground_pavement', 0x999999, 'int_paint_grey', 0xaab0b8], power: ['ground_pavement', 0x999999, 'int_paint_grey', 0xaab0b8], pump: ['ground_pavement', 0x999999, 'int_paint_grey', 0xaab0b8],
  depot: ['ground_pavement', 0x999999, 'int_stucco', 0xc9bfa0], contractor: ['floor_wood', 0xa6825a, 'int_stucco', 0xc9bfa0],
};
const HOME_PAPER = [['int_wallpaper_green', 0x8ab48a], ['int_wallpaper_blue', 0x9ab0d0], ['int_wallpaper_red', 0xa04a40], ['int_paint_yellow', 0xe0cf8a]];
/** Inward-facing wall lining plane (metre UVs: one texture tile = 3 m). */
function lining(g, len, h, cx, cz, rotY, mat) {
  const geo = new THREE.PlaneGeometry(len, h), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 3, uv.getY(i) * h / 3);
  const m = new THREE.Mesh(geo, mat); m.position.set(cx, 0.14 + h / 2, cz); m.rotation.y = rotY; m.receiveShadow = true; g.add(m);
}
const RUSTIC = ['timber', 'logs', 'stone'];
const shadeHex = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); };
function addWall(g, cols, mat, cx, cz, sx, sz, h = null, y = 0) {
  const H = h; const m = new THREE.Mesh(wallGeo(sx, H, sz), mat); m.position.set(cx, y + H / 2, cz); m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (y === 0) cols.push({ cx, cz, sx, sz });
}

/** Merge all static meshes of a group that share a material into one mesh (big draw-call saver). */
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || Array.isArray(o.material)) return;
    for (let q = o; q && q !== root; q = q.parent) if (q.userData && q.userData.keep) return;
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
  if (def.special_ext === 'stockyard') return buildStockyard(def);
  if (def.special_ext === 'farm') return buildFarm(def, uid);
  const W = def.w * TILE, D = def.d * TILE, H = def.floors * WALL_H, T = WALL_T, rnd = mulberry32(uid * 7919 + 13);
  const g = new THREE.Group(), roof = new THREE.Group(), cols = [];
  const mat = facadeMaterial(def.wall), door = doorOffset(def.w), dw = DOOR_W;
  box(g, W + 0.7, 0.3, D + 0.7, 0x9a9b9c, 0, -0.2, 0);                       // pavement slab
  const homey = ['house', 'apartments'].includes(def.layout), paper = HOME_PAPER[uid % HOME_PAPER.length];
  const look = INTERIOR[def.layout] || (homey ? ['floor_wood', 0xa6825a, paper[0], paper[1]] : ['floor_wood', 0xa6825a, 'int_stucco', 0xc9bfa0]);
  const floor = new THREE.Mesh(unit, texMat(look[0], look[1], W / 4, D / 4)); floor.scale.set(W - 0.1, 0.12, D - 0.1); floor.position.y = 0.08; floor.receiveShadow = true; g.add(floor);   // interior floor
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
  // textured wall lining on the inside faces
  const lm = texMat(look[2], look[3], 1, 1, 0xb8b2a6), lh = ceilH - 0.24, iz = D / 2 - T - 0.02, ix = W / 2 - T - 0.02;
  lining(g, W - 2 * T, lh, 0, -D / 2 + T + 0.02, 0, lm);
  lining(g, D - 2 * T, lh, -ix, 0, Math.PI / 2, lm); lining(g, D - 2 * T, lh, ix, 0, -Math.PI / 2, lm);
  const fl0 = l1 - (-W / 2 + T), fr0 = (W / 2 - T) - r0;
  if (fl0 > 0.1) lining(g, fl0, lh, (-W / 2 + T + l1) / 2, iz, Math.PI, lm); if (fr0 > 0.1) lining(g, fr0, lh, (r0 + W / 2 - T) / 2, iz, Math.PI, lm);
  // open double doors, hinged at the jambs and swung into the room
  const rustic = RUSTIC.includes(def.wall), dkey = rustic ? 'wall_planks' : (uid % 2 ? 'door_green' : 'door_blue'), dcol = rustic ? 0x7a5230 : (uid % 2 ? 0x4a7a50 : 0x3f6fae);
  const single = def.w === 1, dmat = texMat(dkey, dcol, 1, 1), lw = single ? dw - 0.08 : dw / 2 - 0.04, hingeZ = fz - T / 2 - 0.05;
  for (const side of single ? [-1] : [-1, 1]) {
    const geo = new THREE.BoxGeometry(lw, 2.45, 0.06); geo.translate(-side * lw / 2, 1.25, 0);
    const leaf = new THREE.Mesh(geo, dmat); leaf.position.set(door + side * (dw / 2 - 0.02), 0.15, hingeZ); leaf.rotation.y = -side * (single ? 1.5 : 1.25); leaf.castShadow = true; g.add(leaf);
  }
  // striped shop awning over the door
  if (def.shopping || def.dining) {
    const cols2 = { chippy: [0x2a6aa8, 0xffffff], bakery: [0xd98a3a, 0xf4ecd9], newsagent: [0x2a7a3a, 0xf4ecd9], video: [0x2a3a8a, 0xf1c40f], bookies: [0x2a6a3a, 0xf4ecd9], tavern: [0x7a2a2a, 0xe8d8a8] }[def.id] || [0xc0392b, 0xf4ecd9];
    const aw = Math.min(W - 0.6, dw + 1.6), n = 6;
    for (let i = 0; i < n; i++) { const m = box(g, aw / n, 0.08, 1.15, cols2[i % 2], door - aw / 2 + (i + 0.5) * aw / n, 2.62, D / 2 + 0.55); m.rotation.x = 0.22; }
  }
  // sign above the door
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshBasicMaterial({ map: signTexture(def.name) }));
  sign.position.set(door, Math.min(2.95, H - 0.4), D / 2 + 0.02); g.add(sign);
  // roof
  roof.position.y = H;
  const rc = def.roofColor || 0x666666;
  if (def.roof === 'church') {
    const p = new THREE.Mesh(prism(W + 0.6, 3.6, D + 0.6), roofMaterial(rc, 'slate')); p.castShadow = true; roof.add(p);
    const tw = 3.2, tx = -W / 2 + tw / 2 + 0.2, tz = D / 2 - tw / 2 - 0.2, sm = facadeMaterial('stone');
    const tower = new THREE.Mesh(wallGeo(tw, 7, tw), sm); tower.position.set(tx, 3.5, tz); tower.castShadow = true; roof.add(tower);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(roof, 0.5, 0.7, 0.5, 0x8a867c, tx + ox * (tw / 2 - 0.25), 7, tz + oz * (tw / 2 - 0.25));
    box(roof, 1.0, 1.5, 0.08, 0x1a1a1a, tx, 4.6, tz + tw / 2 + 0.01);                       // belfry opening
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), stdMat(0xf4f0e0, { emissive: 0xfff0c0, emissiveIntensity: 0.3 })); clock.rotation.x = Math.PI / 2; clock.position.set(tx, 2.6, tz + tw / 2 + 0.05); roof.add(clock);
    box(roof, 0.06, 0.45, 0.04, 0x1a1a1a, tx, 2.6, tz + tw / 2 + 0.1); box(roof, 0.35, 0.06, 0.04, 0x1a1a1a, tx + 0.15, 2.6, tz + tw / 2 + 0.1);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(tw * 0.62, 5.5, 4), roofMaterial(0x3a424c, 'slate')); sp.rotation.y = Math.PI / 4; sp.position.set(tx, 7 + 2.75, tz); sp.castShadow = true; roof.add(sp);
    box(roof, 0.12, 1.2, 0.12, 0xd8c070, tx, 12.4, tz); box(roof, 0.6, 0.12, 0.12, 0xd8c070, tx, 12.9, tz);
    // stained glass on the front gable
    const sg = new THREE.Mesh(new THREE.CircleGeometry(1.0, 12), new THREE.MeshStandardMaterial({ color: 0x8a4ab8, emissive: 0x5a2a88, emissiveIntensity: 0.6 })); sg.position.set(W * 0.18, 1.3, D / 2 + 0.33); roof.add(sg);
  } else if (def.roof === 'gable' || def.roof === 'thatch') {
    const thatch = def.roof === 'thatch', alongZ = D >= W, ov = thatch ? 1.5 : 0.9, rh = thatch ? 1.5 + Math.min(W, D) * 0.34 : 1.0 + Math.min(W, D) * 0.28;
    const kind = thatch ? 'thatch' : (rc < 0x555566 ? 'slate' : 'tiles');
    const p = new THREE.Mesh(prism(alongZ ? W + ov : D + ov, rh, alongZ ? D + ov : W + ov), roofMaterial(rc, kind));
    if (!alongZ) p.rotation.y = Math.PI / 2; p.castShadow = true; roof.add(p);
    if (thatch) { const ridge = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.25 : W + ov, 0.22, alongZ ? D + ov : 0.25), stdMat(shadeHex(rc, 0.8))); ridge.position.y = rh; roof.add(ridge); }
    else if (def.id !== 'cottage' || true) box(roof, 0.6, 1.8, 0.6, 0x7a4a3a, W * 0.2, 0.5, -D * 0.12);
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
  } else if (def.park === 'camp') {
    return buildCamp(def, g, roof, cols);
  } else if (def.park === 'well') {
    return buildWell(def, g, roof, cols);
  } else if (def.park === 'postbox') {
    return buildPostbox(def, g, roof, cols);
  } else if (def.park === 'phonebox') {
    return buildPhonebox(def, g, roof, cols);
  } else if (def.park === 'busstop') {
    return buildBusStop(def, g, roof, cols);
  } else if (def.park === 'bandstand') {
    return buildBandstand(def, g, roof, cols, tree);
  } else if (def.park === 'allotment') {
    return buildAllotment(def, g, roof, cols, rnd);
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
  // gantry + the goods cage that comes down with deliveries
  box(g, W - 2, 0.6, 0.8, 0x2e343c, 0, 11.4, 0.5); for (const x of [-W / 2 + 1.2, W / 2 - 1.2]) { box(g, 0.6, 11.4, 0.6, 0x2e343c, x, 0, 0.5); cols.push({ cx: x, cz: 0.5, sx: 0.6, sz: 0.6 }); }
  const cage = new THREE.Group(); cage.userData.keep = true; g.add(cage); const REST = 9.6; cage.position.set(0, REST, 0.5);
  const cm = (w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(unit, stdMat(c, o)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = true; cage.add(m); return m; };
  cm(5.2, 0.2, 5.2, 0x3a4048, 0, 0, 0); for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) cm(0.14, 2.6, 0.14, 0xf1c40f, x, 0.2, z); cm(5.2, 0.16, 5.2, 0x3a4048, 0, 2.8, 0);
  for (const z of [-2.5, 2.5]) cm(5.2, 0.08, 0.06, 0xf1c40f, 0, 1.3, z);
  const lamp = cm(0.3, 0.2, 0.3, 0xff8a1a, 0, 2.96, 0, { emissive: 0xff6a1a, emissiveIntensity: 0.2 });
  const crates = new THREE.Group(); cage.add(crates);
  const cable = new THREE.Mesh(unit, stdMat(0x1a1a1a)); cable.userData.keep = true; g.add(cable);
  // intercom post outside the platform: Sam can order goods here
  const ix = W / 2 + 0.9, iz = D / 2 - 0.4; box(g, 0.14, 1.3, 0.14, 0x59616d, ix, 0, iz); box(g, 0.45, 0.6, 0.25, 0xf1c40f, ix, 1.2, iz); box(g, 0.3, 0.2, 0.03, 0x1a1a1a, ix, 1.45, iz + 0.13); box(g, 0.12, 0.12, 0.04, 0xc0392b, ix, 1.28, iz + 0.13, { emissive: 0xc0392b, emissiveIntensity: 0.8 });
  const anim = { t: -1, load: null, onLand: null };
  const deliver = (colors, onLand) => { anim.t = 0; anim.onLand = onLand; crates.clear(); colors.slice(0, 9).forEach((c, i) => { const m = new THREE.Mesh(unit, stdMat(c)); m.scale.set(0.9, 0.8, 0.9); m.position.set(-1.1 + (i % 3) * 1.1, 0.6 + Math.floor(i / 9) * 0.8, -1.1 + Math.floor(i / 3) * 1.1); m.castShadow = true; crates.add(m); }); };
  const update = (dt) => {
    let y = REST;
    if (anim.t >= 0) {
      anim.t += dt; const T = anim.t;
      if (T < 3) y = REST - (REST - 0.2) * (1 - Math.cos(Math.min(1, T / 3) * Math.PI)) / 2;
      else if (T < 5) { y = 0.2; if (anim.onLand) { const f = anim.onLand; anim.onLand = null; f(); crates.clear(); } }
      else if (T < 8) y = 0.2 + (REST - 0.2) * (1 - Math.cos(Math.min(1, (T - 5) / 3) * Math.PI)) / 2;
      else anim.t = -1;
      lamp.material.emissiveIntensity = anim.t >= 0 && Math.sin(T * 10) > 0 ? 1.6 : 0.2;
    }
    cage.position.y = y; const top = 11.4, len = Math.max(0.1, top - (y + 2.96)); cable.scale.set(0.08, len, 0.08); cable.position.set(0, y + 2.96 + len / 2, 0.5);
  };
  update(0);
  return { group: g, roof, colliders: cols, height: 11, update, everyFrame: true, deliver, hatch: { x: ix, z: iz + 0.9 }, busy: () => anim.t >= 0 };
}

function buildTunnel(def) {
  const W = def.w * TILE, D = def.d * TILE, g = new THREE.Group(), roof = new THREE.Group(), cols = [];
  box(g, W, 0.3, D, 0x55595f, 0, -0.16, 0);
  box(g, W + 4, 6, 6.5, 0x56704a, 0, 0, -D / 2 + 3.25); box(g, W + 1, 3, 5.2, 0x45603f, 0, 6, -D / 2 + 3.0); box(g, W - 3, 2, 4, 0x6f8a58, 0, 9, -D / 2 + 2.8);
  for (const [tx, tz, s] of [[-5, -5, 1], [4, -4.5, 1.2], [0, -5.5, 0.9], [7, -2, 0.8], [-7, -2.5, 1]]) { box(g, 0.3, 1.2, 0.3, 0x5a3b22, tx, 5.5, tz); const cn = new THREE.Mesh(new THREE.ConeGeometry(1.3 * s, 3 * s, 6), stdMat(0x2f6a3a, { flatShading: true })); cn.position.set(tx, 8.5 * 1, tz); cn.position.y = 7.4 + 1.5 * s; g.add(cn); }
  // hill
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

// ---------- primitive-era pieces ----------
function buildCamp(def, g, roof, cols) {
  g.clear(); const W = def.w * TILE, D = def.d * TILE;
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.12, 14), stdMat(0x8a7656)); dirt.position.y = 0.05; dirt.receiveShadow = true; g.add(dirt);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const st = box(g, 0.45, 0.32, 0.4, i % 2 ? 0x8d8a82 : 0x77746c, Math.cos(a) * 1.0, 0.05, Math.sin(a) * 1.0); st.rotation.y = a; }
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const lg = box(g, 1.2, 0.18, 0.18, 0x4a3320, Math.cos(a) * 0.35, 0.12, Math.sin(a) * 0.35); lg.rotation.y = a; }
  const fl = new THREE.Group(); fl.userData.keep = true; g.add(fl); const fm = new THREE.MeshBasicMaterial({ color: 0xff8a1a }), fm2 = new THREE.MeshBasicMaterial({ color: 0xffd24a });
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 5), fm); f1.position.y = 0.75; fl.add(f1); const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 5), fm2); f2.position.y = 0.6; fl.add(f2); const f3 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 5), fm); f3.position.set(0.3, 0.6, 0.2); fl.add(f3);
  // tripod + pot
  for (const [x, z] of [[-1.5, 0.2], [1.2, 0.9], [0.3, -1.4]]) { const pl = box(g, 0.07, 2.0, 0.07, 0x3a2a1a, x * 0.55, 0.0, z * 0.55); pl.rotation.z = (x > 0 ? -1 : 1) * 0.28; }
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.3, 8), stdMat(0x222222)); pot.position.y = 1.05; pot.castShadow = true; g.add(pot);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const lg = box(g, 1.7, 0.4, 0.5, 0x6a4a2a, Math.cos(a) * 2.5, 0.0, Math.sin(a) * 2.5); lg.rotation.y = -a + Math.PI / 2; box(g, 0.2, 0.2, 0.52, 0x5a3a1c, Math.cos(a) * 2.5 + 0.6 * Math.sin(a), 0.4, Math.sin(a) * 2.5 - 0.6 * Math.cos(a)).rotation.y = -a + Math.PI / 2; }
  cols.push({ cx: 0, cz: 0, sx: 2.4, sz: 2.4 });
  const update = (dt, t) => { const k = 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 29) * 0.08; f1.scale.set(1 + Math.sin(t * 13) * 0.08, k, 1); f2.scale.set(1, 1 + Math.sin(t * 23 + 1) * 0.2, 1); f3.scale.set(1, 1 + Math.sin(t * 19 + 2) * 0.25, 1); };
  return { group: g, roof, colliders: cols, height: 1.2, update, fire: { x: 0, y: 1.0, z: 0 }, smokeSrc: { x: 0, y: 1.6, z: 0 } };
}
/** A red English pillar box on a little paved square, with a flag that pops up when there is post. */
function buildPostbox(def, g, roof, cols) {
  g.clear(); const pave = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 3.2), stdMat(0xa29a8a)); pave.position.y = 0.05; pave.receiveShadow = true; g.add(pave);
  const red = stdMat(0xc0241e, { roughness: 0.55 }), black = stdMat(0x1a1a1a);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.35, 12), red); body.position.y = 0.8; body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 12), red); cap.position.y = 1.52; g.add(cap);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.position.y = 1.58; dome.castShadow = true; g.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.14, 12), black); base.position.y = 0.17; g.add(base);
  box(g, 0.42, 0.06, 0.06, 0x111111, 0, 1.22, 0.42); box(g, 0.3, 0.16, 0.02, 0xf0e6c8, 0, 0.9, 0.45);
  const flag = new THREE.Group(); flag.position.set(0.5, 1.0, 0); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), stdMat(0x333333)); pole.position.y = 0.3; const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.3), stdMat(0xffd23f)); f.position.set(0, 0.55, 0.15); flag.add(pole, f); g.add(flag);
  flag.userData.keep = true; g.userData.flag = flag;
  cols.push({ cx: 0, cz: 0, sx: 1.0, sz: 1.0 }); return { group: g, roof, colliders: cols, height: 1.8, flag };
}
/** The red K6 telephone box. */
function buildPhonebox(def, g, roof, cols) {
  g.clear(); const pave = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 3.2), stdMat(0xa29a8a)); pave.position.y = 0.05; pave.receiveShadow = true; g.add(pave);
  const red = 0xc0241e, glass = { color: 0x9fd0e8 };
  box(g, 1.1, 0.15, 1.1, red, 0, 0.1, 0);
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) box(g, 0.14, 2.3, 0.14, red, x, 0.25, z);
  for (const [x, z, sx, sz] of [[0, 0.5, 0.86, 0.04], [0, -0.5, 0.86, 0.04], [0.5, 0, 0.04, 0.86], [-0.5, 0, 0.04, 0.86]]) {
    box(g, sx, 1.8, sz, 0x9fd0e8, x, 0.45, z, { transparent: true, opacity: 0.55, roughness: 0.2 });
    for (let k = 0; k < 5; k++) box(g, sx || 0.05, 0.05, sz || 0.05, red, x, 0.45 + k * 0.42, z);
  }
  box(g, 1.15, 0.32, 1.15, red, 0, 2.55, 0); box(g, 1.0, 0.18, 1.0, red, 0, 2.87, 0);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), stdMat(red)); top.scale.y = 0.4; top.position.y = 3.02; g.add(top);
  for (const [x, z, r] of [[0, 0.585, 0], [0, -0.585, Math.PI], [0.585, 0, Math.PI / 2], [-0.585, 0, -Math.PI / 2]]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.2), new THREE.MeshBasicMaterial({ map: signTexture('TELEPHONE', '#1a1a1a') })); t.position.set(x, 2.71, z); t.rotation.y = r; g.add(t); }
  box(g, 0.3, 0.4, 0.2, 0x1a1a1a, 0, 1.2, -0.38);
  cols.push({ cx: 0, cz: 0, sx: 1.15, sz: 1.15 }); return { group: g, roof, colliders: cols, height: 3.2 };
}
function buildBusStop(def, g, roof, cols) {
  g.clear(); const pave = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 3.4), stdMat(0xa29a8a)); pave.position.y = 0.05; pave.receiveShadow = true; g.add(pave);
  box(g, 3.0, 2.2, 0.06, 0x9fd0e8, 0, 0.1, -1.3, { transparent: true, opacity: 0.45, roughness: 0.2 });
  for (const x of [-1.5, 1.5]) { box(g, 0.1, 2.4, 0.1, 0x2a5a3a, x, 0.1, -1.3); box(g, 0.06, 2.2, 1.2, 0x9fd0e8, x, 0.1, -0.7, { transparent: true, opacity: 0.45 }); }
  box(g, 3.3, 0.12, 1.6, 0x2a5a3a, 0, 2.5, -0.75); box(g, 2.4, 0.08, 0.45, 0x8a5a33, 0, 0.5, -0.9); box(g, 0.08, 0.5, 0.3, 0x333, -1.0, 0, -0.9); box(g, 0.08, 0.5, 0.3, 0x333, 1.0, 0, -0.9);
  box(g, 0.8, 0.4, 0.02, 0x1a1a1a, 0.6, 1.4, -1.25); box(g, 0.5, 0.3, 0.02, 0xf1c40f, -0.6, 1.0, -1.25);          // graffiti + timetable
  box(g, 0.08, 2.7, 0.08, 0x666, 1.6, 0.1, 1.2); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 14), stdMat(0xc0241e)); s.rotation.x = Math.PI / 2; s.position.set(1.6, 2.65, 1.2); g.add(s);
  const bus = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), new THREE.MeshBasicMaterial({ map: signTexture('BUS', '#1a3a8a') })); bus.position.set(1.6, 2.65, 1.23); g.add(bus);
  cols.push({ cx: 0, cz: -1.3, sx: 3.0, sz: 0.2 }, { cx: -1.5, cz: -0.7, sx: 0.2, sz: 1.2 }, { cx: 1.5, cz: -0.7, sx: 0.2, sz: 1.2 }); return { group: g, roof, colliders: cols, height: 2.7 };
}
function buildBandstand(def, g, roof, cols, tree) {
  box(g, 1.0, 0.04, 3.0, 0xcdb58a, 0, 0.1, 2.6);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, 0.7, 8), stdMat(0xd8d0c0)); base.position.y = 0.35; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.06, 8), stdMat(0x8a5a33)); deck.position.y = 0.72; g.add(deck);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; box(g, 0.14, 2.6, 0.14, 0xf4f4f0, Math.cos(a) * 2.35, 0.72, Math.sin(a) * 2.35); if (i !== 2) { const r = box(g, 1.75, 0.08, 0.06, 0xf4f4f0, Math.cos(a + Math.PI / 8) * 2.18, 1.4, Math.sin(a + Math.PI / 8) * 2.18); r.rotation.y = -(a + Math.PI / 8) + Math.PI / 2; } }
  const rf = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.6, 8), stdMat(0x2a6a4a, { flatShading: true })); rf.position.y = 3.3 + 0.8; rf.rotation.y = Math.PI / 8; rf.castShadow = true; g.add(rf);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 0.25, 8), stdMat(0xf4f4f0)); trim.position.y = 3.32; trim.rotation.y = Math.PI / 8; g.add(trim);
  box(g, 0.1, 0.6, 0.1, 0xd8c070, 0, 4.8, 0);
  for (const x of [-0.8, 0.6]) { box(g, 0.5, 0.05, 0.5, 0x333, x, 1.6, -0.4); box(g, 0.04, 0.9, 0.04, 0x333, x, 0.75, -0.4); }    // music stands
  for (const [x, z] of [[-2.9, 2.6], [2.9, 2.6]]) { box(g, 2.0, 0.08, 0.5, 0x8a5a33, x, 0.45, z); box(g, 2.0, 0.45, 0.08, 0x8a5a33, x, 0.5, z - 0.22); }
  tree(-3.2, -3.2, 0.8); tree(3.2, -3.2, 0.8);
  cols.push({ cx: 0, cz: 0, sx: 4.6, sz: 4.6 }); return { group: g, roof, colliders: cols, height: 4.2 };
}
function buildAllotment(def, g, roof, cols, rnd) {
  g.clear(); const W = def.w * TILE, D = def.d * TILE;
  const grass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.1, D - 0.3), stdMat(0x5e8a3e)); grass.position.y = 0.03; grass.receiveShadow = true; g.add(grass);
  const greens = [0x4a8a2a, 0x6aa63a, 0x3a7a3a, 0x8aa64a];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 1.3 + (i % 2) * 2.7, z = -D / 2 + 1.4 + Math.floor(i / 2) * 3.0; box(g, 2.3, 0.18, 2.4, 0x5a4026, x, 0, z);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) { const h = 0.25 + rnd() * 0.35; box(g, 0.32, h, 0.32, greens[(i + k) % 4], x - 0.85 + j * 0.56, 0.18, z - 0.85 + k * 0.56); }
    if (i === 1) for (const cx of [-0.6, 0, 0.6]) box(g, 0.04, 1.6, 0.04, 0x9a7a4a, x + cx, 0.18, z - 1.0);
  }
  box(g, 1.6, 1.9, 1.3, 0x5a6a4a, W / 2 - 1.1, 0, D / 2 - 0.9); const rf = new THREE.Mesh(prism(1.9, 0.6, 1.6), stdMat(0x3a3a3a)); rf.position.set(W / 2 - 1.1, 1.9, D / 2 - 0.9); rf.rotation.y = Math.PI / 2; g.add(rf);
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10), stdMat(0x2a4a2a)); butt.position.set(W / 2 - 2.3, 0.45, D / 2 - 0.6); g.add(butt);
  box(g, 0.6, 0.06, 0.3, 0x6a4a2a, -W / 2 + 0.8, 0.5, D / 2 - 0.6); box(g, 0.06, 0.5, 0.25, 0x333, -W / 2 + 0.55, 0, D / 2 - 0.6); box(g, 0.06, 0.5, 0.25, 0x333, -W / 2 + 1.05, 0, D / 2 - 0.6);
  cols.push({ cx: W / 2 - 1.1, cz: D / 2 - 0.9, sx: 1.6, sz: 1.3 }); return { group: g, roof, colliders: cols, height: 2.5 };
}
function buildWell(def, g, roof, cols) {
  g.clear(); const dirt = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.1, 10), stdMat(0x8a8272)); dirt.position.y = 0.04; g.add(dirt);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.02, 1.0, 10), stdMat(0x8d8a82, { flatShading: true })); ring.position.y = 0.5; ring.castShadow = true; g.add(ring);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 10), stdMat(0x1f4f7a)); water.position.y = 0.95; g.add(water);
  box(g, 0.14, 2.3, 0.14, 0x5a3b22, -0.95, 0.0, 0); box(g, 0.14, 2.3, 0.14, 0x5a3b22, 0.95, 0.0, 0); box(g, 2.3, 0.14, 0.14, 0x5a3b22, 0, 2.25, 0);
  const rf = new THREE.Mesh(prism(2.7, 0.8, 1.7), roofMaterial(0x7a5a38, 'thatch')); rf.position.y = 2.3; rf.rotation.y = Math.PI / 2; rf.castShadow = true; g.add(rf);
  box(g, 0.05, 0.9, 0.05, 0x3a2a1a, 0, 1.3, 0); box(g, 0.28, 0.28, 0.28, 0x6a4a2a, 0, 0.95, 0);
  cols.push({ cx: 0, cz: 0, sx: 2.0, sz: 2.0 }); return { group: g, roof, colliders: cols, height: 2.5 };
}
function buildStockyard(def) {
  const W = def.w * TILE, D = def.d * TILE, g = new THREE.Group(), roof = new THREE.Group(), cols = [], off = doorOffset(def.w);
  box(g, W, 0.14, D, 0x8a7550, 0, -0.04, 0);
  const post = (x, z) => box(g, 0.2, 1.6, 0.2, 0x5a3b22, x, 0, z);
  for (let x = -W / 2 + 0.2; x <= W / 2 - 0.1; x += 2) { post(x, -D / 2 + 0.15); if (Math.abs(x - off) > 1.6) post(x, D / 2 - 0.15); }
  for (let z = -D / 2 + 0.2; z <= D / 2 - 0.1; z += 2) { post(-W / 2 + 0.15, z); post(W / 2 - 0.15, z); }
  for (const y of [0.6, 1.2]) { box(g, W, 0.1, 0.1, 0x7a5a38, 0, y, -D / 2 + 0.15); box(g, W / 2 + off - 1.2, 0.1, 0.1, 0x7a5a38, -W / 4 + off / 2 - 0.6 - 0.0, y, D / 2 - 0.15).position.x = (-W / 2 + (off - 1.2)) / 2; box(g, W / 2 - off - 1.2, 0.1, 0.1, 0x7a5a38, 0, y, D / 2 - 0.15).position.x = ((off + 1.2) + W / 2) / 2; box(g, 0.1, 0.1, D, 0x7a5a38, -W / 2 + 0.15, y, 0); box(g, 0.1, 0.1, D, 0x7a5a38, W / 2 - 0.15, y, 0); }
  cols.push({ cx: 0, cz: -D / 2 + 0.15, sx: W, sz: 0.3 }, { cx: -W / 2 + 0.15, cz: 0, sx: 0.3, sz: D }, { cx: W / 2 - 0.15, cz: 0, sx: 0.3, sz: D }, { cx: (-W / 2 + (off - 1.2)) / 2, cz: D / 2 - 0.15, sx: off - 1.2 + W / 2, sz: 0.3 }, { cx: ((off + 1.2) + W / 2) / 2, cz: D / 2 - 0.15, sx: W / 2 - off - 1.2, sz: 0.3 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('Stockyard', '#3a2a14') })); sign.position.set(off, 1.9, D / 2 - 0.1); box(g, 0.12, 2.0, 0.12, 0x5a3b22, off - 1.3, 0, D / 2 - 0.1); box(g, 0.12, 2.0, 0.12, 0x5a3b22, off + 1.3, 0, D / 2 - 0.1); g.add(sign);
  // dynamic piles
  const piles = new THREE.Group(); piles.userData.keep = true; g.add(piles); const groups = {}; const mk = (mat, fn, n, x0, z0) => { const gr = new THREE.Group(); gr.position.set(x0, 0.05, z0); piles.add(gr); groups[mat] = []; for (let i = 0; i < n; i++) { const m = fn(i); m.visible = false; gr.add(m); groups[mat].push(m); } };
  const bx = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(c));
  mk('timber', (i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 7), stdMat(i % 2 ? 0x8a5a33 : 0x7a4a28)); m.rotation.z = Math.PI / 2; const row = i < 5 ? 0 : i < 9 ? 1 : 2, k = row === 0 ? i : row === 1 ? i - 5 + 0.5 : i - 9 + 1; m.position.set(0, 0.2 + row * 0.35, (k - 2) * 0.42); return m; }, 12, -W / 2 + 2.2, -D / 2 + 1.6);
  mk('stone', (i) => { const m = bx(0.8 + (i % 3) * 0.2, 0.5, 0.7, i % 2 ? 0x9a9a92 : 0x84847c); m.position.set(((i % 4) - 1.5) * 0.85, 0.25 + (i > 7 ? 0.5 : 0), ((i / 4) | 0) % 2 * 0.8 - 0.3); m.rotation.y = i * 0.7; return m; }, 12, -W / 6 - 0.2, -D / 2 + 1.5);
  mk('brick', (i) => { const m = bx(0.45, 0.22, 0.22, 0xa8442f); const r = (i / 4) | 0; m.position.set(((i % 4) - 1.5) * 0.5, 0.11 + r * 0.23, 0); return m; }, 12, W / 6 + 0.6, -D / 2 + 1.4);
  mk('steel', (i) => { const m = bx(0.14, 0.14, 2.2, 0x8b97a3); m.position.set(((i % 4) - 1.5) * 0.18, 0.1 + ((i / 4) | 0) * 0.15, 0); return m; }, 12, W / 2 - 1.5, -D / 2 + 1.5);
  mk('glass', (i) => { const m = bx(0.8, 0.7, 0.5, 0x8fd0e8); m.material = stdMat(0x8fd0e8, { transparent: true, opacity: 0.8 }); m.position.set(((i % 3) - 1) * 0.9, 0.35 + ((i / 3) | 0) * 0.72, 0); return m; }, 9, -W / 2 + 1.6, 1.0);
  mk('food', (i) => { const m = bx(0.55, 0.3, 0.4, i % 2 ? 0xd9c28a : 0xc9b27a); m.position.set(((i % 4) - 1.5) * 0.6, 0.15 + ((i / 8) | 0) * 0.3, ((i / 4) | 0) % 2 * 0.5); return m; }, 12, W / 2 - 2.2, 1.0);
  const per = { timber: 2, stone: 2, brick: 6, steel: 2, glass: 2, food: 3 };
  const update = (dt, t, stock) => { for (const [mat, list] of Object.entries(groups)) { const n = Math.min(list.length, Math.ceil((stock[mat] || 0) / per[mat])); for (let i = 0; i < list.length; i++) list[i].visible = i < n; } };
  return { group: g, roof, colliders: cols, height: 2, update };
}
function buildFarm(def, uid) {
  const W = def.w * TILE, D = def.d * TILE, g = new THREE.Group(), roof = new THREE.Group(), cols = [], rnd = mulberry32(uid * 17 + 3);
  box(g, W, 0.12, D, 0x6b5a3a, 0, -0.04, 0);
  // barn (back-left)
  const bw = W * 0.5, bd = D * 0.5, bx = -W / 2 + bw / 2 + 0.2, bz = -D / 2 + bd / 2 + 0.2, mat = facadeMaterial('timber');
  for (const [cx, cz, sx, sz] of [[bx, bz - bd / 2, bw, 0.3], [bx - bw / 2, bz, 0.3, bd], [bx + bw / 2, bz, 0.3, bd], [bx - bw * 0.3, bz + bd / 2, bw * 0.4, 0.3], [bx + bw * 0.3, bz + bd / 2, bw * 0.4, 0.3]]) { const m = new THREE.Mesh(wallGeo(sx, 3.6, sz), mat); m.position.set(cx, 1.8, cz); m.castShadow = true; g.add(m); cols.push({ cx, cz, sx, sz }); }
  const rf = new THREE.Mesh(prism(bw + 1, 2.2, bd + 0.8), roofMaterial(0x8a3a2a, 'tiles')); rf.position.set(bx, 3.6, bz); rf.rotation.y = Math.PI / 2; rf.castShadow = true; roof.add(rf);
  // fields
  const fields = []; const fx0 = -W / 2 + bw + 1.2, plots = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) plots.push([fx0 + 1.5 + c * 3.1, -D / 2 + 1.7 + r * 3.1]);
  for (let c = 0; c < 4; c++) plots.push([-W / 2 + 1.7 + c * 3.1, D / 2 - 1.9]);
  for (const [px, pz] of plots) { box(g, 2.7, 0.14, 2.7, 0x5a4026, px, 0, pz); const crops = new THREE.Group(); crops.userData.keep = true; crops.position.set(px, 0.1, pz); g.add(crops); const rows = []; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1, 0.2), new THREE.MeshStandardMaterial({ color: 0x6aa63a, roughness: 1 })); m.position.set(0, 0, -1 + k * 0.66); crops.add(m); rows.push(m); } fields.push({ x: px, z: pz, rows }); }
  for (let x = -W / 2; x <= W / 2; x += 2) box(g, 0.14, 0.9, 0.14, 0x6a4a2a, x, 0, D / 2 - 0.1); box(g, W, 0.08, 0.08, 0x7a5a38, 0, 0.7, D / 2 - 0.1);
  const update = (dt, t, stock, b) => { for (let i = 0; i < fields.length; i++) { const f = fields[i], node = b && b.fieldNodes && b.fieldNodes[i], gr = node ? node.amount / node.max : 0.6; for (const r of f.rows) { r.scale.y = 0.15 + gr * 0.85; r.position.y = (0.15 + gr * 0.85) / 2; r.material.color.setHex(gr > 0.7 ? 0xc9b44a : 0x6aa63a); } } };
  return { group: g, roof, colliders: cols, height: 4, update, fieldPlots: plots };
}
