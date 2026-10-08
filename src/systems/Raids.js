import * as THREE from 'three';
import { MAP, TILE, DAY_SECONDS } from '../config.js';
import { T } from '../world/World.js';
import { Sim } from '../sim/Sim.js';
import { pick, clamp } from '../util.js';
import { A } from '../data/humour.js';
import { RAIDER_LINES, RAIDER_SLIPS, ALERT_LINES, ALERT_SLIPS, DOWN_LINES, RAID_CALM_LINES } from '../data/story.js';

const LOOT_TARGETS = ['stockyard', 'farm', 'forager', 'fisher', 'tavern', 'shop', 'lumbercamp', 'quarry', 'bakery', 'chippy', 'newsagent', 'allotment'];

/**
 * Occasional raids. A small band lands from the sea, heads for the Stockyard and the food stores, shoves anyone in their way
 * (nobody is ever killed: victims are knocked down and get back up) and leaves with whatever they carry. Citizens run indoors,
 * guards (and a police force, once built) sedate raiders with darts, and Sam can take the club from the Stockyard and fight too.
 * Weapons exist only inside this event; they are put away again afterwards.
 */
export class Raids {
  constructor(game) {
    this.game = game; this.enabled = true; this.alert = false; this.state = 'idle'; this.raiders = []; this.count = 0; this.stolen = 0; this.t = 0; this.calm = 0;
    this.cool = (6 + Math.random() * 3) * DAY_SECONDS; this.tracers = []; this.boat = null; this.pickup = null; this.land = null; this.said = {}; this.barkT = 0; this.alertText = null; this.lastCaptured = 0;
  }
  serialize() { return { cool: this.cool, count: this.count }; }
  load(s) { if (s) { this.cool = s.cool ?? this.cool; this.count = s.count || 0; } }
  reset() { this.finish(true); this.state = 'idle'; this.alert = false; }

  eligible() { const g = this.game; return this.enabled && !g.ending && !g.demoModeNoRaids && g.population.count() >= 10 && g.clock.totalDays >= 4 && g.buildings.count('stockyard') > 0; }

  update(dt) {
    const g = this.game;
    for (const tr of this.tracers) { tr.t -= dt; if (tr.t <= 0) g.scene.remove(tr.mesh); } this.tracers = this.tracers.filter((tr) => tr.t > 0);
    if (this.state === 'idle') { if (this.eligible() && (this.cool -= dt) <= 0) this.trigger(); }
    else if (this.state === 'active') this.tick(dt);
    else if (this.state === 'ending') { this.calm -= dt; if (this.calm <= 0) this.finish(); }
    this.setBanner();
  }
  setBanner() {
    const g = this.game; let text = null;
    if (this.state === 'active') { const live = this.raiders.filter((r) => !r.captured && !r.remove).length; text = live ? `RAID - ${live} raider${live > 1 ? 's' : ''} on the island` : 'RAID - the last raiders are being dealt with'; }
    if (text !== this.alertText) { this.alertText = text; g.ui.setAlert(text); }
  }

  /** A sandy shore tile away from the gates, joined by land to the Stockyard. */
  landing() {
    const g = this.game, w = g.world, c = [], gates = [g.lift.doorOut], tgt = (g.depot || g.townhall || g.lift).doorTile;
    for (let z = 1; z < MAP - 1; z++) for (let x = 1; x < MAP - 1; x++) {
      const i = w.idx(x, z); if (w.terrain[i] !== T.SAND || w.road[i] || w.occ[i]) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.terrain[w.idx(x + dx, z + dz)] === T.WATER) { c.push({ x, z, dx, dz }); break; }
    }
    for (let k = c.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [c[k], c[j]] = [c[j], c[k]]; }
    for (const q of c.slice(0, 60)) {
      const [cx, cz] = w.center(q.x, q.z); if (gates.some((p) => p && Math.hypot(p.x - cx, p.z - cz) < 26)) continue;
      if (!w.findPath(q.x, q.z, tgt.x, tgt.z)) continue;
      const [wx, wz] = w.center(q.x + q.dx, q.z + q.dz); return { x: cx, z: cz, bx: wx, bz: wz, heading: Math.atan2(-q.dx, -q.dz) };
    }
    return null;
  }

  trigger() {
    const g = this.game; if (this.state !== 'idle') return false;
    const land = this.landing(); if (!land) { this.cool = DAY_SECONDS; return false; }
    const pop = g.population.count(), n = clamp(2 + Math.floor(pop / 14), 2, 6), armed = pop >= 30;
    this.land = land; this.state = 'active'; this.alert = true; this.t = 0; this.stolen = 0; this.cap = 18 + pop * 0.9; this.count++; this.said = {}; this.raiders = []; this.lastCaptured = 0;
    this.boat = this.makeBoat(land); g.scene.add(this.boat);
    for (let i = 0; i < n; i++) {
      const P = g.population.makePerson({ gender: Math.random() < 0.8 ? 'm' : 'f', age: 22 + Math.floor(Math.random() * 20) });
      const look = { ...P.look, hat: { type: 'mask' }, shirt: pick([0x2b2b30, 0x3a2f2a, 0x2f3a2f, 0x40302a]), pants: 0x26262b, accessory: null, facial: null, glasses: false, backpack: Math.random() < 0.4, dress: false, skirt: false, shorts: false, longSleeve: true, fabric: 0, pantsFabric: 0 };
      const s = new Sim(g, { name: P.name, first: P.first, surname: P.surname, kind: 'raider', trait: 'busy', look, gender: P.gender, age: P.age, x: land.x + (i % 3 - 1) * 1.1, z: land.z + Math.floor(i / 3) * 1.1, heading: land.heading + Math.PI, actor: Math.random() });
      s.weapon = armed && i < Math.ceil(n / 2) ? 'pistol' : 'club'; s.hp = armed ? 3 : 2; s.rstate = 'approach'; s.atkCD = 2 + Math.random() * 2; s.lootN = 0; s.loot = {}; s.target = null;
      const mk = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 6), new THREE.MeshBasicMaterial({ color: 0xff3030, depthTest: false })); mk.rotation.x = Math.PI; mk.position.y = 2.55; mk.renderOrder = 15; s.mesh.add(mk);
      g.population.sims.push(s); g.population.names.add(P.name); this.raiders.push(s);
    }
    this.assignTargets();
    this.spawnPickup();
    g.messages.push('Planning Office', 'Raiders are landing on the beach! Get everyone indoors. There is a club by the Stockyard if you are feeling brave, Sam.', 'alarm'); g.ui.toast('RAIDERS LANDING!', 3200);
    return true;
  }
  makeBoat(l) {
    const b = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x40301f, roughness: 0.9 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 3.0), wood); hull.position.y = 0.1; const bow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.8), wood); bow.position.set(0, 0.12, 1.7); bow.rotation.y = 0.3;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3), dark); seat.position.set(0, 0.42, 0); const oar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.0), dark); oar.position.set(0.85, 0.5, 0); oar.rotation.y = 0.5;
    for (const m of [hull, bow, seat, oar]) { m.castShadow = true; b.add(m); } b.position.set(l.bx - Math.sin(l.heading) * 0.3, 0.05, l.bz - Math.cos(l.heading) * 0.3); b.rotation.y = l.heading + Math.PI / 2; return b;
  }
  spawnPickup() {
    const g = this.game, dep = g.depot || g.townhall || g.lift; if (!dep) return;
    const m = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6e4a2a, roughness: 0.9 }), glow = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.45 }));
    const club = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), wood); club.rotation.z = 1.2; club.position.y = 0.12; const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), wood); head.position.set(0.3, 0.2, 0); head.rotation.z = 1.2;
    m.add(glow, club, head); const px = dep.doorOut.x + 1.6, pz = dep.doorOut.z + 0.4; m.position.set(px, 0.08, pz); g.scene.add(m); this.pickup = { x: px, z: pz, mesh: m };
  }
  take() { const p = this.pickup; if (!p) return false; this.game.scene.remove(p.mesh); this.pickup = null; return true; }

  assignTargets() {
    const g = this.game, bs = g.buildings.list.filter((b) => b.state === 'done' && LOOT_TARGETS.includes(b.id) && !b.def.park);
    this.targets = bs.sort((a, b) => LOOT_TARGETS.indexOf(a.id) - LOOT_TARGETS.indexOf(b.id));
    for (const r of this.raiders) this.nextTarget(r);
  }
  nextTarget(r) {
    const left = this.targets.filter((b) => b !== r.target && b.state === 'done'); if (!left.length || r.lootN >= 3) { r.rstate = 'flee'; r.goneTo = false; return; }
    r.target = left[Math.floor(Math.random() * Math.min(3, left.length))]; r.rstate = 'approach'; r.goneTo = false; r.lootN++; r.lootT = 0;
  }

  // ---------- per-tick ----------
  tick(dt) {
    const g = this.game; this.t += dt; this.barkT -= dt;
    for (const r of this.raiders) { if (!r.remove && !r.captured) this.drive(r, dt); else if (r.captured && r.capT > 0) { r.capT -= dt; if (r.capT <= 0) { r.remove = true; } } }
    for (const d of this.defenders()) this.defend(d.s, d.range, dt);
    if (this.t > 260) for (const r of this.raiders) if (!r.captured && r.rstate !== 'flee') { r.rstate = 'flee'; r.goneTo = false; }
    if (this.barkT <= 0) { this.barkT = 5 + Math.random() * 5; this.bark(); }
    if (this.raiders.every((r) => r.remove || r.captured)) {
      this.state = 'ending'; this.calm = 9;
      const caught = this.raiders.filter((r) => r.captured).length, tot = this.raiders.length;
      if (caught === tot) g.messages.push('Lift Guard', 'Intruders are in custody. Back to your posts, everyone. All clear.', 'good');
      else g.messages.push('Planning Office', `The raiders got away${this.stolen > 0 ? ` with ${Math.round(this.stolen)} supplies` : ''}. It is safe to come out.`, caught ? 'good' : 'warn');
      this.lastCaptured = caught; g.mail.send('The Sam City Gazette', 'Raiders on the beach!', `Raiders landed on the shore this week. ${caught} of ${tot} were caught by the guards${caught < tot ? `; the rest rowed off with ${Math.round(this.stolen)} supplies` : ''}.\n\nResidents are reminded to go indoors when the alarm is raised. A Police Station would help keep the island safe.`);
    }
  }
  bark() {
    const g = this.game, soc = g.social; const live = this.raiders.filter((r) => !r.captured && !r.remove && !r.down);
    const r = pick(live.length ? live : [null]); if (r && r.mesh.visible) soc.say(r, g.story.stage >= 2 && Math.random() < 0.18 ? pick(RAIDER_SLIPS) : pick(g.ui.adult && Math.random() < 0.5 ? A.RAIDER : RAIDER_LINES), 2.4);
    const cit = g.population.sims.filter((s) => (s.kind === 'resident' || s.kind === 'child') && s.mesh.visible && !s.sleeping && !s.down && !s.inside && s.activity === 'shelter');
    const c = cit.length ? pick(cit) : null; if (c) soc.say(c, g.story.stage >= 2 && Math.random() < 0.25 ? pick(ALERT_SLIPS) : pick(ALERT_LINES), 2.4);
  }

  drive(r, dt) {
    const g = this.game, w = g.world;
    if (r.down > 0) return;
    r.atkCD -= dt;
    if (r.atkT > 0) { r.atkT -= dt; r.path = []; const v = r.atkV; if (v) r.faceGoal = Math.atan2(v.x - r.x, v.z - r.z); if (r.atkT <= 0) this.strike(r); return; }
    if (r.atkCD <= 0 && r.rstate !== 'flee') { const v = this.victim(r); if (v) { r.atkV = v; r.atkT = r.weapon === 'pistol' ? 0.7 : 0.62; r.path = []; return; } }
    if (r.rstate === 'approach') {
      if (!r.goneTo) {
        r.goneTo = true; const b = r.target; if (!b) { r.rstate = 'flee'; r.goneTo = false; return; }
        if (!r.goTo({ x: b.doorOut.x + (Math.random() - 0.5) * 1.6, z: b.doorOut.z + (Math.random() - 0.5) * 1.2, face: b.rot * Math.PI / 2 + Math.PI })) this.nextTarget(r);
      } else if (!r.path.length && r.phase === 2) { r.rstate = 'loot'; r.lootT = 0; }
    } else if (r.rstate === 'loot') {
      r.lootT += dt; r.working = false;
      if (r.lootT >= 4.2) { r.lootT = 0; this.steal(r); if (this.stolen >= this.cap) { for (const q of this.raiders) if (!q.captured) { q.rstate = 'flee'; q.goneTo = false; } } else this.nextTarget(r); }
    } else if (r.rstate === 'flee') {
      const l = this.land;
      if (!r.goneTo) { r.goneTo = true; r.hurry = true; if (!r.goTo({ x: l.x, z: l.z })) { r.remove = true; } }
      else if (!r.path.length && Math.hypot(r.x - l.x, r.z - l.z) < 3) { r.remove = true; }
      else if (!r.path.length && r.phase === 2) r.goneTo = false;
    }
    void w;
  }
  steal(r) {
    const g = this.game, E = g.economy, b = r.target, dep = b && b.id === 'stockyard', mats = dep ? ['food', 'timber', 'stone', 'brick'] : ['food'];
    const have = mats.filter((m) => E.stock[m] >= 2); if (!have.length) return; const m = pick(have), amt = Math.min(Math.floor(E.stock[m]), 6 + Math.floor(Math.random() * 6));
    E.stock[m] -= amt; this.stolen += amt; r.loot[m] = (r.loot[m] || 0) + amt; r.carry = { mat: m, qty: (r.carry ? r.carry.qty : 0) + amt };
    if (!this.said.loot) { this.said.loot = true; g.messages.push('Town', `Raiders are looting the ${b.def.name}!`, 'warn'); }
  }
  victim(r) {
    const g = this.game, p = g.player, rng = r.weapon === 'pistol' ? 7 : 3.0; let best = null, bd = rng;
    const px = Math.hypot(p.x - r.x, p.z - r.z); if (px < bd && !p.sleeping && !(p.sedated > 0) && !(p.down > 0) && (g.buildings.playerInside === r.inside || !g.buildings.playerInside)) { best = p; bd = px; }
    for (const s of g.population.sims) {
      if (s === r || s.kind === 'raider' || s.kind === 'security' || s.role === 'guard' || s.down > 0 || s.pose === 'sleep' || s.inside || s.hidden) continue;
      const d = Math.hypot(s.x - r.x, s.z - r.z); if (d < bd) { bd = d; best = s; }
    }
    if (best && Math.random() < 0.55) return best; r.atkCD = 1.2; return null;
  }
  strike(r) {
    const g = this.game, v = r.atkV; r.atkV = null; r.atkCD = 2.6 + Math.random() * 1.4; if (!v) return;
    const d = Math.hypot(v.x - r.x, v.z - r.z), isP = v === g.player;
    if (r.weapon === 'pistol') { this.tracer(r, v); if (d > 8) return; } else if (d > 3.6) return;
    if (isP) v.stagger(2.4); else v.knockDown(16 + Math.random() * 8);
    if (!this.said.hit) { this.said.hit = true; g.messages.push('Town', `${isP ? 'Sam' : v.name} has been knocked down by a raider!`, 'warn'); }
  }
  tracer(from, to) {
    const g = this.game, a = new THREE.Vector3(from.x, 1.3, from.z), b = new THREE.Vector3(to.x, 1.2, to.z), len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len), new THREE.MeshBasicMaterial({ color: 0xfff1a8 })); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); g.scene.add(m); this.tracers.push({ mesh: m, t: 0.14 });
  }

  // ---------- defence ----------
  defenders() {
    const g = this.game, police = g.buildings.count('police') > 0, out = [];
    for (const s of g.population.sims) {
      if (s.down > 0 || s.remove || s.hidden) continue;
      if (s.kind === 'security') out.push({ s, range: police ? 999 : 30 });
      else if (s.role === 'guard' && s.kind === 'resident' && !s.leaving) out.push({ s, range: 999 });
    }
    return out;
  }
  defend(s, range, dt) {
    const g = this.game; let best = null, bd = range;
    for (const r of this.raiders) { if (r.captured || r.remove) continue; const d = Math.hypot(r.x - s.x, r.z - s.z); if (d < bd) { bd = d; best = r; } }
    s.engaged = best; s.panic = !!best; if (!best) return; s.sortied = true;
    s.fireCD = (s.fireCD || 0) - dt; s.repath = (s.repath || 0) - dt;
    if (s.sleeping) return; if (s.inside) { /* step out first */ }
    if (bd > 8.5) { if (s.repath <= 0 || !s.path.length) { s.repath = 1.3; s.goTo({ x: best.x, z: best.z }); } }
    else { s.path = []; s.faceGoal = Math.atan2(best.x - s.x, best.z - s.z); if (s.fireCD <= 0) { s.fireCD = 2.3 + Math.random() * 0.5; g.security.fireAt(s, best); } }
  }
  hit(r, dmg) {
    if (r.captured || r.remove) return; r.hp -= dmg; r.freezeT = 0.3;
    if (r.hp <= 0) this.capture(r); else if (r.hp === 1 && r.rstate !== 'flee') { r.rstate = 'flee'; r.goneTo = false; }
  }
  capture(r) {
    const g = this.game; r.captured = true; r.down = 999; r.path = []; r.capT = 14; r.carry = null; r.atkT = 0;
    for (const [m, q] of Object.entries(r.loot || {})) g.economy.stock[m] += q; r.loot = {};
  }

  finish(silent = false) {
    const g = this.game;
    if (this.boat) { g.scene.remove(this.boat); this.boat = null; }
    this.take();
    for (const r of this.raiders) { r.remove = true; } this.raiders = [];
    for (const s of g.population.sims) { s.engaged = null; s.panic = false; }
    if (g.player.weapon && !silent) { g.player.weapon = null; g.ui.toast('You hang the club back on its peg.'); } else if (silent) g.player.weapon = null;
    if (this.state !== 'idle' && !silent) {
      this.alert = false; const sims = g.population.sims.filter((s) => s.kind === 'resident' && s.mesh.visible && !s.inside && !s.sleeping), c = sims.length ? pick(sims) : null; if (c) g.social.say(c, pick(RAID_CALM_LINES), 2.6);
    }
    this.alert = false; this.state = 'idle'; this.cool = (7 + Math.random() * 5) * DAY_SECONDS; this.alertText = null; g.ui.setAlert(null);
  }
  /** Used by Sim.knockDown for bubble text. */
  downLine() { return pick(DOWN_LINES); }
}
