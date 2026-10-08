import { BUILDINGS, MATERIALS, ROLES, TOOL_MENUS, ALL_BUILDABLE, tierOf } from '../data/buildings.js';
import { OBJECTIVES } from '../data/story.js';
import { fmtMoney } from '../util.js';
import { MONTHS } from '../core/Clock.js';
import { TOOLS as TOOL_NAMES, TOOL_ICON, MAT_ICON, BACKPACK } from '../player/Player.js';
import { Sfx } from '../core/Sfx.js';

const $ = (id) => document.getElementById(id);
const TOOLS = [
  ['pan', '✋', 'Pan'], ['bulldoze', '🚜', 'Bulldoze'], ['road', '🛣️', 'Roads'], ['zone', '🟩', 'Zones'],
  ['build', '🏢', 'Buildings'], ['park', '🌳', 'Parks'], ['util', '⚡', 'Utilities'], ['query', '🔍', 'Query'],
];

/** All DOM. In Unity: UI Toolkit / uGUI screens driven by the same game-state getters. */
export class UI {
  constructor(game) {
    this.game = game; this.modalOpen = false; this.mouseOverCanvas = true; this.terminalTab = 'permits'; this.buildTab = 'Homes'; this.terminalB = null; this.dialogue = null; this.acc = 0; this.hoverTimer = 0;
    const canvas = $('view'); canvas.addEventListener('mouseenter', () => (this.mouseOverCanvas = true)); canvas.addEventListener('mouseleave', () => (this.mouseOverCanvas = false));
    // toolbox
    $('toolbox').innerHTML = TOOLS.map(([id, ic, name]) => `<button class="tool" data-t="${id}"><span class="ic">${ic}</span>${name}</button>`).join('');
    $('toolbox').addEventListener('click', (e) => { const b = e.target.closest('.tool'); if (!b) return; const id = b.dataset.t; game.god.setTool(id, id === 'zone' ? 'res' : id === 'road' ? 'dirt' : null); this.openSub(id); });
    $('submenu').addEventListener('click', (e) => { const tb = e.target.closest('.subtab'); if (tb) { this.buildTab = tb.dataset.tab; this.openSub('build'); return; } const b = e.target.closest('.sub'); if (!b) return; game.god.setTool(game.god.tool.id, b.dataset.s); this.openSub(game.god.tool.id); });
    $('c-speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; game.clock.speed = +b.dataset.s; });
    $('terminal').addEventListener('click', (e) => this.terminalClick(e)); $('inventory').addEventListener('click', (e) => this.invClick(e));
    game.messages.on('msg', (m) => this.addMessage(m));
    game.economy.on('permits', () => { if (this.terminalB) this.renderTerminal(); });
    $('btn-howto').onclick = () => { this.hide('howto'); this.modalOpen = false; this.game.clock.speed = 1; };
    this.refreshTools(); this.renderObjectives();
  }
  show(...ids) { for (const i of ids) $(i).classList.remove('hidden'); }
  hide(...ids) { for (const i of ids) $(i).classList.add('hidden'); }

  // ---------- modes ----------
  setMode(mode) {
    const god = mode === 'god';
    ['toolbox'].forEach((i) => $(i).classList.toggle('hidden', !god)); if (!god) this.hide('submenu', 'hover');
    $('crosshair').classList.toggle('hidden', god); $('simhud').classList.toggle('hidden', god); $('stock').classList.remove('hidden');
    $('help').classList.remove('hidden'); this.helpMode = mode; this.helpT = 14; $('help').textContent = this.game.input.padActive ? (god ? 'GOD MODE · START: control Sam · Left stick pan · Right stick rotate/zoom · A place/paint · B cancel · Y rotate · LB/RB tool · D-pad item' : 'SAM · START planning view · Left stick move · Right stick look · A use / tap in the green · D-pad ↑ backpack · D-pad ↓ drop · Y eat · LB sprint · RB camera') : god ? 'GOD MODE · TAB: control Sam · WASD pan · Q/E rotate · wheel zoom · right-drag pan · R rotate ghost · F frame island · Esc cancel tool' : 'SAM · TAB planning view · WASD move · Shift sprint · E use / tap in the green to work · I backpack · R drop · Q eat · V camera · M map · click to capture mouse';
    $('c-mode').textContent = god ? 'PLANNING VIEW' : 'SAM (' + (this.game.player.third ? '3rd' : '1st') + ' person)';
    if (god) this.game.input.unlock();
  }
  start() { this.hide('title'); this.show('hud-info', 'objectives', 'clockbox', 'stock'); this.setMode(this.game.mode); }

  // ---------- controller ----------
  /** Swap keyboard hints for controller buttons while a pad is in use. */
  keyText(t) { if (!this.game.input.padActive || !t) return t; return t.replace(/\bE\b/g, 'A').replace(/\bF\b/g, 'X').replace(/\bQ\b/g, 'Y').replace(/\bTAB\b/g, 'START').replace(/\bV\b/g, 'RB').replace(/\bG\b/g, 'B').replace(/\bR\b/g, 'D-pad ↓'); }
  padScope() { if (!this.game.started) return $('title'); if (!$('howto').classList.contains('hidden')) return $('howto'); if (this.terminalB) return $('terminal'); if (this.invOpen) return $('inventory'); return null; }
  padUpdate(inp, dt) {
    const P = inp.pad, g = this.game; if (!inp.padActive || !P.connected) { this.clearPadFocus(); return; }
    // menu focus (title screen, terminal)
    const scope = this.padScope();
    if (scope) {
      const btns = [...scope.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null); if (!btns.length) return;
      this._pfIdx = Math.min(this._pfIdx || 0, btns.length - 1);
      this._navT = (this._navT || 0) - dt; let d = 0; const sy = Math.abs(P.ly) > 0.6 ? Math.sign(P.ly) : Math.abs(P.lx) > 0.6 ? Math.sign(P.lx) : 0;
      if (P.hitB[12] || P.hitB[14]) d = -1; else if (P.hitB[13] || P.hitB[15]) d = 1; else if (sy && this._navT <= 0) { d = sy; this._navT = 0.22; } if (!sy) this._navT = 0;
      if (d) this._pfIdx = (this._pfIdx + d + btns.length) % btns.length;
      for (const b of scope.querySelectorAll('button.padfocus')) if (b !== btns[this._pfIdx]) b.classList.remove('padfocus'); btns[this._pfIdx].classList.add('padfocus'); btns[this._pfIdx].scrollIntoView({ block: 'nearest' });
      if (P.hitB[0]) { btns[this._pfIdx].click(); } return;
    }
    this.clearPadFocus();
    if (g.mode !== 'god' || this.modalOpen || !g.started) return;
    const ids = TOOLS.map((t) => t[0]), cur = ids.indexOf(g.god.tool.id);
    if (P.hitB[5] || P.hitB[4]) { const n = ids[(cur + (P.hitB[5] ? 1 : -1) + ids.length) % ids.length]; g.god.setTool(n, n === 'zone' ? 'res' : n === 'road' ? 'dirt' : null); this.openSub(n); this.toast(TOOLS.find((t) => t[0] === n)[2] + ' tool', 1200); }
    const list = this.padItems(); if (list.length && (P.hitB[12] || P.hitB[13])) { const i = list.indexOf(g.god.tool.sub), n = list[(i + (P.hitB[13] ? 1 : -1) + list.length + (i < 0 ? 1 : 0)) % list.length]; g.god.setTool(g.god.tool.id, n); this.openSub(g.god.tool.id); }
    if (g.god.tool.id === 'build' && (P.hitB[14] || P.hitB[15])) { const tabs = TOOL_MENUS.build.map(([n]) => n), i = tabs.indexOf(this.buildTab); this.buildTab = tabs[(i + (P.hitB[15] ? 1 : -1) + tabs.length) % tabs.length]; g.god.setTool('build', null); this.openSub('build'); }
  }
  padItems() { const t = this.game.god.tool.id; if (t === 'build') return (TOOL_MENUS.build.find(([n]) => n === this.buildTab) || TOOL_MENUS.build[0])[1]; if (t === 'park' || t === 'util') return TOOL_MENUS[t]; if (t === 'road') return ['dirt', 'paved']; if (t === 'zone') return ['res', 'com', 'ind', 'none']; return []; }
  clearPadFocus() { if (this._pfOn) { document.querySelectorAll('.padfocus').forEach((b) => b.classList.remove('padfocus')); this._pfOn = false; } if (this.padScope()) this._pfOn = true; }

  // ---------- toolbox ----------
  refreshTools() {
    const g = this.game, t = g.god.tool.id; for (const b of $('toolbox').querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.t === t);
  }
  openSub(id) {
    const g = this.game, sm = $('submenu');
    if (id === 'zone') { sm.innerHTML = [['res', 'Residential'], ['com', 'Commercial'], ['ind', 'Industrial'], ['none', 'Clear zone']].map(([k, n]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''}" data-s="${k}">${n}<small>drag to paint</small></button>`).join(''); sm.classList.remove('hidden'); return; }
    if (id === 'road') { const pop = g.population.count(); sm.innerHTML = [['dirt', 'Dirt path', '£2 a tile, dug by hand'], ['paved', 'Paved road', pop >= 15 ? '£20 + 1 stone a tile' : 'needs 15 residents']].map(([k, n, t]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''} ${k === 'paved' && pop < 15 ? 'locked' : ''}" data-s="${k}">${n}<small>${t}</small></button>`).join(''); sm.classList.remove('hidden'); return; }
    let list = TOOL_MENUS[id], tabs = '';
    if (id === 'build') { tabs = TOOL_MENUS.build.map(([n]) => `<button class="subtab ${n === this.buildTab ? 'on' : ''}" data-tab="${n}">${n}</button>`).join(''); list = (TOOL_MENUS.build.find(([n]) => n === this.buildTab) || TOOL_MENUS.build[0])[1]; }
    if (!list) { sm.classList.add('hidden'); return; }
    const pop = g.population.count();
    sm.innerHTML = (tabs ? `<div class="tabrow">${tabs}</div>` : '') + list.map((k) => {
      const d = BUILDINGS[k], un = g.economy.isUnlocked(k), p = g.economy.permits[k], mats = Object.entries(d.mat).map(([m, n]) => n + ' ' + m).join(', ');
      const status = un ? mats : (p === 'pending' ? 'permit pending…' : pop < d.permit.pop ? `needs ${d.permit.pop} residents` : `permit £${d.permit.cost} (terminal)`);
      return `<button class="sub ${g.god.tool.sub === k ? 'on' : ''} ${un ? '' : 'locked'}" data-s="${k}">${d.name}<small>${status}</small></button>`;
    }).join(''); sm.classList.remove('hidden');
  }
  setHover(text) { const h = $('hover'); h.textContent = text; h.classList.remove('hidden'); this.hoverTimer = 0.2; }

  // ---------- messages / toasts ----------
  addMessage(m) {
    const el = document.createElement('div'); el.className = 'msg ' + (m.kind || ''); el.innerHTML = `<b>${m.from}:</b> ${this.keyText(m.text)}`; const box = $('messages'); box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 1s'; el.style.opacity = 0; setTimeout(() => el.remove(), 1000); }, 7000);
  }
  setAlert(text) { const a = $('alertbar'); if (!a) return; if (text) { a.textContent = text; a.classList.remove('hidden'); } else a.classList.add('hidden'); }
  toast(text, ms = 2600) { const t = $('toast'); t.textContent = this.keyText(text); t.classList.remove('hidden'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.add('hidden'), ms); }
  fade(a, text = '') { $('fade').style.opacity = a; $('fade-text').textContent = text; }
  setPrompt(text, hold, info = false) {
    const p = $('prompt'); if (!text || this.game.mode !== 'sim' || this.modalOpen) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden'); p.classList.toggle('pad', this.game.input.padActive); p.classList.toggle('info', !!info); $('prompt-text').textContent = this.keyText(text); const bar = $('prompt-bar'); bar.style.display = hold >= 0 ? 'block' : 'none'; bar.firstChild.style.width = Math.round(Math.max(0, hold) * 100) + '%';
  }

  // ---------- objectives ----------
  renderObjectives() {
    const g = this.game, cur = g.story.objective, o = OBJECTIVES[cur], el = $('obj-list');
    if (!o) { $('obj-title').textContent = 'Free play'; $('obj-text').textContent = 'Grow the town however you like.'; el.innerHTML = ''; return; }
    // one thing at a time: only the current step is shown
    const i = o.steps.findIndex((s) => !s.done(g)), k = i < 0 ? o.steps.length - 1 : i, step = o.steps[k];
    const sig = cur + ':' + k + g.input.padActive; if (sig === this._objSig) return; this._objSig = sig;
    $('obj-title').textContent = o.title.replace(/^\d+\. /, ''); $('obj-text').textContent = this.keyText(step.text);
    el.innerHTML = `<div class="stepdots">${o.steps.map((s, n) => `<span class="${n < k ? 'd' : n === k ? 'c' : ''}"></span>`).join('')}<em>Step ${k + 1} of ${o.steps.length} · Goal ${cur + 1} of ${OBJECTIVES.length}</em></div>`;
    if (this._lastStep && this._lastStep !== sig) { const b = $('objectives'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); Sfx.play('ui'); }
    this._lastStep = sig;
  }
  flashObjective() { const o = $('objectives'); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); this.renderObjectives(); }

  // ---------- dialogue ----------
  openDialogue(sim, res) {
    this.dialogue = { sim, full: res.text, shown: 0 }; this.modalOpen = true; this.game.input.unlock();
    $('d-name').textContent = `${sim.name} — ${sim.roleName}`; $('d-text').textContent = ''; this.show('dialogue');
    if (res.page) this.toast('Script page collected! (see terminal Notes)', 3500);
  }
  advanceDialogue() { const d = this.dialogue; if (!d) return; if (d.shown < d.full.length) { d.shown = d.full.length; } else this.closeDialogue(); }
  closeDialogue() { if (!this.dialogue) return; this.dialogue.sim.frozen = false; this.dialogue.sim.talkingToPlayer = false; this.dialogue.sim.moodBoost += 0.1; this.dialogue = null; this.modalOpen = false; this.hide('dialogue'); }

  // ---------- terminal ----------
  openTerminal(b) { this.terminalB = b; this.modalOpen = true; this.game.input.unlock(); this.game.flags.terminalOpened = true; this.renderTerminal(); this.show('terminal'); }
  closeTerminal() { this.terminalB = null; this.modalOpen = false; this.hide('terminal'); }

  // ---------- backpack ----------
  openInventory() { this.invOpen = true; this.modalOpen = true; this.game.input.unlock(); this.renderInventory(); this.show('inventory'); Sfx.play('ui'); }
  closeInventory() { this.invOpen = false; this.modalOpen = false; this.hide('inventory'); }
  renderInventory() {
    const g = this.game, P = g.player, n = P.invTotal();
    const tools = Object.keys(TOOL_NAMES).map((t) => `<div class="slot ${P.tools.has(t) ? 'has' : 'empty'}"><span class="ic">${TOOL_ICON[t]}</span>${TOOL_NAMES[t]}</div>`).join('');
    const rows = Object.entries(P.inv).map(([m, q]) => `<div class="row2"><span class="ic">${MAT_ICON[m] || ''}</span><span class="nm">${q} × ${MATERIALS[m].name}</span>${m === 'food' ? `<button data-inv="eat">Eat</button>` : ''}<button data-inv="drop" data-m="${m}">Drop</button></div>`).join('') || '<div class="row2"><span class="nm">Empty. Chop, mine, pick or take crates from the Stockyard.</span></div>';
    $('inventory').innerHTML = `<h2><span>BACKPACK</span><button data-inv="close">Close</button></h2><div>Tool belt</div><div class="slots">${tools}</div><div>Backpack ${n}/${BACKPACK}</div><div class="cap"><div style="width:${n / BACKPACK * 100}%"></div></div>${rows}${n ? '<div class="row2"><span class="nm"></span><button data-inv="dropall">Drop everything</button></div>' : ''}<div class="hint">${(this.game.input.padActive ? 'D-pad ↑ opens this · D-pad ↓ drops everything · Y eats · deliver to sites with A' : 'I opens this · R drops everything · Q eats · deliver to sites with E')}</div>`;
  }
  invClick(e) {
    const b = e.target.closest('button'); if (!b) return; const P = this.game.player, a = b.dataset.inv;
    if (a === 'close') return this.closeInventory(); if (a === 'drop') P.drop(b.dataset.m); if (a === 'dropall') P.drop(); if (a === 'eat') P.eat();
    this.renderInventory();
  }
  renderTerminal() {
    const g = this.game, e = g.economy, tab = this.terminalTab, T = $('terminal');
    const tabs = [['permits', 'Permits'], ['materials', 'Trade'], ['residents', 'Residents'], ['report', 'Town report']]; if (g.story.pages.length) tabs.push(['notes', 'Notes']);
    let body = '';
    if (tab === 'permits') {
      const list = ALL_BUILDABLE.slice().sort((a, b) => BUILDINGS[a].permit.pop - BUILDINGS[b].permit.pop || BUILDINGS[a].permit.cost - BUILDINGS[b].permit.cost);
      body = `<div class="note">Settlement: <b>${tierOf(g.population.count())}</b> · ${g.population.count()} residents. Bigger towns unlock bigger buildings.</div><table><tr><th>Building</th><th>Needs</th><th>Fee</th><th></th></tr>` + list.map((k) => {
        const d = BUILDINGS[k], p = e.permits[k], mats = Object.entries(d.mat).map(([m, n]) => `${n} ${m}`).join(', ');
        const btn = p === 'approved' ? '<span class="st">APPROVED</span>' : p === 'pending' ? '<span class="st">PENDING…</span>' : `<button data-act="permit" data-id="${k}" ${g.population.count() < d.permit.pop || e.funds < d.permit.cost ? 'disabled' : ''}>Request</button>`;
        return `<tr><td>${d.name}<br><small>${d.blurb}</small></td><td><small>${mats}<br>${d.permit.pop ? 'needs ' + d.permit.pop + ' residents' : ''}</small></td><td>${fmtMoney(d.permit.cost)}</td><td>${btn}</td></tr>`;
      }).join('') + '</table><div class="note">Approved permits unlock the building in the planning view (TAB). Sites then need materials and builders.</div>';
    } else if (tab === 'materials') {
      body = `<div>Stockyard: ${Object.keys(MATERIALS).map((m) => `${MATERIALS[m].name} <b>${Math.floor(e.stock[m])}</b>`).join(' · ')}</div><div class="note">Gather what you can yourself or with workers. The Lift trader buys surplus at about half price and sells at a premium; a truck brings purchases to the Stockyard.</div>
        <table><tr><th>Goods</th><th>Buy price</th><th colspan="3">Buy</th><th colspan="2">Sell</th></tr>` +
        Object.entries(MATERIALS).map(([m, d]) => `<tr><td>${d.name}</td><td>${fmtMoney(Math.round(d.price * 1.4))}</td>${[5, 20].map((q) => `<td><button data-act="order" data-m="${m}" data-q="${q}" ${e.funds < Math.round(d.price * 1.4) * q ? 'disabled' : ''}>×${q} (${fmtMoney(Math.round(d.price * 1.4) * q)})</button></td>`).join('')}<td></td>${[5, 20].map((q) => `<td><button data-act="sell" data-m="${m}" data-q="${q}" ${e.stock[m] < q ? 'disabled' : ''}>×${q}</button></td>`).join('')}</tr>`).join('') +
        `</table><div class="note">${g.depot ? 'Deliveries drive along roads from the Lift to the Stockyard.' : 'No Stockyard! Goods will be held at the dock.'} Orders in transit: ${e.orders.length}</div>`;
    } else if (tab === 'residents') {
      const P = g.population, vac = P.vacancies();
      body = `<div>Residents <b>${P.count()}</b> · employed ${P.employed()} · free beds ${P.freeBeds()} · open jobs ${vac.length} · food in stock ${Math.floor(e.stock.food)}</div>
        <p>Newcomers arrive through the Lift when there are free beds, open jobs and enough food. You can invite settlers for a fee.</p>
        <button data-act="invite" data-n="1" ${e.funds < 500 ? 'disabled' : ''}>Invite 1 (£500)</button> <button data-act="invite" data-n="3" ${e.funds < 1500 ? 'disabled' : ''}>Invite 3 (£1,500)</button>
        <div class="note">Queued invitations: ${P.invites}</div>`;
    } else if (tab === 'report') {
      const r = e.lastReport, P = g.population;
      body = `<table><tr><td>Funds</td><td>${fmtMoney(e.funds)}</td></tr><tr><td>Residents</td><td>${P.count()}</td></tr><tr><td>Buildings</td><td>${g.buildings.list.filter((b) => b.state === 'done').length} (+${g.buildings.list.filter((b) => b.state === 'site').length} under construction)</td></tr>
        <tr><td>Power</td><td>${g.buildings.count('power') ? 'ONLINE' : 'none'}</td></tr><tr><td>Water</td><td>${g.buildings.count('water') ? 'ONLINE' : 'none'}</td></tr>
        <tr><td>Last month</td><td>${r ? `income ${fmtMoney(r.income)} · costs ${fmtMoney(r.cost)} · net ${fmtMoney(r.net)}` : 'no report yet'}</td></tr></table>`;
    } else if (tab === 'notes') {
      const pg = g.story.pages; body = pg.length ? pg.map((p) => `<div class="page">${p}</div>`).join('') : '<div class="note">No notes yet. Talk to residents regularly — some of them know more than they should.</div>';
    }
    T.innerHTML = `<div class="win"><h2><span>SAM CITY - PLANNING TERMINAL</span><button data-act="close">Close [Esc]</button></h2><div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-k="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}<span style="margin-left:auto">Funds: <b>${fmtMoney(e.funds)}</b></span></div>${body}</div>`;
  }
  terminalClick(e) {
    const b = e.target.closest('button'); if (!b) return; const g = this.game, a = b.dataset.act; let r = null;
    if (a === 'close') return this.closeTerminal(); if (a === 'tab') { this.terminalTab = b.dataset.k; }
    if (a === 'permit') r = g.economy.requestPermit(b.dataset.id);
    if (a === 'order') r = g.economy.orderMaterial(b.dataset.m, +b.dataset.q);
    if (a === 'sell') r = g.economy.sellMaterial(b.dataset.m, +b.dataset.q);
    if (a === 'invite') { const n = +b.dataset.n; if (g.economy.spend(500 * n)) { g.population.invites += n; g.population.timer = Math.min(g.population.timer, 2); g.messages.push('Lift', `${n} resident(s) invited. They will arrive shortly.`); } }
    if (r && !r.ok) this.toast(r.msg);
    this.renderTerminal();
  }

  // ---------- query ----------
  query(o) {
    const q = $('query'), g = this.game; let h = '';
    if (o.sim) {
      const s = o.sim, mood = s.mood > 0.35 ? 'happy' : s.mood > 0 ? 'content' : s.mood > -0.35 ? 'fed up' : 'miserable', hung = s.hunger < 35 ? 'well fed' : s.hunger < 65 ? 'peckish' : s.hunger < 90 ? 'hungry' : 'starving';
      const fr = [...s.rel.entries()].filter(([, v]) => v >= 35).length;
      h = `<b>${s.name}</b> (${s.gender === 'f' ? 'F' : 'M'}, ${Math.floor(s.age)})<br>${s.roleName} · ${s.trait}<br>Home: ${s.home ? s.home.def.name : 'none'}<br>Works: ${s.workplace ? s.workplace.def.name : (s.kind === 'child' ? 'school / play' : 'unemployed')}<br>Mood: ${mood} · ${hung}<br>${s.partner ? 'Partner: ' + s.partner.name + '<br>' : ''}Friends: ${fr}<br>Doing: ${s.pose === 'sleep' ? 'sleeping' : s.eating ? 'eating' : s.activity || 'idle'}`; }
    else if (o.b) { const b = o.b; h = `<b>${b.def.name}</b><br>${b.def.blurb || ''}<br>${b.state === 'site' ? `Under construction: ${Math.round(b.progress * 100)}%<br>Materials: ${Object.entries(b.need).map(([m, n]) => `${m} ${b.have[m] || 0}/${n}`).join(', ')}` : `Residents ${b.residents.length}/${b.def.beds || 0}<br>Workers ${b.workers.length}/${Object.values(b.def.jobs || {}).reduce((a, c) => a + c, 0)}`}`; }
    else h = `Tile ${o.tile[0]},${o.tile[1]}`;
    q.innerHTML = h; q.classList.remove('hidden'); clearTimeout(this._qt); this._qt = setTimeout(() => q.classList.add('hidden'), 6000);
  }

  showEnding() {
    const e = $('ending'); e.classList.remove('hidden');
    e.innerHTML = `<div class="box"><h1>OUTSIDE</h1><p class="tag">The tunnel opens onto a hillside — real wind, real sun, no cue cards.<br>Sam City was a set. You were the star.<br><br>Thanks for playing this prototype.</p><button id="btn-keep">Keep playing in the set</button></div>`;
    $('btn-keep').onclick = () => { e.classList.add('hidden'); this.game.ending = false; this.game.flags.escaped = true; this.game.player.teleport(this.game.plaza.x, this.game.plaza.z); this.fade(0); };
  }

  // ---------- per-frame ----------
  update(dt) {
    const g = this.game;
    if (this.hoverTimer > 0) { this.hoverTimer -= dt; if (this.hoverTimer <= 0 || g.mode !== 'god') $('hover').classList.add('hidden'); }
    if (this.dialogue) { const d = this.dialogue; d.shown = Math.min(d.full.length, d.shown + dt * 55); $('d-text').textContent = d.full.slice(0, Math.floor(d.shown)); }
    if (g.input.hit('KeyH')) { $('help').classList.toggle('hidden'); this.helpT = 0; }
    this.acc += dt; if (this.acc < 0.25) return; this.acc = 0;
    const c = g.clock, P = g.population;
    $('h-pop').textContent = P.count().toLocaleString(); $('h-funds').textContent = fmtMoney(g.economy.funds); $('h-month').textContent = MONTHS[c.month]; $('h-year').textContent = c.year; $('h-sims').textContent = `${P.sims.filter((s) => !s.hidden).length}/${P.simCap}`;
    $('c-date').textContent = `${MONTHS[c.month]} ${c.year}`; $('c-time').textContent = c.hhmm;
    for (const b of $('c-speed').children) b.classList.toggle('on', +b.dataset.s === c.speed);
    $('stock').innerHTML = Object.keys(MATERIALS).map((m) => `<div><span>${MATERIALS[m].name}</span> <b>${Math.floor(g.economy.stock[m])}</b></div>`).join('');
    $('h-tier').textContent = tierOf(P.count());
    $('b-hunger').style.width = Math.round(100 - g.player.hunger) + '%'; $('b-hunger').style.background = g.player.hunger > 70 ? '#ff6b6b' : '#e8b44a'; $('h-tools').textContent = [...g.player.tools].map((t) => TOOL_NAMES[t]).join(', ') || 'none yet';
    $('b-energy').style.width = Math.round(g.player.energy) + '%'; $('b-energy').style.background = g.player.energy < 25 ? '#ff6b6b' : '#7be08f';
    $('h-carry').textContent = `${g.player.invTotal()}/${BACKPACK}`; $('h-pack').textContent = g.player.invText(); $('b-pack').style.width = (g.player.invTotal() / BACKPACK * 100) + '%'; $('h-keys').textContent = g.input.padActive ? 'D-pad ↑ backpack · D-pad ↓ drop · Y eat' : 'I backpack · R drop · Q eat';
    if (this.helpT > 0) { this.helpT -= 0.25; if (this.helpT <= 0) $('help').classList.add('hidden'); }
    if (this._padWas !== g.input.padActive) { this._padWas = g.input.padActive; this.setMode(g.mode); }
    $('crosshair').classList.toggle('hidden', g.mode === 'god' && !g.input.padActive); $('crosshair').classList.toggle('godcur', g.mode === 'god');
    if (g.mode === 'sim') $('c-mode').textContent = 'SAM (' + (g.player.third ? '3rd' : '1st') + ' person)';
    this.renderObjectives();
  }
}
