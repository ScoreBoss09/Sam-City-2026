import * as THREE from 'three';
import { T } from '../world/World.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { TILE } from '../config.js';

const bucketGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.26, 8), bucketMat = new THREE.MeshStandardMaterial({ color: 0x8a8e96, metalness: 0.4, roughness: 0.5 });
/** A red fire engine with a ladder on the roof and a big brass bell. */
function makeEngine() {
  const g = new THREE.Group(), add = (w, h, d, c, x, y, z, o = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(2.2, 1.5, 5.6, 0xc8202a, 0, 1.35, -0.3); add(2.2, 1.3, 1.6, 0xc8202a, 0, 1.25, 2.9); add(1.9, 0.55, 0.08, 0x9fd8f0, 0, 1.55, 3.71, { emissive: 0x1a3a4a }); add(2.0, 0.2, 7.0, 0x2a2a2a, 0, 0.55, 0.3);
  for (const x of [-0.45, 0.45]) add(0.08, 0.08, 5.0, 0xd8d8d8, x, 2.2, -0.4, { metalness: 0.6 }); for (let i = 0; i < 10; i++) add(0.9, 0.06, 0.06, 0xd8d8d8, 0, 2.2, -2.8 + i * 0.5, { metalness: 0.6 });   // the ladder
  add(0.3, 0.3, 0.3, 0xd8a83a, 0.8, 2.05, 2.6, { metalness: 0.8, roughness: 0.3 });   // the bell
  add(0.5, 0.18, 0.3, 0x2a5aff, 0, 1.98, 3.0, { emissive: 0x2a5aff, emissiveIntensity: 0.8 });   // blue light
  for (const [x, z] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -1.6], [1.05, -1.6], [-1.05, -2.6], [1.05, -2.6]]) add(0.35, 0.9, 0.9, 0x111111, x, 0.45, z);
  for (const x of [-1.12, 1.12]) add(0.06, 0.6, 3.6, 0xe8e2c8, x, 1.3, -0.6);   // rolled hoses
  return g;
}

/**
 * Peril from the sky and the ground: winter blizzards (everyone slows down), floods along the coast after heavy storms,
 * summer droughts (brown grass, failing crops, fires), building fires (firefighters from a Fire Station put them out,
 * otherwise they burn and the repairs are expensive), and power cuts once the town runs on electricity.
 */
export class Hazards {
  constructor(game) {
    this.game = game; this.dryDays = 0; this.drought = false; this.flood = 0; this.floodWant = 0; this.fires = []; this.powerCut = 0; this.lastDay = -1; this.wetHours = 0; this.foodK = 1;
    this.floodMat = new THREE.MeshStandardMaterial({ color: 0x3a6a8a, transparent: true, opacity: 0, roughness: 0.15, metalness: 0.3, depthWrite: false });
  }
  update(dt) {
    const g = this.game, c = g.clock, W = g.weather, gdt = dt * Math.max(0, c.speed); if (!g.started) return;
    // a new day: count dry summer days; heavy rain makes floods more likely
    if (c.totalDays !== this.lastDay) {
      this.lastDay = c.totalDays; const summer = c.month >= 5 && c.month <= 8;
      if (this.wetHours < 0.5 && summer) this.dryDays++; else if (this.wetHours > 1) this.dryDays = 0; this.wetHours = 0;
      if (!this.drought && this.dryDays >= 3) { this.drought = true; g.messages.push('The Water Board', 'Drought! Hosepipe ban in force. Crops are failing and the grass is turning brown. Wells and a Water Tower help.', 'warn'); g.ui.toast('☀️ Drought! Crops are failing.', 3600); }
      if (this.drought && (this.dryDays === 0 || !summer)) { this.drought = false; g.messages.push('The Water Board', 'The drought is over. The hosepipe ban is lifted.', 'good'); }
    }
    if (W && W.rain > 0.5) this.wetHours += gdt / 60;
    const water = g.buildings.count('water') + g.buildings.count('well') * 0.3;
    this.foodK = this.drought ? Math.min(1, 0.55 + water * 0.15) : W && W.blizzard ? 0.8 : 1;
    // drought tints the grass
    const gr = g.terrain && g.terrain.ground && g.terrain.ground.material; if (gr) { if (!this.baseGrass) this.baseGrass = gr.color.clone(); const k = (this.dryK = (this.dryK || 0) + ((this.drought ? 1 : 0) - (this.dryK || 0)) * Math.min(1, dt * 0.2)); gr.color.copy(this.baseGrass).lerp(new THREE.Color(0xb8a060), k * 0.55); }
    // floods: a long storm (or a spring tide in autumn/winter) and the coastal streets go under
    if (W && W.storm && W.rain > 0.8 && Math.random() < gdt * 0.004 && this.floodWant === 0) this.startFlood();
    if (this.floodWant > 0) { this.floodT -= gdt; if (this.floodT <= 0) { this.floodWant = 0; g.messages.push('The Harbour Master', 'The flood water has gone down. Mops out, everyone.', 'good'); } }
    this.flood += (this.floodWant - this.flood) * Math.min(1, dt * 0.15); this.floodMat.opacity = Math.min(0.75, this.flood * 0.8);
    if (this.floodMesh) { this.floodMesh.visible = this.flood > 0.01; this.floodMesh.position.y = 0.05 + this.flood * 0.32; }
    const slow = (W && W.blizzard ? 0.68 : 1) * (this.flood > 0.3 ? 0.85 : 1); if (W) W.slow = slow;
    // fires
    const pop = g.population.count(), fireRisk = (this.drought ? 0.004 : 0.0004) * Math.min(1, Math.max(0, pop - 25) / 40); if (Math.random() < gdt * fireRisk) this.ignite();   // hardly ever in a tiny village
    for (const f of this.fires) this.burn(f, dt, gdt);
    if (this.engines) { for (const E of this.engines) this.engineStep(E, Math.min(dt * Math.max(1, Math.min(4, g.clock.speed || 1)), 0.1)); this.engines = this.engines.filter((E) => !E.done); }
    this.fires = this.fires.filter((f) => !f.out);
    // power cuts (electric age and later)
    if (this.powerCut > 0) { this.powerCut -= gdt; if (this.powerCut <= 0) { this.powerCut = 0; g.messages.push('The Electricity Board', 'Power restored. We apologise for any inconvenience.', 'good'); } }
  }
  startFlood(force) {
    const g = this.game, w = g.world; this.floodWant = 1; this.floodT = 180 + Math.random() * 120;
    if (!this.floodMesh) {   // the coastal strip: land within two tiles of the sea
      const pos = [], idx = []; let o = 0, n = 0, homes = 0;
      for (let z = 0; z < 40; z++) for (let x = 0; x < 40; x++) {
        const i = w.idx(x, z); if (w.terrain[i] === T.WATER) continue; let near = false;
        for (let dz = -2; dz <= 2 && !near; dz++) for (let dx = -2; dx <= 2 && !near; dx++) { const xx = x + dx, zz = z + dz; if (w.inBounds(xx, zz) && w.terrain[w.idx(xx, zz)] === T.WATER) near = true; }
        if (!near) continue; const X = x * 8, Z = z * 8; pos.push(X, 0, Z, X + 8, 0, Z, X + 8, 0, Z + 8, X, 0, Z + 8); idx.push(o, o + 2, o + 1, o, o + 3, o + 2); o += 4; n++;
        const b = w.buildingAt(x, z); if (b && b.def.cat === 'res') homes++;
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      this.floodMesh = new THREE.Mesh(geo, this.floodMat); this.floodMesh.renderOrder = 3; g.scene.add(this.floodMesh); this.floodHomes = homes; void n;
    }
    g.messages.push('The Harbour Master', 'FLOOD! The sea has come over the coastal streets. Keep away from the shore until it goes down.', 'warn'); g.ui.toast('🌊 Flood along the coast!', 3600);
    for (const s of g.population.sims) if (s.home && Math.hypot(s.x - s.home.cx, s.z - s.home.cz) < 60) s.moodBoost -= 0.05;
    void force;
  }
  ignite(b) {
    const g = this.game; if (!b) { const L = g.buildings.list.filter((q) => q.state === 'done' && !q.def.park && !q.def.special && !q.def.open && !this.fires.some((f) => f.b === q)); if (!L.length) return; L.sort(() => Math.random() - 0.5); b = L.find((q) => q.def.roof === 'thatch' || ['timber', 'logs'].includes(q.def.wall)) || L[0]; }
    const f = { b, t: 0, hp: 1, out: false, smokeT: 0 }; this.fires.push(f); g.markers && g.markers.add(b.cx, b.cz, '🔥', 'Fire', 400, null, () => !f.out);
    f.src = this.waterNear(b);
    g.messages.push('Fire!', `The ${b.def.name} is on fire!${g.buildings.count('firestation') ? ' The fire brigade is on its way.' : f.src ? ' There\'s no fire brigade: the neighbours are running a bucket chain from the well.' : ' There\'s no fire brigade and no well for buckets: build a Well, or better, a Fire Station.'}`, 'warn');
    this.sendEngine(f); g.ui.toast(`🔥 Fire at the ${b.def.name}!`, 3600);
    for (const s of b.residents.concat(b.workers)) if (s.inside === b) { s.panic = true; s.panicT = 20; s.goTo({ x: b.doorOut.x + (Math.random() - 0.5) * 6, z: b.doorOut.z + 3 }); }
  }
  /** Fire crews nearby put it out; on its own it burns for a minute and the repairs cost a fortune. */
  burn(f, dt, gdt) {
    const g = this.game, b = f.b; f.t += gdt * (f.fought ? 0.4 : 1); if (b.state !== 'done') { f.out = true; return; }
    const H = (b.def.floors || 1) * 3.2 + 1;
    f.smokeT -= dt; if (f.smokeT <= 0) { f.smokeT = 0.12; g.particles.burst(b.cx + (Math.random() - 0.5) * b.def.w * 3, H, b.cz + (Math.random() - 0.5) * b.def.d * 3, pick([0xff6a1a, 0xffb020, 0xe02a10]), 4, 1.6, 4, 0.2); if (Math.random() < 0.4) g.particles.burst(b.cx, H + 2, b.cz, 0x3a3a3a, 3, 1.2, 6, 0.4); }
    // inside, it's obvious: flames and smoke in the rooms, the windows glowing orange, the light flickering
    const P = g.player, inHere = g.buildings.playerInside === b, W2 = b.def.w * 2, D2 = b.def.d * 2;
    if ((inHere || Math.hypot(P.x - b.cx, P.z - b.cz) < 30) && Math.random() < dt * 14) { const [x, z] = b.toWorld((Math.random() - 0.5) * W2 * 1.6, (Math.random() - 0.5) * D2 * 1.6); g.particles.burst(x, 0.4 + Math.random() * 1.6, z, pick([0xff6a1a, 0xffb020, 0xe02a10]), 3, 0.9, 2.2, 0.16); if (Math.random() < 0.5) g.particles.burst(x, 2.3, z, 0x4a4a4a, 2, 0.5, 1.5, 0.35); }
    if (b.glassMat) { b.glassMat.emissive.setHex(0xff5a10); b.glassMat.emissiveIntensity = 0.7 + Math.sin(f.t * 9) * 0.25 + Math.random() * 0.15; f.lit = true; }
    b.burning = true; if (inHere && g.buildings.interiorLight) g.buildings.interiorLight.color.setHex(0xff6a20);
    if (inHere && Math.random() < dt * 0.5) g.ui.toast('🔥 The building is on fire! Get out, or hold E to fight it.', 1800);
    // the bucket chain (well to fire, buckets passed hand to hand) and the fire brigade (hoses off the engine)
    const chain = this.chainOf(f), CE = f.src && this.chainEnds(f), inChain = chain.filter((s) => !s.path.length && s.chainAt && this.offLine(s, CE) < 4);   // stood on (or near) the line, not walking
    const near = g.population.sims.filter((s) => s.activity === 'firefight' && s.fireB === b && !s.path.length && !chain.includes(s) && Math.hypot(s.x - b.cx, s.z - b.cz) < b.def.w * 4 + 6);
    const E = f.engine, hoses = E && E.stage === 'spray' && E.water > 0;
    for (const s of near) { s.faceGoal = Math.atan2(b.cx - s.x, b.cz - s.z); if ((hoses || !f.src) && Math.random() < dt * 8) g.particles.burst(s.x + Math.sin(s.heading) * 2, 1.6, s.z + Math.cos(s.heading) * 2, hoses ? 0x9fd8f0 : 0x8a8a8a, 3, 2.4, 2, 0.08); }
    if (hoses) { E.water -= gdt * 0.012; if (Math.random() < dt * 10) g.particles.burst(E.mesh.position.x, 2.4, E.mesh.position.z, 0x9fd8f0, 4, 3, 3, 0.1); }
    this.buckets(f, inChain, dt);
    const chainK = inChain.length >= 2 ? 0.012 * Math.max(0.4, 1 - Math.max(0, f.chainLen - 25) / 120) : 0;
    f.hp -= gdt * (near.reduce((a, s) => a + (s.role === 'firefighter' ? (hoses ? 0.03 : 0.008) : f.src ? 0 : 0.004), 0) + inChain.length * chainK + (hoses ? 0.02 : 0)) + (f.samT > 0 ? gdt * 0.02 : 0); f.samT = Math.max(0, (f.samT || 0) - dt);
    const crew = near.concat(inChain); f.fought = chain.length > 0 || near.length > 0 || !!f.engine;
    if (Math.random() < dt * 0.4 && g.mode === 'sim' && Math.hypot(g.player.x - b.cx, g.player.z - b.cz) < 40) Sfx.noise(0.6, { freq: 600, vol: 0.08, type: 'lowpass' });
    if (f.hp <= 0 || f.out) this.douseEnd(f);
    if (f.hp <= 0) { f.out = true; g.economy.lose(40, 'Fire damage'); g.messages.push('Fire brigade', `The fire at the ${b.def.name} is out. Minor smoke damage (£40).`, 'good'); for (const s of crew) s.moodBoost += 0.1; return; }
    if (f.t > 75 && !f.out) { f.out = true; this.douseEnd(f); const cost = 150 + Math.floor(Math.random() * 350); g.economy.lose(cost, 'Fire damage'); for (const s of b.residents.concat(b.workers)) s.moodBoost -= 0.35; g.messages.push('Fire!', `The ${b.def.name} burned for an hour before the fire went out. Repairs: £${cost}.`, 'warn'); }
  }
  douseEnd(f) { const b = f.b; b.burning = false; for (const m of f.bucketMeshes || []) this.game.scene.remove(m); f.bucketMeshes = null; if (f.engine) { this.homeEngine(f.engine); f.engine = null; } for (const s of this.game.population.sims) if (s.bucketMesh && (s.fireB === b || !s.fireB)) { s.bucketMesh.parent && s.bucketMesh.parent.remove(s.bucketMesh); s.bucketMesh = null; s.chainAt = null; } if (b.glassMat && f.lit) { b.glassMat.emissive.setHex(0xffc070); f.lit = false; } if (this.game.buildings.interiorLight) this.game.buildings.interiorLight.color.setHex(0xffe2b0); }
  /** Sam with a bucket (hold E near the fire). */
  douse(b, dt, P) {
    const f = this.fires.find((q) => q.b === b); if (!f) return; f.samT = 0.3; P.faceGoal = Math.atan2(b.cx - P.x, b.cz - P.z); P.heading = Math.atan2(b.cx - P.x, b.cz - P.z);
    if (Math.random() < dt * 10) this.game.particles.burst(P.x + Math.sin(P.heading) * 1.6, 1.4, P.z + Math.cos(P.heading) * 1.6, 0x9fd8f0, 4, 2.2, 2, 0.08);
    if (f.hp <= 0.02) this.game.ui.toast('You put the fire out! Well done, Sam.', 2600);
  }
  /** Firefighters (and, with no fire brigade, neighbours with buckets): where's the fire? (called from Sim.wantActivity) */
  fireFor(s) { return this.fires.length ? this.fires[0].b : null; }
  /** Neighbours with buckets. Word spreads: the longer it burns, the further away people come from. */
  volunteer(s) {
    if (!this.fires.length || s.kind !== 'resident' || s.age < 16 || s.age > 70 || s.fight || s.crook) return null;
    if (s.fireB) return this.fires.some((f) => f.b === s.fireB) ? s.fireB : null;
    const brigade = this.game.population.sims.some((q) => q.role === 'firefighter' && q.pose !== 'sleep');
    for (const f of this.fires) { const n = this.game.population.sims.filter((q) => q.fireB === f.b).length; if (n < (brigade ? 2 : f.src ? 8 : 4) && Math.hypot(s.x - f.b.cx, s.z - f.b.cz) < (s.inside || s.hidden ? 22 : 45) + Math.min(80, f.t * 3)) { s.fireB = f.b; this.game.social.say(s, pick(['Fire! Get the buckets!', 'Form a chain!', 'Quick, water!']), 2); return f.b; } }
    return null;
  }
  driveCrew(s) {
    const b = s.fireB, f = b && this.fires.find((q) => q.b === b); if (!f) { s.fireB = null; s.chainAt = null; if (s.bucketMesh) { s.bucketMesh.parent && s.bucketMesh.parent.remove(s.bucketMesh); s.bucketMesh = null; } return; }
    const chain = this.chainOf(f), i = chain.indexOf(s);
    if (i >= 0) {   // a place in the bucket chain, evenly spaced from the well to the door
      const A = this.chainEnds(f), at = this.alongChain(A, (i + 0.5) / chain.length);
      if (!s.bucketMesh && s.rig && s.rig.armR && s.rig.armR.hand) { const m = new THREE.Mesh(bucketGeo, bucketMat); m.scale.setScalar(0.8); m.position.set(0, -0.18, 0); s.rig.armR.hand.add(m); s.bucketMesh = m; }   // everyone in the chain has a bucket
      if (!s.chainAt || Math.hypot(s.chainAt.x - at.x, s.chainAt.z - at.z) > 1) { s.chainAt = at; s.crewRe = 0; }
      const fresh = !s.crewGoal || Math.hypot(s.crewGoal.x - at.x, s.crewGoal.z - at.z) > 1.5;   // (drop wherever they were going before)
      if (Math.hypot(s.x - at.x, s.z - at.z) > 1.5 && (fresh || (!s.path.length && (s.crewRe = (s.crewRe || 0) - 1) <= 0))) { s.crewRe = 30; s.crewGoal = at; s.path = []; s.goTo({ x: at.x, z: at.z }); s.hurry = true; }
      if (!s.path.length) s.faceGoal = at.dir + (i % 2 ? Math.PI / 2 : -Math.PI / 2);   // side on, passing along the line
      return;
    }
    const fresh = s.crewGoal !== b.doorOut; if (fresh) { s.crewGoal = b.doorOut; s.path = []; s.crewRe = 0; }
    if (!s.path.length && Math.hypot(s.x - b.doorOut.x, s.z - b.doorOut.z) > 5 && (s.crewRe = (s.crewRe || 0) - 1) <= 0) { s.crewRe = 30; const a = Math.random() * Math.PI - Math.PI / 2; s.goTo({ x: b.doorOut.x + Math.sin(a) * 3, z: b.doorOut.z + Math.cos(a) * 2 }); s.hurry = true; }
  }
  /** The nearest well (or Water Tower hydrant) to a building, or null. */
  waterNear(b) { let best = null, bd = 1e9; for (const q of this.game.buildings.list) if (q.state === 'done' && (q.id === 'well' || q.id === 'water') && q.doorOut) { const d = Math.hypot(q.cx - b.cx, q.cz - b.cz); if (d < bd) { bd = d; best = q; } } return best; }
  /** Neighbours with buckets (not the brigade), if there's a well to fill them at. */
  chainOf(f) { if (!f.src) return []; const L = this.game.population.sims.filter((s) => s.fireB === f.b && s.activity === 'firefight' && s.role !== 'firefighter' && !s.remove); for (const s of L) if (s.chainRank === undefined || s.chainFire !== f) { s.chainFire = f; s.chainRank = Math.hypot(s.x - f.src.cx, s.z - f.src.cz); } return L.sort((a, b) => a.chainRank - b.chainRank); }   // whoever's nearest the well takes the well end
  /** The chain's route: the way you'd walk from the well to the burning building's door (round buildings, not through them). */
  chainEnds(f) {
    if (f.cp) return f.cp;
    const w = this.game.world, a = { x: f.src.doorOut.x, z: f.src.doorOut.z }, e = { x: f.b.doorOut.x, z: f.b.doorOut.z }, [sx, sz] = w.tileOf(a.x, a.z), [tx, tz] = w.tileOf(e.x, e.z), p = w.findPath(sx, sz, tx, tz);
    const pts = [a].concat(p ? p.slice(1, -1).map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })) : [], [e]), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    f.chainLen = cum[cum.length - 1]; return (f.cp = { pts, cum, a, b: e });
  }
  /** A point a fraction t of the way along the chain, and which way the line runs there. */
  alongChain(A, t) {
    const L = A.cum[A.cum.length - 1] * Math.max(0, Math.min(1, t)); let i = 1; while (i < A.pts.length - 1 && A.cum[i] < L) i++;
    const p = A.pts[i - 1], q = A.pts[i], seg = A.cum[i] - A.cum[i - 1] || 1, k = (L - A.cum[i - 1]) / seg; return { x: p.x + (q.x - p.x) * k, z: p.z + (q.z - p.z) * k, dir: Math.atan2(q.x - p.x, q.z - p.z) };
  }
  offLine(s, A) { let best = 1e9; for (let i = 1; i < A.pts.length; i++) { const a = A.pts[i - 1], b = A.pts[i], vx = b.x - a.x, vz = b.z - a.z, L2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((s.x - a.x) * vx + (s.z - a.z) * vz) / L2)); best = Math.min(best, Math.hypot(s.x - (a.x + vx * t), s.z - (a.z + vz * t))); } return best; }
  /** Buckets going hand to hand up the line. */
  buckets(f, inChain, dt) {
    const g = this.game; if (inChain.length < 2 || !f.src) { for (const m of f.bucketMeshes || []) m.visible = false; return; }
    if (!f.bucketMeshes) { f.bucketMeshes = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(bucketGeo, bucketMat); m.castShadow = true; g.scene.add(m); return m; }); f.bt = 0; }
    const A = this.chainEnds(f); f.bt = (f.bt + dt / Math.max(2, f.chainLen / 6)) % 1;
    f.bucketMeshes.forEach((m, i) => { const t = (f.bt + i / 4) % 1, hop = Math.abs(Math.sin(t * inChain.length * Math.PI)) * 0.25, q = this.alongChain(A, t); m.visible = true; m.position.set(q.x, 1.05 + hop, q.z); });
    if (Math.random() < dt * 2) g.particles.burst(A.b.x, 1.4, A.b.z, 0x9fd8f0, 5, 2, 2.5, 0.08);   // thrown on at the door
  }
  // ---------- the fire engine: out of the station, fill up at a well, drive to the fire, hose it; back for more ----------
  route(from, to) { const w = this.game.world, [sx, sz] = w.tileOf(from.x, from.z), [tx, tz] = w.tileOf(to.x, to.z), p = w.findPath(sx, sz, tx, tz, true); return p ? p.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })) : null; }
  sendEngine(f) {
    const g = this.game, st = g.buildings.list.filter((q) => q.state === 'done' && q.id === 'firestation' && q.doorOut).sort((a, c) => Math.hypot(a.cx - f.b.cx, a.cz - f.b.cz) - Math.hypot(c.cx - f.b.cx, c.cz - f.b.cz))[0]; if (!st) return;
    const src = this.waterNear(st) || f.src, mesh = makeEngine(); mesh.position.set(st.doorOut.x, 0, st.doorOut.z); g.scene.add(mesh);
    const E = { mesh, st, src, water: src ? 0 : 1, stage: src ? 'toWell' : 'toFire', path: null, wait: 0, f }; E.path = this.route(st.doorOut, src ? src.doorOut : f.b.doorOut) || []; f.engine = E; (this.engines || (this.engines = [])).push(E);
    if (!src) g.messages.push('Fire brigade', 'No well or water tower to fill the engine at. It\'s going on what\'s in the tank.', 'warn');
  }
  homeEngine(E) { E.stage = 'home'; E.f = null; E.path = this.route(E.mesh.position, E.st.doorOut) || []; }
  engineStep(E, dt) {
    const g = this.game, m = E.mesh; if (E.wait > 0) { E.wait -= dt; if (E.stage === 'fill' && Math.random() < dt * 6) g.particles.burst(m.position.x, 2.2, m.position.z, 0x9fd8f0, 3, 0.6, 1.5, 0.08); return; }
    const p = E.path[0];
    if (p) { const dx = p.x - m.position.x, dz = p.z - m.position.z, d = Math.hypot(dx, dz), step = 13 * dt; if (d > 0.1) { let da = Math.atan2(dx, dz) - m.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); m.rotation.y += da * Math.min(1, dt * 6); } if (d <= step) { m.position.x = p.x; m.position.z = p.z; E.path.shift(); } else { m.position.x += dx / d * step; m.position.z += dz / d * step; }
      if (E.stage !== 'home' && g.mode === 'sim' && Math.hypot(g.player.x - m.position.x, g.player.z - m.position.z) < 60 && (E.bell = (E.bell || 0) - dt) <= 0) { E.bell = 0.35; Sfx.tone(1250, 0.12, { type: 'triangle', vol: 0.03 }); }   // ding-ding-ding
      return; }
    if (E.stage === 'toWell') { E.stage = 'fill'; E.wait = 3; E.water = 1; }
    else if (E.stage === 'fill') { E.stage = 'toFire'; E.path = this.route(m.position, E.f ? E.f.b.doorOut : E.st.doorOut) || []; }
    else if (E.stage === 'toFire') E.stage = 'spray';
    else if (E.stage === 'spray' && E.water <= 0 && E.src) { E.stage = 'toWell'; E.path = this.route(m.position, E.src.doorOut) || []; }
    else if (E.stage === 'home') { E.done = true; g.scene.remove(m); }
  }
  cutPower() { const g = this.game; this.powerCut = 60 + Math.random() * 60; g.messages.push('The Electricity Board', 'Power cut! Engineers are on their way. Candles in the kitchen drawer.', 'warn'); g.ui.toast('🕯️ Power cut!', 3000); }
  serialize() { return { dryDays: this.dryDays, drought: this.drought }; }
  load(s) { if (s) { this.dryDays = s.dryDays || 0; this.drought = !!s.drought; } }
}
