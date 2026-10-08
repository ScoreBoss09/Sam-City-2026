import * as THREE from 'three';
import { TILE } from '../config.js';
import { ROLES, MATERIALS } from '../data/buildings.js';
import { T } from '../world/World.js';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { clamp, angleDiff } from '../util.js';

const R = 0.4;
export const TOOLS = { axe: 'Axe', pick: 'Pickaxe', shovel: 'Shovel', basket: 'Basket', rod: 'Fishing rod', hammer: 'Hammer' };
const TOOL_FOR = { tree: 'axe', rock: 'pick', ore: 'pick', clay: 'shovel', sand: 'shovel', berry: 'basket', field: 'basket', fish: 'rod' };

/** Sam: the playable sim. First/third person, interactions, carrying, sleeping, sedation. */
export class Player {
  constructor(game) {
    this.game = game; this.x = 0; this.z = 0; this.heading = 0; this.yaw = 0; this.pitch = -0.1; this.third = true; this.camDist = 5; this.energy = 100;
    this.carry = null; this.tools = new Set(); this.hunger = 20; this.hungerWarn = false; this.starveT = 0; this.weapon = null; this.down = 0; this.swingT = 0; this.sleeping = false; this.sedated = 0; this.walkPhase = 0; this.moved = false; this.target = null; this.hold = 0; this.working = false; this.frozen = false;
    this.rig = createRig({ shirt: 0xe8772e, pants: 0x2d3a55, skin: 0xe0b48f, hair: 0x3b2a1a, hairStyle: 'side', hat: { type: 'cap', color: 0xe8772e }, longSleeve: false, accessory: null }); this.mesh = this.rig.root;
    this.anim = new Animator(this.rig, { trait: 'cheerful', bounce: 1.1, swing: 1.1 }); this.speed = 0; this.dirx = 0; this.dirz = 0; this.emoteT = 0; this.lookYaw = 0; this.lookPitch = 0; this.dist = 0; game.scene.add(this.mesh);
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); this.marker.rotation.x = Math.PI; game.scene.add(this.marker);
  }
  teleport(x, z, heading) { this.x = x; this.z = z; if (heading !== undefined) { this.heading = heading; this.yaw = heading; } }

  headPos() { return [this.x, 1.65, this.z]; }

  update(dt, rawDt) {
    const g = this.game, inp = g.input, sim = g.mode === 'sim' && !g.ui.modalOpen && !g.ending;
    this.moved = false; this.working = false; this.dist = 0; if (this.emoteT > 0) this.emoteT -= rawDt;
    if (this.sedated > 0) { this.sedated -= rawDt; if (this.sedated <= 0) this.wakeFromSedation(); }
    if (this.down > 0) this.down -= rawDt; if (this.swingT > 0) this.swingT -= rawDt; if (this.swingT <= 0 && this.swingHit) this.swingHit = false;
    // look
    if (sim && !this.sleeping && this.sedated <= 0 && !(this.down > 0)) {
      this.yaw -= inp.mouse.dx * 0.0025; this.pitch = clamp(this.pitch - inp.mouse.dy * 0.0025, -1.3, 1.2);
      if (inp.down('ArrowLeft')) this.yaw += 2 * rawDt; if (inp.down('ArrowRight')) this.yaw -= 2 * rawDt;
      if (inp.down('ArrowUp')) this.pitch = clamp(this.pitch + 1.2 * rawDt, -1.3, 1.2); if (inp.down('ArrowDown')) this.pitch = clamp(this.pitch - 1.2 * rawDt, -1.3, 1.2);
      if (inp.hit('KeyV')) this.third = !this.third;
      if (inp.mouse.wheel && this.third) this.camDist = clamp(this.camDist + inp.mouse.wheel * 0.6, 2.5, 9);
      // move (with acceleration and smooth turning)
      let fx = 0, fz = 0; if (inp.down('KeyW')) fz += 1; if (inp.down('KeyS')) fz -= 1; if (inp.down('KeyA')) fx -= 1; if (inp.down('KeyD')) fx += 1;
      const input = fx || fz, run = inp.down('ShiftLeft') || inp.down('ShiftRight');
      if (input) {
        const l = Math.hypot(fx, fz); fx /= l; fz /= l; const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
        this.dirx = -sy * fz + cy * fx; this.dirz = -cy * fz - sy * fx; this.hold = 0; if (this.sleeping) this.wake();
      }
      const target = input ? (run ? 7.2 : 4.4) : 0; this.speed += clamp(target - this.speed, -26 * rawDt, 20 * rawDt);
      if (this.speed > 0.05) {
        this.heading += clamp(angleDiff(this.heading, Math.atan2(this.dirx, this.dirz)), -13 * rawDt, 13 * rawDt);
        const ox = this.x, oz = this.z; this.tryMove(this.dirx * this.speed * rawDt, this.dirz * this.speed * rawDt); this.dist = Math.hypot(this.x - ox, this.z - oz); this.moved = this.dist > 0.0005;
      } else this.dist = 0;
      if (inp.hit('KeyG') && this.emoteT <= 0) this.emoteT = 2.2;
      if (this.weapon && inp.hit('KeyF') && !(this.swingT > 0)) { this.swingT = 0.6; this.swingHit = false; }
      if (this.swingT > 0.3 && !this.swingHit && this.weapon) { this.swingHit = true; this.strike(); }
      if (inp.hit('KeyQ')) this.eat();
      this.interact(rawDt);
    }
    // needs (game seconds)
    if (g.started && !this.sleeping) {
      this.hunger = Math.min(100, this.hunger + dt * 0.22); this.energy = Math.max(0, this.energy - dt * 0.2 * (this.hunger > 85 ? 1.8 : 1));
      if (this.hunger > 65 && !this.hungerWarn) { this.hungerWarn = true; g.ui.toast(g.input.padActive ? 'You are hungry. Eat with Y (carry berries, or stand by the Stockyard or a campfire).' : 'You are hungry. Press Q to eat (carry berries, or stand by the Stockyard or a campfire).', 5200); g.messages.push('Sam (thought)', 'My stomach is growling. Berries, fish, crops... something to eat. [Q] eats food you carry or from the Stockyard.', 'warn'); }
      if (this.hunger < 40) this.hungerWarn = false;
      if (this.hunger >= 100) this.starveT += dt; else this.starveT = 0;
    }
    if ((this.energy <= 0 || this.starveT > 30) && !this.sleeping && this.sedated <= 0 && g.started) this.collapse(this.starveT > 30 ? 'hunger' : 'tired');
    this.syncMesh(rawDt);
  }
  /** Eat: first from what Sam is carrying, otherwise from the Stockyard or a campfire close by. */
  eat() {
    const g = this.game; if (this.hunger < 12) { g.ui.toast('You are not hungry.'); return; }
    if (this.carry && this.carry.mat === 'food') {
      this.carry.qty -= 1; this.hunger = Math.max(0, this.hunger - 35); g.ui.toast('You eat some of what you gathered. Tasty!'); this.emoteT = 0; g.flags.ate = (g.flags.ate || 0) + 1; if (this.carry.qty <= 0) this.carry = null; return;
    }
    const near = g.buildings.list.some((b) => b.state === 'done' && (b.def.stores || b.def.park === 'camp') && Math.hypot(b.cx - this.x, b.cz - this.z) < b.def.w * 2 + 3.5);
    if (near) { if (g.economy.stock.food >= 0.5) { g.economy.stock.food -= 0.5; this.hunger = Math.max(0, this.hunger - 55); g.ui.toast('You share a hot meal. (-0.5 food from the Stockyard)'); g.flags.ate = (g.flags.ate || 0) + 1; } else g.ui.toast('The Stockyard has no food. Pick berries (Basket) or fish (Rod) first.'); return; }
    g.ui.toast(g.economy.stock.food > 0 ? 'Walk to the Stockyard or a campfire to eat from the store, or carry food and press Q.' : 'No food to eat. Pick berries with the Basket, then press Q.');
  }
  /** Swing the club: stuns raiders in front of Sam (two clean hits put one down). */
  strike() {
    const g = this.game; if (!g.raids || !g.raids.alert) return; const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (const r of g.raids.raiders) {
      if (r.captured || r.remove) continue; const dx = r.x - this.x, dz = r.z - this.z, d = Math.hypot(dx, dz);
      if (d < 2.5 && (d < 0.7 || (dx * fx + dz * fz) / d > 0.2)) { g.raids.hit(r, 1); r.atkT = 0; r.path = []; g.social.say(r, 'Argh!', 1.4); }
    }
  }
  /** Knocked flat by a raider for a couple of seconds. */
  stagger(sec = 2.2) {
    if (this.sedated > 0 || this.down > 0) return; const g = this.game; this.down = sec; this.swingT = 0; this.energy = Math.max(0, this.energy - 10);
    if (this.carry) { g.economy.add(this.carry.mat, this.carry.qty); this.carry = null; g.ui.toast('You are knocked to the ground! (the load is returned to stock)'); } else g.ui.toast('You are knocked to the ground!');
  }
  tryMove(dx, dz) {
    const w = this.game.world;
    if (!w.collides(this.x + dx, this.z, R)) this.x += dx;
    if (!w.collides(this.x, this.z + dz, R)) this.z += dz;
  }

  // ---------- interaction ----------
  findTarget() {
    const g = this.game, px = this.x, pz = this.z, B = g.buildings.list; let best = null, bd = 1e9;
    const consider = (t, d) => { if (d < bd) { bd = d; best = t; } };
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    for (const s of g.population.sims) {
      if (s.kind === 'raider') continue;
      if (s.pose === 'sleep' || (s.inside && s.inside !== g.buildings.playerInside && !s.inside.def.open)) continue;
      const dx = s.x - px, dz = s.z - pz, d = Math.hypot(dx, dz); if (d > 2.6) continue;
      if (!this.third && d > 0.8 && (dx * fx + dz * fz) / d < 0.3) continue;
      consider({ kind: 'sim', sim: s, text: `Talk to ${s.name} (${s.roleName})`, hold: false }, d - 0.5);
    }
    if (g.raids.pickup && !this.weapon) { const q = g.raids.pickup, d = Math.hypot(q.x - px, q.z - pz); if (d < 2.6) consider({ kind: 'weapon', text: 'Take the militia club  (F to swing)', hold: false }, d - 1); }
    for (const it of g.tools.items) { if (it.taken) continue; const d = Math.hypot(it.x - px, it.z - pz); if (d < 2.5) consider({ kind: 'tool', item: it, text: `Pick up the ${TOOLS[it.id]}`, hold: false }, d - 2); }
    for (const b of B) if (b.state === 'done' && b.def.park === 'camp' && this.energy < 85) { const d = Math.hypot(b.cx - px, b.cz - pz); if (d < 4.2) consider({ kind: 'rest', b, text: 'Rest by the fire  (hold E)', hold: true }, d + 0.5); }
    if (g.roadPlans.count) {
      const p0 = g.roadPlans.at(px, pz); let rp = p0, rd = 0; if (!rp) { for (const q of g.roadPlans.plans.values()) { const d = Math.hypot(q.cx - px, q.cz - pz); if (d < 3.4 && (!rp || d < rd)) { rp = q; rd = d; } } }
      if (rp) consider(this.tools.has('shovel') ? { kind: 'road', plan: rp, text: `Dig the ${rp.type === 2 ? 'paved road (uses 1 stone)' : 'path'}  (hold E)`, hold: true } : { kind: 'info', text: 'You need the Shovel to dig paths. Pick it up from the tool crate.', hold: false }, rd + 0.3);
    }
    const inside = g.buildings.playerInside;
    for (const b of B) {
      if (b.state === 'done') {
        for (const t of b.spots.terminal) { const d = Math.hypot(t.x - px, t.z - pz); if (d < 1.9) consider({ kind: 'terminal', b, text: 'Use computer terminal', hold: false }, d); }
        for (const t of b.spots.pickup) { const d = Math.hypot(t.x - px, t.z - pz); if (d < 2.8) consider({ kind: 'depot', b, text: this.carry ? `Store ${this.carry.qty} ${MATERIALS[this.carry.mat].name} in the Stockyard` : 'Take a crate from the Stockyard', hold: false }, d); }
        if (b === g.starterHome && b.spots.bed[0]) { const s = b.spots.bed[0], d = Math.hypot(s.x - px, s.z - pz); if (d < 2.6) consider({ kind: 'bed', b, spot: s, text: 'Sleep in your bed', hold: false }, d); }
        if (b.def.jobs && b.id !== 'contractor') {
          const roles = Object.keys(b.def.jobs); const role = roles[0];
          for (const t of b.spots.work) {
            const d = Math.hypot(t.x - px, t.z - pz); if (d > 1.6) continue;
            const manned = g.population.sims.some((s) => s.inside === b && Math.hypot(s.x - t.x, s.z - t.z) < 1.2);
            if (!manned) consider({ kind: 'work', b, role, text: `Work a shift as ${ROLES[role].name}  (hold E, earns city funds)`, hold: true }, d + 0.3);
          }
        }
      } else if (b.state === 'site') {
        const dx = Math.max(b.x0 * TILE - px, 0, px - (b.x0 + b.w) * TILE), dz = Math.max(b.z0 * TILE - pz, 0, pz - (b.z0 + b.d) * TILE), d = Math.hypot(dx, dz);
        if (d < 3.2) {
          const needs = Object.keys(b.need).some((m) => g.buildings.missing(b, m) > 0 || (b.need[m] - (b.have[m] || 0)) > 0);
          let text, hold = false;
          if (this.carry && b.need[this.carry.mat] - (b.have[this.carry.mat] || 0) > 0) text = `Deliver ${this.carry.qty} ${MATERIALS[this.carry.mat].name}`;
          else if (g.construction.workable(b) && !this.tools.has('hammer')) { text = 'You need the Hammer to build. Pick it up from the tool crate.'; }
          else if (g.construction.workable(b)) { text = `Build ${b.def.name}  (hold E)  ${Math.round(b.progress * 100)}%`; hold = true; }
          else text = `${b.def.name}: waiting for materials (${Math.round(g.buildings.supply(b) * 100)}% delivered)`;
          consider({ kind: 'site', b, text, hold, passive: !text.startsWith('Deliver') && !hold }, d + 0.2);
        }
      }
    }
    // gatherable resources
    const R = g.resources, w = g.world, carryOk = (mat) => !this.carry || (this.carry.mat === mat && this.carry.qty < 8);
    const gtext = (verb, mat, extra = '') => !carryOk(mat) ? `Your hands are full. Store your load at the Stockyard (E).` : `${verb}  (hold E)${extra}`;
    const addGather = (node, kind, verb, mat, time, per, upper, d, need) => { const tn = TOOL_FOR[kind]; if (tn && !this.tools.has(tn)) { consider({ kind: 'info', text: `You need the ${TOOLS[tn]} for this. Pick it up from the tool crate.`, hold: false }, d + 1); return; } if (need && !g.buildings.count(need[0])) { consider({ kind: 'info', text: `${verb.split(' ')[0]}: you need a ${need[1]} to turn this into ${MATERIALS[mat].name.toLowerCase()}`, hold: false }, d + 1.5); return; } consider({ kind: 'gather', node, nk: kind, mat, time, per, upper, text: gtext(verb, mat), hold: carryOk(mat) }, d + 0.4); };
    for (const t of g.terrain.trees) { if (!t.alive) continue; const d = Math.hypot(t.x - px, t.z - pz); if (d < 3.7) addGather(Object.assign(t, { kind: 'tree' }), 'tree', 'Chop tree', 'timber', 2.2, 1, 'chop', d); }
    for (const n of R.nodes) {
      if (n.amount < 1) continue; const d = Math.hypot(n.x - px, n.z - pz), reach = n.kind === 'field' ? 3.2 : 3.0; if (d > reach) continue;
      if (n.kind === 'rock') addGather(n, 'rock', 'Break rocks', 'stone', 2.6, 1, 'mine', d);
      else if (n.kind === 'ore') addGather(n, 'ore', 'Mine iron ore', 'steel', 3.0, 1, 'mine', d, ['foundry', 'Foundry']);
      else if (n.kind === 'clay') addGather(n, 'clay', 'Dig clay', 'brick', 2.6, 1, 'dig', d, ['brickworks', 'Brickworks']);
      else if (n.kind === 'berry') addGather(n, 'berry', 'Pick berries', 'food', 1.7, 2, 'harvest', d);
      else if (n.kind === 'field') addGather(n, 'field', 'Harvest crops', 'food', 1.9, 2, 'harvest', d);
    }
    { const [tx, tz] = w.tileOf(px, pz), tt = w.inBounds(tx, tz) ? w.terrain[w.idx(tx, tz)] : 0;
      if (tt === T.SAND && !w.road[w.idx(tx, tz)]) addGather({ kind: 'sand', infinite: true, amount: 999, x: px, z: pz }, 'sand', 'Dig sand', 'glass', 3.0, 1, 'dig', 2.5, ['glassworks', 'Glassworks']);
      const fx = px - Math.sin(this.yaw) * 2.6, fz = pz - Math.cos(this.yaw) * 2.6, [ax, az] = w.tileOf(fx, fz);
      if (w.inBounds(ax, az) && w.terrain[w.idx(ax, az)] === T.WATER && w.isLand(tx, tz)) addGather({ kind: 'fish', infinite: true, amount: 999, x: fx, z: fz }, 'fish', 'Fish', 'food', 3.2, 2, 'fish', 2.6); }
    return best;
  }
  interact(rawDt) {
    const g = this.game, inp = g.input; let nt = this.findTarget();
    // keep working on the same thing while E is held, even if somebody walks past
    const keep = this.target && inp.down('KeyE') && this.hold > 0 && ['gather', 'site', 'road', 'rest', 'work'].includes(this.target.kind) && (!nt || nt.kind !== this.target.kind || nt.kind === 'sim');
    if (keep) nt = this.target; this.target = nt; const t = this.target;
    g.ui.setPrompt(t ? t.text : null, t && t.hold ? this.hold : -1);
    if (!t) { this.hold = 0; return; }
    const e = inp.hit('KeyE'), held = inp.down('KeyE');
    if (t.kind === 'sim' && e) g.startDialogue(t.sim);
    else if (t.kind === 'terminal' && e) g.ui.openTerminal(t.b);
    else if (t.kind === 'gather') this.doGather(t, rawDt, held);
    else if (t.kind === 'depot' && e) this.useDepot();
    else if (t.kind === 'bed' && e) this.trySleep(t.spot);
    else if (t.kind === 'tool' && e) { t.item.taken = true; g.tools.take(t.item); this.tools.add(t.item.id); g.ui.toast(`You take the ${TOOLS[t.item.id]}. It goes on your belt.`, 2600); }
    else if (t.kind === 'rest') { if (held) { this.working = true; this.energy = Math.min(100, this.energy + rawDt * 7); this.hold = this.energy / 100; } else this.hold = 0; }
    else if (t.kind === 'road') { if (held) { this.working = true; this.faceTo(t.plan.cx, t.plan.cz); if (g.roadPlans.work(t.plan, rawDt * Math.max(1, g.clock.speed))) g.ui.toast('Path finished.'); else if (t.plan.type === 2 && !t.plan.paid) g.ui.toast('No stone in the Stockyard for paving.'); this.hold = t.plan.progress; } else this.hold = 0; }
    else if (t.kind === 'weapon' && e) { if (g.raids.take()) { this.weapon = 'club'; g.ui.toast('You take the club. Press F to swing it.', 3200); } }
    else if (t.kind === 'site') {
      if (e && this.carry && t.b.need[this.carry.mat] - (t.b.have[this.carry.mat] || 0) > 0) { g.buildings.deliver(t.b, this.carry.mat, this.carry.qty); g.ui.toast(`Delivered ${this.carry.qty} ${MATERIALS[this.carry.mat].name}`); this.carry = null; }
      else if (held && t.hold) { this.working = true; this.faceTo(t.b.cx, t.b.cz); g.buildings.addWork(t.b, rawDt * Math.max(1, g.clock.speed)); this.hold = t.b.progress; }
    } else if (t.kind === 'work') {
      if (held) { this.working = true; const wage = 12; g.economy.earn(wage * rawDt); this.hold = (this.hold + rawDt * 0.2) % 1; } else this.hold = 0;
    }
    if (!held && !['site', 'gather', 'road', 'rest'].includes(t.kind)) this.hold = 0;
  }
  doGather(t, dt, held) {
    const g = this.game;
    if (!held || !t.hold) { this.gatherT = 0; this.hold = 0; return; }
    this.working = true; this.faceTo(t.node.x, t.node.z); this.gatherT = (this.gatherT || 0) + dt; this.hold = this.gatherT / t.time;
    if (this.gatherT >= t.time) {
      this.gatherT = 0; if (!g.resources.take(t.node)) return;
      if (!this.carry) this.carry = { mat: t.mat, qty: 0 }; this.carry.qty = Math.min(8, this.carry.qty + t.per); g.flags.gathered = (g.flags.gathered || 0) + t.per;
      if (this.carry.qty >= 8) g.ui.toast('You cannot carry any more. Store it at the Stockyard.');
    }
  }
  faceTo(x, z) { this.heading = Math.atan2(x - this.x, z - this.z); }
  useDepot() {
    const g = this.game;
    if (this.carry) { g.economy.add(this.carry.mat, this.carry.qty); if (this.carry.site) { const s = this.carry.site; s.reserved[this.carry.mat] = Math.max(0, (s.reserved[this.carry.mat] || 0) - this.carry.qty); } else g.flags.stored = (g.flags.stored || 0) + this.carry.qty; g.ui.toast(`Stored ${this.carry.qty} ${MATERIALS[this.carry.mat].name}`); this.carry = null; return; }
    const n = g.construction.nextMaterialFor(4);
    if (!n) { g.ui.toast(g.construction.sites.length ? 'Depot is out of the materials your sites need. Order more at a terminal.' : 'No construction sites need materials.'); return; }
    g.economy.stock[n.mat] -= n.qty; n.site.reserved[n.mat] = (n.site.reserved[n.mat] || 0) + n.qty; this.carry = { mat: n.mat, qty: n.qty, site: n.site };
    g.ui.toast(`Picked up ${n.qty} ${MATERIALS[n.mat].name} for ${n.site.def.name}`);
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
  /** Sedation: screen fades, then Sam wakes in hospital or the town square. */
  sedate(reason = '') {
    if (this.sedated > 0) return; const g = this.game;
    this.sedated = 3.2; this.carry && (this.carry = null); g.ui.fade(1, reason === 'exhaustion' ? '' : 'You feel a sharp sting... everything goes soft.'); if (this.sleeping) { this.sleeping = false; g.clock.sleepBoost = 0; }
  }
  wakeFromSedation() {
    const g = this.game, hosp = g.buildings.byDef('clinic')[0];
    let x, z;
    if (hosp && hosp.spots.bed[0]) { x = hosp.spots.bed[0].ax; z = hosp.spots.bed[0].az; g.messages.push('Hospital', 'Dr. on duty: "You collapsed, Sam. Rest up. Nothing to see here."', 'warn'); }
    else { x = g.plaza.x; z = g.plaza.z; g.messages.push('Planning Office', 'Sam, you wandered off. You were found near the edge and brought back to the square. Easy now.', 'warn'); }
    this.teleport(x, z); this.energy = Math.max(this.energy, 70); this.hunger = Math.min(this.hunger, 50); this.starveT = 0; g.messages.push('Planning Office', 'You were given a bowl of soup and a lie-down. Eat (Q) and sleep in time, Sam, or it will happen again.', 'warn'); g.ui.fade(0); g.security.reset();
  }

  // ---------- visuals ----------
  syncMesh(dt) {
    const g = this.game, m = this.mesh, godView = g.mode === 'god'; this.rig.lod.visible = false;
    m.visible = !(g.mode === 'sim' && !this.third && !this.sleeping);
    m.position.set(this.x, 0, this.z); m.rotation.y = this.heading;
    // look where the camera aims
    const aim = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw)), ty = this.sleeping || this.sedated > 0 || this.down > 0 ? 0 : clamp(angleDiff(this.heading, aim), -1.1, 1.1), tp = -this.pitch * 0.8;
    const k = Math.min(1, dt * 8); this.lookYaw += (ty - this.lookYaw) * k; this.lookPitch += (tp - this.lookPitch) * k;
    let lower = 'stand', upper = 'idle', t = this.target;
    if (this.sleeping) { lower = 'lie'; upper = 'sleep'; }
    else if (this.sedated > 0 || this.down > 0) { lower = 'lie'; upper = 'sedated'; }
    else {
      if (this.speed > 0.3 && this.moved) lower = 'walk';
      if (this.working && t && t.kind === 'gather') { upper = t.upper; lower = ['harvest', 'dig'].includes(upper) ? 'crouch' : 'stand'; }
      else if (this.working && t && t.kind === 'site') { lower = 'crouch'; upper = 'hammer'; }
      else if (this.working && t && t.kind === 'road') { lower = 'crouch'; upper = 'dig'; }
      else if (this.working && t && t.kind === 'rest') { lower = 'sit'; upper = 'idle'; }
      else if (this.working && t && t.kind === 'work') { upper = { shopkeeper: 'tidy', clerk: 'type', doctor: 'clipboard', guard: 'guard', engineer: 'panel', factory: 'lever' }[t.role] || 'idle'; }
      else if (this.carry) upper = 'carry';
      else if (g.ui.terminalB) upper = 'type';
      else if (g.ui.dialogue) upper = 'listen';
      if (this.emoteT > 0 && !this.carry && lower !== 'crouch') upper = 'wave';
      if (this.swingT > 0) upper = 'strike';
    }
    const carryCol = this.carry ? MATERIALS[this.carry.mat].color : undefined;
    this.anim.update(dt, { lower, upper, dist: this.dist, speed: this.speed, run: this.speed > 5.6, lookYaw: this.lookYaw, lookPitch: this.lookPitch, mood: 0.25, tired: this.energy < 25, crateColor: carryCol, speaking: g.ui.dialogue ? false : undefined, prop: this.weapon && !this.sleeping && this.sedated <= 0 ? { handR: 'club' } : undefined });
    this.marker.visible = godView; this.marker.position.set(this.x, 5.2 + Math.sin(performance.now() / 300) * 0.4, this.z); this.marker.rotation.y += dt * 2;
  }

  /** Camera for sim mode (first/third person). */
  placeCamera(cam) {
    const w = this.game.world, [hx, hy, hz] = this.headPos();
    const fx = -Math.sin(this.yaw) * Math.cos(this.pitch), fy = Math.sin(this.pitch), fz = -Math.cos(this.yaw) * Math.cos(this.pitch);
    if (this.sleeping || this.sedated > 0 || this.down > 0) { cam.position.set(this.x, 1.2, this.z); cam.lookAt(this.x - Math.sin(this.heading) * 0, 4, this.z + 0.001); return; }
    if (!this.third) { cam.position.set(hx, hy, hz); cam.lookAt(hx + fx, hy + fy, hz + fz); return; }
    let d = this.camDist; const sx = Math.cos(this.yaw) * 0.55, sz = -Math.sin(this.yaw) * 0.55; const tx = hx + sx, ty = 1.75, tz = hz + sz;
    while (d > 0.6) { const cx = tx - fx * d, cz = tz - fz * d, cy = ty - fy * d + 0.4; if (cy < 0.3) { d -= 0.3; continue; } if (!w.collides(cx, cz, 0.25, true)) break; d -= 0.3; }
    cam.position.set(tx - fx * d, Math.max(0.4, ty - fy * d + 0.4), tz - fz * d); cam.lookAt(tx, ty, tz);
  }
}
