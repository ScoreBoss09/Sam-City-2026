import * as THREE from 'three';
import { UNIT, WALL_H, WALL_T } from '../config.js';
import { facadeMaterial } from '../render/Textures.js';
import { Sfx } from '../core/Sfx.js';
import { pick } from '../util.js';

/**
 * Windows break. A bullet that stops in a wall where a window is (the painted panes of any facade, or a shop's long
 * display window) shatters it: a shower of glass, a crash, and a jagged hole with cracks running out from it, seen from
 * both sides. Grenades blow out the windows round them. A day or so later the glazier has been, when nobody's looking.
 */
let _tex = null;
function smashTexture() {
  if (_tex) return _tex; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const pts = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 26 + ((i * 37) % 19); pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]); }
  x.fillStyle = 'rgba(8,10,14,.82)'; x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill();   // the hole
  x.strokeStyle = 'rgba(235,245,255,.9)'; x.lineWidth = 1.6;
  for (const [px, py] of pts) { x.beginPath(); x.moveTo(px, py); const a = Math.atan2(py - 64, px - 64); let qx = px, qy = py; for (let k = 0; k < 3; k++) { qx += Math.cos(a + (k % 2 ? 0.4 : -0.3)) * 14; qy += Math.sin(a + (k % 2 ? 0.4 : -0.3)) * 14; x.lineTo(qx, qy); } x.stroke(); }   // cracks running out to the frame
  x.lineWidth = 1; for (let r = 34; r < 64; r += 13) { x.beginPath(); x.arc(64, 64, r, 0, Math.PI * 2); x.stroke(); }
  _tex = new THREE.CanvasTexture(c); _tex.colorSpace = THREE.SRGBColorSpace; return _tex;
}
const COS = [1, 0, -1, 0], SIN = [0, 1, 0, -1];

export class Glass {
  constructor(game) { this.game = game; this.broken = []; this.t = 0; this.mat = null; }
  /** The window (if any) at height y, u metres along face f (0 front, 1 back, 2 left, 3 right) of building b: its rectangle on that face. */
  windowAt(b, f, u, y) {
    const def = b.def, W = def.w * UNIT, D = def.d * UNIT, floors = Math.max(1, def.floors || 1), fl = Math.floor(y / WALL_H), yy = y - fl * WALL_H, ext = b.ext; if (fl < 0 || fl >= floors || !ext) return null;
    if (f === 0 && fl === 0) {   // the front: shop windows, and nothing over the door
      const lx = u - W / 2; if (ext.door && lx > ext.door[0] - 0.1 && lx < ext.door[1] + 0.1) return null;
      if (ext.shopWins && ext.shopWins.length) { const i = ext.shopWins.findIndex(([a, c]) => lx > a && lx < c); if (i < 0 || yy < 0.55 || yy > 2.15) return null; const [a, c] = ext.shopWins[i]; return { k: 's' + i, fl, u0: a + W / 2, u1: c + W / 2, y0: 0.55, y1: 2.15 }; }
    }
    const holes = facadeMaterial(def.wall).userData.holes; if (!holes || !holes.length) return null;
    const k = Math.floor(u / 4), px = (u - k * 4) / 4 * 64, row = (1 - yy / WALL_H) * 52;
    for (const [hx, hy, hw, hh] of holes) if (px >= hx && px <= hx + hw && row >= hy && row <= hy + hh) return { k: k + ':' + hx + ':' + hy, fl, u0: k * 4 + hx / 16, u1: k * 4 + (hx + hw) / 16, y0: (1 - (hy + hh) / 52) * WALL_H, y1: (1 - hy / 52) * WALL_H };
    return null;
  }
  /** A shot (or a blast) reached point e on a wall, going along d. True if it broke (or went through) a window. */
  hit(e, d, by = null) {
    const g = this.game, B = g.buildings, b = B.buildingAtPoint(e.x + d.x * 0.25, e.z + d.z * 0.25) || B.buildingAtPoint(e.x - d.x * 0.25, e.z - d.z * 0.25);
    if (!b || !b.ext || b.def.park || b.def.special || b.ext.shell || b.def.special_ext || b.burning) return false;
    const c = COS[b.rot], s = SIN[b.rot], dx = e.x - b.cx, dz = e.z - b.cz, lx = dx * c - dz * s, lz = dx * s + dz * c, W = b.def.w * UNIT, D = b.def.d * UNIT;
    const near = [[D / 2 - lz, 0], [lz + D / 2, 1], [lx + W / 2, 2], [W / 2 - lx, 3]].map(([q, f]) => [Math.abs(q), f]).sort((a, q) => a[0] - q[0]); if (near[0][0] > 0.8) return false;
    const f = near[0][1], u = f < 2 ? lx + W / 2 : lz + D / 2, w = this.windowAt(b, f, u, e.y); if (!w) return false;
    const key = `${f}:${w.fl}:${w.k}`; b.smashed = b.smashed || new Set(); if (b.smashed.has(key)) return true; b.smashed.add(key);
    // the hole, at the glass in the middle of the wall, seen from inside and out
    const mat = this.mat || (this.mat = new THREE.MeshBasicMaterial({ map: smashTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w.u1 - w.u0, w.y1 - w.y0), mat), mid = (w.u0 + w.u1) / 2, y = w.fl * WALL_H + (w.y0 + w.y1) / 2, o = WALL_T / 2 - 0.03;
    if (f === 0) m.position.set(mid - W / 2, y, D / 2 - o); else if (f === 1) { m.position.set(mid - W / 2, y, -D / 2 + o); m.rotation.y = Math.PI; }
    else if (f === 2) { m.position.set(-W / 2 + o, y, mid - D / 2); m.rotation.y = -Math.PI / 2; } else { m.position.set(W / 2 - o, y, mid - D / 2); m.rotation.y = Math.PI / 2; }
    m.renderOrder = 2; b.ext.group.add(m);
    g.particles.burst(e.x - d.x * 0.3, e.y, e.z - d.z * 0.3, 0xd8eef8, 16, 2.4, 2.2, 0.05);
    const P = g.player, dist = Math.hypot(P.x - e.x, P.z - e.z); if (dist < 60) { const v = Math.max(0.15, 1 - dist / 60); Sfx.noise(0.35, { freq: 2800, vol: 0.3 * v, type: 'highpass' }); for (let i = 0; i < 4; i++) Sfx.tone(2400 + Math.random() * 1800, 0.06, { type: 'sine', vol: 0.03 * v, delay: 0.08 + i * 0.07 }); }
    for (const q of g.population.sims) if (q.inside === b && !(q.down > 0) && q.mesh.visible && Math.random() < 0.5) { g.social.say(q, pick(['My window!', 'What the...!', 'Who did that?!', 'Get down!']), 2); break; }
    if (by === 'sam' && g.crime && !(g.combat && g.combat.on) && b.def.cat === 'res') b.residents.forEach((r) => { r.moodBoost -= 0.1; });
    this.broken.push({ b, key, m, at: g.clock.totalDays * 24 + g.clock.hour });
    return true;
  }
  /** A blast at p: the windows facing it within range go. */
  blast(p, r = 9) { const d = new THREE.Vector3(), o = { x: p.x, y: (p.y || 0) + 1.4, z: p.z }, C = this.game.combat; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; d.set(Math.sin(a), 0, Math.cos(a)); const t = C.rayWall(o, d, r); if (t < r) this.hit({ x: o.x + d.x * t, y: o.y, z: o.z + d.z * t }, d, null); } }
  /** The glazier: windows broken a day ago are fixed, out of sight. */
  update(dt) {
    if ((this.t -= dt) > 0 || !this.broken.length) return; this.t = 5; const g = this.game, now = g.clock.totalDays * 24 + g.clock.hour, P = g.player;
    this.broken = this.broken.filter((w) => { const gone = !w.b.ext || !w.m.parent; if (!gone && (now - w.at < 20 || (g.mode === 'sim' && Math.hypot(P.x - w.b.cx, P.z - w.b.cz) < 35))) return true; if (w.m.parent) w.m.parent.remove(w.m); w.m.geometry.dispose(); if (w.b.smashed) w.b.smashed.delete(w.key); return false; });
  }
}
