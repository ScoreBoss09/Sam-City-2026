import * as THREE from 'three';
import { MAP, TILE } from '../config.js';
import { T } from '../world/World.js';
import { mulberry32 } from '../util.js';
import { Sfx } from '../core/Sfx.js';

/** Little things to find while exploring. A few of them are a bit odd for a sleepy English island. */
export const CURIOS = [
  { id: 'coin', icon: '🪙', name: 'Old penny', desc: 'A 1967 penny, worn smooth. Somebody\'s lucky charm once.' },
  { id: 'teacup', icon: '☕', name: 'Chipped teacup', desc: 'Bone china with roses on. Still smells faintly of Earl Grey.' },
  { id: 'medal', icon: '🎖️', name: 'Bowls club medal', desc: '"Runner-up, Ladies\' Pairs". Engraved on the back: "Sam City Green".' },
  { id: 'marble', icon: '🔮', name: 'Glass marble', desc: 'A blue swirl marble. The kind children lose in a drain.' },
  { id: 'spoon', icon: '🥄', name: 'Souvenir spoon', desc: 'A tiny spoon that says "A Present From Margate".' },
  { id: 'toy', icon: '🧸', name: 'Knitted bear', desc: 'Missing an eye. Lovingly mended at least three times.' },
  { id: 'key', icon: '🗝️', name: 'Rusty key', desc: 'Fits nothing on the island. Not yet, anyway.' },
  { id: 'shell', icon: '🐚', name: 'Spiral shell', desc: 'Hold it to your ear: the sea. Or maybe a faint hum.' },
  { id: 'gnome', icon: '🧙', name: 'Garden gnome', desc: 'He has a fishing rod and a look of mild disapproval.' },
  { id: 'badge', icon: '📛', name: 'Name badge', desc: '"CREW - Lighting". The clip is broken. Odd.' },
  { id: 'bulb', icon: '💡', name: 'Big glass bulb', desc: 'Far too large for any lamp in town. Still warm.' },
  { id: 'ticket', icon: '🎟️', name: 'Ticket stub', desc: '"Studio Four, Row B, Seat 12". Smudged date.' },
  { id: 'reel', icon: '🎞️', name: 'Film canister', desc: 'Labelled "SAM - Week 31 - Dailies". Empty.' },
  { id: 'remote', icon: '📟', name: 'Strange remote', desc: 'Three buttons: SUN, RAIN, CUE. None of them do anything. Probably.' },
];

export class Curios {
  constructor(game) {
    this.game = game; this.found = new Set(); this.items = []; this.group = new THREE.Group(); game.scene.add(this.group);
    const w = game.world, r = mulberry32(4242), spots = [];
    for (let z = 2; z < MAP - 2; z++) for (let x = 2; x < MAP - 2; x++) { const t = w.terrain[w.idx(x, z)]; if ((t === T.LAND || t === T.SAND) && !w.occ[w.idx(x, z)]) spots.push([x, z]); }
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
    CURIOS.forEach((c, i) => {
      // the odder things lie further out (sand / far corners)
      let s = null; for (let k = 0; k < 40 && !s; k++) { const q = spots[Math.floor(r() * spots.length)]; const far = Math.hypot(q[0] - 20, q[1] - 10); if (i < 9 || far > 16) s = q; } if (!s) s = spots[Math.floor(r() * spots.length)];
      const g = new THREE.Group(), box = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glintMat); box.position.y = 0.45; g.add(box);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 16), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
      const x = (s[0] + 0.2 + r() * 0.6) * TILE, z = (s[1] + 0.2 + r() * 0.6) * TILE; g.position.set(x, 0, z); this.group.add(g); this.items.push({ c, x, z, g });
    });
  }
  near(x, z, rr = 2.0) { for (const it of this.items) if (!this.found.has(it.c.id) && Math.hypot(it.x - x, it.z - z) < rr) return it; return null; }
  take(it) {
    const g = this.game; this.found.add(it.c.id); it.g.visible = false; g.economy.earn(15); Sfx.play('perfect'); g.particles.burst(it.x, 0.5, it.z, 0xffe9a0, 16, 1, 3, 0.06);
    g.ui.toast(`${it.c.icon} Found: ${it.c.name}! (${this.found.size}/${CURIOS.length} curios, see your journal: J)`, 3600); g.flags.curios = this.found.size;
  }
  update(dt) {
    const t = performance.now() / 1000;
    for (const it of this.items) { if (!it.g.visible) continue; const sh = it.g.children[0]; sh.rotation.y = t * 2; sh.position.y = 0.45 + Math.sin(t * 3 + it.x) * 0.08; }
    // glints only where Sam can see them up close in sim mode; from the planning view they are hidden
    this.group.visible = this.game.mode === 'sim';
  }
  serialize() { return [...this.found]; }
  load(a) { this.found = new Set(a || []); for (const it of this.items) it.g.visible = !this.found.has(it.c.id); }
}
