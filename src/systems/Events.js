import * as THREE from 'three';
import { N96 } from '../data/nineties2.js';
import { Sfx } from '../core/Sfx.js';
import { pick } from '../util.js';
import { A } from '../data/humour.js';
import { buildFete, animateFete } from '../render/Fete.js';
import { weekdayOf } from '../data/calendar.js';

/** Fête day: the first Saturday of the month, May to September. */
const feteDate = (y, m, d) => m >= 4 && m <= 8 && d <= 7 && weekdayOf(y, m, d) === 5;

const FETE_LINES = ['Lovely fête!', 'Who made this cake?', 'Coconut shy! Go on!', 'Best in show, that marrow.', 'Tombola! I won a tin of peas.', 'Three cheers for Sam!', 'Morris dancers next!', 'Pimm\'s, anyone? Well, squash.', 'Hook-a-duck! Again!', 'Lovely day for it.'];
const CLEAN_LETTERS = [
  ['Mrs Higginbottom, No. 4', 'Complaint', 'Dear Sam,\n\nSomeone keeps leaving their bins out. I have my suspicions. Please do something.\n\nAlso, the seagulls are mocking me.\n\nYours, very cross'],
  ['The Pub Quiz Team', 'Grand Final', 'Dear Sam,\n\nYou are invited to the pub quiz Grand Final this Thursday. Prize: a meat raffle and eternal glory.'],
  ['Dave from the Lift', 'Your order', 'Alright Sam,\n\nIf you want anything bringing down the Lift, use the intercom on the yellow post next to it. Don\'t climb on the platform, the lads upstairs get twitchy.\n\nDave'],
  ['The Neighbourhood Watch', 'Suspicious activity', 'Dear Sam,\n\nA figure has been seen lurking near the Lift at night. It may have been a bin bag. Stay vigilant.'],
];
const TUNE = [523, 587, 659, 523, 659, 698, 784, 0, 784, 880, 784, 698, 659, 523, 587, 523];

/** Town events: the village fête (the first Saturday of each month from May to September) round the campfire, the village hall or a park, with bunting, stalls, a tune and a good mood all round. */
export class Events {
  constructor(game) { this.game = game; this.fete = null; this.announced = -1; this.bunting = null; this.tuneT = 0; this.note = 0; this.count = 0; }
  site() { const g = this.game; return g.buildings.list.find((b) => b.state === 'done' && (b.id === 'villagehall' || b.id === 'bandstand')) || g.buildings.list.find((b) => b.state === 'done' && (b.def.park === 'plaza' || b.def.park === 'park')) || g.buildings.list.find((b) => b.state === 'done' && b.def.park === 'camp') || null; }
  /** Little bits of life: pub banter, snoring in church, heckling the brass band, the odd cheeky letter. */
  ambient(dt) {
    const g = this.game; this.ambT = (this.ambT || 3) - dt; if (this.ambT > 0) return; this.ambT = 3 + Math.random() * 4;
    const p = g.player, near = g.population.sims.filter((s) => s.mesh.visible && !s.chat && s.kind !== 'child' && Math.hypot(s.x - p.x, s.z - p.z) < 30);
    const drinker = near.find((s) => s.drinking && s.sitting), pew = near.find((s) => s.sitting && s.sitting.kind === 'pew'), band = near.find((s) => s.bandT);
    const PUB = ['Same again?', 'Whose round is it?', 'Cheers!', 'Lovely pint, that.', 'Get the darts out!'], CH = ['Amen.', 'Lovely hymn.', 'Shh!'], BAND = ['Lovely tune!', 'Encore!', 'Bravo!'];
    const ad = g.ui.adult && Math.random() < 0.6;
    const venue = near.find((s) => s.inside && N96.venue[s.inside.id] && Math.random() < 0.5);
    if (venue && Math.random() < 0.6) g.social.say(venue, pick(N96.venue[venue.inside.id]), 2.2);   // a shout from the snooker hall, the bingo, the bowling alley...
    else if (drinker && Math.random() < 0.7) g.social.say(drinker, pick(ad ? A.PUB : PUB), 2.4);
    else if (pew && Math.random() < 0.5) g.social.say(pew, pick(ad ? A.CHURCH : CH), 2.2);
    else if (band && Math.random() < 0.6) g.social.say(band, pick(ad ? A.BAND : BAND), 2.2);
    // the church bell on Sunday morning
    if (g.clock.totalDays % 7 === 6 && g.clock.hour >= 9 && g.clock.hour < 9.4 && this.bellDay !== g.clock.totalDays && g.buildings.church()) { this.bellDay = g.clock.totalDays; if (g.mode === 'sim') Sfx.play('bell'); g.messages.push('St Sam\'s', 'The bells are ringing for Sunday service.', ''); }
    // now and then a letter from a neighbour
    const day = g.clock.totalDays; if (g.mail.box && g.population.count() >= 4 && day >= 2 && this.letterDay !== day && day % 3 === 1 && g.clock.hour > 8) {
      this.letterDay = day; const L = g.ui.adult ? A.LETTERS : CLEAN_LETTERS, n = (this.letterN = (this.letterN || 0) + 1), l = L[(n - 1) % L.length]; g.mail.send(l[0], l[1], l[2]);
    }
  }
  update(dt) {
    this.ambient(dt);
    const g = this.game, c = g.clock, day = c.totalDays, isDay = feteDate(c.year, c.month, c.day), site = this.site(), ok = site && g.population.count() >= 5;
    const tm = new Date(Date.UTC(c.year, c.month, c.day + 1)), tomorrow = feteDate(tm.getUTCFullYear(), tm.getUTCMonth(), tm.getUTCDate());
    if (ok && tomorrow && c.hour >= 9 && this.announced !== day) { this.announced = day; g.mail.send('The Fête Committee', 'Village Fête tomorrow!', `Dear Sam,\n\nThe village fête is tomorrow from noon until six, at the ${site.def.name}. There will be cakes, a tombola, a coconut shy, hook-a-duck, the plant stall, teas in the tent and a bouncy castle for the little ones.\n\nDo come along.\n\nThe Fête Committee`); }
    const want = ok && isDay && c.hour >= 12 && c.hour < 18;
    if (want && !this.fete) this.start(site); else if (!want && this.fete) this.end();
    if (!this.fete) return;
    const f = this.fete, p = g.player, near = g.mode === 'sim' && Math.hypot(p.x - f.x, p.z - f.z) < 30;
    // a little tune on the fair organ when Sam is close
    this.tuneT -= dt; if (near && this.tuneT <= 0 && g.clock.speed > 0) { const n = TUNE[this.note++ % TUNE.length]; if (n) Sfx.tone(n, 0.22, { type: 'triangle', vol: 0.05 }); this.tuneT = 0.26; }
    if (Math.random() < dt * 0.6) { const s = pick(g.population.sims.filter((q) => !q.hidden && Math.hypot(q.x - f.x, q.z - f.z) < 9) || []); if (s && s.mesh.visible) { g.social.say(s, pick(g.ui.adult && s.kind !== 'child' && Math.random() < 0.5 ? A.FETE : FETE_LINES), 2.4); s.emote = { upper: pick(['wave', 'laugh', 'dance', 'dance', 'clap', 'cheer']), t: 2.4 }; s.moodBoost += 0.05; } }
    if (this.bunting) for (const fl of this.bunting.userData.flags) fl.rotation.x = Math.sin(performance.now() / 260 + fl.userData.ph) * 0.25;
    if (this.moving) animateFete(this.moving, performance.now() / 1000);
  }
  /** Open ground for the fête: a park's middle, or in front of the hall (else beside it), where no building or road gets in the way. */
  ground(site, R = 8) {
    const g = this.game, w = g.world; if (site.def.park || !site.doorOut) return { x: site.cx, z: site.cz };
    const dx = site.doorOut.x - site.cx, dz = site.doorOut.z - site.cz, n = Math.hypot(dx, dz) || 1, fx = dx / n, fz = dz / n, half = Math.max(site.w || 1, site.d || 1) * 4 / 2;
    const clear = (x, z) => { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; for (const r of [2, R * 0.6, R]) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, [tx, tz] = w.tileOf(px, pz); if (!w.inBounds(tx, tz) || w.terrain[w.idx(tx, tz)] === 0 || w.collides(px, pz, 0.4) || w.road[w.idx(tx, tz)] || (w.res && w.res[w.idx(tx, tz)])) return false; } } return true; };
    for (const [ax, az] of [[fx, fz], [-fz, fx], [fz, -fx], [-fx, -fz]]) for (const k of [1, 1.4, 1.9]) { const x = site.cx + ax * (half + R * k), z = site.cz + az * (half + R * k); if (clear(x, z)) return { x, z }; }
    return { x: site.doorOut.x + fx * (R + 1), z: site.doorOut.z + fz * (R + 1) };   // (nowhere clear: in front of the door anyway)
  }
  start(site) {
    const g = this.game, at = this.ground(site); this.fete = { x: at.x, z: at.z, site }; this.count++; g.flags.fetes = (g.flags.fetes || 0) + 1; g.messages.push('The Fête Committee', 'The village fête is on! Everybody to the ' + site.def.name + '.', 'good');
    if (g.started) g.ui.toast('🎪 Village Fête at the ' + site.def.name + ' until 18:00!', 3500);
    const grp = new THREE.Group(), R = 7, poles = 6, cols = [0xd8342c, 0xffffff, 0x2a5fb0, 0xf2c94c, 0x3a9a54], wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a }); grp.userData.flags = [];
    const pts = []; for (let i = 0; i < poles; i++) { const a = i / poles * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; pts.push([x, z]); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), wood); pole.position.set(x, 1.7, z); pole.castShadow = true; grp.add(pole); }
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.45, 0], 3)); tri.computeVertexNormals();
    let k = 0; for (let i = 0; i < poles; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % poles]; for (let j = 1; j < 9; j++) { const t = j / 9, sag = Math.sin(t * Math.PI) * 0.5, fl = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: cols[k++ % cols.length], side: THREE.DoubleSide })); fl.position.set(x0 + (x1 - x0) * t, 3.3 - sag, z0 + (z1 - z0) * t); fl.rotation.y = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; fl.userData.ph = k; grp.add(fl); grp.userData.flags.push(fl); } }
    // the stalls, the coconut shy, the tea tent and a bouncy castle (src/render/Fete.js)
    const F = buildFete(R); grp.add(F.grp); this.moving = F.moving;
    grp.position.set(at.x, 0, at.z); g.scene.add(grp); this.bunting = grp;
  }
  end() {
    const g = this.game; if (this.bunting) g.scene.remove(this.bunting); this.bunting = null; this.moving = null;
    if (this.fete) { for (const s of g.population.residents()) if (Math.hypot(s.x - this.fete.x, s.z - this.fete.z) < 12) s.moodBoost += 0.15; g.messages.push('The Fête Committee', 'What a day! Thank you all for coming.', 'good'); }
    this.fete = null;
  }
}
