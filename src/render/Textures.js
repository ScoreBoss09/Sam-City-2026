import * as THREE from 'three';
import { FACADES } from '../data/buildings.js';
import { mulberry32 } from '../util.js';
import { Assets } from './Assets.js';

const FACADE_PACK = { brick: 'wall_brick', tan: 'wall_tan', grey: 'wall_grey', civic: 'wall_civic', industrial: 'wall_industrial', white: 'wall_white', timber: 'wall_planks', stone: 'wall_stone', logs: 'wall_logs', tudor: 'wall_stucco' };
const OLD_WINDOWS = ['stone', 'tudor', 'timber', 'logs', 'industrial'];

/** Procedural pixel-art textures. In Unity: import as sprites/textures with Point filtering. */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(canvas, repeat = false, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const col = (hex) => new THREE.Color(hex);
function noiseFill(ctx, w, h, hex, amt, rnd) {
  const c = col(hex); const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const d = (rnd() - 0.5) * amt;
    img.data[i * 4] = Math.max(0, Math.min(255, c.r * 255 + d));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, c.g * 255 + d));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, c.b * 255 + d));
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

const facadeCache = {};
const facadeMats = [];
/** Facade texture covers 4m wide x one storey (3.2m). 16px per metre. */
export function facadeMaterial(style) {
  if (facadeCache[style]) return facadeCache[style];
  const f = FACADES[style] || FACADES.tan; const W = 64, H = 52; const rnd = mulberry32(style.length * 977 + style.charCodeAt(0));
  const c = mk(W, H), ctx = c.getContext('2d'); const e = mk(W, H), ex = e.getContext('2d');
  noiseFill(ctx, W, H, f.base, 14, rnd); ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
  const packTile = Assets.has(FACADE_PACK[style]) && f.kind !== 'curtain' ? Assets.img(FACADE_PACK[style]) : null;
  ctx.imageSmoothingEnabled = false;
  if (packTile) {
    ctx.drawImage(packTile, 0, 0, 64, 52, 0, 0, W, H);
    if (f.kind === 'tudor') { ctx.fillStyle = f.line; ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3); ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H); ctx.fillRect(W / 2 - 1, 0, 3, H); ctx.fillRect(0, H / 2 - 1, W, 3); for (let i = 0; i < 24; i++) { ctx.fillRect(3 + i, 3 + i, 2, 2); ctx.fillRect(W - 5 - i, 3 + i, 2, 2); } }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, H - 2, W, 2); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(0, 0, W, 1);
  } else {
  ctx.fillStyle = f.line;
  if (f.kind === 'bricks') { for (let y = 0; y < H; y += 4) { ctx.fillRect(0, y, W, 1); for (let x = (y / 4) % 2 ? 0 : 4; x < W; x += 8) ctx.fillRect(x, y, 1, 4); } }
  else if (f.kind === 'planks') { for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 1); }
  else if (f.kind === 'corrugated') { for (let x = 0; x < W; x += 3) ctx.fillRect(x, 0, 1, H); }
  else if (f.kind === 'logs') {
    for (let y = 0; y < H; y += 6) { ctx.fillStyle = f.line; ctx.fillRect(0, y, W, 1); ctx.fillStyle = 'rgba(255,220,160,.22)'; ctx.fillRect(0, y + 1, W, 1); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, y + 4, W, 2);
      for (let x = (y / 6) % 2 ? 6 : 14; x < W; x += 22) { ctx.fillStyle = f.line; ctx.fillRect(x, y + 1, 1, 4); } }
  }
  else if (f.kind === 'stones') {
    ctx.fillStyle = f.line; for (let y = 0; y < H; y += 7) { ctx.fillRect(0, y, W, 1); let x = (y / 7) % 2 ? 3 : 0; while (x < W) { const w = 8 + (rnd() * 8 | 0); ctx.fillRect(x, y, 1, 7); ctx.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},.08)`; ctx.fillRect(x + 1, y + 1, w - 1, 5); ctx.fillStyle = f.line; x += w; } }
  }
  else if (f.kind === 'tudor') {
    ctx.fillStyle = f.line; ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3); ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H); ctx.fillRect(W / 2 - 1, 0, 3, H); ctx.fillRect(0, H / 2 - 1, W, 3);
    for (let i = 0; i < 24; i++) { ctx.fillRect(3 + i, 3 + i, 2, 2); ctx.fillRect(W - 5 - i, 3 + i, 2, 2); }
    ctx.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 60; i++) ctx.fillRect(rnd() * W | 0, rnd() * H | 0, 2, 1);
  }
  else { for (let i = 0; i < 40; i++) ctx.fillRect(rnd() * W | 0, rnd() * H | 0, 2, 1); }
  }
  const lit = () => rnd() > 0.3;
  if (f.kind === 'curtain') {
    for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) {
      const x = gx * 16, y = 2 + gy * 16;
      ctx.fillStyle = rnd() > 0.5 ? '#4f93b8' : '#5aa4c9'; ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 2, y + 2, 5, 2);
      if (lit()) { ex.fillStyle = '#ffd98a'; ex.fillRect(x + 2, y + 2, 12, 12); }
    }
    ctx.fillStyle = f.frame; for (let gx = 0; gx <= 4; gx++) ctx.fillRect(Math.min(gx * 16, W - 1), 0, 1, H);
    for (let gy = 0; gy < 4; gy++) ctx.fillRect(0, 1 + gy * 16, W, 1);
  } else {
    const n = f.wins; const ww = f.kind === 'logs' ? 16 : n === 1 ? 44 : (f.kind === 'tudor' ? 14 : 18); const xs = n === 2 ? (f.kind === 'tudor' ? [9, 41] : [7, 39]) : n === 1 ? [Math.round((64 - ww) / 2)] : [];
    for (const x of xs) {
      const y = 12, h = 26;
      const ws = Assets.has('win_modern') ? Assets.img(OLD_WINDOWS.includes(style) ? 'win_old' : 'win_modern') : null;
      if (ws) { ctx.fillStyle = '#1b2733'; ctx.fillRect(x, y, ww, h); ctx.drawImage(ws, x - 2, y - 3, ww + 4, h + 8); if (lit()) { ex.fillStyle = '#ffcf70'; ex.fillRect(x + 1, y + 1, ww - 2, h - 1); } continue; }
      ctx.fillStyle = f.frame; ctx.fillRect(x - 2, y - 2, ww + 4, h + 4);
      ctx.fillStyle = f.win; ctx.fillRect(x, y, ww, h);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, ww, 3);
      ctx.fillStyle = f.frame; ctx.fillRect(x + (ww >> 1), y, 1, h); ctx.fillRect(x, y + (h >> 1), ww, 1);
      ctx.fillRect(x - 3, y + h + 2, ww + 6, 2);
      if (lit()) { ex.fillStyle = '#ffcf70'; ex.fillRect(x, y, ww, h); ex.fillStyle = '#000'; ex.fillRect(x + (ww >> 1), y, 1, h); ex.fillRect(x, y + (h >> 1), ww, 1); }
    }
  }
  const mat = new THREE.MeshStandardMaterial({
    map: tex(c, true), emissiveMap: tex(e, true), emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.92, metalness: 0,
  });
  facadeCache[style] = mat; facadeMats.push(mat); return mat;
}
export function setWindowGlow(v) { for (const m of facadeMats) m.emissiveIntensity = v; }

let _water;
export function waterTexture() {
  if (_water) return _water;
  if (Assets.has('water')) { _water = Assets.tex('water', 62, 62); return _water; } const c = mk(32, 32), ctx = c.getContext('2d'); const rnd = mulberry32(7);
  noiseFill(ctx, 32, 32, '#1d4d8f', 16, rnd); ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 26; i++) { ctx.fillRect(rnd() * 28 | 0, rnd() * 32 | 0, 3 + (rnd() * 3 | 0), 1); }
  _water = tex(c, true); _water.repeat.set(60, 60); return _water;
}

/** Text sign texture. */
const signCache = {};
export function signTexture(text, bg = '#16222f', fg = '#ffffff') {
  const k = text + bg; if (signCache[k]) return signCache[k];
  const c = mk(128, 32), ctx = c.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 32);
  ctx.strokeStyle = '#d6dde6'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 126, 30);
  ctx.fillStyle = fg; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 64, 17, 120); return (signCache[k] = tex(c));
}

const roofCache = {};
/** Tinted roof material: kind = tiles | thatch | slate | gravel. Texture is greyscale, colour comes from the tint. */
/** All roof materials made so far (the seasons dust them with snow). */
export function allRoofMaterials() { return Object.values(roofCache); }
export function roofMaterial(color, kind = 'tiles') {
  const k = color + kind; if (roofCache[k]) return roofCache[k];
  if (Assets.ok) {
    const c3 = new THREE.Color(color), warm = c3.r > c3.b * 1.15, name = kind === 'thatch' ? 'roof_thatch' : kind === 'gravel' ? 'roof_gravel' : kind === 'slate' ? (c3.b > c3.r ? 'roof_tiles_blue' : 'roof_tiles_grey') : (warm ? 'roof_tiles_red' : 'roof_tiles_grey');
    if (Assets.has(name)) { const tint = new THREE.Color(0xffffff).lerp(c3, kind === 'thatch' ? 0.28 : 0.38); return (roofCache[k] = new THREE.MeshStandardMaterial({ color: tint, map: Assets.tex(name), roughness: 0.95, flatShading: true, side: THREE.DoubleSide })); }
  }
  const c = mk(32, 32), ctx = c.getContext('2d'), rnd = mulberry32(color + kind.length);
  noiseFill(ctx, 32, 32, '#f0f0f0', 14, rnd);
  if (kind === 'tiles' || kind === 'slate') { for (let y = 0; y < 32; y += 4) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(0, y, 32, 1); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, y + 1, 32, 1); for (let x = (y / 4) % 2 ? 0 : 4; x < 32; x += 8) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y, 1, 4); } } }
  else if (kind === 'thatch') { ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 70; i++) ctx.fillRect(rnd() * 32 | 0, (rnd() * 30 | 0), 1, 3 + (rnd() * 4 | 0)); ctx.fillStyle = 'rgba(255,255,230,.22)'; for (let i = 0; i < 50; i++) ctx.fillRect(rnd() * 32 | 0, (rnd() * 30 | 0), 1, 3 + (rnd() * 4 | 0)); for (let y = 0; y < 32; y += 8) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, y, 32, 1); } }
  else { ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 90; i++) ctx.fillRect(rnd() * 32 | 0, rnd() * 32 | 0, 1 + (rnd() * 2 | 0), 1); }
  const m = new THREE.MeshStandardMaterial({ color, map: tex(c, true), roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  return (roofCache[k] = m);
}
