import * as THREE from 'three';
import { MAP, TILE } from '../config.js';
import { T } from '../world/World.js';

const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
const bx = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };

/** Rabbits and deer that graze at the forest edge and bolt when people get close. */
export class Wildlife {
  constructor(game) {
    this.game = game; this.list = []; this.t = 0;
    const w = game.world, spots = [];
    for (let z = 1; z < MAP - 1; z++) for (let x = 1; x < MAP - 1; x++) { if (w.terrain[w.idx(x, z)] !== T.LAND) continue; let f = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.terrain[w.idx(x + dx, z + dz)] === T.FOREST) f++; if (f) spots.push([x, z]); }
    this.spots = spots;
    for (let i = 0; i < 10; i++) this.spawn('rabbit'); for (let i = 0; i < 4; i++) this.spawn('deer');
  }
  spawn(kind) {
    if (!this.spots.length) return; const [tx, tz] = this.spots[Math.floor(Math.random() * this.spots.length)], g = new THREE.Group(), legs = [];
    if (kind === 'rabbit') {
      const fur = M(Math.random() < 0.5 ? 0x9a7a5a : 0xb8a58a), white = M(0xf0ece2);
      bx(g, 0.28, 0.24, 0.42, fur, 0, 0.2, 0); bx(g, 0.2, 0.2, 0.2, fur, 0, 0.34, 0.24); bx(g, 0.05, 0.22, 0.05, fur, -0.05, 0.53, 0.22); bx(g, 0.05, 0.22, 0.05, fur, 0.05, 0.53, 0.22); bx(g, 0.1, 0.1, 0.08, white, 0, 0.24, -0.24);
      bx(g, 0.03, 0.03, 0.02, M(0x111111), -0.07, 0.38, 0.34); bx(g, 0.03, 0.03, 0.02, M(0x111111), 0.07, 0.38, 0.34);
    } else {
      const hide = M(0x8a5a32), pale = M(0xd9c4a0), s = 0.9 + Math.random() * 0.25; g.scale.setScalar(s);
      bx(g, 0.42, 0.45, 1.1, hide, 0, 1.0, 0); bx(g, 0.2, 0.5, 0.22, hide, 0, 1.35, 0.55).rotation.x = -0.5; bx(g, 0.24, 0.24, 0.42, hide, 0, 1.62, 0.72); bx(g, 0.26, 0.2, 0.1, pale, 0, 0.98, -0.56);
      for (const [x, z] of [[-0.14, 0.42], [0.14, 0.42], [-0.14, -0.42], [0.14, -0.42]]) { const l = new THREE.Group(); l.position.set(x, 0.8, z); bx(l, 0.09, 0.8, 0.09, hide, 0, -0.4, 0); g.add(l); legs.push(l); }
      if (Math.random() < 0.5) for (const sx of [-1, 1]) { bx(g, 0.04, 0.3, 0.04, pale, sx * 0.08, 1.88, 0.66); bx(g, 0.14, 0.04, 0.04, pale, sx * 0.14, 1.98, 0.66); }
      bx(g, 0.04, 0.12, 0.08, M(0x111111), -0.13, 1.66, 0.82); bx(g, 0.04, 0.12, 0.08, M(0x111111), 0.13, 1.66, 0.82);
    }
    const a = { kind, g, legs, x: (tx + Math.random()) * TILE, z: (tz + Math.random()) * TILE, h: Math.random() * 6.28, tx: 0, tz: 0, state: 'graze', t: Math.random() * 4, ph: 0 };
    a.tx = a.x; a.tz = a.z; g.position.set(a.x, 0, a.z); this.game.scene.add(g); this.list.push(a);
  }
  update(dt) {
    const g = this.game, w = g.world, speedK = Math.max(0, g.clock.speed); if (!speedK) return; dt *= Math.min(2, speedK);
    const night = g.atmosphere.night || 0;
    for (const a of this.list) {
      a.t -= dt; const rab = a.kind === 'rabbit';
      // who is close? Sam or any citizen
      let threat = null, td = rab ? 6 : 10; const p = g.player; if (g.mode === 'sim' || true) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < td) { td = d; threat = p; } }
      if (!threat && a.t < 0.5) for (const s of g.population.sims) { if (s.hidden) continue; const d = Math.hypot(s.x - a.x, s.z - a.z); if (d < td) { td = d; threat = s; break; } }
      if (threat) { const ang = Math.atan2(a.x - threat.x, a.z - threat.z) + (Math.random() - 0.5) * 0.6, r = rab ? 9 : 16; a.tx = a.x + Math.sin(ang) * r; a.tz = a.z + Math.cos(ang) * r; a.state = 'flee'; a.t = 2.5; }
      else if (a.t <= 0) { if (a.state === 'graze' || a.state === 'flee') { const ang = Math.random() * 6.28, r = 2 + Math.random() * (rab ? 5 : 9); a.tx = a.x + Math.sin(ang) * r; a.tz = a.z + Math.cos(ang) * r; a.state = 'walk'; a.t = 6; } else { a.state = 'graze'; a.t = 2 + Math.random() * 5; } }
      const [ttx, ttz] = w.tileOf(a.tx, a.tz); if (!w.inBounds(ttx, ttz) || w.terrain[w.idx(ttx, ttz)] === T.WATER || w.occ[w.idx(ttx, ttz)]) { a.tx = a.x; a.tz = a.z; }
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz), moving = a.state !== 'graze' && d > 0.2;
      const sp = a.state === 'flee' ? (rab ? 6.5 : 8) : (rab ? 1.6 : 1.4);
      if (moving) { const want = Math.atan2(dx, dz); let dh = want - a.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); a.h += dh * Math.min(1, dt * 8); const st = Math.min(d, sp * dt); a.x += Math.sin(a.h) * st; a.z += Math.cos(a.h) * st; a.ph += st * (rab ? 6 : 3.2); }
      else if (a.state === 'walk') { a.state = 'graze'; a.t = 2 + Math.random() * 4; }
      a.g.position.set(a.x, rab && moving ? Math.abs(Math.sin(a.ph)) * 0.28 : 0, a.z); a.g.rotation.y = a.h;
      a.g.rotation.x = !moving && a.state === 'graze' && !rab ? 0 : 0; if (!rab) for (const [i, l] of a.legs.entries()) l.rotation.x = moving ? Math.sin(a.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.2 : 0)) * 0.6 : 0;
      if (!rab && a.legs.length) { const neckDown = !moving && a.state === 'graze'; a.g.children[1].rotation.x = neckDown ? 0.6 : -0.5; }
      a.g.visible = g.mode === 'god' ? g.god.dist < 160 : Math.hypot(a.x - g.camera.position.x, a.z - g.camera.position.z) < 90;
      void night;
    }
  }
}
