import * as THREE from 'three';
import { MAP, TILE } from '../config.js';
import { setWindowGlow } from './Textures.js';
import { mulberry32 } from '../util.js';

const lerp = (a, b, t) => a + (b - a) * t;
const C = (h) => new THREE.Color(h);

/** Sun, sky, night glow and the secret dome. */
export class Atmosphere {
  constructor(scene, renderer) {
    this.scene = scene; const size = MAP * TILE;
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x55664a, 0.7); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe8c0, 2.4); this.sun.castShadow = true;
    const s = this.sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = -70; s.camera.right = 70; s.camera.top = 70; s.camera.bottom = -70; s.camera.near = 1; s.camera.far = 260; s.bias = -0.0004; s.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    scene.fog = new THREE.Fog(0x9ec9ee, 220, 520); scene.background = new THREE.Color(0x9ec9ee);
    this.domeGeo = new THREE.SphereGeometry(165, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    this.dome = new THREE.Mesh(this.domeGeo, new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.wire = new THREE.Mesh(this.domeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.dome.position.set(size / 2, -2, size / 2); this.wire.position.copy(this.dome.position); this.dome.renderOrder = 3; this.wire.renderOrder = 4; scene.add(this.dome, this.wire);
    this.night = 0;
    // moving cloud shadows over the island
    const rnd = mulberry32(5), c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), img = x.createImageData(128, 128);
    const h = (i, j) => { const s2 = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s2 - Math.floor(s2); }, vn = (px, py, sc) => { const gx = px / sc, gy = py / sc, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy, a = h(ix % (128 / sc), iy % (128 / sc)), b = h((ix + 1) % (128 / sc), iy % (128 / sc)), cc = h(ix % (128 / sc), (iy + 1) % (128 / sc)), d = h((ix + 1) % (128 / sc), (iy + 1) % (128 / sc)), u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v; };
    for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const n = vn(i, j, 32) * 0.65 + vn(i, j, 16) * 0.35, a = Math.max(0, Math.min(1, (n - 0.5) * 4.5)); const o = (j * 128 + i) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = a * 255; img.data[o + 3] = 255; }
    x.putImageData(img, 0, 0); const ct = new THREE.CanvasTexture(c); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(2, 2); ct.magFilter = THREE.LinearFilter;
    this.cloudShadow = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.6, size * 1.6), new THREE.MeshBasicMaterial({ color: 0x0b1530, alphaMap: ct, transparent: true, opacity: 0.2, depthWrite: false }));
    this.cloudShadow.rotation.x = -Math.PI / 2; this.cloudShadow.position.set(size / 2, 0.09, size / 2); this.cloudShadow.renderOrder = 1; scene.add(this.cloudShadow); this.cloudTex = ct;
    // billboard clouds (only visible from the ground view)
    const cc2 = document.createElement('canvas'); cc2.width = 128; cc2.height = 64; const cx = cc2.getContext('2d');
    for (let i = 0; i < 9; i++) { const px = 22 + i * 10 + rnd() * 6, py = 38 - Math.sin(i / 8 * Math.PI) * 14 + rnd() * 6, r = 14 + rnd() * 9; const gr = cx.createRadialGradient(px, py, 2, px, py, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 64); }
    const cloudTex = new THREE.CanvasTexture(cc2); this.clouds = new THREE.Group(); this.cloudMats = [];
    for (let i = 0; i < 16; i++) { const m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.85, fog: false }); const sp = new THREE.Sprite(m); const a = rnd() * 6.28, r = 90 + rnd() * 220; sp.position.set(size / 2 + Math.cos(a) * r, 70 + rnd() * 50, size / 2 + Math.sin(a) * r); const sc = 70 + rnd() * 60; sp.scale.set(sc, sc / 2, 1); sp.userData = { a, r, sp: 0.004 + rnd() * 0.006 }; this.clouds.add(sp); this.cloudMats.push(m); }
    scene.add(this.clouds);
  }
  update(dt, clock, focus, story, glitch) {
    const h = clock.hour;
    const day = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));        // 0 at night, 1 at noon
    this.dayLevel = day;
    const dusk = Math.max(0, 1 - Math.abs(h - 6.3) / 1.3) + Math.max(0, 1 - Math.abs(h - 18.2) / 1.5);
    this.night += ((day < 0.12 ? 1 : 0) - this.night) * Math.min(1, dt * 1.5);
    const ang = ((h - 6) / 12) * Math.PI, el = Math.max(0.12, Math.sin(ang));
    const dir = new THREE.Vector3(Math.cos(ang) * 0.9, el, 0.45).normalize();
    this.sun.position.set(focus.x + dir.x * 120, dir.y * 120, focus.z + dir.z * 120); this.sun.target.position.set(focus.x, 0, focus.z);
    const rain = this.rain || 0; this.sun.intensity = lerp(0.65, 2.4, day) * (1 - rain * 0.6);
    this.sun.color.copy(C(0xfff1d6)).lerp(C(0xff9a55), Math.min(1, dusk * 0.8)).lerp(C(0x8fa6ea), this.night);
    this.hemi.intensity = lerp(0.62, 0.8, day); this.hemi.color.copy(C(0xcfe6ff)).lerp(C(0x5a73b8), this.night); this.hemi.groundColor.copy(C(0x55664a)).lerp(C(0x2c3c60), this.night);
    const sky = C(0x9ec9ee).lerp(C(0xf0a070), Math.min(1, dusk * 0.7)).lerp(C(0x7d8794), rain * 0.75).lerp(C(0x111d40), this.night);
    this.scene.background.copy(sky); this.scene.fog.color.copy(sky); this.scene.fog.near = lerp(220, 60, rain); this.scene.fog.far = lerp(520, 260, rain);
    setWindowGlow(Math.min(1, this.night + Math.min(0.6, dusk * 0.5)));
    // clouds & their shadows
    this.cloudTex.offset.x += dt * 0.0025; this.cloudTex.offset.y += dt * 0.0012; this.cloudShadow.material.opacity = (0.2 + rain * 0.25) * day * (1 - this.night);
    const lowView = focus.y !== undefined ? false : true; const size = MAP * TILE;
    for (const sp of this.clouds.children) { sp.userData.a += dt * sp.userData.sp * 0.1; sp.position.x = size / 2 + Math.cos(sp.userData.a) * sp.userData.r; sp.position.z = size / 2 + Math.sin(sp.userData.a) * sp.userData.r; }
    for (const m of this.cloudMats) m.color.copy(C(0xffffff)).lerp(C(0xf0a070), Math.min(1, dusk * 0.6)).lerp(C(0x1a2340), this.night); this.clouds.visible = !this.hideDome;
    // dome
    const a = story.domeAlpha, flick = glitch > 0 ? (Math.random() > 0.5 ? 0.4 : 0) : 0;
    this.dome.material.opacity = a * (0.012 + this.night * 0.015); this.wire.material.opacity = a * (0.008 + this.night * 0.03);
    this.dome.visible = this.wire.visible = a > 0.01 && !this.hideDome;
  }
}
