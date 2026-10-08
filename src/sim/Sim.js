import * as THREE from 'three';
import { TILE } from '../config.js';
import { ROLES } from '../data/buildings.js';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { pick, angleDiff } from '../util.js';

let nextId = 1;
const STYLES = {
  cheerful: { speed: 2.25, bounce: 1.3, slouch: 0.0, swing: 1.25, fidget: 1.3, soc: 0.9, mood: 0.55 },
  grumpy:   { speed: 1.9,  bounce: 0.7, slouch: 0.55, swing: 0.7, fidget: 0.8, soc: 0.3, mood: -0.45 },
  shy:      { speed: 1.95, bounce: 0.85, slouch: 0.6, swing: 0.6, fidget: 1.4, soc: 0.35, mood: 0.1 },
  busy:     { speed: 2.7,  bounce: 1.0, slouch: 0.1, swing: 1.1, fidget: 0.9, soc: 0.4, mood: 0.0 },
};
const ROLE_UPPER = { shopkeeper: 'tidy', doctor: 'clipboard', guard: 'guard', engineer: 'panel', factory: 'lever', clerk: 'clipboard', builder: 'idle' };
const SEAT_UPPER = { desk: 'type', sofa: 'watch', bench: 'idle', dining: 'eat', waiting: 'read' };

/**
 * An NPC citizen ("actor"). Schedule-driven state machine (sleep -> home -> work -> leisure) with
 * seats, conversations, glances, greetings and a procedural animator.
 */
export class Sim {
  constructor(game, o) {
    this.game = game; this.id = nextId++;
    Object.assign(this, { name: 'Citizen', kind: 'resident', trait: 'cheerful', look: {}, talkCount: 0 }, o);
    const base = STYLES[this.trait] || STYLES.cheerful, v = () => 0.92 + Math.random() * 0.16;
    this.style = { ...base, speed: base.speed * v(), stride: 0.92 + Math.random() * 0.16 };
    this.x = o.x ?? 0; this.z = o.z ?? 0; this.heading = o.heading ?? 0; this.inside = o.inside || null; this.path = []; this.moved = false; this.phase = 0; this.activity = ''; this.timer = 0;
    this.home = null; this.workplace = null; this.role = null; this.workSpot = 0; this.carry = null; this.job = null; this.pose = 'stand'; this.frozen = false;
    this.vel = 0; this.dest = null; this.glide = null; this.sitting = null; this.chat = null; this.emote = null; this.mood = this.style.mood; this.moodBoost = 0;
    this.lookYaw = 0; this.lookPitch = 0; this.glanceT = 2 + Math.random() * 4; this.glanceTarget = null; this.greeted = -999; this.chatCool = 10 + Math.random() * 30; this.bag = false; this.lowDetail = false;
    this.rig = createRig(this.look); this.mesh = this.rig.root; this.anim = new Animator(this.rig, { trait: this.trait, bounce: this.style.bounce, slouch: this.style.slouch, swing: this.style.swing, stride: this.style.stride, fidget: this.style.fidget });
    game.scene.add(this.mesh); this.sync(0.016, true);
  }
  get roleName() { return this.role ? ROLES[this.role].name : (this.kind === 'visitor' ? 'Visitor' : this.kind === 'security' ? 'Security' : 'Unemployed'); }
  get sleeping() { return this.pose === 'sleep'; }

  // ---------- navigation ----------
  /** dest: {b, x, z, seat?, face?} -> walk (exit/enter buildings as needed). Returns false if no route. */
  goTo(dest) {
    const w = this.game.world, wp = [];
    this.standUp();
    let sx = this.x, sz = this.z;
    if (this.inside && this.inside !== dest.b) {
      const b = this.inside;
      if (!b.def.open) wp.push({ x: b.doorIn.x, z: b.doorIn.z }, { x: b.doorPos.x, z: b.doorPos.z, exit: true });
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
    this.path = wp; this.dest = dest; this.phase = 1; return true;
  }
  standUp() {
    if (this.sitting) { const s = this.sitting; s.taken = null; this.sitting = null; const f = s.heading; this.glide = { x: s.x + Math.sin(f) * 0.75, z: s.z + Math.cos(f) * 0.75 }; }
  }
  sitAt(seat) { seat.taken = this; this.sitting = seat; this.glide = { x: seat.x, z: seat.z }; this.faceGoal = seat.heading; }
  freeSeat(b, kinds) { return b && b.spots.seat ? b.spots.seat.filter((s) => !s.taken && (!kinds || kinds.includes(s.kind))) : []; }

  step(dt) {
    const prevX = this.x, prevZ = this.z; this.moved = false; this.turning = false;
    if (this.pose === 'sleep') { this.vel = 0; return; }
    if (this.glide) { const k = Math.min(1, dt * 7); this.x += (this.glide.x - this.x) * k; this.z += (this.glide.z - this.z) * k; if (Math.hypot(this.glide.x - this.x, this.glide.z - this.z) < 0.02) this.glide = null; }
    if (this.faceGoal !== undefined && !this.path.length) { const d = angleDiff(this.heading, this.faceGoal); this.heading += Math.max(-9 * dt, Math.min(9 * dt, d)); if (Math.abs(d) < 0.03) this.faceGoal = undefined; else this.turning = true; }
    if (this.frozen || this.chat || this.sitting || !this.path.length) {
      this.vel = Math.max(0, this.vel - 9 * dt); if (!this.frozen && !this.chat && !this.path.length && this.phase === 1) this.arrive(); this.dist = Math.hypot(this.x - prevX, this.z - prevZ); return;
    }
    const p = this.path[0], dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz), exact = p.enter || p.exit || this.path.length === 1;
    const want = Math.atan2(dx, dz), dh = angleDiff(this.heading, want), rate = 8;
    this.heading += Math.max(-rate * dt, Math.min(rate * dt, dh));
    const hurry = this.hurry ? 1.55 : 1, max = this.style.speed * hurry * (this.carry ? 0.8 : 1) * (this.kind === 'security' ? 1.4 : 1);
    let target = Math.abs(dh) > 1.1 ? 0.15 : max; if (this.path.length === 1) target = Math.min(target, Math.max(0.5, d * 1.6));
    this.vel += Math.max(-8 * dt, Math.min(5 * dt, target - this.vel));
    let move = this.vel * dt; if (Math.abs(dh) > 1.1) this.turning = true;
    if (d <= Math.max(move, exact ? 0.06 : 0.5)) {
      this.x = p.x; this.z = p.z; this.path.shift(); if (p.enter) this.inside = p.enter; if (p.exit) this.inside = null;
    } else { this.x += Math.sin(this.heading) * move; this.z += Math.cos(this.heading) * move; }
    this.moved = true; this.dist = Math.hypot(this.x - prevX, this.z - prevZ);
    if (!this.path.length && this.phase === 1) { this.vel = 0; this.arrive(); }
  }
  arrive() {
    this.phase = 2; const d = this.dest; if (!d) return;
    if (d.seat) { if (d.seat.taken && d.seat.taken !== this) return; this.sitAt(d.seat); }
    else if (d.face !== undefined) this.faceGoal = d.face;
    this.arrivedAt = this.game.clock.hour;
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
    const g = this.game, h = g.clock.hour; this.timer -= dt; this.chatCool -= dt;
    this.tired = h >= 21 || h < 6.5;
    // mood drifts around the personality baseline
    this.moodBoost *= Math.exp(-dt * 0.02);
    this.mood = this.style.mood + this.moodBoost + (this.tired ? -0.2 : 0) + (h > 17 && h < 21 ? 0.15 : 0) - (this.activity === 'work' && h > 15 ? 0.1 : 0);
    const want = this.wantActivity(h);
    if (want !== this.activity) { if (this.chat) g.social.endChat(this); this.endActivity(); this.activity = want; this.phase = 0; this.timer = 0; this.hurry = want === 'work' && h > (this.role === 'builder' ? 7.2 : 8.2) && this.trait !== 'shy' && Math.random() < 0.6; }
    if (this.chat) return;
    switch (this.activity) {
      case 'sleep': this.doSleep(); break;
      case 'home': this.doHome(); break;
      case 'work': this.doWork(dt); break;
      case 'leisure': this.doLeisure(); break;
      case 'visit': this.doVisit(); break;
      case 'leave': this.doLeave(); break;
      default: break;
    }
    if (this.hurry && this.activity !== 'work') this.hurry = false;
    if (this.hurry && this.phase === 2) this.hurry = false;
  }
  endActivity() {
    if (this.pose === 'sleep') { this.pose = 'stand'; const s = this.bedSpot; if (s) { this.x = s.ax; this.z = s.az; } this.bedSpot = null; this.moodBoost -= 0.0; }
    this.standUp(); this.abortJob(); this.bag = false;
  }
  doSleep() {
    const home = this.home; if (!home || home.state !== 'done') return;
    if (this.phase === 0) {
      let s = home.spots.bed.find((x) => x.taken === this) || home.spots.bed.find((x) => !x.taken); if (!s) return; s.taken = this; this.bedSpot = s;
      if (!this.goTo({ b: home, x: s.ax, z: s.az })) this.phase = 2;
    } else if (this.phase === 2 && this.bedSpot && !this.path.length) {
      this.pose = 'sleep'; this.x = this.bedSpot.x; this.z = this.bedSpot.z; this.heading = this.bedSpot.rotY; this.phase = 3; this.vel = 0;
    }
  }
  doHome() {
    if (!this.home || this.home.state !== 'done') return this.doLeisure();
    if (this.phase === 0) {
      const seats = this.freeSeat(this.home, ['dining']); const s = seats.length && Math.random() < 0.8 ? pick(seats) : null;
      if (s) { if (!this.goTo({ b: this.home, x: s.x, z: s.z, seat: s })) this.phase = 2; }
      else { const i = pick(this.home.spots.idle); if (!this.goTo({ b: this.home, x: i.x, z: i.z })) this.phase = 2; }
    }
  }
  doLeisure() {
    if (this.phase === 0 || (this.phase === 2 && this.timer <= 0)) {
      const g = this.game, opts = [];
      const parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done'), shops = g.buildings.byDef('shop');
      if (parks.length) opts.push('park', 'park', 'bench'); if (shops.length) opts.push('shop', 'shop'); if (this.home && this.home.state === 'done') opts.push('home', 'sofa'); opts.push('street', 'street');
      const c = pick(opts); let ok = false;
      if (c === 'park') { const p = pick(parks), s = pick(p.spots.idle); ok = this.goTo({ b: p, x: s.x, z: s.z }); }
      else if (c === 'bench') { const p = pick(parks), seats = this.freeSeat(p); if (seats.length) { const s = pick(seats); ok = this.goTo({ b: p, x: s.x, z: s.z, seat: s }); } }
      else if (c === 'shop') { const p = pick(shops), s = pick(p.spots.visit); ok = this.goTo({ b: p, x: s.x, z: s.z, face: p.rot * Math.PI / 2 + Math.PI }); this.shopping = true; }
      else if (c === 'sofa') { const seats = this.freeSeat(this.home, ['sofa']); if (seats.length) { const s = pick(seats); ok = this.goTo({ b: this.home, x: s.x, z: s.z, seat: s }); } }
      else if (c === 'home') { const s = pick(this.home.spots.idle); ok = this.goTo({ b: this.home, x: s.x, z: s.z }); }
      else ok = this.wander();
      if (!ok) this.phase = 2; this.timer = 14 + Math.random() * 28;
      if (c !== 'shop' && this.shopping) { this.shopping = false; this.bag = Math.random() < 0.7; }
    }
  }
  wander() {
    const w = this.game.world; const tx = Math.floor(this.x / TILE) + Math.floor((Math.random() - 0.5) * 14), tz = Math.floor(this.z / TILE) + Math.floor((Math.random() - 0.5) * 14);
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
    if (this.phase === 0) this.goTo({ b: lift, x: lift.doorIn.x, z: lift.doorIn.z });
    if (this.inside === lift && !this.path.length) this.remove = true;
  }
  doWork(dt) {
    const wp = this.workplace;
    if (this.role === 'builder') return this.doBuild(dt);
    if (this.phase === 0) {
      const spots = wp.spots.work, s = spots[this.workSpot % Math.max(1, spots.length)] || wp.spots.idle[0];
      const seat = wp.spots.seat && wp.spots.seat.find((q) => !q.taken && q.kind === 'desk' && Math.hypot(q.x - s.x, q.z - s.z) < 0.7);
      if (!this.goTo(seat ? { b: wp, x: seat.x, z: seat.z, seat } : { b: wp, x: s.x, z: s.z, face: this.workFacing(wp, s) })) this.phase = 2;
    }
  }
  workFacing(b, s) { return b.rot * Math.PI / 2 + Math.PI; }
  abortJob() {
    const j = this.job; if (!j) return; const g = this.game;
    if (j.type === 'haul' && j.qty) { g.economy.stock[j.mat] += j.qty; j.site.reserved[j.mat] = Math.max(0, (j.site.reserved[j.mat] || 0) - j.qty); }
    if (j.type === 'build') j.site.builders = Math.max(0, (j.site.builders || 0) - 1);
    this.job = null; this.carry = null; this.idleSet = false;
  }
  doBuild(dt) {
    const g = this.game, c = g.construction, wp = this.workplace;
    if (!this.job) {
      this.jobCheck = (this.jobCheck || 0) - dt;
      if (this.jobCheck <= 0) {
        this.jobCheck = 1.5; const j = c.requestTask(this);
        if (j) { this.job = j; j.step = 0; this.phase = 0; this.idleSet = true; }
        else if (!this.idleSet) { this.idleSet = true; const s = pick(wp.spots.idle.length ? wp.spots.idle : wp.spots.work); this.goTo({ b: wp, x: s.x, z: s.z }); }
      }
      return;
    }
    const j = this.job;
    if (j.type === 'haul') {
      const dep = g.depot;
      if (j.step === 0) { if (!dep) { this.abortJob(); return; } if (this.phase === 0) { if (!this.goTo({ x: dep.doorOut.x, z: dep.doorOut.z, face: dep.rot * Math.PI / 2 + Math.PI })) { this.abortJob(); return; } } if (this.phase === 2) { j.step = 1; j.wait = 0.9; } }
      else if (j.step === 1) { j.wait -= dt; if (j.wait <= 0) { this.carry = { mat: j.mat, qty: j.qty }; const p = c.perimeterPoint(j.site, this); this.goTo({ x: p.x, z: p.z }); j.step = 2; } }
      else if (j.step === 2) { if (this.phase === 2) { g.buildings.deliver(j.site, j.mat, j.qty); this.carry = null; this.job = null; this.idleSet = false; this.phase = 0; this.moodBoost += 0.02; } }
    } else if (j.type === 'build') {
      if (j.step === 0) { const p = c.perimeterPoint(j.site, this); if (!this.goTo({ x: p.x, z: p.z })) { this.abortJob(); return; } j.step = 1; j.site.builders = (j.site.builders || 0) + 1; }
      else if (j.step === 1 && this.phase === 2) { j.step = 2; j.tool = Math.random() < 0.7 ? 'hammer' : 'saw'; this.faceGoal = Math.atan2(j.site.cx - this.x, j.site.cz - this.z); }
      else if (j.step === 2) {
        const s = j.site; if (s.state !== 'site' || s.progress >= g.buildings.supply(s) - 0.0005) { s.builders = Math.max(0, (s.builders || 0) - 1); this.job = null; this.idleSet = false; return; }
        this.working = true; g.buildings.addWork(s, dt * 0.85);
      }
    }
  }

  // ---------- animation ----------
  decideAnim() {
    const g = this.game; let lower = 'stand', upper = 'idle', speaking = false;
    if (this.pose === 'sleep') return { lower: 'lie', upper: 'sleep' };
    if (this.sitting) { lower = 'sit'; upper = SEAT_UPPER[this.sitting.kind] || 'idle'; if (upper === 'type' && this.role === 'engineer') upper = 'type'; if (this.sitting.kind === 'bench' && this.mood < 0) upper = 'phone'; }
    else if (this.moved || this.vel > 0.15) lower = 'walk';
    else if (this.working) lower = 'crouch';
    if (this.working) upper = this.job && this.job.tool === 'saw' ? 'saw' : 'hammer';
    else if (this.carry && !this.sitting) upper = 'carry';
    else if (this.bag && lower === 'walk') upper = 'bag';
    else if (!this.sitting && this.activity === 'work' && !this.moved && this.role && this.phase === 2) upper = ROLE_UPPER[this.role] || 'idle';
    else if (this.kind === 'security') upper = this.moved ? 'idle' : 'guard';
    else if (this.shopping && this.phase === 2 && !this.moved) upper = 'browse';
    if (this.chat) { upper = this.chat.laugh > 0 ? 'laugh' : (this.chat.speaker ? 'talk' : 'listen'); speaking = this.chat.speaker; if (lower === 'walk') lower = 'stand'; }
    if (this.frozen) { upper = this.talkingToPlayer && this.game.ui.dialogue && this.game.ui.dialogue.shown < this.game.ui.dialogue.full.length ? 'talk' : 'listen'; lower = this.sitting ? 'sit' : 'stand'; speaking = upper === 'talk'; }
    if (this.emote && this.emote.t > 0) upper = this.emote.upper;
    return { lower, upper, speaking };
  }
  sync(dt, init = false) {
    const g = this.game, m = this.mesh, hidden = this.hidden || (this.inside && !this.inside.def.open && this.inside !== g.buildings.playerInside);
    m.visible = !hidden; if (hidden && !init) { this.working = false; return; }
    m.position.set(this.x, 0, this.z); m.rotation.y = this.heading;
    const cam = g.camera.position, d = Math.hypot(cam.x - this.x, cam.z - this.z) + (g.mode === 'god' ? cam.y * 0.6 : 0);
    const far = d > (g.mode === 'god' ? 70 : 60);
    if (far !== this.lowDetail || init) { this.lowDetail = far; this.rig.lod.visible = far; for (const p of this.rig.parts) p.visible = !far; if (!far) this.rig.lids.visible = false; }
    if (far) { this.rig.lod.position.y = this.moved ? Math.abs(Math.sin(this.game.clock.hour * 900)) * 0.04 : 0; if (this.pose === 'sleep') { this.rig.lod.rotation.x = -Math.PI / 2; this.rig.lod.position.set(0, 0.7, 0.9); } else { this.rig.lod.rotation.x = 0; this.rig.lod.position.z = 0; } this.working = false; return; }
    if (this.emote) { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; }
    this.updateLook(dt);
    const a = this.decideAnim(), carryCol = this.carry ? ({ timber: 0xb5834a, brick: 0xa8442f, steel: 0x7b8794, glass: 0x7ec8e3 }[this.carry.mat]) : undefined;
    this.anim.update(dt, { ...a, dist: this.moved ? (this.dist || 0) : 0, speed: this.vel, run: this.hurry && this.vel > 2.3, turning: this.turning && !this.moved, lookYaw: this.lookYaw, lookPitch: this.lookPitch, mood: this.mood, tired: this.tired, crateColor: carryCol,
      prop: this.bag && a.lower === 'walk' ? { handR: 'bag' } : undefined, lean: this.vel > 0.5 ? 0 : 0 });
    this.working = false;
    const castNear = d < 24; if (castNear !== this.castOn) { this.castOn = castNear; for (const p of this.rig.parts) p.castShadow = castNear; }
  }
  updateLook(dt) {
    const g = this.game; this.glanceT -= dt;
    if (this.glanceT <= 0) {
      const p = g.player; let tgt = null;
      if (this.activity !== 'sleep' && this.kind !== 'security' || Math.random() < 0.3) {
        const dp = Math.hypot(p.x - this.x, p.z - this.z);
        if (dp < 9 && (!this.inside || this.inside === g.buildings.playerInside) && Math.random() < 0.3 + this.style.soc * 0.5) tgt = { x: p.x, z: p.z, y: 1.6 };
        else if (Math.random() < 0.5) { const o = g.population.nearest(this.x, this.z, 7, (s) => s !== this && s.mesh.visible); if (o) tgt = { x: o.x, z: o.z, y: 1.6 }; }
        if (!tgt && Math.random() < 0.4) tgt = { x: this.x + Math.sin(this.heading + (Math.random() - 0.5) * 2.2) * 6, z: this.z + Math.cos(this.heading + (Math.random() - 0.5) * 2.2) * 6, y: 1.6 + Math.random() * 3 };
      }
      this.glanceTarget = tgt; this.glanceT = tgt ? 1.2 + Math.random() * 2.2 : 2 + Math.random() * 5;
    }
    let ty = 0, tp = 0; const gt = this.chat ? this.chat.partner : this.frozen ? g.player : this.glanceTarget;
    if (gt) { const dx = gt.x - this.x, dz = gt.z - this.z; ty = angleDiff(this.heading, Math.atan2(dx, dz)); tp = Math.atan2(1.65 - (gt.y || 1.65), Math.hypot(dx, dz)) * 0.5; if (Math.abs(ty) > 1.4) { ty = 0; tp = 0; } }
    else if (this.path.length && this.moved) { const p = this.path[0]; ty = angleDiff(this.heading, Math.atan2(p.x - this.x, p.z - this.z)) * 0.5; }
    const k = Math.min(1, dt * 5); this.lookYaw += (ty - this.lookYaw) * k; this.lookPitch += (tp - this.lookPitch) * k;
  }
  rebuildMesh() {
    this.game.scene.remove(this.mesh); this.rig = createRig(this.look); this.mesh = this.rig.root; this.anim = new Animator(this.rig, { trait: this.trait, bounce: this.style.bounce, slouch: this.style.slouch, swing: this.style.swing, stride: this.style.stride, fidget: this.style.fidget });
    this.game.scene.add(this.mesh); this.lowDetail = null; this.sync(0.016, true);
  }
  dispose() { this.standUp(); this.game.scene.remove(this.mesh); }
}
