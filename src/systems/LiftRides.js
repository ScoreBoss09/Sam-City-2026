import { TILE } from '../config.js';
import { Sfx } from '../core/Sfx.js';

const CAGE = [[-1.4, -0.7], [0, -0.7], [1.4, -0.7], [-1.4, 0.6], [0, 0.6], [1.4, 0.6], [-1.4, 1.8], [0, 1.8], [1.4, 1.8]];

/**
 * People come and go by the Lift: newcomers ride up out of the shaft, leavers queue at the edge, step into the cage and
 * sink out of sight. The cage won't go down with Sam on the platform (and the guards' ten-second countdown does the rest).
 */
export class LiftRides {
  constructor(game) { this.game = game; this.waiting = []; this.arrivals = []; this.ride = null; }
  get lift() { return this.game.lift; }
  ok() { const L = this.lift; return !!(L && L.ext && L.ext.call); }
  spot(lx, lz) { const [x, z] = this.lift.toWorld(lx, lz); return { x, z }; }
  waitSpot(i) { const p = this.spot(-2.4 + (i % 5) * 1.2, 4.5 + Math.floor(i / 5) * 1.0); p.face = this.lift.rot * Math.PI / 2 + Math.PI; return p; }
  cageSpot(i) { const [lx, lz] = CAGE[i % CAGE.length]; return this.spot(lx, 0.5 + lz); }
  playerOnPlatform() { const b = this.lift, p = this.game.player; return p.x > b.x0 * TILE - 0.5 && p.x < (b.x0 + b.w) * TILE + 0.5 && p.z > b.z0 * TILE - 0.5 && p.z < (b.z0 + b.d) * TILE + 0.5; }
  join(s) { if (!this.waiting.includes(s)) { this.waiting.push(s); s.waitIdx = this.waiting.length - 1; } return this.waitSpot(s.waitIdx); }
  /** A newcomer: put them in the cage below ground, to come up with the next ride. */
  arrive(s) { if (!this.ok()) return; const sp = this.cageSpot(this.arrivals.length); s.x = sp.x; s.z = sp.z; s.inside = null; s.riding = true; s.rideY = -4.2; s.heading = this.lift.rot * Math.PI / 2; this.arrivals.push(s); }
  update(dt) {
    if (!this.ok()) return; const g = this.game, e = this.lift.ext;
    this.waiting = this.waiting.filter((s) => !s.remove && s.activity === 'leave' && !s.riding);
    this.waiting.forEach((s, i) => { s.waitIdx = i; });
    const r = this.ride;
    if (!r) {
      if (e.busy()) return;
      const ready = this.waiting.filter((s) => s.atLift); for (const s of ready) s.readyT = (s.readyT || 0) + dt;
      // hold on a few seconds for anyone else still walking up, so people travel together
      if (!this.arrivals.length && (!ready.length || (ready.length < this.waiting.length && Math.max(...ready.map((s) => s.readyT)) < 8))) return;
      const pass = ready.slice(0, 9), up = this.arrivals.splice(0, 9);
      this.ride = { pass, up, st: 'rising', t: 0 }; for (const s of pass) { s.boarding = true; }
      e.call(() => { if (this.ride) this.ride.st = 'open'; }, true);
      if (g.mode === 'sim' && Math.hypot(g.player.x - this.lift.cx, g.player.z - this.lift.cz) < 40) Sfx.play('lift');
      return;
    }
    r.t += dt; const y = e.cageY();
    for (const s of r.up) if (s.riding) s.rideY = y;
    if (r.st === 'open' && !r.opened) {
      r.opened = true; r.t = 0;
      for (const s of r.up) { s.riding = false; s.rideY = 0; s.phase = 0; s.timer = 0; }   // step off and get on with life
      r.pass.forEach((s, i) => { const c = this.cageSpot(i); s.path = []; s.riding = true; s.glide = { x: c.x, z: c.z }; s.faceGoal = this.lift.rot * Math.PI / 2; });
    }
    if (r.st === 'open' && r.t > 2.6) {
      if (this.playerOnPlatform()) { if (!r.warned) { r.warned = true; g.messages.push('Lift Guard', 'The lift won\'t go down with you on it, Sam. Off you get.', 'warn'); } return; }
      if (!r.pass.length || e.release(() => { for (const s of r.pass) s.remove = true; if (r.pass.length) g.messages.push('Lift', `${r.pass.map((s) => s.first || s.name).join(', ')} went down in the Lift.`); this.ride = null; })) { r.st = 'sinking'; if (!r.pass.length) { e.release(() => {}); this.ride = null; } }
    }
    if (r.st === 'sinking') for (const s of r.pass) s.rideY = y;
  }
}
