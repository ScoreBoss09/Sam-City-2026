import { Sfx } from '../core/Sfx.js';
import { fmtMoney } from '../util.js';

/**
 * Council challenges: optional side goals that arrive in the post three at a time. Each one pays a grant from the Council when it's met.
 * `need` is the target, `have(g)` the current count, `pop` the population before the Council bothers asking.
 */
const done = (g, id) => g.buildings.count(id) > 0 ? 1 : 0;
const friends = (g) => g.population.sims.filter((s) => (s.samRel || 0) >= 40 && !s.remove).length;
const paved = (g) => { let n = 0; for (const r of g.world.road) if (r === 2) n++; return n; };
const avgMood = (g) => { const R = g.population.adults(); return R.length ? Math.round(R.reduce((a, s) => a + s.mood, 0) / R.length * 100) : 0; };
export const CHALLENGES = [
  { id: 'larder', icon: '🧺', title: 'A full larder', text: 'Have 40 food in the Stockyard.', need: 40, have: (g) => Math.floor(g.economy.stock.food), pay: 400, pop: 0 },
  { id: 'logpile', icon: '🪵', title: 'Timber stack', text: 'Have 50 timber in the Stockyard.', need: 50, have: (g) => Math.floor(g.economy.stock.timber), pay: 350, pop: 0 },
  { id: 'handy', icon: '🛠️', title: 'Handy Sam', text: 'Reach a total of 12 skill levels (see your journal).', need: 12, have: (g) => g.skills.total(), pay: 400, pop: 0 },
  { id: 'friends', icon: '🤝', title: 'Friendly face', text: 'Make 3 friends: chat to people and do them favours.', need: 3, have: friends, pay: 350, pop: 3 },
  { id: 'favours', icon: '🎁', title: 'Good neighbour', text: 'Do 5 favours for the townsfolk.', need: 5, have: (g) => g.flags.favours || 0, pay: 500, pop: 4 },
  { id: 'angler', icon: '🎣', title: 'Catch of the day', text: 'Reach Fishing level 3.', need: 3, have: (g) => g.skills.level('fish'), pay: 300, pop: 4 },
  { id: 'curios', icon: '🔍', title: 'Treasure hunter', text: 'Find 6 curios around the island.', need: 6, have: (g) => g.curios.found.size, pay: 600, pop: 5 },
  { id: 'green', icon: '🌳', title: 'Green and pleasant', text: 'Finish 3 parks, plazas, greens or allotments.', need: 3, have: (g) => g.buildings.list.filter((b) => b.state === 'done' && b.def.park && /park|plaza|field|allotment/.test(b.def.park)).length, pay: 600, pop: 6 },
  { id: 'fete', icon: '🎪', title: 'Fête accompli', text: 'Hold 2 village fêtes.', need: 2, have: (g) => g.flags.fetes || 0, pay: 400, pop: 6 },
  { id: 'local', icon: '🍺', title: 'A proper local', text: 'Open a pub: The Red Lion.', need: 1, have: (g) => done(g, 'tavern'), pay: 500, pop: 8 },
  { id: 'kids', icon: '🧸', title: 'Patter of tiny feet', text: 'Have 4 children in town.', need: 4, have: (g) => g.population.residents().filter((s) => s.kind === 'child').length, pay: 600, pop: 10 },
  { id: 'wedding', icon: '💒', title: 'Wedding bells', text: 'See a couple married at St Sam\'s Church.', need: 1, have: (g) => g.flags.weddings || 0, pay: 500, pop: 12 },
  { id: 'cheer', icon: '😊', title: 'Cheerful town', text: 'Average mood of 30% or better with 15 adults.', need: 30, have: (g) => g.population.adults().length >= 15 ? avgMood(g) : 0, pay: 900, pop: 15 },
  { id: 'paving', icon: '🧱', title: 'Mind the potholes', text: 'Pave 20 tiles of road with stone.', need: 20, have: paved, pay: 800, pop: 15 },
  { id: 'market', icon: '🥕', title: 'Market trader', text: 'Buy or sell 10 things at the market.', need: 10, have: (g) => g.flags.market || 0, pay: 500, pop: 15 },
  { id: 'jobs', icon: '💼', title: 'Full employment', text: 'Nobody out of work, with at least 20 adults.', need: 1, have: (g) => { const A = g.population.adults().filter((s) => g.population.canWork(s)); return A.length >= 20 && A.every((s) => s.workplace) ? 1 : 0; }, pay: 1000, pop: 20 },
  { id: 'light', icon: '💡', title: 'Let there be light', text: 'Bring electricity to town with a Power Plant.', need: 1, have: (g) => done(g, 'power'), pay: 1500, pop: 30 },
  { id: 'master', icon: '🏅', title: 'Master craftsman', text: 'Reach level 8 in any skill.', need: 8, have: (g) => Math.max(...['chop', 'mine', 'dig', 'harvest', 'fish', 'build'].map((k) => g.skills.level(k))), pay: 1200, pop: 20 },
];

export class Challenges {
  constructor(game) { this.game = game; this.t = 0; }
  get doneIds() { const f = this.game.flags; return f.challenges || (f.challenges = []); }
  /** The (up to) three challenges currently on the Council's list. */
  open() { const g = this.game, pop = g.population.count(), D = this.doneIds; return CHALLENGES.filter((c) => !D.includes(c.id) && pop >= c.pop).slice(0, 3); }
  progress(c) { const h = Math.min(c.need, Math.max(0, c.have(this.game) || 0)); return { have: h, need: c.need, frac: h / c.need }; }
  update(dt) {
    const g = this.game; this.t -= dt; if (this.t > 0 || !g.mail.box || !g.started) return; this.t = 1.5;
    const open = this.open(), ids = open.map((c) => c.id).join();
    if (ids !== this.lastIds) { if (this.lastIds !== undefined && open.length) g.mail.send('The Parish Council', 'New challenges', `Dear Sam,\n\nThe Council's list now reads:\n\n${open.map((c) => `${c.icon} ${c.title}: ${c.text} (grant ${fmtMoney(c.pay)})`).join('\n')}\n\nSee the Challenges page in the post.\n\nThe Parish Council`, { quiet: true }); this.lastIds = ids; }
    for (const c of open) if (this.progress(c).frac >= 1) this.complete(c);
  }
  complete(c) {
    const g = this.game; this.doneIds.push(c.id); g.economy.funds += c.pay; Sfx.play('done');
    g.ui.toast(`${c.icon} Challenge done: ${c.title}! The Council sends a grant of ${fmtMoney(c.pay)}.`, 4200);
    g.messages.push('Parish Council', `${c.title}: grant of ${fmtMoney(c.pay)}.`, 'good');
    g.mail.send('The Parish Council', `Well done: ${c.title}`, `Dear Sam,\n\n"${c.text}" Done, and the Council is delighted. Please find enclosed a grant of ${fmtMoney(c.pay)}, already paid into the town funds.\n\nWith thanks,\nThe Parish Council`, { quiet: true });
  }
}
