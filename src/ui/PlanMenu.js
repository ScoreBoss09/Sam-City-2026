import { BUILDINGS, MATERIALS, TOOL_MENUS } from '../data/buildings.js';
import { fmtMoney } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { purposeOf } from '../data/purpose.js';
import { AGES, AGE_NEEDS, AGE_ICON } from '../data/ages.js';
import { moneyHTML, perDayTable } from './Money.js';
import { ICON, CAT_ICON } from '../data/icons.js';

const $ = (id) => document.getElementById(id);
const CATS = [...TOOL_MENUS.build.map(([n, l]) => [n, l, 'build']), ['Parks', TOOL_MENUS.park, 'park'], ['Utilities', TOOL_MENUS.util, 'util']];
const matText = (m) => Object.entries(m).map(([k, n]) => `${n} ${MATERIALS[k].name.toLowerCase()}`).join(', ');

/**
 * One big planning menu that works the same with a mouse or a controller (□ opens it, L1/R1 change page, L2/R2 change
 * category, D-pad moves, ✕ picks, ○ closes): buildings to place (ticked once you have one), the builders' work queue, and upgrades.
 */
export class PlanMenu {
  constructor(game) {
    this.game = game; this.open = false; this.tab = 'build'; this.cat = 'Homes';
    $('planmenu').addEventListener('click', (e) => this.click(e));
  }
  show(tab) { const g = this.game; if (tab) this.tab = tab; this.open = true; this.focusFirst = true; g.input.unlock(); this.render(); $('planmenu').classList.remove('hidden'); Sfx.play('ui'); }
  close() { this.open = false; $('planmenu').classList.add('hidden'); this.game.ui.calm && this.game.ui.calm(); }
  cycleTab(d) { const T = ['town', 'build', 'queue', 'upgrades', 'money'], i = T.indexOf(this.tab); this.tab = T[(i + d + T.length) % T.length]; this.focusFirst = true; this.render(); Sfx.play('ui'); }
  cycleCat(d) { if (this.tab !== 'build') return; const i = CATS.findIndex((c) => c[0] === this.cat); this.cat = CATS[(i + d + CATS.length) % CATS.length][0]; this.focusFirst = true; this.render(); Sfx.play('ui'); }
  render() {
    const g = this.game, Q = g.construction.queue(), ups = g.upgrades.candidates(), canUp = ups.filter((b) => g.upgrades.check(b).ok).length, pad = g.input.padActive;
    const W = g.overview ? (g.overview.data || g.overview.compute()).warn.length : 0, tabs = [['town', `🏘️ Town${W ? ` ⚠️${W}` : ''}`], ['build', '🏗️ Build'], ['queue', `📋 Work queue (${Q.length})`], ['upgrades', `⬆️ Upgrades${canUp ? ` (${canUp})` : ''}`], ['money', '💷 Money & goods']];
    let body = '';
    if (this.tab === 'town') body = `<div class="pmoney ptown">${g.overview.html()}</div>`; else if (this.tab === 'build') body = this.renderBuild(); else if (this.tab === 'queue') body = (g.overview ? g.overview.queueLine() : '') + this.renderQueue(Q); else if (this.tab === 'money') body = `<div class="pmoney">${moneyHTML(g)}${perDayTable(g.economy)}</div>`; else body = this.renderUpgrades(ups);
    const html = `<div class="pwin"><div class="phead"><b>📐 PLANNING</b><span class="funds">Funds</span>${g.net && g.net.role === 'host' ? `<button data-a="raid">${g.raidNight ? '🎯 Raid night on' : '🎯 Start Raid night'}</button>` : ''}<button data-a="perf">📊 Report</button><button data-a="close" class="xbtn" title="Close">✕</button></div>
      <div class="ptabs">${tabs.map(([k, n]) => `<button data-a="tab" data-k="${k}" class="${k === this.tab ? 'on' : ''}">${n}</button>`).join('')}<span class="hint">${pad ? '<b class="ps">L1</b>/<b class="ps">R1</b> page · <b class="ps">L2</b>/<b class="ps">R2</b> category · <b class="ps ps-x">✕</b> choose · <b class="ps ps-o">○</b> close' : 'B opens this · Esc closes'}</span></div>${body}</div>`;
    // the menu redraws every second on the queue and upgrades pages: only touch the page if something changed, and keep the scroll
    const el = $('planmenu'), keep = this.focusFirst ? 0 : (el.querySelector('.pwin') || {}).scrollTop || 0;
    if (html !== this._html || this.focusFirst) { this._html = html; el.innerHTML = html; const w = el.querySelector('.pwin'); if (w) w.scrollTop = keep; }   // only redraw when something really changed (no flicker under the mouse)
    { const f = el.querySelector('.phead .funds'); if (f) f.textContent = 'Funds ' + fmtMoney(g.economy.funds); }
    if (this.focusFirst || g.ui._pfIdx === undefined) {   // controller: start on the first card / row, not the header buttons
      this.focusFirst = false; const btns = [...$('planmenu').querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null);
      const i = btns.findIndex((b) => !b.closest('.phead,.ptabs,.pcats')); g.ui._pfIdx = i >= 0 ? i : 0;
    }
  }
  renderBuild() {
    const g = this.game, e = g.economy, pop = g.population.count(), [, list] = CATS.find((c) => c[0] === this.cat) || CATS[0], next = e.nextMilestone();
    const cats = CATS.map(([n, l]) => { const have = l.filter((k) => e.visible(k)).length, built = l.filter((k) => g.buildings.count(k) > 0).length; return `<button data-a="cat" data-k="${n}" class="${n === this.cat ? 'on' : ''}">${CAT_ICON[n] || ''} ${n} <small>${built}/${have}</small></button>`; }).join('');
    const cards = list.filter((k) => e.visible(k)).map((k) => {
      const d = BUILDINGS[k], n = g.buildings.count(k), sites = g.buildings.count(k, false) - n, un = e.isUnlocked(k), p = e.permits[k];
      let status, act = 'place';
      if (un) status = matText(d.mat) || 'free';
      else if (p === 'pending') { status = 'permit pending…'; act = 'none'; }
      else if (pop < d.permit.pop) { status = `needs ${d.permit.pop} residents`; act = 'none'; }
      else { status = `permit ${fmtMoney(d.permit.cost)}: press to request`; act = 'permit'; }
      const tick = n ? `<span class="tick">✓${n > 1 ? ' ×' + n : ''}</span>` : sites ? '<span class="tick site">🏗️</span>' : '', asked = !n && g.flags.asks && g.flags.asks[k] && g.flags.asks[k].length;
      if (asked) status = `🙋 ${asked} asked for one · ` + status;
      return `<button class="card ${n ? 'built' : ''} ${un ? '' : 'locked'} ${g.god.tool.sub === k ? 'on' : ''}" data-a="${act}" data-k="${k}"><span class="ic">${ICON[k] || '🏠'}</span>${tick}<b>${d.name}</b><small>${status}</small><small class="pp">${purposeOf(k, d)}</small></button>`;
    }).join('');
    return `<div class="pcats">${cats}</div><div class="pcards">${cards || '<div class="pnote">Nothing here yet. Grow the town.</div>'}</div>${next ? `<div class="pnote">🔒 More buildings at ${next} residents.</div>` : ''}<div class="pnote">${AGE_ICON[g.tech.age]} ${AGES[g.tech.age]} age.${g.tech.age < 4 ? ` Next: the ${AGES[g.tech.age + 1]} age, when you have ${AGE_NEEDS[g.tech.age + 1]} (new buildings, upgrades and a new look for the town).` : ''}</div>`;
  }
  renderQueue(Q) {
    const g = this.game, builders = g.population.sims.filter((s) => s.role === 'builder' && !s.remove), busy = builders.filter((s) => s.job).length; this.q = Q;
    if (!Q.length && !g.piles.list.length) return '<div class="pnote">Nothing queued.</div>';
    const rows = Q.map((it, i) => {
      let name, info, frac = 0;
      if (it.kind === 'roads') { const n = g.roadPlans.count; name = '🛣️ Paths and roads'; info = `${n} tile${n > 1 ? 's' : ''} to dig`; }
      else { const s = it.s, need = g.buildings.needTotal(s), have = g.buildings.haveTotal(s), miss = Object.keys(s.need).filter((m) => (s.need[m] - (s.have[m] || 0)) > 0 && g.economy.stock[m] <= 0 && (s.reserved[m] || 0) === 0);
        name = `${it.kind === 'upgrade' ? s.up.icon + ' ' : (ICON[s.id] || '🏗️') + ' '}${s.def.name}`; frac = s.progress;
        const haul = g.population.sims.filter((q) => q.job && q.job.type === 'haul' && q.job.site === s).length, carts = g.carting ? g.carting.carts.filter((c) => c.s === s && c.stage !== 'home').length : 0;
        info = `${Math.round(s.progress * 100)}% built · materials ${have}/${need}${s.builders ? ` · ${s.builders} building` : ''}${haul ? ` · ${haul} fetching materials` : ''}${carts ? ` · 🐴 ${carts === 1 ? 'a cart' : carts + ' carts'} on the way` : ''}${miss.length ? ` · <em>waiting for ${miss.join(', ')}</em>` : ''}`; }
      return `<div class="qrow ${i === 0 ? 'top' : ''}"><span class="qn">${i + 1}</span><div class="qi"><b>${name}</b><small>${info}</small><i><u style="width:${Math.round(frac * 100)}%"></u></i></div>
        <button data-a="q" data-m="top" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Do this first">⤒ Top</button><button data-a="q" data-m="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-a="q" data-m="down" data-i="${i}" ${i === Q.length - 1 ? 'disabled' : ''}>▼</button>${it.s ? `<button data-a="q" data-m="crew" data-i="${i}" title="How many builders this job takes">👷 ${it.s.crew || 'Auto'}</button><button data-a="q" data-m="show" data-i="${i}">👁</button>` : ''}${it.kind === 'upgrade' ? `<button data-a="q" data-m="cancel" data-i="${i}">✖</button>` : ''}</div>`;
    }).join('');
    const dock = g.construction.dockPiles ? g.piles.list.filter((p) => g.lift && Math.hypot(p.x - g.logistics.dock().x, p.z - g.logistics.dock().z) < 7) : [], dockTxt = dock.length ? `<div class="qrow"><span class="qn">📦</span><div class="qi"><b>Goods waiting at the Lift</b><small>${dock.map((p) => Object.entries(p.items).map(([m, n]) => n + ' ' + m).join(', ')).join(', ')} · ${g.population.sims.filter((q) => q.job && q.job.type === 'fetch').length} builder(s) carting it to the Stockyard${g.depot ? '' : ' (no Stockyard yet!)'}</small></div></div>` : '';
    return `<div class="pcats">Jobs at once: ${[[0, 'As many as possible'], [1, 'One'], [2, 'Two'], [3, 'Three']].map(([n, l]) => `<button data-a="qfocus" data-n="${n}" class="${(g.flags.qFocus || 0) === n ? 'on' : ''}">${l}</button>`).join('')}</div>${dockTxt}${rows}`;
  }
  renderUpgrades(ups) {
    const g = this.game, U = g.upgrades;
    if (!ups.length) return '<div class="pnote">Nothing to upgrade yet.</div>';
    // one row per building type and level: upgrade one (the nearest to the view) or all of them at once
    const groups = new Map(); for (const b of ups) { const k = b.id + ':' + (b.level || 0); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); }
    this.groups = [...groups.values()].sort((a, b) => a[0].def.name.localeCompare(b[0].def.name) || (a[0].level || 0) - (b[0].level || 0));
    const all = ups.filter((b) => U.check(b).ok).length;
    return `${all > 1 ? `<div class="qrow"><button data-a="upevery">⬆️ Upgrade everything that's ready (${all})</button></div>` : ''}` + this.groups.map((L, i) => {
      const b = L[0], up = U.next(b) || U.orderFor(b).up, steps = U.steps(b), stars = steps.map((_, k) => (k < (b.level || 0) ? '★' : '☆')).join(''), queued = L.filter((q) => U.orderFor(q)).length, ready = L.filter((q) => U.check(q).ok), why = ready.length ? '' : U.check(L.find((q) => !U.orderFor(q)) || b).why;
      const btns = ready.length ? `<button data-a="up1" data-i="${i}">⬆️ Upgrade one</button>${ready.length > 1 ? `<button data-a="upall" data-i="${i}">⬆️ All ${ready.length}</button>` : ''}` : `<span class="st">${queued === L.length ? 'all in the work queue' : why}</span>`;
      return `<div class="qrow"><span class="qn">${ICON[b.id] || '🏠'}</span><div class="qi"><b>${b.def.name}${L.length > 1 ? ` ×${L.length}` : ''} <span class="stars">${stars}</span></b><small>${up.icon} <b>${up.name}</b>: ${up.desc}<br>Needs ${U.costText(up)} each${queued ? ` · ${queued} in the work queue` : ''}</small></div>${btns}<button data-a="show" data-i="${i}">👁</button></div>`;
    }).join('');
  }
  /** The one of a group closest to where the planning camera is looking. */
  nearest(L) { const t = this.game.god.target; return L.slice().sort((a, b) => Math.hypot(a.cx - t.x, a.cz - t.z) - Math.hypot(b.cx - t.x, b.cz - t.z))[0]; }
  click(e) {
    const btn = e.target.closest('button'); if (!btn || btn.disabled) return; const g = this.game, a = btn.dataset.a, k = btn.dataset.k;
    if (a === 'close') return this.close();
    if (a === 'money') { const r = g.economy.moneyOp(btn.dataset.op, btn.dataset.arg); if (r && !r.ok) { g.ui.toast(r.msg); Sfx.play('deny'); } else Sfx.play('cash'); return this.render(); }
    if (a === 'perf') { this.close(); g.ui.togglePerf(); return; }
    if (a === 'raid') { this.close(); if (!g.raidNight) g.net.startRaid(); return; }
    if (a === 'tab') { this.tab = k; this.focusFirst = true; }
    if (a === 'cat') { this.cat = k; }
    if (a === 'place') { const cat = CATS.find((c) => c[1].includes(k)), tool = cat ? cat[2] : 'build'; if (tool === 'build') g.ui.buildTab = cat[0]; g.god.setTool(tool, k); g.ui.openSub(tool); this.close(); g.ui.toast(`Place the ${BUILDINGS[k].name}: ${g.input.padActive ? 'move the cursor, ✕ to place, △ to rotate, ○ to cancel' : 'click on the map, R rotates'}.`, 3200); return; }
    if (a === 'permit') { const r = g.economy.requestPermit(k); g.ui.toast(r.ok ? `Permit requested for the ${BUILDINGS[k].name}. The Council replies by morning.` : r.msg, 2800); }
    if (a === 'none') { Sfx.play('deny'); return; }
    if (a === 'q') { const it = this.q[+btn.dataset.i], m = btn.dataset.m; if (!it) return;
      if (m === 'show') { this.close(); g.god.target.set(it.s.cx, 0, it.s.cz); g.god.dist = Math.min(g.god.dist, 45); return; }
      if (m === 'crew') { const C = [undefined, 2, 4, 6, 8, 10], i = C.indexOf(it.s.crew); it.s.crew = C[(i + 1) % C.length]; Sfx.play('ui'); return this.render(); }
      if (m === 'cancel') g.upgrades.cancel(it.s); else g.construction.move(it, m === 'top' ? 'top' : m === 'up' ? -1 : 1); Sfx.play('ui'); }
    if (a === 'overlay') { g.overview.toggle(k); this.close(); if (g.mode !== 'god' && g.setMode) g.setMode('god'); return; }   // where that trade's people live and work
    if (a === 'qfocus') { g.flags.qFocus = +btn.dataset.n; Sfx.play('ui'); return this.render(); }
    if (a === 'upevery') { let n = 0; for (const L of this.groups || []) for (const b of L) if (g.upgrades.check(b).ok && g.upgrades.order(b, { quiet: true }).ok) n++; g.ui.toast(`${n} upgrades added to the work queue.`, 2400); }
    if (a === 'up1' || a === 'upall') { const L = (this.groups[+btn.dataset.i] || []).filter((b) => g.upgrades.check(b).ok), list = a === 'up1' ? [this.nearest(L)] : L; let n = 0; for (const b of list) if (b && g.upgrades.order(b, { quiet: n > 0 }).ok) n++; if (n > 1) g.ui.toast(`${n} upgrades added to the work queue.`, 2400); }
    if (a === 'show') { const L = this.groups[+btn.dataset.i]; if (L) { const b = this.nearest(L.filter((q) => g.upgrades.check(q).ok).length ? L.filter((q) => g.upgrades.check(q).ok) : L); this.close(); g.god.target.set(b.cx, 0, b.cz); g.god.dist = Math.min(g.god.dist, 40); return; } }
    this.render();
  }
}
