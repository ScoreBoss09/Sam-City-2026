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
/**
 * The streak: perfects build it (1 point each, a good only helps at the bottom and costs a point near the top), a miss
 * knocks it down a whole level. Each level makes a perfect stroke worth more and sends a bigger shockwave along the
 * ground (src/systems/Shockwave.js); the bar gets quicker and the gold narrower as it climbs, so the top is hard to reach
 * and harder to keep.
 */
const TIERS = [0, 2, 4, 7, 11, 16];
const TIER_NAME = ['', 'Warming up', 'On a roll', 'Red hot', 'Unstoppable', 'Legendary'];
const tierOf = (pts) => { let t = 0; while (t < 5 && pts >= TIERS[t + 1]) t++; return t; };

export class WorkGame {
  constructor(game) { this.game = game; this.el = $('workgame'); this.active = false; this.key = null; this.pos = 0; this.dir = 1; this.center = 0.6; this.combo = 0; this.pts = 0; this.tier = 0; this.idle = 0; this.popT = 0; }
  start(kind, key) {
    if (this.active && this.key === key) { this.idle = 0; return; }
    const k = KINDS[kind] || KINDS.chop; this.kind = kind; this.k = k; const keep = kind === this.lastKind && performance.now() - (this.lastPress || 0) < 4000; this.key = key; this.active = true; this.pos = 0; this.dir = 1; this.idle = 0;
    if (!keep) { this.combo = 0; this.pts = 0; this.tier = 0; } else if (this.tier) this.pop(`Streak kept: ${TIER_NAME[this.tier]}`, 'good');   // (straight on to the next tree or rock: the streak carries over, and says so)
    this.newZone(); this.streakLine(); this.lastKind = kind;
    { const S = this.game.skills, lv = S.level(kind), b = S.bonus(kind); $('wg-title').textContent = `${k.title} · Lv ${lv}${lv > 1 ? ` · ${b.toFixed(2).replace(/0$/, '')}x speed` : ''}`; } this.el.classList.remove('hidden'); this.el.classList.toggle('fishing', kind === 'fish'); if (kind === 'fish') this.cast(); this.render();
  }
  /** Fishing: wait for the float to bob, then strike while it is under. */
  cast() { this.fishState = 'wait'; this.fishT = 1.5 + Math.random() * 3; $('wg-bob').textContent = '~ ~ ~  o  ~ ~ ~'; }
  stop() { if (!this.active) return; this.lastKind = this.kind; this.active = false; this.key = null; this.el.classList.add('hidden'); }
  newZone() { let c; do { c = 0.18 + Math.random() * 0.64; } while (Math.abs(c - this.center) < 0.18 && Math.random() < 0.8); this.center = c; }
  /** Returns { q: 'perfect'|'good'|'miss', mult } */
  press() {
    if (this.kind === 'fish') return this.strike();
    const k = this.k, d = Math.abs(this.pos - this.center), q = d <= this.pw() / 2 ? 'perfect' : d <= this.gw() / 2 ? 'good' : 'miss', was = this.tier;
    if (q === 'perfect') { this.combo++; this.pts += 1; }
    else if (q === 'good') { this.combo = 0; this.pts = Math.max(0, this.pts + (was < 2 ? 0.5 : was < 3 ? 0 : -1)); }   // (near the top only perfects will do)
    else { this.combo = 0; this.pts = was > 0 ? TIERS[was - 1] : 0; }   // a miss: down a level, to the bottom of the one below
    this.tier = tierOf(this.pts); this.idle = 0; this.best = Math.max(this.best || 0, this.tier); if (this.tier > (this.game.flags.bestStreak || 0)) this.game.flags.bestStreak = this.tier; this.lastPress = performance.now();
    const up = this.tier > was, down = this.tier < was, mult = q === 'perfect' ? 1 + 0.3 * this.tier : 1;
    this.pop(up ? `STREAK ${this.tier}: ${TIER_NAME[this.tier].toUpperCase()}!` : q === 'perfect' ? (this.combo > 1 ? `PERFECT x${this.combo}` : 'PERFECT!') : q === 'good' ? (down ? 'GOOD · streak slipping' : 'GOOD') : down ? `miss · streak down to ${this.tier}` : 'miss', up ? 'perfect' : q);
    Sfx.play(k.sfx); Sfx.play(q); if (q === 'perfect' && this.combo > 1) Sfx.tone(600 + Math.min(this.combo, 12) * 70, 0.08, { type: 'square', vol: 0.1, delay: 0.12 });
    if (up) [523, 659, 784, 1047].slice(0, 2 + Math.min(2, this.tier)).forEach((f, i) => Sfx.tone(f, 0.1, { type: 'square', vol: 0.11, delay: 0.14 + i * 0.07 }));
    if (down) Sfx.tone(330, 0.22, { type: 'triangle', vol: 0.16, slide: -140, delay: 0.08 });
    if (q !== 'miss') this.newZone();
    this.streakLine(); this.el.classList.remove('hit-perfect', 'hit-good', 'hit-miss'); void this.el.offsetWidth; this.el.classList.add('hit-' + q);
    if (up && this.tier === 1 && !this.game.flags.toldStreak) { this.game.flags.toldStreak = true; this.game.ui.toast('🔥 A streak! Perfect taps in a row send a shockwave along the ground that works on things nearby. A miss knocks the streak down a level.', 5200); }
    return { q, mult, tier: this.tier, up, down };
  }
  /** The streak under the bar: five pips, its name and what a perfect is worth now. */
  streakLine() {
    const t = this.tier, c = $('wg-combo'); this.el.dataset.heat = t;
    c.textContent = t ? `🔥 ${'●'.repeat(t)}${'○'.repeat(5 - t)}  ${TIER_NAME[t].toUpperCase()} · perfects x${(1 + 0.3 * t).toFixed(1)}` : this.pts > 0 ? `○○○○○  perfects in a row build a streak` : '';
  }
  /**
   * How hard the bar is. The streak makes the marker quicker and the gold narrower; so does skill past level 3 (the
   * zone widens a little up to level 5 and narrows after), so the top levels have to be earned and kept. Never quicker
   * than a person can hit: the gold is always at least ~32 ms wide in time, the green ~100 ms.
   */
  lvl() { return this.game.skills.level(this.kind); }
  spd() { return this.k.speed * (1 + 0.035 * Math.max(0, this.lvl() - 3)) * (1 + 0.07 * this.tier); }
  pw() { return Math.max(this.k.perfect * this.game.skills.zone(this.kind) * (1 - 0.07 * this.tier), this.spd() * 0.032); }
  gw() { return Math.max(this.k.good * this.game.skills.zone(this.kind) * (1 - 0.04 * this.tier), this.spd() * 0.1); }
  strike() {
    this.idle = 0; this.lastPress = performance.now(); let q;
    if (this.fishState === 'bite') { const fast = this.fishT > this.biteWin() * 0.5; q = fast ? 'perfect' : 'good'; this.combo = q === 'perfect' ? this.combo + 1 : this.combo; this.pop(q === 'perfect' ? (this.combo > 1 ? `CAUGHT IT! x${this.combo}` : 'CAUGHT IT!') : 'Got one!', q); Sfx.play('perfect'); this.fishState = 'reel'; this.fishT = 0.8; }
    else if (this.fishState === 'reel') return { q: 'none', mult: 0 };
    else { q = 'miss'; this.combo = 0; this.pop('Too soon! Scared it off', 'miss'); Sfx.play('miss'); this.cast(); this.fishT += 0.8; }
    const c = $('wg-combo'); c.textContent = this.combo > 1 ? `🔥 CATCH STREAK x${this.combo}` : ''; this.el.dataset.heat = Math.min(4, this.combo);
    return { q, mult: q === 'perfect' ? 1 + Math.min(this.combo - 1, 6) * 0.3 : 1, fish: true };
  }
  biteWin() { return Math.max(0.35, 0.9 - Math.min(this.combo, 6) * 0.09) * this.game.skills.zone('fish'); }
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
    $('wg-hint').textContent = this.game.ui.keyText(this.tier ? 'Keep the streak going! A miss knocks it down a level.' : 'Tap E in the green, gold = perfect. Perfects in a row build a streak.');
  }
}
