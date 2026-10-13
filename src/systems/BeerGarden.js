import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { levelPlan, slabHoles, upperFurniture } from '../world/Levels.js';
import { FURN } from '../render/Furniture.js';

// Drinkers in the Red Lion's beer garden: on a dry day from lunchtime to closing (busiest in the evening, not in
// winter), a few regulars sit at the picnic tables under the brollies, sipping, chatting, laughing and raising a glass.
// They're scenery, like the crowd at the cricket: they come and go a few at a time.
const MOODS = ['idle', 'drink', 'drink', 'talk', 'talk', 'listen', 'laugh', 'cheers'];
export class BeerGarden {
  constructor(game) { this.game = game; this.list = []; this.t = 0; }
  want(b) {
    const g = this.game, h = g.clock.hour, m = g.clock.month, rain = g.weather ? g.weather.rain : 0, seats = (b.ext && b.ext.group.userData.garden || []).length;
    if (!seats || b.state !== 'done' || rain > 0.15 || h < 12 || h >= 22.5 || !b.workers.length) return 0;
    const season = m >= 4 && m <= 8 ? 1 : m === 3 || m === 9 ? 0.5 : 0.15, time = h >= 17 && h < 21.5 ? 1 : h < 14 ? 0.45 : 0.3;
    return Math.round(seats * 0.75 * season * time);
  }
  update(dt) {
    const g = this.game; if (!g.started) return;
    if ((this.t -= dt * Math.max(0.25, g.clock.speed || 0)) <= 0) {
      this.t = 6 + Math.random() * 6;
      for (const b of g.buildings.list) {
        if (b.id !== 'tavern') continue; const here = this.list.filter((d) => d.b === b), n = this.want(b);
        if (here.length < n) this.arrive(b, here); else if (here.length > n) this.leave(pick(here));
      }
      for (const d of this.list) if (!g.buildings.list.includes(d.b) || d.b.state !== 'done') this.leave(d);
    }
    const cam = g.camera.position;
    for (const d of this.list) {
      const near = Math.hypot(cam.x - d.x, cam.z - d.z) < 70; d.rig.root.visible = near; if (!near) continue;
      if ((d.ut -= dt) <= 0) { d.up = pick(MOODS); d.ut = d.up === 'cheers' ? 2 : 3 + Math.random() * 6; }
      d.anim.update(dt, { lower: 'sit', upper: d.up, dist: 0, speed: 0, speaking: d.up === 'talk', laugh: d.up === 'laugh' ? 1 : 0, mood: 0.6 });
    }
  }
  arrive(b, here) {
    const g = this.game, seats = b.ext.group.userData.garden, free = seats.filter((s) => !here.some((d) => d.seat === s)); if (!free.length) return;
    const seat = here.length ? free.sort((a, c) => Math.min(...here.map((d) => Math.hypot(d.seat.x - a.x, d.seat.z - a.z))) - Math.min(...here.map((d) => Math.hypot(d.seat.x - c.x, d.seat.z - c.z))))[0] : pick(free);   // sit with the others
    const P = g.population.makePerson({ kind: 'visitor' }), rig = createRig(P.look), [x, z] = b.toWorld(seat.x, seat.z);
    rig.root.position.set(x, 0, z); rig.root.rotation.y = seat.h + b.rot * Math.PI / 2; g.scene.add(rig.root);
    this.list.push({ b, seat, rig, anim: new Animator(rig, { trait: 'cheerful' }), x, z, up: 'drink', ut: Math.random() * 3 });
  }
  leave(d) { this.game.scene.remove(d.rig.root); d.rig.root.traverse((o) => { if (o.geometry && o.geometry.userData && o.geometry.userData.own) o.geometry.dispose(); }); this.list = this.list.filter((q) => q !== d); }
}

// The function room over the Red Lion. Most Saturday nights there's a do upstairs: a wedding reception, somebody's
// 40th, a retirement, the darts club dinner. The windows glow, there's a DJ, and the guests dance to the Macarena and
// Whigfield until gone eleven. Seen from the street through the upstairs windows, or by going up the stairs.
const DOS = ['a wedding reception', 'a 40th birthday party', 'a retirement do', 'the darts club dinner', 'a christening party', 'a silver wedding anniversary', 'an 18th birthday party'];
const DANCE = ['dance', 'dance', 'macarena', 'whigfield', 'cheers', 'drink', 'talk', 'laugh', 'pogo', 'threelions'];
export class FunctionRoom {
  constructor(game) { this.game = game; this.guests = []; this.on = null; this.t = 0; }
  update(dt) {
    const g = this.game, c = g.clock; if (!g.started) return;
    if ((this.t -= dt) <= 0) {
      this.t = 3;
      const pub = g.buildings.list.find((b) => b.id === 'tavern' && b.state === 'done' && b.ext && b.ext.levels && b.ext.levels[1]), sat = c.weekday === 5, night = c.hour >= 19 && c.hour < 23.5;
      if (this.on && (!pub || this.on.b !== pub || !night || !sat)) this.end();
      if (!this.on && pub && sat && night && g.population.count() >= 18 && this.doDay !== c.totalDays && Math.random() < 0.85) this.start(pub);
      else if (pub && sat && night) this.doDay = c.totalDays;   // (some Saturdays it's quiet)
    }
    if (!this.on) return;
    const cam = g.camera.position, near = Math.hypot(cam.x - this.on.b.cx, cam.z - this.on.b.cz) < 60;
    for (const d of this.guests) { if (!near) continue; if ((d.ut -= dt) <= 0) { d.up = pick(DANCE); d.ut = 3 + Math.random() * 5; } d.anim.update(dt, { lower: 'stand', upper: d.up, dist: 0, speed: 0, speaking: d.up === 'talk', laugh: d.up === 'laugh' ? 1 : 0, mood: 0.9 }); }
    // the bass through the floorboards when Sam's in the pub
    if (g.mode === 'sim' && g.buildings.playerInside === this.on.b && (this.beat = (this.beat || 0) - dt) <= 0) { this.beat = 0.48; this.on.k = (this.on.k || 0) + 1; Sfx.tone(this.on.k % 4 === 0 ? 70 : 55, 0.12, { type: 'sine', vol: 0.05 }); }
  }
  start(b) {
    const g = this.game, kind = pick(DOS), lg = b.ext.levels[1], W = b.def.w * 4, D = b.def.d * 4, n = 7 + Math.floor(Math.random() * 6);
    this.on = { b, kind }; this.doDay = g.clock.totalDays;
    // somewhere to stand: not down the stairwell, not in the furniture, not on top of each other
    const plan = levelPlan(b.def), busy = (plan ? slabHoles(plan, 1) : []).map((r) => [r[0] - 0.6, r[1] + 0.6, r[2] - 0.6, r[3] + 0.6]);
    for (const f of upperFurniture(b.def)) if (f.k === 1) { const d = FURN[f.t], [sx, sz] = d ? ((f.r || 0) % 2 ? [d.s[1], d.s[0]] : d.s) : [1, 1]; busy.push([f.x - sx / 2 - 0.35, f.x + sx / 2 + 0.35, f.z - sz / 2 - 0.35, f.z + sz / 2 + 0.35]); }
    const spots = [];
    for (let t = 0; t < 200 && spots.length < n; t++) { const x = (Math.random() - 0.5) * (W - 1.6), z = (Math.random() - 0.5) * (D - 1.6); if (!busy.some((r) => x > r[0] && x < r[1] && z > r[2] && z < r[3]) && !spots.some((p) => Math.hypot(p.x - x, p.z - z) < 0.75)) spots.push({ x, z }); }
    for (const sp of spots) {
      const P = g.population.makePerson({ kind: 'visitor' }), rig = createRig(P.look), a = Math.atan2(sp.x, sp.z);
      rig.root.position.set(sp.x, 3.2 + 0.03, sp.z); rig.root.rotation.y = a + Math.PI + (Math.random() - 0.5) * 1.5; lg.add(rig.root);   // facing roughly into the room
      this.guests.push({ rig, anim: new Animator(rig, { trait: 'cheerful' }), up: pick(DANCE), ut: Math.random() * 3 });
    }
    g.messages.push('The Red Lion', `There's ${kind} in the function room upstairs tonight. Music till late.`);
  }
  end() { for (const d of this.guests) d.rig.root.parent && d.rig.root.parent.remove(d.rig.root); this.guests = []; this.on = null; }
}
