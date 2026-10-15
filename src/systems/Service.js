import * as THREE from 'three';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { doorOffset } from '../data/layouts.js';

// Shops, pubs, cafés and restaurants run properly:
//  - a place is OPEN only while somebody's working there (a sign on the door says OPEN or CLOSED); customers go
//    to open places only;
//  - the first staff stand behind the serving counters (layout `counters`), cooks at the kitchen spots;
//  - shoppers browse, queue at a counter, get served and leave carrying what they bought (a bag, chips, a video...);
//  - in the pub, drinkers get a pint at the bar and take it to their seat;
//  - where there are tables and a kitchen (the café, the curry house, pub grub): a diner sits, a waiter comes and
//    takes the order, the cook cooks it (steam from the kitchen), the waiter brings the plate, they eat, the waiter
//    brings the bill and they pay.
const GOODS = { tavern: 'pint', wmc: 'pint', nightclub: 'pint', snooker: 'pint', offy: 'bag', chippy: 'chips', kebab: 'chips', cafe: 'cup', bakery: 'bag', butcher: 'bag', video: 'video', records: 'bag', cinema: 'popcorn', newsagent: 'bag', supermarket: 'bag', shop: 'bag', toyshop: 'bag', poundshop: 'bag', bookies: 'ticket', railstation: 'ticket', monostation: 'ticket', skylift: 'ticket', bowling: 'ticket', laserquest: 'ticket' };
const PROP_OF = { pint: 'pint', chips: 'chips', food: 'chips', cup: 'cup', bag: 'bag', ticket: 'ticket', video: 'video', popcorn: 'popcorn', paper: 'papers', cash: 'ticket' };
const STAY = { pint: true, cup: true, plate: true, notepad: true };   // put down when they leave the building
const plateGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.03, 12), plateMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.4 }), foodGeo = new THREE.BoxGeometry(0.16, 0.05, 0.12), foodMat = new THREE.MeshStandardMaterial({ color: 0x9a5a2a });

export class Service {
  constructor(game) { this.game = game; this.t = 0; this.orders = []; this.signTex = {}; }
  /** Does this building serve the public (so it opens and closes with its staff)? */
  isPublic(b) { const d = b.def; return b.state === 'done' && !!d.jobs && !d.park && d.cat !== 'res' && !!(d.shopping || d.dining || d.income || (b.spots.counters && b.spots.counters.length)); }
  open(b) { return !this.isPublic(b) || !!b.open; }
  staff(b) { return b.workers.filter((w) => w.activity === 'work' && w.inside === b && !w.upstairs && !(w.down > 0) && !w.remove); }
  /** Is someone actually standing at this counter's staff spot? */
  manned(b, c) { return this.staff(b).find((w) => !w.path.length && Math.hypot(w.x - c.staff.x, w.z - c.staff.z) < 0.9 && !w.order); }
  update(dt) {
    const g = this.game; if (!g.started) return; const k = Math.min(4, Math.max(0, g.clock.speed)); if (!k) return; dt *= k;
    if ((this.t -= dt) <= 0) {
      this.t = 0.5;
      for (const b of g.buildings.list) { if (!this.isPublic(b)) continue; const was = !!b.open; b.open = this.staff(b).length > 0; if (was !== b.open || !b.signMesh) this.sign(b); }
      this.recruit();
    }
    for (const s of g.population.sims) if (s.svc) this.step(s, dt);
    for (const o of this.orders) this.dine(o, dt);
    this.orders = this.orders.filter((o) => !o.done);
    // things are put down when people leave
    for (const s of g.population.sims) if (s.holding && STAY[s.holding] && !s.inside && !s.svc && (s.holdT = (s.holdT || 0) + dt) > 2) { s.holding = null; s.holdT = 0; }
  }
  /** OPEN / CLOSED on the shop door. */
  sign(b) {
    if (!b.ext || !b.doorPos) return; const open = !!b.open;
    if (!b.signMesh) {   // hung on the outside of the door itself, so it swings open with it (it used to hang in the doorway, in mid air once the door was open)
      const pv = b.ext.doors && b.ext.doors[0] && b.ext.doors[0].pivot, bb = new THREE.Box3();
      if (pv) for (const c of pv.children) if (c.isMesh) { c.geometry.computeBoundingBox(); c.updateMatrix(); bb.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrix)); }
      const w = pv && !bb.isEmpty() ? Math.min(0.62, (bb.max.x - bb.min.x) * 0.85) : 0.62, m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.355), new THREE.MeshBasicMaterial({ map: this.tex(true), transparent: true }));
      if (pv && !bb.isEmpty()) { m.position.set((bb.min.x + bb.max.x) / 2, 1.38, bb.max.z + 0.008); pv.add(m); }
      else { m.position.set(doorOffset(b.def.w) + (b.def.w === 1 ? 0 : 0.5), 1.62, b.def.d * 2 + 0.2); b.ext.group.add(m); }
      b.signMesh = m;
    }
    b.signMesh.material.map = this.tex(open); b.signMesh.material.needsUpdate = true;
  }
  tex(open) {
    const k = open ? 'o' : 'c'; if (this.signTex[k]) return this.signTex[k];
    const c = document.createElement('canvas'); c.width = 96; c.height = 34; const x = c.getContext('2d'); x.fillStyle = open ? '#1f7a3a' : '#a02020'; x.fillRect(0, 0, 96, 34); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(2, 2, 92, 30); x.fillStyle = '#fff'; x.font = 'bold 20px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(open ? 'OPEN' : 'CLOSED', 48, 18);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (this.signTex[k] = t);
  }
  /** Shoppers who've had a browse go to a counter; pub drinkers without a pint go to the bar. */
  recruit() {
    const g = this.game;
    for (const s of g.population.sims) {
      if (s.svc || s.remove || s.down > 0 || s.kind === 'security' || s.kind === 'raider' || s.kind === 'guest') continue; const b = s.inside; if (!b || !b.open) continue;
      if (!b.spots.counters || !b.spots.counters.length) { if (s.drinking && s.sitting && !s.holding && (s.pintT = (s.pintT || 0) + 0.5) > 3) s.holding = 'pint'; continue; }
      const browsing = s.shopping && !s.served && s.phase === 2 && !s.path.length && (s.browseT = (s.browseT || 0) + 0.5) > 3;
      const thirsty = s.drinking && s.sitting && !s.holding && b.spots.counters.some((c) => c.kind === 'bar');
      if (s.drinking && s.sitting && !s.holding && !thirsty && (s.pintT = (s.pintT || 0) + 0.5) > 3) s.holding = 'pint';   // (no bar to queue at: it's brought over)
      if (browsing || thirsty) this.queue(s, b, thirsty ? s.sitting : null);
    }
  }
  queue(s, b, back) {
    const C = b.spots.counters.filter((c) => this.manned(b, c)); if (!C.length) return;
    const load = (c) => this.game.population.sims.filter((q) => q.svc && q.svc.c === c).length, c = C.reduce((a, q) => (load(q) < load(a) ? q : a));
    if (back) { s.standUp(); }
    s.svc = { b, c, back, t: 0, n: load(c), wait: 0 };
  }
  /** Walk to the counter (or the queue behind it), get served, carry it off. */
  step(s, dt) {
    const v = s.svc, b = v.b, c = v.c, g = this.game;
    if (s.inside !== b && !s.path.length && v.t > 0.5) { s.svc = null; return; }
    if (!b.open || (v.wait += dt) > 45) { this.leave(s); return; }
    const ahead = g.population.sims.filter((q) => q !== s && q.svc && q.svc.c === c && q.svc.n < v.n).length; v.n = ahead;   // place in the queue
    const ux = c.cust.x - c.staff.x, uz = c.cust.z - c.staff.z, L = Math.hypot(ux, uz) || 1, spot = { x: c.cust.x + ux / L * ahead * 0.75, z: c.cust.z + uz / L * ahead * 0.75 };
    if (Math.hypot(s.x - spot.x, s.z - spot.z) > 0.45) { if (!s.path.length && (v.re = (v.re || 0) - dt) <= 0) { v.re = 1.5; s.goTo({ b, x: spot.x, z: spot.z, face: Math.atan2(-ux, -uz) }); } return; }
    if (ahead > 0) return;
    const w = this.manned(b, c); if (!w) return;
    v.t += dt; s.faceGoal = Math.atan2(-ux, -uz); w.faceGoal = Math.atan2(ux, uz);
    if (v.t < 0.1) { s.emote = { upper: 'talk', t: 1.6 }; w.emote = { upper: 'talk', t: 1.6 }; }
    if (v.t > 2.6 && !v.paid) { v.paid = true; w.emote = { upper: 'tidy', t: 1.0 }; if (g.mode === 'sim' && g.buildings.playerInside === b) Sfx.tone(1400, 0.06, { type: 'square', vol: 0.02 }); }
    if (v.t > 3.6) { s.holding = PROP_OF[c.goods] || PROP_OF[GOODS[b.id]] || 'bag'; s.holdT = 0; s.served = true; this.sales = (this.sales || 0) + 1; this.leave(s, true); }
  }
  leave(s, served) {
    const v = s.svc; s.svc = null; if (!v) return;
    if (v.back && served) { const seat = v.back; if (!seat.taken) s.goTo({ b: v.b, x: seat.x, z: seat.z, seat }); return; }   // back to the table with the drink
    if (s.shopping) { s.timer = Math.min(s.timer || 0, 3); s.phase = 2; }
  }
  // ---------- table service ----------
  /** Called by a diner each tick while eating: true means "wait" (for the waiter, the food, or the bill). */
  holdMeal(s) {
    const b = s.eatPlace; if (!b || s.inside !== b || !b.spots) return false;
    const tables = b.spots.tables && b.spots.tables.length, kitchen = b.spots.kitchen && b.spots.kitchen.length;
    if (tables && kitchen && s.sitting && b.open) {
      let o = this.orders.find((q) => q.s === s); if (!o) { if (s.mealDone) return false; o = { s, b, stage: 'wait', t: 0 }; this.orders.push(o); }
      if (o.stage === 'eat') { if (s.eatTimer <= 1.2) { o.stage = 'bill'; o.t = 0; } return false; }
      return o.stage !== 'paid';
    }
    if (!tables && b.spots.counters && b.spots.counters.length && b.open && !s.holding && !s.svc && !s.mealDone) { this.queue(s, b, s.sitting || null); return true; }   // a takeaway: fetch it from the counter first
    return !!s.svc;
  }
  dine(o, dt) {
    const g = this.game, s = o.s, b = o.b; o.t += dt;
    if (s.remove || s.inside !== b || !s.eating) { this.endOrder(o); return; }
    if (!b.open && o.t > 25) { s.mealDone = true; this.endOrder(o); return; }   // the staff went home: never mind
    const free = () => this.staff(b).filter((w) => !w.order && !(b.spots.kitchen || []).some((k) => Math.hypot(w.x - k.x, w.z - k.z) < 0.9) && w.role !== 'cook');
    const cooks = () => this.staff(b).filter((w) => (b.spots.kitchen || []).some((k) => Math.hypot(w.x - k.x, w.z - k.z) < 1.0));
    const go = (w, x, z) => { if (Math.hypot(w.x - x, w.z - z) > 0.8) { if (!w.path.length && (w.re = (w.re || 0) - dt) <= 0) { w.re = 1.2; w.goTo({ b, x, z }); } return false; } return true; };
    const near = () => { const a = Math.atan2(b.cx - s.x, b.cz - s.z); return { x: s.x + Math.sin(a) * 0.75, z: s.z + Math.cos(a) * 0.75 }; };
    const hatch = (b.spots.kitchen || [])[0];
    if (o.stage === 'wait') { const w = free().sort((a, c) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(c.x - s.x, c.z - s.z))[0]; if (w) { o.w = w; w.order = o; o.stage = 'order'; o.t = 0; w.holding = 'notepad'; } else if (o.t > 30) { o.stage = 'cook'; o.t = 0; } return; }
    const w = o.w; if (w && (w.remove || w.activity !== 'work' || w.inside !== b)) { o.w = null; if (o.stage !== 'cook') { o.stage = 'wait'; o.t = 0; } }
    if (o.stage === 'order') { const p = near(); if (go(w, p.x, p.z)) { w.faceGoal = Math.atan2(s.x - w.x, s.z - w.z); if (!o.talked) { o.talked = true; o.t = 0; w.emote = { upper: 'talk', t: 2.5 }; s.emote = { upper: 'talk', t: 2.5 }; } if (o.t > 2.8) { o.stage = 'cook'; o.t = 0; o.talked = false; w.holding = null; } } return; }
    if (o.stage === 'cook') {
      if (w && hatch) go(w, hatch.x + 0.9, hatch.z + 0.9);
      for (const ck of cooks()) { ck.emote = { upper: Math.random() < 0.5 ? 'saw' : 'tidy', t: 1 }; }
      if (hatch && Math.random() < dt * 3 && g.mode === 'sim' && g.buildings.playerInside === b) g.particles.burst(hatch.x, 1.3, hatch.z, 0xf0f0f0, 2, 0.3, 0.8, 0.12);   // steam
      if (o.t > 7) { o.stage = 'serve'; o.t = 0; if (o.w) o.w.holding = 'plate'; } return;
    }
    if (o.stage === 'serve') { if (!o.w) { const ww = free()[0]; if (ww) { o.w = ww; ww.order = o; ww.holding = 'plate'; } else if (o.t > 20) this.served(o); return; } const p = near(); if (go(o.w, p.x, p.z)) { o.w.faceGoal = Math.atan2(s.x - o.w.x, s.z - o.w.z); o.w.emote = { upper: 'tidy', t: 0.8 }; this.served(o); } return; }
    if (o.stage === 'bill') {
      if (!o.w || o.w.order !== o) { const ww = free()[0]; if (ww) { o.w = ww; ww.order = o; } else if (o.t > 15) { this.pay(o); } return; }
      o.w.holding = 'notepad'; const p = near(); if (go(o.w, p.x, p.z)) { o.w.faceGoal = Math.atan2(s.x - o.w.x, s.z - o.w.z); if (!o.talked) { o.talked = true; o.t = 0; s.emote = { upper: 'talk', t: 1.5 }; } if (o.t > 2) this.pay(o); }
    }
  }
  served(o) {
    const g = this.game, s = o.s, b = o.b; o.stage = 'eat'; o.t = 0; if (o.w) { o.w.holding = null; this.release(o.w); o.w = null; }
    let best = null, bd = 9; for (const t of b.spots.tables || []) { const d = Math.hypot(t.x - s.x, t.z - s.z); if (d < bd) { bd = d; best = t; } }   // the plate goes on the table in front of them
    const px = best ? s.x + (best.x - s.x) * 0.45 : s.x, pz = best ? s.z + (best.z - s.z) * 0.45 : s.z, grp = new THREE.Group(), pl = new THREE.Mesh(plateGeo, plateMat), f = new THREE.Mesh(foodGeo, foodMat); f.position.y = 0.04; grp.add(pl, f); grp.position.set(px, 0.83, pz); g.scene.add(grp); o.plate = grp;
  }
  pay(o) {
    const g = this.game; this.meals = (this.meals || 0) + 1; o.stage = 'paid'; o.s.mealDone = true; if (o.w) { o.w.holding = null; this.release(o.w); o.w = null; }
    g.economy.earn(4 + Math.floor(Math.random() * 6), 'Takings: ' + o.b.def.name); if (g.mode === 'sim' && g.buildings.playerInside === o.b) Sfx.tone(1400, 0.06, { type: 'square', vol: 0.02 });
    this.endOrder(o, true);
  }
  release(w) { w.order = null; w.holding = null; w.phase = 0; }   // back to their post
  endOrder(o, keepFlag) { o.done = true; if (o.w) this.release(o.w); if (o.plate) { this.game.scene.remove(o.plate); o.plate = null; } if (!keepFlag && o.s) o.s.mealDone = o.s.mealDone || false; }
}
