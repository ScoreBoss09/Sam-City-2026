import { makeCarMesh } from '../render/Vehicles.js';
import { TILE } from '../config.js';
import { pick } from '../util.js';

// The townsfolk's own cars (once the power's on, there are paved roads and there's a garage in town). Each one belongs
// to a household and lives parked at the kerb outside the house. A worker with a long way to go walks out to it, drives
// to work and parks (in a multi-storey Car Park if there's one nearby, otherwise at the kerb), and drives home again at
// the end of the day. Cars never vanish: they stay wherever they were last parked, including wherever Sam leaves one.
const COLORS = [0xc0392b, 0x2980b9, 0xf1c40f, 0xecf0f1, 0x27ae60, 0x7f8c8d, 0xe67e22, 0x8e44ad, 0x1a1a1a, 0x16a085, 0x6a1a2a, 0x2a3a5a];

export class Cars {
  constructor(game) { this.game = game; this.list = []; this.t = 0; this.used = new Set(); }
  get enabled() { const g = this.game; return g.tech && g.tech.era >= 1 && g.buildings.count('garage') > 0; }
  update(dt) {
    const g = this.game; if (!g.started && !g.demoMode) return; dt *= Math.max(0, Math.min(4, g.clock.speed)); this.t -= dt;
    if (this.t <= 0) { this.t = 1; this.assign(); this.commute(); }
    for (const c of this.list) this.drive(c, dt);
    // Sam at the wheel: anyone in the way gets knocked flying (and the police won't like it)
    const P = g.player; if (P.mounted && P.car && !P.car.parked && P.speed > 5) for (const s of g.population.sims) { if (s.down > 0 || s.riding || s.hidden || !s.mesh.visible || s.kind === 'security') continue; if (Math.hypot(s.x - P.x, s.z - P.z) < 1.3) { s.knockDown(5, P.speed > 9); g.social.say(s, pick(['ARGH!', 'Watch where you\'re going!', 'Maniac!']), 2); const seen = g.crime && g.crime.cops().some((q) => Math.hypot(q.x - P.x, q.z - P.z) < 30); if (seen) g.crime.wanted = Math.min(5, g.crime.wanted + 1); } }
  }
  // ---------- owning and parking ----------
  /** One car per household with somebody in work (fewer if the town is struggling for frame rate). */
  assign() {
    const g = this.game; if (!this.enabled) return; const cap = Math.min(60, Math.round(g.population.simCap * 0.4));
    for (const c of this.list) if (c.home && (c.home.state !== 'done' || !g.buildings.list.includes(c.home))) c.home = null;   // the house is gone: the car stays where it is, unowned
    if (this.list.length >= cap) return;
    const homes = g.buildings.list.filter((b) => b.state === 'done' && b.def.beds && b !== g.starterHome && b.residents.some((s) => s.workplace) && !this.list.some((c) => c.home === b));
    const b = homes[0]; if (!b) return; const spot = this.kerb(b); if (!spot) return;
    const col = pick(COLORS), c = { id: this.list.length + 1, color: col, home: b, mesh: makeCarMesh(col, Math.random() < 0.15), x: spot.x, z: spot.z, h: spot.h, v: 0, state: 'parked', spot, path: [], at: 'home', y: 0 };
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; g.scene.add(c.mesh); this.list.push(c);
  }
  /** A parking space at the kerb on the nearest road to a building (two spaces per side of each road square). */
  kerb(b) {
    const w = this.game.world, [tx0, tz0] = w.tileOf(b.doorOut.x, b.doorOut.z); let best = null, bd = 1e9;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const tx = tx0 + dx, tz = tz0 + dz; if (!w.inBounds(tx, tz) || !w.road[w.idx(tx, tz)]) continue;
      const cx = (tx + 0.5) * TILE, cz = (tz + 0.5) * TILE, alongX = (w.inBounds(tx - 1, tz) && w.road[w.idx(tx - 1, tz)]) || (w.inBounds(tx + 1, tz) && w.road[w.idx(tx + 1, tz)]);
      for (const side of [-1, 1]) for (const k of [-1, 1]) {
        const x = alongX ? cx + k * 2.1 : cx + side * 2.9, z = alongX ? cz + side * 2.9 : cz + k * 2.1, key = Math.round(x) + ',' + Math.round(z); if (this.used.has(key)) continue;
        const d = Math.hypot(x - b.doorOut.x, z - b.doorOut.z); if (d < bd) { bd = d; best = { x, z, h: alongX ? (k > 0 ? Math.PI / 2 : -Math.PI / 2) : (k > 0 ? 0 : Math.PI), key }; }
      }
    }
    if (best) this.used.add(best.key); return best;
  }
  free(spot) { if (spot && spot.key) this.used.delete(spot.key); }
  /** A space in a multi-storey car park near a building, if there is one. */
  carPark(b) {
    const g = this.game; for (const p of g.buildings.list) { if (p.id !== 'carpark' || p.state !== 'done' || Math.hypot(p.cx - b.cx, p.cz - b.cz) > 70) continue;
      const S = (p.ext && p.ext.spaces) || []; for (let i = 0; i < S.length; i++) { const key = 'cp' + p.uid + ':' + i; if (this.used.has(key)) continue; this.used.add(key); const [x, z] = p.toWorld(S[i].x, S[i].z); return { x, z, y: S[i].y, h: p.rot * Math.PI / 2 + S[i].h, key, entry: p.doorOut }; } }
    return null;
  }
  // ---------- commuting ----------
  commute() {
    const g = this.game;
    for (const c of this.list) {
      if (c.state !== 'parked' || c.trip || c.taken || !c.home) continue;
      const drivers = c.home.residents.filter((s) => s.workplace && s.kind === 'resident' && !s.remove && !s.leaving && !(s.drunk > 0.8 && Math.random() < 0.5));
      for (const s of drivers) {
        const far = Math.hypot(s.workplace.cx - c.home.cx, s.workplace.cz - c.home.cz) > 55;
        if (!far) continue;
        if (c.at === 'home' && s.activity === 'work' && s.phase === 1 && !s.inside) { this.start(c, s, s.workplace); break; }
        if (c.at === 'work' && c.driver === s && (s.activity === 'home' || s.activity === 'sleep') && !s.inside) { this.start(c, s, c.home); break; }
      }
    }
  }
  /** Walk to the car first; drive() takes over when they get there. */
  start(c, s, to) { if (!s.goTo({ x: c.x, z: c.z })) return; c.trip = { s, to, stage: 'walk' }; c.driver = s; }
  route(c, b) {
    const w = this.game.world, [sx, sz] = w.tileOf(c.x, c.z), [tx, tz] = w.tileOf(b.doorOut.x, b.doorOut.z);
    let goal = null, bd = 1e9; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const x = tx + dx, z = tz + dz; if (w.inBounds(x, z) && w.road[w.idx(x, z)] && Math.abs(dx) + Math.abs(dz) < bd) { bd = Math.abs(dx) + Math.abs(dz); goal = [x, z]; } }
    if (!goal) return null; const p = w.findPath(sx, sz, goal[0], goal[1], true); return p ? p.slice(1).map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })) : null;
  }
  drive(c, dt) {
    const g = this.game, T = c.trip;
    if (T && T.stage === 'walk') {
      const s = T.s; if (s.remove || (s.activity !== 'work' && T.to === s.workplace) || (s.activity !== 'home' && s.activity !== 'sleep' && T.to === c.home)) { c.trip = null; return; }
      if (!s.path.length && Math.hypot(s.x - c.x, s.z - c.z) < 2.8) {
        const path = this.route(c, T.to); if (!path || !path.length) { c.trip = null; s.phase = 0; return; }
        T.stage = 'drive'; c.path = path; c.state = 'driving'; this.free(c.spot); c.spot = null; c.y = 0; s.riding = true; s.hidden = true;
        c.drunk = s.drunk > 0.45 ? 60 : 0; c.racer = Math.random() < 0.04 && s.age < 30;
      }
      return;
    }
    if (c.state === 'pulled') { c.pulledT -= dt; if (c.pulledT <= 0) c.state = 'driving'; return; }
    if (c.state !== 'driving') return;
    if (!c.path.length) { this.park(c); return; }
    const p = c.path[0]; let dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz), sx = dx / (d || 1), sz = dz / (d || 1), tx = p.x + sz * 1.3, tz = p.z - sx * 1.3; dx = tx - c.x; dz = tz - c.z;   // keep left
    const want = Math.atan2(dx, dz); let dh = Math.atan2(Math.sin(want - c.h), Math.cos(want - c.h)); c.h += Math.max(-3 * dt, Math.min(3 * dt, dh));
    if (c.drunk > 0) { c.drunk -= dt; c.h += Math.sin(g.elapsed * 1.9 + c.id) * 1.4 * dt; }
    const max = 6 * (c.racer ? 1.5 : 1) * (c.drunk > 0 ? 1.3 : 1); let target = Math.abs(dh) > 0.6 ? 2 : max;
    for (const o of this.list.concat(g.traffic ? g.traffic.cars : [])) { if (o === c || (o.state && o.state !== 'driving')) continue; const ox = o.x - c.x, oz = o.z - c.z, dd = Math.hypot(ox, oz); if (dd > 6) continue; const fwd = ox * Math.sin(c.h) + oz * Math.cos(c.h), lat = Math.abs(ox * Math.cos(c.h) - oz * Math.sin(c.h)); if (fwd > 0.5 && lat < 1.4 && Math.cos((o.h || 0) - c.h) > 0.2) target = Math.min(target, Math.max(0, dd - 3.5) * 1.5); }
    c.v += Math.max(-10 * dt, Math.min(5 * dt, target - c.v)); c.x += Math.sin(c.h) * c.v * dt; c.z += Math.cos(c.h) * c.v * dt; if (d < 2.2) c.path.shift();
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; for (const [wh, r] of c.mesh.userData.wheels || []) wh.rotation.x += c.v * dt / r;
    // the police take an interest in a car weaving about or tearing round the town
    if ((c.drunk > 0 || c.racer) && g.crime && (c.copT = (c.copT || 0) - dt) <= 0) { c.copT = 2; const cop = g.crime.cops().find((q) => Math.hypot(q.x - c.x, q.z - c.z) < 20); if (cop) this.pullOver(c, cop); }
  }
  pullOver(c, cop) {
    const g = this.game, s = c.trip && c.trip.s; c.state = 'pulled'; c.pulledT = 20; c.v = 0;
    g.social.say(cop, pick(c.drunk > 0 ? ['Evening. Been drinking, have we?', 'Blow into this for me, sir.', 'Step out of the car, please.'] : ['Bit of a hurry, sir?', 'Do you know how fast you were going?', 'Nice car. Shame about the driving.']), 3);
    g.messages.push('Police', `${s ? s.name : 'A driver'} was pulled over for ${c.drunk > 0 ? 'drink-driving' : 'dangerous driving'}.${c.drunk > 0 ? ' Banned for a year and a night in the cells.' : ' A fine and points on the licence.'}`);
    if (g.markers) g.markers.add(c.x, c.z, '🚔', c.drunk > 0 ? 'Drink-driver stopped' : 'Speeding driver stopped', 40);
    c.drunk = 0; c.racer = false;
  }
  /** At the destination: find a space (car park or kerb), park, and let the driver out. */
  park(c) {
    const T = c.trip, s = T && T.s, b = T ? T.to : c.home; const sp = (b && T && T.to !== c.home && this.carPark(b)) || (b && this.kerb(b)) || { x: c.x, z: c.z, h: c.h };
    c.spot = sp; c.x = sp.x; c.z = sp.z; c.h = sp.h; c.y = sp.y || 0; c.v = 0; c.state = 'parked'; c.mesh.position.set(c.x, c.y, c.z); c.mesh.rotation.y = c.h; c.at = T && T.to === c.home ? 'home' : 'work';
    if (s) { const out = sp.entry || sp; s.x = out.x + Math.cos(c.h) * 1.4; s.z = out.z - Math.sin(c.h) * 1.4; s.riding = false; s.hidden = false; s.rideY = 0; s.phase = 0; s.timer = 0; }
    c.trip = null;
  }
  // ---------- Sam and other people's cars ----------
  /** Parked cars Sam can get into (called from Player.findTarget). */
  targets(P, consider) {
    const g = this.game; if (P.mounted || P.transit) return;
    if (!(P.car && P.car.c && P.car.c.mine) && g.tech && g.tech.era >= 1) for (const b of g.buildings.list) { if (b.id !== 'garage' || b.state !== 'done' || !b.doorOut) continue; const d = Math.hypot(b.doorOut.x - P.x, b.doorOut.z - P.z); if (d < 4) consider({ kind: 'act', text: 'Buy a car (£1,200)', act: () => this.buy(b) }, d - 0.4); }
    for (const c of this.list) { if (c.state !== 'parked' || c.taken || (c.y || 0) > 0.5) continue; const d = Math.hypot(c.x - P.x, c.z - P.z); if (d > 2.8) continue;
      consider({ kind: 'act', text: c.mine ? 'Get in your car' : `Get in ${c.home ? 'the ' + (c.home.residents[0] ? c.home.residents[0].surname + 's\'' : 'neighbours\'') : 'this'} car (it isn't yours...)`, act: () => this.take(c) }, d - 0.3, c.x, c.z); }
  }
  /** Sam drives off in a parked car (his own, or somebody else's: that's theft, if anyone sees). */
  take(c) {
    const g = this.game, P = g.player; this.free(c.spot); c.spot = null; c.taken = true; c.mesh.visible = false; P.car = { c }; P.x = c.x; P.z = c.z; P.heading = c.h; P.mount(true);
    if (!c.mine) { const seen = g.population.sims.some((s) => (s.activity === 'police' || (c.home && s.home === c.home)) && Math.hypot(s.x - c.x, s.z - c.z) < 25 && s.mesh.visible);
      if (seen && g.crime) { g.crime.wanted = Math.min(5, g.crime.wanted + 1); g.ui.toast('"Oi! That\'s my car!" Somebody saw you.', 2600); } else g.ui.toast('Nobody saw. Drive carefully...', 2000); }
  }
  /** Sam gets out: the car stays exactly where he left it. */
  leave(P) {
    const c = P.car && P.car.c; if (!c) return; c.x = P.x + Math.cos(P.heading) * 1.6; c.z = P.z - Math.sin(P.heading) * 1.6; c.h = P.heading; c.y = 0; c.taken = false; c.mesh.visible = true; c.state = 'parked'; c.at = 'away'; c.spot = { x: c.x, z: c.z, h: c.h };
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; P.car = c.mine ? { c, parked: true } : null;
  }
  /** Sam buys a car at the garage: it's his, parked outside. */
  buy(b) {
    const g = this.game, price = 1200; if (!g.economy.spend(price, 'Bikes and transport')) { g.ui.toast('Not enough money for a car.'); return; }
    const sp = this.kerb(b) || { x: b.doorOut.x + 3, z: b.doorOut.z, h: 0 }, c = { id: this.list.length + 1, color: 0xe8772e, home: null, mine: true, mesh: makeCarMesh(0xe8772e), x: sp.x, z: sp.z, h: sp.h, v: 0, state: 'parked', spot: sp, path: [], at: 'away', y: 0 };
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; g.scene.add(c.mesh); this.list.push(c); g.player.car = { c, parked: true };
    g.ui.toast('A shiny orange hatchback, one careful owner. It\'s parked outside: walk up and press E to get in, B to get out.', 4200);
  }
  serialize() { return this.list.map((c) => ({ home: c.home ? this.game.buildings.list.indexOf(c.home) : -1, x: +c.x.toFixed(1), z: +c.z.toFixed(1), h: +c.h.toFixed(2), mine: !!c.mine, at: c.at })); }
  load(arr) {
    const g = this.game; for (const d of arr || []) { const col = d.mine ? 0xe8772e : pick(COLORS), c = { id: this.list.length + 1, color: col, home: g.buildings.list[d.home] || null, mine: d.mine, mesh: makeCarMesh(col), x: d.x, z: d.z, h: d.h, v: 0, state: 'parked', spot: { x: d.x, z: d.z, h: d.h }, path: [], at: d.at || 'home', y: 0 };
      c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h; g.scene.add(c.mesh); this.list.push(c); if (c.mine) g.player.car = { c, parked: true }; }
  }
}
