import * as THREE from 'three';
import { Sfx } from '../core/Sfx.js';
import { MATERIALS } from '../data/buildings.js';
import { TILE } from '../config.js';

/**
 * The mini-game streak's shockwave (the streak itself is in src/ui/WorkGame.js). Once Sam has a streak going, every
 * perfect tap sends a gold ring out along the ground from his feet, bigger with each level of streak and bigger again
 * when the streak goes up a level. Things of the same kind it passes over get a share of the work: nearby trees are
 * chopped, rocks broken, bushes picked (into Sam's backpack, or a pile beside them when it's full), path plans dug and
 * lit up, building sites hammered. From streak level 3 it also puts a little work into building sites in reach whatever
 * Sam's doing, and from level 4 into path plans too. Each thing it touches flashes with its own little ring, a burst of
 * gold and a ting as the wave reaches it, so the bonus is something you can see and hear.
 */
const SPEED = 11;                          // metres a second the ring runs out at
const RADIUS = [0, 5, 7, 9.5, 12, 15];     // reach at each level of streak
const GOLD = 0xffd23f;
const MAT_OF = { tree: ['timber', 1], rock: ['stone', 1], ore: ['steel', 1], clay: ['brick', 1], berry: ['food', 2], field: ['food', 2] };
export class Shockwave {
  constructor(game) {
    this.game = game; this.rings = []; this.hits = []; this.lit = []; this.geo = new THREE.PlaneGeometry(2, 2); this.geo.rotateX(-Math.PI / 2);
    // one soft ring picture for all of them: a bright leading edge with a glow trailing inside it
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.62, 'rgba(255,255,255,0)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.28)'); gr.addColorStop(0.95, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256); this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace;
  }
  /** A ring on the ground at x, z growing to radius r over most of dur seconds and fading out (pooled meshes). */
  ring(x, z, r, dur, col = GOLD, op = 0.85) {
    let m = this.rings.find((q) => !q.visible);
    if (!m) { if (this.rings.length >= 40) return; m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: col, map: this.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.renderOrder = 3; this.game.scene.add(m); this.rings.push(m); }
    m.material.color.setHex(col); m.material.opacity = op; m.position.set(x, 0.14, z); m.scale.setScalar(0.3); m.userData = { t: 0, dur, r, op }; m.visible = true;
  }
  /** Sam (P) landed a perfect on target t with the streak at level tier (up: it just went up a level). */
  fire(P, t, tier, up) {
    const g = this.game; if (!tier || g.netVisitor || !t) return;
    const x = P.x, z = P.z, R = RADIUS[Math.min(5, tier)] * (up ? 1.25 : 1), k = 0.12 + 0.06 * tier, cap = 2 + tier;
    const sites = t.kind === 'site' || tier >= 3, plans = t.kind === 'road' || tier >= 4, RP = R + TILE * 0.6, RR = plans ? Math.max(R, RP) : R;   // (path tiles are a road's width apart: the wave reaches a tile or two further for them)
    this.ring(x, z, RR, RR / SPEED + 0.35, GOLD, up ? 1 : 0.85); if (up) this.ring(x, z, RR * 0.6, RR * 0.6 / SPEED + 0.45, 0xffffff, 0.6);
    g.particles.burst(x, 0.15, z, 0xc8a060, up ? 18 : 9, 2.6, 1.1, 0.09);
    Sfx.noise(up ? 0.6 : 0.3, { freq: 140, vol: up ? 0.5 : 0.28, type: 'lowpass' }); Sfx.tone(up ? 200 : 170, 0.32, { type: 'sine', vol: up ? 0.22 : 0.14, slide: -80 });
    P.shake = Math.max(P.shake || 0, up ? 0.3 : 0.12);
    // what the wave can work on: things like the one Sam's on, and (at a high streak) sites and path plans as well
    const list = [], within = (ox, oz, r = R, pad = 0) => { const d = Math.max(0, Math.hypot(ox - x, oz - z) - pad); return d <= r ? d : -1; };
    const pick = (cands) => cands.sort((a, b) => a.d - b.d).slice(0, cap).forEach((c) => list.push(c));
    const nk = t.kind === 'gather' && t.node && !t.node.infinite ? t.nk : null;
    if (nk === 'tree') pick(g.terrain.trees.filter((n) => n.alive && n !== t.node).map((n) => ({ n, d: within(n.x, n.z), kind: 'tree' })).filter((c) => c.d >= 0));
    else if (nk && MAT_OF[nk]) pick(g.resources.nodes.filter((n) => n.kind === nk && n.amount >= 1 && n !== t.node).map((n) => ({ n, d: within(n.x, n.z), kind: nk })).filter((c) => c.d >= 0));
    if (sites) pick(g.buildings.list.filter((b) => b.state === 'site' && b !== t.b).map((b) => ({ n: b, d: within(b.cx, b.cz, R, Math.min(b.w, b.d) * TILE / 2), kind: 'site' })).filter((c) => c.d >= 0));   // (a site counts from its edge)
    if (plans && g.roadPlans.count) pick([...g.roadPlans.plans.values()].filter((p) => p !== t.plan).map((p) => ({ n: p, d: within(p.cx, p.cz, RP), kind: 'plan' })).filter((c) => c.d >= 0));
    list.forEach((c, i) => this.hits.push({ at: c.d / SPEED, f: () => this.hit(P, c, k, tier, i) }));
  }
  /** The wavefront reaches one thing: give it its share and make it flash. */
  hit(P, c, k, tier, i) {
    const g = this.game, n = c.n; let x, z, ok = false;
    if (c.kind === 'tree') { if (!n.alive) return; x = n.x; z = n.z; g.terrain.hitTree(n); n.waveT = (n.waveT || 0) + k; if (n.waveT >= 1) { n.waveT -= 1; g.terrain.fallFrom = { x: P.x, z: P.z }; g.resources.take(n); this.give(P, 'timber', 1, n); } ok = true; }
    else if (c.kind === 'site') { if (n.state !== 'site') return; x = n.cx; z = n.cz; ok = g.buildings.bonusWork(n, 0.004 + 0.003 * tier) > 0; this.ring(x, z, Math.max(n.w, n.d) * TILE * 0.6, 0.8, GOLD, 0.8); g.particles.burst(x, 2.4, z, GOLD, 10, 1.6, 3, 0.1); }
    else if (c.kind === 'plan') { if (!g.roadPlans.has(n.x, n.z)) return; x = n.cx; z = n.cz; this.light(n); if (g.roadPlans.hasStone(n, P)) { ok = true; if (g.roadPlans.work(n, k * 4.5, P)) { g.particles.burst(x, 0.4, z, GOLD, 14, 1.8, 2.4, 0.1); Sfx.play('unit'); } } }
    else { if (n.amount < 1) return; x = n.x; z = n.z; g.resources.shake(n); n.waveT = (n.waveT || 0) + k; if (n.waveT >= 1 && g.resources.take(n)) { n.waveT -= 1; const [m, per] = MAT_OF[c.kind]; this.give(P, m, per, n); } ok = true; }
    if (c.kind !== 'site') { this.ring(x, z, c.kind === 'plan' ? TILE * 0.55 : 1.9, 0.55, GOLD, 0.85); g.particles.burst(x, 1.0, z, GOLD, 6, 1.1, 2.6, 0.07); }
    if (ok && i < 8) Sfx.tone(760 + i * 90, 0.07, { type: 'triangle', vol: 0.09 });
  }
  /** What the wave gathers goes in Sam's backpack, or in a pile beside the thing when it's full. */
  give(P, m, n, at) {
    const g = this.game, got = P.invAdd(m, n); if (got < n) g.piles.add(at.x + 1.2, at.z + 0.6, { [m]: n - got });
    g.flags.gathered = (g.flags.gathered || 0) + n; this.got = (this.got || 0) + n; this.gotM = m; this.gotT = 1.4;
    g.workgame.pop(`Shockwave: +${this.got} ${MATERIALS[m].name.toLowerCase()}`, 'unit');
  }
  /** A planned path tile glows gold for a moment as the wave goes over it. */
  light(p) {
    if (!p.tile) return; if (!p.ownMat) { p.ownMat = true; p.tile.material = p.tile.material.clone(); }
    if (p.glowBase === undefined) { p.glowBase = p.tile.material.color.getHex(); p.glowOp = p.tile.material.opacity; } p.glowT = 0.9; if (!this.lit.includes(p)) this.lit.push(p);
  }
  update(dt) {
    for (const m of this.rings) if (m.visible) { const u = m.userData; u.t += dt; const f = Math.min(1, u.t / u.dur); m.scale.setScalar(0.3 + (u.r - 0.3) * Math.min(1, f / 0.8)); m.material.opacity = u.op * (f < 0.65 ? 1 : (1 - f) / 0.35); if (f >= 1) m.visible = false; }
    if (this.hits.length) { for (const h of this.hits) h.at -= dt; const due = this.hits.filter((h) => h.at <= 0); if (due.length) { this.hits = this.hits.filter((h) => h.at > 0); for (const h of due) h.f(); } }
    if (this.gotT > 0 && (this.gotT -= dt) <= 0) this.got = 0;   // (a run of wave pickups adds up in one line, then starts again)
    if (this.lit.length) {
      const c = this._c || (this._c = new THREE.Color()), gold = this._g || (this._g = new THREE.Color(GOLD));
      for (const p of this.lit) { p.glowT -= dt; const a = Math.max(0, p.glowT / 0.9); if (p.tile && p.tile.material) { p.tile.material.color.copy(c.setHex(p.glowBase)).lerp(gold, a); if (a <= 0) p.tile.material.opacity = 0.55 + p.progress * 0.35; else p.tile.material.opacity = Math.max(p.tile.material.opacity, 0.55 + 0.4 * a); } }
      this.lit = this.lit.filter((p) => p.glowT > 0 && p.tile);
    }
  }
}
