import * as THREE from 'three';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { stdMat } from '../render/BuildingFactory.js';
import { makeCarMesh } from '../render/Vehicles.js';

/**
 * Something is always going on: a random happening every couple of minutes (more often as the town grows).
 * Ice-cream vans, an escaped pig for Sam to catch, protest marches, a lottery winner buying everyone a pint, a TV crew
 * that won't explain itself, a stage light falling out of the sky, snowball fights, car prangs, chimney fires, power cuts.
 */
const CREW = ['Keep rolling, keep rolling...', 'Camera two, tighter on Sam!', 'Act natural, everyone.', 'We\'re just... doing a documentary. About bins.', 'Nothing to see here!'];

export class Happenings {
  constructor(game) { this.game = game; this.timer = 70; this.live = []; this.count = 0; }
  update(dt) {
    const g = this.game; if (!g.started || g.ending) return; const gdt = dt * Math.max(0, g.clock.speed);
    this.timer -= gdt; if (this.timer <= 0) { this.timer = (160 + Math.random() * 200) / (1 + g.population.count() / 45); this.fire(); }   // rare in a small village, busier as the town grows
    for (const h of this.live) if (h.update) h.update(dt);
    this.live = this.live.filter((h) => { if (h.done) { if (h.end) h.end(); return false; } return true; });
  }
  /** Pick something that suits the time, the season and the age, and start it. */
  fire(kind) {
    const g = this.game, c = g.clock, h = c.hour, day = h >= 8 && h < 20, summer = c.month >= 4 && c.month <= 8, winter = c.month === 11 || c.month <= 1, age = g.tech ? g.tech.age : 2;
    const opts = [];
    if (day && summer && age >= 3) opts.push(['icecream', 3]);
    const stage = (g.story && g.story.stage) || 0, days = c.totalDays || 0;
    const farm = g.buildings.list.find((b) => b.state === 'done' && ['farm', 'allotment', 'stables'].includes(b.id));
    // a slow burner: a quiet village at first; trouble and fuss come with a bigger town (and its problems)
    const pop = g.population.count(), troubled = g.population.sims.filter((s) => s.homeless || s.mood < -0.4 || s.drunk > 0.6).length, news = g.buildings.count('newsagent') > 0;
    if (day) opts.push(['pig', farm && days - (g.flags.pigDay ?? -99) >= 12 ? 0.25 : 0], ['protest', pop >= 25 && !(g.celebrations && g.celebrations.protests.p) ? (c.isSunday ? 1.6 : 0.6) + troubled * 0.05 : 0], ['tvcrew', stage >= 2 && days >= 16 ? 0.7 : 0], ['lottery', news && pop >= 15 && days - (g.flags.lottoDay ?? -99) >= 10 ? 0.5 : 0]);
    if (day && winter) opts.push(['snowballs', 3]);
    if (age >= 3) opts.push(['prang', pop >= 20 ? 1 : 0], ['powercut', g.tech.era >= 1 && pop >= 20 ? 0.6 : 0]);
    const sun = c.isSunday, sat = c.weekday === 5, mornin = h >= 5 && h < 8;
    if (day) opts.push(['morris', (summer || c.month === 4) && pop >= 40 ? 0.6 : 0], ['streetparty', summer && (sat || sun) && !g.flags.partyDay ? 1.2 : 0], ['carboot', sun && h < 13 ? 1.5 : 0], ['watermain', age >= 2 ? 0.6 : 0]);
    if (mornin && age >= 3) opts.push(['milkfloat', 2]);
    opts.push(['chimney', pop < 25 ? 0 : winter ? 0.8 : 0.2], ['stagelight', stage >= 3 && days >= 28 && !g.flags.stagelight ? 0.6 : 0]);
    const live = opts.filter((o) => o[1] > 0); if (!kind && !live.length) return; const k = kind || g.population.weighted(live); this.count++; g.flags.happenings = this.count;
    const fn = this[k]; if (fn) { const r = fn.call(this); if (r) this.live.push(r); }
  }
  /** Somewhere in the street near Sam (or the middle of town in the planning view). */
  spot(r = 40) {
    const g = this.game, w = g.world, P = g.player, cx = g.mode === 'sim' ? P.x : g.plaza ? g.plaza.x : 160, cz = g.mode === 'sim' ? P.z : g.plaza ? g.plaza.z : 160;
    for (let i = 0; i < 30; i++) { const x = cx + (Math.random() - 0.5) * r * 2, z = cz + (Math.random() - 0.5) * r * 2, tx = Math.floor(x / 8), tz = Math.floor(z / 8); if (w.inBounds(tx, tz) && w.road[w.idx(tx, tz)]) return { x: (tx + 0.5) * 8, z: (tz + 0.5) * 8 }; }
    return { x: cx, z: cz };
  }
  mark(p, icon, label, secs = 90, follow = null) { if (this.game.markers) this.game.markers.add(p.x, p.z, icon, label, secs, follow); }
  near(x, z, r) { return this.game.population.sims.filter((s) => !s.inside && !s.fight && !s.crook && s.pose !== 'sleep' && !(s.down > 0) && s.activity !== 'police' && s.kind !== 'security' && Math.hypot(s.x - x, s.z - z) < r); }
  say(text, kind = 'info', toast = true) { const g = this.game; g.messages.push('Town news', text, kind); if (toast) g.ui.toast(text, 3200); }
  gather(p, r, n, emote) { for (const s of this.near(p.x, p.z, r).slice(0, n)) { const a = Math.random() * 6.28, d = 2.5 + Math.random() * 2.5; s.goTo({ x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, face: Math.atan2(-Math.cos(a), -Math.sin(a)) }); if (emote) s.emote = { upper: emote, t: 3 }; } }

  icecream() {
    const g = this.game, p = this.spot(), van = new THREE.Group(); const b = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(c)); m.position.set(x, y, z); m.castShadow = true; van.add(m); };
    b(2, 2.2, 4.4, 0xf4f0e8, 0, 1.4, 0); b(2.02, 0.4, 4.42, 0xe86aa0, 0, 0.6, 0); b(0.3, 0.9, 0.3, 0xf2d9a0, 0, 2.9, 1.2); b(0.5, 0.5, 0.5, 0xffb0c8, 0, 3.4, 1.2); b(1.9, 0.9, 0.05, 0x9fd8f0, 0, 1.9, 2.21);
    for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) b(0.25, 0.6, 0.6, 0x111111, x, 0.3, z);
    van.position.set(p.x + 2.2, 0, p.z); g.scene.add(van); this.say('🍦 The ice-cream van is here! Greensleeves and a 99 with a flake.'); this.mark(p, '🍦', 'Ice-cream van', 90);
    this.gather(p, 35, 6, 'cheer'); let t = 0, ch = 0; const TUNE = [784, 880, 988, 1047, 988, 880, 784, 659];
    return { update: (dt) => { t += dt; if (g.mode === 'sim' && Math.hypot(g.player.x - p.x, g.player.z - p.z) < 40 && (ch -= dt) <= 0) { ch = 0.28; Sfx.tone(TUNE[Math.floor(t / 0.28) % 8], 0.24, { type: 'triangle', vol: 0.04 }); } }, get done() { return t > 90; }, end: () => { g.scene.remove(van); for (const s of this.near(p.x, p.z, 12)) s.moodBoost += 0.05; } };
  }
  pig() {
    const g = this.game, fb = g.buildings.list.find((b) => b.state === 'done' && ['farm', 'allotment', 'stables'].includes(b.id)); if (!fb) return null; g.flags.pigDay = g.clock.totalDays;
    const p = { x: fb.doorOut.x, z: fb.doorOut.z + 3 }, pig = new THREE.Group(), legs = [];   // it gets out of the farm, wherever Sam happens to be
    const b = (w, h, d, x, y, z, c = 0xf2a8b0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(c)); m.position.set(x, y, z); m.castShadow = true; pig.add(m); return m; };
    b(0.6, 0.55, 1.0, 0, 0.6, 0); b(0.42, 0.4, 0.38, 0, 0.7, 0.62); b(0.2, 0.14, 0.08, 0, 0.66, 0.84, 0xe08898);
    for (const [x, z] of [[-0.2, 0.32], [0.2, 0.32], [-0.2, -0.32], [0.2, -0.32]]) { const l = b(0.14, 0.34, 0.14, x, 0.2, z); legs.push(l); }
    pig.position.set(p.x, 0, p.z); g.scene.add(pig); this.say(`🐖 A pig has escaped from the ${fb.def.name}! Catch it (E) for a reward.`); this.mark && this.mark(p, '🐖', 'Escaped pig', 150);
    const st = { x: p.x, z: p.z, h: 0, t: 0, caught: false, flee: 0 }, chasers = this.near(p.x, p.z, 30).slice(0, 3);
    for (const s of chasers) { s.hurry = true; g.social.say(s, pick(['Come back here, you!', 'Here, piggy piggy!', 'Somebody grab it!']), 2.2); }
    const hook = { kind: 'pig', x: p.x, z: p.z, text: 'Catch the pig!', act: () => { st.caught = true; g.economy.earn(30, 'Rewards'); g.ui.toast('You caught the pig! The farmer gives you £30 and a sausage.', 3000); Sfx.play('done'); } };
    this.target = hook;
    return {
      update: (dt) => {
        st.t += dt; const P = g.player, dp = Math.hypot(P.x - st.x, P.z - st.z), w = g.world;
        if (dp < 6 || (st.flee -= dt) <= 0) { st.flee = 1.5 + Math.random() * 2; st.h = dp < 6 ? Math.atan2(st.x - P.x, st.z - P.z) + (Math.random() - 0.5) : Math.random() * 6.28; }
        const sp = dp < 6 ? 4.2 : 1.6, nx = st.x + Math.sin(st.h) * sp * dt, nz = st.z + Math.cos(st.h) * sp * dt; if (!w.collides(nx, nz, 0.4)) { st.x = nx; st.z = nz; } else st.flee = 0;
        pig.position.set(st.x, 0, st.z); pig.rotation.y = st.h; legs.forEach((l, i) => { l.rotation.x = Math.sin(st.t * 14 + i * 1.6) * 0.6; });
        hook.x = st.x; hook.z = st.z; for (const s of chasers) if (!s.path.length && Math.random() < dt) s.goTo({ x: st.x, z: st.z });
        if (st.t > 150) st.caught = true;
      },
      get done() { return st.caught; }, end: () => { g.scene.remove(pig); if (this.target === hook) this.target = null; for (const s of chasers) s.hurry = false; },
    };
  }
  tvcrew() {
    const g = this.game, P = g.player, p = this.spot(20), crew = this.near(p.x, p.z, 50).filter((s) => s.kind === 'resident').slice(0, 2); if (!crew.length) return null;
    this.say('🎥 A TV crew is filming in town. Nobody will say what for.', 'info', false); this.mark(crew[0], '🎥', 'TV crew', 70, crew[0]); let t = 0;
    return { update: (dt) => { t += dt; for (const s of crew) { if (!s.path.length && Math.random() < dt * 0.5) s.goTo({ x: P.x + (Math.random() - 0.5) * 8, z: P.z + (Math.random() - 0.5) * 8 }); s.emote = { upper: Math.hypot(P.x - s.x, P.z - s.z) < 4 ? 'shush' : 'earpiece', t: 1 }; if (Math.random() < dt * 0.15 && s.mesh.visible) g.social.say(s, pick(CREW), 2.2); } }, get done() { return t > 70; } };
  }
  /** People who appear for a happening and go when it's over (they never wander off on their own). */
  /** Visiting performers: they come down the Lift and walk to the spot (call arrived() before starting the show). */
  extras(p, n, look, spread = 3) { const g = this.game, out = []; for (let i = 0; i < n; i++) { const P = g.population.makePerson({ kind: 'visitor', gender: look.gender || (Math.random() < 0.5 ? 'm' : 'f') }), o = { name: P.name, first: P.first, surname: P.surname, kind: 'guest', trait: 'cheerful', look: { ...P.look, ...look }, gender: P.gender, age: P.age }; const s = g.lift ? g.population.spawnAtLift(o) : g.population.spawnAt(p.x, p.z, o); s.goTo({ x: p.x + (Math.random() - 0.5) * spread, z: p.z + (Math.random() - 0.5) * spread }); out.push(s); } return out; }
  /** Have they all got there (or given up trying after a minute and a half)? */
  arrived(list, p, r, t) { return t > 90 || list.every((s) => s.remove || Math.hypot(s.x - p.x, s.z - p.z) < r); }
  // Morris dancers: white, bells, hankies, sticks, a melodeon, and an awful lot of hopping
  morris() {
    const g = this.game, p = this.spot(), men = this.extras(p, 6, { gender: 'm', shirt: 0xf4f4f0, pants: 0xf4f4f0, shirt2: 0xd8342c, hat: { type: 'bowler', color: 0x1a1a1a } }, 0);
    this.say('Morris dancers in the street! Bells, hankies and sticks. Mind your shins.'); this.mark(p, '🔔', 'Morris dancers', 90); this.gather(p, 35, 8, 'clap');
    // hankies in both hands and bells on their shins
    const hk = new THREE.BoxGeometry(0.2, 0.02, 0.26), bl = new THREE.BoxGeometry(0.16, 0.06, 0.18), white = stdMat(0xffffff), gold = stdMat(0xe8c040);
    for (const s of men) { const r = s.rig; if (!r) continue; for (const h of [r.armL.hand, r.armR.hand]) { const m = new THREE.Mesh(hk, white); m.position.set(0, -0.14, 0.04); h.add(m); } for (const k of [r.legL.kn, r.legR.kn]) { const m = new THREE.Mesh(bl, gold); m.position.set(0, -0.12, 0.02); k.add(m); } }
    // the dance: two lines face each other, advance and retire with a hop-step, and cross over every four bars
    let t = 0, ring = 0, lastCross = 0, wait = 0, on = false;
    return { update: (dt) => { if (!on) { wait += dt; if (!this.arrived(men, p, 4, wait)) return; on = true; } t += dt; const bar = t / 1.8, cross = Math.floor(bar / 4) % 2;
      men.forEach((s, i) => { const side = (i % 2 ? 1 : -1) * (cross ? -1 : 1), row = Math.floor(i / 2), inward = (0.5 - 0.5 * Math.cos(bar * Math.PI * 2)) * 0.8;
        s.glide = { x: p.x + side * (1.3 - inward), z: p.z - 2.5 + row * 2.5 }; s.heading = side > 0 ? -Math.PI / 2 : Math.PI / 2; s.faceGoal = s.heading; s.emote = { upper: 'morris', t: 0.5 }; });
      const near = g.mode === 'sim' && Math.hypot(g.player.x - p.x, g.player.z - p.z) < 30;
      if (near && (ring -= dt) <= 0) { ring = 0.22; Sfx.tone(1568 + Math.random() * 500, 0.05, { type: 'sine', vol: 0.025 }); if (Math.random() < 0.25) Sfx.tone(392 + Math.random() * 200, 0.3, { type: 'triangle', vol: 0.03 }); }   // bells, and the melodeon
      if (cross !== lastCross) { lastCross = cross; if (near) Sfx.noise(0.05, { freq: 1800, vol: 0.06, type: 'bandpass' }); g.social.say(pick(men), pick(['Hey!', 'Hup!', 'And across!', 'Mind the sticks!']), 1.4); }   // the sticks clack as they cross
    }, get done() { return t > 70; }, end: () => { for (const s of men) g.population.depart(s); } };
  }
  // a street party: trestle tables down the road, bunting, sausage rolls and trifle
  streetparty() {
    const g = this.game, p = this.spot(25), grp = new THREE.Group(), b = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(c)); m.position.set(x, y, z); grp.add(m); return m; };
    g.flags.partyDay = true; setTimeout(() => { g.flags.partyDay = false; }, 600000);
    for (let i = -1; i <= 1; i++) { b(1.0, 0.06, 3.0, 0xf8f8f8, 0, 0.78, i * 3.4); for (const x of [-0.4, 0.4]) for (const z of [-1.3, 1.3]) b(0.06, 0.78, 0.06, 0x6a5040, x, 0.39, i * 3.4 + z); for (let k = 0; k < 6; k++) b(0.2, 0.1, 0.2, [0xd8342c, 0xf2c94c, 0xe07fa0, 0x8a5a2a][k % 4], (k % 2 ? 0.25 : -0.25), 0.86, i * 3.4 - 1.1 + k * 0.45); }
    for (const sx of [-2.2, 2.2]) b(0.08, 3.4, 0.08, 0x8a8a8a, sx, 1.7, -5.5); for (let k = 0; k < 18; k++) b(0.18, 0.22, 0.02, [0xd8342c, 0xffffff, 0x2a4aa8][k % 3], -2.1 + k * 0.25, 3.1 - Math.sin(k / 17 * Math.PI) * 0.5, -5.5);
    grp.position.set(p.x, 0, p.z); g.scene.add(grp);
    this.say('A street party! Trestle tables, bunting, and a trifle the size of a car tyre.'); this.mark(p, '🎉', 'Street party', 150); this.gather(p, 50, 16, 'cheer');
    let t = 0, ch = 0;
    return { update: (dt) => { t += dt; ch -= dt; if (ch <= 0) { ch = 2.5; const s = pick(this.near(p.x, p.z, 9)); if (s) { g.social.say(s, pick(['Pass the sausage rolls!', 'Who made the trifle? It\'s lethal.', 'Three cheers for... whoever organised this!', 'Is that Shakin\' Stevens on the radio?', 'Another bit of Battenberg?', 'Lovely do, this.']), 2.4); s.emote = { upper: pick(['cheer', 'dance', 'clap']), t: 2 }; } } }, get done() { return t > 140; }, end: () => g.scene.remove(grp) };
  }
  // a car boot sale on a Sunday morning: hatchbacks with their boots open and pasting tables full of tat
  carboot() {
    const g = this.game, park = g.buildings.list.find((b) => b.state === 'done' && b.def.park && b.def.w >= 3) || null, p = park ? { x: park.cx, z: park.cz } : this.spot(), grp = new THREE.Group();
    const b = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMat(c)); m.position.set(x, y, z); grp.add(m); };
    for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 3.2; const car = makeCarMesh(pick([0xc0392b, 0x2980b9, 0x7f8c8d, 0x27ae60, 0xecf0f1])); car.position.set(x, 0, -1.6); grp.add(car); b(1.8, 0.05, 0.7, 0xe8e2d0, x, 0.75, 1.0); for (let k = 0; k < 5; k++) b(0.25, 0.15 + (k % 3) * 0.1, 0.22, [0x8a6a4a, 0x2a2a2a, 0xd8342c, 0xf2c94c, 0x9a9a9a][k], x - 0.7 + k * 0.35, 0.85, 1.0); }
    grp.position.set(p.x, 0, p.z); g.scene.add(grp);
    this.say(`A car boot sale${park ? ` on the ${park.def.name}` : ''}! Old videos, a foot spa and a box of Readers' Digests.`); this.mark(p, '🧺', 'Car boot sale', 150); this.gather(p, 50, 12, null);
    let t = 0, ch = 0;
    return { update: (dt) => { t += dt; ch -= dt; if (ch <= 0) { ch = 3; const s = pick(this.near(p.x, p.z, 10)); if (s) g.social.say(s, pick(['How much for the foot spa?', 'Fifty pence? Go on then.', 'I\'ve got this exact toaster already.', 'Is the Betamax player working?', 'Two quid for the lot.', 'A Soda Stream! I\'ve always wanted one.']), 2.4); } }, get done() { return t > 150; }, end: () => g.scene.remove(grp) };
  }
  // a burst water main: a fountain in the middle of the road, and everyone stops to watch
  watermain() {
    const g = this.game, p = this.spot(); this.say('A water main has burst! There\'s a fountain in the middle of the road.'); this.mark(p, '💧', 'Burst water main', 70); this.gather(p, 30, 6, 'point');
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(3, 16), new THREE.MeshStandardMaterial({ color: 0x5a7a9a, transparent: true, opacity: 0.55, roughness: 0.1 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(p.x, 0.06, p.z); g.scene.add(puddle);
    let t = 0, sp = 0;
    return { update: (dt) => { t += dt; sp -= dt; if (sp <= 0) { sp = 0.08; g.particles.burst(p.x, 0.3, p.z, 0xbfe0ff, 4, 2.4, 1.2, 0.07); } puddle.scale.setScalar(Math.min(1.6, 0.5 + t / 30)); }, get done() { return t > 70; }, end: () => g.scene.remove(puddle) };
  }
  // the milk float, whining along before anyone's up, clinking
  milkfloat() {
    const g = this.game, w = g.world, p = this.spot(60), [sx, sz] = w.tileOf(p.x, p.z), dest = this.spot(60), [tx, tz] = w.tileOf(dest.x, dest.z), path = (w.findPath(sx, sz, tx, tz, true) || []).map(([x, z]) => ({ x: (x + 0.5) * 8 + 1.3, z: (z + 0.5) * 8 }));
    if (path.length < 2) return null; const fl = new THREE.Group(), b = (wd, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(wd, h, d), stdMat(c)); m.position.set(x, y, z); fl.add(m); };
    b(1.6, 0.5, 3.2, 0xf4f4f0, 0, 0.55, 0); b(1.6, 1.2, 1.0, 0xf4f4f0, 0, 1.3, 1.1); b(1.5, 0.5, 0.05, 0x9fd8f0, 0, 1.5, 1.61); b(1.7, 0.1, 2.0, 0x2a7a3a, 0, 2.0, -0.5); for (let k = 0; k < 8; k++) b(0.3, 0.3, 0.3, 0xf8f8f8, -0.45 + (k % 4) * 0.3, 0.95, -0.4 - Math.floor(k / 4) * 0.5);
    for (const [x, z] of [[-0.75, 1.0], [0.75, 1.0], [-0.75, -1.1], [0.75, -1.1]]) b(0.2, 0.44, 0.44, 0x111111, x, 0.22, z);
    let x = path[0].x, z = path[0].z, h = 0, t = 0; fl.position.set(x, 0, z); g.scene.add(fl); this.mark({ x, z }, '🥛', 'Milk float', 60, null);
    return { update: (dt) => { t += dt; const q = path[0]; if (!q) return; const dx = q.x - x, dz = q.z - z, d = Math.hypot(dx, dz); if (d < 0.5) { path.shift(); return; } h = Math.atan2(dx, dz); x += dx / d * 2.2 * dt; z += dz / d * 2.2 * dt; fl.position.set(x, 0, z); fl.rotation.y = h; if (g.mode === 'sim' && Math.hypot(g.player.x - x, g.player.z - z) < 25 && Math.random() < dt * 2) Sfx.tone(1200 + Math.random() * 300, 0.05, { type: 'sine', vol: 0.02 }); }, get done() { return !path.length || t > 90; }, end: () => g.scene.remove(fl) };
  }
  protest() { const g = this.game; if (g.celebrations) g.celebrations.protests.start(); return null; }
  /** A lottery win: the cheque has to be collected from the Newsagent, then carried home or to the bank. Anyone (Sam
   *  included) could relieve them of it on the way. */
  lottery() {
    const g = this.game, shop = g.buildings.list.find((b) => b.id === 'newsagent' && b.state === 'done'); if (!shop) return null;
    const r = pick(g.population.adults().filter((s) => s.home && !s.leaving && !s.crook && s.activity !== 'work' && !s.riding)); if (!r) return null;
    g.flags.lottoDay = g.clock.totalDays; const amount = pick([10, 25, 76, 150, 1200, 5000]), bank = g.buildings.list.find((b) => b.id === 'bank' && b.state === 'done');
    this.say(`💷 ${r.name} has five numbers on the National Lottery! They're off to the ${shop.def.name} to collect £${amount}.`, 'good');
    const ev = { live: true, r, shop, amount, stage: 'collect', t: 0, calling: (s) => s === r, hold: () => true, spot: () => null };
    const to = () => (ev.stage === 'collect' ? shop.doorOut : bank && Math.hypot(bank.cx - r.x, bank.cz - r.z) < Math.hypot(r.home.cx - r.x, r.home.cz - r.z) ? bank.doorOut : r.home.doorOut);
    r.phase = 0; if (g.celebrations) g.celebrations.events.push(ev); this.mark(r, '💷', `${r.first}: lottery winner`, 240, r);
    return { update: (dt) => { ev.t += dt; if (r.remove || r.leaving) { ev.live = false; return; } if (r.down > 0) return; const d = to(); if (!d) { ev.live = false; return; }
        if (Math.hypot(d.x - r.x, d.z - r.z) < 2.6) { if (ev.stage === 'collect') { ev.stage = 'home'; r.winnings = amount; g.social.say(r, pick(['Get in!', 'I\'m rich! Well. A bit.', 'Don\'t tell anyone. Oops.']), 2.5); r.emote = { upper: 'cheer', t: 2 }; } else { if (r.winnings) { g.messages.push('Town', `${r.first} got their £${r.winnings} safely ${bank && d === bank.doorOut ? 'into the bank' : 'home'}.`, 'good'); r.moodBoost += 0.5; } r.winnings = 0; ev.live = false; } }
        else if (!r.path.length || (ev.re = (ev.re || 0) - dt) <= 0) { ev.re = 4; r.goTo({ x: d.x, z: d.z }); } }, get done() { return !ev.live || ev.t > 300; }, end: () => { ev.live = false; } };
  }
  snowballs() {
    const g = this.game, kids = g.population.sims.filter((s) => s.kind === 'child' && !s.inside && s.pose !== 'sleep').slice(0, 6); if (kids.length < 2) return null;
    this.say('⛄ Snowball fight in the street!', 'info', false); this.mark(kids[0], '⛄', 'Snowball fight', 50, kids[0]); let t = 0;
    return { update: (dt) => { t += dt; if (Math.random() < dt * 2) { const a = pick(kids), b = pick(kids); if (a !== b) { a.faceGoal = Math.atan2(b.x - a.x, b.z - a.z); a.emote = { upper: 'punch', t: 0.4 }; g.particles.burst(b.x, 1.4, b.z, 0xffffff, 6, 1.5, 2, 0.08); if (Math.random() < 0.4 && b.mesh.visible) g.social.say(b, pick(['Oi!', 'Got you!', 'Missed me!', 'Right down my neck!']), 1.4); } } }, get done() { return t > 50; } };
  }
  prang() { const g = this.game; this.say('🚗 A car prang on the high street. The drivers are having words...'); if (g.crime) g.crime.brawl(false); return null; }
  powercut() { if (this.game.hazards) this.game.hazards.cutPower(); return null; }
  chimney() { const g = this.game, hz = g.hazards; if (!hz) return null; const L = g.buildings.list.filter((b) => b.state === 'done' && b.def.cat === 'res' && (b.def.roof === 'gable' || b.def.roof === 'thatch')); if (L.length) hz.ignite(pick(L)); return null; }
  stagelight() {
    const g = this.game, p = this.spot(25), lamp = new THREE.Group(); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.6, 12), stdMat(0x1a1a1a)); cyl.rotation.x = Math.PI / 2; lamp.add(cyl);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.62, 12), stdMat(0xfff4d0, { emissive: 0xfff0c0, emissiveIntensity: 1 })); lens.position.z = 0.82; lamp.add(lens); const lab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.02), stdMat(0xe8e8e8)); lab.position.set(0, 0.5, 0.3); lamp.add(lab);
    lamp.position.set(p.x, 90, p.z); g.scene.add(lamp); let t = 0, landed = false; g.flags.stagelight = true;
    return {
      update: (dt) => {
        t += dt; if (!landed) { lamp.position.y -= dt * (20 + t * 30); lamp.rotation.x += dt * 4; if (lamp.position.y <= 0.7) { lamp.position.y = 0.7; lamp.rotation.set(0.3, 0.6, 0); landed = true; Sfx.noise(0.8, { freq: 200, vol: 0.7, type: 'lowpass' }); g.particles.burst(p.x, 0.6, p.z, 0xdddddd, 20, 3, 3, 0.15); this.say('💡 Something fell out of the sky and landed in the street! It has "SIRIUS (9 Canis Major)" written on the side. The radio says a plane shed some parts. There are no planes.', 'warn'); this.gather(p, 40, 7, 'lookaround'); } }
        else if (Math.random() < dt * 0.3) { const s = pick(this.near(p.x, p.z, 10)); if (s && s.mesh.visible) g.social.say(s, pick(['Where did THAT come from?', 'It\'s from a plane. Definitely a plane.', 'Don\'t touch it, Sam!', 'Nothing to see here! Move along!']), 2.2); }
      },
      get done() { return t > 160; }, end: () => g.scene.remove(lamp),
    };
  }
  /** Things Sam can do with a happening (catch the pig). Called from Player.findTarget via Transport-style hook. */
  targets(P, consider) {
    const h = this.target; if (h && Math.hypot(h.x - P.x, h.z - P.z) < 2.2) consider({ kind: 'act', text: h.text, act: h.act }, 0.1, undefined, undefined, [h.x, h.z]);
    // a lottery winner walking home with the cheque: Sam could... (it's a crime, and people see)
    const g = this.game; for (const s of g.population.sims) if (s.winnings > 0 && !(s.down > 0) && Math.hypot(s.x - P.x, s.z - P.z) < 1.8) consider({ kind: 'act', text: `Rob ${s.first} of their lottery winnings (£${s.winnings})...`, act: () => this.samRobs(s) }, 0.6, undefined, undefined, [s.x, s.z]);
  }
  samRobs(s) {
    const g = this.game, n = s.winnings; s.winnings = 0; s.knockDown(4); s.moodBoost -= 0.6; g.social.say(s, 'Thief! THIEF! Somebody stop him!', 3); g.economy.earn(n, 'Ill-gotten gains');
    const seen = g.population.sims.filter((q) => q !== s && q.mesh.visible && !q.inside && Math.hypot(q.x - s.x, q.z - s.z) < 25).length;
    if (seen && g.crime) { g.crime.wanted = Math.min(5, g.crime.wanted + 2); g.messages.push('Police', `Sam robbed ${s.name} of £${n} in broad daylight. ${seen} witnesses.`, 'warn'); }
    g.ui.toast(seen ? `You snatch £${n}. People saw that...` : `You snatch £${n}. Nobody saw. You feel terrible.`, 3000); s.samRel = (s.samRel || 0) - 50;
  }
}
