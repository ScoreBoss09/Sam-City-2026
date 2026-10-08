import * as THREE from 'three';
import { MATERIALS } from '../data/buildings.js';

/** Floating signs over construction sites: what is still missing and how far the build has got. */
export class SiteLabels {
  constructor(game) { this.game = game; this.t = 0; }
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.4; const g = this.game, god = g.mode === 'god';
    for (const b of g.buildings.list) {
      if (b.state !== 'site') { if (b.label) { g.scene.remove(b.label); b.label.material.map.dispose(); b.label = null; } continue; }
      const miss = Object.keys(b.need).map((m) => [m, Math.max(0, b.need[m] - (b.have[m] || 0))]).filter(([, n]) => n > 0);
      const l1 = b.def.name, l2 = miss.length ? 'Needs ' + miss.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ') : (g.player.tools.has('hammer') ? 'Ready: tap E to build' : 'Ready to build (needs the Hammer)'), pct = Math.round(b.progress * 100);
      const sig = l1 + l2 + pct + god + g.input.padActive;
      if (!b.label) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.renderOrder = 30; b.label = s; b.labelCv = c; g.scene.add(s); }
      if (b.labelSig !== sig) {
        b.labelSig = sig; const c = b.labelCv, x = c.getContext('2d'); x.clearRect(0, 0, 256, 64);
        x.fillStyle = 'rgba(14,26,43,.88)'; x.fillRect(2, 2, 252, 60); x.strokeStyle = '#ffd23f'; x.lineWidth = 3; x.strokeRect(2, 2, 252, 60);
        x.fillStyle = '#ffd23f'; x.font = 'bold 18px monospace'; x.textAlign = 'center'; x.fillText(l1, 128, 22);
        x.fillStyle = '#fff'; x.font = '13px monospace'; x.fillText(g.ui.keyText(l2).slice(0, 34), 128, 40);
        x.fillStyle = '#334'; x.fillRect(16, 48, 224, 8); x.fillStyle = '#7be08f'; x.fillRect(16, 48, 224 * b.progress, 8); b.label.material.map.needsUpdate = true;
      }
      const sc = god ? Math.max(8, g.god.dist * 0.16) : 3.2; b.label.scale.set(sc, sc / 4, 1); b.label.position.set(b.cx, god ? 6 + sc * 0.2 : 4.2, b.cz);
    }
  }
}
