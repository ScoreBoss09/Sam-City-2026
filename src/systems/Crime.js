import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';

/**
 * Crime and peril, and the police who deal with it. Pickpockets and muggers (who will happily rob Sam), burglars at
 * night, shoplifters, vandals, and fights that break out (mostly outside the pub at closing time). Constables patrol on
 * day and night shifts in the manner of the age: watchmen with lanterns and rattles, then whistle-blowing bobbies, then
 * panda cars and radios. Sam can fight (punch F, kick X) - but hit an innocent and the police will come for him.
 */
const COP_LINES = [
  ['Stop, thief! *rattle rattle*', 'In the name of the Watch!', 'Twelve o\'clock and all\'s well. Well, nearly.', 'Halt! Who goes there?'],
  ['Stop, in the name of the law!', '\'Ello, \'ello, \'ello, what\'s all this then?', 'Move along now.', 'Halt, villain!'],
  ['*PHWEEEET* Oi! You!', '\'Ello, \'ello, \'ello!', 'Stop, in the name of the law!', 'Evening all.'],
  ['You\'re nicked, sunshine.', 'Right, in the back of the van.', 'Hold it right there!', 'Break it up, lads!'],
  ['Control, this is Delta Two, in pursuit.', 'You\'re nicked, my son.', 'Stay where you are!', 'Armed with a cheese sandwich, suspect is... oh, it IS a sandwich.'],
];
const FIGHT_CROWD = ['Fight! Fight! Fight!', 'Go on, smack him!', 'Leave it, he\'s not worth it!', 'Somebody get the police!', 'Ooh! Right in the kisser!', 'Handbags!', 'Not in front of the kids!'];
const FIGHT_CROWD_ADULT = ['Leave it, Gary, he\'s not worth it!', 'Have it, you muppet!', 'He spilt my pint! MY PINT!', 'Calm down! Calm down!', 'Come on then! COME ON THEN!', 'Fight! Fight! Fight!'];
const FIGHT_START = ['What you looking at?', 'You spilt my pint!', 'Say that again. Go on.', 'Outside. Now.', 'You and whose army?', 'That\'s my parking space!'];
const VICTIM = ['Thief! Stop him!', 'My purse! Help!', 'Help! Police!', 'Oi! Come back here!', 'He\'s nicked my wallet!'];
const CROOK = ['Leg it!', 'Nothing to see here.', 'Lovely watch, mate. Ta.', 'Wasn\'t me, guv!', 'Scarper!'];
const TYPES = { robber: 'armed robber', pickpocket: 'pickpocket', mugger: 'mugger', burglar: 'burglar', shoplifter: 'shoplifter', vandal: 'vandal' };

export class Crime {
  constructor(game) { this.game = game; this.timer = 40; this.wanted = 0; this.calmT = 0; this.nickT = 0; this.stats = { crimes: 0, caught: 0 }; this.brawlT = 30; }
  get age() { return this.game.tech ? this.game.tech.age : 2; }
  copLine() { return pick(COP_LINES[Math.min(4, this.age)]); }
  cops() { return this.game.population.sims.filter((s) => s.activity === 'police' && !s.remove && !(s.down > 0)); }
  hasPolice() { return this.game.buildings.list.some((b) => (b.id === 'police' || b.id === 'watchhouse') && b.state === 'done'); }
  station() { return this.game.buildings.list.find((b) => (b.id === 'police' || b.id === 'watchhouse') && b.state === 'done'); }
  /** Is this constable on shift right now? Odd ones work days, even ones nights. */
  onShift(s, h) { const n = s.id % 2 === 0; return n ? h >= 19 || h < 5 : h >= 7 && h < 19; }

  update(dt) {
    const g = this.game; if (!g.started || g.ending) return;   // every constable on the payroll puts crooks off
    const pop = g.population.count(), h = g.clock.hour, night = h >= 21 || h < 4;
    this.timer -= dt * Math.max(0, g.clock.speed);
    if (this.timer <= 0) { const cops = g.population.sims.filter((s) => s.role === 'guard' && s.workplace && s.workplace.state === 'done').length; const troubled = g.population.sims.filter((s) => s.homeless || s.mood < -0.4 || s.drunk > 0.6).length; this.timer = (150 + Math.random() * 150) / (night ? 1.7 : 1) / (1 + pop / 50 + troubled * 0.15) * (1 + cops * 0.7); if (pop >= 20 && !(g.raids && g.raids.alert)) this.spawn(night); }   // a quiet village at first: crime comes with a bigger town and its troubles
    // very rarely, something serious: an armed raid on the bank or post office, or arson in the night
    this.bigT = (this.bigT ?? 200) - dt * Math.max(0, g.clock.speed); if (this.bigT <= 0) { this.bigT = 150 + Math.random() * 150; this.serious(); }
    // closing time: a punch-up outside the pub or the nightclub
    this.brawlT -= dt * Math.max(0, g.clock.speed); if (this.brawlT <= 0) { this.brawlT = 90 + Math.random() * 120; const drunks = g.population.sims.filter((s) => s.drunk > 0.5).length; if ((h >= 22 || h < 1) && pop >= 15 && Math.random() < 0.25 + drunks * 0.08) this.brawl(true); else if (pop >= 35 && Math.random() < 0.08 + drunks * 0.03) this.brawl(false); }
    // wanted: the police are after Sam until he keeps out of their way for a while
    for (const s of g.population.sims) if (s.crook && s.crook.state === 'arrested' && g.elapsed > s.crook.until) this.takeAway(s);   // taken away
    const P = g.player;
    if (this.wanted > 0) {
      const cops = this.cops(), near = cops.some((c) => Math.hypot(c.x - P.x, c.z - P.z) < 30);
      if (!near) { this.calmT += dt; if (this.calmT > 25) { this.wanted--; this.calmT = 0; g.ui.toast(this.wanted ? `The heat dies down a little (${'★'.repeat(this.wanted)})` : 'The police have lost interest in you.', 2200); } } else this.calmT = 0;
      const grab = cops.find((c) => Math.hypot(c.x - P.x, c.z - P.z) < 1.4 && !P.transit);
      if (grab) { this.nickT += dt; if (this.nickT > 0.8) this.arrestSam(grab); } else this.nickT = 0;
    }
    g.ui.setWanted && g.ui.setWanted(this.wanted, P.hp);
  }

  // ---------- trouble ----------
  spawn(night) {
    const g = this.game, shops = g.buildings.list.filter((b) => b.state === 'done' && b.def.shopping);
    const yc = g.buildings.count('youthclub') ? 0.25 : 1, opts = night ? [['burglar', 3], ['mugger', 2], ['vandal', yc]] : [['pickpocket', 3], ['shoplifter', shops.length ? 2 : 0], ['vandal', yc]];
    // the desperate ones: somebody sleeping rough sometimes turns to a bit of thieving (never burglary)
    const hl = g.population.sims.filter((s) => s.homeless && !s.crook && !s.fight && !s.lockedT && s.pose !== 'sleep' && !s.leaving && !(s.down > 0));
    if (hl.length && Math.random() < 0.5) { const s = pick(hl), t2 = g.population.weighted([['pickpocket', 3], ['shoplifter', shops.length ? 2 : 0], ['vandal', 1]].filter((o) => o[1] > 0)); s.crook = { type: TYPES[t2], state: 'prowl', t: 0, repath: 0, loot: 0, items: null, seen: false, local: true }; s.hp = s.hp || 50; this.stats.crimes++; return; }
    const t = g.population.weighted(opts.filter((o) => o[1] > 0)), P = g.population.makePerson({ kind: 'visitor', gender: Math.random() < 0.8 ? 'm' : 'f' });
    const look = { ...P.look, shirt: pick([0x1a1a1a, 0x2a2a3a, 0x3a2a2a, 0x2a3a2a]), pants: 0x1a1a22, hat: Math.random() < 0.6 ? { type: 'beanie', color: 0x1a1a1a } : P.look.hat };
    const s = g.population.spawnAtLift({ name: P.name, first: P.first, surname: P.surname, kind: 'visitor', trait: 'busy', look, gender: P.gender, age: P.age });
    s.crook = { type: TYPES[t], state: 'prowl', t: 0, repath: 0, loot: 0, items: null, seen: false }; s.hp = 50; this.stats.crimes++;
  }
  /** The rare, serious stuff (weeks apart): an armed gang raids the bank or post office in broad daylight, or a fire is started deliberately at night. */
  serious() {
    const g = this.game, h = g.clock.hour, today = g.clock.totalDays, pop = g.population.count(); if (pop < 40 || today - (g.flags.lastSerious ?? -99) < 15 || Math.random() > 0.35) return;
    const banks = g.buildings.list.filter((b) => b.state === 'done' && (b.id === 'bank' || b.id === 'postoffice'));
    if (h >= 10 && h < 16 && banks.length) {
      const b = pick(banks); g.flags.lastSerious = today;
      for (let i = 0; i < 3; i++) { const P = g.population.makePerson({ kind: 'visitor', gender: 'm' }), look = { ...P.look, shirt: 0x1a1a1a, pants: 0x1a1a22, hat: { type: 'beanie', color: 0x111111 }, facial: null };
        const s = g.population.spawnAtLift({ name: P.name, first: P.first, surname: P.surname, kind: 'visitor', trait: 'busy', look, gender: 'm', age: P.age });
        s.crook = { type: 'robber', state: 'prowl', t: 0, repath: 0, loot: 0, items: null, seen: true, fixed: b, lead: i === 0, lookout: i === 1 }; s.hp = 120; s.hurry = true; s.holding = 'pistol'; }
      this.stats.crimes++; if (g.markers) g.markers.add(b.cx, b.cz, '🔫', `Raid on the ${b.def.name}!`, 3600, null, () => g.population.sims.some((s) => s.crook && s.crook.fixed === b && !s.remove));
      g.messages.push('Police', `999! Three men in balaclavas are heading for the ${b.def.name}!`, 'warn'); g.ui.toast(`🚨 Armed robbery at the ${b.def.name}!`, 3500); Sfx.play('bell');
    } else if ((h >= 1 && h < 4)) {
      const L = g.buildings.list.filter((b) => b.state === 'done' && !b.def.park && !b.def.special && (b.def.shopping || b.def.cat === 'ind')); const b = pick(L); if (!b || !g.hazards) return;
      g.flags.lastSerious = today; g.hazards.ignite(b); g.messages.push('Fire brigade', `A fire has broken out at the ${b.def.name} in the dead of night. They're saying it was started deliberately.`, 'warn');
    }
  }
  /** After an arrest: outsiders are driven off to the mainland; locals go in the lock-up for a while (or get a caution if there's nowhere to put them). */
  takeAway(s) {
    const g = this.game; if (!s.crook || !s.crook.local) { g.population.depart(s); return; }
    s.crook = null; s.fightAnim = null; s.path = []; s.phase = 0;
    const lk = g.buildings.list.find((b) => b.id === 'lockup' && b.state === 'done') || g.buildings.list.find((b) => (b.id === 'police' || b.id === 'watchhouse') && b.state === 'done');
    if (lk) { s.lockup = lk; s.lockedT = g.elapsed + 150; this.cell(s, lk); g.messages.push('Police', `${s.name} is cooling off in the ${lk.def.name}.`); }
    else g.messages.push('Police', `${s.name} gets off with a caution. There's nowhere to lock anyone up: a Lock-up would help.`);
  }
  /** A fight between two townsfolk; at night outside the pub or nightclub if there is one. */
  brawl(venue) {
    const g = this.game, pubs = g.buildings.list.filter((b) => b.state === 'done' && (b.id === 'tavern' || b.id === 'local' || b.id === 'irish' || b.id === 'nightclub'));
    const site = venue && pubs.length ? pick(pubs) : null;
    const pool = g.population.sims.filter((s) => s.kind === 'resident' && s.age >= 18 && s.age < 60 && !s.inside && !s.fight && !s.crook && s.activity !== 'police' && s.pose !== 'sleep' && !(s.down > 0) && !s.hidden && (!site || Math.hypot(s.x - site.cx, s.z - site.cz) < 40));
    pool.sort((a, b) => ((b.drunk || 0) > 0.5) - ((a.drunk || 0) > 0.5) || (b.trait === 'grumpy') - (a.trait === 'grumpy') || (b.temper || 0) - (a.temper || 0));
    // now and then it all kicks off: a full-scale brawl, half the pub in the car park
    if (site && pool.length >= 6 && Math.random() < 0.22) {
      const n = Math.min(pool.length - pool.length % 2, 6 + Math.floor(Math.random() * 6)), crew = pool.sort(() => Math.random() - 0.5).slice(0, n);
      for (let i = 0; i < crew.length; i += 2) this.startFight(crew[i], crew[i + 1]);
      for (const s of crew) if (Math.random() < 0.4) this.game.social.say(s, pick(FIGHT_START), 2.2);
      g.messages.push('Town news', `Mass brawl outside ${site.def.name}: ${crew.length} involved.`, 'quiet'); g.markers && g.markers.add(site.cx, site.cz, '🥊', 'Mass brawl', 600, null, () => crew.some((s) => s.fight && !s.remove)); return;
    }
    const a = pool[0], b = pool.slice(1).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0]; if (!a || !b) return;
    this.startFight(a, b); g.social.say(a, pick(FIGHT_START), 2.5); g.markers && g.markers.add(a.x, a.z, '🥊', 'Fight', 120, a, () => !!a.fight);
    g.messages.push('Town news', `${a.first} and ${b.first} came to blows${site ? ` outside ${site.def.name}` : ' in the street'}.`, 'quiet');
  }
  startFight(a, b) { for (const [x, y] of [[a, b], [b, a]]) { if (x === this.game.player) continue; x.fight = { foe: y, t: 0, cd: 0.5 + Math.random() * 0.5, repath: 0 }; x.hp = x.hp ?? 100; } }

  // ---------- the sims' side (called from Sim.think) ----------
  driveCrook(s, dt) {
    const g = this.game, c = s.crook; c.t += dt; c.repath -= dt; s.hurry = c.state === 'flee';
    if (c.state === 'arrested') { s.fightAnim = null; if (c.t > 6) this.takeAway(s); return; }
    if (s.down > 0) return;
    if (c.state === 'prowl') {
      if (!c.target || c.repath <= 0) { c.repath = 1.5; c.target = this.pickTarget(s); if (!c.target) { if (c.t > 60) this.flee(s); return; } this.go(s, c.target); }
      const tp = c.target.sim || c.target.player ? (c.target.sim || g.player) : null;
      if (tp && Math.hypot(tp.x - s.x, tp.z - s.z) < 1.3) this.rob(s, tp);
      else if (c.target.b && (s.inside === c.target.b || (!s.path.length && Math.hypot(c.target.b.cx - s.x, c.target.b.cz - s.z) < c.target.b.def.w * 3))) { c.state = 'act'; c.t = 0; }
      if (c.t > (c.fixed ? 400 : 90)) this.flee(s);   // (a gang with a job to do keeps going till it gets there)
    } else if (c.state === 'act' && c.type === 'robber') { this.holdUp(s, dt); return;
    } else if (c.state === 'act') {
      s.working = true; s.fightAnim = c.type === 'vandal' ? 'wave' : 'browse';
      if (c.type === 'robber') s.fightAnim = 'point';   // hands up, everybody
      if (c.t > (c.type === 'robber' ? 12 : c.type === 'burglar' ? 7 : 4)) {
        s.fightAnim = null; const b = c.target.b, loot = c.type === 'robber' ? (c.lead ? 600 + Math.floor(Math.random() * 2400) : 0) : c.type === 'burglar' ? 40 + Math.floor(Math.random() * 120) : c.type === 'shoplifter' ? 15 + Math.floor(Math.random() * 30) : 0;
        if (loot) { c.loot = loot; g.economy.lose(loot, 'Theft'); }
        if (c.type === 'vandal' && b) { b.graffiti = (b.graffiti || 0) + 1; for (const r of b.residents.concat(b.workers)) r.moodBoost -= 0.1; }
        if (c.type === 'robber') { if (c.lead) this.report(s, `ARMED ROBBERY at the ${b.def.name}! The gang got away with £${loot}.`); this.flee(s); return; }
        this.report(s, c.type === 'burglar' ? `Burglary at the ${b.def.name}! £${loot} gone.` : c.type === 'shoplifter' ? `Shoplifter at the ${b.def.name}!` : `Vandals have daubed graffiti on the ${b.def.name}.`);
        this.flee(s);
      }
    } else if (c.state === 'flee' && c.local) {   // a local legs it into the back streets and lies low
      if (!c.fled) { c.fled = true; const w = g.world, T = 8; for (let i = 0; i < 8; i++) { const x = s.x + (Math.random() - 0.5) * 120, z = s.z + (Math.random() - 0.5) * 120, tx = Math.floor(x / T), tz = Math.floor(z / T); if (w.inBounds(tx, tz) && w.road[w.idx(tx, tz)] && s.goTo({ x: (tx + 0.5) * T, z: (tz + 0.5) * T })) break; } }
      else if (!s.path.length) { if (c.loot) g.messages.push('Police report', `A ${c.type} got away${c.loot ? ` with £${c.loot}` : ''}. Word is it was someone local.`, 'warn'); s.crook = null; s.phase = 0; }
    } else if (c.state === 'flee') {
      if (!s.path.length || c.repath <= 0) { c.repath = 4; s.goTo({ b: g.lift, x: g.lift.doorIn.x, z: g.lift.doorIn.z }); }
      if (s.inside === g.lift || Math.hypot(g.lift.doorIn.x - s.x, g.lift.doorIn.z - s.z) < 2) {
        if (c.loot) g.messages.push('Police report', `A ${c.type} got away${c.loot ? ` with £${c.loot}` : ''}.${this.hasPolice() ? '' : ' A Watch House or Police Station would help.'}`, 'warn');
        g.population.depart(s); s.hurry = true;   // into the queue for the Lift like anyone else (nobody walks into the shaft): it goes when it goes
      }
    }
  }
  /** An armed hold-up, in plain sight: one of them keeps watch at the door with a gun while the others clear out the tills,
   *  the alarm bell rings, a crowd gathers at a safe distance, then they run for the Lift with bags of cash. */
  holdUp(s, dt) {
    const g = this.game, c = s.crook, b = c.target.b, P = g.player, d = b.doorOut, a = b.rot * Math.PI / 2, ox = Math.sin(a), oz = Math.cos(a);
    if (!c.started) { c.started = true; c.t = 0;
      if (c.lookout) { s.goTo({ x: d.x + ox * 1.2, z: d.z + oz * 1.2, face: a }); }
      if (c.lead) { g.messages.push('Police', `The ${b.def.name} is being held up at gunpoint!`, 'warn'); Sfx.play('bell');
        for (const q of g.population.sims) { if (q === s || q.crook || q.inside || q.kind === 'guest' || q.activity === 'police' || q.pose === 'sleep' || q.down > 0 || q.fight) continue; const dd = Math.hypot(q.x - d.x, q.z - d.z); if (dd > 45 || dd < 3) continue;
          const k = Math.random() * 1.6 - 0.8, r = 11 + Math.random() * 4; q.goTo({ x: d.x + Math.sin(a + k) * r, z: d.z + Math.cos(a + k) * r, face: a + k + Math.PI }); q.emote = { upper: 'point', t: 4 }; }   // everyone stops to watch, well back
      } }
    s.working = true; s.fightAnim = 'point';
    if (c.lookout && !s.path.length && Math.random() < dt * 0.25 && s.mesh.visible) g.social.say(s, pick(['Nobody move!', 'Back! Get BACK!', 'Hurry up in there!', 'Don\'t be a hero, Sam.']), 1.8);
    if (c.lead && (c.ring = (c.ring || 0) - dt) <= 0) { c.ring = 1.4; if (g.mode === 'sim' && Math.hypot(P.x - d.x, P.z - d.z) < 70) Sfx.play('bell'); }   // the alarm box over the door
    if (c.t > 40) {
      s.fightAnim = null; s.working = false; s.bag = true; const loot = c.lead ? 600 + Math.floor(Math.random() * 2400) : 0; if (loot) { c.loot = loot; g.economy.lose(loot, 'Theft'); }
      if (c.lead) this.report(s, `The gang is out of the ${b.def.name} with £${loot} in bags, running for the Lift!`); this.flee(s);
    }
  }
  go(s, t) { if (t.b) s.goTo({ b: t.b, x: t.b.doorIn.x, z: t.b.doorIn.z }); else { const p = t.sim || this.game.player; s.goTo({ x: p.x, z: p.z }); } }
  pickTarget(s) {
    const g = this.game, c = s.crook, P = g.player, h = g.clock.hour;
    const watched = (x, z) => g.population.sims.some((q) => q.activity === 'police' && Math.hypot(q.x - x, q.z - z) < 22);   // nobody robs under a copper's nose
    if (c.fixed) return { b: c.fixed };
    if (c.type === 'pickpocket' || c.type === 'mugger') {
      const rich = g.population.sims.find((q) => q.winnings > 0 && !q.inside && !(q.down > 0) && !watched(q.x, q.z)); if (rich && Math.random() < 0.8) return { sim: rich };   // word gets round about a lottery win
      if (g.mode === 'sim' && !g.buildings.playerInside && !P.transit && Math.random() < 0.2 && Math.hypot(P.x - s.x, P.z - s.z) < 80 && !watched(P.x, P.z)) return { player: true };
      const v = g.population.sims.filter((q) => q.kind === 'resident' && !q.inside && q.pose !== 'sleep' && !q.fight && q.activity !== 'police' && !(q.down > 0) && Math.hypot(q.x - s.x, q.z - s.z) < 70 && !watched(q.x, q.z));
      return v.length ? { sim: pick(v) } : null;
    }
    const L = g.buildings.list.filter((b) => b.state === 'done' && !b.def.park && !b.def.special && !watched(b.cx, b.cz) && (c.type === 'burglar' ? b.def.cat === 'res' && !b.residents.some((r) => r.inside === b && r.pose !== 'sleep') : c.type === 'shoplifter' ? b.def.shopping : true));
    void h; return L.length ? { b: pick(L) } : null;
  }
  rob(s, v) {
    const g = this.game, c = s.crook, P = g.player;
    if (v === P) {
      const items = Object.entries(P.inv).filter(([, n]) => n > 0); let what;
      if (items.length && Math.random() < 0.5) { const [m] = pick(items), n = Math.min(P.inv[m], 1 + Math.floor(Math.random() * 3)); P.invTake(m, n); c.items = { [m]: n }; what = `${n} ${m}`; }
      else { const n = Math.min(g.economy.funds, 5 + Math.floor(Math.random() * 30)); g.economy.lose(n, 'Theft'); c.loot = n; what = `£${n}`; }
      if (c.type === 'mugger') P.stagger(1.6); Sfx.play('deny'); g.ui.toast(`${c.type === 'mugger' ? 'Mugged!' : 'Pickpocketed!'} They took ${what}. Catch them (F to punch, X to kick)!`, 4000);
    } else {
      c.loot = v.winnings || 5 + Math.floor(Math.random() * 25); if (v.winnings) { g.messages.push('Police', `${v.name} has been robbed of their lottery winnings: £${v.winnings}!`, 'warn'); v.winnings = 0; v.moodBoost -= 0.5; } if (c.type === 'mugger') v.knockDown(3, true); g.social.say(v, pick(VICTIM), 2.4); v.moodBoost -= 0.2;
    }
    g.social.say(s, pick(CROOK), 1.8); this.report(s, `A ${c.type} struck near ${this.where(s)}.`); this.flee(s);
  }
  flee(s) { s.crook.state = 'flee'; s.crook.repath = 0; s.path = []; s.hurry = true; }
  report(s, text) { s.crook.seen = true; this.game.messages.push('Police report', text, 'warn'); this.game.markers && this.game.markers.add(s.x, s.z, '🚨', text, 600, s, () => !!s.crook && !s.remove); }
  where(s) { const b = this.game.buildings.list.filter((q) => q.state === 'done' && !q.def.park).sort((a, q) => Math.hypot(a.cx - s.x, a.cz - s.z) - Math.hypot(q.cx - s.x, q.cz - s.z))[0]; return b ? `the ${b.def.name}` : 'the square'; }

  driveFight(s, dt) {
    const g = this.game, f = s.fight, foe = f.foe, P = g.player; f.t += dt; f.cd -= dt; f.repath -= dt;
    const gone = !foe || foe.remove || (foe !== P && (foe.down > 0 || !foe.fight)) || (foe === P && (P.down > 0 || P.sedated > 0 || P.transit || g.mode !== 'sim'));
    if (gone && foe !== P && f.t < 40 && !(s.down > 0)) { const nf = g.population.sims.find((q) => q !== s && q.fight && !(q.down > 0) && Math.hypot(q.x - s.x, q.z - s.z) < 10); if (nf) { f.foe = nf; return; } }   // brawls: find someone else to hit
    if (gone || f.t > 30 || s.down > 0) { this.endFight(s, gone && foe && foe.down > 0); return; }
    const d = Math.hypot(foe.x - s.x, foe.z - s.z);
    if (d > 1.25) { if (f.repath <= 0 || !s.path.length) { f.repath = 0.6; s.goTo({ x: foe.x, z: foe.z }); s.hurry = true; } return; }
    s.path = []; s.faceGoal = Math.atan2(foe.x - s.x, foe.z - s.z); if (!s.fightAnim) s.fightAnim = 'fight';
    if (f.cd <= 0) {
      f.cd = 0.75 + Math.random() * 0.7; const k = Math.random() < 0.25, an = k ? 'kick' : Math.random() < 0.5 ? 'punch' : 'punchL'; s.fightAnim = an; s.fightAnimT = k ? 0.5 : 0.35;
      if (Math.random() < 0.7) this.hit(foe, k ? 16 : 9, s); else if (foe !== P) { foe.fightAnim = 'fight'; }
    }
    // a crowd gathers and eggs them on
    if (Math.random() < dt * 0.8) { const cr = g.population.sims.filter((q) => q !== s && q !== foe && !q.fight && !q.crook && q.kind !== 'security' && !q.inside && q.pose !== 'sleep' && Math.hypot(q.x - s.x, q.z - s.z) < 11); if (cr.length) { const q = pick(cr); q.emote = { upper: Math.random() < 0.5 ? 'cheer' : 'facepalm', t: 2 }; q.faceGoal = Math.atan2(s.x - q.x, s.z - q.z); if (q.mesh.visible) g.social.say(q, pick(g.ui.adult && Math.random() < 0.6 ? FIGHT_CROWD_ADULT : FIGHT_CROWD), 2); } }
  }
  endFight(s, won) {
    const g = this.game; s.fight = null; s.fightAnim = null; s.hurry = false; s.path = []; s.phase = 0;
    if (won && s.down <= 0) { s.emote = { upper: 'cheer', t: 2 }; g.social.say(s, pick(['And stay down!', 'Had enough, have you?', 'Nobody spills my pint.']), 2); }
    s.moodBoost -= 0.1;
  }
  /** Someone (a sim or Sam) lands a blow on `v`. */
  hit(v, dmg, from) {
    const g = this.game, P = g.player;
    if (v === P) { P.takeHit(dmg, from); return; }
    v.hp = (v.hp ?? 100) - dmg; v.fightAnim = 'hit'; v.fightAnimT = 0.35; Sfx.noise(0.08, { freq: 300, vol: 0.25, type: 'lowpass' });
    const dx = v.x - from.x, dz = v.z - from.z, d = Math.hypot(dx, dz) || 1, w = g.world; for (const k of [0.6, 0.3]) { const nx = v.x + dx / d * k, nz = v.z + dz / d * k; if (!w.collides(nx, nz, 0.3)) { v.x = nx; v.z = nz; break; } }
    if (g.particles) g.particles.burst(v.x, 1.5, v.z, 0xffffff, 5, 1.2, 1.5, 0.06);
    if (v.hp <= 0) { v.hp = 100; if (v.kind === 'raider') { g.raids.hit(v, 2); return; } v.knockDown(v.crook ? 8 : 5); if (v.crook) this.collar(v, from === P ? null : from, from === P); }
  }
  /** A crook is down: the police (or the townsfolk) take them away, and the loot goes back. */
  collar(s, cop, bySam) {
    const g = this.game, c = s.crook; if (!c || c.state === 'arrested') return; c.state = 'arrested'; c.t = 0; c.until = g.elapsed + 8; this.stats.caught++;
    if (c.items) for (const [m, n] of Object.entries(c.items)) g.player.invAdd ? g.player.invAdd(m, n) : (g.player.inv[m] = (g.player.inv[m] || 0) + n);
    if (c.loot) g.economy.earn(c.loot, 'Stolen goods recovered'); const reward = c.type === 'robber' ? (bySam ? 500 : 200) : bySam ? 25 : 10; if (c.type === 'robber') g.messages.push('Police', `One of the bank robbers is in custody${bySam ? ', thanks to Sam' : ''}. A reward of £${reward}.`, 'good'); g.economy.earn(reward, 'Police rewards');
    if (cop) g.social.say(cop, this.copLine(), 2.4);
    const who = bySam ? 'Sam' : cop ? `${cop.roleName || 'Constable'} ${cop.surname || cop.first}` : 'The townsfolk';
    g.messages.push('Police report', `${who} caught a ${c.type}!${c.loot || c.items ? ' The loot has been returned.' : ''} (+£${reward})`, 'good'); if (bySam) g.ui.toast(`You caught the ${c.type}! +£${reward}${c.loot ? `, £${c.loot} back` : ''}.`, 3000);
  }

  // ---------- drunk and disorderly: arrested, walked to the cells, out in the morning ----------
  cells() { const B = this.game.buildings.list; return B.find((b) => b.id === 'lockup' && b.state === 'done') || B.find((b) => (b.id === 'police' || b.id === 'watchhouse') && b.state === 'done') || null; }
  /** A constable takes a drunk in: to the Lock-Up (or the station's cells) for the night. */
  nick(q, cop) {
    const g = this.game, to = this.cells(); q.disorderly = null; q.fight = null; q.fightAnim = null; q.standUp(); q.path = []; q.phase = 0;
    if (!to) { g.social.say(cop, 'Go home and sleep it off. Go on.', 2.4); q.drunk = Math.min(q.drunk, 0.6); return; }   // (nowhere to put them)
    q.escort = { cop, to }; cop.escorting = q; cop.path = []; g.social.say(cop, pick(['Right, you\'re coming with me.', 'Drunk and disorderly. Come on, sunshine.', 'Night in the cells for you, my lad.', 'Hands where I can see them.']), 2.6);
    g.social.say(q, pick(['I\'ve only had a couple!', 'Get off me! I know my rights!', 'Officer, I love you. I really do.', 'It wasn\'t me!']), 2.6);
    g.messages.push('Police', `${cop.roleName || 'PC'} ${cop.surname || cop.first} has arrested ${q.name} for being drunk and disorderly.`, 'quiet'); this.stats.drunks = (this.stats.drunks || 0) + 1;
  }
  /** The prisoner walks a step behind the constable. */
  followCop(q, dt) {
    const e = q.escort, cop = e && e.cop; if (!e || !cop || cop.remove || cop.escorting !== q || (cop.down > 0) || cop.activity !== 'police') { q.escort = null; if (cop && cop.escorting === q) cop.escorting = null; return; }   // (his shift's over, or he's down: they're let go)
    q.hurry = false; q.emote = { upper: 'crossarms', t: 0.5 }; const bx = cop.x - Math.sin(cop.heading) * 1.1, bz = cop.z - Math.cos(cop.heading) * 1.1;
    if (Math.hypot(bx - q.x, bz - q.z) > 1.4 && ((q.followT = (q.followT || 0) - dt) <= 0 || !q.path.length)) { q.followT = 0.8; q.goTo({ x: bx, z: bz }); }
  }
  walkPrisoner(cop, dt) {
    const g = this.game, q = cop.escorting, e = q && q.escort; if (!q || !e || q.remove) { cop.escorting = null; return; }
    const d = e.to.doorOut || e.to; cop.hurry = false;
    if (Math.hypot(cop.x - d.x, cop.z - d.z) > 2.2) { if ((cop.repath || 0) <= 0 || !cop.path.length) { cop.repath = 2; cop.goTo({ x: d.x, z: d.z }); } if (Math.hypot(q.x - cop.x, q.z - cop.z) > 7) cop.path = []; return; }   // (waits if the prisoner lags)
    if (Math.hypot(q.x - cop.x, q.z - cop.z) > 3) return;
    cop.escorting = null; q.escort = null; q.path = [];
    if (e.toLift) { g.population.depart(q); g.messages.push('Police', `${cop.roleName || 'PC'} ${cop.surname || cop.first} walked ${q.name} up to the Lift. Not welcome back in a hurry.`, 'quiet'); return; }
    const c = g.clock; q.lockup = e.to; q.cellsUntil = (c.hour < 7 ? c.totalDays * 24 + 7 : (c.totalDays + 1) * 24 + 7); this.cell(q, e.to); q.drinking = false;
    g.social.say(cop, pick(['In you go. Sleep it off.', 'Breakfast is at seven. Don\'t get excited.', 'Mind your head.']), 2.2);
  }
  /** Into the cell. In the Lock-Up they're to be seen (open the door): the first on the stone bench, the rest on the straw, asleep. Anywhere else they're just shut away. */
  cell(q, lk) {
    q.path = []; q.glide = null; q.phase = 2; q.standUp(); if (q.activity !== 'locked') { q.endActivity(); q.activity = 'locked'; } const B = lk.ext && lk.ext.bench;   // (now, so the change of activity doesn't get them up off the bench)
    if (!B) { q.hidden = true; q.inside = lk; q.x = lk.cx; q.z = lk.cz; return; }
    const others = this.game.population.sims.filter((s) => s !== q && s.lockup === lk && !s.remove && (s.cellsUntil || s.lockedT)).length, r = lk.rot * Math.PI / 2;
    const [x, z] = others ? lk.toWorld(0.25 - (others % 2) * 0.5, 0.35) : lk.toWorld(B.x, B.z);
    q.hidden = false; q.inside = lk; q.x = x; q.z = z; q.pose = 'sleep'; q.heading = r + Math.PI / 2 + (others ? 0.4 * (others % 2 ? 1 : -1) : 0); q.roughLie = others ? 0.14 : 0.5; q.inCell = true;
  }
  /** Seven in the morning: out they come with a sore head. A local goes home; anyone else is walked up to the Lift by a constable, or makes their own way up it. */
  release(q) {
    const g = this.game, lk = q.lockup; q.cellsUntil = 0; q.lockup = null; q.hidden = false; q.inside = null; q.drunk = 0; q.moodBoost -= 0.15; if (q.inCell) { q.inCell = false; q.pose = 'stand'; q.roughLie = undefined; }
    if (lk && lk.doorOut) { q.x = lk.doorOut.x; q.z = lk.doorOut.z; }
    if (q.mesh.visible) g.social.say(q, pick(['Oh, my head...', 'Never again.', 'What happened last night?', 'Where\'s my shoe?']), 2.6);
    if (q.home || q.kind === 'resident') { g.messages.push('Police', `${q.name} slept it off in the ${lk ? lk.def.name : 'cells'} and has gone home with a sore head.`, 'quiet'); return; }
    const cop = this.cops().find((c) => !c.escorting && Math.hypot(c.x - q.x, c.z - q.z) < 120);
    if (cop) { q.escort = { cop, to: g.lift, toLift: true }; cop.escorting = q; } else g.population.depart(q);   // (on their own, up the Lift)
  }

  // ---------- the police (called from Sim.think for constables on shift) ----------
  driveCop(s, dt) {
    const g = this.game, P = g.player; s.repath = (s.repath || 0) - dt; s.speedK = (s.workplace && s.workplace.def.policeSpeed) || 1;
    if (s.escorting) { this.walkPrisoner(s, dt); return; }   // a prisoner to take in (or up to the Lift)
    // the most pressing job: a crook seen in the act, a fight, or Sam if he's wanted
    let tgt = null, bd = 1e9; const consider = (o, d) => { if (d < bd) { bd = d; tgt = o; } };
    for (const q of g.population.sims) {
      if (q.crook && q.crook.seen && q.crook.state !== 'arrested' && !q.inside) consider(q, Math.hypot(q.x - s.x, q.z - s.z));
      else if (q.disorderly && !q.escort && !q.inside && !q.remove) consider(q, Math.hypot(q.x - s.x, q.z - s.z) + 8);
      else if (q.fight && !q.inside) consider(q, Math.hypot(q.x - s.x, q.z - s.z) + 5);
    }
    if (this.wanted > 0 && g.mode === 'sim' && !P.transit) consider(P, Math.hypot(P.x - s.x, P.z - s.z) - 10 * this.wanted);
    if (tgt && bd < 140) {
      s.hurry = true; if (s.repath <= 0 || !s.path.length) { s.repath = 1; s.goTo({ x: tgt.x, z: tgt.z }); if (!s.shout || g.elapsed > s.shout) { s.shout = g.elapsed + 8; if (s.mesh.visible) g.social.say(s, this.copLine(), 2.2); if (this.age >= 2) Sfx.tone(2400, 0.25, { type: 'square', vol: 0.04 }); } }
      const d = Math.hypot(tgt.x - s.x, tgt.z - s.z);
      if (d < 1.5 && tgt !== P) {
        if (tgt.crook) { tgt.knockDown(3); this.collar(tgt, s, false); }
        else if (tgt.disorderly) this.nick(tgt, s);
        else if (tgt.fight) { const f = tgt.fight.foe; g.social.say(s, this.age >= 3 ? 'Break it up, lads!' : 'Now then! Break it up!', 2.2); this.endFight(tgt, false); if (f && f !== P && f.fight) this.endFight(f, false); }
      }
      return;
    }
    // nothing doing: walk the beat round the streets near the station
    s.hurry = false;
    if (!s.path.length && (s.repath <= 0)) {
      s.repath = 4 + Math.random() * 6; const st = s.workplace || this.station(), w = g.world, TILE = 8;
      for (let i = 0; i < 8; i++) { const x = (st ? st.cx : s.x) + (Math.random() - 0.5) * 90, z = (st ? st.cz : s.z) + (Math.random() - 0.5) * 90, tx = Math.floor(x / TILE), tz = Math.floor(z / TILE); if (w.inBounds(tx, tz) && w.road[w.idx(tx, tz)]) { s.goTo({ x: (tx + 0.5) * TILE, z: (tz + 0.5) * TILE }); break; } }
      if (Math.random() < 0.2 && s.mesh.visible) g.social.say(s, pick(this.age === 0 ? ['All\'s well!', 'Mind the lamps, now.'] : ['Evening all.', 'Mind how you go.', 'Lovely day for it.']), 2);
    }
  }

  // ---------- Sam's side ----------
  /** Sam landed a blow on a sim. Crooks and brawlers are fair game; anyone else is assault. */
  samHit(v, dmg) {
    const g = this.game, P = g.player;
    this.hit(v, dmg, P);
    if (v.crook || v.kind === 'raider' || (v.fight && v.fight.foe !== P)) return;
    if (v.fight && v.fight.foe === P) return;   // he started it (or you did, but you're already wanted)
    const hot = v.kind === 'resident' && v.age >= 16 && v.age < 62 && (v.trait === 'grumpy' || (v.temper || 0) > 0.6 || Math.random() < 0.3);
    if (hot && !(v.down > 0)) { v.fight = { foe: P, t: 0, cd: 0.4, repath: 0 }; g.social.say(v, pick(['Right, that\'s it!', 'You what?!', 'Come on then!', 'Big mistake, Sam.']), 2); }
    else if (!(v.down > 0)) { v.panic = true; v.panicT = 6; g.social.say(v, pick(['Help! Police!', 'Ow! What was that for?!', 'Sam! Have you gone mad?']), 2.2); }
    v.samRel = (v.samRel || 0) - 8;
    const before = this.wanted; this.wanted = Math.min(5, this.wanted + (v.down > 0 ? 2 : 1)); this.calmT = 0;
    if (this.wanted > before) { g.ui.toast(this.hasPolice() ? `Wanted: ${'★'.repeat(this.wanted)}  The police are after you!` : `Wanted: ${'★'.repeat(this.wanted)}  (there's no police force to come for you... yet)`, 2600); }
  }
  arrestSam(cop) {
    const g = this.game, P = g.player, fine = 25 * this.wanted, st = cop.workplace || this.station();
    g.economy.lose(fine, 'Fines (Sam)'); this.wanted = 0; this.nickT = 0; g.social.say(cop, this.copLine(), 2.4);
    for (const s of g.population.sims) if (s.fight && s.fight.foe === P) this.endFight(s, false);
    g.ui.fade(0.9); setTimeout(() => { if (st && st.doorOut) P.teleport(st.doorOut.x, st.doorOut.z); g.ui.fade(0); }, 600);
    g.ui.toast(`You've been nicked! A night in the cells and a £${fine} fine.`, 4200); g.messages.push('Police', `Sam was arrested and fined £${fine}.`, 'warn');
  }
  serialize() { return { stats: this.stats }; }
  load(s) { if (s && s.stats) this.stats = s.stats; }
}
