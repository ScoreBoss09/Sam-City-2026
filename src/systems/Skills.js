import { Sfx } from '../core/Sfx.js';

/** Practice makes perfect: every good tap on the timing bar teaches Sam a little. Higher levels work faster, get a wider green zone and, from level 5, the odd bonus unit. */
export const SKILLS = {
  chop:    { icon: '🌲', name: 'Woodcutting', perk: 'a spare log now and then' },
  mine:    { icon: '⛏️', name: 'Quarrying',   perk: 'a spare stone now and then' },
  dig:     { icon: '🛠️', name: 'Digging',     perk: 'paths dug in fewer strokes' },
  harvest: { icon: '🍓', name: 'Foraging',    perk: 'a spare handful now and then' },
  fish:    { icon: '🎣', name: 'Fishing',     perk: 'more time to strike, a spare fish now and then' },
  build:   { icon: '🔨', name: 'Building',    perk: 'sites go up faster' },
};
const NEED = [0, 15, 40, 80, 140, 220, 330, 470, 650, 880];   // total practice for levels 1..10
const TITLES = ['Novice', 'Novice', 'Handy', 'Handy', 'Skilled', 'Skilled', 'Expert', 'Expert', 'Master', 'Grand Master'];

export class Skills {
  constructor(game) { this.game = game; }
  get xp() { const f = this.game.flags; return f.skills || (f.skills = {}); }
  level(k) { const x = this.xp[k] || 0; let l = 1; while (l < NEED.length && x >= NEED[l]) l++; return l; }
  title(k) { return TITLES[this.level(k) - 1]; }
  /** 0..1 progress towards the next level. */
  frac(k) { const l = this.level(k); if (l >= NEED.length) return 1; const a = NEED[l - 1], b = NEED[l]; return ((this.xp[k] || 0) - a) / (b - a); }
  /** Work done per stroke. */
  bonus(k) { return 1 + 0.15 * (this.level(k) - 1); }   // level 5 works 1.6x as fast, level 10 2.35x
  /** The green and gold zones widen a little with practice, up to level 5; past that they narrow again (the top levels are a test, see WorkGame). */
  zone(k) { const l = this.level(k); return l <= 5 ? 1 + 0.035 * (l - 1) : 1.14 - 0.03 * (l - 5); }
  /** Chance of a spare unit when gathering. */
  luck(k) { const l = this.level(k); return l >= 5 ? (l - 4) * 0.06 : 0; }
  total() { return Object.keys(SKILLS).reduce((n, k) => n + this.level(k), 0); }
  /**
   * A miss on the timing bar costs a little practice from level 3 up (more the higher Sam is), so the top levels have to
   * be kept up. It eats into this level's progress first; a run of misses at the very bottom of a level drops Sam back a
   * level, part-way up the one below (so one good stroke doesn't bounce him straight back up).
   */
  slip(k) {
    const l = this.level(k); if (!SKILLS[k] || l <= 2) return 0; const x = this.xp, f = this.game.flags, sl = f.skillSlip || (f.skillSlip = {}), floor = NEED[l - 1], lose = Math.ceil((l - 2) / 2);
    if ((x[k] || 0) - lose >= floor) { x[k] -= lose; return lose; }
    x[k] = floor; sl[k] = (sl[k] || 0) + 1; if (sl[k] < 5) return lose;
    sl[k] = 0; x[k] = Math.round(NEED[l - 2] + (floor - NEED[l - 2]) * 0.6); const s = SKILLS[k];
    Sfx.tone(440, 0.14, { type: 'triangle', vol: 0.14 }); Sfx.tone(330, 0.2, { type: 'triangle', vol: 0.14, delay: 0.14 });
    this.game.ui.toast(`${s.icon} ${s.name} slipped back to level ${l - 1}. Keep your timing steady to win it back.`, 3400); return lose;
  }
  gain(k, n) {
    if (!SKILLS[k] || !n) return; if (this.game.flags.skillSlip) this.game.flags.skillSlip[k] = 0; const before = this.level(k); this.xp[k] = Math.min(NEED[NEED.length - 1] + 120, (this.xp[k] || 0) + n); const after = this.level(k);   // (no banking practice past the top: Grand Master has to be kept up)
    if (after > before) {
      const s = SKILLS[k], g = this.game; Sfx.tone(660, 0.12, { type: 'square', vol: 0.12 }); Sfx.tone(880, 0.12, { type: 'square', vol: 0.12, delay: 0.12 }); Sfx.tone(1175, 0.2, { type: 'square', vol: 0.12, delay: 0.24 });
      g.ui.toast(`${s.icon} ${s.name} level ${after}: ${TITLES[after - 1]}! Sam works a bit faster${after === 5 ? `, and gets ${s.perk}` : ''}.`, 3600);
      g.particles.burst(g.player.x, 2.2, g.player.z, 0xffd84a, 24, 1.4, 3);
      if (after === 5 || after === 10) g.messages.push('Sam', `${s.name} is now ${TITLES[after - 1]} (level ${after}).`, 'good');
    }
  }
}
