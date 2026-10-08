import { BUILDINGS, MATERIALS } from '../data/buildings.js';
import { START_FUNDS } from '../config.js';
import { Emitter } from '../util.js';

/** Funds, material stock, permits and delivery orders. */
export class Economy extends Emitter {
  constructor(game) {
    super(); this.game = game; this.funds = START_FUNDS; this.stock = { timber: 0, brick: 0, steel: 0, glass: 0 };
    this.permits = {}; for (const id of Object.keys(BUILDINGS)) this.permits[id] = BUILDINGS[id].special ? 'approved' : 'locked';
    this.orders = []; this.lastReport = null;
  }
  spend(n) { if (this.funds < n) return false; this.funds -= n; return true; }
  earn(n) { this.funds += n; }
  isUnlocked(id) { return this.permits[id] === 'approved'; }

  requestPermit(id) {
    const def = BUILDINGS[id], g = this.game;
    if (this.permits[id] !== 'locked') return { ok: false, msg: 'Already requested.' };
    if (g.population.count() < def.permit.pop) return { ok: false, msg: `Needs ${def.permit.pop} residents.` };
    if (!this.spend(def.permit.cost)) return { ok: false, msg: 'Not enough funds.' };
    this.permits[id] = 'pending';
    g.messages.push('Planning Office', `Permit request for ${def.name} received. Processing...`);
    g.flags.permitRequested = true;
    setTimeout(() => { if (this.permits[id] === 'pending') { this.permits[id] = 'approved'; g.messages.push('Planning Office', `${def.name} APPROVED. It is now in your build menu.`, 'good'); this.emit('permits'); } }, 5000 / Math.max(1, g.clock.speed));
    return { ok: true, msg: 'Request sent.' };
  }

  orderMaterial(mat, qty) {
    const cost = MATERIALS[mat].price * qty;
    if (!this.spend(cost)) return { ok: false, msg: 'Not enough funds.' };
    this.orders.push({ mat, qty, eta: 6 });
    this.game.flags.orderPlaced = true;
    this.game.messages.push('Logistics', `Order placed: ${qty} ${MATERIALS[mat].name}. A truck is coming down from the Lift.`);
    return { ok: true, msg: 'Ordered.' };
  }

  update(dt) {
    for (const o of this.orders) { o.eta -= dt; if (o.eta <= 0 && !o.sent) { o.sent = true; this.game.logistics.dispatch(o); } }
    this.orders = this.orders.filter((o) => !o.done);
  }
  deliverToDepot(o) { this.stock[o.mat] += o.qty; o.done = true; this.emit('stock'); this.game.messages.push('Logistics', `Delivered ${o.qty} ${MATERIALS[o.mat].name} to the depot.`, 'good'); }

  monthly() {
    const g = this.game; let income = 0, cost = 0, shops = 0;
    income += g.population.count() * 35;
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || b.def.special) continue;
      cost += b.def.park ? 8 : 12;
      const staffed = b.workers.filter((s) => s.inside === b).length;
      if (b.id === 'shop') { income += staffed * 140; shops++; }
      if (b.id === 'factory') income += b.workers.length * 120;
      if (b.id === 'office' || b.id === 'hotel' || b.id === 'skyscraper') income += b.workers.length * 110;
    }
    const wages = g.population.employed() * 6; cost += wages;
    const net = Math.round(income - cost); this.funds += net;
    this.lastReport = { income: Math.round(income), cost: Math.round(cost), net };
    g.messages.push('Treasury', `Monthly report: income $${Math.round(income)}, costs $${Math.round(cost)}, net ${net >= 0 ? '+' : '-'}$${Math.abs(net)}.`, net >= 0 ? 'good' : 'warn');
  }
  serialize() { return { funds: this.funds, stock: this.stock, permits: this.permits }; }
  load(s) { this.funds = s.funds; Object.assign(this.stock, s.stock); Object.assign(this.permits, s.permits); }
}
