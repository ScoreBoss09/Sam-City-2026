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
    const roadAt = (x, z) => w.inBounds(x, z) && w.road[w.idx(x, z)] === 1;
    const N = roadAt(tx, tz - 1), S = roadAt(tx, tz + 1), E = roadAt(tx + 1, tz), W = roadAt(tx - 1, tz);
    let base, amt = 18;
    if (t === T.WATER) { this.ctx.clearRect(tx * PX, tz * PX, PX, PX); return; }
    base = t === T.FOREST ? rgb(0x2f5d2c) : t === T.SAND ? rgb(0xd9c28a) : rgb(0x5d9a48);
    const isRoad = w.road[i] === 1;
    const conns = (N ? 1 : 0) + (S ? 1 : 0) + (E ? 1 : 0) + (W ? 1 : 0);
    for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) {
      let c = base, a = amt;
      const o = (py * PX + px) * 4;
      if (isRoad) {
        c = rgb(0x4a4d53); a = 10;
        const edgeN = !N && py < 2, edgeS = !S && py > PX - 3, edgeW = !W && px < 2, edgeE = !E && px > PX - 3;
        if (edgeN || edgeS || edgeW || edgeE) { c = rgb(0x9b9a93); a = 8; }
        else if (conns <= 2 && !(conns === 2 && N && E) && !(conns === 2 && N && W) && !(conns === 2 && S && E) && !(conns === 2 && S && W)) {
          const vert = (N || S) && !(E || W), horiz = (E || W) && !(N || S);
          if (vert && (px === 7 || px === 8) && (py % 8) < 4) { c = rgb(0xd9c24a); a = 0; }
          if (horiz && (py === 7 || py === 8) && (px % 8) < 4) { c = rgb(0xd9c24a); a = 0; }
        }
      } else if (t !== T.FOREST) {
        // sidewalk strip beside roads
        const sN = roadAt(tx, tz - 1) && py < 3, sS = roadAt(tx, tz + 1) && py > PX - 4, sW = roadAt(tx - 1, tz) && px < 3, sE = roadAt(tx + 1, tz) && px > PX - 4;
        if (sN || sS || sW || sE) { c = rgb(0xb9b6ab); a = 10; }
        else if (t === T.LAND && hash(tx * 16 + px, tz * 16 + py) > 0.93) { c = rgb(0x4a8a3a); a = 6; }
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
      for (let k = 0; k < 4; k++) pts.push([(x + rnd()) * TILE, (z + rnd()) * TILE, 0.8 + rnd() * 0.9]);
    }
    const fg = new THREE.ConeGeometry(1.5, 3.4, 6), tg = new THREE.CylinderGeometry(0.22, 0.28, 1.2, 5);
    const fm = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), pts.length);
    const tm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1 }), pts.length);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    pts.forEach(([x, z, s], k) => {
      m.makeScale(s, s, s).setPosition(x, 1.2 * s + 1.4 * s, z); fm.setMatrixAt(k, m);
      c.setHSL(0.3 + rnd() * 0.05, 0.45, 0.2 + rnd() * 0.1); fm.setColorAt(k, c);
      m.makeScale(s, s, s).setPosition(x, 0.6 * s, z); tm.setMatrixAt(k, m);
    });
    fm.castShadow = true; this.scene.add(fm, tm);
  }

  update(dt, godMode) {
    this.water.material.map.offset.x += dt * 0.004; this.water.material.map.offset.y += dt * 0.002;
    this.zoneMesh.visible = godMode;
    if (this.zDirty) this.paintZones();
  }
}
