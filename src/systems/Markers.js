import * as THREE from 'three';

/**
 * Where things are happening: a fight, a robbery, a fire, a film crew, a pig on the loose. Each marker shows on the
 * minimap / big map and as a floating icon over the spot (it follows a person if given one), and goes the moment the
 * thing is over (the alive check), or after 25 s for a passing moment with no check.
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
    x.fillStyle = 'rgba(58,13,13,.92)'; x.beginPath(); x.arc(32, 28, 25, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#ff5a4a'; x.lineWidth = 4; x.stroke();   // the same pin as on the map
    x.beginPath(); x.moveTo(25, 51); x.lineTo(39, 51); x.lineTo(32, 62); x.fillStyle = '#ff5a4a'; x.fill(); x.font = '28px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 30);
    return (this.tex[ch] = new THREE.CanvasTexture(c));
  }
  /** Ongoing events that don't place their own marker get one each, for exactly as long as they last. */
  watch() {
    const g = this.game, C = g.celebrations, R = g.raids, E = g.events, live = (r) => !r.captured && !r.remove;
    const W = [
      ['raid', () => R && R.state === 'active' && R.raiders.some(live), () => { const s = R.raiders.find(live); return [s.x, s.z, s]; }, '⚔️', 'Raiders'],
      ['wed', () => C && C.wed && C.wed.live, () => [C.wed.church.cx, C.wed.church.cz], '💒', 'Wedding'],
      ['bonfire', () => C && C.bonfire && C.bonfire.live, () => [C.bonfire.x, C.bonfire.z], '🎆', 'Bonfire Night'],
      ['market', () => C && !!C.market, () => [C.market.x, C.market.z], '🧺', 'Market day'],
      ['fete', () => E && !!E.fete, () => [E.fete.x, E.fete.z], '🎪', 'Village fête'],
    ];
    for (const [key, on, where, icon, label] of W) {
      if (this.list.some((m) => m.key === key) || !on()) continue;
      const [x, z, follow] = where(), m = this.add(x, z, icon, label, 3600, follow || null, () => !!on()); m.key = key;
    }
  }
  update() {
    const g = this.game, cam = g.camera.position; if ((this.wt = (this.wt || 0) - 1) <= 0) { this.wt = 30; this.watch(); }
    for (const m of this.list) {
      const f = m.follow; if (f && !f.remove) { m.x = f.x; m.z = f.z; }
      if (g.elapsed > m.until || (f && f.remove) || (m.alive && !m.alive())) { g.scene.remove(m.sp); m.sp.material.dispose(); m.dead = true; continue; }
      const d = Math.hypot(cam.x - m.x, cam.z - m.z), s = Math.max(2.4, d * 0.045); m.sp.scale.set(s, s, 1); m.sp.position.set(m.x, 4 + s * 0.6 + Math.sin(g.elapsed * 3) * 0.3, m.z);
      m.sp.visible = d > 6;   // not right on top of you
    }
    this.list = this.list.filter((m) => !m.dead);
  }
}
