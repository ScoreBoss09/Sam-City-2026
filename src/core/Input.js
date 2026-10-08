/** Keyboard / mouse state. In Unity: wrap the Input System actions with the same surface. */
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set(); this.released = new Set(); this.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, middle: false, wheel: 0, down: false, up: false };
    this.canvas = canvas; this.locked = false; this.blocked = false;
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
  down(k) { return this.keys.has(k); }
  hit(k) { return this.pressed.has(k); }
  lock() { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* headless */ } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  endFrame() { this.pressed.clear(); this.released.clear(); this.mouse.dx = this.mouse.dy = 0; this.mouse.wheel = 0; this.mouse.down = this.mouse.up = false; }
}
