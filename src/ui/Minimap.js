import { MAP, TILE } from '../config.js';
import { T } from '../world/World.js';
import { ICON } from '../data/icons.js';

const TERRAIN = { [T.WATER]: '#2b628f', [T.LAND]: '#5a8f45', [T.FOREST]: '#2f5a2c', [T.SAND]: '#d2bf86' };
const CAT = { res: '#c9a76a', prod: '#a9c46a', civic: '#d8d4ca', com: '#7aaed6', ind: '#9c7258', util: '#8e98a4', park: '#6fb85f', special: '#4b515c' };
// the ring round a building's pin says what kind of place it is
const RING = { Food: '#ff9f43', Commerce: '#4fb3ff', Civic: '#f1ede4', Industry: '#c98a5e', Transport: '#a78bfa', Homes: '#7be08f', park: '#7ccf6a', util: '#9aa4b0' };
const KIND = { Food: 'Food & drink', Commerce: 'Shops & services', Civic: 'Civic', Industry: 'Work & industry', Transport: 'Transport', park: 'Parks', util: 'Utilities', Homes: 'Homes' };
const NO_PIN = new Set(['billboard', 'lamp']);
const ringOf = (def) => RING[def.tab] || RING[def.cat] || '#d8d4ca';
const kindOf = (def) => KIND[def.tab] || KIND[def.cat] || 'Other';

/**
 * North-up minimap in the corner (Sam's view), and the whole-island map (M / R3, also from the planning view) with a pin
 * for every place in town, a pin for everything going on, and a key down the side.
 */
export class Minimap {
  constructor(game) {
    this.game = game; this.el = document.getElementById('minimap'); this.cv = this.el.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.base = document.createElement('canvas'); this.base.width = this.base.height = MAP * 12; this.bctx = this.base.getContext('2d'); this.baseT = 0; this.big = false; this.dirty = true; this.drawT = 0; this.pins = {};
    this.legend = document.createElement('div'); this.legend.className = 'mm-legend'; this.el.appendChild(this.legend); this.legendT = 0;
    const hint = this.el.querySelector('.mm-hint'); if (hint) hint.remove();
    const mark = () => { this.dirty = true; }; const ev = game.world.events; for (const e of ['tile', 'building:added', 'building:removed', 'building:done']) ev.on(e, mark);
  }
  drawBase() {
    const g = this.game, w = g.world, x = this.bctx, s = 12;
    for (let tz = 0; tz < MAP; tz++) for (let tx = 0; tx < MAP; tx++) {
      const i = w.idx(tx, tz); x.fillStyle = TERRAIN[w.terrain[i]] || TERRAIN[T.LAND]; x.fillRect(tx * s, tz * s, s, s);
      if (w.road[i]) { x.fillStyle = w.road[i] === 2 ? '#9aa0a8' : '#b8946a'; x.fillRect(tx * s + 2, tz * s + 2, s - 4, s - 4); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.inBounds(tx + dx, tz + dz) && w.road[w.idx(tx + dx, tz + dz)]) x.fillRect(tx * s + 2 + dx * 3, tz * s + 2 + dz * 3, s - 4, s - 4); }
    }
    for (const p of g.roadPlans.plans.values()) { x.strokeStyle = '#ffe1a0'; x.lineWidth = 1.5; x.setLineDash([3, 3]); x.strokeRect(p.x * s + 2, p.z * s + 2, s - 4, s - 4); x.setLineDash([]); }
    for (const b of g.buildings.list) {
      x.fillStyle = b.state === 'site' ? 'rgba(255,210,63,.45)' : (CAT[b.def.cat] || '#ccc'); x.fillRect(b.x0 * s + 1.5, b.z0 * s + 1.5, b.w * s - 3, b.d * s - 3);
      x.strokeStyle = b.state === 'site' ? '#ffd23f' : 'rgba(0,0,0,.55)'; x.lineWidth = 1.5; x.strokeRect(b.x0 * s + 1.5, b.z0 * s + 1.5, b.w * s - 3, b.d * s - 3);
    }
  }
  /** A round map pin: the icon on a dark disc with a coloured ring (cached per icon, ring and size). */
  pin(icon, ring, px, alert = false) {
    const k = icon + ring + px + alert; if (this.pins[k]) return this.pins[k];
    const c = document.createElement('canvas'), n = Math.ceil(px * 2 + 6); c.width = c.height = n; const x = c.getContext('2d'), r = px, m = n / 2;
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 3; x.shadowOffsetY = 1;
    x.fillStyle = alert ? '#3a0d0d' : '#141a26'; x.beginPath(); x.arc(m, m, r, 0, Math.PI * 2); x.fill(); x.shadowColor = 'transparent';
    x.lineWidth = Math.max(1.5, r * 0.18); x.strokeStyle = ring; x.beginPath(); x.arc(m, m, r - x.lineWidth / 2, 0, Math.PI * 2); x.stroke();
    x.font = `${Math.round(r * 1.12)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(icon, m, m + r * 0.06);
    return (this.pins[k] = c);
  }
  /** Size the canvas to what's on screen (crisp pins at any size). */
  fit() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), n = Math.max(200, Math.round(Math.min(r.width, r.height) * dpr));
    if (this.cv.width !== n) { this.cv.width = this.cv.height = n; } this.dpr = n / Math.max(1, Math.min(r.width, r.height) || n);
  }
  update(dt) {
    const g = this.game, inp = g.input;
    if (g.started && !g.ending && inp.hit('KeyM') && !g.ui.modalOpen) { this.big = !this.big; this.el.classList.toggle('big', this.big); this.fit(); this.legendT = 0; this.drawT = 0; }
    if (this.big && inp.hit('Escape')) { this.big = false; this.el.classList.remove('big'); this.fit(); }
    const show = g.started && !g.ending && (g.mode === 'sim' || this.big); this.el.classList.toggle('hidden', !show); if (!show) return;
    // the map picture only changes when the town does; the pins are redrawn ~10 times a second (not every frame)
    this.baseT -= dt; if (this.dirty || this.baseT <= 0) { this.dirty = false; this.baseT = 4; this.drawBase(); }
    if (this.big && (this.legendT -= dt) <= 0) { this.legendT = 1.5; this.drawLegend(); }
    this.drawT -= dt; if (this.drawT > 0) return; this.drawT = this.big ? 0.12 : 0.08; this.fit();
    const c = this.ctx, W = this.cv.width, H = this.cv.height, p = g.player, S = 12, k = this.dpr || 1;   // k: canvas px per screen px
    const scale = this.big ? W / (MAP * S) : W / 200;   // canvas px per base px (the corner map shows about 130 m across)
    const centre = g.mode === 'sim' ? p : g.god.target;
    const toScreen = (wx, wz) => this.big ? [wx / TILE * S * scale, wz / TILE * S * scale] : [W / 2 + (wx - centre.x) / TILE * S * scale, H / 2 + (wz - centre.z) / TILE * S * scale];
    const onMap = (sx, sy, m = 0) => sx > -m && sy > -m && sx < W + m && sy < H + m;
    c.fillStyle = '#1d4466'; c.fillRect(0, 0, W, H); c.imageSmoothingEnabled = false;
    const [ox, oy] = toScreen(0, 0); c.drawImage(this.base, ox, oy, MAP * S * scale, MAP * S * scale); c.imageSmoothingEnabled = true;
    // people: small dots (raiders in red)
    const dot = (wx, wz, col, r) => { const [sx, sy] = toScreen(wx, wz); if (!onMap(sx, sy, 4)) return; c.fillStyle = col; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill(); };
    for (const s of g.population.sims) { if (s.hidden || s.remove || (s.inside && !s.inside.def.open)) continue; dot(s.x, s.z, s.kind === 'raider' ? '#ff3b3b' : s.kind === 'security' ? '#6f8ff0' : 'rgba(255,255,255,.75)', (s.kind === 'raider' ? 3 : 1.6) * k); }
    for (const it of g.tools.untaken) dot(it.x, it.z, '#ffb02e', 3 * k);
    // places: a pin for every building that isn't a house (Sam's own home gets one), and a crane on each building site
    const pr = (this.big ? 12 : 8) * k;
    for (const b of g.buildings.list) {
      const home = b === g.starterHome, site = b.state === 'site';
      if (!site && (b.state !== 'done' || (b.def.cat === 'res' && !home) || NO_PIN.has(b.id))) continue;
      const [sx, sy] = toScreen(b.cx, b.cz); if (!onMap(sx, sy, pr)) continue;
      const img = this.pin(home ? '🏠' : site ? '🏗️' : ICON[b.id] || '📍', home ? RING.Homes : site ? '#ffd23f' : ringOf(b.def), Math.round(site ? pr * 0.8 : pr));
      c.drawImage(img, sx - img.width / 2, sy - img.height / 2);
    }
    // what's going on: incident pins with a red ring and a slow pulse
    if (g.markers) for (const mk of g.markers.list) {
      const [sx, sy] = toScreen(mk.x, mk.z); if (!onMap(sx, sy, pr)) continue; const img = this.pin(mk.icon, '#ff5a4a', Math.round(pr * 1.1), true), a = 0.5 + Math.sin(performance.now() / 260) * 0.5;
      c.save(); c.globalAlpha = 0.35 * a; c.fillStyle = '#ff5a4a'; c.beginPath(); c.arc(sx, sy, pr * (1.5 + a * 0.4), 0, Math.PI * 2); c.fill(); c.restore();
      c.drawImage(img, sx - img.width / 2, sy - img.height / 2);
    }
    // the objective (clamped to the edge)
    const t = g.story.target();
    if (t) {
      let [sx, sy] = toScreen(t.x, t.z); const m = 10 * k, inside = sx > m && sy > m && sx < W - m && sy < H - m;
      if (!inside) { const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy, q = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6)); sx = cx + dx * q; sy = cy + dy * q; }
      const pulse = (4 + Math.sin(performance.now() / 180) * 1.2) * k; c.fillStyle = '#ffd23f'; c.strokeStyle = '#3a2a00'; c.lineWidth = 1.5 * k;
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? pulse : pulse * 2.1; c.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    }
    // Sam: an arrow pointing the way he's looking
    { const [px, py] = toScreen(p.x, p.z); c.save(); c.translate(px, py); c.rotate(-(g.mode === 'sim' ? Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw)) : p.heading) + Math.PI); c.scale(k * (this.big ? 1.3 : 1.1), k * (this.big ? 1.3 : 1.1));
      c.fillStyle = '#ff8a2a'; c.strokeStyle = '#111'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `700 ${Math.round(12 * k)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText('N', W / 2, 5 * k);
  }
  /** The key beside the island map: what's happening now, then every kind of place in town. */
  drawLegend() {
    const g = this.game, row = (icon, ring, name, n, cls = '') => `<div class="mm-row ${cls}"><span class="mm-pin" style="--ring:${ring}">${icon}</span><span class="mm-name">${name}</span>${n > 1 ? `<span class="mm-n">${n}</span>` : ''}</div>`;
    let h = '<div class="mm-title">Sam City</div>';
    const now = (g.markers ? g.markers.list : []); if (now.length) { h += '<div class="mm-head">Happening now</div>'; for (const m of now.slice(0, 8)) h += row(m.icon, '#ff5a4a', m.label, 0, 'alert'); }
    const groups = new Map();
    for (const b of g.buildings.list) { if (b.state !== 'done' || (b.def.cat === 'res' && b !== g.starterHome) || NO_PIN.has(b.id)) continue; const kd = b === g.starterHome ? 'Homes' : kindOf(b.def); if (!groups.has(kd)) groups.set(kd, new Map()); const m = groups.get(kd), key = b === g.starterHome ? '_home' : b.id; m.set(key, (m.get(key) || 0) + 1); }
    const sites = g.buildings.list.filter((b) => b.state === 'site').length;
    for (const kd of ['Homes', 'Food & drink', 'Shops & services', 'Civic', 'Transport', 'Work & industry', 'Parks', 'Utilities', 'Other']) {
      const m = groups.get(kd); if (!m) continue; h += `<div class="mm-head">${kd}</div>`;
      for (const [id, n] of m) { if (id === '_home') { h += row('🏠', RING.Homes, 'Your home', 0); continue; } const def = g.buildings.list.find((b) => b.id === id).def; h += row(ICON[id] || '📍', ringOf(def), def.name, n); }
    }
    if (sites) { h += '<div class="mm-head">Being built</div>' + row('🏗️', '#ffd23f', 'Building sites', sites); }
    if (this.legend.dataset.h !== h) { this.legend.dataset.h = h; this.legend.innerHTML = h; }
  }
}
