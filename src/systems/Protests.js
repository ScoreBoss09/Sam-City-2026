import * as THREE from 'three';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';

// Protests. A handful of townsfolk with home-made placards and a cause (the bomb, nuclear power, the new bypass, global
// warming, veal crates, the Criminal Justice Bill). Nobody likes them: passers-by heckle, the old and the grumpy loudest.
// A big one on a Sunday in a bigger town brings out the riot police with shields and batons; in a big town, if the
// police are slow, windows get smashed and a car gets torched. When the police break it up, the onlookers cheer.
const CAUSES = [
  { board: 'BAN THE BOMB', chants: ['What do we want? Disarmament! When do we want it? Now!', 'Ban the bomb!', 'One, two, three, four, we don\'t want your nuclear war!'] },
  { board: 'NUCLEAR? NO THANKS', chants: ['Nuclear power? No thanks!', 'Remember Chernobyl!', 'Think of the fish!'] },
  { board: 'STOP THE BYPASS', chants: ['Trees not tarmac!', 'Save the woods!', 'No more roads!'] },
  { board: 'STOP GLOBAL WARMING', chants: ['The ice caps are melting!', 'Leave the car at home!', 'Global warming is real!'] },
  { board: 'NO VEAL CRATES', chants: ['Stop the live exports!', 'Free the calves!', 'Meat is murder!'] },
  { board: 'KILL THE BILL', chants: ['Kill the Bill!', 'Our right to party!', 'Repetitive beats are not a crime!'] },
];
const RATES_CAUSE = { board: 'CAN\'T PAY, WON\'T PAY', chants: ['Can\'t pay! Won\'t pay!', 'Cut the rates!', 'Sam out!', 'Where\'s our money going?'] };   // when the rates are high
const HECKLE = ['Get a job!', 'Some of us work for a living!', 'Hippies!', 'Go home and have a wash!', 'Oh, give it a rest!', 'Nobody cares, love!', 'My taxes pay for your dole!', 'Get your hair cut!', 'Clear off!', 'Bunch of layabouts.'];
const BUSTED = ['About time!', 'Good riddance!', 'Go on, lads!', 'That told them.', 'Lovely. Peace and quiet.', 'Hurrah for the boys in blue!'];
const OUCH = ['Ow! Police brutality!', 'I know my rights!', 'This is a peaceful protest!', 'Get off me!', 'The whole world is watching!'];

function placard(text) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#f4f0e0'; x.fillRect(0, 0, 128, 64); x.fillStyle = pick(['#c0241e', '#1a1a1a', '#1a3a8a', '#2a7a3a']); x.font = 'bold 15px sans-serif'; x.textAlign = 'center';
  const w = text.split(' '), lines = []; let l = ''; for (const s of w) { if (x.measureText(l + s).width > 118) { lines.push(l.trim()); l = ''; } l += s + ' '; } lines.push(l.trim()); lines.forEach((t, i) => x.fillText(t, 64, 32 - (lines.length - 1) * 9 + i * 18 + 5));
  const g = new THREE.Group(), stick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.04), new THREE.MeshStandardMaterial({ color: 0x8a6a4a })); stick.position.y = 0.5; g.add(stick);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.36, 0.03), [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshStandardMaterial(i === 4 || i === 5 ? { map: t } : { color: 0xf4f0e0 }))); board.position.y = 1.15; g.add(board);
  return g;
}
function riotGear() {
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.04), new THREE.MeshStandardMaterial({ color: 0xcfe4f0, transparent: true, opacity: 0.55 })); sh.position.set(0, 0.25, 0.2);
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.36), new THREE.MeshStandardMaterial({ color: 0x1a1a22 })); helm.position.set(0, 0.32, 0);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x9fd8f0, transparent: true, opacity: 0.5 })); visor.position.set(0, 0.2, 0.18);
  return { sh, helm, visor };
}

export class Protests {
  constructor(game) { this.game = game; this.p = null; }
  calling(s) { const p = this.p; return p && p.live && p.members.has(s) ? p : null; }
  /** Start one. Size grows with the town; a Sunday brings out the crowds. */
  start() {
    const g = this.game, pop = g.population.count(); if (this.p || pop < 25) return false;
    const sun = g.clock.isSunday, big = sun && pop >= 50, n = Math.min(big ? 16 : 6, Math.max(3, Math.floor(pop / (big ? 5 : 12))));
    const site = g.buildings.list.find((b) => b.state === 'done' && (b.id === 'townhall' || b.def.park === 'plaza')) || g.buildings.list.find((b) => b.state === 'done' && b.def.shopping);
    if (!site) return false;
    const pool = g.population.adults().filter((s) => !s.leaving && !s.crook && !s.fight && s.age < 50 && s.activity !== 'work' && s.activity !== 'police' && s.pose !== 'sleep' && !s.riding).sort((a, b) => (!!b.homeless - !!a.homeless) || ((a.workplace ? 1 : 0) - (b.workplace ? 1 : 0)));
    if (pool.length < 3) return false;
    const cause = g.economy.rate >= 2 && Math.random() < 0.6 ? RATES_CAUSE : pick(CAUSES), members = new Set(pool.slice(0, n)), x = site.doorOut.x, z = site.doorOut.z + 3;
    const p = this.p = { live: true, cause, members, x, z, site, big, t: 0, placards: new Map(), riot: [], stage: 'chant', smashed: false, torched: false };
    for (const s of members) { s.phase = 0; const pl = placard(cause.board); s.rig.armR.hand.add(pl); p.placards.set(s, pl); }
    let k = 0; p.spot = () => { const a = (k++ * 2.4) % 6.28, r = 1.5 + (k % 3) * 1.1; return { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r * 0.6, face: Math.PI }; }; p.hold = () => true;
    g.messages.push('Town', `${big ? 'A big protest' : 'A protest'} outside the ${site.def.name}: "${cause.board}". ${big ? 'Half the town has turned out to watch.' : 'Nobody looks very impressed.'}`, big ? 'warn' : '');
    if (g.markers) g.markers.add(x, z, '📢', cause.board, big ? 240 : 120); return true;
  }
  update(dt) {
    const g = this.game, p = this.p; if (!p) return; const crowd = [...p.members].filter((s) => !s.remove && s.activity === 'event');
    // the clock only starts once most of them have turned up
    if (!p.gathered) { p.wait = (p.wait || 0) + dt * Math.max(0.25, Math.min(g.clock.speed, 4)); if (crowd.filter((s) => Math.hypot(s.x - p.x, s.z - p.z) < 9).length >= Math.max(2, crowd.length / 2) || p.wait > 240) p.gathered = true; else if (p.wait > 600 || !crowd.length) { this.end(false); return; } else return; }
    p.t += dt * Math.max(0.25, Math.min(g.clock.speed, 4));
    // chanting, and everyone else heckling
    p.chT = (p.chT || 0) - dt; if (p.chT <= 0 && p.stage !== 'over') { p.chT = 1.6 + Math.random() * 1.5; const s = pick(crowd.filter((q) => !(q.down > 0))); if (s && s.mesh.visible) { g.social.say(s, pick(p.cause.chants), 2); s.emote = { upper: 'point', t: 1.2 }; }
      const h = pick(g.population.sims.filter((q) => !p.members.has(q) && (q.kind === 'resident') && q.mesh.visible && !q.inside && Math.hypot(q.x - p.x, q.z - p.z) < 18 && (q.age > 50 || q.trait === 'grumpy' || Math.random() < 0.4)));
      if (h) { g.social.say(h, pick(HECKLE), 2.2); h.emote = { upper: 'point', t: 1.4 }; h.faceGoal = Math.atan2(p.x - h.x, p.z - h.z); } }
    const cops = g.crime ? g.crime.cops() : [], policed = g.buildings.list.some((b) => b.state === 'done' && (b.id === 'police' || b.id === 'watchhouse'));
    // a big one: the riot police come; in a big town, until they do, it turns ugly
    if (p.big && policed && p.stage === 'chant' && p.t > 30) this.riot(p);
    if (p.big && g.population.count() >= 80 && p.t > 20 && !p.smashed) { p.smashed = true; this.smash(p); }
    if (p.big && g.population.count() >= 80 && p.t > 35 && !p.torched) { p.torched = true; this.torch(p); }
    if (p.stage === 'riot') this.drive(p, dt, crowd);
    const over = p.stage === 'riot' ? crowd.every((s) => s.down > 0) || p.t > p.riotUntil : p.t > (p.big ? 120 : 70) || !crowd.length;
    if (over) this.end(p.stage === 'riot'); void cops;
  }
  riot(p) {
    const g = this.game, pol = g.buildings.list.find((b) => b.state === 'done' && (b.id === 'police' || b.id === 'watchhouse')), from = pol ? pol.doorOut : g.lift.doorOut, n = Math.min(6, 2 + Math.floor(p.members.size / 3));
    p.stage = 'riot'; p.riotUntil = p.t + 60; Sfx.play('bell');
    for (let i = 0; i < n; i++) { const P = g.population.makePerson({ kind: 'visitor', gender: 'm' }); const s = g.population.spawnAt(from.x + (i % 3) * 0.8, from.z + Math.floor(i / 3) * 0.8, { name: 'PC ' + P.surname, first: 'PC', surname: P.surname, kind: 'guest', trait: 'busy', look: { ...P.look, shirt: 0x1b2340, pants: 0x1b2340, accessory: 'uniform', hat: null }, gender: 'm', age: 30 });
      const gear = riotGear(); s.rig.armL.hand.add(gear.sh); s.rig.head.add(gear.helm, gear.visor); s.hurry = true; p.riot.push(s); }
    g.messages.push('Police', 'The riot police have arrived: shields, helmets and batons. This could get nasty.', 'warn'); g.ui.toast('🚔 Riot police!', 2600);
    if (g.markers) g.markers.add(p.x, p.z, '🛡️', 'Riot police', 90);
  }
  /** Each officer picks a protester still standing, wades in, and down they go. */
  drive(p, dt, crowd) {
    const g = this.game;
    for (const c of p.riot) {
      if (c.remove) continue; let t = c.riotTarget; if (!t || t.down > 0 || t.remove) { t = c.riotTarget = crowd.filter((q) => !(q.down > 0)).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0]; }
      if (!t) continue; const d = Math.hypot(t.x - c.x, t.z - c.z);
      if (d > 1.3) { if (!c.path.length || (c.repath = (c.repath || 0) - dt) <= 0) { c.repath = 1.2; c.goTo({ x: t.x, z: t.z }); } }
      else { c.path = []; c.faceGoal = Math.atan2(t.x - c.x, t.z - c.z); c.fightAnim = 'punch'; c.fightAnimT = 0.4; if ((c.swing = (c.swing || 0) - dt) <= 0) { c.swing = 0.8; Sfx.noise(0.05, { freq: 1400, vol: 0.06 }); if (Math.random() < 0.45) { t.knockDown(8); g.social.say(t, pick(OUCH), 2.2); } } }
    }
  }
  smash(p) {
    const g = this.game, b = g.buildings.list.filter((q) => q.state === 'done' && (q.def.shopping || q.def.dining) && Math.hypot(q.cx - p.x, q.cz - p.z) < 40)[0]; if (!b) return;
    for (let i = 0; i < 4; i++) g.particles.burst(b.doorOut.x + (Math.random() - 0.5) * 3, 1.4, b.doorOut.z, 0xcfe8f0, 10, 1.4, 1.2, 0.06);
    b.graffiti = (b.graffiti || 0) + 2; for (const r of b.workers) r.moodBoost -= 0.2; Sfx.noise(0.3, { freq: 3000, vol: 0.3 });
    g.messages.push('Police', `Windows smashed at the ${b.def.name}! The protest is turning ugly.`, 'warn'); if (g.markers) g.markers.add(b.cx, b.cz, '💥', 'Windows smashed', 90);
  }
  torch(p) {
    const g = this.game, c = g.cars && g.cars.list.filter((q) => q.state === 'parked' && !q.taken && !q.mine && Math.hypot(q.x - p.x, q.z - p.z) < 60)[0]; if (!c) return;
    c.burning = 90; c.state = 'burnt'; c.mesh.traverse((o) => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.25); } });
    g.messages.push('Police', 'A car has been set alight in the street!', 'warn'); if (g.markers) g.markers.add(c.x, c.z, '🔥', 'Car on fire', 90);
  }
  end(busted) {
    const g = this.game, p = this.p; if (!p) return; this.p = null; p.live = false;
    for (const [s, pl] of p.placards) { if (pl.parent) pl.parent.remove(pl); s.phase = 0; }
    for (const c of p.riot) g.population.depart(c);
    if (busted) { g.messages.push('Police', 'The police have broken up the protest. The onlookers applaud.', 'good'); for (const s of g.population.sims) if (!p.members.has(s) && s.kind === 'resident' && s.mesh.visible && Math.hypot(s.x - p.x, s.z - p.z) < 25) { s.emote = { upper: pick(['cheer', 'clap']), t: 2.5 }; s.moodBoost += 0.05; if (Math.random() < 0.3) g.social.say(s, pick(BUSTED), 2.2); } }
    else g.messages.push('Town', 'The protesters have packed up their placards and gone home. Nothing has changed.');
  }
  /** Burning cars smoke and flicker until they burn out (they stay there, blackened). */
  tick(dt) { const g = this.game; if (!g.cars) return; for (const c of g.cars.list) if (c.burning > 0) { c.burning -= dt; if (Math.random() < 0.6) g.particles.burst(c.x + (Math.random() - 0.5), 1.2, c.z + (Math.random() - 0.5) * 2, pick([0xff6a1a, 0xffb020, 0x3a3a3a]), 2, 0.8, 1.6, 0.08); } }
}
