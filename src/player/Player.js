import * as THREE from 'three';
import { WEAPONS } from '../systems/Combat.js';
import { stepLevel, inLift, laneRect, flightH } from '../world/Levels.js';
import { makeRide, VEHICLE_SPEED, VEHICLE_NAMES } from '../render/Vehicles.js';
import { TILE, WALL_H, WALL_T } from '../config.js';
import { ROLES, MATERIALS } from '../data/buildings.js';
import { T } from '../world/World.js';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { clamp, angleDiff, pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { SHOP_GOODS, GENERIC_GOODS } from '../data/shopgoods.js';
import { PHONE_CALLS, PHONE_CALLS_CLEAN, HORSES, RACE_WIN, RACE_LOSE } from '../data/humour.js';

const R = 0.4;
/** Does the segment (x0,z0)-(x1,z1) cross box q ({ minx, maxx, minz, maxz }), ignoring its last `skipEnd` metres? */
function segBox(x0, z0, x1, z1, q, skipEnd = 0) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1; let t0 = 0, t1 = Math.max(0, (L - skipEnd) / L);
  for (const [o, d, mn, mx] of [[x0, dx, q.minx, q.maxx], [z0, dz, q.minz, q.maxz]]) {
    if (Math.abs(d) < 1e-9) { if (o <= mn || o >= mx) return false; continue; }
    let u = (mn - o) / d, v = (mx - o) / d; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 >= t1) return false;
  }
  return true;
}
const R_IN = 0.28;   // slimmer indoors, where doorways are 1.2 m and the furniture is close together
export const TOOLS = { axe: 'Axe', pick: 'Pickaxe', shovel: 'Shovel', basket: 'Basket', rod: 'Fishing rod', hammer: 'Hammer' };
export const TOOL_ICON = { axe: '🪓', pick: '⛏', shovel: '🥄', basket: '🧺', rod: '🎣', hammer: '🔨' };
export const MAT_ICON = { timber: '🪵', stone: '🪨', brick: '🧱', steel: '⚙', glass: '🔷', food: '🍎' };
const TOOL_FOR = { tree: 'axe', rock: 'pick', ore: 'pick', clay: 'shovel', sand: 'shovel', berry: 'basket', field: 'basket', fish: 'rod' };
const WORK_KIND = { chop: 'chop', mine: 'mine', dig: 'dig', harvest: 'harvest', fish: 'fish' };
const CHIP = { chop: 0xb5834a, mine: 0x9a9a92, dig: 0x7a5a3a, harvest: 0x7aa63a, fish: 0x7ec8e3, build: 0xe0c890 };
const STROKE = { perfect: 1, good: 0.5, miss: 0.12 };
export const BACKPACK = 12;

/** Sam: the playable sim. First/third person, backpack, interactions with timing minigames, sleeping, sedation. */
const JUMP_AIR = 0.75, JUMP_G = 19.2, JUMP_V = JUMP_G * JUMP_AIR / 2;   // a 0.75 s hop that peaks at 1.35 m (clears fences, lands on tables)

export class Player {
  constructor(game) {
    this.game = game; this.x = 0; this.z = 0; this.heading = 0; this.yaw = 0; this.pitch = -0.1; this.third = true; this.camDist = 5; this.energy = 100;
    this.inv = {}; this.tools = new Set(); this.hunger = 20; this.hungerWarn = false; this.starveT = 0; this.weapon = null; this.down = 0; this.swingT = 0; this.strikeT = 0; this.shake = 0;
    this.sleeping = false; this.sedated = 0; this.walkPhase = 0; this.moved = false; this.target = null; this.hold = 0; this.working = false; this.frozen = false;
    this.rig = createRig({ shirt: 0xe8772e, pants: 0x2d3a55, skin: 0xe0b48f, hair: 0x3b2a1a, hairStyle: 'side', hat: { type: 'cap', color: 0xe8772e }, longSleeve: false, accessory: null, backpack: true }); this.mesh = this.rig.root;
    this.anim = new Animator(this.rig, { trait: 'cheerful', bounce: 1.1, swing: 1.1 }); this.speed = 0; this.dirx = 0; this.dirz = 0; this.emoteT = 0; this.lookYaw = 0; this.lookPitch = 0; this.dist = 0; game.scene.add(this.mesh);
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); this.marker.rotation.x = Math.PI; game.scene.add(this.marker);
    // ground ring under whatever E will act on
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 5; this.ring.visible = false; game.scene.add(this.ring);
  }
  placeRing(t) {
    const r = this.ring; if (!t || t.kind === 'info' || this.game.mode !== 'sim') { r.visible = false; return; }
    let x, z, s = 0.8;
    if (t.node) { x = t.node.x; z = t.node.z; s = t.nk === 'tree' ? 1.1 : 0.9; } else if (t.kind === 'site') { x = t.b.cx; z = t.b.cz; s = Math.max(t.b.w, t.b.d) * 2.4; } else if (t.plan) { x = t.plan.cx; z = t.plan.cz; s = 2.2; }
    else if (t.pile) { x = t.pile.x; z = t.pile.z; } else if (t.item) { x = t.item.x; z = t.item.z; s = 0.5; } else if (t.sim) { x = t.sim.x; z = t.sim.z; s = 0.6; } else if (t.spot) { x = t.spot.x; z = t.spot.z; } else if (t.b) { x = t.b.cx; z = t.b.cz; s = 1.4; } else { r.visible = false; return; }
    r.visible = true; const pulse = 1 + Math.sin(performance.now() / 160) * 0.06; r.scale.set(s * pulse, s * pulse, 1); r.position.set(x, 0.08, z); r.material.color.setHex(t.work ? 0x7be08f : 0xffd23f);
  }
  teleport(x, z, heading) { this.platform = null; this.onTop = false; if (this.seat) { this.seat.taken = null; this.seat = null; } this.x = x; this.z = z; this.floorY = 0; this.ride = null; if (this.mounted) this.mount(false); if (heading !== undefined) { this.heading = heading; this.yaw = heading; } }
  headPos() { return [this.x, (this.eyeH || 1.65) + (this.jumpY || 0) + (this.floorY || 0), this.z]; }
  /** The building (with storeys) under world point x,z and the point in its own coordinates. */
  planAt(x, z) {
    const b = this.game.buildings.buildingAtPoint(x, z), p = b && b.ext && b.ext.plan; if (!p) return null;
    const a = b.rot * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), dx = x - b.cx, dz = z - b.cz; return { b, p, lx: dx * c - dz * s, lz: dx * s + dz * c };
  }
  /** Can Sam stand at x,z (stairs, upper floors, roofs)? Leaves the height he'd be at in this._fy. */
  footing(x, z) {
    if (this.onTop) { this._fy = this.floorY || 0; return true; }   // on a bed or a table: flat; stepping off the edge drops you (see update)
    const y = this.floorY || 0, q = this.planAt(x, z); if (!q) { this._fy = this.falling ? y : 0; return y < 0.3 || !!this.falling; }
    if (this.falling) { this._fy = y; return true; }
    const pq = this.planAt(this.x, this.z), from = pq && pq.b === q.b ? [pq.lx, pq.lz] : null;
    const ny = stepLevel(q.p, q.lx, q.lz, y, q.b.ext.roofCols, from, !!q.b.roofDoorOpen); if (ny === null) return false;
    if (ny === -1) { this.falling = { vy: 2, from: y }; this._fy = y; this.game.ui.toast('Whoa!', 900); return true; }   // over the edge
    this._fy = ny; return true;
  }
  /** Standing in a lift: E goes up a floor, Q (Y/triangle) goes down. Returns true while the cab is moving. */
  liftUpdate(rawDt, inp) {
    const g = this.game;
    if (this.ride) {
      const r = this.ride; r.t += rawDt; const u = Math.min(1, r.t / r.dur), e = u * u * (3 - 2 * u); this.floorY = r.from + (r.to - r.from) * e; r.b.liftY = this.floorY; this.speed = 0;
      if (u >= 1) { this.ride = null; Sfx.play('ui'); const fl = Math.round(this.floorY / WALL_H); g.ui.toast(fl === 0 ? 'Ground floor.' : fl >= r.p.n ? 'Roof.' : `Floor ${fl}.`, 1200); }
      return true;
    }
    const q = this.planAt(this.x, this.z); if (!q || !q.p.lift || !inLift(q.p, q.lx, q.lz)) return false;
    const p = q.p, fl = Math.round((this.floorY || 0) / WALL_H), topF = p.roof ? p.n : p.n - 1; q.b.liftY = this.floorY || 0;
    const name = (k) => (k === 0 ? 'ground floor' : k >= p.n ? 'the roof' : `floor ${k}`);
    g.ui.setPrompt(`Lift (${name(fl)}): ${fl < topF ? `E up to ${name(fl + 1)}` : 'E back down to the ground'}${fl > 0 ? ` · Q down to ${name(fl - 1)}` : ''}`, -1, true);
    let to = null; if (inp.hit('KeyE')) to = fl < topF ? fl + 1 : 0; else if (inp.hit('KeyQ') && fl > 0) to = fl - 1;
    if (to !== null) { this.ride = { b: q.b, p, from: this.floorY || 0, to: to * WALL_H, t: 0, dur: 0.9 + Math.abs(to - fl) * 0.45 }; Sfx.play('door'); }
    return 'here';
  }
  /** Play an emote (keys 1-8, G cycles). Some come with a cheeky line from Sam. */
  emote(name) {
    if (this.sleeping || this.sedated > 0) return; if (this.seat && ['dance', 'airguitar', 'wave', 'macarena', 'robot', 'runningman', 'bow', 'whigfield', 'riverdance', 'pogo', 'kungfu'].includes(name)) name = 'cheer'; this.emoteName = name; this.emoteT = { whigfield: 5, riverdance: 4, liam: 4, pogo: 3.5, threelions: 3.5, kungfu: 1.6, hairbrush: 4, cheers: 2.4, macarena: 5, robot: 3.5, runningman: 3.5, mexicanwave: 3, bow: 1.8, salute: 1.8, beckon: 2, dance: 4, airguitar: 3.5, clap: 2.4, think: 3, cheer: 2.2, shrug: 1.6, facepalm: 1.8, vsign: 1.6 }[name] || 2.2;
    const g = this.game, near = g.population.sims.filter((s) => !s.hidden && s.kind !== 'security' && Math.hypot(s.x - this.x, s.z - this.z) < 7);
    if (name === 'vsign' && near.length) { const s = near[0]; s.faceGoal = Math.atan2(this.x - s.x, this.z - s.z); s.emote = { upper: Math.random() < 0.5 ? 'vsign' : 'facepalm', t: 1.8 }; s.samRel = Math.max(0, (s.samRel || 0) - 1); if (s.mesh.visible) g.social.say(s, pick(g.ui.adult ? ['And the same to you, you cheeky sod!', 'Charming. Absolutely charming.', 'Oi! My nan does that better.', 'Up yours too, Sam.'] : ['Charming!', 'How rude!', 'Well, I never.']), 2.6); }
    else if (['dance', 'airguitar', 'macarena', 'robot', 'runningman', 'mexicanwave', 'whigfield', 'riverdance', 'pogo', 'threelions'].includes(name) && near.length) for (const s of near.slice(0, 4)) { if (s.chat || s.sitting || Math.random() < 0.3) continue; s.emote = { upper: Math.random() < 0.45 ? 'clap' : ['macarena', 'mexicanwave', 'robot', 'runningman', 'whigfield', 'riverdance', 'pogo', 'threelions'].includes(name) ? name : name === 'dance' ? 'dance' : 'cheer', t: name === 'macarena' ? 5 : 3 }; if (Math.random() < 0.5 && s.mesh.visible) g.social.say(s, pick(name === 'dance' ? ['Go on, Sam!', 'Bloody hell, it\'s Bez from the Happy Mondays.', 'Dad dancing alert!', 'You\'ve got moves like a shopping trolley.'] : ['Wonderwall! Do Wonderwall!', 'Is that Blur or Oasis?', 'Rock and roll, mate!']), 2.4); }
    else if (name === 'facepalm' && near.length && Math.random() < 0.5 && near[0].mesh.visible) g.social.say(near[0], pick(['Bad day, love?', 'Cheer up, it might never happen.', 'That bad, eh?']), 2.2);
    // the townsfolk know exactly what Sam's doing
    const REACT = {
      whigfield: ['Saturday niiight! I like the way you move!', 'Dee dee na na na!', 'Is that Whigfield? It\'s Whigfield!'],
      riverdance: ['Michael Flatley, eat your heart out!', 'Lord of the Dance, him.', 'Keep your arms still, Sam! That\'s the rule!'],
      liam: ['Sound, our kid.', 'Mad fer it!', 'You\'re not Liam Gallagher, Sam. Take your hands out from behind your back.'],
      pogo: ['Pogo! Pogo!', 'Is this a Supergrass gig?', 'Alright! We\'re all right!'],
      threelions: ['IT\'S COMING HOME!', 'Three lions on a shirt!', 'Thirty years of hurt...'],
      kungfu: ['It\'s Morphin\' time!', 'Steady on, Cantona!', 'Go go Power Rangers!'],
      hairbrush: ['Who is that, Celine Dion?', 'Give it some welly, Sam!', 'Is that Wannabe? Tell me what you want, what you really really want!'],
      cheers: ['Cheers, Sam!', 'Get them in!', 'Your round, is it?'],
    };
    if (REACT[name] && near.length) { const s = near.find((q) => q.mesh.visible && !q.chat); if (s && Math.random() < 0.8) { s.faceGoal = Math.atan2(this.x - s.x, this.z - s.z); g.social.say(s, pick(REACT[name]), 2.4); if (name === 'threelions' || name === 'cheers') s.emote = { upper: name, t: 2.5 }; } }
  }
  /** The red phone box: 10p for a random (often rude) call. */
  phoneCall() {
    const g = this.game; if (this.callT > 0) return; if (!g.economy.spend(0.1, 'Phone calls')) { g.ui.toast('You haven\'t got 10p. Skint.'); return; }
    this.callT = 4; Sfx.play('ring'); const L = g.ui.adult ? PHONE_CALLS : PHONE_CALLS_CLEAN, [who, text] = pick(L); g.flags.calls = (g.flags.calls || 0) + 1;
    setTimeout(() => { g.messages.push('☎ ' + who, text, ''); g.ui.toast('☎ ' + who + ': ' + text, 6000); }, 1800);
  }
  /** The Bookies: £20 on a horse. Odds are rubbish, as is tradition. */
  placeBet() {
    const g = this.game, stake = 20; if (this.betT > 0) return; if (!g.economy.spend(stake, 'Betting')) { g.ui.toast('The bookie laughs at your empty wallet.'); return; }
    this.betT = 5; const h = pick(HORSES), odds = pick([2, 3, 4, 6, 10]), win = Math.random() < 0.85 / odds + 0.05; Sfx.play('horse'); g.ui.toast(`£${stake} on ${h} at ${odds}/1. They\'re off...`, 2600); this.emote('think');
    setTimeout(() => {
      if (win) { const w = stake * (odds + 1); g.economy.earn(w, 'Betting'); Sfx.play('cash'); this.emote('cheer'); g.ui.toast(pick(RACE_WIN).replace('{h}', h).replace('{w}', w), 5000); }
      else { this.emote(g.ui.adult && Math.random() < 0.4 ? 'vsign' : 'facepalm'); g.ui.toast(pick(RACE_LOSE).replace('{h}', h).replace('{s}', stake), 5000); }
    }, 2800);
  }
  jump() { if (this.jumpT > 0 || this.falling || this.seat || this.sleeping || this.sedated > 0 || this.down > 0 || this.landT > 0.06) return; this.jumpT = JUMP_AIR; Sfx.play('jump'); }

  // ---------- backpack ----------
  invTotal() { let n = 0; for (const v of Object.values(this.inv)) n += v; return n; }
  invRoom() { return BACKPACK - this.invTotal(); }
  invAdd(mat, n) { const k = Math.max(0, Math.min(this.invRoom(), n)); if (k) this.inv[mat] = (this.inv[mat] || 0) + k; return k; }
  invTake(mat, n) { const k = Math.min(this.inv[mat] || 0, n); if (k) { this.inv[mat] -= k; if (this.inv[mat] <= 0) delete this.inv[mat]; } return k; }
  invText() { const e = Object.entries(this.inv); return e.length ? e.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ') : 'empty'; }
  /** Drop everything (or one material) on the ground as a pile Sam can pick up again. */
  drop(mat = null) {
    const g = this.game, items = {};
    for (const [m, n] of Object.entries(this.inv)) if (!mat || m === mat) { items[m] = n; delete this.inv[m]; }
    if (!Object.keys(items).length) { g.ui.toast('Your backpack is empty.'); Sfx.play('deny'); return; }
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading); g.piles.add(this.x + fx * 0.9, this.z + fz * 0.9, items); Sfx.play('drop'); g.ui.toast('Dropped ' + Object.entries(items).map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', '));
  }

  update(dt, rawDt) {
    const g = this.game, inp = g.input, sim = g.mode === 'sim' && !g.ui.modalOpen && !g.ending;
    this.moved = false; this.working = false; this.dist = 0; if (this.emoteT > 0) this.emoteT -= rawDt;
    if (this.callT > 0) this.callT -= rawDt; if (this.betT > 0) this.betT -= rawDt;
    if (this.jumpT > 0 && this.jumpT - rawDt <= 0) { const w = this.game.world, hx = this.speed > 0.3 ? this.dirx : Math.sin(this.heading), hz = this.speed > 0.3 ? this.dirz : Math.cos(this.heading); const top = w.topAt(this.x, this.z, 0, (this.floorY || 0) + 1.6); if (top > (this.floorY || 0) + 0.05) { this.floorY = top + 0.01; this.onTop = true; } else if (w.collides(this.x, this.z, this.bodyR(), false, this.floorY || 0)) { const lim = this.planAt(this.x, this.z) || this.game.buildings.playerInside ? 0.7 : 1.8; for (let d = 0.1; d < lim; d += 0.1) { if (!this.clearTo(this.x + hx * d, this.z + hz * d)) break; if (!w.collides(this.x + hx * d, this.z + hz * d, this.bodyR(), false, this.floorY || 0)) { this.x += hx * d; this.z += hz * d; break; } } } }   // landed on a fence: hop down the far side
    if (this.jumpT > 0) {   // a real arc: up fast, gravity brings him down; land on a bed or table on the way down
      this.jumpT = Math.max(0, this.jumpT - rawDt); const t = JUMP_AIR - this.jumpT; this.jumpY = Math.max(0, JUMP_V * t - JUMP_G * t * t / 2);
      if (this.game.buildings.playerInside) { const fy = this.floorY || 0, ceil = (Math.floor((fy + 0.6) / WALL_H) + 1) * WALL_H - 0.15; this.jumpY = Math.min(this.jumpY, Math.max(0.3, ceil - fy - 1.9)); }   // indoors: you can't jump through the ceiling
      if (this.jumpT <= 0) this.landT = 0.16;
      else if (t > JUMP_V / JUMP_G) { const fy = this.floorY || 0, top = this.game.world.topAt(this.x, this.z, 0, fy + this.jumpY + 0.05); if (top > fy + 0.05 && fy + this.jumpY <= top + 0.06) { this.floorY = top + 0.01; this.onTop = true; this.jumpT = 0; this.jumpY = 0; this.landT = 0.12; } }
    } else this.jumpY = 0;
    if (this.landT > 0) this.landT -= rawDt; if (this.strikeT > 0) this.strikeT -= rawDt; if (this.shake > 0) this.shake = Math.max(0, this.shake - rawDt * 1.5);
    if (this.sedated > 0) { this.sedated -= rawDt; if (this.sedated <= 0) this.wakeFromSedation(); }
    if (this.down > 0) this.down -= rawDt;
 if (this.swingT > 0) this.swingT -= rawDt; if (this.swingT <= 0 && this.swingHit) this.swingHit = false;
    this.unstick();
    if (sim && !this.sleeping && this.sedated <= 0 && !(this.down > 0)) {
      this.yaw -= inp.mouse.dx * 0.0025; this.pitch = clamp(this.pitch - inp.mouse.dy * 0.0025, -1.3, 1.2);
      if (inp.down('ArrowLeft')) this.yaw += 2 * rawDt; if (inp.down('ArrowRight')) this.yaw -= 2 * rawDt;
      if (inp.down('ArrowUp')) this.pitch = clamp(this.pitch + 1.2 * rawDt, -1.3, 1.2); if (inp.down('ArrowDown')) this.pitch = clamp(this.pitch - 1.2 * rawDt, -1.3, 1.2);
      if (inp.hit('KeyV')) this.third = !this.third;
      const cb = g.combat.on, sprinting = (inp.down('ShiftLeft') || inp.down('ShiftRight')) && this.speed > 5;
      this.aiming = !!this.gun && !this.mounted && !this.dead && !(cb && sprinting) && !(this.reloadT > 0 && WEAPONS[this.gun] && WEAPONS[this.gun].scope) && (inp.mouse.right || inp.down('PadAim')); inp.armed = !!this.gun && !this.mounted; inp.combat = cb && !this.mounted;
      this.aimK = (this.aimK || 0) + ((this.aiming ? 1 : 0) - (this.aimK || 0)) * Math.min(1, rawDt * 10);
      if (this.aiming && inp.padActive) this.aimAssist(rawDt);
      if (this.scoped() && !(inp.down('ShiftLeft') || inp.down('ShiftRight') || inp.down('PadBreath'))) { const t = g.elapsed; this.yaw += Math.cos(t * 1.1) * 0.0009 * rawDt * 60 * 0.4; this.pitch += Math.sin(t * 1.7) * 0.0006 * rawDt * 60 * 0.4; }   // scope sway (Shift: hold your breath)
      this.eyeH = (this.eyeH || 1.65) + ((this.stance === 'prone' ? 0.42 : this.stance === 'crouch' ? 1.08 : 1.65) - (this.eyeH || 1.65)) * Math.min(1, rawDt * 10);
      if (cb) g.combat.controls(this, inp, rawDt);
      if (inp.mouse.wheel && this.third && !cb) this.camDist = clamp(this.camDist + inp.mouse.wheel * 0.6, 2.5, 9);
      let fx = 0, fz = 0; if (inp.down('KeyW')) fz += 1; if (inp.down('KeyS')) fz -= 1; if (inp.down('KeyA')) fx -= 1; if (inp.down('KeyD')) fx += 1;
      const input = fx || fz, run = inp.down('ShiftLeft') || inp.down('ShiftRight'), heavy = this.invTotal() > 8 ? 0.85 : 1;
      if (this.seat) {   // sitting: rest up; moving (or E) stands Sam up again
        const fireSeat = s0 => s0.b && s0.b.def.park === 'camp';
        if (inp.hit('KeyE') && fireSeat(this.seat) && (this.inv.food || 0) >= 2 && this.hunger > 15) this.cookMeal(this.seat.b);
        else if (input || inp.hit('KeyE')) this.standUp();
        else {
          const s = this.seat; this.x = s.x; this.z = s.z; this.heading = s.heading; this.speed = 0; this.ring.visible = false; g.workgame.stop();
          const fire = s.b && s.b.def.park === 'camp'; this.energy = Math.min(100, this.energy + rawDt * (fire ? 5 : 3));
          g.ui.setPrompt(`Sitting${fire ? ' by the fire' : ''}. Resting: energy ${Math.round(this.energy)}%. Move to stand up${fire && (this.inv.food || 0) >= 2 && this.hunger > 15 ? ', E to cook a meal' : this.hunger > 30 ? ', Q to eat' : ''}.`, -1, true);
          if (inp.hit('KeyQ')) this.eat(); this.syncMesh(rawDt); return;
        }
      }
      if (this.platform) { g.transport.platformTick(); if (this.platform) this.interact(rawDt); this.syncMesh(rawDt); return; }   // on a station platform, waiting
      if (this.transit && this.transit.cabin) { g.transport.cabin(this, fx, fz, rawDt); this.interact(rawDt); if (!this.target) g.transport.cabinPrompt(this); this.syncMesh(rawDt); return; }   // aboard: walk about the carriage
      if (this.transit) { g.ui.setPrompt(`Riding the ${this.transit.L.K.name}...`, -1, true); this.syncMesh(rawDt); return; }
      if (this.onTop && !(this.jumpT > 0) && !this.falling && !this.game.world.topAt(this.x, this.z, 0.05, (this.floorY || 0) + 0.05)) { this.onTop = false; this.falling = { vy: 0, from: this.floorY || 0 }; }   // stepped off the bed/table: drop down
      if (this.falling) {   // off the roof: gravity, then a hard landing
        const f = this.falling; f.vy -= 24 * rawDt; this.floorY = (this.floorY || 0) + f.vy * rawDt;
        if (this.floorY <= 0) { this.floorY = 0; this.falling = null; const h = f.from; if (h > 14) { this.hp = 5; this.stagger(8); g.ui.toast('That was a very long way down. You come round in a heap.', 4000); } else if (h > 4) { this.hp = Math.max(5, (this.hp ?? 100) - h * 6); this.stagger(2); g.ui.toast('Oof! Hard landing.', 2000); } this.lastHit = g.elapsed; }
      }
      const lift = this.liftUpdate(rawDt, inp); if (lift === true) { this.syncMesh(rawDt); return; }
      if (inp.hit('KeyB') && (this.bike >= 0 || (this.car && !this.car.parked))) this.mount(!this.mounted);   // only once Sam owns a bike (B is also the Planning menu key, so no nagging)
      if (this.mounted && ((this.floorY || 0) > 0.3 || g.buildings.playerInside)) this.mount(false);
      if (this.mounted && this.rideLv === 3) this.driveCar(fx, fz, run, rawDt, inp);   // at the wheel: steering, not walking
      else {
      // grounded movement: a velocity with momentum (you speed up, slow down and swing round, rather than sliding), turn
      // before you go, a slow walk on a half-pushed stick (or Z), jog by default, Shift / L1 to sprint; aiming slows you to a strafe
      const aimDir = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)), air = this.jumpT > 0, padMag = inp.padActive ? Math.min(1, Math.hypot(inp.pad.lx, inp.pad.ly)) : 1;
      if (inp.hit('KeyZ') && !cb) { this.walkMode = !this.walkMode; g.ui.toast(this.walkMode ? 'Walking' : 'Jogging', 900); }
      let wx = 0, wz = 0;
      if (input) { const l = Math.hypot(fx, fz); fx /= l; fz /= l; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw); wx = -sy * fz + cy * fx; wz = -cy * fz - sy * fx; this.hold = 0; if (this.sleeping) this.wake(); }
      const walk = this.walkMode || padMag < 0.7, W0 = cb && WEAPONS[this.gun], foot = (this.stance === 'prone' ? 1.3 : this.stance === 'crouch' ? 3.3 : this.aiming ? 2.6 : walk && !run ? 1.7 : run ? 7.0 : 4.2) * (W0 && W0.slow ? W0.slow : 1) * (this.aiming && W0 && W0.scope ? 0.6 : 1);
      let target = input ? (this.mounted ? 4.6 * VEHICLE_SPEED[this.rideLv ?? this.bike] * (run ? 1.2 : 1) : foot * heavy * (this.landT > 0 ? 0.55 : 1)) : 0;
      if (this.cover && !this.mounted) { const cm = g.combat.coverMove(this, input ? wx : 0, input ? wz : 0, rawDt); wx = cm.x; wz = cm.z; target = cm.speed; }   // in cover: shuffle along it
      if (this.mounted) {   // bikes and horses keep the old feel
        if (input) { this.dirx = wx; this.dirz = wz; } this.speed += clamp(target - this.speed, -26 * rawDt, 20 * rawDt); this.vx = this.dirx * this.speed; this.vz = this.dirz * this.speed;
      } else {
        if (this.slideT > 0) { this.slideT -= rawDt; const k = Math.max(0, 1 - rawDt * 1.6); this.vx *= k; this.vz *= k; if (this.slideT <= 0 && this.stance === 'crouch') this.slideT = 0; }   // sliding: momentum, no steering
        const vx0 = this.vx || 0, vz0 = this.vz || 0, face = input ? Math.cos(angleDiff(this.heading, Math.atan2(wx, wz))) : 1;
        const acc = this.slideT > 0 ? 0 : air ? 3 : (target > Math.hypot(vx0, vz0) ? 16 : 24) * (this.aiming || this.cover ? 1 : clamp(0.35 + 0.65 * face, 0.3, 1));   // facing the wrong way: mostly turn first
        let dx = wx * target - vx0, dz = wz * target - vz0; const dl = Math.hypot(dx, dz), mx2 = acc * rawDt; if (dl > mx2) { dx *= mx2 / dl; dz *= mx2 / dl; }
        this.vx = vx0 + dx; this.vz = vz0 + dz; this.speed = Math.hypot(this.vx, this.vz); if (this.speed > 0.05) { this.dirx = this.vx / this.speed; this.dirz = this.vz / this.speed; }
      }
      const faceTo = this.aiming ? aimDir : this.cover ? this.coverFace : this.speed > 0.05 ? Math.atan2(this.dirx, this.dirz) : input ? Math.atan2(wx, wz) : this.heading;
      if (!air || this.aiming) this.heading += clamp(angleDiff(this.heading, faceTo), -(this.aiming ? 16 : 13 - Math.min(6, this.speed)) * rawDt, (this.aiming ? 16 : 13 - Math.min(6, this.speed)) * rawDt);
      if (this.speed > 0.05) {
        let mx = this.dirx, mz = this.dirz; if ((this.drunk || 0) > 0.3) { const t = g.elapsed, a = (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 0.53 + 1) * 0.5) * (this.drunk - 0.2); [mx, mz] = [mx * Math.cos(a) + mz * Math.sin(a), mz * Math.cos(a) - mx * Math.sin(a)]; }   // three sheets to the wind
        const ox = this.x, oz = this.z; this.tryMove(mx * this.speed * rawDt, mz * this.speed * rawDt); this.dist = Math.hypot(this.x - ox, this.z - oz); this.moved = this.dist > 0.0005;
        if (!this.moved || this.dist < this.speed * rawDt * 0.3) { this.vx *= 0.5; this.vz *= 0.5; this.speed *= 0.5; }   // walked into something: stop, don't moonwalk against it
        if (this.speed > 6 && this.moved && (this.dustT = (this.dustT || 0) - rawDt) <= 0) { this.dustT = 0.22; g.particles.burst(this.x, 0.1, this.z, g.world.road[g.world.idx(...g.world.tileOf(this.x, this.z))] ? 0xa88a62 : 0x8a9a62, 3, 0.4, 0.8, 0.07); }
        if (this.moved && !air && !this.mounted && (this.stepPh = (this.stepPh || 0) + this.dist / (0.38 + 0.21 * this.speed)) >= 1) { this.stepPh -= 1; Sfx.step(this.speed > 5); }   // footsteps
      } else this.dist = 0;
      }
      const EM = ['wave', 'dance', 'cheer', 'shrug', 'facepalm', 'vsign', 'airguitar', 'clap', 'think', 'macarena', 'robot', 'runningman', 'whigfield', 'riverdance', 'liam', 'pogo', 'threelions', 'kungfu', 'hairbrush', 'cheers', 'thumbsup', 'salute', 'bow', 'beckon', 'mexicanwave'];
      if (!cb && inp.hit('KeyG')) { this.emoteIdx = ((this.emoteIdx ?? -1) + 1) % EM.length; this.emote(EM[this.emoteIdx]); }
      if (!cb) for (let i = 1; i <= 8; i++) if (inp.hit('Digit' + i)) this.emote(EM[i]); if (!cb && inp.hit('Digit9')) this.emote('macarena'); if (inp.hit('Digit0')) this.emote('robot');
      if (inp.hit('Space') && !this.dead) this.jump();
      if (inp.hit('KeyC') && !cb) { const d = this.nearDoor(); if (d) { const open = (d.doorK || 0) > 0.5 || d.doorHeld; if (open && !this.game.buildings.doorRectHas(d, this.x, this.z, R + 0.1)) { d.doorHeld = false; d.doorUseT = 0; } else d.doorHeld = true; } }   // C: shut it if it's open (even if folk are inside), otherwise open it
      if (cb) { /* guns, grenades, melee: Combat.controls */ }
      else if (this.gun && !this.mounted && (inp.hit('KeyF') || inp.down('PadFire') || (inp.locked && inp.mouse.left) || (this.gun === 'smg' && inp.down('KeyF')))) this.shoot();   // armed: F, left click or R2 (hold for the SMG)
      else if (this.weapon && inp.hit('KeyF') && !(this.swingT > 0)) { this.swingT = 0.6; this.swingHit = false; }
      else if (!this.weapon && inp.hit('KeyF') && !this.mounted) this.attack('punch');
      if (inp.hit('KeyX') && !this.mounted && !this.gun && !cb) this.attack('kick');
      if (this.swingT > 0.3 && !this.swingHit && this.weapon) { this.swingHit = true; this.strike(); }
      if (inp.hit('KeyQ') && !lift && !cb) this.eat();
      if (inp.hit('KeyR') && !cb) this.drop();
      if (inp.hit('KeyI')) g.ui.openInventory(); if (inp.hit('KeyJ')) g.ui.openJournal();
      if (!lift && !this.dead) this.interact(rawDt);
    } else { this.game.workgame.stop(); this.ring.visible = false; if (g.autopilot) g.autopilot.update(dt); }   // planning view: Sam gets on with life by himself
    // needs (game seconds)
    if (g.started && !this.sleeping) {
      this.hunger = Math.min(100, this.hunger + dt * g.clock.rate() * 4); this.energy = Math.max(0, this.energy - dt * g.clock.rate() * 4.4 * (this.hunger > 85 ? 1.8 : 1));   // tiredness follows the clock: about one good sleep a night
      if (this.hunger > 65 && !this.hungerWarn) { this.hungerWarn = true; g.ui.toast('You are hungry. Press Q to eat food from your backpack, or eat by the Stockyard or a campfire.', 5200); }
      if (this.hunger < 40) this.hungerWarn = false;
      if (this.hunger >= 100) this.starveT += dt; else this.starveT = 0;
    }
    if ((this.energy <= 0 || this.starveT > 30) && !this.sleeping && this.sedated <= 0 && g.started) this.collapse(this.starveT > 30 ? 'hunger' : 'tired');
    this.syncMesh(rawDt);
  }
  /** If a wall or furniture has appeared around Sam (a building just finished), step out to the nearest free spot. */
  /** Is the straight line from Sam to (x, z) free of anything tall (walls, not furniture he could have hopped)? Stops 'unsticking' through a wall. */
  clearTo(x, z) { const w = this.game.world, y = (this.floorY || 0) + 2.2, dx = x - this.x, dz = z - this.z, d = Math.hypot(dx, dz); for (let t = 0; t <= d; t += 0.1) if (w.collides(this.x + dx / d * t, this.z + dz / d * t, 0.05, true, y)) return false; return true; }
  unstick() {
    const w = this.game.world; if (this.game.mode !== 'sim' || this.sleeping || this.jumpT > 0 || this.ride || this.transit || this.platform || !w.collides(this.x, this.z, this.bodyR(), false, this.floorY || 0)) return;
    const fy = this.floorY || 0, r0 = this.bodyR(); for (let r = 0.1; r <= 1.3; r += 0.1) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) { const x = this.x + Math.cos(a) * r, z = this.z + Math.sin(a) * r; if (!w.collides(x, z, r0, false, fy) && this.clearTo(x, z)) { this.x = x; this.z = z; return; } }   // the nearest free spot on this side of any wall first
    if (fy > 0.5) return;
    const ins = this.game.buildings.list.find((b) => b.state === 'done' && b.colliders.some((c) => this.x > c.minx - R && this.x < c.maxx + R && this.z > c.minz - R && this.z < c.maxz + R));
    if (ins && ins.doorOut && !w.collides(ins.doorOut.x, ins.doorOut.z, R) && Math.hypot(ins.cx - this.x, ins.cz - this.z) < Math.max(ins.w, ins.d) * TILE) { this.x = ins.doorOut.x; this.z = ins.doorOut.z; return; }
    for (let r = 0.3; r < 8; r += 0.3) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) { const x = this.x + Math.cos(a) * r, z = this.z + Math.sin(a) * r; if (!w.collides(x, z, R)) { this.x = x; this.z = z; return; } }
  }

  /** Eat: first from the backpack, otherwise from the Stockyard or a campfire close by. */
  eat() {
    const g = this.game; if (this.hunger < 12) { g.ui.toast('You are not hungry.'); return; }
    if (this.inv.food) { this.invTake('food', 1); this.hunger = Math.max(0, this.hunger - 35); g.ui.toast('You eat some of what you gathered. Tasty!'); Sfx.play('eat'); g.flags.ate = (g.flags.ate || 0) + 1; return; }
    const near = g.buildings.list.some((b) => b.state === 'done' && (b.def.stores || b.def.park === 'camp') && Math.hypot(b.cx - this.x, b.cz - this.z) < b.def.w * 2 + 3.5);
    if (near) { if (g.economy.stock.food >= 0.5) { g.economy.stock.food -= 0.5; this.hunger = Math.max(0, this.hunger - 55); g.ui.toast('You share a hot meal. (-0.5 food from the Stockyard)'); Sfx.play('eat'); g.flags.ate = (g.flags.ate || 0) + 1; } else { g.ui.toast('The Stockyard has no food. Pick berries (Basket) or fish (Rod) first.'); Sfx.play('deny'); } return; }
    Sfx.play('deny'); g.ui.toast(g.economy.stock.food > 0 ? 'Walk to the Stockyard or a campfire to eat from the store, or carry food and press Q.' : 'No food to eat. Pick berries with the Basket, then press Q.');
  }
  /** Next to the door of the stair hut on a roof: open or shut it. */
  roofDoorTarget() {
    const g = this.game, q = this.planAt(this.x, this.z), RD = q && q.b.ext && q.b.ext.roofDoor; if (!RD || Math.abs((this.floorY || 0) - RD.y) > 0.8) return null;
    const [dx, dz] = q.b.toWorld(RD.x, RD.z), d = Math.hypot(dx - this.x, dz - this.z); if (d > 1.8) return null; const b = q.b;
    return { kind: 'act', text: b.roofDoorOpen ? 'Shut the roof door' : 'Open the door to the roof', act: () => { b.roofDoorOpen = !b.roofDoorOpen; b.roofDoorT = g.elapsed + 12; Sfx.play('door'); } };
  }
  /** Get on (or off) Sam's bike. */
  mount(on) {
    const g = this.game; if (on === this.mounted) return;
    if (on) {
      const car = this.car && !this.car.parked && this.car.c; if (!car && (this.bike === undefined || this.bike < 0)) { g.ui.toast('You need a bike first: buy one at a Cycle Shop.', 2400); return; }
      if ((this.floorY || 0) > 0.3 || g.buildings.playerInside) { g.ui.toast('Not indoors!', 1500); return; }
      if (this.seat) this.standUp(); this.mounted = true; this.rideLv = car ? 3 : this.bike; this.veh = makeRide(this.rideLv, car ? car.color : 0xe8772e); this.mesh.add(this.veh); g.ui.toast(car ? 'Behind the wheel. B to get out (the car stays where you leave it).' : `On your ${VEHICLE_NAMES[this.bike]}. B to get off.`, 1800);
    } else { this.mounted = false; if (this.veh) { this.mesh.remove(this.veh); this.veh = null; } this.mesh.position.y = this.floorY || 0; if (this.rideLv === 3 && g.cars) g.cars.leave(this); this.rideLv = null; this.carV = 0; }
  }
  /** Fisticuffs: F punches (jab, cross, then a harder third in a quick combo), X kicks. */
  attack(type) {
    const g = this.game; if (this.atkCD > 0 || this.sleeping || this.seat || this.down > 0 || this.sedated > 0) return;
    const now = g.elapsed, combo = type === 'punch' && now - (this.lastAtk || 0) < 0.8 ? (this.combo || 0) + 1 : 0; this.combo = combo % 3; this.lastAtk = now; this.lastCombat = now;
    const kick = type === 'kick'; this.atkAnim = kick ? 'kick' : this.combo % 2 ? 'punchL' : 'punch'; this.atkT = kick ? 0.5 : 0.32; this.atkCD = kick ? 0.6 : 0.24;
    const range = kick ? 2.0 : 1.55, dmg = kick ? 24 : this.combo === 2 ? 20 : 11, fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let best = null, bd = 1e9;
    for (const s of g.population.sims) {
      if (s.remove || s.hidden || s.pose === 'sleep' || s.down > 0 || s.kind === 'security' || (s.inside && s.inside !== g.buildings.playerInside)) continue;
      const dx = s.x - this.x, dz = s.z - this.z, d = Math.hypot(dx, dz); if (d > range || (d > 0.5 && (dx * fx + dz * fz) / d < 0.35)) continue; if (d < bd) { bd = d; best = s; }
    }
    if (best) { setTimeout(() => { if (!best.remove) { g.crime.samHit(best, dmg); this.shake = Math.max(this.shake || 0, kick ? 0.6 : 0.35); Sfx.noise(0.09, { freq: kick ? 200 : 380, vol: 0.4, type: 'lowpass' }); } }, kick ? 220 : 120); }
    else Sfx.noise(0.06, { freq: 1600, vol: 0.06 });
  }
  /** Sam gets hit (a brawler, a mugger). Knocked flat when his health runs out. */
  takeHit(dmg, from) {
    const g = this.game; if (g.combat.on) { g.combat.hurtPlayer(dmg, from || {}); return; } if (this.sedated > 0 || this.down > 0 || this.transit) return; this.hp = (this.hp ?? 100) - dmg; this.hitT = 0.35; this.lastHit = g.elapsed; this.lastCombat = g.elapsed; this.shake = Math.max(this.shake || 0, 0.5);
    if (this.mounted) this.mount(false);
    if (from) { const dx = this.x - from.x, dz = this.z - from.z, d = Math.hypot(dx, dz) || 1; this.tryMove(dx / d * 0.35, dz / d * 0.35); }
    if (this.hp <= 0) { this.hp = 40; this.stagger(3.5); g.ui.toast('Knocked out cold! You come round with a headache.', 3000); for (const s of g.population.sims) if (s.fight && s.fight.foe === this) g.crime.endFight(s, true); }
  }
  /** Swing the club: stuns raiders in front of Sam (two clean hits put one down). */
  strike() {
    const g = this.game; if (!g.raids || !g.raids.alert) return; const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (const r of g.raids.raiders) {
      if (r.captured || r.remove) continue; const dx = r.x - this.x, dz = r.z - this.z, d = Math.hypot(dx, dz);
      if (d < 2.5 && (d < 0.7 || (dx * fx + dz * fz) / d > 0.2)) { g.raids.hit(r, 1); r.atkT = 0; r.path = []; g.social.say(r, 'Argh!', 1.4); Sfx.play('chop'); }
    }
  }
  /** Knocked flat by a raider for a couple of seconds; the backpack spills. */
  stagger(sec = 2.2) {
    if (this.sedated > 0 || this.down > 0) return; const g = this.game; this.down = sec; this.swingT = 0; this.energy = Math.max(0, this.energy - 10);
    if (this.invTotal()) { g.piles.add(this.x, this.z, { ...this.inv }); this.inv = {}; g.ui.toast('You are knocked down and your backpack spills!'); } else g.ui.toast('You are knocked to the ground!');
  }
  /** The door Sam is nearest and facing (within 3 m). */
  nearDoor() {
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); let best = null, bs = 1e9;
    for (const b of this.game.buildings.list) {
      if (!b.ext || !b.ext.doors || !b.ext.doors.length) continue; const dx = b.doorPos.x - this.x, dz = b.doorPos.z - this.z, d = Math.hypot(dx, dz); if (d > 3.1) continue;
      const sc = d + (d > 0.3 ? (1 - (dx * fx + dz * fz) / d) * 1.2 : 0); if (sc < bs) { bs = sc; best = b; }
    }
    return best;
  }
  /** Closed front doors block Sam (press C to open them). */
  doorBlocks(x, z, r) {
    for (const b of this.game.buildings.list) {
      if (!b.ext || !b.ext.doors || !b.ext.doors.length || (b.doorK || 0) > 0.6 || Math.abs(b.cx - x) > 14 || Math.abs(b.cz - z) > 14) continue;
      const q = this.game.buildings.doorRect(b), cx = Math.max(q.minx, Math.min(x, q.maxx)), cz = Math.max(q.minz, Math.min(z, q.maxz));
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
    }
    return false;
  }
  /** Sam's collision radius: slimmer indoors (on foot) so he fits through doorways and between the furniture. */
  bodyR() { return !this.mounted && this.game.buildings.buildingAtPoint(this.x, this.z) ? R_IN : R; }
  tryMove(dx, dz) {
    const w = this.game.world, y = this.floorY || 0, r = this.bodyR(), hit = (x, z) => w.collides(x, z, r, false, y + (this.jumpY || 0)) || (y < 0.5 && this.doorBlocks(x, z, r)) || !this.footing(x, z);
    let bx = false, bz = false;
    if (!hit(this.x + dx, this.z)) { this.x += dx; this.floorY = this._fy; } else bx = dx !== 0;
    if (!hit(this.x, this.z + dz)) { this.z += dz; this.floorY = this._fy; } else bz = dz !== 0;
    // caught on the edge of a doorway or the corner of a piece of furniture while heading mostly one way: slip round it
    if (this.mounted || bx === bz) return;
    const m = bx ? Math.abs(dx) : Math.abs(dz), side = bx ? dz : dx, only = Math.abs(side) > m * 0.3 ? Math.sign(side) : 0;   // going diagonally: only slip the way he's already heading
    for (const s of [0.08, 0.16, 0.24, 0.32]) for (const sg of [1, -1]) {
      if (only && sg !== only) continue;
      const ox = bx ? 0 : sg * s, oz = bx ? sg * s : 0;
      if (hit(this.x + ox, this.z + oz) || hit(this.x + ox + dx * (bx ? 1 : 0), this.z + oz + dz * (bz ? 1 : 0))) continue;
      const k = Math.min(m, s) / s, nx = this.x + ox * k, nz = this.z + oz * k; if (hit(nx, nz)) continue;
      this.x = nx; this.z = nz; this.floorY = this._fy; return;
    }
  }

  // ---------- interaction ----------
  findTarget() {
    if (this.game.netVisitor) {   // visiting someone else's town: the trains and the shops, nothing else
      let best = null, bd = 1e9; const c = (t, d) => { if (d < bd) { bd = d; best = t; } }; this.game.transport.targets(this, c); if (!this.platform && !this.transit) this.game.net.shopTargets(this, c); return best;
    }
    if (this.platform || (this.transit && this.transit.cabin)) { let best = null, bd = 1e9; this.game.transport.targets(this, (t, d) => { if (d < bd) { bd = d; best = t; } }); return best; }
    if ((this.floorY || 0) > 0.5) return this.roofDoorTarget();   // upstairs and on roofs: just the door out onto the roof
    const g = this.game, px = this.x, pz = this.z, B = g.buildings.list; let best = null, bd = 1e9;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), full = this.invRoom() <= 0;
    // prefer what Sam is facing (the camera direction): things behind count as further away
    // ...and nothing through a wall or a shut door: a target with a position (x, z, or `at` for one that doesn't steer by facing) has to be in sight
    const eyeY = (this.floorY || 0) + 1.3, shut = g.buildings.list.filter((b) => b.ext && b.ext.doors && b.ext.doors.length && (b.doorK || 0) <= 0.6 && Math.abs(b.cx - px) < 16 && Math.abs(b.cz - pz) < 16).map((b) => g.buildings.doorRect(b));
    const seen = (x, z) => !g.world.wallBetween(px, pz, x, z, eyeY) && !shut.some((q) => segBox(px, pz, x, z, q, 0.6));
    const consider = (t, d, x, z, at) => { const q = at || (x !== undefined ? [x, z] : null); if (q && !seen(q[0], q[1])) return; if (x !== undefined) { const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz); if (l > 0.3) d += (1 - (dx * fx + dz * fz) / l) * 0.9; } if (d < bd) { bd = d; best = t; } };
    for (const s of g.population.sims) {
      if (s.kind === 'raider' || s.kind === 'guest') continue;
      if (s.pose === 'sleep' || s.hidden || !s.mesh.visible || (s.inside && s.inside !== g.buildings.playerInside && !s.inside.def.open)) continue;
      const dx = s.x - px, dz = s.z - pz, d = Math.hypot(dx, dz); if (d > 2.6) continue;
      if (!this.third && d > 0.8 && (dx * fx + dz * fz) / d < 0.3) continue;
      consider({ kind: 'sim', sim: s, text: `Talk to ${s.name} (${s.roleName})` }, d - 0.5, undefined, undefined, [s.x, s.z]);
    }
    if (g.raids.pickup && !this.weapon) { const q = g.raids.pickup, d = Math.hypot(q.x - px, q.z - pz); if (d < 2.6) consider({ kind: 'weapon', text: 'Take the militia club  (F to swing)' }, d - 1, undefined, undefined, [q.x, q.z]); }
    for (const it of g.tools.items) { if (it.taken) continue; const d = Math.hypot(it.x - px, it.z - pz); if (d < 2.5) consider({ kind: 'tool', item: it, text: `Pick up the ${TOOLS[it.id]}` }, d - 2, undefined, undefined, [it.x, it.z]); }
    { const cu = g.curios && g.curios.near(px, pz, 2.2); if (cu) consider({ kind: 'curio', item: cu, text: `Pick up something shiny...` }, Math.hypot(cu.x - px, cu.z - pz) - 1.5, undefined, undefined, [cu.x, cu.z]); }
    if (g.hazards) for (const f of g.hazards.fires) { const b = f.b, d = Math.max(0, Math.hypot(b.cx - px, b.cz - pz) - Math.max(b.def.w, b.def.d) * 2); if (d < 4) consider({ kind: 'douse', b, hold: true, text: `Fight the fire at the ${b.def.name}! (hold E)` }, d - 3); }
    if (g.transport) g.transport.targets(this, consider); if (g.cars) g.cars.targets(this, consider); if (g.happenings) g.happenings.targets(this, consider);
    { const L = g.lift, h = L && L.ext && L.ext.hatch; if (h) { const [hx, hz] = L.toWorld(h.x, h.z), d = Math.hypot(hx - px, hz - pz); if (d < 2.2) consider({ kind: 'hatch', b: L, text: 'Order supplies on the Lift intercom' }, d - 1.0, hx, hz); } }
    { const nd = this.nearDoor(); if (nd) { const d = Math.hypot(nd.doorPos.x - px, nd.doorPos.z - pz); consider({ kind: 'info', text: `Press C to ${(nd.doorK || 0) > 0.5 ? 'close' : 'open'} the door` }, d + 0.9); } }
    for (const st of g.celebrations.stalls) { const d = Math.hypot(st.x - px, st.z - pz); if (d < 2.4) consider({ kind: 'stall', stall: st, text: g.celebrations.stallText(st) }, d - 0.8, st.x, st.z); }
    for (const p of g.piles.list) { const d = Math.hypot(p.x - px, p.z - pz); if (d < 2.2) consider({ kind: 'pile', pile: p, text: full ? 'Your backpack is full' : `Pick up ${Object.entries(p.items).map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ')}` }, d - 1.2, undefined, undefined, [p.x, p.z]); }
    for (const b of B) if (b.state === 'done' && b.def.park === 'camp' && (this.inv.food || 0) >= 2 && this.hunger > 15) { const d = Math.hypot(b.cx - px, b.cz - pz); if (d < 4.5) consider({ kind: 'cook', b, text: 'Cook a hot meal on the fire (uses 2 food)' }, d - 2.5, undefined, undefined, [b.cx, b.cz]); }
    for (const b of B) if (b.state === 'done' && b.spots.seat && (b.def.open || b.def.park || b === g.buildings.playerInside)) for (const s of b.spots.seat) { if (s.taken) continue; const d = Math.hypot(s.x - px, s.z - pz); if (d < (b.def.park === 'camp' ? 2.2 : 1.4)) consider({ kind: 'seat', seat: s, b, text: b.def.park === 'camp' ? 'Sit by the fire' : 'Sit down' }, d + 0.3, s.x, s.z); }
    if (g.roadPlans.count) {
      const p0 = g.roadPlans.at(px, pz); let rp = p0, rd = 0; if (!rp) { for (const q of g.roadPlans.plans.values()) { const d = Math.hypot(q.cx - px, q.cz - pz); if (d < 3.4 && (!rp || d < rd)) { rp = q; rd = d; } } }
      if (rp) consider(this.tools.has('shovel') ? { kind: 'road', plan: rp, work: 'dig', text: `Dig the ${rp.type === 2 ? 'paved road (uses 1 stone)' : 'path'}` } : { kind: 'info', text: 'You need the Shovel to dig paths. Pick it up from the Tool Rack.' }, rd + 0.3, undefined, undefined, [rp.cx, rp.cz]);
    }
    { const v = g.celebrations.guests.v; if (v && v.s.mesh.visible) { const d = Math.hypot(v.s.x - px, v.s.z - pz); if (d < 2.6) consider({ kind: 'act', text: `Ask ${v.G.name} for a photo and an autograph`, act: () => g.celebrations.guests.meet() }, d - 1.5, undefined, undefined, [v.s.x, v.s.z]); } }
    for (const b of g.upgrades.orders.length ? B.concat(g.upgrades.orders) : B) {
      if (b.state === 'done') {
        if ((b.id === 'church' || b.id === 'chapel') && b.spots.seat.length) { const d = Math.hypot(b.doorIn.x - px, b.doorIn.z - pz); if (d < 2.6) consider({ kind: 'act', text: 'Read the parish register (births and deaths)', act: () => g.ui.openTerminal(b, 'register') }, d + 0.4); }
        if (b === g.buildings.playerInside && !b.def.open && (this.floorY || 0) < 0.5) { const q = g.buildings.switchAt(b); if (q) { const d = Math.hypot(q.x - px, q.z - pz), lit = g.buildings.isLit(b, g.clock.hour), el = g.tech && g.tech.era >= 1; if (d < 1.7) consider({ kind: 'act', text: el ? (lit ? 'Switch the light off' : 'Switch the light on') : (lit ? 'Put the lamp out' : 'Light the lamp'), act: () => g.buildings.flipLight(b) }, d + 0.2, undefined, undefined, [q.x, q.z]); } }
        if (b.id === 'phonebox') { const d = Math.hypot(b.cx - px, b.cz - pz); if (d < 2.4) consider({ kind: 'phone', b, text: 'Make a call (10p)' }, d - 0.8, b.cx, b.cz); }
        if (b.id === 'bookies' && b.spots.visit[0]) { const v = b.spots.visit[0], d = Math.hypot(v.x - px, v.z - pz); if (d < 2.2) consider({ kind: 'bet', b, text: 'Have a flutter on the horses (£20)' }, d - 0.6, v.x, v.z); }
        if (b.id === 'postbox') { const d = Math.hypot(b.cx - px, b.cz - pz); if (d < 2.4) { const n = g.mail.unread(); consider({ kind: 'post', b, text: n ? `Check the post (✉ ${n} new)` : 'Check the post' }, d - 1.0, b.cx, b.cz); } }
        for (const t of b.spots.terminal) { const d = Math.hypot(t.x - px, t.z - pz); if (d < 1.9) consider({ kind: 'terminal', b, text: (b.era ?? 0) >= 2 ? 'Use the computer terminal' : 'Use the planning desk (ledgers and forms)' }, d, undefined, undefined, [t.x, t.z]); }
        for (const t of b.spots.pickup) { const d = Math.hypot(t.x - px, t.z - pz); if (d < 2.8) consider({ kind: 'depot', b, text: this.invTotal() ? `Open the Stockyard (store ${this.invText()}, or take things)` : 'Open the Stockyard (take what you need)' }, d, undefined, undefined, [t.x, t.z]); }
        if (b === g.starterHome && b.spots.bed[0]) { const s = b.spots.bed[0], d = Math.hypot(s.x - px, s.z - pz); if (d < 2.6) consider({ kind: 'bed', b, spot: s, text: 'Sleep in your bed' }, d, undefined, undefined, [s.x, s.z]); }
        if (b.def.jobs && b.id !== 'contractor') {
          const role = Object.keys(b.def.jobs)[0];
          for (const t of b.spots.work) {
            const d = Math.hypot(t.x - px, t.z - pz); if (d > 1.6) continue;
            const manned = g.population.sims.some((s) => s.inside === b && Math.hypot(s.x - t.x, s.z - t.z) < 1.2);
            if (!manned) consider({ kind: 'work', b, role, text: `Work a shift as ${ROLES[role].name}  (hold E, earns city funds)`, hold: true }, d + 0.3, undefined, undefined, [t.x, t.z]);
          }
        }
        if (g.service && g.service.isPublic(b) && !b.open && g.buildings.playerInside === b) consider({ kind: 'info', text: `Closed. Nobody's behind the counter at the ${b.def.name} right now.` }, 2.5);
        // buy over the counter from whoever is serving
        if (SHOP_GOODS[b.id] || b.def.shopping || b.def.dining) for (const s of b.workers || []) {
          if (s.activity !== 'work' || s.phase !== 2 || s.down > 0 || !g.buildings.onBuilding(b, s.x, s.z)) continue; const d = Math.hypot(s.x - px, s.z - pz); if (d > 3.4) continue;   // (across the counter)
          consider({ kind: 'act', text: `${SHOP_GOODS[b.id] && /tavern|wmc|nightclub|snooker/.test(b.id) ? 'Get a drink' : 'Buy something'} from ${s.first}`, act: () => g.ui.openShop(b, s, SHOP_GOODS[b.id] || GENERIC_GOODS) }, d - 0.8, s.x, s.z); break;
        }
      } else if (b.state === 'site') {
        const dx = Math.max(b.x0 * TILE - px, 0, px - (b.x0 + b.w) * TILE), dz = Math.max(b.z0 * TILE - pz, 0, pz - (b.z0 + b.d) * TILE), d = Math.hypot(dx, dz);
        if (d < 3.2) {
          const give = this.deliverable(b); let t;
          if (give.length) t = { kind: 'site', b, deliver: true, text: `Deliver ${give.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ')}` };
          else if (g.construction.workable(b) && !this.tools.has('hammer')) t = { kind: 'info', text: 'You need the Hammer to build. Pick it up from the Tool Rack.' };
          else if (g.construction.workable(b)) t = { kind: 'site', b, work: 'build', text: `Build the ${b.def.name}` };
          else { const miss = Object.keys(b.need).map((m) => [m, b.need[m] - (b.have[m] || 0)]).filter(([, n]) => n > 0); t = { kind: 'info', text: `${b.def.name} needs ${miss.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ')}` }; }
          consider(t, d + 0.2, undefined, undefined, [Math.max(b.x0 * TILE + 1, Math.min(px, (b.x0 + b.w) * TILE - 1)), Math.max(b.z0 * TILE + 1, Math.min(pz, (b.z0 + b.d) * TILE - 1))]);   // (a metre into the plot: its edge can be right at a neighbour's wall)
        }
      }
    }
    // gatherable resources
    const R2 = g.resources, w = g.world;
    const addGather = (node, kind, verb, mat, time, per, upper, d, need) => {
      const tn = TOOL_FOR[kind]; if (tn && !this.tools.has(tn)) { consider({ kind: 'info', text: `You need the ${TOOLS[tn]} for this. Pick it up from the Tool Rack.` }, d + 1); return; }
      if (need && !g.buildings.count(need[0])) { consider({ kind: 'info', text: `${verb.split(' ')[0]}: you need a ${need[1]} to turn this into ${MATERIALS[mat].name.toLowerCase()}` }, d + 1.5); return; }
      consider(full ? { kind: 'info', text: 'Your backpack is full. Store it at the Stockyard, deliver it, or drop it (R).' } : { kind: 'gather', node, nk: kind, mat, time, per, upper, work: WORK_KIND[upper], text: verb }, d + 0.4, node.x, node.z);
    };
    for (const t of g.terrain.trees) { if (!t.alive) continue; const d = Math.hypot(t.x - px, t.z - pz); if (d < 3.7) addGather(Object.assign(t, { kind: 'tree' }), 'tree', 'Chop tree', 'timber', 2.2, 1, 'chop', d); }
    for (const n of R2.nodes) {
      if (n.amount < 1) continue; const d = Math.hypot(n.x - px, n.z - pz), reach = n.kind === 'field' ? 3.2 : 3.0; if (d > reach) continue;
      if (n.kind === 'rock') addGather(n, 'rock', 'Break rocks', 'stone', 2.6, 1, 'mine', d);
      else if (n.kind === 'ore') addGather(n, 'ore', 'Mine iron ore', 'steel', 3.0, 1, 'mine', d, ['foundry', 'Foundry']);
      else if (n.kind === 'clay') addGather(n, 'clay', 'Dig clay', 'brick', 2.6, 1, 'dig', d, ['brickworks', 'Brickworks']);
      else if (n.kind === 'berry') addGather(n, 'berry', 'Pick berries', 'food', 1.7, 2, 'harvest', d);
      else if (n.kind === 'field') addGather(n, 'field', 'Harvest crops', 'food', 1.9, 2, 'harvest', d);
    }
    { const [tx, tz] = w.tileOf(px, pz), tt = w.inBounds(tx, tz) ? w.terrain[w.idx(tx, tz)] : 0;
      if (tt === T.SAND && !w.road[w.idx(tx, tz)] && !g.buildings.playerInside && !g.buildings.buildingAtPoint(px, pz)) addGather({ kind: 'sand', infinite: true, amount: 999, x: px, z: pz }, 'sand', 'Dig sand', 'glass', 3.0, 1, 'dig', 2.9, ['glassworks', 'Glassworks']);
      const ax0 = px - Math.sin(this.yaw) * 2.6, az0 = pz - Math.cos(this.yaw) * 2.6, [ax, az] = w.tileOf(ax0, az0);
      if (w.inBounds(ax, az) && w.terrain[w.idx(ax, az)] === T.WATER && w.isLand(tx, tz)) addGather({ kind: 'fish', infinite: true, amount: 999, x: ax0, z: az0 }, 'fish', 'Fish', 'food', 3.2, 2, 'fish', 1.4); }
    return best;
  }
  /** Materials in the backpack that this site still needs: [[mat, qty], ...] */
  deliverable(b) { const out = []; for (const [m, n] of Object.entries(this.inv)) { const need = (b.need[m] || 0) - (b.have[m] || 0); if (need > 0) out.push([m, Math.min(n, need)]); } return out; }
  targetKey(t) { return t.kind + ':' + (t.node ? (t.node.idx ?? (t.node.x.toFixed(1) + t.node.z.toFixed(1))) : t.b ? t.b.uid : t.plan ? t.plan.x + ',' + t.plan.z : ''); }

  interact(rawDt) {
    const g = this.game, inp = g.input; let nt = this.findTarget();
    // once a job is started Sam locks on to it until it is finished, Sam walks off, or it drifts out of reach
    if (this.lock) { const L = this.lock; if (!this.stillValid(L) || this.distTo(L) > 4.2 || performance.now() - (this.lockT || 0) > 2500 || Math.hypot(this.x - this.lockPos.x, this.z - this.lockPos.z) > 0.9) this.lock = null; else nt = L; }
    this.target = nt; const t = nt; this.placeRing(t); if (t && t.kind === 'info' && /Tool Rack/.test(t.text)) this.needToolT = g.elapsed + 10;
    if (!t || !t.work) g.workgame.stop();
    g.ui.setPrompt(t ? t.text + (t.work ? '' : t.hold ? '  (hold E)' : t.kind === 'info' ? '' : '') : null, t && t.hold ? this.hold : -1, t && t.kind === 'info');
    if (!t) { this.hold = 0; return; }
    if (this.interactCD > 0) this.interactCD -= rawDt; const calm = this.interactCD > 0, e = inp.hit('KeyE') && !calm, held = inp.down('KeyE') && !calm;
    if (t.work) return this.doWork(t, rawDt, e, held);
    if (t.kind === 'sim' && e) g.startDialogue(t.sim);
    else if (t.kind === 'terminal' && e) { Sfx.play('ui'); g.ui.openTerminal(t.b); }
    else if (t.kind === 'post' && e) { Sfx.play('ui'); g.ui.openTerminal(t.b, 'post'); }
    else if (t.kind === 'hatch' && e) { Sfx.play('ui'); g.ui.openTerminal(t.b, 'hatch'); }
    else if (t.kind === 'phone' && e) this.phoneCall();
    else if (t.kind === 'bet' && e) this.placeBet();
    else if (t.kind === 'depot' && e) this.useDepot();
    else if (t.kind === 'bed' && e) this.trySleep(t.spot);
    else if (t.kind === 'tool' && e) { g.tools.take(t.item); this.tools.add(t.item.id); Sfx.play('pickup'); g.ui.toast(`You take the ${TOOLS[t.item.id]}. It goes on your belt.`, 2600); }
    else if (t.kind === 'pile' && e) this.takePile(t.pile);
    else if (t.kind === 'curio' && e) g.curios.take(t.item);
    else if (t.kind === 'seat' && e) this.sitOn(t.seat, t.b);
    else if (t.kind === 'cook' && e) this.cookMeal(t.b);
    else if (t.kind === 'stall' && e) g.celebrations.useStall(t.stall);
    else if (false) { this.invTake('food', 2); this.hunger = 0; this.energy = Math.min(100, this.energy + 20); g.flags.ate = (g.flags.ate || 0) + 1; g.flags.cooked = (g.flags.cooked || 0) + 1; Sfx.play('eat'); Sfx.noise(0.6, { freq: 1800, q: 0.6, vol: 0.15 }); g.particles.burst(t.b.cx, 0.8, t.b.cz, 0xffb03a, 12, 0.6, 3, 0.08); g.ui.toast(['A proper stew! You feel brand new.', 'Fish on a stick, charred just right.', 'Berry crumble, campfire style. Delicious.', 'Toasted bread and hot jam. Lovely.'][Math.floor(Math.random() * 4)], 2800); }
    else if (t.kind === 'weapon' && e) { if (g.raids.take()) { this.weapon = 'club'; Sfx.play('pickup'); g.ui.toast('You take the club. Press F to swing it.', 3200); } }
    else if (t.kind === 'site' && t.deliver && e) this.deliverTo(t.b);
    else if (t.kind === 'work') { if (held) { this.working = true; g.economy.earn(12 * rawDt, 'Shifts Sam worked'); this.hold = (this.hold + rawDt * 0.2) % 1; } else this.hold = 0; }
    else if (t.kind === 'act' && e) t.act();
    else if (t.kind === 'douse') { if (held) { this.working = true; g.hazards.douse(t.b, rawDt, this); this.hold = (this.hold + rawDt * 0.5) % 1; } else this.hold = 0; }
    else if (t.kind === 'info' && e) Sfx.play('deny');
    if (!held && !['rest'].includes(t.kind)) this.hold = 0;
  }
  distTo(t) {
    if (t.node) return Math.hypot(t.node.x - this.x, t.node.z - this.z);
    if (t.plan) return Math.hypot(t.plan.cx - this.x, t.plan.cz - this.z) - 1.5;
    if (t.b) { const b = t.b, dx = Math.max(b.x0 * TILE - this.x, 0, this.x - (b.x0 + b.w) * TILE), dz = Math.max(b.z0 * TILE - this.z, 0, this.z - (b.z0 + b.d) * TILE); return Math.hypot(dx, dz); }
    return 0;
  }
  stillValid(t) { if (t.kind === 'site' && t.work) return t.b.state === 'site' && this.game.construction.workable(t.b); if (t.kind === 'gather') return t.node.kind === 'tree' ? t.node.alive : (t.node.infinite || t.node.amount >= 1); if (t.kind === 'site') return t.b.state === 'site'; if (t.kind === 'road') return this.game.roadPlans.has(t.plan.x, t.plan.z); return true; }

  /** Timing minigame: every tap is graded; holding the button works slowly on its own. */
  doWork(t, dt, tap, held) {
    const g = this.game, wg = g.workgame;
    if (t.kind === 'site' && !g.construction.workable(t.b)) { wg.stop(); this.lock = null; return; }   // out of materials: nothing to hammer
    wg.start(t.work, this.targetKey(t));
    if (tap || held) { this.lockT = performance.now(); if (this.lock !== t) { this.lock = t; this.lockPos = { x: this.x, z: this.z }; } }
    const fx = t.node ? t.node.x : t.b ? t.b.cx : t.plan.cx, fz = t.node ? t.node.z : t.b ? t.b.cz : t.plan.cz; let value = 0;
    if (tap) {
      const r = wg.press(); value = r.q === 'none' ? 0 : r.fish ? (r.q === 'miss' ? 0 : 1.2) * r.mult : STROKE[r.q] * r.mult; value *= g.skills.bonus(t.work); g.skills.gain(t.work, r.q === 'perfect' ? 2 : r.q === 'good' ? 1 : 0);
      if (r.q === 'perfect' && wg.combo >= 3) this.chainSpill(wg.combo, t);
      if (t.node) { if (t.nk === 'tree') { g.terrain.hitTree(t.node); g.terrain.fallFrom = { x: this.x, z: this.z }; } else g.resources.shake(t.node); } this.strikeT = 0.5; this.faceTo(fx, fz); if (r.q === 'perfect') this.shake = 0.25;
      const hx = this.x + (fx - this.x) * 0.6, hz = this.z + (fz - this.z) * 0.6; g.particles.burst(hx, t.work === 'build' ? 0.8 : 1.0, hz, t.nk === 'berry' ? (Math.random() < 0.5 ? 0xc0243a : 0x7a2a8a) : t.nk === 'field' ? 0xe0c050 : CHIP[t.work], r.q === 'perfect' ? 14 : r.q === 'good' ? 8 : 3, 1, 3.2);
    }
    if (held && t.work !== 'fish') { value += dt * 0.35; this.faceTo(fx, fz); }
    if (held || this.strikeT > 0 || t.work === 'fish') this.working = true;
    const speed = Math.max(1, g.clock.speed);
    if (t.kind === 'gather') {
      this.gatherT = (this.gatherT || 0) + value * t.time;
      while (this.gatherT >= t.time) {
        this.gatherT -= t.time; if (!g.resources.take(t.node)) { this.gatherT = 0; break; }
        let got = this.invAdd(t.mat, t.per); const lucky = Math.random() < g.skills.luck(t.work) && this.invRoom() > 0 ? this.invAdd(t.mat, 1) : 0; got += lucky; g.skills.gain(t.work, 2); g.flags.gathered = (g.flags.gathered || 0) + got; Sfx.play('unit'); wg.pop(t.nk === 'fish' ? `+${got} food: ${['a mackerel', 'a fat cod', 'a herring', 'a little sole', 'a plaice', 'a sardine', 'an old boot... no, a crab', 'a whopping sea bass'][Math.floor(Math.random() * 8)]}!` : `+${got} ${MATERIALS[t.mat].name.toLowerCase()}${lucky ? ' (lucky!)' : ''}`, 'unit');
        if (this.invRoom() <= 0) { g.ui.toast('Backpack full! Store it at the Stockyard, deliver it to a site, or drop it (R).'); this.gatherT = 0; break; }
        if (t.node.kind === 'tree' && !t.node.alive) { const tn = t.node; setTimeout(() => { g.particles.burst(tn.x, 0.6, tn.z, 0x4a7a3a, 26, 2.2, 2.5); Sfx.noise(0.6, { freq: 160, vol: 0.7, type: 'lowpass' }); }, 900); wg.pop('TIMBER!', 'perfect'); this.lock = null; break; }
      }
      wg.setProgress(this.gatherT / t.time, `backpack ${this.invTotal()}/${BACKPACK}`);
    } else if (t.kind === 'site') {
      if (value) g.buildings.addWork(t.b, value * 5 * (tap ? 1 : speed));
      wg.setProgress(t.b.progress, `${Math.round(t.b.progress * 100)}%`);
      if (t.b.state === 'done') { wg.stop(); this.finished(t.b); }
    } else if (t.kind === 'road') {
      const p = t.plan; if (value && g.roadPlans.work(p, value * 1.6 * (tap ? 1 : speed))) { wg.stop(); Sfx.play('unit'); g.ui.toast('Path dug!'); } else if (p.type === 2 && !p.paid) g.ui.toast('No stone in the Stockyard for paving.');
      wg.setProgress(p.progress, `${Math.round(p.progress * 100)}%`);
    }
  }
  cookMeal(b) {
    const g = this.game; if (!this.seat || !this.seat) { const s = b.spots.seat && b.spots.seat.find((q) => !q.taken); if (s && !this.seat) this.sitOn(s, b); }
    this.invTake('food', 2); this.hunger = 0; this.energy = Math.min(100, this.energy + 20); g.flags.ate = (g.flags.ate || 0) + 1; g.flags.cooked = (g.flags.cooked || 0) + 1;
    Sfx.play('eat'); Sfx.noise(0.6, { freq: 1800, q: 0.6, vol: 0.15 }); g.particles.burst(b.cx, 0.8, b.cz, 0xffb03a, 12, 0.6, 3, 0.08);
    g.ui.toast(['A proper stew! You feel brand new.', 'Fish on a stick, charred just right.', 'Berry crumble, campfire style. Delicious.', 'Toasted bread and hot jam. Lovely.'][Math.floor(Math.random() * 4)], 2800);
  }
  sitOn(seat, b) { seat.taken = 'player'; this.seat = Object.assign(seat, { b }); this.prevPos = { x: this.x, z: this.z }; this.x = seat.x; this.z = seat.z; this.heading = seat.heading; Sfx.play('ui'); this.game.workgame.stop(); this.lock = null; }
  standUp() {
    const s = this.seat; if (!s) return; s.taken = null; this.seat = null; const w = this.game.world;
    for (const a of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) { const x = s.x + Math.sin(s.heading + a) * 0.85, z = s.z + Math.cos(s.heading + a) * 0.85; if (!w.collides(x, z, R)) { this.x = x; this.z = z; return; } }
    this.x = s.x + Math.sin(s.heading) * 0.8; this.z = s.z + Math.cos(s.heading) * 0.8; this.unstick();
  }
  /** A hot chain of golds spills over: the nearest unfinished sites get a little progress for free. */
  chainSpill(combo, t) {
    const g = this.game, frac = 0.003 * Math.min(combo, 10), sites = g.buildings.list.filter((b) => b.state === 'site' && b !== t.b).sort((a, c) => Math.hypot(a.cx - this.x, a.cz - this.z) - Math.hypot(c.cx - this.x, c.cz - this.z)).slice(0, 2);
    let any = false; for (const s of sites) { if (Math.hypot(s.cx - this.x, s.cz - this.z) > 80) continue; const got = g.buildings.bonusWork(s, frac); if (got > 0) { any = true; g.particles.burst(s.cx, 2.5, s.cz, 0xffd23f, 10, 1.5, 3, 0.1); } }
    if (any && performance.now() - (this.spillMsgT || 0) > 4000) { this.spillMsgT = performance.now(); g.ui.toast(`🔥 Chain x${combo}! The buzz spreads: nearby building sites get a little done too.`, 2600); }
  }
  finished(b) { const g = this.game; g.skills.gain('build', 10); Sfx.play('done'); g.particles.burst(b.cx, 3, b.cz, 0xffd23f, 30, 2.5, 5, 0.16); g.ui.toast(`${b.def.name} finished!`, 2800); }
  faceTo(x, z) { this.heading = Math.atan2(x - this.x, z - this.z); }
  takePile(p) {
    const g = this.game; let took = 0;
    for (const [m, n] of Object.entries(p.items)) { const k = this.invAdd(m, n); p.items[m] -= k; took += k; if (p.items[m] <= 0) delete p.items[m]; }
    if (!took) { g.ui.toast('Your backpack is full.'); Sfx.play('deny'); return; }
    Sfx.play('pickup'); if (!Object.keys(p.items).length) g.piles.remove(p); else g.piles.rebuild(p);
  }
  deliverTo(b) {
    const g = this.game, give = this.deliverable(b); if (!give.length) return;
    for (const [m, n] of give) { this.invTake(m, n); g.buildings.deliver(b, m, n); }
    Sfx.play('drop'); g.particles.burst(b.cx, 0.6, b.cz, 0xb5834a, 10, 1.2, 2.5); g.ui.toast('Delivered ' + give.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', '));
  }
  /** The Stockyard: a little menu to store everything or take exactly what you want. */
  useDepot() { Sfx.play('ui'); this.game.ui.openTerminal(this.game.depot || this.game.buildings.byDef('stockyard')[0], 'stock'); }
  storeAll() {
    const g = this.game; if (!this.invTotal()) return { ok: false, msg: 'Your backpack is empty.' };
    const n = this.invTotal(); for (const [m, q] of Object.entries(this.inv)) g.economy.add(m, q); g.flags.stored = (g.flags.stored || 0) + n; g.ui.toast(`Stored ${this.invText()}`); this.inv = {}; Sfx.play('drop'); return { ok: true };
  }
  packSites() {
    const g = this.game; let took = 0;
    for (const s of g.construction.sites) for (const m of Object.keys(s.need)) {
      const want = Math.min(g.buildings.missing(s, m) - (this.inv[m] || 0), Math.floor(g.economy.stock[m] || 0), this.invRoom()); if (want <= 0) continue;
      g.economy.stock[m] -= want; this.invAdd(m, want); took += want;
    }
    if (!took) return { ok: false, msg: g.construction.sites.length ? 'The Stockyard has nothing your building sites still need (or your backpack is full).' : 'No building sites need anything.' };
    Sfx.play('pickup'); g.ui.toast(`Packed ${this.invText()} for the building sites`); return { ok: true };
  }
  /** Driving: W/S throttle and brake (reverse when stopped), A/D steer (tighter at low speed), the camera swings in behind. */
  driveCar(fx, fz, run, dt, inp) {
    const g = this.game, max = 16 * (run ? 1.25 : 1); let v = this.carV || 0;
    if (fz > 0) v += (v < 0 ? 18 : 9) * dt; else if (fz < 0) v -= (v > 0 ? 18 : 6) * dt; else v -= Math.sign(v) * Math.min(Math.abs(v), 3 * dt);
    v = clamp(v, -5, max); if ((this.drunk || 0) > 0.4) this.heading += Math.sin(g.elapsed * 1.6) * (this.drunk - 0.3) * dt;
    const grip = clamp(Math.abs(v) / 5, 0, 1) * (1 - clamp((Math.abs(v) - 10) / 20, 0, 0.45));
    this.heading -= fx * grip * 2.0 * dt * Math.sign(v || 1);
    const dx = Math.sin(this.heading) * v * dt, dz = Math.cos(this.heading) * v * dt, ox = this.x, oz = this.z; this.tryMove(dx, dz);
    this.dist = Math.hypot(this.x - ox, this.z - oz); this.moved = this.dist > 0.0005;
    if (Math.abs(v) > 3 && this.dist < Math.hypot(dx, dz) * 0.4) { if (Math.abs(v) > 8) { this.shake = Math.max(this.shake || 0, 0.5); Sfx.play('drop'); } v *= -0.25; }   // hit something
    this.carV = v; this.speed = Math.abs(v); this.dirx = Math.sin(this.heading) * Math.sign(v || 1); this.dirz = Math.cos(this.heading) * Math.sign(v || 1);
    if (Math.abs(v) > 1 && !inp.mouse.dx && !inp.mouse.dy) this.yaw += angleDiff(this.yaw, this.heading + Math.PI) * Math.min(1, dt * 2.2);
  }
  /** Raid night: fire a blank down the line of the camera. Whoever it hits is knocked flat (it's a TV set: no one gets hurt for real). */
  /** Fire the gun in hand (Combat.fire: along the crosshair, stopped by walls). */
  shoot() { this.game.combat.fire(this); }
  /** Looking down a sniper scope? */
  scoped() { const W = WEAPONS[this.gun]; return !!(W && W.scope && (this.aimK || 0) > 0.85 && !this.dead); }
  /** Controller aiming: a gentle pull towards another player near the crosshair. */
  aimAssist(dt) {
    const g = this.game; if (!g.net || !g.net.role) return; const [hx, , hz] = this.headPos(), aim = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)); let best = null, ba = 0.16;
    for (const p of g.net.puppets.values()) { if (p.a === 6 || p.a === 4 || p.k === undefined || p.k[0] === 's') continue; const d = Math.hypot(p.x - hx, p.z - hz); if (d > 45 || d < 1) continue; const a = Math.abs(angleDiff(aim, Math.atan2(p.x - hx, p.z - hz))); if (a < ba) { ba = a; best = p; } }
    if (best) this.yaw -= angleDiff(aim, Math.atan2(best.x - hx, best.z - hz)) * Math.min(1, dt * 4);
  }
  /** Pay for something: from the town funds, or (visiting someone else's town) from your own pocket. */
  pay(n, cat) { if (!this.game.netVisitor) return this.game.economy.spend(n, cat); if ((this.pocket || 0) < n) return false; this.pocket -= n; return true; }
  /** Buy item i over the counter (paid from the town funds). */
  buyGoods(c, i) {
    const g = this.game, it = c && c.goods && c.goods[i]; if (!it) return null; const [name, price, fx] = it;
    if (price && !this.pay(price, 'Shops and pubs')) return { ok: false, msg: 'Not enough money.' };
    if (fx.hunger) this.hunger = clamp((this.hunger || 0) + fx.hunger, 0, 100); if (fx.energy) this.energy = Math.min(100, (this.energy || 0) + fx.energy);
    if (fx.drunk) { const was = this.drunk || 0; this.drunk = clamp(was + fx.drunk, 0, 1); if (was < 0.45 && this.drunk >= 0.45) g.ui.toast('You\'re feeling rather merry.', 2000); else if (was < 0.75 && this.drunk >= 0.75) g.ui.toast('The room has started to go round. Maybe a water.', 2600); }
    if (fx.inv) this.invAdd(fx.inv[0], fx.inv[1]);
    if (fx.lotto) { const r = Math.random(), w = r < 0.01 ? 500 : r < 0.05 ? 50 : r < 0.18 ? 10 : 0; if (w) { g.economy.earn(w, 'Scratchcards'); Sfx.play('cash'); } g.ui.toast(w ? `Scratch, scratch... £${w}! It could be you, and it was.` : 'Scratch, scratch... nothing. Not even a free ticket.', 2600); }
    { const n = name.toLowerCase(); this.holding = /pint|lager|bitter|cider|stout|shandy|snakebite|ale\b|guinness|half/.test(n) ? 'pint' : /chips|cod|haddock|fish|kebab|saveloy|pie|curry|burger|sausage/.test(n) ? 'chips' : /tea|coffee|cuppa|hot choc/.test(n) ? 'cup' : /video|vhs|film/.test(n) ? 'video' : /popcorn/.test(n) ? 'popcorn' : /ticket/.test(n) ? 'ticket' : 'bag'; this.holdT = 45; }   // and Sam walks off with it
    Sfx.play('cash'); if (c.who && c.who.mesh && c.who.mesh.visible) g.social.say(c.who, pick(['Ta, love.', 'There you go, Sam.', 'Cheers, Sam.', 'Anything else?', 'Mind how you go.', 'Lovely.']), 2);
    if (!fx.lotto) g.ui.toast(`You buy ${name}.${fx.note ? ' ' + fx.note : ''}`, 2400);
    return { ok: true };
  }
  /** Drink wears off; very drunk Sam stumbles now and then, and the police take an interest in a drunk on wheels. */
  soberUp(dt) {
    const g = this.game; if (!(this.drunk > 0)) return; this.drunk = Math.max(0, this.drunk - dt * 0.0028);
    if (this.drunk > 0.8 && this.speed > 2 && Math.random() < dt * 0.08) { this.stagger(1.2); g.ui.toast(pick(['Whoops.', 'Who moved the pavement?', '*hic*', 'Steady...']), 1200); }
    if (this.mounted && this.drunk > 0.5 && g.crime && !this.drunkCaught && g.crime.cops().some((c) => Math.hypot(c.x - this.x, c.z - this.z) < 14)) { this.drunkCaught = true; g.crime.wanted = Math.min(5, g.crime.wanted + 1); g.ui.toast(this.rideLv === 3 ? '"Pull over! Have you been drinking, sir?"' : '"Oi! You! Drunk in charge of a bicycle!"', 2600); }
    if (this.drunk < 0.3) this.drunkCaught = false;
  }
  trySleep(spot) {
    const g = this.game, h = g.clock.hour;
    if (!(h >= 20 || h < 6 || this.energy < 35)) { g.ui.toast('Too early to sleep. (After 20:00, or when you are tired.)'); return; }
    this.sleeping = true; this.drunk = 0; g.flags.slept = true; this.sleepSpot = spot; this.x = spot.x; this.z = spot.z; this.heading = spot.rotY; g.clock.sleepBoost = 8; g.ui.fade(0.55, 'Zzz...');
  }
  wake() {
    if (!this.sleeping) return; this.sleeping = false; this.game.clock.sleepBoost = 0; this.game.ui.fade(0);
    if (this.sleepSpot) { this.x = this.sleepSpot.ax; this.z = this.sleepSpot.az; }
  }
  collapse(why = 'tired') {
    const g = this.game; g.ui.toast(why === 'hunger' ? 'You collapse from hunger...' : 'You collapse from exhaustion...'); this.sedate('exhaustion');
  }
  /** Sedation: screen fades, then Sam wakes in hospital or the town square. The backpack is left where Sam fell. */
  sedate(reason = '') {
    if (this.sedated > 0) return; const g = this.game;
    if (this.seat) this.standUp(); this.sedated = 3.2; if (this.invTotal()) { g.piles.add(this.x, this.z, { ...this.inv }); this.inv = {}; }
    g.ui.fade(1, reason === 'exhaustion' ? '' : 'You feel a sharp sting... everything goes soft.'); if (this.sleeping) { this.sleeping = false; g.clock.sleepBoost = 0; }
  }
  wakeFromSedation() {
    const g = this.game, hosp = g.buildings.hospital();
    let x, z;
    if (hosp && hosp.spots.bed[0]) { x = hosp.spots.bed[0].ax; z = hosp.spots.bed[0].az; g.messages.push('Hospital', 'Dr. on duty: "You collapsed, Sam. Rest up. Nothing to see here."', 'warn'); }
    else { x = g.plaza.x; z = g.plaza.z; g.messages.push('Planning Office', 'Sam, you were found and brought back to the square. Your things are where you fell.', 'warn'); }
    this.teleport(x, z); this.energy = Math.max(this.energy, 70); this.hunger = Math.min(this.hunger, 50); this.starveT = 0; g.ui.fade(0); g.security.reset();
  }

  // ---------- visuals ----------
  syncMesh(dt) {
    const g = this.game, m = this.mesh, godView = g.mode === 'god'; this.rig.lod.visible = false;
    m.visible = !this.dead && !(g.mode === 'sim' && (!this.third || this.scoped() || (this.camD !== undefined && this.camD < 0.5)) && !this.sleeping);   // (the camera squeezed right up behind him indoors: he's not drawn)
    m.position.set(this.x, (this.jumpY || 0) + (this.floorY || 0), this.z); m.rotation.y = this.heading;
    if (this.transit && !this.transit.cabin) m.visible = false;
    if (this.veh) { const lift = this.veh.userData.seat - 0.5; m.position.y += lift; this.veh.position.y = -lift; for (const [w, r] of this.veh.userData.wheels || []) w.rotation.x += (this.dist || 0) / r; }
    if (this.atkT > 0) this.atkT -= dt; if (this.atkCD > 0) this.atkCD -= dt; if (this.hitT > 0) this.hitT -= dt;
    this.soberUp(dt);
    if ((this.hp ?? 100) < 100 && g.elapsed - (this.lastHit || -99) > 5) { const pi = g.buildings.playerInside; this.hp = Math.min(100, this.hp + dt * (pi && (pi.id === 'clinic' || pi.def.heals) ? 25 : 5)); }
    const aim = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)), ty = this.sleeping || this.sedated > 0 || this.down > 0 ? 0 : clamp(angleDiff(this.heading, aim), -1.1, 1.1), tp = -this.pitch * 0.8;
    const k = Math.min(1, dt * 8); this.lookYaw += (ty - this.lookYaw) * k; this.lookPitch += (tp - this.lookPitch) * k;
    let lower = 'stand', upper = 'idle'; const t = this.target, carrying = this.invTotal() > 0;
    if (this.sleeping) { lower = 'lie'; upper = 'sleep'; }
    else if (this.seat) { lower = 'sit'; const sb = this.seat.b; upper = sb && sb.def.park === 'camp' ? 'watch' : this.seat.kind === 'pew' ? 'pray' : sb && sb.def.dining && this.seat.kind === 'dining' ? 'drink' : this.seat.kind === 'sofa' ? 'watch' : 'idle'; if (this.emoteT > 0 && ['cheer', 'clap', 'think', 'facepalm', 'vsign', 'shrug'].includes(this.emoteName)) upper = this.emoteName; }
    else if (this.sedated > 0 || this.down > 0) { lower = 'lie'; upper = 'sedated'; }
    else {
      if (this.speed > 0.3 && this.moved) lower = 'walk';
      if (this.working && t && t.kind === 'gather') { upper = t.upper; lower = ['harvest', 'dig'].includes(upper) ? 'crouch' : 'stand'; }
      else if (this.working && t && t.kind === 'site') { lower = 'crouch'; upper = 'hammer'; }
      else if (this.working && t && t.kind === 'road') { lower = 'crouch'; upper = 'dig'; }
      else if (this.working && t && t.kind === 'douse') { upper = 'point'; }
      else if (this.working && t && t.kind === 'rest') { lower = 'sit'; upper = 'idle'; }
      else if (this.working && t && t.kind === 'work') { upper = { shopkeeper: 'tidy', clerk: 'type', doctor: 'clipboard', guard: 'guard', engineer: 'panel', factory: 'lever' }[t.role] || 'idle'; }
      else if (carrying && this.invTotal() >= 6) upper = 'carry';
      else if (g.ui.terminalB) upper = 'type';
      else if (g.ui.dialogue) upper = 'listen';
      if (this.emoteT > 0 && lower !== 'crouch') { upper = this.emoteName || 'wave'; if (this.moved && ['dance', 'airguitar', 'macarena', 'robot', 'runningman', 'bow', 'whigfield', 'riverdance', 'pogo', 'kungfu', 'liam'].includes(upper)) upper = 'cheer'; }
      if (this.jumpT > 0) { lower = 'jump'; if (!(this.emoteT > 0)) upper = 'jump'; }
      if (this.swingT > 0) upper = 'strike';
      if (this.mounted) { lower = 'ride'; upper = 'handlebars'; }
      else if (this.atkT > 0) upper = this.atkAnim; else if (this.hitT > 0) upper = 'hit'; else if (g.elapsed - (this.lastCombat || -9) < 3 && !this.moved) upper = 'fight';
    }
    let big = null, bn = 0; for (const [mm, n] of Object.entries(this.inv)) if (n > bn) { bn = n; big = mm; }
    if (this.gun && !this.mounted && lower !== 'lie' && !this.seat && (this.aiming || g.elapsed - (this.lastShot || -9) < 1.5 || (g.combat.on && this.speed < 5.2 && !this.cover)) && !(this.atkT > 0)) upper = 'aim';
    if (g.combat.on && this.stance === 'prone' && !this.mounted && (lower === 'stand' || lower === 'walk')) lower = 'prone';
    const hs = Math.sin(this.heading), hc = Math.cos(this.heading), sp = Math.max(this.speed, 1e-3), fwd = this.mounted ? 1 : ((this.vx || 0) * hs + (this.vz || 0) * hc) / sp, side = this.mounted ? 0 : ((this.vx || 0) * hc - (this.vz || 0) * hs) / sp;
    this.anim.update(dt, { lower, upper, motor: this.bike === 2, dist: this.dist, speed: this.speed, run: this.mounted ? this.speed > 5.6 : this.speed > 3.2, step: this.mounted ? 0 : 0.38 + 0.21 * this.speed, fwd, side, land: this.landT > 0 ? this.landT / 0.16 : 0, crouch: g.combat.on && (this.stance === 'crouch' || this.slideT > 0) ? 1 : 0, gunProp: WEAPONS[this.gun] ? (WEAPONS[this.gun].rocket ? 'tube' : WEAPONS[this.gun].slot === 0 ? 'rifle' : 'pistol') : 'pistol', lookYaw: this.lookYaw, lookPitch: this.lookPitch, mood: 0.25, tired: this.energy < 25, crateColor: big ? MATERIALS[big].color : undefined, speaking: g.ui.dialogue ? false : undefined, prop: this.weapon && !this.sleeping && this.sedated <= 0 ? { handR: 'club' } : this.holding && !this.sleeping ? { handR: this.holding } : undefined });
    if (this.holding && (this.holdT -= dt) <= 0) this.holding = null;
    { const xh = this.xhair || (this.xhair = document.getElementById('xhair')), on = !!this.gun && g.mode === 'sim' && !this.sleeping && !(this.down > 0) && !this.dead && !this.scoped(); if (xh) { xh.style.display = on ? 'block' : 'none'; if (on) { this.hitMark = Math.max(0, (this.hitMark || 0) - dt); xh.className = (this.aiming ? 'aim' : '') + (this.hitMark > 0 ? (this.hitHead ? ' hit head' : ' hit') : ''); const W = WEAPONS[this.gun]; xh.style.transform = g.combat.on && W ? `scale(${Math.min(3, 0.55 + g.combat.spread(this, W) * 22).toFixed(2)})` : ''; } } }   // the gap shows the spread
    this.marker.visible = godView; this.marker.position.set(this.x, 5.2 + Math.sin(performance.now() / 300) * 0.4, this.z); this.marker.rotation.y += dt * 2;
  }

  /** Is a living tree crown close to this point? (keeps the third-person camera out of the foliage) */
  /** Tree crowns between the camera and Sam are hidden so the view never fills with leaves. */
  cutaway(cx, cz, tx, tz) {
    const tr = this.game.terrain; if (!this.treeGrid) { this.treeGrid = new Map(); for (const t of tr.trees) { const k = Math.floor(t.x / 4) + ',' + Math.floor(t.z / 4); (this.treeGrid.get(k) || this.treeGrid.set(k, []).get(k)).push(t); } this.cut = new Set(); }
    const now = new Set(), dx = tx - cx, dz = tz - cz, L2 = dx * dx + dz * dz || 1;
    if (cx !== null) {
      const x0 = Math.floor((Math.min(cx, tx) - 3) / 4), x1 = Math.floor((Math.max(cx, tx) + 3) / 4), z0 = Math.floor((Math.min(cz, tz) - 3) / 4), z1 = Math.floor((Math.max(cz, tz) + 3) / 4);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const a = this.treeGrid.get(gx + ',' + gz); if (!a) continue;
        for (const t of a) { if (!t.alive) continue; const u = Math.max(0, Math.min(1.05, ((t.x - cx) * dx + (t.z - cz) * dz) / L2)), px = cx + dx * u, pz = cz + dz * u; if (Math.hypot(t.x - px, t.z - pz) < 1.7 * t.s) now.add(t); } }
    }
    for (const t of this.cut) if (!now.has(t)) tr.setCrown(t, true);
    for (const t of now) if (!this.cut.has(t)) tr.setCrown(t, false);
    this.cut = now;
  }
  /** Camera for sim mode (first/third person). */
  /** Is the camera's spot inside something solid: walls, tall furniture, a shut front door or the boxed-in side of a staircase? */
  camBlocked(x, z, y, r) {
    if (this.game.world.collides(x, z, r, true, y)) return true;
    if (y < 2.6 && this.doorBlocks(x, z, r)) return true;
    // upstairs the outside walls are solid all round (the front door's gap in the wall colliders only matters downstairs)
    const pb = this.game.buildings.playerInside, pp = pb && pb.ext && pb.ext.plan;
    if (pp && y > WALL_H - 0.4) { const a = pb.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a), dx = x - pb.cx, dz = z - pb.cz, lx = dx * c - dz * sn, lz = dx * sn + dz * c; if (Math.abs(lx) > pp.W / 2 - WALL_T - r || Math.abs(lz) > pp.D / 2 - WALL_T - r) return true; }
    const q = this.planAt(x, z), st = q && q.p.stair; if (!st) return false;
    for (const lane of st.lanes) {
      const L = laneRect(st, lane); if (q.lx < L[0] - r || q.lx > L[1] + r || q.lz < L[2] - r || q.lz > L[3] + r) continue;
      const s = Math.max(st.s0, Math.min(st.s1, st.ax === 'x' ? q.lx : q.lz));
      for (const k of lane.flights) if (y > k * WALL_H - 0.2 && y < flightH(st, k, s) + 1.0) return true;   // under the flight, or down among the treads and the bannister
    }
    return false;
  }
  placeCamera(cam) {
    const w = this.game.world, [hx, hy, hz] = this.headPos();
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch), fy = Math.sin(this.pitch), fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    if (this.dead && this.deathRag) { const c = this.deathRag.P[2].p; cam.position.set(c.x + Math.sin(this.yaw) * 3.5, c.y + 2.6, c.z + Math.cos(this.yaw) * 3.5); cam.lookAt(c.x, c.y, c.z); return; }   // killed: watch yourself fall
    if (this.sleeping || this.sedated > 0 || this.down > 0) { cam.position.set(this.x, 1.2, this.z); cam.lookAt(this.x - Math.sin(this.heading) * 0, 4, this.z + 0.001); return; }
    const sh = this.shake > 0 ? this.shake * 0.12 : 0, jx = sh ? (Math.random() - 0.5) * sh : 0, jy = sh ? (Math.random() - 0.5) * sh : 0;
    { const W = WEAPONS[this.gun], fov = 72 - (72 - (W ? W.fov : 56)) * (this.aimK || 0) + (this.speed > 6 && !this.mounted ? 5 : 0); if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * 0.15; cam.updateProjectionMatrix(); } }   // aim: zoom in; sprint: a touch wider
    { const nf = this.game.combat.on && (!this.third || this.scoped()) ? 0.04 : this.game.buildings.playerInside ? 0.1 : 0.3; if (cam.near !== nf) { cam.near = nf; cam.updateProjectionMatrix(); } }   // first person with a gun: a near plane close enough for the hands; indoors: close enough that the edges of the view never reach through a wall
    const vt = performance.now(), vdt = Math.min(0.1, (vt - (this._vmT || vt)) / 1000) || 1 / 60; this._vmT = vt;
    if (!this.third || this.scoped()) { if (this.cut && this.cut.size) this.cutaway(null); const sw = (this.drunk || 0) > 0.4 ? (this.drunk - 0.4) * 0.25 : 0, t = this.game.elapsed; cam.position.set(hx + jx, hy + jy, hz); cam.lookAt(hx + fx + Math.sin(t * 0.9) * sw, hy + fy + Math.sin(t * 1.3) * sw * 0.5, hz + fz + Math.cos(t * 0.7) * sw); this.game.combat.viewModel(this, cam, vdt); return; }
    this.game.combat.viewModel(this, null);
    // GTA-style follow camera: closer in indoors; the boom is swept back from a pivot over the shoulder and stops short of anything at
    // the camera's own height (so it doesn't bump on furniture below it); it snaps in when blocked and eases back out
    const ak = this.aimK || 0, py = this.floorY || 0, q0 = this.planAt(this.x, this.z), q = q0 && this.game.buildings.onBuilding(q0.b, this.x, this.z, -0.3) ? q0 : null, onRoof = (q && py > q.p.H - 0.6) || !!this.transit, indoor = !!this.game.buildings.playerInside && !onRoof;
    const maxD = indoor ? Math.min(this.camDist, 2.7) : this.camDist; let d = maxD * (1 - ak) + Math.min(maxD, 2.1) * ak;
    let so = (indoor ? 0.42 : 0.55 + 0.2 * ak) * (this.shoulder || 1); const ty = (this.eyeH || 1.65) + 0.1 + py;
    if (this.camBlocked(hx + Math.cos(this.yaw) * so, hz - Math.sin(this.yaw) * so, ty, 0.22)) so = 0;   // no room for the shoulder offset: straight behind
    // indoors the camera stays under the door heads (2 m up) and under the ceiling, so it never rises over a wall into the next room
    let tx = hx + Math.cos(this.yaw) * so, tz = hz - Math.sin(this.yaw) * so; const ceil = indoor ? Math.min((Math.floor((py + 0.6) / WALL_H) + 1) * WALL_H - 0.35, py + 2.0) : 1e9, lift = (t) => (indoor ? 0.15 : 0.4) * Math.min(1, t / 2);
    if (onRoof && q) {   // on a roof: the boom stops short of the stair hut, the lift housing and the plant on the roof
      const p = q.p, huts = [p.hut && p.hut.rect, p.lift && [p.lift.x0 - 0.15, p.lift.x1, p.lift.z0, p.lift.z1 + 0.15], ...(q.b.ext.roofCols || [])].filter(Boolean), a = q.b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
      const loc = (x, z) => { const dx = x - q.b.cx, dz = z - q.b.cz; return [dx * c - dz * sn, dx * sn + dz * c]; }, inR = (r, [lx, lz]) => lx > r[0] - 0.3 && lx < r[1] + 0.3 && lz > r[2] - 0.3 && lz < r[3] + 0.3;
      const here = loc(hx, hz), solid = huts.filter((r) => !inR(r, here));   // (not the one he's standing in: inside the stair hut the boom is free)
      if (solid.some((r) => inR(r, loc(tx, tz)))) { tx = hx; tz = hz; }   // right beside the hut: no shoulder offset
      const box = huts.find((r) => here[0] > r[0] && here[0] < r[1] && here[1] > r[2] && here[1] < r[3]), inBox = (at) => at[0] > box[0] + 0.25 && at[0] < box[1] - 0.25 && at[1] > box[2] + 0.25 && at[1] < box[3] - 0.25;   // inside the hut itself: the camera stays in with him
      let ok = 0; for (let t = 0.1; t <= d; t += 0.1) { const at = loc(tx - fx * t, tz - fz * t); if ((ty - fy * t + lift(t) < p.H + 3.2 && solid.some((r) => inR(r, at))) || (box && !inBox(at))) break; ok = t; } d = Math.min(d, Math.max(0.1, ok - 0.12));
    }
    if (!onRoof) { let ok = 0; for (let t = 0.1; t <= d; t += 0.1) { const cx = tx - fx * t, cz = tz - fz * t, cy = Math.min(ceil, ty - fy * t + lift(t)); if (cy < py + 0.25 || this.camBlocked(cx, cz, cy, 0.3)) break; ok = t; } d = Math.min(d, Math.max(0.1, ok - 0.12)); }   // squeezed right in: Sam fades out (see syncMesh)
    this.camD = this.camD === undefined || d < this.camD ? d : this.camD + (d - this.camD) * Math.min(1, vdt * 3); const cd = this.camD;
    cam.position.set(tx - fx * cd + jx, Math.min(ceil, Math.max(0.4 + py, ty - fy * cd + lift(cd))) + jy, tz - fz * cd); cam.lookAt(tx, ty, tz); this.cutaway(cam.position.x, cam.position.z, hx, hz);
  }
}
