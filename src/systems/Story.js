import { Sfx } from '../core/Sfx.js';
import { ALERT_LINES, ALERT_SLIPS, OBJECTIVES, OLD_OBJECTIVES, SLIPS, GREETINGS, ROLE_LINES, NIGHT_LINES, SCRIPT_PAGES, HUNGRY_LINES, PARTNER_LINES, CHILD_LINES, ELDER_LINES } from '../data/story.js';
import { pick } from '../util.js';
import { ANACHRONISMS, SAM_WONDERS, COVER_UPS } from '../data/anachronisms.js';

// whispered by a famous visitor when the minder isn't looking (a guest's own `tip` in data/guests.js comes first)
const TIPS = [
  '(whispering) Sam. Listen. It isn\'t 1995. It hasn\'t been 1995 for a very long time. (A glance at a watch, quickly covered with a sleeve.)',
  '(whispering) Two in the morning the Lift crew change over. Nobody watches the platform. You didn\'t hear it from me.',
  '(whispering) There\'s an office up above the sky. People in headsets, writing your days. I\'ve seen it.',
  '(whispering) That tower of yours. Build it high enough and you\'ll touch the ceiling. I mean that. The ceiling.',
  '(whispering) My agent said, whatever you do, don\'t tell Sam what year it is. So I won\'t. (Taps a watch. It says 2026.)',
  '(whispering) The quarrymen have blasting powder. A lot of it. Enough for a Lift. Just saying.',
];
const he = (s) => (s && s.gender === 'f' ? ['she', 'She', 'her'] : ['he', 'He', 'him']);

/** Objective chain, story stages (the Truman-style reveal) and dialogue selection. */
export class Story {
  constructor(game) { this.game = game; this.stage = 0; this.objective = 0; this.clues = 0; this.pages = []; this.domeRevealed = false; this.domeAlpha = 0; this.slips = 0; this.tips = 0; this.words = []; this.slipT = 200; this.beats = []; }
  get currentObjective() { return OBJECTIVES[this.objective] || null; }
  /** Where the current goal wants Sam (worked out a few times a second, not every frame). */
  target() {
    const now = performance.now(); if (this._tT && now - this._tT < 300 && this._tObj === this.objective) return this._t;
    const o = this.currentObjective; this._tT = now; this._tObj = this.objective; this._t = o && o.target ? o.target(this.game) : null; return this._t;
  }

  update(dt) {
    const g = this.game, o = this.currentObjective;
    if (o && o.done(g)) { g.messages.push('Objective complete', o.title.replace(/^\d+\. /, ''), 'quiet'); this.objective++; g.ui.goalDone(o.title.replace(/^\d+\. /, '')); }   // (the banner and the fanfare say it: no message on top)
    const pop = g.population.count();
    const days = g.clock.totalDays || 0;   // the story creeps in slowly: a village first, the oddities later
    if (this.stage < 1 && pop >= 12 && days >= 6) this.setStage(1);
    if (this.stage < 2 && pop >= 28 && days >= 14) this.setStage(2);
    if (!this.domeRevealed && g.largeCount() >= 2 && g.population.count() >= 40 && days >= 22) { this.domeRevealed = true; this.setStage(Math.max(3, this.stage)); }
    if (this.stage < 4 && this.clues >= 3 && this.domeRevealed) this.setStage(4);
    const target = this.domeRevealed ? 1 : 0; this.domeAlpha += (target - this.domeAlpha) * Math.min(1, dt * 0.5);
    this.ambient(dt);
  }
  /**
   * Now and then, near Sam, somebody lets slip a word from the year it really is, then puts it right with something
   * from 1995 (too quickly). A neighbour covers for them. More often as the story goes on.
   */
  ambient(dt) {
    const g = this.game, P = g.player, gdt = dt * Math.max(0, Math.min(4, g.clock.speed));
    for (const b of this.beats) { b.t -= gdt; if (b.t <= 0 && !b.done) { b.done = true; if (!b.s.remove && b.s.mesh.visible) { g.social.say(b.s, b.text, b.dur || 3); if (b.emote) b.s.emote = { upper: b.emote, t: 2 }; } } }
    this.beats = this.beats.filter((b) => !b.done);
    if ((this.slipT -= gdt) > 0 || g.mode !== 'sim' || g.ending || (g.cutscene && g.cutscene.live) || (g.clock.totalDays || 0) < 3) return;
    this.slipT = [300, 170, 120, 85, 65][Math.min(4, this.stage)] * (0.7 + Math.random() * 0.6);
    const inB = g.buildings.playerInside, near = g.population.sims.filter((q) => q.kind === 'resident' && q.age >= 16 && q.mesh.visible && !q.chat && !q.bubble && !q.sitting && q.pose !== 'sleep' && !q.fight && !q.crook && (q.inside || null) === (inB || null) && Math.hypot(q.x - P.x, q.z - P.z) < 9);
    const s = pick(near); if (!s) { this.slipT = 20; return; }
    const a = this.anachronism(); g.social.say(s, a.s, 2.2); s.faceGoal = Math.atan2(P.x - s.x, P.z - s.z);
    const knowing = !!g.flags.stayed;   // (after the office above the sky, they've stopped pretending. Mostly.)
    this.beats.push({ s, t: 2.3, text: knowing ? pick(['...You know what I mean, Sam. (A wink.)', 'Oh, come on. You know.', '(A wink.) Same time tomorrow, Sam.']) : a.c, dur: 3.4, emote: knowing ? 'thumbsup' : pick(['facepalm', 'earpiece', 'lookaround', 'shush']) });
    const o = near.find((q) => q !== s && Math.hypot(q.x - s.x, q.z - s.z) < 5); if (o && Math.random() < 0.6) { const [p, Pp, him] = he(s); this.beats.push({ s: o, t: 4.2, text: pick(COVER_UPS).replace(/\{P\}/g, Pp).replace(/\{p\}/g, p).replace(/\{him\}/g, him), dur: 2.4, emote: 'laugh' }); }
    this.heard(a, s);
  }
  /** One of the slips from the real year (and its correction). */
  anachronism() { return pick(ANACHRONISMS); }
  /** Sam heard one: the odd word goes in the notes, and the first few (then every so often) Sam wonders about it. */
  heard(a, s) {
    const g = this.game; this.slips++; if (a.w && !this.words.includes(a.w)) this.words.push(a.w);
    if (this.slips <= 5 || this.slips % 4 === 0) { const [p, , him] = he(s); g.messages.push('Sam (thought)', pick(SAM_WONDERS).replace(/\{w\}/g, a.w).replace(/\{p\}/g, p).replace(/\{him\}/g, him), 'story'); }
  }
  /** A famous visitor's whisper, when the minder isn't looking. */
  tip(G, s) {
    const g = this.game, line = (G && G.tip && !(g.flags.tipped || []).includes(G.name)) ? G.tip : pick(TIPS); (g.flags.tipped ||= []).push(G ? G.name : '?'); this.tips++;
    if (s && !s.remove) g.social.say(s, line, 5); this.pages.push(`${G ? G.name : 'A famous visitor'} whispered, when the minder wasn't looking: ${line.replace('(whispering) ', '"')}"`);
    g.messages.push('Sam (thought)', `Did ${G ? G.name : 'they'} really just say that?`, 'story');
  }
  setStage(n) {
    if (n <= this.stage) return; this.stage = n;
    // The story never announces itself: no messages, no alarms. Stage 3 faintly reveals the seams of the sky (see Atmosphere),
    // stage 4 simply adds a quiet note to the terminal once three crumpled pages have been found.
  }

  /** A small oddity in conversation, more likely as the story advances (or null). */
  slipLine(sim) { const tier = Math.min(this.stage, SLIPS.length - 1), p = [0, 0.07, 0.18, 0.4, 0.6][this.stage] || 0; if (tier > 0 && Math.random() < 0.35) { const a = this.anachronism(); this.heard(a, sim); return a.s + ' ' + a.c; } if (tier > 0 && Math.random() < p) { const t = Math.random() < 0.6 ? tier : 1 + Math.floor(Math.random() * tier); return pick(SLIPS[Math.min(t, SLIPS.length - 1)]); } return null; }
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
  serialize() { return { stage: this.stage, objective: this.objective, objId: (OBJECTIVES[this.objective] || { id: 'end' }).id, clues: this.clues, pages: this.pages, domeRevealed: this.domeRevealed, slips: this.slips, tips: this.tips, words: this.words }; }
  load(s) { Object.assign(this, s); { const id = s.objId || (s.objective < OLD_OBJECTIVES.length ? OLD_OBJECTIVES[s.objective] : null), i = id ? OBJECTIVES.findIndex((o) => o.id === id) : -1; if (i >= 0) this.objective = i; else if (s.objId === 'end' || s.objective >= OLD_OBJECTIVES.length) this.objective = OBJECTIVES.length; } this.domeAlpha = this.domeRevealed ? 1 : 0; }
}
