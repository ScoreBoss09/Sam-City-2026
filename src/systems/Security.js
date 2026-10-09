import * as THREE from 'three';
import { Sim } from '../sim/Sim.js';

/**
 * Two guards at the Supply Lift. Standing on the platform starts a 10-second countdown, then a sedative dart.
 * Between 02:00 and 04:00 the guards change shift and the platform is unwatched: with all three crumpled pages,
 * Sam can ride the Lift down and away. That is the escape.
 */
export class Security {
  constructor(game) { this.game = game; this.guards = []; this.darts = []; this.warned = {}; this.count = {}; this.cool = 0; this.rideT = 0; }
  init() {
    const g = this.game;
    const mk = (b, lx, lz, name) => {
      const [x, z] = b.toWorld(lx, lz);
      const s = new Sim(g, { name, kind: 'security', x, z, heading: 0, look: { gender: 'm', buildName: 'athletic', body: { sw: 1.14, td: 1.02, hip: 0.97, lt: 1.1, belly: 0 }, h: 1.04, w: 1.04, shirt: 0x24366b, pants: 0x1b2340, hair: 0x111111, skin: 0xe8bd9a, hairStyle: 'crop', hat: { type: 'police' }, accessory: 'uniform', glasses: false }, trait: 'busy' });
      s.post = { x, z }; s.zone = b.id; s.activity = 'guard'; g.population.sims.push(s); this.guards.push(s);
    };
    mk(g.lift, -7, g.lift.def.d * 2 + 1.4, 'Lift Guard'); mk(g.lift, 7, g.lift.def.d * 2 + 1.4, 'Lift Guard');
    g.population.names.add('Lift Guard');
  }
  onDuty() { const h = this.game.clock.hour; return !(h >= 2 && h < 4); }
  tunnelOnDuty() { return this.onDuty(); }
  reset() { this.warned = {}; this.count = {}; this.rideT = 0; this.game.ui.setCountdown(null); }
  update(dt) {
    const g = this.game, p = g.player;
    // the guards go off for their shift change between 02:00 and 04:00
    const duty = this.onDuty(), show = (g.population.count() > 0 || g.flags.guardsOut) && duty;
    for (const s of this.guards) { s.hidden = !show; s.inside = show ? null : g.lift; if (show && !s.engaged && s.path.length === 0 && Math.hypot(s.x - s.post.x, s.z - s.post.z) > 0.5) { s.sortied = false; s.goTo({ x: s.post.x, z: s.post.z }); } }
    // darts
    for (const d of this.darts) {
      d.t += dt * 4; d.mesh.position.lerpVectors(d.from, d.to, Math.min(1, d.t));
      if (d.t >= 1) { d.done = true; g.scene.remove(d.mesh); if (d.onHit) d.onHit(); else if (g.player.sedated <= 0) g.player.sedate('dart'); }
    }
    this.darts = this.darts.filter((d) => !d.done);
    if (g.mode !== 'sim' || p.sedated > 0 || g.ending || p.sleeping) { if (Object.values(this.count).some(Boolean)) { this.count = {}; g.ui.setCountdown(null); } return; }
    this.cool -= dt;
    const b = g.lift, d = Math.hypot(p.x - b.trigger.x, p.z - b.trigger.z), warnR = 7;
    if (d < warnR && !this.warned.lift && duty) { this.warned.lift = true; g.flags.guardsOut = true; g.messages.push('Lift Guard', 'Staff only beyond this point, Sam. Please step back.', 'warn'); g.ui.toast('RESTRICTED AREA AHEAD'); }
    if (d > warnR + 5) this.warned.lift = false;
    const onIt = g.buildings.onBuilding(b, p.x, p.z, 0.5);
    if (onIt && !duty && g.story.clues >= 3) {   // the platform is unwatched and Sam knows it: three seconds to step into the cage
      this.rideT += dt / Math.max(1, g.clock.speed); g.ui.setCountdown(Math.max(1, Math.ceil(3 - this.rideT)), 'THE LIFT IS UNGUARDED...'); if (this.rideT >= 3) { g.ui.setCountdown(null); g.escape(); } return;
    }
    this.rideT = 0;
    if (onIt && this.cool <= 0) {
      if (!this.count.lift) { this.count.lift = 10; g.flags.guardsOut = true; g.messages.push('Lift Guard', duty ? 'Off the platform, Sam. You have ten seconds.' : 'Automated warning: platform closed. Ten seconds.', 'alarm'); }
      if (!g.ui.modalOpen) this.count.lift -= dt / Math.max(1, g.clock.speed); g.ui.setCountdown(Math.ceil(this.count.lift), 'GET OFF THE LIFT');
      if (this.count.lift <= 0) {
        this.count.lift = 0; g.ui.setCountdown(null);
        const guard = this.guards.filter((s) => !s.hidden).sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0];
        if (guard) this.fire(guard, p); else p.sedate('dart');   // off-shift: the cage gas does the job
        this.cool = 6;
      }
    } else if (this.count.lift) { this.count.lift = 0; g.ui.setCountdown(null); g.messages.push('Lift Guard', 'Good. Stay clear.', 'warn'); }
  }
  /** Sedative dart at a raider (same visual as the one used on Sam). */
  fireAt(guard, target) {
    const g = this.game, m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), new THREE.MeshBasicMaterial({ color: 0xffee55 }));
    const from = new THREE.Vector3(guard.x, 1.3, guard.z), to = new THREE.Vector3(target.x, 1.2, target.z); m.position.copy(from); m.lookAt(to); g.scene.add(m);
    guard.heading = Math.atan2(target.x - guard.x, target.z - guard.z); guard.fireT = 0.7; this.darts.push({ mesh: m, from, to, t: 0, onHit: () => g.raids.hit(target, 1) });
    if (Math.random() < 0.4) g.social.say(guard, ['Stand down!', 'Sedative round!', 'Drop it!'][Math.floor(Math.random() * 3)], 1.8);
  }
  fire(guard, p) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), new THREE.MeshBasicMaterial({ color: 0xffee55 }));
    const from = new THREE.Vector3(guard.x, 1.3, guard.z), to = new THREE.Vector3(p.x, 1.2, p.z); m.position.copy(from); m.lookAt(to); this.game.scene.add(m);
    guard.heading = Math.atan2(p.x - guard.x, p.z - guard.z); this.darts.push({ mesh: m, from, to, t: 0 });
    this.game.messages.push(guard.name, '"Stand down! Sedative round!"', 'alarm');
  }
}
