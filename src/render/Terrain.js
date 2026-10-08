import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { T, ZONE } from '../world/World.js';
import { waterTexture } from './Textures.js';
import { mulberry32 } from '../util.js';
import { Assets } from './Assets.js';
const CAT = { forest: 'ground_forest', sand: 'ground_sand', clay: 'ground_clay', rock: 'ground_rock', dirt: 'ground_dirt', asphalt: 'ground_asphalt', pavement: 'ground_pavement' };

const PX = 16;
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const vn = (x, z, sc) => { const gx = x / sc, gz = z / sc, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1), u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

export class Terrain {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    const size = MAP * TILE;
    // ground canvas (alpha cut-out where water is)
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = MAP * PX;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false; this.tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 1, alphaTest: 0.5 });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.set(size / 2, 0, size / 2); this.ground.receiveShadow = true;
    scene.add(this.ground);

    // zone overlay (god mode only)
    this.zCanvas = document.createElement('canvas'); this.zCanvas.width = this.zCanvas.height = MAP * 8;
    this.zctx = this.zCanvas.getContext('2d');
    this.zTex = new THREE.CanvasTexture(this.zCanvas); this.zTex.magFilter = this.zTex.minFilter = THREE.NearestFilter; this.zTex.generateMipmaps = false;
    this.zoneMesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: this.zTex, transparent: true, depthWrite: false }));
    this.zoneMesh.rotation.x = -Math.PI / 2; this.zoneMesh.position.set(size / 2, 0.04, size / 2); scene.add(this.zoneMesh);

    // sea
    const wt = waterTexture();
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.35, metalness: 0.1, emissive: 0x0a2a55, emissiveIntensity: 0.5 }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.set(size / 2, -0.5, size / 2); this.water.receiveShadow = true; scene.add(this.water);

    const sp = document.createElement('canvas'); sp.width = sp.height = 64; const sx = sp.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, 64, 64); for (let i = 0; i < 40; i++) { const a = 0.4 + Math.random() * 0.6; sx.fillStyle = `rgba(255,255,255,${a})`; sx.fillRect(Math.random() * 62 | 0, Math.random() * 62 | 0, 2, 1); }
    this.sparkTex = new THREE.CanvasTexture(sp); this.sparkTex.wrapS = this.sparkTex.wrapT = THREE.RepeatWrapping; this.sparkTex.magFilter = this.sparkTex.minFilter = THREE.NearestFilter; this.sparkTex.repeat.set(26, 26);
    this.spark = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshBasicMaterial({ map: this.sparkTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); this.spark.rotation.x = -Math.PI / 2; this.spark.position.set(size / 2, -0.44, size / 2); scene.add(this.spark);
    this.paintAll(); this.buildRocks(); this.buildTrees();
    world.events.on('tile', (x, z) => this.paintAround(x, z));
    // roads and building plots clear the trees standing on them
    const clear = (x0, z0, w, d) => { for (const t of this.trees || []) if (t.alive && t.tx >= x0 && t.tx < x0 + w && t.tz >= z0 && t.tz < z0 + d) this.killTree(t); };
    world.events.on('tile', (x, z) => { if (world.road[world.idx(x, z)]) clear(x, z, 1, 1); });
    world.events.on('building:added', (b) => { if (!b.def.special) clear(b.x0, b.z0, b.w, b.d); });
    world.events.on('zone', () => { this.zDirty = true; });
    this.zDirty = true;
  }

  paintAll() { for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) this.paintTile(x, z); this.tex.needsUpdate = true; }
  paintAround(x, z) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (this.world.inBounds(x + dx, z + dz)) this.paintTile(x + dx, z + dz); this.tex.needsUpdate = true; }

  paintTile(tx, tz) {
    const w = this.world, i = w.idx(tx, tz), t = w.terrain[i];
    const img = this.ctx.createImageData(PX, PX), d = img.data;
    const roadAt = (x, z) => w.inBounds(x, z) && w.road[w.idx(x, z)] > 0, pavedAt = (x, z) => w.inBounds(x, z) && w.road[w.idx(x, z)] === 2;
    const N = roadAt(tx, tz - 1), S = roadAt(tx, tz + 1), E = roadAt(tx + 1, tz), W = roadAt(tx - 1, tz);
    let base, amt = 18;
    if (t === T.WATER) {
      this.ctx.clearRect(tx * PX, tz * PX, PX, PX);
      const land = (x, z) => w.inBounds(x, z) && w.terrain[w.idx(x, z)] !== T.WATER, L = land(tx - 1, tz), R = land(tx + 1, tz), U = land(tx, tz - 1), Dn = land(tx, tz + 1);
      if (L || R || U || Dn) { const fi = this.ctx.createImageData(PX, PX), fd = fi.data; for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) { const dist = Math.min(L ? px : 99, R ? PX - 1 - px : 99, U ? py : 99, Dn ? PX - 1 - py : 99); if (dist > 4) continue; const h2 = hash(tx * 16 + px * 1.7, tz * 16 + py * 2.3); if (dist < 1 || (dist < 3 && h2 > 0.45) || (dist < 5 && h2 > 0.82)) { const o = (py * PX + px) * 4; const pale = dist < 2; fd[o] = pale ? 236 : 150; fd[o + 1] = pale ? 246 : 205; fd[o + 2] = pale ? 252 : 235; fd[o + 3] = 255; } } this.ctx.putImageData(fi, tx * PX, tz * PX); }
      return;
    }
    base = t === T.FOREST ? rgb(0x2f5d2c) : t === T.SAND ? rgb(0xd9c28a) : rgb(0x5d9a48);
    const rs = w.res[i] ? w.nodeSeeds[w.res[i] - 1] : null; if (rs && rs.kind === 'clay') base = rgb(0xb0794a);
    if (rs && rs.kind === 'ore') base = rgb(0x6d6a60);
    const isRoad = w.road[i] > 0, paved = w.road[i] === 2;
    const defCat = isRoad ? null : (rs && rs.kind === 'clay' ? 'clay' : rs && rs.kind === 'ore' ? 'rock' : t === T.FOREST ? 'forest' : t === T.SAND ? 'sand' : 'grass');
    const conns = (N ? 1 : 0) + (S ? 1 : 0) + (E ? 1 : 0) + (W ? 1 : 0);
    for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) {
      let c = base, a = amt, cat = defCat, mult = 1;
      const o = (py * PX + px) * 4;
      if (isRoad && !paved) {
        const ed = (!N && py < 3) || (!S && py > PX - 4) || (!W && px < 3) || (!E && px > PX - 4), rut = ((N || S) && (px === 4 || px === 11)) || ((E || W) && (py === 4 || py === 11));
        c = ed ? (hash(tx * 16 + px, tz * 16 + py) > 0.45 ? rgb(0x7a6a42) : base) : rut ? rgb(0x7a5e3a) : rgb(0xa88a5c); a = 22;
        cat = ed ? 'grass' : 'dirt'; if (rut && !ed) mult = 0.78;
        if (!ed && hash(tx * 16 + px * 3, tz * 16 + py * 5) > 0.96) { c = rgb(0x6a6a62); a = 8; cat = null; }
      } else if (isRoad) {
        c = rgb(0x4a4d53); a = 10; cat = 'asphalt';
        const edgeN = !N && py < 2, edgeS = !S && py > PX - 3, edgeW = !W && px < 2, edgeE = !E && px > PX - 3;
        if (edgeN || edgeS || edgeW || edgeE) { c = rgb(0x9b9a93); a = 8; cat = 'pavement'; }
        const cc = (x, z) => (roadAt(x, z - 1) ? 1 : 0) + (roadAt(x, z + 1) ? 1 : 0) + (roadAt(x + 1, z) ? 1 : 0) + (roadAt(x - 1, z) ? 1 : 0);
        if (conns === 2 && N && S && ((roadAt(tx, tz - 1) && cc(tx, tz - 1) !== 2) || (roadAt(tx, tz + 1) && cc(tx, tz + 1) !== 2))) { const atN = cc(tx, tz - 1) !== 2; if (((atN && py >= 1 && py <= 3) || (!atN && py >= PX - 4 && py <= PX - 2)) && px >= 2 && px <= PX - 3 && px % 3 !== 2) { c = rgb(0xe6e6e0); a = 6; cat = null; } }
        if (conns === 2 && E && W && ((roadAt(tx - 1, tz) && cc(tx - 1, tz) !== 2) || (roadAt(tx + 1, tz) && cc(tx + 1, tz) !== 2))) { const atW = cc(tx - 1, tz) !== 2; if (((atW && px >= 1 && px <= 3) || (!atW && px >= PX - 4 && px <= PX - 2)) && py >= 2 && py <= PX - 3 && py % 3 !== 2) { c = rgb(0xe6e6e0); a = 6; cat = null; } }
        else if (conns <= 2 && !(conns === 2 && N && E) && !(conns === 2 && N && W) && !(conns === 2 && S && E) && !(conns === 2 && S && W)) {
          const vert = (N || S) && !(E || W), horiz = (E || W) && !(N || S);
          if (vert && (px === 7 || px === 8) && (py % 8) < 4) { c = rgb(0xd9c24a); a = 0; cat = null; }
          if (horiz && (py === 7 || py === 8) && (px % 8) < 4) { c = rgb(0xd9c24a); a = 0; cat = null; }
        }
      } else if (t !== T.FOREST) {
        // sidewalk strip beside roads
        const sN = pavedAt(tx, tz - 1) && py < 3, sS = pavedAt(tx, tz + 1) && py > PX - 4, sW = pavedAt(tx - 1, tz) && px < 3, sE = pavedAt(tx + 1, tz) && px > PX - 4;
        if (sN || sS || sW || sE) { c = rgb(0xb9b6ab); a = 10; cat = 'pavement'; }
        else if (t === T.LAND && hash(tx * 16 + px, tz * 16 + py) > 0.93) { c = rgb(0x4a8a3a); a = 6; cat = null; }
        else if (t === T.LAND && hash(tx * 31 + px * 7, tz * 29 + py * 3) > 0.9992) { c = [rgb(0xf4e04a), rgb(0xf08aa8), rgb(0xffffff)][(tx + tz + px) % 3]; a = 0; cat = null; }
      }
      if (cat && Assets.ok) { const gx = tx * PX + px, gz = tz * PX + py; const nm = cat === 'grass' ? (vn(gx, gz, 30) > 0.5 ? 'ground_grass_a' : 'ground_grass_b') : CAT[cat]; const sm = Assets.sample(nm, gx, gz); if (sm) { c = sm; a = 0; } }
      let n = (hash(tx * PX + px + 3.1, tz * PX + py + 9.7) - 0.5) * a;
      if (!isRoad && (t === T.LAND || t === T.FOREST)) { const patch = vn(tx * PX + px, tz * PX + py, 22) * 0.6 + vn(tx * PX + px, tz * PX + py, 7) * 0.4; n += (patch - 0.5) * (Assets.ok ? 12 : 34); const tuft = hash(Math.floor((tx * PX + px) / 2) + 11, tz * PX + py * 1.3 + 5); if (!Assets.ok && t === T.LAND && tuft > 0.965 && py % 3 !== 0) n -= 26; }
      d[o] = c[0] * mult + n; d[o + 1] = c[1] * mult + n * 1.05; d[o + 2] = c[2] * mult + n * 0.8; d[o + 3] = 255;
    }
    this.ctx.putImageData(img, tx * PX, tz * PX);
  }

  paintZones() {
    const w = this.world, ctx = this.zctx, S = 8; ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const colors = { [ZONE.RES]: [60, 200, 90], [ZONE.COM]: [70, 130, 230], [ZONE.IND]: [230, 190, 50] };
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
      const zn = w.zone[w.idx(x, z)]; if (!zn) continue; const c = colors[zn];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`; ctx.fillRect(x * S, z * S, S, S);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.85)`; ctx.fillRect(x * S, z * S, S, 1); ctx.fillRect(x * S, z * S, 1, S);
    }
    this.zTex.needsUpdate = true; this.zDirty = false;
  }

  buildRocks() {
    const w = this.world, edge = [];
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
      if (!w.isLand(x, z) && w.terrain[w.idx(x, z)] !== T.FOREST) continue;
      if (w.terrain[w.idx(x, z)] === T.WATER) continue;
      let near = false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (w.inBounds(x + dx, z + dz) && w.terrain[w.idx(x + dx, z + dz)] === T.WATER) near = true;
      if (near) edge.push([x, z]);
    }
    const geo = new THREE.BoxGeometry(TILE * 1.02, 3.5, TILE * 1.02);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), edge.length);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    edge.forEach(([x, z], k) => {
      const hh = 0.6 + hash(x, z) * 0.9; m.makeScale(1, hh, 1).setPosition((x + 0.5) * TILE, -1.75 * hh - 0.02, (z + 0.5) * TILE); im.setMatrixAt(k, m);
      c.setHex(hash(z, x) > 0.5 ? 0x7a6347 : 0x6a5640); im.setColorAt(k, c);
    });
    im.receiveShadow = true; this.scene.add(im);
  }

  buildTrees() {
    const w = this.world, rnd = mulberry32(99), pts = [];
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
      if (w.terrain[w.idx(x, z)] !== T.FOREST) continue;
      for (let k = 0; k < 4; k++) pts.push({ x: (x + rnd()) * TILE, z: (z + rnd()) * TILE, s: 0.8 + rnd() * 0.9, tx: x, tz: z, hue: rnd(), light: rnd(), alive: true, amount: 3, reserved: null, pine: rnd() < 0.7 });
    }
    this.trees = pts; this.treeAlive = new Map(); for (const t of pts) { const k = t.tz * MAP + t.tx; this.treeAlive.set(k, (this.treeAlive.get(k) || 0) + 1); }
    const fg = new THREE.ConeGeometry(1.5, 3.4, 6), tg = new THREE.CylinderGeometry(0.22, 0.28, 1.2, 5), sg = new THREE.CylinderGeometry(0.28, 0.34, 0.45, 6);
    this.foliage = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, map: Assets.tex('leaves', 2, 2) }), pts.length);
    this.trunks = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: Assets.has('bark') ? 0xffffff : 0x5a3b22, roughness: 1, map: Assets.tex('bark', 1, 1) }), pts.length);
    this.stumps = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }), pts.length); this.stumps.count = 0; this.stumpN = 0;
    this._m = new THREE.Matrix4(); const c = new THREE.Color();
    pts.forEach((t, k) => { t.idx = k; this.setTree(k, 1); c.setHSL(0.27 + t.hue * 0.06, 0.5, Assets.has('leaves') ? 0.5 + t.light * 0.18 : 0.2 + t.light * 0.1); this.foliage.setColorAt(k, c); });
    this.foliage.castShadow = true; this.scene.add(this.foliage, this.trunks, this.stumps);
  }
  setTree(k, f) { const t = this.trees[k], m = this._m, s = t.s * f; m.makeScale(s, s, s).setPosition(t.x, 1.2 * s + 1.4 * s, t.z); this.foliage.setMatrixAt(k, m); m.makeScale(s, s, s).setPosition(t.x, 0.6 * s, t.z); this.trunks.setMatrixAt(k, m); this.foliage.instanceMatrix.needsUpdate = this.trunks.instanceMatrix.needsUpdate = true; }
  /** Hide/show just the crown of a tree (camera cut-away). */
  setCrown(t, on) { const m = this._m, s = t.s * (t.alive ? (t.amount < 3 ? 0.55 + 0.15 * t.amount : 1) : 0.0001), k = on ? s : 0.0001; m.makeScale(k, k, k).setPosition(t.x, 1.2 * s + 1.4 * s, t.z); this.foliage.setMatrixAt(t.idx, m); this.foliage.instanceMatrix.needsUpdate = true; }
  /** Used when restoring a saved game: remove a felled tree without touching terrain events. */
  killTree(t) { t.alive = false; t.amount = 0; this.setTree(t.idx, 0.0001); this._m.makeTranslation(t.x, 0.22, t.z); this.stumps.setMatrixAt(this.stumpN++, this._m); this.stumps.count = this.stumpN; this.stumps.instanceMatrix.needsUpdate = true; const k = t.tz * MAP + t.tx; this.treeAlive.set(k, Math.max(0, (this.treeAlive.get(k) || 1) - 1)); }
  /** One chop: shrink the tree; when it is felled leave a stump, and clear the forest tile when empty. */
  chopTree(t) {
    t.amount--; if (t.amount > 0) { this.setTree(t.idx, 0.55 + 0.15 * t.amount); return false; }
    t.alive = false; this.setTree(t.idx, 0.0001); this._m.makeTranslation(t.x, 0.22, t.z); this.stumps.setMatrixAt(this.stumpN++, this._m); this.stumps.count = this.stumpN; this.stumps.instanceMatrix.needsUpdate = true;
    const k = t.tz * MAP + t.tx, n = (this.treeAlive.get(k) || 1) - 1; this.treeAlive.set(k, n);
    if (n <= 0) { this.world.terrain[k] = T.LAND; this.world.events.emit('tile', t.tx, t.tz); this.world.events.emit('cleared', t.tx, t.tz); }
    return true;
  }

  update(dt, godMode) {
    this.water.material.map.offset.x += dt * 0.004; this.water.material.map.offset.y += dt * 0.002; this.sparkTex.offset.x -= dt * 0.012; this.sparkTex.offset.y += dt * 0.007; this.spark.material.opacity = 0.2 + 0.5 * (this.day ?? 1);
    this.zoneMesh.visible = godMode;
    if (this.zDirty) this.paintZones();
  }
}
