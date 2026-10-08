import * as THREE from 'three';
import { loadStored } from '../core/TexturePack.js';

/**
 * Optional external texture set (built by tools/build_textures.py into ./textures).
 * Everything falls back to the generated textures if the folder or an individual file is missing.
 */
export const Assets = {
  ok: false, imgs: {}, px: {}, texCache: {},
  source: 'none',
  async load() {
    // 1) a pack installed from the title screen (kept in the browser), 2) a textures/ folder next to the game
    try {
      const st = await loadStored();
      if (Object.keys(st).length) {
        await Promise.all(Object.entries(st).map(async ([k, blob]) => { try { const img = new Image(); img.src = URL.createObjectURL(blob); await img.decode(); this.add(k, img); } catch (e) { /* skip */ } }));
        if (Object.keys(this.imgs).length) { this.ok = true; this.source = 'installed'; return; }
      }
    } catch (e) { /* no storage */ }
    try {
      const r = await fetch('textures/manifest.json'); if (!r.ok) return; const m = await r.json();
      await Promise.all(Object.entries(m).map(async ([k, f]) => {
        try { const img = new Image(); img.src = 'textures/' + f; await img.decode(); this.imgs[k] = img;
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); this.px[k] = x.getImageData(0, 0, img.width, img.height); } catch (e) { /* skip bad file */ }
      }));
      this.ok = Object.keys(this.imgs).length > 0; if (this.ok) this.source = 'folder';
    } catch (e) { /* no textures folder: use generated art */ }
  },
  add(k, img) { this.imgs[k] = img; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); this.px[k] = x.getImageData(0, 0, img.width, img.height); },
  has(k) { return this.ok && !!this.imgs[k]; },
  img(k) { return this.imgs[k] || null; },
  /** Seamless pixel sample (wraps). */
  sample(k, gx, gz) { const d = this.px[k]; if (!d) return null; const x = ((Math.floor(gx) % d.width) + d.width) % d.width, y = ((Math.floor(gz) % d.height) + d.height) % d.height, i = (y * d.width + x) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2]]; },
  /** THREE texture (nearest, repeating, sRGB). */
  tex(k, rx = 1, ry = 1) {
    const key = k + rx + ry; if (this.texCache[key]) return this.texCache[key]; const img = this.imgs[k]; if (!img) return null;
    const t = new THREE.Texture(img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(rx, ry); t.needsUpdate = true; return (this.texCache[key] = t);
  },
};
