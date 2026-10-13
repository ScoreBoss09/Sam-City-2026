import * as THREE from 'three';
import { MAP, TILE } from '../config.js';
import { T } from '../world/World.js';
import { colorize, mergeByMaterial } from './BuildingFactory.js';

const MC = {}, M = (c) => MC[c] || (MC[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));   // shared, so each animal's body merges into one draw
const bx = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };

/**
 * The island's animals: rabbits, deer, squirrels and foxes from the woods, sheep and cows in the fields, chickens, cats and
 * (at night) hedgehogs round the houses, ducks bobbing along the shore. They graze, wander and bolt when people come close.
 */
export class Wildlife {
  constructor(game) {
    this.game = game; this.list = []; this.t = 0;
    const w = game.world, spots = [];
    for (let z = 1; z < MAP - 1; z++) for (let x = 1; x < MAP - 1; x++) { if (w.terrain[w.idx(x, z)] !== T.LAND) continue; let f = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.terrain[w.idx(x + dx, z + dz)] === T.FOREST) f++; if (f) spots.push([x, z]); }
    this.spots = spots;
    for (let i = 0; i < 10; i++) this.spawn('rabbit'); for (let i = 0; i < 4; i++) this.spawn('deer'); for (let i = 0; i < 4; i++) this.spawn('sheep'); for (let i = 0; i < 4; i++) this.spawn('squirrel'); for (let i = 0; i < 5; i++) this.spawn('duck');
    // butterflies (day) and fireflies (night) drift around wherever the camera is
    this.flies = []; const wing = new THREE.PlaneGeometry(0.16, 0.12); wing.translate(0.08, 0, 0); const cols = [0xffffff, 0xf2e35a, 0xff9a3c, 0x8ab4ff, 0xe86aa0];
    for (let i = 0; i < 18; i++) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }); const l = new THREE.Mesh(wing, m), r = new THREE.Mesh(wing, m); r.scale.x = -1; g.add(l, r); g.userData = { l, r, ph: Math.random() * 6, ox: (Math.random() - 0.5) * 50, oz: (Math.random() - 0.5) * 50, sp: 0.5 + Math.random() * 0.6 }; g.visible = false; game.scene.add(g); this.flies.push(g); }
    const N = 60, pos = new Float32Array(N * 3); this.ffOff = Array.from({ length: N }, () => [(Math.random() - 0.5) * 60, 0.4 + Math.random() * 2.2, (Math.random() - 0.5) * 60, Math.random() * 6]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflies = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8ff6a, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); this.fireflies.frustumCulled = false; game.scene.add(this.fireflies);
  }
  insects(dt) {
    const g = this.game, cam = g.camera.position, night = g.atmosphere.night || 0, rain = g.atmosphere.rain || 0, sim = g.mode === 'sim'; this.t += dt;
    const day = sim && night < 0.3 && rain < 0.3;
    for (const f of this.flies) {
      f.visible = day; if (!day) continue; const u = f.userData; u.ph += dt * 18; const flap = Math.sin(u.ph) * 0.9; u.l.rotation.y = flap; u.r.rotation.y = -flap;
      u.ox += Math.sin(this.t * u.sp + u.ph * 0.01) * dt * 1.4; u.oz += Math.cos(this.t * u.sp * 0.8 + 1) * dt * 1.4; if (Math.abs(u.ox) > 30) u.ox *= -0.9; if (Math.abs(u.oz) > 30) u.oz *= -0.9;
      f.position.set(cam.x + u.ox, 0.6 + Math.abs(Math.sin(this.t * u.sp * 2 + u.ph * 0.05)) * 1.2, cam.z + u.oz); f.rotation.y = this.t * u.sp;
    }
    const k = sim ? Math.max(0, night - 0.3) * (1 - rain) : 0; this.fireflies.material.opacity = Math.min(0.95, k * 1.6); this.fireflies.visible = k > 0.02;
    if (this.fireflies.visible) { const p = this.fireflies.geometry.attributes.position.array; this.ffOff.forEach((o, i) => { o[3] += dt; p[i * 3] = cam.x + o[0] + Math.sin(o[3] * 0.7) * 1.5; p[i * 3 + 1] = o[1] + Math.sin(o[3] * 1.3) * 0.4; p[i * 3 + 2] = cam.z + o[2] + Math.cos(o[3] * 0.6) * 1.5; }); this.fireflies.geometry.attributes.position.needsUpdate = true; this.fireflies.material.size = 2 + Math.abs(Math.sin(this.t * 3)) * 2; }
  }
  // ---------- animals ----------
  spot(home) {
    const g = this.game, w = g.world, pick = (a) => a[Math.floor(Math.random() * a.length)];
    const free = (tx, tz) => w.inBounds(tx, tz) && w.isLand(tx, tz) && !w.occ[w.idx(tx, tz)] && !w.road[w.idx(tx, tz)];
    if (home === 'forest' && this.spots.length) return pick(this.spots);
    if (home === 'water') { if (!this.shore) { this.shore = []; for (let z = 1; z < MAP - 1; z++) for (let x = 1; x < MAP - 1; x++) if (w.terrain[w.idx(x, z)] === T.WATER && [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dz]) => w.isLand(x + dx, z + dz)) && this.okTile({ C: { home: 'water' } }, (x + 0.5) * TILE, (z + 0.5) * TILE)) this.shore.push([x, z]); } return this.shore.length ? pick(this.shore) : null; }
    if (home === 'town' || home === 'farm') {
      const bs = g.buildings.list.filter((b) => b.state === 'done' && (home === 'farm' ? b.id === 'farm' || b.id === 'allotment' || b.id === 'stables' : b.def.cat === 'res'));
      if (bs.length) for (let k = 0; k < 10; k++) { const b = pick(bs), tx = Math.floor(b.cx / TILE) + Math.round((Math.random() - 0.5) * 4), tz = Math.floor(b.cz / TILE) + Math.round((Math.random() - 0.5) * 4); if (free(tx, tz)) return [tx, tz]; }
      if (home === 'town') return null;
    }
    for (let k = 0; k < 40; k++) { const tx = 2 + Math.floor(Math.random() * (MAP - 4)), tz = 2 + Math.floor(Math.random() * (MAP - 4)); if (free(tx, tz) && w.terrain[w.idx(tx, tz)] === T.LAND) return [tx, tz]; }
    return null;
  }
  spawn(kind) {
    const C = KINDS[kind], at = this.spot(C.home); if (!at) return null; const [tx, tz] = at, g = new THREE.Group(), legs = [];
    C.make(g, legs, M);
    for (const l of legs) l.userData.keep = true;
    colorize(g); mergeByMaterial(g);   // one draw for the body (legs swing separately)
    const sp0 = C.home === 'water' ? 0.1 : 0.6, a = { kind, C, g, legs, x: (tx + 0.5 + (Math.random() - 0.5) * sp0) * TILE, z: (tz + 0.5 + (Math.random() - 0.5) * sp0) * TILE, h: Math.random() * 6.28, tx: 0, tz: 0, state: 'graze', t: Math.random() * 4, ph: 0, up: 0 };
    a.tx = a.x; a.tz = a.z; g.position.set(a.x, 0, a.z); this.game.scene.add(g); this.list.push(a); return a;
  }
  okTile(a, x, z) {
    const w = this.game.world, wet = (px, pz) => { const [tx, tz] = w.tileOf(px, pz); return w.inBounds(tx, tz) && w.terrain[w.idx(tx, tz)] === T.WATER; };
    if (a.C.home === 'water') return wet(x, z) && wet(x + 4.5, z) && wet(x - 4.5, z) && wet(x, z + 4.5) && wet(x, z - 4.5);   // ducks keep clear of the beach and its surf
    const [tx, tz] = w.tileOf(x, z); if (!w.inBounds(tx, tz)) return false; return !wet(x, z) && !w.occ[w.idx(tx, tz)];
  }
  update(dt) {
    this.insects(dt);
    const g = this.game, speedK = Math.max(0, g.clock.speed); if (!speedK) return; dt *= Math.min(2, speedK);
    const night = g.atmosphere.night || 0, cam = g.camera.position, p = g.player;
    // more animals as the town (and its farms and homes) grows
    this.spawnT = (this.spawnT || 3) - dt; if (this.spawnT <= 0) { this.spawnT = 6; for (const [k, n] of Object.entries(WANT)) { const have = this.list.filter((a) => a.kind === k).length; if (have < n(g)) { this.spawn(k); break; } } }
    for (const a of this.list) {
      const C = a.C, active = C.time === 'night' ? night > 0.45 : C.time === 'day' ? night < 0.6 : true;
      const near = Math.hypot(a.x - cam.x, a.z - cam.z) < (g.mode === 'god' ? 140 : 90);
      a.g.visible = active && near && (g.mode !== 'god' || g.god.dist < 160); if (!active) continue;
      a.t -= dt;
      // who is close? Sam or any citizen (a cat only minds Sam; sheep and cows hardly mind anyone)
      let threat = null, td = C.flee; { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < td && !p.transit) { td = d; threat = p; } }
      if (!threat && a.t < 0.5 && C.flee > 2) for (const s of g.population.sims) { if (s.hidden || s.inside) continue; const d = Math.hypot(s.x - a.x, s.z - a.z); if (d < td * 0.8) { threat = s; break; } }
      if (threat && a.state !== 'flee') { const ang = Math.atan2(a.x - threat.x, a.z - threat.z) + (Math.random() - 0.5) * 0.6, r = C.fleeR; a.tx = a.x + Math.sin(ang) * r; a.tz = a.z + Math.cos(ang) * r; a.state = 'flee'; a.t = 2.5; if (C.climb) a.up = 1; }
      else if (a.t <= 0) { if (a.state !== 'walk') { const ang = Math.random() * 6.28, r = 1.5 + Math.random() * C.wander; a.tx = a.x + Math.sin(ang) * r; a.tz = a.z + Math.cos(ang) * r; a.state = 'walk'; a.t = 7; } else { a.state = 'graze'; a.t = 2 + Math.random() * 6; } }
      if (!this.okTile(a, a.tx, a.tz)) { a.tx = a.x; a.tz = a.z; }
      if (!this.okTile(a, a.x, a.z) && (a.C.home !== 'water' || (a.strand = (a.strand || 0) + dt) > 4)) { a.strand = 0; const sp = this.spot(C.home); if (sp) { a.x = a.tx = (sp[0] + 0.5) * TILE; a.z = a.tz = (sp[1] + 0.5) * TILE; } }   // a building went up on top of it
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz), moving = a.state !== 'graze' && d > 0.2, sp = a.state === 'flee' ? C.fast : C.speed;
      if (moving) { const want = Math.atan2(dx, dz); let dh = want - a.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); a.h += dh * Math.min(1, dt * 8); const st = Math.min(d, sp * dt); a.x += Math.sin(a.h) * st; a.z += Math.cos(a.h) * st; a.ph += st * C.step; }
      else if (a.state === 'walk' || a.state === 'flee') { a.state = 'graze'; a.t = 2 + Math.random() * 5; }
      if (a.up > 0) a.up = Math.max(0, a.up - dt * 0.15);   // a squirrel up a tree comes back down eventually
      const hop = C.hop && moving ? Math.abs(Math.sin(a.ph)) * C.hop : 0, bob = C.home === 'water' ? -0.92 + Math.sin(this.t * 2 + a.ph) * 0.03 : 0;   // sitting in the sea (at -0.5), not hovering over it
      a.g.position.set(a.x, hop + bob + a.up * 3, a.z); a.g.rotation.y = a.h;
      for (const [i, l] of a.legs.entries()) l.rotation.x = moving ? Math.sin(a.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.2 : 0)) * 0.6 : 0;
      if (C.peck && !moving) a.g.rotation.x = Math.max(0, Math.sin(this.t * 6 + a.ph)) * 0.35; else a.g.rotation.x = 0;
    }
  }
}

// ---------- what lives on the island ----------
const box = (g, w, h, d, c, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
const leg = (g, legs, w, h, c, x, y, z) => { const l = new THREE.Group(); l.position.set(x, y, z); box(l, w, h, w, c, 0, -h / 2, 0); g.add(l); legs.push(l); };
const quad = (g, legs, c, sx, sz, h, w = 0.1) => { for (const [x, z] of [[-sx, sz], [sx, sz], [-sx, -sz], [sx, -sz]]) leg(g, legs, w, h, c, x, h, z); };
const eyes = (g, y, z, sx = 0.06) => { box(g, 0.03, 0.03, 0.02, 0x111111, -sx, y, z); box(g, 0.03, 0.03, 0.02, 0x111111, sx, y, z); };
const KINDS = {
  rabbit: { home: 'forest', time: 'any', speed: 1.6, fast: 6.5, flee: 6, fleeR: 9, wander: 5, step: 6, hop: 0.28,
    make(g) { const f = Math.random() < 0.5 ? 0x9a7a5a : 0xb8a58a; box(g, 0.28, 0.24, 0.42, f, 0, 0.2, 0); box(g, 0.2, 0.2, 0.2, f, 0, 0.34, 0.24); box(g, 0.05, 0.22, 0.05, f, -0.05, 0.53, 0.22); box(g, 0.05, 0.22, 0.05, f, 0.05, 0.53, 0.22); box(g, 0.1, 0.1, 0.08, 0xf0ece2, 0, 0.24, -0.24); eyes(g, 0.38, 0.34, 0.07); } },
  deer: { home: 'forest', time: 'any', speed: 1.4, fast: 8, flee: 10, fleeR: 16, wander: 9, step: 3.2,
    make(g, legs) { const h = 0x8a5a32, p = 0xd9c4a0; box(g, 0.42, 0.45, 1.1, h, 0, 1.0, 0); box(g, 0.2, 0.5, 0.22, h, 0, 1.35, 0.55, -0.5); box(g, 0.24, 0.24, 0.42, h, 0, 1.62, 0.72); box(g, 0.26, 0.2, 0.1, p, 0, 0.98, -0.56); quad(g, legs, h, 0.14, 0.42, 0.8, 0.09); if (Math.random() < 0.5) for (const sx of [-1, 1]) { box(g, 0.04, 0.3, 0.04, p, sx * 0.08, 1.88, 0.66); box(g, 0.14, 0.04, 0.04, p, sx * 0.14, 1.98, 0.66); } eyes(g, 1.66, 0.94, 0.12); } },
  sheep: { home: 'farm', time: 'any', speed: 0.7, fast: 3.2, flee: 3, fleeR: 6, wander: 6, step: 4,
    make(g, legs) { const wool = Math.random() < 0.9 ? 0xeeeae0 : 0x3a3530; box(g, 0.6, 0.5, 0.9, wool, 0, 0.75, 0); box(g, 0.66, 0.2, 0.7, wool, 0, 1.0, 0); box(g, 0.24, 0.26, 0.3, 0x2a2420, 0, 0.88, 0.55); quad(g, legs, 0x2a2420, 0.18, 0.3, 0.5, 0.08); eyes(g, 0.92, 0.71, 0.07); } },
  cow: { home: 'farm', time: 'any', speed: 0.6, fast: 2.6, flee: 2.5, fleeR: 5, wander: 6, step: 3,
    make(g, legs) { const b = 0xf2f0ea, s = 0x222222; box(g, 0.75, 0.75, 1.7, b, 0, 1.15, 0); box(g, 0.77, 0.4, 0.6, s, 0, 1.25, 0.2); box(g, 0.77, 0.3, 0.4, s, 0, 1.0, -0.5); box(g, 0.4, 0.42, 0.5, b, 0, 1.3, 1.05); box(g, 0.3, 0.2, 0.12, 0xe8a8a0, 0, 1.15, 1.32); box(g, 0.5, 0.06, 0.06, 0xd8d0b8, 0, 1.55, 0.95); box(g, 0.2, 0.15, 0.25, 0xe8a8a0, 0, 0.72, -0.3); quad(g, legs, b, 0.26, 0.6, 0.78, 0.13); eyes(g, 1.4, 1.31, 0.13); } },
  chicken: { home: 'town', time: 'day', speed: 0.9, fast: 3.5, flee: 2.5, fleeR: 4, wander: 3, step: 9, hop: 0.06, peck: true,
    make(g) { const c = Math.random() < 0.6 ? 0xb8642a : 0xf2f0ea; box(g, 0.24, 0.24, 0.32, c, 0, 0.3, 0); box(g, 0.14, 0.18, 0.14, c, 0, 0.48, 0.14); box(g, 0.05, 0.08, 0.06, 0xd03020, 0, 0.6, 0.15); box(g, 0.05, 0.04, 0.08, 0xf2b02a, 0, 0.48, 0.24); box(g, 0.1, 0.16, 0.06, c, 0, 0.4, -0.18); for (const x of [-0.06, 0.06]) box(g, 0.03, 0.18, 0.03, 0xf2b02a, x, 0.09, 0); eyes(g, 0.52, 0.21, 0.05); } },
  cat: { home: 'town', time: 'any', speed: 0.9, fast: 5, flee: 2.2, fleeR: 6, wander: 6, step: 7,
    make(g, legs) { const c = [0xd88a3a, 0x2a2a2a, 0x8a8a8a, 0xf0ece2][Math.floor(Math.random() * 4)]; box(g, 0.2, 0.2, 0.5, c, 0, 0.3, 0); box(g, 0.2, 0.18, 0.18, c, 0, 0.42, 0.3); box(g, 0.05, 0.08, 0.04, c, -0.06, 0.54, 0.3); box(g, 0.05, 0.08, 0.04, c, 0.06, 0.54, 0.3); box(g, 0.05, 0.05, 0.4, c, 0, 0.5, -0.36, -0.9); quad(g, legs, c, 0.07, 0.17, 0.22, 0.05); eyes(g, 0.45, 0.4, 0.05); } },
  squirrel: { home: 'forest', time: 'day', speed: 2.2, fast: 7, flee: 5, fleeR: 4, wander: 4, step: 8, hop: 0.2, climb: true,
    make(g) { const c = 0xa8542a; box(g, 0.14, 0.14, 0.24, c, 0, 0.16, 0); box(g, 0.12, 0.12, 0.12, c, 0, 0.26, 0.14); box(g, 0.14, 0.3, 0.1, c, 0, 0.32, -0.16, 0.3); eyes(g, 0.28, 0.21, 0.04); } },
  duck: { home: 'water', time: 'day', speed: 0.5, fast: 2.5, flee: 4, fleeR: 6, wander: 4, step: 2,
    make(g) { const drake = Math.random() < 0.5; box(g, 0.26, 0.2, 0.42, drake ? 0x8a8070 : 0x9a7a52, 0, 0.5, 0); box(g, 0.14, 0.16, 0.14, drake ? 0x1f6a3a : 0x8a6a42, 0, 0.66, 0.18); box(g, 0.08, 0.04, 0.12, 0xf2b02a, 0, 0.64, 0.3); box(g, 0.1, 0.08, 0.1, 0x7a6a52, 0, 0.56, -0.24); eyes(g, 0.7, 0.25, 0.05); } },
  fox: { home: 'open', time: 'night', speed: 1.6, fast: 7, flee: 7, fleeR: 12, wander: 12, step: 6,
    make(g, legs) { const c = 0xc8601e; box(g, 0.24, 0.24, 0.62, c, 0, 0.45, 0); box(g, 0.22, 0.2, 0.24, c, 0, 0.56, 0.38); box(g, 0.1, 0.08, 0.14, 0xf0ece2, 0, 0.5, 0.52); box(g, 0.05, 0.1, 0.04, 0x2a1a10, -0.07, 0.7, 0.34); box(g, 0.05, 0.1, 0.04, 0x2a1a10, 0.07, 0.7, 0.34); box(g, 0.12, 0.12, 0.42, c, 0, 0.48, -0.5, -0.4); box(g, 0.1, 0.1, 0.1, 0xf0ece2, 0, 0.38, -0.7); quad(g, legs, 0x2a1a10, 0.08, 0.22, 0.34, 0.06); eyes(g, 0.6, 0.5, 0.06); } },
  hedgehog: { home: 'town', time: 'night', speed: 0.35, fast: 0.6, flee: 1.5, fleeR: 1, wander: 3, step: 8,
    make(g) { box(g, 0.3, 0.2, 0.4, 0x5a4632, 0, 0.12, 0); box(g, 0.34, 0.12, 0.36, 0x3a2a1e, 0, 0.24, -0.02); box(g, 0.1, 0.1, 0.12, 0xa88a6a, 0, 0.1, 0.24); eyes(g, 0.14, 0.3, 0.04); } },
  pigeon: { home: 'town', time: 'day', speed: 0.8, fast: 4, flee: 2.2, fleeR: 5, wander: 3, step: 9, hop: 0.04, peck: true,
    make(g) { const c = Math.random() < 0.8 ? 0x8a8e98 : 0xc8c4bc; box(g, 0.18, 0.18, 0.3, c, 0, 0.22, 0); box(g, 0.12, 0.12, 0.12, c, 0, 0.36, 0.13); box(g, 0.13, 0.06, 0.06, 0x4a7a6a, 0, 0.3, 0.1); box(g, 0.03, 0.03, 0.06, 0xd8c8b0, 0, 0.35, 0.21); box(g, 0.12, 0.04, 0.14, 0x5a5e68, 0, 0.24, -0.2); for (const x of [-0.04, 0.04]) box(g, 0.02, 0.13, 0.02, 0xc85a5a, x, 0.07, 0); eyes(g, 0.38, 0.18, 0.04); } },
  badger: { home: 'forest', time: 'night', speed: 0.7, fast: 2.6, flee: 4, fleeR: 6, wander: 6, step: 6,
    make(g, legs) { const c = 0x6a6a6a; box(g, 0.34, 0.24, 0.6, c, 0, 0.28, 0); box(g, 0.2, 0.18, 0.26, 0xf0ece2, 0, 0.3, 0.36); box(g, 0.06, 0.19, 0.24, 0x1a1a1a, -0.05, 0.31, 0.37); box(g, 0.06, 0.19, 0.24, 0x1a1a1a, 0.05, 0.31, 0.37); box(g, 0.05, 0.04, 0.05, 0x111111, 0, 0.26, 0.5); quad(g, legs, 0x1a1a1a, 0.12, 0.2, 0.16, 0.07); eyes(g, 0.34, 0.49, 0.05); } },
  pig: { home: 'farm', time: 'any', speed: 0.5, fast: 2.4, flee: 2, fleeR: 4, wander: 4, step: 4,
    make(g, legs) { const c = Math.random() < 0.7 ? 0xf0b8b0 : 0x4a3a34; box(g, 0.5, 0.45, 0.85, c, 0, 0.5, 0); box(g, 0.36, 0.34, 0.24, c, 0, 0.55, 0.52); box(g, 0.18, 0.14, 0.06, 0xe09890, 0, 0.5, 0.66); box(g, 0.1, 0.1, 0.04, c, -0.12, 0.76, 0.5); box(g, 0.1, 0.1, 0.04, c, 0.12, 0.76, 0.5); box(g, 0.04, 0.04, 0.12, c, 0, 0.6, -0.48, -0.6); quad(g, legs, c, 0.15, 0.28, 0.3, 0.1); eyes(g, 0.64, 0.64, 0.08); } },
  horse: { home: 'farm', time: 'any', speed: 0.6, fast: 3.2, flee: 2.5, fleeR: 6, wander: 7, step: 3,
    make(g, legs) { const c = [0x6a4428, 0x3a2a20, 0xb8a890, 0x8a5a32][Math.floor(Math.random() * 4)], m = 0x2a1e16; box(g, 0.5, 0.6, 1.5, c, 0, 1.3, 0); box(g, 0.3, 0.7, 0.32, c, 0, 1.7, 0.75, -0.5); box(g, 0.28, 0.3, 0.62, c, 0, 2.0, 1.05); box(g, 0.08, 0.5, 0.36, m, 0, 1.9, 0.62, -0.5); box(g, 0.1, 0.6, 0.12, m, 0, 1.2, -0.8, 0.3); quad(g, legs, c, 0.17, 0.55, 1.0, 0.12); eyes(g, 2.06, 1.28, 0.15); } },
  swan: { home: 'water', time: 'day', speed: 0.35, fast: 1.8, flee: 3, fleeR: 5, wander: 5, step: 2,
    make(g) { const c = 0xf6f4ee; box(g, 0.36, 0.24, 0.66, c, 0, 0.5, 0); box(g, 0.08, 0.5, 0.08, c, 0, 0.82, 0.26, -0.15); box(g, 0.1, 0.1, 0.18, c, 0, 1.08, 0.33); box(g, 0.06, 0.05, 0.12, 0xe07020, 0, 1.06, 0.46); box(g, 0.24, 0.12, 0.2, c, 0, 0.62, -0.32, 0.4); eyes(g, 1.11, 0.4, 0.05); } },
};
KINDS.fox.home = 'forest';
// how many of each, given the town
const has = (g, id) => g.buildings.list.some((b) => b.id === id && b.state === 'done'), homes = (g) => g.buildings.list.filter((b) => b.state === 'done' && b.def.cat === 'res').length;
const WANT = {
  rabbit: () => 10, deer: () => 4, squirrel: () => 5, duck: () => 6, fox: () => 2, badger: () => 2, swan: () => 2,
  sheep: (g) => (has(g, 'farm') ? 9 : 4), cow: (g) => (has(g, 'farm') ? 4 : 0), pig: (g) => (has(g, 'farm') ? 4 : 0), horse: (g) => (has(g, 'stables') ? 3 : has(g, 'farm') ? 1 : 0),
  pigeon: (g) => Math.min(10, Math.floor(homes(g) / 2)),
  chicken: (g) => Math.min(8, homes(g)), cat: (g) => Math.min(5, Math.floor(homes(g) / 2)), hedgehog: (g) => Math.min(3, homes(g)),
};
