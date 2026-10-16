import * as THREE from 'three';
import { WALL_H } from '../config.js';
import { pick } from '../util.js';
import { mergeByMaterial } from '../render/BuildingFactory.js';

/**
 * The Stairway to Heaven: Sam Tower's last upgrade (once the seams in the sky have shown). Builders put a steel stair
 * on the roof that winds up and up, past the clouds, until it touches the sky; and the sky has a hatch in it.
 *
 * Up through the hatch is the office above the sky: rows of desks and headsets, a wall of televisions that are all
 * Sam City (three of them live), the day's running order on a whiteboard, a calendar that says October 2026, the
 * Producer at the window, and a door marked EXIT. Sam chooses: walk out of the door, or go back down to the town.
 */
const R = 2.6, PER = 30, RISE = 0.22;   // the helix: radius, steps to a turn, rise a step
const BASIC = new Map(), basic = (c) => { let m = BASIC.get(c); if (!m) BASIC.set(c, (m = new THREE.MeshBasicMaterial({ color: c }))); return m; };
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const bb = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(UNIT, typeof c === 'number' ? basic(c) : c); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); g.add(m); return m; };   // (unlit: the office is its own light, day or night)
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const CAMS = ['CAM 03 · SAM\'S BEDROOM', 'CAM 07 · HIGH STREET', 'CAM 09 · THE BEACH', 'CAM 12 · RED LION BAR', 'CAM 15 · SCHOOL GATE', 'CAM 21 · THE LIFT', 'CAM 24 · STOCKYARD', 'CAM 30 · BUS STOP', 'CAM 33 · CHIPPY'];
const STAFF = ['Scheduler', 'Weather desk', 'Continuity', 'Casting', 'Lift control', 'Script editor'];

export class Stairway {
  constructor(game) { this.game = game; this.built = new Map(); this.t = 1; this.office = null; this.staff = []; this.feeds = []; this.feedI = 0; this.feedT = 0; }
  towers() { return this.game.buildings.list.filter((b) => b.id === 'skyscraper' && b.state === 'done' && b.def.stairway); }
  /** How high the dome is over a point (where the stair has to reach). */
  domeY(x, z) { const A = this.game.atmosphere, d = A.dome, c = d.position, r0 = A.domeGeo.parameters.radius, r = Math.hypot(x - c.x, z - c.z); return c.y + d.scale.y * Math.sqrt(Math.max(0, r0 * r0 - r * r)); }
  geom(b) { const base = b.def.floors * WALL_H + 3.05, top = this.domeY(b.cx, b.cz) - 0.4, n = Math.max(10, Math.ceil((top - base) / RISE)); return { base, top, n }; }
  /** A point on the stair: step i (fractional), with the way up at that point. */
  at(b, i) { const { base } = this.geom(b), a = (i / PER) * Math.PI * 2; return { x: b.cx + Math.cos(a) * R, y: base + i * RISE, z: b.cz + Math.sin(a) * R, heading: Math.atan2(-Math.sin(a), Math.cos(a)), a }; }
  update(dt) {
    const g = this.game; if (!g.started) return;
    if ((this.t -= dt) <= 0) { this.t = 2; const T = this.towers(); for (const b of T) if (!this.built.has(b)) this.build(b); for (const [b, m] of this.built) if (!T.includes(b)) { g.scene.remove(m); this.built.delete(b); } }
    if (this.office && this.office.visible) this.renderFeeds(dt);
  }
  /** The stair itself: treads on a helix round a steel mast (one instanced draw), three lattice legs, and the hatch in the sky. */
  build(b) {
    const g = this.game, { base, top, n } = this.geom(b), grp = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.55, metalness: 0.45 });
    const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.07, 0.55), steel, n + 1), posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), steel, Math.ceil(n / 3) + 1), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= n; i++) { const p = this.at(b, i); Q.setFromAxisAngle(Y, -p.a); P.set(p.x, p.y, p.z); M.compose(P, Q, S); treads.setMatrixAt(i, M); if (i % 3 === 0) { P.set(b.cx + Math.cos(p.a) * (R + 0.72), p.y + 0.5, b.cz + Math.sin(p.a) * (R + 0.72)); M.compose(P, Q, S); posts.setMatrixAt(i / 3, M); } }
    treads.frustumCulled = posts.frustumCulled = false; grp.add(treads, posts);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, top - base, 10), steel); mast.position.set(b.cx, (top + base) / 2, b.cz); grp.add(mast);
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + 0.5, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, top - base, 6), steel); leg.position.set(b.cx + Math.cos(a) * (R + 1.05), (top + base) / 2, b.cz + Math.sin(a) * (R + 1.05)); grp.add(leg); }
    const end = this.at(b, n), hatch = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ color: 0xfff4d0, fog: false })); hatch.rotation.x = Math.PI / 2; hatch.position.set(end.x, top + 0.35, end.z); grp.add(hatch);   // a square of light in the sky
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 2.3), new THREE.MeshBasicMaterial({ color: 0x3a3e44 })); frame.position.set(end.x, top + 0.42, end.z); grp.add(frame);
    for (const m of grp.children) { m.castShadow = false; m.receiveShadow = false; }
    g.scene.add(grp); this.built.set(b, grp);
  }
  /** "E to climb", at the foot of Sam Tower once the stair is up. */
  targets(x, z) {
    const out = [];
    for (const b of this.towers()) { const d = Math.hypot(b.doorOut.x - x, b.doorOut.z - z); if (d < 3) out.push({ kind: 'act', text: 'Climb the Stairway to Heaven', act: () => this.climb(b), x: b.doorOut.x, z: b.doorOut.z, d: d - 0.5 }); }
    return out;
  }
  /** Up the stair: the camera keeps pace outside it, the town shrinking below, the sky closing in. */
  climb(b) {
    const g = this.game, P = g.player, { n } = this.geom(b), T = 19; let u = 0;
    // steady shots that only rise with Sam (he goes round about once a second: a camera chasing him would cut through the stair)
    const { base, top } = this.geom(b), side = Math.atan2(b.doorOut.x - b.cx, b.doorOut.z - b.cz), dir = (a, d, h) => [b.cx + Math.sin(side + a) * d, h, b.cz + Math.cos(side + a) * d], samY = () => this.at(b, u * n).y;
    const cams = [() => ({ pos: dir(0.5, 26, base + 6), look: [b.cx, samY() + 1, b.cz], fov: 50 }), () => ({ pos: dir(-0.4, 30, samY() + 6), look: [b.cx, samY() + 0.5, b.cz], fov: 46 }), () => ({ pos: dir(1.2, 16, samY() + 9), look: [b.cx, samY(), b.cz], fov: 55 }), () => ({ pos: dir(0.2, 9, top - 1.2), look: [b.cx, samY() - 1, b.cz], fov: 62 })];
    let si = 0; const shot = (text, title) => ({ dur: T / 4, snap: true, cut: true, cam: cams[si++], text, title });
    g.cutscene.play({ shots: [
      { ...shot('Out onto the roof of Sam Tower, and up.', 'The Stairway to Heaven'), at: () => { P.onCamera = true; } },
      shot('Past the clouds. The clouds are flat. Painted on something.'),
      shot('The sky gets closer. It isn\'t sky. It\'s a ceiling: panels, rivets, a seam.'),
      shot('A door. In the sky.'),
    ], tick: (dt) => {
      u = Math.min(1, u + dt / T); const p = this.at(b, u * n); P.x = p.x; P.z = p.z; P.floorY = p.y + 0.04; P.heading = p.heading; P.yaw = P.heading + Math.PI; P.speed = u < 1 ? 2.2 : 0; P.moved = u < 1;
      g.atmosphere.domeNear = Math.max(0, Math.min(1, (u - 0.55) / 0.4)); P.syncMesh(dt);
    }, onEnd: () => { P.speed = 0; P.moved = false; this.enter(b); } });
  }
  // ---------- the office above the sky ----------
  makeOffice() {
    const g = this.game, o = new THREE.Group(), c = g.clock, F = 0x4a5468, W = 0xd8d6cc, D = 0x6a5038;
    // floor (with the hatch in it), walls, ceiling and strip lights; a long window on the right
    bb(o, 18, 0.2, 9.4, F, 0, -0.2, -1.3); bb(o, 8.1, 0.2, 1.8, F, -4.95, -0.2, 4.2); bb(o, 8.1, 0.2, 1.8, F, 4.95, -0.2, 4.2); bb(o, 18, 0.2, 0.9, F, 0, -0.2, 5.55);
    for (const [x, z, w, d] of [[0, 3.3, 1.9, 0.05], [-0.95, 4.2, 0.05, 1.9], [0.95, 4.2, 0.05, 1.9]]) { bb(o, w, 0.05, d, 0xc8a020, x, 1.0, z); for (const s of [-1, 1]) bb(o, 0.05, 1.0, 0.05, 0xc8a020, x + (d > 1 ? 0 : s * w / 2.2), 0, z + (d > 1 ? s * d / 2.2 : 0)); }   // the rail round the hatch
    bb(o, 18, 3.4, 0.2, W, 0, 0, -6.1); bb(o, 0.2, 3.4, 12.4, W, -9.1, 0, 0); bb(o, 18, 3.4, 0.2, W, 0, 0, 6.1); bb(o, 0.2, 0.9, 12.4, W, 9.1, 0, 0); bb(o, 0.2, 0.4, 12.4, W, 9.1, 3.0, 0);
    for (const z of [-5.5, 5.5]) bb(o, 0.2, 2.1, 1.0, W, 9.1, 0.9, z);
    bb(o, 18.4, 0.15, 12.6, 0xeceae2, 0, 3.4, 0); for (const z of [-3.5, 0, 3.5]) for (const x of [-6, 0, 6]) bb(o, 2.4, 0.04, 0.35, 0xffffff, x, 3.36, z);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.1), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.18, depthWrite: false })); glass.rotation.y = -Math.PI / 2; glass.position.set(9.05, 1.95, 0); o.add(glass);
    // the wall of televisions: four by three, three of them live, ON AIR above
    const card = (label, i) => canvasTex(256, 192, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, ['#6a8ab8', '#5a7a5a', '#8a7a6a', '#4a5a7a'][i % 4]); gr.addColorStop(1, ['#3a5a3a', '#2a3a2a', '#5a4a3a', '#2a3a4a'][i % 4]); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 6; k++) x.fillRect(20 + k * 38, 90 + (k * 37) % 50, 26, 60); x.fillStyle = '#fff'; x.font = 'bold 15px monospace'; x.fillText(label, 10, 22); x.fillStyle = '#ff3a2a'; x.fillText('● REC', w - 70, h - 12); for (let y = 0; y < h; y += 3) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, y, w, 1); } });
    this.feeds = []; let k = 0;
    for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) {
      const x = -4.5 + q * 3, y = 0.55 + r * 0.95; bb(o, 1.25, 0.88, 0.7, 0x2a2c30, x, y, -5.6);
      const live = r === 1 && q !== 3 || (r === 2 && q === 1), mat = new THREE.MeshBasicMaterial({ map: live ? null : card(CAMS[k % CAMS.length], k), toneMapped: false }), scr = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.72), mat); scr.position.set(x, y + 0.44, -5.24); o.add(scr); k++;
      if (live) this.feeds.push({ mat, label: CAMS[k % CAMS.length] });
    }
    const onAir = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#8a0a0a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffdede'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText('ON AIR', w / 2, 46); }), oa = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: onAir })); oa.position.set(0, 3.1, -5.95); o.add(oa);
    // desks in two rows, a monitor (the schedule) and a keyboard on each, a chair
    const grid = canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#0a2a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#5aff8a'; x.font = '9px monospace'; ['06:30 MILK FLOAT', '08:10 BUS (EMPTY)', '10:00 TIMBER x20', '14:00 RAID BEACH', '15:30 ICE CREAM', '21:00 SAM: BED'].forEach((t, i) => x.fillText(t, 6, 14 + i * 13)); }), gm = new THREE.MeshBasicMaterial({ map: grid });
    this.desks = [];
    for (const z of [-2.6, 0.4]) for (const x of [-5.4, 0, 5.4]) {
      bb(o, 1.9, 0.06, 0.85, D, x, 0.72, z); for (const s of [-0.85, 0.85]) bb(o, 0.06, 0.72, 0.75, 0x3a3a3e, x + s, 0, z);
      bb(o, 0.55, 0.45, 0.5, 0xd8d0b8, x - 0.25, 0.78, z - 0.15); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), gm); m.position.set(x - 0.25, 1.01, z + 0.105); o.add(m);
      bb(o, 0.5, 0.03, 0.18, 0xe8e2d0, x - 0.25, 0.78, z + 0.25); bb(o, 0.09, 0.11, 0.09, 0xf4f4f4, x + 0.55, 0.78, z + 0.1);
      bb(o, 0.5, 0.08, 0.5, 0x2a2a30, x - 0.25, 0.45, z + 0.8); bb(o, 0.5, 0.55, 0.08, 0x2a2a30, x - 0.25, 0.5, z + 1.05); bb(o, 0.06, 0.45, 0.06, 0x555, x - 0.25, 0, z + 0.8);
      this.desks.push({ x: x - 0.25, z: z + 0.8 });
    }
    // the whiteboard (today's running order), the calendar, posters, the door marked EXIT
    const days = c.totalDays || 0, wb = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#f8f8f4'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a3a9a'; x.font = 'bold 26px sans-serif'; x.fillText(`SAM CITY 1995 · DAY ${days + 1}`, 18, 36); x.font = '20px sans-serif'; x.fillStyle = '#222'; ['06:30  milk float', '10:00  delivery (timber), Lift', '14:00  RAID at the beach: Sam gets the club', '15:30  ice-cream van', '21:00  Sam to bed: streetlights to dim'].forEach((t, i) => x.fillText(t, 22, 76 + i * 30)); x.fillStyle = '#c0201a'; x.font = 'bold 20px sans-serif'; x.fillText('NO MENTION OF: the weather, the Lift, 2026', 22, 238); });
    const wbm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: wb })); wbm.rotation.y = Math.PI / 2; wbm.position.set(-8.98, 1.75, -1.5); o.add(wbm);
    const cal = canvasTex(192, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#c0201a'; x.fillRect(0, 0, w, 56); x.fillStyle = '#fff'; x.font = 'bold 24px sans-serif'; x.textAlign = 'center'; x.fillText('OCTOBER', w / 2, 26); x.fillText('2026', w / 2, 50); x.fillStyle = '#333'; x.font = '14px sans-serif'; for (let d = 1; d <= 31; d++) { const q = (d + 2) % 7, r = Math.floor((d + 2) / 7); x.fillText(String(d), 16 + q * 26, 82 + r * 32); } });
    const calm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.06), new THREE.MeshBasicMaterial({ map: cal })); calm.rotation.y = Math.PI / 2; calm.position.set(-8.98, 1.6, 2.4); o.add(calm);
    const poster = (t1, t2, bg) => canvasTex(256, 360, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd23f'; x.font = 'bold 36px sans-serif'; x.textAlign = 'center'; x.fillText(t1, w / 2, 150); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.fillText(t2, w / 2, 200); });
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), new THREE.MeshBasicMaterial({ map: poster('SAM CITY', '31 YEARS ON AIR', '#1a2a5a') })); p1.position.set(3.5, 1.8, 5.98); p1.rotation.y = Math.PI; o.add(p1);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), new THREE.MeshBasicMaterial({ map: poster('REMEMBER', 'IT IS ALWAYS 1995', '#5a1a1a') })); p2.position.set(6, 1.8, 5.98); p2.rotation.y = Math.PI; o.add(p2);
    bb(o, 1.2, 2.3, 0.12, 0x8a8f96, -6, 0, 5.98); const ex = canvasTex(128, 48, (x, w, h) => { x.fillStyle = '#0a8a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'bold 32px sans-serif'; x.textAlign = 'center'; x.fillText('EXIT', w / 2, 36); }), exm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: ex, toneMapped: false })); exm.position.set(-6, 2.6, 5.9); exm.rotation.y = Math.PI; o.add(exm);
    this.exitAt = { x: -6, z: 5.6 };
    mergeByMaterial(o); o.visible = false; g.scene.add(o); this.office = o;
    // the live feeds: three little cameras over the town
    const L = g.lift, home = g.starterHome || L, pub = g.buildings.list.find((q) => q.id === 'tavern' && q.state === 'done') || home;
    this.cams = [[home.cx + 9, 6, home.cz + 9, home.cx, 1.5, home.cz], [pub.cx - 10, 5, pub.cz + 8, pub.cx, 1.5, pub.cz], [L.cx + 12, 7, L.cz + 10, L.cx, 1, L.cz]].map(([x, y, z, tx, ty, tz]) => { const cm = new THREE.PerspectiveCamera(50, 4 / 3, 0.5, 260); cm.position.set(x, y, z); cm.lookAt(tx, ty, tz); return cm; });
    this.rts = this.cams.map(() => new THREE.WebGLRenderTarget(256, 192)); this.feeds.forEach((f, i) => { f.mat.map = this.rts[i % this.rts.length].texture; f.mat.needsUpdate = true; });
  }
  /** One feed a frame, a few times a second (only while the office is up). */
  renderFeeds(dt) {
    if ((this.feedT -= dt) > 0 || !this.rts) return; this.feedT = 0.12; const g = this.game, r = g.renderer, i = this.feedI++ % this.rts.length, prev = r.getRenderTarget();
    this.office.visible = false; for (const s of this.staff) s.mesh.visible = false;
    const au = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false; r.setRenderTarget(this.rts[i]); r.render(g.scene, this.cams[i]); r.setRenderTarget(prev); r.shadowMap.autoUpdate = au;   // (the shadows are already drawn for this frame)
    this.office.visible = true; for (const s of this.staff) s.mesh.visible = true;
  }
  /** Through the hatch: the office, the staff, the Producer, and the choice. */
  enter(b) {
    const g = this.game, P = g.player, { top, n } = this.geom(b), end = this.at(b, n); if (!this.office) this.makeOffice();
    const o = this.office, y0 = top + 0.5; o.position.set(end.x, y0, end.z - 4.2); o.visible = true; o.updateMatrixWorld(true);
    const W = (lx, ly, lz) => [o.position.x + lx, y0 + ly, o.position.z + lz];
    // the staff at their desks, headsets on; the Producer at the window
    this.clearStaff(); const pop = g.population;
    const mk = (name, look, x, z, h, title) => { const p = pop.makePerson({ kind: 'visitor', gender: look.gender || (Math.random() < 0.5 ? 'm' : 'f') }); const s = pop.spawnAt(o.position.x + x, o.position.z + z, { name: name || p.name, first: p.first, surname: p.surname, kind: 'guest', trait: 'busy', look: { ...p.look, ...look }, gender: p.gender, age: p.age }); s.rideY = y0; s.heading = s.faceGoal = h; s.path = []; s.jobTitle = title; this.staff.push(s); return s; };
    this.desks.forEach((d, i) => { const s = mk(null, { hat: { type: 'phones' }, shirt: pick([0xd8d8e8, 0x8aa0c0, 0xe8d8c8, 0x5a6a8a]), longSleeve: true, dialect: null }, d.x, d.z, Math.PI, STAFF[i % STAFF.length]); s.deskSit = true; s.crewPose = 'type'; });
    const boss = mk('The Producer', { gender: 'm', shirt: 0x1a1a1c, longSleeve: true, pants: 0x2a2a30, glasses: true, hair: 0xb8b8b8, hairStyle: 'short', hat: null, facial: null, dialect: null }, 7.6, -1, Math.PI / 2, 'Executive producer');
    const lead = this.staff[0], ans = {}; let leave = false;
    P.x = end.x; P.z = end.z; P.floorY = y0; P.heading = Math.PI; P.yaw = 0; P.onCamera = true; g.atmosphere.domeNear = 0;
    const look = (s, k = 1.55) => [s.x, y0 + k, s.z];
    const REPLY = { place: '"The control room. Sam City is a television programme, Sam. The longest-running in the world. You\'ve been on every night since 1995."', year: '"It\'s October 2026. Out there it\'s 2026. In here it\'s always 1995. People like it in here. So, I think, do you."', why: '"Because you were real. Everybody else is acting. Thirty million people a night watch you build a town with your own hands."' };
    g.cutscene.play({ shots: [
      { dur: 5.5, snap: true, cam: (t) => ({ pos: W(-3.2, 2.6, 0.5 + t * 0.1), look: [P.x, y0 + 1.2, P.z], fov: 55 }), title: 'The office above the sky', text: 'Rows of desks. Headsets. A wall of televisions, and every one of them is Sam City.' },
      { dur: 4, cut: true, cam: () => ({ pos: W(lead.x - o.position.x + 1.6, 1.7, lead.z - o.position.z + 2.2), look: look(lead, 1.2), fov: 45 }), say: [lead.jobTitle, '"Er... is he meant to be up here?"'], at: () => { lead.crewPose = null; lead.emote = { upper: 'shrug', t: 3 }; } },
      { dur: 5, cut: true, cam: () => ({ pos: W(2.4, 2.1, -3.6), look: W(-0.5, 1.4, -6), fov: 55 }), say: ['Sam', '"That\'s my house. That\'s the Red Lion. That\'s... me."'] },
      { dur: 5, cut: true, cam: () => ({ pos: W(3.8, 1.7, 1.6), look: look(boss), fov: 40 }), say: ['The Producer', '"Hello, Sam. We wondered when you\'d find the stairs."'], at: () => { boss.heading = boss.faceGoal = Math.atan2(P.x - boss.x, P.z - boss.z); boss.eyeOn = P; } },
      { dur: 6, cut: true, cam: () => ({ pos: W(3.8, 1.7, 1.6), look: look(boss), fov: 40 }), ask: { who: 'Sam', q: 'What do you say to him?', opts: [{ t: 'What is this place?', on: () => { ans.k = 'place'; } }, { t: 'What year is it?', on: () => { ans.k = 'year'; } }, { t: 'Why me?', on: () => { ans.k = 'why'; } }] } },
      { dur: 6.5, cut: true, cam: () => ({ pos: W(5.2, 1.65, 0.6), look: look(boss), fov: 36 }), say: () => ['The Producer', REPLY[ans.k || 'place']] },
      { dur: 5, cut: true, cam: () => ({ pos: W(-2.5, 1.7, 2.5), look: W(-6, 1.6, 6), fov: 45 }), say: ['The Producer', '"There\'s a door behind you, Sam. It says EXIT. It isn\'t locked. It was never locked."'] },
      { dur: 6, cut: true, cam: () => ({ pos: W(1.5, 1.7, 3.6), look: look(boss, 1.4), fov: 45 }), ask: { who: 'Sam', q: 'The door marked EXIT, or the stairs back down to Sam City?', opts: [{ t: 'Walk out through the door marked EXIT.', on: () => { leave = true; } }, { t: 'Go back down to Sam City.', on: () => { leave = false; } }], def: 1 } },
      { dur: 5, cut: true, cam: () => ({ pos: W(3.8, 1.7, 1.6), look: look(boss), fov: 40 }), say: () => ['The Producer', leave ? '"Goodbye, Sam. Good luck out there. Take an umbrella."' : '"We\'ll be watching. We always are." (Somebody at the back starts to clap.)'], at: () => { if (!leave) for (const s of this.staff) if (s !== boss) { s.crewPose = null; s.emote = { upper: 'clap', t: 5 }; } } },
    ], tick: (dt) => { P.speed = 0; P.moved = false; P.syncMesh(dt); for (const s of this.staff) { s.path = []; s.rideY = y0; } },
      onEnd: () => { P.onCamera = false; boss.eyeOn = null; this.leave(b, leave); } });
  }
  clearStaff() { for (const s of this.staff) s.remove = true; this.staff = []; }
  leave(b, out) {
    const g = this.game, P = g.player; this.clearStaff(); if (this.office) this.office.visible = false; P.floorY = 0; g.atmosphere.domeNear = 0;
    if (out) { g.escape('stairs'); return; }
    P.teleport(b.doorOut.x, b.doorOut.z); g.flags.stayed = true; g.flags.stayedDay = g.clock.totalDays; g.story.setStage(5);
    g.messages.push('Sam (thought)', 'Back down the stairs. The town looks just the same. It isn\'t.', 'story');
  }
}
