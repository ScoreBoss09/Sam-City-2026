/** Keyboard / mouse state. In Unity: wrap the Input System actions with the same surface. */
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set(); this.released = new Set(); this.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, middle: false, wheel: 0, down: false, up: false };
    this.canvas = canvas; this.locked = false; this.blocked = false;
    this.padActive = false; this.padEnabled = true; this.virt = new Set(); this.pad = { connected: false, lx: 0, ly: 0, rx: 0, ry: 0, prev: [], down: [], hitB: [], mode: 'menu', zoomAcc: 0 };
    window.addEventListener('mousemove', () => { this.padActive = false; }); window.addEventListener('keydown', () => { this.padActive = false; });
    window.addEventListener('keydown', (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const k = e.code; if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k);
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.released.add(e.code); });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) / r.width; this.mouse.y = (e.clientY - r.top) / r.height; if (this.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } else if (this.drag) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.left = true; this.mouse.down = true; } if (e.button === 2) this.mouse.right = true; if (e.button === 1) this.mouse.middle = true; this.drag = e.button !== 0; this.mouse.btn = e.button; e.preventDefault(); });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) { this.mouse.left = false; this.mouse.up = true; } if (e.button === 2) this.mouse.right = false; if (e.button === 1) this.mouse.middle = false; this.drag = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas) { /* handled above */ } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this.overCanvas = true; });
    // is the cursor over the 3D view (not a HUD panel)? Re-checked on every move, so it can never get stuck
    this.overCanvas = true; window.addEventListener('mousemove', (e) => { this.overCanvas = e.target === canvas; }, true);
    canvas.addEventListener('mousedown', () => { this.overCanvas = true; }, true);
    window.addEventListener('blur', () => { this.mouse.left = this.mouse.right = this.mouse.middle = false; this.drag = false; });
  }
  /** Gamepad -> the same virtual keys / mouse the rest of the game already understands. mode: 'sim' | 'god' | 'menu'. */
  pollPad(dt, mode) {
    const P = this.pad, list = this.padEnabled && navigator.getGamepads ? navigator.getGamepads() : [];
    // Prefer a proper game controller ("standard" layout). Other devices (wheels, joysticks, some headsets/keyboards) are ignored.
    let gp = null; for (const p of list) if (p && p.connected && p.mapping === 'standard') { gp = p; break; }
    const want = new Set(); P.connected = !!gp; P.mode = mode;
    if (gp) {
      // Calibrate: remember each axis's resting value and any button that is already held when the pad is first seen,
      // so a stick or trigger that never returns to centre cannot spin the camera or cycle menus forever.
      if (!P.base || P.baseId !== gp.id + gp.index) { P.baseId = gp.id + gp.index; P.base = gp.axes.map((v) => (Math.abs(v) > 0.3 ? v : 0)); P.stuck = gp.buttons.map((b) => !!(b && (b.pressed || b.value > 0.5))); P.prev = []; }
      const dz = (v) => (Math.abs(v) < 0.25 ? 0 : (v - Math.sign(v) * 0.25) / 0.75), ax = (i) => dz((gp.axes[i] || 0) - (P.base[i] || 0));
      const bt = (i) => { const b = gp.buttons[i], on = !!(b && (b.pressed || b.value > 0.5)); if (P.stuck[i]) { if (!on) P.stuck[i] = false; return false; } return on; };
      const cur = []; for (let i = 0; i < 17; i++) cur.push(bt(i)); P.hitB = cur.map((v, i) => v && !P.prev[i]); P.relB = cur.map((v, i) => !v && !!P.prev[i]); P.prev = cur; P.down = cur;
      P.lx = ax(0); P.ly = ax(1); P.rx = ax(2); P.ry = ax(3);
      if (cur.some(Boolean) || Math.hypot(P.lx, P.ly) > 0.4 || Math.hypot(P.rx, P.ry) > 0.4) { this.padActive = true; if (cur.some(Boolean) && this.onActivity) this.onActivity(); }
      if (this.padActive) {
        const st = 0.4; if (P.ly < -st) want.add('KeyW'); if (P.ly > st) want.add('KeyS'); if (P.lx < -st) want.add('KeyA'); if (P.lx > st) want.add('KeyD');
        if (cur[9]) want.add('Tab'); if (cur[8]) want.add('KeyP');
        if (mode === 'sim') {
          this.mouse.dx += P.rx * 1000 * dt; this.mouse.dy += P.ry * 800 * dt;
          if (cur[0]) want.add('KeyE'); if (cur[2] || cur[7]) want.add('KeyF'); if (cur[3]) want.add('KeyQ'); if (cur[1]) want.add('KeyG'); if (cur[5]) want.add('KeyV'); if (cur[4] || cur[10]) want.add('ShiftLeft'); if (cur[11]) want.add('KeyM'); if (cur[12]) want.add('KeyI'); if (cur[13]) want.add('KeyR'); if (cur[14]) want.add('KeyJ'); if (cur[6]) want.add('Space'); if (cur[15]) want.add('KeyC');
        } else if (mode === 'god') {
          if (cur[3]) want.add('KeyR'); if (cur[2]) want.add('KeyF'); if (cur[1]) want.add('Escape');
          // smooth analogue rotate / zoom (read by GodControls) instead of key taps and wheel clicks
          const dz = (v) => (Math.abs(v) < 0.22 ? 0 : (v - Math.sign(v) * 0.22) / 0.78);
          P.turn = dz(P.rx); P.zoom = dz(P.ry) + (cur[6] ? -1 : 0) + (cur[7] ? 1 : 0);
          this.mouse.x = 0.5; this.mouse.y = 0.5; const a = cur[0], was = !!this.padLeft;
          if (a && !was) this.mouse.down = true; if (!a && was) this.mouse.up = true; this.mouse.left = a; this.padLeft = a;
          if (cur[10]) want.add('ShiftLeft');
        } else { if (cur[0]) want.add('KeyE'); if (cur[1]) want.add('Escape'); if (cur[12] && false) want.add('KeyI'); }
      }
    } else { P.lx = P.ly = P.rx = P.ry = 0; P.turn = P.zoom = 0; P.hitB = []; P.relB = []; P.down = []; P.base = null; if (this.padActive && !gp) this.padActive = false; }
    for (const k of want) if (!this.virt.has(k)) { if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k); }
    for (const k of this.virt) if (!want.has(k)) { this.keys.delete(k); this.released.add(k); }
    this.virt = want;
  }
  padHit(i) { return !!(this.pad.hitB && this.pad.hitB[i]); }
  down(k) { return this.keys.has(k); }
  hit(k) { return this.pressed.has(k); }
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* headless */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  endFrame() { this.pressed.clear(); this.released.clear(); this.mouse.dx = this.mouse.dy = 0; this.mouse.wheel = 0; this.mouse.down = this.mouse.up = false; }
}
