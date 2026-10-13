import * as THREE from 'three';
import { pick } from '../util.js';
import { makeHorseCart } from '../render/Vehicles.js';
import { TILE } from '../config.js';
import { MONTHS } from '../core/Clock.js';

// Growing old, dying (rarely, peacefully, in their sleep), and the funeral: a service at the church, then a horse-drawn
// hearse leads the mourners, all in black, through the streets to the Lift, where the coffin goes up. Nobody asks where.
// The church keeps the parish register of births and deaths (g.flags.register).
const MOURN = ['She was a lovely woman.', 'He\'d have hated all this fuss.', 'Gone up the Lift. Like they all do.', 'Such a shame.', 'They don\'t make them like that any more.', 'Lovely service.', 'Ashes to ashes...', 'I can\'t believe it.'];
const MOURN_ODD = ['Funny. Nobody ever sees where the Lift takes them.', 'Same hymns as last time. Same order.', 'The vicar read it off a card. I saw.'];

export class Funerals {
  constructor(game) { this.game = game; this.f = null; this.queue = []; game.clock.on('day', () => this.daily()); }
  get reg() { const g = this.game; return g.flags.register || (g.flags.register = { births: [], deaths: [] }); }
  date() { const c = this.game.clock; return `${c.day} ${MONTHS[c.month]} ${c.year}`; }
  birth(s) { this.reg.births.unshift({ name: s.name, date: this.date(), parents: (s.parents || []).map((p) => p.first).join(' & ') }); }
  calling(s) { const f = this.f; return f && f.live && f.mourners.has(s) ? f : null; }
  daily() {
    const g = this.game; if (!g.started) return;
    for (const s of g.population.adults()) s.age += 1 / 12;   // a year every twelve days (children grow faster)
    // the very old slip away now and then, never more than one at a time
    if (this.f || this.queue.length) return;
    const old = g.population.adults().filter((s) => s.age >= 76 && !s.leaving && !s.crook && !s.fight).sort((a, b) => b.age - a.age)[0];
    if (old && Math.random() < Math.min(0.25, (old.age - 75) * 0.02)) this.die(old);
  }
  die(s) {
    const g = this.game, age = Math.floor(s.age), c = g.clock, wd = c.weekday, toSun = (6 - wd + 7) % 7;
    this.reg.deaths.unshift({ name: s.name, age, date: this.date() });
    g.messages.push('St Sam\'s', `${s.name} passed away peacefully in their sleep, aged ${age}.`, 'warn');
    if (s.partner) { s.partner.moodBoost -= 0.6; s.partner.partner = null; s.partner.widowed = true; }
    const mourners = [s.partner, ...g.population.residents().filter((o) => o !== s && ((s.rel.get(o.id) || 0) >= 15 || (o.parents || []).includes(s) || (s.parents || []).includes(o)))].filter(Boolean);
    for (const o of mourners) o.moodBoost -= 0.25;
    this.queue.push({ name: s.name, first: s.first, age, day: c.totalDays + (toSun >= 1 && toSun <= 4 ? toSun : 2), mourners: new Set(mourners) });
    g.mail.send('St Sam\'s Church', `Funeral of ${s.name}`, `Dear Sam,\n\nIt is with sadness that we announce the death of ${s.name}, aged ${age}.\n\nThe funeral will be held at the church at 11 o'clock, followed by a procession to the Lift. All are welcome.\n\nThe Vicar`);
    // they lie where they died (in bed, at home) until the undertakers come for them (systems/Rescue.js)
    s.dead = true; s.injured = true; s.down = 1; s.endActivity(); if (s.home && s.home.state === 'done') { s.hidden = true; s.inside = s.home; } s.leaving = true;
  }
  update(dt) {
    const g = this.game, c = g.clock, church = g.buildings.church();
    if (!this.f && this.queue.length && church && this.queue[0].day <= c.totalDays && c.hour >= 10.8 && c.hour < 12) this.start(this.queue.shift(), church);
    else if (!church && this.queue.length && this.queue[0].day < c.totalDays) { const q = this.queue.shift(); g.messages.push('Town', `${q.first} was taken up the Lift without a service. There's no church.`); }
    const f = this.f; if (!f) return;
    f.t += dt * Math.max(0.2, c.speed);
    if (f.stage === 'service' && c.hour >= 11.6) { f.stage = 'walk'; this.hearse(f); }
    if (f.stage === 'walk') this.walk(f, dt * Math.max(0.2, c.speed));
    if (c.hour >= 14.5 || c.totalDays > f.day) this.end(true);
    f.talkT = (f.talkT || 0) - dt; if (f.talkT <= 0) { f.talkT = 3 + Math.random() * 4; const near = [...f.mourners].filter((s) => s.mesh.visible && !s.path.length && s.activity === 'event'); const s = pick(near); if (s) g.social.say(s, pick((g.story && g.story.stage >= 2 && Math.random() < 0.3) ? MOURN_ODD : MOURN), 2.6); }
  }
  start(q, church) {
    const g = this.game, mourners = new Set([...q.mourners].filter((s) => !s.remove && !s.leaving));
    for (const s of g.population.residents()) if (mourners.size < 18 && !mourners.has(s) && s.activity !== 'work' && s.activity !== 'police' && !s.crook && Math.random() < 0.35) mourners.add(s);
    const vicar = g.population.sims.find((s) => s.role === 'vicar' && !s.remove); if (vicar) mourners.add(vicar);
    for (const s of mourners) { s.wear('mourning', g.clock.totalDays * 24 + 16); s.phase = 0; }
    const f = this.f = { live: true, stage: 'service', t: 0, q, church, mourners, x: church.cx, z: church.cz, day: g.clock.totalDays };
    const seats = church.spots.seat.filter((x) => x.kind === 'pew'); let k = 0;
    f.spot = (s) => {
      if (f.stage === 'service') { const st = seats[k++ % Math.max(1, seats.length)]; return st ? { b: church, x: st.x, z: st.z, seat: st } : { x: church.doorOut.x + (Math.random() - 0.5) * 4, z: church.doorOut.z + 1 + Math.random() * 2 }; }
      return this.behind(f, s);
    };
    f.hold = (s) => f.stage === 'walk' ? false : true;
    if (g.markers) g.markers.add(church.cx, church.cz, '⚱️', `Funeral of ${q.first}`, 3600, null, () => this.f === f);
    g.messages.push('St Sam\'s', `The funeral of ${q.name} is under way.`);
  }
  /** Follow the hearse: two by two behind it, the closest family first. */
  behind(f, s) {
    const i = [...f.mourners].indexOf(s), row = Math.floor(i / 2), col = i % 2 ? 0.55 : -0.55, h = f.h;
    if (!h) return null; const back = 3.8 + row * 1.1, dx = Math.sin(h.dir), dz = Math.cos(h.dir);
    return { x: h.x - dx * back + dz * col, z: h.z - dz * back - dx * col };
  }
  hearse(f) {
    const g = this.game, ch = f.church, lift = g.lift, w = g.world, [sx, sz] = w.tileOf(ch.doorOut.x, ch.doorOut.z), [tx, tz] = w.tileOf(lift.doorOut.x, lift.doorOut.z);
    const path = (w.findPath(sx, sz, tx, tz, true) || []).map(([x, z]) => ({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE })); path.push({ x: lift.doorOut.x, z: lift.doorOut.z });
    const mesh = makeHorseCart(0x111111, 0x8a6236, { coat: 0x15151a, hat: 0x111111, load: false }), coffin = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 1.9), new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.5 })); coffin.position.set(0, 1.2, -1.2); mesh.add(coffin);
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 12), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })); wreath.rotation.x = Math.PI / 2; wreath.position.set(0, 1.45, -1.2); mesh.add(wreath);
    f.h = { mesh, x: ch.doorOut.x, z: ch.doorOut.z, dir: 0, path, wait: 4 }; mesh.position.set(f.h.x, 0, f.h.z); g.scene.add(mesh);
  }
  walk(f, dt) {
    const g = this.game, h = f.h; if (!h) return;
    if (h.wait > 0) { h.wait -= dt; } else if (h.path.length) {
      const p = h.path[0], dx = p.x - h.x, dz = p.z - h.z, d = Math.hypot(dx, dz);
      // a slow walking pace, and wait for the stragglers
      const lag = [...f.mourners].reduce((a, s) => Math.max(a, s.activity === 'event' ? Math.hypot(s.x - h.x, s.z - h.z) : 0), 0), v = lag > 14 ? 0.3 : 1.0;
      if (d < 0.5) h.path.shift(); else { h.dir = Math.atan2(dx, dz); h.x += dx / d * v * dt; h.z += dz / d * v * dt; }
      const legs = h.mesh.userData.legs || []; for (const [i, l] of legs.entries()) l.rotation.x = Math.sin(g.elapsed * 3 + i * 1.6) * 0.3;
    } else if (!f.arrived) { f.arrived = true; f.upT = 6; g.messages.push('St Sam\'s', `${f.q.first}'s coffin goes up in the Lift. The mourners watch the doors close.`); for (const s of f.mourners) if (s.mesh.visible) s.emote = { upper: 'wave', t: 3 }; }
    else { f.upT -= dt; h.mesh.visible = f.upT > 3 || Math.floor(f.upT * 4) % 2 === 0; if (f.upT <= 0) this.end(true); }
    h.mesh.position.set(h.x, 0, h.z); h.mesh.rotation.y = h.dir;
    f.goT = (f.goT || 0) - dt; if (f.goT <= 0) { f.goT = 1.5; for (const s of f.mourners) { if (s.activity !== 'event') continue; const d = this.behind(f, s); if (d && Math.hypot(d.x - s.x, d.z - s.z) > 1.6) { if (s.sitting) s.standUp(); s.goTo(d); } } }
  }
  end(happened) {
    const g = this.game, f = this.f; if (!f) return; this.f = null; f.live = false;
    if (f.h) g.scene.remove(f.h.mesh);
    for (const s of f.mourners) { s.phase = 0; s.moodBoost += 0.05; }
    // no burials: the graves in the churchyard are for show
  }
}
