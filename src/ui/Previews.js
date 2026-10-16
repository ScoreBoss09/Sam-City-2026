import * as THREE from 'three';
import { BUILDINGS } from '../data/buildings.js';
import { buildExterior } from '../render/BuildingFactory.js';
import { styleDef } from '../data/ages.js';
import { disposeOwned } from '../world/BuildingManager.js';

/**
 * Pictures of the buildings for the build bar's cards: each one drawn once with the game's own building code (in the
 * town's current style), three-quarter view, on a clear background, and kept as an image. Drawn a couple a frame, only
 * when asked for, so opening a category never stalls the game.
 */
const W = 192, H = 144;
export class Previews {
  constructor(game) { this.game = game; this.cache = new Map(); this.queue = []; this.waiting = new Set(); this.listeners = new Set(); }
  /** The picture's data URL, or null (it's then drawn soon and onReady callbacks are told). */
  get(id) {
    const k = this.key(id), c = this.cache.get(k); if (c !== undefined) return c || null;
    if (!this.waiting.has(k) && BUILDINGS[id]) { this.waiting.add(k); this.queue.push(id); } return null;
  }
  key(id) { const g = this.game; return id + ':' + (g.tech ? g.tech.age : 4); }   // (a new age restyles the buildings: new pictures)
  onReady(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  step() {
    for (let n = 0; n < 2 && this.queue.length; n++) {
      const id = this.queue.shift(), k = this.key(id); let url = '';
      try { url = this.draw(id); } catch (e) { console.warn('preview', id, e); }
      this.cache.set(k, url); this.waiting.delete(k); for (const f of this.listeners) f(id, url);
    }
  }
  setup() {
    const s = this.scene = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xdfeeff, 0x5a6a48, 1.1)); const sun = new THREE.DirectionalLight(0xfff2dc, 1.6); sun.position.set(6, 10, 7); s.add(sun);
    this.cam = new THREE.PerspectiveCamera(30, W / H, 0.5, 400); this.rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.px = new Uint8Array(W * H * 4); this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H; this.ctx = this.cv.getContext('2d'); this.img = this.ctx.createImageData(W, H);
  }
  draw(id) {
    const g = this.game, r = g.renderer, def = BUILDINGS[id]; if (!r || !def) return ''; if (!this.scene) this.setup();
    const ext = buildExterior(styleDef(def, g.tech ? g.tech.age : 4), 7, 0), root = new THREE.Group(); root.add(ext.group); if (ext.roof) root.add(ext.roof); this.scene.add(root);
    root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const rad = Math.max(2, size.length() / 2), d = rad / Math.sin(THREE.MathUtils.degToRad(this.cam.fov / 2)) * 0.9;
    this.cam.position.set(c.x + d * 0.62, c.y + d * 0.5, c.z + d * 0.62); this.cam.lookAt(c.x, c.y - size.y * 0.05, c.z); this.cam.updateProjectionMatrix();
    const prev = r.getRenderTarget(), col = r.getClearColor(new THREE.Color()), a = r.getClearAlpha(), au = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false; r.setClearColor(0x000000, 0); r.setRenderTarget(this.rt); r.clear(); r.render(this.scene, this.cam); r.readRenderTargetPixels(this.rt, 0, 0, W, H, this.px);
    r.setRenderTarget(prev); r.setClearColor(col, a); r.shadowMap.autoUpdate = au;
    this.scene.remove(root); disposeOwned(root);
    for (let y = 0; y < H; y++) this.img.data.set(this.px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);   // (the GPU's rows are upside down)
    this.ctx.putImageData(this.img, 0, 0); return this.cv.toDataURL('image/png');
  }
}
