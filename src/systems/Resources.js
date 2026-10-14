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
    this.world.nodeSeeds.forEach((sd, i) => this.addNode({ ...sd, seedId: i })); this.moves = []; this.moved = {};
    // nothing grows or lies on top of a building plot
    this.world.events.on('building:added', (b) => { this.batchDirty = true; for (const n of this.nodes) if (n.mesh && n.tx >= b.x0 - 1 && n.tx < b.x0 + b.w + 1 && n.tz >= b.z0 - 1 && n.tz < b.z0 + b.d + 1 && (b.def.special || (n.tx >= b.x0 && n.tx < b.x0 + b.w && n.tz >= b.z0 && n.tz < b.z0 + b.d))) { n.amount = 0; n.max = n.max || 1; this.group.remove(n.mesh); n.mesh = null; n.gone = true; n.regen = 0; } });
  }
  // ---------- moving a bush or a rock out of the way (the Move tool in the planning view) ----------
  movable(n) { return n && n.mesh && ['berry', 'rock', 'ore', 'clay'].includes(n.kind) && n.seedId !== undefined; }
  nodeAt(tx, tz) { return this.nodes.find((n) => n.tx === tx && n.tz === tz && this.movable(n)) || null; }
  canReplant(tx, tz) { return this.clearFor(tx, tz) && !this.moves.some((m) => m.tx === tx && m.tz === tz); }
  /** Is the ground still clear for a replant (nothing built, paved or planned there since)? */
  clearFor(tx, tz) { const w = this.world, i = w.idx(tx, tz); return w.isLand(tx, tz) && !w.occ[i] && !w.road[i] && !w.res[i] && !w.block[i] && !this.game.roadPlans.get(tx, tz); }
  requestMove(n, tx, tz) {
    const g = this.game; if (this.moves.some((m) => m.n === n)) { g.ui.toast('That one is already being moved.'); return false; }
    if (!this.canReplant(tx, tz)) { g.ui.toast('It can\'t go there: pick clear ground.'); return false; }
    const [sx, sz] = [n.tx, n.tz]; if (!this.world.findPath(sx, sz, tx, tz)) { g.ui.toast('There\'s no way to carry it over there.'); return false; }
    this.moves.push({ n, tx, tz, sim: null, t: 0, fails: 0, tried: [] }); g.ui.toast(`A villager will dig up the ${this.label(n)} and move it.`, 2600); return true;
  }
  /** The spot was taken: the nearest clear tile next to it will do (true), or there isn't one. */
  retarget(m) { if (this.clearFor(m.tx, m.tz)) return true; for (let r = 1; r <= 2; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = m.tx + dx, z = m.tz + dz; if (Math.max(Math.abs(dx), Math.abs(dz)) === r && this.world.inBounds(x, z) && this.canReplant(x, z)) { m.tx = x; m.tz = z; return true; } } return false; }
  label(n) { return { berry: 'berry bush', rock: 'rock', ore: 'iron ore', clay: 'clay pit' }[n.kind] || 'rock'; }
  /** Give up on a move for good, and say why (the bush stays, or goes back, where it was). */
  cancelMove(m, why) {
    const s = m.sim; if (s && s.moveJob === m) this.drop(m, s); if (m.n.mesh && !m.n.mesh.visible) { m.n.mesh.visible = true; this.batchDirty = true; }
    this.moves = this.moves.filter((q) => q !== m); this.game.messages.push('Planning Office', why, 'warn');
  }
  /** One go at it didn't work out: put it back, let someone else try in a while, and stop after a few goes. */
  failMove(m, s) {
    if (m.n.mesh && !m.n.mesh.visible) { m.n.mesh.visible = true; this.batchDirty = true; }
    this.drop(m, s); m.fails = (m.fails || 0) + 1; (m.tried = m.tried || []).push(s.id); m.waitT = this.game.elapsed + 12;
    if (m.fails >= 3) this.cancelMove(m, `Nobody could get the ${this.label(m.n)} over to where you wanted it, so it's staying put.`);
  }
  /** Put a node on another tile (the world's blocking and the ground painting follow it). */
  moveNode(n, tx, tz) {
    const w = this.world, o = w.idx(n.tx, n.tz), i = w.idx(tx, tz), id = w.res[o]; w.res[o] = 0; if (n.kind === 'rock' || n.kind === 'ore') w.block[o] = 0;
    const ox = n.tx, oz = n.tz; n.tx = tx; n.tz = tz; n.x = (tx + 0.5) * TILE; n.z = (tz + 0.5) * TILE; w.res[i] = id || n.seedId + 1; if (n.kind === 'rock' || n.kind === 'ore') w.block[i] = 1;
    if (w.nodeSeeds[n.seedId]) { w.nodeSeeds[n.seedId].tx = tx; w.nodeSeeds[n.seedId].tz = tz; } this.moved[n.seedId] = [tx, tz];
    if (n.mesh) { n.mesh.position.set(n.x, 0, n.z); n.mesh.visible = true; } this.batchDirty = true;
    if (this.terrain && this.terrain.paintAround) { this.terrain.paintAround(ox, oz); this.terrain.paintAround(tx, tz); this.terrain.tex.needsUpdate = true; }
  }
  /** Hand waiting jobs to someone free (off work, awake, outdoors or at home). */
  assignMoves(dt) {
    this.moveAcc = (this.moveAcc || 0) - dt; if (this.moveAcc > 0) return; this.moveAcc = 2;
    for (const m of this.moves.slice()) {
      if (!(m.sim && m.phase >= 3) && !this.retarget(m)) { this.cancelMove(m, `The spot you picked for the ${this.label(m.n)} has been built on or dug up, so it's staying where it is.`); continue; }
      if (m.sim && (m.sim.remove || m.sim.moveJob !== m)) m.sim = null; if (m.sim) continue; m.t += 2; if (m.waitT && this.game.elapsed < m.waitT) continue;
      const tried = m.tried || [], free = this.game.population.sims.filter((s) => s.kind === 'resident' && s.age >= 14 && s.age < 70 && !s.moveJob && s.pose !== 'sleep' && !(s.down > 0) && !s.fight && !s.dead && ['leisure', 'home', 'visit', 'work'].includes(s.activity) && (s.activity !== 'work' || s.role === 'forager' || s.role === 'builder' || s.role === 'farmer'));
      free.sort((a, b) => (tried.includes(a.id) - tried.includes(b.id)) || Math.hypot(a.x - m.n.x, a.z - m.n.z) - Math.hypot(b.x - m.n.x, b.z - m.n.z));
      const s = free[0]; if (s) { s.moveJob = m; m.sim = s; m.phase = 0; m.tt = 0; } else if (m.t > 30 && !m.warned) { m.warned = true; this.game.ui.toast('Nobody is free to move it yet: someone will when they knock off work.', 2600); }
    }
  }
  /** The mover: walk there, dig it up, carry it over, plant it. (called from Sim.think) */
  driveMove(s, dt) {
    const m = s.moveJob, g = this.game; if (!m || !this.moves.includes(m)) { s.moveJob = null; s.bag = false; return; }
    m.tt = (m.tt || 0) + dt;
    s.hurry = true;
    if ((m.phase === 1 || m.phase === 3) && m.tt > 120) { this.failMove(m, s); return; }   // never got there (stuck behind something): let someone else have a go
    if (m.phase === 0) { const sp = this.standPoint(m.n, s) || { x: m.n.x + 1.4, z: m.n.z + 1.0 }; if (!s.goTo({ x: sp.x, z: sp.z })) { this.failMove(m, s); return; } m.phase = 1; m.tt = 0; }
    else if (m.phase === 1 && !s.path.length) { m.phase = 2; m.tt = 0; s.faceGoal = Math.atan2(m.n.x - s.x, m.n.z - s.z); g.social.say(s, 'Right, out you come...', 2); }
    else if (m.phase === 2) { s.digging = true; if (m.tt > 3) { s.digging = false; if (!this.retarget(m)) { this.cancelMove(m, `The spot you picked for the ${this.label(m.n)} has been built on, so it's staying where it is.`); return; } m.n.mesh.visible = false; this.batchDirty = true; s.bag = true; const tx = (m.tx + 0.5) * TILE + 1.4, tz = (m.tz + 0.5) * TILE + 1.0; if (!s.goTo({ x: tx, z: tz })) { this.failMove(m, s); return; } m.phase = 3; m.tt = 0; } }
    else if (m.phase === 3 && !s.path.length) { m.phase = 4; m.tt = 0; s.faceGoal = Math.atan2((m.tx + 0.5) * TILE - s.x, (m.tz + 0.5) * TILE - s.z); }
    else if (m.phase === 4) { s.digging = true; if (m.tt > 2) { s.digging = false; s.bag = false; s.hurry = false; s.moveJob = null; if (!this.retarget(m)) { m.sim = null; this.cancelMove(m, `The spot you picked for the ${this.label(m.n)} was built on before it got there, so ${s.first} put it back.`); return; } this.moveNode(m.n, m.tx, m.tz); this.moves = this.moves.filter((q) => q !== m); g.messages.push('Planning Office', `${s.first} moved the ${this.label(m.n)}.`, 'good'); } }
  }
  drop(m, s) { s.hurry = false; s.moveJob = null; s.bag = false; s.digging = false; m.sim = null; }
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
    this.assignMoves(dt);
    for (const n of this.nodes) { if (n.amount < n.max && n.regen) { n.amount = Math.min(n.max, n.amount + n.regen * dt); if (n.kind !== 'field' && Math.floor(n.amount * 4) !== Math.floor((n.amount - n.regen * dt) * 4)) this.visual(n); } }
  }
}
