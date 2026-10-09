import * as THREE from 'three';
import { Sfx } from '../core/Sfx.js';
import { pick, fmtMoney } from '../util.js';
import { MATERIALS } from '../data/buildings.js';
import { TILE } from '../config.js';

const WED = ['Don\'t they look lovely!', 'I always cry at weddings.', 'Who\'s got the confetti?', 'Speech! Speech!', 'Three cheers for the happy couple!', 'Lovely service, that.', 'Mind the vicar\'s hat!', 'Hip hip hooray!'];
const WED_A = ['Free bar or I\'m going home.', 'Six months. I give it six months.', 'Best man\'s had a skinful already.', 'Agadoo at the reception, mark my words.', 'I\'ve got a fiver on them lasting.', 'Is that a mullet or a wedding hat?'];
const BONF = ['Ooooh!', 'Aaaah!', 'Remember, remember the fifth of November!', 'Lovely sparklers!', 'Who\'s got the toffee apples?', 'Mind the Catherine wheel!', 'Ooh, a green one!', 'Wrap up warm!'];
const BONF_A = ['That rocket nearly took my eyebrows off.', 'Bloody hell, that was a big one!', 'Me dad lit one in a milk bottle once. Lost a thumb.', 'Same fireworks as last year. Same order and everything. Odd.', 'Pass the mulled wine, I can\'t feel my bum.'];
const MARKET = ['Lovely bit of veg!', 'How much for the marrow?', 'Get your fresh eggs here!', 'Two for a pound!', 'Bargain!', 'Lucky dip! Go on!'];
const MARKET_A = ['Fell off the back of a lorry, this lot. Don\'t ask.', 'Melons! Lovely melons! Behave.', 'Pukka gear, this. Cushty.', 'This watch is a genuine Rolex. Genuine-ish.'];
const DIP = [
  ['a tin of Quality Street (mostly the green triangles)', (g) => { g.player.hunger = Math.max(0, g.player.hunger - 25); }],
  ['two pounds of spuds', (g) => g.player.invAdd('food', 2)],
  ['a crisp tenner!', (g) => g.economy.earn(10)],
  ['a bottle of Lucozade. Zing!', (g) => { g.player.energy = Math.min(100, g.player.energy + 30); }],
  ['a VHS of Mr Bean, a bit chewed', null], ['a signed photo of Noel Edmonds', null], ['a Tamagotchi (it has already died)', null], ['a pair of shell suit trousers', null], ['a Spice Girls lolly', (g) => { g.player.hunger = Math.max(0, g.player.hunger - 8); }],
  ['a £20 note! The stallholder looks gutted.', (g) => g.economy.earn(20)],
];
const STALLS = [
  { id: 'veg', name: 'Greengrocer', awning: [0x3a9a54, 0xffffff], goods: [0xd8342c, 0xe0a030, 0x6aa04a, 0x8a5a2a] },
  { id: 'swap', name: 'Swap stall', awning: [0x2a5fb0, 0xffffff], goods: [0x8a6a4a, 0x9a9a9a, 0xb06a4a, 0x8fc8e0] },
  { id: 'dip', name: 'Lucky dip', awning: [0xd8342c, 0xf2c94c], goods: [0xff60a0, 0x60c0ff, 0xf2c94c, 0x9a60e0] },
];

/** Bigger days in the town calendar: weddings at St Sam's, Bonfire Night and New Year fireworks, and a weekly market where Sam can buy and sell. */
export class Celebrations {
  constructor(game) { this.game = game; this.wed = null; this.bonfire = null; this.market = null; this.stalls = []; }
  get adult() { return this.game.ui.adult; }
  /** Somewhere a person can stand: on land, and not inside a building (parks are fine). */
  free(x, z) { const g = this.game, tx = Math.floor(x / TILE), tz = Math.floor(z / TILE); return g.world.isLand(tx, tz) && !g.buildings.buildingAtPoint(x, z); }
  /** Try a few random spots from `gen` and keep the first free one. */
  spotFrom(gen) { let d = null; for (let i = 0; i < 10; i++) { d = gen(); if (this.free(d.x, d.z)) return d; } return d; }
  say(s, clean, adult) { if (!s.mesh.visible) return; this.game.social.say(s, pick(this.adult && s.kind !== 'child' && adult && Math.random() < 0.45 ? adult : clean), 2.6); }
  mat(c, e = 0) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, emissive: e ? c : 0, emissiveIntensity: e }); }
  drop(grp) { if (!grp) return; this.game.scene.remove(grp); grp.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } if (o.isLight) o.dispose && o.dispose(); }); }

  /** The current event wants this person there (an invited guest, the couple, or a Bonfire Night crowd). */
  calling(s, h) {
    const w = this.wed; if (w && w.live && (s === w.a || s === w.b || w.guests.has(s))) return w;
    const bf = this.bonfire; if (bf && bf.live && (s.kind === 'resident' || s.kind === 'child') && s.id % 10 < 8) return bf;
    return null;
  }
  update(dt) {
    const g = this.game; if (!g.started && !g.demoMode) return;
    this.wedding(dt); this.fireworksNight(dt); this.marketDay(dt);
    // crowd reactions
    this.crowdT = (this.crowdT || 0) - dt; if (this.crowdT > 0) return; this.crowdT = 0.8 + Math.random() * 1.2;
    for (const ev of [this.wed && this.wed.live && this.wed, this.bonfire && this.bonfire.live && this.bonfire]) {
      if (!ev) continue; const near = g.population.sims.filter((s) => !s.hidden && s.activity === 'event' && s.mesh.visible && Math.hypot(s.x - ev.x, s.z - ev.z) < 12 && !s.path.length);
      const s = pick(near); if (!s) continue;
      if (ev === this.wed) { this.say(s, WED, WED_A); s.emote = { upper: pick(['clap', 'cheer', 'wave', 'clap']), t: 2.4 }; }
      else { this.say(s, BONF, BONF_A); s.emote = { upper: pick(['cheer', 'clap', 'idle', 'wave']), t: 2 }; }
      s.moodBoost += 0.02;
    }
  }

  // ---------- weddings ----------
  wedding(dt) {
    const g = this.game, c = g.clock, today = c.totalDays, church = g.buildings.byDef('church')[0];
    if (!this.wed && church && today % 7 === 4 && c.hour >= 9 && this.planned !== today) {
      this.planned = today;
      const a = g.population.adults().find((s) => s.partner && !s.married && !s.partner.married && !s.leaving && !s.partner.leaving && s.partner.kind === 'resident' && today - (s.coupleDay ?? today) >= 2 && s.id < s.partner.id);
      if (a) { this.wed = { a, b: a.partner, day: today + 1, church, guests: new Set() }; g.mail.send(`${a.first} & ${a.partner.first}`, 'You\'re invited to a wedding!', `Dear Sam,\n\n${a.name} and ${a.partner.name} request the pleasure of your company at their wedding at St Sam's Church tomorrow at 11 o'clock.\n\nConfetti will be provided. Hats optional. No heckling.\n\nLove,\n${a.first} & ${a.partner.first} x`); }
    }
    const w = this.wed; if (!w) return;
    if (w.a.remove || w.b.remove || w.a.leaving || w.b.leaving || w.church.state !== 'done' || !g.buildings.list.includes(w.church)) { this.endWedding(false); return; }
    const live = today === w.day && c.hour >= 10.5 && c.hour < 13.5;
    if (live && !w.live) this.startWedding(w);
    if (!live && w.live) this.endWedding(true);
    if (!live && today > w.day) this.endWedding(false);
    if (!w.live) return;
    // confetti once the couple are at the door
    const [cx, cz] = w.couple(0); w.x = cx; w.z = cz; const here = Math.hypot(w.a.x - cx, w.a.z - cz) < 2.5 && Math.hypot(w.b.x - cx, w.b.z - cz) < 2.5;
    w.t = (w.t || 0) - dt; if (here && w.t <= 0 && c.hour >= 11.2) { w.t = 0.7 + Math.random() * 0.8; for (const col of [0xffffff, 0xffb0d0, 0xfff0a0, 0xb0d8ff]) g.particles.burst(cx + (Math.random() - 0.5) * 2, 2.6, cz + (Math.random() - 0.5) * 2, col, 5, 0.9, 1.2, 0.07); if (!w.kissed && c.hour >= 12) { w.kissed = true; g.social.say(w.a, '♥', 4); g.social.say(w.b, '♥', 4); if (this.heard(cx, cz)) Sfx.play('bell'); } }
    if (here && Math.random() < dt * 0.3) { w.a.emote = { upper: pick(['wave', 'cheer', 'dance']), t: 2.4 }; w.b.emote = { upper: pick(['wave', 'cheer', 'dance']), t: 2.4 }; }
  }
  heard(x, z) { const g = this.game; return g.mode === 'sim' && Math.hypot(g.player.x - x, g.player.z - z) < 60; }
  startWedding(w) {
    const g = this.game, ch = w.church; w.live = true;
    const ux0 = ch.doorOut.x - ch.cx, uz0 = ch.doorOut.z - ch.cz, L = Math.hypot(ux0, uz0) || 1, ux = ux0 / L, uz = uz0 / L, px = -uz, pz = ux;
    w.couple = (side) => [ch.doorOut.x + ux * 1.4 + px * side * 0.55, ch.doorOut.z + uz * 1.4 + pz * side * 0.55];
    const face = Math.atan2(ux, uz);
    w.spot = (s) => {
      if (s === w.a || s === w.b) { const [x, z] = w.couple(s === w.a ? -1 : 1); s.wedTimer = 1; return { x, z, face }; }
      const [cx, cz] = w.couple(0);
      return this.spotFrom(() => { const ang = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.1), r = 2.6 + Math.random() * 3.2, dx = ux * Math.cos(ang) - px * Math.sin(ang), dz = uz * Math.cos(ang) - pz * Math.sin(ang); return { x: cx + dx * r, z: cz + dz * r, face: Math.atan2(-dx, -dz) }; });
    };
    w.hold = (s) => s === w.a || s === w.b;
    // the guest list: friends and family first, then whoever fancies a do
    const P = g.population.residents().filter((s) => s !== w.a && s !== w.b && !s.leaving);
    for (const s of P) { const close = (w.a.rel.get(s.id) || 0) >= 20 || (w.b.rel.get(s.id) || 0) >= 20 || s.parents.includes(w.a) || s.parents.includes(w.b) || w.a.parents.includes(s) || w.b.parents.includes(s); if (close || Math.random() < 0.35) w.guests.add(s); if (w.guests.size >= 16) break; }
    // a flower arch at the church door
    const grp = new THREE.Group(), white = this.mat(0xf6f2ea), arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.07, 6, 18, Math.PI), white); arch.position.y = 2.1; grp.add(arch);
    for (const sx of [-1.25, 1.25]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 6), white); post.position.set(sx, 1.05, 0); grp.add(post); }
    const fl = [0xff8fb0, 0xffffff, 0xd8342c, 0xffd0e0, 0xf2c94c]; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI, b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), this.mat(fl[i % fl.length], 0.15)); b.position.set(Math.cos(a) * 1.25, 2.1 + Math.sin(a) * 1.25, 0); b.rotation.set(i, i * 2, 0); grp.add(b); }
    const [ax, az] = w.couple(0); grp.position.set(ax + ux * 0.2, 0, az + uz * 0.2); grp.rotation.y = face; g.scene.add(grp); w.arch = grp;
    g.messages.push('St Sam\'s', `${w.a.name} and ${w.b.name} are getting married!`, 'good');
    if (g.started) g.ui.toast(`💒 Wedding at St Sam's: ${w.a.first} & ${w.b.first}! Go and throw some confetti.`, 4000);
    if (this.heard(ch.cx, ch.cz)) Sfx.play('bell');
  }
  endWedding(happened) {
    const g = this.game, w = this.wed; if (!w) return; this.drop(w.arch);
    if (happened) {
      w.a.married = w.b.married = true; w.a.moodBoost += 0.4; w.b.moodBoost += 0.4; for (const s of w.guests) s.moodBoost += 0.15; g.flags.weddings = (g.flags.weddings || 0) + 1;
      g.messages.push('St Sam\'s', `${w.a.first} and ${w.b.first} are married. Lovely do.`, 'good');
      g.mail.send('The Sam City Gazette', `Wedding bells for ${w.a.first} & ${w.b.first}`, `Wedding bells rang out at St Sam's as ${w.a.name} and ${w.b.name} tied the knot in front of ${w.guests.size} guests.\n\n${this.adult ? 'The best man\'s speech was described as "a bit much" and the buffet ran out of vol-au-vents by half twelve.' : 'The happy couple left under a shower of confetti, and the cake was a triumph.'}\n\nCongratulations to them both!`, { quiet: true });
    }
    this.wed = null;
  }

  // ---------- Bonfire Night (5 November) and New Year's Eve ----------
  fireworksNight(dt) {
    const g = this.game, c = g.clock, fw = g.fireworks, bonfireDay = c.month === 10 && c.day === 5;
    if (c.month === 10 && c.day === 4 && c.hour >= 9 && this.bfLetter !== c.year && g.population.count() >= 3) { this.bfLetter = c.year; g.mail.send('The Bonfire Committee', 'Bonfire Night tomorrow!', `Dear Sam,\n\nRemember, remember! The town bonfire is lit tomorrow at 6 o'clock${this.siteName()}, with fireworks from 7.\n\nToffee apples and parkin will be served. Keep pets indoors.\n\nThe Bonfire Committee`); }
    const live = bonfireDay && c.hour >= 18 && c.hour < 22.5 && g.population.count() >= 3;
    if (live && !this.bonfire) this.startBonfire(); else if (!live && this.bonfire) this.endBonfire();
    const bf = this.bonfire;
    if (bf) {
      const t = performance.now() / 1000, burn = c.hour < 21 ? 1 : Math.max(0.35, 1 - (c.hour - 21) / 1.5);
      for (const [i, f] of bf.flames.entries()) { const k = burn * (0.85 + Math.sin(t * (7 + i) + i * 2) * 0.15); f.scale.set(k, k * (1 + Math.sin(t * 9 + i) * 0.12), k); }
      bf.light.intensity = (22 + Math.sin(t * 13) * 5 + Math.sin(t * 7.3) * 4) * burn;
      if (Math.random() < dt * 6) g.particles.burst(bf.x + (Math.random() - 0.5), 3.2 * burn, bf.z + (Math.random() - 0.5), Math.random() < 0.5 ? 0xffb03a : 0xff6a20, 1, 0.3, 4, 0.08);
      if (c.hour >= 19 && c.hour < 22.2) { bf.t -= dt; if (bf.t <= 0) { bf.t = 0.5 + Math.random() * 1.4; fw.launch(bf.fx, bf.fz); if (Math.random() < 0.25) setTimeout(() => fw.launch(bf.fx + 2, bf.fz - 1), 250); } }
    }
    // New Year: fireworks over the town from 23:30 on the last night of December until half past midnight
    const nye = (c.month === 11 && c.day === 8 && c.hour >= 23.5) || (c.month === 0 && c.day === 1 && c.hour < 0.6 && c.totalDays > 0);
    if (nye && g.population.count() >= 1) {
      const s = this.site(), x = s ? s.cx : g.plaza.x, z = s ? s.cz : g.plaza.z; this.nyT = (this.nyT || 0) - dt;
      if (this.nyT <= 0) { this.nyT = c.month === 0 ? 0.25 + Math.random() * 0.4 : 0.6 + Math.random() * 1.2; fw.launch(x + (Math.random() - 0.5) * 16, z + (Math.random() - 0.5) * 16); }
      if (c.month === 0 && this.newYear !== c.year) { this.newYear = c.year; if (g.started) g.ui.toast(`🎆 Happy New Year! Welcome to ${c.year}!`, 4500); g.messages.push('Town', `Happy New Year ${c.year}!`, 'good'); for (const q of g.population.residents()) q.moodBoost += 0.1; }
    }
  }
  site() { const B = this.game.buildings.list.filter((b) => b.state === 'done'); return B.find((b) => b.def.park === 'field') || B.find((b) => b.def.park === 'plaza') || B.find((b) => b.def.park === 'park') || B.find((b) => b.def.park === 'camp') || null; }
  siteName() { const s = this.site(); return s ? ` at the ${s.def.name}` : ''; }
  startBonfire() {
    const g = this.game, s = this.site(), cx = s ? s.cx : g.plaza.x, cz = s ? s.cz : g.plaza.z, onCamp = s && s.def.park === 'camp';
    const at = onCamp ? this.spotFrom(() => { const a = Math.random() * Math.PI * 2; return { x: cx + Math.cos(a) * 5.5, z: cz + Math.sin(a) * 5.5 }; }) : { x: cx, z: cz }, x = at.x, z = at.z, grp = new THREE.Group();
    const wood = this.mat(0x5a3a22), dark = this.mat(0x3a2616);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 5), i % 2 ? wood : dark); log.position.set(Math.cos(a) * 0.7, 1.3, Math.sin(a) * 0.7); log.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); grp.add(log); }
    // the guy on top
    const guy = new THREE.Group(), cloth = this.mat(0x6a5a4a); const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.3), cloth); body.position.y = 0.3; const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), this.mat(0xe8d8b0)); head.position.y = 0.78; const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 8), this.mat(0x1a1a1a)); hat.position.y = 1.0; guy.add(body, head, hat); guy.position.y = 2.6; grp.add(guy);
    const flames = []; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5 - i * 0.04, 1.6 + (i % 3) * 0.6, 6), new THREE.MeshBasicMaterial({ color: [0xff6a10, 0xffa020, 0xffd040][i % 3], transparent: true, opacity: 0.85, depthWrite: false })); f.position.set(Math.cos(i * 2.1) * 0.45, 0.9 + (i % 3) * 0.35, Math.sin(i * 2.1) * 0.45); grp.add(f); flames.push(f); }
    const light = new THREE.PointLight(0xff8a30, 25, 26, 1.6); light.position.y = 2.2; grp.add(light);
    grp.position.set(x, 0, z); g.scene.add(grp);
    this.bonfire = { live: true, x, z, fx: x + 9, fz: z + 4, grp, flames, light, t: 2, spot: (sim) => this.spotFrom(() => { const a = Math.random() * Math.PI * 2, r = 4.5 + Math.random() * 3.5; return { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, face: Math.atan2(-Math.cos(a), -Math.sin(a)) }; }) };
    g.messages.push('The Bonfire Committee', 'The bonfire is lit! Fireworks from 7.', 'good'); if (g.started) g.ui.toast(`🔥 Bonfire Night${this.siteName()}! Fireworks from 19:00.`, 4000);
    g.flags.bonfires = (g.flags.bonfires || 0) + 1;
  }
  endBonfire() { const b = this.bonfire; this.drop(b.grp); for (const q of this.game.population.residents()) if (Math.hypot(q.x - b.x, q.z - b.z) < 14) q.moodBoost += 0.15; this.bonfire = null; }

  // ---------- market day ----------
  marketDay() {
    const g = this.game, c = g.clock, live = c.totalDays % 7 === 2 && c.hour >= 9 && c.hour < 15 && g.population.count() >= 6;
    if (live && !this.market) this.startMarket(); else if (!live && this.market) this.endMarket();
  }
  startMarket() {
    const g = this.game, s = this.site() || g.events.site(); if (!s) return;
    // a row of stalls out in front of the site, facing its door, like a street market
    const ux0 = s.doorOut.x - s.cx, uz0 = s.doorOut.z - s.cz, L = Math.hypot(ux0, uz0) || 1, ux = ux0 / L, uz = uz0 / L, px = -uz, pz = ux, face = Math.atan2(-ux, -uz), grp = new THREE.Group(); this.stalls = [];
    const ox = s.doorOut.x + ux * 5, oz = s.doorOut.z + uz * 5;
    STALLS.forEach((st, i) => {
      const x = ox + px * (i - 1) * 3.4, z = oz + pz * (i - 1) * 3.4, sg = new THREE.Group();
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.9), this.mat(0x8a6a4a)); table.position.y = 0.42; sg.add(table);
      for (const [qx, qz] of [[-1.05, -0.4], [1.05, -0.4], [-1.05, 0.4], [1.05, 0.4]]) { const q = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.3, 0.07), this.mat(0xe8e0d0)); q.position.set(qx, 1.15, qz); sg.add(q); }
      for (let k = 0; k < 6; k++) { const aw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 1.2), this.mat(st.awning[k % 2])); aw.position.set(-1.0 + k * 0.4, 2.3, 0.05); aw.rotation.x = 0.18; sg.add(aw); }
      for (let k = 0; k < 4; k++) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.42), this.mat(0xb08a5a)); cr.position.set(-0.75 + k * 0.5, 0.94, 0.05); sg.add(cr); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), this.mat(st.goods[k])); gd.position.set(-0.75 + k * 0.5, 1.07, 0.05); sg.add(gd); }
      sg.position.set(x, 0, z); sg.rotation.y = face; grp.add(sg);
      this.stalls.push({ ...st, x: x - ux * 1.2, z: z - uz * 1.2 });
    });
    g.scene.add(grp); this.market = { x: ox - ux * 2.5, z: oz - uz * 2.5, grp, site: s };
    if (!g.flags.marketMail) { g.flags.marketMail = 1; g.mail.send('The Market Trader\'s Association', 'Market day', `Dear Sam,\n\nThe market is held every week from 9 until 3 at the ${s.def.name}.\n\nThe Swap stall buys anything you've gathered at full price (better than the Lift!), the Greengrocer sells veg, and the Lucky dip is a fiver a go. No refunds.`); }
    if (g.started) g.ui.toast(`🥕 Market day at the ${s.def.name} until 15:00. Sell what you've gathered at the Swap stall.`, 3800);
  }
  endMarket() { this.drop(this.market.grp); this.market = null; this.stalls = []; }
  stallText(st) {
    const g = this.game, p = g.player;
    if (st.id === 'veg') return `Greengrocer: buy 3 food for £12`;
    if (st.id === 'dip') return 'Lucky dip: £5 a go';
    const n = p.invTotal(); return n ? `Swap stall: sell ${p.invText()} for ${fmtMoney(this.swapValue())}` : 'Swap stall: they buy anything you have gathered';
  }
  swapValue() { const inv = this.game.player.inv; return Object.entries(inv).reduce((a, [m, n]) => a + (MATERIALS[m] ? MATERIALS[m].price * n : 0), 0); }
  useStall(st) {
    const g = this.game, p = g.player, e = g.economy, bump = (n) => { g.flags.market = (g.flags.market || 0) + n; };
    const nearSim = g.population.sims.find((s) => s.mesh.visible && !s.hidden && Math.hypot(s.x - st.x, s.z - st.z) < 6); if (nearSim && Math.random() < 0.5) this.say(nearSim, MARKET, MARKET_A);
    if (st.id === 'veg') { if (p.invRoom() < 1) return g.ui.toast('Your backpack is full.'); if (!e.spend(12)) return g.ui.toast('Not enough money in the town funds.'); const n = p.invAdd('food', 3); bump(n); Sfx.play('cash'); return g.ui.toast(`You buy ${n} food. "Lovely bit of veg, that."`, 2600); }
    if (st.id === 'dip') { if (!e.spend(5)) return g.ui.toast('Not enough money.'); const [what, fx] = pick(DIP); if (fx) fx(g); bump(1); Sfx.play('pickup'); return g.ui.toast(`🎁 Lucky dip: you pull out ${what}`, 3200); }
    const v = this.swapValue(), n = p.invTotal(); if (!n) { Sfx.play('deny'); return g.ui.toast('Nothing to sell. Gather timber, stone or food and bring it here.'); }
    e.earn(v); p.inv = {}; bump(n); Sfx.play('cash'); g.ui.toast(`You sell ${n} things for ${fmtMoney(v)}. "Pleasure doing business."`, 3000);
  }
}
