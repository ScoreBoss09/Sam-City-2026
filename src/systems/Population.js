import { ROLES } from '../data/buildings.js';
import { FIRST, LAST, SKINS, HAIRS, SHIRTS, PANTS, TRAITS } from '../data/people.js';
import { Sim } from '../sim/Sim.js';
import { pick, clamp } from '../util.js';
import { MAX_SIMS_HARD, MIN_SIMS } from '../config.js';

/** Owns every NPC: arrival via the Lift, housing, jobs, visitors, and the performance-driven population cap. */
export class Population {
  constructor(game) {
    this.game = game; this.sims = []; this.simCap = 60; this.timer = 8; this.visitorTimer = 30; this.invites = 0; this.fpsEma = 60; this.capTimer = 4; this.names = new Set();
    const w = game.world.events;
    w.on('building:done', (b) => this.onBuildingDone(b));
    w.on('building:removed', (b) => this.onBuildingRemoved(b));
  }
  residents() { return this.sims.filter((s) => s.kind === 'resident' && !s.remove); }
  count() { return this.residents().length; }
  employed() { return this.residents().filter((s) => s.workplace).length; }
  freeBeds() { let n = 0; for (const b of this.game.buildings.list) if (b.state === 'done' && b.def.beds) n += b.def.beds - b.residents.length - (b.reservedForPlayer ? 1 : 0); return Math.max(0, n); }
  vacancies() { const out = []; for (const b of this.game.buildings.list) { if (b.state !== 'done' || !b.def.jobs) continue; for (const [r, n] of Object.entries(b.def.jobs)) { const have = b.workers.filter((s) => s.role === r).length; for (let i = have; i < n; i++) out.push({ b, role: r }); } } return out; }

  uniqueName() { for (let i = 0; i < 40; i++) { const n = pick(FIRST) + ' ' + pick(LAST); if (!this.names.has(n)) { this.names.add(n); return n; } } return pick(FIRST) + ' ' + pick(LAST); }
  lookFor(role) { const r = role && ROLES[role]; return { skin: pick(SKINS), hair: pick(HAIRS), shirt: r ? r.shirt : pick(SHIRTS), pants: r ? r.pants : pick(PANTS) }; }

  spawnAtLift(opts) {
    const g = this.game, lift = g.lift;
    const s = new Sim(g, { x: lift.doorIn.x, z: lift.doorIn.z, inside: lift, ...opts }); s.heading = Math.PI; this.sims.push(s);
    return s;
  }
  arrive() {
    const g = this.game; if (this.sims.length >= this.simCap) return null;
    const vac = this.vacancies(), builderSites = g.construction.sites.length;
    let role = null, vacancy = null;
    if (vac.length) { vacancy = vac.find((v) => v.role === 'builder' && builderSites) || pick(vac); role = vacancy.role; }
    const name = this.uniqueName();
    const s = this.spawnAtLift({ name, kind: 'resident', trait: pick(TRAITS), look: this.lookFor(role), actor: Math.random() });
    s.arrivalDay = g.clock.day; this.assignHome(s); this.assignJob(s, vacancy);
    g.messages.push('Lift', `${name} arrived in Sam City${role ? ' as a ' + ROLES[role].name : ''}.`);
    return s;
  }
  assignHome(s) {
    for (const b of this.game.buildings.list) {
      if (b.state !== 'done' || !b.def.beds || b.residents.length >= b.def.beds - (b.reservedForPlayer ? 1 : 0)) continue;
      b.residents.push(s); s.home = b; const sp = b.spots.bed.find((x) => !x.taken); if (sp) sp.taken = s; return true;
    }
    return false;
  }
  assignJob(s, v) {
    v = v || this.vacancies().find((x) => x.role === 'builder') || pick(this.vacancies()); if (!v) return false;
    v.b.workers.push(s); s.workplace = v.b; s.role = v.role; s.workSpot = v.b.workers.length - 1;
    const r = ROLES[v.role]; s.look = { ...s.look, shirt: r.shirt, pants: r.pants }; s.rebuildMesh(); return true;
  }
  fire(s) { if (s.workplace) { const i = s.workplace.workers.indexOf(s); if (i >= 0) s.workplace.workers.splice(i, 1); s.workplace.workers.forEach((w, k) => (w.workSpot = k)); } s.workplace = null; s.role = null; s.abortJob(); }

  onBuildingDone(b) {
    for (const s of this.residents()) { if (!s.home) this.assignHome(s); if (!s.workplace) this.assignJob(s); }
  }
  onBuildingRemoved(b) {
    for (const s of this.sims) {
      if (s.home === b) { s.home = null; s.bedSpot = null; if (s.pose === 'sleep') s.pose = 'stand'; }
      if (s.workplace === b) { s.workplace = null; s.role = null; s.abortJob(); }
      if (s.inside === b) { s.inside = null; s.x = b.doorOut.x; s.z = b.doorOut.z; s.path = []; s.phase = 0; }
      if (s.job && s.job.site === b) s.abortJob();
      if (s.pose === 'sleep' && s.bedSpot && s.bedSpot.b === b) s.pose = 'stand';
    }
  }

  update(dt) {
    const g = this.game;
    // arrivals: need free beds and (open jobs or a tiny early-game population)
    this.timer -= dt; this.visitorTimer -= dt;
    const power = g.buildings.count('power') > 0, water = g.buildings.count('water') > 0, parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done').length;
    const rate = clamp(1 + (power ? 0.5 : 0) + (water ? 0.3 : 0) + parks * 0.1, 1, 2.5);
    if (this.timer <= 0) {
      this.timer = (this.invites > 0 ? 4 : 26) / rate;
      const can = this.freeBeds() > 0 && (this.vacancies().length > 0 || this.count() < 4 || this.invites > 0);
      if (can && this.sims.length < this.simCap) { this.arrive(); if (this.invites > 0) this.invites--; }
    }
    if (this.visitorTimer <= 0) {
      this.visitorTimer = 50 + Math.random() * 40;
      const vis = this.sims.filter((s) => s.kind === 'visitor').length;
      if (vis < 3 && g.clock.hour > 8 && g.clock.hour < 18 && this.sims.length < this.simCap && g.buildings.count('shop') + g.buildings.list.filter((b) => b.def.park).length > 0)
        this.spawnAtLift({ name: 'Visitor ' + pick(FIRST), kind: 'visitor', look: this.lookFor(null), actor: 1 });
    }
    // unemployment drift & emigration
    for (const s of this.residents()) if (!s.workplace && this.vacancies().length) this.assignJob(s);
    // update sims
    for (const s of this.sims) { s.think(dt); s.step(dt); }
    for (const s of this.sims) if (s.remove) { this.release(s); s.dispose(); }
    this.sims = this.sims.filter((s) => !s.remove);
    // performance governor
    this.capTimer -= dt; this.fpsEma += (g.fps - this.fpsEma) * Math.min(1, dt * 0.2);
    if (this.capTimer <= 0 && g.fps > 0) {
      this.capTimer = 4;
      if (g.fps < 38 && this.simCap > MIN_SIMS) this.simCap = Math.max(MIN_SIMS, this.simCap - 6);
      else if (g.fps > 56 && this.simCap < MAX_SIMS_HARD && this.sims.length >= this.simCap - 4) this.simCap = Math.min(MAX_SIMS_HARD, this.simCap + 3);
      // over cap: send surplus visitors/residents home through the lift
      if (this.sims.length > this.simCap) { const extra = this.sims.find((s) => s.kind === 'visitor' && !s.leaving) || null; if (extra) extra.leaving = true; }
    }
  }
  release(s) {
    if (s.home) { const i = s.home.residents.indexOf(s); if (i >= 0) s.home.residents.splice(i, 1); const sp = s.home.spots.bed.find((x) => x.taken === s); if (sp) sp.taken = null; }
    this.fire(s); this.names.delete(s.name);
  }
  nearest(x, z, r = 3, filter = null) {
    let best = null, bd = r * r;
    for (const s of this.sims) { if (s.mesh.visible === false || (filter && !filter(s))) continue; const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = s; } }
    return best;
  }
}
