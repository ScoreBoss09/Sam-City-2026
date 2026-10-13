import * as THREE from 'three';
import { trackPoints, previewPiece, joinTo, RISE } from './Track.js';
import { Sfx } from '../core/Sfx.js';

// The Track tool (planning view): lay a railway, monorail or sky-lift line piece by piece, like a theme-park ride builder.
// Click a station to start (R turns the starting direction). The next piece follows the cursor: straight on, or a curve
// left or right; T / G (D-pad up / down) tilt it up or down. Click to lay it. Near another station, click to join the
// line into it. Backspace (or ○ on the controller) takes the last piece up. Piers only go down on clear ground.
const COST = { rail: 40, mono: 60, sky: 30 }, H = { rail: 9, mono: 12, sky: 20 }, LIM = { rail: [5, 22], mono: [7, 26], sky: [14, 34] };
const okMat = new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.55, depthWrite: false }), joinMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6, depthWrite: false }), badMat = new THREE.MeshBasicMaterial({ color: 0xff4455, transparent: true, opacity: 0.5, depthWrite: false });

export class TrackBuilder {
  constructor(game) { this.game = game; this.cur = null; this.slope = 0; this.ghost = new THREE.Group(); this.ghost.visible = false; game.scene.add(this.ghost); this.gkey = ''; }
  get T() { return this.game.transport.tracks; }
  get kind() { return this.game.god.tool.sub || 'rail'; }
  stationNear(x, z, r = 7, not = null) { let best = null, bd = r; for (const b of this.game.transport.stations(this.kind)) { if (b === not) continue; const d = Math.hypot(b.cx - x, b.cz - z); if (d < bd) { bd = d; best = b; } } return best; }
  endPose(tr) { const a = this.game.buildings.list.find((b) => b.uid === tr.a); return a ? trackPoints(tr, { x: a.cx, z: a.cz }, null, H[this.kind]).end : null; }
  hide() { this.ghost.visible = false; this.cur = null; }
  draw(pts, mat, key) {
    if (key === this.gkey) { this.ghost.visible = true; return; } this.gkey = key;
    for (const c of this.ghost.children.slice()) { this.ghost.remove(c); c.geometry.dispose(); }
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) + 0.05, m = new THREE.Mesh(new THREE.BoxGeometry(this.kind === 'rail' ? 2.8 : 1.2, 0.5, L), mat); m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); m.rotation.y = Math.atan2(dx, dz); this.ghost.add(m); }
    this.ghost.visible = true;
  }
  /** Called every frame by GodControls while the Track tool is picked. */
  update(inp, p) {
    const g = this.game, ui = g.ui, pad = inp.padActive && inp.pad ? inp.pad.hitB || [] : [], K = this.kind, name = { rail: 'railway', mono: 'monorail', sky: 'sky lift' }[K];
    if (!g.transport.stations(K).length) { this.ghost.visible = false; ui.setHover(`Track: build a ${name} station first, then lay track from it to the next one.`); return; }
    // not laying yet: pick a station to start from (or carry on an unfinished track from it)
    if (!this.cur) {
      const st = this.stationNear(p.x, p.z); if (!st) { this.ghost.visible = false; ui.setHover(`Track (${name}): click a station to start laying track from it. Stations with no track between them are joined by a straight line.`); return; }
      const open = this.T[K].find((t) => t.a === st.uid && t.b == null), h0 = open ? open.h0 : g.god.prefRot * Math.PI / 2, start = open ? this.endPose(open) : { x: st.cx, z: st.cz, h: h0, y: H[K] };
      const { pts } = previewPiece(start, { t: 'S', s: 0 }); this.draw(pts, okMat, 'start' + st.uid + ':' + h0 + ':' + (open ? open.pieces.length : -1));
      const joined = this.T[K].filter((t) => (t.a === st.uid || t.b === st.uid) && t.b != null).length;
      ui.setHover(open ? `Click to carry on the unfinished track from here (${open.pieces.length} pieces).` : `Click to start a track from this station (R turns the starting direction).${joined ? ' Backspace takes up a finished track from here.' : ''}`);
      if (inp.mouse.down) { if (open) this.cur = open; else { this.cur = { a: st.uid, b: null, h0, pieces: [] }; this.T[K].push(this.cur); } this.slope = 0; Sfx.play('ui'); }
      if ((inp.hit('Backspace') || inp.hit('Delete')) && joined) { const t = this.T[K].find((q) => (q.a === st.uid || q.b === st.uid) && q.b != null); this.T[K].splice(this.T[K].indexOf(t), 1); ui.toast('Track taken up.'); g.transport.refresh(K); }
      return;
    }
    const tr = this.cur, end = this.endPose(tr); if (!end) { this.cur = null; return; }
    // the next piece follows the cursor; T/G (D-pad) tilt it
    if (inp.hit('KeyT') || pad[12]) this.slope = Math.min(1, this.slope + 1); if (inp.hit('KeyG') || pad[13]) this.slope = Math.max(-1, this.slope - 1);
    const ang = Math.atan2(p.x - end.x, p.z - end.z) - end.h, a = Math.atan2(Math.sin(ang), Math.cos(ang)), t = pad[14] ? 'L' : pad[15] ? 'R' : a > 0.35 && a < 2.6 ? 'L' : a < -0.35 && a > -2.6 ? 'R' : 'S';
    const y1 = end.y + this.slope * RISE, okY = y1 >= LIM[K][0] && y1 <= LIM[K][1];
    // close to another station: offer to join the line into it
    const to = this.stationNear(end.x, end.z, 26, g.buildings.list.find((b) => b.uid === tr.a)), ahead = to && ((to.cx - end.x) * Math.sin(end.h) + (to.cz - end.z) * Math.cos(end.h)) > 0;
    if (to && ahead && Math.hypot(p.x - to.cx, p.z - to.cz) < 9) {
      const out = [{ x: end.x, z: end.z, y: end.y }]; joinTo(end, to.cx, to.cz, H[K], out); this.draw(out, joinMat, 'join' + to.uid + ':' + tr.pieces.length);
      ui.setHover(`Click to join the ${name} into this station.`);
      if (inp.mouse.down) { tr.b = to.uid; this.cur = null; Sfx.play('done'); ui.toast(`The ${name} is joined up. Trains will run on it shortly.`, 2600); g.transport.refresh(K); }
    } else {
      const { pts } = previewPiece(end, { t, s: this.slope }); this.draw(pts, okY ? okMat : badMat, t + this.slope + ':' + tr.pieces.length + ':' + okY);
      ui.setHover(`${{ L: 'Curve', R: 'Curve', S: 'Straight' }[t]}${this.slope ? (this.slope > 0 ? ', climbing' : ', descending') : ''} (£${COST[K]}): click to lay it. T/G tilt, Backspace takes up the last piece, Esc stops. Height ${Math.round(end.y)} m.`);
      if (inp.mouse.down) { if (!okY) ui.toast('Too high or too low there.'); else if (!g.economy.spend(COST[K], 'Track')) ui.toast('Not enough money for track.'); else { tr.pieces.push({ t, s: this.slope }); Sfx.play('hammer'); g.transport.refresh(K); } }
    }
    if (inp.hit('Backspace') || inp.hit('Delete')) { if (tr.pieces.length) { tr.pieces.pop(); g.economy.earn(COST[K] / 2, 'Track'); g.transport.refresh(K); } else { this.T[K].splice(this.T[K].indexOf(tr), 1); this.cur = null; } Sfx.play('drop'); }
  }
}
