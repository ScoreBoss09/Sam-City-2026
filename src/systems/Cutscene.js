import * as THREE from 'three';

/**
 * Short cutscenes: letterbox bars, a caption, and the camera on a few set shots while the world carries on (so people
 * really do walk out of the Lift, raiders really do row ashore). Any button skips (twice: the first press shows how).
 *
 *   game.cutscene.play({ shots: [{ dur: 4, cam: { pos: [x, y, z], look: [x, y, z] }, title: 'Morris dancers', text: '...' },
 *                                { dur: 3, cam: (t) => ({ pos, look }), say: ['Security', '"Sam! Use this."'], at: () => {...} }],
 *                       onEnd: () => {...} })
 *
 * cam is fixed, or a function of the seconds into that shot. Scenes asked for while one is playing wait their turn.
 */
export class Cutscene {
  constructor(game) { this.game = game; this.live = null; this.queue = []; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); }
  play(scene) { if (this.live) { this.queue.push(scene); return; } this.start(scene); }
  start(scene) {
    const g = this.game; this.live = scene; this.i = -1; this.t = 0; this.skipT = 0; this.first = true;
    this.speed = g.clock.speed; if (!g.clock.speed) g.clock.speed = 1;   // the world has to move for the scene to happen
    this.mode = g.mode; if (g.mode !== 'sim') g.setMode('sim'); this.fov0 = g.camera.fov; g.input.unlock(); document.body.classList.add('cutscene');
    const o = this.el = document.createElement('div'); o.id = 'cine';
    o.innerHTML = '<div class="bar top"></div><div class="bar bot"></div><div class="cap"><div class="ttl"></div><div class="txt"></div></div><div class="skip"><span class="key"></span> skip</div>';
    document.getElementById('app').appendChild(o); this.cap = o.querySelector('.cap'); this.skipEl = o.querySelector('.skip');
    o.querySelector('.key').textContent = g.input.padActive ? '✕' : 'Space';
    this.next();
  }
  next() {
    const S = this.live.shots; this.i++; this.t = 0; if (this.i >= S.length) { this.end(); return; }
    const s = S[this.i]; if (s.at) try { s.at(); } catch (e) { console.warn('cutscene shot', e); }
    const ttl = this.cap.querySelector('.ttl'), txt = this.cap.querySelector('.txt');
    if (s.say) { ttl.textContent = s.say[0]; txt.textContent = s.say[1]; this.cap.className = 'cap say'; }
    else if (s.title || s.text) { ttl.textContent = s.title || ''; txt.textContent = s.text || ''; this.cap.className = 'cap card'; }
    else if (!s.keep) { ttl.textContent = ''; txt.textContent = ''; this.cap.className = 'cap'; }
  }
  /** The camera for this frame (instead of the player's). */
  camera(cam, dt) {
    const g = this.game, s = this.live && this.live.shots[this.i]; if (!s) return;
    this.t += Math.min(dt, 0.1);
    // skipping: a first press shows how, a second one skips
    this.skipT = Math.max(0, this.skipT - dt); const inp = g.input, P = inp.pad, pressed = (inp.hit('Space') || inp.hit('KeyE') || inp.hit('Escape') || inp.hit('Enter') || (inp.padActive && P && (P.hitB[0] || P.hitB[1]))) && this.t > 0.3;
    if (pressed) { for (const k of ['Space', 'KeyE', 'Escape', 'Enter']) inp.pressed.delete(k); if (this.skipT > 0) { this.skipAll(); return; } this.skipT = 2.5; }
    this.skipEl.classList.toggle('on', this.skipT > 0);
    const c = typeof s.cam === 'function' ? s.cam(this.t, Math.min(1, this.t / s.dur)) : s.cam; if (c) {
      const k = this.first ? 1 : Math.min(1, dt * (s.snap ? 30 : 2.2)); this.first = false;
      this.pos.lerp(new THREE.Vector3(...c.pos), k); this.look.lerp(new THREE.Vector3(...c.look), k);
      cam.position.copy(this.pos); cam.lookAt(this.look); if (c.fov && cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    }
    if (this.t >= s.dur) { if (s.cut) this.first = true; this.next(); }
  }
  /** Skipped: every shot's start still happens (handing over a club, say), then the end. */
  skipAll() { const S = this.live.shots; for (let j = this.i + 1; j < S.length; j++) if (S[j].at) try { S[j].at(); } catch (e) { /* skip */ } this.i = S.length; this.end(); }
  end() {
    const g = this.game, sc = this.live; if (!sc) return; this.live = null;
    if (this.el) this.el.remove(); document.body.classList.remove('cutscene'); if (this.fov0 && g.camera.fov !== this.fov0) { g.camera.fov = this.fov0; g.camera.updateProjectionMatrix(); }
    g.clock.speed = this.speed || (g.clock.speed || 1); if (this.mode && this.mode !== g.mode) g.setMode(this.mode);
    if (sc.onEnd) try { sc.onEnd(); } catch (e) { console.warn('cutscene end', e); }
    const q = this.queue.shift(); if (q) this.start(q);
  }
  /** A shot from in front of the Lift doors, pushing in slowly as people come out. */
  liftShot(dur, extra = {}) {
    const L = this.game.lift; if (!L || !L.doorOut) return null; const dx = L.doorOut.x - L.cx, dz = L.doorOut.z - L.cz, n = Math.hypot(dx, dz) || 1, fx = dx / n, fz = dz / n, sx = -fz, sz = fx;
    return { dur, cam: (t, k) => ({ pos: [L.doorOut.x + fx * (9 - k * 2.5) + sx * 3.2, 2.6 - k * 0.5, L.doorOut.z + fz * (9 - k * 2.5) + sz * 3.2], look: [L.doorOut.x - fx * 0.6, 1.5, L.doorOut.z - fz * 0.6], fov: 55 }), ...extra };
  }
}
