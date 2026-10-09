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
    this.tint = { leaf: new THREE.Color(1, 1, 1), autumn: new THREE.Color().setRGB(2.1, 0.95, 0.32), winter: new THREE.Color(0xd8dde2), spring: new THREE.Color(0xffd6e2), grassAut: new THREE.Color().setRGB(1.5, 1.1, 0.45), grassWin: new THREE.Color(0xe8eef2) };
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
