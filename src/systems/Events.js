import * as THREE from 'three';
import { Sfx } from '../core/Sfx.js';
import { pick } from '../util.js';
import { A } from '../data/humour.js';

const FETE_LINES = ['Lovely fête!', 'Who made this cake?', 'Coconut shy! Go on!', 'Best in show, that marrow.', 'Tombola! I won a tin of peas.', 'Three cheers for Sam!', 'Morris dancers next!', 'Pimm\'s, anyone? Well, squash.', 'Hook-a-duck! Again!', 'Lovely day for it.'];
const CLEAN_LETTERS = [
  ['Mrs Higginbottom, No. 4', 'Complaint', 'Dear Sam,\n\nSomeone keeps leaving their bins out. I have my suspicions. Please do something.\n\nAlso, the seagulls are mocking me.\n\nYours, very cross'],
  ['The Pub Quiz Team', 'Grand Final', 'Dear Sam,\n\nYou are invited to the pub quiz Grand Final this Thursday. Prize: a meat raffle and eternal glory.'],
  ['Dave from the Lift', 'Your order', 'Alright Sam,\n\nIf you want anything bringing down the Lift, use the intercom on the yellow post next to it. Don\'t climb on the platform, the lads upstairs get twitchy.\n\nDave'],
  ['The Neighbourhood Watch', 'Suspicious activity', 'Dear Sam,\n\nA figure has been seen lurking near the Lift at night. It may have been a bin bag. Stay vigilant.'],
];
const TUNE = [523, 587, 659, 523, 659, 698, 784, 0, 784, 880, 784, 698, 659, 523, 587, 523];

/** Town events. For now: a village fête every few days around the campfire (or a park), with bunting, a tune and a good mood all round. */
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
    if (drinker && Math.random() < 0.7) g.social.say(drinker, pick(ad ? A.PUB : PUB), 2.4);
    else if (pew && Math.random() < 0.5) g.social.say(pew, pick(ad ? A.CHURCH : CH), 2.2);
    else if (band && Math.random() < 0.6) g.social.say(band, pick(ad ? A.BAND : BAND), 2.2);
    // the church bell on Sunday morning
    if (g.clock.totalDays % 7 === 6 && g.clock.hour >= 9 && g.clock.hour < 9.4 && this.bellDay !== g.clock.totalDays && g.buildings.count('church')) { this.bellDay = g.clock.totalDays; if (g.mode === 'sim') Sfx.play('bell'); g.messages.push('St Sam\'s', 'The bells are ringing for Sunday service.', ''); }
    // now and then a letter from a neighbour
    const day = g.clock.totalDays; if (g.mail.box && g.population.count() >= 4 && day >= 2 && this.letterDay !== day && day % 3 === 1 && g.clock.hour > 8) {
      this.letterDay = day; const L = g.ui.adult ? A.LETTERS : CLEAN_LETTERS, n = (this.letterN = (this.letterN || 0) + 1), l = L[(n - 1) % L.length]; g.mail.send(l[0], l[1], l[2]);
    }
  }
  update(dt) {
    this.ambient(dt);
    const g = this.game, c = g.clock, day = c.totalDays, isDay = day % 6 === 5, site = this.site(), ok = site && g.population.count() >= 5;
    if (ok && day % 6 === 4 && this.announced !== day) { this.announced = day; g.mail.send('The Fête Committee', 'Village Fête tomorrow!', `Dear Sam,\n\nThe village fête is tomorrow from noon until six, at the ${site.def.name}. There will be a tombola, a cake stall, the vegetable show and, weather permitting, Morris dancing.\n\nDo come along.\n\nThe Fête Committee`); }
    const want = ok && isDay && c.hour >= 12 && c.hour < 18;
    if (want && !this.fete) this.start(site); else if (!want && this.fete) this.end();
    if (!this.fete) return;
    const f = this.fete, p = g.player, near = g.mode === 'sim' && Math.hypot(p.x - f.x, p.z - f.z) < 30;
    // a little tune on the fair organ when Sam is close
    this.tuneT -= dt; if (near && this.tuneT <= 0 && g.clock.speed > 0) { const n = TUNE[this.note++ % TUNE.length]; if (n) Sfx.tone(n, 0.22, { type: 'triangle', vol: 0.05 }); this.tuneT = 0.26; }
    if (Math.random() < dt * 0.6) { const s = pick(g.population.sims.filter((q) => !q.hidden && Math.hypot(q.x - f.x, q.z - f.z) < 9) || []); if (s && s.mesh.visible) { g.social.say(s, pick(g.ui.adult && s.kind !== 'child' && Math.random() < 0.5 ? A.FETE : FETE_LINES), 2.4); s.emote = { upper: pick(['wave', 'laugh', 'dance', 'dance', 'clap', 'cheer']), t: 2.4 }; s.moodBoost += 0.05; } }
    if (this.bunting) for (const fl of this.bunting.userData.flags) fl.rotation.x = Math.sin(performance.now() / 260 + fl.userData.ph) * 0.25;
  }
  start(site) {
    const g = this.game; this.fete = { x: site.cx, z: site.cz, site }; this.count++; g.flags.fetes = (g.flags.fetes || 0) + 1; g.messages.push('The Fête Committee', 'The village fête is on! Everybody to the ' + site.def.name + '.', 'good');
    if (g.started) g.ui.toast('🎪 Village Fête at the ' + site.def.name + ' until 18:00!', 3500);
    const grp = new THREE.Group(), R = 7, poles = 6, cols = [0xd8342c, 0xffffff, 0x2a5fb0, 0xf2c94c, 0x3a9a54], wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a }); grp.userData.flags = [];
    const pts = []; for (let i = 0; i < poles; i++) { const a = i / poles * Math.PI * 2; const x = Math.cos(a) * R, z = Math.sin(a) * R; pts.push([x, z]); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6), wood); pole.position.set(x, 1.7, z); pole.castShadow = true; grp.add(pole); }
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.45, 0], 3)); tri.computeVertexNormals();
    let k = 0; for (let i = 0; i < poles; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % poles]; for (let j = 1; j < 9; j++) { const t = j / 9, sag = Math.sin(t * Math.PI) * 0.5, fl = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: cols[k++ % cols.length], side: THREE.DoubleSide })); fl.position.set(x0 + (x1 - x0) * t, 3.3 - sag, z0 + (z1 - z0) * t); fl.rotation.y = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2; fl.userData.ph = k; grp.add(fl); grp.userData.flags.push(fl); } }
    // a cake stall and a tombola table
    const tableM = new THREE.MeshStandardMaterial({ color: 0xf4efe2 }), cloth = new THREE.MeshStandardMaterial({ color: 0xd8342c });
    for (const [x, z, r] of [[R * 0.75, 0, Math.PI / 2], [-R * 0.75, 0, -Math.PI / 2]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.9), cloth); t.position.set(x, 0.4, z); t.rotation.y = r; t.castShadow = true; grp.add(t); const top = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.05, 0.95), tableM); top.position.set(x, 0.82, z); top.rotation.y = r; grp.add(top); for (let i = 0; i < 3; i++) { const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 10), new THREE.MeshStandardMaterial({ color: [0xf2d0a0, 0x8a4a2a, 0xffc0d0][i] })); cake.position.set(x + Math.sin(r) * (i - 1) * 0.6, 0.93, z + Math.cos(r) * (i - 1) * 0.6); grp.add(cake); } }
    grp.position.set(site.cx, 0, site.cz); g.scene.add(grp); this.bunting = grp;
  }
  end() {
    const g = this.game; if (this.bunting) g.scene.remove(this.bunting); this.bunting = null;
    if (this.fete) { for (const s of g.population.residents()) if (Math.hypot(s.x - this.fete.x, s.z - this.fete.z) < 12) s.moodBoost += 0.15; g.messages.push('The Fête Committee', 'What a day! Thank you all for coming.', 'good'); }
    this.fete = null;
  }
}
