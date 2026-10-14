import { Bindings } from './Bindings.js';

/** Keyboard / mouse state. In Unity: wrap the Input System actions with the same surface. */
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set(); this.released = new Set(); this.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, middle: false, wheel: 0, down: false, up: false };
    this.canvas = canvas; this.locked = false; this.blocked = false; this.binds = new Bindings(); this.capture = null; this.padCapture = null;
    this.padActive = false; this.padEnabled = true; this.virt = new Set(); this.pad = { connected: false, lx: 0, ly: 0, rx: 0, ry: 0, prev: [], down: [], hitB: [], mode: 'menu', zoomAcc: 0 };
    // the mouse or keyboard takes over from the controller only when really used: Chrome sends 'mousemove' with no movement
    // whenever the page changes under a still cursor, which used to drop the controller (and its held buttons) every few frames
    window.addEventListener('mousemove', (e) => { const m = Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (!m || !this.padActive) return; const t = performance.now(); if (t - (this._mvT || 0) > 300) this._mv = 0; this._mvT = t; this._mv = (this._mv || 0) + m; if (this._mv > 30 && t - (this.pad.lastT || 0) > 500) this.padActive = false; });
    window.addEventListener('keydown', (e) => { if (!e.repeat && performance.now() - (this.pad.lastT || 0) > 300) this.padActive = false; });
    window.addEventListener('keydown', (e) => {
      if (this.capture) { e.preventDefault(); e.stopPropagation(); const f = this.capture; this.capture = null; f(e.code); return; }   // the Controls menu waiting for "press a key"
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      const k = this.binds.translate(e.code); if (k === null) return; if (k === 'Tab' || k === 'Space') e.preventDefault();   // (your key for this action -> the key the game reads)
      if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => { const k = this.binds.translate(e.code); if (k === null) return; this.keys.delete(k); this.released.add(k); });
    window.addEventListener('blur', () => { this.keys.clear(); this.virt = new Set(); });
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) / r.width; this.mouse.y = (e.clientY - r.top) / r.height; if (this.locked) { const S = this.binds.sens; this.mouse.dx += e.movementX * S.mouse; this.mouse.dy += e.movementY * S.mouse * (S.invertMouse ? -1 : 1); } else if (this.drag) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.left = true; this.mouse.down = true; } if (e.button === 2) this.mouse.right = true; if (e.button === 1) this.mouse.middle = true; this.drag = e.button !== 0; this.mouse.btn = e.button; e.preventDefault(); });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) { this.mouse.left = false; this.mouse.up = true; } if (e.button === 2) this.mouse.right = false; if (e.button === 1) this.mouse.middle = false; this.drag = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas) { /* handled above */ } });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas; this.overCanvas = true; if (this.locked && this.allowLock && !this.allowLock()) this.unlock();
      // lost while walking about and we didn't let go of it: the player pressed Esc (or switched window) to free the mouse
      if (!this.locked && !this._ourUnlock && this.allowLock && this.allowLock()) { this.wantLock = false; if (this.onLockLost) this.onLockLost(); }
      this._ourUnlock = false;
    });
    // is the cursor over the 3D view (not a HUD panel)? Re-checked on every move, so it can never get stuck
    this.overCanvas = true; window.addEventListener('mousemove', (e) => { this.overCanvas = e.target === canvas; }, true);
    canvas.addEventListener('mousedown', () => { this.overCanvas = true; }, true);
    window.addEventListener('blur', () => { this.mouse.left = this.mouse.right = this.mouse.middle = false; this.drag = false; });
  }
  /** Gamepad -> the same virtual keys / mouse the rest of the game already understands. mode: 'sim' | 'god' | 'menu'. */
  pollPad(dt, mode) {
    const P = this.pad, all = navigator.getGamepads ? navigator.getGamepads() : [], list = this.padEnabled ? all : [];
    // controller input switched off (Options), but somebody's pressing buttons on one: they want it, so switch it back on and say so
    if (!this.padEnabled) { let down = false; for (const q of all) if (q && q.connected) for (const bb of q.buttons) if (bb && bb.pressed) down = true; if (down && P.wasUp && this.onPadOff) { P.wasUp = false; this.onPadOff(); } else if (!down) P.wasUp = true; }
    // Prefer a proper game controller ("standard" layout). Other devices (wheels, joysticks, some headsets/keyboards) are ignored.
    // With more than one (Steam or DS4Windows can add a copy of the same pad), follow whichever was used last.
    let gp = null, cur0 = null, odd = null; P.cals = P.cals || new Map();
    for (const p of list) { if (!p || !p.connected) continue; if (p.mapping === 'standard') { const k = p.id + '#' + p.index; if (!P.cals.has(k)) P.cals.set(k, { n: 0, first: p.axes.slice(), steady: p.axes.map(() => true), base: p.axes.map(() => 0), stuck: p.buttons.map((b) => !!(b && (b.pressed || b.value > 0.5))) }); if (k === P.baseId) cur0 = p; if (!gp || p.timestamp > gp.timestamp) gp = p; } else odd = odd || p; }
    if (cur0 && gp !== cur0 && gp.timestamp - cur0.timestamp < 250) gp = cur0;   // stay on the pad in use (two copies of one pad mustn't flicker)
    if (!gp && odd && !P.oddSaid && this.onUnknownPad) { P.oddSaid = true; this.onUnknownPad(odd.id); }
    const want = new Set(); P.connected = !!gp; P.mode = mode;
    if (gp) {
      // Calibrate each pad separately: a button already held when it's first seen is ignored until let go, and an axis that sits
      // perfectly still away from the centre for the first second and a half (a broken or odd device) is treated as its centre.
      // A thumb resting on a stick wobbles, so it's never mistaken for a stuck axis (which would leave the camera drifting).
      const key = gp.id + '#' + gp.index, C = P.cals.get(key);
      if (C.n < 90) { C.n++; for (let i = 0; i < gp.axes.length; i++) if (Math.abs((gp.axes[i] || 0) - (C.first[i] || 0)) > 0.03) C.steady[i] = false; if (C.n === 90) C.base = C.first.map((v, i) => (C.steady[i] && Math.abs(v) > 0.3 ? v : 0)); }
      if (P.baseId !== key) { P.baseId = key; P.prev = []; }
      P.base = C.base; P.stuck = C.stuck;
      const dz = (v) => (Math.abs(v) < 0.25 ? 0 : (v - Math.sign(v) * 0.25) / 0.75), ax = (i) => dz((gp.axes[i] || 0) - (P.base[i] || 0));
      const bt = (i) => { const b = gp.buttons[i], on = !!(b && (b.pressed || b.value > 0.5)); if (P.stuck[i]) { if (!on) P.stuck[i] = false; return false; } return on; };
      if (this.padCapture) { P.hitB = []; P.relB = []; const raw = gp.buttons.map((b) => !!(b && (b.pressed || b.value > 0.5))), was = P.rawPrev || []; P.rawPrev = raw; const i = raw.findIndex((v, k) => v && !was[k] && k < 17); if (i >= 0) { const f = this.padCapture; this.padCapture = null; P.prev = raw.slice(); f(i); } return; }   // the Controls menu waiting for "press a button"
      P.rawPrev = null; const map = this.binds.pad, cur = []; for (let i = 0; i < 17; i++) cur.push(bt(map[i] ?? i));   // (your button for each of the game's buttons) P.hitB = cur.map((v, i) => v && !P.prev[i]); P.relB = cur.map((v, i) => !v && !!P.prev[i]); P.prev = cur; P.down = cur;
      P.lx = ax(0); P.ly = ax(1); P.rx = ax(2); P.ry = ax(3);
      if (cur.some(Boolean) || Math.hypot(P.lx, P.ly) > 0.4 || Math.hypot(P.rx, P.ry) > 0.4) { this.padActive = true; P.lastT = performance.now(); if (cur.some(Boolean) && this.onActivity) this.onActivity(); }
      if (this.padActive) {
        const st = 0.4; if (P.ly < -st) want.add('KeyW'); if (P.ly > st) want.add('KeyS'); if (P.lx < -st) want.add('KeyA'); if (P.lx > st) want.add('KeyD');
        if (cur[9]) want.add('Tab'); if (cur[8]) { P.selT = (P.selT || 0) + dt; if (P.selT >= 0.5 && !P.selFired) { P.selFired = true; this.pressed.add('PadSpeed'); } } else { if (P.selT > 0 && !P.selFired && mode !== 'menu') this.pressed.add('PadCycle'); P.selT = 0; P.selFired = false; }   // View/Select: tap cycles the game speed, hold for the menu
        if (mode === 'sim') {
          const S = this.binds.sens; this.mouse.dx += P.rx * 1000 * dt * S.pad; this.mouse.dy += P.ry * 800 * dt * S.pad * (S.invertPad ? -1 : 1);   // (your stick sensitivity)
          if (this.combat || this.armed) {   // Call of Duty layout: L2 aim, R2 fire, ✕ jump, ○ crouch (hold: prone), □ reload / armoury, △ swap gun, R1 grenade, L1 or L3 sprint, R3 melee
            if (cur[0]) want.add('Space'); if (cur[1]) want.add('PadCrouch'); if (cur[2]) want.add(this.combat ? 'PadSquare' : 'KeyE'); if (cur[3]) want.add('PadSwap'); if (cur[4] || cur[10]) want.add('ShiftLeft'); if (cur[5]) want.add('PadNade');
            if (cur[6]) want.add('PadAim'); if (cur[7]) want.add('PadFire'); if (cur[11]) want.add('PadMelee'); if (this.wheel) { if (cur[14]) want.add('PadPrev'); if (cur[15]) want.add('PadNext'); } else { if (cur[12]) want.add('KeyV'); if (cur[13]) want.add('KeyI'); if (cur[14]) want.add('KeyJ'); if (cur[15]) want.add('KeyE'); }   // D-pad: up first/third person, right use (weapon wheel open: ← → between the guns in a slice)
          } else {
            if (cur[0]) want.add('KeyE'); if (cur[2]) want.add('KeyF'); if (cur[7]) want.add('KeyX'); if (cur[3]) want.add('KeyQ'); if (cur[1]) want.add('KeyG'); if (cur[5]) want.add('KeyV'); if (cur[4]) want.add('ShiftLeft'); if (cur[10]) want.add('KeyB'); if (cur[11]) want.add('KeyM'); if (cur[12]) want.add('KeyI'); if (cur[13]) want.add('KeyR'); if (cur[14]) want.add('KeyJ'); if (cur[6]) want.add('Space'); if (cur[15]) want.add('KeyC');
          }
        } else if (mode === 'god') {
          if (cur[3]) want.add('KeyR'); if (cur[2]) want.add('KeyB'); if (cur[11]) want.add('KeyF'); if (cur[1]) want.add('Escape');
          // smooth analogue rotate / zoom (read by GodControls) instead of key taps and wheel clicks
          const dz = (v) => (Math.abs(v) < 0.22 ? 0 : (v - Math.sign(v) * 0.22) / 0.78);
          P.turn = dz(P.rx); P.zoom = dz(P.ry) + (cur[6] ? -1 : 0) + (cur[7] ? 1 : 0);
          this.mouse.x = 0.5; this.mouse.y = 0.5; const a = cur[0], was = !!this.padLeft;
          if (a && !was) this.mouse.down = true; if (!a && was) this.mouse.up = true; this.mouse.left = a; this.padLeft = a;
          if (cur[10]) want.add('ShiftLeft');
        } else { if (cur[0]) want.add('KeyE'); if (cur[1]) want.add('Escape'); if (cur[12] && false) want.add('KeyI'); }
      }
    } else { P.lx = P.ly = P.rx = P.ry = 0; P.turn = P.zoom = 0; P.hitB = []; P.relB = []; P.down = []; if (!list.some((q) => q && q.connected)) P.cals = null; P.baseId = null; if (this.padActive && !gp) this.padActive = false; }
    for (const k of want) if (!this.virt.has(k)) { if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k); }
    for (const k of this.virt) if (!want.has(k)) { this.keys.delete(k); this.released.add(k); }
    this.virt = want;
  }
  padHit(i) { return !!(this.pad.hitB && this.pad.hitB[i]); }
  down(k) { return this.keys.has(k); }
  hit(k) { return this.pressed.has(k); }
  lock() { this.wantLock = true; try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* headless */ } }
  /** Let go of the mouse for a menu or the planning view (it's taken back afterwards: wantLock stays). */
  unlock() { if (document.pointerLockElement) { this._ourUnlock = true; document.exitPointerLock(); } }
  endFrame() { this.pressed.clear(); this.released.clear(); this.mouse.dx = this.mouse.dy = 0; this.mouse.wheel = 0; this.mouse.down = this.mouse.up = false; }
}
