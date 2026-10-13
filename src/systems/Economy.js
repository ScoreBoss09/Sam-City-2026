import { BUILDINGS, MATERIALS, ALL_BUILDABLE, tierOf, TIERS } from '../data/buildings.js';
import { BUILD_AGE } from '../data/ages.js';
const TIER_ORDER = TIERS.map((t) => t[0]);
import { START_FUNDS } from '../config.js';
import { Emitter } from '../util.js';

/** Rates a head each month. Change them once there's a Town Hall and a Bank; higher rates sour the mood. */
export const RATES = [
  { name: 'Low', per: 10, mood: 0.08, note: 'Low rates: people are a little happier, and the town takes in less.' },
  { name: 'Normal', per: 14, mood: 0, note: 'The usual rates. Nobody notices.' },
  { name: 'High', per: 20, mood: -0.08, note: 'High rates: grumbling in the pub and letters to the paper.' },
  { name: 'Steep', per: 28, mood: -0.2, note: 'Steep rates: people are properly fed up. Expect protests and the odd drunk.' },
];
export const LOANS = { sizes: [2000, 5000, 10000], months: 12, rate: 0.015 };

/** Funds, material/food stock, permits, trade and monthly accounts. */
export class Economy extends Emitter {
  constructor(game) {
    super(); this.game = game; this.funds = START_FUNDS; this.stock = { timber: 0, stone: 0, brick: 0, steel: 0, glass: 0, food: 0 };
    this.permits = {}; for (const id of Object.keys(BUILDINGS)) { const d = BUILDINGS[id]; this.permits[id] = d.special || (d.permit && d.permit.cost === 0 && d.permit.pop === 0) ? 'approved' : 'locked'; }
    this.orders = []; this.pending = []; this.lastReport = null; this.foodWarned = -1; this.gathered = 0;
    this.revealed = new Set(ALL_BUILDABLE.filter((id) => BUILDINGS[id].permit.pop === 0)); this.revealAcc = 0; this.lastTier = 'Camp'; this.rate = 1; this.loan = null; this.day = { got: {}, used: {} }; this.days = [];
  }
  /** Buildings the player is allowed to know about: reached the population milestone (or already approved). */
  visible(id) { return this.revealed.has(id) || this.permits[id] === 'approved' || this.permits[id] === 'pending'; }
  nextMilestone() { const pop = this.game.population.count(); let n = Infinity; for (const id of ALL_BUILDABLE) { const p = BUILDINGS[id].permit.pop; if (p > pop && p < n) n = p; } return n === Infinity ? null : n; }
  /** Population milestones reveal new buildings, like any city builder. Announced by letter. */
  checkReveals() {
    const g = this.game, pop = g.population.count(), fresh = ALL_BUILDABLE.filter((id) => !this.revealed.has(id) && BUILDINGS[id].permit.pop <= pop && (BUILD_AGE[id] || 0) <= (g.tech ? g.tech.age : 4));
    const tier = tierOf(pop); if (tier !== this.lastTier) { const up = TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(this.lastTier); this.lastTier = tier; if (up && g.started) { g.messages.push('The Council', `Sam City is now officially a ${tier}!`, 'good'); g.ui.toast(`🎉 Sam City is now a ${tier}!`, 3600); } }
    if (!fresh.length) return; for (const id of fresh) this.revealed.add(id);
    if (!g.started) return;
    const names = fresh.map((id) => BUILDINGS[id].name), short = names.length > 4 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
    g.messages.push('The Council', `${pop} residents! New permit forms available: ${short}.`, 'good'); g.ui.toast(`🏗 New buildings available: ${short}`, 4200);
    g.mail.send('The Council', `New permits: ${names.join(', ')}`, `Dear Sam,\n\nWith ${pop} souls now calling Sam City home, the Council is pleased to accept permit forms for the following:\n\n${fresh.map((id) => `• ${BUILDINGS[id].name} (£${BUILDINGS[id].permit.cost}): ${BUILDINGS[id].blurb}`).join('\n')}\n\nForms are in the Postbox as usual.\n\nYours,\nThe Council`);
    g.ui.refreshSub && g.ui.refreshSub();
  }
  // every pound in and out goes in this month's ledger under a heading, so the accounts can say where the money went
  book(cat, n) { if (!n) return; const L = this.ledger || (this.ledger = {}); L[cat] = (L[cat] || 0) + n; }
  spend(n, cat = 'Other spending') { if (this.funds < n) return false; this.funds -= n; this.book(cat, -n); return true; }
  earn(n, cat = 'Other income') { this.funds += n; this.book(cat, n); }
  /** Money lost whether or not you can afford it (fines, theft, damage). */
  lose(n, cat = 'Other spending') { this.funds -= n; this.book(cat, -n); }
  isUnlocked(id) { return this.permits[id] === 'approved'; }
  add(mat, n, tally = true) { this.stock[mat] = (this.stock[mat] || 0) + n; if (tally && n > 0) this.day.got[mat] = (this.day.got[mat] || 0) + n; this.emit('stock'); }
  /** Taken out of the Stockyard and used up (building sites, meals): counted for the per-day figures. */
  used(mat, n) { if (n > 0) this.day.used[mat] = (this.day.used[mat] || 0) + n; }
  /** Per-day figures for one good: today so far, yesterday, and the average over the last week. */
  perDay(mat, kind = 'got') { const d = this.days, avg = d.length ? d.reduce((a, x) => a + (x[kind][mat] || 0), 0) / d.length : 0; return { today: this.day[kind][mat] || 0, yesterday: d[0] ? d[0][kind][mat] || 0 : 0, avg }; }
  /** Start a new day's tally (called every hour; does something once a day). */
  rollDay() { const n = this.game.clock.totalDays || 0; if (this.dayNo === undefined) this.dayNo = n; if (n === this.dayNo) return; this.dayNo = n; this.days.unshift(this.day); if (this.days.length > 7) this.days.length = 7; this.day = { got: {}, used: {} }; }
  tier() { return tierOf(this.game.population.count()); }

  requestPermit(id) {
    const def = BUILDINGS[id], g = this.game;
    if (this.permits[id] !== 'locked') return { ok: false, msg: 'Already requested.' };
    if (g.population.count() < def.permit.pop) return { ok: false, msg: `Needs ${def.permit.pop} residents.` };
    if (!this.spend(def.permit.cost, 'Permits')) return { ok: false, msg: 'Not enough funds.' };
    this.permits[id] = 'pending';
    g.messages.push('Planning Office', `Permit form for ${def.name} posted. Expect a reply soon.`);
    g.flags.permitRequested = true;
    this.pending.push({ id, t: 30 });
    return { ok: true, msg: 'Request sent.' };
  }

  /** Buy goods from outside: a truck brings them down from the Supply Lift (pricey but quick). */
  /** Lift price per unit (a Post Office in town knocks 20% off). */
  /**
   * A little market at the Lift. Each good has a price level (1 = normal) that drifts with the news, climbs as you buy and
   * sinks as you sell, so big orders cost more per unit (and big sales fetch less). It drifts back to normal over time.
   */
  mk(mat) { if (!this.market) this.market = {}; return this.market[mat] ?? (this.market[mat] = 1); }
  buyPrice(mat) { return Math.max(1, Math.round(MATERIALS[mat].price * 1.4 * this.mk(mat) * (this.game.buildings.count('postoffice') ? 0.8 : 1))); }
  sellPrice(mat) { return Math.max(1, Math.round(MATERIALS[mat].price * 0.6 * this.mk(mat))); }
  /** Total for qty units, with the price moving as the deal goes through (1.2% per unit). */
  quote(mat, qty, side) { const u = side === 'buy' ? this.buyPrice(mat) : this.sellPrice(mat); let t = 0; for (let i = 0; i < qty; i++) t += u * (side === 'buy' ? 1 + 0.012 * i : Math.max(0.4, 1 - 0.012 * i)); return Math.round(t); }
  shift(mat, f) { this.market[mat] = Math.max(0.35, Math.min(2.6, this.mk(mat) * f)); }
  trend(mat) { const h = (this.marketHist || {})[mat]; if (!h || h.length < 2) return 0; return this.mk(mat) / h[0] - 1; }
  marketHourly() {
    for (const m of Object.keys(MATERIALS)) { const v = this.mk(m); this.market[m] = Math.max(0.35, Math.min(2.6, v + (1 - v) * 0.05 + (Math.random() - 0.5) * 0.04)); }
    if (Math.random() < 0.04) { const m = Object.keys(MATERIALS)[Math.floor(Math.random() * 6)], up = Math.random() < 0.5; this.shift(m, up ? 1.35 : 0.72); this.game.messages.push('Market news', `${MATERIALS[m].name} prices ${up ? 'shoot up: a shortage on the mainland!' : 'crash: there\'s a glut on the mainland.'}`, 'info'); }
    const h = this.marketHist || (this.marketHist = {}); for (const m of Object.keys(MATERIALS)) { (h[m] = h[m] || []).push(this.mk(m)); if (h[m].length > 24) h[m].shift(); }
  }
  orderMaterial(mat, qty) {
    const cost = this.quote(mat, qty, 'buy');
    if (!this.spend(cost, 'Materials bought')) return { ok: false, msg: 'Not enough funds.' };
    this.orders.push({ mat, qty, eta: 6 }); this.game.flags.orderPlaced = true; this.shift(mat, 1 + 0.012 * qty);
    this.game.messages.push('Logistics', `Order placed: ${qty} ${MATERIALS[mat].name}. It will come down the Lift shortly.`);
    return { ok: true, msg: 'Ordered.' };
  }
  sellMaterial(mat, qty) {
    if ((this.stock[mat] || 0) < qty) return { ok: false, msg: 'Not enough in the Stockyard.' };
    const pay = this.quote(mat, qty, 'sell'); this.stock[mat] -= qty; this.earn(pay, 'Materials sold'); this.game.flags.sold = true; this.shift(mat, 1 - 0.012 * qty);
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
  eatPortion() { if (this.stock.food >= 0.5) { this.stock.food -= 0.5; this.used('food', 0.5); return true; } return false; }
  hourly() {
    this.marketHourly(); this.rollDay();
    const g = this.game, pop = g.population.count(), h = g.clock.hour;
    // bakeries bake while staffed in the day; allotments just grow
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || !b.def.produce) continue;
      for (const [m, r] of Object.entries(b.def.produce)) { const n = b.def.jobs ? (h >= 6 && h < 18 ? b.workers.length * r : 0) : r; if (n > 0) this.add(m, n * (m === 'food' && this.game.hazards ? this.game.hazards.foodK : 1)); }
    }
    if (pop > 0 && this.stock.food < Math.max(2, pop * 0.5) && g.clock.day !== this.foodWarned) { this.foodWarned = g.clock.day; g.messages.push('Stockyard', this.stock.food <= 0 ? 'The Stockyard has NO food left! People will go hungry.' : 'Food is running low in the Stockyard.', 'warn'); }
  }
  canSetRates() { const g = this.game; return g.buildings.count('townhall') > 0 && g.buildings.count('bank') > 0; }
  canBorrow() { return this.canSetRates(); }
  maxLoan() { return Math.max(2000, Math.round(this.game.population.count() * 150 / 1000) * 1000); }
  get rateMood() { return RATES[this.rate].mood; }
  /** What each kind of building brings in or costs a month, as things stand now. */
  perBuilding() {
    const g = this.game, out = {}, per = RATES[this.rate].per;
    for (const b of g.buildings.list) {
      if (b.state !== 'done' || b.def.special) continue;
      const r = out[b.def.name] || (out[b.def.name] = { name: b.def.name, n: 0, inc: 0, up: 0, wage: 0, how: '' }); r.n++;
      r.up += b.def.park ? 3 : 5; r.wage += b.workers.length * 2;
      if (b.def.cat === 'res') { r.inc += b.residents.length * per; r.how = 'rates'; }   // (one label per kind of income, not one per building)
      if (b.def.income) { r.inc += b.workers.length * b.def.income; r.how = r.how && r.how !== 'takings' ? 'rates + takings' : 'takings'; }
      if (b.def.rent) { r.inc += b.def.rent; r.how = 'advertising'; }
    }
    return Object.values(out).map((r) => ({ ...r, net: r.inc - r.up - r.wage })).sort((a, b) => b.net - a.net);
  }
  moneyOp(op, arg) {
    const g = this.game;
    if (op === 'rate') { if (!this.canSetRates()) return { ok: false, msg: 'Needs a Town Hall and a Bank.' }; const was = this.rate; this.rate = Math.max(0, Math.min(RATES.length - 1, +arg)); if (this.rate !== was) g.messages.push('Town Hall', `Rates set to ${RATES[this.rate].name.toLowerCase()}: £${RATES[this.rate].per} a head a month${this.rate > was ? '. Expect grumbling.' : '. That\'ll go down well.'}`, this.rate > was ? 'warn' : 'good'); return { ok: true }; }
    if (op === 'borrow') { const n = +arg; if (!this.canBorrow()) return { ok: false, msg: 'Needs a Bank and a Town Hall.' }; if (this.loan) return { ok: false, msg: 'Pay off the loan you have first.' }; if (n > this.maxLoan()) return { ok: false, msg: 'The bank won\'t lend that much on a town this size.' }; this.loan = { owed: n, pay: n / LOANS.months, missed: 0 }; this.earn(n, 'Bank loan'); g.messages.push('Midshires Bank', `Loan of £${n} agreed. Repayments start next month.`, 'good'); return { ok: true }; }
    if (op === 'repay') { const L = this.loan; if (!L) return { ok: false, msg: 'No loan.' }; const n = Math.round(L.owed); if (!this.spend(n, 'Loan repayments')) return { ok: false, msg: 'Not enough funds.' }; this.loan = null; g.messages.push('Midshires Bank', 'Loan paid off in full. The manager shakes your hand.', 'good'); return { ok: true }; }
    return { ok: false, msg: '?' };
  }
  monthly() {
    const g = this.game, takings = {};
    this.earn(g.population.count() * RATES[this.rate].per, 'Rates (residents)');
    { const L = this.loan; if (L) { const interest = L.owed * LOANS.rate, due = Math.min(L.owed, L.pay); this.lose(Math.round(interest), 'Loan interest'); if (this.funds >= due) { this.lose(Math.round(due), 'Loan repayments'); L.owed -= due; } else { L.missed++; L.owed += Math.round(due * 0.1); g.messages.push('Midshires Bank', 'You missed a loan repayment. A fee has been added.', 'warn'); } if (L.owed < 1) { this.loan = null; g.messages.push('Midshires Bank', 'Your loan is paid off.', 'good'); } } }
    { const banks = g.buildings.list.filter((b) => b.state === 'done' && b.def.interest).length; if (banks && this.funds > 0) this.earn(Math.min(800, Math.round(this.funds * 0.01 * Math.min(3, banks))), 'Bank interest'); }
    let upkeep = 0; for (const b of g.buildings.list) {
      if (b.state !== 'done' || b.def.special) continue;
      upkeep += b.def.park ? 3 : 5;
      if (b.def.income && b.workers.length) takings[b.def.name] = (takings[b.def.name] || 0) + b.workers.length * b.def.income;
    }
    for (const [n, v] of Object.entries(takings)) this.earn(v, 'Takings: ' + n);
    { const ads = g.buildings.list.filter((b) => b.state === 'done' && b.def.rent).reduce((a, b) => a + b.def.rent, 0); if (ads) this.earn(ads, 'Advertising (billboards)'); }
    this.lose(upkeep, 'Building upkeep'); this.lose(g.population.employed() * 2, 'Wages (council share)');
    // close the books: everything that came in and went out this month, biggest first
    const L = this.ledger || {}, lines = Object.entries(L).map(([k, v]) => [k, Math.round(v)]).filter(([, v]) => v).sort((a, b) => b[1] - a[1]); this.ledger = {};
    const income = lines.filter(([, v]) => v > 0).reduce((a, [, v]) => a + v, 0), cost = -lines.filter(([, v]) => v < 0).reduce((a, [, v]) => a + v, 0), net = income - cost;
    this.lastReport = { income, cost, net, lines };
    const pad = (v) => (v >= 0 ? '+' : '-') + '£' + Math.abs(v);
    g.messages.push('Treasury', `Monthly accounts: in £${income}, out £${cost}, net ${pad(net)}.`, net >= 0 ? 'good' : 'warn');
    g.mail.send('The Treasury', 'Monthly accounts', `MONEY IN\n${lines.filter(([, v]) => v > 0).map(([k, v]) => `  ${k}: £${v}`).join('\n') || '  nothing'}\n\nMONEY OUT\n${lines.filter(([, v]) => v < 0).map(([k, v]) => `  ${k}: £${-v}`).join('\n') || '  nothing'}\n\nNet for the month: ${pad(net)}\nFunds now: £${Math.round(this.funds)}\nStockyard: ${Object.entries(this.stock).map(([m, n]) => `${Math.floor(n)} ${m}`).join(', ')}`, { kind: 'report' });
  }
  serialize() { const stock = { ...this.stock }; for (const c of (this.game.carting && this.game.carting.carts) || []) if (c.stage !== 'home') for (const [m, n] of Object.entries(c.load)) stock[m] = (stock[m] || 0) + n;   // goods out on a cart go back in the yard
    return { market: this.market, funds: this.funds, stock, permits: this.permits, revealed: [...this.revealed], tier: this.lastTier, rate: this.rate, loan: this.loan, day: this.day, days: this.days, dayNo: this.dayNo }; }
  load(s) { this.market = s.market || {}; this.funds = s.funds; Object.assign(this.stock, s.stock); Object.assign(this.permits, s.permits); if (s.revealed) this.revealed = new Set(s.revealed); else for (const id of ALL_BUILDABLE) if (BUILDINGS[id].permit.pop <= this.game.population.count() || this.permits[id] !== 'locked') this.revealed.add(id); if (s.tier) this.lastTier = s.tier; this.rate = s.rate ?? 1; this.loan = s.loan || null; if (s.day) { this.day = s.day; this.days = s.days || []; this.dayNo = s.dayNo; } }
}
