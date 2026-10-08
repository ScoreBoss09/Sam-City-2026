import * as THREE from 'three';
import { TILE } from '../config.js';
import { ROLES } from '../data/buildings.js';
import { makeSimModel, animateWalk } from '../render/SimModel.js';
import { pick } from '../util.js';

const SPEED = 2.1;
let nextId = 1;

/**
 * An NPC citizen ("actor"). Behaviour is a small schedule-driven state machine:
 * sleep -> morning at home -> work -> leisure -> sleep. Builders pull tasks from ConstructionSystem.
 */
export class Sim {
  constructor(game, o) {
    this.game = game; this.id = nextId++; Object.assign(this, { name: 'Citizen', kind: 'resident', trait: 'cheerful', look: {}, talkCount: 0, clue: 0 }, o);
    this.x = o.x ?? 0; this.z = o.z ?? 0; this.heading = o.heading ?? 0; this.inside = o.inside || null; this.path = []; this.moved = false; this.phase = 0; this.activity = ''; this.timer = 0;
    this.home = null; this.workplace = null; this.role = null; this.workSpot = 0; this.carry = null; this.job = null; this.pose = 'stand'; this.frozen = false; this.walkPhase = Math.random() * 6; this.noJobDays = 0;
    this.mesh = makeSimModel({ ...this.look, shirt: this.look.shirt }); this.game.scene.add(this.mesh);
    this.crateMesh = null; this.sync();
  }
  get roleName() { return this.role ? ROLES[this.role].name : (this.kind === 'visitor' ? 'Visitor' : this.kind === 'security' ? 'Security' : 'Unemployed'); }

  // ---------- navigation ----------
  /** dest: {b, x, z} -> walk (exit/enter buildings as needed). Returns false if no route. */
  goTo(dest) {
    const w = this.game.world, wp = [];
    let sx = this.x, sz = this.z;
    if (this.inside && this.inside !== dest.b) {
      const b = this.inside;
      if (!b.def.open) { wp.push({ x: b.doorIn.x, z: b.doorIn.z }, { x: b.doorPos.x, z: b.doorPos.z, exit: true }); }
      else wp.push({ x: b.doorOut.x, z: b.doorOut.z, exit: true });
      sx = b.doorOut.x; sz = b.doorOut.z; wp.push({ x: sx, z: sz, exit: true });
    }
    if (dest.b && dest.b !== this.inside && !dest.b.def.park) {
      const b = dest.b, t = w.findPath(Math.floor(sx / TILE), Math.floor(sz / TILE), b.doorTile.x, b.doorTile.z);
      if (!t) return false;
      for (let i = 1; i < t.length; i++) wp.push({ x: (t[i][0] + 0.5) * TILE, z: (t[i][1] + 0.5) * TILE });
      wp.push({ x: b.doorOut.x, z: b.doorOut.z }, { x: b.doorPos.x, z: b.doorPos.z, enter: b }, { x: b.doorIn.x, z: b.doorIn.z });
      if (dest.x !== undefined) wp.push({ x: dest.x, z: dest.z });
    } else if (dest.b && dest.b === this.inside) {
      wp.push({ x: dest.x, z: dest.z });
    } else {
      const t = w.findPath(Math.floor(sx / TILE), Math.floor(sz / TILE), Math.floor(dest.x / TILE), Math.floor(dest.z / TILE));
      if (!t) return false;
      for (let i = 1; i < t.length; i++) wp.push({ x: (t[i][0] + 0.5) * TILE, z: (t[i][1] + 0.5) * TILE });
      wp.push({ x: dest.x, z: dest.z });
    }
    this.path = wp; this.phase = 1; return true;
  }
  step(dt) {
    this.moved = false; if (this.frozen || this.pose === 'sleep') return;
    let budget = SPEED * dt * (this.kind === 'security' ? 1.4 : 1);
    while (this.path.length && budget > 0) {
      const p = this.path[0], dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz);
      if (d <= budget) {
        this.x = p.x; this.z = p.z; budget -= d; this.path.shift();
        if (p.enter) this.inside = p.enter; if (p.exit) this.inside = null;
        if (d > 0.01) this.heading = Math.atan2(dx, dz);
        this.moved = true;
      } else { this.x += dx / d * budget; this.z += dz / d * budget; this.heading = Math.atan2(dx, dz); budget = 0; this.moved = true; }
    }
    if (!this.path.length && this.phase === 1) this.phase = 2;
  }

  // ---------- life ----------
  wantActivity(h) {
    if (this.kind === 'visitor') return 'visit';
    if (this.kind === 'security') return 'guard';
    if (this.leaving) return 'leave';
    if (h >= 22 || h < 6) return this.home ? 'sleep' : 'leisure';
    if (h < (this.role === 'builder' ? 7 : 8)) return 'home';
    const end = this.role === 'builder' ? 18 : 17;
    if (h < end && this.workplace && this.workplace.state === 'done') return 'work';
    return 'leisure';
  }
  think(dt) {
    const g = this.game, h = g.clock.hour; this.timer -= dt;
    const want = this.wantActivity(h);
    if (want !== this.activity) { this.endActivity(); this.activity = want; this.phase = 0; this.timer = 0; }
    switch (this.activity) {
      case 'sleep': this.doSleep(); break;
      case 'home': this.doHome(); break;
      case 'work': this.doWork(dt); break;
      case 'leisure': this.doLeisure(); break;
      case 'visit': this.doVisit(); break;
      case 'leave': this.doLeave(); break;
      case 'guard': break;
    }
  }
  endActivity() {
    if (this.pose === 'sleep') { this.pose = 'stand'; const s = this.bedSpot; if (s) { this.x = s.ax; this.z = s.az; } this.bedSpot = null; }
    this.abortJob();
  }
  doSleep() {
    const home = this.home; if (!home || home.state !== 'done') return;
    if (this.phase === 0) {
      let s = home.spots.bed.find((x) => x.taken === this) || home.spots.bed.find((x) => !x.taken); if (!s) return; s.taken = this; this.bedSpot = s;
      if (!this.goTo({ b: home, x: s.ax, z: s.az })) this.phase = 2;
    } else if (this.phase === 2 && this.bedSpot && !this.path.length) {
      this.pose = 'sleep'; this.x = this.bedSpot.x; this.z = this.bedSpot.z; this.heading = this.bedSpot.rotY; this.phase = 3;
    }
  }
  doHome() {
    if (!this.home || this.home.state !== 'done') return this.doLeisure();
    if (this.phase === 0) { const s = pick(this.home.spots.idle); if (!this.goTo({ b: this.home, x: s.x, z: s.z })) this.phase = 2; }
  }
  doLeisure() {
    if (this.phase === 0 || (this.phase === 2 && this.timer <= 0)) {
      const g = this.game, opts = [];
      const parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done'), shops = g.buildings.byDef('shop');
      if (parks.length) opts.push('park', 'park'); if (shops.length) opts.push('shop'); if (this.home && this.home.state === 'done') opts.push('home'); opts.push('street');
      const c = pick(opts); let ok = false;
      if (c === 'park') { const p = pick(parks), s = pick(p.spots.idle); ok = this.goTo({ b: p, x: s.x, z: s.z }); }
      else if (c === 'shop') { const p = pick(shops), s = pick(p.spots.visit); ok = this.goTo({ b: p, x: s.x, z: s.z }); }
      else if (c === 'home') { const s = pick(this.home.spots.idle); ok = this.goTo({ b: this.home, x: s.x, z: s.z }); }
      else ok = this.wander();
      if (!ok) this.phase = 2; this.timer = 12 + Math.random() * 25;
    }
  }
  wander() {
    const w = this.game.world; const tx = Math.floor(this.x / TILE) + Math.floor((Math.random() - 0.5) * 12), tz = Math.floor(this.z / TILE) + Math.floor((Math.random() - 0.5) * 12);
    if (!w.inBounds(tx, tz) || !w.road[w.idx(tx, tz)]) return false; const [cx, cz] = w.center(tx, tz); return this.goTo({ x: cx, z: cz });
  }
  doVisit() {
    if (this.phase === 0 || (this.phase === 2 && this.timer <= 0)) {
      if (this.visits === undefined) this.visits = 0;
      if (this.visits++ >= 3) { this.leaving = true; return; }
      const g = this.game, shops = g.buildings.byDef('shop'), parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done'), all = shops.concat(parks);
      if (!all.length) { if (!this.wander()) this.phase = 2; this.timer = 10; return; }
      const b = pick(all), s = pick(b.spots.visit.length ? b.spots.visit : b.spots.idle); if (!this.goTo({ b, x: s.x, z: s.z })) this.phase = 2; this.timer = 15 + Math.random() * 15;
    }
  }
  doLeave() {
    const lift = this.game.lift;
    if (this.phase === 0) { this.goTo({ b: lift, x: lift.doorIn.x, z: lift.doorIn.z }); }
    if (this.inside === lift && !this.path.length) this.remove = true;
  }
  /** Builder / any worker. */
  doWork(dt) {
    const wp = this.workplace;
    if (this.role === 'builder') return this.doBuild(dt);
    if (this.phase === 0) {
      const spots = wp.spots.work, s = spots[this.workSpot % Math.max(1, spots.length)] || wp.spots.idle[0];
      if (!this.goTo({ b: wp, x: s.x, z: s.z })) this.phase = 2;
    }
  }
  abortJob() {
    const j = this.job; if (!j) return; const g = this.game;
    if (j.type === 'haul' && j.qty) {
      g.economy.stock[j.mat] += j.qty;
      j.site.reserved[j.mat] = Math.max(0, (j.site.reserved[j.mat] || 0) - j.qty);
    }
    if (j.type === 'build') j.site.builders = Math.max(0, (j.site.builders || 0) - 1);
    this.job = null; this.carry = null; this.idleSet = false;
  }
  doBuild(dt) {
    const g = this.game, c = g.construction, wp = this.workplace;
    if (!this.job) {
      this.jobCheck = (this.jobCheck || 0) - dt;
      if (this.jobCheck <= 0) {
        this.jobCheck = 1.5; const j = c.requestTask(this);
        if (j) { this.job = j; j.step = 0; this.phase = 0; }
        else if (!this.idleSet) { this.idleSet = true; const s = pick(wp.spots.idle.length ? wp.spots.idle : wp.spots.work); this.goTo({ b: wp, x: s.x, z: s.z }); }
      }
      return;
    }
    const j = this.job;
    if (j.type === 'haul') {
      const dep = g.depot;
      if (j.step === 0) { if (!dep) { this.abortJob(); return; } if (this.phase === 0) { if (!this.goTo({ x: dep.doorOut.x, z: dep.doorOut.z })) { this.abortJob(); return; } } if (this.phase === 2 || (!this.path.length && this.phase !== 0)) { j.step = 1; j.wait = 0.8; } }
      else if (j.step === 1) { j.wait -= dt; if (j.wait <= 0) { this.carry = { mat: j.mat, qty: j.qty }; const p = c.perimeterPoint(j.site, this); this.goTo({ x: p.x, z: p.z }); j.step = 2; } }
      else if (j.step === 2) { if (!this.path.length) { g.buildings.deliver(j.site, j.mat, j.qty); this.carry = null; this.job = null; this.idleSet = false; this.phase = 0; } }
    } else if (j.type === 'build') {
      if (j.step === 0) { const p = c.perimeterPoint(j.site, this); if (!this.goTo({ x: p.x, z: p.z })) { this.abortJob(); return; } j.step = 1; j.site.builders = (j.site.builders || 0) + 1; }
      else if (j.step === 1 && !this.path.length) j.step = 2;
      else if (j.step === 2) {
        const s = j.site; if (s.state !== 'site' || s.progress >= g.buildings.supply(s) - 0.0005) { s.builders = Math.max(0, (s.builders || 0) - 1); this.job = null; this.idleSet = false; return; }
        this.heading = Math.atan2(s.cx - this.x, s.cz - this.z); this.working = true; g.buildings.addWork(s, dt * 0.85);
      }
    }
  }

  // ---------- visuals ----------
  sync(dt = 0) {
    const g = this.game, m = this.mesh, vis = this.inside && !this.inside.def.open ? this.inside === g.buildings.playerInside : true;
    m.visible = vis && !this.hidden;
    m.position.set(this.x, 0, this.z); m.rotation.y = this.heading;
    const u = m.userData;
    if (this.pose === 'sleep') { u.body.rotation.x = -Math.PI / 2; u.body.position.set(0, 0.72, 0.9); animateWalk(m, 0, 0); }
    else {
      u.body.rotation.x = 0; u.body.position.set(0, 0, 0);
      if (this.moved) { this.walkPhase += dt * 8; animateWalk(m, this.walkPhase, 1); }
      else if (this.working) { this.walkPhase += dt * 9; u.armR.rotation.x = -1.2 + Math.sin(this.walkPhase) * 0.6; u.armL.rotation.x = 0; u.legL.rotation.x = u.legR.rotation.x = 0; }
      else animateWalk(m, 0, 0);
    }
    this.working = false;
    if (this.carry && !this.crateMesh) { this.crateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xb5834a })); this.crateMesh.position.set(0, 1.2, 0.4); m.userData.body.add(this.crateMesh); }
    if (!this.carry && this.crateMesh) { this.crateMesh.parent.remove(this.crateMesh); this.crateMesh = null; }
  }
  rebuildMesh() { this.game.scene.remove(this.mesh); this.mesh = makeSimModel(this.look); this.game.scene.add(this.mesh); this.crateMesh = null; this.sync(); }
  dispose() { this.game.scene.remove(this.mesh); }
}
