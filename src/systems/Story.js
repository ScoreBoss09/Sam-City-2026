import { ALERT_LINES, ALERT_SLIPS, OBJECTIVES, SLIPS, GREETINGS, ROLE_LINES, NIGHT_LINES, SCRIPT_PAGES, HUNGRY_LINES, PARTNER_LINES, CHILD_LINES, ELDER_LINES } from '../data/story.js';
import { pick } from '../util.js';

/** Objective chain, story stages (the Truman-style reveal) and dialogue selection. */
export class Story {
  constructor(game) { this.game = game; this.stage = 0; this.objective = 0; this.clues = 0; this.pages = []; this.domeRevealed = false; this.domeAlpha = 0; }
  get currentObjective() { return OBJECTIVES[this.objective] || null; }

  update(dt) {
    const g = this.game, o = this.currentObjective;
    if (o && o.done(g)) { g.messages.push('Objective complete', o.title.replace(/^\d+\. /, ''), 'good'); this.objective++; g.ui.flashObjective(); const n = this.currentObjective; if (n) g.messages.push('New objective', n.title.replace(/^\d+\. /, '') + ': ' + n.steps[0].text); }
    const pop = g.population.count();
    if (this.stage < 1 && pop >= 12) this.setStage(1);
    if (this.stage < 2 && pop >= 28) this.setStage(2);
    if (!this.domeRevealed && g.largeCount() >= 2 && g.population.count() >= 40) { this.domeRevealed = true; this.setStage(Math.max(3, this.stage)); }
    if (this.stage < 4 && this.clues >= 3 && this.domeRevealed) this.setStage(4);
    const target = this.domeRevealed ? 1 : 0; this.domeAlpha += (target - this.domeAlpha) * Math.min(1, dt * 0.5);
  }
  setStage(n) {
    if (n <= this.stage) return; this.stage = n;
    // The story never announces itself: no messages, no alarms. Stage 3 faintly reveals the seams of the sky (see Atmosphere),
    // stage 4 simply adds a quiet note to the terminal once three crumpled pages have been found.
  }

  /** Returns { text, page? } for a conversation with a sim. */
  dialogue(sim) {
    const g = this.game; sim.talkCount++;
    let text;
    const tier = Math.min(this.stage, SLIPS.length - 1), p = [0, 0.2, 0.35, 0.55, 0.65][this.stage] || 0;
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
  serialize() { return { stage: this.stage, objective: this.objective, clues: this.clues, pages: this.pages, domeRevealed: this.domeRevealed }; }
  load(s) { Object.assign(this, s); this.domeAlpha = this.domeRevealed ? 1 : 0; }
}
