import { Sim } from '../sim/Sim.js';
import { GATHER } from '../data/buildings.js';
import { pick } from '../util.js';

const TALK = ['Morning!', 'How\'s things?', 'Lovely day.', 'Busy, busy.', 'Mind how you go.', 'Cup of tea later?', 'Ha! Go on.', 'You don\'t say.'];

/**
 * While you're in the planning view, Sam carries on living: sleeps at night, eats when hungry, works on the top job in the
 * builders' Work queue (fetching materials from the Stockyard first), chops timber or picks berries when stocks are low,
 * and otherwise chats, sits on benches or has a wander. Walking uses the same routes (and doors) as everyone else.
 */
export class Autopilot {
  constructor(game) { this.game = game; this.task = null; this.path = []; this.note = ''; this.t = 0; }
  get p() { return this.game.player; }
  active() { const g = this.game, p = this.p; return g.mode === 'god' && g.started && !g.ending && !g.flags.noAutopilot && !(p.sedated > 0) && !(p.down > 0); }
  stop() { const p = this.p; this.path = []; this.task = null; p.working = false; p.target = null; if (this.chatWith) { this.chatWith.frozen = false; this.chatWith = null; } }
  /** Plan a walk with the townsfolk's own route-finder (in and out through doors). */
  walkTo(dest) {
    const g = this.game, p = this.p, agent = { game: g, x: p.x, z: p.z, inside: g.buildings.buildingAtPoint(p.x, p.z), standUp() {} };
    if (p.seat) p.standUp();
    if (!Sim.prototype.goTo.call(agent, dest)) return false; this.path = agent.path; return true;
  }
  /** Follow the path; returns true when there. */
  step(dt) {
    const p = this.p; if (!this.path.length) { p.speed = 0; return true; }
    const q = this.path[0], dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), v = 4.4, mv = v * dt;
    if (q.door) { const b = q.door; if (Math.hypot(p.x - b.doorPos.x, p.z - b.doorPos.z) < 3) b.doorUseT = 0.8; }
    p.heading += Math.max(-10 * dt, Math.min(10 * dt, Math.atan2(Math.sin(Math.atan2(dx, dz) - p.heading), Math.cos(Math.atan2(dx, dz) - p.heading))));
    if (d <= mv) { p.x = q.x; p.z = q.z; this.path.shift(); } else { p.x += dx / d * mv; p.z += dz / d * mv; }
    p.speed = v; p.moved = true; p.dist = Math.min(d, mv); return !this.path.length;
  }
  update(dt) {
    const g = this.game, p = this.p;
    if (!this.active()) { if (this.on) { this.on = false; this.stop(); } return; }
    if (!this.on) { this.on = true; this.stop(); if (p.sleeping && g.clock.sleepBoost) g.clock.sleepBoost = 0; g.ui.fade(0); }
    p.moved = false; p.working = false; this.t -= dt;
    if ((this.labelT = (this.labelT || 0) - dt) <= 0) { this.labelT = 1; const el = document.getElementById('c-mode'); if (el) el.textContent = this.note ? 'PLANNING · Sam is ' + this.note : 'PLANNING VIEW'; }
    const h = g.clock.hour, night = h >= 21.5 || h < 6;
    // asleep: stay in bed until morning
    if (p.sleeping) { this.note = 'asleep'; if (!night && h >= 6.5) { p.energy = 100; p.wake(); this.task = null; } return; }
    // bedtime or a rumbling belly interrupts whatever Sam was doing
    const t0 = this.task; if (t0 && !t0.done && ((night && t0.kind !== 'sleep') || (p.hunger > 75 && !['eat', 'snack'].includes(t0.kind)))) { t0.done = true; if (p.seat) p.standUp(); if (this.chatWith) { this.chatWith.frozen = false; this.chatWith = null; } this.path = []; }
    if (!this.task || this.task.done) this.task = this.choose(night);
    if (this.task) this.run(this.task, dt);
  }
  // ---------- choosing what to do ----------
  choose(night) {
    const g = this.game, p = this.p, C = g.construction, home = g.starterHome;
    if ((night || p.energy < 22) && home && home.state === 'done' && home.spots.bed[0]) return { kind: 'sleep', b: home };
    if (p.hunger > 55) { if (p.inv.food) return { kind: 'snack' }; const yard = g.depot || g.buildings.list.find((b) => b.state === 'done' && b.def.park === 'camp'); if (yard && g.economy.stock.food >= 0.5) return { kind: 'eat', b: yard }; }
    const learning = (g.story.objective || 0) < 6 && !g.demoMode;   // during the opening steps, leave the jobs for the player to learn
    if (p.invTotal() && !learning) { const site = this.siteFor(); if (site && Object.keys(p.inv).some((m) => g.buildings.missing(site, m) > -(site.reserved[m] || 0) && (site.need[m] || 0) > (site.have[m] || 0))) return { kind: 'deliver', b: site }; if (g.depot) return { kind: 'store', b: g.depot }; }
    if (!learning && g.clock.hour >= 7 && g.clock.hour < 18) {
      const site = this.siteFor();
      if (site && C.workable(site) && p.tools.has('hammer')) return { kind: 'build', b: site };
      if (site && g.depot && Object.keys(site.need).some((m) => g.buildings.missing(site, m) > 0 && g.economy.stock[m] >= 1)) return { kind: 'fetch', b: g.depot, site };
      const plan = p.tools.has('shovel') && [...g.roadPlans.plans.values()].find((q) => !q.reserved); if (plan) return { kind: 'dig', plan };
      const e = g.economy.stock; if (p.tools.has('axe') && e.timber < 20 && Math.random() < 0.7) return { kind: 'gather', role: 'lumberjack' };
      if (p.tools.has('basket') && e.food < 15) return { kind: 'gather', role: 'forager' };
    }
    const r = Math.random(), sims = g.population.sims.filter((s) => s.kind === 'resident' && s.mesh && !s.inside && !s.chat && !s.sitting && !s.job && s.activity === 'leisure' && !s.frozen && Math.hypot(s.x - p.x, s.z - p.z) < 40);
    if (r < 0.35 && sims.length) return { kind: 'chat', s: pick(sims) };
    if (r < 0.6 && g.clock.hour >= 8 && g.clock.hour < 17) { const wps = g.buildings.list.filter((b) => b.state === 'done' && b.def.jobs && b.id !== 'contractor' && !GATHER[Object.keys(b.def.jobs)[0]] && b.spots.work.length && b.workers.length < Object.values(b.def.jobs).reduce((a, n) => a + n, 0)); if (wps.length) { const b = pick(wps); return { kind: 'shift', b, spot: b.spots.work[b.spots.work.length - 1], role: Object.keys(b.def.jobs)[0] }; } }
    const seats = g.buildings.list.filter((b) => b.state === 'done' && b.def.park && b.spots.seat && b.spots.seat.some((q) => !q.taken));
    if (r < 0.75 && seats.length) { const b = pick(seats); return { kind: 'sit', b, seat: b.spots.seat.find((q) => !q.taken) }; }
    return { kind: 'wander' };
  }
  siteFor() { const f = this.game.construction.queue().find((q) => q.kind !== 'roads'); return f ? f.s : null; }
  // ---------- doing it ----------
  run(t, dt) {
    const g = this.game, p = this.p, B = g.buildings;
    if (!t.started) { t.started = true; t.time = 0; if (!this.plan(t)) { t.done = true; this.path = []; return; } }
    t.time += dt; if (t.time > 120) { t.done = true; return; }   // never get stuck on one thing
    if (!this.step(dt)) return;
    switch (t.kind) {
      case 'sleep': { const s = t.b.spots.bed[0]; p.sleeping = true; p.sleepSpot = s; p.x = s.x; p.z = s.z; p.heading = s.rotY; this.note = 'asleep'; t.done = true; break; }
      case 'snack': p.invTake('food', 1); p.hunger = Math.max(0, p.hunger - 35); t.done = true; break;
      case 'eat': if (g.economy.stock.food >= 0.5) { g.economy.stock.food -= 0.5; p.hunger = Math.max(0, p.hunger - 55); } t.done = true; break;
      case 'tool': if (!t.it.taken) { g.tools.take(t.it); p.tools.add(t.it.id); } t.done = true; break;
      case 'store': for (const [m, n] of Object.entries(p.inv)) g.economy.add(m, n); p.inv = {}; t.done = true; break;
      case 'deliver': for (const [m, n] of Object.entries(p.inv)) { const k = Math.min(n, Math.max(0, (t.b.need[m] || 0) - (t.b.have[m] || 0))); if (k > 0 && t.b.state === 'site') { p.invTake(m, k); B.deliver(t.b, m, k); } } t.done = true; break;
      case 'fetch': { const s = t.site; for (const m of Object.keys(s.need)) { const k = Math.min(B.missing(s, m), Math.floor(g.economy.stock[m] || 0), p.invRoom()); if (k > 0) { g.economy.stock[m] -= k; p.invAdd(m, k); } } t.done = true; break; }
      case 'build': {
        const s = t.b; if (s.state !== 'site' || !g.construction.workable(s)) { t.done = true; break; }
        p.working = true; p.target = { kind: 'site', b: s }; p.heading = Math.atan2(s.cx - p.x, s.cz - p.z); B.addWork(s, dt * 0.9 * g.skills.bonus('build')); if (Math.random() < dt * 0.5) g.skills.gain('build', 1);
        this.note = 'building the ' + s.def.name; if (t.time > 40) t.done = true; break;
      }
      case 'dig': { const q = t.plan; if (!g.roadPlans.has(q.x, q.z)) { t.done = true; break; } p.working = true; p.target = { kind: 'road', plan: q }; if (g.roadPlans.work(q, dt * 0.9)) t.done = true; this.note = 'digging a path'; break; }
      case 'gather': {
        const n = t.node; if (!n || (n.kind === 'tree' ? !n.alive : (!n.infinite && n.amount < 1)) || p.invRoom() <= 0) { if (n && n.reserved === p) n.reserved = null; t.done = true; break; }
        const gd = GATHER[t.role]; p.working = true; p.target = { kind: 'gather', upper: gd.upper }; p.heading = Math.atan2(n.x - p.x, n.z - p.z); t.acc = (t.acc || 0) + dt;
        if (t.acc >= gd.time) { t.acc = 0; if (n.kind === 'tree') g.terrain.hitTree(n); if (g.resources.take(n)) { p.invAdd(gd.mat, gd.per); g.skills.gain(t.role === 'lumberjack' ? 'chop' : 'harvest', 1); } }
        this.note = t.role === 'lumberjack' ? 'chopping timber' : 'picking berries'; if (p.invTotal() >= 8) t.done = true; break;
      }
      case 'chat': {
        const s = t.s; if (s.remove || Math.hypot(s.x - p.x, s.z - p.z) > 3.5) { t.done = true; break; }
        if (!this.chatWith) { this.chatWith = s; s.frozen = true; s.path = []; s.faceGoal = Math.atan2(p.x - s.x, p.z - s.z); t.talk = 0; t.turn = 0; }
        p.heading = Math.atan2(s.x - p.x, s.z - p.z); t.turn -= dt; this.note = 'chatting with ' + (s.first || s.name);
        if (t.turn <= 0) { t.turn = 2.2; const who = t.talk++ % 2 ? s : null; if (who) g.social.say(s, pick(TALK), 2); else p.emote && p.emote(pick(['wave', 'shrug', 'think'])); }
        if (t.time > 14) { s.frozen = false; s.samRel = Math.min(100, (s.samRel || 0) + 2); s.moodBoost += 0.05; this.chatWith = null; t.done = true; }
        break;
      }
      case 'shift': p.working = true; p.target = { kind: 'work', role: t.role }; g.economy.earn(12 * dt / Math.max(1, g.clock.speed)); this.note = `working a shift at the ${t.b.def.name}`; if (t.time > 45) t.done = true; break;
      case 'sit': if (!t.sat) { if (t.seat.taken) { t.done = true; break; } p.sitOn(t.seat, t.b); t.sat = true; } p.energy = Math.min(100, p.energy + dt * 3); this.note = 'sitting on a bench'; if (t.time > 25) { p.standUp(); t.done = true; } break;
      default: t.done = true;
    }
  }
  /** Work out where to walk for a task (false = can't do it). */
  plan(t) {
    const g = this.game, p = this.p, R = g.resources, C = g.construction;
    this.note = { sleep: 'going home to bed', snack: 'having a snack', eat: 'off for something to eat', tool: 'fetching a tool', store: 'dropping things at the Stockyard', deliver: 'delivering materials', fetch: 'fetching materials', build: 'off to build', dig: 'off to dig a path', gather: 'off to gather', chat: 'having a natter', shift: 'off to work a shift', sit: 'off for a sit down', wander: 'having a wander' }[t.kind] || '';
    switch (t.kind) {
      case 'sleep': { const s = t.b.spots.bed[0]; return this.walkTo({ b: t.b, x: s.ax, z: s.az }); }
      case 'snack': this.path = []; return true;
      case 'eat': case 'store': case 'fetch': { const b = t.b; return this.walkTo({ x: b.doorOut.x, z: b.doorOut.z }); }
      case 'tool': return this.walkTo({ x: t.it.x + 0.8, z: t.it.z + 0.8 });
      case 'deliver': case 'build': { const q = C.perimeterPoint(t.b, p); return this.walkTo({ x: q.x, z: q.z }); }
      case 'dig': return this.walkTo({ x: t.plan.cx + 0.6, z: t.plan.cz + 0.6 });
      case 'gather': { const gd = GATHER[t.role], n = R.findNode(gd.node, (g.depot || p).cx ?? p.x, (g.depot || p).cz ?? p.z, p), st = n && R.standPoint(n, p); if (!st) return false; t.node = n; if (!n.infinite) n.reserved = p; return this.walkTo({ x: st.x, z: st.z }); }
      case 'chat': { const s = t.s; return this.walkTo({ x: s.x + 1.2, z: s.z + 0.4 }); }
      case 'sit': return this.walkTo({ x: t.seat.x, z: t.seat.z });
      case 'shift': return this.walkTo({ b: t.b, x: t.spot.x, z: t.spot.z });
      case 'wander': { const w = g.world, home = g.starterHome || g.lift; const [hx, hz] = w.tileOf(home.cx, home.cz); for (let k = 0; k < 8; k++) { const tx = hx + Math.floor((Math.random() - 0.5) * 10), tz = hz + Math.floor((Math.random() - 0.5) * 10); if (w.inBounds(tx, tz) && w.road[w.idx(tx, tz)]) { const [x, z] = w.center(tx, tz); t.time = 100; return this.walkTo({ x, z }); } } return false; }
    }
    return false;
  }
}
