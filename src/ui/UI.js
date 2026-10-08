import { BUILDINGS, MATERIALS, ROLES, TOOL_MENUS, ALL_BUILDABLE, tierOf } from '../data/buildings.js';
import { OBJECTIVES } from '../data/story.js';
import { fmtMoney } from '../util.js';
import { MONTHS } from '../core/Clock.js';

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
    $('terminal').addEventListener('click', (e) => this.terminalClick(e));
    game.messages.on('msg', (m) => this.addMessage(m));
    game.economy.on('permits', () => { if (this.terminalB) this.renderTerminal(); });
    this.refreshTools(); this.renderObjectives();
  }
  show(...ids) { for (const i of ids) $(i).classList.remove('hidden'); }
  hide(...ids) { for (const i of ids) $(i).classList.add('hidden'); }

  // ---------- modes ----------
  setMode(mode) {
    const god = mode === 'god';
    ['toolbox'].forEach((i) => $(i).classList.toggle('hidden', !god)); if (!god) this.hide('submenu', 'hover');
    $('crosshair').classList.toggle('hidden', god); $('simhud').classList.toggle('hidden', god); $('stock').classList.remove('hidden');
    $('help').classList.remove('hidden'); $('help').textContent = god ? 'GOD MODE · TAB: control Sam · WASD pan · Q/E rotate · wheel zoom · right-drag pan · R rotate ghost · F frame island · Esc cancel tool' : 'SIM MODE · TAB: planning view · WASD move · Shift sprint · V camera · E interact (hold to work) · G wave · click to capture mouse';
    $('c-mode').textContent = god ? 'PLANNING VIEW' : 'SAM (' + (this.game.player.third ? '3rd' : '1st') + ' person)';
    if (god) this.game.input.unlock();
  }
  start() { this.hide('title'); this.show('hud-info', 'objectives', 'clockbox', 'stock'); this.setMode(this.game.mode); }

  // ---------- toolbox ----------
  refreshTools() {
    const g = this.game, t = g.god.tool.id; for (const b of $('toolbox').querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.t === t);
  }
  openSub(id) {
    const g = this.game, sm = $('submenu');
    if (id === 'zone') { sm.innerHTML = [['res', 'Residential'], ['com', 'Commercial'], ['ind', 'Industrial'], ['none', 'Clear zone']].map(([k, n]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''}" data-s="${k}">${n}<small>drag to paint</small></button>`).join(''); sm.classList.remove('hidden'); return; }
    if (id === 'road') { const pop = g.population.count(); sm.innerHTML = [['dirt', 'Dirt track', '£4 per tile'], ['paved', 'Paved road', pop >= 15 ? '£25 per tile' : 'needs 15 residents']].map(([k, n, t]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''} ${k === 'paved' && pop < 15 ? 'locked' : ''}" data-s="${k}">${n}<small>${t}</small></button>`).join(''); sm.classList.remove('hidden'); return; }
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
    const el = document.createElement('div'); el.className = 'msg ' + (m.kind || ''); el.innerHTML = `<b>${m.from}:</b> ${m.text}`; const box = $('messages'); box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 1s'; el.style.opacity = 0; setTimeout(() => el.remove(), 1000); }, 7000);
  }
  toast(text, ms = 2600) { const t = $('toast'); t.textContent = text; t.classList.remove('hidden'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.add('hidden'), ms); }
  fade(a, text = '') { $('fade').style.opacity = a; $('fade-text').textContent = text; }
  setPrompt(text, hold) {
    const p = $('prompt'); if (!text || this.game.mode !== 'sim' || this.modalOpen) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden'); $('prompt-text').textContent = text; const bar = $('prompt-bar'); bar.style.display = hold >= 0 ? 'block' : 'none'; bar.firstChild.style.width = Math.round(Math.max(0, hold) * 100) + '%';
  }

  // ---------- objectives ----------
  renderObjectives() {
    const g = this.game, cur = g.story.objective, o = OBJECTIVES[cur];
    $('obj-text').textContent = o ? o.text : 'The story continues...';
    $('obj-list').innerHTML = OBJECTIVES.map((x, i) => `<div class="${i < cur ? 'done' : i === cur ? 'cur' : ''}">${i < cur ? '✓' : i === cur ? '▶' : '·'} ${x.text}</div>`).join('');
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
    this.acc += dt; if (this.acc < 0.25) return; this.acc = 0;
    const c = g.clock, P = g.population;
    $('h-pop').textContent = P.count().toLocaleString(); $('h-funds').textContent = fmtMoney(g.economy.funds); $('h-month').textContent = MONTHS[c.month]; $('h-year').textContent = c.year; $('h-sims').textContent = `${P.sims.length}/${P.simCap}`;
    $('c-date').textContent = `${MONTHS[c.month]} ${c.year}`; $('c-time').textContent = c.hhmm;
    for (const b of $('c-speed').children) b.classList.toggle('on', +b.dataset.s === c.speed);
    $('stock').innerHTML = Object.keys(MATERIALS).map((m) => `<div><span>${MATERIALS[m].name}</span> <b>${Math.floor(g.economy.stock[m])}</b></div>`).join('');
    $('h-tier').textContent = tierOf(P.count());
    $('b-energy').style.width = Math.round(g.player.energy) + '%'; $('b-energy').style.background = g.player.energy < 25 ? '#ff6b6b' : '#7be08f';
    $('h-carry').textContent = g.player.carry ? `${g.player.carry.qty} ${MATERIALS[g.player.carry.mat].name}` : 'nothing';
    if (g.mode === 'sim') $('c-mode').textContent = 'SAM (' + (g.player.third ? '3rd' : '1st') + ' person)';
    this.renderObjectives();
  }
}
