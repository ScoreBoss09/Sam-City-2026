import { BUILDINGS, MATERIALS, ALL_BUILDABLE, tierOf, TIERS } from '../data/buildings.js';
const TIER_ORDER = TIERS.map((t) => t[0]);
import { START_FUNDS } from '../config.js';
import { Emitter } from '../util.js';

/** Funds, material/food stock, permits, trade and monthly accounts. */
export class Economy extends Emitter {
  constructor(game) {
    super(); this.game = game; this.funds = START_FUNDS; this.stock = { timber: 0, stone: 0, brick: 0, steel: 0, glass: 0, food: 0 };
    this.permits = {}; for (const id of Object.keys(BUILDINGS)) { const d = BUILDINGS[id]; this.permits[id] = d.special || (d.permit && d.permit.cost === 0 && d.permit.pop === 0) ? 'approved' : 'locked'; }
    this.orders = []; this.pending = []; this.lastReport = null; this.foodWarned = -1; this.gathered = 0;
    this.revealed = new Set(ALL_BUILDABLE.filter((id) => BUILDINGS[id].permit.pop === 0)); this.revealAcc = 0; this.lastTier = 'Camp';
  }
  /** Buildings the player is allowed to know about: reached the population milestone (or already approved). */
  visible(id) { return this.revealed.has(id) || this.permits[id] === 'approved' || this.permits[id] === 'pending'; }
  nextMilestone() { const pop = this.game.population.count(); let n = Infinity; for (const id of ALL_BUILDABLE) { const p = BUILDINGS[id].permit.pop; if (p > pop && p < n) n = p; } return n === Infinity ? null : n; }
  /** Population milestones reveal new buildings, like any city builder. Announced by letter. */
  checkReveals() {
    const g = this.game, pop = g.population.count(), fresh = ALL_BUILDABLE.filter((id) => !this.revealed.has(id) && BUILDINGS[id].permit.pop <= pop);
    const tier = tierOf(pop); if (tier !== this.lastTier) { const up = TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(this.lastTier); this.lastTier = tier; if (up && g.started) { g.messages.push('The Council', `Sam City is now officially a ${tier}!`, 'good'); g.ui.toast(`🎉 Sam City is now a ${tier}!`, 3600); } }
    if (!fresh.length) return; for (const id of fresh) this.revealed.add(id);
    if (!g.started) return;
    const names = fresh.map((id) => BUILDINGS[id].name), short = names.length > 4 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
    g.messages.push('The Council', `${pop} residents! New permit forms available: ${short}.`, 'good'); g.ui.toast(`🏗 New buildings available: ${short}`, 4200);
    g.mail.send('The Council', `New permits: ${names.join(', ')}`, `Dear Sam,\n\nWith ${pop} souls now calling Sam City home, the Council is pleased to accept permit forms for the following:\n\n${fresh.map((id) => `• ${BUILDINGS[id].name} (£${BUILDINGS[id].permit.cost}): ${BUILDINGS[id].blurb}`).join('\n')}\n\nForms are in the Postbox as usual.\n\nYours,\nThe Council`);
    g.ui.refreshSub && g.ui.refreshSub();
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
    g.messages.push('Planning Office', `Permit form for ${def.name} posted. Expect a reply soon.`);
    g.flags.permitRequested = true;
    this.pending.push({ id, t: 30 });
    return { ok: true, msg: 'Request sent.' };
  }

  /** Buy goods from outside: a truck brings them down from the Supply Lift (pricey but quick). */
  /** Lift price per unit (a Post Office in town knocks 20% off). */
  buyPrice(mat) { return Math.round(MATERIALS[mat].price * 1.4 * (this.game.buildings.count('postoffice') ? 0.8 : 1)); }
  orderMaterial(mat, qty) {
    const cost = this.buyPrice(mat) * qty;
    if (!this.spend(cost)) return { ok: false, msg: 'Not enough funds.' };
    this.orders.push({ mat, qty, eta: 6 }); this.game.flags.orderPlaced = true;
    this.game.messages.push('Logistics', `Order placed: ${qty} ${MATERIALS[mat].name}. It will come down the Lift shortly.`);
    return { ok: true, msg: 'Ordered.' };
  }
  sellMaterial(mat, qty) {
    if ((this.stock[mat] || 0) < qty) return { ok: false, msg: 'Not enough in the Stockyard.' };
    this.stock[mat] -= qty; const pay = Math.round(MATERIALS[mat].price * 0.55 * qty); this.funds += pay; this.game.flags.sold = true;
    return { ok: true, msg: `Sold for ${pay}` };
  }
  update(dt) {
    this.revealAcc += dt; if (this.revealAcc > 1) { this.revealAcc = 0; this.checkReveals(); }
    for (const q of this.pending) { q.t -= dt; if (q.t <= 0 && this.permits[q.id] === 'pending') { this.permits[q.id] = 'approved'; this.game.messages.push('Planning Office', `${BUILDINGS[q.id].name} APPROVED. It is now in your build menu.`, 'good'); this.game.mail.send('The Planning Office', `Permit approved: ${BUILDINGS[q.id].name}`, `Dear Sam,\n\nWe are pleased to approve your application for a ${BUILDINGS[q.id].name}. You will find it in the planning view under Buildings.\n\n${BUILDINGS[q.id].blurb || ''}\n\nYours faithfully,\nThe Planning Office`); this.emit('permits'); } }
    this.pending = this.pending.filter((q) => q.t > 0);
    for (const o of this.orders) { o.eta -= dt; if (o.eta <= 0 && !o.sent) { o.sent = true; this.game.logistics.dispatch(o); } }
    this.orders = this.orders.filter((o) => !o.done);
  }
  deliverToDepot(o) { this.stock[o.mat] += o.qty; o.done = true; this.emit('stock'); this.game.messages.push('Logistics', `Delivered ${o.qty} ${MATERIALS[o.mat].name} to the Stockyard.`, 'good'); }
  /** A citizen eats one portion. */
  eatPortion() { if (this.stock.food >= 0.5) { this.stock.food -= 0.5; return true; } return false; }
  hourly() {
    const g = this.game, pop = g.population.count(), h = g.clock.hour;
    // bakeries bake while staffed in the day; allotments just grow
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || !b.def.produce) continue;
      for (const [m, r] of Object.entries(b.def.produce)) { const n = b.def.jobs ? (h >= 6 && h < 18 ? b.workers.length * r : 0) : r; if (n > 0) this.add(m, n); }
    }
    if (pop > 0 && this.stock.food < Math.max(2, pop * 0.5) && g.clock.day !== this.foodWarned) { this.foodWarned = g.clock.day; g.messages.push('Stockyard', this.stock.food <= 0 ? 'The Stockyard has NO food left! People will go hungry.' : 'Food is running low in the Stockyard.', 'warn'); }
  }
  monthly() {
    const g = this.game; let income = 0, cost = 0;
    income += g.population.count() * 14;
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || b.def.special) continue;
      cost += b.def.park ? 3 : 5;
      if (b.def.income) income += b.workers.length * b.def.income;
    }
    cost += g.population.employed() * 2;
    const net = Math.round(income - cost); this.funds += net; this.lastReport = { income: Math.round(income), cost: Math.round(cost), net };
    g.messages.push('Treasury', `Monthly accounts: income £${Math.round(income)}, costs £${Math.round(cost)}, net ${net >= 0 ? '+' : '-'}£${Math.abs(net)}.`, net >= 0 ? 'good' : 'warn');
    g.mail.send('The Treasury', 'Monthly accounts', `Income: £${Math.round(income)} (rates from ${g.population.count()} residents and trade)\nCosts: £${Math.round(cost)} (upkeep and wages)\nNet: ${net >= 0 ? '+' : '-'}£${Math.abs(net)}\nFunds now: £${Math.round(this.funds)}\nStockyard: ${Object.entries(this.stock).map(([m, n]) => `${Math.floor(n)} ${m}`).join(', ')}`, { kind: 'report' });
  }
  serialize() { return { funds: this.funds, stock: this.stock, permits: this.permits, revealed: [...this.revealed], tier: this.lastTier }; }
  load(s) { this.funds = s.funds; Object.assign(this.stock, s.stock); Object.assign(this.permits, s.permits); if (s.revealed) this.revealed = new Set(s.revealed); else for (const id of ALL_BUILDABLE) if (BUILDINGS[id].permit.pop <= this.game.population.count() || this.permits[id] !== 'locked') this.revealed.add(id); if (s.tier) this.lastTier = s.tier; }
}
