import * as THREE from 'three';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { Sfx } from '../core/Sfx.js';
import { TILE } from '../config.js';

/**
 * Combat mode: a Call of Duty style free-for-all you can switch on from the pause menu, alone (against bots) or when
 * hosting friends (against them, plus any bots). Everyone spawns with a pistol and two frag grenades; the police
 * station is the armoury (primary weapons, ammo and grenades). Guns have magazines, reloads, hip-fire spread that
 * tightens when you aim down the sights, recoil, headshots; the sniper rifle has a scope. Stand / crouch / go prone,
 * slide out of a sprint. Hits bleed, the dead go limp as ragdolls, and you're back up a few seconds later.
 * The host (or the single player) is the referee: it runs the bots and keeps the score. Keys for the scoreboard:
 * 'sam' (the host / single player), 'v<n>' (visitors), 'b<n>' (bots).
 */
export const WEAPONS = {
  pistol: { name: 'Pistol', slot: 1, auto: false, cd: 0.2, dmg: 30, pellets: 1, hip: 0.03, ads: 0.006, range: 45, mag: 12, res: 48, reload: 1.4, kick: 0.012, fov: 60, bot: 0.5 },
  ar: { name: 'Assault rifle', slot: 0, auto: true, cd: 0.1, dmg: 26, pellets: 1, hip: 0.045, ads: 0.007, range: 80, mag: 30, res: 120, reload: 2.2, kick: 0.014, fov: 52, bot: 0.45 },
  smg: { name: 'SMG', slot: 0, auto: true, cd: 0.07, dmg: 18, pellets: 1, hip: 0.04, ads: 0.016, range: 35, mag: 32, res: 128, reload: 1.9, kick: 0.009, fov: 58, bot: 0.5 },
  shotgun: { name: 'Pump shotgun', slot: 0, auto: false, cd: 0.85, dmg: 16, pellets: 8, hip: 0.08, ads: 0.06, range: 16, mag: 6, res: 24, reload: 2.8, kick: 0.05, fov: 60, bot: 0.6 },
  sniper: { name: 'Sniper rifle', slot: 0, auto: false, cd: 1.25, dmg: 105, pellets: 1, hip: 0.12, ads: 0.0, range: 220, mag: 5, res: 20, reload: 3.0, kick: 0.06, fov: 14, scope: true, bot: 0.3 },
  magnum: { name: '.357 Magnum', slot: 1, auto: false, cd: 0.45, dmg: 62, pellets: 1, hip: 0.03, ads: 0.004, range: 60, mag: 6, res: 30, reload: 2.2, kick: 0.045, fov: 56, bot: 0.45 },
  mp: { name: 'Machine pistol', slot: 1, auto: true, cd: 0.06, dmg: 14, pellets: 1, hip: 0.05, ads: 0.025, range: 25, mag: 20, res: 100, reload: 1.6, kick: 0.008, fov: 60, bot: 0.5 },
  launcher: { name: 'Rocket launcher', slot: 1, auto: false, cd: 1.2, dmg: 0, pellets: 0, hip: 0.02, ads: 0.006, range: 200, mag: 1, res: 3, reload: 3.0, kick: 0.07, fov: 50, rocket: true, slow: 0.85, bot: 0.3 },
  lmg: { name: 'Light machine gun', slot: 0, auto: true, cd: 0.085, dmg: 24, pellets: 1, hip: 0.06, ads: 0.022, range: 70, mag: 100, res: 200, reload: 4.6, kick: 0.012, fov: 54, slow: 0.82, bot: 0.4 },
};
const PRIMARIES = ['ar', 'smg', 'shotgun', 'sniper', 'lmg'], SECONDARIES = ['pistol', 'magnum', 'mp', 'launcher'];
export const WIN_KILLS = 20;
const NADE_FUSE = 2.6, NADE_R = 7.5, MAX_RAGS = 14, MAX_DECALS = 60;
const BOT_NAMES = ['Gaz', 'Big Dave', 'Wayne', 'Darren', 'Kev', 'Tel', 'Lee', 'Shaz', 'Dean', 'Tina', 'Ricky', 'Mad Pete'];
const SHELL = [0x6a2ab0, 0x1a8a8a, 0xd8342c, 0x2a5ad8, 0xe07a10, 0x2a2a30, 0x3a9a40, 0xc02a80];   // shell suits
/** Where the guns are: the police station. */
export function armoury(g) { return g.buildings.list.find((b) => b.state === 'done' && /police/.test(b.def.id)) || null; }
const STANCE_TOP = { stand: 1.8, crouch: 1.2, prone: 0.5 };

export class Combat {
  constructor(game) {
    this.game = game; this.on = false; this.bots = []; this.rags = []; this.decals = []; this.nades = []; this.score = new Map(); this.names = new Map(); this.botCount = 4; this.feed = []; this.fx = [];
    this.decalGeo = new THREE.CircleGeometry(1, 10); this.decalGeo.rotateX(-Math.PI / 2);
    this.nadeGeo = new THREE.SphereGeometry(0.09, 8, 6); this.nadeMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.7 });
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
  }
  get auth() { return !this.game.netVisitor; }
  myKey() { const g = this.game; return g.netVisitor ? 'v' + g.net.id : 'sam'; }
  nameOf(k) { if (this.names.has(k)) return this.names.get(k); const g = this.game; if (k === 'sam') return 'Sam'; if (k && k[0] === 'v' && g.net) { const v = g.net.visitors.get(+k.slice(1)); if (v) return v.name; } if (k && k[0] === 'b') { const b = this.bots.find((q) => q.key === k); if (b) return b.name; } return 'Someone'; }

  // ---------------- on / off ----------------
  /** Switch combat mode (single player or host); visitors get it from the host (remote = true). */
  setOn(on, remote = false) {
    const g = this.game, P = g.player; if (on === this.on) return; this.on = on; g.deathmatch = on;
    if (!remote && g.net && g.net.role === 'host') g.net.send({ t: 'dm', on });
    if (on) {
      this.score = new Map([[this.myKey(), 0]]); this.names = new Map(); if (g.net && g.net.role === 'host') for (const v of g.net.visitors.values()) this.score.set('v' + v.id, 0);
      if (g.raidNight && g.net && g.net.raid) { g.net.raid = null; g.net.send({ t: 'raid', on: false }); g.net.raidOn(false); }
      this.loadout(P, null); this.hud(true); this.wasThird = P.third; P.third = false;   // Call of Duty is first person (V / D-pad up for over the shoulder)
      if (this.auth) this.setBots(g.net && g.net.role === 'host' && g.net.visitors.size ? Math.min(this.botCount, 2) : this.botCount);
      const st = armoury(g); g.ui.toast(`⚔️ COMBAT MODE. Pistol and two grenades to start${st ? '; the police station has the big guns, ammo and grenades (E / □ there)' : ''}. First to ${WIN_KILLS} wins.`, 6000); Sfx.play('bell');
      this.board();
    } else {
      this.setBots(0); for (const r of this.rags) this.dropRag(r); this.rags = []; for (const n of this.nades) g.scene.remove(n.mesh); this.nades = [];
      this.leaveCover(P); if (this.wasThird !== undefined) P.third = this.wasThird; if (this.vm) this.vm.visible = false; this.drawArc(null);
      P.gun = null; P.slots = null; P.stance = 'stand'; P.dead = false; P.down = 0; P.hp = 100; if (P.mesh) P.mesh.visible = true; this.hud(false);
      if (g.net && g.net.board) g.net.board(null); if (!remote && g.net && g.net.role === 'host') g.net.send({ t: 'score', table: null });
      g.ui.toast('Combat mode off. Back to normal life.', 3000);
    }
  }
  /** Fresh loadout: a primary and a secondary (the last ones you picked at the armoury; an assault rifle and a pistol to start) and two grenades. */
  loadout(P, primary, secondary) {
    P.kit = [primary || (P.kit && P.kit[0]) || 'ar', secondary || (P.kit && P.kit[1]) || 'pistol']; P.slots = P.kit.slice(); P.ammo = {}; for (const k of P.slots) P.ammo[k] = { mag: WEAPONS[k].mag, res: WEAPONS[k].res };
    P.nades = 2; P.cur = 0; P.gun = P.slots[0]; P.reloadT = 0; P.stance = 'stand'; P.nadeAim = false;
  }

  // ---------------- the player's controls (called from Player.update in combat mode) ----------------
  controls(P, inp, dt) {
    const g = this.game; if (P.dead) return;
    const W = WEAPONS[P.gun];
    // the armoury: E (or □ on a pad) at the police station
    const st = armoury(g), atArm = st && !P.mounted && (g.buildings.playerInside === st || (st.doorOut && Math.hypot(st.doorOut.x - P.x, st.doorOut.z - P.z) < 4.5));
    if (atArm) {   // E / □ the next primary, R / △ the next secondary; ammo and grenades topped up either way
      const np = PRIMARIES[(PRIMARIES.indexOf(P.slots[0]) + 1) % PRIMARIES.length], ns = SECONDARIES[(SECONDARIES.indexOf(P.slots[1]) + 1) % SECONDARIES.length];
      g.ui.setPrompt(`Armoury: E / □ primary → ${WEAPONS[np].name} · R / △ secondary → ${WEAPONS[ns].name}`, -1, true);
      const take = (i, k) => { P.slots[i] = k; P.kit = P.slots.slice(); P.ammo = {}; for (const q of P.slots) P.ammo[q] = { mag: WEAPONS[q].mag, res: WEAPONS[q].res }; P.nades = 3; P.cur = i; P.gun = k; P.reloadT = 0; P.swapT = 0.4; Sfx.play('pickup'); for (const key of ['KeyE', 'PadSquare', 'KeyR', 'PadSwap']) inp.pressed.delete(key); };
      if (inp.hit('KeyE') || inp.hit('PadSquare')) take(0, np); else if (inp.hit('KeyR') || inp.hit('PadSwap')) take(1, ns);
    }
    // stance: C / ○ crouch (hold ○ to go prone), Z prone; sprinting into a crouch is a slide
    const sprint = (inp.down('ShiftLeft') || inp.down('ShiftRight')) && P.speed > 5.5;
    const padTap = inp.released.has('PadCrouch') && (P.crouchHold || 0) < 0.35;
    if (inp.hit('KeyQ') || (padTap && (P.cover || this.coverNear))) { if (P.cover) this.leaveCover(P); else this.takeCover(P); }   // Q / ○: in and out of cover (○ crouches when there's nothing to hide behind)
    else if (inp.hit('KeyC') || padTap) {
      if (P.cover) this.leaveCover(P);
      if (sprint && P.stance === 'stand' && !(P.jumpT > 0)) { P.slideT = 0.8; P.stance = 'crouch'; Sfx.noise(0.4, { freq: 300, vol: 0.12, type: 'lowpass' }); }
      else P.stance = P.stance === 'crouch' ? 'stand' : 'crouch';
    }
    if (inp.down('PadCrouch')) { P.crouchHold = (P.crouchHold || 0) + dt; if (P.crouchHold >= 0.35 && P.crouchHold - dt < 0.35) P.stance = P.stance === 'prone' ? 'stand' : 'prone'; } else P.crouchHold = 0;
    if (inp.hit('KeyZ')) P.stance = P.stance === 'prone' ? 'stand' : 'prone';
    if (inp.hit('Space') && P.cover) { this.leaveCover(P); inp.pressed.delete('Space'); }
    if (inp.hit('Space') && P.stance !== 'stand') { P.stance = 'stand'; inp.pressed.delete('Space'); }   // jump gets you up first
    if (sprint && P.cover) this.leaveCover(P);
    this.coverTick(P, dt);
    if (sprint && P.stance !== 'stand' && !(P.slideT > 0)) P.stance = 'stand';
    // swap weapons: 1 / 2, the wheel, △
    const swap = (i) => { if (!P.slots[i] || i === P.cur) return; P.cur = i; P.gun = P.slots[i]; P.reloadT = 0; P.swapT = 0.35; Sfx.play('pickup'); };
    if (inp.hit('Digit1')) swap(0); if (inp.hit('Digit2')) swap(1); if (!atArm && (inp.hit('PadSwap') || inp.mouse.wheel)) swap(1 - P.cur);
    if (P.swapT > 0) P.swapT -= dt;
    // reload: R / □
    const am = P.gun && P.ammo[P.gun];
    if (am && !atArm && (inp.hit('KeyR') || inp.hit('PadSquare')) && am.mag < W.mag && am.res > 0 && !(P.reloadT > 0)) this.startReload(P);
    if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0 && am) { const n = Math.min(W.mag - am.mag, am.res); am.mag += n; am.res -= n; } }
    // fire: left click / R2 (hold for automatics)
    const trig = (inp.locked && inp.mouse.left) || inp.down('PadFire');
    if (P.gun && trig && !P.mounted && !(P.swapT > 0) && !(P.slideT > 0.3) && !P.nadeAim && !(P.meleeT > 0)) {
      if (W.auto || !P.trigHeld) { if (am && am.mag <= 0) { if (!P.trigHeld) { Sfx.tone && Sfx.tone(200, 0.04, { type: 'square', vol: 0.06 }); if (am.res > 0) this.startReload(P); } } else if (!(P.reloadT > 0)) this.fire(P); }
    }
    P.trigHeld = trig;
    // grenade: hold G / R1 to see where it'll land, let go to throw
    const nadeKey = inp.down('KeyG') || inp.down('PadNade');
    if (nadeKey && P.nades > 0 && !P.mounted && !(P.reloadT > 0)) { P.nadeAim = true; this.drawArc(P); }
    else if (P.nadeAim) { P.nadeAim = false; this.drawArc(null); if (P.nades > 0) { P.nades--; this.throwNade(P); } }
    // melee: F / R3
    if ((inp.hit('KeyF') || inp.hit('PadMelee')) && !P.mounted) this.melee(P);
    if (P.meleeT > 0) P.meleeT -= dt;
    // recoil settles back
    if (P.recoil > 0) { const back = Math.min(P.recoil, dt * 0.9); P.pitch -= back; P.recoil -= back; }
    this.hudUpdate(P);
  }
  startReload(P) { const W = WEAPONS[P.gun]; P.reloadT = W.reload; Sfx.noise(0.08, { freq: 2000, vol: 0.12 }); Sfx.noise(0.08, { freq: 1500, vol: 0.12, delay: W.reload * 0.7 }); }
  /** The current spread (radians) for a shooter: hip or sights, moving, in the air, stance. */
  spread(P, W) { const ads = P.aimK || 0; let s = W.hip * (1 - ads) + W.ads * ads; s += Math.min(1, (P.speed || 0) / 7) * (W.scope && ads > 0.5 ? 0.03 : 0.025); if (P.jumpT > 0) s += 0.05; if (P.stance === 'crouch') s *= 0.75; if (P.stance === 'prone') s *= 0.55; return s; }

  // ---------------- shooting ----------------
  /** Everyone and everything a bullet can hit, as vertical capsules. */
  targets(exclude) {
    const g = this.game, out = [];
    if (g.net && g.net.role) for (const p of g.net.puppets.values()) { if (p.a === 6 || p.a === 4 || p.ragged || p.k === exclude) continue; if (p.k[0] === 's') { if (!this.on) out.push({ x: p.x, y: p.y, z: p.z, top: 1.8, r: 0.35, ref: p, kind: 'sim' }); continue; } const f = p.f || 0; out.push({ x: p.x, y: p.y, z: p.z, top: f & 8 ? 0.5 : f & 4 ? 1.2 : 1.8, r: f & 8 ? 0.55 : 0.34, ref: p, kind: 'puppet' }); }
    if (this.auth) for (const b of this.bots) if (b.alive && b.key !== exclude) out.push({ x: b.x, y: b.y, z: b.z, top: STANCE_TOP[b.stance], r: b.stance === 'prone' ? 0.55 : 0.34, ref: b, kind: 'bot' });
    if (exclude !== 'sam' && this.auth && !g.netVisitor && exclude) { const P = g.player; if (!P.dead) out.push({ x: P.x, y: P.floorY || 0, z: P.z, top: STANCE_TOP[P.stance || 'stand'], r: 0.34, ref: P, kind: 'sam' }); }
    if (this.auth) for (const s of g.population.sims) if (s.mesh.visible && !(s.down > 0) && !s.hidden) out.push({ x: s.x, y: s.rideY || 0, z: s.z, top: 1.8, r: 0.35, ref: s, kind: 'sim' });
    return out;
  }
  /** March a ray until it meets a wall (or the floor): the distance it got. */
  rayWall(o, d, max, floor = -0.05) { const w = this.game.world; for (let t = 0.4; t < max; t += 0.45) { const y = o.y + d.y * t; if (y < floor || w.collides(o.x + d.x * t, o.z + d.z * t, 0.05, true, y)) return t; } return max; }
  /** Closest capsule along a ray: { t, tg, head }. */
  rayHit(o, d, max, list) {
    let best = null; const hx = d.x, hz = d.z, hl = hx * hx + hz * hz || 1e-6;
    for (const tg of list) {
      const t = ((tg.x - o.x) * hx + (tg.z - o.z) * hz) / hl; if (t < 0.3 || t > max || (best && t > best.t)) continue;
      const px = o.x + hx * t - tg.x, pz = o.z + hz * t - tg.z; if (px * px + pz * pz > tg.r * tg.r) continue;
      const y = o.y + d.y * t - tg.y; if (y < 0 || y > tg.top) continue; best = { t, tg, head: y > tg.top - 0.32 && tg.top > 1 };
    }
    return best;
  }
  /** The player fires the gun in hand (along the crosshair). Raid night's prop pistol (gun === true) has no magazine. */
  fire(P) {
    const g = this.game, W = WEAPONS[P.gun] || WEAPONS.pistol; if ((P.gunCD || 0) > g.elapsed) return; P.gunCD = g.elapsed + W.cd; P.lastShot = g.elapsed;
    if (P.ammo && P.ammo[P.gun]) P.ammo[P.gun].mag--;
    const cam = g.camera, o = cam.position.clone(), f = new THREE.Vector3(); cam.getWorldDirection(f);
    const [hx, hy, hz] = P.headPos(), skip = P.third && !(W.scope && P.aimK > 0.5) ? Math.max(0, (hx - o.x) * f.x + (hy - o.y) * f.y + (hz - o.z) * f.z) : 0;
    this.bangSound(W, 1); const kick = W.kick * (P.aimK > 0.5 ? 0.6 : 1) * (P.stance === 'prone' ? 0.5 : P.stance === 'crouch' ? 0.75 : 1); P.pitch = Math.min(1.2, P.pitch + kick); P.recoil = (P.recoil || 0) + kick * 0.7; P.yaw += (Math.random() - 0.5) * kick * 0.6; P.shake = Math.max(P.shake || 0, W.pellets > 1 || W.scope ? 0.6 : 0.2);
    const aimH = Math.atan2(f.x, f.z), mz = [hx + Math.sin(aimH) * 0.55, hy - 0.3, hz + Math.cos(aimH) * 0.55]; g.particles.burst(mz[0], mz[1], mz[2], 0xffd060, 4, 0.5, 0.15, 0.06); P.flashT = 0.05; this.noise(P.x, P.z, W.rocket ? 90 : 55);
    if (W.rocket) {   // a rocket: a real projectile that bursts on whatever it meets
      const rp = new THREE.Vector3(hx + f.x * 0.9, hy - 0.15 + f.y * 0.9, hz + f.z * 0.9), rv = f.clone().multiplyScalar(42); this.addNade(rp, rv, this.myKey(), true, true);
      if (g.net && g.net.role) g.net.send({ t: 'nade', rocket: true, p: [rp.x, rp.y, rp.z].map((n) => Math.round(n * 100) / 100), v: [rv.x, rv.y, rv.z].map((n) => Math.round(n * 100) / 100), by: this.myKey() });
      return;
    }
    const blind = P.cover && !P.aiming, list = this.targets(this.myKey()), sp = this.spread(P, W) * (blind ? 3.5 : 1) + (blind ? 0.04 : 0), fly = [], hits = new Map();
    if (blind && !P.cover.low) { const C = P.cover, sd = this.coverEnd(P, C.side) ? C.side : this.coverEnd(P, -C.side) ? -C.side : 0; if (sd) o.add(new THREE.Vector3(C.t[0] * sd * 0.9, 0, C.t[1] * sd * 0.9)); }   // blind fire round the corner
    for (let k = 0; k < W.pellets; k++) {
      const d = f.clone(); d.x += (Math.random() - 0.5) * sp * 2; d.y += (Math.random() - 0.5) * sp * 2; d.z += (Math.random() - 0.5) * sp * 2; d.normalize();
      const wall = this.rayWall(o.clone().addScaledVector(d, skip), d, W.range, (P.floorY || 0) - 0.05) + skip, h = this.rayHit(o, d, wall, list), t = h ? h.t : wall;
      const e = o.clone().addScaledVector(d, t); fly.push([e.x, e.y, e.z]);
      if (h) { const cur = hits.get(h.tg) || { dmg: 0, head: false, d, e }; cur.dmg += W.dmg * (h.head ? (W.scope ? 2.5 : 1.8) : 1) * (t > W.range * 0.6 && W.pellets > 1 ? 0.5 : 1); cur.head = cur.head || h.head; hits.set(h.tg, cur); }
      else g.particles.burst(e.x, e.y, e.z, 0xd8d0c0, 3, 0.4, 0.3, 0.05);
    }
    this.tracer(mz, fly); if (g.net && g.net.role) g.net.bang(mz, fly);
    for (const [tg, h] of hits) this.applyHit(tg, h.dmg, h.head, h.d, h.e, this.myKey());
  }
  /** A hit landed (from whoever 'by' is): blood, then damage where the target lives. */
  applyHit(tg, dmg, head, dir, at, by) {
    const g = this.game, P = g.player;
    if (tg.kind === 'sim') {   // townsfolk: hurt, or killed (and then it's the undertakers, a funeral, and a line in the parish register)
      const s = tg.ref; if (!s.knockDown) { if (g.net) g.net.shot(s, dmg); return; }
      this.blood(at.x, at.y, at.z, dir, dmg > 60 || head); if (by === this.myKey()) { P.hitMark = 0.25; P.hitHead = head; Sfx.play('punch'); } if (s.dead) return;
      s.hp = (s.hp ?? 100) - dmg * (head ? 2 : 1);
      const F = g.celebrations && g.celebrations.funerals;
      if (s.hp <= 0 && F && s.kind !== 'raider' && s.kind !== 'guest') {
        const where = g.crime ? g.crime.where(s) : null; F.die(s, { cause: 'shot dead', where });
        if (by === 'sam' && g.crime && !this.on) { if (s.crook) g.messages.push('Police', `Sam shot ${s.name}, one of the villains, dead${where ? ' by ' + where : ''}. There will be an inquiry.`, 'warn'); else { g.crime.wanted = 5; g.messages.push('Police', `Murder! Sam shot ${s.name} dead${where ? ' by ' + where : ''}.`, 'warn'); } }
      } else { s.knockDown(2.5); g.social.say(s, ['Argh!', 'I\'ve been shot!', 'Police! Police!', 'My leg!'][Math.floor(Math.random() * 4)], 2); }
      return;
    }
    this.blood(at.x, at.y, at.z, dir, dmg > 60 || head); if (by === this.myKey()) { P.hitMark = 0.25; P.hitHead = head; Sfx.play('punch'); }
    if (tg.kind === 'bot') this.damageBot(tg.ref, dmg, by, dir, head);
    else if (tg.kind === 'sam') this.hurtPlayer(dmg, { x: at.x - dir.x * 5, z: at.z - dir.z * 5, by, dir: [dir.x, dir.y, dir.z] });
    else if (tg.kind === 'puppet' && g.net) g.net.shot(tg.ref, dmg, { head, dir: [dir.x, dir.y, dir.z] });
  }
  bangSound(W, vol) { Sfx.noise(W.pellets > 1 ? 0.25 : W.scope ? 0.35 : 0.11, { freq: W.scope ? 600 : W.pellets > 1 ? 450 : 1000, vol: 0.4 * vol, type: 'lowpass' }); if (W.scope) Sfx.noise(0.6, { freq: 300, vol: 0.12 * vol, type: 'lowpass', delay: 0.05 }); }
  tracer(from, to) {
    const g = this.game, pts = []; for (const e of to) pts.push(from[0], from[1], from[2], e[0], e[1], e[2]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85 })); g.scene.add(line);
    let t = 0; const fade = () => { t += 16; line.material.opacity = 0.85 * (1 - t / 110); if (t < 110) requestAnimationFrame(fade); else { g.scene.remove(line); geo.dispose(); line.material.dispose(); } }; requestAnimationFrame(fade);
  }
  /** Close-quarters: a rifle-butt in front of you. */
  /** Close quarters, CoD-style: a quick strike where you're looking; it lunges onto anyone within reach and puts them down. */
  melee(P) {
    const g = this.game; if ((P.meleeCD || 0) > g.elapsed) return; P.meleeCD = g.elapsed + 0.65; P.meleeT = 0.35; P.atkT = 0.35; P.atkAnim = 'punch'; Sfx.noise(0.08, { freq: 500, vol: 0.2 });
    const aim = Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw)), fx = Math.sin(aim), fz = Math.cos(aim); let best = null, bd = 2.6;
    for (const tg of this.targets(this.myKey())) { if (tg.kind === 'sim' && this.on) continue; const dx = tg.x - P.x, dz = tg.z - P.z, d = Math.hypot(dx, dz); if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.35 && Math.abs(tg.y - (P.floorY || 0)) < 1.5) { bd = d; best = tg; } }
    if (!best) return;
    const dx = best.x - P.x, dz = best.z - P.z, d = Math.hypot(dx, dz) || 1; if (d > 1.1) P.tryMove(dx / d * (d - 1.0), dz / d * (d - 1.0));   // lunge
    P.heading = Math.atan2(dx, dz); Sfx.play('punch'); P.shake = Math.max(P.shake || 0, 0.4);
    this.applyHit(best, 110, false, new THREE.Vector3(dx / d, 0.15, dz / d), new THREE.Vector3(best.x, best.y + 1.2, best.z), this.myKey());
  }

  // ---------------- being hurt, dying, coming back ----------------
  /** The local player is hit (by a bot, a visitor, or over the network). Regenerates after a few seconds, CoD-style. */
  hurtPlayer(dmg, from = {}) {
    const g = this.game, P = g.player; if (P.dead || P.transit) return; P.hp = (P.hp ?? 100) - dmg; P.lastHit = g.elapsed; P.hitT = 0.25; P.shake = Math.max(P.shake || 0, 0.5); Sfx.noise(0.1, { freq: 200, vol: 0.25, type: 'lowpass' });
    if (from.x !== undefined) { P.hurtFrom = Math.atan2(from.x - P.x, from.z - P.z); P.hurtT = 1.2; }
    if (P.mounted) P.mount(false);
    if (P.hp <= 0) this.playerDies(from.by, from.dir);
  }
  playerDies(by, dir) {
    const g = this.game, P = g.player; this.leaveCover(P); P.dead = true; P.hp = 0; P.down = 4.5; P.vx = P.vz = P.speed = 0; P.aiming = false; P.reloadT = 0;
    const d = dir ? new THREE.Vector3(...dir) : new THREE.Vector3(Math.random() - 0.5, 0.2, Math.random() - 0.5);
    P.deathRag = this.ragdoll(P.rig, d.multiplyScalar(4)); P.mesh.visible = false; this.blood(P.x, (P.floorY || 0) + 1, P.z, d, true, true);
    g.ui.toast(by && by !== this.myKey() ? `💀 ${this.nameOf(by)} got you.` : '💀 You died.', 2500);
    if (this.auth) this.kill(by, this.myKey()); else if (g.net) g.net.send({ t: 'dmkill', by });
  }
  respawnPlayer() {
    const g = this.game, P = g.player, sp = this.spawnPoint([P]); P.dead = false; P.deathRag = null; P.hp = 100; P.down = 0; P.stance = 'stand'; P.teleport(sp.x, sp.z); P.mesh.visible = true; this.loadout(P, null);
  }
  /** Somewhere to come back: near the police station when there is one, else a road a little away from everyone. */
  spawnPoint(avoid = []) {
    const g = this.game, w = g.world, st = armoury(g), P = g.player, ref = st && st.doorOut ? st.doorOut : { x: P.x, z: P.z };
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = st ? 2 + Math.random() * (i < 20 ? 6 : 30) : 25 + Math.random() * 45, x = ref.x + Math.cos(a) * r, z = ref.z + Math.sin(a) * r;
      if (w.collides(x, z, 0.5)) continue; if (avoid.some((q) => q && Math.hypot(q.x - x, q.z - z) < 12) && i < 30) continue; return { x, z };
    }
    return { x: ref.x, z: ref.z };
  }
  /** Score a kill (referee only). */
  kill(by, victim) {
    const g = this.game; this.addFeed(by, victim);
    if (by && by !== victim) { this.score.set(by, (this.score.get(by) || 0) + 1); if (this.score.get(by) >= WIN_KILLS) { const w = `🏆 ${this.nameOf(by)} wins with ${WIN_KILLS} kills! New round...`; g.ui.toast(w, 5000); if (g.net && g.net.role === 'host') g.net.send({ t: 'toast', text: w }); for (const k of this.score.keys()) this.score.set(k, 0); } }
    if (g.net && g.net.role === 'host') g.net.send({ t: 'feed', by, victim, bn: this.nameOf(by), vn: this.nameOf(victim) });
    this.board();
  }
  board() {
    const g = this.game; if (!this.auth) return;
    for (const b of this.bots) if (!this.score.has(b.key)) this.score.set(b.key, 0);
    const table = [...this.score.entries()].map(([k, n]) => [this.nameOf(k), n]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (g.net && g.net.board) g.net.board(table, null); if (g.net && g.net.role === 'host') g.net.send({ t: 'score', table, left: null });
  }
  addFeed(by, victim, bn, vn) {
    const el = document.getElementById('killfeed'); if (!el) return; const me = this.myKey(), nm = (k, n) => n || this.nameOf(k);
    this.feed.push({ t: performance.now(), html: by && by !== victim ? `<span class="${by === me ? 'me' : ''}">${nm(by, bn)}</span> ✕ <span class="${victim === me ? 'me' : ''}">${nm(victim, vn)}</span>` : `<span>${nm(victim, vn)}</span> 💀` });
    if (this.feed.length > 5) this.feed.shift(); el.innerHTML = this.feed.map((f) => `<div>${f.html}</div>`).join('');
  }

  // ---------------- blood ----------------
  blood(x, y, z, dir, big, pool) {
    const g = this.game; g.particles.burst(x + (dir ? dir.x * 0.2 : 0), y, z + (dir ? dir.z * 0.2 : 0), 0x8a0a0a, big ? 14 : 7, big ? 1.4 : 0.8, 1.2, big ? 0.09 : 0.06);
    const n = pool ? 1 : 1 + (Math.random() < 0.5 ? 1 : 0), gy = this.groundAt(x, y, z);
    for (let i = 0; i < n; i++) {
      const s = pool ? 0.2 : 0.18 + Math.random() * 0.3, m = new THREE.Mesh(this.decalGeo, new THREE.MeshBasicMaterial({ color: 0x5a0606, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      const ox = (dir ? dir.x : 0) * (0.4 + Math.random() * 1.2) + (Math.random() - 0.5) * 0.5, oz = (dir ? dir.z : 0) * (0.4 + Math.random() * 1.2) + (Math.random() - 0.5) * 0.5;
      m.position.set(x + (pool ? 0 : ox), gy + 0.03 + this.decals.length * 0.0004, z + (pool ? 0 : oz)); m.scale.setScalar(s); m.renderOrder = 2; g.scene.add(m);
      this.decals.push({ m, t: 40, grow: pool ? 1.1 : 0 }); if (this.decals.length > MAX_DECALS) { const o = this.decals.shift(); g.scene.remove(o.m); o.m.material.dispose(); }
    }
  }
  groundAt(x, y, z) { const P = this.game.player; return Math.abs(P.x - x) < 6 && Math.abs(P.z - z) < 6 ? (P.floorY || 0) : (y > 3 ? Math.floor(y / 3.2) * 3.2 : 0); }

  // ---------------- ragdolls (verlet: eleven points held together by sticks) ----------------
  ragdoll(rig, impulse) {
    const g = this.game, L = rig.look || {}, v = new THREE.Vector3(), wp = (o) => (o ? o.getWorldPosition(v).clone() : null);
    rig.root.updateMatrixWorld(true);
    const pts = [wp(rig.head) || wp(rig.neck), wp(rig.spine), wp(rig.hips), wp(rig.armL.el), wp(rig.armL.hand), wp(rig.armR.el), wp(rig.armR.hand), wp(rig.legL.kn), wp(rig.legL.an), wp(rig.legR.kn), wp(rig.legR.an)];
    if (pts.some((p) => !p)) return null;
    pts[0].y += 0.15; pts[1].y += 0.25;
    const floor = Math.min(...pts.map((p) => p.y)) - 0.08, P = pts.map((p, i) => ({ p, o: p.clone().sub(impulse.clone().multiplyScalar((i < 3 ? 1 : 0.7) / 60)).add(new THREE.Vector3(0, -0.01, 0)) }));
    const S = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2], [3, 5], [7, 9], [1, 7], [1, 9]].map(([a, b]) => [a, b, pts[a].distanceTo(pts[b])]);
    const grp = new THREE.Group(), mk = (c, w, d) => { const m = new THREE.Mesh(this.unitBox, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); m.userData.w = w; m.userData.d = d; m.castShadow = true; grp.add(m); return m; };
    const shirt = L.shirt ?? 0x3f8f5a, pants = L.pants ?? 0x333a48, skin = L.skin ?? 0xe0b48f;
    const bones = [[0, 0, mk(skin, 0.28, 0.28), true], [1, 2, mk(shirt, 0.44, 0.26)], [1, 3, mk(L.longSleeve === false ? skin : shirt, 0.13, 0.13)], [3, 4, mk(skin, 0.11, 0.11)], [1, 5, mk(L.longSleeve === false ? skin : shirt, 0.13, 0.13)], [5, 6, mk(skin, 0.11, 0.11)], [2, 7, mk(pants, 0.17, 0.19)], [7, 8, mk(pants, 0.15, 0.17)], [2, 9, mk(pants, 0.17, 0.19)], [9, 10, mk(pants, 0.15, 0.17)]];
    const hair = mk(L.hair ?? 0x3b2a1a, 0.3, 0.3);
    g.scene.add(grp); const r = { P, S, bones, hair, grp, floor, t: 14, settle: 0 };
    this.rags.push(r); if (this.rags.length > MAX_RAGS) this.dropRag(this.rags.shift());
    this.drawRag(r); return r;
  }
  dropRag(r) { this.game.scene.remove(r.grp); r.grp.traverse((o) => { if (o.material) o.material.dispose(); }); }
  stepRag(r, dt) {
    const w = this.game.world, h = 1 / 60; r.acc = (r.acc || 0) + Math.min(dt, 0.05);
    while (r.acc >= h) {
      r.acc -= h;
      for (const q of r.P) { const p = q.p, vx = (p.x - q.o.x) * 0.99, vy = (p.y - q.o.y) * 0.99, vz = (p.z - q.o.z) * 0.99; q.o.copy(p); p.x += vx; p.y += vy - 18 * h * h; p.z += vz;
        if (p.y < r.floor + 0.06) { p.y = r.floor + 0.06; q.o.x = p.x - vx * 0.6; q.o.z = p.z - vz * 0.6; q.o.y = p.y + vy * 0.2; }   // the floor: rough, so they don't skate
        if (w.collides(p.x, p.z, 0.05, true, p.y)) { p.x = q.o.x; p.z = q.o.z; } }
      for (let it = 0; it < 6; it++) for (const [a, b, L] of r.S) { const A = r.P[a].p, B = r.P[b].p, dx = B.x - A.x, dy = B.y - A.y, dz = B.z - A.z, d = Math.hypot(dx, dy, dz) || 1e-6, k = (d - L) / d * 0.5; A.x += dx * k; A.y += dy * k; A.z += dz * k; B.x -= dx * k; B.y -= dy * k; B.z -= dz * k; }
    }
  }
  drawRag(r) {
    const up = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
    for (const [a, b, m, ball] of r.bones) {
      const A = r.P[a].p, B = r.P[b].p;
      if (ball) { m.position.copy(A); m.scale.set(m.userData.w, m.userData.w, m.userData.d); const n = r.P[1].p; dv.subVectors(A, n).normalize(); m.quaternion.setFromUnitVectors(up, dv); continue; }
      dv.subVectors(B, A); const len = dv.length() || 0.01; m.position.addVectors(A, B).multiplyScalar(0.5); m.scale.set(m.userData.w, len + 0.04, m.userData.d); m.quaternion.setFromUnitVectors(up, dv.multiplyScalar(1 / len));
    }
    const hd = r.bones[0][2]; r.hair.position.copy(hd.position).add(dv.set(0, 0.16, 0).applyQuaternion(hd.quaternion)); r.hair.quaternion.copy(hd.quaternion); r.hair.scale.set(0.3, 0.08, 0.3);
  }

  // ---------------- grenades ----------------
  /** Where a grenade leaves the hand and how fast. */
  launch(P) {
    const cam = this.game.camera, f = new THREE.Vector3(); cam.getWorldDirection(f); const [hx, hy, hz] = P.headPos(), aim = Math.atan2(f.x, f.z);
    return { p: new THREE.Vector3(hx + Math.sin(aim) * 0.4, hy - 0.1, hz + Math.cos(aim) * 0.4), v: f.multiplyScalar(15).add(new THREE.Vector3((P.vx || 0) * 0.5, 4.5, (P.vz || 0) * 0.5)) };
  }
  /** Holding the grenade: the dotted path it will take and a ring where it ends up. */
  drawArc(P) {
    const g = this.game;
    if (!this.arc) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 120), 3)); this.arc = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xfff2a0, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.9, depthTest: false })); this.arc.frustumCulled = false; this.arc.renderOrder = 10; this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: 0xff5030, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide })); this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 10; }
    if (!P) { g.scene.remove(this.arc); g.scene.remove(this.ring); return; }
    if (!this.arc.parent) { g.scene.add(this.arc); g.scene.add(this.ring); }
    const { p, v } = this.launch(P), n = { p, v, t: NADE_FUSE, floor: this.groundAt(p.x, p.y - 1.4, p.z), sim: true }, a = this.arc.geometry.attributes.position; let k = 0;
    for (; k < 120 && n.t > 0; k++) { a.setXYZ(k, n.p.x, n.p.y, n.p.z); for (let s2 = 0; s2 < 2; s2++) this.stepNade(n, 1 / 60); }
    a.needsUpdate = true; this.arc.geometry.setDrawRange(0, k); this.arc.computeLineDistances(); this.ring.position.set(n.p.x, n.floor + 0.05, n.p.z); this.ring.scale.setScalar(NADE_R / 2.2);
  }
  throwNade(P) {
    const g = this.game, { p, v } = this.launch(P);
    P.atkT = 0.4; P.atkAnim = 'point'; this.addNade(p, v, this.myKey(), true);
    if (g.net && g.net.role) g.net.send({ t: 'nade', p: [p.x, p.y, p.z].map((n) => Math.round(n * 100) / 100), v: [v.x, v.y, v.z].map((n) => Math.round(n * 100) / 100), by: this.myKey() });
  }
  addNade(p, v, by, live, rocket) {
    const m = rocket ? this.rocketMesh() : new THREE.Mesh(this.nadeGeo, this.nadeMat); m.castShadow = true; m.position.copy(p); this.game.scene.add(m);
    this.nades.push({ p: p.clone(), v: v.clone(), t: rocket ? 5 : NADE_FUSE, by, live, mesh: m, rocket, floor: this.groundAt(p.x, p.y - 1.4, p.z) });
  }
  rocketMesh() { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x5a6a4a })), t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a3a })); b.rotation.x = Math.PI / 2; t.rotation.x = Math.PI / 2; t.position.z = 0.33; g.add(b, t); return g; }
  stepNade(n, dt) {
    const w = this.game.world;
    if (n.rocket) {   // straight and fast, a smoke trail, bursts on walls, the ground or anyone it passes close to
      n.t -= dt; n.v.y -= 1.5 * dt; n.p.addScaledVector(n.v, dt); n.mesh.position.copy(n.p); n.mesh.lookAt(n.p.x + n.v.x, n.p.y + n.v.y, n.p.z + n.v.z);
      this.game.particles.burst(n.p.x, n.p.y, n.p.z, 0xb0b0b0, 2, 0.2, 0.6, 0.12);
      let hit = n.p.y < n.floor + 0.05 || w.collides(n.p.x, n.p.z, 0.08, true, n.p.y);
      if (!hit && n.live) for (const tg of this.targets(n.by)) { const dy = n.p.y - tg.y; if (dy > -0.2 && dy < tg.top + 0.2 && Math.hypot(tg.x - n.p.x, tg.z - n.p.z) < tg.r + 0.25) { hit = true; break; } }
      if (hit || n.t <= 0) { n.t = 0; this.explode(n, 1.25); }
      return;
    }
    n.t -= dt; n.v.y -= 20 * dt; const nx = n.p.x + n.v.x * dt, nz = n.p.z + n.v.z * dt;
    if (w.collides(nx, nz, 0.1, true, n.p.y)) { if (w.collides(nx, n.p.z, 0.1, true, n.p.y)) n.v.x *= -0.4; else n.v.z *= -0.4; if (w.collides(n.p.x, nz, 0.1, true, n.p.y)) n.v.z *= -0.4; if (!n.sim) Sfx.noise(0.03, { freq: 1500, vol: 0.05 }); }
    else { n.p.x = nx; n.p.z = nz; }
    n.p.y += n.v.y * dt; if (n.p.y < n.floor + 0.09) { n.p.y = n.floor + 0.09; if (n.v.y < -2 && !n.sim) Sfx.noise(0.03, { freq: 1200, vol: 0.05 }); n.v.y *= -0.35; n.v.x *= 0.6; n.v.z *= 0.6; }
    if (n.sim) return;
    n.mesh.position.copy(n.p); n.mesh.rotation.x += dt * 8;
    if (n.t <= 0) this.explode(n);
  }
  /** A proper bang: a fireball, a flash of light, a shockwave across the ground, smoke, dirt and debris, and a boom you feel. */
  boom(p, floor, k = 1) {
    const g = this.game, P = g.player, R = NADE_R * k;
    const fire = new THREE.Mesh(this.fxSphere || (this.fxSphere = new THREE.SphereGeometry(1, 14, 10)), new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 1, depthWrite: false })); fire.position.set(p.x, p.y + 0.4, p.z); g.scene.add(fire);
    const core = new THREE.Mesh(this.fxSphere, new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 1, depthWrite: false })); core.position.copy(fire.position); g.scene.add(core);
    const ring = new THREE.Mesh(this.fxRing || (this.fxRing = new THREE.RingGeometry(0.8, 1, 32)), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, floor + 0.08, p.z); g.scene.add(ring);
    const light = new THREE.PointLight(0xffa040, 90 * k, 30 * k, 2); light.position.set(p.x, p.y + 1.5, p.z); g.scene.add(light);
    const smoke = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(this.fxSphere, new THREE.MeshLambertMaterial({ color: 0x4a4644, transparent: true, opacity: 0.75, depthWrite: false })); m.position.set(p.x + (Math.random() - 0.5) * 2 * k, p.y + 0.5, p.z + (Math.random() - 0.5) * 2 * k); m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 2); m.scale.setScalar(0.6 * k); g.scene.add(m); smoke.push(m); }
    this.fx.push({ t: 0, dur: 3.2, k, fire, core, ring, light, smoke, R });
    g.particles.burst(p.x, p.y + 0.3, p.z, 0xffa020, 40, 4 * k, 6, 0.25); g.particles.burst(p.x, p.y + 0.3, p.z, 0xff5010, 25, 3 * k, 4, 0.2); g.particles.burst(p.x, p.y, p.z, 0x5a4a30, 30, 3.5 * k, 8, 0.12); g.particles.burst(p.x, p.y, p.z, 0x222222, 16, 2.5 * k, 9, 0.08);
    const dP = Math.hypot(P.x - p.x, P.z - p.z), near = Math.max(0, 1 - dP / 80);
    Sfx.noise(1.6, { freq: 90, q: 0.7, vol: 0.25 + 0.6 * near, type: 'lowpass' }); Sfx.noise(0.5, { freq: 250, vol: 0.2 + 0.4 * near, type: 'lowpass' }); Sfx.noise(0.2, { freq: 2500, vol: 0.15 * near }); Sfx.noise(2.5, { freq: 60, vol: 0.2 * near, type: 'lowpass', delay: 0.15 });
    P.shake = Math.max(P.shake || 0, Math.max(0, 2.6 * k - dP / 14)); if (dP < R * 2.5) { const fl = document.getElementById('flash'); if (fl) { fl.style.transition = 'none'; fl.style.opacity = Math.min(0.8, 1 - dP / (R * 2.5)).toFixed(2); requestAnimationFrame(() => { fl.style.transition = 'opacity .6s'; fl.style.opacity = 0; }); } }
  }
  stepFx(f, dt) {
    const g = this.game; f.t += dt; const u = f.t;
    const s = Math.min(1, u / 0.18), sc = f.R * 0.55 * (0.3 + 0.7 * s); f.fire.scale.setScalar(sc); f.fire.material.opacity = Math.max(0, 1 - u / 0.55); f.fire.material.color.setHSL(0.09 - Math.min(0.08, u * 0.15), 1, Math.max(0.2, 0.6 - u * 0.6));
    f.core.scale.setScalar(sc * 0.55); f.core.material.opacity = Math.max(0, 1 - u / 0.2);
    f.ring.scale.setScalar(0.5 + f.R * 2 * Math.min(1, u / 0.35)); f.ring.material.opacity = Math.max(0, 0.7 * (1 - u / 0.4));
    f.light.intensity = Math.max(0, 90 * f.k * (1 - u / 0.3));
    for (const m of f.smoke) { m.position.addScaledVector(m.userData.v, dt); m.userData.v.multiplyScalar(1 - dt * 0.8); m.scale.multiplyScalar(1 + dt * 0.7); m.material.opacity = Math.max(0, 0.75 * (1 - u / f.dur)); }
    if (u >= f.dur) { for (const m of [f.fire, f.core, f.ring, f.light, ...f.smoke]) { g.scene.remove(m); if (m.material) m.material.dispose(); } return true; }
    return false;
  }
  explode(n, k = 1) {
    const g = this.game, P = g.player, p = n.p, R = NADE_R * k; g.scene.remove(n.mesh); this.boom(p, n.floor, k); this.noise(p.x, p.z, 100);
    const dP = Math.hypot(P.x - p.x, P.z - p.z);
    { const m = new THREE.Mesh(this.decalGeo, new THREE.MeshBasicMaterial({ color: 0x1a1612, transparent: true, opacity: 0.7, depthWrite: false })); m.position.set(p.x, n.floor + 0.025, p.z); m.scale.setScalar(2.4 * k); g.scene.add(m); this.decals.push({ m, t: 30 }); }
    for (const r of this.rags) for (const q of r.P) { const d = q.p.distanceTo(p); if (d < R) { const k = (1 - d / R) * 0.16; q.o.x -= (q.p.x - p.x) / (d || 1) * k; q.o.z -= (q.p.z - p.z) / (d || 1) * k; q.o.y -= k * 1.2; } }
    if (!n.live) return;   // someone else's grenade: they work out the damage
    const blocked = (x, z) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); for (let t = 0.5; t < d; t += 0.5) if (g.world.collides(p.x + dx / d * t, p.z + dz / d * t, 0.05, true, p.y + 0.5)) return true; return false; };
    for (const tg of this.targets(null)) { const d = Math.hypot(tg.x - p.x, tg.z - p.z); if (d > R || Math.abs(tg.y - p.y) > 2.5 || blocked(tg.x, tg.z)) continue; const dmg = (n.rocket ? 230 : 170) * (1 - d / R) + 15, dir = new THREE.Vector3(tg.x - p.x, 0.6, tg.z - p.z).normalize(); this.applyHit(tg, dmg, false, dir, new THREE.Vector3(tg.x, tg.y + 1, tg.z), n.by); }
    if (!P.dead && dP < R && Math.abs((P.floorY || 0) - p.y) < 2.5 && !blocked(P.x, P.z)) this.hurtPlayer((n.rocket ? 230 : 170) * (1 - dP / R) + 15, { x: p.x, z: p.z, by: n.by, dir: [P.x - p.x, 0.6, P.z - p.z] });
  }

  // ---------------- bots ----------------
  setBots(n) {
    const g = this.game; while (this.bots.length > n) { const b = this.bots.pop(); g.scene.remove(b.rig.root); this.score.delete(b.key); }
    while (this.bots.length < n) {
      const i = this.bots.length + 1, c = SHELL[(i * 3) % SHELL.length], rig = createRig({ shirt: c, pants: SHELL[(i * 5 + 2) % SHELL.length], longSleeve: true, hat: i % 3 ? { type: 'cap', color: c } : null, skin: [0xe0b48f, 0xc8946a, 0x8a5a3a, 0xf0c8a0][i % 4], hair: [0x3b2a1a, 0x8a6a3a, 0x1a1a1a][i % 3] });
      const b = { key: 'b' + i, name: BOT_NAMES[(i - 1) % BOT_NAMES.length], rig, anim: new Animator(rig, { trait: 'cheerful' }), x: 0, z: 0, y: 0, h: 0, alive: false, respawnT: 0.2 + i * 0.3, stance: 'stand' };
      g.scene.add(rig.root); rig.root.visible = false; this.bots.push(b); this.names.set(b.key, b.name); this.score.set(b.key, this.score.get(b.key) || 0);
    }
    this.board();
  }
  spawnBot(b) {
    const g = this.game, sp = this.spawnFar(); b.x = sp.x; b.z = sp.z; b.y = 0; b.hp = 100; b.alive = true; b.gun = PRIMARIES[Math.floor(Math.random() * PRIMARIES.length)]; b.mag = WEAPONS[b.gun].mag; b.stance = 'stand';
    b.target = null; b.seen = 0; b.react = 0; b.cd = 0; b.burst = 0; b.goal = null; b.path = null; b.thinkT = 0; b.strafe = Math.random() < 0.5 ? 1 : -1; b.nades = 1; b.cover = null; b.inCover = false; b.peeking = false; b.rig.root.visible = true; b.rag = null; b.vx = b.vz = 0;
  }
  /** Bots come in from the edge of the action: on a road 35-80 m from the player, out of sight if possible. */
  spawnFar() {
    const g = this.game, w = g.world, P = g.player;
    for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2, r = 35 + Math.random() * 45, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r, [tx, tz] = w.tileOf(x, z); if (!w.inBounds(tx, tz) || (i < 40 && !w.road[w.idx(tx, tz)]) || w.collides(x, z, 0.5)) continue; return { x, z }; }
    return this.spawnPoint([P]);
  }
  /** Who a bot could fight: the player, visitors, the other bots. */
  foes(b) {
    const g = this.game, P = g.player, out = [];
    if (!P.dead && !g.netVisitor && g.mode === 'sim') out.push({ key: 'sam', x: P.x, z: P.z, y: P.floorY || 0, top: STANCE_TOP[P.stance || 'stand'], kind: 'sam', ref: P, moving: P.speed > 1 });
    if (g.net && g.net.role === 'host') for (const v of g.net.visitors.values()) if (v.a !== 4 && v.a !== 6 && v.x !== undefined) out.push({ key: 'v' + v.id, x: v.x, z: v.z, y: v.y || 0, top: (v.f & 8) ? 0.5 : (v.f & 4) ? 1.2 : 1.8, kind: 'visitor', ref: v, moving: v.a === 1 || v.a === 2 });
    for (const o of this.bots) if (o !== b && o.alive) out.push({ key: o.key, x: o.x, z: o.z, y: o.y, top: STANCE_TOP[o.stance], kind: 'bot', ref: o, moving: Math.hypot(o.vx || 0, o.vz || 0) > 1 });
    return out;
  }
  /** A loud noise (a gunshot, an explosion) at x, z: bots within earshot learn roughly where it came from. */
  noise(x, z, r) { const now = performance.now(); for (const b of this.bots) if (b.alive && !b.target) { const d = Math.hypot(b.x - x, b.z - z); if (d < r && d > 2) b.heard = { x: x + (Math.random() - 0.5) * d * 0.25, z: z + (Math.random() - 0.5) * d * 0.25, t: now }; } }
  sees(b, f) { const o = { x: b.x, y: b.y + (b.stance === 'prone' ? 0.4 : b.stance === 'crouch' ? 1.05 : 1.6), z: b.z }, dx = f.x - o.x, dy = f.y + f.top - 0.3 - o.y, dz = f.z - o.z, d = Math.hypot(dx, dy, dz); return this.rayWall(o, { x: dx / d, y: dy / d, z: dz / d }, d, -0.5) >= d - 0.3; }
  updateBot(b, dt) {
    const g = this.game, w = g.world, W = WEAPONS[b.gun];
    if (!b.alive) { if ((b.respawnT -= dt) <= 0) this.spawnBot(b); return; }
    // look around twice a second. A bot only knows what it can see (in front of it, in the open, not too far; crouching
    // and lying down make you harder to spot), what it hears (gunshots and explosions, roughly where) and who just shot it.
    if ((b.thinkT -= dt) <= 0) {
      b.thinkT = 0.45 + Math.random() * 0.25;
      const fs = this.foes(b).map((f) => [f, Math.hypot(f.x - b.x, f.z - b.z)]).filter((q) => q[1] < 85).sort((a, c) => a[1] - c[1]).slice(0, 4);
      let pick = null;
      for (const [f, d] of fs) {
        const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(f.x - b.x, f.z - b.z) - b.h), Math.cos(Math.atan2(f.x - b.x, f.z - b.z) - b.h)));
        const range = (f.top < 0.8 ? 28 : f.top < 1.5 ? 48 : 75) * (f.moving ? 1 : 0.8), cone = b.target && b.target.key === f.key ? 1.6 : 1.0;   // about 115° of vision; wider for someone it's already fighting
        if (d < 3.5 || (ang < cone && d < range)) { if (this.sees(b, f)) { pick = f; b.dist = d; break; } }
      }
      if (pick) {
        if (!b.target || b.target.key !== pick.key) { b.react = 0.55 + Math.random() * 0.6 + (pick.top < 1.5 ? 0.3 : 0) + b.dist / 90; b.burst = 0; b.aimT = 0; }
        b.target = pick; b.last = { x: pick.x, z: pick.z }; b.lostT = 0;
      } else {
        if (b.target) { b.last = { x: b.target.x, z: b.target.z }; b.lostT = 0; }   // lost sight: go and look where they were
        b.target = null; b.lostT = (b.lostT || 0) + 0.5; if (b.lostT > 9) b.last = null;
        if (!b.last && b.heard && performance.now() - b.heard.t < 8000) { b.last = { x: b.heard.x, z: b.heard.z }; b.heard = null; }
      }
      // where to go: the last place it saw or heard someone, else a wander round the streets
      if (!b.target && !b.last && (!b.wander || Math.hypot(b.wander.x - b.x, b.wander.z - b.z) < 4 || Math.random() < 0.02)) { const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 40; b.wander = { x: b.x + Math.cos(a) * r, z: b.z + Math.sin(a) * r }; }
      const tgt = b.target ? null : b.last || b.wander;
      if (tgt && (!b.path || !b.pathTo || Math.hypot(b.pathTo.x - tgt.x, b.pathTo.z - tgt.z) > 8)) { const [sx, sz] = w.tileOf(b.x, b.z), [ex, ez] = w.tileOf(tgt.x, tgt.z), p = w.findPath(sx, sz, ex, ez); b.path = p ? p.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })) : null; if (b.path) { b.path.shift(); b.path.push({ x: tgt.x, z: tgt.z }); } b.pathTo = tgt; }
      if (b.target && Math.random() < 0.25) b.strafe *= -1;
      if (b.target && !b.cover && b.dist > 9 && Math.random() < 0.35) { b.cover = this.botCoverSpot(b, b.target); b.peekT = 0; }   // find something low to get behind
      if (b.cover && ((b.lostT || 0) > 6 || Math.random() < 0.03 || this.flanked(b))) { b.cover = null; b.inCover = false; }
      if (b.target && !b.cover && b.stance === 'stand' && (b.gun === 'sniper' || b.gun === 'lmg') && b.dist > 25 && Math.random() < 0.4) b.stance = Math.random() < 0.5 ? 'crouch' : 'prone';
      if (!b.target && b.stance !== 'stand') b.stance = 'stand';
      if (b.target && b.nades > 0 && b.dist > 9 && b.dist < 22 && Math.random() < 0.06) { b.nades--; const f = b.target, dx = f.x - b.x + (Math.random() - 0.5) * 4, dz = f.z - b.z + (Math.random() - 0.5) * 4, d = Math.hypot(dx, dz), tt = d / 13; this.addNade(new THREE.Vector3(b.x, b.y + 1.6, b.z), new THREE.Vector3(dx / tt, 20 * tt / 2 - 0.3, dz / tt), b.key, true); }
    }
    if (b.target) { b.target.x = b.target.ref.x; b.target.z = b.target.ref.z; b.aimT = (b.aimT || 0) + dt; b.lastFoe = { x: b.target.x, z: b.target.z }; }
    if (b.last && Math.hypot(b.last.x - b.x, b.last.z - b.z) < 3) { b.last = null; b.h += Math.PI * (Math.random() < 0.5 ? 0.6 : -0.6); }   // got there: look about
    // move
    let mx = 0, mz = 0, sp = 0;
    if (b.cover) {   // behind cover: duck (or stand behind a wall), then pop up / step out to shoot, then back again
      const C2 = b.cover, out = b.inCover && b.peeking && C2.px !== undefined, gx = out ? C2.px : C2.x, gz = out ? C2.pz : C2.z, dx = gx - b.x, dz = gz - b.z, d = Math.hypot(dx, dz);
      if (d > 0.35) { mx = dx / d; mz = dz / d; sp = b.inCover ? 3.2 : 4.2; } else if (!b.inCover) b.inCover = true;
      if (b.inCover) { if ((b.peekT -= dt) <= 0) { b.peeking = !b.peeking; b.peekT = b.peeking ? 1.3 + Math.random() * 1.4 : 1.0 + Math.random() * 2.2; } b.stance = C2.px !== undefined || b.peeking ? 'stand' : 'crouch'; }
      const f = b.target || b.lastFoe; if (f) b.h = Math.atan2(f.x - b.x, f.z - b.z);
    } else if (b.target) {
      const dx = b.target.x - b.x, dz = b.target.z - b.z, d = Math.hypot(dx, dz) || 1, want = W.range * (b.gun === 'shotgun' ? 0.45 : 0.55);
      const adv = d > want ? 1 : d < want * 0.4 ? -0.6 : 0; mx = dx / d * adv - dz / d * b.strafe * 0.8; mz = dz / d * adv + dx / d * b.strafe * 0.8; sp = b.stance === 'prone' ? 0 : b.stance === 'crouch' ? 1.6 : adv > 0 ? 3.6 : 2.4;
      b.h = Math.atan2(dx, dz);
    } else if (b.path && b.path.length) { const q = b.path[0], dx = q.x - b.x, dz = q.z - b.z, d = Math.hypot(dx, dz); if (d < 2.5) b.path.shift(); else { mx = dx / d; mz = dz / d; sp = 4.4; } }
    else if (b.last) { const dx = b.last.x - b.x, dz = b.last.z - b.z, d = Math.hypot(dx, dz) || 1; mx = dx / d; mz = dz / d; sp = 4.4; }
    const ml = Math.hypot(mx, mz); let moved = 0;
    if (ml > 0.01 && sp > 0) {
      mx /= ml; mz /= ml; const step = sp * (W.slow || 1) * dt;
      for (const a of [0, 0.6, -0.6, 1.2, -1.2, 2.2, -2.2]) { const c = Math.cos(a), s = Math.sin(a), ux = mx * c - mz * s, uz = mx * s + mz * c, nx = b.x + ux * step, nz = b.z + uz * step; if (!w.collides(nx, nz, 0.32)) { b.x = nx; b.z = nz; moved = step; b.vx = ux * sp; b.vz = uz * sp; if (!b.target) b.h = Math.atan2(ux, uz); break; } }
      if (!moved) { b.vx = b.vz = 0; if (b.path && b.path.length) b.path.shift(); b.strafe *= -1; }
    } else { b.vx = b.vz = 0; }
    // shoot
    b.cd -= dt; if (b.react > 0) b.react -= dt;
    if (b.target && b.react <= 0 && b.cd <= 0 && b.dist < W.range && !(b.inCover && !b.peeking)) {
      if (b.mag <= 0) { b.mag = W.mag; b.cd = W.reload; }
      else {
        b.mag--; b.cd = W.cd * (W.auto ? 1.4 : 1.6) + (W.auto && ++b.burst % 5 === 0 ? 0.5 + Math.random() * 0.6 : 0);
        const f = b.target, d = b.dist, cov = f.kind === 'sam' && g.player.cover ? (g.player.cover.exposed ? 0.75 : 0.06) : 1, hitP = cov * Math.max(0.04, Math.min(0.6, W.bot + 0.1 - d / (W.range * 1.2) - (f.moving ? 0.15 : 0) - (f.top < 1.5 ? 0.1 : 0) - (f.top < 0.8 ? 0.12 : 0) + (b.stance !== 'stand' ? 0.06 : 0) - Math.max(0, 0.25 - (b.aimT || 0) * 0.12)));   // first shots go wide; they settle in
        const o = [b.x + Math.sin(b.h) * 0.5, b.y + (b.stance === 'prone' ? 0.35 : b.stance === 'crouch' ? 0.95 : 1.35), b.z + Math.cos(b.h) * 0.5], fly = [], dmg = { v: 0 };
        for (let k = 0; k < W.pellets; k++) { const hit = Math.random() < hitP, ex = f.x + (hit ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 3), ey = f.y + (hit ? f.top * (0.45 + Math.random() * 0.45) : Math.random() * 2.5), ez = f.z + (hit ? (Math.random() - 0.5) * 0.3 : (Math.random() - 0.5) * 3); fly.push([ex, ey, ez]); if (hit) dmg.v += W.dmg * 0.75 * (W.pellets > 1 && d > W.range * 0.6 ? 0.5 : 1); }
        this.tracer(o, fly); this.noise(b.x, b.z, 50); const dP = Math.hypot(g.player.x - b.x, g.player.z - b.z); if (dP < 120) this.bangSound(W, Math.max(0.08, 1 - dP / 120)); if (g.net && g.net.role === 'host') g.net.send({ t: 'bang', f: o.map((n) => Math.round(n * 100) / 100), e: fly.map((q) => q.map((n) => Math.round(n * 100) / 100)), by: b.key });
        if (dmg.v > 0) {
          const dir = new THREE.Vector3(f.x - b.x, 0.1, f.z - b.z).normalize(), at = new THREE.Vector3(f.x, f.y + f.top * 0.7, f.z);
          if (f.kind === 'sam') { this.blood(at.x, at.y, at.z, dir, false); this.hurtPlayer(dmg.v, { x: b.x, z: b.z, by: b.key, dir: [dir.x, dir.y, dir.z] }); }
          else if (f.kind === 'bot') this.applyHit({ kind: 'bot', ref: f.ref }, dmg.v, false, dir, at, b.key);
          else if (f.kind === 'visitor' && g.net) g.net.send({ t: 'hurt', to: f.ref.id, dmg: dmg.v, x: b.x, z: b.z, by: b.key, dir: [dir.x, dir.y, dir.z] });
        }
      }
    }
    // look
    b.y = 0; const r = b.rig.root; r.position.set(b.x, b.y, b.z); r.rotation.y = b.h;
    const hs = Math.sin(b.h), hc = Math.cos(b.h), spd = Math.hypot(b.vx, b.vz), fwd = spd > 0.1 ? (b.vx * hs + b.vz * hc) / spd : 1, side = spd > 0.1 ? (b.vx * hc - b.vz * hs) / spd : 0;
    b.anim.update(dt, { lower: b.stance === 'prone' ? 'prone' : moved ? 'walk' : 'stand', upper: b.target || b.stance === 'prone' ? 'aim' : 'idle', dist: moved, speed: spd, run: spd > 3.2, step: 0.38 + 0.21 * spd, fwd, side, crouch: b.stance === 'crouch' ? 1 : 0, gunProp: 'rifle', lookYaw: 0, lookPitch: 0 });
  }
  damageBot(b, dmg, by, dir, head) {
    if (!b.alive) return; b.hp -= dmg; b.react = Math.min(b.react, 0.15);
    if (by && by !== b.key && !b.target) { const f = this.foes(b).find((q) => q.key === by); if (f) { b.h = Math.atan2(f.x - b.x, f.z - b.z) + (Math.random() - 0.5) * 0.8; b.last = { x: f.x + (Math.random() - 0.5) * 8, z: f.z + (Math.random() - 0.5) * 8 }; b.thinkT = 0.15; } }   // shot: spin round towards where it came from
    if (b.hp > 0) return;
    b.alive = false; b.respawnT = 5 + Math.random() * 3; b.rig.root.visible = false; b.rag = this.ragdoll(b.rig, (dir ? dir.clone() : new THREE.Vector3(0, 0.2, 1)).multiplyScalar(head ? 5 : 3.5)); this.blood(b.x, 0.5, b.z, dir, true, true);
    this.kill(by, b.key);
  }
  /** A visitor's shot at a bot (host side). */
  botHit(key, dmg, by, dir, head) { const b = this.bots.find((q) => q.key === key); if (b) { this.blood(b.x, b.y + 1.2, b.z, dir ? new THREE.Vector3(...dir) : null, head); this.damageBot(b, dmg, by, dir ? new THREE.Vector3(...dir) : null, head); } }

  // ---------------- cover, GTA style ----------------
  /** Something solid at (x, z) at height y above this floor? */
  solid(x, z, y) { return this.game.world.collides(x, z, 0.1, true, y); }
  /** The nearest thing to hide behind within reach of (x, z): its face (an axis-aligned normal pointing out at you), how high it is. */
  findCover(x, z, fy, aim) {
    const w = this.game.world, [tx, tz] = w.tileOf(x, z); let best = null;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      if (!w.inBounds(tx + ox, tz + oz)) continue; const a = w.colBuckets.get(w.idx(tx + ox, tz + oz)); if (!a) continue;
      for (const c of a) {
        if (c.navOnly || (c.lo !== undefined && (fy < c.lo - 0.2 || fy > c.h)) || (c.h !== undefined && c.h - fy < 0.8 && c.lo === undefined)) continue;   // too low to hide behind
        const px = Math.max(c.minx, Math.min(x, c.maxx)), pz = Math.max(c.minz, Math.min(z, c.maxz)), d = Math.hypot(x - px, z - pz); if (d < 0.02 || d > 1.8) continue;
        const n = Math.abs(x - px) > Math.abs(z - pz) ? [Math.sign(x - px), 0] : [0, Math.sign(z - pz)], face = aim === undefined ? 0 : -(n[0] * Math.sin(aim) + n[1] * Math.cos(aim)), sc = d - face * 0.7;
        if (!best || sc < best.sc) best = { sc, px, pz, n, h: c.h === undefined || c.lo !== undefined ? 9 : c.h - fy };
      }
    }
    return best;
  }
  takeCover(P) {
    const aim = Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw)), cv = this.findCover(P.x, P.z, P.floorY || 0, aim); if (!cv) return;
    const t = [-cv.n[1], cv.n[0]], side = (Math.sin(aim) * t[0] + Math.cos(aim) * t[1]) >= 0 ? 1 : -1;
    P.cover = { n: cv.n, t, low: cv.h < 1.45, side, peek: 0, peekSide: 0, exposed: false, snap: { x: cv.px + cv.n[0] * 0.42, z: cv.pz + cv.n[1] * 0.42 } };
    P.coverFace = Math.atan2(t[0] * side, t[1] * side); P.coverWasThird = P.third; P.third = true; P.stance = P.cover.low ? 'crouch' : 'stand'; P.vx = P.vz = 0; P.slideT = 0;
    Sfx.noise(0.12, { freq: 220, vol: 0.14, type: 'lowpass' });
  }
  leaveCover(P) { if (!P.cover) return; P.cover = null; P.shoulder = 1; if (P.coverWasThird !== undefined) P.third = P.coverWasThird; P.coverWasThird = undefined; if (P.stance === 'crouch') P.stance = 'stand'; }
  /** Does the cover run out a step to this side? */
  coverEnd(P, side) { const C = P.cover; if (!C) return false; const fy = P.floorY || 0, qx = P.x + C.t[0] * side * 0.4 - C.n[0] * 0.7, qz = P.z + C.t[1] * side * 0.4 - C.n[1] * 0.7; return !this.solid(qx, qz, fy + 0.5); }
  /** Moving while in cover: along it only; pushing away from it for a moment leaves it; no going past the end. */
  coverMove(P, wx, wz, dt) {
    const C = P.cover, n = C.n, t = C.t, away = wx * n[0] + wz * n[1], m = wx * t[0] + wz * t[1];
    if (away > 0.7 && Math.abs(m) < 0.6) { P.coverAway = (P.coverAway || 0) + dt; if (P.coverAway > 0.3) { this.leaveCover(P); return { x: wx, z: wz, speed: 3 }; } } else P.coverAway = 0;
    if (C.snap || P.aiming || Math.abs(m) < 0.3) return { x: 0, z: 0, speed: 0 };
    const side = Math.sign(m); C.side = side; P.coverFace = Math.atan2(t[0] * side, t[1] * side);
    if (this.coverEnd(P, side)) return { x: 0, z: 0, speed: 0 };   // the edge: stop here (aim to peek round it)
    return { x: t[0] * side, z: t[1] * side, speed: C.low ? 2.4 : 2.8 };
  }
  /** Every frame in cover: slide in, keep the stance, pop up over low cover or lean out round the edge of high cover when aiming. */
  coverTick(P, dt) {
    const g = this.game, C = P.cover, hint = document.getElementById('cbcover');
    if (!C) { if ((this.coverScan = (this.coverScan || 0) - dt) <= 0) { this.coverScan = 0.2; this.coverNear = !P.mounted && !!this.findCover(P.x, P.z, P.floorY || 0); } if (hint) hint.textContent = this.coverNear ? 'Q / ○  take cover' : ''; return; }
    if (P.dead || P.mounted || !this.on) { this.leaveCover(P); return; }
    const fy = P.floorY || 0;
    if (C.snap) { const dx = C.snap.x - P.x, dz = C.snap.z - P.z, d = Math.hypot(dx, dz), st = Math.min(d, 7 * dt); if (d > 0.03) P.tryMove(dx / d * st, dz / d * st); if (d < 0.05 || st < 1e-4) C.snap = null; }   // slide in against it
    else if (!this.solid(P.x - C.n[0] * 0.7, P.z - C.n[1] * 0.7, fy + 0.5) && !(C.peek > 0.05)) { this.leaveCover(P); return; }   // nothing behind any more
    C.low = !this.solid(P.x - C.n[0] * 0.7 - C.t[0] * C.peekSide * C.peek, P.z - C.n[1] * 0.7 - C.t[1] * C.peekSide * C.peek, fy + 1.45);
    // peek: over the top of low cover; round the end of high cover
    let want = 0, sd = C.peekSide;
    if (P.aiming && !C.low) { sd = C.peek > 0.05 ? C.peekSide : this.coverEnd(P, C.side) ? C.side : this.coverEnd(P, -C.side) ? -C.side : 0; want = sd ? 0.75 : 0; }
    if (sd && Math.abs(want - C.peek) > 0.01) { const st = Math.max(-5 * dt, Math.min(5 * dt, want - C.peek)); P.tryMove(C.t[0] * sd * st, C.t[1] * sd * st); C.peek += st; C.peekSide = sd; if (C.peek <= 0.01) { C.peek = 0; C.peekSide = 0; } }
    P.stance = C.low && !P.aiming ? 'crouch' : 'stand';
    C.exposed = P.aiming && (C.low || C.peek > 0.4);
    // the camera over the shoulder on the open side
    const face = C.peekSide || C.side, rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw); P.shoulder = (C.t[0] * face * rx + C.t[1] * face * rz) >= 0 ? 1 : -1;
    if (hint) hint.textContent = P.aiming ? (C.exposed ? '' : 'Move to the end to peek') : `IN COVER · aim to ${C.low ? 'pop up' : 'peek'} · fire blind · Q / ○ leave`;
  }
  /** Bots: a spot a few metres away with something low between it and the enemy. */
  botCoverSpot(b, f) {
    const w = this.game.world; let best = null;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 6, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; if (w.collides(x, z, 0.4)) continue;
      const dx = f.x - x, dz = f.z - z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, qx = x + ux * 0.75, qz = z + uz * 0.75;
      if (!this.solid(qx, qz, 0.6)) continue; const c = { x, z, sc: r + d * 0.03, d: [ux, uz] };
      if (this.solid(qx, qz, 1.45)) {   // a wall: needs a spot to one side to step out and shoot from
        let ok = false; for (const sd of [1, -1]) { const px = x - uz * sd * 1.1, pz = z + ux * sd * 1.1; if (w.collides(px, pz, 0.4)) continue; if (this.sees({ x: px, z: pz, y: 0, stance: 'stand' }, { x: f.x, z: f.z, y: f.y || 0, top: f.top || 1.8 })) { c.px = px; c.pz = pz; ok = true; break; } }
        if (!ok) continue;
      }
      if (!best || c.sc < best.sc) best = c;
    }
    return best;
  }
  /** Has the bot's enemy got round the side of its cover? */
  flanked(b) { const f = b.target; if (!f || !b.cover) return false; const dx = f.x - b.x, dz = f.z - b.z, d = Math.hypot(dx, dz) || 1; return (dx * b.cover.d[0] + dz * b.cover.d[1]) / d < 0.4; }

  // ---------------- first person: the gun in your hands ----------------
  /** Build the first-person model for a gun: boxes and tubes in the gun's local space (-z forward), with hands and sleeves. */
  buildView(key, P) {
    const L = (P.rig && P.rig.look) || {}, g = new THREE.Group(), M = (c, r = 0.5, m = 0.4) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const metal = M(0x2a2c30), dark = M(0x18191c), wood = M(0x6a4428, 0.8, 0), olive = M(0x4a5a3a, 0.7, 0.1), skin = M(L.skin ?? 0xe0b48f, 0.8, 0), sleeve = M(L.shirt ?? 0x3f8f5a, 0.9, 0);
    const box = (w, h, d, x, y, z, m, rx = 0) => { const b = new THREE.Mesh(this.unitBox, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; };
    const tube = (r, len, x, y, z, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };
    const hand = (x, y, z) => { box(0.07, 0.07, 0.085, x, y, z, skin); box(0.075, 0.075, 0.14, x + 0.01, y - 0.02, z + 0.11, sleeve); };
    let muzzle = -0.3, sight = 0.05;
    if (key === 'pistol' || key === 'magnum' || key === 'mp') {
      if (key === 'magnum') { tube(0.016, 0.2, 0, 0.03, -0.17, metal); tube(0.032, 0.06, 0, 0.02, -0.04, metal); box(0.03, 0.03, 0.12, 0, 0.035, -0.02, metal); muzzle = -0.28; }
      else { box(0.035, 0.04, 0.19, 0, 0.025, -0.08, key === 'mp' ? dark : metal); muzzle = -0.19; }
      box(0.03, 0.11, 0.045, 0, -0.04, 0.01, dark, 0.25); if (key === 'mp') box(0.025, 0.16, 0.03, 0, -0.12, 0.0, dark, 0.2);
      hand(0, -0.07, 0.03); hand(-0.03, -0.08, 0.0); sight = 0.05;
    } else if (key === 'launcher') {
      tube(0.065, 1.0, 0, 0.05, -0.2, olive); tube(0.075, 0.12, 0, 0.05, -0.68, dark); box(0.03, 0.1, 0.04, 0, -0.05, -0.05, dark, 0.2); box(0.03, 0.1, 0.04, 0, -0.05, -0.35, dark, 0.2); box(0.05, 0.06, 0.08, -0.05, 0.12, -0.15, dark);
      hand(0, -0.1, -0.03); hand(0, -0.1, -0.33); muzzle = -0.72; sight = 0.13;
    } else {
      const long = key === 'sniper' ? 0.55 : key === 'shotgun' ? 0.5 : key === 'lmg' ? 0.42 : key === 'smg' ? 0.12 : 0.26, rec = key === 'smg' ? 0.28 : key === 'lmg' ? 0.45 : 0.38, wd = key === 'shotgun' || key === 'sniper';
      box(key === 'lmg' ? 0.07 : 0.05, key === 'lmg' ? 0.1 : 0.08, rec, 0, 0, -0.1 - rec / 2 + 0.12, metal);
      tube(key === 'lmg' ? 0.02 : 0.014, long, 0, 0.012, -0.08 - rec + 0.12 - long / 2, dark); muzzle = -0.08 - rec + 0.12 - long;
      box(0.045, 0.09, key === 'smg' ? 0.16 : 0.26, 0, -0.025, 0.15, wd ? wood : metal);
      box(0.03, 0.1, 0.045, 0, -0.07, 0.02, dark, 0.25);
      if (key === 'shotgun') box(0.055, 0.05, 0.16, 0, -0.035, -0.38, wood);
      else if (key === 'lmg') box(0.11, 0.1, 0.11, -0.07, -0.07, -0.12, olive);
      else if (key === 'sniper') { tube(0.028, 0.32, 0, 0.075, -0.12, dark); box(0.012, 0.03, 0.03, 0, 0.05, -0.05, dark); }
      else box(0.035, 0.16, 0.06, 0, -0.11, -0.13, dark, 0.3);
      if (key !== 'sniper') box(0.02, 0.035, 0.04, 0, 0.055, -0.04, dark);
      sight = key === 'sniper' ? 0.075 : 0.065;
      hand(0, -0.09, 0.04); hand(0, -0.06, key === 'smg' ? -0.22 : -0.34);
    }
    const flash = new THREE.Mesh(this.fxSphere || (this.fxSphere = new THREE.SphereGeometry(1, 14, 10)), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.9, depthWrite: false })); flash.scale.set(0.05, 0.05, 0.12); flash.position.set(0, 0.015, muzzle - 0.05); flash.visible = false; g.add(flash);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    g.scale.setScalar(0.62); g.userData = { key, flash, sight: sight * 0.62, rocket: key === 'launcher' }; return g;
  }
  /** Each frame in first person (from Player.placeCamera): put the gun in front of the camera with a bit of life. cam null hides it. */
  viewModel(P, cam, dt = 1 / 60) {
    const g = this.game, show = cam && this.on && P.gun && !P.dead && !P.scoped() && g.mode === 'sim';
    if (!show) { if (this.vm) this.vm.visible = false; return; }
    if (!this.vm || this.vm.userData.key !== P.gun) { if (this.vm) g.scene.remove(this.vm); this.vm = this.buildView(P.gun, P); g.scene.add(this.vm); }
    const v = this.vm, ad = P.aimK || 0, launcher = v.userData.rocket, run = P.speed > 5.3 && !P.aiming;
    v.visible = true; v.position.copy(cam.position); v.quaternion.copy(cam.quaternion);
    // sway: the gun lags behind quick turns
    const dy = (P.yaw - (this.lastYaw ?? P.yaw)), dp = (P.pitch - (this.lastPitch ?? P.pitch)); this.lastYaw = P.yaw; this.lastPitch = P.pitch;
    this.swx = ((this.swx || 0) + dy * 0.6) * Math.max(0, 1 - dt * 9); this.swy = ((this.swy || 0) + dp * 0.6) * Math.max(0, 1 - dt * 9);
    const sp = Math.min(1, P.speed / 6), ph = (P.stepPh || 0) * Math.PI * 2, bob = (1 - ad * 0.8) * sp;
    this.kick = Math.max(0, (this.kick || 0) - dt * 0.5); if (P.lastShot === g.elapsed) this.kick = Math.min(0.09, (this.kick || 0) + (WEAPONS[P.gun].kick || 0.02) * 1.6);
    const rl = P.reloadT > 0 ? Math.sin(Math.min(1, 1 - P.reloadT / WEAPONS[P.gun].reload) * Math.PI) : 0, sw = P.swapT > 0 ? P.swapT / 0.35 : 0, ml = P.meleeT > 0 ? Math.sin((1 - P.meleeT / 0.35) * Math.PI) : 0, nd = P.nadeAim ? 1 : 0;
    const hx = launcher ? 0.14 : 0.11, hy = launcher ? -0.08 : -0.1;
    v.translateX(hx * (1 - ad) + Math.sin(ph) * 0.012 * bob - this.swx * 0.4 + (run ? -0.06 : 0));
    v.translateY(hy * (1 - ad) - (v.userData.sight + (launcher ? 0.03 : 0.017)) * ad - Math.abs(Math.cos(ph)) * 0.012 * bob - rl * 0.12 - sw * 0.2 - nd * 0.25 + this.swy * 0.3 + (run ? -0.04 : 0) + (P.landT > 0 ? -0.03 : 0));
    v.translateZ(-0.2 + ad * 0.03 + this.kick * 0.6 - ml * 0.12);
    v.rotateX(this.kick * 1.6 - rl * 0.35 - ml * 0.4); v.rotateY(this.swx * 0.8 + (run ? 0.7 : 0)); v.rotateZ(rl * 0.6 + (run ? 0.25 : 0) + this.swx * 0.6);
    if (P.flashT > 0) { P.flashT -= dt; v.userData.flash.visible = true; v.userData.flash.rotation.z = Math.random() * 3; } else v.userData.flash.visible = false;
  }

  // ---------------- HUD ----------------
  hud(on) {
    let h = document.getElementById('cbhud');
    if (!h) { const app = document.getElementById('app'); app.insertAdjacentHTML('beforeend', '<div id="cbhud" class="hidden"><div id="cbgun"></div><div id="cbammo"></div><div id="cbnades"></div><div id="cbcover"></div></div><div id="killfeed" class="hidden"></div><div id="dmgvig" class="hidden"></div><div id="hurtdir" class="hidden"></div><div id="scope" class="hidden"><i></i></div>'); h = document.getElementById('cbhud'); }
    for (const id of ['cbhud', 'killfeed', 'dmgvig', 'hurtdir']) document.getElementById(id).classList.toggle('hidden', !on);
    if (!on) document.getElementById('scope').classList.add('hidden');
  }
  hudUpdate(P) {
    const W = WEAPONS[P.gun], am = P.gun && P.ammo && P.ammo[P.gun];
    const gun = document.getElementById('cbgun'); if (!gun) return; gun.textContent = W ? W.name + (P.reloadT > 0 ? ' · reloading' : '') : '';
    document.getElementById('cbammo').innerHTML = am ? `<b class="${am.mag <= W.mag * 0.25 ? 'low' : ''}">${am.mag}</b> / ${am.res}` : '';
    document.getElementById('cbnades').textContent = '● '.repeat(P.nades || 0) + (P.stance && P.stance !== 'stand' ? '  ' + (P.stance === 'prone' ? 'PRONE' : 'CROUCH') : '');
  }
  /** Every frame (sim or not): bots, grenades, ragdolls, blood, the damage vignette, respawning. */
  update(dt) {
    const g = this.game, P = g.player;
    for (let i = this.nades.length - 1; i >= 0; i--) { this.stepNade(this.nades[i], dt); if (this.nades[i].t <= 0) this.nades.splice(i, 1); }
    for (let i = this.rags.length - 1; i >= 0; i--) { const r = this.rags[i]; r.t -= dt; this.stepRag(r, dt); this.drawRag(r); if (r.t < 2) r.grp.position.y = -(2 - r.t) * 0.25; if (r.t <= 0) { this.dropRag(r); this.rags.splice(i, 1); } }
    for (let i = this.fx.length - 1; i >= 0; i--) if (this.stepFx(this.fx[i], dt)) this.fx.splice(i, 1);
    for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.t -= dt; if (d.grow && d.m.scale.x < d.grow) d.m.scale.multiplyScalar(1 + dt * 0.5); if (d.t < 5) d.m.material.opacity = 0.85 * d.t / 5; if (d.t <= 0) { g.scene.remove(d.m); d.m.material.dispose(); this.decals.splice(i, 1); } }
    if (!this.on) return;
    if (this.auth) for (const b of this.bots) this.updateBot(b, dt);
    if (P.dead && !(P.down > 0)) this.respawnPlayer();
    if (!P.dead && (P.hp ?? 100) < 100 && g.elapsed - (P.lastHit || -99) > 4) P.hp = Math.min(100, P.hp + dt * 35);   // catch your breath
    const vig = document.getElementById('dmgvig'); if (vig) vig.style.opacity = P.dead ? 0.8 : Math.max(0, (1 - (P.hp ?? 100) / 100) * 0.95).toFixed(2);
    const hd = document.getElementById('hurtdir'); if (hd) { if (P.hurtT > 0) { P.hurtT -= dt; const rel = P.hurtFrom - Math.atan2(-Math.sin(P.yaw), -Math.cos(P.yaw)); hd.style.opacity = Math.min(1, P.hurtT); hd.style.transform = `translate(-50%,-50%) rotate(${-rel}rad)`; } else hd.style.opacity = 0; }
    const sc = document.getElementById('scope'); if (sc) sc.classList.toggle('hidden', !(WEAPONS[P.gun] && WEAPONS[P.gun].scope && P.aimK > 0.85 && g.mode === 'sim' && !P.dead));
    if (this.feed.length && performance.now() - this.feed[0].t > 6000) { this.feed.shift(); const el = document.getElementById('killfeed'); if (el) el.innerHTML = this.feed.map((f) => `<div>${f.html}</div>`).join(''); }
  }
}
