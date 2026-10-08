import { OBJECTIVES, SLIPS, GREETINGS, ROLE_LINES, NIGHT_LINES, SCRIPT_PAGES } from '../data/story.js';
import { pick } from '../util.js';

/** Objective chain, story stages (the Truman-style reveal) and dialogue selection. */
export class Story {
  constructor(game) { this.game = game; this.stage = 0; this.objective = 0; this.clues = 0; this.pages = []; this.domeRevealed = false; this.domeAlpha = 0; }
  get currentObjective() { return OBJECTIVES[this.objective] || null; }

  update(dt) {
    const g = this.game, o = this.currentObjective;
    if (o && o.done(g)) { g.messages.push('Objective complete', o.text, 'good'); this.objective++; g.ui.flashObjective(); const n = this.currentObjective; if (n) g.messages.push('New objective', n.text); }
    const pop = g.population.count();
    if (this.stage < 1 && pop >= 12) this.setStage(1);
    if (this.stage < 2 && pop >= 28) this.setStage(2);
    if (!this.domeRevealed && g.largeCount() >= 2) { this.domeRevealed = true; this.setStage(Math.max(3, this.stage)); }
    if (this.stage < 4 && this.clues >= 3 && this.domeRevealed) this.setStage(4);
    const target = this.domeRevealed ? 1 : 0; this.domeAlpha += (target - this.domeAlpha) * Math.min(1, dt * 0.5);
  }
  setStage(n) {
    if (n <= this.stage) return; this.stage = n; const m = this.game.messages;
    if (n === 1) m.push('Sam (thought)', 'Odd. A few people have repeated the same sentence word for word. Probably nothing.', 'story');
    if (n === 2) m.push('Sam (thought)', 'Everyone is so... on time. Has anybody here ever been late for real?', 'story');
    if (n === 3) { m.push('PA SYSTEM', 'Attention citizens: please disregard any visual disturbance overhead. Thank you for your cooperation.', 'alarm'); m.push('Sam (thought)', 'Something is up there. A seam in the sky. I need answers — the residents keep slipping up.', 'story'); this.game.ui.toast('THE SKY HAS A SEAM'); this.game.glitch = 2.5; }
    if (n === 4) { m.push('Sam (thought)', 'Three pages. Guard rotation at 02:00 to 04:00. The tunnel is the way out.', 'story'); }
  }

  /** Returns { text, page? } for a conversation with a sim. */
  dialogue(sim) {
    const g = this.game; sim.talkCount++;
    let text;
    const tier = Math.min(this.stage, SLIPS.length - 1), p = [0, 0.2, 0.35, 0.55, 0.65][this.stage] || 0;
    if (tier > 0 && Math.random() < p) { const t = Math.random() < 0.6 ? tier : 1 + Math.floor(Math.random() * tier); text = pick(SLIPS[Math.min(t, SLIPS.length - 1)]); }
    else if (g.clock.hour >= 22 || g.clock.hour < 5) text = pick(NIGHT_LINES);
    else if (sim.role && ROLE_LINES[sim.role] && Math.random() < 0.55) text = pick(ROLE_LINES[sim.role]);
    else text = pick(GREETINGS[sim.trait] || GREETINGS.cheerful);
    let page = null;
    if (this.stage >= 2 && !sim.gaveClue && sim.talkCount >= 2 && this.clues < 3 && sim.kind === 'resident' && Math.random() < 0.5) {
      sim.gaveClue = true; page = SCRIPT_PAGES[this.clues]; this.clues++; this.pages.push(page);
      text += '  ...Here. Take this. You didn\'t get it from me.';
    }
    return { text, page };
  }
  serialize() { return { stage: this.stage, objective: this.objective, clues: this.clues, pages: this.pages, domeRevealed: this.domeRevealed }; }
  load(s) { Object.assign(this, s); this.domeAlpha = this.domeRevealed ? 1 : 0; }
}
