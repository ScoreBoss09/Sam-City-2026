import * as THREE from 'three';
import { TILE, MAP } from '../config.js';
import { stdMat } from '../render/BuildingFactory.js';
import { pick } from '../util.js';

const COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0xecf0f1, 0x27ae60, 0x7f8c8d, 0xe67e22, 0x8e44ad, 0x1a1a1a, 0x16a085];
const headMat = new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffeeaa, emissiveIntensity: 0 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x990000, emissive: 0xff2200, emissiveIntensity: 0 });

/** Ambient cars that cruise the road network (pure atmosphere). */
export class Traffic {
  constructor(game) { this.game = game; this.cars = []; this.timer = 2; }
  setNight(n) { headMat.emissiveIntensity = n * 1.8; tailMat.emissiveIntensity = n * 1.2; }
  makeCar() {
    const g = new THREE.Group(), col = pick(COLORS), add = (w, h, d, c, x, y, z, m) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || stdMat(c)); k.position.set(x, y, z); k.castShadow = true; g.add(k); return k; };
    const van = Math.random() < 0.25;
    add(1.7, 0.6, 3.8, col, 0, 0.65, 0); add(1.5, 0.55, van ? 2.6 : 1.9, col === 0x1a1a1a ? 0x2a2a2a : col, 0, 1.2, van ? -0.4 : -0.2); add(1.4, 0.38, 0.05, 0x9fd8f0, 0, 1.25, van ? 0.92 : 0.78); add(1.4, 0.3, 0.05, 0x9fd8f0, 0, 1.25, van ? -1.7 : -1.15);
    for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) add(0.25, 0.6, 0.6, 0x111111, x, 0.3, z);
    add(0.3, 0.14, 0.05, 0, -0.55, 0.7, 1.92, headMat); add(0.3, 0.14, 0.05, 0, 0.55, 0.7, 1.92, headMat); add(0.3, 0.14, 0.05, 0, -0.55, 0.7, -1.92, tailMat); add(0.3, 0.14, 0.05, 0, 0.55, 0.7, -1.92, tailMat);
    return g;
  }
  pickRoute(car) {
    const w = this.game.world, roads = []; for (let z = 0; z < MAP; z++) for (let x = 0; x < MAP; x++) if (w.road[w.idx(x, z)]) roads.push([x, z]);
    if (roads.length < 6) return null; const sx = Math.floor(car.x / TILE), sz = Math.floor(car.z / TILE);
    for (let k = 0; k < 6; k++) { const t = pick(roads); if (Math.abs(t[0] - sx) + Math.abs(t[1] - sz) < 8) continue; const path = w.findPath(sx, sz, t[0], t[1], true); if (path && path.length > 1) return path.slice(1).map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })); }
    return null;
  }
  update(dt) {
    const g = this.game, w = g.world; this.timer -= dt;
    const roads = w.road.reduce((a, v) => a + v, 0), want = Math.min(14, Math.floor(roads / 14));
    if (this.timer <= 0 && this.cars.length < want && g.population.sims.length < g.population.simCap + 20) {
      this.timer = 3; const lift = g.lift; const mesh = this.makeCar(); const car = { mesh, x: lift.doorOut.x, z: lift.doorOut.z + 2, h: 0, v: 0, path: [], max: 5.5 + Math.random() * 3 };
      mesh.position.set(car.x, 0, car.z); g.scene.add(mesh); this.cars.push(car);
    }
    for (const c of this.cars) {
      if (!c.path.length) { c.wait = (c.wait || 0) - dt; if (c.wait <= 0) { c.path = this.pickRoute(c) || []; c.wait = 1 + Math.random() * 2; } c.v = Math.max(0, c.v - 8 * dt); }
      else {
        const p = c.path[0]; let dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz), nx = c.path[1];
        // keep to the right-hand lane
        const sx = dx / (d || 1), sz = dz / (d || 1), tx = p.x + sz * 1.0, tz = p.z - sx * 1.0; dx = tx - c.x; dz = tz - c.z;
        const want = Math.atan2(dx, dz); let dh = want - c.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); c.h += Math.max(-3 * dt, Math.min(3 * dt, dh));
        const target = Math.abs(dh) > 0.6 ? 2 : c.max; c.v += Math.max(-10 * dt, Math.min(5 * dt, target - c.v));
        // yield to other cars ahead
        for (const o of this.cars) { if (o === c) continue; const ox = o.x - c.x, oz = o.z - c.z, dd = Math.hypot(ox, oz); if (dd < 5 && (ox * Math.sin(c.h) + oz * Math.cos(c.h)) / dd > 0.7) c.v = Math.min(c.v, Math.max(0, dd - 3) * 1.5); }
        c.x += Math.sin(c.h) * c.v * dt; c.z += Math.cos(c.h) * c.v * dt; if (d < 2.2) c.path.shift();
      }
      c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; c.mesh.visible = !(g.mode === 'god' && false);
    }
  }
}
