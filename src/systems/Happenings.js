import * as THREE from 'three';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { stdMat } from '../render/BuildingFactory.js';
import { makeCarMesh } from '../render/Vehicles.js';
import { makeCart } from '../render/Carts.js';
import { today as keyToday } from '../data/calendar.js';

// the first time each of these comes up the Lift, a short cutscene shows them arriving, with what's about to happen
const FIRST = {
  morris: ['Morris dancers', 'A side of morris men has come up the Lift: bells on their shins, hankies and sticks. They\'ll dance in the street for a while, then go.'],
  icecream: ['The ice-cream van', 'Greensleeves on the chimes. On warm days the van does a round of the streets: 99s with a flake, and Sam can buy one too.'],
  documentary: ['A film crew', 'A presenter and a camera crew from Pennine Television have come down the Lift. They\'re making a programme about the town, and they\'ll want a word with Sam.'],
  carboot: ['The boot sale', 'Sunday morning: sellers come up from the Lift and lay out tables of bric-a-brac. Have a rummage: there are bargains, and odd things you won\'t find in the shops.'],
};
const QUIET_ONCE_SEEN = new Set(['morris', 'icecream', 'milkfloat']);   // wanderers: once Sam's seen them, no icon over them
const MORRIS_DAYS = ['May Day bank holiday', 'VE Day bank holiday', 'Easter Monday', 'Spring bank holiday', 'Summer bank holiday', 'Boxing Day', 'New Year\'s Day'];   // the traditional days they dance out
import { SHOP_GOODS } from '../data/shopgoods.js';

const TILE = 8, BOX = new THREE.BoxGeometry(1, 1, 1);   // one shared box: props are scaled copies (nothing to free when they go)

/**
 * Something is always going on: a random happening every couple of minutes (more often as the town grows).
 * Ice-cream vans, an escaped pig for Sam to catch, protest marches, a lottery winner buying everyone a pint, a TV crew
 * that won't explain itself, a stage light falling out of the sky, snowball fights, car prangs, chimney fires, power cuts.
 */
const WEEKDAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
// the documentary's interview: three questions, three answers each (and what the presenter makes of them)
const DOC_Q = [
  { q: 'Sam, a year ago this was an empty field. How did it all start?', a: [
    ['One spade, a lot of tea, and a lot of help.', 'Modest, too. Your neighbours tell me you never stop working.', 'modest'],
    ['I had a plan: a home and a job for everyone who comes down that Lift.', 'A home and a job for everyone. A few politicians could learn from that.', 'vision'],
    ['Honestly? I woke up by the Lift one morning and just got on with it.', 'You woke up... by the... ha! Right. (She glances off camera.) We\'ll, er, cut that bit.', 'odd'],
  ] },
  { q: 'Some people say Sam City is a bit... odd. Nobody seems sure where that Lift actually goes. What do you say to them?', a: [
    ['Odd\'s good. Odd brings the tourists in.', 'Ha! I can see the posters now. "Sam City: it\'s a bit odd."', 'tourist'],
    ['There\'s nothing odd about Sam City. It\'s as normal as anywhere.', 'As normal as anywhere. Absolutely. (The sound recordist coughs.)', 'normal'],
    ['You came down in it. You tell me where it goes.', 'We, er... came in on the M62. Like everybody does. Next question!', 'odd'],
  ] },
  { q: 'And what\'s next for Sam City?', a: [
    ['More homes. Everybody deserves a roof over their head.', 'More homes. You heard it here first.', 'homes'],
    ['A pub on every corner and a chippy on every street!', 'The viewers are going to love you.', 'pubs'],
    ['Something tall. I want to see what\'s above the clouds.', 'Above the... clouds. (A long pause.) Lovely. Lovely stuff.', 'odd'],
  ] },
];
const DOC_SIGN = { modest: 'a town built with one spade and a lot of tea', vision: 'a town with a home and a job for everyone who comes', odd: 'a town that nobody, not even its founder, quite remembers starting' };
const CREW = ['Keep rolling, keep rolling...', 'Camera two, tighter on Sam!', 'Act natural, everyone.', 'We\'re just... doing a documentary. About bins.', 'Nothing to see here!'];

export class Happenings {
  constructor(game) { this.game = game; this.timer = 70; this.live = []; this.count = 0; }
  update(dt) {
    const g = this.game; if (!g.started || g.ending) return; const gdt = dt * Math.max(0, g.clock.speed);
    this.timer -= gdt; if (this.timer <= 0) { this.timer = (160 + Math.random() * 200) / (1 + g.population.count() / 45); this.fire(); }   // rare in a small village, busier as the town grows
    for (const h of this.live) if (h.update) h.update(dt);
    this.airCheck(); this.viewerCheck();
    if (g.flags.docAired && g.clock.totalDays - g.flags.docAired <= 2 && g.mode === 'sim' && Math.random() < dt * 0.04) { const s = this.near(g.player.x, g.player.z, 12).find((q) => q.kind === 'resident' && q.mesh.visible && !q.chat && !q.bubble); if (s) { g.social.say(s, pick(['Saw you on the telly, Sam!', 'You were on the box! My mum taped it.', 'Britain\'s Newest Town! We\'re famous!', 'You looked taller on the telly.', 'Our Kevin was in the background, waving!']), 2.6); s.emote = { upper: 'wave', t: 1.6 }; } }   // (the morning after)
    this.live = this.live.filter((h) => { if (h.done) { if (h.end) h.end(); return false; } return true; });
  }
  /** Pick something that suits the time, the season and the age, and start it. */
  fire(kind) {
    const g = this.game, c = g.clock, h = c.hour, day = h >= 8 && h < 20, summer = c.month >= 4 && c.month <= 8, winter = c.month === 11 || c.month <= 1, age = g.tech ? g.tech.age : 2;
    const opts = [];
    if (day && summer && age >= 3 && g.flags.iceDay !== c.totalDays) opts.push(['icecream', 1]);   // once a day at most
    const stage = (g.story && g.story.stage) || 0, days = c.totalDays || 0;
    const farm = g.buildings.list.find((b) => b.state === 'done' && ['farm', 'allotment', 'stables'].includes(b.id));
    // a slow burner: a quiet village at first; trouble and fuss come with a bigger town (and its problems)
    const pop = g.population.count(), troubled = g.population.sims.filter((s) => s.homeless || s.mood < -0.4 || s.drunk > 0.6).length, news = g.buildings.count('newsagent') > 0;
    if (day) opts.push(['pig', farm && days - (g.flags.pigDay ?? -99) >= 12 ? 0.25 : 0], ['protest', pop >= 25 && !(g.celebrations && g.celebrations.protests.p) ? (c.isSunday ? 1.6 : 0.6) + troubled * 0.05 : 0], ['tvcrew', stage >= 2 && days >= 16 ? 0.7 : 0], ['documentary', !g.flags.docDone && days >= 12 && pop >= 15 && h >= 10 && h < 17 && !(g.weather && g.weather.rain > 0.3) && !(g.raids && g.raids.state === 'active') && days - (g.flags.docMissed ?? -99) >= 8 && !this.live.some((q) => q.kind === 'documentary') ? 1.5 : 0], ['lottery', news && pop >= 15 && days - (g.flags.lottoDay ?? -99) >= 10 ? 0.5 : 0]);
    if (day && winter && g.seasons && g.seasons.snow > 0.3) opts.push(['snowballs', 3]);   // (only when there's snow lying to make them with)
    if (age >= 3) opts.push(['prang', pop >= 20 ? 1 : 0], ['powercut', g.tech.era >= 1 && pop >= 20 ? 0.6 : 0]);
    const sun = c.isSunday, sat = c.weekday === 5, mornin = h >= 5 && h < 8;
    if (day) opts.push(['morris', this.morrisWeight(c, pop)], ['streetparty', summer && (sat || sun) && !g.flags.partyDay ? 1.2 : 0], ['carboot', sun && h < 13 ? 1.5 : 0], ['watermain', age >= 2 ? 0.6 : 0]);
    if (mornin && age >= 3) opts.push(['milkfloat', 2]);
    opts.push(['chimney', pop < 25 ? 0 : winter ? 0.8 : 0.2], ['stagelight', stage >= 3 && days >= 28 && !g.flags.stagelight ? 0.6 : 0]);
    const NOLIFT = new Set(['pig', 'protest', 'lottery', 'snowballs', 'prang', 'powercut', 'watermain', 'chimney', 'stagelight', 'streetparty']);   // (what can still happen with the Lift in pieces)
    const live = opts.filter((o) => o[1] > 0 && (!g.flags.liftDown || NOLIFT.has(o[0]))); if (!kind && !live.length) return; const k = kind || g.population.weighted(live); this.count++; g.flags.happenings = this.count;
    const seen = (g.flags.seenEv ||= {}); this.quiet = QUIET_ONCE_SEEN.has(k) && !!seen[k];
    const fn = this[k]; if (fn) { this.marks = []; const r = fn.call(this); this.quiet = false; if (r) this.firstTime(k); if (r) this.live.push(r); for (const m of this.marks) if (r) { const was = m.alive; m.alive = () => !r.done && this.live.includes(r) && (!was || was()); m.until = this.game.elapsed + 3600; } this.marks = null; }   // its map icon goes the moment it's over
  }
  /**
   * Morris dancers dance out from April to September, twice a month at most and not in the same week, plus the
   * traditional days (the bank holidays, Boxing Day, New Year's Day) whatever the month.
   */
  morrisWeight(c, pop) {
    const g = this.game, f = g.flags, mk = c.year * 12 + c.month; if (f.morrisMonth !== mk) { f.morrisMonth = mk; f.morrisN = 0; }
    if (f.morrisDay === c.totalDays || pop < 30) return 0; const t = keyToday(c);
    if (t && MORRIS_DAYS.includes(t.name)) return 4;
    return c.month >= 3 && c.month <= 8 && (f.morrisN || 0) < 2 && c.totalDays - (f.morrisDay ?? -99) >= 7 ? 0.35 : 0;
  }
  /** The first time something comes up the Lift: a cutscene of it arriving, and a caption. After that it's familiar. */
  firstTime(k) {
    const g = this.game, seen = g.flags.seenEv; if (!FIRST[k] || seen[k]) return; seen[k] = true;
    if (!g.started || g.demoMode || g.ending || !g.cutscene || !g.lift) return; const [title, text] = FIRST[k], shot = g.cutscene.liftShot(7.5, { title, text });
    if (shot) g.cutscene.play({ shots: [shot] });
  }
  /** Somewhere in the street near Sam (or the middle of town in the planning view). */
  spot(r = 40) {
    const g = this.game, w = g.world, P = g.player, cx = g.mode === 'sim' ? P.x : g.plaza ? g.plaza.x : 160, cz = g.mode === 'sim' ? P.z : g.plaza ? g.plaza.z : 160;
    for (let i = 0; i < 30; i++) { const x = cx + (Math.random() - 0.5) * r * 2, z = cz + (Math.random() - 0.5) * r * 2, tx = Math.floor(x / 8), tz = Math.floor(z / 8); if (w.inBounds(tx, tz) && w.road[w.idx(tx, tz)]) return { x: (tx + 0.5) * 8, z: (tz + 0.5) * 8 }; }
    return { x: cx, z: cz };
  }
  mark(p, icon, label, secs = 90, follow = null) { if (this.quiet) return null; const m = this.game.markers && this.game.markers.add(p.x, p.z, icon, label, secs, follow); if (m && this.marks) this.marks.push(m); return m; }
  near(x, z, r) { return this.game.population.sims.filter((s) => !s.inside && !s.fight && !s.crook && s.pose !== 'sleep' && !(s.down > 0) && s.activity !== 'police' && s.kind !== 'security' && Math.hypot(s.x - x, s.z - z) < r); }
  say(text, kind = 'info', toast = false) { const g = this.game; g.messages.push('Town news', text, kind === 'warn' ? kind : 'quiet'); if (toast) g.ui.toast(text, 3200); }   // town news goes in the log (the map icon is the notification)
  gather(p, r, n, emote) { for (const s of this.near(p.x, p.z, r).slice(0, n)) { const a = Math.random() * 6.28, d = 2.5 + Math.random() * 2.5; s.goTo({ x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, face: Math.atan2(-Math.cos(a), -Math.sin(a)) }); if (emote) s.emote = { upper: emote, t: 3 }; } }

  // ---------- coming and going: everything arrives up the Lift and leaves down it, along the roads ----------
  /** The road from the Lift to p, as points (null if the Lift isn't there or no road reaches). */
  roadFromLift(p) {
    const g = this.game, L = g.lift, w = g.world; if (!L || !L.doorTile || !L.doorOut) return null;
    const [tx, tz] = w.tileOf(p.x, p.z), path = w.findPath(L.doorTile.x, L.doorTile.z, tx, tz, true); if (!path) return null;
    return [{ x: L.doorOut.x, z: L.doorOut.z }, ...path.map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE }))];
  }
  /** Move a vehicle along its path (true once it's there). */
  drive(v, dt) {
    const p = v.path[0]; if (!p) return true; const m = v.mesh, dx = p.x - m.position.x, dz = p.z - m.position.z, d = Math.hypot(dx, dz), step = v.speed * dt;
    if (d > 0.1) { let da = Math.atan2(dx, dz) - m.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); m.rotation.y += da * Math.min(1, dt * 6); }
    if (d <= step) { m.position.x = p.x; m.position.z = p.z; v.path.shift(); } else { m.position.x += dx / d * step; m.position.z += dz / d * step; }
    return !v.path.length;
  }
  /** A street where people live (or by the park): where a van would stop. Not wherever Sam happens to be. */
  /** Something Sam can do at a happening (buy an ice cream, rummage at a stall), while it lasts. */
  offer(o) { (this.offers = this.offers || []).includes(o) || this.offers.push(o); }
  withdraw(o) { if (this.offers) this.offers = this.offers.filter((q) => q !== o); }
  street() {
    const g = this.game, w = g.world, homes = g.buildings.list.filter((b) => b.state === 'done' && (b.def.cat === 'res' || b.def.park) && b.doorTile), out = [];
    for (const b of homes) { const t = b.doorTile; if (w.inBounds(t.x, t.z) && w.road[w.idx(t.x, t.z)]) out.push({ x: (t.x + 0.5) * TILE, z: (t.z + 0.5) * TILE }); }
    return out.length ? pick(out) : null;
  }
  icecream() {
    const g = this.game, p = this.street(); if (!p) return null; const route = this.roadFromLift(p); if (!route || route.length < 2) return null; g.flags.iceDay = g.clock.totalDays;
    const van = new THREE.Group(); const b = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(BOX, stdMat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; van.add(m); };
    b(2, 2.2, 4.4, 0xf4f0e8, 0, 1.4, 0); b(2.02, 0.4, 4.42, 0xe86aa0, 0, 0.6, 0); b(0.3, 0.9, 0.3, 0xf2d9a0, 0, 2.9, 1.2); b(0.5, 0.5, 0.5, 0xffb0c8, 0, 3.4, 1.2); b(1.9, 0.9, 0.05, 0x9fd8f0, 0, 1.9, 2.21);
    b(0.05, 0.8, 1.6, 0x2a2a2a, 1.01, 1.7, -0.4);   // the serving hatch
    for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) b(0.25, 0.6, 0.6, 0x111111, x, 0.3, z);
    van.position.set(route[0].x, 0, route[0].z); g.scene.add(van);
    const v = { mesh: van, path: route.slice(1), speed: 6 }, back = route.slice().reverse().slice(1);
    const TUNE = [784, 880, 988, 1047, 988, 880, 784, 659], chime = (vol = 0.035) => TUNE.forEach((f, i) => Sfx.tone(f, 0.24, { type: 'triangle', vol, delay: i * 0.28 }));
    const samD = () => (g.mode === 'sim' ? Math.hypot(g.player.x - van.position.x, g.player.z - van.position.z) : 1e9);
    let stage = 'in', t = 0, heard = false, done = false;
    const mk = this.mark(p, '🍦', 'Ice-cream van', 400, { get x() { return van.position.x; }, get z() { return van.position.z; } });   // the icon rides along with it
    this.say('🍦 The ice-cream van is coming up from the Lift.');
    const serve = { x: 0, z: 0, text: 'Buy an ice cream from the van', act: () => g.ui.openShop({ def: { id: 'icecream', name: 'The ice-cream van' } }, null, SHOP_GOODS.icecream) };
    return { update: (dt) => { const gdt = dt * Math.max(0, g.clock.speed); if (!gdt) return;
      if (!heard && samD() < 30) { heard = true; chime(0.03); }   // once, when it comes past Sam
      if (stage === 'in') { if (this.drive(v, gdt)) { stage = 'serve'; t = 0; this.gather(p, 35, 6, 'cheer'); if (samD() < 45) chime(); } }
      else if (stage === 'serve') { t += gdt; const s = Math.sin(van.rotation.y + Math.PI / 2), c = Math.cos(van.rotation.y + Math.PI / 2); serve.x = van.position.x + s * 1.6; serve.z = van.position.z + c * 1.6; this.offer(serve);   // the hatch side
        if (t > 100) { stage = 'out'; v.path = back.slice(); this.withdraw(serve); for (const q of this.near(p.x, p.z, 12)) q.moodBoost += 0.05; } }
      else if (stage === 'out' && this.drive(v, gdt)) done = true; },
    get done() { return done; }, end: () => { g.scene.remove(van); this.withdraw(serve); if (mk) mk.until = 0; } };
  }
  pig() {
    const g = this.game, fb = g.buildings.list.find((b) => b.state === 'done' && ['farm', 'allotment', 'stables'].includes(b.id)); if (!fb) return null; g.flags.pigDay = g.clock.totalDays;
    const p = { x: fb.doorOut.x, z: fb.doorOut.z + 3 }, pig = new THREE.Group(), legs = [];   // it gets out of the farm, wherever Sam happens to be
    const b = (w, h, d, x, y, z, c = 0xf2a8b0) => { const m = new THREE.Mesh(BOX, stdMat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; pig.add(m); return m; };
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
  /**
   * The documentary (once): a presenter, a camera operator and a sound recordist from Pennine Television come down the
   * Lift, film a piece to camera in the street, then come and find Sam for an interview (a cutscene where Sam picks the
   * answers), and the presenter signs off to camera. It goes out a couple of nights later, and the town's on the telly.
   */
  documentary() {
    const g = this.game, P = g.player, u = Math.random() < 0.5 ? 'f' : 'm'; let p = this.spot(26); for (let k = 0; k < 12 && Math.hypot(p.x - P.x, p.z - P.z) < 12; k++) p = this.spot(26);   // (along the street from Sam, not on top of him)
    const [pre] = this.extras(p, 1, { gender: u, shirt: u === 'f' ? 0x8a2a3a : 0x2a3a5a, longSleeve: true, pants: 0x2a2a30, hat: null, dialect: null }, 2), [cam] = this.extras(p, 1, { shirt: 0x3a4a3a, longSleeve: true, hat: { type: 'cap', color: 0x1a1a1a }, dialect: null }, 2), [snd] = this.extras(p, 1, { shirt: 0x6a5a48, hat: { type: 'phones' }, dialect: null }, 2);
    const crew = [pre, cam, snd], st = { phase: 'arrive', t: 0, wait: 0, line: 0, lineT: 2, ans: [], tries: 0 }; cam.crewPose = 'tvcam'; pre.jobTitle = 'TV presenter'; cam.jobTitle = 'Camera operator'; snd.jobTitle = 'Sound recordist';
    this.say(`📺 A documentary crew from Pennine Television has come down the Lift: ${pre.name} and a camera crew. They're making a programme about the town, and they want a word with Sam.`, 'info', true); this.mark(pre, '🎥', 'Documentary crew', 600, pre);
    const say = (s, t, d = 3.4) => { if (s.mesh.visible) g.social.say(s, t, d); }, face = (s, x, z) => { s.faceGoal = Math.atan2(x - s.x, z - s.z); }, free = (x, z) => { const w = g.world, [tx, tz] = w.tileOf(x, z); return w.inBounds(tx, tz) && w.isLand(tx, tz) && !w.buildingAt(tx, tz) && !w.collides(x, z, 0.35); };
    const stand = (s, x, z, fx, fz) => { s.path = []; s.dest = null; s.glide = null; s.x = x; s.z = z; s.vel = 0; s.heading = Math.atan2(fx - x, fz - z); s.faceGoal = s.heading; };
    const pop = g.population.count(), homes = g.buildings.list.filter((b) => b.state === 'done' && b.def.cat === 'res').length, pubs = ['tavern', 'local', 'irish', 'wmc'].reduce((n, id) => n + g.buildings.count(id), 0), hr = g.clock.hour;
    const PIECE = [`Good ${hr < 12 ? 'morning' : 'afternoon'} from Sam City. A year ago, this was an empty field.`, `Today it's home to ${pop} people, ${homes} homes and ${pubs ? pubs + (pubs > 1 ? ' pubs' : ' pub') : 'not a single pub. Yet'}.`, 'And it all started with one man and a spade. His name is Sam.', 'Nobody seems quite sure where he came from. So we\'ve come to ask him.'];
    // the piece to camera: the presenter in the street, the camera three paces off, the boom over her head, people waving behind
    const setUp = () => {
      let a = Math.random() * Math.PI * 2; for (let k = 0; k < 12; k++, a += Math.PI / 6) { const cx = pre.x + Math.sin(a) * 3.2, cz = pre.z + Math.cos(a) * 3.2, sx = pre.x + Math.sin(a + Math.PI / 2) * 2, sz = pre.z + Math.cos(a + Math.PI / 2) * 2; if (free(cx, cz) && free(sx, sz)) break; }
      st.camAt = { x: pre.x + Math.sin(a) * 3.2, z: pre.z + Math.cos(a) * 3.2 }; st.sndAt = { x: pre.x + Math.sin(a + Math.PI / 2) * 2, z: pre.z + Math.cos(a + Math.PI / 2) * 2 }; st.preAt = { x: pre.x, z: pre.z };
      cam.goTo({ x: st.camAt.x, z: st.camAt.z }); snd.goTo({ x: st.sndAt.x, z: st.sndAt.z }); pre.path = []; pre.dest = null;
      for (const s of this.near(pre.x, pre.z, 30).filter((q) => (q.kind === 'resident' || q.kind === 'child') && q.activity !== 'work').slice(0, 4)) { const b = 3.5 + Math.random() * 2, l = (Math.random() - 0.5) * 4, x = pre.x - Math.sin(a) * b + Math.cos(a) * l, z = pre.z - Math.cos(a) * b - Math.sin(a) * l; if (free(x, z)) { s.goTo({ x, z, face: a }); s.emote = { upper: 'wave', t: 8 + Math.random() * 6 }; } }   // (onlookers, waving at the camera behind her)
    };
    const ready = () => !g.cutscene.live && !(g.introScene && g.introScene.live) && !g.ui.dialogue && !g.ui.modalOpen && !g.ui.terminalB && g.mode === 'sim' && !P.mounted && !P.ride && !P.transit && !P.sleeping && !(P.sedated > 0) && !(P.down > 0) && !P.dead && !g.buildings.playerInside && !(g.raids && g.raids.state === 'active');
    const h = { kind: 'documentary', st, crew, update: (dt) => {
      dt *= Math.min(1, Math.max(0, g.clock.speed)); st.t += dt; if (crew.some((s) => s.remove)) { st.phase = 'gone'; return; }
      if (st.phase === 'arrive') { st.wait += dt; if (!this.arrived(crew, p, 5, st.wait) && !(st.wait > 30 && Math.hypot(pre.x - p.x, pre.z - p.z) < 6)) return; st.phase = 'setup'; st.t = 0; setUp(); return; }   // (a straggler catches up in the set-up)
      if (st.phase === 'setup') { if (st.t < 8 && (cam.path.length || snd.path.length)) return; stand(cam, cam.x, cam.z, pre.x, pre.z); stand(snd, snd.x, snd.z, pre.x, pre.z); face(pre, cam.x, cam.z); pre.heading = pre.faceGoal; snd.crewPose = 'boom'; pre.crewPose = 'mic'; pre.eyeOn = cam; st.phase = 'piece'; st.t = 0; st.line = 0; st.lineT = 1.5; say(cam, 'Rolling... and... go.', 2); return; }
      if (st.phase === 'piece') {
        face(pre, cam.x, cam.z); face(cam, pre.x, pre.z); face(snd, pre.x, pre.z);
        if ((st.lineT -= dt) <= 0) { if (st.line < PIECE.length) { say(pre, PIECE[st.line++], 3.6); st.lineT = 4; } else { say(cam, 'Lovely. That\'s the one. Let\'s find Sam.', 2.6); pre.crewPose = null; pre.eyeOn = null; snd.crewPose = null; st.phase = 'find'; st.t = 0; st.tries = 0; } }
        return;
      }
      if (st.phase === 'find') {
        if (st.t > 300) { st.phase = 'gone'; g.flags.docMissed = g.clock.totalDays; this.say('📺 The documentary crew couldn\'t find Sam and went back up the Lift. (They\'ll use the footage of the bins.)'); return; }
        const d = Math.hypot(P.x - pre.x, P.z - pre.z);
        if ((st.lineT -= dt) <= 0) { st.lineT = 2.5; if (g.buildings.playerInside) { pre.path = []; if (st.tries++ % 6 === 0) say(pre, 'We\'ll wait for Sam out here.', 2.4); } else if (d > 2.6) pre.goTo({ x: P.x + (pre.x - P.x) / d * 1.4, z: P.z + (pre.z - P.z) / d * 1.4 });
          for (const [s, o] of [[cam, 1.6], [snd, -1.6]]) { const hx = pre.x - Math.sin(pre.heading) * 1.8 + Math.cos(pre.heading) * o, hz = pre.z - Math.cos(pre.heading) * 1.8 - Math.sin(pre.heading) * o; if (Math.hypot(s.x - hx, s.z - hz) > 2.5) s.goTo({ x: hx, z: hz }); } }   // (the crew trail along behind)
        if (d < 9 && d > 3.5 && !st.called) { st.called = true; say(pre, 'Sam! Sam! Have you got a minute? Pennine Television!', 3); pre.emote = { upper: 'wave', t: 2 }; }
        if (d < 3.6 && ready()) { st.phase = 'interview'; this.interview(crew, st); }
        return;
      }
      if (st.phase === 'wrap') { if (st.t > 6) { st.phase = 'gone'; } }
    }, get done() { return st.phase === 'gone'; }, end: () => { for (const s of crew) { s.crewPose = null; s.eyeOn = null; g.population.depart(s); } if (g.player.onCamera) g.player.onCamera = false; } };
    return h;
  }
  /** The interview itself: Sam's answers, the presenter's sign-off to camera, and a wrap. */
  interview([pre, cam, snd], st) {
    const g = this.game, P = g.player, w = g.world, free = (x, z) => { const [tx, tz] = w.tileOf(x, z); return w.inBounds(tx, tz) && w.isLand(tx, tz) && !w.buildingAt(tx, tz) && !w.collides(x, z, 0.35); };
    // where everyone stands: the presenter a pace from Sam, the camera off to one side, the boom op beside it (out of shot)
    let a = Math.atan2(pre.x - P.x, pre.z - P.z), L = null;
    for (let k = 0; k < 16 && !L; k++) { const b = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8), fx = Math.sin(b), fz = Math.cos(b), sx = -fz, sz = fx, mx = P.x + fx * 0.65, mz = P.z + fz * 0.65;
      for (const sd of [1, -1]) { const q = { fx, fz, sx: sx * sd, sz: sz * sd, mx, mz, px: P.x + fx * 1.3, pz: P.z + fz * 1.3, cx: mx + sx * sd * 3, cz: mz + sz * sd * 3, ox: mx + sx * sd * 2.1 + fx * 1.7, oz: mz + sz * sd * 2.1 + fz * 1.7 }; if (free(q.px, q.pz) && free(q.cx, q.cz) && free(q.ox, q.oz)) { L = q; break; } } }
    if (!L) { const fx = Math.sin(a), fz = Math.cos(a), mx = P.x + fx * 0.65, mz = P.z + fz * 0.65; L = { fx, fz, sx: -fz, sz: fx, mx, mz, px: P.x + fx * 1.3, pz: P.z + fz * 1.3, cx: mx - fz * 3, cz: mz + fx * 3, ox: mx - fz * 2.1 + fx * 1.7, oz: mz + fx * 2.1 + fz * 1.7 }; }
    const stand = (s, x, z, tx, tz) => { s.path = []; s.dest = null; s.glide = null; s.x = x; s.z = z; s.vel = 0; s.heading = Math.atan2(tx - x, tz - z); s.faceGoal = s.heading; };
    const place = () => { stand(pre, L.px, L.pz, P.x, P.z); pre.eyeOn = P; cam.eyeOn = { x: L.mx, z: L.mz, y: 1.6 }; snd.eyeOn = pre; stand(cam, L.cx, L.cz, L.mx, L.mz); stand(snd, L.ox, L.oz, pre.x, pre.z); P.heading = Math.atan2(pre.x - P.x, pre.z - P.z); P.yaw = P.heading + Math.PI; P.speed = 0; P.vx = P.vz = 0; P.onCamera = true; cam.crewPose = 'tvcam'; snd.crewPose = 'boom'; pre.crewPose = 'mic'; };
    const head = (x, z, y = 1.68) => [x, y, z], dcx = L.mx - L.cx, dcz = L.mz - L.cz, dn = Math.hypot(dcx, dcz) || 1, lens = (k = 0.75) => [L.cx + dcx / dn * k, 1.75, L.cz + dcz / dn * k];
    const ots = (a, b, sd) => ({ pos: [a.x - (b.x - a.x) * 1.55 + L.sx * sd, 1.92, a.z - (b.z - a.z) * 1.55 + L.sz * sd], look: head(b.x, b.z, 1.6), fov: 36 });   // over one shoulder onto the other face
    const viewfinder = (fov = 44) => () => ({ pos: lens(), look: head(L.mx, L.mz, 1.5), fov }), onSam = () => ots(pre, P, 1.3), onPre = () => ots(P, pre, 1.05);
    const ans = st.ans, who = pre.name, shots = [];
    shots.push({ dur: 4.5, cut: true, title: 'Britain\'s Newest Town', text: 'Pennine Television, on location in Sam City', at: place, cam: (t) => ({ pos: [L.cx + (L.cx - L.mx) * 0.9 + L.fx * 1.5, 2.3 - t * 0.05, L.cz + (L.cz - L.mz) * 0.9 + L.fz * 1.5], look: head(L.mx, L.mz, 1.25), fov: 50 }) });
    DOC_Q.forEach((Q, i) => {
      shots.push({ dur: 6, rec: true, cut: true, snap: true, cam: viewfinder(), at: () => { pre.crewPose = 'mic'; },
        ask: { who, q: Q.q, opts: Q.a.map(([t, , tag]) => ({ t, on: () => { ans[i] = { t, tag, k: Q.a.findIndex((x) => x[0] === t) }; pre.crewPose = 'micout'; } })) } });
      shots.push({ dur: 3.6, cut: true, say: () => ['Sam', '"' + (ans[i] ? ans[i].t : Q.a[0][0]) + '"'], cam: onSam, at: () => { pre.crewPose = 'micout'; st.samTalk = true; } });
      shots.push({ dur: 4.2, cut: true, say: () => [who, Q.a[ans[i] ? ans[i].k : 0][1].replace('(She', pre.gender === 'f' ? '(She' : '(He')], cam: onPre, at: () => { pre.crewPose = 'mic'; st.samTalk = false; } });
    });
    // the sign-off: she turns to the camera
    shots.push({ dur: 6.5, rec: true, cut: true, snap: true, say: () => [who, `"So there you have it: Sam City, ${DOC_SIGN[(ans[0] && ans[0].tag) || 'modest']}. For Pennine Television, I'm ${pre.name}. Goodnight."`], cam: () => ({ pos: lens(0.8), look: head(pre.x, pre.z, 1.62), fov: 30 }), at: () => { st.samTalk = false; pre.crewPose = 'mic'; pre.heading = pre.faceGoal = Math.atan2(cam.x - pre.x, cam.z - pre.z); pre.eyeOn = { x: cam.x, z: cam.z, y: 1.7 }; } });
    shots.push({ dur: 3.4, cut: true, say: () => [cam.name, '"And... cut! That\'s a wrap, everybody. Thanks, Sam."'], cam: (t) => ({ pos: [L.mx - L.sx * 5 + L.fx * 2.5, 2.2, L.mz - L.sz * 5 + L.fz * 2.5], look: head(L.mx, L.mz, 1.2), fov: 48 }), at: () => { cam.crewPose = null; snd.crewPose = null; pre.crewPose = null; pre.eyeOn = null; cam.emote = { upper: 'thumbsup', t: 2.5 }; pre.emote = { upper: 'wave', t: 2 }; } });
    g.cutscene.play({ shots, tick: (dt) => { for (const s of [pre, cam, snd]) { s.path = []; s.vel = 0; } P.speed = 0; P.moved = false; P.emoteName = 'talk'; P.emoteT = st.samTalk ? 0.3 : 0; P.syncMesh(dt); },
      onEnd: () => { P.onCamera = false; for (const s of [pre, cam, snd]) s.eyeOn = null; P.emoteT = 0; st.phase = 'wrap'; st.t = 0; this.aired(ans); } });
  }
  /** After the interview: the letter from the producer, and the night it goes out. */
  aired(ans) {
    const g = this.game, c = g.clock, tags = ans.map((a) => a && a.tag), odd = tags.filter((t) => t === 'odd').length, day = WEEKDAY[(c.weekday + 2) % 7];
    g.flags.docDone = c.totalDays; g.flags.docAir = c.totalDays + 2; g.flags.docOdd = odd; g.flags.docTags = tags; if (tags[2] === 'odd') g.flags.docTower = true;
    for (const s of g.population.residents()) s.moodBoost += tags[0] === 'modest' ? 0.15 : 0.06;
    if (tags[0] === 'vision') g.population.invites += 3;
    g.mail.send('Pennine Television', 'Britain\'s Newest Town', `Dear Sam,\n\nThank you for giving us your time. Everybody at Pennine thought you were a natural.\n\nThe programme goes out this ${day} at 9 o'clock. Do tell the whole town to watch!\n\nBest wishes,\nThe Britain's Newest Town team`);
    g.messages.push('Pennine Television', `That's a wrap! The documentary goes out on ${day} night at 9 o'clock.`, 'quiet');
  }
  /** The night it's on: half the town watches, the other half hears about it in the pub. */
  airCheck() {
    const g = this.game, f = g.flags, c = g.clock; if (!f.docAir || f.docAired || c.totalDays < f.docAir || (c.totalDays === f.docAir && c.hour < 21)) return;
    f.docAired = c.totalDays; f.tellyTill = c.totalDays + 10; const tags = f.docTags || [];
    g.messages.push('Town news', '📺 Sam City is on the telly tonight: "Britain\'s Newest Town", on Pennine Television. Half the town\'s crowded round a set somewhere.', 'info'); g.ui.toast('📺 Sam City is on the telly tonight!', 3600);
    for (const s of g.population.residents()) s.moodBoost += 0.1; g.population.invites += tags.includes('tourist') ? 3 : 1;
  }
  /** The morning after, if Sam said odd things on the telly: a letter with no name on it (somebody else has been wondering too). */
  viewerCheck() {
    const g = this.game, f = g.flags, c = g.clock; if (!f.docAired || f.docViewer || (f.docOdd || 0) < 2 || c.totalDays <= f.docAired || c.hour < 8) return; f.docViewer = c.totalDays;
    g.mail.send('A viewer', 'I saw your programme', 'Sam,\n\nI watched you on the television last night. You asked the right questions. Where does the Lift go? What is above the clouds?\n\nKeep asking. Just don\'t ask out loud.\n\nA friend');
  }
  /** People who appear for a happening and go when it's over (they never wander off on their own). */
  /** Visiting performers: they come down the Lift and walk to the spot (call arrived() before starting the show). */
  extras(p, n, look, spread = 3) { const g = this.game, out = []; for (let i = 0; i < n; i++) { const P = g.population.makePerson({ kind: 'visitor', gender: look.gender || (Math.random() < 0.5 ? 'm' : 'f') }), o = { name: P.name, first: P.first, surname: P.surname, kind: 'guest', trait: 'cheerful', look: { ...P.look, ...look }, gender: P.gender, age: P.age }; const s = g.lift ? g.population.spawnAtLift(o) : g.population.spawnAt(p.x, p.z, o); s.goTo({ x: p.x + (Math.random() - 0.5) * spread, z: p.z + (Math.random() - 0.5) * spread }); out.push(s); } return out; }
  /** Have they all got there (or given up trying after a minute and a half)? */
  arrived(list, p, r, t) { return t > 90 || list.every((s) => s.remove || Math.hypot(s.x - p.x, s.z - p.z) < r); }
  // Morris dancers: white, bells, hankies, sticks, a melodeon, and an awful lot of hopping
  morris() {
    const g = this.game, p = this.spot(), men = this.extras(p, 6, { gender: 'm', shirt: 0xf4f4f0, pants: 0xf4f4f0, shirt2: 0xd8342c, hat: { type: 'bowler', color: 0x1a1a1a } }, 0); g.flags.morrisDay = g.clock.totalDays; g.flags.morrisN = (g.flags.morrisN || 0) + 1;
    this.say('Morris dancers in the street! Bells, hankies and sticks. Mind your shins.'); this.mark(p, '🔔', 'Morris dancers', 90); this.gather(p, 35, 8, 'clap');
    // hankies in both hands and bells on their shins
    const hk = new THREE.BoxGeometry(0.2, 0.02, 0.26), bl = new THREE.BoxGeometry(0.16, 0.06, 0.18), white = stdMat(0xffffff), gold = stdMat(0xe8c040);
    for (const s of men) { const r = s.rig; if (!r) continue; for (const h of [r.armL.hand, r.armR.hand]) { const m = new THREE.Mesh(hk, white); m.position.set(0, -0.14, 0.04); h.add(m); } for (const k of [r.legL.kn, r.legR.kn]) { const m = new THREE.Mesh(bl, gold); m.position.set(0, -0.12, 0.02); k.add(m); } }
    // the dance: two lines face each other, advance and retire with a hop-step, and cross over every four bars
    let t = 0, ring = 0, lastCross = 0, wait = 0, on = false;
    return { update: (dt) => { if (!on) { wait += dt; if (!this.arrived(men, p, 4, wait)) return; on = true; for (const s of men) { s.path.length = 0; s.dest = null; if (Math.hypot(s.x - p.x, s.z - p.z) > 9) { s.x = p.x; s.z = p.z; } } } t += dt; const bar = t / 1.8, cross = Math.floor(bar / 4) % 2;   // (a straggler who got stuck joins in, rather than wandering about)
      men.forEach((s, i) => { if (s.path.length) { s.path.length = 0; s.dest = null; } const side = (i % 2 ? 1 : -1) * (cross ? -1 : 1), row = Math.floor(i / 2), inward = (0.5 - 0.5 * Math.cos(bar * Math.PI * 2)) * 0.8;   // (a route would stop him being placed in the line)
        s.glide = { x: p.x + side * (1.3 - inward), z: p.z - 2.5 + row * 2.5 }; s.heading = side > 0 ? -Math.PI / 2 : Math.PI / 2; s.faceGoal = s.heading; s.emote = { upper: 'morris', t: 0.5 }; });
      const near = g.mode === 'sim' && Math.hypot(g.player.x - p.x, g.player.z - p.z) < 30;
      if (near && (ring -= dt) <= 0) { ring = 0.22; Sfx.tone(1568 + Math.random() * 500, 0.05, { type: 'sine', vol: 0.025 }); if (Math.random() < 0.25) Sfx.tone(392 + Math.random() * 200, 0.3, { type: 'triangle', vol: 0.03 }); }   // bells, and the melodeon
      if (cross !== lastCross) { lastCross = cross; if (near) Sfx.noise(0.05, { freq: 1800, vol: 0.06, type: 'bandpass' }); g.social.say(pick(men), pick(['Hey!', 'Hup!', 'And across!', 'Mind the sticks!']), 1.4); }   // the sticks clack as they cross
    }, get done() { return t > 70; }, end: () => { for (const s of men) g.population.depart(s); } };
  }
  // a street party: trestle tables down the road, bunting, sausage rolls and trifle
  streetparty() {
    const g = this.game, p = this.spot(25), grp = new THREE.Group(), b = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(BOX, stdMat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); grp.add(m); return m; };
    g.flags.partyDay = true; setTimeout(() => { g.flags.partyDay = false; }, 600000);
    for (let i = -1; i <= 1; i++) { b(1.0, 0.06, 3.0, 0xf8f8f8, 0, 0.78, i * 3.4); for (const x of [-0.4, 0.4]) for (const z of [-1.3, 1.3]) b(0.06, 0.78, 0.06, 0x6a5040, x, 0.39, i * 3.4 + z); for (let k = 0; k < 6; k++) b(0.2, 0.1, 0.2, [0xd8342c, 0xf2c94c, 0xe07fa0, 0x8a5a2a][k % 4], (k % 2 ? 0.25 : -0.25), 0.86, i * 3.4 - 1.1 + k * 0.45); }
    for (const sx of [-2.2, 2.2]) b(0.08, 3.4, 0.08, 0x8a8a8a, sx, 1.7, -5.5); for (let k = 0; k < 18; k++) b(0.18, 0.22, 0.02, [0xd8342c, 0xffffff, 0x2a4aa8][k % 3], -2.1 + k * 0.25, 3.1 - Math.sin(k / 17 * Math.PI) * 0.5, -5.5);
    grp.position.set(p.x, 0, p.z); g.scene.add(grp);
    this.say('A street party! Trestle tables, bunting, and a trifle the size of a car tyre.'); this.mark(p, '🎉', 'Street party', 150); this.gather(p, 50, 16, 'cheer');
    let t = 0, ch = 0;
    return { update: (dt) => { t += dt; ch -= dt; if (ch <= 0) { ch = 2.5; const s = pick(this.near(p.x, p.z, 9)); if (s) { g.social.say(s, pick(['Pass the sausage rolls!', 'Who made the trifle? It\'s lethal.', 'Three cheers for... whoever organised this!', 'Is that Shakin\' Stevens on the radio?', 'Another bit of Battenberg?', 'Lovely do, this.']), 2.4); s.emote = { upper: pick(['cheer', 'dance', 'clap']), t: 2 }; } } }, get done() { return t > 140; }, end: () => g.scene.remove(grp) };
  }
  /** Someone for a happening, standing right here (a stallholder getting out of their car, say). */
  guest(x, z, look = {}) { const g = this.game, P = g.population.makePerson({ kind: 'visitor', gender: look.gender || (Math.random() < 0.5 ? 'm' : 'f') }); return g.population.spawnAt(x, z, { name: P.name, first: P.first, surname: P.surname, kind: 'guest', trait: 'cheerful', look: { ...P.look, ...look }, gender: P.gender, age: P.age }); }
  // a car boot sale on a Sunday morning: the sellers drive up from the Lift, open their boots, set out pasting tables of tat,
  // and pack up and drive off again at lunchtime. On the plaza or in a park (never the cricket pitch), or a quiet street.
  carboot() {
    const g = this.game, site = ['plaza', 'park'].map((k) => g.buildings.list.find((b) => b.state === 'done' && b.def.park === k)).find(Boolean) || null;
    const p = site ? { x: site.cx, z: site.cz } : this.street(); if (!p) return null; const route = this.roadFromLift(site && site.doorOut ? site.doorOut : p); if (!route) return null;
    const rot = site ? site.rot * Math.PI / 2 : 0, cs = Math.cos(rot), sn = Math.sin(rot), at = (lx, lz) => ({ x: p.x + lx * cs + lz * sn, z: p.z - lx * sn + lz * cs });
    const box = (grp, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(BOX, stdMat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); grp.add(m); };
    // no cars in town yet (before the power comes): the sellers push barrows of bric-a-brac up from the Lift instead
    const motor = !g.tech || g.tech.era >= 1, barrow = (i) => { const c = makeCart(1); for (let k = 0; k < 4; k++) box(c, 0.28, 0.18 + (k % 2) * 0.12, 0.26, [0x8a6a4a, 0xd8342c, 0xf2c94c, 0x2a6aa8][(k + i) % 4], -0.22 + (k % 2) * 0.44, 0.64, -0.3 + Math.floor(k / 2) * 0.5); return c; };
    const push = (c) => { if (motor) return; let s = c.pusher; if (!s || s.remove) { s = c.pusher = this.guest(c.mesh.position.x, c.mesh.position.z); } const h = c.mesh.rotation.y; s.path.length = 0; s.glide = { x: c.mesh.position.x - Math.sin(h) * 1.05, z: c.mesh.position.z - Math.cos(h) * 1.05 }; s.heading = s.faceGoal = h; s.emote = { upper: 'pull', t: 0.4 }; };   // (walking behind it)
    const cars = [0, 1, 2, 3].map((i) => {
      const lx = (i - 1.5) * 3.2, slot = at(lx, -1.6), mesh = motor ? makeCarMesh(pick([0xc0392b, 0x2980b9, 0x7f8c8d, 0x27ae60, 0xecf0f1, 0x8e44ad])) : barrow(i), stall = new THREE.Group();
      box(stall, 1.8, 0.05, 0.7, 0xe8e2d0, 0, 0.75, 0); for (const x of [-0.8, 0.8]) box(stall, 0.05, 0.75, 0.6, 0x8a8a8a, x, 0.37, 0);
      for (let k = 0; k < 5; k++) box(stall, 0.25, 0.15 + (k % 3) * 0.1, 0.22, [0x8a6a4a, 0x2a2a2a, 0xd8342c, 0xf2c94c, 0x9a9a9a][(k + i) % 5], -0.7 + k * 0.35, 0.85, 0);
      const sp = at(lx, 1.0); stall.position.set(sp.x, 0, sp.z); stall.rotation.y = rot; stall.visible = false; g.scene.add(stall);
      mesh.position.set(route[0].x, 0, route[0].z); mesh.visible = false; g.scene.add(mesh);
      return { mesh, stall, slot, path: route.slice(1).concat([slot]), speed: motor ? 5 : 1.7, wait: i * (motor ? 3 : 4), parked: false, seller: null, back: null, gone: false };
    });
    const mk = this.mark(p, '🧺', motor ? 'Car boot sale' : 'Boot sale', 600); this.say(motor ? `🧺 A car boot sale${site ? ` on the ${site.def.name}` : ''} this morning! The sellers are on their way up the Lift.` : `🧺 A boot sale${site ? ` on the ${site.def.name}` : ''} this morning! The sellers are pushing their barrows up from the Lift.`);
    const lines = ['How much for the foot spa?', 'Fifty pence? Go on then.', 'I\'ve got this exact toaster already.', 'Is the Betamax player working?', 'Two quid for the lot.', 'A Soda Stream! I\'ve always wanted one.'];
    let stage = 'in', t = 0, ch = 0;
    const shop = { x: p.x, z: p.z, text: 'Have a rummage at the car boot sale', act: () => { const c = cars.find((q) => q.seller && !q.seller.remove); g.ui.openShop({ def: { id: 'carboot', name: 'The car boot sale' } }, c && c.seller, SHOP_GOODS.carboot); } };
    return { update: (dt) => { const gdt = dt * Math.max(0, g.clock.speed); if (!gdt) return; t += gdt;
      for (const c of cars) {
        if (c.gone) continue; if (c.wait > 0) { c.wait -= gdt; continue; } c.mesh.visible = true;
        if (stage === 'in' && !c.parked) { const there = this.drive(c, gdt); push(c); if (there) { c.parked = true; c.mesh.rotation.y = rot + Math.PI / 2; c.setT = 2.5; } }
        if (c.parked && c.setT > 0 && (c.setT -= gdt) <= 0) { c.stall.visible = true; const sp = at((cars.indexOf(c) - 1.5) * 3.2 + 1.1, 0.2); c.seller = c.pusher && !c.pusher.remove ? c.pusher : this.guest(sp.x, sp.z); c.pusher = null; c.seller.goTo({ x: sp.x, z: sp.z }); c.seller.faceGoal = rot; }   // out of the car (or from behind the barrow), and the table comes out
        if (stage === 'out' && c.back) { if (!c.pack) { const s = c.seller; if (!s || s.remove || Math.hypot(s.x - c.slot.x, s.z - c.slot.z) < 1.6 || (c.packT = (c.packT || 0) + gdt) > 10) { if (s && !s.remove) { if (motor) s.remove = true; else c.pusher = s; } c.stall.visible = false; c.pack = true; } else if (!s.path.length) s.goTo({ x: c.slot.x, z: c.slot.z }); } else { const home = this.drive({ mesh: c.mesh, path: c.back, speed: motor ? 5 : 1.7 }, gdt); push(c); if (home) { c.gone = true; g.scene.remove(c.mesh); g.scene.remove(c.stall); if (c.pusher) { c.pusher.remove = true; c.pusher = null; } } } }
      }
      if (stage === 'in' && cars.every((c) => c.parked && c.stall.visible)) { stage = 'sale'; t = 0; this.gather(p, 50, 12, null); }
      if (stage === 'sale') { const near = cars.some((c) => g.mode === 'sim' && Math.hypot(g.player.x - c.stall.position.x, g.player.z - c.stall.position.z) < 2.4); if (near) { const c = cars.reduce((a, q) => (Math.hypot(g.player.x - q.stall.position.x, g.player.z - q.stall.position.z) < Math.hypot(g.player.x - a.stall.position.x, g.player.z - a.stall.position.z) ? q : a)); shop.x = c.stall.position.x; shop.z = c.stall.position.z; this.offer(shop); } else this.withdraw(shop);
        ch -= gdt; if (ch <= 0) { ch = 3; const s = pick(this.near(p.x, p.z, 10).filter((q) => q.kind !== 'guest')); if (s) g.social.say(s, pick(lines), 2.4); }
        if (t > 260) { stage = 'out'; this.withdraw(shop); this.say('The car boot sale is packing up.'); for (const c of cars) c.back = [c.slot, ...route.slice().reverse()]; } }
      if (t > 900 && stage !== 'out') { stage = 'out'; for (const c of cars) c.back = [...route.slice().reverse()]; }   // stuck somewhere: give up and go home
    }, get done() { return cars.every((c) => c.gone); }, end: () => { this.withdraw(shop); for (const c of cars) { g.scene.remove(c.mesh); g.scene.remove(c.stall); if (c.seller && !c.seller.remove) c.seller.remove = true; if (c.pusher && !c.pusher.remove) c.pusher.remove = true; } if (mk) mk.until = 0; } };
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
    if (path.length < 2) return null; const fl = new THREE.Group(), b = (wd, h, d, c, x, y, z) => { const m = new THREE.Mesh(BOX, stdMat(c)); m.scale.set(wd, h, d); m.position.set(x, y, z); fl.add(m); };
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
    return { update: (dt) => { t += dt; if (Math.random() < dt * 2) { const a = pick(kids), b = pick(kids); if (a !== b) { a.faceGoal = Math.atan2(b.x - a.x, b.z - a.z); a.emote = { upper: 'punch', t: 0.4 }; g.particles.burst(b.x, 1.4, b.z, 0xffffff, 6, 1.5, 2, 0.08); if (Math.random() < 0.4 && b.mesh.visible) g.social.say(b, pick(['Oi!', 'Got you!', 'Missed me!', 'Right down my neck!']), 1.4); } } }, get done() { return t > 50 || !(g.seasons && g.seasons.snow > 0.2); } };   // (and it's over once the snow's gone)
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
    for (const h of [this.target, ...(this.offers || [])]) if (h && Math.hypot(h.x - P.x, h.z - P.z) < (h.r || 2.2)) consider({ kind: 'act', text: h.text, act: h.act }, 0.1, undefined, undefined, [h.x, h.z]);
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
