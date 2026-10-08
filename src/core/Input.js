/** Keyboard / mouse state. In Unity: wrap the Input System actions with the same surface. */
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set(); this.released = new Set(); this.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, middle: false, wheel: 0, down: false, up: false };
    this.canvas = canvas; this.locked = false; this.blocked = false;
    this.padActive = false; this.virt = new Set(); this.pad = { connected: false, lx: 0, ly: 0, rx: 0, ry: 0, prev: [], down: [], hitB: [], mode: 'menu', zoomAcc: 0 };
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
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
  }
  /** Gamepad -> the same virtual keys / mouse the rest of the game already understands. mode: 'sim' | 'god' | 'menu'. */
  pollPad(dt, mode) {
    const P = this.pad, list = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const p of list) if (p && p.connected) { gp = p; break; }
    const want = new Set(); P.connected = !!gp; P.mode = mode;
    if (gp) {
      const dz = (v) => (Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8), ax = (i) => dz(gp.axes[i] || 0), bt = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
      const cur = []; for (let i = 0; i < 17; i++) cur.push(bt(i)); P.hitB = cur.map((v, i) => v && !P.prev[i]); P.relB = cur.map((v, i) => !v && !!P.prev[i]); P.prev = cur; P.down = cur;
      P.lx = ax(0); P.ly = ax(1); P.rx = ax(2); P.ry = ax(3);
      if (cur.some(Boolean) || Math.hypot(P.lx, P.ly) > 0.4 || Math.hypot(P.rx, P.ry) > 0.4) this.padActive = true;
      if (this.padActive) {
        const st = 0.4; if (P.ly < -st) want.add('KeyW'); if (P.ly > st) want.add('KeyS'); if (P.lx < -st) want.add('KeyA'); if (P.lx > st) want.add('KeyD');
        if (cur[9]) want.add('Tab'); if (cur[8]) want.add('KeyP');
        if (mode === 'sim') {
          this.mouse.dx += P.rx * 1000 * dt; this.mouse.dy += P.ry * 800 * dt;
          if (cur[0]) want.add('KeyE'); if (cur[2] || cur[7]) want.add('KeyF'); if (cur[3]) want.add('KeyQ'); if (cur[1]) want.add('KeyG'); if (cur[5]) want.add('KeyV'); if (cur[4] || cur[10]) want.add('ShiftLeft'); if (cur[11]) want.add('KeyM');
        } else if (mode === 'god') {
          if (P.rx < -0.4) want.add('KeyQ'); if (P.rx > 0.4) want.add('KeyE'); if (cur[3]) want.add('KeyR'); if (cur[2]) want.add('KeyF'); if (cur[1]) want.add('Escape');
          P.zoomAcc += (P.ry + (cur[6] ? -1 : 0) + (cur[7] ? 1 : 0)) * dt * 9; while (Math.abs(P.zoomAcc) >= 1) { this.mouse.wheel += Math.sign(P.zoomAcc); P.zoomAcc -= Math.sign(P.zoomAcc); }
          this.mouse.x = 0.5; this.mouse.y = 0.5; const a = cur[0], was = !!this.padLeft;
          if (a && !was) this.mouse.down = true; if (!a && was) this.mouse.up = true; this.mouse.left = a; this.padLeft = a;
          if (cur[10]) want.add('ShiftLeft');
        } else { if (cur[0]) want.add('KeyE'); if (cur[1]) want.add('Escape'); }
      }
    } else { P.lx = P.ly = P.rx = P.ry = 0; P.hitB = []; P.relB = []; P.down = []; }
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
