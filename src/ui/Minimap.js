import { MAP, TILE } from '../config.js';
import { T } from '../world/World.js';

const TERRAIN = { [T.WATER]: '#2f6fa8', [T.LAND]: '#5f9a48', [T.FOREST]: '#2f5f2c', [T.SAND]: '#d9c58a' };
const CAT = { res: '#e0b36a', prod: '#b4d06a', civic: '#e6e2d8', com: '#7fb6e0', ind: '#b07a5a', util: '#9aa4b0', park: '#7ccf6a', special: '#555b66' };

/** North-up minimap for sim mode (M / R3 toggles the whole-island view). */
export class Minimap {
  constructor(game) {
    this.game = game; this.el = document.getElementById('minimap'); this.cv = this.el.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.base = document.createElement('canvas'); this.base.width = this.base.height = MAP * 6; this.bctx = this.base.getContext('2d'); this.baseT = 0; this.big = false;
  }
  drawBase() {
    const g = this.game, w = g.world, x = this.bctx, s = 6;
    for (let tz = 0; tz < MAP; tz++) for (let tx = 0; tx < MAP; tx++) {
      const i = w.idx(tx, tz); x.fillStyle = TERRAIN[w.terrain[i]] || '#5f9a48'; x.fillRect(tx * s, tz * s, s, s);
      if (w.road[i]) { x.fillStyle = w.road[i] === 2 ? '#8d939b' : '#b08a5a'; x.fillRect(tx * s, tz * s, s, s); }
    }
    for (const p of g.roadPlans.plans.values()) { x.strokeStyle = '#ffe1a0'; x.setLineDash([2, 2]); x.strokeRect(p.x * s + 1, p.z * s + 1, s - 2, s - 2); x.setLineDash([]); }
    for (const b of g.buildings.list) {
      x.fillStyle = b.state === 'site' ? 'rgba(255,210,63,.55)' : (CAT[b.def.cat] || '#ccc'); x.fillRect(b.x0 * s + 1, b.z0 * s + 1, b.w * s - 2, b.d * s - 2);
      x.strokeStyle = b.state === 'site' ? '#ffd23f' : 'rgba(0,0,0,.6)'; x.lineWidth = 1; x.strokeRect(b.x0 * s + 0.5, b.z0 * s + 0.5, b.w * s - 1, b.d * s - 1);
    }
  }
  update(dt) {
    const g = this.game, show = g.started && g.mode === 'sim' && !g.ending; this.el.classList.toggle('hidden', !show); if (!show) return;
    if (g.input.hit('KeyM')) { this.big = !this.big; this.el.classList.toggle('big', this.big); }
    this.baseT -= dt; if (this.baseT <= 0) { this.baseT = 1; this.drawBase(); }
    const c = this.ctx, W = this.cv.width, H = this.cv.height, p = g.player, S = 6;
    const scale = this.big ? W / (MAP * S) : 2.0;   // canvas px per base px
    const toScreen = (wx, wz) => this.big ? [wx / TILE * S * scale, wz / TILE * S * scale] : [W / 2 + (wx - p.x) / TILE * S * scale, H / 2 + (wz - p.z) / TILE * S * scale];
    c.fillStyle = '#1d4e7d'; c.fillRect(0, 0, W, H); c.imageSmoothingEnabled = false;
    const [ox, oy] = toScreen(0, 0); c.drawImage(this.base, ox, oy, MAP * S * scale, MAP * S * scale);
    const dot = (wx, wz, col, r) => { const [sx, sy] = toScreen(wx, wz); if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) return; c.fillStyle = col; c.fillRect(sx - r, sy - r, r * 2, r * 2); };
    for (const s of g.population.sims) { if (s.hidden || s.remove || (s.inside && !s.inside.def.open)) continue; dot(s.x, s.z, s.kind === 'raider' ? '#ff3030' : s.kind === 'security' ? '#5a7ad8' : '#ffffff', s.kind === 'raider' ? 2.5 : 1.5); }
    for (const it of g.tools.untaken) dot(it.x, it.z, '#ffb02e', 2);
    // objective marker (clamped to the edge with a little arrow)
    const o = g.story.currentObjective, t = o && o.target ? o.target(g) : null;
    if (t) {
      let [sx, sy] = toScreen(t.x, t.z); const m = 8, inside = sx > m && sy > m && sx < W - m && sy < H - m;
      if (!inside) { const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6)); sx = cx + dx * k; sy = cy + dy * k; }
      const pulse = 3 + Math.sin(performance.now() / 180) * 1.2; c.fillStyle = '#ffd23f'; c.strokeStyle = '#3a2a00'; c.lineWidth = 1.5;
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? pulse : pulse * 2.1; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    }
    // Sam
    const [px, py] = toScreen(p.x, p.z); c.save(); c.translate(px, py); c.rotate(-p.heading + Math.PI);
    c.fillStyle = '#ff8a2a'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2.5); c.lineTo(-5, 5); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.font = 'bold 10px monospace'; c.fillText('N', W / 2 - 3, 11);
  }
}
