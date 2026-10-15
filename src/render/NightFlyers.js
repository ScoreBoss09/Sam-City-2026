import * as THREE from 'three';
import { nearestPerch } from './Perch.js';
import { Sfx } from '../core/Sfx.js';

/**
 * After dark. Bats flicker about round the trees and the street lamps near you, jinking every second or so; an owl or
 * two sits up on a ridge, hoots now and then, and very occasionally drops onto a mouse in the grass and carries it off.
 */
const NB = 14;
export class NightFlyers {
  constructor(game) {
    this.game = game; this.t = 0; const sc = game.scene;
    // bats: one instanced draw, a body and two wings (the wings beat by squashing in and out)
    const v = [0, 0, 0.09, 0, 0, -0.08, -0.32, 0.02, 0.02, 0, 0, 0.09, 0.32, 0.02, 0.02, 0, 0, -0.08, -0.32, 0.02, 0.02, -0.18, 0, -0.1, 0, 0, -0.08, 0.32, 0.02, 0.02, 0, 0, -0.08, 0.18, 0, -0.1];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
    this.bats = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x15131a, side: THREE.DoubleSide }), NB); this.bats.frustumCulled = false; this.bats.visible = false; sc.add(this.bats);
    this.bat = Array.from({ length: NB }, (_, i) => ({ x: 0, y: 4, z: 0, h: Math.random() * 6.28, jink: 0, ph: Math.random() * 6, cx: 0, cz: 0, placed: false, k: i }));
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.p3 = new THREE.Vector3(); this.s3 = new THREE.Vector3();
    // owls: a round tawny body, a face disc, big eyes that catch the light, wings that open to swoop
    this.owls = [0, 1].map(() => this.makeOwl(sc)); this.mouse = null;
  }
  makeOwl(sc) {
    const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o }), bx = (p, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
    const brown = M(0x7a5a3a), pale = M(0xd8c4a0); bx(g, 0.32, 0.4, 0.28, brown, 0, 0.22, 0); bx(g, 0.3, 0.26, 0.26, brown, 0, 0.52, 0.02); bx(g, 0.24, 0.2, 0.02, pale, 0, 0.52, 0.15); bx(g, 0.2, 0.22, 0.02, pale, 0, 0.2, 0.15);
    const eye = M(0xffc020, { emissive: 0xffa010, emissiveIntensity: 0.9 }); bx(g, 0.07, 0.07, 0.02, eye, -0.06, 0.55, 0.165); bx(g, 0.07, 0.07, 0.02, eye, 0.06, 0.55, 0.165); bx(g, 0.04, 0.05, 0.04, M(0x3a3020), 0, 0.49, 0.17);
    for (const s of [-1, 1]) bx(g, 0.05, 0.06, 0.04, brown, s * 0.1, 0.68, 0.02);   // ear tufts
    const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.set(-0.16, 0.36, 0); wr.position.set(0.16, 0.36, 0); g.add(wl, wr); bx(wl, 0.5, 0.04, 0.26, brown, -0.25, 0, 0); bx(wr, 0.5, 0.04, 0.26, brown, 0.25, 0, 0); wl.rotation.z = 1.35; wr.rotation.z = -1.35;
    g.visible = false; sc.add(g); return { g, wl, wr, state: 'off', t: 5 + Math.random() * 20, perch: null, x: 0, y: 0, z: 0, hootT: 4 + Math.random() * 10 };
  }
  update(dt) {
    const g = this.game, night = g.atmosphere.night || 0, rain = g.atmosphere.rain || 0, cam = g.camera.position, on = night > 0.55 && (g.mode === 'sim' || g.god.dist < 120); this.t += dt; const t = this.t;
    // ---------- bats ----------
    const bats = on && rain < 0.4; this.bats.visible = bats;
    if (bats) {
      for (const b of this.bat) {
        if (!b.placed || Math.hypot(b.cx - cam.x, b.cz - cam.z) > 70) { const a = Math.random() * 6.28, r = 8 + Math.random() * 35; b.cx = cam.x + Math.cos(a) * r; b.cz = cam.z + Math.sin(a) * r; b.x = b.cx; b.z = b.cz; b.y = 3 + Math.random() * 6; b.placed = true; }
        b.jink -= dt; if (b.jink <= 0) { b.jink = 0.25 + Math.random() * 0.9; b.h += (Math.random() - 0.5) * 2.6; b.vy = (Math.random() - 0.5) * 3; }   // the zig-zag flight
        const back = Math.hypot(b.x - b.cx, b.z - b.cz) > 9; if (back) b.h += (Math.atan2(b.cx - b.x, b.cz - b.z) - b.h) * Math.min(1, dt * 3);   // stays round its tree
        b.x += Math.sin(b.h) * 7 * dt; b.z += Math.cos(b.h) * 7 * dt; b.y = Math.max(2.2, Math.min(11, b.y + (b.vy || 0) * dt)); b.ph += dt * 26;
        const flap = 0.35 + Math.abs(Math.sin(b.ph)) * 0.75; this.e.set(Math.sin(b.ph * 0.5) * 0.15, b.h, Math.sin(t * 3 + b.k) * 0.25); this.q.setFromEuler(this.e); this.p3.set(b.x, b.y, b.z); this.s3.set(flap, 1, 1);
        this.m4.compose(this.p3, this.q, this.s3); this.bats.setMatrixAt(b.k, this.m4);
      }
      this.bats.instanceMatrix.needsUpdate = true;
    }
    // ---------- owls ----------
    for (const o of this.owls) {
      if (!on) { o.g.visible = false; o.state = 'off'; continue; }
      if (o.state === 'off' || !o.perch || Math.hypot(o.perch.x - cam.x, o.perch.z - cam.z) > 110) {   // up on a roof near you
        const a = Math.random() * 6.28, p = nearestPerch(g.buildings.list, cam.x + Math.cos(a) * 30, cam.z + Math.sin(a) * 30, 70); if (!p) { o.g.visible = false; continue; }
        o.perch = p; o.x = p.x; o.y = p.y; o.z = p.z; o.h = Math.random() * 6.28; o.state = 'sit'; o.t = 25 + Math.random() * 60;
      }
      o.g.visible = true; o.t -= dt;
      if (o.state === 'sit') {
        o.wl.rotation.z = 1.35; o.wr.rotation.z = -1.35; o.g.position.set(o.x, o.y, o.z); o.g.rotation.set(0, o.h + Math.sin(t * 0.4 + o.x) * 0.9, 0);   // turning its head about
        if ((o.hootT -= dt) <= 0) { o.hootT = 9 + Math.random() * 16; this.hoot(o); }
        if (o.t <= 0) {   // something in the grass: a mouse, and down it goes (now and then)
          o.t = 40 + Math.random() * 80; if (this.mouse) continue;
          for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28, r = 5 + Math.random() * 9, x = o.x + Math.cos(a) * r, z = o.z + Math.sin(a) * r, [tx, tz] = g.world.tileOf(x, z); if (!g.world.inBounds(tx, tz) || !g.world.isLand(tx, tz) || g.world.buildingAt(tx, tz) || g.world.collides(x, z, 0.3)) continue; this.mouse = this.makeMouse(x, z); o.state = 'dive'; o.u = 0; o.sx = o.x; o.sy = o.y; o.sz = o.z; break; }
        }
      } else if (o.state === 'dive' || o.state === 'back') {
        const m = this.mouse, dive = o.state === 'dive'; o.u = Math.min(1, o.u + dt * (dive ? 0.55 : 0.4)); const k = dive ? o.u * o.u : o.u;
        const fx = dive ? m.x : o.perch.x, fy = dive ? 0.12 : o.perch.y, fz = dive ? m.z : o.perch.z;
        o.x = o.sx + (fx - o.sx) * k; o.z = o.sz + (fz - o.sz) * k; o.y = o.sy + (fy - o.sy) * k + (dive ? 0 : Math.sin(o.u * Math.PI) * 2.5);
        o.h = Math.atan2(fx - o.sx, fz - o.sz); const beat = dive ? 0.2 : Math.sin(t * 10) * 0.6; o.wl.rotation.z = beat; o.wr.rotation.z = -beat;
        o.g.position.set(o.x, o.y, o.z); o.g.rotation.set(dive ? 0.5 : -0.2, o.h, 0, 'YXZ');
        if (dive && m) { m.u += dt; if (m.u < 1.2) { m.mesh.position.x += Math.sin(m.h) * dt * 1.2; m.mesh.position.z += Math.cos(m.h) * dt * 1.2; m.x = m.mesh.position.x; m.z = m.mesh.position.z; } }   // scurrying, never quick enough
        if (o.u >= 1) { if (dive) { if (m) { g.scene.remove(m.mesh); m.mesh.geometry.dispose(); this.mouse = null; } o.state = 'back'; o.u = 0; o.sx = o.x; o.sy = o.y; o.sz = o.z; } else { o.state = 'sit'; o.t = 60 + Math.random() * 90; } }
      }
    }
  }
  makeMouse(x, z) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.16), new THREE.MeshStandardMaterial({ color: 0x8a7a6a })); mesh.position.set(x, 0.04, z); this.game.scene.add(mesh); return { mesh, x, z, h: Math.random() * 6.28, u: 0 }; }
  /** Twit-twoo (well, a tawny's hoo-hoo), louder the closer Sam is. */
  hoot(o) {
    const g = this.game; if (g.mode !== 'sim' || !g.clock.speed) return; const d = Math.hypot(g.player.x - o.x, g.player.z - o.z); if (d > 45) return; const v = 0.07 * (1 - d / 45);
    Sfx.tone(392, 0.32, { type: 'sine', vol: v, slide: -20 }); Sfx.tone(370, 0.6, { type: 'sine', vol: v * 0.9, slide: -30, delay: 0.55 }); Sfx.tone(385, 0.2, { type: 'sine', vol: v * 0.6, delay: 1.35 });
  }
}
