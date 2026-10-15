import { fmtMoney } from '../util.js';
import { MATERIALS } from '../data/buildings.js';
import { RATES, LOANS } from '../systems/Economy.js';

// The Money page (Planning menu and the Town Hall terminal): what each kind of building brings in or costs a week,
// the rates (once there's a Town Hall and a Bank) and loans from the Bank. Buttons carry both data-a (Planning menu)
// and data-act (terminal), and both end up in Economy.moneyOp.
const btn = (op, arg, label, on, cant) => `<button data-a="money" data-act="money" data-op="${op}" data-arg="${arg}" class="${on ? 'on' : ''}${cant ? ' cant' : ''}">${label}</button>`;
const sign = (v) => `<span class="${v < 0 ? 'bad' : v > 0 ? 'ok' : ''}">${v < 0 ? '−' : v > 0 ? '+' : ''}${fmtMoney(Math.abs(Math.round(v)))}</span>`;
/** Goods brought in (gathered, made, grown) and used up (building sites, meals) per day. */
export function perDayTable(e) {
  const f = (v) => (v >= 10 || v === 0 ? Math.round(v) : Math.round(v * 10) / 10);
  return `<h3>Goods per day</h3><table class="pl"><tr><th>Goods</th><th>Today so far</th><th>Yesterday</th><th>Week's average</th><th>Used yesterday</th></tr>${Object.entries(MATERIALS).map(([m, d]) => { const g = e.perDay(m), u = e.perDay(m, 'used'); return `<tr><td>${d.name}</td><td>+${f(g.today)}</td><td>+${f(g.yesterday)}</td><td>+${f(g.avg)}</td><td>${u.yesterday ? '−' + f(u.yesterday) : '—'}</td></tr>`; }).join('')}</table>`;
}
export function moneyHTML(g) {
  const e = g.economy, rows = e.perBuilding(), tot = rows.reduce((a, r) => a + r.net, 0), can = e.canSetRates(), L = e.loan;
  let h = `<div class="jobsum"><span>Funds <b>${fmtMoney(e.funds)}</b></span><span>Rates <b>${RATES[e.rate].name}</b> (${fmtMoney(RATES[e.rate].per)} a head)</span><span>Loan <b>${L ? fmtMoney(Math.round(L.owed)) : 'none'}</b></span><span>Buildings a month ${sign(tot)}</span></div>`;
  { const month = rows.reduce((a, r) => a + r.net, 0) - (L ? L.pay + L.owed * LOANS.rate : 0); if (e.funds < 0) h += `<div class="note bad">⚠️ The town is overdrawn by ${fmtMoney(-Math.round(e.funds))}. Nothing can be bought until it's back in the black: sell goods at the Lift, raise the rates, or cut back.</div>`; else if (month < 0 && e.funds < -month * 3) h += `<div class="note bad">⚠️ At this rate the money runs out in about ${Math.max(1, Math.floor(e.funds / -month))} month(s).</div>`; }
  h += '<h3>Each kind of building, per week</h3>';
  h += rows.length ? `<table class="pl"><tr><th>Building</th><th>No.</th><th>Brings in</th><th>Upkeep</th><th>Wages</th><th>Net</th></tr>${rows.map((r) => `<tr><td>${r.name}</td><td>${r.n}</td><td>${r.inc ? '+' + fmtMoney(Math.round(r.inc)) : '—'}<br><small>${r.how}</small></td><td>−${fmtMoney(r.up)}</td><td>${r.wage ? '−' + fmtMoney(r.wage) : '—'}</td><td>${sign(r.net)}</td></tr>`).join('')}</table>` : '<div class="note">Nothing finished yet.</div>';
  h += '';
  h += '<h3>Rates</h3>';
  h += can ? `<div class="prow">${RATES.map((r, i) => btn('rate', i, `${r.name}<small>${fmtMoney(r.per)} a head</small>`, i === e.rate)).join('')}</div><div class="note">${RATES[e.rate].note}</div>`
    : `<div class="note">The rates are fixed at ${fmtMoney(RATES[1].per)} a head a week until there's a Town Hall${g.buildings.count('bank') ? '' : ' and a Bank'} to collect and keep them.</div>`;
  h += '<h3>Loans</h3>';
  if (!e.canBorrow()) h += `<div class="note">Midshires Bank lends to towns with a Bank and a Town Hall.${g.buildings.count('bank') ? '' : ' Build a Bank first.'}</div>`;
  else if (L) h += `<div class="note">You owe ${fmtMoney(Math.round(L.owed))}. Each Monday ${fmtMoney(Math.round(L.pay))} comes out, plus interest at ${Math.round(LOANS.rate * 1000) / 10}% a month on what's left.${L.missed ? ` Missed payments: ${L.missed}.` : ''}</div>${btn('repay', 0, `Pay it all off (${fmtMoney(Math.round(L.owed))})`, false, e.funds < L.owed)}`;
  else h += `<div class="prow">${LOANS.sizes.map((n) => btn('borrow', n, `Borrow ${fmtMoney(n)}<small>${fmtMoney(Math.round(n / LOANS.months))} a week + interest</small>`, false, n > e.maxLoan())).join('')}</div><div class="note">Paid back over ${LOANS.months} months, ${Math.round(LOANS.rate * 1000) / 10}% interest a month. The bank will lend up to ${fmtMoney(e.maxLoan())} on a town this size.</div>`;
  return h;
}
