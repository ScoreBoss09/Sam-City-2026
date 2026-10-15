import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { stdMat } from '../render/BuildingFactory.js';
import { pick } from '../util.js';
import { makeHorseCart, makeCarMesh, carLights } from '../render/Vehicles.js';

const COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0xecf0f1, 0x27ae60, 0x7f8c8d, 0xe67e22, 0x8e44ad, 0x1a1a1a, 0x16a085];

/** Ambient cars that cruise the road network (pure atmosphere). */
export class Traffic {
  constructor(game) { this.game = game; this.cars = []; this.timer = 2; }
  setNight(n) { carLights(n); }
  makeCar() { return makeCarMesh(pick(COLORS), Math.random() < 0.25); }
  pickRoute(car) {
    const w = this.game.world, roads = []; for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) if (w.drive(w.idx(x, z))) roads.push([x, z]);
    if (roads.length < 6) return null; const sx = Math.floor(car.x / TILE), sz = Math.floor(car.z / TILE);
    for (let k = 0; k < 6; k++) { const t = pick(roads); if (Math.abs(t[0] - sx) + Math.abs(t[1] - sz) < 8) continue; const path = w.findPath(sx, sz, t[0], t[1], true); if (path && path.length > 1) return path.slice(1).map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })); }
    return null;
  }
  /** Late at night, now and then, somebody drives home from the pub who shouldn't. The police pull them over; without police, someone gets hurt. */
  drunkCheck(dt) {
    const g = this.game, h = g.clock.hour; this.dT = (this.dT ?? 30) - dt; if (this.dT > 0) return; this.dT = 20 + Math.random() * 30;
    const live = this.cars.find((c) => c.drunk > 0);
    if (live) {
      const cop = g.crime && g.crime.cops().find((s) => Math.hypot(s.x - live.x, s.z - live.z) < 22);
      if (cop) { live.pulled = 25; g.social.say(cop, pick(['Evening, sir. Been drinking, have we?', 'Step out of the vehicle, please.', 'Blow into this for me.']), 3); g.messages.push('Police', `A drunk driver has been pulled over and breathalysed. ${cop.first} is not amused.`); if (g.markers) g.markers.add(live.x, live.z, '🚔', 'Drunk driver stopped', 40); return; }
      const v = g.population.sims.find((s) => !s.inside && !(s.down > 0) && s.mesh.visible && Math.hypot(s.x - live.x, s.z - live.z) < 3);
      if (v && Math.random() < 0.5) { v.knockDown(6, true); live.drunk = 0; g.messages.push('Police', `Hit and run! ${v.first} was clipped by a car weaving all over the road. ${g.crime && g.crime.cops().length ? '' : 'There are no police to catch the driver.'}`, 'warn'); if (g.markers) g.markers.add(v.x, v.z, '🚑', 'Hit and run', 60); }
      return;
    }
    const pubs = g.buildings.list.some((b) => b.state === 'done' && (b.id === 'tavern' || b.id === 'local' || b.id === 'irish' || b.id === 'nightclub' || b.id === 'wmc'));
    if (pubs && (h >= 22.5 || h < 2) && Math.random() < 0.25) { const c = pick(this.cars.filter((q) => !q.horse && q.path.length)); if (c) c.drunk = 45; }
  }
  update(dt) {
    const g = this.game, w = g.world; this.timer -= dt;
    // horse-drawn carts on any road once there's a Carter's Yard; motor cars on paved roads once the power is on (and fewer horses)
    const paved = w.road.reduce((a, v) => a + (v === 2 ? 1 : 0), 0), anyRoad = w.road.reduce((a, v) => a + (v ? 1 : 0), 0), power = !(g.tech && g.tech.era < 1);
    const yards = g.buildings.list.filter((b) => b.id === 'stables' && b.state === 'done'), horses = yards.reduce((a, b) => a + 3 * (b.def.carts || 1), 0);
    const wantH = Math.min(power ? 2 : 10, horses, Math.floor(anyRoad / 5)), wantC = power ? Math.min(g.buildings.count('garage') ? 14 : 3, Math.floor(paved / 8)) : 0;
    const nH = this.cars.filter((c) => c.horse).length, nC = this.cars.length - nH, needH = nH < wantH, want = needH || nC < wantC;
    if (this.timer <= 0 && want && g.population.sims.length < g.population.simCap + 20) {
      this.timer = 3; const lift = g.lift, y = needH ? yards[Math.floor(Math.random() * yards.length)] : null, at = y ? y.doorOut : lift.doorOut;
      const mesh = needH ? makeHorseCart(pick([0x6b4a2a, 0x3a2a1a, 0x9a7a5a, 0xe8e2d8])) : this.makeCar(); const car = { id: (this.nextId = (this.nextId || 0) + 1), mesh, horse: needH, x: at.x, z: at.z + (needH ? 0 : 2), h: 0, v: 0, path: [], max: needH ? 2.2 + Math.random() * 0.8 : 5.5 + Math.random() * 3 };
      mesh.position.set(car.x, 0, car.z); g.scene.add(mesh); this.cars.push(car);
    }
    this.drunkCheck(dt);
    for (const c of this.cars) {
      if (c.pulled > 0) { c.pulled -= dt; c.v = 0; if (c.pulled <= 0) c.drunk = 0; continue; }   // pulled over: blue lights and a breathalyser
      if (!c.path.length) { c.wait = (c.wait || 0) - dt; if (c.wait <= 0) { c.path = this.pickRoute(c) || []; c.wait = 1 + Math.random() * 2; } c.v = Math.max(0, c.v - 8 * dt); }
      else {
        const p = c.path[0]; let dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz), nx = c.path[1];
        // keep to the left-hand lane (this is England)
        const sx = dx / (d || 1), sz = dz / (d || 1), tx = p.x + sz * 1.3, tz = p.z - sx * 1.3; dx = tx - c.x; dz = tz - c.z;
        const want = Math.atan2(dx, dz); let dh = want - c.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); c.h += Math.max(-3 * dt, Math.min(3 * dt, dh));
        if (c.drunk > 0) { c.drunk -= dt; c.h += Math.sin(g.elapsed * 1.9 + c.id) * 1.6 * dt; }   // weaving all over the road
        const target = Math.abs(dh) > 0.6 ? 2 : c.max * (c.drunk > 0 ? 1.4 : 1); c.v += Math.max(-10 * dt, Math.min(5 * dt, target - c.v));
        // yield to other cars ahead
        // (only to traffic in our own lane: oncoming carts in the other lane just pass. Head-on in one lane, e.g. on a
        // junction, the newer vehicle gives way; anything held up for a few seconds creeps on through rather than locking up)
        c.pushT = Math.max(0, (c.pushT || 0) - dt);
        if (!c.pushT) for (const o of this.cars) {
          if (o === c) continue; const ox = o.x - c.x, oz = o.z - c.z, dd = Math.hypot(ox, oz); if (dd > 6) continue;
          const fwd = ox * Math.sin(c.h) + oz * Math.cos(c.h), lat = Math.abs(ox * Math.cos(c.h) - oz * Math.sin(c.h)), same = Math.cos(o.h - c.h) > 0.2;
          if (fwd < 0.5 || lat > (same ? 1.4 : 1.0) || (!same && c.id < o.id)) continue;
          c.v = Math.min(c.v, Math.max(0, dd - (c.horse || o.horse ? 4 : 3)) * 1.5);
        }
        if (c.v < 0.25) { c.stuckT = (c.stuckT || 0) + dt; if (c.stuckT > 3) { c.stuckT = 0; c.pushT = 2.5; } } else c.stuckT = 0;
        c.x += Math.sin(c.h) * c.v * dt; c.z += Math.cos(c.h) * c.v * dt; if (d < 2.2) c.path.shift();
      }
      if (c.horse) { const k = performance.now() / 1000 * (1 + c.v * 2); for (const [i, l] of c.mesh.userData.legs.entries()) l.rotation.x = Math.sin(k + i * 1.6) * Math.min(0.5, c.v * 0.3); for (const [wh, r] of c.mesh.userData.wheels) wh.rotation.x += c.v * dt / r; }
      c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; c.mesh.visible = !(g.mode === 'god' && false);
    }
  }
}
