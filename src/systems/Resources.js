import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { T } from '../world/World.js';
import { Assets } from '../render/Assets.js';

// shared materials and shapes: hundreds of rocks, bushes and berries cost only a handful of GPU states
const MC = {}, mat = (c, o = {}) => { const k = c + JSON.stringify(o); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true, ...o })); };
const rockMat = (c) => { const k = 'rock' + c; return MC[k] || (MC[k] = Assets.has('rock') ? new THREE.MeshStandardMaterial({ color: new THREE.Color(0xffffff).lerp(new THREE.Color(c), 0.35), map: Assets.tex('rock', 2, 2), roughness: 1, flatShading: true }) : mat(c)); };
const GC = {}, geo = (k, f) => GC[k] || (GC[k] = f());
const rockGeo = new THREE.DodecahedronGeometry(1, 0);

/** Gatherable resource nodes: trees (from Terrain), rocks, ore, clay, berries, farm fields; plus sand and fish. */
export class Resources {
  constructor(game) {
    this.game = game; this.world = game.world; this.terrain = game.terrain; this.nodes = []; this.shaking = []; this.group = new THREE.Group(); this.group.visible = false; game.scene.add(this.group); this.batches = []; this.batchDirty = true;   // nodes are drawn through a few instanced batches (see syncBatches)
    for (const sd of this.world.nodeSeeds) this.addNode({ ...sd });
    // nothing grows or lies on top of a building plot
    this.world.events.on('building:added', (b) => { this.batchDirty = true; for (const n of this.nodes) if (n.mesh && n.tx >= b.x0 - 1 && n.tx < b.x0 + b.w + 1 && n.tz >= b.z0 - 1 && n.tz < b.z0 + b.d + 1 && (b.def.special || (n.tx >= b.x0 && n.tx < b.x0 + b.w && n.tz >= b.z0 && n.tz < b.z0 + b.d))) { n.amount = 0; n.max = n.max || 1; this.group.remove(n.mesh); n.mesh = null; n.gone = true; n.regen = 0; } });
  }
  /** A hit lands on a bush / rock: it shudders. */
  shake(n) { if (n.mesh) { n.shakeT = 0.35; if (!this.shaking.includes(n)) this.shaking.push(n); } }
  /** Draw every rock, bush, berry and clay pit with one instanced draw per shape+material (was one draw per piece). */
  syncBatches() {
    const sc = this.game.scene;
    if (this.batchDirty) {
      this.batchDirty = false; for (const b of this.batches) { sc.remove(b.im); b.im.dispose(); } this.batches = []; const map = new Map();
      this.group.traverse((m) => { if (!m.isMesh) return; const k = m.geometry.uuid + '|' + m.material.uuid; let b = map.get(k); if (!b) map.set(k, b = { list: [], geo: m.geometry, mat: m.material, cast: m.castShadow, recv: m.receiveShadow }); b.list.push(m); });
      for (const b of map.values()) { b.im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length); b.im.castShadow = b.cast; b.im.receiveShadow = b.recv; b.im.frustumCulled = false; sc.add(b.im); this.batches.push(b); }
    }
    this.group.updateMatrixWorld(true); const zero = this.zeroM || (this.zeroM = new THREE.Matrix4().makeScale(0, 0, 0));
    for (const b of this.batches) { for (let i = 0; i < b.list.length; i++) { const m = b.list[i]; let on = m.visible && !!m.parent; for (let q = m.parent; on && q && q !== this.group; q = q.parent) on = q.visible && !!q.parent; b.im.setMatrixAt(i, on ? m.matrixWorld : zero); } b.im.instanceMatrix.needsUpdate = true; }
  }
  animate(dt) { this.syncBatches(); for (const n of this.shaking) { n.shakeT -= dt; const k = Math.max(0, n.shakeT / 0.35); n.mesh.rotation.z = Math.sin(n.shakeT * 45) * 0.08 * k; n.mesh.rotation.x = Math.cos(n.shakeT * 37) * 0.05 * k; } this.shaking = this.shaking.filter((n) => n.shakeT > 0); }
  addNode(n) {
    n.reserved = null; n.type = n.kind; n.x = (n.tx + 0.5) * TILE; n.z = (n.tz + 0.5) * TILE; n.mesh = this.makeMesh(n); if (n.mesh) { n.mesh.position.set(n.x, 0, n.z); this.group.add(n.mesh); this.batchDirty = true; } this.nodes.push(n); this.visual(n); return n;
  }
  makeMesh(n) {
    const g = new THREE.Group(), rnd = Math.random;
    if (n.kind === 'rock' || n.kind === 'ore') {
      for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(rockGeo, rockMat(n.kind === 'ore' ? [0x4a4a52, 0x56565e, 0x3e3e46][i] : [0x8d8a82, 0x7a776f, 0x9a978d][i])); const s = [1.5, 1.0, 0.8][i]; m.scale.set(s * 1.2, s * 0.9, s); m.position.set((i - 1) * 1.1, s * 0.6, (i % 2) * 0.9 - 0.4); m.rotation.set(rnd(), rnd() * 3, rnd()); m.castShadow = true; g.add(m); }
      if (n.kind === 'ore') for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(geo('ore', () => new THREE.BoxGeometry(0.22, 0.22, 0.22)), mat(0xc2703a, { emissive: 0x6a2a0a, emissiveIntensity: 0.4 })); m.position.set((rnd() - 0.5) * 3, 0.5 + rnd() * 1.1, (rnd() - 0.5) * 2); g.add(m); }
    } else if (n.kind === 'berry') {
      const b = new THREE.Mesh(geo('bush', () => new THREE.IcosahedronGeometry(1.0, 0)), mat(0x3a7a32)); b.position.y = 0.8; b.scale.set(1.3, 0.9, 1.1); b.castShadow = true; g.add(b);
      for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(geo('berry', () => new THREE.BoxGeometry(0.16, 0.16, 0.16)), mat(i % 3 ? 0xc0243a : 0x7a2a8a)); m.position.set((rnd() - 0.5) * 2, 0.7 + rnd() * 0.7, (rnd() - 0.5) * 1.6); g.add(m); n.berries = n.berries || []; n.berries.push(m); }
    } else if (n.kind === 'clay') {
      const m = new THREE.Mesh(geo('clay', () => new THREE.CylinderGeometry(1.7, 2.0, 0.35, 8)), mat(0xa6683a)); m.position.y = 0.12; m.receiveShadow = true; g.add(m);
      const p = new THREE.Mesh(geo('pool', () => new THREE.CylinderGeometry(0.8, 0.9, 0.05, 8)), mat(0x4a5a6a)); p.position.set(0.6, 0.32, 0.3); g.add(p);
    } else return null;
    return g;
  }
  visual(n) {
    if (!n.mesh) return; const f = n.amount / n.max;
    if (n.kind === 'rock' || n.kind === 'ore') { const s = 0.35 + 0.65 * f; n.mesh.scale.setScalar(s); }
    else if (n.kind === 'berry') { for (const [i, m] of (n.berries || []).entries()) m.visible = i < Math.ceil(f * n.berries.length); }
    else if (n.kind === 'clay') n.mesh.scale.y = 0.5 + 0.5 * f;
  }

  /** Nearest free node of a kind (trees from the terrain list). */
  findNode(kind, fx, fz, sim = null) {
    let best = null, bd = 1e12;
    if (kind === 'tree') {
      for (const t of this.terrain.trees) { if (!t.alive || (t.reserved && t.reserved !== sim)) continue; const d = (t.x - fx) ** 2 + (t.z - fz) ** 2; if (d < bd && this.standPoint(t, t)) { bd = d; best = t; } }
      return best && Object.assign(best, { type: 'tree', kind: 'tree' });
    }
    if (kind === 'sand') return this.shoreNode('sand', fx, fz);
    if (kind === 'fish') return this.shoreNode('fish', fx, fz);
    for (const n of this.nodes) { if (n.kind !== kind || n.amount < 1 || (n.reserved && n.reserved !== sim)) continue; const d = (n.x - fx) ** 2 + (n.z - fz) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  }
  /** Virtual infinite nodes: a beach tile for sand, a shoreline tile facing water for fishing. */
  shoreNode(kind, fx, fz) {
    const w = this.world; let best = null, bd = 1e12;
    for (let z = 2; z < MAP - 2; z++) for (let x = 2; x < MAP - 2; x++) {
      const i = w.idx(x, z); if (w.block[i] || w.occ[i] || w.road[i]) continue;
      if (kind === 'sand') { if (w.terrain[i] !== T.SAND) continue; }
      else { if (!w.isLand(x, z)) continue; let wet = false; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.inBounds(x + dx, z + dz) && w.terrain[w.idx(x + dx, z + dz)] === T.WATER) wet = true; if (!wet) continue; }
      const px = (x + 0.5) * TILE, pz = (z + 0.5) * TILE, d = (px - fx) ** 2 + (pz - fz) ** 2; if (d < bd) { bd = d; best = { kind, type: kind, tx: x, tz: z, x: px, z: pz, amount: 999, max: 999, infinite: true }; }
    }
    return best;
  }
  /** Where a gatherer should stand to work on a node (null if unreachable). */
  standPoint(n, from) {
    const w = this.world;
    if (n.infinite || n.kind === 'berry' || n.kind === 'clay' || n.kind === 'field') { const [tx, tz] = [n.tx, n.tz]; if (w.walkable(tx, tz)) return { x: n.x + (n.kind === 'field' ? 0 : 1.4), z: n.z + 1.0 }; }
    let best = null, bd = 1e9;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const tx = n.tx + dx, tz = n.tz + dz; if (!w.walkable(tx, tz)) continue;
      const cx = (tx + 0.5) * TILE, cz = (tz + 0.5) * TILE, d = Math.hypot(cx - n.x, cz - n.z); if (d < bd) { bd = d; best = { cx, cz }; }
    }
    if (!best) return null; const dx = n.x - best.cx, dz = n.z - best.cz, l = Math.hypot(dx, dz) || 1, k = Math.max(0, l - (n.kind === 'tree' ? 1.25 : 1.6));   // walk in (into the edge of the wood if need be) to arm's length
    return { x: best.cx + dx / l * k, z: best.cz + dz / l * k };
  }
  /** Take one unit from a node. Returns true if a unit was obtained. */
  take(n) {
    if (n.kind === 'tree') { this.terrain.chopTree(n); n.reserved = null; return true; }
    if (n.infinite) return true; if (n.amount < 1) return false; n.amount -= 1; this.visual(n); if (n.amount < 1) n.reserved = null; return true;
  }
  /** Farms create crop plots that regrow. */
  addFields(b, plots) {
    b.fieldNodes = plots.map(([lx, lz]) => { const [x, z] = b.toWorld(lx, lz); return this.addNode({ kind: 'field', tx: Math.floor(x / TILE), tz: Math.floor(z / TILE), amount: 6, max: 6, regen: 1 / 25, farm: b }); });
    for (const n of b.fieldNodes) { n.x -= 0; n.mesh = null; n.x = n.x; }
    plots.forEach(([lx, lz], i) => { const [x, z] = b.toWorld(lx, lz); b.fieldNodes[i].x = x; b.fieldNodes[i].z = z; });
  }
  removeFields(b) { if (!b.fieldNodes) return; this.nodes = this.nodes.filter((n) => !b.fieldNodes.includes(n)); b.fieldNodes = null; }
  update(dt) {
    for (const n of this.nodes) { if (n.amount < n.max && n.regen) { n.amount = Math.min(n.max, n.amount + n.regen * dt); if (n.kind !== 'field' && Math.floor(n.amount * 4) !== Math.floor((n.amount - n.regen * dt) * 4)) this.visual(n); } }
  }
}
