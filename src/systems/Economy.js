import { BUILDINGS, MATERIALS, ALL_BUILDABLE, tierOf } from '../data/buildings.js';
import { START_FUNDS } from '../config.js';
import { Emitter } from '../util.js';

/** Funds, material/food stock, permits, trade and monthly accounts. */
export class Economy extends Emitter {
  constructor(game) {
    super(); this.game = game; this.funds = START_FUNDS; this.stock = { timber: 0, stone: 0, brick: 0, steel: 0, glass: 0, food: 0 };
    this.permits = {}; for (const id of Object.keys(BUILDINGS)) { const d = BUILDINGS[id]; this.permits[id] = d.special || (d.permit && d.permit.cost === 0 && d.permit.pop === 0) ? 'approved' : 'locked'; }
    this.orders = []; this.pending = []; this.lastReport = null; this.foodWarned = -1; this.gathered = 0;
  }
  spend(n) { if (this.funds < n) return false; this.funds -= n; return true; }
  earn(n) { this.funds += n; }
  isUnlocked(id) { return this.permits[id] === 'approved'; }
  add(mat, n) { this.stock[mat] = (this.stock[mat] || 0) + n; this.emit('stock'); }
  tier() { return tierOf(this.game.population.count()); }

  requestPermit(id) {
    const def = BUILDINGS[id], g = this.game;
    if (this.permits[id] !== 'locked') return { ok: false, msg: 'Already requested.' };
    if (g.population.count() < def.permit.pop) return { ok: false, msg: `Needs ${def.permit.pop} residents.` };
    if (!this.spend(def.permit.cost)) return { ok: false, msg: 'Not enough funds.' };
    this.permits[id] = 'pending';
    g.messages.push('Planning Office', `Permit request for ${def.name} received. Processing...`);
    g.flags.permitRequested = true;
    this.pending.push({ id, t: 5 });
    return { ok: true, msg: 'Request sent.' };
  }

  /** Buy goods from outside: a truck brings them down from the Supply Lift (pricey but quick). */
  orderMaterial(mat, qty) {
    const cost = Math.round(MATERIALS[mat].price * 1.4 * qty);
    if (!this.spend(cost)) return { ok: false, msg: 'Not enough funds.' };
    this.orders.push({ mat, qty, eta: 6 }); this.game.flags.orderPlaced = true;
    this.game.messages.push('Logistics', `Order placed: ${qty} ${MATERIALS[mat].name}. A truck is coming down from the Lift.`);
    return { ok: true, msg: 'Ordered.' };
  }
  sellMaterial(mat, qty) {
    if ((this.stock[mat] || 0) < qty) return { ok: false, msg: 'Not enough in the Stockyard.' };
    this.stock[mat] -= qty; const pay = Math.round(MATERIALS[mat].price * 0.55 * qty); this.funds += pay; this.game.flags.sold = true;
    return { ok: true, msg: `Sold for ${pay}` };
  }
  update(dt) {
    for (const q of this.pending) { q.t -= dt; if (q.t <= 0 && this.permits[q.id] === 'pending') { this.permits[q.id] = 'approved'; this.game.messages.push('Planning Office', `${BUILDINGS[q.id].name} APPROVED. It is now in your build menu.`, 'good'); this.emit('permits'); } }
    this.pending = this.pending.filter((q) => q.t > 0);
    for (const o of this.orders) { o.eta -= dt; if (o.eta <= 0 && !o.sent) { o.sent = true; this.game.logistics.dispatch(o); } }
    this.orders = this.orders.filter((o) => !o.done);
  }
  deliverToDepot(o) { this.stock[o.mat] += o.qty; o.done = true; this.emit('stock'); this.game.messages.push('Logistics', `Delivered ${o.qty} ${MATERIALS[o.mat].name} to the Stockyard.`, 'good'); }
  /** A citizen eats one portion. */
  eatPortion() { if (this.stock.food >= 0.5) { this.stock.food -= 0.5; return true; } return false; }
  hourly() {
    const g = this.game, pop = g.population.count();
    if (pop > 0 && this.stock.food < Math.max(2, pop * 0.5) && g.clock.day !== this.foodWarned) { this.foodWarned = g.clock.day; g.messages.push('Stockyard', this.stock.food <= 0 ? 'The Stockyard has NO food left! People will go hungry.' : 'Food is running low in the Stockyard.', 'warn'); }
  }
  monthly() {
    const g = this.game; let income = 0, cost = 0;
    income += g.population.count() * 14;
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || b.def.special) continue;
      cost += b.def.park ? 3 : 5;
      if (b.id === 'shop') income += b.workers.length * 70;
      if (b.id === 'tavern') income += b.workers.length * 90;
      if (b.id === 'factory') income += b.workers.length * 100;
      if (['office', 'hotel', 'skyscraper', 'townhall'].includes(b.id)) income += b.workers.length * 90;
    }
    cost += g.population.employed() * 2;
    const net = Math.round(income - cost); this.funds += net; this.lastReport = { income: Math.round(income), cost: Math.round(cost), net };
    g.messages.push('Treasury', `Monthly accounts: income £${Math.round(income)}, costs £${Math.round(cost)}, net ${net >= 0 ? '+' : '-'}£${Math.abs(net)}.`, net >= 0 ? 'good' : 'warn');
  }
  serialize() { return { funds: this.funds, stock: this.stock, permits: this.permits }; }
  load(s) { this.funds = s.funds; Object.assign(this.stock, s.stock); Object.assign(this.permits, s.permits); }
}
