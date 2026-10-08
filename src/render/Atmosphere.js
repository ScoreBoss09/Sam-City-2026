import * as THREE from 'three';
import { MAP, TILE } from '../config.js';
import { setWindowGlow } from './Textures.js';

const lerp = (a, b, t) => a + (b - a) * t;
const C = (h) => new THREE.Color(h);

/** Sun, sky, night glow and the secret dome. */
export class Atmosphere {
  constructor(scene, renderer) {
    this.scene = scene; const size = MAP * TILE;
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x55664a, 0.7); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.0); this.sun.castShadow = true;
    const s = this.sun.shadow; s.mapSize.set(2048, 2048); s.camera.left = -70; s.camera.right = 70; s.camera.top = 70; s.camera.bottom = -70; s.camera.near = 1; s.camera.far = 260; s.bias = -0.0004; s.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    scene.fog = new THREE.Fog(0x9ec9ee, 220, 520); scene.background = new THREE.Color(0x9ec9ee);
    this.domeGeo = new THREE.SphereGeometry(165, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    this.dome = new THREE.Mesh(this.domeGeo, new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.wire = new THREE.Mesh(this.domeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.dome.position.set(size / 2, -2, size / 2); this.wire.position.copy(this.dome.position); this.dome.renderOrder = 3; this.wire.renderOrder = 4; scene.add(this.dome, this.wire);
    this.night = 0;
  }
  update(dt, clock, focus, story, glitch) {
    const h = clock.hour;
    const day = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));        // 0 at night, 1 at noon
    const dusk = Math.max(0, 1 - Math.abs(h - 6.3) / 1.3) + Math.max(0, 1 - Math.abs(h - 18.2) / 1.5);
    this.night += ((day < 0.12 ? 1 : 0) - this.night) * Math.min(1, dt * 1.5);
    const ang = ((h - 6) / 12) * Math.PI, el = Math.max(0.12, Math.sin(ang));
    const dir = new THREE.Vector3(Math.cos(ang) * 0.9, el, 0.45).normalize();
    this.sun.position.set(focus.x + dir.x * 120, dir.y * 120, focus.z + dir.z * 120); this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.intensity = lerp(0.18, 2.2, day) * (1 - this.night * 0.5);
    this.sun.color.copy(C(0xfff1d6)).lerp(C(0xff9a55), Math.min(1, dusk * 0.8)).lerp(C(0x6d85c9), this.night);
    this.hemi.intensity = lerp(0.32, 0.8, day); this.hemi.color.copy(C(0xcfe6ff)).lerp(C(0x4a5f9a), this.night); this.hemi.groundColor.copy(C(0x55664a)).lerp(C(0x1c2438), this.night);
    const sky = C(0x9ec9ee).lerp(C(0xf0a070), Math.min(1, dusk * 0.7)).lerp(C(0x0b1228), this.night);
    this.scene.background.copy(sky); this.scene.fog.color.copy(sky);
    setWindowGlow(Math.min(1, this.night + Math.min(0.6, dusk * 0.5)));
    // dome
    const a = story.domeAlpha, flick = glitch > 0 ? (Math.random() > 0.5 ? 0.4 : 0) : 0;
    this.dome.material.opacity = a * (0.06 + this.night * 0.05) + flick * 0.2; this.wire.material.opacity = a * (0.10 + this.night * 0.12) + flick * 0.5;
    this.dome.visible = this.wire.visible = a > 0.01;
  }
}
