import { PlanMenu } from './PlanMenu.js';
import { CHALLENGES } from '../systems/Challenges.js';
import { SKILLS } from '../systems/Skills.js';
import { BUILDINGS, MATERIALS, ROLES, TOOL_MENUS, ALL_BUILDABLE, tierOf } from '../data/buildings.js';
import { OBJECTIVES } from '../data/story.js';
import { fmtMoney } from '../util.js';
import { MONTHS } from '../core/Clock.js';
import { TOOLS as TOOL_NAMES, TOOL_ICON, MAT_ICON, BACKPACK } from '../player/Player.js';
import { Sfx } from '../core/Sfx.js';
import { CURIOS } from '../systems/Curios.js';

const $ = (id) => document.getElementById(id);
const TOOLS = [
  ['pan', '✋', 'Pan'], ['bulldoze', '🚜', 'Bulldoze'], ['road', '🛣️', 'Roads'], ['zone', '🟩', 'Zones'],
  ['build', '🏢', 'Buildings'], ['park', '🌳', 'Parks'], ['util', '⚡', 'Utilities'], ['query', '🔍', 'Query'],
];

/** All DOM. In Unity: UI Toolkit / uGUI screens driven by the same game-state getters. */
export class UI {
  constructor(game) {
    this.game = game; this.adult = true; this.terminalTab = 'permits'; this.buildTab = 'Homes'; this.terminalB = null; this.dialogue = null; this.acc = 0; this.hoverTimer = 0;

    // toolbox
    $('toolbox').innerHTML = TOOLS.map(([id, ic, name]) => `<button class="tool" data-t="${id}"><span class="ic">${ic}</span>${name}</button>`).join('') + '<button class="tool wide" data-menu="1"><span class="ic">📐</span>Planning menu <small>B / pad X</small></button>';
    this.plan = new PlanMenu(game);
    $('toolbox').addEventListener('click', (e) => { const b = e.target.closest('.tool'); if (!b) return; if (b.dataset.menu) { this.plan.show(); return; } const id = b.dataset.t; game.god.setTool(id, id === 'zone' ? 'res' : id === 'road' ? 'dirt' : null); this.openSub(id); });
    $('submenu').addEventListener('click', (e) => { const tb = e.target.closest('.subtab'); if (tb) { this.buildTab = tb.dataset.tab; this.openSub('build'); return; } const b = e.target.closest('.sub'); if (!b) return; game.god.setTool(game.god.tool.id, b.dataset.s); this.openSub(game.god.tool.id); });
    $('c-speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; game.clock.speed = +b.dataset.s; });
    $('terminal').addEventListener('click', (e) => this.terminalClick(e)); $('dialogue').addEventListener('click', () => this.nextLine()); $('inventory').addEventListener('click', (e) => this.invClick(e)); $('journal').addEventListener('click', (e) => { if (e.target.closest('[data-j="close"]')) this.closeJournal(); });
    game.messages.on('msg', (m) => this.addMessage(m));
    game.economy.on('permits', () => { if (this.terminalB) this.renderTerminal(); });
    $('btn-howto').onclick = () => { this.hide('howto'); this.modalOpen = false; this.game.clock.speed = 1; };
    this.refreshTools(); this.renderObjectives();
  }
  /** A window is open (talking, the post, the backpack, the journal, the how-to card): worked out fresh each time so it can't get stuck. */
  get modalOpen() { return !!((this.plan && this.plan.open) || this.dialogue || this.terminalB || this.invOpen || this.journalOpen || !$('howto').classList.contains('hidden') || !$('ending').classList.contains('hidden')); }
  set modalOpen(v) { /* derived; kept so old callers stay harmless */ }
  get mouseOverCanvas() { return this.game.input.overCanvas !== false; }
  /** Something broke: say so on screen (once in a while) instead of silently freezing. */
  reportError(e) {
    const now = performance.now(), msg = String((e && e.message) || e); if (this._errT && now - this._errT < 8000 && msg === this._errMsg) return; this._errT = now; this._errMsg = msg;
    const where = ((e && e.stack) || '').split('\n').slice(1, 2).join('').replace(/^\s*at\s*/, '').replace(/https?:\/\/[^/]+\//, '').slice(0, 90);
    this.toast(`⚠ Oops, a bug: ${msg.slice(0, 80)} (${where}). The game keeps going; tell Claude this text if it repeats.`, 7000);
  }
  show(...ids) { for (const i of ids) $(i).classList.remove('hidden'); }
  hide(...ids) { for (const i of ids) $(i).classList.add('hidden'); }

  // ---------- modes ----------
  setMode(mode) {
    const god = mode === 'god';
    ['toolbox'].forEach((i) => $(i).classList.toggle('hidden', !god)); if (!god) this.hide('submenu', 'hover');
    $('crosshair').classList.toggle('hidden', god); $('simhud').classList.toggle('hidden', god); $('stock').classList.remove('hidden');
    $('help').classList.remove('hidden'); this.helpMode = mode; this.helpT = 14; $('help').textContent = this.game.input.padActive ? (god ? 'GOD MODE · START: control Sam · X planning menu · Left stick pan · Right stick rotate/zoom · A place/paint · B cancel · Y rotate · LB/RB tool · D-pad item · R3 whole island' : 'SAM · START planning view · Left stick move · Right stick look · A use / tap in the green · D-pad ↑ backpack · D-pad ↓ drop · Y eat · LB sprint · RB camera') : god ? 'GOD MODE · TAB: control Sam · B planning menu · WASD pan · Q/E rotate · wheel zoom · right-drag pan · R rotate ghost · F frame island · Esc cancel tool' : 'SAM · TAB planning view · WASD move · Shift sprint · E use / tap in the green to work · I backpack · R drop · Q eat · V camera · M map · click to capture mouse';
    $('c-mode').textContent = god ? 'PLANNING VIEW' : 'SAM (' + (this.game.player.third ? '3rd' : '1st') + ' person)';
    if (god) this.game.input.unlock();
  }
  start() { this.hide('title'); this.show('hud-info', 'objectives', 'clockbox', 'stock'); this.setMode(this.game.mode); }

  // ---------- controller ----------
  /** Swap keyboard hints for controller buttons while a pad is in use. */
  keyText(t) { if (!this.game.input.padActive || !t) return t; return t.replace(/\bE\b/g, 'A').replace(/\bF\b/g, 'X').replace(/\bQ\b/g, 'Y').replace(/\bTAB\b/g, 'START').replace(/\bV\b/g, 'RB').replace(/\bG\b/g, 'B').replace(/\bR\b/g, 'D-pad ↓').replace(/\bC\b/g, 'D-pad →'); }
  padScope() { if (!this.game.started) return $('title'); if (this.plan && this.plan.open) return $('planmenu'); if (!$('howto').classList.contains('hidden')) return $('howto'); if (this.terminalB) return $('terminal'); if (this.invOpen) return $('inventory'); if (this.journalOpen) return $('journal'); return null; }
  padUpdate(inp, dt) {
    const P = inp.pad, g = this.game; if (!inp.padActive || !P.connected) { this.clearPadFocus(); return; }
    // menu focus (title screen, terminal)
    const scope = this.padScope();
    if (scope) {
      const btns = [...scope.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null); if (!btns.length) return;
      this._pfIdx = Math.min(this._pfIdx || 0, btns.length - 1);
      if (scope.id === 'planmenu') { if (P.hitB[4] || P.hitB[5]) { this.plan.cycleTab(P.hitB[5] ? 1 : -1); return; } if (P.hitB[6] || P.hitB[7]) { this.plan.cycleCat(P.hitB[7] ? 1 : -1); return; } }
      // D-pad / stick move the highlight to the nearest button in that direction (works for grids as well as lists)
      this._navT = (this._navT || 0) - dt; let dir = null; const stick = Math.hypot(P.lx, P.ly) > 0.6 ? (Math.abs(P.lx) > Math.abs(P.ly) ? [Math.sign(P.lx), 0] : [0, Math.sign(P.ly)]) : null;
      if (P.hitB[12]) dir = [0, -1]; else if (P.hitB[13]) dir = [0, 1]; else if (P.hitB[14]) dir = [-1, 0]; else if (P.hitB[15]) dir = [1, 0]; else if (stick && this._navT <= 0) { dir = stick; this._navT = 0.22; } if (!stick) this._navT = 0;
      if (dir) this._pfIdx = this.navFrom(btns, this._pfIdx, dir);
      for (const b of scope.querySelectorAll('button.padfocus')) if (b !== btns[this._pfIdx]) b.classList.remove('padfocus'); btns[this._pfIdx].classList.add('padfocus'); btns[this._pfIdx].scrollIntoView({ block: 'nearest' });
      if (P.hitB[0]) { btns[this._pfIdx].click(); inp.pressed.delete('KeyE'); this.calm(); } return;
    }
    this.clearPadFocus();
    if (g.mode !== 'god' || this.modalOpen || !g.started) return;
    const ids = TOOLS.map((t) => t[0]), cur = ids.indexOf(g.god.tool.id);
    if (P.hitB[5] || P.hitB[4]) { const n = ids[(cur + (P.hitB[5] ? 1 : -1) + ids.length) % ids.length]; g.god.setTool(n, n === 'zone' ? 'res' : n === 'road' ? 'dirt' : null); this.openSub(n); this.toast(TOOLS.find((t) => t[0] === n)[2] + ' tool', 1200); }
    const list = this.padItems(); if (list.length && (P.hitB[12] || P.hitB[13])) { const i = list.indexOf(g.god.tool.sub), n = list[(i + (P.hitB[13] ? 1 : -1) + list.length + (i < 0 ? 1 : 0)) % list.length]; g.god.setTool(g.god.tool.id, n); this.openSub(g.god.tool.id); }
    if (g.god.tool.id === 'build' && (P.hitB[14] || P.hitB[15])) { const tabs = TOOL_MENUS.build.map(([n]) => n), i = tabs.indexOf(this.buildTab); this.buildTab = tabs[(i + (P.hitB[15] ? 1 : -1) + tabs.length) % tabs.length]; g.god.setTool('build', null); this.openSub('build'); }
  }
  /** Nearest button in a direction from the current one; falls back to next/previous in the list. */
  navFrom(btns, i, [dx, dy]) {
    const r0 = btns[i].getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2; let best = -1, bs = Infinity;
    btns.forEach((b, j) => { if (j === i) return; const r = b.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy, along = x * dx + y * dy; if (along <= 6) return; const perp = Math.abs(x * dy - y * dx), sc = along + perp * 2.2; if (sc < bs) { bs = sc; best = j; } });
    return best >= 0 ? best : (i + (dx + dy > 0 ? 1 : -1) + btns.length) % btns.length;
  }
  padItems() { const t = this.game.god.tool.id, vis = (l) => l.filter((k) => this.game.economy.visible(k)); if (t === 'build') return vis((TOOL_MENUS.build.find(([n]) => n === this.buildTab) || TOOL_MENUS.build[0])[1]); if (t === 'park' || t === 'util') return vis(TOOL_MENUS[t]); if (t === 'road') return ['dirt', 'paved']; if (t === 'zone') return ['res', 'com', 'ind', 'none']; return []; }
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
    const pop = g.population.count(), next = g.economy.nextMilestone(); list = list.filter((k) => g.economy.visible(k));
    const more = next ? `<div class="sub locked teaser">🔒 More to come…<small>new buildings at ${next} residents</small></div>` : '';
    sm.innerHTML = (tabs ? `<div class="tabrow">${tabs}</div>` : '') + (list.length ? '' : '<div class="sub locked teaser">Nothing here yet<small>grow the village</small></div>') + list.map((k) => {
      const d = BUILDINGS[k], un = g.economy.isUnlocked(k), p = g.economy.permits[k], mats = Object.entries(d.mat).map(([m, n]) => n + ' ' + m).join(', ');
      const status = un ? mats : (p === 'pending' ? 'permit pending…' : pop < d.permit.pop ? `needs ${d.permit.pop} residents` : `permit £${d.permit.cost} (Postbox form)`);
      const nb = g.buildings.count(k); return `<button class="sub ${g.god.tool.sub === k ? 'on' : ''} ${un ? '' : 'locked'} ${nb ? 'built' : ''}" data-s="${k}">${nb ? `<span class="tick">✓${nb > 1 ? ' ×' + nb : ''}</span>` : ''}${d.name}<small>${status}</small></button>`;
    }).join('') + more; sm.classList.remove('hidden'); this.subOpen = id;
  }
  refreshSub() { const sm = $('submenu'); if (this.subOpen && sm && !sm.classList.contains('hidden') && this.game.mode === 'god') this.openSub(this.subOpen);
  }
  setHover(text) { const h = $('hover'); h.textContent = text; h.classList.remove('hidden'); this.hoverTimer = 0.2; }

  // ---------- messages / toasts ----------
  addMessage(m) {
    const el = document.createElement('div'); el.className = 'msg ' + (m.kind || ''); el.innerHTML = `<b>${m.from}:</b> ${this.keyText(m.text)}`; const box = $('messages'); box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 1s'; el.style.opacity = 0; setTimeout(() => el.remove(), 1000); }, 7000);
  }
  setCountdown(n, label) { const c = $('countdown'); if (n == null) { c.classList.add('hidden'); return; } c.classList.remove('hidden'); if (c.dataset.n !== String(n)) { c.dataset.n = n; c.innerHTML = `<div>${label}</div><b>${n}</b>`; c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); Sfx.play('deny'); } }
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
  /** Conversation box: one little chat that plays line by line (E / A for the next line, Esc / B to leave). */
  openDialogue(sim, res) {
    this.dialogue = { sim, lines: res.lines, idx: 0, full: res.lines[0], shown: 0 }; this.game.input.unlock();
    $('d-name').textContent = `${sim.name} — ${sim.roleName}`; $('d-text').textContent = ''; this.renderChoices(); this.show('dialogue');
    if (res.page) this.toast('Crumpled page collected! (see Notes in the post)', 3500);
  }
  renderChoices() {
    const d = this.dialogue; if (!d) return; $('d-choices').innerHTML = '';
    const last = d.idx >= d.lines.length - 1, pad = this.game.input.padActive;
    $('d-hint').textContent = `${'•'.repeat(d.idx + 1)}${'·'.repeat(Math.max(0, d.lines.length - d.idx - 1))}   ${pad ? (last ? 'A to finish' : 'A for more') : (last ? 'E to finish' : 'E for more')} · ${pad ? 'B' : 'Esc'} to leave`;
  }
  /** Next line of the chat (or finish it). */
  nextLine() {
    const d = this.dialogue; if (!d) return; if (d.shown < d.full.length) { d.shown = d.full.length; return; }
    if (d.idx >= d.lines.length - 1) { this.closeDialogue(); return; }
    d.idx++; d.full = d.lines[d.idx]; d.shown = 0; Sfx.play('ui'); this.renderChoices();
  }
  dialogueKeys(inp) {
    const d = this.dialogue; if (!d) return;
    if (inp.hit('Escape') || inp.padHit(1)) { this.closeDialogue(); return; }
    if (inp.hit('KeyE') || inp.hit('Space') || inp.hit('Enter')) this.nextLine();
  }
  advanceDialogue() { this.nextLine(); }
  closeDialogue() { if (!this.dialogue) return; this.dialogue.sim.frozen = false; this.dialogue.sim.talkingToPlayer = false; this.dialogue.sim.moodBoost += 0.1; this.dialogue = null; this.hide('dialogue'); this.calm(); }

  // ---------- terminal ----------
  openTerminal(b, mode = 'computer') { this.terminalB = b; this.termMode = mode; this.terminalTab = mode === 'post' ? 'letters' : mode === 'hatch' ? 'materials' : (this.terminalTab === 'letters' ? 'permits' : this.terminalTab); this.modalOpen = true; this.game.input.unlock(); if (mode === 'post') this.game.flags.postRead = true; else this.game.flags.terminalOpened = true; this.renderTerminal(); this.show('terminal'); $('terminal').classList.toggle('post', mode === 'post'); }
  closeTerminal() { this.terminalB = null; this.hide('terminal'); this.calm(); }
  /** After closing a window, ignore 'use' for a moment so the same press doesn't reopen it. */
  calm() { if (this.game.player) this.game.player.interactCD = 0.4; }

  // ---------- journal ----------
  openJournal() { this.journalOpen = true; this.modalOpen = true; this.game.input.unlock(); this.renderJournal(); this.show('journal'); Sfx.play('ui'); }
  closeJournal() { this.journalOpen = false; this.hide('journal'); this.calm(); }
  renderJournal() {
    const g = this.game, f = g.flags, cur = g.curios, P = g.population;
    const friends = P.sims.filter((s) => (s.samRel || 0) >= 40 && !s.remove).map((s) => s.name), acq = P.sims.filter((s) => (s.samRel || 0) >= 8 && (s.samRel || 0) < 40 && !s.remove).length;
    const items = CURIOS.map((c) => cur.found.has(c.id) ? `<div class="cu has" title="${c.desc}"><span class="ic">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small></div>` : '<div class="cu"><span class="ic">?</span><b>Not found yet</b><small>Look for a glint on the ground.</small></div>').join('');
    const best = g.workgame.best || 0;
    $('journal').innerHTML = `<h2><span>SAM'S JOURNAL</span><button data-j="close">Close</button></h2>
      <div class="jstats"><div><b>${g.clock.totalDays}</b><span>days on the island</span></div><div><b>${g.buildings.list.filter((b) => b.state === 'done' && !b.def.special).length}</b><span>buildings finished</span></div><div><b>${f.gathered || 0}</b><span>things gathered</span></div><div><b>${best}</b><span>best gold chain</span></div><div><b>${f.favours || 0}</b><span>favours done</span></div><div><b>${f.cooked || 0}</b><span>campfire meals</span></div></div>
      <div class="jsec">Skills (practice makes perfect)</div><div class="jsk">${Object.entries(SKILLS).map(([k, d]) => `<div class="sk"><span class="ic">${d.icon}</span><b>${d.name}</b><em>Lv ${g.skills.level(k)} · ${g.skills.title(k)}</em><i><u style="width:${Math.round(g.skills.frac(k) * 100)}%"></u></i></div>`).join('')}</div>
      <div class="jsec">Friends (${friends.length})${acq ? ` · ${acq} acquaintances` : ''}</div><div class="jfr">${friends.length ? friends.join(', ') : 'Nobody yet. Talk to people, do them favours.'}</div>
      <div class="jsec">Curios found: ${cur.found.size} / ${CURIOS.length}</div><div class="cus">${items}</div>
      <div class="hint">${this.game.input.padActive ? 'D-pad ← opens this' : 'J opens this'} · Esc to close</div>`;
  }

  // ---------- backpack ----------
  openInventory() { this.invOpen = true; this.modalOpen = true; this.game.input.unlock(); this.renderInventory(); this.show('inventory'); Sfx.play('ui'); }
  closeInventory() { this.invOpen = false; this.hide('inventory'); this.calm(); }
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
    const post = this.termMode === 'post', hatch = this.termMode === 'hatch';
    const tabs = hatch ? [['materials', 'Lift order form']] : post ? [['letters', `Letters${g.mail.unread() ? ' (' + g.mail.unread() + ' new)' : ''}`], ['challenges', 'Challenges'], ['jobs', 'Jobs'], ['permits', 'Permit forms'], ['materials', 'Order form'], ['report', 'Accounts']] : [['permits', 'Permits'], ['challenges', 'Challenges'], ['jobs', 'Jobs'], ['materials', 'Trade'], ['residents', 'Residents'], ['report', 'Town report']]; if (g.story.pages.length) tabs.push(['notes', 'Notes']);
    let body = '';
    if (tab === 'letters') {
      const L = g.mail.letters; body = L.length ? L.map((l, i) => `<div class="letter ${l.read ? '' : 'new'} ${l.kind}"><div class="lh"><b>${l.title}</b><span>${l.date}</span></div><div class="lf">From: ${l.from}</div><div class="lb">${l.body.replace(/\n/g, '<br>')}</div></div>`).join('') : '<div class="note">The box is empty.</div>';
      setTimeout(() => { g.mail.markRead(); }, 0);
    }
    if (tab === 'permits') {
      const list = ALL_BUILDABLE.filter((k) => e.visible(k)).sort((a, b) => (e.permits[a] === 'approved') - (e.permits[b] === 'approved') || BUILDINGS[a].permit.pop - BUILDINGS[b].permit.pop || BUILDINGS[a].permit.cost - BUILDINGS[b].permit.cost), nx = e.nextMilestone();
      body = `<div class="note">Settlement: <b>${tierOf(g.population.count())}</b> · ${g.population.count()} residents. ${nx ? `The Council will consider new kinds of building at <b>${nx} residents</b>.` : 'Every permit is open to you.'}</div><table><tr><th>Building</th><th>Needs</th><th>Fee</th><th></th></tr>` + list.map((k) => {
        const d = BUILDINGS[k], p = e.permits[k], mats = Object.entries(d.mat).map(([m, n]) => `${n} ${m}`).join(', ');
        const btn = p === 'approved' ? '<span class="st">APPROVED</span>' : p === 'pending' ? '<span class="st">PENDING…</span>' : `<button data-act="permit" data-id="${k}" ${g.population.count() < d.permit.pop || e.funds < d.permit.cost ? 'disabled' : ''}>Request</button>`;
        return `<tr><td>${d.name}<br><small>${d.blurb}</small></td><td><small>${mats}<br>${d.permit.pop ? 'needs ' + d.permit.pop + ' residents' : ''}</small></td><td>${fmtMoney(d.permit.cost)}</td><td>${btn}</td></tr>`;
      }).join('') + '</table><div class="note">Approved permits unlock the building in the planning view (TAB). Sites then need materials and builders.</div>';
    } else if (tab === 'materials') {
      body = `<div>Stockyard: ${Object.keys(MATERIALS).map((m) => `${MATERIALS[m].name} <b>${Math.floor(e.stock[m])}</b>`).join(' · ')}</div><div class="note">Gather what you can yourself or with workers. The Lift trader buys surplus at about half price and sells at a premium; a truck brings purchases to the Stockyard.</div>
        <table><tr><th>Goods</th><th>Buy price</th><th colspan="3">Buy</th><th colspan="2">Sell</th></tr>` +
        Object.entries(MATERIALS).map(([m, d]) => `<tr><td>${d.name}</td><td>${fmtMoney(e.buyPrice(m))}</td>${[5, 20].map((q) => `<td><button data-act="order" data-m="${m}" data-q="${q}" ${e.funds < e.buyPrice(m) * q ? 'disabled' : ''}>×${q} (${fmtMoney(e.buyPrice(m) * q)})</button></td>`).join('')}<td></td>${[5, 20].map((q) => `<td><button data-act="sell" data-m="${m}" data-q="${q}" ${e.stock[m] < q ? 'disabled' : ''}>×${q}</button></td>`).join('')}</tr>`).join('') +
        `</table><div class="note">Goods come down the Lift in the cage. ${g.depot ? 'A truck takes them along the roads to the Stockyard (no road: they wait on the Lift dock).' : 'No Stockyard yet, so they wait on the Lift dock for you to carry.'} ${g.buildings.count('postoffice') ? 'Post Office discount: 20% off. ' : ''}Orders on the way: ${e.orders.length + g.logistics.queue.length}</div>`;
    } else if (tab === 'jobs') {
      const P = g.population, res = P.residents(), adults = res.filter((q) => P.canWork(q)), idle = adults.filter((q) => !q.workplace), vac = P.vacancies();
      const kids = res.filter((q) => q.kind === 'child').length, retired = res.filter((q) => q.kind === 'resident' && q.age >= 66).length;
      const places = g.buildings.list.filter((b) => b.state === 'done' && b.def.jobs);
      body = `<div class="jobsum"><span>Working age <b>${adults.length}</b></span><span>In work <b>${adults.length - idle.length}</b></span><span>Out of work <b class="${idle.length ? 'bad' : ''}">${idle.length}</b></span><span>Empty jobs <b>${vac.length}</b></span><span>Children ${kids} · Retired ${retired}</span></div>`
        + (places.length ? `<table><tr><th>Workplace</th><th>Job</th><th>Filled</th><th>Who</th></tr>` + places.map((b) => Object.entries(b.def.jobs).map(([r, n]) => { const w = b.workers.filter((q) => q.role === r); return `<tr><td>${b.def.name}</td><td>${ROLES[r].name} <small>£${ROLES[r].wage}</small></td><td class="${w.length < n ? 'bad' : 'ok'}">${w.length}/${n}</td><td><small>${w.map((q) => q.first).join(', ') || '—'}</small></td></tr>`; }).join('')).join('') + '</table>' : '<div class="note">No workplaces yet. A Lumber Camp, Forager\'s Hut or Builders\' Yard gives people jobs.</div>')
        + `<div class="note">${idle.length ? `Looking for work: ${idle.map((q) => q.name).join(', ')}. ${vac.length ? 'They\'ll be taken on shortly.' : 'Build more workplaces to give them jobs.'}` : vac.length ? `${vac.length} empty job${vac.length > 1 ? 's' : ''}: newcomers arrive through the Lift to fill them when there are free beds and food.` : 'Everyone who can work has a job.'} Builders get first pick of new arrivals while there are sites to build.</div>`;
    } else if (tab === 'residents') {
      const P = g.population, vac = P.vacancies();
      body = `<div>Residents <b>${P.count()}</b> · employed ${P.employed()} · free beds ${P.freeBeds()} · open jobs ${vac.length} · food in stock ${Math.floor(e.stock.food)}</div>
        <p>Newcomers arrive through the Lift when there are free beds, open jobs and enough food. You can invite settlers for a fee.</p>
        <button data-act="invite" data-n="1" ${e.funds < 500 ? 'disabled' : ''}>Invite 1 (£500)</button> <button data-act="invite" data-n="3" ${e.funds < 1500 ? 'disabled' : ''}>Invite 3 (£1,500)</button>
        <div class="note">Queued invitations: ${P.invites}</div>`;
    } else if (tab === 'report') {
      const r = e.lastReport, P = g.population;
      body = `<table><tr><td>Funds</td><td>${fmtMoney(e.funds)}</td></tr><tr><td>Residents</td><td>${P.count()}</td></tr><tr><td>Buildings</td><td>${g.buildings.list.filter((b) => b.state === 'done').length} (+${g.buildings.list.filter((b) => b.state === 'site').length} under construction)</td></tr>
        <tr><td>Age</td><td>${g.tech.status().name}${g.tech.era < 2 ? ` · research ${g.tech.status().research}/${g.tech.status().need} for computers${g.tech.era < 1 ? ' (needs power too)' : ''}` : ''}</td></tr><tr><td>Power</td><td>${g.buildings.count('power') ? 'ONLINE' : 'none'}</td></tr><tr><td>Water</td><td>${g.buildings.count('water') ? 'ONLINE' : 'none'}</td></tr>
        <tr><td>Last month</td><td>${r ? `income ${fmtMoney(r.income)} · costs ${fmtMoney(r.cost)} · net ${fmtMoney(r.net)}` : 'no report yet'}</td></tr></table>`;
    } else if (tab === 'challenges') {
      const C = g.challenges, open = C.open(), D = C.doneIds;
      body = `<div class="note">The Parish Council pays a grant for each of these. Three at a time; a new one is added as each is done, and more turn up as the town grows.</div>` + (open.length ? open.map((c) => { const p = C.progress(c); return `<div class="chal"><span class="ic">${c.icon}</span><div><b>${c.title}</b> <small>grant ${fmtMoney(c.pay)}</small><br><small>${c.text}</small><i><u style="width:${Math.round(p.frac * 100)}%"></u></i><small>${p.have} / ${p.need}</small></div></div>`; }).join('') : '<div class="note">Nothing on the list right now. The Council will think of something when the town grows.</div>')
        + (D.length ? `<div class="note">Done (${D.length}): ${D.map((id) => { const c = CHALLENGES.find((q) => q.id === id); return c ? c.icon + ' ' + c.title : ''; }).join(' · ')}</div>` : '');
    } else if (tab === 'notes') {
      const pg = g.story.pages; body = pg.length ? pg.map((p) => `<div class="page">${p}</div>`).join('') : '<div class="note">No notes yet. Talk to residents regularly — some of them know more than they should.</div>';
    }
    T.innerHTML = `<div class="win"><h2><span>${hatch ? '☎ LIFT INTERCOM · "Dave speaking"' : post ? '✉ THE POST · SAM CITY' : (g.tech.computers ? 'SAM CITY - PLANNING TERMINAL' : '📖 SAM CITY - PLANNING LEDGER')}</span><button data-act="close">Close [Esc]</button></h2><div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-k="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}<span style="margin-left:auto">Funds: <b>${fmtMoney(e.funds)}</b></span></div>${body}</div>`;
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
    e.innerHTML = `<div class="box"><h1>OUTSIDE</h1><p class="tag">The Lift climbs for a long time. The doors open onto a car park under a real sky: real wind, real rain, no cue cards.<br>Sam City was a set. You were the star.<br><br>Thanks for playing this prototype.</p><button id="btn-keep">Keep playing in the set</button></div>`;
    $('btn-keep').onclick = () => { e.classList.add('hidden'); this.game.ending = false; this.game.flags.escaped = true; this.game.player.teleport(this.game.plaza.x, this.game.plaza.z); this.fade(0); };
  }

  // ---------- per-frame ----------
  update(dt) {
    if (this.plan.open && this.plan.tab !== 'build') { this._planT = (this._planT || 0) - dt; if (this._planT <= 0) { this._planT = 1; this.plan.render(); } }
    const g = this.game;
    if (this.hoverTimer > 0) { this.hoverTimer -= dt; if (this.hoverTimer <= 0 || g.mode !== 'god') $('hover').classList.add('hidden'); }
    if (this.dialogue) { const d = this.dialogue; d.shown = Math.min(d.full.length, d.shown + dt * 55); $('d-text').textContent = d.full.slice(0, Math.floor(d.shown)); }
    if (g.input.hit('KeyH')) { $('help').classList.toggle('hidden'); this.helpT = 0; }
    this.acc += dt; if (this.acc < 0.25) return; this.acc = 0;
    const c = g.clock, P = g.population;
    $('h-pop').textContent = P.count().toLocaleString(); $('h-funds').textContent = fmtMoney(g.economy.funds); $('h-month').textContent = MONTHS[c.month]; $('h-year').textContent = c.year; $('h-sims').textContent = `${P.sims.filter((s) => !s.hidden).length}/${P.simCap}`;
    $('c-date').textContent = `${MONTHS[c.month]} ${c.year}${this.game.seasons ? ' · ' + ({ Winter: '❄', Spring: '🌸', Summer: '☀', Autumn: '🍂' })[this.game.seasons.season] : ''}`; $('c-time').textContent = c.hhmm;
    for (const b of $('c-speed').children) b.classList.toggle('on', +b.dataset.s === c.speed);
    $('stock').innerHTML = Object.keys(MATERIALS).map((m) => `<div><span>${MATERIALS[m].name}</span> <b>${Math.floor(g.economy.stock[m])}</b></div>`).join('');
    $('h-tier').textContent = tierOf(P.count());
    $('b-hunger').style.width = Math.round(100 - g.player.hunger) + '%'; $('b-hunger').style.background = g.player.hunger > 70 ? '#ff6b6b' : '#e8b44a'; $('h-tools').textContent = [...g.player.tools].map((t) => TOOL_NAMES[t]).join(', ') || 'none yet';
    $('b-energy').style.width = Math.round(g.player.energy) + '%'; $('b-energy').style.background = g.player.energy < 25 ? '#ff6b6b' : '#7be08f';
    $('h-carry').textContent = `${g.player.invTotal()}/${BACKPACK}`; $('h-pack').textContent = g.player.invText(); $('b-pack').style.width = (g.player.invTotal() / BACKPACK * 100) + '%'; const F = g.favours.list; $('h-favours').innerHTML = F.length ? '<b>Favours</b><br>' + F.map((f) => `! ${f.sim.first}${f.asked ? `: ${f.n} ${f.mat}` : ' wants a word'}`).join('<br>') : ''; $('h-keys').textContent = g.input.padActive ? 'D-pad ↑ backpack · ↓ drop · ← journal · Y eat' : 'I backpack · R drop · J journal · Q eat';
    if (this.helpT > 0) { this.helpT -= 0.25; if (this.helpT <= 0) $('help').classList.add('hidden'); }
    if (this._padWas !== g.input.padActive) { this._padWas = g.input.padActive; this.setMode(g.mode); }
    $('crosshair').classList.toggle('hidden', g.mode === 'god' && !g.input.padActive); $('crosshair').classList.toggle('godcur', g.mode === 'god');
    if (g.mode === 'sim') $('c-mode').textContent = 'SAM (' + (g.player.third ? '3rd' : '1st') + ' person)';
    this.renderObjectives();
  }
}
