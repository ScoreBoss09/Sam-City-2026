import * as THREE from 'three';
import { MAP, TILE } from '../config.js';
import { T } from '../world/World.js';

/**
 * Birds with somewhere to be. Seagulls soar and bank over the coast, ride thermals in tight climbing circles, dive for
 * fish and settle on rooftops (and take off again if Sam gets close). At dusk a murmuration of starlings swirls over the
 * woods. Pigeons peck about the streets and clatter up and away when people walk through them.
 */
const SEA = -0.5;
const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });

export class Birds {
  constructor(game) {
    this.game = game; this.t = 0;
    const sc = game.scene, white = mat(0xf4f4f4), grey = mat(0x8a929c), dark = mat(0x2a2d33);
    // gulls: a body, two hinged wings with grey tips
    this.gulls = [];
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.7), white); g.add(body); const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.22), white); head.position.set(0, 0.08, 0.42); g.add(head);
      const beak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.14), mat(0xf2b02a)); beak.position.set(0, 0.06, 0.58); g.add(beak);
      const wl = new THREE.Group(), wr = new THREE.Group(); g.add(wl, wr);
      for (const [par, sx] of [[wl, -1], [wr, 1]]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.38), white); w.position.x = sx * 0.45; par.add(w); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.3), grey); tip.position.x = sx * 1.05; par.add(tip); }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); sc.add(g);
      const q = { g, wl, wr, x: 40 + Math.random() * 240, z: 40 + Math.random() * 240, y: 10 + Math.random() * 10, h: Math.random() * 6.28, bank: 0, speed: 7, state: 'soar', t: Math.random() * 8, tx: 0, tz: 0, ty: 14, ph: Math.random() * 6 };
      this.pickSoar(q); this.gulls.push(q);
    }
    // starlings: one instanced draw for the whole murmuration
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, -0.08, 0.22, 0, -0.08, 0, 0, 0.22, 0, 0.04, -0.12, 0, 0.04, 0.1, 0, -0.03, 0], 3)); tri.setIndex([0, 2, 1, 0, 1, 2, 3, 4, 5]); tri.computeVertexNormals();
    this.NS = 90; this.starlings = new THREE.InstancedMesh(tri, new THREE.MeshBasicMaterial({ color: 0x1a1c22, side: THREE.DoubleSide }), this.NS); this.starlings.frustumCulled = false; sc.add(this.starlings);
    this.sOff = Array.from({ length: this.NS }, () => [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28, 0.6 + Math.random() * 0.8]); this.sPrev = []; this.m4 = new THREE.Matrix4(); this.q4 = new THREE.Quaternion(); this.v3 = new THREE.Vector3(); this.s3 = new THREE.Vector3(1, 1, 1); this.e = new THREE.Euler();
    // pigeons: little grey birds on the ground in town
    this.pigeons = [];
    for (let i = 0; i < 30; i++) {
      const g = new THREE.Group(), c = Math.random() < 0.8 ? 0x8a8f98 : 0xd8d4cc, b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.28), mat(c)); b.position.y = 0.14; g.add(b);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat(0x5a6a7a)); hd.position.set(0, 0.26, 0.13); g.add(hd);
      const wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.14), mat(c)); wl.position.set(-0.15, 0.18, 0); wl.visible = false; const wr = wl.clone(); wr.position.x = 0.15; g.add(wl, wr);
      sc.add(g); this.pigeons.push({ g, hd, wl, wr, flock: i % 3, x: 0, z: 0, y: 0, state: 'peck', t: Math.random() * 3, fx: 0, fz: 0, sx: 0, sz: 0, u: 0, ph: Math.random() * 6 });
    }
    this.flockAt = null; void dark;
    // garden birds: sparrows, blackbirds, robins and blue tits hopping about lawns, verges and rooftops near you, flitting off when disturbed
    const sb = new THREE.BoxGeometry(0.11, 0.1, 0.17); this.NB = 48; this.small = new THREE.InstancedMesh(sb, new THREE.MeshLambertMaterial({ color: 0xffffff }), this.NB); this.small.frustumCulled = false; sc.add(this.small);
    const COL = [0x8a6a48, 0x8a6a48, 0x7a5a3a, 0x1a1a1c, 0x1a1a1c, 0xb85a2a, 0x4a7ab8]; this.sb = Array.from({ length: this.NB }, (_, i) => ({ x: 0, y: -50, z: 0, h: 0, st: 'off', t: Math.random() * 3, c: COL[i % COL.length] }));
    this.sb.forEach((b, i) => this.small.setColorAt(i, new THREE.Color(b.c))); this.small.instanceColor.needsUpdate = true;
  }
  /** A new wandering target for a gull: mostly along the coast, sometimes over town. */
  pickSoar(q) {
    const w = this.game.world, cam = this.game.camera.position;
    if (Math.random() < 0.7) { const a = Math.random() * 6.28, r = 20 + Math.random() * 80; q.tx = cam.x + Math.cos(a) * r; q.tz = cam.z + Math.sin(a) * r; q.ty = 8 + Math.random() * 18; q.state = 'soar'; q.t = 6 + Math.random() * 10; return; }   // mostly round about where you are
    for (let k = 0; k < 12; k++) { const tx = Math.floor(Math.random() * MAP), tz = Math.floor(Math.random() * MAP), water = w.terrain[w.idx(tx, tz)] === T.WATER; if (water && k < 6 && Math.random() < 0.3) continue; q.tx = (tx + 0.5) * TILE; q.tz = (tz + 0.5) * TILE; break; }
    q.ty = 8 + Math.random() * 18; q.state = 'soar'; q.t = 6 + Math.random() * 10;
  }
  update(dt) {
    const g = this.game; this.t += dt; const t = this.t, cam = g.camera.position, P = g.player, w = g.world;
    // ---------- gulls ----------
    for (const q of this.gulls) {
      q.t -= dt; let flap = false;
      if (q.state === 'perch') {
        q.g.position.set(q.x, q.y, q.z); q.wl.rotation.z = 0.15; q.wr.rotation.z = -0.15; q.g.rotation.z = 0; q.g.rotation.x = 0;
        if (q.t <= 0 || (q.on && (q.on.remove || !g.buildings.list.includes(q.on))) || Math.hypot(P.x - q.x, P.z - q.z) < 7 && Math.abs((P.floorY || 0) + 1.6 - q.y) < 6) { this.pickSoar(q); q.ty = q.y + 8; q.speed = 4; }
        continue;
      }
      if (q.state === 'soar' && q.t <= 0) {   // what next? keep soaring, ride a thermal, dive for a fish, or land on a roof
        const r = Math.random(), roofs = g.buildings.list.filter((b) => b.state === 'done' && !b.def.park && b.ext);
        if (r < 0.25) { q.state = 'thermal'; q.t = 8 + Math.random() * 6; q.cx = q.x; q.cz = q.z; q.ang = Math.random() * 6.28; }
        else if (r < 0.45) { let ok = false; for (let k = 0; k < 10 && !ok; k++) { const tx = Math.floor(q.x / TILE) + Math.round((Math.random() - 0.5) * 12), tz = Math.floor(q.z / TILE) + Math.round((Math.random() - 0.5) * 12); if (w.inBounds(tx, tz) && w.terrain[w.idx(tx, tz)] === T.WATER) { q.tx = (tx + 0.5) * TILE; q.tz = (tz + 0.5) * TILE; ok = true; } } if (ok) { q.state = 'dive'; q.t = 12; } else this.pickSoar(q); }
        else if (r < 0.62 && roofs.length) { const b = roofs[Math.floor(Math.random() * roofs.length)], H = (b.def.floors || 1) * 3.2 + (['gable', 'thatch', 'church'].includes(b.def.roof) ? 2.2 : 0.4); q.state = 'land'; q.on = b; q.tx = b.cx + (Math.random() - 0.5) * 2; q.tz = b.cz + (Math.random() - 0.5) * 2; q.ty = H; q.t = 20; }
        else this.pickSoar(q);
      }
      let tx = q.tx, tz = q.tz, ty = q.ty;
      if (q.state === 'thermal') { q.ang += dt * 0.9; tx = q.cx + Math.cos(q.ang) * 9; tz = q.cz + Math.sin(q.ang) * 9; ty = q.y + 1.2; flap = false; if (q.t <= 0) this.pickSoar(q); }
      if (q.state === 'dive') { const d2 = Math.hypot(tx - q.x, tz - q.z); ty = d2 < 10 ? SEA + 0.4 : Math.max(q.y, 6); if (q.t <= 0) { q.state = 'climb'; q.t = 3; } if (q.y < SEA + 0.9) { q.state = 'climb'; q.t = 3; g.particles && Math.hypot(cam.x - q.x, cam.z - q.z) < 60 && g.particles.burst(q.x, SEA + 0.1, q.z, 0xdfeaf2, 6, 1.5, 2, 0.08); } }
      if (q.state === 'climb') { ty = 14; flap = true; if (q.t <= 0) this.pickSoar(q); }
      if (q.state !== 'dive') ty = Math.max(ty, 3);   // only a diving gull goes down to the water
      if (q.state === 'land') { const d2 = Math.hypot(tx - q.x, tz - q.z); if (d2 < 1.2 && Math.abs(q.y - ty) < 0.6) { q.state = 'perch'; q.y = ty; q.t = 6 + Math.random() * 14; continue; } if (d2 > 6) ty = Math.max(ty + 4, q.y); if (q.t <= 0) this.pickSoar(q); }
      // steer: turn towards the target (banking into the turn), ease up and down, slow right down to land
      const dx = tx - q.x, dz = tz - q.z, dist = Math.hypot(dx, dz), want = Math.atan2(dx, dz); let dh = want - q.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      const turn = Math.max(-1.4, Math.min(1.4, dh * 1.6)); q.h += turn * dt; q.bank += (-turn * 0.45 - q.bank) * Math.min(1, dt * 3);
      const vSpeed = q.state === 'land' ? Math.min(7, 1 + dist * 0.6) : q.state === 'dive' ? 10 : q.state === 'thermal' ? 6 : 7.5; q.speed += (vSpeed - q.speed) * Math.min(1, dt * 1.5);
      q.x += Math.sin(q.h) * q.speed * dt; q.z += Math.cos(q.h) * q.speed * dt; const vy = (ty - q.y) * (q.state === 'dive' ? 1.6 : 0.6); q.y += Math.max(-9, Math.min(4, vy)) * dt;
      if (q.state === 'soar' && dist < 6) this.pickSoar(q);
      flap = flap || vy > 1.2 || q.state === 'land' || ((t + q.ph) % 9) < 1.4;
      const f = flap ? Math.sin(t * 9 + q.ph) * 0.65 : (q.state === 'dive' ? -0.6 : 0.12 + Math.sin(t * 1.3 + q.ph) * 0.05);   // glide with wings held a little up; fold them in a dive
      q.wl.rotation.z = f; q.wr.rotation.z = -f;
      q.g.position.set(q.x, q.y, q.z); q.g.rotation.set(Math.max(-0.6, Math.min(0.5, -vy * 0.08)), q.h, 0, 'YXZ'); q.g.rotation.z = q.bank;
    }
    // ---------- starlings: a murmuration at dusk (and now and then by day), swirling as one ----------
    const h = g.clock.hour, dusk = h >= 16.5 && h < 19.8, show = (dusk || (h > 10 && h < 11.2)) && (g.atmosphere.rain || 0) < 0.4;
    this.starlings.visible = show;
    if (show) {
      if (!this.flockAt) { const sp = g.wildlife && g.wildlife.spots && g.wildlife.spots.length ? g.wildlife.spots[Math.floor(Math.random() * g.wildlife.spots.length)] : [20, 20]; this.flockAt = { x: (sp[0] + 0.5) * TILE, z: (sp[1] + 0.5) * TILE }; }
      const F = this.flockAt, cx = F.x + Math.sin(t * 0.13) * 30 + Math.sin(t * 0.31) * 12, cz = F.z + Math.cos(t * 0.11) * 30 + Math.sin(t * 0.27) * 10, cy = 22 + Math.sin(t * 0.2) * 6;
      const breathe = 6 + Math.sin(t * 0.37) * 4 + Math.sin(t * 0.9) * 1.5, stretch = 1 + Math.sin(t * 0.23) * 0.6;
      for (let i = 0; i < this.NS; i++) {
        const o = this.sOff[i], a = t * 0.8 * o[3] + o[0], b = t * 0.6 * o[3] + o[1];
        const x = cx + (Math.sin(a) * breathe * stretch + Math.sin(b * 1.7 + o[2]) * 2.2), y = cy + Math.sin(b + o[2]) * breathe * 0.45, z = cz + (Math.cos(a * 0.9 + o[2]) * breathe + Math.cos(b * 1.3) * 2.2);
        const pv = this.sPrev[i] || [x, y, z - 0.1]; const vx = x - pv[0], vz = z - pv[2]; this.sPrev[i] = [x, y, z];
        this.e.set(Math.sin(t * 14 + i) * 0.3, Math.atan2(vx, vz), Math.sin(t * 20 + i * 1.7) * 0.5); this.q4.setFromEuler(this.e); this.v3.set(x, y, z); this.m4.compose(this.v3, this.q4, this.s3); this.starlings.setMatrixAt(i, this.m4);
      }
      this.starlings.instanceMatrix.needsUpdate = true;
    } else this.flockAt = null;
    // ---------- pigeons ----------
    if (!this.homes || (this.reT = (this.reT || 0) - dt) <= 0) { this.reT = 8; const old = this.homes || []; this.homes = [0, 1, 2].map((i) => (old[i] && Math.hypot(old[i].x - cam.x, old[i].z - cam.z) < 90 ? old[i] : this.townSpot(cam))); for (const p of this.pigeons) if (this.homes[p.flock] !== old[p.flock]) p.placed = false; if (this.homes.some((h) => !h)) this.reT = 1; }   // nowhere yet: try again soon
    for (const p of this.pigeons) {
      const home = this.homes[p.flock]; if (!home) { p.g.visible = false; continue; }
      if (!p.placed) { p.placed = true; p.x = home.x + (Math.random() - 0.5) * 6; p.z = home.z + (Math.random() - 0.5) * 6; }
      p.g.visible = Math.hypot(p.x - cam.x, p.z - cam.z) < 95 && (g.atmosphere.night || 0) < 0.5; p.t -= dt;
      if (p.state === 'peck') {
        const close = Math.hypot(P.x - p.x, P.z - p.z) < 3 || g.population.sims.some((s) => !s.inside && Math.abs(s.x - p.x) < 2 && Math.abs(s.z - p.z) < 2 && s.moved);
        if (close || p.t <= -20) { const a = Math.random() * 6.28, r = 12 + Math.random() * 12; p.state = 'fly'; p.u = 0; p.sx = p.x; p.sz = p.z; p.fx = home.x + Math.cos(a) * r * 0.4 + (close ? Math.cos(a) * r * 0.6 : 0); p.fz = home.z + Math.sin(a) * r * 0.4 + (close ? Math.sin(a) * r * 0.6 : 0); }
        else if (p.t <= 0) { p.t = 0.5 + Math.random() * 1.5; p.h = (p.h || 0) + (Math.random() - 0.5) * 2; p.x += Math.sin(p.h) * 0.25; p.z += Math.cos(p.h) * 0.25; }
        p.hd.position.y = 0.26 - Math.max(0, Math.sin(t * 8 + p.ph)) * 0.1; p.y = 0; p.wl.visible = p.wr.visible = false;
      } else {
        p.u = Math.min(1, p.u + dt * 0.6); const k = p.u; p.x = p.sx + (p.fx - p.sx) * k; p.z = p.sz + (p.fz - p.sz) * k; p.y = Math.sin(k * Math.PI) * 5; p.h = Math.atan2(p.fx - p.sx, p.fz - p.sz);
        p.wl.visible = p.wr.visible = true; const f = Math.sin(t * 22 + p.ph) * 0.8; p.wl.rotation.z = f; p.wr.rotation.z = -f; if (k >= 1) { p.state = 'peck'; p.t = 1; }
      }
      p.g.position.set(p.x, p.y, p.z); p.g.rotation.y = p.h || 0;
    }
    this.smallBirds(dt, t, cam, P, w);
  }
  /** Garden birds: each perches near you (grass, a verge, a roof edge), hops and pecks, and flits to a new spot now and then or when someone comes close. */
  smallBirds(dt, t, cam, P, w) {
    const g = this.game, day = (g.atmosphere.night || 0) < 0.5 && (g.atmosphere.rain || 0) < 0.6; this.small.visible = day; if (!day) return;
    const spot = () => { for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28, r = 6 + Math.random() * 45, x = cam.x + Math.cos(a) * r, z = cam.z + Math.sin(a) * r, [tx, tz] = w.tileOf(x, z); if (!w.inBounds(tx, tz) || w.terrain[w.idx(tx, tz)] === T.WATER) continue; const b = w.buildingAt ? w.buildingAt(tx, tz) : null; if (b && b.state === 'done' && !b.def.park && Math.random() < 0.6) { const H = (b.def.floors || 1) * 3.2; return { x, z, y: H + 0.05 }; } if (w.collides(x, z, 0.2)) continue; return { x, z, y: 0.05 }; } return null; };
    for (let i = 0; i < this.NB; i++) {
      const b = this.sb[i]; b.t -= dt;
      if (b.st === 'off' || Math.hypot(b.x - cam.x, b.z - cam.z) > 70) { const s2 = spot(); if (s2) Object.assign(b, s2, { st: 'perch', t: 2 + Math.random() * 6 }); }
      else if (b.st === 'perch') {
        const scared = Math.hypot(P.x - b.x, P.z - b.z) < 2.5 && Math.abs((P.floorY || 0) - b.y) < 2;
        if (scared || b.t <= 0) { const s2 = Math.random() < 0.5 || scared ? spot() : { x: b.x + (Math.random() - 0.5) * 6, z: b.z + (Math.random() - 0.5) * 6, y: b.y }; if (s2) { b.st = 'fly'; b.u = 0; b.sx = b.x; b.sy = b.y; b.sz = b.z; b.fx = s2.x; b.fy = s2.y; b.fz = s2.z; b.h = Math.atan2(s2.x - b.x, s2.z - b.z); } else b.t = 2; }
        else if (Math.random() < dt * 1.5) { b.h += (Math.random() - 0.5) * 2; b.x += Math.sin(b.h) * 0.12; b.z += Math.cos(b.h) * 0.12; b.hop = 0.15; }   // a hop
      } else { const L = Math.hypot(b.fx - b.sx, b.fz - b.sz) + 1; b.u = Math.min(1, b.u + dt * 9 / L); const k = b.u; b.x = b.sx + (b.fx - b.sx) * k; b.z = b.sz + (b.fz - b.sz) * k; b.y = b.sy + (b.fy - b.sy) * k + Math.sin(k * Math.PI) * Math.min(4, L * 0.3) + Math.sin(t * 30 + i) * 0.04; if (k >= 1) { b.st = 'perch'; b.t = 3 + Math.random() * 8; } }
      if (b.hop > 0) b.hop -= dt; const hop = b.hop > 0 ? Math.sin(b.hop / 0.15 * Math.PI) * 0.07 : 0, peck = b.st === 'perch' ? Math.max(0, Math.sin(t * 5 + i * 1.3)) * 0.3 : 0;
      this.e.set(peck, b.h, 0); this.q4.setFromEuler(this.e); this.v3.set(b.x, b.y + 0.05 + hop, b.z); this.m4.compose(this.v3, this.q4, this.s3); this.small.setMatrixAt(i, this.m4);
    }
    this.small.instanceMatrix.needsUpdate = true;
  }
  /** A square or street in the middle of town for the pigeons. */
  townSpot(near) {
    const g = this.game; let pl = g.buildings.list.filter((b) => b.state === 'done' && (b.def.park === 'plaza' || b.def.park === 'park' || b.def.park === 'camp' || b.def.shopping));
    if (near) { const close = pl.filter((b) => Math.hypot(b.cx - near.x, b.cz - near.z) < 55); if (close.length) pl = close; else { const w = g.world; for (let k = 0; k < 20; k++) { const x = near.x + (Math.random() - 0.5) * 70, z = near.z + (Math.random() - 0.5) * 70, [tx, tz] = w.tileOf(x, z); if (w.inBounds(tx, tz) && (w.road[w.idx(tx, tz)] || k > 12) && w.isLand(tx, tz) && !w.collides(x, z, 1)) return { x, z }; } return null; } }   // no square nearby: a bit of pavement will do
    if (!pl.length) return null; const b = pl[Math.floor(Math.random() * pl.length)]; return { x: b.doorOut ? b.doorOut.x : b.cx, z: b.doorOut ? b.doorOut.z + 2 : b.cz };
  }
}
