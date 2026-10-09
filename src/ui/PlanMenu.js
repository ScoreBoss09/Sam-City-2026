import { BUILDINGS, MATERIALS, TOOL_MENUS } from '../data/buildings.js';
import { fmtMoney } from '../util.js';
import { Sfx } from '../core/Sfx.js';

const $ = (id) => document.getElementById(id);
const CATS = [...TOOL_MENUS.build.map(([n, l]) => [n, l, 'build']), ['Parks', TOOL_MENUS.park, 'park'], ['Utilities', TOOL_MENUS.util, 'util']];
const CAT_ICON = { Homes: '🏠', Food: '🍞', Industry: '🏭', Civic: '🏛️', Commerce: '🛍️', Parks: '🌳', Utilities: '⚡' };
const ICON = { shack: '🛖', hut: '🛖', cabin: '🏡', bungalow: '🏠', cottage: '🏡', semi: '🏘️', townhouse: '🏘️', flats: '🏢', apartments: '🏢', forager: '🫐', allotment: '🥕', fisher: '🎣', bakery: '🥖', farm: '🌾', harbour: '⚓', chippy: '🍟', tavern: '🍺',
  lumbercamp: '🪓', quarry: '⛏️', contractor: '🔨', brickworks: '🧱', glassworks: '🪟', foundry: '⚙️', factory: '🏭', stockyard: '📦', postbox: '📮', surveyor: '📐', villagehall: '🏛️', postoffice: '🏤', school: '🏫', library: '📚', church: '⛪', townhall: '🏛️', clinic: '🏥', police: '🚓',
  newsagent: '📰', shop: '🏪', launderette: '🧺', video: '📼', bookies: '🐎', office: '🏢', hotel: '🏨', skyscraper: '🏙️', campfire: '🔥', phonebox: '☎️', park: '🌳', busstop: '🚏', bandstand: '🎺', plaza: '⛲', ballfield: '🏏', well: '🪣', power: '⚡', water: '💧' };
const matText = (m) => Object.entries(m).map(([k, n]) => `${n} ${MATERIALS[k].name.toLowerCase()}`).join(', ');

/**
 * One big planning menu that works the same with a mouse or a controller (X opens it, LB/RB change page, LT/RT change
 * category, D-pad moves, A picks, B closes): buildings to place (ticked once you have one), the builders' work queue, and upgrades.
 */
export class PlanMenu {
  constructor(game) {
    this.game = game; this.open = false; this.tab = 'build'; this.cat = 'Homes';
    $('planmenu').addEventListener('click', (e) => this.click(e));
  }
  show(tab) { const g = this.game; if (tab) this.tab = tab; this.open = true; g.input.unlock(); this.render(); $('planmenu').classList.remove('hidden'); Sfx.play('ui'); }
  close() { this.open = false; $('planmenu').classList.add('hidden'); this.game.ui.calm && this.game.ui.calm(); }
  cycleTab(d) { const T = ['build', 'queue', 'upgrades'], i = T.indexOf(this.tab); this.tab = T[(i + d + T.length) % T.length]; this.focusFirst = true; this.render(); Sfx.play('ui'); }
  cycleCat(d) { if (this.tab !== 'build') return; const i = CATS.findIndex((c) => c[0] === this.cat); this.cat = CATS[(i + d + CATS.length) % CATS.length][0]; this.focusFirst = true; this.render(); Sfx.play('ui'); }
  render() {
    const g = this.game, Q = g.construction.queue(), ups = g.upgrades.candidates(), canUp = ups.filter((b) => g.upgrades.check(b).ok).length, pad = g.input.padActive;
    const tabs = [['build', '🏗️ Build'], ['queue', `📋 Work queue (${Q.length})`], ['upgrades', `⬆️ Upgrades${canUp ? ` (${canUp})` : ''}`]];
    let body = '';
    if (this.tab === 'build') body = this.renderBuild(); else if (this.tab === 'queue') body = this.renderQueue(Q); else body = this.renderUpgrades(ups);
    $('planmenu').innerHTML = `<div class="pwin"><div class="phead"><b>📐 PLANNING</b><span class="funds">Funds ${fmtMoney(g.economy.funds)}</span><button data-a="perf">📊 Report</button><button data-a="close">✖ Close${pad ? ' (B)' : ' (Esc)'}</button></div>
      <div class="ptabs">${tabs.map(([k, n]) => `<button data-a="tab" data-k="${k}" class="${k === this.tab ? 'on' : ''}">${n}</button>`).join('')}<span class="hint">${pad ? 'LB/RB page · LT/RT category · A choose' : 'B opens this · Esc closes'}</span></div>${body}</div>`;
    if (this.focusFirst) { this.focusFirst = false; g.ui._pfIdx = 4; }
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
      const tick = n ? `<span class="tick">✓${n > 1 ? ' ×' + n : ''}</span>` : sites ? '<span class="tick site">🏗️</span>' : '';
      return `<button class="card ${n ? 'built' : ''} ${un ? '' : 'locked'} ${g.god.tool.sub === k ? 'on' : ''}" data-a="${act}" data-k="${k}"><span class="ic">${ICON[k] || '🏠'}</span>${tick}<b>${d.name}</b><small>${status}</small></button>`;
    }).join('');
    return `<div class="pcats">${cats}</div><div class="pcards">${cards || '<div class="pnote">Nothing here yet. Grow the town.</div>'}</div>${next ? `<div class="pnote">🔒 More buildings at ${next} residents.</div>` : ''}<div class="pnote">✓ = you have one already. Pick a building, then place it on the map (${g.input.padActive ? 'A to place, Y to rotate, B to cancel' : 'click to place, R rotates, Esc cancels'}).</div>`;
  }
  renderQueue(Q) {
    const g = this.game, builders = g.population.sims.filter((s) => s.role === 'builder' && !s.remove), busy = builders.filter((s) => s.job).length; this.q = Q;
    if (!Q.length) return '<div class="pnote">Nothing to build. Place buildings, draw paths or order upgrades and they appear here in order.</div>';
    const rows = Q.map((it, i) => {
      let name, info, frac = 0;
      if (it.kind === 'roads') { const n = g.roadPlans.count; name = '🛣️ Paths and roads'; info = `${n} tile${n > 1 ? 's' : ''} to dig`; }
      else { const s = it.s, need = g.buildings.needTotal(s), have = g.buildings.haveTotal(s), miss = Object.keys(s.need).filter((m) => (s.need[m] - (s.have[m] || 0)) > 0 && g.economy.stock[m] <= 0 && (s.reserved[m] || 0) === 0);
        name = `${it.kind === 'upgrade' ? s.up.icon + ' ' : (ICON[s.id] || '🏗️') + ' '}${s.def.name}`; frac = s.progress;
        info = `${Math.round(s.progress * 100)}% built · materials ${have}/${need}${s.builders ? ` · ${s.builders} builder${s.builders > 1 ? 's' : ''} on it` : ''}${miss.length ? ` · <em>waiting for ${miss.join(', ')}</em>` : ''}`; }
      return `<div class="qrow ${i === 0 ? 'top' : ''}"><span class="qn">${i + 1}</span><div class="qi"><b>${name}</b><small>${info}</small><i><u style="width:${Math.round(frac * 100)}%"></u></i></div>
        <button data-a="q" data-m="top" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Do this first">⤒ Top</button><button data-a="q" data-m="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button data-a="q" data-m="down" data-i="${i}" ${i === Q.length - 1 ? 'disabled' : ''}>▼</button>${it.s ? `<button data-a="q" data-m="show" data-i="${i}">👁</button>` : ''}${it.kind === 'upgrade' ? `<button data-a="q" data-m="cancel" data-i="${i}">✖</button>` : ''}</div>`;
    }).join('');
    return `<div class="pnote">Builders work from the top down: everyone helps with the top job first (fetching its materials, then building), and only moves down the list when it's waiting for something. ${builders.length ? `Builders: ${builders.length} (${busy} busy).` : '<b>No builders yet: build a Builders\' Yard, or do it yourself as Sam.</b>'}</div>${rows}`;
  }
  renderUpgrades(ups) {
    const g = this.game, U = g.upgrades;
    if (!ups.length) return '<div class="pnote">Nothing to upgrade yet. Homes can get an upstairs and a Tudor makeover; yards that gather (forager, lumber camp, quarry, fisher, farm...) can get carts; the Builders\' Yard can get wheelbarrows.</div>';
    // one row per building type and level: upgrade one (the nearest to the view) or all of them at once
    const groups = new Map(); for (const b of ups) { const k = b.id + ':' + (b.level || 0); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); }
    this.groups = [...groups.values()].sort((a, b) => a[0].def.name.localeCompare(b[0].def.name) || (a[0].level || 0) - (b[0].level || 0));
    return '<div class="pnote">Upgrades cost materials and builder time, like a new building, and join the bottom of the Work queue. The people inside carry on as normal.</div>' + this.groups.map((L, i) => {
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
    if (a === 'perf') { this.close(); g.ui.togglePerf(); return; }
    if (a === 'tab') { this.tab = k; this.focusFirst = true; }
    if (a === 'cat') { this.cat = k; }
    if (a === 'place') { const cat = CATS.find((c) => c[1].includes(k)), tool = cat ? cat[2] : 'build'; if (tool === 'build') g.ui.buildTab = cat[0]; g.god.setTool(tool, k); g.ui.openSub(tool); this.close(); g.ui.toast(`Place the ${BUILDINGS[k].name}: ${g.input.padActive ? 'move the cursor, A to place, Y to rotate' : 'click on the map, R rotates'}.`, 3200); return; }
    if (a === 'permit') { const r = g.economy.requestPermit(k); g.ui.toast(r.ok ? `Permit requested for the ${BUILDINGS[k].name}. The Council replies by morning.` : r.msg, 2800); }
    if (a === 'none') { Sfx.play('deny'); return; }
    if (a === 'q') { const it = this.q[+btn.dataset.i], m = btn.dataset.m; if (!it) return;
      if (m === 'show') { this.close(); g.god.target.set(it.s.cx, 0, it.s.cz); g.god.dist = Math.min(g.god.dist, 45); return; }
      if (m === 'cancel') g.upgrades.cancel(it.s); else g.construction.move(it, m === 'top' ? 'top' : m === 'up' ? -1 : 1); Sfx.play('ui'); }
    if (a === 'up1' || a === 'upall') { const L = (this.groups[+btn.dataset.i] || []).filter((b) => g.upgrades.check(b).ok), list = a === 'up1' ? [this.nearest(L)] : L; let n = 0; for (const b of list) if (b && g.upgrades.order(b, { quiet: n > 0 }).ok) n++; if (n > 1) g.ui.toast(`${n} upgrades added to the work queue.`, 2400); }
    if (a === 'show') { const L = this.groups[+btn.dataset.i]; if (L) { const b = this.nearest(L.filter((q) => g.upgrades.check(q).ok).length ? L.filter((q) => g.upgrades.check(q).ok) : L); this.close(); g.god.target.set(b.cx, 0, b.cz); g.god.dist = Math.min(g.god.dist, 40); return; } }
    this.render();
  }
}
