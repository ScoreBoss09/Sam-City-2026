import { Sfx } from '../core/Sfx.js';

/**
 * The timing bar shown while Sam chops, mines, digs, picks, fishes or builds.
 * Tap the action button when the marker is in the green zone (gold = perfect). Holding the button still works, just slowly.
 */
const KINDS = {
  chop:    { title: 'CHOP',    speed: 1.15, good: 0.26, perfect: 0.08, sfx: 'chop' },
  mine:    { title: 'SWING',   speed: 1.35, good: 0.22, perfect: 0.07, sfx: 'mine' },
  dig:     { title: 'DIG',     speed: 0.95, good: 0.3,  perfect: 0.09, sfx: 'dig' },
  harvest: { title: 'PICK',    speed: 0.85, good: 0.34, perfect: 0.11, sfx: 'pick' },
  fish:    { title: 'REEL',    speed: 1.7,  good: 0.2,  perfect: 0.06, sfx: 'pick' },
  build:   { title: 'HAMMER',  speed: 1.55, good: 0.22, perfect: 0.07, sfx: 'hammer' },
};
const $ = (id) => document.getElementById(id);

export class WorkGame {
  constructor(game) { this.game = game; this.el = $('workgame'); this.active = false; this.key = null; this.pos = 0; this.dir = 1; this.center = 0.6; this.combo = 0; this.idle = 0; this.popT = 0; }
  start(kind, key) {
    if (this.active && this.key === key) { this.idle = 0; return; }
    const k = KINDS[kind] || KINDS.chop; this.kind = kind; this.k = k; const keep = kind === this.lastKind && performance.now() - (this.lastPress || 0) < 3000 ? this.combo : 0; this.key = key; this.active = true; this.pos = 0; this.dir = 1; this.combo = keep; this.idle = 0; this.newZone(); $('wg-combo').textContent = keep > 1 ? `🔥 CHAIN x${keep}` : ''; this.el.dataset.heat = Math.min(4, keep); this.lastKind = kind;
    $('wg-title').textContent = k.title; this.el.classList.remove('hidden'); this.el.classList.toggle('fishing', kind === 'fish'); if (kind === 'fish') this.cast(); this.render();
  }
  /** Fishing: wait for the float to bob, then strike while it is under. */
  cast() { this.fishState = 'wait'; this.fishT = 1.5 + Math.random() * 3; $('wg-bob').textContent = '~ ~ ~  o  ~ ~ ~'; }
  stop() { if (!this.active) return; this.lastKind = this.kind; this.active = false; this.key = null; this.el.classList.add('hidden'); }
  newZone() { let c; do { c = 0.18 + Math.random() * 0.64; } while (Math.abs(c - this.center) < 0.18 && Math.random() < 0.8); this.center = c; }
  /** Returns { q: 'perfect'|'good'|'miss', mult } */
  press() {
    if (this.kind === 'fish') return this.strike();
    const k = this.k, d = Math.abs(this.pos - this.center), q = d <= this.pw() / 2 ? 'perfect' : d <= this.gw() / 2 ? 'good' : 'miss';
    // a chain of golds speeds the work up, but the marker gets faster and the gold bar narrower
    this.combo = q === 'perfect' ? this.combo + 1 : q === 'good' ? Math.max(0, this.combo - 1) : 0; this.idle = 0; this.best = Math.max(this.best || 0, this.combo); this.lastPress = performance.now();
    const mult = q === 'perfect' ? 1 + Math.min(this.combo - 1, 7) * 0.35 : 1;
    this.pop(q === 'perfect' ? (this.combo > 1 ? `PERFECT x${this.combo}` : 'PERFECT!') : q === 'good' ? 'GOOD' : 'miss', q);
    Sfx.play(k.sfx); Sfx.play(q); if (q === 'perfect' && this.combo > 1) Sfx.tone(600 + this.combo * 90, 0.08, { type: 'square', vol: 0.1, delay: 0.12 });
    if (q !== 'miss') this.newZone();
    const c = $('wg-combo'); c.textContent = this.combo > 1 ? `🔥 CHAIN x${this.combo}  (+${Math.round((mult - 1) * 100)}%)` : ''; this.el.dataset.heat = Math.min(4, this.combo);
    this.el.classList.remove('hit-perfect', 'hit-good', 'hit-miss'); void this.el.offsetWidth; this.el.classList.add('hit-' + q);
    return { q, mult };
  }
  /** Zone widths and marker speed tighten as the gold chain grows. */
  pw() { return this.k.perfect * Math.max(0.4, 1 - Math.min(this.combo, 6) * 0.1); }
  gw() { return this.k.good * Math.max(0.6, 1 - Math.min(this.combo, 6) * 0.06); }
  spd() { return this.k.speed * (1 + Math.min(this.combo, 8) * 0.12); }
  strike() {
    this.idle = 0; this.lastPress = performance.now(); let q;
    if (this.fishState === 'bite') { const fast = this.fishT > this.biteWin() * 0.5; q = fast ? 'perfect' : 'good'; this.combo = q === 'perfect' ? this.combo + 1 : this.combo; this.pop(q === 'perfect' ? (this.combo > 1 ? `CAUGHT IT! x${this.combo}` : 'CAUGHT IT!') : 'Got one!', q); Sfx.play('perfect'); this.fishState = 'reel'; this.fishT = 0.8; }
    else if (this.fishState === 'reel') return { q: 'none', mult: 0 };
    else { q = 'miss'; this.combo = 0; this.pop('Too soon! Scared it off', 'miss'); Sfx.play('miss'); this.cast(); this.fishT += 0.8; }
    const c = $('wg-combo'); c.textContent = this.combo > 1 ? `🔥 CATCH STREAK x${this.combo}` : ''; this.el.dataset.heat = Math.min(4, this.combo);
    return { q, mult: q === 'perfect' ? 1 + Math.min(this.combo - 1, 6) * 0.3 : 1, fish: true };
  }
  biteWin() { return Math.max(0.35, 0.9 - Math.min(this.combo, 6) * 0.09); }
  pop(text, cls) { const p = $('wg-pop'); p.textContent = text; p.className = 'wg-pop ' + cls; this.popT = 0.8; }
  update(dt) {
    if (!this.active) return; this.idle += dt; if (this.idle > (this.kind === 'fish' ? 9 : 3)) { this.stop(); return; }
    if (this.kind === 'fish') {
      this.fishT -= dt; const b = $('wg-bob');
      if (this.fishState === 'wait') { b.textContent = Math.sin(performance.now() / 300) > 0.6 ? '~ ~ ~  o  ~ ~ ~' : ' ~ ~ ~ o ~ ~ ~ '; if (this.fishT <= 0) { this.fishState = 'bite'; this.fishT = this.biteWin(); Sfx.play('pick'); Sfx.tone(300, 0.15, { type: 'sine', vol: 0.2, slide: -150 }); } }
      else if (this.fishState === 'bite') { b.textContent = '!! BITE !!  ~~ * ~~'; if (this.fishT <= 0) { this.combo = 0; this.pop('It got away...', 'miss'); Sfx.play('miss'); this.cast(); } }
      else if (this.fishState === 'reel') { b.textContent = '>>> reeling in >>>'; if (this.fishT <= 0) this.cast(); }
      this.el.classList.toggle('bite', this.fishState === 'bite');
      if (this.popT > 0) { this.popT -= dt; if (this.popT <= 0) $('wg-pop').textContent = ''; } $('wg-hint').textContent = this.game.ui.keyText('Wait for the BITE, then tap E straight away. Too soon scares the fish.'); return;
    }
    this.pos += this.dir * this.spd() * dt; if (this.pos > 1) { this.pos = 1; this.dir = -1; } if (this.pos < 0) { this.pos = 0; this.dir = 1; }
    if (this.popT > 0) { this.popT -= dt; if (this.popT <= 0) $('wg-pop').textContent = ''; }
    this.render();
  }
  setProgress(f, label) { $('wg-prog').style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%'; if (label != null) $('wg-label').textContent = label; }
  render() {
    const k = this.k; $('wg-cursor').style.left = (this.pos * 100) + '%';
    const g = $('wg-good'), p = $('wg-perfect'); const gw = this.gw(), pw = this.pw(); g.style.left = ((this.center - gw / 2) * 100) + '%'; g.style.width = (gw * 100) + '%'; p.style.left = ((this.center - pw / 2) * 100) + '%'; p.style.width = (pw * 100) + '%';
    $('wg-hint').textContent = this.game.ui.keyText(this.combo > 1 ? 'Keep the chain going! Gold gets smaller and faster.' : 'Tap E in the green, gold = perfect. Golds in a row = faster work.');
  }
}
