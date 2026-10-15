import * as THREE from 'three';
import { TILE } from '../config.js';
import { ROLES, GATHER } from '../data/buildings.js';
import { makeCart, updateCart } from '../render/Carts.js';
import { shiftOf, inHours } from '../data/hours.js';
import { createRig, HAIR_STYLES_M, HAIR_STYLES_F } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { pick, angleDiff } from '../util.js';
import { Dog } from '../render/Dog.js';
import { makeRide, VEHICLE_SPEED } from '../render/Vehicles.js';
import { character } from '../data/character.js';
import { ALERT_LINES, DOWN_LINES } from '../data/story.js';
import { upperFurniture, levelPlan } from '../world/Levels.js';
import { WALL_H } from '../config.js';
import { seatLift } from '../render/BuildingFactory.js';

let nextId = 1;
const g_say = (s) => s.game.social && s.mesh.visible;
const STYLES = {
  cheerful: { speed: 2.9, bounce: 1.3, slouch: 0.0, swing: 1.25, fidget: 1.3, soc: 0.9, mood: 0.55 },
  grumpy:   { speed: 2.5,  bounce: 0.7, slouch: 0.55, swing: 0.7, fidget: 0.8, soc: 0.3, mood: -0.45 },
  shy:      { speed: 2.55, bounce: 0.85, slouch: 0.6, swing: 0.6, fidget: 1.4, soc: 0.35, mood: 0.1 },
  busy:     { speed: 3.3,  bounce: 1.0, slouch: 0.1, swing: 1.1, fidget: 0.9, soc: 0.4, mood: 0.0 },
};
// what someone can be doing with their arms and still have a cigarette on the go
const SMOKE_OK = new Set(['idle', 'listen', 'talk', 'drink', 'lookaround', 'browse', 'phone', 'clap', 'point', 'tidy', 'broom', 'clipboard', 'hammer', 'saw', 'guard']);
const ROLE_UPPER = { cook: 'saw', carter: 'broom', porter: 'clipboard', mechanic: 'hammer', firefighter: 'tidy', entertainer: 'dj', publican: 'tidy', teacher: 'clipboard', brickmaker: 'saw', smith: 'hammer', shopkeeper: 'tidy', doctor: 'clipboard', guard: 'guard', engineer: 'panel', factory: 'lever', clerk: 'type', builder: 'hammer', baker: 'harvest', fryer: 'saw', vicar: 'read', librarian: 'browse', glassblower: 'panel', farmer: 'harvest', fisher: 'fish', lumberjack: 'saw', quarryman: 'hammer', forager: 'harvest' };
const SEAT_UPPER = { desk: 'type', sofa: 'watch', bench: 'idle', dining: 'eat', waiting: 'read', pew: 'pray' };

/**
 * An NPC citizen ("actor"). Schedule-driven state machine (sleep -> home -> work -> leisure) with
 * seats, conversations, glances, greetings and a procedural animator.
 */
const DRUNK = ['I love you, mate. I really love you.', 'Kebab! Who wants a kebab?', 'Three lions on a shirt... Jules Rimet still gleaming...', 'I\'m not drunk. You\'re drunk.', 'One more! Just one more!', 'Wonderwaaall... la la la...',
  'Where\'s my shoe?', 'Taxi! Oh. We haven\'t got taxis.', 'You\'re my best mate, you are.', 'Who are ya? Who are ya?', 'I could have been a contender.', 'Agadoo-doo-doo...', 'What are YOU looking at?', 'Is it me or is the street moving?'];
/** Who still works on a Sunday: pubs, cafés and hotels (the tourists), the church, the police, the fire brigade, the doctor. */
const SUNDAY = new Set(['hotel', 'church', 'chapel', 'clinic', 'surgery', 'police', 'watchhouse', 'firestation', 'lift', 'cinema', 'arcade', 'leisure', 'bowling', 'snooker', 'wmc', 'nightclub', 'power', 'water', 'harbour', 'newsagent']);
export function sundayShift(b) { return !!b && (SUNDAY.has(b.id) || !!b.def.dining || !!b.def.heals || !!b.def.sunday); }
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
    { const c = character(this.kind, this.age ?? 30); this.quirk = c.quirk; this.bedH = c.bedH; this.wakeH = c.wakeH; this.temper = c.temper; }
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
    const w = this.game.world, wp = []; if (this.game.tracing) this.game.trace(`goTo ${dest.b ? dest.b.def.id : ''} ${Math.round(dest.x)},${Math.round(dest.z)}`);
    if (!Number.isFinite(dest.x) || !Number.isFinite(dest.z)) return false;   // nowhere real to go
    this.standUp(); if (this.comeDown) this.comeDown();
    let sx = this.x, sz = this.z;
    if (this.inside && this.inside !== dest.b) {
      const b = this.inside;
      if (!b.def.open) wp.push(...this.game.buildings.navPath(b, this.x, this.z, b.doorIn.x, b.doorIn.z).map((q, i, a) => (i === a.length - 1 ? { ...q, door: b } : q)), { x: b.doorPos.x, z: b.doorPos.z, exit: true, door: b });
      sx = b.doorOut.x; sz = b.doorOut.z; wp.push({ x: sx, z: sz, exit: true, door: b.def.open ? null : b });
    }
    if (dest.b && dest.b !== this.inside && !dest.b.def.park) {
      const b = dest.b, t = w.findPath(Math.floor(sx / TILE), Math.floor(sz / TILE), b.doorTile.x, b.doorTile.z);
      if (!t) return false;
      wp.push(...w.walkway(t));
      wp.push({ x: b.doorOut.x, z: b.doorOut.z, door: b }, { x: b.doorPos.x, z: b.doorPos.z, enter: b, door: b }, { x: b.doorIn.x, z: b.doorIn.z, door: b });
      if (dest.x !== undefined) wp.push(...this.game.buildings.navPath(b, b.doorIn.x, b.doorIn.z, dest.x, dest.z));
    } else if (dest.b && dest.b === this.inside) {
      wp.push(...this.game.buildings.navPath(dest.b, this.x, this.z, dest.x, dest.z));
    } else {
      const t = w.findPath(Math.floor(sx / TILE), Math.floor(sz / TILE), Math.floor(dest.x / TILE), Math.floor(dest.z / TILE));
      if (!t) return false;
      wp.push(...w.walkway(t));
      wp.push({ x: dest.x, z: dest.z });
    }
    const old = this.dest; if (old && old.seat && old.seat !== dest.seat && old.seat.taken === this && this.sitting !== old.seat) old.seat.taken = null;   // (a seat they were heading for is free again)
    if (dest.seat && !dest.seat.taken) dest.seat.taken = this;   // claimed now, not on arrival: nobody else heads for it (no two on one stool)
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
  freeSeat(b, kinds) { return b && b.spots.seat ? b.spots.seat.filter((s) => (!s.taken || (s.taken.remove === true)) && (!kinds || kinds.includes(s.kind))) : []; }   // (a seat kept by someone who's since left town is free)
  /** What they're drinking: a pint for most in a pub, a glass of wine or a short for some, a mug of tea anywhere else. */
  drinkProp() { const b = this.inside; if (!b || !/tavern|pub|wmc|inn|nightclub|irish|local|hotel|snooker|social/.test(b.id)) return 'mug2'; const r = (this.id * 37) % 10; return this.gender === 'f' && r < 4 ? 'wine' : r === 9 ? 'shortglass' : 'pint'; }

  step(dt) {
    if (!Number.isFinite(this.x) || !Number.isFinite(this.z)) { const b = this.home || this.game.lift, d = b && (b.doorOut || b.doorIn); this.x = d ? d.x : 160; this.z = d ? d.z : 160; this.path = []; this.phase = 0; this.inside = null; this.glide = null; }   // lost (a position that isn't a number): back to their door
    const prevX = this.x, prevZ = this.z; this.moved = false; this.turning = false;
    if (this.freezeT > 0) { this.freezeT -= dt; this.vel = 0; this.dist = 0; return; }
    if (this.down > 0) { this.cycling = false; if (!this.injured) this.down -= dt; this.vel = 0; this.dist = 0; if (this.down <= 0) { this.down = 0; this.recovering = true; } return; }
    if (this.pose === 'sleep') { this.vel = 0; return; }
    if (this.walkWith && this.beside(dt, prevX, prevZ)) return;
    if (this.glide && this.path.length && !this.sitting) this.glide = null;
    if (this.glide) { const k = Math.min(1, dt * 7); this.x += (this.glide.x - this.x) * k; this.z += (this.glide.z - this.z) * k; if (Math.hypot(this.glide.x - this.x, this.glide.z - this.z) < 0.02) this.glide = null; }
    if (this.faceGoal !== undefined && !this.path.length) { const d = angleDiff(this.heading, this.faceGoal); this.heading += Math.max(-9 * dt, Math.min(9 * dt, d)); if (Math.abs(d) < 0.03) this.faceGoal = undefined; else this.turning = true; }
    if (this.frozen || this.chat || this.sitting || !this.path.length) {
      this.cycling = false; this.vel = Math.max(0, this.vel - 9 * dt); if (!this.frozen && !this.chat && !this.path.length && this.phase === 1) this.arrive(); this.dist = Math.hypot(this.x - prevX, this.z - prevZ); return;
    }
    // jammed in a crowd (barely moved for a second while trying to walk)? slip through the others for a moment
    if (this.ghostT > 0) this.ghostT -= dt;
    this.jamT = (this.jamT || 0) + dt; if (this.jamT >= 1) { if (Math.hypot(this.x - (this.jamX ?? this.x), this.z - (this.jamZ ?? this.z)) < 0.45 && this.vel > 0.3) this.ghostT = 2.2; this.jamT = 0; this.jamX = this.x; this.jamZ = this.z; }
    const p = this.path[0], dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz), exact = p.enter || p.exit || this.path.length === 1;
    if (p.door && Math.hypot(this.x - p.door.doorPos.x, this.z - p.door.doorPos.z) < 2.6) p.door.doorUseT = 0.7;   // only open the door while actually going through it
    const want = Math.atan2(dx, dz), dh = angleDiff(this.heading, want), rate = 8;
    this.heading += Math.max(-rate * dt, Math.min(rate * dt, dh));
    const rl = this.rideLevel(); this.cycling = rl >= 0;   // (on a bike; 'riding' means carried: the Lift cage, a train, a car)
    const hurry = this.hurry || this.panic ? 1.55 : 1, max = (this.cycling ? VEHICLE_SPEED[rl] : 1) * (this.game.weather && this.game.weather.slow || 1) * (this.speedK || 1) * this.style.speed * hurry * (this.carry ? 0.8 : 1) * (this.kind === 'security' ? 1.4 : 1) * (this.kind === 'raider' ? 1.1 : 1) * (this.drunk > 0.4 ? 1.1 - this.drunk * 0.35 : 1) * this.pace();
    let target = Math.abs(dh) > 1.1 ? 0.15 : max; if (this.path.length === 1) target = Math.min(target, Math.max(0.5, d * 1.6));
    this.vel += Math.max(-8 * dt, Math.min(5 * dt, target - this.vel));
    let move = this.vel * dt; if (Math.abs(dh) > 1.1) this.turning = true;
    if (d <= Math.max(move, exact ? 0.06 : 0.5)) {
      this.x = p.x; this.z = p.z; this.path.shift(); if (p.enter) this.inside = p.enter; if (p.exit) this.inside = null;
    } else { this.x += Math.sin(this.heading) * move; this.z += Math.cos(this.heading) * move; if (this.drunk > 0.35 && !this.inside && !this.cycling) { const w = Math.sin(this.game.elapsed * 2.1 + this.id) * (this.drunk - 0.25) * 1.4 * move; this.x += Math.cos(this.heading) * w; this.z -= Math.sin(this.heading) * w; } }
    this.moved = true; this.dist = Math.hypot(this.x - prevX, this.z - prevZ);
    if (!this.path.length && this.phase === 1) { this.vel = 0; this.arrive(); }
  }
  /** Walking out with their other half: on the partner's right, matching their pace, so the two can hold hands. Off the
   *  pavement (a doorway ahead, inside, the partner stopped or gone another way) they make their own way to the same place. */
  beside(dt, prevX, prevZ) {
    const p = this.walkWith, w = this.game.world;
    if (!this.walkSide) this.walkT -= dt;
    if (!p || p.remove || p.partner !== this || p.activity !== 'leisure' || this.activity !== 'leisure' || this.dest !== this.walkDest || this.chat || this.frozen || this.sitting || this.walkT < 0) { this.walkWith = null; this.walkSide = false; return false; }
    const d = Math.hypot(p.x - this.x, p.z - this.z), door = p.path.slice(0, 4).some((q) => (q.door || q.enter || q.exit) && Math.hypot(q.x - p.x, q.z - p.z) < 5);
    const ok = !this.inside && !p.inside && !p.riding && !this.riding && !p.cycling && !p.chat && !p.frozen && !p.sitting && !(p.down > 0) && p.phase === 1 && p.path.length > 1 && !door;
    if (!this.walkSide) { if (ok && d < 3) this.walkSide = true; else { this.hurry = d > 2.5; return false; } }
    if (!ok || d > 5) { this.walkSide = false; this.walkWith = null; this.hurry = false; if (!this.goTo(this.walkDest)) this.path = []; return false; }   // (the last stretch on their own: in through the door, to a seat)
    const h = p.heading, fx = Math.sin(h), fz = Math.cos(h), sd = this.walkSd || 1; let tx = p.x + fz * 0.8 * sd, tz = p.z - fx * 0.8 * sd;
    if (w.collides(tx, tz, 0.25)) { if (!w.collides(p.x - fz * 0.8 * sd, p.z + fx * 0.8 * sd, 0.25)) { this.walkSd = -sd; tx = p.x - fz * 0.8 * sd; tz = p.z + fx * 0.8 * sd; } else { tx = p.x - fx * 0.75; tz = p.z - fz * 0.75; } }   // a wall that side: the other side of them, or in single file
    const vx = fx * p.vel + (tx - this.x) * 2.2, vz = fz * p.vel + (tz - this.z) * 2.2, sp = Math.hypot(vx, vz), cap = Math.max(2.6, p.vel * 1.25 + 0.4), k = sp > cap ? cap / sp : 1, nx = this.x + vx * k * dt, nz = this.z + vz * k * dt;
    if (!w.collides(nx, nz, 0.25)) { this.x = nx; this.z = nz; } else if (!w.collides(nx, this.z, 0.25)) this.x = nx; else if (!w.collides(this.x, nz, 0.25)) this.z = nz;
    if (sp * k > 0.2) { const dh = angleDiff(this.heading, Math.atan2(vx, vz)); this.heading += Math.max(-8 * dt, Math.min(8 * dt, dh)); }
    this.vel = sp * k; this.cycling = false; this.dist = Math.hypot(this.x - prevX, this.z - prevZ); this.moved = this.dist > 0.001; return true;
  }
  /** Walking with someone: a touch slower, and slower still while they catch up. */
  pace() { const q = this.partner; if (!q || q.walkWith !== this) return 1; return q.walkSide ? 0.9 : Math.hypot(q.x - this.x, q.z - this.z) > 2.5 ? 0.5 : 0.9; }
  /** Does this sim ride (penny-farthing, bicycle or motorbike) on this stretch? Only outdoors, on longer trips, if they own one. */
  rideLevel() {
    const T = this.game.transport; if (!T || T.bikeLv < 0 || this.walkWith || (this.partner && this.partner.walkWith === this) || this.riding || this.inside || this.path.length < 3 || this.carry || this.kind === 'raider' || this.kind === 'security' || this.crook || this.fight || this.down > 0 || this.age < 13 || this.age > 74) return -1;
    return (this.id * 7) % 10 < 4 ? T.bikeLv : -1;
  }
  /** Beaten to the seat: stand by it instead, a step away from anyone already there (and facing the same way). */
  standAside(seat) {
    const w = this.game.world, others = this.game.population.sims.filter((q) => q !== this && !q.remove && Math.hypot(q.x - seat.x, q.z - seat.z) < 2.5);
    for (let k = 0; k < 10; k++) { const a = Math.random() * Math.PI * 2, r = 0.75 + Math.random() * 0.5, x = seat.x + Math.cos(a) * r, z = seat.z + Math.sin(a) * r; if (w.collides(x, z, 0.25) || others.some((q) => Math.hypot(q.x - x, q.z - z) < 0.6)) continue; this.glide = { x, z }; this.faceGoal = seat.heading; return; }
  }
  arrive() {
    this.phase = 2; const d = this.dest; if (!d) return;
    if (d.seat) { if (d.seat.taken && d.seat.taken !== this) { this.standAside(d.seat); return; } this.sitAt(d.seat); }
    else if (d.face !== undefined) this.faceGoal = d.face;
    this.arrivedAt = this.game.clock.hour;
  }

  // ---------- life ----------
  mealWindow(h) { return (h >= 7 && h < 9) || (h >= 12 && h < 14) || (h >= 18 && h < 20); }
  wantActivity(h) {
    const alert = (this.game.raids && this.game.raids.alert) || this.game.raidNight || this.game.deathmatch;
    if (this.moveJob && this.pose !== 'sleep') return 'transplant';
    if (this.crook) return 'crime';
    if (this.trapped) return 'trapped';   // cut off by a fire (systems/Hazards.js)
    if (this.fleeFire) return 'flee';
    if (this.game.hazards && this.game.hazards.fires.length && (this.pose !== 'sleep' || this.bunk) && !(this.down > 0)) { const H = this.game.hazards, fb = this.role === 'firefighter' ? H.fireFor(this) : H.volunteer(this); if (fb) { this.fireB = fb; return 'firefight'; } }
    if (this.fireB && !(this.game.hazards && this.game.hazards.fires.some((f) => f.b === this.fireB))) this.fireB = null;
    if (this.fight) return 'fight';
    if (this.kind === 'raider') return 'raid';
    if (this.kind === 'guest') return 'guest';   // celebrities and their minders: steered by systems/Guests.js
    if (this.kind === 'visitor') return alert || this.leaving ? 'leave' : 'visit';
    if (this.kind === 'security') return 'guard';
    if (this.leaving) return 'leave';
    if (this.carting) return 'work';   // out with the Carter's Yard cart
    if (this.escort) return 'escorted';   // in the constable's custody, walking where he walks
    if (this.cellsUntil) { const c = this.game.clock; if (c.totalDays * 24 + c.hour < this.cellsUntil) return 'locked'; this.game.crime.release(this); }   // a night in the cells
    if (this.lockedT) { if (this.game.elapsed < this.lockedT) return 'locked'; this.lockedT = 0; this.hidden = false; const lk = this.lockup; if (lk && lk.doorOut) { this.x = lk.doorOut.x; this.z = lk.doorOut.z; } this.lockup = null; }
    // everyone keeps their own hours: early birds, night owls, children in bed by eight
    const bed = this.bedH ?? 22, wake = this.wakeH ?? 6, night = bed >= 24 ? h >= bed - 24 && h < wake : h >= bed || h < wake;
    if (alert) { if (this.role === 'guard' && this.kind === 'resident') return 'defend'; if (!(night && this.home)) return 'shelter'; }
    if (this.role === 'guard' && this.kind === 'resident' && this.workplace && this.workplace.state === 'done' && this.game.crime) { if (this.game.crime.onShift(this, h)) return 'police'; if (this.id % 2 === 0 && h >= 7 && h < 15) return this.home ? 'sleep' : 'leisure'; }   // constables: day or night shift
    { const ev = this.game.celebrations && this.game.celebrations.calling(this, h); if (ev && this.hunger < 85 && !(this.kind === 'child' && h >= 21.5)) return 'event'; }
    if (this.activity === 'eat' && this.eating && !night) return 'eat';
    const onShift = this.activity === 'work' && this.workplace && ((h >= 12 && h < 14) || this.shiftNow) && this.hunger < (this.shiftNow ? 88 : 70);   // (shift workers have a bite at work rather than shut up shop)
    if (!night && !onShift && this.eatCD <= 0 && (this.hunger >= 64 || (this.hunger >= 36 && this.mealWindow(h)))) return 'eat';
    const sun = this.game.clock.isSunday, wp = this.workplace, sh = wp && wp.state === 'done' && this.kind === 'resident' && this.age < 66 && (!sun || sundayShift(wp)) ? shiftOf(wp, this) : null;
    this.shiftNow = !!(sh && inHours(h, sh)); if (this.shiftNow) return this.role === 'firefighter' && (h >= 23 || h < 6.5) && this.game.hazards ? 'bunk' : 'work';   // (the night watch sleeps upstairs at the station till the bells go down)   // pubs, chippies, the nightclub...: their own hours, whatever the time
    if (night) return this.home ? 'sleep' : this.homeless ? 'rough' : 'leisure';   // Sunday: no school, and only the pubs, cafés, hotels, church and emergency services open
    if (this.kind === 'child') { const sc = this.game.buildings.byDef('school')[0]; return sc && !sun && h >= 8.5 && h < 15 ? 'school' : (h < 8 && this.home ? 'home' : 'leisure'); }
    if (h < (this.role === 'builder' ? 7 : 8)) return 'home';
    if (this.age >= 66) return 'leisure';
    const end = this.role === 'builder' ? 18 : 17;
    if (!sh && h < end && this.workplace && this.workplace.state === 'done' && (!sun || sundayShift(this.workplace))) return 'work';
    return 'leisure';
  }
  think(dt) {
    if (this.riding) return;   // in the Lift cage: nothing to decide until the doors open
    const g = this.game, h = g.clock.hour; this.timer -= dt; this.chatCool -= dt;
    this.tired = h >= 21 || h < 6.5; this.eatCD -= dt;
    this.hunger = Math.min(100, this.hunger + dt * g.clock.rate() * (this.pose === 'sleep' ? 1.6 : 6));   // per game hour, so long days don't mean extra meals
    if (this.hunger >= 97) { this.starveT += dt; if (this.starveT > 140 && !this.leaving && this.kind === 'resident') { this.leaving = true; g.messages.push('Lift', `${this.name} has left Sam City, hungry and fed up.`, 'warn'); } } else this.starveT = Math.max(0, this.starveT - dt);
    if (this.mood < -0.6 && this.kind === 'resident' && !this.leaving) { this.sadT += dt; if (this.sadT > 220) { this.leaving = true; g.messages.push('Lift', `${this.name} has packed up and left for good.`, 'warn'); } } else this.sadT = Math.max(0, this.sadT - dt * 0.5);
    // mood drifts around the personality baseline
    this.moodBoost *= Math.exp(-dt * 0.02);
    this.mood = this.style.mood + this.moodBoost + (this.tired ? -0.2 : 0) + (h > 17 && h < 21 ? 0.15 : 0) - (this.activity === 'work' && h > 15 ? 0.1 : 0) - Math.max(0, this.hunger - 60) / 90 - (!this.home && this.kind !== 'visitor' ? 0.3 : 0) + (this.partner ? 0.12 : 0) + ((this.home && this.home.def.homeJoy) || 0) + Math.min(0.2, this.friendCount() * 0.04) + (this.kind !== 'visitor' ? g.buildings.townJoy() + g.economy.rateMood : 0);
    this.smokeHabit(dt); this.salon(dt);
    // a few drinks at the pub: merry, then wobbly, then wanting a kebab and a fight (it wears off by morning)
    if (this.drinking && (this.sitting || (this.phase === 2 && this.inside)) && this.kind === 'resident' && this.age >= 18) this.drunk = Math.min(1, (this.drunk || 0) + dt * 0.011 * (this.trait === 'cheerful' ? 1.4 : this.trait === 'shy' || this.trait === 'busy' ? 0.6 : 1));
    else if (this.drunk > 0) { this.drunk = Math.max(0, this.drunk - dt * (this.pose === 'sleep' ? 0.02 : 0.0025)); if (this.drunk > 0.5 && !this.sitting && !this.chat && this.mesh.visible && !this.inside && Math.random() < dt * 0.05) { g.social.say(this, pick(DRUNK), 2.4); this.emote = { upper: pick(['cheer', 'wave', 'dance']), t: 1.6 }; } }
    if (this.drunk > 0.45 && !this.inside && !this.sitting && !this.chat && !(this.down > 0) && !this.cycling && !this.escort && this.kind !== 'child' && this.mesh.visible) this.tipsy(dt);
    if (this.homeless && this.activity === 'leisure' && !this.chat && this.mesh.visible && !this.sitting && Math.random() < dt * 0.03) { g.social.say(this, pick(this.drunk > 0.4 ? ['WHAT? What are you looking at?', 'They took everything. Everything!', 'It\'s all a set, you know. All of it. Ha!'] : ['Spare some change?', 'Any spare change, love?', 'Big Issue! Big Issue!', 'Got 20p for a cup of tea?', 'Bless you. Have a nice day.']), 2.6); this.emote = { upper: 'wave', t: 1.4 }; }
    if (this.outfit && this.outfitUntil && g.clock.totalDays * 24 + h > this.outfitUntil && this.activity !== 'event') this.wear(null);
    if (this.down > 0) return;
    const tr = g.tracing; if (tr) g.trace('choosing what to do'); const want = this.wantActivity(h); if (tr) g.trace('doing: ' + want);
    if (want !== this.activity) { if (this.chat) g.social.endChat(this); this.endActivity(); this.activity = want; this.phase = 0; this.timer = 0; this.hurry = want === 'work' && h > (this.role === 'builder' ? 7.2 : 8.2) && this.trait !== 'shy' && Math.random() < 0.6; }
    if (this.chat) return;
    // workers take a packed lunch where they stand
    if (this.activity === 'work' && !this.carry && ((h >= 12 && h < 14) || (this.shiftNow && this.hunger >= 60)) && this.hunger >= 36 && (this.packedDay !== g.clock.totalDays || this.shiftNow) && this.eatCD <= 0 && g.economy.stock.food >= 1) { this.packed = 6; this.packedDay = g.clock.totalDays; }
    // properly starving and nowhere to sit: wolf down a sandwich on the spot rather than leave town
    if (this.hunger >= 93 && this.pose !== 'sleep' && !this.carry && !(this.eating && this.phase === 2 && !this.path.length) && !(this.packed > 0) && this.kind !== 'raider' && g.economy.stock.food >= 1) { this.packed = 4; this.eating = false; this.path = []; this.phase = 0; if (this.mesh.visible && Math.random() < 0.3) g.social.say(this, pick(g.ui.adult && this.kind !== 'child' ? ['Starving. Out the way.', 'Sod it, I\'m eating here.', 'Don\'t judge me.'] : ['So hungry...', 'Just a quick bite.']), 2); }
    if (this.packed > 0) { this.packed -= dt; this.working = false; if (this.packed <= 0) { if (g.economy.eatPortion()) { this.hunger = Math.max(0, this.hunger - 62); this.moodBoost += 0.04; } this.eatCD = 30; } return; }
    switch (this.activity) {
      case 'sleep': this.doSleep(); break;
      case 'rough': this.doRough(); break;
      case 'locked': break;
      case 'escorted': this.game.crime.followCop(this, dt); break;
      case 'eat': this.doEat(dt); break;
      case 'school': this.doSchool(); break;
      case 'home': this.doHome(); break;
      case 'work': this.doWork(dt); break;
      case 'leisure': this.doLeisure(); break;
      case 'event': this.doEvent(); break;
      case 'visit': this.doVisit(); break;
      case 'shelter': this.doShelter(); break;
      case 'raid': this.game.raids.drive(this, dt); break;
      case 'crime': this.game.crime.driveCrook(this, dt); break;
      case 'transplant': this.game.resources.driveMove(this, dt); break;
      case 'fight': this.game.crime.driveFight(this, dt); break;
      case 'police': this.game.crime.driveCop(this, dt); break;
      case 'firefight': this.game.hazards.driveCrew(this, dt); break;
      case 'flee': this.game.hazards.driveFlee(this, dt); break;
      case 'bunk': this.game.hazards.bunk(this); break;
      case 'trapped': this.panic = true; this.path = []; break;
      case 'defend': break;
      case 'leave': this.doLeave(dt); break;
      default: break;
    }
    if (this.phase === 2 && !this.upstairs && !this.path.length && !this.sitting && (this.activity === 'work' || this.activity === 'home') && (this.upT = (this.upT || 0) - dt) <= 0) { this.upT = 8; this.goUpstairs(); }
    if (this.hurry && this.activity !== 'work' && this.activity !== 'firefight' && this.activity !== 'flee') this.hurry = false;   // (people run to a fire, and away from one)
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
  /** Knocked to the ground. serious: badly hurt, and stays down until somebody comes to help (systems/Rescue.js). */
  knockDown(sec, serious = false) {
    if (serious && this.kind !== 'raider' && this.kind !== 'guest') this.injured = true;
    if (this.down > 0 || this.kind === 'raider') return; const g = this.game;
    if (g.buildings.count('clinic') > 0) sec *= 0.55;
    this.abortJob(); this.standUp(); this.path = []; this.chat && g.social.endChat(this); this.carry = null; this.down = sec; this.moodBoost -= 0.25; this.packed = 0; this.eating = false; this.phase = 0;
    if (this.mesh.visible) g.social.say(this, pick(DOWN_LINES), 2);
  }
  endActivity() {
    this.panic = false; this.comeDown(); if (this.bunk) { this.bunk = false; this.hidden = false; this.woke = this.game.elapsed; } { const dd = this.dest; if (dd && dd.seat && dd.seat.taken === this && this.sitting !== dd.seat) dd.seat.taken = null; } if (this.roughAt) { const st = this.roughAt.seat; if (st && st.taken === this) st.taken = null; this.roughAt = null; this.roughLie = undefined; } if (this.bucketMesh && this.game.hazards) this.game.hazards.dropBucket(this); this.run = null; this.walkWith = null; this.walkSide = false;   // (up off the bench or out of the doorway; the bucket put down)   // (up out of a bunk at the fire station: down the pole)
    if (this.pose === 'sleep') { this.pose = 'stand'; const s = this.bedSpot; if (s) { this.x = s.ax; this.z = s.az; } this.bedSpot = null; this.moodBoost -= 0.0; }
    this.standUp(); this.abortJob(); this.bag = false; this.drinking = false; this.bandT = 0; this.served = false; this.browseT = 0; this.svc = null; if (this.order && this.game.service) this.game.service.release(this);
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
      this.eating = true; this.eatTimer = 9 + Math.random() * 3; this.mealDone = false; this.served = false;
    } else if (this.phase === 2 && this.eating) {
      if (g.service && g.service.holdMeal(this)) return;   // waiting to be served (or for the bill)
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
  /**
   * Sleeping rough: a park bench, their own patch under a tree, or a shop doorway with a bit of cardboard. Each finds a
   * spot nobody else has (never two in one doorway), and lies on the ground or along the bench, not at bed height.
   */
  doRough() {
    const g = this.game;
    if (this.phase === 0) {
      const taken = g.population.sims.filter((q) => q !== this && q.roughAt && !q.remove).map((q) => q.roughAt), free = (x, z) => !taken.some((q) => Math.hypot(q.x - x, q.z - z) < 1.8);
      const opts = [], near = (x, z) => Math.hypot(x - this.x, z - this.z);
      for (const b of g.buildings.list) {
        if (b.state !== 'done') continue;
        if (b.def.park && b.spots.seat) for (const st of b.spots.seat) if (st.kind === 'bench' && !st.taken && free(st.x, st.z)) opts.push({ x: st.x, z: st.z, h: st.heading + Math.PI / 2, lieH: 0.52, seat: st, d: near(st.x, st.z) });
        if ((b.def.shopping || b.def.dining) && b.doorOut) for (const side of [-1, 1]) { const [x, z] = b.toWorld(side * Math.min(1.7, b.def.w * 2 - 0.8), b.def.d * 2 + 0.75); if (free(x, z) && !g.world.collides(x, z, 0.3)) opts.push({ x, z, h: b.rot * Math.PI / 2 + Math.PI / 2, lieH: 0.14, d: near(x, z) + 4 }); }
      }
      for (const t of g.terrain.trees) { if (!t.alive || near(t.x, t.z) > 70) continue; const a = (t.idx * 2.39) % 6.28, x = t.x + Math.cos(a) * 1.4, z = t.z + Math.sin(a) * 1.4; if (free(x, z) && !g.world.collides(x, z, 0.4)) opts.push({ x, z, h: a, lieH: 0.14, d: near(x, z) + 10 }); }
      opts.sort((a, b) => a.d - b.d); const spot = pick(opts.slice(0, 5));
      if (!spot || !this.goTo({ x: spot.x, z: spot.z })) { this.phase = 2; return; }
      this.roughAt = spot; if (spot.seat) spot.seat.taken = this;
    } else if (this.phase === 2 && !this.path.length && this.pose !== 'sleep') {
      const sp = this.roughAt; if (sp) { this.x = sp.x; this.z = sp.z; this.heading = sp.h; this.roughLie = sp.lieH; }
      this.pose = 'sleep'; this.vel = 0;
    }
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
      const fe = (this.game.events && this.game.events.fete) || (this.game.celebrations && this.game.celebrations.market);
      if (fe && Math.random() < 0.75) { const a = Math.random() * 6.28, r = 2.5 + Math.random() * 3.5; if (this.goTo({ x: fe.x + Math.cos(a) * r, z: fe.z + Math.sin(a) * r, face: Math.atan2(-Math.cos(a), -Math.sin(a)) })) { this.timer = 20 + Math.random() * 25; return; } }
      const g = this.game, opts = [];
      const parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done' && b.spots.idle.length), shops = g.buildings.shops(), h = g.clock.hour, adult = this.kind !== 'child';
      const pubs = adult ? g.buildings.diners().filter((b) => this.freeSeat(b, ['dining']).length) : [], church = g.buildings.church(), band = g.buildings.byDef('bandstand')[0];
      if (parks.length) opts.push('park', 'park', 'bench'); if (shops.length) opts.push('shop', 'shop'); if (this.home && this.home.state === 'done') opts.push('home', 'sofa'); opts.push('street', 'street');
      if (pubs.length && h >= 17) opts.push('pub', 'pub', 'pub');
      if (g.transport && Object.values(g.transport.lines).some((L) => L && L.kind !== 'sky') && this.kind !== 'visitor' && h >= 8 && h < 20) opts.push('train', 'train');   // a trip on the railway or monorail
      const qk = this.quirk && this.quirk.leisure, home = this.home && this.home.state === 'done' && this.home.spots.idle.length ? this.home : null, have = { park: parks.length, pub: pubs.length, shop: shops.length, home: home ? 1 : 0 }; if (qk && adult && have[qk] !== 0) opts.push(qk, qk, qk); this.busk = false; this.jogging = false; if (church && g.clock.isSunday && h >= 9 && h < 12) opts.push('church', 'church', 'church', 'church'); if (pubs.length && g.clock.isSunday && h >= 12 && h < 17) opts.push('pub', 'pub', 'pub'); if (band && h >= 16 && h < 21) opts.push('band', 'band');   // (and on Sundays: dinner at the pub, or the beer garden)   // (a quirk with nowhere to go, a homebody with no home, an early bird with no park: something else)
      const c = pick(opts); let ok = false;
      if (this.partner && !this.partner.sleeping && this.partner.activity === 'leisure' && this.partner.dest && (this.partner.inside === null || this.partner.inside === this.inside) && Math.random() < 0.55) { const p = this.partner, d = p.dest, ax = (Math.random() - 0.5) * 2.4, az = (Math.random() - 0.5) * 2.4, wd = { b: d.b, x: d.x + ax, z: d.z + az }; ok = this.goTo(wd); if (ok) { this.timer = 14 + Math.random() * 25; this.hurry = false; if (p.phase === 1 && p.path.length > 4 && Math.hypot(p.x - this.x, p.z - this.z) < 14) { this.walkWith = p; this.walkDest = wd; this.walkT = 30; this.walkSide = false; p.hurry = false; } return; } }   // (going out together: they'll walk there side by side)
      if (this.kind === 'child') this.hurry = Math.random() < 0.6;
      if (c === 'jog' || c === 'busk' || c === 'watch') {   // quirks: a run round the streets, a song on the corner, staring at the sky
        const w = g.world, T = 8; for (let i = 0; i < 6 && !ok; i++) { const x = this.x + (Math.random() - 0.5) * (c === 'jog' ? 120 : 50), z = this.z + (Math.random() - 0.5) * (c === 'jog' ? 120 : 50), tx = Math.floor(x / T), tz = Math.floor(z / T); if (w.inBounds(tx, tz) && (w.road[w.idx(tx, tz)] || c === 'watch')) ok = this.goTo({ x: (tx + 0.5) * T, z: (tz + 0.5) * T }); }
        if (ok) { this.jogging = c === 'jog'; this.hurry = c === 'jog'; this.busk = c; this.timer = c === 'jog' ? 4 : 30 + Math.random() * 30; }
      }
      else if (c === 'park' && parks.length) { const p = pick(parks), s = pick(p.spots.idle); ok = this.goTo({ b: p, x: s.x, z: s.z }); }
      else if (c === 'bench' && parks.length) { const p = pick(parks), seats = this.freeSeat(p); if (seats.length) { const s = pick(seats); ok = this.goTo({ b: p, x: s.x, z: s.z, seat: s }); } }
      else if (c === 'shop') { const p = pick(shops); this.shopB = p; this.cutT = 0; this.cutDone = false; const s = p && p.spots && pick(p.spots.visit || []); if (s) { ok = this.goTo({ b: p, x: s.x, z: s.z, face: p.rot * Math.PI / 2 + Math.PI }); this.shopping = true; } }
      else if (c === 'pub') { const p = pick(pubs), seats = this.freeSeat(p, ['dining']); if (seats.length) { const st = pick(seats); ok = this.goTo({ b: p, x: st.x, z: st.z, seat: st }); this.drinking = ok; } }
      else if (c === 'church' && church) { const seats = this.freeSeat(church, ['pew']); if (seats.length) { const st = pick(seats); ok = this.goTo({ b: church, x: st.x, z: st.z, seat: st }); if (ok && Math.random() < 0.7) this.wear('sunday', g.clock.totalDays * 24 + 15); } }
      else if (c === 'train') { ok = g.transport.planTrip(this); if (ok) this.timer = 200; }
      else if (c === 'band' && band) { const a = Math.random() * 6.28, r = 3.6 + Math.random() * 2; ok = this.goTo({ x: band.cx + Math.cos(a) * r, z: band.cz + Math.sin(a) * r, face: Math.atan2(-Math.cos(a), -Math.sin(a)) }); if (ok) this.bandT = 1; }
      else if (c === 'sofa' && home) { const seats = this.freeSeat(home, ['sofa']); if (seats.length) { const s = pick(seats); ok = this.goTo({ b: this.home, x: s.x, z: s.z, seat: s }); } }
      else if (c === 'home' && home) { const s = pick(home.spots.idle); ok = this.goTo({ b: home, x: s.x, z: s.z }); }
      else ok = this.wander();
      if (!ok) this.phase = 2; this.timer = 14 + Math.random() * 28;
      if (c !== 'shop' && this.shopping) { this.shopping = false; this.bag = Math.random() < 0.7; }
      if (c !== 'pub') this.drinking = false; if (c !== 'band') this.bandT = 0;
      if (ok && adult && ['park', 'bench', 'pub', 'shop', 'band', 'church', 'street'].includes(c)) this.invite();
    }
  }
  /** Going out: their other half, at a loose end close by, sometimes comes along. */
  invite() {
    const q = this.partner; if (!q || q.remove || q.kind !== 'resident' || this.kind !== 'resident' || q.activity !== 'leisure' || q.phase === 1 || q.chat || q.sleeping || q.walkWith || this.walkWith || q.down > 0 || q.frozen || q.trip || q.inside !== this.inside || this.path.length < 5 || Math.random() > 0.45) return;
    if (Math.hypot(q.x - this.x, q.z - this.z) < 12) q.tagAlong(this);
  }
  tagAlong(p) {
    const d = p.dest; if (!d) return false; let wd = null;
    if (d.seat && d.b) { const s = this.freeSeat(d.b, [d.seat.kind]).filter((st) => st !== d.seat && Math.hypot(st.x - d.seat.x, st.z - d.seat.z) < 3.2).sort((u, v) => Math.hypot(u.x - d.seat.x, u.z - d.seat.z) - Math.hypot(v.x - d.seat.x, v.z - d.seat.z))[0]; if (s) wd = { b: d.b, x: s.x, z: s.z, seat: s }; }   // (the next seat along)
    if (!wd) { const a = Math.random() * 6.28; wd = { b: d.b, x: d.x + Math.cos(a) * 0.9, z: d.z + Math.sin(a) * 0.9, face: d.face }; }
    if (!this.goTo(wd)) return false;
    this.shopping = false; this.drinking = !!(wd.seat && p.drinking); this.bandT = p.bandT; this.busk = false; this.jogging = false; this.hurry = false; this.timer = p.timer;
    this.walkWith = p; this.walkDest = wd; this.walkT = 30; this.walkSide = false; p.hurry = false; return true;
  }
  /** A wedding guest, one of the happy couple, or in the Bonfire Night crowd. */
  doEvent() {
    const ev = this.game.celebrations.calling(this, this.game.clock.hour); if (!ev) return;
    if (this.phase === 0 || (this.phase === 2 && this.timer <= 0 && !(ev.hold && ev.hold(this)))) { this.timer = 20 + Math.random() * 25; const d = ev.spot(this); if (!d || !this.goTo(d)) this.phase = 2; }
  }
  wander() {
    const w = this.game.world; const tx = Math.floor(this.x / TILE) + Math.floor((Math.random() - 0.5) * 14), tz = Math.floor(this.z / TILE) + Math.floor((Math.random() - 0.5) * 14);
    if (!w.inBounds(tx, tz) || !w.road[w.idx(tx, tz)]) return false; const [cx, cz] = w.center(tx, tz); return this.goTo({ x: cx, z: cz });
  }
  /** Tourists: browse the shop, sit by the fire, admire (and photograph) buildings, buy souvenirs, look for the famous Sam. */
  doVisit() {
    const g = this.game;
    if (this.phase === 2 && this.visitDo) { const a = this.visitDo; this.visitDo = null; g.trace('visit: at the spot'); a(); }
    if (this.phase === 0 || (this.phase === 2 && this.timer <= 0)) {
      if (this.visits === undefined) this.visits = 0;
      if (this.visits++ >= 5) { this.leaving = true; return; }
      const done = g.buildings.list.filter((b) => b.state === 'done' && !b.def.special), shops = g.buildings.shops(), seats = done.filter((b) => b.def.park && this.freeSeat(b).length), yard = g.depot;
      const opts = ['sight', 'sight']; if (shops.length) opts.push('shop', 'shop'); if (seats.length) opts.push('sit'); if (yard) opts.push('souvenir'); if (g.mode === 'sim' && Math.hypot(g.player.x - this.x, g.player.z - this.z) < 40 && !this.metSam) opts.push('sam', 'sam');
      const c = pick(opts); let ok = false; this.timer = 12 + Math.random() * 14; if (g.tracing) g.trace('visit: off to ' + c); const say = (t) => { if (this.mesh.visible) g.social.say(this, t, 2.6); };
      if (c === 'shop') { const b = pick(shops), sp = pick(b.spots.visit.length ? b.spots.visit : b.spots.idle); ok = this.goTo({ b, x: sp.x, z: sp.z, face: b.rot * Math.PI / 2 + Math.PI }); this.shopping = true; this.visitDo = () => { g.economy.earn(8 + Math.floor(Math.random() * 18), 'Visitors (tourism)'); this.bag = true; say(pick(['Lovely shop!', 'I\'ll take two.', 'Do you sell postcards?'])); }; }
      else if (c === 'sit') { const b = pick(seats), st = pick(this.freeSeat(b)); ok = this.goTo({ b, x: st.x, z: st.z, seat: st }); this.visitDo = () => say(pick(['Ahh, that is the life.', 'Smells like woodsmoke.', 'So peaceful here.'])); }
      else if (c === 'souvenir') { ok = this.goTo({ x: yard.doorOut.x + (Math.random() - 0.5) * 2, z: yard.doorOut.z + 1.5, face: yard.rot * Math.PI / 2 + Math.PI }); this.visitDo = () => { g.economy.earn(5 + Math.floor(Math.random() * 10), 'Visitors (tourism)'); this.emote = { upper: 'point', t: 1.6 }; say(pick(['Can I buy a little log as a souvenir?', 'Real hand-chopped timber!', 'How much for a crate of berries?'])); }; }
      else if (c === 'sam') { const p = g.player; ok = this.goTo({ x: p.x + 1.4, z: p.z + 0.8, face: Math.atan2(p.x - this.x, p.z - this.z) }); this.visitDo = () => { this.metSam = true; this.faceGoal = Math.atan2(g.player.x - this.x, g.player.z - this.z); this.emote = { upper: 'wave', t: 2 }; say(pick(['Are you THE Sam?', 'Can I get a photo with you?', 'Everybody back home talks about you!'])); }; }
      else { const b = done.length ? pick(done) : null; if (b) { const a = b.rot * Math.PI / 2, dx = Math.sin(a), dz = Math.cos(a); ok = this.goTo({ x: b.doorOut.x + dx * 3 + (Math.random() - 0.5) * 3, z: b.doorOut.z + dz * 3 + (Math.random() - 0.5) * 3, face: Math.atan2(b.cx - b.doorOut.x - dx * 3, b.cz - b.doorOut.z - dz * 3) }); this.visitDo = () => { this.emote = { upper: Math.random() < 0.5 ? 'phone' : 'point', t: 2.5 }; say(pick([`What a lovely ${b.def.name.toLowerCase()}!`, 'Click! Got it.', 'They built all this by hand?', 'Postcard material, that.'])); }; } else ok = this.wander(); }
      if (!ok) { this.phase = 2; this.visitDo = null; }
    }
  }
  doLeave(dt = 0.1) {
    const g = this.game, lift = g.lift, R = g.liftRides; if (this.riding) return;
    if (!R || !R.ok()) { if (this.phase === 0) this.goTo({ b: lift, x: lift.doorIn.x, z: lift.doorIn.z }); if (this.inside === lift && !this.path.length) this.remove = true; return; }
    // walk to the edge of the shaft, wait for the cage, then ride it down
    if (this.phase === 0) { const sp = R.join(this); if (!this.goTo({ x: sp.x, z: sp.z, face: sp.face })) this.phase = 2; }
    if (this.phase === 2 && !this.path.length) this.atLift = true;
    this.leaveT = (this.leaveT || 0) + dt; if (!this.atLift && this.leaveT > 60 && this.kind === 'visitor') this.remove = true;   // couldn't find the way: they've gone home anyway
  }
  doWork(dt) {
    const wp = this.workplace;
    if (this.role === 'builder') return this.doBuild(dt);
    if (GATHER[this.role]) return this.doGather(dt);
    if (this.phase === 0 && !this.order) {
      // serving staff: the first behind the counters, cooks in the kitchen
      const C = wp.spots.counters || [], K = wp.spots.kitchen || [], cookish = this.role === 'cook' || this.role === 'fryer', crew = wp.workers.filter((w) => !((w.role === 'cook' || w.role === 'fryer') && K.length)), i = crew.indexOf(this);
      if (cookish && K.length) { const k = K[wp.workers.filter((w) => w.role === this.role).indexOf(this) % K.length]; if (this.goTo({ b: wp, x: k.x, z: k.z, face: this.workFacing(wp, k) })) return; }
      if (i >= 0 && i < C.length) { const c = C[i]; if (this.goTo({ b: wp, x: c.staff.x, z: c.staff.z, face: Math.atan2(c.cust.x - c.staff.x, c.cust.z - c.staff.z) })) return; }
      const spots = wp.spots.work, s = spots[this.workSpot % Math.max(1, spots.length)] || wp.spots.idle[0];
      const seat = wp.spots.seat && wp.spots.seat.find((q) => !q.taken && q.kind === 'desk' && Math.hypot(q.x - s.x, q.z - s.z) < 0.7);
      if (!this.goTo(seat ? { b: wp, x: seat.x, z: seat.z, seat } : { b: wp, x: s.x, z: s.z, face: this.workFacing(wp, s) })) this.phase = 2;
    }
  }
  workFacing(b, s) { return b.rot * Math.PI / 2 + Math.PI; }
  /** Where a camp (or quarry, or farm) stacks what its workers bring in: beside the building, out front. */
  yardSpot(wp) {
    if (wp._yard) return wp._yard; const w = this.game.world, W = wp.def.w * 2, D = wp.def.d * 2;
    const C = [[W + 1.3, D - 1.2], [-W - 1.3, D - 1.2], [W - 1.0, D + 1.5], [-W + 1.0, D + 1.5]].map(([lx, lz]) => wp.toWorld(lx, lz));
    const ok = ([x, z]) => { const [tx, tz] = w.tileOf(x, z), o = w.inBounds(tx, tz) && w.buildingAt(tx, tz); return w.inBounds(tx, tz) && (!o || o === wp) && !w.road[w.idx(tx, tz)] && !w.collides(x, z, 0.5); };
    const [x, z] = C.find(ok) || C[2]; return (wp._yard = { x, z });
  }
  /** The pile at that spot (piles come back from a save without knowing whose they are: claimed again here). */
  yardPile(wp) { const y = this.yardSpot(wp), p = this.game.piles.list.find((q) => q.yard === wp || (!q.yard && Math.hypot(q.x - y.x, q.z - y.z) < 1.2)); if (p) p.yard = wp; return p || null; }
  /**
   * Gatherers (lumberjacks, quarrymen, foragers...) work from their camp: fill up from one tree or rock after another
   * nearby, stack the load at the camp, and when the stack's big enough one of them barrows it to the Stockyard
   * (two dozen at a go). A camp right by the Stockyard just takes it straight there.
   */
  doGather(dt) {
    const g = this.game, R = g.resources, gd = GATHER[this.role], wp = this.workplace;
    if (!this.job) {
      this.jobCheck = (this.jobCheck || 0) - dt; if (this.jobCheck > 0) return; this.jobCheck = 2;
      { const yp = g.depot && this.yardPile(wp); if (yp && g.piles.total(yp) >= 18 && !g.population.sims.some((q) => q.job && q.job.type === 'yardhaul' && q.job.pile === yp)) { this.job = { type: 'yardhaul', pile: yp, step: 0 }; this.phase = 0; this.idleSet = true; return; } }
      const node = R.findNode(gd.node, wp.cx, wp.cz, this); const stand = node && R.standPoint(node, this);
      if (node && stand) { if (!node.infinite) node.reserved = this; this.job = { type: 'gather', gd, node, stand, step: 0, units: 0, t: 0 }; this.phase = 0; this.idleSet = true; }
      else if (gd.node === 'field' && wp.fieldNodes && wp.fieldNodes.length) {   // nothing ripe: tend the crops (weeding, watering), which helps them along
        const f = pick(wp.fieldNodes.filter((n) => !n.reserved) || []); const st = f && R.standPoint(f, this);
        if (f && st) { f.reserved = this; this.job = { type: 'gather', tend: true, gd, node: f, stand: st, step: 0, units: 0, t: 0, dur: 8 + Math.random() * 8 }; this.phase = 0; this.idleSet = true; }
      }
      else if (!this.idleSet) { this.idleSet = true; const i = pick(wp.spots.idle.length ? wp.spots.idle : wp.spots.work); if (!this.goTo({ b: wp, x: i.x, z: i.z })) this.phase = 2; }
      return;
    }
    const j = this.job;
    if (j.type === 'yardhaul') {   // the camp's stack, two dozen at a time on the barrow, to the Stockyard
      const dep = g.depot, p = j.pile; if (!dep || (j.step === 0 && !g.piles.list.includes(p))) { this.abortJob(); return; }
      if (j.step === 0) { if (this.phase === 0 && !this.goTo({ x: p.x, z: p.z + 1.0 })) { this.abortJob(); return; } if (this.phase === 2) { const [mat, n] = Object.entries(p.items).sort((a, b) => b[1] - a[1])[0] || []; if (!mat) { this.abortJob(); return; } const q = Math.min(24, n); p.items[mat] -= q; if (p.items[mat] <= 0) delete p.items[mat]; if (g.piles.total(p) <= 0) g.piles.remove(p); else g.piles.rebuild(p); j.mat = mat; j.qty = q; this.carry = { mat, qty: q }; this.phase = 0; if (!this.goTo({ x: dep.doorOut.x, z: dep.doorOut.z, face: dep.rot * Math.PI / 2 + Math.PI })) { this.abortJob(); return; } j.step = 1; } }
      else if (j.step === 1 && this.phase === 2) { g.economy.add(j.mat, j.qty); this.carry = null; this.job = null; this.idleSet = false; this.phase = 0; this.moodBoost += 0.02; }
      return;
    }
    if (j.step === 0) { if (this.phase === 0) { const fc = Math.atan2(j.node.x - j.stand.x, j.node.z - j.stand.z); if (!this.goTo({ x: j.stand.x, z: j.stand.z, face: fc })) { this.abortJob(); return; } } if (this.phase === 2) j.step = 1; }
    else if (j.step === 1) {
      if (j.tend) { this.working = true; this.faceGoal = Math.atan2(j.node.x - this.x, j.node.z - this.z); j.node.amount = Math.min(j.node.max, j.node.amount + dt * 0.04); j.t += dt; if (j.t >= j.dur) { j.step = 4; } return; }
      if ((j.node.kind !== 'tree' && !j.node.infinite && j.node.amount < 1) || (j.node.kind === 'tree' && !j.node.alive)) {   // this one's done: on to the next one close by until the load's full
        if (j.units > 0 && j.units < gd.cap * (wp.def.carry || 1) && !j.tend) { if (j.node.reserved === this) j.node.reserved = null; const nx = R.findNode(gd.node, j.node.x, j.node.z, this), st = nx && Math.hypot(nx.x - j.node.x, nx.z - j.node.z) < 22 && R.standPoint(nx, this); if (st) { if (!nx.infinite) nx.reserved = this; j.node = nx; j.stand = st; j.step = 0; this.phase = 0; return; } }
        j.step = j.units > 0 ? 2 : 4; return;
      }
      this.working = true; this.faceGoal = Math.atan2(j.node.x - this.x, j.node.z - this.z); j.t += dt;
      if (j.t >= gd.time / (wp.def.toolSpeed || 1)) { j.t = 0; if (R.take(j.node)) { j.units += gd.per; this.carry = { mat: gd.mat, qty: j.units }; } if (j.units >= gd.cap * (wp.def.carry || 1)) j.step = 2; }
    } else if (j.step === 2) {   // the Stockyard if it's handy, else the stack at the camp
      const dep = g.depot, y = this.yardSpot(wp); if (j.node && j.node.reserved === this) j.node.reserved = null; this.phase = 0;
      j.toYard = !dep || Math.hypot(this.x - dep.doorOut.x, this.z - dep.doorOut.z) > Math.hypot(this.x - y.x, this.z - y.z) + 20;
      const to = j.toYard ? { x: y.x + (Math.random() - 0.5) * 0.6, z: y.z + 1.0 } : { x: dep.doorOut.x, z: dep.doorOut.z, face: dep.rot * Math.PI / 2 + Math.PI };
      if (!this.goTo(to)) { if (!dep) { this.abortJob(); return; } j.toYard = false; if (!this.goTo({ x: dep.doorOut.x, z: dep.doorOut.z })) { this.abortJob(); return; } } j.step = 3;
    } else if (j.step === 3) { if (this.phase === 2) {
      if (j.toYard) { const y = this.yardSpot(wp), p = g.piles.add(y.x, y.z, { [gd.mat]: j.units }); p.yard = wp; } else g.economy.add(gd.mat, j.units);
      g.economy.gathered += j.units; this.carry = null; this.job = null; this.idleSet = false; this.phase = 0; } }
    else if (j.step === 4) { if (j.node.reserved === this) j.node.reserved = null; this.job = null; this.idleSet = false; this.jobCheck = 3; }
  }
  abortJob() {
    const j = this.job; if (!j) return; const g = this.game;
    if (j.type === 'gather') { if (j.node && j.node.reserved === this) j.node.reserved = null; if (j.units > 0 && this.carry) g.economy.add(j.gd.mat, j.units); this.job = null; this.carry = null; this.idleSet = false; return; }
    if (j.type === 'yardhaul') { if (j.qty && this.carry) g.piles.add(this.x, this.z, { [j.mat]: j.qty }); this.job = null; this.carry = null; this.idleSet = false; return; }   // (set down where they stood: the builders will fetch it)
    if (j.type === 'haul' && j.qty) { g.economy.stock[j.mat] += j.qty; j.site.reserved[j.mat] = Math.max(0, (j.site.reserved[j.mat] || 0) - j.qty); }
    if (j.type === 'build') j.site.builders = Math.max(0, (j.site.builders || 0) - 1);
    if (j.type === 'road' && j.plan.reserved === this) j.plan.reserved = null;
    if (j.type === 'fetch') { if (j.got && this.carry) g.economy.add(j.mat, j.got); else if (j.pile) j.pile.reserved = Math.max(0, (j.pile.reserved || 0) - j.qty); }
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
    } else if (j.type === 'fetch') {
      const dep = g.depot, p = j.pile; if (!dep) { this.abortJob(); return; }
      if (j.step === 0) { if (!g.piles.list.includes(p)) { this.job = null; this.idleSet = false; return; } if (!this.goTo({ x: p.x + (Math.random() - 0.5) * 1.2, z: p.z + 1.1, face: Math.PI })) { this.abortJob(); return; } j.step = 1; }
      else if (j.step === 1 && this.phase === 2) {
        p.reserved = Math.max(0, (p.reserved || 0) - j.qty); j.qty0 = j.qty; j.qty = 0; const best = g.piles.list.includes(p) && Object.entries(p.items).sort((a, b) => b[1] - a[1])[0];
        if (!best) { this.job = null; this.idleSet = false; return; }
        const n = Math.min(j.qty0, best[1]); p.items[best[0]] -= n; if (p.items[best[0]] <= 0) delete p.items[best[0]]; if (g.piles.total(p) <= 0) g.piles.remove(p); else g.piles.rebuild(p);
        j.mat = best[0]; j.got = n; this.carry = { mat: j.mat, qty: n }; this.phase = 0; if (!this.goTo({ x: dep.doorOut.x, z: dep.doorOut.z, face: dep.rot * Math.PI / 2 + Math.PI })) { this.abortJob(); return; } j.step = 2;
      } else if (j.step === 2 && this.phase === 2) { g.economy.add(j.mat, j.got); this.carry = null; this.job = null; this.idleSet = false; this.phase = 0; this.moodBoost += 0.02; }
    } else if (j.type === 'road') {
      const p = j.plan;
      if (!g.roadPlans.has(p.x, p.z)) { this.job = null; this.idleSet = false; return; }
      if (j.step === 0) { if (!this.goTo({ x: p.cx + (Math.random() - 0.5) * 1.4, z: p.cz + (Math.random() - 0.5) * 1.4 })) { this.abortJob(); return; } j.step = 1; }
      else if (j.step === 1 && this.phase === 2) { j.step = 2; j.tool = 'dig'; this.faceGoal = Math.atan2(p.cx - this.x, p.cz - this.z); }
      else if (j.step === 2) { this.working = true; j.tool = p.felling ? 'chop' : 'dig'; if (g.roadPlans.work(p, dt * 0.9 * (wp.def.buildSpeed || 1))) { this.job = null; this.idleSet = false; } else { j.recheck = (j.recheck || 0) - dt; if (j.recheck <= 0) { j.recheck = 5; const f = c.focus(); if (f && f.kind !== 'roads' && (f.prio ?? 1e9) < (g.flags.roadPrio ?? 1e9)) { if (p.reserved === this) p.reserved = null; this.job = null; this.idleSet = false; } } } }
    } else if (j.type === 'build') {
      if (j.step === 0) { const p = c.perimeterPoint(j.site, this); if (!this.goTo({ x: p.x, z: p.z })) { this.abortJob(); return; } j.step = 1; j.site.builders = (j.site.builders || 0) + 1; }
      else if (j.step === 1 && this.phase === 2) { j.step = 2; j.tool = j.site.def.ruin ? 'dig' : Math.random() < 0.7 ? 'hammer' : 'saw'; this.faceGoal = Math.atan2(j.site.cx - this.x, j.site.cz - this.z); }
      else if (j.step === 2) {
        const s = j.site; if (s.state !== 'site' || s.progress >= g.buildings.supply(s) - 0.0005) { s.builders = Math.max(0, (s.builders || 0) - 1); this.job = null; this.idleSet = false; return; }
        // something higher up the work list needs hands (and has room for them)? go and help there instead
        j.recheck = (j.recheck || 0) - dt; if (j.recheck <= 0) { j.recheck = 4; const f = c.focus(); if (f && f.s !== s && (f.prio ?? 1e9) < (s.prio ?? 1e9) && (!f.s || (f.s.builders || 0) < (f.s.crew || 6) || Object.keys(f.s.need).some((m) => g.buildings.missing(f.s, m) > 0 && g.economy.stock[m] > 0))) { s.builders = Math.max(0, (s.builders || 0) - 1); this.job = null; this.idleSet = false; return; } }
        this.working = true; g.buildings.addWork(s, dt * 0.85 * (wp.def.buildSpeed || 1));
      }
    }
  }

  // ---------- animation ----------
  decideAnim() {
    const g = this.game; let lower = 'stand', upper = 'idle', speaking = false;
    { const tp = this.trip && this.game.transport.pose(this); if (tp) return { lower: tp, upper: 'idle', speaking: false }; }
    if (this.pose === 'sleep') return { lower: 'lie', upper: 'sleep', lieH: this.roughLie };   // (in bed, or rough: on the ground or a bench)
    if (this.down > 0) return { lower: 'lie', upper: 'sedated', lieH: this.inCart ? this.inCart.lieH : 0.15 };   // on the ground where they fell (or in the undertaker's cart), never at bed height in mid-air
    if (this.sitting) { lower = 'sit'; upper = SEAT_UPPER[this.sitting.kind] || 'idle'; if (upper === 'type' && this.role === 'engineer') upper = 'type'; if (this.sitting.kind === 'bench' && this.mood < 0) upper = 'phone'; }
    else if (this.moved || this.vel > 0.15) lower = 'walk';
    else if (this.working) lower = 'crouch';
    const gj = this.job && this.job.type === 'gather' ? this.job : null;
    if (this.working) { if (gj && gj.step === 1) { upper = gj.gd.upper; lower = ['harvest', 'dig'].includes(upper) ? 'crouch' : 'stand'; } else if (this.job && this.job.tool === 'dig') { upper = 'dig'; lower = 'crouch'; } else if (this.job && this.job.tool === 'chop') { upper = 'chop'; lower = 'stand'; } else upper = this.job && this.job.tool === 'saw' ? 'saw' : this.job && this.job.tool === 'dig' ? 'dig' : 'hammer'; }
    else if (this.pulling) upper = 'pull';   // hauling the undertaker's cart
    else if (this.carry && !this.sitting) upper = this.cart && this.cart.visible ? 'pull' : 'carry';
    else if (this.bag && lower === 'walk') upper = 'bag';
    else if (!this.sitting && this.activity === 'work' && !this.moved && this.role && this.phase === 2) upper = (this.workplace && this.workplace.def.workUpper) || ROLE_UPPER[this.role] || 'idle';
    else if (this.kind === 'security') upper = this.moved ? 'idle' : 'guard';
    else if (this.shopping && this.phase === 2 && !this.moved) upper = (this.inside && this.inside.def.visitUpper) || 'browse';
    if (this.kind === 'child' && this.sitting && this.sitting.kind === 'desk') upper = 'read';
    if (this.eating && this.phase === 2 && this.sitting) upper = 'eat';
    if (this.packed > 0) { upper = 'eat'; lower = 'stand'; }
    if (this.chat) { upper = this.chat.laugh > 0 ? 'laugh' : (this.chat.speaker ? 'talk' : 'listen'); speaking = this.chat.speaker; if (lower === 'walk') lower = 'stand'; }
    if (this.frozen) { upper = this.talkingToPlayer && this.game.ui.dialogue && this.game.ui.dialogue.shown < this.game.ui.dialogue.full.length ? 'talk' : 'listen'; lower = this.sitting ? 'sit' : 'stand'; speaking = upper === 'talk'; }
    if (this.kind === 'raider') { if (this.atkT > 0) upper = this.weapon === 'pistol' ? 'aim' : 'strike'; else if (this.rstate === 'loot' && !this.moved) upper = 'carry'; }
    if (this.kind === 'security' && this.fireT > 0) upper = 'aim';
    if (this.sitting && this.drinking && !this.eating && upper === 'eat') upper = 'drink';
    if (this.drinking && !this.sitting && !this.moved && this.phase === 2 && this.inside && !this.chat) upper = 'drink';   // (stood at the bar with a pint)
    if (this.smokeT > 0 && this.kind !== 'child' && !this.bucketMesh && !this.panic && !this.working && !this.carry && !this.pulling && !this.eating && !this.fightAnim && SMOKE_OK.has(upper) && (upper !== 'drink' || (this.game.elapsed + this.id) % 24 < 11)) upper = 'smoke';   // (a pint in one hand and a fag on the go: they take turns)
    if (this.bandT && !this.moved && !this.chat && lower === 'stand') upper = (this.id + Math.floor(this.game.clock.hour * 4)) % 3 === 0 ? 'clap' : (this.id % 2 ? 'dance' : 'idle');
    if (this.emote && this.emote.t > 0) upper = this.emote.upper;
    if (this.activity === 'firefight' && !this.moved && !this.run) upper = this.role === 'firefighter' || this.id % 3 ? 'point' : 'panic';
    if ((this.activity === 'flee' && !this.moved) || this.activity === 'trapped') upper = this.trapped || (this.fleeFire && this.fleeFire.home) ? 'panic' : this.id % 2 ? 'point' : 'facepalm';
    if (this.digging && !this.moved) { upper = 'dig'; lower = 'crouch'; }
    if (this.busk && !this.moved && this.activity === 'leisure' && !this.chat) upper = this.busk === 'busk' ? 'airguitar' : this.busk === 'watch' ? 'lookaround' : upper;
    if (this.fightAnim) upper = this.fightAnim;
    if (this.cycling && this.moved) { lower = 'ride'; upper = 'handlebars'; }
    { const pt = this.partner; if (pt && upper === 'idle' && lower === 'walk' && pt.moved && !pt.remove && !this.cycling && !pt.cycling) { const dx = pt.x - this.x, dz = pt.z - this.z, d = Math.hypot(dx, dz); const lat = Math.cos(this.heading) * dx - Math.sin(this.heading) * dz; if (d < 1.15 && Math.abs(lat) > 0.45 && Math.cos(pt.heading - this.heading) > 0.85) upper = lat > 0 ? 'holdR' : 'holdL'; } }   // a couple walking together, hand in hand
    return { lower, upper, speaking, motor: this.vehLv === 2 };
  }
  /** It's 1995: a lot of people smoke (builders most of all, and the pub's thick with it). Whether someone does is fixed by their name. */
  get smoker() {
    if (this._smk !== undefined && this._smkRole === this.role) return this._smk; this._smkRole = this.role;
    let h = 0; for (const ch of this.name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pct = this.role === 'builder' ? 82 : this.role === 'publican' ? 65 : ['carter', 'brickmaker', 'smith', 'miner', 'lumberjack', 'mechanic'].includes(this.role) ? 60 : 45;
    return (this._smk = this.age >= 17 && this.kind !== 'child' && this.kind !== 'security' && h % 100 < pct);
  }
  /** Light up now and then: more often over a pint, and when a builder's stood about on site. One lasts a minute or so. */
  /** In the chair at the hairdresser's: a few minutes with the scissors and they come out with a different do. */
  salon(dt) {
    const b = this.shopB; if (!this.shopping || this.cutDone || !b || b.id !== 'hairdresser' || this.phase !== 2 || this.path.length || !(this.inside === b || this.game.buildings.onBuilding(b, this.x, this.z))) return;
    this.cutT = (this.cutT || 0) + dt * Math.max(0.25, this.game.clock.speed); if (this.cutT < 7) return; this.cutDone = true;
    const g = this.game, L = this.baseLook || this.look, pool = (this.gender === 'f' ? HAIR_STYLES_F : HAIR_STYLES_M).filter((h) => h !== L.hairStyle && h !== 'bald'), hs = pick(pool);
    const dye = Math.random() < 0.18 ? pick([0xe8c878, 0xb8462a, 0x2a1a12, 0xd8a050, 0x6a3a2a]) : L.hair;   // (Curl Up & Dye: now and then a new colour too)
    const nl = { ...L, hairStyle: hs, hair: dye }; if (this.baseLook) this.baseLook = nl; this.look = this.baseLook ? { ...this.look, hairStyle: hs, hair: dye } : nl; this.rebuildMesh();
    if (this.mesh.visible) { g.particles.burst(this.x, 1.7, this.z, L.hair, 8, 0.5, 0.8, 0.05); g.social.say(this, pick(['Ooh, I love it!', 'Is it too short? Be honest.', 'Very Jennifer Aniston, that.', 'My mum\'s going to hate it.', 'Ten years younger, me.', 'Same again in six weeks, love.']), 2.6); }
    this.moodBoost += 0.06;
  }
  /** Out of the pub the worse for wear: a sing-song, a little dance on the spot, and now and then flat on their back. */
  tipsy(dt) {
    const g = this.game, k = this.drunk, h = g.clock.hour;
    if (k > 0.78 && !this.disorderly && !this.escort && (h >= 21 || h < 3) && this.kind === 'resident' && Math.random() < dt * 0.012) { this.disorderly = { t: g.elapsed }; g.social.say(this, pick(['Come on then! Who wants some?!', 'What are YOU looking at?!', 'I\'ll have the lot of you!', 'This is MY town!']), 2.6); this.emote = { upper: 'fight', t: 3 }; g.particles.burst(this.x, 0.5, this.z, 0x6a6a6a, 6, 1, 2, 0.1); if (g.markers) g.markers.add(this.x, this.z, '🍺', 'Drunk and disorderly', 600, this, () => !!this.disorderly && !this.remove); g.messages.push('Police', `${this.name} is drunk and disorderly outside, shouting the odds.`, 'quiet'); }   // (the police will come for them)
    if (this.moved && k > 0.65 && Math.random() < dt * 0.025 * (k - 0.55) * 10) { this.knockDown(2 + Math.random() * 2); g.social.say(this, pick(['Whoops!', 'Who moved the pavement?', 'I\'m fine! I\'m fine.', 'Oof.']), 2.2); return; }   // down they go
    if (!this.moved && !this.emote && Math.random() < dt * 0.06 * k) { this.emote = { upper: pick(['dance', 'threelions', 'whigfield', 'airguitar', 'cheers', 'dance']), t: 3 + Math.random() * 3 }; if (Math.random() < 0.7) g.social.say(this, pick(['🎵 Wonderwall... la la la... 🎵', '🎵 Three lions on a shirt... 🎵', '🎵 Saturday night, I feel the air is getting hot... 🎵', '🎵 I\'m forever blowing bubbles... 🎵', '🎵 Don\'t look back in anger... 🎵', '🎵 Come on Eileen! 🎵', '🎵 Sweet Caroline! Bah bah bah! 🎵']), 2.8); }
  }
  smokeHabit(dt) {
    if (this.smokeT > 0) { this.smokeT -= dt; if (this.smokeT <= 0) this.smokeCD = 50 + Math.random() * 130; return; }
    if ((this.smokeCD = (this.smokeCD || Math.random() * 60) - dt) > 0 || this.pose === 'sleep' || this.down > 0 || !this.smoker || this.hidden) return;
    const pub = this.sitting && this.drinking, site = this.role === 'builder' && this.activity === 'work' && !this.working && !this.carry, idle = !this.moved && !this.working;
    const per = pub ? 1 / 25 : site ? 1 / 18 : idle ? 1 / 80 : 1 / 220;
    if (Math.random() < dt * per) this.smokeT = 40 + Math.random() * 50;
  }
  sync(dt, init = false) {
    const g = this.game, m = this.mesh, U = this.upstairs, hidden = this.hidden || (U && !(g.mode === 'sim' && g.buildings.playerInside === U.b && Math.abs((g.player.floorY || 0) - U.y) < WALL_H * 1.2)) || (this.pose === 'sleep' && this.bedSpot && this.bedSpot.upstairs) || (this.inside && !this.inside.def.open && !g.buildings.canSeeInto(this.inside));
    if (this.dog && !init) this.dog.update(dt);   // before anything returns early: a dog left un-updated would stand frozen in the street for ever
    m.visible = !hidden; if (hidden && !init) { this.working = false; return; }
    m.position.set(this.x, (this.rideY || 0) + (this.sitting ? seatLift(this.sitting) : 0), this.z); m.rotation.y = this.heading;   // (a bar stool sits them higher)
    const wpc = this.workplace && (this.workplace.def.cart || (this.job && this.job.type === 'yardhaul')) && (GATHER[this.role] || this.role === 'builder') && this.activity === 'work' ? this.workplace.def.cart || 1 : 0, useCart = !!(wpc && this.carry && !this.inside);   // (hauling the camp's stack: a barrow)
    if (useCart && (!this.cart || this.cart.userData.level !== wpc)) { if (this.cart) m.remove(this.cart); const K = this.carts || (this.carts = {}); this.cart = K[wpc] || (K[wpc] = makeCart(wpc)); this.cart.position.z = wpc >= 2 ? -1.5 : -1.25; m.add(this.cart); }
    if (this.cart) { this.cart.visible = useCart; if (useCart) updateCart(this.cart, this.carry.mat, this.carry.qty, this.moved ? this.dist || 0 : 0); }
    this.useCart = useCart;
    const cam = g.camera.position, d = Math.hypot(cam.x - this.x, cam.z - this.z) + (g.mode === 'god' ? cam.y * 0.6 : 0);
    const far = d > (g.mode === 'god' ? 64 : 42);
    if (far !== this.lowDetail || init) { this.lowDetail = far; this.rig.lod.visible = far; for (const p of this.rig.parts) p.visible = !far; if (!far) this.rig.lids.visible = false; }
    if (far && this.veh) { m.remove(this.veh); this.veh = null; this.vehLv = -1; }
    if (far) { this.rig.lod.position.y = this.moved ? Math.abs(Math.sin(this.game.clock.hour * 900)) * 0.04 : 0; if (this.pose === 'sleep' || this.down > 0) { this.rig.lod.rotation.x = -Math.PI / 2; this.rig.lod.position.set(0, this.pose === 'sleep' ? (this.roughLie ?? 0.7) : this.inCart ? this.inCart.lieH : 0.15, 0.9); } else { this.rig.lod.rotation.x = 0; this.rig.lod.position.z = 0; } this.working = false; return; }
    if (this.fightAnimT > 0) { this.fightAnimT -= dt; if (this.fightAnimT <= 0) this.fightAnim = this.fight ? 'fight' : null; }
    if (this.panicT > 0) { this.panicT -= dt; if (this.panicT <= 0) this.panic = false; }
    if (this.emote) { this.emote.t -= dt; if (this.emote.t <= 0) this.emote = null; }
    else if (!this.lowDetail && !this.chat && !this.moved && !this.sitting && this.pose !== 'sleep' && this.kind !== 'security' && this.kind !== 'raider' && Math.random() < dt * 0.012) {
      // now and then: a little gesture. Later on, the "neighbours" touch their ears as if someone is talking to them...
      const st = (g.story && g.story.stage) || 0, kid = this.kind === 'child';
      this.emote = { upper: st >= 2 && Math.random() < (st - 1) * 0.04 && !kid ? pick(['earpiece', 'lookaround']) : pick(kid ? ['runningman', 'robot', 'macarena', 'cheer', 'wave', 'kungfu', 'gameboy', 'gameboy', 'pogo'] : this.age < 30 ? ['thumbsup', 'liam', 'pogo', 'brickphone', 'whigfield', 'threelions', 'hairbrush', 'shrug', 'wave'] : ['thumbsup', 'wipebrow', 'pockets', 'lookaround', 'wave', 'shrug', 'think', 'sneeze', 'beckon', 'brickphone', 'cheers']), t: 2.6 };
    }
    // the game is paused: the town holds its positions as if somebody said "and... hold". Most freeze a beat later;
    // a few touch their earpiece, slowly; a few turn their heads, very slowly, to look at Sam
    if (g.clock.speed === 0 && g.started && !g.ending) {
      if (!this.pz) { const r = (this.id * 37 + (g.pauseN || 0) * 11) % 100; this.pz = { role: this.kind === 'security' ? 'ear' : this.kind === 'child' ? 'freeze' : r < 12 ? 'ear' : r < 27 ? 'glance' : 'freeze', at: g.elapsed + 0.25 + ((this.id * 7) % 13) * 0.07 }; }
      const z = this.pz; if (g.elapsed > z.at) { if (z.role === 'ear') { if (!this.emote || this.emote.upper !== 'earpiece') this.emote = { upper: 'earpiece', t: 30 }; dt *= 0.3; } else if (z.role === 'glance') { this.glanceTarget = g.player; this.glanceT = 99; dt *= 0.15; } else dt = 0; }
    } else if (this.pz) { if (this.pz.role === 'glance') this.glanceTarget = null; if (this.emote && this.emote.upper === 'earpiece' && this.emote.t > 5) this.emote = null; this.pz = null; }
    if (this.freezeT > 0) dt = 0;
    if (this.fireT > 0) this.fireT -= dt;
    this.updateLook(dt);
    const a = this.decideAnim(), carryCol = this.carry && !this.useCart ? ({ timber: 0xb5834a, brick: 0xa8442f, steel: 0x7b8794, glass: 0x7ec8e3 }[this.carry.mat]) : undefined;
    this.anim.update(dt, { ...a, dist: this.moved ? (this.dist || 0) : 0, speed: this.vel, run: this.vel > 3.6 || (this.hurry && this.vel > 2.8), turning: this.turning && !this.moved, lookYaw: this.lookYaw, lookPitch: this.lookPitch, mood: this.mood, tired: this.tired, crateColor: carryCol, drinkProp: this.drinking ? this.drinkProp() : undefined,
      prop: this.kind === 'raider' && this.down <= 0 ? { handR: this.weapon } : this.kind === 'security' && this.fireT > 0 ? { handR: 'pistol' } : this.bag && a.lower === 'walk' ? { handR: 'bag' } : this.holding ? { handR: this.holding } : (this.look.cane && !this.sitting && this.pose !== 'sleep' && (a.upper === 'idle') ? { handR: 'cane' } : undefined), lean: this.vel > 0.5 ? 0 : 0 });
    if (a.upper === 'smoke' && m.visible && Math.random() < dt * 0.3) { const c = g.camera.position; if ((c.x - this.x) ** 2 + (c.z - this.z) ** 2 < 600) g.particles.burst(this.x + Math.sin(this.heading) * 0.25, (m.position.y || 0) + (this.sitting ? 1.25 : 1.62), this.z + Math.cos(this.heading) * 0.25, 0xd8d8d8, 1, 0.25, 1.6, 0.09); }   // a puff of smoke (only close up)
    this.working = false;
    // the bike (if riding): the sim sits up on the saddle, the bike stays on the road
    const vl = this.cycling && !this.riding && !far ? this.game.transport.bikeLv : -1;
    if (vl !== this.vehLv) { if (this.veh) { m.remove(this.veh); this.veh = null; } this.vehLv = vl; if (vl >= 0) { const R = this.rides || (this.rides = {}); this.veh = R[vl] || (R[vl] = makeRide(vl, [0x1a1a1a, 0xc0392b, 0x2a5ab0, 0x2a7a3a][this.id % 4])); m.add(this.veh); } }
    if (this.veh) { const lift = this.veh.userData.seat - 0.5; m.position.y = (this.rideY || 0) + lift; this.veh.position.y = -lift; for (const [w, r] of this.veh.userData.wheels || []) w.rotation.x += (this.dist || 0) / r; }
    const castNear = d < 24; if (castNear !== this.castOn) { this.castOn = castNear; for (const p of this.rig.parts) p.castShadow = castNear; }
  }
  updateLook(dt) {
    const g = this.game; this.glanceT -= dt;
    if (this.glanceT <= 0) {
      const p = g.player; let tgt = null;
      if (this.activity !== 'sleep' && this.kind !== 'security' || Math.random() < 0.3) {
        const dp = Math.hypot(p.x - this.x, p.z - this.z);
        if (dp < 9 && (!this.inside || this.inside === g.buildings.playerInside) && Math.random() < 0.3 + this.style.soc * 0.5) tgt = { x: p.x, z: p.z, y: 1.6 };
        if (tgt && dp < 6 && this.quirk && !this.chat && this.mesh.visible && Math.random() < 0.12 && this.kind !== 'raider') g.social.say(this, pick(this.quirk.lines), 2.2);   // their catchphrase
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
  /** Buildings with storeys get used: some of the staff work upstairs, some of the family potter about up there.
   *  They pop up and down the stairs only while Sam isn't in the building to see it. */
  goUpstairs() {
    const g = this.game, b = this.activity === 'work' ? this.workplace : this.home; if (!b || b.state !== 'done' || this.inside !== b || g.buildings.playerInside === b || !b.ext || !b.ext.plan) return;
    if (this.activity === 'work' && ((b.spots.counters || []).length || (b.spots.kitchen || []).length) && b.workers.indexOf(this) < (b.spots.counters || []).length + (b.spots.kitchen || []).length) return;   // the counter's always manned
    const p = levelPlan(b.def); if (!p || p.n < 2 || (this.activity === 'work' ? (b.workers.indexOf(this) < 1 || this.id % 2) : this.id % 3)) return;
    const items = upperFurniture(b.def).filter((f) => f.k >= 1 && f.k < p.n); if (!items.length) return; const f = items[this.id % items.length];
    const lx = f.x * 0.8, lz = f.z * 0.8, [x, z] = b.toWorld(lx, lz); this.upstairs = { b, k: f.k, y: f.k * WALL_H, gx: this.x, gz: this.z };
    this.x = x; this.z = z; this.rideY = this.upstairs.y; this.heading = Math.atan2(b.toWorld(f.x, f.z)[0] - x, b.toWorld(f.x, f.z)[1] - z); this.vel = 0;
  }
  comeDown() { const u = this.upstairs; if (!u) return; this.upstairs = null; this.rideY = 0; this.x = u.gx; this.z = u.gz; }
  /** Dress up for an occasion ('sunday', 'cricket', 'bride', 'groom'), until an absolute game hour; wear(null) changes back. */
  wear(kind, until = 0, trim = 0x2a6a3a) {
    if (!kind) { if (!this.baseLook) return; this.look = this.baseLook; this.baseLook = null; this.outfit = null; this.rebuildMesh(); return; }
    if (this.outfit === kind || (this.kind !== 'resident' && this.kind !== 'child')) return;
    const B = this.baseLook || this.look, f = B.gender === 'f', L = { ...B, skirt: false, dress: false, shorts: false, shirt2: null, accessory: null, longSleeve: true };
    if (kind === 'cricket') Object.assign(L, { shirt: 0xf4f1e6, pants: 0xf2efe4, shoes: 0xf0f0f0, shirt2: trim, accessory: 'jumper', longSleeve: false });
    else if (kind === 'bride') Object.assign(L, { dress: true, shirt: 0xfbf8f0, shirt2: 0xffffff, shoes: 0xf4f0e8 });
    else if (kind === 'mourning') Object.assign(L, f ? { dress: true, shirt: 0x15151a } : { shirt: 0x15151a, pants: 0x15151a, accessory: 'tie' }, { shoes: 0x0a0a0a });
    else if (kind === 'groom') Object.assign(L, { shirt: 0x23262e, pants: 0x23262e, shoes: 0x111111, accessory: 'tie' });
    else if (f) Object.assign(L, { dress: true, shirt: [0x3a5a9a, 0x8a2a4a, 0x2a6a5a, 0x6a4a8a, 0xc87a8a][this.id % 5] });   // Sunday best
    else Object.assign(L, { shirt: [0x3a3f4a, 0x4a3a2a, 0x2a3a5a][this.id % 3], pants: 0x2a2d35, accessory: 'tie' });
    this.baseLook = B; this.look = L; this.outfit = kind; this.outfitUntil = until; this.rebuildMesh();
  }
  rebuildMesh() {
    const old = this.mesh; this.computeStyle(); this.game.scene.remove(old); this.rig = createRig(this.look); this.mesh = this.rig.root; this.anim = new Animator(this.rig, { trait: this.trait, bounce: this.style.bounce, slouch: this.style.slouch, swing: this.style.swing, stride: this.style.stride, fidget: this.style.fidget, sway: this.style.sway });
    this.game.scene.add(this.mesh); if (this.veh) this.mesh.add(this.veh); if (this.cart) this.mesh.add(this.cart);   // (the bike and the barrow come along to the new body)
    old.traverse((o) => { if (o.geometry && o.geometry.userData.own) o.geometry.dispose(); });   // the old body is gone for good: free it
    this.lowDetail = null; this.sync(0.016, true);
  }
  dispose() { this.standUp(); this.game.scene.remove(this.mesh); this.mesh.traverse((o) => { if (o.geometry && o.geometry.userData.own) o.geometry.dispose(); }); if (this.bubble) { this.game.scene.remove(this.bubble.sprite); this.bubble.sprite.material.dispose(); this.bubble = null; } if (this.dog) this.dog.dispose(); }
}
