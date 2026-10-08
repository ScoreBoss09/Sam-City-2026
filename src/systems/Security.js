import * as THREE from 'three';
import { Sim } from '../sim/Sim.js';

/**
 * Guards at the Lift and the Service Tunnel. Approaching either gets Sam sedated (dart), except the tunnel
 * during the 02:00-04:00 rotation once Sam has collected all three script pages - that is the escape.
 */
export class Security {
  constructor(game) { this.game = game; this.guards = []; this.darts = []; this.warned = {}; this.cool = 0; }
  init() {
    const g = this.game;
    const mk = (b, lx, lz, name) => {
      const [x, z] = b.toWorld(lx, lz);
      const s = new Sim(g, { name, kind: 'security', x, z, heading: 0, look: { gender: 'm', buildName: 'athletic', body: { sw: 1.14, td: 1.02, hip: 0.97, lt: 1.1, belly: 0 }, h: 1.04, w: 1.04, shirt: 0x24366b, pants: 0x1b2340, hair: 0x111111, skin: 0xe0b48f, hairStyle: 'crop', hat: { type: 'police' }, accessory: 'uniform', glasses: false }, trait: 'busy' });
      s.post = { x, z }; s.zone = b.id; s.activity = 'guard'; g.population.sims.push(s); this.guards.push(s);
    };
    mk(g.tunnel, -4.6, 4.2, 'Gate Guard'); mk(g.tunnel, 4.0, 4.8, 'Gate Guard'); mk(g.lift, -7, g.lift.def.d * 2 + 1.4, 'Lift Guard'); mk(g.lift, 7, g.lift.def.d * 2 + 1.4, 'Lift Guard');
    g.population.names.add('Gate Guard');
  }
  tunnelOnDuty() { const h = this.game.clock.hour; return !(h >= 2 && h < 4); }
  reset() { this.warned = {}; }
  update(dt) {
    const g = this.game, p = g.player;
    // tunnel guards leave their post during rotation
    const duty = this.tunnelOnDuty();
    const show = g.population.count() > 0 || g.flags.guardsOut; for (const s of this.guards) if (s.zone !== 'tunnel') s.hidden = !show;
    for (const s of this.guards) if (s.zone === 'tunnel') { s.hidden = !duty || !show; s.inside = !duty || !show ? g.tunnel : null; if (duty && s.path.length === 0 && !s.engaged && Math.hypot(s.x - s.post.x, s.z - s.post.z) > 0.5) s.goTo({ x: s.post.x, z: s.post.z }); }
    for (const s of this.guards) if (s.zone !== 'tunnel' && !s.engaged && s.path.length === 0 && s.sortied && Math.hypot(s.x - s.post.x, s.z - s.post.z) > 0.5) { s.sortied = false; s.goTo({ x: s.post.x, z: s.post.z }); }
    // darts
    for (const d of this.darts) {
      d.t += dt * 4; d.mesh.position.lerpVectors(d.from, d.to, Math.min(1, d.t));
      if (d.t >= 1) { d.done = true; g.scene.remove(d.mesh); if (d.onHit) d.onHit(); else if (g.player.sedated <= 0) g.player.sedate('dart'); }
    }
    this.darts = this.darts.filter((d) => !d.done);
    if (g.mode !== 'sim' || p.sedated > 0 || g.ending || p.sleeping) return;
    this.cool -= dt;
    for (const b of [g.lift, g.tunnel]) {
      const d = Math.hypot(p.x - b.trigger.x, p.z - b.trigger.z), tun = b.id === 'tunnel';
      const warnR = tun ? 15 : 9, killR = tun ? 4.2 : 5;
      if (d < warnR && !this.warned[b.id]) {
        this.warned[b.id] = true; g.flags.guardsOut = true;
        g.messages.push(tun ? 'Gate Guard' : 'Lift Guard', tun ? 'Restricted area! Turn back, Sam. That corridor is closed.' : 'Staff only beyond this point, Sam. Please step back.', 'warn'); g.ui.toast('RESTRICTED AREA AHEAD');
      }
      if (d > warnR + 5) this.warned[b.id] = false;
      if (tun && d < 3.4 && g.story.clues >= 3 && !this.tunnelOnDuty()) { g.escape(); return; }
      if (d < killR && this.cool <= 0 && !(tun && !this.tunnelOnDuty() && g.story.clues >= 3)) {
        const guard = this.guards.filter((s) => s.zone === b.id && !s.hidden).sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0];
        if (guard) this.fire(guard, p);
        else if (tun) p.sedate('dart');   // off-duty but no pages: automated gate gas
        this.cool = 6;
      }
    }
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
