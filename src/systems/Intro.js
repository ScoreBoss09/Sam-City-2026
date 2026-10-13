import * as THREE from 'three';
import { Dog } from '../render/Dog.js';
import { createRig } from '../render/SimRig.js';
import { Sfx } from '../core/Sfx.js';

// The opening of a new game: no instructions, just Sam waking up on his back in the grass. Blurry sky, a blink or two,
// a dog's face looking down at him, then a security guard leaning into view: "Wake up, Sam. You need to get to work."
// Any button skips it.
export class Intro {
  constructor(game) { this.game = game; this.live = false; }
  start() {
    const g = this.game, P = g.player; this.live = true; this.t = 0; g.setMode('sim'); g.ui.modalOpen = true;
    // a close-up lens: the dog's nose and the guard lean in well inside the normal near plane (which would slice them open)
    const cam = g.camera; cam.near = 0.04; cam.fov = 62; cam.updateProjectionMatrix(); document.body.classList.add('cutscene'); P.rig.root.visible = false;
    const h = P.heading || 0, fx = Math.sin(h), fz = Math.cos(h); this.h = h; this.x = P.x; this.z = P.z;
    // the dog (a pale one, so its face reads against the sky) stands just beyond Sam's head, facing him, and peers down at his face
    this.dog = new Dog(g, { x: P.x, z: P.z, heading: h, coat: 2 }); const d = this.dog.root; d.position.set(P.x + fx * 1.15, 0, P.z + fz * 1.15); d.rotation.y = h + Math.PI; this.dog.head.rotation.x = 0.55;
    // the guard: dark uniform, cap and earpiece, waiting just out of view
    const L = g.population.makePerson({ role: 'guard', gender: 'm', age: 45 }); g.population.names && g.population.names.delete(L.name);
    this.guard = createRig({ ...L.look, shirt: 0x1d2433, pants: 0x1d2433, accessory: 'uniform', longSleeve: true }); const r = this.guard.root; r.position.set(P.x + fz * 1.9, 0, P.z - fx * 1.9); r.rotation.y = h - Math.PI / 2; g.scene.add(r); r.visible = false;
    // lying in the grass: the tufts right by his head would fill the screen, so they're flattened until he gets up
    if (g.decor) g.decor.clearGrass({ x: P.x, z: P.z, r: 2.6 });
    const o = this.el = document.createElement('div'); o.id = 'intro'; o.innerHTML = '<div class="glow"></div><div class="lid top"></div><div class="lid bot"></div><div class="cap"></div><div class="skip"><span class="key">' + (g.input.padActive ? '✕' : 'Space') + '</span> Skip</div>'; document.getElementById('app').appendChild(o);
    this.cap = o.querySelector('.cap'); this.glow = o.querySelector('.glow'); this.skipEl = o.querySelector('.skip'); this.skipT = 0; this.lids = [o.querySelector('.top'), o.querySelector('.bot')]; this.canvas = document.getElementById('view');
  }
  say(who, text) { const html = who ? `<b>${who}</b> ${text}` : text; if (this.cap.innerHTML !== html) this.cap.innerHTML = html; }
  /** Drive the camera (called instead of the player camera while the scene plays). */
  camera(cam, dt) {
    const g = this.game, t = (this.t += Math.min(dt, 0.05)), P = g.player, fx = Math.sin(this.h), fz = Math.cos(this.h);
    // a first press shows the skip prompt; pressing again while it shows skips the scene
    this.skipT = Math.max(0, this.skipT - dt); const pressed = t > 0.6 && (g.input.pressed.size || g.input.mouse.down);
    if (pressed && this.skipT > 0 && this.skipT < 2.8) { this.end(); return; } if (pressed && !this.skipT) this.skipT = 3; this.skipEl.classList.toggle('on', this.skipT > 0);
    // eyelids: shut, a flicker, a proper blink, then open
    const open = t < 1.6 ? 0 : t < 2.2 ? (t - 1.6) * 0.5 : t < 2.6 ? 0.3 - (t - 2.2) * 0.75 : Math.min(1, (t - 2.6) * 0.45);
    for (const l of this.lids) l.style.height = (64 * (1 - open)) + '%'; this.glow.style.opacity = (1 - Math.min(1, open * 1.6)).toFixed(2);
    this.canvas.style.filter = `blur(${Math.max(0, 6 - t * 1.1).toFixed(1)}px)`;
    // on his back, looking up; the dog sniffs, tilts its head and wanders off; the guard leans in
    const dog = this.dog, gr = this.guard.root; dog.head.rotation.z = Math.sin(t * 2.3) * 0.25 * (t > 3 ? 1 : 0); dog.tail.rotation.y = Math.sin(t * 12) * 0.6;
    if (t > 6.2) { const k = Math.min(1, (t - 6.2) / 1.5); dog.root.position.set(this.x + fx * (1.15 + k * 4) + fz * k * 2, 0, this.z + fz * (1.15 + k * 4) - fx * k * 2); dog.root.rotation.y = this.h + Math.PI * (1 - k * 0.6); dog.head.rotation.x = 0.55 * (1 - k); }
    if (t > 6.8) { gr.visible = true; const k = Math.min(1, (t - 6.8) / 1.2); gr.position.set(this.x + fz * (2.3 - k * 0.9), 0, this.z - fx * (2.3 - k * 0.9)); this.guard.spine.rotation.x = 0.55 * k; this.guard.neck.rotation.x = 0.35 * k; }
    const look = t < 6.6 ? dog.head.getWorldPosition(new THREE.Vector3()) : this.guard.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.14, 0));   // his face
    if (!this.lookAt) this.lookAt = look.clone(); this.lookAt.lerp(look, Math.min(1, dt * 2.2));
    cam.position.set(this.x + Math.sin(t * 0.7) * 0.02, 0.22, this.z); cam.lookAt(this.lookAt);
    if (t > 3.2 && t < 3.3 && !this.sniffed) { this.sniffed = true; Sfx.tone(330, 0.09, { type: 'sawtooth', vol: 0.15 }); Sfx.tone(300, 0.1, { type: 'sawtooth', vol: 0.15, delay: 0.16 }); }
    if (t > 3.2 && t < 6) this.say('', '<i>*sniff sniff*</i>'); else if (t > 7.6 && t < 11.5) this.say('Security:', '"Wake up, Sam. You need to get to work."'); else if (t > 11.5 && t < 13) this.say('', ''); else this.say('', '');
    if (t > 13) this.end();
  }
  end() {
    const g = this.game; if (!this.live) return; this.live = false; document.body.classList.remove('cutscene'); this.canvas.style.filter = '';
    this.el.remove(); g.setMode('sim'); if (g.decor) g.decor.clearGrass(null); g.player.rig.root.visible = true; g.scene.remove(this.guard.root); g.scene.remove(this.dog.root); g.ui.modalOpen = false; g.clock.speed = 1; g.input.pressed.clear && g.input.pressed.clear();
    g.ui.fade && (g.ui.fade(0.9), setTimeout(() => g.ui.fade(0), 250));
  }
}
