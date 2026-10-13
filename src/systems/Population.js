import { ROLES } from '../data/buildings.js';
import { MALE, FEMALE, SURNAMES, SKINS, HAIRS, GREY_HAIRS, TOPS_M, TOPS_F, PANTS, TRAITS, BUILDS, ADULT_BUILD_WEIGHTS, YOUNG_F_BUILD_WEIGHTS, pickSkin } from '../data/people.js';
import { HAIR_STYLES_M, HAIR_STYLES_F } from '../render/SimRig.js';
import { Sim } from '../sim/Sim.js';
import { pick, clamp } from '../util.js';
import { MAX_SIMS_HARD, MIN_SIMS } from '../config.js';

/** Owns every NPC: arrival via the Lift, housing, jobs, visitors, and the performance-driven population cap. */
export class Population {
  constructor(game) {
    this.game = game; this.sims = []; this.simCap = MAX_SIMS_HARD; this.timer = 8; this.visitorTimer = 30; this.invites = 0; this.fpsEma = 60; this.capTimer = 4; this.names = new Set();
    const w = game.world.events;
    w.on('building:done', (b) => this.onBuildingDone(b));
    w.on('building:removed', (b) => this.onBuildingRemoved(b));
    game.clock.on('day', () => this.dailyTick()); game.clock.on('hour', () => { game.economy.hourly(); if (game.tech) game.tech.hourly(); });
  }
  residents() { return this.sims.filter((s) => (s.kind === 'resident' || s.kind === 'child') && !s.remove); }
  adults() { return this.sims.filter((s) => s.kind === 'resident' && !s.remove); }
  count() { return this.residents().length; }
  employed() { return this.residents().filter((s) => s.workplace).length; }
  canWork(s) { return s.kind === 'resident' && s.age >= 18 && s.age < 66; }
  freeBeds() { let n = 0; for (const b of this.game.buildings.list) if (b.state === 'done' && b.def.beds) n += b.def.beds - b.residents.length - (b.reservedForPlayer ? 1 : 0); return Math.max(0, n); }
  vacancies() { const out = []; for (const b of this.game.buildings.list) { if (b.state !== 'done' || !b.def.jobs) continue; for (const [r, n] of Object.entries(b.def.jobs)) { const have = b.workers.filter((s) => s.role === r).length; for (let i = have; i < n; i++) out.push({ b, role: r }); } } return out; }

  uniqueName(gender) { const pool = gender === 'f' ? FEMALE : MALE; for (let i = 0; i < 60; i++) { const f = pick(pool), l = pick(SURNAMES), n = f + ' ' + l; if (!this.names.has(n)) { this.names.add(n); return { first: f, last: l, name: n }; } } const f = pick(pool), l = pick(SURNAMES); return { first: f, last: l, name: f + ' ' + l }; }
  weighted(list) { let t = list.reduce((a, [, w]) => a + w, 0), r = Math.random() * t; for (const [k, w] of list) { if ((r -= w) < 0) return k; } return list[0][0]; }
  /** A full English citizen: gender, age, body, face, hair, clothes (role uniforms override). */
  makePerson({ role = null, kind = 'resident', gender = null, age = null, surname = null } = {}) {
    const rnd = Math.random, g = gender || (rnd() < 0.5 ? 'f' : 'm');
    const a = age ?? (kind === 'visitor' ? 20 + Math.floor(rnd() * 40) : (rnd() < 0.12 ? 62 + Math.floor(rnd() * 16) : 19 + Math.floor(rnd() * 41)));
    const child = a < 16, elder = a >= 62;
    const buildName = child ? 'child' : elder ? 'elderly' : this.weighted(g === 'f' && a < 42 ? YOUNG_F_BUILD_WEIGHTS : ADULT_BUILD_WEIGHTS), bd = BUILDS[buildName];
    const r = role && ROLES[role], tops = g === 'f' ? TOPS_F : TOPS_M;
    const L = {
      gender: g, buildName, body: bd.body, h: bd.h * (0.97 + rnd() * 0.06), w: bd.w * (0.97 + rnd() * 0.06), skin: pickSkin(rnd), hair: elder ? pick(GREY_HAIRS) : pick(HAIRS),
      hairStyle: pick(g === 'f' ? HAIR_STYLES_F : HAIR_STYLES_M), shirt: r && r.shirt ? r.shirt : (child ? pick([0xe05a4a, 0x4a9ad0, 0xf0c040, 0x6ab04a, 0xd070b0]) : pick(tops)), pants: r && r.pants ? r.pants : pick(PANTS),
      longSleeve: rnd() < 0.5, shorts: false, skirt: false, dress: false, glasses: rnd() < (elder ? 0.45 : 0.18), backpack: false, hat: null, accessory: null, facial: null, cane: elder && rnd() < 0.4,
    };
    if (g === 'm' && !child) { if (elder && rnd() < 0.35) L.hairStyle = 'bald'; else if (!elder && rnd() < 0.08) L.hairStyle = 'bald'; const f = rnd(); L.facial = f < 0.16 ? 'beard' : f < 0.3 ? 'stubble' : f < 0.4 ? 'moustache' : null; }
    if (g === 'f' && !r) { const c = rnd(); if (c < 0.3) L.dress = true; else if (c < 0.5) L.skirt = true; }
    if (child) { L.shorts = g === 'm' || rnd() < 0.3; L.dress = g === 'f' && rnd() < 0.5; L.longSleeve = false; }
    if (!r && !child && !L.dress) L.accessory = pick([null, null, 'jumper', 'waistcoat', 'cardigan', null]);
    if (rnd() < 0.65) L.dialect = pick(['north', 'north', 'cockney', 'brummie', 'west', 'scouse', 'geordie', 'posh', 'yorks']);   // where they're 'from' (they say)
    // the 1990s: make-up and jewellery, shell suits, football shirts and double denim
    if (g === 'f' && !child) { L.lips = pick([0xb0303a, 0xc02448, 0xa8404a, 0xd0607a, 0x8a2a3a, 0xc85a6a]); if (!elder && rnd() < 0.4) L.shadow = pick([0x5a7ad0, 0x8a5ab0, 0x6a8a9a, 0xb07a9a]); L.earrings = rnd() < (elder ? 0.3 : 0.55); if (!elder && a < 35 && rnd() < 0.3) L.choker = true; L.scrunchie = pick([0xe0407a, 0x40a0e0, 0xf0c040, 0x111111]); }
    if (!r && !child && !elder) { const o = rnd(); if (o < 0.07) { const [c1, c2] = pick([[0x6a2a8a, 0x2ab0a0], [0x1a3a8a, 0xe0407a], [0x2a8a3a, 0xf0c040], [0xd04020, 0x1a1a6a]]); Object.assign(L, { shirt: c1, stripe: c2, pants: c1, longSleeve: true, skirt: false, dress: false, accessory: null }); }   // shell suit
      else if (g === 'm' && o < 0.15) Object.assign(L, { shirt: pick([0xf4f4f4, 0xc0241e, 0x1a3a8a, 0xf0c040, 0x2a8a3a]), shirt2: pick([0x1a3a8a, 0xffffff, 0xc0241e]), longSleeve: false, accessory: null });   // a football shirt
      else if (o < 0.23) Object.assign(L, { shirt: 0x6a8ab0, pants: 0x3a5a8a, longSleeve: true, accessory: null }); }   // double denim
    if (g === 'm' && L.accessory === 'cardigan') L.accessory = 'jumper';
    if (r) { if (r.accessory) L.accessory = r.accessory; if (r.hat) L.hat = typeof r.hat === 'string' ? { type: r.hat } : { ...r.hat }; if (g === 'f' && r.hatF) L.hat = { type: r.hatF }; }
    if (!r && !child) { const h = rnd(); if (elder && g === 'm' && h < 0.5) L.hat = { type: pick(['flat', 'bowler']), color: pick([0x5a5a4a, 0x7a6a4a, 0x3a3a3a]) }; else if (elder && g === 'f' && h < 0.25) L.hat = { type: 'bonnet' }; else if (h < 0.12) L.hat = { type: pick(['cap', 'beanie', 'flat']), color: pick(tops) }; }
    if (!r && !child && rnd() < 0.08) L.backpack = true;
    if (kind === 'visitor') { L.backpack = true; L.hat = { type: 'sun' }; L.shorts = g === 'm'; L.skirt = g === 'f'; L.accessory = null; L.shirt = pick([0xf2c94c, 0xeb5757, 0x56ccf2, 0x6fcf97]); }
    // woven patterns on civilian clothes (atlas cells: 1 plaid, 2 gingham, 3 corduroy, 4 houndstooth, 5 diamond)
    if (!r && kind !== 'visitor' && !['coat', 'vest', 'uniform', 'apron'].includes(L.accessory)) {
      const f = rnd();
      if (f < 0.4) L.fabric = child ? pick([1, 2]) : g === 'f' ? pick([2, 2, 5, 4, 1]) : pick([1, 1, 4, 5, 2]);
      if (!L.dress && !L.skirt && !L.shorts && rnd() < 0.22) L.pantsFabric = pick([3, 3, 4]);
    }
    let nm;
    if (surname) { const pool = g === 'f' ? FEMALE : MALE; let first = pick(pool); for (let i = 0; i < 60 && this.names.has(first + ' ' + surname); i++) first = pick(pool); nm = { first, last: surname, name: first + ' ' + surname }; this.names.add(nm.name); }
    else nm = this.uniqueName(g);
    return { look: L, gender: g, age: a, first: nm.first, surname: nm.last, name: nm.name, buildName };
  }
  /** Somebody appearing right here (performers, stallholders): no Lift ride. */
  spawnAt(x, z, opts) { const s = new Sim(this.game, { x, z, inside: null, ...opts }); this.sims.push(s); return s; }
  /** Someone who's finished here (performers, guests, raiders, riot police) walks back to the Lift and goes up it, rather than vanishing. */
  depart(s) { if (!s || s.remove) return; if (s.down > 20) s.down = 0; s.kind = 'visitor'; s.leaving = true; s.glide = null; s.emote = null; s.faceGoal = null; s.crook = null; s.fight = null; s.engaged = null; s.hurry = false; s.path = []; s.phase = 0; }
  spawnAtLift(opts) {
    const g = this.game, lift = g.lift;
    const s = new Sim(g, { x: lift.doorIn.x, z: lift.doorIn.z, inside: lift, ...opts }); s.heading = Math.PI; this.sims.push(s);
    if (g.liftRides && !g.demoMode && g.started) g.liftRides.arrive(s);   // up out of the shaft in the cage
    return s;
  }
  makeResident(opts = {}) {
    const g = this.game, P = this.makePerson(opts), s = this.spawnAtLift({ name: P.name, kind: opts.age != null && opts.age < 16 ? 'child' : 'resident', trait: pick(TRAITS), look: P.look, gender: P.gender, age: P.age, first: P.first, surname: P.surname, actor: Math.random() });
    s.arrivalDay = g.clock.day; return s;
  }
  arrive() {
    const g = this.game; if (this.sims.length >= this.simCap - 1) return null;
    const free = this.freeBeds(), pop = this.count(), roll = Math.random();
    if (free >= 2 && pop >= 3 && roll < 0.3) return this.arriveCouple(roll < 0.12);
    const vac = this.vacancies(), builderSites = g.construction.sites.length;
    let role = null, vacancy = null;
    if (vac.length) { vacancy = vac.find((v) => v.role === 'builder' && builderSites) || pick(vac); role = vacancy.role; }
    const s = this.makeResident({ role, age: role ? 20 + Math.floor(Math.random() * 38) : null });
    this.assignHome(s); this.assignJob(s, vacancy);
    if (!g.demoMode && this.count() <= 16) g.messages.push('Lift', `${s.name} arrived in Sam City${role ? ' as a ' + ROLES[role].name.toLowerCase() : ''}.`);
    if (!g.demoMode && Math.random() < 0.4) { const notes = [`Thank you for the bed. It is small but it is mine. I shall work hard.`, `Arrived safe. The Lift was quicker than they said. Is it always this quiet at night?`, `My mother said I would never live in a town with a proper Stockyard. Well!`, `Lovely to be here. Where does the post go after you read it? Just curious.`, `I brought my own kettle. Do pop round.`]; g.mail.send(s.name, 'A note from a newcomer', `Dear Sam,\n\n${notes[Math.floor(Math.random() * notes.length)]}\n\n${s.first}`); }
    return s;
  }
  /** A couple (sometimes with a child) arrives together and shares a home. */
  arriveCouple(withKid) {
    const g = this.game, sur = pick(SURNAMES), a = this.makeResident({ gender: 'm', age: 22 + Math.floor(Math.random() * 30), surname: sur }), b = this.makeResident({ gender: 'f', age: 22 + Math.floor(Math.random() * 28), surname: sur });
    a.partner = b; b.partner = a; a.single = b.single = false; a.coupleDay = b.coupleDay = g.clock.totalDays; a.orient = b.orient = 'h';
    this.assignHome(a); if (b.home !== a.home || !b.home) { if (a.home && a.home.residents.length < a.home.def.beds - (a.home.reservedForPlayer ? 1 : 0)) this.rehome(b, a.home); else this.assignHome(b); }
    const vac = this.vacancies(); if (vac.length) this.assignJob(a, vac[0]); const vac2 = this.vacancies(); if (vac2.length) this.assignJob(b, pick(vac2));
    let kid = null; if (withKid && this.freeBedsIn(a.home) > 0) { kid = this.makeResident({ age: 5 + Math.floor(Math.random() * 7), surname: sur }); kid.parents = [a, b]; if (a.home) this.rehome(kid, a.home); }
    if (!g.demoMode) g.messages.push('Lift', `${a.name} and ${b.name} arrived together${kid ? ' with their child ' + kid.first : ''}.`);
    return a;
  }
  freeBedsIn(h) { return h && h.state === 'done' && h.def.beds ? h.def.beds - h.residents.length - (h.reservedForPlayer ? 1 : 0) : 0; }
  /** Move a citizen into another home (partners move in together). */
  rehome(s, to) {
    if (s.home) { const i = s.home.residents.indexOf(s); if (i >= 0) s.home.residents.splice(i, 1); const sp = s.home.spots.bed.find((x) => x.taken === s); if (sp) sp.taken = null; }
    if (s.pose === 'sleep') { s.pose = 'stand'; if (s.bedSpot) { s.x = s.bedSpot.ax; s.z = s.bedSpot.az; } } s.bedSpot = null; s.phase = 0;
    s.home = to; to.residents.push(s); const sp = to.spots.bed.find((x) => !x.taken); if (sp) sp.taken = s;
  }
  moveIn(a, b) { if (a.home === b.home) return; if (this.freeBedsIn(b.home) > 0) this.rehome(a, b.home); else if (this.freeBedsIn(a.home) > 0) this.rehome(b, a.home); }
  dailyTick() {
    const g = this.game, today = g.clock.totalDays;
    for (const s of this.residents()) { for (const [id, v] of s.rel) { const nv = v * 0.97; if (nv < 1) s.rel.delete(id); else s.rel.set(id, nv); } }
    // babies
    for (const a of this.adults()) {
      const b = a.partner; if (!b || a.id > b.id || b.remove || a.home !== b.home || !a.home || today - (a.coupleDay || today) < 4) continue;
      const kids = this.sims.filter((k) => k.kind === 'child' && k.home === a.home).length;
      if (kids < 2 && this.freeBedsIn(a.home) > 0 && g.economy.stock.food >= 10 && Math.max(a.age, b.age) < 46 && Math.random() < 0.2 && this.sims.length < this.simCap - 1) this.spawnChild(a, b);
    }
    // out of work: a week on the dole and the rent goes unpaid. Back in work: back on their feet.
    for (const s of this.residents()) {
      if (!this.canWork(s) || s.leaving) continue;
      if (s.workplace) { s.idleDays = 0; if (s.homeless && this.assignHome(s)) { s.homeless = false; g.messages.push('Town', `${s.name} has a job and a roof over their head again. Good for them.`, 'good'); } continue; }
      s.idleDays = (s.idleDays || 0) + 1;
      if (s.homeless) { if (this.vacancies().length) this.assignJob(s); continue; }
      if (s.idleDays >= 7 && s.home && !(s.partner && s.partner.workplace) && Math.random() < 0.35) this.evict(s);
    }
    // children grow up (one year every four days)
    for (const c of this.sims.filter((k) => k.kind === 'child')) { c.age += 0.25; if (c.age >= 16) this.growUp(c); }
  }
  spawnChild(a, b) {
    const g = this.game, P = this.makePerson({ age: 5, surname: a.surname }), home = a.home;
    const c = new Sim(g, { name: P.name, kind: 'child', trait: pick(TRAITS), look: P.look, gender: P.gender, age: 5, first: P.first, surname: P.surname, x: home.doorIn.x, z: home.doorIn.z, inside: home });
    c.parents = [a, b]; this.sims.push(c); this.rehome(c, home); c.hunger = 30; if (g.celebrations) g.celebrations.funerals.birth(c);
    g.messages.push('Town', `${a.name} and ${b.name} have a new addition to the family: ${c.first}!`, 'good');
  }
  growUp(c) {
    const P = this.makePerson({ gender: c.gender, age: 17, surname: c.surname }); this.names.delete(P.name);
    c.look = { ...P.look, hair: c.look.hair, skin: c.look.skin }; c.kind = 'resident'; c.age = 17; c.rebuildMesh(); this.game.messages.push('Town', `${c.name} has grown up.`);
    if (this.vacancies().length) this.assignJob(c);
  }
  /** Lost their home: sleeps rough in the parks and doorways until a job comes up. */
  evict(s) {
    const g = this.game, h = s.home; if (!h) return; const i = h.residents.indexOf(s); if (i >= 0) h.residents.splice(i, 1); for (const sp of h.spots.bed) if (sp.taken === s) sp.taken = null;
    s.endActivity(); s.home = null; s.homeless = true; s.phase = 0;
    const L = s.baseLook || s.look; s.baseLook = null; s.outfit = null; s.look = { ...L, shirt: 0x5a5448, shirt2: 0x3e3a32, pants: 0x3a3832, shoes: 0x2a2018, longSleeve: true, accessory: null, tie: false }; s.rebuildMesh();
    g.messages.push('Town', `${s.name} has been out of work for over a week, couldn't pay the rent, and is sleeping rough.`, 'warn'); if (g.markers) g.markers.add(s.x, s.z, '🛌', s.first + ' sleeping rough', 90, s, () => s.homeless && !s.remove);
  }
  assignHome(s) {
    for (const b of this.game.buildings.list) {
      if (b.state !== 'done' || !b.def.beds || b.residents.length >= b.def.beds - (b.reservedForPlayer ? 1 : 0)) continue;
      b.residents.push(s); s.home = b; const sp = b.spots.bed.find((x) => !x.taken); if (sp) sp.taken = s; return true;
    }
    return false;
  }
  assignJob(s, v) {
    if (!this.canWork(s)) return false;
    v = v || this.vacancies().find((x) => x.role === 'builder') || pick(this.vacancies()); if (!v) return false;
    v.b.workers.push(s); s.workplace = v.b; s.role = v.role; s.workSpot = v.b.workers.length - 1;
    this.reclothe(s, v.role); return true;
  }
  /** Put a citizen into their work clothes (keeps face, body, hair). */
  reclothe(s, role) { const r = ROLES[role], P = this.makePerson({ role, gender: s.gender, age: s.age }), keep = s.baseLook || s.look; s.baseLook = null; s.outfit = null; s.look = { ...P.look, skin: keep.skin, hair: keep.hair, hairStyle: keep.hairStyle, body: keep.body, h: keep.h, w: keep.w, facial: keep.facial, glasses: keep.glasses, buildName: keep.buildName, cane: keep.cane }; this.names.delete(P.name); s.rebuildMesh(); }
  fire(s) { if (s.workplace) { const i = s.workplace.workers.indexOf(s); if (i >= 0) s.workplace.workers.splice(i, 1); s.workplace.workers.forEach((w, k) => (w.workSpot = k)); } s.workplace = null; s.role = null; s.abortJob(); }

  onBuildingDone(b) {
    if (this.game.started && !b.def.special) for (const s of this.sims) { if (s.hidden || s.sitting || s.chat || s.kind === 'security' || s.kind === 'raider' || Math.hypot(s.x - b.cx, s.z - b.cz) > 22) continue; s.emote = { upper: Math.random() < 0.6 ? 'cheer' : 'clap', t: 2.4 }; s.faceGoal = Math.atan2(b.cx - s.x, b.cz - s.z); s.moodBoost += 0.04; }
    for (const s of this.residents()) { if (!s.home && !s.homeless) this.assignHome(s); if (!s.workplace) this.assignJob(s); }
    for (const s of this.adults()) if (s.partner && s.home !== s.partner.home) this.moveIn(s, s.partner);
  }
  onBuildingRemoved(b) {
    for (const s of this.sims) {
      if (s.home === b) { s.home = null; s.bedSpot = null; if (s.pose === 'sleep') s.pose = 'stand'; }
      if (s.workplace === b) { s.workplace = null; s.role = null; s.abortJob(); }
      if (s.inside === b) { s.inside = null; s.x = b.doorOut.x; s.z = b.doorOut.z; s.path = []; s.phase = 0; }
      if (s.job && s.job.site === b) s.abortJob();
      if (s.pose === 'sleep' && s.bedSpot && s.bedSpot.b === b) s.pose = 'stand';
    }
  }

  update(dt) {
    const g = this.game;
    // arrivals: need free beds and (open jobs or a tiny early-game population)
    this.timer -= dt; this.visitorTimer -= dt;
    const power = g.buildings.count('power') > 0, water = g.buildings.count('water') > 0, parks = g.buildings.list.filter((b) => b.def.park && b.state === 'done').length;
    const rate = clamp(1 + (power ? 0.5 : 0) + (water ? 0.3 : 0) + parks * 0.1, 1, 2.5);
    if (this.timer <= 0) {
      this.timer = (this.invites > 0 ? 4 : 26) / rate;
      // with no jobs going, people still move in, just less often: retired couples, people who work off the island, the unemployed
      const can = this.freeBeds() > 0 && g.economy.stock.food >= 3 && (this.vacancies().length > 0 || this.count() < 4 || this.invites > 0 || Math.random() < 0.4);
      this.why = this.freeBeds() <= 0 ? 'no free beds' : g.economy.stock.food < 3 ? 'not enough food in the Stockyard' : this.sims.length >= this.simCap ? 'this computer is busy (the town grows again when it has headroom)' : !this.vacancies().length ? 'no jobs going (they still come, but slowly)' : '';
      if (can && this.sims.length < this.simCap) { this.arrive(); if (this.invites > 0) this.invites--; }
    }
    if (this.visitorTimer <= 0) {
      this.visitorTimer = (50 + Math.random() * 40) / (1 + 0.5 * Math.min(2, g.buildings.count('busstop')));
      const vis = this.sims.filter((s) => s.kind === 'visitor').length;
      if (vis < 3 && g.clock.hour > 8 && g.clock.hour < 18 && this.sims.length < this.simCap && g.buildings.shops().length + g.buildings.list.filter((b) => b.def.park).length > 0)
        this.spawnAtLift({ ...(() => { const P = this.makePerson({ kind: 'visitor' }); return { name: P.name, look: P.look, gender: P.gender, age: P.age, first: P.first, surname: P.surname }; })(), kind: 'visitor', actor: 1 });
    }
    // unemployment drift & emigration
    for (const s of this.residents()) if (!s.workplace && this.canWork(s) && this.vacancies().length) this.assignJob(s);
    // update sims
    // each person in turn; anyone slow gets written down (who, doing what, where), and after a freeze in here the watchdog
    // is told who's being updated, so the next report names them
    const W = g.watchdog, close = W && W.detail;
    for (const s of this.sims) {
      if (close) W.beat(`town: population: ${s.name} (${s.activity || 'idle'} ${s.phase ?? ''}${s.inside ? ' in ' + s.inside.def.name : ''}${s.dest && s.dest.b ? ' going to ' + s.dest.b.def.name : ''})`);
      const t = performance.now(); s.think(dt); s.step(dt); const d = performance.now() - t;
      if (d > 80 && g.slowNote) g.slowNote(`${s.name}, ${s.activity || 'idle'}${s.inside ? ' in the ' + s.inside.def.name : ''}${s.dest && s.dest.b ? ' going to the ' + s.dest.b.def.name : ''}`, d);
    }
    if (close) W.beat('town: population: keeping people apart');
    this.separate(dt);
    for (const s of this.sims) if (s.remove) { this.release(s); s.dispose(); }
    this.sims = this.sims.filter((s) => !s.remove);
    // performance governor
    this.capTimer -= dt; this.fpsEma += (g.fps - this.fpsEma) * Math.min(1, dt * 0.2);
    if (this.capTimer <= 0 && g.fps > 0) {
      this.capTimer = 4;
      // No fixed ceiling: the town grows until this computer starts to struggle, then holds there (and lifts again when
      // there's headroom). "Struggling" is measured against what this display can do (60, 120, 144 Hz...), not a fixed number.
      this.hz = Math.max(this.hz || 50, Math.min(165, this.fpsEma * 0.995)); const low = Math.min(26, this.hz * 0.45), good = Math.min(38, this.hz * 0.62);   // only hold back when it's really struggling (under ~26 fps)
      if (this.fpsEma < low && this.sims.length > MIN_SIMS) { this.simCap = Math.max(MIN_SIMS, Math.min(this.simCap, this.sims.length) - 4); this.slowT = 0; }
      else if (this.fpsEma > good && this.simCap < MAX_SIMS_HARD) { this.slowT = (this.slowT || 0) + 1; if (this.slowT >= 2) this.simCap = this.sims.length + 40 > this.simCap ? this.simCap + 12 : MAX_SIMS_HARD; }
      // over cap: send surplus visitors/residents home through the lift
      if (this.sims.length > this.simCap) { const extra = this.sims.find((s) => s.kind === 'visitor' && !s.leaving) || null; if (extra) extra.leaving = true; }
    }
  }
  /** Soft personal space: sims (and Sam) gently push apart instead of walking through each other. */
  separate(dt) {
    const w = this.game.world, R = 0.58, grid = new Map(), k = Math.min(1, dt * 12), P = this.game.player;
    const movable = (s) => !s.remove && !s.riding && !s.upstairs && !s.sitting && s.pose !== 'sleep' && !(s.down > 0) && !s.glide && !s.hidden;
    const list = this.sims.filter(movable);
    for (const s of list) { const key = Math.floor(s.x / 1.2) + ',' + Math.floor(s.z / 1.2) + ',' + (s.inside ? s.inside.uid : 0); (grid.get(key) || grid.set(key, []).get(key)).push(s); }
    const push = (a, dx, dz, f) => { const nx = a.x + dx * f, nz = a.z + dz * f; if (!w.collides(nx, nz, 0.3)) { a.x = nx; a.z = nz; } else if (!w.collides(nx, a.z, 0.3)) a.x = nx; else if (!w.collides(a.x, nz, 0.3)) a.z = nz; };
    for (const a of list) {
      const cx = Math.floor(a.x / 1.2), cz = Math.floor(a.z / 1.2), ins = a.inside ? a.inside.uid : 0;
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
        const arr = grid.get((cx + ox) + ',' + (cz + oz) + ',' + ins); if (!arr) continue;
        for (const b of arr) {
          if (b.id <= a.id) continue; let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d >= R) continue;
          if (d < 0.001) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d = Math.hypot(dx, dz); } const f = (R - d) * 0.5 * k / d;
          if (a.ghostT > 0 || b.ghostT > 0) continue;   // someone squeezing past a crowd
          if (!a.frozen) push(a, -dx, -dz, a.chat ? f * 0.35 : f); if (!b.frozen) push(b, dx, dz, b.chat ? f * 0.35 : f);
        }
      }
      if (P && (a.inside || null) === (this.game.buildings.playerInside || null) && !P.sleeping) {
        const dx = a.x - P.x, dz = a.z - P.z, d = Math.hypot(dx, dz); if (d < R && d > 0.001 && !a.frozen && !(a.ghostT > 0)) push(a, dx, dz, (R - d) * k / d);
      }
    }
  }
  release(s) {
    if (s.partner) { s.partner.partner = null; s.partner.single = true; s.partner = null; }
    if (s.home) { const i = s.home.residents.indexOf(s); if (i >= 0) s.home.residents.splice(i, 1); const sp = s.home.spots.bed.find((x) => x.taken === s); if (sp) sp.taken = null; }
    this.fire(s); this.names.delete(s.name);
  }
  nearest(x, z, r = 3, filter = null) {
    let best = null, bd = r * r;
    for (const s of this.sims) { if (s.mesh.visible === false || (filter && !filter(s))) continue; const d = (s.x - x) ** 2 + (s.z - z) ** 2; if (d < bd) { bd = d; best = s; } }
    return best;
  }
}
