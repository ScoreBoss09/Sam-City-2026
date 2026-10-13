import { pick } from '../util.js';
import { PITCHES } from '../data/adverts.js';
import { GUESTS } from '../data/guests.js';

// Special guests: now and then a celebrity comes down the Lift with a minder and does a tour of the town. Crowds follow
// for photos and autographs. Some of them, when the minder isn't looking, try to tell Sam the truth.
// Also: impromptu adverts. Every so often somebody turns to an invisible camera and does a little product placement.
const FANS = ['Can I have your autograph?', 'Oh my God, it\'s really them!', 'Can I get a photo?', 'I love you!', 'Sign my arm!', 'My mum\'s not going to believe this!', 'Over here! Over here!'];

export class Guests {
  constructor(game) { this.game = game; this.v = null; this.pitchT = 60; }
  calling(s) { const v = this.v; return v && v.live && v.fans.has(s) ? v : null; }
  update(dt) {
    const g = this.game, c = g.clock; if (!g.started) return;
    // a visit every couple of weeks, in the daytime, once the town is big enough to be worth the trip
    if (!this.v && c.hour >= 10 && c.hour < 15 && g.population.count() >= 15 && c.totalDays - (g.flags.lastGuest ?? -6) >= 10 && Math.random() < dt * 0.002) this.arrive();
    if (this.v) this.tour(dt);
    this.pitch(dt);
  }
  arrive() {
    const g = this.game, used = g.flags.guestsSeen || (g.flags.guestsSeen = []), pool = GUESTS.filter((q) => !used.includes(q.name)), G = pick(pool.length ? pool : GUESTS); used.push(G.name); g.flags.lastGuest = g.clock.totalDays;
    const P = g.population.makePerson({ kind: 'visitor', gender: G.gender }), look = { ...P.look, ...G.look };
    const s = g.population.spawnAtLift({ name: G.name, first: G.name.split(' ')[0], surname: G.name.split(' ').slice(1).join(' '), kind: 'guest', trait: 'cheerful', look, gender: G.gender, age: G.age });
    const M = g.population.makePerson({ kind: 'visitor', gender: 'm' }), minder = g.population.spawnAtLift({ name: M.name, first: M.first, surname: M.surname, kind: 'guest', trait: 'busy', look: { ...M.look, shirt: 0x15151a, pants: 0x15151a, accessory: 'tie' }, gender: 'm', age: 40 });
    const stops = g.buildings.list.filter((b) => b.state === 'done' && (b.def.dining || b.def.shopping || b.def.park === 'field' || b.def.park === 'plaza' || b.id === 'church')).sort(() => Math.random() - 0.5).slice(0, 4);
    this.v = { live: true, G, s, minder, stops, stop: -1, wait: 0, fans: new Set(), x: s.x, z: s.z, hint: !!G.hint || (g.story && g.story.stage >= 1 && Math.random() < 0.4), told: false };
    const v = this.v; v.spot = (f) => { const a = Math.random() * 6.28, r = 1.8 + Math.random() * 1.8; return { x: v.s.x + Math.cos(a) * r, z: v.s.z + Math.sin(a) * r, face: Math.atan2(v.s.x - (v.s.x + Math.cos(a) * r), v.s.z - (v.s.z + Math.sin(a) * r)) }; }; v.hold = () => false;
    g.messages.push('Town', `${G.title} is in Sam City today! ${G.name} has just come down the Lift.`, 'good'); g.ui.toast(`⭐ ${G.name} is in town!`, 3500);
    if (g.markers) g.markers.add(s.x, s.z, '⭐', G.name, 600, s, () => !s.remove);
  }
  tour(dt) {
    const g = this.game, v = this.v, s = v.s;
    if (s.remove || !g.population.sims.includes(s)) { this.leave(); return; }
    v.x = s.x; v.z = s.z;
    // the itinerary: walk to each stop, linger, wave, sign things; then back up the Lift
    if (!s.path.length) { v.wait -= dt * Math.max(0.2, g.clock.speed); if (v.wait <= 0) { v.stop++; const b = v.stops[v.stop]; if (!b) { if (!v.going) { v.going = true; s.goTo({ b: g.lift, x: g.lift.doorIn.x, z: g.lift.doorIn.z }); } else this.leave(); } else { s.goTo({ x: b.doorOut.x + (Math.random() - 0.5) * 2, z: b.doorOut.z + 1.5 }); v.wait = 25; } } else if (Math.random() < dt * 0.4) s.emote = { upper: pick(['wave', 'thumbsup', 'point']), t: 1.6 }; }
    if (v.going && Math.hypot(s.x - g.lift.doorIn.x, s.z - g.lift.doorIn.z) < 2) { this.leave(); return; }
    // the minder sticks close
    const m = v.minder; if (m && !m.remove && Math.hypot(m.x - s.x, m.z - s.z) > 2.5 && (!m.path.length || Math.random() < dt)) m.goTo({ x: s.x - 1.2, z: s.z - 1 });
    // fans: anyone not busy nearby joins the crowd (children first)
    v.fanT = (v.fanT || 0) - dt; if (v.fanT <= 0) { v.fanT = 2;
      for (const q of g.population.sims) { if (v.fans.size >= 14) break; if (v.fans.has(q) || (q.kind !== 'resident' && q.kind !== 'child') || q.activity === 'work' || q.activity === 'police' || q.crook || q.fight || q.pose === 'sleep' || Math.hypot(q.x - s.x, q.z - s.z) > 30) continue; if (Math.random() < (q.kind === 'child' ? 0.7 : 0.35)) { v.fans.add(q); q.phase = 0; } }
      for (const q of v.fans) if (q.activity === 'event' && Math.hypot(q.x - s.x, q.z - s.z) > 4.5) q.goTo(v.spot(q));
      const f = pick([...v.fans].filter((q) => q.mesh.visible && Math.hypot(q.x - s.x, q.z - s.z) < 5)); if (f) { g.social.say(f, pick(FANS), 2.2); f.emote = { upper: pick(['wave', 'cheer', 'point']), t: 1.6 }; if (Math.random() < 0.5) g.particles.burst(f.x, 1.7, f.z, 0xffffff, 6, 0.4, 0.3, 0.05); }
      if (Math.random() < 0.3 && s.mesh.visible) g.social.say(s, pick(v.G.lines), 2.6);
    }
  }
  /** Sam walks up: a photo, an autograph, and sometimes a whisper. */
  meet() {
    const g = this.game, v = this.v; if (!v) return; const s = v.s;
    if (v.met && !(v.hint && !v.told)) { g.social.say(s, 'Lovely to meet you again, Sam!', 2); return; }
    v.met = true; g.particles.burst(s.x, 1.8, s.z, 0xffffff, 12, 0.6, 0.4, 0.06); g.flags.autographs = (g.flags.autographs || 0) + 1;
    g.ui.toast(`📸 A photo with ${v.G.name}, and an autograph: "${v.G.sign}"`, 3500);
    if (v.hint && !v.told) { v.told = true; setTimeout(() => { if (!this.v) return; g.social.say(s, pick(['(whispering) Listen. None of this is real. Look for the door in the sky.', '(whispering) They pay me to be here. They pay EVERYONE to be here. Except you.', '(whispering) Two in the morning, the cameras change shifts. Remember that.']), 4.5); if (g.story && g.story.pages) g.story.pages.push(`${v.G.name} whispered something when the minder wasn't looking. Something about cameras.`); }, 2600); }
  }
  leave() {
    const g = this.game, v = this.v; if (!v) return; this.v = null; v.live = false;
    for (const q of v.fans) q.phase = 0; g.population.depart(v.s); if (v.minder) g.population.depart(v.minder);
    g.messages.push('Town', `${v.G.name} has gone back up the Lift. The town talks about nothing else.`);
  }
  /** Impromptu adverts: an actor slips out of character for a second of product placement. */
  pitch(dt) {
    const g = this.game, P = g.player; this.pitchT -= dt * Math.max(0, g.clock.speed); if (this.pitchT > 0 || g.mode !== 'sim') return;
    const st = (g.story && g.story.stage) || 0; this.pitchT = (st >= 1 ? 70 : 140) + Math.random() * 90;
    const near = g.population.sims.filter((s) => s.kind === 'resident' && s.mesh.visible && !s.chat && !s.fight && !s.crook && s.pose !== 'sleep' && !s.sitting && Math.hypot(s.x - P.x, s.z - P.z) < 12);
    const s = near.find((q) => q.id % 23 === 5) || pick(near); if (!s) return;   // a few of them talk like adverts all the time
    s.path = []; s.faceGoal = Math.atan2(P.x - s.x, P.z - s.z); s.heading = s.faceGoal; s.emote = { upper: 'thumbsup', t: 3 }; g.social.say(s, pick(PITCHES), 4.5);
  }
}
