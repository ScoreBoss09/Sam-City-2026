import { pick } from '../util.js';

// The night crew. Once a week (Wednesday night: weekday 2, as day 0 is a Monday), while Sam is asleep, a crew comes out of the Lift and quietly puts the
// island back: saplings where trees were felled, fresh rocks and berry bushes where they were used up. If Sam is awake
// that night, they wait until the first night he sleeps. They're only ever seen from the planning view (a sleeping Sam
// sees nothing). Stumps more than two days old are cleared on any night Sam sleeps.
export class Groundskeepers {
  constructor(game) { this.game = game; this.crew = []; this.jobs = []; game.terrain.game = game; game.clock.on('day', () => { game.terrain.today = game.clock.totalDays; if (game.clock.weekday === 2) game.flags.replantDue = true; }); }
  update(dt) {
    const g = this.game, c = g.clock, P = g.player; if (!g.started || g.netVisitor) return;
    const night = c.hour >= 0.5 && c.hour < 4.5, asleep = P.sleeping;
    if (night && asleep && c.totalDays !== this.stumpDay) { this.stumpDay = c.totalDays; g.terrain.clearStumps(c.totalDays - 2); }
    if (night && asleep && g.flags.replantDue && !this.crew.length) { g.flags.replantDue = false; this.start(); }
    if (this.crew.length) this.work(dt * Math.max(0.25, Math.min(8, c.scale || c.speed)));
  }
  /** Everything that needs putting back. */
  todo() {
    const g = this.game, out = [];
    for (const t of g.terrain.trees) if (!t.alive && !t.removed && out.length < 60) out.push({ x: t.x, z: t.z, fn: () => g.terrain.regrow(t) });
    for (const n of g.resources.nodes) if ((n.kind === 'rock' || n.kind === 'berry') && n.amount < n.max * 0.5 && n.mesh) out.push({ x: n.x, z: n.z, fn: () => { n.amount = n.max; n.mesh.visible = true; g.resources.visual(n); g.resources.batchDirty = true; } });
    return out;
  }
  start() {
    const g = this.game, list = this.todo(); if (!list.length) return;
    // asleep in the planning view? the crew walk it. Otherwise (Sam asleep in bed, the screen dark) it's just done by morning.
    if (g.mode !== 'god') { for (const j of list) j.fn(); return; }
    const n = Math.min(4, Math.ceil(list.length / 6)), at = g.lift.doorOut;
    for (let i = 0; i < n; i++) { const P = g.population.makePerson({ kind: 'visitor', gender: 'm' }); const s = g.population.spawnAt(at.x + i, at.z + 1, { name: 'Groundsman', first: 'Groundsman', surname: '', kind: 'guest', trait: 'busy', look: { ...P.look, shirt: 0x4a5a3a, pants: 0x3a3a34, accessory: 'overalls', hat: { type: 'flat', color: 0x3a3a34 } }, gender: 'm', age: 45 }); s.hurry = true; this.crew.push(s); }
    list.sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z));
    this.jobs = this.crew.map(() => []); list.forEach((j, i) => this.jobs[i % this.crew.length].push(j));
  }
  work(dt) {
    const g = this.game, at = g.lift.doorOut;
    this.crew.forEach((s, i) => {
      const q = this.jobs[i], j = q[0];
      if (!j) { if (!s.leaving) g.population.depart(s); return; }   // done: back down the Lift (in the cage, like everyone)
      if (Math.hypot(s.x - j.x, s.z - j.z) < 1.8) { s.digWork = (s.digWork || 0) + dt; s.digging = true; if (s.digWork > 2.5) { s.digWork = 0; s.digging = false; j.fn(); q.shift(); g.particles.burst(j.x, 0.3, j.z, 0x6a5a3a, 6, 0.6, 0.4, 0.06); } }
      else if (!s.path.length || (s.re = (s.re || 0) - dt) <= 0) { s.re = 4; if (!s.goTo({ x: j.x, z: j.z })) q.shift(); }
    });
    this.crew = this.crew.filter((s) => !s.remove);
    if (!this.crew.length) { this.jobs = []; void pick; }
  }
}
