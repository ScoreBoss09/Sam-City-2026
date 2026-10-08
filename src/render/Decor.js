import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { T } from '../world/World.js';
import { mulberry32 } from '../util.js';

const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Street lamps, street trees and bushes. Instanced; rebuilt (debounced) when roads or buildings change. */
export class Decor {
  constructor(game) {
    this.game = game; this.dirty = true; this.timer = 0; const sc = game.scene;
    this.poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.2, 5); this.headGeo = new THREE.BoxGeometry(0.7, 0.18, 0.35);
    this.pole = new THREE.InstancedMesh(this.poleGeo, new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.8 }), 400);
    this.headMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe08a, emissiveIntensity: 0, roughness: 0.5 });
    this.head = new THREE.InstancedMesh(this.headGeo, this.headMat, 400);
    this.trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.17, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 1 }), 1500);
    this.crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 1500);
    this.bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 1200);
    for (const m of [this.pole, this.head, this.trunk, this.crown, this.bush]) { m.frustumCulled = false; m.castShadow = m === this.crown || m === this.pole; sc.add(m); }
    // smoke puffs
    const sc2 = document.createElement('canvas'); sc2.width = sc2.height = 32; const cx = sc2.getContext('2d'), gr = cx.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
    this.smokeTex = new THREE.CanvasTexture(sc2); this.puffs = []; this.puffT = 0;
    for (let i = 0; i < 90; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false, opacity: 0, color: 0xdddddd })); sp.visible = false; sp.renderOrder = 5; sc.add(sp); this.puffs.push({ sp, life: 0, max: 1, vx: 0, vz: 0 }); }
    // campfire light
    this.fireLight = new THREE.PointLight(0xff9a40, 0, 26, 1.4); sc.add(this.fireLight);
    const mark = () => { this.dirty = true; this.timer = 0.25; };
    game.world.events.on('tile', mark); game.world.events.on('building:added', mark); game.world.events.on('building:removed', mark); game.world.events.on('building:done', mark);
  }
  setNight(n) { this.headMat.emissiveIntensity = n * 2.2; this.nightLevel = n; }
  smokeActive(b) {
    const g = this.game, h = g.clock.hour, d = b.def;
    if (d.park === 'camp') return true; if (d.roof === 'factory' || d.roof === 'plant') return b.workers.length > 0 && h > 7.5 && h < 18;
    if (d.beds) return b.residents.length > 0 && (h < 9.5 || h >= 16); if (d.id === 'tavern') return h >= 11; return b.workers.length > 0 && h > 7.5 && h < 17;
  }
  update(dt) {
    if (this.dirty) { this.timer -= dt; if (this.timer <= 0) this.rebuild(); }
    const g = this.game, wind = 0.6; this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = 0.35;
      for (const b of g.buildings.list) { if (b.state !== 'done' || !b.smoke || !this.smokeActive(b)) continue; if (g.mode === 'sim' && Math.hypot(b.cx - g.player.x, b.cz - g.player.z) > 90) continue; const p = this.puffs.find((q) => q.life <= 0); if (!p) break; const [x, z] = b.toWorld(b.smoke.lx, b.smoke.lz); p.sp.position.set(x, b.smoke.ly, z); p.life = p.max = 3.5 + Math.random() * 1.5; p.vx = wind + (Math.random() - 0.5) * 0.4; p.vz = (Math.random() - 0.5) * 0.4; p.sp.visible = true; p.s0 = b.def.park === 'camp' ? 0.8 : 1.1; }
    }
    for (const p of this.puffs) { if (p.life <= 0) continue; p.life -= dt; const k = 1 - p.life / p.max; p.sp.position.x += p.vx * dt; p.sp.position.z += p.vz * dt; p.sp.position.y += (1.2 + k) * dt; const sz = p.s0 * (1 + k * 2.6); p.sp.scale.set(sz, sz, 1); p.sp.material.opacity = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.26; if (p.life <= 0) p.sp.visible = false; }
    // campfire light on the camp nearest the viewer
    let best = null, bd = 1e9; const f = g.mode === 'sim' ? g.player : { x: g.god.target.x, z: g.god.target.z };
    for (const b of g.buildings.list) if (b.state === 'done' && b.def.park === 'camp') { const d = Math.hypot(b.cx - f.x, b.cz - f.z); if (d < bd) { bd = d; best = b; } }
    if (best) { const [x, z] = [best.cx, best.cz]; this.fireLight.position.set(x, 1.6, z); const n = this.nightLevel || 0; this.fireLight.intensity = (6 + 10 * n) * (1 + Math.sin(g.elapsed * 14) * 0.1 + Math.sin(g.elapsed * 23) * 0.06) * (bd < 60 ? 1 : 0.4); } else this.fireLight.intensity = 0;
  }
  rebuild() {
    this.dirty = false; const w = this.game.world, m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion();
    let nl = 0, nt = 0, nb = 0; const free = (x, z) => w.isLand(x, z) && !w.road[w.idx(x, z)] && !w.occ[w.idx(x, z)];
    const roadAt = (x, z) => w.inBounds(x, z) && w.road[w.idx(x, z)] > 0, paved = (x, z) => w.inBounds(x, z) && w.road[w.idx(x, z)] === 2;
    for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) {
      const i = w.idx(x, z);
      if (w.road[i]) {
        const n = roadAt(x, z - 1), s = roadAt(x, z + 1), e = roadAt(x + 1, z), wv = roadAt(x - 1, z), cn = n + s + e + wv;
        if (paved(x, z) && cn === 2 && ((n && s) || (e && wv)) && (x + z) % 3 === 0) {
          const side = hash(x, z) < 0.5 ? 1 : -1;
          const px = (x + 0.5) * TILE + (n && s ? side * 2.1 : 0), pz = (z + 0.5) * TILE + (e && wv ? side * 2.1 : 0);
          if (free(Math.floor(px / TILE), Math.floor(pz / TILE)) || true) {
            const ox = Math.floor(px / TILE), oz = Math.floor(pz / TILE);
            if (w.inBounds(ox, oz) && !w.occ[w.idx(ox, oz)] && nl < 400) { m.makeTranslation(px, 2.1, pz); this.pole.setMatrixAt(nl, m); const hx = n && s ? -side * 0.3 : 0, hz = e && wv ? -side * 0.3 : 0; q.setFromEuler(new THREE.Euler(0, n && s ? Math.PI / 2 : 0, 0)); m.compose(new THREE.Vector3(px + hx, 4.2, pz + hz), q, new THREE.Vector3(1, 1, 1)); this.head.setMatrixAt(nl, m); nl++; }
          }
        }
        continue;
      }
      if (!free(x, z) || w.terrain[i] === T.SAND && hash(z, x) < 0.5) continue;
      const near = roadAt(x + 1, z) || roadAt(x - 1, z) || roadAt(x, z + 1) || roadAt(x, z - 1);
      const h = hash(x * 3 + 1, z * 7 + 2);
      const edge = (() => { for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (w.inBounds(x + dx, z + dz) && w.terrain[w.idx(x + dx, z + dz)] === T.FOREST) return true; return false; })();
      const meadow = !near && w.terrain[i] === T.LAND && !w.res[i] && ((edge && h < 0.2) || (h < 0.045));
      if ((near && h < 0.3 && nt < 1400) || (meadow && nt < 1400)) {
        const px = (x + 0.25 + hash(z, x) * 0.5) * TILE, pz = (z + 0.25 + hash(x, z + 9) * 0.5) * TILE, s = 0.8 + hash(x + 5, z) * 0.7;
        m.compose(new THREE.Vector3(px, 0.55 * s, pz), q.identity(), new THREE.Vector3(s, s, s)); this.trunk.setMatrixAt(nt, m);
        m.compose(new THREE.Vector3(px, 1.1 * s + 1.0 * s, pz), q.identity(), new THREE.Vector3(s, s * 1.05, s)); this.crown.setMatrixAt(nt, m);
        c.setHSL(0.26 + hash(x, z) * 0.1, 0.5, 0.26 + hash(z, x) * 0.1); this.crown.setColorAt(nt, c); nt++;
      } else if (!near && h > 0.86 && nb < 1100 && w.terrain[i] === T.LAND && (hash(x, z) < 0.4)) {
        const px = (x + 0.2 + hash(z, x) * 0.6) * TILE, pz = (z + 0.2 + hash(x + 3, z) * 0.6) * TILE; m.compose(new THREE.Vector3(px, 0.3, pz), q.identity(), new THREE.Vector3(1.2, 0.9, 1.2)); this.bush.setMatrixAt(nb, m); c.setHSL(0.28 + hash(x, z + 2) * 0.08, 0.5, 0.28); this.bush.setColorAt(nb, c); nb++;
      }
    }
    // shrubs hugging building walls
    for (const b of this.game.buildings.list) {
      if (b.state !== 'done' || b.def.park || b.def.special || nb > 880) continue;
      const D = b.def.d * TILE, W = b.def.w * TILE;
      for (const [lx, lz] of [[-W / 2 + 0.6, -D / 2 - 0.7], [W / 2 - 0.6, -D / 2 - 0.7], [-W / 2 - 0.7, 0], [W / 2 + 0.7, 0], [-W / 2 + 0.2, D / 2 + 0.7], [W / 2 - 0.2, D / 2 + 0.7]]) {
        const [px, pz] = b.toWorld(lx, lz), tx = Math.floor(px / TILE), tz = Math.floor(pz / TILE);
        if (!w.inBounds(tx, tz) || w.road[w.idx(tx, tz)] || (w.occ[w.idx(tx, tz)] && w.occ[w.idx(tx, tz)] !== b.uid) || !w.isLand(tx, tz)) continue;
        if (lz > 0 && Math.abs(lx - b.geo.off) < 2.2) continue;
        m.compose(new THREE.Vector3(px, 0.3, pz), q.identity(), new THREE.Vector3(1, 0.8, 1)); this.bush.setMatrixAt(nb, m); c.setHSL(0.3, 0.5, 0.3); this.bush.setColorAt(nb, c); nb++;
      }
    }
    for (const [im, n] of [[this.pole, nl], [this.head, nl], [this.trunk, nt], [this.crown, nt], [this.bush, nb]]) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
}
