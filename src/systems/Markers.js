import * as THREE from 'three';

/**
 * Where things are happening: a fight, a robbery, a fire, a film crew, a pig on the loose. Each marker shows on the
 * minimap / big map and as a floating icon over the spot (it follows a person if given one), until it times out.
 */
export class Markers {
  constructor(game) { this.game = game; this.list = []; this.tex = {}; }
  /** alive (optional): the marker goes as soon as it returns false (the fire's out, the fight's over). Without one it lasts at most 25 s. */
  add(x, z, icon, label, secs = 60, follow = null, alive = null) {
    const g = this.game, old = this.list.find((m) => m.follow && m.follow === follow); if (old) { old.until = g.elapsed + Math.min(secs, alive ? secs : 25); old.label = label; if (alive) old.alive = alive; return old; }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon(icon), depthTest: false, transparent: true })); sp.scale.set(3, 3, 1); sp.renderOrder = 30; g.scene.add(sp);
    const m = { x, z, icon, label, until: g.elapsed + (alive ? secs : Math.min(secs, 25)), follow, sp, alive }; this.list.push(m); return m;
  }
  icon(ch) {
    if (this.tex[ch]) return this.tex[ch]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = 'rgba(20,24,34,.85)'; x.beginPath(); x.arc(32, 28, 26, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#ffd23f'; x.lineWidth = 4; x.stroke();
    x.beginPath(); x.moveTo(24, 50); x.lineTo(40, 50); x.lineTo(32, 62); x.fillStyle = '#ffd23f'; x.fill(); x.font = '30px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 29);
    return (this.tex[ch] = new THREE.CanvasTexture(c));
  }
  update() {
    const g = this.game, cam = g.camera.position;
    for (const m of this.list) {
      const f = m.follow; if (f && !f.remove) { m.x = f.x; m.z = f.z; }
      if (g.elapsed > m.until || (f && f.remove) || (m.alive && !m.alive())) { g.scene.remove(m.sp); m.dead = true; continue; }
      const d = Math.hypot(cam.x - m.x, cam.z - m.z), s = Math.max(2.4, d * 0.045); m.sp.scale.set(s, s, 1); m.sp.position.set(m.x, 4 + s * 0.6 + Math.sin(g.elapsed * 3) * 0.3, m.z);
      m.sp.visible = d > 6;   // not right on top of you
    }
    this.list = this.list.filter((m) => !m.dead);
  }
}
