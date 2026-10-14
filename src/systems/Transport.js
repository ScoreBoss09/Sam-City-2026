import * as THREE from 'three';
import { stdMat, mergeByMaterial } from '../render/BuildingFactory.js';
import { makeCarriage, makeGondola, makeRide, VEHICLE_NAMES } from '../render/Vehicles.js';
import { Sfx } from '../core/Sfx.js';
import { TILE } from '../config.js';
import { trackPoints } from './Track.js';
import { pick } from '../util.js';

/**
 * Getting about. Bicycles (what the Cycle Shop sells: penny-farthing -> safety bicycle -> motorbike), and three kinds of
 * line: a railway on a brick viaduct, a monorail on a concrete beam, and a sky lift on cables.
 * Lines follow the track laid with the Track tool (systems/TrackBuilder.js); stations with no track between them are
 * joined by a straight run. Piers and pillars only go down on clear ground (never on roads, buildings or scenery).
 * Townsfolk walk to a station, wait on the platform, board, ride (you can see them through the windows) and get off at
 * their stop. Sam waits on the platform too, boards the real train and can walk about inside the carriage.
 */
const KIND = {
  rail: { name: 'railway', h: 9, speed: 10, cars: 3, len: 7, fare: 2, span: 8 },
  mono: { name: 'monorail', h: 12, speed: 14, cars: 2, len: 7, fare: 3, span: 12 },
  sky: { name: 'sky lift', h: 20, speed: 5, cars: 0, len: 0, fare: 2, span: 32 },
};
const BIKE_PRICE = [40, 90, 400];

export class Transport {
  constructor(game) { this.game = game; this.bikeLv = -1; this.lines = {}; this.sig = {}; this.t = 0; this.acc = 0; this.trips = new Set(); }
  get tracks() { const f = this.game.flags; return f.tracks || (f.tracks = { rail: [], mono: [], sky: [] }); }
  stations(kind) { return this.game.buildings.list.filter((b) => b.state === 'done' && b.def.transit === kind).sort((a, b) => a.uid - b.uid); }
  update(dt) {
    const g = this.game; this.t += dt; this.acc -= dt;
    if (this.acc <= 0) {
      this.acc = 1.5; let lv = -1; for (const b of g.buildings.list) if (b.id === 'cycleshop' && b.state === 'done') lv = Math.max(lv, b.def.vehicle || 0); this.bikeLv = lv;
      for (const k of Object.keys(KIND)) this.refresh(k);
    }
    for (const L of Object.values(this.lines)) if (L) this.run(L, dt);
    this.passengers(dt);
  }
  /** Rebuild a line when its stations or its track change. */
  refresh(k) { const st = this.stations(k), sig = st.map((b) => b.uid).join(',') + '|' + JSON.stringify(this.tracks[k] || []); if (sig !== this.sig[k]) { this.sig[k] = sig; this.build(k, st); } }

  // ---------- the route ----------
  /** The stations in running order, and the points between each pair (laid track where there is some, else straight). */
  route(kind, st) {
    const H = KIND[kind].h, T = (this.tracks[kind] || []).filter((t) => t.b != null), byUid = new Map(st.map((b) => [b.uid, b])), P = (b) => ({ x: b.cx, z: b.cz });
    const done = T.filter((t) => byUid.has(t.a) && byUid.has(t.b)), deg = new Map(); for (const t of done) { deg.set(t.a, (deg.get(t.a) || 0) + 1); deg.set(t.b, (deg.get(t.b) || 0) + 1); }
    // follow the laid track from an end station; any stations left over join the end with a straight run
    let cur = done.length ? st.find((b) => deg.get(b.uid) === 1) || st.find((b) => deg.has(b.uid)) : st[0];
    const order = [cur], used = new Set(), segs = [];
    while (true) { const t = done.find((q) => !used.has(q) && (q.a === cur.uid || q.b === cur.uid)); if (!t) break; used.add(t);
      const fwd = t.a === cur.uid, a = byUid.get(t.a), b = byUid.get(t.b), pts = trackPoints(t, P(a), P(b), H).pts; segs.push(fwd ? pts : pts.slice().reverse()); cur = fwd ? b : a; if (order.includes(cur)) break; order.push(cur); }
    for (const b of st) if (!order.includes(b)) { const a = order[order.length - 1], n = Math.max(2, Math.ceil(Math.hypot(b.cx - a.cx, b.cz - a.cz))), pts = []; for (let i = 0; i <= n; i++) pts.push({ x: a.cx + (b.cx - a.cx) * i / n, z: a.cz + (b.cz - a.cz) * i / n, y: H }); segs.push(pts); order.push(b); }
    // one long list of points, and where along it each station is
    const pts = [], stopAt = [0]; for (const s of segs) { for (let i = pts.length ? 1 : 0; i < s.length; i++) pts.push(s[i]); stopAt.push(pts.length - 1); }
    if (!pts.length) for (const b of order) pts.push({ x: b.cx, z: b.cz, y: H });
    return { order, pts, stopAt: stopAt.slice(0, order.length) };
  }
  /** Is this spot clear for a pier (not a road, a building, a tree, a rock or anything else in the way)? */
  clearGround(x, z) {
    const g = this.game, w = g.world, tx = Math.floor(x / TILE), tz = Math.floor(z / TILE); if (!w.inBounds(tx, tz)) return false;
    if (w.road[w.idx(tx, tz)] || g.buildings.buildingAtPoint(x, z)) return false;
    if (w.isLand && !w.isLand(tx, tz)) return true;   // in the water is fine
    return !w.collides(x, z, 1.0);
  }

  // ---------- building a line ----------
  build(kind, st) {
    const g = this.game, old = this.lines[kind]; if (old) { g.scene.remove(old.group); old.group.traverse((o) => { if (o.geometry && o.geometry.userData.own) o.geometry.dispose(); }); for (const c of old.cars) g.scene.remove(c); this.unload(old); }
    this.drawDraft(kind, st);
    if (st.length < 2) { this.lines[kind] = null; return; }
    const K = KIND[kind], { order, pts, stopAt } = this.route(kind, st), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const grp = new THREE.Group(), own = (m) => { m.geometry.userData.own = true; m.castShadow = true; grp.add(m); return m; };
    const seg = (a, b, w, h, dy, col, off = 0) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) + 0.05, ux = dz / (L || 1), uz = -dx / (L || 1); const m = own(new THREE.Mesh(new THREE.BoxGeometry(w, h, L), stdMat(col))); m.position.set((a.x + b.x) / 2 + ux * off, (a.y + b.y) / 2 + dy, (a.z + b.z) / 2 + uz * off); m.rotation.y = Math.atan2(dx, dz); m.rotation.x = -Math.atan2(b.y - a.y, L); };
    const post = (x, z, w, h, d, col, y = 0, rot = 0) => { const m = own(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(col))); m.position.set(x, y + h / 2, z); m.rotation.y = rot; };
    // the deck and rails (or the beam, or the cables), a short box for every metre or so
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (kind === 'rail') { seg(a, b, 2.8, 0.8, -0.4, 0x8a4a3a); seg(a, b, 0.2, 0.5, 0.2, 0x7a3e30, -1.35); seg(a, b, 0.2, 0.5, 0.2, 0x7a3e30, 1.35); seg(a, b, 0.1, 0.12, 0.06, 0x5a5e66, -0.55); seg(a, b, 0.1, 0.12, 0.06, 0x5a5e66, 0.55); }
      else if (kind === 'mono') seg(a, b, 0.9, 0.9, -0.45, 0xb4b2ab);
      else { seg(a, b, 0.06, 0.06, 0, 0x2a2d33, -1.3); seg(a, b, 0.06, 0.06, 0, 0x2a2d33, 1.3); }
    }
    // piers: every so often, but only where the ground is clear (a longer span is fine)
    let last = -1e9; const nearStop = (s) => stopAt.some((k) => Math.abs(cum[k] - s) < 6);
    for (let i = 0; i < pts.length; i++) {
      if (cum[i] - last < K.span || nearStop(cum[i])) continue; const p = pts[i]; if (!this.clearGround(p.x, p.z)) continue;
      const q = pts[Math.min(pts.length - 1, i + 1)], rot = Math.atan2(q.x - p.x, q.z - p.z); last = cum[i];
      if (kind === 'rail') post(p.x, p.z, 1.6, p.y - 0.8, 2.4, 0x8a4a3a, 0, rot);
      else if (kind === 'mono') { post(p.x, p.z, 0.9, p.y - 1.4, 0.9, 0xa8a69e, 0, rot); post(p.x, p.z, 2.2, 0.5, 0.9, 0xa8a69e, p.y - 1.4, rot); }
      else { post(p.x, p.z, 0.8, p.y + 1.5, 0.8, 0x6a7078, 0, rot); post(p.x, p.z, 3.4, 0.3, 0.5, 0x6a7078, p.y + 0.3, rot); }
    }
    // a raised platform at each station, lined up with the track, with a canopy
    const plat = [];
    for (let n = 0; n < order.length; n++) {
      const i = stopAt[n], p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], rot = Math.atan2(q.x - o.x, q.z - o.z) || 0, H = p.y;
      plat.push({ x: p.x, z: p.z, y: H, rot });
      if (kind === 'sky') { post(p.x, p.z, 4.5, H + 3, 4.5, 0x6a7078, 0, rot); post(p.x, p.z, 6, 0.4, 6, 0x2a6aa8, H + 3, rot); continue; }
      post(p.x, p.z, 4.6, 0.5, 9, kind === 'rail' ? 0x9a968c : 0xd8d8d0, H - 0.5, rot); post(p.x, p.z, 4.6, 0.2, 7, kind === 'rail' ? 0x5a2a20 : 0xd04030, H + 3, rot);
      for (const s of [-1.8, 1.8]) post(p.x + Math.cos(rot) * s, p.z - Math.sin(rot) * s, 0.25, 3, 0.25, 0x2a2d33, H, rot);
      for (const s of [-3.5, 3.5]) { const x = p.x + Math.sin(rot) * s, z = p.z + Math.cos(rot) * s; if (this.clearGround(x, z) || g.buildings.buildingAtPoint(x, z) === order[n]) post(x, z, 1.2, H - 0.5, 1.2, kind === 'rail' ? 0x8a4a3a : 0xa8a69e, 0, rot); }
      for (const s of [-2.15, 2.15]) post(p.x + Math.cos(rot) * s, p.z - Math.sin(rot) * s, 0.1, 0.9, 8.6, 0x2a2d33, H, rot);   // railings
    }
    mergeByMaterial(grp); g.scene.add(grp);
    const cars = [], ck = kind === 'rail' ? (g.tech && g.tech.age >= 3 ? 'electric' : 'steam') : 'mono';
    if (kind === 'sky') { const n = Math.max(2, Math.ceil(cum[cum.length - 1] * 2 / 30)); for (let i = 0; i < n; i++) { const m = makeGondola([0xd04030, 0xf1c40f, 0x2a7ab0][i % 3]); g.scene.add(m); cars.push(m); } }
    else for (let i = 0; i < K.cars; i++) { const m = makeCarriage(ck, i === 0); g.scene.add(m); cars.push(m); }
    this.lines[kind] = { kind, K, pts, cum, stops: stopAt.map((k) => cum[k]), st: order, plat, len: cum[cum.length - 1], group: grp, cars, s: 0, dir: 1, wait: 4, at: 0, riders: [], waiting: order.map(() => []) };
  }
  /** Track that's laid but doesn't reach a second station yet: draw it anyway (so you can see what you're building). */
  drawDraft(kind, st) {
    const g = this.game, k = 'draft_' + kind; if (this[k]) { g.scene.remove(this[k]); this[k].traverse((o) => o.geometry && o.geometry.dispose()); this[k] = null; }
    const open = (this.tracks[kind] || []).filter((t) => t.b == null && t.pieces.length), H = KIND[kind].h; if (!open.length) return;
    const grp = new THREE.Group(), mat = stdMat(kind === 'rail' ? 0x8a4a3a : kind === 'mono' ? 0xb4b2ab : 0x2a2d33);
    for (const t of open) { const a = st.find((b) => b.uid === t.a) || this.game.buildings.list.find((b) => b.uid === t.a); if (!a) continue; const { pts } = trackPoints(t, { x: a.cx, z: a.cz }, null, H);
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz) + 0.05, m = new THREE.Mesh(new THREE.BoxGeometry(kind === 'rail' ? 2.8 : 0.9, 0.6, L), mat); m.position.set((p.x + q.x) / 2, (p.y + q.y) / 2 - 0.3, (p.z + q.z) / 2); m.rotation.y = Math.atan2(dx, dz); grp.add(m); } }
    g.scene.add(grp); this[k] = grp;
  }
  /** Point, height and heading at distance s along a line. */
  at(L, s) {
    s = Math.max(0, Math.min(L.len, s)); let lo = 0, hi = L.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] < s) lo = m; else hi = m; }
    const a = L.pts[lo], b = L.pts[hi], u = (s - L.cum[lo]) / Math.max(0.001, L.cum[hi] - L.cum[lo]);
    return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, y: a.y + (b.y - a.y) * u, h: Math.atan2(b.x - a.x, b.z - a.z) };
  }
  run(L, dt) {
    const K = L.K;
    if (L.kind === 'sky') {
      const loop = L.len * 2, n = L.cars.length;
      L.cars.forEach((m, i) => { let u = (this.t * K.speed + i * loop / n) % loop; const back = u > L.len; if (back) u = loop - u; const p = this.at(L, u), off = back ? -1.3 : 1.3; m.position.set(p.x + Math.cos(p.h) * off, p.y - 0.1, p.z - Math.sin(p.h) * off); m.rotation.y = p.h;
        // passing through a station: people get out, people get in (the cabins never stop, they just slow in real life)
        const near = L.stops.findIndex((c) => Math.abs(c - u) < 1.6); if (near >= 0 && m.userData.last !== near) { m.userData.last = near; this.skyStop(L, i, near); } else if (near < 0 && m.userData.last != null && L.stops.every((c) => Math.abs(c - u) > 6)) m.userData.last = null; });
      return;
    }
    if (L.wait > 0) { L.wait -= dt; if (L.wait <= 0) L.atStop = -1; }
    else {
      const prev = L.s; L.s += L.dir * K.speed * dt;
      // stop at each station, and turn round at the ends
      for (let n = 0; n < L.stops.length; n++) { const c = L.stops[n]; if ((prev - c) * (L.s - c) < 0 || L.s === c) { L.s = c; this.arrive(L, n); break; } }
      if (L.s >= L.len) { L.s = L.len; L.dir = -1; } else if (L.s <= 0) { L.s = 0; L.dir = 1; }
    }
    L.cars.forEach((m, i) => { const p = this.at(L, L.s - L.dir * i * (K.len + 0.4)), q = this.at(L, L.s - L.dir * i * (K.len + 0.4) + L.dir * 0.5); m.position.set(p.x, p.y + (L.kind === 'mono' ? 0.1 : 0.02), p.z); m.rotation.y = Math.atan2(q.x - p.x, q.z - p.z) || p.h; });
  }
  /** A train pulls in: people get off, people get on. */
  arrive(L, n) {
    L.wait = 6; L.atStop = n; if (this.near(L)) Sfx.tone(L.kind === 'rail' ? 640 : 900, 0.3, { type: 'square', vol: 0.05 });
    for (const r of L.riders.slice()) if (r.dest === n) this.alight(L, r, n);
    const free = () => { const used = new Set(L.riders.map((r) => r.car + ':' + r.seat)); for (let c = 0; c < L.cars.length; c++) { const S = L.cars[c].userData.seats || []; for (let k = 0; k < S.length; k++) if (!used.has(c + ':' + k)) return [c, k]; } return null; };
    for (const s of L.waiting[n].slice()) { const f = free(); if (!f) break; L.waiting[n].splice(L.waiting[n].indexOf(s), 1); L.riders.push({ s, car: f[0], seat: f[1], dest: s.trip.j }); s.trip.stage = 'ride'; }
  }
  skyStop(L, i, n) {
    for (const r of L.riders.slice()) if (r.car === i && r.dest === n) this.alight(L, r, n);
    const seats = L.cars[i].userData.seats || [], used = new Set(L.riders.filter((r) => r.car === i).map((r) => r.seat));
    for (const s of L.waiting[n].slice()) { const k = seats.findIndex((_, j) => !used.has(j)); if (k < 0) break; used.add(k); L.waiting[n].splice(L.waiting[n].indexOf(s), 1); L.riders.push({ s, car: i, seat: k, dest: s.trip.j }); s.trip.stage = 'ride'; }
    const P = this.game.player; if (P.platform && P.platform.L === L && P.platform.i === n) { P.platform = null; P.transit = { L, cabin: true, car: L.cars[i], lx: 0, lz: 0, from: n }; this.game.ui.toast('In you get! E to get off at the next station.', 2600); Sfx.play('door'); }
  }
  /** The station the carriage (or cabin) Sam is in is at right now, or -1. */
  stopHere(L, car) { if (L.kind !== 'sky') return L.wait > 0 && L.atStop >= 0 ? L.atStop : -1; let best = -1, bd = 4; L.plat.forEach((p, n) => { const d = Math.hypot(p.x - car.position.x, p.z - car.position.z); if (d < bd) { bd = d; best = n; } }); return best; }
  near(L) { const p = this.game.player, c = L.cars[0]; return c && Math.hypot(c.position.x - p.x, c.position.z - p.z) < 60; }
  /** A platform spot (along the edge, clear of the train). */
  platSpot(L, n, k) { const p = L.plat[n], side = k % 2 ? 1 : -1, sky = L.kind === 'sky', along = sky ? -1.6 + ((k >> 1) % 3) * 1.6 : -3 + ((k >> 1) % 5) * 1.5; return { x: p.x + Math.cos(p.rot) * side * 1.75 + Math.sin(p.rot) * along, z: p.z - Math.sin(p.rot) * side * 1.75 + Math.cos(p.rot) * along, y: p.y + (sky ? 3.4 : 0), face: p.rot + Math.PI / 2 * -side }; }

  // ---------- the townsfolk's trips ----------
  /** A sim fancies a ride: walk to the nearest station of a working line; returns false if there's nowhere to go. */
  planTrip(s) {
    const lines = Object.values(this.lines).filter((L) => L && L.st.length >= 2); if (!lines.length) return false;
    let best = null, bd = 160; for (const L of lines) L.st.forEach((b, i) => { const d = Math.hypot(b.cx - s.x, b.cz - s.z); if (d < bd && b.doorOut) { bd = d; best = { L, i }; } });
    if (!best) return false; const { L, i } = best, j = pick(L.st.map((_, k) => k).filter((k) => k !== i)), b = L.st[i];
    if (!s.goTo({ x: b.doorOut.x, z: b.doorOut.z })) return false; s.trip = { L, i, j, stage: 'walk', t: 0 }; this.trips.add(s); return true;
  }
  passengers(dt) {
    const g = this.game;
    for (const s of this.trips) {
      const T = s.trip; if (!T || s.remove || !this.lines[T.L.kind] || this.lines[T.L.kind] !== T.L) { this.dropTrip(s); continue; }
      const L = T.L, b = L.st[T.i];
      if (T.stage === 'walk') { if (s.activity !== 'leisure') { this.dropTrip(s); continue; } if (!s.path.length && Math.hypot(b.doorOut.x - s.x, b.doorOut.z - s.z) < 2.5) { const k = L.waiting[T.i].length, p = this.platSpot(L, T.i, k); L.waiting[T.i].push(s); T.stage = 'wait'; T.t = 0; s.riding = true; s.inside = null; s.x = p.x; s.z = p.z; s.rideY = p.y; s.heading = p.face; s.path = []; } }
      else if (T.stage === 'wait') { T.t += dt * Math.max(0.2, g.clock.speed); if (T.t > 120) { const q = L.waiting[T.i]; q.splice(q.indexOf(s), 1); this.down(s, b); } }
      else if (T.stage === 'off') { T.t += dt; if (T.t > 2.5) this.down(s, L.st[T.at]); }
    }
    // riders sit in their seats as the carriages move (seen through the windows)
    for (const L of Object.values(this.lines)) if (L && L.riders) for (const r of L.riders) {
      const c = L.cars[r.car], st = c && c.userData.seats[r.seat]; if (!st) continue; const h = c.rotation.y, cs = Math.cos(h), sn = Math.sin(h);
      r.s.x = c.position.x + cs * st.x + sn * st.z; r.s.z = c.position.z - sn * st.x + cs * st.z; r.s.rideY = c.position.y + c.userData.floor; r.s.heading = h + st.face;
    }
  }
  alight(L, r, n) { const i = L.riders.indexOf(r); if (i >= 0) L.riders.splice(i, 1); const s = r.s, p = this.platSpot(L, n, Math.floor(Math.random() * 10)); s.x = p.x; s.z = p.z; s.rideY = p.y; s.trip.stage = 'off'; s.trip.at = n; s.trip.t = 0; }
  /** Down the station steps and back to normal life. */
  down(s, b) { s.riding = false; s.rideY = 0; if (b && b.doorOut) { s.x = b.doorOut.x; s.z = b.doorOut.z; } s.phase = 0; s.timer = 0; this.dropTrip(s, true); }
  dropTrip(s, keep) { if (!keep && s.trip && s.trip.stage !== 'walk' && s.riding) { s.riding = false; s.rideY = 0; const b = s.trip.L.st[s.trip.i]; if (b && b.doorOut) { s.x = b.doorOut.x; s.z = b.doorOut.z; } } s.trip = null; this.trips.delete(s); }
  unload(L) { for (const r of L.riders || []) this.down(r.s, L.st[0]); for (const q of L.waiting || []) for (const s of q) this.down(s, L.st[0]); }
  /** For the animation: sat down on the train, or standing on the platform. */
  pose(s) { const T = s.trip; return T && T.stage === 'ride' ? (T.L.kind === 'sky' ? 'stand' : 'sit') : T && (T.stage === 'wait' || T.stage === 'off') ? 'stand' : null; }

  // ---------- Sam: buying a bike, riding a line ----------
  /** Extra things Sam can do (called from Player.findTarget). */
  targets(P, consider) {
    const g = this.game;
    if (P.platform) { consider({ kind: 'act', text: `Waiting for the ${P.platform.L.K.name}... (E to go back down the steps)`, act: () => this.samDown() }, 3); return; }
    if (P.transit && P.transit.cabin) { const R = P.transit, L = R.L, n = this.stopHere(L, R.car); if (n >= 0 && n !== R.from) consider({ kind: 'act', text: `Get off here: ${this.stopName(L.st[n])}`, act: () => this.samOff() }, 0); else if (n < 0) R.from = -1; return; }
    // bikes and tickets are sold inside, over the counter (BuildingManager.sale): by the door it just says to go in
    const B = g.buildings;
    for (const b of B.list) {
      if (b.state !== 'done' || !b.doorOut) continue; if (B.playerInside !== b && Math.hypot(b.doorOut.x - P.x, b.doorOut.z - P.z) > 4.2) continue;
      if (b.id === 'cycleshop') { const lv = b.def.vehicle || 0, price = BIKE_PRICE[lv]; if ((P.bike ?? -1) < lv) B.sale(b, P, consider, { kind: 'act', text: `Buy a ${VEHICLE_NAMES[lv]} (£${price})  then B to ride`, act: () => this.buyBike(lv, price) }, `The ${b.def.name}: go inside to buy a ${VEHICLE_NAMES[lv]} (£${price})`); }
      if (b.def.transit) {
        const L = this.lines[b.def.transit]; if (!L) { if (B.playerInside !== b) consider({ kind: 'info', text: `Build another ${b.def.name} to open the line (lay the track with the Track tool)` }, Math.hypot(b.doorOut.x - P.x, b.doorOut.z - P.z), undefined, undefined, [b.doorOut.x, b.doorOut.z]); continue; }
        const i = L.st.indexOf(b); if (i < 0) continue;
        B.sale(b, P, consider, { kind: 'act', text: `Buy a ticket (£${L.K.fare}) and go up to the platform for the ${L.K.name}`, act: () => this.samUp(L, i) }, `Tickets for the ${L.K.name} from the ticket office inside`);
      }
    }
  }
  stopName(b) {
    let best = null, bd = 1e9; for (const o of this.game.buildings.list) { if (o === b || o.state !== 'done' || o.def.park || o.def.cat === 'res' || o.def.transit || o.def.special) continue; const d = Math.hypot(o.cx - b.cx, o.cz - b.cz); if (d < bd) { bd = d; best = o; } }
    return best ? `${best.def.name.replace(/^The /, '')} stop` : 'the next stop';
  }
  buyBike(lv, price) {
    const g = this.game, e = g.economy; if (e.funds < price) { g.ui.toast('Not enough money.'); Sfx.play('deny'); return; }
    e.lose(price, 'Bikes and transport'); g.player.bike = lv; g.ui.toast(`You buy a ${VEHICLE_NAMES[lv]}! Press B (L3 on a controller) to get on and off.`, 4200); Sfx.play('done');
  }
  samUp(L, i) {
    const g = this.game, P = g.player; if (!P.pay(L.K.fare, 'Fares')) { g.ui.toast('Not enough for the fare.'); return; }
    P.mount(false); const p = this.platSpot(L, i, 9); P.x = p.x; P.z = p.z; P.floorY = p.y; P.heading = p.face; P.platform = { L, i }; Sfx.play('door');
    g.ui.toast(`Up on the platform. The ${L.K.name} will be along shortly.`, 2600);
  }
  samDown() { const g = this.game, P = g.player, R = P.platform; if (!R) return; P.platform = null; const b = R.L.st[R.i]; P.teleport(b.doorOut.x, b.doorOut.z); }
  /** The train is in: Sam steps aboard the middle carriage. */
  samBoard(L) { const P = this.game.player, c = Math.min(L.cars.length - 1, 1), car = L.cars[c]; P.platform = null; P.transit = { L, cabin: true, car, lx: 0, lz: 0, from: L.atStop }; this.game.ui.toast(`All aboard! Walk about if you like. E to get off when it stops.`, 3200); Sfx.play('door'); }
  samOff(quiet) { const g = this.game, P = g.player, R = P.transit; if (!R) return; const L = R.L, n = this.stopHere(L, R.car), b = L.st[n >= 0 ? n : 0]; P.transit = null; P.floorY = 0; P.teleport(b.doorOut.x, b.doorOut.z); if (!quiet) g.ui.toast(`${this.stopName(b)}. Mind the gap!`, 2200); Sfx.play('door'); }
  /** Sam inside a carriage: walk about the aisle (called from Player.update). */
  cabin(P, fx, fz, dt) {
    const g = this.game, R = P.transit, car = R.car, h = car.rotation.y, cs = Math.cos(h), sn = Math.sin(h), U = car.userData;
    if (P.platform) return;
    if (fx || fz) { const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), l = Math.hypot(fx, fz), dx = (-sy * fz + cy * fx) / l, dz = (-cy * fz - sy * fx) / l;
      R.lx = Math.max(-U.halfW + 0.2, Math.min(U.halfW - 0.2, R.lx + (dx * cs - dz * sn) * 2.2 * dt)); R.lz = Math.max(-U.len / 2 + 0.5, Math.min(U.len / 2 - 0.5, R.lz + (dx * sn + dz * cs) * 2.2 * dt)); P.heading = Math.atan2(dx, dz); P.moved = true; P.dist = 2.2 * dt; }
    P.x = car.position.x + cs * R.lx + sn * R.lz; P.z = car.position.z - sn * R.lx + cs * R.lz; P.floorY = car.position.y + U.floor;
  }
  cabinPrompt(P) {
    const g = this.game, L = P.transit.L; if (L.kind === 'sky') { g.ui.setPrompt(`On the sky lift. E to get off at a station.`, -1, true); return; } g.ui.setPrompt(L.wait > 0 && L.atStop >= 0 ? `${this.stopName(L.st[L.atStop])}: E to get off here` : `On the ${L.K.name}. Next stop: ${this.stopName(L.st[Math.max(0, Math.min(L.st.length - 1, this.nextStop(L)))])}`, -1, true);
  }
  nextStop(L) { let best = -1, bd = 1e9; L.stops.forEach((c, n) => { const d = (c - L.s) * L.dir; if (d > 0.5 && d < bd) { bd = d; best = n; } }); return best < 0 ? (L.dir > 0 ? L.stops.length - 1 : 0) : best; }
  /** Waiting on the platform: board when the train pulls in (called every frame from Player.update). */
  platformTick() { const P = this.game.player, R = P.platform; if (!R) return; const L = this.lines[R.L.kind]; if (L !== R.L) { this.samDown(); return; } if (L.wait > 0 && L.atStop === R.i) this.samBoard(L); }
  /** Off at the destination (also used if Sam switches to the planning view mid-journey). */
  endRide() {
    const g = this.game, P = g.player, R = P.transit; if (P.platform) this.samDown(); if (!R) return;
    const L = R.L, n = L.atStop >= 0 ? L.atStop : this.nextStop(L), b = L.st[n]; P.transit = null; P.floorY = 0; P.teleport(b.doorOut.x, b.doorOut.z);
  }
  makeSamBike(lv) { return makeRide(lv, 0xe8772e); }
}
