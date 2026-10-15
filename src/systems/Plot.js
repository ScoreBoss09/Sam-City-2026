import * as THREE from 'three';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { UNIT } from '../config.js';
import { mergeByMaterial, colorize } from '../render/BuildingFactory.js';
import { box } from '../render/furniture/kit.js';

/**
 * The ways out of Sam City, once Sam knows (the script pages, the words people let slip, the famous visitors' whispers).
 *
 * Bringing the Lift down: somebody else has noticed too, a quarryman with the key to the powder hut. A letter, a word
 * in the daytime, and at two in the morning (when the Lift crew change over) a keg on the platform and a fuse. The Lift
 * goes up in a ball of fire; where it stood there's a hole with a maintenance ladder going down into the dark, and that
 * ladder is a way out. Nobody can get in or out by the Lift: no newcomers, no visitors, no deliveries, and the whole
 * town is on edge. If Sam doesn't go, a few nights later the Lift is put back overnight, and the friend is never seen again.
 *
 * Story actions are ordinary things to do: targets() offers Sam an "E to ..." when he's in the right place.
 */
const GONE = ['The Lift\'s gone! How are the deliveries going to get here?', 'My sister was coming up on Thursday...', 'What have you DONE, Sam?', 'We\'re cut off. We\'re actually cut off.', 'Who\'s going to bring the bread?', 'I keep hearing banging down that hole at night.', 'Is it true there\'s a ladder? Where does it go?', 'I can\'t sleep. Nobody can sleep.', 'The guards won\'t say anything. They just stand there.', 'Mum says we\'re not allowed near the hole.'];
const RC = new THREE.Raycaster(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
const GONE_THINK = ['Everyone\'s frightened. Of what, though? Of being on their own?', 'They keep looking at the sky. Like they\'re waiting for somebody to tell them what to do.', 'The ladder\'s still there. Down in the dark.'];

export class Plot {
  constructor(game) { this.game = game; this.t = 2; this.wreck = null; this.fx = []; this.keg = null; this.gossipT = 30; }
  get f() { return this.game.flags; }
  /** Has Sam seen enough to know? */
  knows() { const S = this.game.story; return S.stage >= 4 || (S.clues >= 2 && (S.tips || 0) >= 1 && (S.slips || 0) >= 10); }
  ally() { const n = this.f.allyName; return n ? this.game.population.sims.find((s) => s.name === n && !s.remove) || null : null; }
  /** Where the shaft is (the middle of the Lift's pit), and the front of the platform. */
  pit() { const L = this.game.lift, [x, z] = L.toWorld(0, 0.5); return { x, z }; }
  deck(lx, lz) { const [x, z] = this.game.lift.toWorld(lx, lz); return { x, z }; }
  update(dt) {
    const g = this.game; if (!g.started || !g.lift) return; this.step(dt);
    if (this.f.liftDown && !this.wreck) this.makeWreck(false);   // (after loading a game with the Lift in pieces)
    if ((this.t -= dt) > 0 || g.ending) return; this.t = 1;
    this.liftPlot(); if (this.f.liftDown) this.aftermath();
  }

  // ---------- bringing the Lift down ----------
  liftPlot() {
    const g = this.game, f = this.f, c = g.clock, h = c.hour, st = f.liftPlot;
    if (!st && !f.liftDown && !f.escaped && !f.liftRebuilt && this.knows() && g.buildings.count('quarry') && h >= 8 && h < 18) {
      const quarry = g.buildings.list.filter((b) => b.id === 'quarry' && b.state === 'done').flatMap((b) => b.workers), pool = (quarry.length ? quarry : g.population.residents()).filter((s) => s.kind === 'resident' && s.age >= 20 && s.age < 65 && !s.remove);
      const a = pool.sort((p, q) => (q.gaveClue ? 1 : 0) - (p.gaveClue ? 1 : 0) || (q.temper || 0) - (p.temper || 0))[0]; if (!a) return;
      f.allyName = a.name; f.liftPlot = 'letter';
      g.mail.send(a.name, 'About the Lift', `Sam,\n\nI know you've noticed. The words people let slip and then take back. The sky that's a bit too close. The Lift that never takes anybody home.\n\nI work the Quarry. There's blasting powder in the hut, more than enough to bring the Lift down. If it's gone they can't send anybody else down, and they can't take anybody away.\n\nCome and find me, in the daytime. Don't write back.\n\n${a.first}`);
      g.messages.push('Sam (thought)', `A letter from ${a.first}, at the Quarry. About the Lift.`, 'story'); this.markAlly();
      return;
    }
    const a = this.ally(); if ((st === 'letter' || st === 'agreed') && !a) { f.liftPlot = 'lost'; return; }   // (they moved away, or worse)
    if (st === 'agreed') {
      const night = h >= 1.5 && h < 4;
      if (night && !a.plot) { const p = this.deck(1.6, 4.2); a.plot = { x: p.x, z: p.z }; a.endActivity && a.endActivity(); a.goTo({ x: p.x, z: p.z, face: Math.atan2(this.pit().x - p.x, this.pit().z - p.z) }); this.placeKeg(); if (g.markers) this.mk = g.markers.add(p.x, p.z, '🧨', `Meet ${a.first} at the Lift`, 3 * 3600, null, () => this.f.liftPlot === 'agreed' && !!a.plot); }
      if (!night && a.plot) { a.plot = null; this.dropKeg(); g.messages.push(a.first, 'Waited at the Lift till four. Tomorrow night, then.', 'quiet'); }
    }
  }
  markAlly() { const g = this.game, a = this.ally(); if (a && g.markers) g.markers.add(a.x, a.z, '🧨', `${a.first} (the Quarry)`, 7 * 24 * 3600, a, () => this.f.liftPlot === 'letter' && !a.remove); }
  /** The things Sam can do for the story right now, near (x, z): [{ kind: 'act', text, act, x, z, d }]. */
  targets(x, z) {
    const g = this.game, f = this.f, out = [], a = this.ally();
    if (a && f.liftPlot === 'letter' && !a.inside && a.pose !== 'sleep') { const d = Math.hypot(a.x - x, a.z - z); if (d < 2.6) out.push({ kind: 'act', text: `Ask ${a.first} about the blasting powder`, act: () => this.allyTalk(a), x: a.x, z: a.z, d: d - 0.6 }); }
    if (a && f.liftPlot === 'agreed' && a.plot && this.keg) { const d = Math.hypot(this.keg.position.x - x, this.keg.position.z - z); if (d < 3) out.push({ kind: 'act', text: g.security && g.security.onDuty() ? 'Wait for the guards to change over (2 till 4)' : 'Light the fuse', act: () => { if (!g.security.onDuty()) this.blast(a); }, x: this.keg.position.x, z: this.keg.position.z, d: d - 0.8 }); }
    if (f.liftDown) { const p = this.pit(), d = Math.hypot(p.x - x, p.z - z); if (d < 4) out.push({ kind: 'act', text: 'Climb down the ladder into the shaft', act: () => this.ladder(), x: p.x, z: p.z, d: d - 1 }); }
    return out;
  }
  /**
   * A camera spot looking at (tx, ty, tz) with nothing in the way (no house between it and the Lift): tried round the
   * preferred direction (dx, dz) at a few distances and heights.
   */
  viewOf(tx, ty, tz, dx, dz, dists = [24, 30, 18], heights = [7, 11]) {
    const g = this.game, n = Math.hypot(dx, dz) || 1, a0 = Math.atan2(dx / n, dz / n), objs = g.buildings.list.filter((b) => b !== g.lift && b.ext && Math.hypot(b.cx - tx, b.cz - tz) < 60).flatMap((b) => [b.ext.group, b.ext.roof].filter(Boolean));
    for (const o of objs) o.updateMatrixWorld(true);
    for (const da of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2, -2, Math.PI]) for (const r of dists) for (const h of heights) {
      const x = tx + Math.sin(a0 + da) * r, z = tz + Math.cos(a0 + da) * r; V1.set(x, h, z); V2.set(tx, ty, tz).sub(V1); const L = V2.length(); V2.normalize(); RC.set(V1, V2); RC.far = L - 3;
      if (!RC.intersectObjects(objs, true).some((q) => q.object.isMesh && q.object.visible !== false && !(q.object.material && q.object.material.transparent))) return { x, y: h, z };
    }
    return { x: tx + Math.sin(a0) * dists[0], y: heights[heights.length - 1] + 6, z: tz + Math.cos(a0) * dists[0] };
  }
  /** A camera over one person's shoulder onto the other's face. */
  ots(a, b, side = 0.9) { const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz) || 1, sx = -dz / n, sz = dx / n; return { pos: [a.x - dx / n * 1.9 + sx * side, 1.92, a.z - dz / n * 1.9 + sz * side], look: [b.x, 1.6, b.z], fov: 38 }; }
  face(P, s) { s.path = []; s.faceGoal = s.heading = Math.atan2(P.x - s.x, P.z - s.z); P.heading = Math.atan2(s.x - P.x, s.z - P.z); P.yaw = P.heading + Math.PI; }
  allyTalk(a) {
    const g = this.game, P = g.player; let yes = false; this.face(P, a); a.eyeOn = P;
    g.cutscene.play({ shots: [
      { dur: 6, cam: () => this.ots(P, a), ask: { who: a.name, q: 'You\'ve seen it too, haven\'t you? The words. The sky. I\'ve got enough powder in the hut to bring that Lift down. Are you in?', opts: [{ t: 'I\'m in. Let\'s bring it down.', on: () => { yes = true; } }, { t: 'Not yet. I need to think.', on: () => { yes = false; } }], def: 1 } },
      { dur: 5, cut: true, cam: () => this.ots(P, a), say: () => [a.name, yes ? '"Two in the morning, when the Lift crew change over. Meet me on the platform. I\'ll bring the powder."' : '"Don\'t think too long. You know where I am."'] },
    ], tick: (dt) => { P.speed = 0; P.syncMesh(dt); }, onEnd: () => { a.eyeOn = null; if (yes) { this.f.liftPlot = 'agreed'; g.messages.push('Sam (thought)', `Two in the morning, at the Lift. ${a.first} is bringing the powder.`, 'story'); } } });
  }
  placeKeg() {
    if (this.keg) return; const g = this.game, p = this.deck(0, 3.4), k = new THREE.Group(); box(k, 0.62, 0.8, 0.62, 0x6a4a2a, 0, 0, 0); box(k, 0.66, 0.06, 0.66, 0x2a2a2e, 0, 0.18, 0); box(k, 0.66, 0.06, 0.66, 0x2a2a2e, 0, 0.6, 0); box(k, 0.03, 0.03, 1.2, 0xd8c890, 0, 0.82, 0.55);
    colorize(k); k.position.set(p.x, 0.2, p.z); g.scene.add(k); this.keg = k;
  }
  dropKeg() { if (this.keg) { this.game.scene.remove(this.keg); this.keg = null; } }
  /** The fuse, the run, and the bang. */
  blast(a) {
    const g = this.game, P = g.player, kp = this.keg.position, L = g.lift, out = { x: L.doorOut.x - L.cx, z: L.doorOut.z - L.cz }, n = Math.hypot(out.x, out.z) || 1, ox = out.x / n, oz = out.z / n;
    const sx = -oz, sz = ox, safe = (k) => ({ x: L.doorOut.x + ox * 14 + sx * k, z: L.doorOut.z + oz * 14 + sz * k }), run = { P: safe(-1), a: safe(1) }, from = { P: { x: P.x, z: P.z }, a: { x: a.x, z: a.z } };
    let shake = 0, boomed = false, rt = -1; const V = this.viewOf(L.cx, 3, L.cz, ox + sx * 0.3, oz + sz * 0.3), near = this.viewOf(this.pit().x, 0.5, this.pit().z, ox + sx * 0.25, oz + sz * 0.25, [15, 18, 12], [5, 8]);
    const wide = (t) => { const j = shake > 0 ? (Math.random() - 0.5) * shake : 0; return { pos: [V.x + j, V.y + j, V.z], look: [L.cx, 3.5, L.cz], fov: 50 }; };
    g.cutscene.play({ shots: [
      { dur: 3.4, cam: () => ({ pos: [kp.x + ox * 3.2 + sx * 2.2, 1.5, kp.z + oz * 3.2 + sz * 2.2], look: [kp.x, 0.9, kp.z], fov: 42 }), say: [a.name, '"Right. Fuse is lit. RUN!"'], at: () => { a.plot = null; this.fuse = 3.4; P.onCamera = true; } },
      { dur: 2.2, cut: true, cam: wide, at: () => { rt = 0; a.hurry = true; } },
      { dur: 4.5, cam: wide, at: () => { this.explode(); boomed = true; shake = 1.4; } },
      { dur: 6, cut: true, cam: (t) => { const k = t / 6, p = this.pit(); return { pos: [near.x + (p.x - near.x) * k * 0.3, near.y - k * 1.2, near.z + (p.z - near.z) * k * 0.3], look: [p.x, 0, p.z], fov: 48 }; }, title: 'The Lift is gone', text: 'Where it stood: a hole, and a maintenance ladder going down into the dark.' },
      { dur: 4.5, cut: true, cam: () => this.ots(P, a), say: [a.name, '"We did it. We actually did it. ...So. Now what?"'], at: () => { this.face(P, a); } },
    ], tick: (dt) => {
      shake = Math.max(0, shake - dt * 0.5); if (this.fuse > 0 && this.keg) { this.fuse -= dt; if (Math.random() < 0.6) g.particles.burst(kp.x + ox * 0.55, 1.0, kp.z + oz * 0.55, 0xffd040, 2, 0.3, 1.2, 0.04); }
      if (rt >= 0 && rt < 1) { rt = Math.min(1, rt + dt / 1.6); const k = rt * (2 - rt); P.x = from.P.x + (run.P.x - from.P.x) * k; P.z = from.P.z + (run.P.z - from.P.z) * k; P.heading = Math.atan2(ox, oz); P.speed = rt < 1 ? 6 : 0; P.moved = rt < 1; a.x = from.a.x + (run.a.x - from.a.x) * k; a.z = from.a.z + (run.a.z - from.a.z) * k; a.heading = a.faceGoal = P.heading; a.vel = rt < 1 ? 5 : 0; a.moved = rt < 1; a.path = []; }
      else { P.speed = 0; P.moved = false; }
      P.syncMesh(dt);
    }, onEnd: () => { P.onCamera = false; a.hurry = false; if (!boomed) this.explode(); P.speed = 0; } });
  }
  explode() {
    const g = this.game, L = g.lift, p = this.pit(); if (this.f.liftDown) return; this.dropKeg();
    this.f.liftDown = g.clock.totalDays; this.f.liftPlot = 'done'; this.f.liftDownAt = g.clock.totalDays * 24 + g.clock.hour;
    this.makeWreck(true); Sfx.noise(2.2, { freq: 180, q: 0.4, vol: 0.9, type: 'lowpass' }); Sfx.tone(46, 1.6, { type: 'sine', vol: 0.5, slide: -20 }); Sfx.noise(0.5, { freq: 2400, vol: 0.4, delay: 0.05 });
    for (let i = 0; i < 6; i++) g.particles.burst(p.x + (Math.random() - 0.5) * 4, 1 + i, p.z + (Math.random() - 0.5) * 4, i % 2 ? 0xff7a1a : 0xffc040, 16, 3.5, 6 + i, 0.25);
    for (let i = 0; i < 4; i++) g.particles.burst(p.x, 2 + i * 2, p.z, 0x5a5a5a, 14, 2.5, 3, 0.4);
    const fire = (c, o) => new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending })), ball = fire(0xff6a1a, 0.9), core = fire(0xffe08a, 1), light = new THREE.PointLight(0xffa050, 60, 120, 1.4);
    ball.add(core); core.scale.setScalar(0.6); ball.position.set(p.x, 3, p.z); light.position.set(p.x, 6, p.z); g.scene.add(ball, light); this.fx.push({ t: 0, ball, light });   // (a white-hot core in an orange fireball, lighting up the night)
    for (const s of g.population.sims) { if (s.kind !== 'resident' && s.kind !== 'child') continue; s.moodBoost -= 0.2; const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < 60 && !s.inside) { s.emote = { upper: 'panic', t: 3 }; s.hurry = true; } if (d < 40 && s.mesh.visible && Math.random() < 0.3) g.social.say(s, pick(['WHAT WAS THAT?!', 'The Lift! The LIFT!', 'Oh my God!', 'Was that a bomb?!']), 2.5); }
    g.messages.push('Town news', 'BOOM. The Lift has been blown up. Nobody can come down to Sam City, and nobody can go back up. No newcomers, no visitors, no deliveries.', 'alarm');
  }
  /** The Lift in pieces: a scorched deck, the walls in stumps, girders down, rubble, small fires, and the open shaft with its ladder. */
  makeWreck(flying) {
    const g = this.game, L = g.lift, W = L.def.w * UNIT, D = L.def.d * UNIT; if (this.wreck) return;
    if (L.ext && L.ext.group) L.ext.group.visible = false; if (L.ext && L.ext.roof) L.ext.roof.visible = false;
    const w = new THREE.Group(), r = (a) => Math.sin(a * 91.7) * 0.5 + 0.5;
    box(w, W, 0.35, D, 0x2a2826, 0, -0.18, 0); box(w, 7, 0.02, 7, 0x050608, 0, 0.18, 0.5);   // the scorched deck, the hole
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = Math.cos(a) * 3.6, z = 0.5 + Math.sin(a) * 3.6; box(w, 0.6 + r(i) * 0.8, 0.2 + r(i + 3) * 0.5, 0.5 + r(i + 7) * 0.7, 0x1a1816, x, 0.15, z); }   // the torn rim
    for (const [x, h] of [[-6.5, 4.2], [-4, 2.4], [-1.2, 5.6], [2.2, 1.8], [5.4, 3.6], [7.2, 2.2]]) { const m = box(w, 2.4, h, 1.2, 0x2e343c, x, 0, -D / 2 + 0.6); m.rotation.z = (r(x) - 0.5) * 0.3; }   // what's left of the back wall
    { const m = box(w, 1.0, 1.0, 8.5, 0x59616d, -2.5, 0.2, 2.2); m.rotation.y = 0.5; m.rotation.z = 0.1; } { const m = box(w, 0.7, 0.7, 11, 0x59616d, 2, 0.5, 0.8); m.rotation.y = -0.35; m.rotation.x = 0.06; }   // girders down
    box(w, 1.0, 3, 1.0, 0x59616d, -W / 2 + 0.6, 0, D / 2 - 1); { const m = box(w, 1.0, 1.0, 7, 0x59616d, W / 2 - 2.5, 0.2, D / 2 - 1.6); m.rotation.y = 1.2; }   // a column standing, one fallen
    { const m = box(w, 6, 0.1, 1.2, 0x3a1010, 3.5, 0.25, 4.6); m.rotation.y = 0.2; m.rotation.x = -0.12; }   // the sign, face down
    for (let i = 0; i < 26; i++) { const x = (r(i * 3) - 0.5) * W * 1.1, z = (r(i * 5 + 1) - 0.5) * D * 1.1; if (Math.hypot(x, z - 0.5) < 3.8) continue; const s = 0.3 + r(i * 7) * 0.9, m = box(w, s, s * 0.7, s * 1.1, [0x5b6572, 0x39414b, 0x777777, 0x2a2a2a][i % 4], x, 0.15, z); m.rotation.y = r(i) * 3; }
    // the ladder down the shaft: rails and rungs, from the lip into the dark
    for (const x of [-0.3, 0.3]) box(w, 0.06, 13, 0.06, 0x9aa0a8, x, -12, -2.25); for (let y = -11.7; y < 1; y += 0.32) box(w, 0.6, 0.04, 0.04, 0x9aa0a8, 0, y, -2.25);
    box(w, 6.6, 12, 0.1, 0x0a0b0d, 0, -12, -2.45); box(w, 6.6, 12, 0.1, 0x0a0b0d, 0, -12, 3.45); box(w, 0.1, 12, 6, 0x0a0b0d, -3.3, -12, 0.5); box(w, 0.1, 12, 6, 0x0a0b0d, 3.3, -12, 0.5);   // the shaft walls (so it's a shaft, not a window onto the sea bed)
    colorize(w); mergeByMaterial(w);
    const fires = []; for (const [x, z] of [[-4.5, -2], [5, 1.5], [1.5, 4.5]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); m.position.set(x, 0.45, z); w.add(m); fires.push(m); }
    w.position.copy(L.ext.group.position); w.rotation.copy(L.ext.group.rotation); g.scene.add(w); this.wreck = { group: w, fires };
    if (flying) { const p = this.pit(); for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random() * 0.8, 0.3 + Math.random() * 0.5, 0.4 + Math.random() * 1.2), new THREE.MeshStandardMaterial({ color: [0x5b6572, 0x39414b, 0xf1c40f, 0x2a2a2a][i % 4], roughness: 0.8 })); const a = Math.random() * Math.PI * 2, v = 6 + Math.random() * 10; m.position.set(p.x, 2, p.z); g.scene.add(m); this.fx.push({ t: 0, deb: m, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: 8 + Math.random() * 12, spin: (Math.random() - 0.5) * 8 }); } }
  }
  clearWreck() {
    const g = this.game, L = g.lift; if (this.wreck) { g.scene.remove(this.wreck.group); this.wreck.group.traverse((o) => { if (o.geometry && o.geometry.userData.own) o.geometry.dispose(); }); this.wreck = null; }
    for (const e of this.fx) if (e.deb) g.scene.remove(e.deb); this.fx = this.fx.filter((e) => !e.deb);
    if (L.ext && L.ext.group) L.ext.group.visible = true; if (L.ext && L.ext.roof) L.ext.roof.visible = true;
  }
  /** Fireball, flying debris, the small fires flickering on. */
  step(dt) {
    const g = this.game;
    for (const e of this.fx) {
      e.t += dt;
      if (e.ball) { const k = e.t / 1.6, core = e.ball.children[0]; e.ball.scale.setScalar(2 + k * 12); e.ball.position.y = 3 + k * 6; e.ball.rotation.y += dt; e.ball.material.opacity = Math.max(0, 0.9 - k * 0.8); if (core) core.material.opacity = Math.max(0, 1 - k * 1.6); e.light.intensity = Math.max(0, 60 * (1 - e.t / 2.2)); if (k >= 1.4) { g.scene.remove(e.ball, e.light); e.ball.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); e.done = true; } }
      if (e.deb && !e.rest) { e.vy -= 22 * dt; const m = e.deb; m.position.x += e.vx * dt; m.position.z += e.vz * dt; m.position.y += e.vy * dt; m.rotation.x += e.spin * dt; m.rotation.z += e.spin * 0.7 * dt; if (m.position.y < 0.2) { m.position.y = 0.2; e.rest = true; } }
    }
    this.fx = this.fx.filter((e) => !e.done);
    if (this.wreck) { const hrs = this.f.liftDownAt != null ? g.clock.totalDays * 24 + g.clock.hour - this.f.liftDownAt : 99; for (const [i, m] of this.wreck.fires.entries()) { m.visible = hrs < 10; if (m.visible) { m.scale.y = 0.7 + Math.sin(g.elapsed * 9 + i * 2) * 0.3; if (Math.random() < dt * 2) g.particles.burst(m.getWorldPosition(new THREE.Vector3()).x, 1.2, m.getWorldPosition(new THREE.Vector3()).z, 0x666666, 2, 0.4, 1.4, 0.18); } } }
  }
  /** The town without its Lift: frightened, gathered round the hole, talking about nothing else. Then, one night, it's back. */
  aftermath() {
    const g = this.game, f = this.f, c = g.clock, P = g.player;
    if ((this.gossipT -= 1) <= 0 && g.mode === 'sim') { this.gossipT = 25 + Math.random() * 30; const s = pick(g.population.sims.filter((q) => (q.kind === 'resident' || q.kind === 'child') && q.mesh.visible && !q.chat && !q.bubble && q.pose !== 'sleep' && Math.hypot(q.x - P.x, q.z - P.z) < 12)); if (s) { g.social.say(s, pick(GONE), 3); s.emote = { upper: pick(['panic', 'facepalm', 'lookaround']), t: 2 }; } if (Math.random() < 0.15) g.messages.push('Sam (thought)', pick(GONE_THINK), 'story'); }
    if (c.hour >= 9 && c.hour < 18 && Math.random() < 0.02) { const p = this.pit(); for (const s of g.population.sims.filter((q) => q.kind === 'resident' && !q.inside && q.activity === 'leisure' && Math.hypot(q.x - p.x, q.z - p.z) < 80).slice(0, 3)) { const a = Math.random() * 6.28, r = 9 + Math.random() * 3; s.goTo({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, face: a + Math.PI }); } }   // people come to stare at the hole
    if (c.totalDays - f.liftDown >= 4 && c.hour >= 3 && c.hour < 5 && !(g.mode === 'sim' && Math.hypot(P.x - g.lift.cx, P.z - g.lift.cz) < 40)) this.rebuild();   // (nobody sees it done)
  }
  rebuild() {
    const g = this.game, f = this.f, a = this.ally(); this.clearWreck(); f.liftDown = null; f.liftRebuilt = g.clock.totalDays;
    if (a) { a.plot = null; g.population.depart(a); a.x = g.lift.doorIn.x; a.z = g.lift.doorIn.z; }
    for (const s of g.population.residents()) s.moodBoost += 0.15;
    g.mail.send('The Planning Office', 'The Supply Lift', `Dear Sam,\n\nFollowing last week's incident the Supply Lift has been repaired, and normal service has resumed.\n\nWe would remind all residents that the Lift is for staff only, and that blasting powder is to be kept under lock and key at all times.\n\nYours faithfully,\nThe Planning Office`);
    g.messages.push('Town news', `Overnight the Lift was put back: new paint, a new cage, and nobody saw it done.${a ? ` ${a.first} wasn't at work this morning. Nobody will say where ${a.gender === 'f' ? 'she\'s' : 'he\'s'} gone.` : ''}`, 'alarm');
  }
  /** The way out the Lift used to be: down the ladder, into the dark. */
  ladder() {
    const g = this.game, P = g.player, p = this.pit(), L = g.lift, top = this.deck(0, -2.0); let go = false, y = 0;
    P.heading = Math.atan2(p.x - top.x, p.z - top.z); P.yaw = P.heading + Math.PI;
    g.cutscene.play({ shots: [
      { dur: 6, cam: () => ({ pos: [p.x + (L.doorOut.x - L.cx) * 0.5, 4.5, p.z + (L.doorOut.z - L.cz) * 0.5], look: [p.x, -2, p.z], fov: 50 }), ask: { who: 'Sam', q: 'The ladder goes down into the dark. Climb down, and leave Sam City for good?', opts: [{ t: 'Climb down.', on: () => { go = true; P.x = top.x; P.z = top.z; P.onCamera = true; } }, { t: 'Not yet.', on: () => 'end' }], def: 1 } },
      { dur: 6.5, cut: true, cam: (t) => ({ pos: [top.x + 0.3, 2.6 - t * 1.2, top.z + 1.6], look: [top.x, y + 0.8, top.z], fov: 55 }), text: 'Down and down, rung after rung, into the dark under Sam City.', at: () => { y = 0; } },
    ], tick: (dt) => { if (go && g.cutscene.i === 1) { y -= dt * 1.4; P.floorY = y; } P.speed = 0; P.syncMesh(dt); }, onEnd: () => { P.onCamera = false; P.floorY = 0; if (go) g.escape('blast'); } });
  }
}
