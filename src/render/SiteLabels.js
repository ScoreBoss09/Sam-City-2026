import * as THREE from 'three';
import { MATERIALS } from '../data/buildings.js';

/** Floating signs over construction sites: what is still missing and how far the build has got. */
export class SiteLabels {
  constructor(game) { this.game = game; this.t = 0; }
  update(dt) {
    const g = this.game, god = g.mode === 'god';
    // size and position every frame (smooth while zooming); the text only needs redrawing now and then
    // walking about, a sign is part of the world: hidden behind walls, not shown at all from indoors, and only nearby
    const P = g.player, inside = !god && !!g.buildings.playerInside;
    for (const b of g.buildings.list) if (b.label) {
      const sc = god ? Math.max(8, g.god.dist * 0.16) : 3.2, far = !god && Math.hypot(b.cx - P.x, b.cz - P.z) > 45, m = b.label.material;
      b.label.scale.set(sc, sc / 4, 1); b.label.position.set(b.cx, god ? 6 + sc * 0.2 : Math.max(4.2, (b.def.floors || 1) * 3.2 + 1.2), b.cz);
      b.label.visible = god || (!inside && !far); if (m.depthTest === god) { m.depthTest = !god; m.needsUpdate = true; }
    }
    this.t -= dt; if (this.t > 0) return; this.t = 0.4;
    for (const b of g.buildings.list) {
      if (b.state !== 'site') { if (b.label) { g.scene.remove(b.label); b.label.material.map.dispose(); b.label = null; } continue; }
      const miss = Object.keys(b.need).map((m) => [m, Math.max(0, b.need[m] - (b.have[m] || 0))]).filter(([, n]) => n > 0);
      const l1 = b.def.name, l2 = miss.length ? 'Needs ' + miss.map(([m, n]) => `${n} ${MATERIALS[m].name.toLowerCase()}`).join(', ') : (g.player.tools.has('hammer') ? 'Ready to build' : 'Ready to build (needs the Hammer)'), pct = Math.round(b.progress * 100);
      const sig = l1 + l2 + pct + god + g.input.padActive;
      if (!b.label) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.renderOrder = 30; b.label = s; b.labelCv = c; g.scene.add(s); }
      if (b.labelSig !== sig) {
        b.labelSig = sig; const c = b.labelCv, x = c.getContext('2d'); x.clearRect(0, 0, 256, 64);
        x.fillStyle = 'rgba(10,15,25,.86)'; x.beginPath(); x.roundRect(2, 2, 252, 60, 14); x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; x.stroke();
        x.fillStyle = '#ffc53d'; x.beginPath(); x.roundRect(2, 8, 4, 48, 2); x.fill();
        x.fillStyle = '#ffffff'; x.font = "700 19px 'Barlow Condensed', Barlow, sans-serif"; x.textAlign = 'left'; x.fillText(l1.toUpperCase(), 16, 23);
        x.fillStyle = '#a3b0c2'; x.font = "500 13px Barlow, sans-serif"; x.fillText(g.ui.keyText(l2).slice(0, 38), 16, 41);
        x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.roundRect(16, 49, 224, 6, 3); x.fill(); if (b.progress > 0) { x.fillStyle = '#ffc53d'; x.beginPath(); x.roundRect(16, 49, Math.max(6, 224 * b.progress), 6, 3); x.fill(); }
        b.label.material.map.needsUpdate = true;
      }
    }
  }
}
