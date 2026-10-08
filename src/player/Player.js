import * as THREE from 'three';
import { TILE } from '../config.js';
import { ROLES, MATERIALS } from '../data/buildings.js';
import { T } from '../world/World.js';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { clamp, angleDiff } from '../util.js';
import { Sfx } from '../core/Sfx.js';

const R = 0.4;
export const TOOLS = { axe: 'Axe', pick: 'Pickaxe', shovel: 'Shovel', basket: 'Basket', rod: 'Fishing rod', hammer: 'Hammer' };
export const TOOL_ICON = { axe: '🪓', pick: '⛏', shovel: '🥄', basket: '🧺', rod: '🎣', hammer: '🔨' };
export const MAT_ICON = { timber: '🪵', stone: '🪨', brick: '🧱', steel: '⚙', glass: '🔷', food: '🍎' };
const TOOL_FOR = { tree: 'axe', rock: 'pick', ore: 'pick', clay: 'shovel', sand: 'shovel', berry: 'basket', field: 'basket', fish: 'rod' };
const WORK_KIND = { chop: 'chop', mine: 'mine', dig: 'dig', harvest: 'harvest', fish: 'fish' };
const CHIP = { chop: 0xb5834a, mine: 0x9a9a92, dig: 0x7a5a3a, harvest: 0x7aa63a, fish: 0x7ec8e3, build: 0xe0c890 };
const STROKE = { perfect: 1, good: 0.5, miss: 0.12 };
export const BACKPACK = 12;

/** Sam: the playable sim. First/third person, backpack, interactions with timing minigames, sleeping, sedation. */
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
  teleport(x, z, heading) { this.x = x; this.z = z; if (heading !== undefined) { this.heading = heading; this.yaw = heading; } }
  headPos() { return [this.x, 1.65, this.z]; }

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
    this.moved = false; this.working = false; this.dist = 0; if (this.emoteT > 0) this.emoteT -= rawDt; if (this.strikeT > 0) this.strikeT -= rawDt; if (this.shake > 0) this.shake = Math.max(0, this.shake - rawDt * 1.5);
    if (this.sedated > 0) { this.sedated -= rawDt; if (this.sedated <= 0) this.wakeFromSedation(); }
    if (this.down > 0) this.down -= rawDt; if (this.swingT > 0) this.swingT -= rawDt; if (this.swingT <= 0 && this.swingHit) this.swingHit = false;
    this.unstick();
    if (sim && !this.sleeping && this.sedated <= 0 && !(this.down > 0)) {
      this.yaw -= inp.mouse.dx * 0.0025; this.pitch = clamp(this.pitch - inp.mouse.dy * 0.0025, -1.3, 1.2);
      if (inp.down('ArrowLeft')) this.yaw += 2 * rawDt; if (inp.down('ArrowRight')) this.yaw -= 2 * rawDt;
      if (inp.down('ArrowUp')) this.pitch = clamp(this.pitch + 1.2 * rawDt, -1.3, 1.2); if (inp.down('ArrowDown')) this.pitch = clamp(this.pitch - 1.2 * rawDt, -1.3, 1.2);
      if (inp.hit('KeyV')) this.third = !this.third;
      if (inp.mouse.wheel && this.third) this.camDist = clamp(this.camDist + inp.mouse.wheel * 0.6, 2.5, 9);
      let fx = 0, fz = 0; if (inp.down('KeyW')) fz += 1; if (inp.down('KeyS')) fz -= 1; if (inp.down('KeyA')) fx -= 1; if (inp.down('KeyD')) fx += 1;
      const input = fx || fz, run = inp.down('ShiftLeft') || inp.down('ShiftRight'), heavy = this.invTotal() > 8 ? 0.85 : 1;
      if (this.seat) {   // sitting: rest up; moving (or E) stands Sam up again
        if (input || inp.hit('KeyE')) this.standUp();
        else {
          const s = this.seat; this.x = s.x; this.z = s.z; this.heading = s.heading; this.speed = 0; this.ring.visible = false; g.workgame.stop();
          const fire = s.b && s.b.def.park === 'camp'; this.energy = Math.min(100, this.energy + rawDt * (fire ? 5 : 3));
          g.ui.setPrompt(`Sitting${fire ? ' by the fire' : ''}. Resting: energy ${Math.round(this.energy)}%. Move to stand up${this.hunger > 30 ? ', Q to eat' : ''}.`, -1, true);
          if (inp.hit('KeyQ')) this.eat(); this.syncMesh(rawDt); return;
        }
      }
      if (input) { const l = Math.hypot(fx, fz); fx /= l; fz /= l; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw); this.dirx = -sy * fz + cy * fx; this.dirz = -cy * fz - sy * fx; this.hold = 0; if (this.sleeping) this.wake(); }
      const target = input ? (run ? 7.2 : 4.6) * heavy : 0; this.speed += clamp(target - this.speed, -26 * rawDt, 20 * rawDt);
      if (this.speed > 0.05) {
        this.heading += clamp(angleDiff(this.heading, Math.atan2(this.dirx, this.dirz)), -13 * rawDt, 13 * rawDt);
        const ox = this.x, oz = this.z; this.tryMove(this.dirx * this.speed * rawDt, this.dirz * this.speed * rawDt); this.dist = Math.hypot(this.x - ox, this.z - oz); this.moved = this.dist > 0.0005;
      } else this.dist = 0;
      if (inp.hit('KeyG') && this.emoteT <= 0) this.emoteT = 2.2;
      if (this.weapon && inp.hit('KeyF') && !(this.swingT > 0)) { this.swingT = 0.6; this.swingHit = false; }
      if (this.swingT > 0.3 && !this.swingHit && this.weapon) { this.swingHit = true; this.strike(); }
      if (inp.hit('KeyQ')) this.eat();
      if (inp.hit('KeyR')) this.drop();
      if (inp.hit('KeyI')) g.ui.openInventory();
      this.interact(rawDt);
    } else { this.game.workgame.stop(); this.ring.visible = false; }
    // needs (game seconds)
    if (g.started && !this.sleeping) {
      this.hunger = Math.min(100, this.hunger + dt * 0.22); this.energy = Math.max(0, this.energy - dt * 0.2 * (this.hunger > 85 ? 1.8 : 1));
      if (this.hunger > 65 && !this.hungerWarn) { this.hungerWarn = true; g.ui.toast('You are hungry. Press Q to eat food from your backpack, or eat by the Stockyard or a campfire.', 5200); }
      if (this.hunger < 40) this.hungerWarn = false;
      if (this.hunger >= 100) this.starveT += dt; else this.starveT = 0;
    }
    if ((this.energy <= 0 || this.starveT > 30) && !this.sleeping && this.sedated <= 0 && g.started) this.collapse(this.starveT > 30 ? 'hunger' : 'tired');
    this.syncMesh(rawDt);
  }
  /** If a wall or furniture has appeared around Sam (a building just finished), step out to the nearest free spot. */
  unstick() {
    const w = this.game.world; if (this.sleeping || !w.collides(this.x, this.z, R)) return;
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
  tryMove(dx, dz) {
    const w = this.game.world;
    if (!w.collides(this.x + dx, this.z, R)) this.x += dx;
    if (!w.collides(this.x, this.z + dz, R)) this.z += dz;
  }

  // ---------- interaction ----------
  findTarget() {
    const g = this.game, px = this.x, pz = this.z, B = g.buildings.list; let best = null, bd = 1e9;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), full = this.invRoom() <= 0;
    // prefer what Sam is facing (the camera direction): things behind count as further away
    const consider = (t, d, x, z) => { if (x !== undefined) { const dx = x - px, dz = z - pz, l = Math.hypot(dx, dz); if (l > 0.3) d += (1 - (dx * fx + dz * fz) / l) * 0.9; } if (d < bd) { bd = d; best = t; } };
    for (const s of g.population.sims) {
      if (s.kind === 'raider') continue;
      if (s.pose === 'sleep' || (s.inside && s.inside !== g.buildings.playerInside && !s.inside.def.open)) continue;
      const dx = s.x - px, dz = s.z - pz, d = Math.hypot(dx, dz); if (d > 2.6) continue;
      if (!this.third && d > 0.8 && (dx * fx + dz * fz) / d < 0.3) continue;
      consider({ kind: 'sim', sim: s, text: `Talk to ${s.name} (${s.roleName})` }, d - 0.5);
    }
    if (g.raids.pickup && !this.weapon) { const q = g.raids.pickup, d = Math.hypot(q.x - px, q.z - pz); if (d < 2.6) consider({ kind: 'weapon', text: 'Take the militia club  (F to swing)' }, d - 1); }
    for (const it of g.tools.items) { if (it.taken) continue; const d = Math.hypot(it.x - px, it.z - pz); if (d < 2.5) consider({ kind: 'tool', item: it, text: `Pick up the ${TOOLS[it.id]}` }, d - 2); }
    for (const p of g.piles.list) { const d = Math.hypot(p.x - px, p.z - pz); if (d < 2.2) consider({ kind: 'pile', pile: p, text: full ? 'Your backpack is full' : `Pick up ${Object.entries(p.items).map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ')}` }, d - 1.2); }
    for (const b of B) if (b.state === 'done' && b.spots.seat && (b.def.open || b.def.park || b === g.buildings.playerInside)) for (const s of b.spots.seat) { if (s.taken) continue; const d = Math.hypot(s.x - px, s.z - pz); if (d < (b.def.park === 'camp' ? 2.2 : 1.4)) consider({ kind: 'seat', seat: s, b, text: b.def.park === 'camp' ? 'Sit by the fire' : 'Sit down' }, d + 0.3, s.x, s.z); }
    if (g.roadPlans.count) {
      const p0 = g.roadPlans.at(px, pz); let rp = p0, rd = 0; if (!rp) { for (const q of g.roadPlans.plans.values()) { const d = Math.hypot(q.cx - px, q.cz - pz); if (d < 3.4 && (!rp || d < rd)) { rp = q; rd = d; } } }
      if (rp) consider(this.tools.has('shovel') ? { kind: 'road', plan: rp, work: 'dig', text: `Dig the ${rp.type === 2 ? 'paved road (uses 1 stone)' : 'path'}` } : { kind: 'info', text: 'You need the Shovel to dig paths. Pick it up from the Tool Rack.' }, rd + 0.3);
    }
    for (const b of B) {
      if (b.state === 'done') {
        if (b.id === 'postbox') { const d = Math.hypot(b.cx - px, b.cz - pz); if (d < 2.4) { const n = g.mail.unread(); consider({ kind: 'post', b, text: n ? `Check the post (✉ ${n} new)` : 'Check the post' }, d - 0.3, b.cx, b.cz); } }
        for (const t of b.spots.terminal) { const d = Math.hypot(t.x - px, t.z - pz); if (d < 1.9) consider({ kind: 'terminal', b, text: 'Use computer terminal' }, d); }
        for (const t of b.spots.pickup) { const d = Math.hypot(t.x - px, t.z - pz); if (d < 2.8) consider({ kind: 'depot', b, text: this.invTotal() ? `Store ${this.invText()} in the Stockyard` : 'Take what the building sites need from the Stockyard' }, d); }
        if (b === g.starterHome && b.spots.bed[0]) { const s = b.spots.bed[0], d = Math.hypot(s.x - px, s.z - pz); if (d < 2.6) consider({ kind: 'bed', b, spot: s, text: 'Sleep in your bed' }, d); }
        if (b.def.jobs && b.id !== 'contractor') {
          const role = Object.keys(b.def.jobs)[0];
          for (const t of b.spots.work) {
            const d = Math.hypot(t.x - px, t.z - pz); if (d > 1.6) continue;
            const manned = g.population.sims.some((s) => s.inside === b && Math.hypot(s.x - t.x, s.z - t.z) < 1.2);
            if (!manned) consider({ kind: 'work', b, role, text: `Work a shift as ${ROLES[role].name}  (hold E, earns city funds)`, hold: true }, d + 0.3);
          }
        }
      } else if (b.state === 'site') {
        const dx = Math.max(b.x0 * TILE - px, 0, px - (b.x0 + b.w) * TILE), dz = Math.max(b.z0 * TILE - pz, 0, pz - (b.z0 + b.d) * TILE), d = Math.hypot(dx, dz);
        if (d < 3.2) {
          const give = this.deliverable(b); let t;
          if (give.length) t = { kind: 'site', b, deliver: true, text: `Deliver ${give.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ')}` };
          else if (g.construction.workable(b) && !this.tools.has('hammer')) t = { kind: 'info', text: 'You need the Hammer to build. Pick it up from the Tool Rack.' };
          else if (g.construction.workable(b)) t = { kind: 'site', b, work: 'build', text: `Build the ${b.def.name}` };
          else { const miss = Object.keys(b.need).map((m) => [m, b.need[m] - (b.have[m] || 0)]).filter(([, n]) => n > 0); t = { kind: 'info', text: `${b.def.name} needs ${miss.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ')}` }; }
          consider(t, d + 0.2);
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
      if (tt === T.SAND && !w.road[w.idx(tx, tz)]) addGather({ kind: 'sand', infinite: true, amount: 999, x: px, z: pz }, 'sand', 'Dig sand', 'glass', 3.0, 1, 'dig', 2.5, ['glassworks', 'Glassworks']);
      const ax0 = px - Math.sin(this.yaw) * 2.6, az0 = pz - Math.cos(this.yaw) * 2.6, [ax, az] = w.tileOf(ax0, az0);
      if (w.inBounds(ax, az) && w.terrain[w.idx(ax, az)] === T.WATER && w.isLand(tx, tz)) addGather({ kind: 'fish', infinite: true, amount: 999, x: ax0, z: az0 }, 'fish', 'Fish', 'food', 3.2, 2, 'fish', 2.6); }
    return best;
  }
  /** Materials in the backpack that this site still needs: [[mat, qty], ...] */
  deliverable(b) { const out = []; for (const [m, n] of Object.entries(this.inv)) { const need = (b.need[m] || 0) - (b.have[m] || 0); if (need > 0) out.push([m, Math.min(n, need)]); } return out; }
  targetKey(t) { return t.kind + ':' + (t.node ? (t.node.idx ?? (t.node.x.toFixed(1) + t.node.z.toFixed(1))) : t.b ? t.b.uid : t.plan ? t.plan.x + ',' + t.plan.z : ''); }

  interact(rawDt) {
    const g = this.game, inp = g.input; let nt = this.findTarget();
    // once a job is started Sam locks on to it until it is finished, Sam walks off, or it drifts out of reach
    if (this.lock) { const L = this.lock; if (!this.stillValid(L) || this.distTo(L) > 4.2 || performance.now() - (this.lockT || 0) > 2500 || Math.hypot(this.x - this.lockPos.x, this.z - this.lockPos.z) > 0.9) this.lock = null; else nt = L; }
    this.target = nt; const t = nt; this.placeRing(t);
    if (!t || !t.work) g.workgame.stop();
    g.ui.setPrompt(t ? t.text + (t.work ? '' : t.hold ? '  (hold E)' : t.kind === 'info' ? '' : '') : null, t && t.hold ? this.hold : -1, t && t.kind === 'info');
    if (!t) { this.hold = 0; return; }
    const e = inp.hit('KeyE'), held = inp.down('KeyE');
    if (t.work) return this.doWork(t, rawDt, e, held);
    if (t.kind === 'sim' && e) g.startDialogue(t.sim);
    else if (t.kind === 'terminal' && e) { Sfx.play('ui'); g.ui.openTerminal(t.b); }
    else if (t.kind === 'post' && e) { Sfx.play('ui'); g.ui.openTerminal(t.b, 'post'); }
    else if (t.kind === 'depot' && e) this.useDepot();
    else if (t.kind === 'bed' && e) this.trySleep(t.spot);
    else if (t.kind === 'tool' && e) { g.tools.take(t.item); this.tools.add(t.item.id); Sfx.play('pickup'); g.ui.toast(`You take the ${TOOLS[t.item.id]}. It goes on your belt.`, 2600); }
    else if (t.kind === 'pile' && e) this.takePile(t.pile);
    else if (t.kind === 'seat' && e) this.sitOn(t.seat, t.b);
    else if (t.kind === 'weapon' && e) { if (g.raids.take()) { this.weapon = 'club'; Sfx.play('pickup'); g.ui.toast('You take the club. Press F to swing it.', 3200); } }
    else if (t.kind === 'site' && t.deliver && e) this.deliverTo(t.b);
    else if (t.kind === 'work') { if (held) { this.working = true; g.economy.earn(12 * rawDt); this.hold = (this.hold + rawDt * 0.2) % 1; } else this.hold = 0; }
    else if (t.kind === 'info' && e) Sfx.play('deny');
    if (!held && !['rest'].includes(t.kind)) this.hold = 0;
  }
  distTo(t) {
    if (t.node) return Math.hypot(t.node.x - this.x, t.node.z - this.z);
    if (t.plan) return Math.hypot(t.plan.cx - this.x, t.plan.cz - this.z) - 1.5;
    if (t.b) { const b = t.b, dx = Math.max(b.x0 * TILE - this.x, 0, this.x - (b.x0 + b.w) * TILE), dz = Math.max(b.z0 * TILE - this.z, 0, this.z - (b.z0 + b.d) * TILE); return Math.hypot(dx, dz); }
    return 0;
  }
  stillValid(t) { if (t.kind === 'gather') return t.node.kind === 'tree' ? t.node.alive : (t.node.infinite || t.node.amount >= 1); if (t.kind === 'site') return t.b.state === 'site'; if (t.kind === 'road') return this.game.roadPlans.has(t.plan.x, t.plan.z); return true; }

  /** Timing minigame: every tap is graded; holding the button works slowly on its own. */
  doWork(t, dt, tap, held) {
    const g = this.game, wg = g.workgame; wg.start(t.work, this.targetKey(t));
    if (tap || held) { this.lockT = performance.now(); if (this.lock !== t) { this.lock = t; this.lockPos = { x: this.x, z: this.z }; } }
    const fx = t.node ? t.node.x : t.b ? t.b.cx : t.plan.cx, fz = t.node ? t.node.z : t.b ? t.b.cz : t.plan.cz; let value = 0;
    if (tap) {
      const r = wg.press(); value = STROKE[r.q] * r.mult;
      if (t.node) { if (t.nk === 'tree') { g.terrain.hitTree(t.node); g.terrain.fallFrom = { x: this.x, z: this.z }; } else g.resources.shake(t.node); } this.strikeT = 0.5; this.faceTo(fx, fz); if (r.q === 'perfect') this.shake = 0.25;
      const hx = this.x + (fx - this.x) * 0.6, hz = this.z + (fz - this.z) * 0.6; g.particles.burst(hx, t.work === 'build' ? 0.8 : 1.0, hz, t.nk === 'berry' ? (Math.random() < 0.5 ? 0xc0243a : 0x7a2a8a) : t.nk === 'field' ? 0xe0c050 : CHIP[t.work], r.q === 'perfect' ? 14 : r.q === 'good' ? 8 : 3, 1, 3.2);
    }
    if (held) { value += dt * 0.35; this.faceTo(fx, fz); }
    if (held || this.strikeT > 0) this.working = true;
    const speed = Math.max(1, g.clock.speed);
    if (t.kind === 'gather') {
      this.gatherT = (this.gatherT || 0) + value * t.time;
      while (this.gatherT >= t.time) {
        this.gatherT -= t.time; if (!g.resources.take(t.node)) { this.gatherT = 0; break; }
        const got = this.invAdd(t.mat, t.per); g.flags.gathered = (g.flags.gathered || 0) + got; Sfx.play('unit'); wg.pop(`+${got} ${MATERIALS[t.mat].name.toLowerCase()}`, 'unit');
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
  sitOn(seat, b) { seat.taken = 'player'; this.seat = Object.assign(seat, { b }); this.prevPos = { x: this.x, z: this.z }; this.x = seat.x; this.z = seat.z; this.heading = seat.heading; Sfx.play('ui'); this.game.workgame.stop(); this.lock = null; }
  standUp() { const s = this.seat; if (!s) return; s.taken = null; this.seat = null; this.x = s.x + Math.sin(s.heading) * 0.8; this.z = s.z + Math.cos(s.heading) * 0.8; this.unstick(); }
  finished(b) { const g = this.game; Sfx.play('done'); g.particles.burst(b.cx, 3, b.cz, 0xffd23f, 30, 2.5, 5, 0.16); g.ui.toast(`${b.def.name} finished!`, 2800); }
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
  useDepot() {
    const g = this.game;
    if (this.invTotal()) { const n = this.invTotal(); for (const [m, q] of Object.entries(this.inv)) g.economy.add(m, q); g.flags.stored = (g.flags.stored || 0) + n; g.ui.toast(`Stored ${this.invText()}`); this.inv = {}; Sfx.play('drop'); return; }
    let took = 0;
    for (const s of g.construction.sites) for (const m of Object.keys(s.need)) {
      const want = Math.min(g.buildings.missing(s, m) - (this.inv[m] || 0), Math.floor(g.economy.stock[m] || 0), this.invRoom()); if (want <= 0) continue;
      g.economy.stock[m] -= want; this.invAdd(m, want); took += want;
    }
    if (!took) { Sfx.play('deny'); g.ui.toast(g.construction.sites.length ? 'The Stockyard has nothing your building sites still need.' : 'No building sites need anything.'); return; }
    Sfx.play('pickup'); g.ui.toast(`Packed ${this.invText()} for the building sites`);
  }
  trySleep(spot) {
    const g = this.game, h = g.clock.hour;
    if (!(h >= 20 || h < 6 || this.energy < 35)) { g.ui.toast('Too early to sleep. (After 20:00, or when you are tired.)'); return; }
    this.sleeping = true; g.flags.slept = true; this.sleepSpot = spot; this.x = spot.x; this.z = spot.z; this.heading = spot.rotY; g.clock.sleepBoost = 8; g.ui.fade(0.55, 'Zzz...');
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
    const g = this.game, hosp = g.buildings.byDef('clinic')[0];
    let x, z;
    if (hosp && hosp.spots.bed[0]) { x = hosp.spots.bed[0].ax; z = hosp.spots.bed[0].az; g.messages.push('Hospital', 'Dr. on duty: "You collapsed, Sam. Rest up. Nothing to see here."', 'warn'); }
    else { x = g.plaza.x; z = g.plaza.z; g.messages.push('Planning Office', 'Sam, you were found and brought back to the square. Your things are where you fell.', 'warn'); }
    this.teleport(x, z); this.energy = Math.max(this.energy, 70); this.hunger = Math.min(this.hunger, 50); this.starveT = 0; g.ui.fade(0); g.security.reset();
  }

  // ---------- visuals ----------
  syncMesh(dt) {
    const g = this.game, m = this.mesh, godView = g.mode === 'god'; this.rig.lod.visible = false;
    m.visible = !(g.mode === 'sim' && !this.third && !this.sleeping);
    m.position.set(this.x, 0, this.z); m.rotation.y = this.heading;
    const aim = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)), ty = this.sleeping || this.sedated > 0 || this.down > 0 ? 0 : clamp(angleDiff(this.heading, aim), -1.1, 1.1), tp = -this.pitch * 0.8;
    const k = Math.min(1, dt * 8); this.lookYaw += (ty - this.lookYaw) * k; this.lookPitch += (tp - this.lookPitch) * k;
    let lower = 'stand', upper = 'idle'; const t = this.target, carrying = this.invTotal() > 0;
    if (this.sleeping) { lower = 'lie'; upper = 'sleep'; }
    else if (this.seat) { lower = 'sit'; upper = this.seat.b && this.seat.b.def.park === 'camp' ? 'watch' : 'idle'; }
    else if (this.sedated > 0 || this.down > 0) { lower = 'lie'; upper = 'sedated'; }
    else {
      if (this.speed > 0.3 && this.moved) lower = 'walk';
      if (this.working && t && t.kind === 'gather') { upper = t.upper; lower = ['harvest', 'dig'].includes(upper) ? 'crouch' : 'stand'; }
      else if (this.working && t && t.kind === 'site') { lower = 'crouch'; upper = 'hammer'; }
      else if (this.working && t && t.kind === 'road') { lower = 'crouch'; upper = 'dig'; }
      else if (this.working && t && t.kind === 'rest') { lower = 'sit'; upper = 'idle'; }
      else if (this.working && t && t.kind === 'work') { upper = { shopkeeper: 'tidy', clerk: 'type', doctor: 'clipboard', guard: 'guard', engineer: 'panel', factory: 'lever' }[t.role] || 'idle'; }
      else if (carrying && this.invTotal() >= 6) upper = 'carry';
      else if (g.ui.terminalB) upper = 'type';
      else if (g.ui.dialogue) upper = 'listen';
      if (this.emoteT > 0 && lower !== 'crouch') upper = 'wave';
      if (this.swingT > 0) upper = 'strike';
    }
    let big = null, bn = 0; for (const [mm, n] of Object.entries(this.inv)) if (n > bn) { bn = n; big = mm; }
    this.anim.update(dt, { lower, upper, dist: this.dist, speed: this.speed, run: this.speed > 5.6, lookYaw: this.lookYaw, lookPitch: this.lookPitch, mood: 0.25, tired: this.energy < 25, crateColor: big ? MATERIALS[big].color : undefined, speaking: g.ui.dialogue ? false : undefined, prop: this.weapon && !this.sleeping && this.sedated <= 0 ? { handR: 'club' } : undefined });
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
  placeCamera(cam) {
    const w = this.game.world, [hx, hy, hz] = this.headPos();
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch), fy = Math.sin(this.pitch), fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    if (this.sleeping || this.sedated > 0 || this.down > 0) { cam.position.set(this.x, 1.2, this.z); cam.lookAt(this.x - Math.sin(this.heading) * 0, 4, this.z + 0.001); return; }
    const sh = this.shake > 0 ? this.shake * 0.12 : 0, jx = sh ? (Math.random() - 0.5) * sh : 0, jy = sh ? (Math.random() - 0.5) * sh : 0;
    if (!this.third) { if (this.cut && this.cut.size) this.cutaway(null); cam.position.set(hx + jx, hy + jy, hz); cam.lookAt(hx + fx, hy + fy, hz + fz); return; }
    let d = this.camDist; const sx = Math.cos(this.yaw) * 0.55, sz = -Math.sin(this.yaw) * 0.55; const tx = hx + sx, ty = 1.75, tz = hz + sz;
    while (d > 0.6) { const cx = tx - fx * d, cz = tz - fz * d, cy = ty - fy * d + 0.4; if (cy < 0.3) { d -= 0.3; continue; } if (!w.collides(cx, cz, 0.25, true)) break; d -= 0.3; }
    cam.position.set(tx - fx * d + jx, Math.max(0.4, ty - fy * d + 0.4) + jy, tz - fz * d); cam.lookAt(tx, ty, tz); this.cutaway(cam.position.x, cam.position.z, hx, hz);
  }
}
