import { Sfx } from '../core/Sfx.js';
import { ALERT_LINES, ALERT_SLIPS, OBJECTIVES, OLD_OBJECTIVES, SLIPS, GREETINGS, ROLE_LINES, NIGHT_LINES, SCRIPT_PAGES, HUNGRY_LINES, PARTNER_LINES, CHILD_LINES, ELDER_LINES } from '../data/story.js';
import { pick } from '../util.js';

/** Objective chain, story stages (the Truman-style reveal) and dialogue selection. */
export class Story {
  constructor(game) { this.game = game; this.stage = 0; this.objective = 0; this.clues = 0; this.pages = []; this.domeRevealed = false; this.domeAlpha = 0; }
  get currentObjective() { return OBJECTIVES[this.objective] || null; }
  /** Where the current goal wants Sam (worked out a few times a second, not every frame). */
  target() {
    const now = performance.now(); if (this._tT && now - this._tT < 300 && this._tObj === this.objective) return this._t;
    const o = this.currentObjective; this._tT = now; this._tObj = this.objective; this._t = o && o.target ? o.target(this.game) : null; return this._t;
  }

  update(dt) {
    const g = this.game, o = this.currentObjective;
    if (o && o.done(g)) { g.messages.push('Objective complete', o.title.replace(/^\d+\. /, ''), 'good'); this.objective++; g.ui.flashObjective(); Sfx.play('done'); }
    const pop = g.population.count();
    const days = g.clock.totalDays || 0;   // the story creeps in slowly: a village first, the oddities later
    if (this.stage < 1 && pop >= 12 && days >= 6) this.setStage(1);
    if (this.stage < 2 && pop >= 28 && days >= 14) this.setStage(2);
    if (!this.domeRevealed && g.largeCount() >= 2 && g.population.count() >= 40 && days >= 22) { this.domeRevealed = true; this.setStage(Math.max(3, this.stage)); }
    if (this.stage < 4 && this.clues >= 3 && this.domeRevealed) this.setStage(4);
    const target = this.domeRevealed ? 1 : 0; this.domeAlpha += (target - this.domeAlpha) * Math.min(1, dt * 0.5);
  }
  setStage(n) {
    if (n <= this.stage) return; this.stage = n;
    // The story never announces itself: no messages, no alarms. Stage 3 faintly reveals the seams of the sky (see Atmosphere),
    // stage 4 simply adds a quiet note to the terminal once three crumpled pages have been found.
  }

  /** A small oddity in conversation, more likely as the story advances (or null). */
  slipLine() { const tier = Math.min(this.stage, SLIPS.length - 1), p = [0, 0.07, 0.18, 0.4, 0.6][this.stage] || 0; if (tier > 0 && Math.random() < p) { const t = Math.random() < 0.6 ? tier : 1 + Math.floor(Math.random() * tier); return pick(SLIPS[Math.min(t, SLIPS.length - 1)]); } return null; }
  /** Sometimes a resident slips Sam one of the crumpled pages. */
  pageFor(sim) {
    if (this.stage >= 2 && !sim.gaveClue && sim.talkCount >= 2 && this.clues < 3 && sim.kind === 'resident' && sim.age >= 18 && Math.random() < 0.5) { sim.gaveClue = true; const page = SCRIPT_PAGES[this.clues]; this.clues++; this.pages.push(page); this.game.ui.toast('Sam pockets a crumpled page.', 2200); return page; }
    return null;
  }
  /** Returns { text, page? } for a conversation with a sim. */
  dialogue(sim) {
    const g = this.game; sim.talkCount++;
    let text;
    const tier = Math.min(this.stage, SLIPS.length - 1), p = [0, 0.07, 0.18, 0.4, 0.6][this.stage] || 0;
    if (g.raids && g.raids.alert && (sim.kind === 'resident' || sim.kind === 'child') && Math.random() < 0.7) text = pick(tier > 1 && Math.random() < 0.3 ? ALERT_SLIPS : ALERT_LINES);
    else if (tier > 0 && Math.random() < p) { const t = Math.random() < 0.6 ? tier : 1 + Math.floor(Math.random() * tier); text = pick(SLIPS[Math.min(t, SLIPS.length - 1)]); }
    else if (sim.hunger > 72 && Math.random() < 0.7) text = pick(HUNGRY_LINES);
    else if (sim.kind === 'child') text = pick(CHILD_LINES);
    else if (sim.partner && Math.random() < 0.3) text = pick(PARTNER_LINES).replace('{p}', sim.partner.first);
    else if (sim.age >= 62 && Math.random() < 0.4) text = pick(ELDER_LINES);
    else if (g.clock.hour >= 22 || g.clock.hour < 5) text = pick(NIGHT_LINES);
    else if (sim.role && ROLE_LINES[sim.role] && Math.random() < 0.55) text = pick(ROLE_LINES[sim.role]);
    else text = pick(GREETINGS[sim.trait] || GREETINGS.cheerful);
    let page = null;
    if (this.stage >= 2 && !sim.gaveClue && sim.talkCount >= 2 && this.clues < 3 && sim.kind === 'resident' && sim.age >= 18 && Math.random() < 0.5) {
      sim.gaveClue = true; page = SCRIPT_PAGES[this.clues]; this.clues++; this.pages.push(page);
      text += '  ...Here, take this. Found it in the bins behind the office. Didn\'t get it from me, alright?'; g.ui.toast('Sam pockets a crumpled page.', 2200);
    }
    return { text, page };
  }
  serialize() { return { stage: this.stage, objective: this.objective, objId: (OBJECTIVES[this.objective] || { id: 'end' }).id, clues: this.clues, pages: this.pages, domeRevealed: this.domeRevealed }; }
  load(s) { Object.assign(this, s); { const id = s.objId || (s.objective < OLD_OBJECTIVES.length ? OLD_OBJECTIVES[s.objective] : null), i = id ? OBJECTIVES.findIndex((o) => o.id === id) : -1; if (i >= 0) this.objective = i; else if (s.objId === 'end' || s.objective >= OLD_OBJECTIVES.length) this.objective = OBJECTIVES.length; } this.domeAlpha = this.domeRevealed ? 1 : 0; }
}
