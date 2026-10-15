import * as THREE from 'three';
import { T } from '../world/World.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { TILE } from '../config.js';
import { colorize, mergeByMaterial } from '../render/BuildingFactory.js';

const bucketGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.26, 8, 1, true), bucketMat = new THREE.MeshStandardMaterial({ color: 0x8a8e96, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
const waterGeo = new THREE.CircleGeometry(0.15, 8).rotateX(-Math.PI / 2), waterMat = new THREE.MeshStandardMaterial({ color: 0x5aa8d8, roughness: 0.1 });
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1), EMATS = new Map(), ENGINE_MAT = (c, o) => { const k = c + JSON.stringify(o); let m = EMATS.get(k); if (!m) EMATS.set(k, (m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }))); return m; };
/** A red fire engine with a ladder on the roof and a big brass bell. */
function makeEngine() {
  const g = new THREE.Group(), add = (w, h, d, c, x, y, z, o = {}) => { const m = new THREE.Mesh(UNIT_BOX, ENGINE_MAT(c, o)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(2.2, 1.5, 5.6, 0xc8202a, 0, 1.35, -0.3); add(2.2, 1.3, 1.6, 0xc8202a, 0, 1.25, 2.9); add(1.9, 0.55, 0.08, 0x9fd8f0, 0, 1.55, 3.71, { emissive: 0x1a3a4a }); add(2.0, 0.2, 7.0, 0x2a2a2a, 0, 0.55, 0.3);
  for (const x of [-0.45, 0.45]) add(0.08, 0.08, 5.0, 0xd8d8d8, x, 2.2, -0.4, { metalness: 0.6 }); for (let i = 0; i < 10; i++) add(0.9, 0.06, 0.06, 0xd8d8d8, 0, 2.2, -2.8 + i * 0.5, { metalness: 0.6 });   // the ladder
  add(0.3, 0.3, 0.3, 0xd8a83a, 0.8, 2.05, 2.6, { metalness: 0.8, roughness: 0.3 });   // the bell
  add(0.5, 0.18, 0.3, 0x2a5aff, 0, 1.98, 3.0, { emissive: 0x2a5aff, emissiveIntensity: 0.8 });   // blue light
  for (const [x, z] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -1.6], [1.05, -1.6], [-1.05, -2.6], [1.05, -2.6]]) add(0.35, 0.9, 0.9, 0x111111, x, 0.45, z);
  for (const x of [-1.12, 1.12]) add(0.06, 0.6, 3.6, 0xe8e2c8, x, 1.3, -0.6);   // rolled hoses
  colorize(g); mergeByMaterial(g); return g;   // (a handful of meshes, not thirty)
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
    this.stations(dt);
    for (const f of this.fires) this.burn(f, dt, gdt);
    if (this.engines) { for (const E of this.engines) this.engineStep(E, Math.min(dt * Math.max(1, Math.min(4, g.clock.speed || 1)), 0.1)); this.engines = this.engines.filter((E) => !E.done); }
    this.fires = this.fires.filter((f) => !f.out); this.smoulder(dt);
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
    const f = { b, t: 0, hp: 1, out: false, smokeT: 0, trapped: [] }; this.fires.push(f); g.markers && g.markers.add(b.cx, b.cz, '🔥', 'Fire', 400, null, () => !f.out);
    f.src = this.waterNear(b); f.perThrow = Math.min(0.1, 0.1 / Math.sqrt(Math.max(1, b.def.w * b.def.d)));
    const brigade = g.buildings.count('firestation') > 0;
    g.messages.push('Fire!', `The ${b.def.name} is on fire!${brigade ? ' The fire brigade is on its way.' : f.src ? ' There\'s no fire brigade: the neighbours are running buckets from the ' + f.src.def.name.toLowerCase() + '.' : ' There\'s no fire brigade and no well to fill buckets at. Nobody can fight it.'}`, 'warn');
    this.sendEngine(f); g.ui.toast(`🔥 Fire at the ${b.def.name}!`, 3600);
    // everyone inside gets out, the sleepers too (woken by the smoke)... nearly everyone
    const night = g.clock.hour >= 22 || g.clock.hour < 6;
    for (const s of g.population.sims) {
      if (s.remove || s.dead || !(s.inside === b || (s.pose === 'sleep' && s.bedSpot && s.bedSpot.b === b))) continue;
      const asleep = s.pose === 'sleep', up = asleep && s.bedSpot && s.bedSpot.upstairs;
      s.endActivity(); s.activity = null; s.path = [];
      if (f.trapped.length < 2 && Math.random() < (asleep ? (night ? 0.2 : 0.1) + (up ? 0.1 : 0) : 0.02)) { s.trapped = { f, t: 20 + Math.random() * 20 }; s.panic = true; f.trapped.push(s); continue; }   // cut off by the flames
      s.fleeFire = { f, home: s.home === b }; s.panic = true; s.panicT = 0;
    }
    if (f.trapped.length) g.ui.toast(`🔥 ${f.trapped.map((s) => s.first).join(' and ')} ${f.trapped.length > 1 ? 'are' : 'is'} trapped inside!`, 4200);
  }
  /** Fire crews nearby put it out; on its own it burns for a minute and the repairs cost a fortune, or with no water at all it burns to the ground. */
  burn(f, dt, gdt) {
    const g = this.game, b = f.b; f.t += gdt * (f.fought ? 0.4 : 1); if (b.state !== 'done') { f.out = true; this.freeTrapped(f); return; }
    const H = (b.def.floors || 1) * 3.2 + 1, big = !f.src && !f.engine ? Math.min(1, f.t / 60) : 0;   // (unfought, it takes hold)
    f.smokeT -= dt; if (f.smokeT <= 0) { f.smokeT = 0.12 - big * 0.06; g.particles.burst(b.cx + (Math.random() - 0.5) * b.def.w * 3, H, b.cz + (Math.random() - 0.5) * b.def.d * 3, pick([0xff6a1a, 0xffb020, 0xe02a10]), 4 + Math.round(big * 4), 1.6 + big, 4 + big * 2, 0.2 + big * 0.1); if (Math.random() < 0.4 + big * 0.4) g.particles.burst(b.cx, H + 2, b.cz, 0x3a3a3a, 3, 1.2, 6, 0.4 + big * 0.2); }
    // inside, it's obvious: flames and smoke in the rooms, the windows glowing orange, the light flickering
    const P = g.player, inHere = g.buildings.playerInside === b, W2 = b.def.w * 2, D2 = b.def.d * 2;
    if ((inHere || Math.hypot(P.x - b.cx, P.z - b.cz) < 30) && Math.random() < dt * 14) { const [x, z] = b.toWorld((Math.random() - 0.5) * W2 * 1.6, (Math.random() - 0.5) * D2 * 1.6); g.particles.burst(x, 0.4 + Math.random() * 1.6, z, pick([0xff6a1a, 0xffb020, 0xe02a10]), 3, 0.9, 2.2, 0.16); if (Math.random() < 0.5) g.particles.burst(x, 2.3, z, 0x4a4a4a, 2, 0.5, 1.5, 0.35); }
    if (b.glassMat) { b.glassMat.emissive.setHex(0xff5a10); b.glassMat.emissiveIntensity = 0.7 + Math.sin(f.t * 9) * 0.25 + Math.random() * 0.15; f.lit = true; }
    b.burning = true; if (inHere && g.buildings.interiorLight) g.buildings.interiorLight.color.setHex(0xff6a20);
    if (inHere && Math.random() < dt * 0.5) g.ui.toast(f.trapped.length ? '🔥 Somebody\'s trapped in here! Find them and get them out.' : '🔥 The building is on fire! Get out, or hold E to fight it.', 1800);
    // the trapped: Sam finding them, or the fire brigade, gets them out; otherwise, in the end, the smoke does for them
    for (const s of f.trapped.slice()) {
      if (s.remove || s.dead) { f.trapped.splice(f.trapped.indexOf(s), 1); continue; }
      const sam = inHere && Math.hypot(P.x - s.x, P.z - s.z) < 3.2, crew = f.engine && f.engine.stage === 'spray';
      if (sam || crew) { this.free(f, s, sam ? 'sam' : 'brigade'); continue; }
      if (f.t >= s.trapped.t) this.perish(f, s);
    }
    // the fire brigade (hoses off the engine), and neighbours: each runs with a bucket from the well to the fire and back
    const crew = g.population.sims.filter((s) => s.activity === 'firefight' && s.fireB === b && !s.remove), E = f.engine, hoses = E && E.stage === 'spray' && E.water > 0;
    const near = crew.filter((s) => s.role === 'firefighter' && !s.path.length && Math.hypot(s.x - b.cx, s.z - b.cz) < b.def.w * 4 + 6);
    for (const s of near) { s.faceGoal = Math.atan2(b.cx - s.x, b.cz - s.z); if (hoses && Math.random() < dt * 8) g.particles.burst(s.x + Math.sin(s.heading) * 2, 1.6, s.z + Math.cos(s.heading) * 2, 0x9fd8f0, 3, 2.4, 2, 0.08); }
    if (hoses) { E.water -= gdt * 0.012; if (Math.random() < dt * 10) g.particles.burst(E.mesh.position.x, 2.4, E.mesh.position.z, 0x9fd8f0, 4, 3, 3, 0.1); }
    f.hp -= gdt * (near.length * (hoses ? 0.03 : 0.008) + (hoses ? 0.02 : 0)) + (f.samT > 0 ? gdt * 0.02 : 0); f.samT = Math.max(0, (f.samT || 0) - dt);
    f.fought = !!f.engine || crew.some((s) => s.role === 'firefighter' || (f.src && s.run)) || f.samT > 0;
    if (Math.random() < dt * 0.4 && g.mode === 'sim' && Math.hypot(g.player.x - b.cx, g.player.z - b.cz) < 40) Sfx.noise(0.6, { freq: 600, vol: 0.08, type: 'lowpass' });
    if (f.hp <= 0) { f.out = true; this.douseEnd(f); this.freeTrapped(f); g.economy.lose(40, 'Fire damage'); g.messages.push('Fire!', `The fire at the ${b.def.name} is out. Minor smoke damage (£40).${f.thrown ? ` ${f.thrown} buckets of water, all carried by hand.` : ''}`, 'good'); for (const s of crew) { s.moodBoost += 0.1; if (s.mesh.visible && Math.random() < 0.4) g.social.say(s, pick(['It\'s out!', 'Phew. My arms...', 'Teamwork, that.', 'Somebody put the kettle on.']), 2.4); } return; }
    if (f.t > 75) {
      const helpless = !f.src && !f.engine && !f.everFought && !f.fought; f.out = true; this.douseEnd(f);
      if (helpless) { this.burnDown(f); return; }   // nothing to fight it with: it goes
      this.freeTrapped(f); const cost = 150 + Math.floor(Math.random() * 350); g.economy.lose(cost, 'Fire damage'); for (const s of b.residents.concat(b.workers)) s.moodBoost -= 0.35; g.messages.push('Fire!', `The ${b.def.name} burned for an hour before the fire went out. Repairs: £${cost}.`, 'warn');
    }
    if (f.fought) f.everFought = true;
  }
  /** Out of the burning building alive. */
  free(f, s, how) {
    const g = this.game, i = f.trapped.indexOf(s); if (i >= 0) f.trapped.splice(i, 1); s.trapped = null; s.fleeFire = { f, home: s.home === f.b }; s.panic = true;
    if (how === 'sam') { s.samRel = Math.min(100, (s.samRel || 0) + 25); s.moodBoost += 0.2; g.social.say(s, pick(['Sam! Thank God!', 'I couldn\'t find the door! Thank you!', 'Get me out of here!']), 3); g.messages.push('Fire!', `Sam found ${s.name} in the smoke and got them out alive.`, 'good'); }
    else if (how === 'brigade') g.messages.push('Fire brigade', `The firefighters brought ${s.name} out alive.`, 'good');
  }
  freeTrapped(f) { for (const s of f.trapped.slice()) this.free(f, s, 'out'); }
  /** Overcome by the smoke. Their body stays in the building until it's safe to bring them out (systems/Rescue.js). */
  perish(f, s) {
    const g = this.game, b = f.b, i = f.trapped.indexOf(s); if (i >= 0) f.trapped.splice(i, 1); s.trapped = null; s.fleeFire = null;
    g.celebrations.funerals.die(s, { cause: `killed in the fire at the ${b.def.name}`, where: null });
    s.hidden = true; s.inside = b; s.bodyAt = { x: b.doorOut.x, z: b.doorOut.z };
    for (const o of g.population.sims) if (o.fleeFire && o.fleeFire.f === f && o.mesh.visible && Math.random() < 0.5) g.social.say(o, pick([`${s.first}! Where's ${s.first}?`, 'Oh God, no...', `${s.first}'s still in there!`]), 3);
  }
  /** Nothing to fight it with: it burns to the ground, and what's left is a builders' job before anything can go up there again. */
  burnDown(f) {
    const g = this.game, b = f.b, B = g.buildings, { x0, z0, rot } = b, d = b.def, home = b === g.starterHome, lost = b.residents.filter((s) => !s.dead).map((s) => s.first);
    for (const s of f.trapped.slice()) this.perish(f, s);
    if (home) { g.starterHome = null; }
    if (g.buildings.playerInside === b) { g.player.x = b.doorOut.x; g.player.z = b.doorOut.z; }
    B.remove(b);
    const r = B.place('rubble', x0, z0, rot, { over: { name: `Ruins of the ${d.name}`, w: d.w, d: d.d, floors: d.floors || 1, wall: d.wall, roof: d.roof, work: Math.round(14 + d.w * d.d * 7) } });
    r.prio = 0; r.smoulder = 150; (this.ruins || (this.ruins = [])).push(r);   // (top of the builders' list: nothing else can go there till it's cleared)
    g.particles.burst(r.cx, 2, r.cz, 0x2a2a2a, 30, 4, 6, 0.5);
    g.ui.notice(`The ${d.name} has burned down`, `With no well to fill buckets at and no Fire Station, nobody could fight the fire, and the ${d.name} burned to the ground.${home ? ' It was Sam\'s home: the next house to be finished will be his.' : ''}${lost.length ? `\n\n${lost.join(', ')} ${lost.length > 1 ? 'have' : 'has'} lost ${lost.length > 1 ? 'their home' : (b.residents.find((s) => s.first === lost[0]) || {}).gender === 'f' ? 'her home' : 'his home'}.` : ''}\n\nThe builders will clear the rubble (it's at the top of their work list), then the plot can be built on again.\n\nBuild a Well near the houses so the neighbours can fight fires with buckets, or better, a Fire Station.`, { icon: '🔥', from: 'Fire!' });
  }
  /** Ruins smoulder for a while. */
  smoulder(dt) {
    if (!this.ruins || !this.ruins.length) return; const g = this.game;
    this.ruins = this.ruins.filter((r) => { r.smoulder -= dt; if (Math.random() < dt * 3 * Math.min(1, r.smoulder / 60)) g.particles.burst(r.cx + (Math.random() - 0.5) * r.def.w * 3, 0.6, r.cz + (Math.random() - 0.5) * r.def.d * 3, Math.random() < 0.15 ? 0xff6a1a : 0x4a4a4a, 2, 0.5, 3, 0.35); return r.smoulder > 0 && g.buildings.list.includes(r); });
  }
  douseEnd(f) {
    const b = f.b; b.burning = false; if (f.engine) { this.homeEngine(f.engine); f.engine = null; }
    for (const s of this.game.population.sims) if (s.fireB === b || (s.run && s.run.f === f)) { this.dropBucket(s); s.run = null; }
    if (b.glassMat && f.lit) { b.glassMat.emissive.setHex(0xffc070); f.lit = false; } if (this.game.buildings.interiorLight) this.game.buildings.interiorLight.color.setHex(0xffe2b0);
  }
  /** Sam with a bucket (hold E near the fire). */
  douse(b, dt, P) {
    const f = this.fires.find((q) => q.b === b); if (!f) return; f.samT = 0.3; P.faceGoal = Math.atan2(b.cx - P.x, b.cz - P.z); P.heading = Math.atan2(b.cx - P.x, b.cz - P.z);
    if (Math.random() < dt * 10) this.game.particles.burst(P.x + Math.sin(P.heading) * 1.6, 1.4, P.z + Math.cos(P.heading) * 1.6, 0x9fd8f0, 4, 2.2, 2, 0.08);
    if (f.hp <= 0.02) this.game.ui.toast('You put the fire out! Well done, Sam.', 2600);
  }
  /** Firefighters (and, with no fire brigade, neighbours with buckets): where's the fire? (called from Sim.wantActivity) */
  fireFor(s) { return this.fires.length ? this.fires[0].b : null; }
  /** Neighbours with buckets. Word spreads: the longer it burns, the further away people come from. With no well, a few come and watch, helpless. */
  volunteer(s) {
    if (!this.fires.length || s.kind !== 'resident' || s.age < 14 || s.age > 72 || s.fight || s.crook || s.fleeFire || s.trapped) return null;
    if (s.fireB) return this.fires.some((f) => f.b === s.fireB) ? s.fireB : null;
    const brigade = this.game.population.sims.some((q) => q.role === 'firefighter' && q.pose !== 'sleep');
    for (const f of this.fires) { const n = this.game.population.sims.filter((q) => q.fireB === f.b).length; if (n < (brigade ? 3 : f.src ? 12 : 4) && Math.hypot(s.x - f.b.cx, s.z - f.b.cz) < (s.inside || s.hidden ? 22 : 45) + Math.min(90, f.t * 3)) { s.fireB = f.b; this.game.social.say(s, pick(f.src ? ['Fire! Get a bucket!', 'Quick, to the well!', 'Water! Get water!'] : ['Fire! Somebody do something!', 'There\'s no water! Where\'s the well?', 'Oh my God, it\'s going up!']), 2); return f.b; } }
    return null;
  }
  /** A bucket in the right hand (with water in it when it's full). */
  giveBucket(s) {
    if (s.bucketMesh || !s.rig || !s.rig.armR || !s.rig.armR.hand) return; const m = new THREE.Mesh(bucketGeo, bucketMat); m.scale.setScalar(0.8); m.position.set(0, -0.2, 0.02); m.castShadow = true;
    const w = new THREE.Mesh(waterGeo, waterMat); w.position.y = 0.1; w.visible = false; m.add(w); m.userData.water = w; s.rig.armR.hand.add(m); s.bucketMesh = m;
  }
  dropBucket(s) { if (s.bucketMesh) { s.bucketMesh.parent && s.bucketMesh.parent.remove(s.bucketMesh); s.bucketMesh = null; } }
  driveCrew(s, dt = 0.016) {
    const g = this.game, b = s.fireB, f = b && this.fires.find((q) => q.b === b); if (!f) { s.fireB = null; s.run = null; this.dropBucket(s); return; }
    if (s.role !== 'firefighter' && f.src) { this.bucketRun(s, f, dt); return; }
    if (s.role === 'firefighter') {
      const E = f.engine;
      if (s.aboard) { const A = s.aboard; if (A.done || !this.engines.includes(A)) { s.aboard = null; s.hidden = false; } else { s.x = A.mesh.position.x; s.z = A.mesh.position.z; return; } }   // riding in the cab
      if (E && E.stage === 'muster' && E.st === s.workplace) {
        const bb = E.bb;
        if (s.woke && g.elapsed - s.woke < 1.2 && bb) {   // straight out of bed and down the pole
          if (!s.sliding) { s.sliding = true; s.x = bb.pole.x; s.z = bb.pole.z; s.path = []; s.rideY = 3.1; g.social.say(s, pick(['Bells! Go go go!', 'Boots! Where are my boots?', 'Shout! Everybody up!']), 1.8); }
          s.rideY = Math.max(0, 3.1 * (1 - (g.elapsed - s.woke) / 1.0)); s.emote = { upper: 'handsup', t: 0.3 }; return;
        }
        if (s.sliding) { s.sliding = false; s.rideY = 0; }
        const m = E.mesh, a = m.rotation.y + Math.PI / 2 * (s.id % 2 ? 1 : -1), dx = m.position.x + Math.sin(a) * 1.5, dz = m.position.z + Math.cos(a) * 1.5;
        if (Math.hypot(s.x - dx, s.z - dz) < 1.6) { s.aboard = E; E.crew.push(s); s.hidden = true; s.path = []; return; }   // up into the cab
        if (!s.path.length || (s.crewRe = (s.crewRe || 0) - dt) <= 0) { s.crewRe = 1.5; s.goTo({ b: E.st, x: dx, z: dz }); } s.hurry = true; return;
      }
    }
    // the brigade round the door; with no well, the neighbours stand back and watch it go
    const back = s.role === 'firefighter' ? 3 : 8, goal = s.crewGoal; if (!goal || goal.f !== f) { const a = (Math.random() - 0.5) * 2.2, dx = b.doorOut.x - b.cx, dz = b.doorOut.z - b.cz, n = Math.hypot(dx, dz) || 1, ang = Math.atan2(dx / n, dz / n) + a; s.crewGoal = { f, x: b.doorOut.x + Math.sin(ang) * back, z: b.doorOut.z + Math.cos(ang) * back }; s.crewRe = 0; s.path = []; }
    const p = s.crewGoal; if (!s.path.length && Math.hypot(s.x - p.x, s.z - p.z) > 1.6 && (s.crewRe = (s.crewRe || 0) - dt) <= 0) { s.crewRe = 5; s.goTo({ x: p.x, z: p.z }); s.hurry = true; }
    if (!s.path.length) { s.faceGoal = Math.atan2(b.cx - s.x, b.cz - s.z); if (s.role !== 'firefighter' && Math.random() < dt * 0.06 && s.mesh.visible) g.social.say(s, pick(['If only we had a well...', 'It\'s no good, it\'s going.', 'Stand back! The roof!', 'Somebody fetch the fire brigade! Oh. We haven\'t got one.']), 2.6); }
  }
  /** One neighbour, one bucket: run to the well, fill it, run to the fire, throw it on, and back for more. */
  bucketRun(s, f, dt) {
    const g = this.game, b = f.b, W = f.src; this.giveBucket(s);
    let r = s.run; if (!r || r.f !== f) { r = s.run = { f, st: 'well', t: 0, to: null, re: 0 }; s.path = []; }
    const go = (p, k) => {   // run there (and keep at it if the route gets lost); true once arrived
      if (Math.hypot(s.x - p.x, s.z - p.z) < k && !s.path.length) return true;
      if (r.to !== p) { r.to = p; r.re = 0; s.path = []; }
      if (!s.path.length && (r.re -= dt) <= 0) { r.re = 4; if (!s.goTo({ x: p.x, z: p.z })) { s.x += (p.x - s.x) * 0.02; s.z += (p.z - s.z) * 0.02; } } s.hurry = true; return false;
    };
    const water = s.bucketMesh && s.bucketMesh.userData.water;
    if (r.st === 'well') {
      const p = r.wp || (r.wp = this.ring(W.doorOut, W, 1.3, 2.0));
      if (go(p, 1.4)) { r.st = 'fill'; r.t = 1.4; s.faceGoal = Math.atan2(W.cx - s.x, W.cz - s.z); s.fightAnim = 'lift'; s.fightAnimT = 1.3; }
    } else if (r.st === 'fill') {
      if ((r.t -= dt) <= 0) { r.st = 'fire'; r.wp = null; if (water) water.visible = true; r.fp = this.firePoint(b); if (s.mesh.visible && Math.random() < 0.15) g.social.say(s, pick(['Coming through!', 'Mind out!', 'Out the way!']), 1.6); }
    } else if (r.st === 'fire') {
      if (go(r.fp, 1.5)) { r.st = 'throw'; r.t = 0.6; s.faceGoal = Math.atan2(b.cx - s.x, b.cz - s.z); s.heading = s.faceGoal; s.fightAnim = 'slosh'; s.fightAnimT = 0.6; }
    } else if (r.st === 'throw' && (r.t -= dt) <= 0) {
      const fx = Math.sin(s.heading), fz = Math.cos(s.heading); if (water) water.visible = false;
      g.particles.burst(s.x + fx * 1.2, 1.3, s.z + fz * 1.2, 0x9fd8f0, 10, 1.4, 2.4, 0.09); g.particles.burst(s.x + fx * 2.4, 1.6, s.z + fz * 2.4, 0xdedede, 5, 0.8, 3, 0.3);   // splash, and a hiss of steam
      f.hp -= f.perThrow; f.thrown = (f.thrown || 0) + 1; r.st = 'well'; r.fp = null;
      if (g.mode === 'sim' && Math.hypot(g.player.x - s.x, g.player.z - s.z) < 30) Sfx.noise(0.25, { freq: 1800, vol: 0.05, type: 'highpass' });
    }
  }
  /** The nearest well (or Water Tower) to a building, or null. */
  waterNear(b) { let best = null, bd = 1e9; for (const q of this.game.buildings.list) if (q.state === 'done' && (q.id === 'well' || q.id === 'water') && q.doorOut) { const d = Math.hypot(q.cx - b.cx, q.cz - b.cz); if (d < bd) { bd = d; best = q; } } return best; }
  /** A spot to stand at by a well (spread round it so they don't queue in one place). */
  ring(p, q, r0, r1) { if (q.id !== 'well') return { x: p.x + (Math.random() - 0.5) * 2.4, z: p.z + (Math.random() - 0.5) * 2.4 }; const f = Math.atan2(p.x - q.cx, p.z - q.cz), a = f + (Math.random() - 0.5) * 2.4, r = r0 + Math.random() * (r1 - r0); return { x: q.cx + Math.sin(a) * r, z: q.cz + Math.cos(a) * r }; }   // (round the well itself; at a water tower, by its door)
  /** Somewhere along the front of the burning building to throw from. */
  firePoint(b) { const W = b.def.w * 4, D = b.def.d * 4, [x, z] = b.toWorld((Math.random() - 0.5) * Math.max(1, W - 1.6), D / 2 + 1.5 + Math.random() * 0.8); return { x, z }; }
  /** Those who got out: away from the building, then they stand and watch (their own home: hands on head). */
  driveFlee(s, dt) {
    const g = this.game, ff = s.fleeFire, f = ff.f, b = f.b;
    if (f.out && (ff.after = (ff.after ?? 8) - dt) <= 0 || s.dead) { s.fleeFire = null; s.panic = false; s.hurry = false; return; }
    if (!ff.p) { const dx = b.doorOut.x - b.cx, dz = b.doorOut.z - b.cz, n = Math.hypot(dx, dz) || 1, a = (Math.random() - 0.5) * 1.6, ang = Math.atan2(dx / n, dz / n) + a, d = 6 + Math.random() * 4; ff.p = { x: b.doorOut.x + Math.sin(ang) * d, z: b.doorOut.z + Math.cos(ang) * d }; s.path = []; if (!s.goTo(ff.p)) { s.x = ff.p.x; s.z = ff.p.z; } s.hurry = true; if (s.mesh.visible) g.social.say(s, pick(['Fire! FIRE!', 'Get out! Everybody out!', 'Help!']), 2); }
    if (!s.path.length) { s.faceGoal = Math.atan2(b.cx - s.x, b.cz - s.z); s.hurry = false; if (!f.out && Math.random() < dt * 0.08 && s.mesh.visible) g.social.say(s, pick(ff.home ? ['My house! Everything\'s in there!', 'All my things...', 'Not my house!'] : ['Is everyone out?', 'I can\'t believe it.', 'Thank God I woke up.']), 2.6); }
  }
  // ---------- the fire station: the engine in its bay, the roller door, the night watch asleep upstairs ----------
  /** Where things are at a station, in the world: the engine's spot in the bay, the street in front of the bay door, the foot of the pole. */
  bayOf(st) {
    const B = st.ext && st.ext.bay; if (!B) return null; const [x, z] = st.toWorld(B.x, -0.25), [fx, fz] = st.toWorld(B.x, st.def.d * 2 + 3.2), [px, pz] = B.pole ? st.toWorld(B.pole.x, B.pole.z) : [st.doorIn.x, st.doorIn.z];
    return { x, z, fx, fz, h: st.rot * Math.PI / 2, pole: { x: px, z: pz } };
  }
  stations(dt) {
    const g = this.game, P = this.parked || (this.parked = new Map());
    for (const [st, m] of P) if (!g.buildings.list.includes(st) || st.state !== 'done' || !st.ext || !st.ext.bay) { g.scene.remove(m); P.delete(st); }   // (knocked down or rebuilt)
    for (const st of g.buildings.list) {
      if (st.id !== 'firestation' || st.state !== 'done' || !st.ext || !st.ext.bay) continue;
      const out = (this.engines || []).some((E) => E.st === st && !E.done);
      if (!P.has(st) && !out) { const bb = this.bayOf(st), m = makeEngine(); m.position.set(bb.x, 0, bb.z); m.rotation.y = bb.h; g.scene.add(m); P.set(st, m); }   // the engine, at home in its bay
      const D = st.ext.bayDoor; if (D) { const want = st.bayOpen ? 1 : 0, k = (st.bayK = (st.bayK || 0) + (want - (st.bayK || 0)) * Math.min(1, dt * 1.4)); D.userData.slats.scale.y = Math.max(0.05, 1 - k); }   // rolls up into the top
      if (st.alarmT > 0) { st.alarmT -= dt; if (g.mode === 'sim' && Math.hypot(g.player.x - st.cx, g.player.z - st.cz) < 70 && (st.ring = (st.ring || 0) - dt) <= 0) { st.ring = 0.18; Sfx.tone(st.ringHi ? 1480 : 1180, 0.12, { type: 'square', vol: 0.025 }); st.ringHi = !st.ringHi; } }   // the bells going down
    }
  }
  /** The night watch turns in: upstairs at the station (out of sight), in the bunks, boots by the bed. */
  bunk(s) {
    const st = s.workplace; if (!st || st.state !== 'done') return; const bb = this.bayOf(st), at = bb ? bb.pole : st.doorIn;
    if (s.bunk) return;
    if (s.phase === 0) { if (!s.goTo({ b: st, x: at.x, z: at.z })) s.phase = 2; return; }
    if (s.phase === 2 && !s.path.length) { s.bunk = true; s.hidden = true; s.pose = 'sleep'; s.vel = 0; }
  }
  // ---------- the fire engine: out of the station, fill up at a well, drive to the fire, hose it; back for more ----------
  route(from, to) { const w = this.game.world, [sx, sz] = w.tileOf(from.x, from.z), [tx, tz] = w.tileOf(to.x, to.z), p = w.findPath(sx, sz, tx, tz, true); return p ? p.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })) : null; }
  sendEngine(f) {
    const g = this.game, st = g.buildings.list.filter((q) => q.state === 'done' && q.id === 'firestation' && q.doorOut).sort((a, c) => Math.hypot(a.cx - f.b.cx, a.cz - f.b.cz) - Math.hypot(c.cx - f.b.cx, c.cz - f.b.cz))[0]; if (!st) return;
    const src = this.waterNear(st) || f.src, bb = this.bayOf(st), P = this.parked || (this.parked = new Map());
    let mesh = P.get(st); if (mesh) P.delete(st); else { mesh = makeEngine(); g.scene.add(mesh); if (bb) { mesh.position.set(bb.x, 0, bb.z); mesh.rotation.y = bb.h; } else mesh.position.set(st.doorOut.x, 0, st.doorOut.z); }
    const E = { mesh, st, src, bb, water: src ? 0 : 1, stage: 'muster', next: src ? 'toWell' : 'toFire', path: [], wait: 0, f, crew: [], t: 0 }; f.engine = E; (this.engines || (this.engines = [])).push(E);
    st.bayOpen = true; st.alarmT = 9; g.messages.push('Fire brigade', 'The bells go down at the Fire Station: the crew are on their way.', 'quiet');   // the alarm, the door going up, the crew down the pole
    if (!src) g.messages.push('Fire brigade', 'No well or water tower to fill the engine at. It\'s going on what\'s in the tank.', 'warn');
  }
  homeEngine(E) {
    E.stage = 'home'; E.f = null; const bb = E.bb; E.path = (this.route(E.mesh.position, bb ? { x: bb.fx, z: bb.fz } : E.st.doorOut) || []).concat(bb ? [{ x: bb.fx, z: bb.fz }, { x: bb.x, z: bb.z, park: true }] : []); if (bb) E.st.bayOpen = true;
    for (const s of E.crew) this.dismount(E, s); E.crew = [];
  }
  /** Out of the cab and onto the street beside the engine. */
  dismount(E, s) { if (s.aboard !== E) return; s.aboard = null; s.hidden = false; const m = E.mesh, a = m.rotation.y + Math.PI / 2 * (s.id % 2 ? 1 : -1); s.x = m.position.x + Math.sin(a) * 1.8; s.z = m.position.z + Math.cos(a) * 1.8; s.path = []; }
  engineStep(E, dt) {
    const g = this.game, m = E.mesh; E.t += dt;
    if (E.stage === 'muster') {   // the bells, the door going up, the crew aboard (or off without the stragglers after a quarter of a minute)
      const st = E.st, due = g.population.sims.filter((s) => s.role === 'firefighter' && s.workplace === st && s.activity === 'firefight' && !s.remove && Math.hypot(s.x - st.cx, s.z - st.cz) < 30);
      if ((E.t > 4 && (st.bayK || 0) > 0.85 && due.every((s) => s.aboard === E)) || E.t > 16) { E.stage = E.next; const from = E.bb ? { x: E.bb.fx, z: E.bb.fz } : m.position; E.path = (E.bb ? [{ x: E.bb.fx, z: E.bb.fz }] : []).concat(this.route(from, E.stage === 'toWell' ? E.src.doorOut : E.f.b.doorOut) || []); }
      return;
    }
    if (E.wait > 0) { E.wait -= dt; if (E.stage === 'fill' && Math.random() < dt * 6) g.particles.burst(m.position.x, 2.2, m.position.z, 0x9fd8f0, 3, 0.6, 1.5, 0.08); return; }
    const p = E.path[0];
    if (E.bb && E.stage !== 'home' && E.st.bayOpen && Math.hypot(m.position.x - E.bb.x, m.position.z - E.bb.z) > 16) E.st.bayOpen = false;   // out and away: the door comes down behind it
    if (p) { const dx = p.x - m.position.x, dz = p.z - m.position.z, d = Math.hypot(dx, dz), step = (E.bb && Math.hypot(m.position.x - E.bb.x, m.position.z - E.bb.z) < 9 ? 5 : 13) * dt; if (d > 0.1) { let da = Math.atan2(dx, dz) - m.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); m.rotation.y += da * Math.min(1, dt * 6); } if (d <= step) { m.position.x = p.x; m.position.z = p.z; E.path.shift(); } else { m.position.x += dx / d * step; m.position.z += dz / d * step; }
      if (E.stage !== 'home' && g.mode === 'sim' && Math.hypot(g.player.x - m.position.x, g.player.z - m.position.z) < 60 && (E.bell = (E.bell || 0) - dt) <= 0) { E.bell = 0.35; Sfx.tone(1250, 0.12, { type: 'triangle', vol: 0.03 }); }   // ding-ding-ding
      return; }
    if (E.stage === 'toWell') { E.stage = 'fill'; E.wait = 3; E.water = 1; }
    else if (E.stage === 'fill') { E.stage = 'toFire'; E.path = this.route(m.position, E.f ? E.f.b.doorOut : E.st.doorOut) || []; }
    else if (E.stage === 'toFire') { E.stage = 'spray'; for (const s of E.crew) this.dismount(E, s); E.crew = []; }   // everybody out
    else if (E.stage === 'spray' && E.water <= 0 && E.src) { E.stage = 'toWell'; E.path = this.route(m.position, E.src.doorOut) || []; }
    else if (E.stage === 'home') { E.done = true; if (E.bb && g.buildings.list.includes(E.st)) { (this.parked || (this.parked = new Map())).set(E.st, m); m.rotation.y = E.bb.h; E.st.bayOpen = false; } else g.scene.remove(m); }   // backed into the bay, and the door comes down
  }
  cutPower() { const g = this.game; this.powerCut = 60 + Math.random() * 60; g.messages.push('The Electricity Board', 'Power cut! Engineers are on their way. Candles in the kitchen drawer.', 'warn'); g.ui.toast('🕯️ Power cut!', 3000); }
  serialize() { return { dryDays: this.dryDays, drought: this.drought }; }
  load(s) { if (s) { this.dryDays = s.dryDays || 0; this.drought = !!s.drought; } }
}
