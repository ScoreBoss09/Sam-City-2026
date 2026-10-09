import { Sfx } from '../core/Sfx.js';

/** Practice makes perfect: every good tap on the timing bar teaches Sam a little. Higher levels work faster, get a wider green zone and, from level 5, the odd bonus unit. */
export const SKILLS = {
  chop:    { icon: '🪓', name: 'Woodcutting', perk: 'a spare log now and then' },
  mine:    { icon: '⛏️', name: 'Quarrying',   perk: 'a spare stone now and then' },
  dig:     { icon: '🛠️', name: 'Digging',     perk: 'paths dug in fewer strokes' },
  harvest: { icon: '🫐', name: 'Foraging',    perk: 'a spare handful now and then' },
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
  bonus(k) { return 1 + 0.07 * (this.level(k) - 1); }
  /** The green and gold zones widen a little with practice. */
  zone(k) { return 1 + 0.035 * (this.level(k) - 1); }
  /** Chance of a spare unit when gathering. */
  luck(k) { const l = this.level(k); return l >= 5 ? (l - 4) * 0.06 : 0; }
  total() { return Object.keys(SKILLS).reduce((n, k) => n + this.level(k), 0); }
  gain(k, n) {
    if (!SKILLS[k] || !n) return; const before = this.level(k); this.xp[k] = (this.xp[k] || 0) + n; const after = this.level(k);
    if (after > before) {
      const s = SKILLS[k], g = this.game; Sfx.tone(660, 0.12, { type: 'square', vol: 0.12 }); Sfx.tone(880, 0.12, { type: 'square', vol: 0.12, delay: 0.12 }); Sfx.tone(1175, 0.2, { type: 'square', vol: 0.12, delay: 0.24 });
      g.ui.toast(`${s.icon} ${s.name} level ${after}: ${TITLES[after - 1]}! Sam works a bit faster${after === 5 ? `, and gets ${s.perk}` : ''}.`, 3600);
      g.particles.burst(g.player.x, 2.2, g.player.z, 0xffd84a, 24, 1.4, 3);
      if (after === 5 || after === 10) g.messages.push('Sam', `${s.name} is now ${TITLES[after - 1]} (level ${after}).`, 'good');
    }
  }
}
