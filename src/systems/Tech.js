import { BUILDINGS } from '../data/buildings.js';

/**
 * The march of progress. Era 0: no power (ledgers, wirelesses, oil lamps). Era 1: a Power Plant is running
 * (tellies, aerials, electric lamps). Era 2: power + enough research (computers, satellite dishes, uPVC doors).
 * Research comes from the Schoolhouse, Library and Town Hall. Old buildings are modernised one at a time.
 */
export const ERAS = ['Steam & candle', 'Electric', 'Computer'];
export const RESEARCH_FOR_COMPUTERS = 90;
const RESEARCH = { school: 1.0, library: 2.5, townhall: 0.6, office: 0.4, clinic: 0.4 };   // per worker per working hour

export class Tech {
  constructor(game) { this.game = game; this.era = 0; this.research = 0; this.acc = 0; this.upT = 6; }
  get power() { return this.game.buildings.list.some((b) => b.id === 'power' && b.state === 'done'); }
  get computers() { return this.era >= 2; }
  /** Called every game hour. */
  hourly() {
    const g = this.game, h = g.clock.hour; let r = 0;
    if (h >= 8 && h < 18) for (const b of g.buildings.list) { const k = RESEARCH[b.id]; if (k && b.state === 'done') r += k * Math.max(b.id === 'school' ? 0.5 : 0, b.workers.length); }
    this.research += r;
  }
  update(dt) {
    const g = this.game;
    if (this.era < 1 && this.power) this.advance(1, 'The power is on!', 'Dear Sam,\n\nThe Power Plant is humming and the wires are live. Homes will be fitted with electric lamps and the odd television set, street by street.\n\nComputers? Not yet. Somebody has to invent them first: keep the Schoolhouse and a Library busy and the boffins will get there.\n\nThe Electricity Board');
    if (this.era === 1 && this.research >= RESEARCH_FOR_COMPUTERS) this.advance(2, 'The computer age!', 'Dear Sam,\n\nAfter years of chalk, slide rules and very long nights in the Library, the first computers have arrived. Beige, humming, and about as powerful as a pocket calculator, but there you go.\n\nOffices and the Planning Office will swap their ledgers for terminals as they are refitted.\n\nThe Council (Department of the Future)');
    // modernise one building at a time
    this.upT -= dt; if (this.upT <= 0) {
      this.upT = 8 + Math.random() * 10;
      const old = g.buildings.list.filter((b) => b.state === 'done' && !b.def.special && !b.def.park && (b.era ?? 0) < this.era);
      if (old.length) { const b = old[Math.floor(Math.random() * old.length)]; g.buildings.restyle(b, this.era); }
    }
  }
  advance(era, title, body) {
    const g = this.game; this.era = era; if (!g.started) return;
    g.messages.push('Progress', `${title} The ${ERAS[era]} age begins.`, 'good'); g.ui.toast(`⚡ ${title}`, 4000); g.mail.send(era === 1 ? 'The Electricity Board' : 'The Council', title, body);
  }
  status() { return { era: this.era, name: ERAS[this.era], research: Math.floor(this.research), need: RESEARCH_FOR_COMPUTERS, power: this.power }; }
  serialize() { return { era: this.era, research: this.research }; }
  load(s) { if (!s) return; this.era = s.era || 0; this.research = s.research || 0; }
}
void BUILDINGS;
