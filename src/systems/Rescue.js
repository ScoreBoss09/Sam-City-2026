import { makeCarMesh } from '../render/Vehicles.js';
import { TILE } from '../config.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';

// Nobody just vanishes. Someone badly hurt (mugged, run over) stays on the ground until help comes: an ambulance from
// the clinic (Electric age on), a doctor or nurse on foot, or failing that a neighbour, who carries them to the clinic
// (or, with no clinic, to the Lift "for treatment", and they come back a while later). The "dead" (it's all a show:
// nobody really dies, but Sam believes it) are collected by two undertakers in black and taken to the church, or
// straight up the Lift; there are no burials.
const HELP = ['Hold on, I\'ve got you.', 'Easy now. Let\'s get you seen to.', 'Mind your head.', 'Somebody call an ambulance! Oh. I\'ll do it.', 'You\'ll be right as rain.'];

export class Rescue {
  constructor(game) { this.game = game; this.jobs = []; this.scanT = 0; }
  clinic() { return this.game.buildings.list.find((b) => b.state === 'done' && (b.def.heals || b.id === 'clinic' || b.id === 'surgery') && b.doorOut); }
  update(dt) {
    const g = this.game; if (!g.started || g.netVisitor) return; const k = Math.max(0.25, Math.min(4, g.clock.speed)); dt *= k;
    if ((this.scanT -= dt) <= 0) { this.scanT = 2; for (const s of g.population.sims) if (s.injured && !s.rescue && !s.remove && (!s.hidden || s.dead) && !s.healAt) this.dispatch(s); }
    for (const j of this.jobs) this.step(j, dt);
    this.jobs = this.jobs.filter((j) => !j.done);
    for (const s of g.population.sims) if (s.healAt && g.elapsed > s.healAt) this.discharge(s);
  }
  dispatch(v) {
    const g = this.game, cl = this.clinic(), dead = !!v.dead, dest = dead ? g.buildings.church() || g.lift : cl || g.lift;
    const job = { v, dest, stage: 'go', t: 0, dead }; v.rescue = job;
    if (!dead && cl && g.tech && g.tech.age >= 3) { this.ambulance(job, cl); this.jobs.push(job); return; }
    let c = null;
    if (dead) { const P = g.population.makePerson({ kind: 'visitor', gender: 'm' }); c = g.population.spawnAt(g.lift.doorOut.x, g.lift.doorOut.z, { name: 'Mr ' + P.surname, first: 'Mr', surname: P.surname, kind: 'guest', trait: 'busy', look: { ...P.look, shirt: 0x15151a, pants: 0x15151a, accessory: 'tie', hat: { type: 'bowler', color: 0x111111 } }, gender: 'm', age: 55 }); c.undertaker = true;
      const P2 = g.population.makePerson({ kind: 'visitor', gender: 'm' }); job.mate = g.population.spawnAt(g.lift.doorOut.x + 1, g.lift.doorOut.z, { name: 'Mr ' + P2.surname, first: 'Mr', surname: P2.surname, kind: 'guest', trait: 'busy', look: { ...P2.look, shirt: 0x15151a, pants: 0x15151a, accessory: 'tie' }, gender: 'm', age: 40 }); }
    else {
      const staff = cl ? cl.workers.filter((w) => !w.down && !w.rescue && !w.riding) : [];
      const near = g.population.sims.filter((s) => s.kind === 'resident' && s !== v && s.age >= 16 && s.age < 70 && !s.rescue && !(s.down > 0) && !s.riding && !s.crook && !s.fight && s.pose !== 'sleep' && s.activity !== 'police' && Math.hypot(s.x - v.x, s.z - v.z) < 60);
      c = staff[0] || near.sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z))[0];
      if (!c) { v.rescue = null; return; }   // nobody about yet: try again shortly
    }
    job.c = c; c.rescue = job; c.standUp && c.standUp(); this.claim(c, job); this.jobs.push(job);
  }
  /** Keep the carrier busy with this (through the events hook, so they don't wander off to work). */
  claim(c, job) { const g = this.game; const ev = { live: true, calling: (s) => s === c || s === job.mate, hold: () => true, spot: () => null }; job.ev = ev; if (g.celebrations) g.celebrations.events.push(ev); c.phase = 0; if (job.mate) job.mate.phase = 0; }
  step(j, dt) {
    const g = this.game, v = j.v; j.t += dt;
    if (v.remove) { this.finish(j); return; }
    if (j.amb) return this.drive(j, dt);
    const c = j.c; if (!c || c.remove || c.down > 0) { this.finish(j, true); return; }
    const goal = j.stage === 'go' ? (v.hidden && v.home ? v.home.doorOut : v) : j.dest.doorOut;
    if (Math.hypot(goal.x - c.x, goal.z - c.z) > 1.6) { if (!c.path.length || (j.re = (j.re || 0) - dt) <= 0) { j.re = 3; c.goTo({ x: goal.x, z: goal.z }); } }
    else if (j.stage === 'go') { j.stage = 'carry'; c.speedK = 0.55; v.hidden = false; v.inside = null; if (c.mesh.visible) g.social.say(c, j.dead ? pick(['Gently does it.', 'Mind the step.', 'On three. One, two...']) : pick(HELP), 2.4); c.path = []; }
    else { this.deliver(j); return; }
    if (j.mate && !j.mate.remove) { const m = j.mate; if (Math.hypot(c.x - m.x, c.z - m.z) > 2 && (!m.path.length || Math.random() < dt)) m.goTo({ x: c.x - Math.sin(c.heading) * 1.2, z: c.z - Math.cos(c.heading) * 1.2 }); }
    if (j.stage === 'carry') { v.down = 1; v.x = c.x - Math.sin(c.heading) * 0.9; v.z = c.z - Math.cos(c.heading) * 0.9; v.heading = c.heading + Math.PI; }   // dragged along behind
    if (j.t > 400) this.finish(j, true);
  }
  deliver(j) {
    const g = this.game, v = j.v, b = j.dest;
    if (j.dead) { g.messages.push('St Sam\'s', b === g.lift ? `${v.name} has been taken up the Lift. Nobody says where it goes.` : `${v.name} is resting at the ${b.def.name} until the funeral.`); v.remove = true; }
    else if (b === g.lift) { v.hidden = true; v.healAt = g.elapsed + 160; g.messages.push('Lift', `${v.name} has been taken up the Lift for treatment. (There's no clinic in town.)`, 'warn'); }
    else { v.hidden = true; v.healAt = g.elapsed + 50; v.healB = b; g.messages.push('Town', `${v.name} is being patched up at the ${b.def.name}.`); }
    this.finish(j);
  }
  discharge(s) {
    const g = this.game, b = s.healB || g.lift; s.healAt = 0; s.healB = null; s.hidden = false; s.injured = false; s.down = 0; s.rescue = null; s.hp = 100; s.recovering = true; s.phase = 0;
    if (b.doorOut) { s.x = b.doorOut.x; s.z = b.doorOut.z; } s.moodBoost += 0.1; if (s.mesh.visible) g.social.say(s, pick(['Good as new!', 'Bit sore, but I\'ll live.', 'They gave me a lollipop.']), 2.4);
  }
  finish(j, failed) {
    j.done = true; if (j.ev) j.ev.live = false; const c = j.c; if (c) { c.rescue = null; c.speedK = 1; c.phase = 0; if (c.undertaker) c.remove = true; } if (j.mate) j.mate.remove = true;
    if (j.amb) this.game.scene.remove(j.amb.mesh); if (failed && j.v && !j.v.remove) j.v.rescue = null;
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
