import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { T, ZONE } from '../world/World.js';
import { waterTexture } from './Textures.js';
import { mulberry32 } from '../util.js';

const PX = 16;
const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
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

    this.paintAll(); this.buildRocks(); this.buildTrees();
    world.events.on('tile', (x, z) => this.paintAround(x, z));
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
    if (t === T.WATER) { this.ctx.clearRect(tx * PX, tz * PX, PX, PX); return; }
    base = t === T.FOREST ? rgb(0x2f5d2c) : t === T.SAND ? rgb(0xd9c28a) : rgb(0x5d9a48);
    const rs = w.res[i] ? w.nodeSeeds[w.res[i] - 1] : null; if (rs && rs.kind === 'clay') base = rgb(0xb0794a);
    if (rs && rs.kind === 'ore') base = rgb(0x6d6a60);
    const isRoad = w.road[i] > 0, paved = w.road[i] === 2;
    const conns = (N ? 1 : 0) + (S ? 1 : 0) + (E ? 1 : 0) + (W ? 1 : 0);
    for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) {
      let c = base, a = amt;
      const o = (py * PX + px) * 4;
      if (isRoad && !paved) {
        const ed = (!N && py < 3) || (!S && py > PX - 4) || (!W && px < 3) || (!E && px > PX - 4), rut = ((N || S) && (px === 4 || px === 11)) || ((E || W) && (py === 4 || py === 11));
        c = ed ? (hash(tx * 16 + px, tz * 16 + py) > 0.45 ? rgb(0x7a6a42) : base) : rut ? rgb(0x7a5e3a) : rgb(0xa88a5c); a = 22;
        if (!ed && hash(tx * 16 + px * 3, tz * 16 + py * 5) > 0.96) { c = rgb(0x6a6a62); a = 8; }
      } else if (isRoad) {
        c = rgb(0x4a4d53); a = 10;
        const edgeN = !N && py < 2, edgeS = !S && py > PX - 3, edgeW = !W && px < 2, edgeE = !E && px > PX - 3;
        if (edgeN || edgeS || edgeW || edgeE) { c = rgb(0x9b9a93); a = 8; }
        const cc = (x, z) => (roadAt(x, z - 1) ? 1 : 0) + (roadAt(x, z + 1) ? 1 : 0) + (roadAt(x + 1, z) ? 1 : 0) + (roadAt(x - 1, z) ? 1 : 0);
        if (conns === 2 && N && S && ((roadAt(tx, tz - 1) && cc(tx, tz - 1) !== 2) || (roadAt(tx, tz + 1) && cc(tx, tz + 1) !== 2))) { const atN = cc(tx, tz - 1) !== 2; if (((atN && py >= 1 && py <= 3) || (!atN && py >= PX - 4 && py <= PX - 2)) && px >= 2 && px <= PX - 3 && px % 3 !== 2) { c = rgb(0xe6e6e0); a = 6; } }
        if (conns === 2 && E && W && ((roadAt(tx - 1, tz) && cc(tx - 1, tz) !== 2) || (roadAt(tx + 1, tz) && cc(tx + 1, tz) !== 2))) { const atW = cc(tx - 1, tz) !== 2; if (((atW && px >= 1 && px <= 3) || (!atW && px >= PX - 4 && px <= PX - 2)) && py >= 2 && py <= PX - 3 && py % 3 !== 2) { c = rgb(0xe6e6e0); a = 6; } }
        else if (conns <= 2 && !(conns === 2 && N && E) && !(conns === 2 && N && W) && !(conns === 2 && S && E) && !(conns === 2 && S && W)) {
          const vert = (N || S) && !(E || W), horiz = (E || W) && !(N || S);
          if (vert && (px === 7 || px === 8) && (py % 8) < 4) { c = rgb(0xd9c24a); a = 0; }
          if (horiz && (py === 7 || py === 8) && (px % 8) < 4) { c = rgb(0xd9c24a); a = 0; }
        }
      } else if (t !== T.FOREST) {
        // sidewalk strip beside roads
        const sN = pavedAt(tx, tz - 1) && py < 3, sS = pavedAt(tx, tz + 1) && py > PX - 4, sW = pavedAt(tx - 1, tz) && px < 3, sE = pavedAt(tx + 1, tz) && px > PX - 4;
        if (sN || sS || sW || sE) { c = rgb(0xb9b6ab); a = 10; }
        else if (t === T.LAND && hash(tx * 16 + px, tz * 16 + py) > 0.93) { c = rgb(0x4a8a3a); a = 6; }
        else if (t === T.LAND && hash(tx * 31 + px * 7, tz * 29 + py * 3) > 0.9975) { c = [rgb(0xf4e04a), rgb(0xf08aa8), rgb(0xffffff)][(tx + tz + px) % 3]; a = 0; }
      }
      const n = (hash(tx * PX + px + 3.1, tz * PX + py + 9.7) - 0.5) * a;
      d[o] = c[0] + n; d[o + 1] = c[1] + n; d[o + 2] = c[2] + n; d[o + 3] = 255;
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
    this.foliage = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), pts.length);
    this.trunks = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1 }), pts.length);
    this.stumps = new THREE.InstancedMesh(sg, new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }), pts.length); this.stumps.count = 0; this.stumpN = 0;
    this._m = new THREE.Matrix4(); const c = new THREE.Color();
    pts.forEach((t, k) => { t.idx = k; this.setTree(k, 1); c.setHSL(0.27 + t.hue * 0.06, 0.45, 0.2 + t.light * 0.1); this.foliage.setColorAt(k, c); });
    this.foliage.castShadow = true; this.scene.add(this.foliage, this.trunks, this.stumps);
  }
  setTree(k, f) { const t = this.trees[k], m = this._m, s = t.s * f; m.makeScale(s, s, s).setPosition(t.x, 1.2 * s + 1.4 * s, t.z); this.foliage.setMatrixAt(k, m); m.makeScale(s, s, s).setPosition(t.x, 0.6 * s, t.z); this.trunks.setMatrixAt(k, m); this.foliage.instanceMatrix.needsUpdate = this.trunks.instanceMatrix.needsUpdate = true; }
  /** One chop: shrink the tree; when it is felled leave a stump, and clear the forest tile when empty. */
  chopTree(t) {
    t.amount--; if (t.amount > 0) { this.setTree(t.idx, 0.55 + 0.15 * t.amount); return false; }
    t.alive = false; this.setTree(t.idx, 0.0001); this._m.makeTranslation(t.x, 0.22, t.z); this.stumps.setMatrixAt(this.stumpN++, this._m); this.stumps.count = this.stumpN; this.stumps.instanceMatrix.needsUpdate = true;
    const k = t.tz * MAP + t.tx, n = (this.treeAlive.get(k) || 1) - 1; this.treeAlive.set(k, n);
    if (n <= 0) { this.world.terrain[k] = T.LAND; this.world.events.emit('tile', t.tx, t.tz); this.world.events.emit('cleared', t.tx, t.tz); }
    return true;
  }

  update(dt, godMode) {
    this.water.material.map.offset.x += dt * 0.004; this.water.material.map.offset.y += dt * 0.002;
    this.zoneMesh.visible = godMode;
    if (this.zDirty) this.paintZones();
  }
}
