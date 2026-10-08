import * as THREE from 'three';
import { TILE } from '../config.js';
import { ROLES, GATHER } from '../data/buildings.js';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { pick, angleDiff } from '../util.js';
import { Dog } from '../render/Dog.js';
import { ALERT_LINES, DOWN_LINES } from '../data/story.js';

let nextId = 1;
const g_say = (s) => s.game.social && s.mesh.visible;
const STYLES = {
  cheerful: { speed: 2.9, bounce: 1.3, slouch: 0.0, swing: 1.25, fidget: 1.3, soc: 0.9, mood: 0.55 },
  grumpy:   { speed: 2.5,  bounce: 0.7, slouch: 0.55, swing: 0.7, fidget: 0.8, soc: 0.3, mood: -0.45 },
  shy:      { speed: 2.55, bounce: 0.85, slouch: 0.6, swing: 0.6, fidget: 1.4, soc: 0.35, mood: 0.1 },
  busy:     { speed: 3.3,  bounce: 1.0, slouch: 0.1, swing: 1.1, fidget: 0.9, soc: 0.4, mood: 0.0 },
};
const ROLE_UPPER = { publican: 'tidy', teacher: 'clipboard', brickmaker: 'idle', smith: 'idle', shopkeeper: 'tidy', doctor: 'clipboard', guard: 'guard', engineer: 'panel', factory: 'lever', clerk: 'clipboard', builder: 'idle' };
const SEAT_UPPER = { desk: 'type', sofa: 'watch', bench: 'idle', dining: 'eat', waiting: 'read', pew: 'pray' };

/**
 * An NPC citizen ("actor"). Schedule-driven state machine (sleep -> home -> work -> leisure) with
 * seats, conversations, glances, greetings and a procedural animator.
 */
export class Sim {
  constructor(game, o) {
    this.game = game; this.id = nextId++;
    Object.assign(this, { name: 'Citizen', kind: 'resident', trait: 'cheerful', look: {}, talkCount: 0, gender: 'm', age: 30 }, o);
    this.computeStyle();
    this.x = o.x ?? 0; this.z = o.z ?? 0; this.heading = o.heading ?? 0; this.inside = o.inside || null; this.path = []; this.moved = false; this.phase = 0; this.activity = ''; this.timer = 0;
    this.home = null; this.workplace = null; this.role = null; this.workSpot = 0; this.carry = null; this.job = null; this.pose = 'stand'; this.frozen = false;
    this.vel = 0; this.dest = null; this.glide = null; this.sitting = null; this.chat = null; this.emote = null; this.mood = this.style.mood; this.moodBoost = 0;
    this.hunger = 15 + Math.random() * 35; this.eatCD = 0; this.starveT = 0; this.sadT = 0; this.rel = new Map(); this.partner = null; this.parents = []; this.orient = Math.random() < 0.88 ? 'h' : (Math.random() < 0.6 ? 'g' : 'b'); this.single = true; this.traitMood = 0;
    this.lookYaw = 0; this.lookPitch = 0; this.glanceT = 2 + Math.random() * 4; this.glanceTarget = null; this.greeted = -999; this.chatCool = 10 + Math.random() * 30; this.bag = false; this.lowDetail = false;
    this.rig = createRig(this.look); this.mesh = this.rig.root; this.anim = new Animator(this.rig, { trait: this.trait, bounce: this.style.bounce, slouch: this.style.slouch, swing: this.style.swing, stride: this.style.stride, fidget: this.style.fidget, sway: this.style.sway });
    game.scene.add(this.mesh); this.sync(0.016, true);
    if (this.kind === 'resident' && Math.random() < 0.16) this.dog = new Dog(game, this);
  }
  computeStyle() {
    const base = STYLES[this.trait] || STYLES.cheerful, v = () => 0.92 + Math.random() * 0.16;
    this.style = { ...base, speed: base.speed * v(), stride: 0.92 + Math.random() * 0.16, sway: 1 };
    const bn = (this.look && this.look.buildName) || 'average', st = this.style;
    if (bn === 'heavy') { st.speed *= 0.86; st.sway = 1.9; st.bounce *= 0.6; st.stride *= 0.9; st.slouch += 0.1; }
    else if (bn === 'stocky') { st.speed *= 0.94; st.sway = 1.4; st.bounce *= 0.8; }
    else if (bn === 'elderly') { st.speed *= 0.7; st.slouch += 0.5; st.bounce *= 0.5; st.stride *= 0.8; st.swing *= 0.6; }
    else if (bn === 'child') { st.speed *= 1.12; st.stride *= 0.62; st.bounce *= 1.6; st.swing *= 1.2; }
    else if (bn === 'tall') { st.stride *= 1.1; } else if (bn === 'short') st.stride *= 0.9; else if (bn === 'athletic') st.speed *= 1.06;
  }
  get roleName() {
    if (this.kind === 'child') return 'Child'; if (this.kind === 'resident' && this.age >= 66 && !this.role) return 'Retired'; return this.role ? ROLES[this.role].name : (this.kind === 'visitor' ? 'Visitor' : this.kind === 'security' ? 'Security' : this.kind === 'raider' ? 'Intruder' : 'Unemployed'); }
  get sleeping() { return this.pose === 'sleep'; }

  // ---------- navigation ----------
  /** dest: {b, x, z, seat?, face?} -> walk (exit/enter buildings as needed). Returns false if no route. */
  goTo(dest) {
    const w = this.game.world, wp = [];
    this.standUp();
    let sx = this.x, sz = this.z;
    if (this.inside && this.inside !== dest.b) {
      const b = this.inside;
      if (!b.def.open) wp.push(...this.game.buildings.navPath(b, this.x, this.z, b.doorIn.x, b.doorIn.z), { x: b.doorPos.x, z: b.doorPos.z, exit: true });
      sx = b.doorOut.x; sz = b.doorOut.z; wp.push({ x: sx, z: sz, exit: true });
    }
    if (dest.b && dest.b !== this.inside && !dest.b.def.park) {
      const b = dest.b, t = w.findPath(Math.floor(sx / TILE), Math.floor(sz / TILE), b.doorTile.x, b.doorTile.z);
      if (!t) return false;
      for (let i = 1; i < t.length; i++) wp.push({ x: (t[i][0] + 0.5) * TILE, z: (t[i][1] + 0.5) * TILE });
      wp.push({ x: b.doorOut.x, z: b.doorOut.z }, { x: b.doorPos.x, z: b.doorPos.z, enter: b }, { x: b.doorIn.x, z: b.doorIn.z });
      if (dest.x !== undefined) wp.push(...this.game.buildings.navPath(b, b.doorIn.x, b.doorIn.z, dest.x, dest.z));
    } else if (dest.b && dest.b === this.inside) {
      wp.push(...this.game.buildings.navPath(dest.b, this.x, this.z, dest.x, dest.z));
    } else {
      const t = w.findPath(Math.floor(sx / TILE), Math.floor(sz / TILE), Math.floor(dest.x / TILE), Math.floor(dest.z / TILE));
      if (!t) return false;
      for (let i = 1; i < t.length; i++) wp.push({ x: (t[i][0] + 0.5) * TILE, z: (t[i][1] + 0.5) * TILE });
      wp.push({ x: dest.x, z: dest.z });
    }
    this.path = wp; this.dest = dest; this.phase = 1; return true;
  }
  standUp() {
    if (this.sitting) {
      const s = this.sitting; s.taken = null; this.sitting = null; const f = s.heading, B = this.game.buildings, n = s.b && B.navGrid(s.b);
      const clear = (x, z) => { if (n) { const cx = Math.floor((x - n.ox) / n.C), cz = Math.floor((z - n.oz) / n.C); return cx >= 0 && cz >= 0 && cx < n.W && cz < n.H && n.free[cz * n.W + cx]; } return !this.game.world.collides(x, z, 0.25); };
      // step out of the chair to whichever side is clear (forward is usually the table)
      let to = null; for (const a of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) { const x = s.x + Math.sin(f + a) * 0.8, z = s.z + Math.cos(f + a) * 0.8; if (clear(x, z)) { to = { x, z }; break; } }
      this.glide = to || { x: s.x, z: s.z };
    }
  }
  sitAt(seat) { seat.taken = this; this.sitting = seat; this.glide = { x: seat.x, z: seat.z }; this.faceGoal = seat.heading; }
  freeSeat(b, kinds) { return b && b.spots.seat ? b.spots.seat.filter((s) => !s.taken && (!kinds || kinds.includes(s.kind))) : []; }

  step(dt) {
    const prevX = this.x, prevZ = this.z; this.moved = false; this.turning = false;
    if (this.freezeT > 0) { this.freezeT -= dt; this.vel = 0; this.dist = 0; return; }
    if (this.down > 0) { this.down -= dt; this.vel = 0; this.dist = 0; if (this.down <= 0) { this.down = 0; this.recovering = true; } return; }
    if (this.pose === 'sleep') { this.vel = 0; return; }
    if (this.glide && this.path.length && !this.sitting) this.glide = null;
    if (this.glide) { const k = Math.min(1, dt * 7); this.x += (this.glide.x - this.x) * k; this.z += (this.glide.z - this.z) * k; if (Math.hypot(this.glide.x - this.x, this.glide.z - this.z) < 0.02) this.glide = null; }
    if (this.faceGoal !== undefined && !this.path.length) { const d = angleDiff(this.heading, this.faceGoal); this.heading += Math.max(-9 * dt, Math.min(9 * dt, d)); if (Math.abs(d) < 0.03) this.faceGoal = undefined; else this.turning = true; }
    if (this.frozen || this.chat || this.sitting || !this.path.length) {
      this.vel = Math.max(0, this.vel - 9 * dt); if (!this.frozen && !this.chat && !this.path.length && this.phase === 1) this.arrive(); this.dist = Math.hypot(this.x - prevX, this.z - prevZ); return;
    }
    const p = this.path[0], dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz), exact = p.enter || p.exit || this.path.length === 1;
    const want = Math.atan2(dx, dz), dh = angleDiff(this.heading, want), rate = 8;
    this.heading += Math.max(-rate * dt, Math.min(rate * dt, dh));
    const hurry = this.hurry || this.panic ? 1.55 : 1, max = this.style.speed * hurry * (this.carry ? 0.8 : 1) * (this.kind === 'security' ? 1.4 : 1) * (this.kind === 'raider' ? 1.1 : 1);
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
  mealWindow(h) { return (h >= 7 && h < 9) || (h >= 12 && h < 14) || (h >= 18 && h < 20); }
  wantActivity(h) {
    const alert = this.game.raids && this.game.raids.alert;
    if (this.kind === 'raider') return 'raid';
    if (this.kind === 'visitor') return alert ? 'leave' : 'visit';
    if (this.kind === 'security') return 'guard';
    if (this.leaving) return 'leave';
    const night = h >= 22 || h < 6;
    if (alert) { if (this.role === 'guard' && this.kind === 'resident') return 'defend'; if (!(night && this.home)) return 'shelter'; }
    if (this.activity === 'eat' && this.eating && !night) return 'eat';
    const onShift = this.activity === 'work' && this.workplace && h >= 12 && h < 14 && this.hunger < 70;
    if (!night && !onShift && this.eatCD <= 0 && (this.hunger >= 64 || (this.hunger >= 36 && this.mealWindow(h)))) return 'eat';
    if (night) return this.home ? 'sleep' : 'leisure';
    if (this.kind === 'child') { const sc = this.game.buildings.byDef('school')[0]; return sc && h >= 8.5 && h < 15 ? 'school' : (h < 8 && this.home ? 'home' : 'leisure'); }
    if (h < (this.role === 'builder' ? 7 : 8)) return 'home';
    if (this.age >= 66) return 'leisure';
    const end = this.role === 'builder' ? 18 : 17;
    if (h < end && this.workplace && this.workplace.state === 'done') return 'work';
    return 'leisure';
  }
  think(dt) {
    const g = this.game, h = g.clock.hour; this.timer -= dt; this.chatCool -= dt;
    this.tired = h >= 21 || h < 6.5; this.eatCD -= dt;
    this.hunger = Math.min(100, this.hunger + dt * (this.pose === 'sleep' ? 0.16 : 0.6));
    if (this.hunger >= 97) { this.starveT += dt; if (this.starveT > 140 && !this.leaving && this.kind === 'resident') { this.leaving = true; g.messages.push('Lift', `${this.name} has left Sam City, hungry and fed up.`, 'warn'); } } else this.starveT = Math.max(0, this.starveT - dt);
    if (this.mood < -0.6 && this.kind === 'resident' && !this.leaving) { this.sadT += dt; if (this.sadT > 220) { this.leaving = true; g.messages.push('Lift', `${this.name} has packed up and left for good.`, 'warn'); } } else this.sadT = Math.max(0, this.sadT - dt * 0.5);
    // mood drifts around the personality baseline
    this.moodBoost *= Math.exp(-dt * 0.02);
    this.mood = this.style.mood + this.moodBoost + (this.tired ? -0.2 : 0) + (h > 17 && h < 21 ? 0.15 : 0) - (this.activity === 'work' && h > 15 ? 0.1 : 0) - Math.max(0, this.hunger - 60) / 90 - (!this.home && this.kind !== 'visitor' ? 0.3 : 0) + (this.partner ? 0.12 : 0) + Math.min(0.2, this.friendCount() * 0.04) + (this.kind !== 'visitor' ? g.buildings.townJoy() : 0);
    if (this.down > 0) return;
    const want = this.wantActivity(h);
    if (want !== this.activity) { if (this.chat) g.social.endChat(this); this.endActivity(); this.activity = want; this.phase = 0; this.timer = 0; this.hurry = want === 'work' && h > (this.role === 'builder' ? 7.2 : 8.2) && this.trait !== 'shy' && Math.random() < 0.6; }
    if (this.chat) return;
    // workers take a packed lunch where they stand
    if (this.activity === 'work' && !this.carry && h >= 12 && h < 14 && this.hunger >= 36 && this.packedDay !== g.clock.totalDays && this.eatCD <= 0 && g.economy.stock.food >= 1) { this.packed = 6; this.packedDay = g.clock.totalDays; }
    // properly starving and nowhere to sit: wolf down a sandwich on the spot rather than leave town
    if (this.hunger >= 93 && this.pose !== 'sleep' && !this.carry && !(this.eating && this.phase === 2 && !this.path.length) && !(this.packed > 0) && this.kind !== 'raider' && g.economy.stock.food >= 1) { this.packed = 4; this.eating = false; this.path = []; this.phase = 0; if (this.mesh.visible && Math.random() < 0.3) g.social.say(this, pick(g.ui.adult && this.kind !== 'child' ? ['Starving. Out the way.', 'Sod it, I\'m eating here.', 'Don\'t judge me.'] : ['So hungry...', 'Just a quick bite.']), 2); }
    if (this.packed > 0) { this.packed -= dt; this.working = false; if (this.packed <= 0) { if (g.economy.eatPortion()) { this.hunger = Math.max(0, this.hunger - 62); this.moodBoost += 0.04; } this.eatCD = 30; } return; }
    switch (this.activity) {
      case 'sleep': this.doSleep(); break;
      case 'eat': this.doEat(dt); break;
      case 'school': this.doSchool(); break;
      case 'home': this.doHome(); break;
      case 'work': this.doWork(dt); break;
      case 'leisure': this.doLeisure(); break;
      case 'visit': this.doVisit(); break;
      case 'shelter': this.doShelter(); break;
      case 'raid': this.game.raids.drive(this, dt); break;
      case 'defend': break;
      case 'leave': this.doLeave(); break;
      default: break;
    }
    if (this.hurry && this.activity !== 'work') this.hurry = false;
    if (this.hurry && this.phase === 2) this.hurry = false;
  }
  doShelter() {
    if (this.phase !== 0) return; const g = this.game; let b = this.home && this.home.state === 'done' ? this.home : null;
    if (!b) { let bd = 1e9; for (const q of g.buildings.list) { if (q.state !== 'done' || q.def.open || q.def.park || !q.spots.idle.length || q.id === 'lift' || q.id === 'tunnel') continue; const d = Math.hypot(q.cx - this.x, q.cz - this.z); if (d < bd) { bd = d; b = q; } } }
    this.panic = true; this.standUp();
    if (!b) { this.phase = 2; return; } const i = pick(b.spots.idle); if (!this.goTo({ b, x: i.x, z: i.z })) this.phase = 2;
    if (this.mesh.visible && Math.random() < 0.35) g.social.say(this, pick(ALERT_LINES), 2.2);
  }
  /** Knocked to the ground (not hurt for good): lies there, then gets back up a little shaken. */
  knockDown(sec) {
    if (this.down > 0 || this.kind === 'raider') return; const g = this.game;
    if (g.buildings.count('clinic') > 0) sec *= 0.55;
    this.abortJob(); this.standUp(); this.path = []; this.chat && g.social.endChat(this); this.carry = null; this.down = sec; this.moodBoost -= 0.25; this.packed = 0; this.eating = false; this.phase = 0;
    if (this.mesh.visible) g.social.say(this, pick(DOWN_LINES), 2);
  }
  endActivity() {
    this.panic = false;
    if (this.pose === 'sleep') { this.pose = 'stand'; const s = this.bedSpot; if (s) { this.x = s.ax; this.z = s.az; } this.bedSpot = null; this.moodBoost -= 0.0; }
    this.standUp(); this.abortJob(); this.bag = false; this.drinking = false; this.bandT = 0;
  }
  friendCount() { let n = 0; for (const v of this.rel.values()) if (v >= 35) n++; return n; }
  doEat(dt) {
    const g = this.game, E = g.economy, h = g.clock.hour;
    if (this.phase === 0) {
      if (E.stock.food < 1) { this.noFood(); return; }
      const opts = [], seatsAt = (b, kind) => this.freeSeat(b, [kind]);
      const home = this.home && this.home.state === 'done' ? this.home : null, taverns = g.buildings.diners().filter((b) => seatsAt(b, 'dining').length), camps = g.buildings.list.filter((b) => b.def.park === 'camp' && b.state === 'done' && seatsAt(b, 'bench').length);
      const meal = h < 9 || h >= 18;
      if (home && seatsAt(home, 'dining').length) for (let i = 0; i < (meal ? 4 : 2); i++) opts.push(['home', home, 'dining']);
      if (taverns.length) for (let i = 0; i < (meal ? 1 : 3); i++) opts.push(['tavern', pick(taverns), 'dining']);
      if (camps.length) for (let i = 0; i < 2; i++) opts.push(['camp', pick(camps), 'bench']);
      let ok = false;
      if (this.hunger > 80) { for (const t of taverns) opts.push(['tavern', t, 'dining']); for (const c of camps) opts.push(['camp', c, 'bench']); }
      if (this.hunger > 80 && opts.length) { const dd = (o) => Math.hypot(o[1].cx - this.x, o[1].cz - this.z); const best = opts.reduce((a, o) => (dd(o) < dd(a) ? o : a)); opts.length = 0; opts.push(best); }   // starving: nearest food wins
      if (opts.length) { const [kind, b, sk] = pick(opts), seat = pick(seatsAt(b, sk)); this.eatKind = kind; this.eatPlace = b; ok = this.goTo({ b, x: seat.x, z: seat.z, seat }); }
      else if (home) { const i = pick(home.spots.idle); this.eatKind = 'home'; this.eatPlace = home; ok = this.goTo({ b: home, x: i.x, z: i.z }); }
      if (!ok) { this.eatCD = 6; this.phase = 2; return; }
      this.eating = true; this.eatTimer = 9 + Math.random() * 3;
    } else if (this.phase === 2 && this.eating) {
      this.eatTimer -= dt; this.working = false;
      if (this.eatTimer <= 0) {
        this.eating = false; this.eatCD = 28 + Math.random() * 8;
        if (E.eatPortion()) { this.hunger = Math.max(0, this.hunger - 72); this.moodBoost += 0.06 + (this.eatKind === 'tavern' ? 0.1 : 0) + (this.eatKind === 'camp' ? 0.05 : 0); if (this.eatKind === 'tavern') E.earn(3); }
        else this.noFood();
        this.phase = 0;
      }
    }
  }
  noFood() { this.eatCD = 14; this.eating = false; this.moodBoost -= 0.12; this.phase = 2; if (g_say(this)) this.game.social.say(this, pick(['Starving...', 'Any food?', 'My stomach...']), 2.4); }
  doSchool() {
    const sc = this.game.buildings.byDef('school')[0]; if (!sc) return this.doLeisure();
    if (this.phase === 0) { const seats = this.freeSeat(sc, ['desk']); if (seats.length) { const st = pick(seats); if (!this.goTo({ b: sc, x: st.x, z: st.z, seat: st })) this.phase = 2; } else { const i = pick(sc.spots.idle); if (!this.goTo({ b: sc, x: i.x, z: i.z })) this.phase = 2; } }
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
      const fe = this.game.events && this.game.events.fete;
      if (fe && Math.random() < 0.75) { const a = Math.random() * 6.28, r = 2.5 + Math.random() * 3.5; if (this.goTo({ x: fe.x + Math.cos(a) * r, z: fe.z + Math.sin(a) * r, face: Math.atan2(-Math.cos(a), -Math.sin(a)) })) { this.timer = 20 + Math.random() * 25; return; } }
      const g = this.game, opts = [];
      const parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done' && b.spots.idle.length), shops = g.buildings.shops(), h = g.clock.hour, adult = this.kind !== 'child';
      const pubs = adult ? g.buildings.diners().filter((b) => this.freeSeat(b, ['dining']).length) : [], church = g.buildings.byDef('church')[0], band = g.buildings.byDef('bandstand')[0];
      if (parks.length) opts.push('park', 'park', 'bench'); if (shops.length) opts.push('shop', 'shop'); if (this.home && this.home.state === 'done') opts.push('home', 'sofa'); opts.push('street', 'street');
      if (pubs.length && h >= 17) opts.push('pub', 'pub', 'pub'); if (church && g.clock.totalDays % 7 === 6 && h >= 9 && h < 12) opts.push('church', 'church', 'church', 'church'); if (band && h >= 16 && h < 21) opts.push('band', 'band');
      const c = pick(opts); let ok = false;
      if (this.partner && !this.partner.sleeping && this.partner.activity === 'leisure' && this.partner.dest && this.partner.inside === null && Math.random() < 0.55) { const d = this.partner.dest, ax = (Math.random() - 0.5) * 2.4, az = (Math.random() - 0.5) * 2.4; ok = this.goTo({ b: d.b, x: d.x + ax, z: d.z + az }); if (ok) { this.timer = 14 + Math.random() * 25; this.hurry = false; return; } }
      if (this.kind === 'child') this.hurry = Math.random() < 0.6;
      if (c === 'park') { const p = pick(parks), s = pick(p.spots.idle); ok = this.goTo({ b: p, x: s.x, z: s.z }); }
      else if (c === 'bench') { const p = pick(parks), seats = this.freeSeat(p); if (seats.length) { const s = pick(seats); ok = this.goTo({ b: p, x: s.x, z: s.z, seat: s }); } }
      else if (c === 'shop') { const p = pick(shops), s = pick(p.spots.visit); ok = this.goTo({ b: p, x: s.x, z: s.z, face: p.rot * Math.PI / 2 + Math.PI }); this.shopping = true; }
      else if (c === 'pub') { const p = pick(pubs), seats = this.freeSeat(p, ['dining']); if (seats.length) { const st = pick(seats); ok = this.goTo({ b: p, x: st.x, z: st.z, seat: st }); this.drinking = ok; } }
      else if (c === 'church') { const seats = this.freeSeat(church, ['pew']); if (seats.length) { const st = pick(seats); ok = this.goTo({ b: church, x: st.x, z: st.z, seat: st }); } }
      else if (c === 'band') { const a = Math.random() * 6.28, r = 3.6 + Math.random() * 2; ok = this.goTo({ x: band.cx + Math.cos(a) * r, z: band.cz + Math.sin(a) * r, face: Math.atan2(-Math.cos(a), -Math.sin(a)) }); if (ok) this.bandT = 1; }
      else if (c === 'sofa') { const seats = this.freeSeat(this.home, ['sofa']); if (seats.length) { const s = pick(seats); ok = this.goTo({ b: this.home, x: s.x, z: s.z, seat: s }); } }
      else if (c === 'home') { const s = pick(this.home.spots.idle); ok = this.goTo({ b: this.home, x: s.x, z: s.z }); }
      else ok = this.wander();
      if (!ok) this.phase = 2; this.timer = 14 + Math.random() * 28;
      if (c !== 'shop' && this.shopping) { this.shopping = false; this.bag = Math.random() < 0.7; }
      if (c !== 'pub') this.drinking = false; if (c !== 'band') this.bandT = 0;
    }
  }
  wander() {
    const w = this.game.world; const tx = Math.floor(this.x / TILE) + Math.floor((Math.random() - 0.5) * 14), tz = Math.floor(this.z / TILE) + Math.floor((Math.random() - 0.5) * 14);
    if (!w.inBounds(tx, tz) || !w.road[w.idx(tx, tz)]) return false; const [cx, cz] = w.center(tx, tz); return this.goTo({ x: cx, z: cz });
  }
  /** Tourists: browse the shop, sit by the fire, admire (and photograph) buildings, buy souvenirs, look for the famous Sam. */
  doVisit() {
    const g = this.game;
    if (this.phase === 2 && this.visitDo) { const a = this.visitDo; this.visitDo = null; a(); }
    if (this.phase === 0 || (this.phase === 2 && this.timer <= 0)) {
      if (this.visits === undefined) this.visits = 0;
      if (this.visits++ >= 5) { this.leaving = true; return; }
      const done = g.buildings.list.filter((b) => b.state === 'done' && !b.def.special), shops = g.buildings.shops(), seats = done.filter((b) => b.def.park && this.freeSeat(b).length), yard = g.depot;
      const opts = ['sight', 'sight']; if (shops.length) opts.push('shop', 'shop'); if (seats.length) opts.push('sit'); if (yard) opts.push('souvenir'); if (g.mode === 'sim' && Math.hypot(g.player.x - this.x, g.player.z - this.z) < 40 && !this.metSam) opts.push('sam', 'sam');
      const c = pick(opts); let ok = false; this.timer = 12 + Math.random() * 14; const say = (t) => { if (this.mesh.visible) g.social.say(this, t, 2.6); };
      if (c === 'shop') { const b = pick(shops), sp = pick(b.spots.visit.length ? b.spots.visit : b.spots.idle); ok = this.goTo({ b, x: sp.x, z: sp.z, face: b.rot * Math.PI / 2 + Math.PI }); this.shopping = true; this.visitDo = () => { g.economy.earn(8 + Math.floor(Math.random() * 18)); this.bag = true; say(pick(['Lovely shop!', 'I\'ll take two.', 'Do you sell postcards?'])); }; }
      else if (c === 'sit') { const b = pick(seats), st = pick(this.freeSeat(b)); ok = this.goTo({ b, x: st.x, z: st.z, seat: st }); this.visitDo = () => say(pick(['Ahh, that is the life.', 'Smells like woodsmoke.', 'So peaceful here.'])); }
      else if (c === 'souvenir') { ok = this.goTo({ x: yard.doorOut.x + (Math.random() - 0.5) * 2, z: yard.doorOut.z + 1.5, face: yard.rot * Math.PI / 2 + Math.PI }); this.visitDo = () => { g.economy.earn(5 + Math.floor(Math.random() * 10)); this.emote = { upper: 'point', t: 1.6 }; say(pick(['Can I buy a little log as a souvenir?', 'Real hand-chopped timber!', 'How much for a crate of berries?'])); }; }
      else if (c === 'sam') { const p = g.player; ok = this.goTo({ x: p.x + 1.4, z: p.z + 0.8, face: Math.atan2(p.x - this.x, p.z - this.z) }); this.visitDo = () => { this.metSam = true; this.faceGoal = Math.atan2(g.player.x - this.x, g.player.z - this.z); this.emote = { upper: 'wave', t: 2 }; say(pick(['Are you THE Sam?', 'Can I get a photo with you?', 'Everybody back home talks about you!'])); }; }
      else { const b = done.length ? pick(done) : null; if (b) { const a = b.rot * Math.PI / 2, dx = Math.sin(a), dz = Math.cos(a); ok = this.goTo({ x: b.doorOut.x + dx * 3 + (Math.random() - 0.5) * 3, z: b.doorOut.z + dz * 3 + (Math.random() - 0.5) * 3, face: Math.atan2(b.cx - b.doorOut.x - dx * 3, b.cz - b.doorOut.z - dz * 3) }); this.visitDo = () => { this.emote = { upper: Math.random() < 0.5 ? 'phone' : 'point', t: 2.5 }; say(pick([`What a lovely ${b.def.name.toLowerCase()}!`, 'Click! Got it.', 'They built all this by hand?', 'Postcard material, that.'])); }; } else ok = this.wander(); }
      if (!ok) { this.phase = 2; this.visitDo = null; }
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
    if (GATHER[this.role]) return this.doGather(dt);
    if (this.phase === 0) {
      const spots = wp.spots.work, s = spots[this.workSpot % Math.max(1, spots.length)] || wp.spots.idle[0];
      const seat = wp.spots.seat && wp.spots.seat.find((q) => !q.taken && q.kind === 'desk' && Math.hypot(q.x - s.x, q.z - s.z) < 0.7);
      if (!this.goTo(seat ? { b: wp, x: seat.x, z: seat.z, seat } : { b: wp, x: s.x, z: s.z, face: this.workFacing(wp, s) })) this.phase = 2;
    }
  }
  workFacing(b, s) { return b.rot * Math.PI / 2 + Math.PI; }
  doGather(dt) {
    const g = this.game, R = g.resources, gd = GATHER[this.role], wp = this.workplace;
    if (!this.job) {
      this.jobCheck = (this.jobCheck || 0) - dt; if (this.jobCheck > 0) return; this.jobCheck = 2;
      const node = R.findNode(gd.node, wp.cx, wp.cz, this); const stand = node && R.standPoint(node, this);
      if (node && stand) { if (!node.infinite) node.reserved = this; this.job = { type: 'gather', gd, node, stand, step: 0, units: 0, t: 0 }; this.phase = 0; this.idleSet = true; }
      else if (!this.idleSet) { this.idleSet = true; const i = pick(wp.spots.idle.length ? wp.spots.idle : wp.spots.work); this.goTo({ b: wp, x: i.x, z: i.z }); }
      return;
    }
    const j = this.job;
    if (j.step === 0) { if (this.phase === 0) { const fc = Math.atan2(j.node.x - j.stand.x, j.node.z - j.stand.z); if (!this.goTo({ x: j.stand.x, z: j.stand.z, face: fc })) { this.abortJob(); return; } } if (this.phase === 2) j.step = 1; }
    else if (j.step === 1) {
      if (j.node.kind !== 'tree' && !j.node.infinite && j.node.amount < 1) { j.step = j.units > 0 ? 2 : 4; return; }
      if (j.node.kind === 'tree' && !j.node.alive) { j.step = j.units > 0 ? 2 : 4; return; }
      this.working = true; this.faceGoal = Math.atan2(j.node.x - this.x, j.node.z - this.z); j.t += dt;
      if (j.t >= gd.time) { j.t = 0; if (R.take(j.node)) { j.units += gd.per; this.carry = { mat: gd.mat, qty: j.units }; } if (j.units >= gd.cap) j.step = 2; }
    } else if (j.step === 2) {
      const dep = g.depot; if (!dep) { this.abortJob(); return; } if (j.node && j.node.reserved === this) j.node.reserved = null; this.phase = 0;
      if (!this.goTo({ x: dep.doorOut.x, z: dep.doorOut.z, face: dep.rot * Math.PI / 2 + Math.PI })) { this.abortJob(); return; } j.step = 3;
    } else if (j.step === 3) { if (this.phase === 2) { g.economy.add(gd.mat, j.units); g.economy.gathered += j.units; this.carry = null; this.job = null; this.idleSet = false; this.phase = 0; } }
    else if (j.step === 4) { if (j.node.reserved === this) j.node.reserved = null; this.job = null; this.idleSet = false; this.jobCheck = 3; }
  }
  abortJob() {
    const j = this.job; if (!j) return; const g = this.game;
    if (j.type === 'gather') { if (j.node && j.node.reserved === this) j.node.reserved = null; if (j.units > 0 && this.carry) g.economy.add(j.gd.mat, j.units); this.job = null; this.carry = null; this.idleSet = false; return; }
    if (j.type === 'haul' && j.qty) { g.economy.stock[j.mat] += j.qty; j.site.reserved[j.mat] = Math.max(0, (j.site.reserved[j.mat] || 0) - j.qty); }
    if (j.type === 'build') j.site.builders = Math.max(0, (j.site.builders || 0) - 1);
    if (j.type === 'road' && j.plan.reserved === this) j.plan.reserved = null;
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
    } else if (j.type === 'road') {
      const p = j.plan;
      if (!g.roadPlans.has(p.x, p.z)) { this.job = null; this.idleSet = false; return; }
      if (j.step === 0) { if (!this.goTo({ x: p.cx + (Math.random() - 0.5) * 1.4, z: p.cz + (Math.random() - 0.5) * 1.4 })) { this.abortJob(); return; } j.step = 1; }
      else if (j.step === 1 && this.phase === 2) { j.step = 2; j.tool = 'dig'; this.faceGoal = Math.atan2(p.cx - this.x, p.cz - this.z); }
      else if (j.step === 2) { this.working = true; if (g.roadPlans.work(p, dt * 0.9)) { this.job = null; this.idleSet = false; } }
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
    if (this.down > 0) return { lower: 'lie', upper: 'sedated' };
    if (this.sitting) { lower = 'sit'; upper = SEAT_UPPER[this.sitting.kind] || 'idle'; if (upper === 'type' && this.role === 'engineer') upper = 'type'; if (this.sitting.kind === 'bench' && this.mood < 0) upper = 'phone'; }
    else if (this.moved || this.vel > 0.15) lower = 'walk';
    else if (this.working) lower = 'crouch';
    const gj = this.job && this.job.type === 'gather' ? this.job : null;
    if (this.working) { if (gj && gj.step === 1) { upper = gj.gd.upper; lower = ['harvest', 'dig'].includes(upper) ? 'crouch' : 'stand'; } else if (this.job && this.job.tool === 'dig') { upper = 'dig'; lower = 'crouch'; } else upper = this.job && this.job.tool === 'saw' ? 'saw' : this.job && this.job.tool === 'dig' ? 'dig' : 'hammer'; }
    else if (this.carry && !this.sitting) upper = this.carry.mat === 'food' ? 'carry' : 'carry';
    else if (this.bag && lower === 'walk') upper = 'bag';
    else if (!this.sitting && this.activity === 'work' && !this.moved && this.role && this.phase === 2) upper = ROLE_UPPER[this.role] || 'idle';
    else if (this.kind === 'security') upper = this.moved ? 'idle' : 'guard';
    else if (this.shopping && this.phase === 2 && !this.moved) upper = 'browse';
    if (this.kind === 'child' && this.sitting && this.sitting.kind === 'desk') upper = 'read';
    if (this.eating && this.phase === 2 && this.sitting) upper = 'eat';
    if (this.packed > 0) { upper = 'eat'; lower = 'stand'; }
    if (this.chat) { upper = this.chat.laugh > 0 ? 'laugh' : (this.chat.speaker ? 'talk' : 'listen'); speaking = this.chat.speaker; if (lower === 'walk') lower = 'stand'; }
    if (this.frozen) { upper = this.talkingToPlayer && this.game.ui.dialogue && this.game.ui.dialogue.shown < this.game.ui.dialogue.full.length ? 'talk' : 'listen'; lower = this.sitting ? 'sit' : 'stand'; speaking = upper === 'talk'; }
    if (this.kind === 'raider') { if (this.atkT > 0) upper = this.weapon === 'pistol' ? 'aim' : 'strike'; else if (this.rstate === 'loot' && !this.moved) upper = 'carry'; }
    if (this.kind === 'security' && this.fireT > 0) upper = 'aim';
    if (this.sitting && this.drinking && !this.eating && upper === 'eat') upper = 'drink';
    if (this.bandT && !this.moved && !this.chat && lower === 'stand') upper = (this.id + Math.floor(this.game.clock.hour * 4)) % 3 === 0 ? 'clap' : (this.id % 2 ? 'dance' : 'idle');
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
    if (this.dog) this.dog.update(dt);
    if (this.freezeT > 0) dt = 0;
    if (this.fireT > 0) this.fireT -= dt;
    this.updateLook(dt);
    const a = this.decideAnim(), carryCol = this.carry ? ({ timber: 0xb5834a, brick: 0xa8442f, steel: 0x7b8794, glass: 0x7ec8e3 }[this.carry.mat]) : undefined;
    this.anim.update(dt, { ...a, dist: this.moved ? (this.dist || 0) : 0, speed: this.vel, run: this.vel > 3.6 || (this.hurry && this.vel > 2.8), turning: this.turning && !this.moved, lookYaw: this.lookYaw, lookPitch: this.lookPitch, mood: this.mood, tired: this.tired, crateColor: carryCol,
      prop: this.kind === 'raider' && this.down <= 0 ? { handR: this.weapon } : this.kind === 'security' && this.fireT > 0 ? { handR: 'pistol' } : this.bag && a.lower === 'walk' ? { handR: 'bag' } : (this.look.cane && !this.sitting && this.pose !== 'sleep' && (a.upper === 'idle') ? { handR: 'cane' } : undefined), lean: this.vel > 0.5 ? 0 : 0 });
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
    this.computeStyle(); this.game.scene.remove(this.mesh); this.rig = createRig(this.look); this.mesh = this.rig.root; this.anim = new Animator(this.rig, { trait: this.trait, bounce: this.style.bounce, slouch: this.style.slouch, swing: this.style.swing, stride: this.style.stride, fidget: this.style.fidget, sway: this.style.sway });
    this.game.scene.add(this.mesh); this.lowDetail = null; this.sync(0.016, true);
  }
  dispose() { this.standUp(); this.game.scene.remove(this.mesh); if (this.dog) this.dog.dispose(); }
}
