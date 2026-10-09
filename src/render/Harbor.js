import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { T } from '../world/World.js';
import { stdMat } from './BuildingFactory.js';

/** Decorative docks, cranes and boats on the south-west shore (like the reference port). */
export class Harbor {
  constructor(game) {
    this.game = game; this.boats = []; const w = game.world, sc = game.scene; const g = new THREE.Group(); sc.add(g); this.root = g; g.visible = false; this.modern = new THREE.Group(); this.basic = new THREE.Group(); sc.add(this.modern, this.basic); this.modern.visible = false;
    const box = (pw, ph, pd, c, x, y, z, parent = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), stdMat(c)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    // find west-facing shore tiles
    const spots = []; for (let z = 18; z < 36; z++) for (let x = 2; x < 20; x++) { if (w.terrain[w.idx(x, z)] !== T.WATER && w.terrain[w.idx(x - 1, z)] === T.WATER && w.terrain[w.idx(x - 2, z)] === T.WATER) { spots.push([x, z]); break; } }
    const used = [], quays = []; for (const [x, z] of spots) { if (used.some((u) => Math.abs(u - z) < 5) || used.length >= 3) continue; used.push(z); quays.push(x); const px = x * TILE, pz = (z + 0.5) * TILE;
      for (let i = 0; i < 6; i++) box(3.2, 0.3, 2.6, 0x8a6a45, px - 1.6 - i * 3.2, 0.1, pz);
      for (let i = 0; i < 7; i++) for (const s of [-1.5, 1.5]) box(0.3, 1.0, 0.3, 0x4a3828, px - 1 - i * 3, -0.5, pz + s);
      if (used.length === 1) { // gantry crane
        const cr = new THREE.Group(); cr.position.set(px + 1.5, 0, pz); this.modern.add(cr);
        for (const [cx, cz] of [[-2, -2.2], [-2, 2.2], [2, -2.2], [2, 2.2]]) box(0.35, 9, 0.35, 0xe3b320, cx, 0, cz, cr).position.y = 4.5;
        box(5, 0.5, 5.2, 0xe3b320, 0, 9, 0, cr); box(0.4, 0.4, 16, 0xe3b320, 0, 9.5, -6, cr); box(1.6, 0.9, 1.6, 0x3a3f46, 0, 9.5, 0, cr); const hook = box(0.1, 4, 0.1, 0x222, 0, 7, -5, cr); this.crane = { hook, t: 0 };
      }
      if (used.length === 2) { const cr = new THREE.Group(); cr.position.set(px + 3, 0, pz - 3); this.modern.add(cr); box(0.5, 7, 0.5, 0xe3b320, 0, 3.5, 0, cr); box(0.35, 0.35, 9, 0xe3b320, 0, 7, -3, cr); box(0.3, 3, 0.3, 0x222, 0, 5.4, -6, cr); }
      // boat
      const dinghy = new THREE.Group(); dinghy.position.set(px - 8, 0, pz + (used.length % 2 ? 4.5 : -4.5)); this.basic.add(dinghy);
      box(1.6, 0.5, 4.2, 0x8a5a33, 0, 0.0, 0, dinghy); box(1.3, 0.12, 3.6, 0x6e4528, 0, 0.45, 0, dinghy); box(0.9, 0.08, 0.3, 0x9a7a4a, 0, 0.5, 0.4, dinghy); this.boats.push({ g: dinghy, y0: 0.0, ph: Math.random() * 6 });
      const boat = new THREE.Group(); boat.position.set(px - 14, 0, pz + (used.length % 2 ? 7 : -7)); this.modern.add(boat);
      box(3.4, 1.2, 9, used.length % 2 ? 0xc0392b : 0x2c5aa0, 0, 0.1, 0, boat); box(2.6, 0.2, 7.5, 0xe8e0d0, 0, 0.78, -0.2, boat); box(2.2, 1.4, 2.6, 0xf2f2f2, 0, 1.5, 1.2, boat); box(1.9, 0.4, 0.1, 0x7fc8e8, 0, 1.8, 2.5, boat); this.boats.push({ g: boat, y0: boat.position.y, ph: Math.random() * 6 });
    }
    // seagulls
    this.gulls = []; const gm = stdMat(0xf4f4f4), gt = stdMat(0x777f88);
    for (let i = 0; i < 9; i++) { const gg = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.7), gm); gg.add(b); const wl = new THREE.Group(), wr = new THREE.Group(); gg.add(wl, wr); const wing = (par, sx) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.4), gm); w.position.x = sx * 0.45; par.add(w); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), gt); tip.position.x = sx * 1.0; par.add(tip); }; wing(wl, -1); wing(wr, 1); sc.add(gg); this.gulls.push({ g: gg, wl, wr, cx: 30 + Math.random() * 20, cz: 100 + Math.random() * 40, r: 12 + Math.random() * 25, a: Math.random() * 6.28, sp: 0.25 + Math.random() * 0.2, y: 9 + Math.random() * 10, ph: Math.random() * 6 }); }
    // cargo containers on the quay
    const cols = [0xc0392b, 0x2980b9, 0xe67e22, 0x27ae60, 0xd9d9d9];
    used.forEach((z, k) => { for (let i = 0; i < 4; i++) { if (Math.random() < 0.25) continue; const cx = quays[k] * TILE + 9 + (i % 2) * 3.4, cz = (z + 0.5) * TILE + (i < 2 ? -4.5 : 4.5); if (cx / TILE < MAP && w.isLand(Math.floor(cx / TILE), Math.floor(cz / TILE)) && !w.occ[w.idx(Math.floor(cx / TILE), Math.floor(cz / TILE))]) { box(2.4, 2.3, 6, cols[(i + z) % 5], cx, 0, cz, this.modern).position.y = 1.15; if (Math.random() < 0.5) box(2.4, 2.3, 6, cols[(i * 3 + z) % 5], cx, 2.3, cz, this.modern).position.y = 3.45; } } });
  }
  update(dt, t) {
    // the jetties only exist once a Harbour has been built; cranes and cargo once the town is big
    const built = this.game.buildings.list.some((b) => b.id === 'harbour' && b.state === 'done'), mod = built && this.game.population.count() >= 30;
    this.root.visible = built; this.modern.visible = mod; this.basic.visible = built && !mod;
    for (const q of this.gulls || []) { q.a += dt * q.sp; const x = q.cx + Math.cos(q.a) * q.r, z = q.cz + Math.sin(q.a) * q.r; q.g.position.set(x, q.y + Math.sin(t * 0.6 + q.ph) * 1.2, z); q.g.rotation.y = -q.a; q.wl.rotation.z = Math.sin(t * 7 + q.ph) * 0.5; q.wr.rotation.z = -Math.sin(t * 7 + q.ph) * 0.5; } for (const b of this.boats) { b.g.position.y = b.y0 - 0.1 + Math.sin(t * 1.2 + b.ph) * 0.12; b.g.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.03; b.g.rotation.x = Math.sin(t * 0.7 + b.ph) * 0.02; } if (this.crane) { this.crane.t += dt; this.crane.hook.position.z = -5 - Math.sin(this.crane.t * 0.3) * 3; this.crane.hook.position.y = 7 - Math.sin(this.crane.t * 0.5) * 1.2; } }
}
