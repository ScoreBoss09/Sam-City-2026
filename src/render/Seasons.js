import * as THREE from 'three';
import { allRoofMaterials } from './Textures.js';

/**
 * The year turns: spring blossom (Mar-Apr), green summers, golden autumns (Sep-Nov) and snowy winters (Dec-Feb).
 * Everything eases in over a few seconds when the month changes.
 */
const SNOW = [1, 0.8, 0.1, 0, 0, 0, 0, 0, 0, 0, 0.15, 0.7], AUTUMN = [0, 0, 0, 0, 0, 0, 0, 0.1, 0.45, 1, 0.75, 0.1], BLOSSOM = [0, 0, 0.6, 1, 0.3, 0, 0, 0, 0, 0, 0, 0];
const lerpC = (a, b, t) => a.clone().lerp(b, t);
export class Seasons {
  constructor(game) {
    this.game = game; this.snow = -1; this.autumn = -1; this.blossom = -1;
    // a patchy snow blanket just above the ground
    // soft drifts: smooth value noise (a small random grid scaled up with smoothing), white with patchy alpha
    const sm = document.createElement('canvas'); sm.width = sm.height = 32; const sx = sm.getContext('2d'), sd = sx.createImageData(32, 32);
    for (let i = 0; i < 32 * 32; i++) { const v = 150 + Math.random() * 105; sd.data[i * 4] = sd.data[i * 4 + 1] = sd.data[i * 4 + 2] = v; sd.data[i * 4 + 3] = 255; }
    sx.putImageData(sd, 0, 0);
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(sm, 0, 0, 256, 256); x.drawImage(sm, 0, 0, 512, 512);
    const d = x.getImageData(0, 0, 256, 256);
    for (let i = 0; i < 256 * 256; i++) { const n = d.data[i * 4] / 255, a = Math.max(0, Math.min(1, (n - 0.5) * 3.2 + 0.55)); d.data[i * 4] = 238; d.data[i * 4 + 1] = 243; d.data[i * 4 + 2] = 250; d.data[i * 4 + 3] = a * 255; }
    x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10);
    const g = game.terrain.ground; this.blanket = new THREE.Mesh(g.geometry, new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.blanket.rotation.copy(g.rotation); this.blanket.position.copy(g.position); this.blanket.position.y += 0.03; this.blanket.receiveShadow = true; this.blanket.renderOrder = 1; this.blanket.visible = false; game.scene.add(this.blanket);
    // drifting leaves (autumn) or petals (spring) around Sam
    this.drift = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 60); this.drift.frustumCulled = false; this.drift.visible = false; game.scene.add(this.drift);
    this.dp = Array.from({ length: 60 }, () => ({ x: 0, y: -9, z: 0, ph: Math.random() * 6, v: 0.5 + Math.random() * 0.6 })); for (let i = 0; i < 60; i++) this.drift.setColorAt(i, new THREE.Color(0xffffff));
    // snowmen the children build, Christmas lights and a tree in December
    this.snowmen = []; this.snowT = 20; this.xmas = null; this.xmasN = -1; this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v3 = new THREE.Vector3(); this.e = new THREE.Euler();
    this.tint = { leaf: new THREE.Color(1, 1, 1), autumn: new THREE.Color().setRGB(2.1, 0.95, 0.32), winter: new THREE.Color(0xd8dde2), spring: new THREE.Color(0xffd6e2), grassAut: new THREE.Color().setRGB(1.5, 1.1, 0.45), grassWin: new THREE.Color(0xe8eef2) };
  }
  updateDrift(dt) {
    const g = this.game, on = g.mode === 'sim' && (this.autumn > 0.4 || this.blossom > 0.4) && g.started; this.drift.visible = on; if (!on) return;
    const p = g.player, t = g.elapsed, aut = this.autumn > this.blossom, cols = aut ? [0xd9762a, 0xc0452a, 0xe8b53a, 0x9a5a2a] : [0xffc6d9, 0xfff0f4, 0xf7a8c4];
    for (let i = 0; i < this.dp.length; i++) {
      const d = this.dp[i];
      if (d.y < 0 || Math.hypot(d.x - p.x, d.z - p.z) > 16) { d.x = p.x + (Math.random() - 0.5) * 26; d.z = p.z + (Math.random() - 0.5) * 26; d.y = 4 + Math.random() * 6; this.drift.setColorAt(i, new THREE.Color(cols[i % cols.length])); this.drift.instanceColor.needsUpdate = true; }
      d.y -= d.v * dt; d.x += Math.sin(t * 1.3 + d.ph) * dt * 0.9 + dt * 0.4; d.z += Math.cos(t * 0.9 + d.ph) * dt * 0.5;
      this.e.set(t * 2 + d.ph, t * 1.4 + d.ph, 0); this.q.setFromEuler(this.e); this.m4.compose(this.v3.set(d.x, Math.max(0.03, d.y), d.z), this.q, new THREE.Vector3(1, 1, 1)); this.drift.setMatrixAt(i, this.m4);
    }
    this.drift.instanceMatrix.needsUpdate = true;
  }
  makeSnowman() {
    const grp = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.9 }), blk = new THREE.MeshStandardMaterial({ color: 0x1a1a1a }), car = new THREE.MeshStandardMaterial({ color: 0xff7a1a }), sc = new THREE.MeshStandardMaterial({ color: [0xc0392b, 0x2a6aa8, 0x3a8a4a][Math.floor(Math.random() * 3)] });
    for (const [r, y] of [[0.42, 0.38], [0.3, 0.98], [0.22, 1.42]]) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), w); m.position.y = y; m.castShadow = true; grp.add(m); }
    for (const x of [-0.08, 0.08]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), blk); e.position.set(x, 1.48, 0.19); grp.add(e); }
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 5), car); n.rotation.x = Math.PI / 2; n.position.set(0, 1.42, 0.3); grp.add(n);
    const s = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 4, 10), sc); s.rotation.x = Math.PI / 2; s.position.y = 1.22; grp.add(s);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 8), blk); hat.position.y = 1.7; grp.add(hat);
    for (const sd of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })); arm.position.set(sd * 0.48, 1.05, 0); arm.rotation.z = sd * 0.5; grp.add(arm); }
    return grp;
  }
  updateSnowmen(dt) {
    const g = this.game;
    if (this.snow < 0.25) { for (const m of this.snowmen) g.scene.remove(m.mesh); this.snowmen = []; return; }   // the thaw
    if (this.snow < 0.6 || this.snowmen.length >= 8) return; this.snowT -= dt * Math.max(0.2, g.clock.speed); if (this.snowT > 0) return; this.snowT = 25 + Math.random() * 30;
    const kids = g.population.sims.filter((s) => (s.kind === 'child' || (s.kind === 'resident' && Math.random() < 0.3)) && (!s.inside || s.inside.def.open || s.inside.def.park) && !s.hidden && !s.sitting && s.pose !== 'sleep' && !s.chat);
    let k = kids.length ? kids[Math.floor(Math.random() * kids.length)] : null, x, z;
    if (k) { const a = Math.random() * 6.28; x = k.x + Math.cos(a) * 1.4; z = k.z + Math.sin(a) * 1.4; }
    else {   // nobody about: one appears in a front garden, as if built while we weren't looking
      const homes = g.buildings.list.filter((b) => b.state === 'done' && b.def.cat === 'res'); if (!homes.length) return; const h = homes[Math.floor(Math.random() * homes.length)], side = Math.random() < 0.5 ? -1 : 1;
      [x, z] = h.toWorld(side * (h.def.w * 2 - 0.8), h.def.d * 2 + 1.0);
    }
    if (g.world.collides(x, z, 0.5) || this.snowmen.some((q) => Math.hypot(q.x - x, q.z - z) < 3)) return;
    const mesh = this.makeSnowman(); mesh.position.set(x, 0, z); mesh.rotation.y = k ? Math.atan2(k.x - x, k.z - z) : Math.random() * 6.28; g.scene.add(mesh); this.snowmen.push({ mesh, x, z });
    if (!k) return;
    k.emote = { upper: 'cheer', t: 2.4 }; k.faceGoal = Math.atan2(x - k.x, z - k.z); if (k.mesh.visible) g.social.say(k, ['Look! A snowman!', 'I made him a scarf!', 'His name is Gary.', 'Do you wanna build a snowman? Done it.'][Math.floor(Math.random() * 4)], 2.6);
    if (g.particles) g.particles.burst(x, 0.6, z, 0xffffff, 10, 1.2, 2.5, 0.12);
  }
  /** December: fairy lights along the front of every home and a big tree by the campfire / plaza. */
  updateXmas(dt) {
    const g = this.game, on = g.clock.month === 11 && g.started;
    if (!on) { if (this.xmas) { g.scene.remove(this.xmas.group); this.xmas = null; this.xmasN = -1; } return; }
    const homes = g.buildings.list.filter((b) => b.state === 'done' && (b.def.cat === 'res' || b.def.shopping || b.def.dining) && !b.def.park);
    if (!this.xmas || homes.length !== this.xmasN) {
      if (this.xmas) g.scene.remove(this.xmas.group); this.xmasN = homes.length; const group = new THREE.Group(), pts = [];
      for (const b of homes) { const W = b.def.w * 4, D = b.def.d * 4, y = (b.def.floors || 1) * 3.2 - 0.12; for (let lx = -W / 2 + 0.2; lx <= W / 2 - 0.2; lx += 0.45) { const [x, z] = b.toWorld(lx, D / 2 + 0.2); pts.push([x, y - Math.abs(Math.sin(lx * 1.7)) * 0.18, z]); } }
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, pts.length)); im.count = pts.length; im.frustumCulled = false;
      pts.forEach((p, i) => { this.m4.makeTranslation(p[0], p[1], p[2]); im.setMatrixAt(i, this.m4); im.setColorAt(i, new THREE.Color([0xff3030, 0x30ff60, 0x3080ff, 0xffd030][i % 4])); }); group.add(im);
      const site = g.buildings.list.find((b) => b.state === 'done' && (b.def.park === 'plaza' || b.def.park === 'camp' || b.id === 'townhall'));
      if (site) { const tree = new THREE.Group(), [tx, tz] = site.def.park === 'camp' ? site.toWorld(3.2, 3.2) : site.toWorld(site.def.w * 2 - 1.2, site.def.d * 2 - 1.2); tree.position.set(tx, 0, tz);
        for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.6 - i * 0.35, 1.6, 7), new THREE.MeshStandardMaterial({ color: 0x1f5a2a, flatShading: true })); c.position.y = 1.1 + i * 0.9; c.castShadow = true; tree.add(c); }
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0xffe040 })); star.position.y = 4.9; tree.add(star);
        for (let i = 0; i < 24; i++) { const a = i * 2.4, h = 0.8 + (i / 24) * 3.2, r = 1.5 - (h - 0.8) * 0.38; const bl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: [0xff3030, 0xffd030, 0x3080ff, 0xffffff][i % 4] })); bl.position.set(Math.cos(a) * r, h, Math.sin(a) * r); tree.add(bl); }
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })); trunk.position.y = 0.3; tree.add(trunk); group.add(tree); }
      g.scene.add(group); this.xmas = { group, im, n: pts.length, t: 0 };
    }
    // twinkle
    const X = this.xmas; X.t += dt; if (X.t > 0.6 && X.n) { X.t = 0; const cols = [0xff3030, 0x30ff60, 0x3080ff, 0xffd030], c = new THREE.Color(); for (let i = 0; i < X.n; i++) X.im.setColorAt(i, Math.random() < 0.15 ? c.setHex(0x333333) : c.setHex(cols[(i + Math.floor(g.elapsed * 2)) % 4])); X.im.instanceColor.needsUpdate = true; X.group.visible = true; }
  }
  paintRoofs() {
    const day = this.game.atmosphere ? (this.game.atmosphere.dayLevel ?? 1) : 1, k = (this.roofSnow || 0) * (0.2 + 0.45 * day);
    for (const m of allRoofMaterials()) { if (!m.emissive) continue; m.emissive.setRGB(0.82, 0.86, 0.9); m.emissiveIntensity = k; }
  }
  get season() { const m = this.game.clock.month; return m <= 1 || m === 11 ? 'Winter' : m <= 4 ? 'Spring' : m <= 7 ? 'Summer' : 'Autumn'; }
  update(dt) {
    const g = this.game, m = g.clock.month, k = Math.min(1, dt * 0.4);
    const ts = SNOW[m], ta = AUTUMN[m], tb = BLOSSOM[m];
    if (this.snow < 0) { this.snow = ts; this.autumn = ta; this.blossom = tb; this.apply(); return; }
    const ns = this.snow + (ts - this.snow) * k, na = this.autumn + (ta - this.autumn) * k, nb = this.blossom + (tb - this.blossom) * k;
    if (Math.abs(ns - this.snow) + Math.abs(na - this.autumn) + Math.abs(nb - this.blossom) > 0.004) { this.snow = ns; this.autumn = na; this.blossom = nb; this.apply(); }
    if (g.weather) g.weather.snowy = this.snow > 0.45;
    this.updateDrift(dt); this.updateSnowmen(dt); this.updateXmas(dt);
    if (this.snow > 0.02 && (this.roofT = (this.roofT || 0) + dt) > 1) { this.roofT = 0; this.paintRoofs(); }   // follow day and night
  }
  apply() {
    const g = this.game, T = this.tint, s = this.snow, a = this.autumn, b = this.blossom;
    this.blanket.visible = s > 0.02; this.blanket.material.opacity = Math.min(0.92, s * 0.95);
    // snow on the roofs (an even white glaze that fades at night)
    this.roofSnow = s; this.paintRoofs();
    // forest pines: frosted in winter, a touch darker in autumn
    const tr = g.terrain, f = tr.foliage;
    if (f && f.instanceColor) {
      if (this.baseFor !== f || this.base.length !== f.instanceColor.array.length) { this.base = Float32Array.from(f.instanceColor.array); this.baseFor = f; }
      const arr = f.instanceColor.array, frost = 0.55 * s, dark = 1 - 0.12 * a;
      for (let i = 0; i < arr.length; i += 3) { arr[i] = (this.base[i] * dark) * (1 - frost) + 0.9 * frost; arr[i + 1] = (this.base[i + 1] * dark) * (1 - frost) + 0.93 * frost; arr[i + 2] = (this.base[i + 2] * dark) * (1 - frost) + 0.97 * frost; }
      f.instanceColor.needsUpdate = true;
    }
    // broadleaf street and park trees, bushes, grass tufts
    const d = g.decor; if (d) {
      let leaf = lerpC(T.leaf, T.autumn, a); leaf = lerpC(leaf, T.spring, b * 0.8); leaf = lerpC(leaf, T.winter, s);
      if (d.crown) d.crown.material.color.copy(leaf); if (d.bush) d.bush.material.color.copy(lerpC(lerpC(T.leaf, T.autumn, a * 0.6), T.winter, s * 0.8));
      if (d.tufts) d.tufts.material.color.copy(lerpC(lerpC(T.leaf, T.grassAut, a * 0.7), T.grassWin, s));
    }
  }
}
