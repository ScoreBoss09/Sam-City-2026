import * as THREE from 'three';
import { makeProp } from '../render/SimRig.js';

const ORDER = ['axe', 'hammer', 'shovel', 'basket', 'pick', 'rod'];

/** The tool rack by the Lift: Sam has to walk over and pick tools up before gathering or building anything. */
export class ToolRack {
  constructor(game) { this.game = game; this.items = []; this.group = new THREE.Group(); game.scene.add(this.group); this.x = 0; this.z = 0; }
  /** (Re)build at a spot; `taken` is a list of tool ids already collected. */
  build(x, z, taken = []) {
    while (this.group.children.length) this.group.remove(this.group.children[0]); this.items = []; this.x = x; this.z = z;
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.9 });
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; this.group.add(m); return m; };
    add(new THREE.BoxGeometry(0.16, 1.9, 0.16), dark, -2.1, 0.95, 0); add(new THREE.BoxGeometry(0.16, 1.9, 0.16), dark, 2.1, 0.95, 0); add(new THREE.BoxGeometry(4.4, 0.14, 0.14), wood, 0, 1.5, 0); add(new THREE.BoxGeometry(4.4, 0.1, 0.12), wood, 0, 0.55, 0);
    add(new THREE.BoxGeometry(1.0, 0.7, 0.8), wood, 3.1, 0.35, 0.3); add(new THREE.BoxGeometry(1.1, 0.08, 0.9), dark, 3.1, 0.72, 0.3);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map: signTex('TOOL RACK') })); board.position.set(0, 2.2, 0.1); this.group.add(board);
    const glow = add(new THREE.CylinderGeometry(2.8, 2.8, 0.05, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, depthWrite: false }), 0.4, 0.07, 0.5);
    glow.castShadow = false; glow.receiveShadow = false;
    ORDER.forEach((id, i) => {
      const p = makeProp(id), wrap = new THREE.Group(); p.scale.setScalar(1.7); wrap.add(p); const px = -1.75 + i * 0.7; wrap.position.set(px, id === 'rod' ? 1.0 : 1.0, 0.18); wrap.rotation.z = 0.05 * (i % 2 ? 1 : -1);
      p.traverse((o) => { if (o.isMesh) { o.castShadow = true; } }); this.group.add(wrap);
      const it = { id, mesh: wrap, x: x + px, z: z + 0.2, taken: taken.includes(id) }; if (it.taken) wrap.visible = false; this.items.push(it);
    });
    this.group.position.set(x, 0, z);
    for (const it of this.items) { it.x = x + (it.mesh.position.x); it.z = z + 0.2; }
  }
  take(it) { it.taken = true; it.mesh.visible = false; }
  takenIds() { return this.items.filter((i) => i.taken).map((i) => i.id); }
  get untaken() { return this.items.filter((i) => !i.taken); }
  update(t) { const g = this.group.children[this.group.children.length - 1]; void g; void t; }
}
function signTex(text) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#4a3018'; x.fillRect(0, 0, 128, 32); x.strokeStyle = '#e8c987'; x.lineWidth = 2; x.strokeRect(2, 2, 124, 28);
  x.fillStyle = '#f4e4c1'; x.font = 'bold 18px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 17); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
