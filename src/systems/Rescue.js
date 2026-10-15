import * as THREE from 'three';
import { makeCarMesh } from '../render/Vehicles.js';
import { TILE } from '../config.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';

// Nobody just vanishes. Someone badly hurt (mugged, run over) stays on the ground until help comes: an ambulance from
// the clinic (Electric age on), a doctor or nurse on foot, or failing that a neighbour, who carries them to the clinic
// (or, with no clinic, to the Lift "for treatment", and they come back a while later). The "dead" (it's all a show:
// nobody really dies, but Sam believes it) are collected by two undertakers in black with a hand cart: they lift the body
// into it, cover it, and wheel it to the church or straight up the Lift; there are no burials. Shoot an undertaker and
// he's down too: his mate takes the cart on, and another pair comes down the Lift to wheel the hurt one back up it.
const HELP = ['Hold on, I\'ve got you.', 'Easy now. Let\'s get you seen to.', 'Mind your head.', 'Somebody call an ambulance! Oh. I\'ll do it.', 'You\'ll be right as rain.'];
const CART_LIE = 0.74, HITCH = 1.62;   // the back of someone lying in the cart; from the cart's middle to the handle ends

let MATS = null, BOX = null;
/** The undertakers' cart: a black-painted wooden bed on two big wheels, long handles to pull it by, a sheet to cover the body. */
function makeDeadCart() {
  if (!MATS) { MATS = { wood: new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 0.85 }), paint: new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.6 }), iron: new THREE.MeshStandardMaterial({ color: 0x2c2d30, roughness: 0.5, metalness: 0.5 }), sheet: new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.95 }) }; BOX = new THREE.BoxGeometry(1, 1, 1); }
  const g = new THREE.Group(), box = (w, h, d, x, y, z, m, rx = 0) => { const b = new THREE.Mesh(BOX, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.x = rx; b.castShadow = true; g.add(b); return b; };
  box(0.84, 0.06, 1.95, 0, 0.56, 0, MATS.wood); box(0.05, 0.22, 1.95, -0.42, 0.68, 0, MATS.paint); box(0.05, 0.22, 1.95, 0.42, 0.68, 0, MATS.paint); box(0.84, 0.22, 0.05, 0, 0.68, -0.97, MATS.paint); box(0.84, 0.16, 0.05, 0, 0.65, 0.97, MATS.paint);
  box(0.05, 0.05, 0.9, -0.3, 0.72, 1.38, MATS.wood, -0.18); box(0.05, 0.05, 0.9, 0.3, 0.72, 1.38, MATS.wood, -0.18); box(0.66, 0.04, 0.04, 0, 0.8, 1.8, MATS.wood);   // shafts and the bar you pull
  box(0.05, 0.42, 0.05, -0.3, 0.32, 0.86, MATS.iron); box(0.05, 0.42, 0.05, 0.3, 0.32, 0.86, MATS.iron);   // legs it rests on
  const wheels = [];
  for (const sx of [-0.5, 0.5]) {
    const w = new THREE.Group(); w.position.set(sx, 0.42, -0.12); g.add(w); wheels.push(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.03, 6, 18), MATS.iron); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(BOX, MATS.wood); sp.scale.set(0.03, 0.76, 0.03); sp.rotation.x = (i / 4) * Math.PI; w.add(sp); }
    const hub = new THREE.Mesh(BOX, MATS.iron); hub.scale.set(0.09, 0.09, 0.09); w.add(hub);
  }
  const sheet = box(0.74, 0.05, 1.05, 0, 0.86, -0.42, MATS.sheet); sheet.visible = false;   // over the legs once there's someone in it
  g.userData = { wheels, sheet }; return g;
}

export class Rescue {
  constructor(game) { this.game = game; this.jobs = []; this.scanT = 0; this.left = []; }
  clinic() { return this.game.buildings.list.find((b) => b.state === 'done' && (b.def.heals || b.id === 'clinic' || b.id === 'surgery') && b.doorOut); }
  update(dt) {
    const g = this.game; if (!g.started || g.netVisitor) return; const k = Math.max(0.25, Math.min(4, g.clock.speed)); dt *= k;
    if ((this.scanT -= dt) <= 0) { this.scanT = 2; for (const s of g.population.sims) if (s.injured && !s.rescue && !s.remove && (!s.hidden || s.dead) && !s.healAt && !(s.inside && s.inside.burning)) this.dispatch(s); }   // (nobody goes into a burning building for the dead)
    for (const j of this.jobs) this.step(j, dt);
    this.jobs = this.jobs.filter((j) => !j.done);
    for (const s of g.population.sims) if (s.healAt && g.elapsed > s.healAt) this.discharge(s);
    for (let i = this.left.length - 1; i >= 0; i--) { const L = this.left[i]; if ((L.t -= dt) <= 0 || L.gone()) { g.scene.remove(L.mesh); this.left.splice(i, 1); } }   // carts left in the street when their undertakers were shot
  }
  /** The undertakers (in black, from the Lift) do the dead, and anyone from up the Lift who's hurt goes back up it with them. */
  undertakers(v) { return !!v.dead || (v.kind === 'guest' && v.liftCase); }
  /** Two builders who can stop what they're doing, nearest first (null if there aren't two). */
  builderPair(v) {
    const L = this.game.population.sims.filter((s) => s.role === 'builder' && s.kind === 'resident' && !s.remove && !s.rescue && !(s.down > 0) && !s.dead && s.pose !== 'sleep' && !s.crook && !s.fight && !s.trapped && !s.fleeFire && !s.riding && !s.hidden).sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z));
    return L.length >= 2 ? L.slice(0, 2) : null;
  }
  dispatch(v) {
    const g = this.game, cl = this.clinic(), dead = !!v.dead, rest = dead ? g.buildings.church() || cl : null;   // the dead rest at the church or chapel, else the clinic or surgery, until the funeral
    const crew = dead && !rest ? this.builderPair(v) : null;   // nowhere in town to keep them: the builders take them up the Lift
    const ut = !crew && this.undertakers(v), dest = dead ? rest || g.lift : ut ? g.lift : cl || g.lift;
    const job = { v, dest, stage: 'go', t: 0, dead, ut, crew: !!crew }; v.rescue = job;
    if (!ut && !dead && cl && g.tech && g.tech.age >= 3) { this.ambulance(job, cl); this.jobs.push(job); return; }
    let c = null;
    if (crew) {
      [c, job.mate] = crew; const m = makeDeadCart(); g.scene.add(m); job.cart = { mesh: m, x: c.x - Math.sin(c.heading) * HITCH, z: c.z - Math.cos(c.heading) * HITCH, h: c.heading }; c.pulling = true;
      for (const b of crew) { b.standUp && b.standUp(); b.rescue = job; } if (c.mesh.visible) g.social.say(c, pick(['Come on. Somebody has to.', 'Get the barrow. Gently, mind.', 'Not what I signed up for, this.']), 2.6);
    } else if (ut) {
      const L = g.lift.doorOut, P = g.population.makePerson({ kind: 'visitor', gender: 'm' }); c = g.population.spawnAt(L.x, L.z, { name: 'Mr ' + P.surname, first: 'Mr', surname: P.surname, kind: 'guest', trait: 'busy', look: { ...P.look, shirt: 0x15151a, pants: 0x15151a, accessory: 'tie', hat: { type: 'bowler', color: 0x111111 } }, gender: 'm', age: 55 }); c.undertaker = true;
      const P2 = g.population.makePerson({ kind: 'visitor', gender: 'm' }); job.mate = g.population.spawnAt(L.x + 1, L.z, { name: 'Mr ' + P2.surname, first: 'Mr', surname: P2.surname, kind: 'guest', trait: 'busy', look: { ...P2.look, shirt: 0x15151a, pants: 0x15151a, accessory: 'tie' }, gender: 'm', age: 40 }); job.mate.undertaker = true;
      const m = makeDeadCart(); g.scene.add(m); job.cart = { mesh: m, x: L.x, z: L.z - HITCH, h: 0 }; c.pulling = true;
    } else {
      const staff = cl ? cl.workers.filter((w) => !w.down && !w.rescue && !w.riding) : [];
      const near = g.population.sims.filter((s) => s.kind === 'resident' && s !== v && s.age >= 16 && s.age < 70 && !s.rescue && !(s.down > 0) && !s.riding && !s.crook && !s.fight && s.pose !== 'sleep' && s.activity !== 'police' && Math.hypot(s.x - v.x, s.z - v.z) < 60);
      c = staff[0] || near.sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z))[0];
      if (!c) { v.rescue = null; return; }   // nobody about yet: try again shortly
    }
    job.c = c; c.rescue = job; c.standUp && c.standUp(); this.claim(c, job); this.jobs.push(job);
  }
  /** Keep the carriers busy with this (through the events hook, so they don't wander off to work). */
  claim(c, job) { const g = this.game; const ev = { live: true, calling: (s) => s === job.c || s === job.mate, hold: () => true, spot: () => null }; job.ev = ev; if (g.celebrations) g.celebrations.events.push(ev); c.phase = 0; if (job.mate) job.mate.phase = 0; }
  /** Someone on a job was shot (Combat): sort it out straight away rather than next tick. */
  dropped(s) { for (const j of this.jobs) if (!j.done && (j.c === s || j.mate === s)) this.lose(j, s); }
  /** A carrier is down: his mate takes the cart on; with nobody left standing, the cart (and whoever's in it) stays put for the next pair. */
  lose(j, s) {
    if (s === j.mate) { s.rescue = null; j.mate = null; return; }
    s.pulling = false; s.rescue = null; const m = j.mate;
    if (m && !m.remove && !(m.down > 0)) { j.mate = null; j.c = m; m.rescue = j; m.pulling = !!j.cart; m.path = []; j.grab = !!j.cart && j.stage !== 'load'; if (m.mesh.visible) this.game.social.say(m, pick(['Gerald! Oh, Gerald...', 'I\'ll carry on. It\'s what he\'d want.', 'Not again.']), 2.4); return; }
    j.c = null; this.finish(j, true);
  }
  step(j, dt) {
    const g = this.game, v = j.v; j.t += dt;
    if (v.remove) { this.finish(j); return; }
    if (j.amb) return this.drive(j, dt);
    if (j.c && (j.c.remove || j.c.down > 0)) this.lose(j, j.c);
    if (j.mate && (j.mate.remove || j.mate.down > 0)) this.lose(j, j.mate);
    const c = j.c; if (!c || j.done) { if (!j.done) this.finish(j, true); return; }
    if (j.grab) {   // the mate taking over walks round to the handles first
      const k = j.cart, hx = k.x + Math.sin(k.h) * (HITCH + 0.3), hz = k.z + Math.cos(k.h) * (HITCH + 0.3);
      if (Math.hypot(hx - c.x, hz - c.z) > 0.45) { if (!c.path.length || (j.re = (j.re || 0) - dt) <= 0) { j.re = 2; c.goTo({ x: hx, z: hz }); } this.haul(j, c, dt, true); return; }
      j.grab = false; c.path = []; c.x = hx; c.z = hz; c.heading = k.h;
    }
    // with a cart, the puller stops a cart's length short and the body is lifted in; on foot, the carrier goes right up to them
    const goal = j.stage === 'go' ? (v.hidden ? v.bodyAt || (v.home && v.home.doorOut) || v : v) : j.dest.doorOut, reach = j.stage === 'go' && j.cart ? 2.4 : 1.6;
    if (j.stage === 'load') {   // both bend down and lift the body in (the dead get the sheet)
      c.path = []; c.fightAnim = 'lift'; c.fightAnimT = 0.3; if (j.mate) { j.mate.fightAnim = 'lift'; j.mate.fightAnimT = 0.3; }
      if ((j.loadT -= dt) <= 0) { j.stage = 'carry'; c.speedK = 0.6; if (j.mate) j.mate.speedK = 0.6; v.inCart = { lieH: CART_LIE }; v.hidden = false; v.inside = null; j.cart.mesh.userData.sheet.visible = j.dead; if (v.leftCart) { g.scene.remove(v.leftCart); v.leftCart = null; } }
    } else if (Math.hypot(goal.x - c.x, goal.z - c.z) > reach) { if (!c.path.length || (j.re = (j.re || 0) - dt) <= 0) { j.re = 3; c.goTo({ x: goal.x, z: goal.z }); } }
    else if (j.stage === 'go') {
      c.path = []; v.hidden = false; v.inside = null;
      if (c.mesh.visible) g.social.say(c, j.dead ? pick(['Gently does it.', 'Mind the step.', 'On three. One, two...', 'Feet first, Mr Pike.']) : pick(HELP), 2.4);
      if (j.cart) { j.stage = 'load'; j.loadT = 1.6; c.heading = Math.atan2(v.x - c.x, v.z - c.z); if (j.mate) j.mate.path = []; }
      else { j.stage = 'carry'; c.speedK = 0.55; }
    }
    else { this.deliver(j); return; }
    if (j.mate && !j.mate.remove && j.stage !== 'load') { const m = j.mate, side = j.cart ? 1.1 : 0, ax = c.x - Math.sin(c.heading) * (j.cart ? 1.6 : 1.2) + Math.cos(c.heading) * side, az = c.z - Math.cos(c.heading) * (j.cart ? 1.6 : 1.2) - Math.sin(c.heading) * side; if (Math.hypot(ax - m.x, az - m.z) > 1.6 && (!m.path.length || Math.random() < dt)) m.goTo({ x: ax, z: az }); }   // walks alongside the cart
    if (j.cart) this.haul(j, c, dt);
    else if (j.stage === 'carry') { v.down = 1; v.x = c.x - Math.sin(c.heading) * 0.9; v.z = c.z - Math.cos(c.heading) * 0.9; v.heading = c.heading + Math.PI; }   // dragged along behind
    if (j.t > 400) this.finish(j, true);
  }
  /** The cart trails behind the one pulling it like a trailer (its handles follow his hands round corners), wheels turning; whoever's in it rides along. */
  haul(j, c, dt, still = false) {
    const k = j.cart, hx = c.x - Math.sin(c.heading) * 0.28, hz = c.z - Math.cos(c.heading) * 0.28;
    if (j.stage !== 'load' && !still) { let dx = hx - k.x, dz = hz - k.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d; const nx = hx - dx * HITCH, nz = hz - dz * HITCH, moved = Math.hypot(nx - k.x, nz - k.z); k.x = nx; k.z = nz; k.h = Math.atan2(dx, dz); for (const w of k.mesh.userData.wheels) w.rotation.x += moved / 0.42; }
    k.mesh.position.set(k.x, 0, k.z); k.mesh.rotation.y = k.h;
    const v = j.v; if (v.inCart) { v.down = 1; v.x = k.x - Math.sin(k.h) * 0.05; v.z = k.z - Math.cos(k.h) * 0.05; v.heading = k.h + Math.PI; v.rideY = 0; }   // lying in it, head towards the handles
  }
  deliver(j) {
    const g = this.game, v = j.v, b = j.dest;
    if (j.dead) { g.messages.push(j.crew ? 'Builders' : 'St Sam\'s', b === g.lift ? (j.crew ? `The builders took ${v.name} up the Lift. There's no chapel, church or clinic in town to keep them until a funeral.` : `${v.name} has been taken up the Lift. Nobody says where it goes.`) : `${v.name} is resting at the ${b.def.name} until ${g.buildings.church() ? 'the funeral on Sunday' : 'Sunday, when they go up the Lift (there\'s no church or chapel for a service)'}.`); v.remove = true; }
    else if (j.ut) { g.messages.push('Lift', `${v.name} has been wheeled back up the Lift, hurt. They'll send someone else next time.`, 'warn'); v.remove = true; }
    else if (b === g.lift) { v.hidden = true; v.healAt = g.elapsed + 160; g.messages.push('Lift', `${v.name} has been taken up the Lift for treatment. (There's no clinic in town.)`, 'warn'); }
    else { v.hidden = true; v.healAt = g.elapsed + 50; v.healB = b; g.messages.push('Town', `${v.name} is being patched up at the ${b.def.name}.`); }
    if (j.cart) { this.game.scene.remove(j.cart.mesh); j.cart = null; }   // in through the door with it
    this.finish(j);
  }
  discharge(s) {
    const g = this.game, b = s.healB || g.lift; s.healAt = 0; s.healB = null; s.hidden = false; s.injured = false; s.down = 0; s.rescue = null; s.hp = 100; s.recovering = true; s.phase = 0; s.inCart = null;
    if (b.doorOut) { s.x = b.doorOut.x; s.z = b.doorOut.z; } s.moodBoost += 0.1; if (s.mesh.visible) g.social.say(s, pick(['Good as new!', 'Bit sore, but I\'ll live.', 'They gave me a lollipop.']), 2.4);
  }
  finish(j, failed) {
    const g = this.game; j.done = true; if (j.ev) j.ev.live = false; const c = j.c, hurt = (s) => s && (s.down > 0 || s.injured);
    if (c) { c.rescue = null; c.speedK = 1; c.phase = 0; c.pulling = false; if (c.undertaker && !hurt(c)) c.remove = true; }
    if (j.mate) { j.mate.rescue = null; j.mate.speedK = 1; j.mate.phase = 0; if (j.mate.undertaker && !hurt(j.mate)) j.mate.remove = true; }
    if (j.amb) g.scene.remove(j.amb.mesh);
    if (j.cart) {   // left where it stands: with the body in it (the next pair takes it away) or empty for a while
      const v = j.v, mesh = j.cart.mesh; if (v && v.inCart && !v.remove) v.leftCart = mesh; this.left.push({ mesh, t: v && v.inCart ? 9999 : 90, gone: () => !mesh.parent || (v && v.remove) }); j.cart = null;
    }
    if (failed && j.v && !j.v.remove) j.v.rescue = null;
  }
  // ---------- the ambulance ----------
  route(from, to) { const w = this.game.world, [sx, sz] = w.tileOf(from.x, from.z), [tx, tz] = w.tileOf(to.x, to.z), p = w.findPath(sx, sz, tx, tz, true); return p ? p.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })).concat([{ x: to.x, z: to.z }]) : [{ x: to.x, z: to.z }]; }
  ambulance(j, cl) {
    const g = this.game, m = makeCarMesh(0xf4f4f4, true); g.scene.add(m);
    j.amb = { mesh: m, x: cl.doorOut.x, z: cl.doorOut.z, h: 0, path: this.route(cl.doorOut, j.v), siren: 0 }; j.clinic = cl; j.dest = cl;
    g.messages.push('Town', `An ambulance is on its way to ${j.v.name}.`); if (g.markers) g.markers.add(j.v.x, j.v.z, '🚑', 'Ambulance called', 3600, null, () => !j.done && !!j.amb);
  }
  drive(j, dt) {
    const g = this.game, a = j.amb, q = a.path[0];
    if (q) { const dx = q.x - a.x, dz = q.z - a.z, d = Math.hypot(dx, dz); if (d < 1) a.path.shift(); else { a.h = Math.atan2(dx, dz); const sp = Math.min(d, 9 * dt); a.x += dx / d * sp; a.z += dz / d * sp; } }
    else if (j.stage === 'go') { j.stage = 'carry'; j.v.hidden = true; a.path = this.route(j.v, j.clinic.doorOut); }   // stretcher in the back
    else { this.deliver(j); return; }
    a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = a.h;
    if (g.mode === 'sim' && Math.hypot(g.player.x - a.x, g.player.z - a.z) < 50 && (a.siren -= dt) <= 0) { a.siren = 0.5; a.hi = !a.hi; Sfx.tone(a.hi ? 960 : 720, 0.45, { type: 'triangle', vol: 0.03 }); }
    if (j.t > 300) this.finish(j, true);
  }
}
