import { moneyHTML, perDayTable } from './Money.js';
import { PauseMenu } from './PauseMenu.js';
import { PlanMenu } from './PlanMenu.js';
import { purposeOf } from '../data/purpose.js';
import { CHALLENGES } from '../systems/Challenges.js';
import { SKILLS } from '../systems/Skills.js';
import { BUILDINGS, MATERIALS, ROLES, TOOL_MENUS, ALL_BUILDABLE, tierOf } from '../data/buildings.js';
import { OBJECTIVES, stepProgress } from '../data/story.js';
import { fmtMoney } from '../util.js';
import { MONTHS, DAYS } from '../core/Clock.js';
import { today as keyToday, upcoming, dateText, MONTH_NAMES } from '../data/calendar.js';
import { TOOLS as TOOL_NAMES, TOOL_ICON, MAT_ICON, BACKPACK } from '../player/Player.js';
import { Sfx } from '../core/Sfx.js';
import { PAD_NAMES } from '../core/Bindings.js';
import { CURIOS } from '../systems/Curios.js';

const $ = (id) => document.getElementById(id);
/** Line icons for the tool belt (they look the same on every system, unlike the newer emoji). */
const svg = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const TOOL_ICONS = { axe: svg('<path d="M5 21 15 8"/><path d="M12.5 5.5c3-2 6.5-.5 8 3l-5 2.5-3-2.6z"/>'), pick: svg('<path d="M12 7v14"/><path d="M3.5 9.5c4.5-4.6 12.5-4.6 17 0"/>'), shovel: svg('<path d="M12 3v9"/><path d="M9 3h6"/><path d="M7.5 12h9l-1 5.5a3.5 3.5 0 0 1-7 0z"/>'),
  basket: svg('<path d="M3.5 10h17l-2.2 9.5H5.7z"/><path d="M8 10l4-6 4 6"/><path d="M9.5 13v4M14.5 13v4"/>'), rod: svg('<path d="M3.5 20.5 18 4"/><path d="M18 4v10"/><path d="M18 14a2 2 0 1 1-2 2"/>'), hammer: svg('<path d="M5 20l8.5-8.5"/><path d="M11 6.5 14.5 3l6.5 6.5-3.5 3.5-2.2-1-2.6-2.6z"/>') };
const TOOLS = [
  ['pan', '✋', 'Pan'], ['bulldoze', '🚜', 'Bulldoze'], ['road', '🛣️', 'Roads'],
  ['build', '🏢', 'Buildings'], ['park', '🌳', 'Parks'], ['util', '⚡', 'Utilities'], ['query', '🔍', 'Query'], ['move', '🌱', 'Move'], ['track', '🛤️', 'Track'],
];

/** All DOM. In Unity: UI Toolkit / uGUI screens driven by the same game-state getters. */
export class UI {
  constructor(game) {
    this.game = game; this.adult = true; this.terminalTab = 'permits'; this.buildTab = 'Homes'; this.terminalB = null; this.dialogue = null; this.acc = 0; this.hoverTimer = 0;

    // toolbox
    this.drawToolbox = () => { const tr = this.trackReady(); if (tr === this._trackShown) return; this._trackShown = tr; $('toolbox').innerHTML = this.tools().map(([id, ic, name]) => `<button class="tool" data-t="${id}"><span class="ic">${ic}</span>${name}</button>`).join('') + '<button class="tool wide" data-menu="1"><span class="ic">📐</span>Planning menu <b class="key kbonly">B</b><b class="ps padonly">□</b></button>'; this.refreshTools(); }; this.drawToolbox();
    this.plan = new PlanMenu(game); this.pause = new PauseMenu(game);
    $('h-warn').addEventListener('click', () => { if (!game.netVisitor) this.plan.show('town'); });   // the warning badge: the town page
    for (const e of ['building:added', 'building:removed', 'building:done']) game.world.events.on(e, () => { this.buildDirty = true; });   // build menus that are open keep up (sites placed, finished, permits through)
    $('toolbox').addEventListener('click', (e) => { const b = e.target.closest('.tool'); if (!b) return; if (b.dataset.menu) { this.plan.show(); return; } const id = b.dataset.t; game.god.setTool(id, id === 'zone' ? 'res' : id === 'road' ? 'dirt' : null); this.openSub(id); });
    $('submenu').addEventListener('click', (e) => { const tb = e.target.closest('.subtab'); if (tb) { this.buildTab = tb.dataset.tab; this.openSub('build'); return; } const b = e.target.closest('.sub'); if (!b) return; game.god.setTool(game.god.tool.id, b.dataset.s); this.openSub(game.god.tool.id); });
    $('c-speed').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'btn-perf') { this.togglePerf(); return; } game.clock.speed = +b.dataset.s; }); $('perf').addEventListener('click', (e) => this.perfClick(e));
    $('query').addEventListener('click', (e) => this.queryClick(e)); $('terminal').addEventListener('click', (e) => this.terminalClick(e)); $('terminal').addEventListener('input', (e) => { if (e.target.classList.contains('tqty')) this.qtyInput(e.target); }); $('terminal').addEventListener('keydown', (e) => { if (e.target.classList.contains('tqty') && (e.key === 'Enter' || e.key === 'Escape')) e.target.blur(); }); $('dialogue').addEventListener('click', () => this.nextLine()); $('inventory').addEventListener('click', (e) => this.invClick(e)); $('journal').addEventListener('click', (e) => { if (e.target.closest('[data-j="close"]')) this.closeJournal(); const im = e.target.closest('.album img'); if (im) { const v = document.createElement('div'); v.id = 'photoview'; v.innerHTML = `<img src="${im.src}" alt="">`; v.onclick = () => v.remove(); $('app').appendChild(v); } });   // (a photo full size)
    game.messages.on('msg', (m) => { const c = game.clock; m.when = `${c.day} ${MONTHS[c.month]} · ${String(Math.floor(c.hour)).padStart(2, '0')}:${String(Math.floor((c.hour % 1) * 60)).padStart(2, '0')}`; this.addMessage(m); });   // (stamped for the town news page)
    game.economy.on('permits', () => { if (this.terminalB) this.renderTerminal(); });
    $('btn-howto').onclick = () => { this.hide('howto'); this.modalOpen = false; this.game.clock.speed = 1; };
    this.refreshTools(); this.renderObjectives();
  }
  /** A window is open (talking, the post, the backpack, the journal, the how-to card): worked out fresh each time so it can't get stuck. */
  get modalOpen() { return !!((this.pause && this.pause.open) || this.perfOpen || this.noticeOpen || (this.game.cutscene && this.game.cutscene.live) || (this.game.minimap && this.game.minimap.big) || (this.plan && this.plan.open) || this.dialogue || this.terminalB || this.invOpen || this.journalOpen || !$('howto').classList.contains('hidden') || !$('ending').classList.contains('hidden')); }
  set modalOpen(v) { /* derived; kept so old callers stay harmless */ }
  get mouseOverCanvas() { return this.game.input.overCanvas !== false; }
  /** Something broke: say so on screen (once in a while) instead of silently freezing. */
  reportError(e) {
    const now = performance.now(), msg = String((e && e.message) || e); if (this._errT && now - this._errT < 8000 && msg === this._errMsg) return; this._errT = now; this._errMsg = msg;
    const where = ((e && e.stack) || '').split('\n').slice(1, 2).join('').replace(/^\s*at\s*/, '').replace(/https?:\/\/[^/]+\//, '').slice(0, 90);
    this.game.perf && this.game.perf.note(`error: ${msg.slice(0, 120)} (${where})`);
    this.showError(`Oops, a bug: ${msg.slice(0, 120)} (${where}). The game keeps going; press F8 and copy the report to Claude if it repeats.`);
  }
  /** A problem the player must see: a red banner above every menu (sticky ones offer a reload; the town is saved first). */
  showError(text, sticky = false) {
    let b = $('errbar'); if (!b) { b = document.createElement('div'); b.id = 'errbar'; document.body.appendChild(b); }
    b.innerHTML = `<b>⚠</b><span>${text}</span>${sticky ? '<button data-e="reload">Reload</button>' : ''}<button data-e="x">✕</button>`; b.className = 'on';
    b.onclick = (e) => { const a = e.target.dataset.e; if (a === 'reload') { try { this.game.save(); } catch (er) { /* saved already */ } location.reload(); } else if (a === 'x') b.className = ''; };
    clearTimeout(this._errHide); if (!sticky) this._errHide = setTimeout(() => { b.className = ''; }, 12000);
  }
  show(...ids) { for (const i of ids) $(i).classList.remove('hidden'); }
  hide(...ids) { for (const i of ids) $(i).classList.add('hidden'); }

  // ---------- modes ----------
  setMode(mode) {
    const god = mode === 'god';
    ['toolbox'].forEach((i) => $(i).classList.toggle('hidden', !god)); if (!god) this.hide('submenu', 'hover');
    $('crosshair').classList.toggle('hidden', god); $('simhud').classList.toggle('hidden', god); $('stock').classList.remove('hidden');
    this.helpMode = mode; this.helpT = 0; $('help').textContent = this.game.input.padActive ? (god ? 'PLANNING · OPTIONS: be Sam · □ Planning menu · L-stick pan · R-stick rotate/zoom · ✕ place/paint · ○ cancel · △ rotate · L1/R1 tool · D-pad item · R3 whole island' : 'SAM · OPTIONS planning view · L-stick move · R-stick look · ✕ use / tap in the green · △ eat · ○ emote · □ punch · R2 kick · L3 bike · L1 sprint · R1 camera · L2 jump · D-pad ↑ backpack ↓ drop ← journal → door · R3 map') : god ? 'GOD MODE · TAB: control Sam · B planning menu · WASD pan · Q/E rotate · wheel zoom · right-drag pan · R rotate ghost · F frame island · Esc cancel tool' : 'SAM · TAB planning view · WASD move · Shift sprint · E use / tap in the green to work · I backpack · R drop · Q eat · F punch · X kick · B bike · V camera · M map · click to capture mouse';
    $('c-mode').textContent = god ? 'PLANNING VIEW' : 'SAM (' + (this.game.player.third ? '3rd' : '1st') + ' person)';
    if (god) this.game.input.unlock();
  }
  start() { document.body.classList.remove('ontitle'); this.hide('title'); this.show('hud-info', 'objectives', 'clockbox', 'stock'); this.setMode(this.game.mode); }

  // ---------- controller ----------
  /** Swap keyboard hints for controller buttons while a pad is in use. */
  keyText(t) {
    if (!t) return t; const I = this.game.input, B = I.binds;
    if (!I.padActive) { const L = B && B.labels; if (!L || !Object.keys(L).length) return t; return t.replace(/\b([B-HJ-Z])\b/g, (m, k) => L[k] || m).replace(/(Press |\()([AI])\b/g, (m, p, k) => (L[k] ? p + L[k] : m)); }   // your keys, if you changed them ('A' and 'I' only where they're clearly keys)
    const pn = (slot) => PAD_NAMES[B ? B.pad[slot] : slot];   // your buttons, if you changed them
    return t.replace(/\bE\b/g, pn(0)).replace(/\bF\b/g, pn(2)).replace(/\bQ\b/g, pn(3)).replace(/\bTAB\b/g, pn(9)).replace(/\bV\b/g, pn(5)).replace(/\bG\b/g, pn(1)).replace(/\bR\b/g, pn(13)).replace(/\bC\b/g, pn(15));
  }
  padScope() { if (this.pause && this.pause.open) return $('pausemenu'); if (this.perfOpen) return $('perf'); if (!this.game.started) return $('title'); if (this.plan && this.plan.open) return $('planmenu'); if (!$('howto').classList.contains('hidden')) return $('howto'); if (this.terminalB) return $('terminal'); if (this.invOpen) return $('inventory'); if (this.journalOpen) return $('journal'); return null; }
  padUpdate(inp, dt) {
    const P = inp.pad, g = this.game; if (!inp.padActive || !P.connected) { this.clearPadFocus(); return; }
    // menu focus (title screen, terminal)
    const scope = this.padScope();
    if (scope) {
      this.padLegend(scope);
      if (P.hitB[1] && this.padBack(scope)) return;   // ○ always backs out of a menu
      const btns = [...scope.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null); if (!btns.length) return;
      // keep the highlight on the same button when the menu redraws (buying, selling, tab changes...), and start a newly
      // opened menu on its first real item rather than the header
      const keyOf = (b) => JSON.stringify(b.dataset) + (Object.keys(b.dataset).length ? '' : b.textContent), firstItem = () => Math.max(0, btns.findIndex((b) => !b.closest('h2, .tabs, .phead, .ptabs, .pcats')));
      if (scope !== this._pfScope) { this._pfScope = scope; this._pfEl = null; if (scope.id !== 'planmenu') this._pfIdx = firstItem(); }
      else if (this._pfEl && !this._pfEl.isConnected) { const j = btns.findIndex((b) => keyOf(b) === this._pfKey); this._pfIdx = j >= 0 ? j : this._pfJump ? firstItem() : this._pfIdx; }
      this._pfJump = false;
      this._pfIdx = Math.min(this._pfIdx || 0, btns.length - 1);
      if (scope.id === 'terminal') {
        if (P.hitB[4] || P.hitB[5]) { const tabs = [...scope.querySelectorAll('.tabs button[data-act="tab"]')], on = tabs.findIndex((b) => b.classList.contains('on')); if (tabs.length > 1) { tabs[(on + (P.hitB[5] ? 1 : -1) + tabs.length) % tabs.length].click(); this._pfJump = true; this._pfEl = btns[this._pfIdx]; this._pfKey = '-'; Sfx.play('ui'); } return; }
        const win = scope.querySelector('.win'); if (win && Math.abs(P.ry) > 0.2) win.scrollTop += P.ry * 700 * dt;   // right stick reads the long letters
      }
      { const box = scope.querySelector('.pwin, .box'); if (box && scope.id !== 'terminal' && Math.abs(P.ry) > 0.2) { box.scrollTop += P.ry * 700 * dt; } }   // and scrolls any long menu
      if (scope.id === 'planmenu') { if (P.hitB[4] || P.hitB[5]) { this.plan.cycleTab(P.hitB[5] ? 1 : -1); return; } if (P.hitB[6] || P.hitB[7]) { this.plan.cycleCat(P.hitB[7] ? 1 : -1); return; } }
      // D-pad / stick move the highlight to the nearest button in that direction (works for grids as well as lists)
      this._navT = (this._navT || 0) - dt; let dir = null; const stick = Math.hypot(P.lx, P.ly) > 0.6 ? (Math.abs(P.lx) > Math.abs(P.ly) ? [Math.sign(P.lx), 0] : [0, Math.sign(P.ly)]) : null;
      if (P.hitB[12]) dir = [0, -1]; else if (P.hitB[13]) dir = [0, 1]; else if (P.hitB[14]) dir = [-1, 0]; else if (P.hitB[15]) dir = [1, 0]; else if (stick && this._navT <= 0) { dir = stick; this._navT = 0.22; } if (!stick) this._navT = 0;
      if (dir) this._pfIdx = this.navFrom(btns, this._pfIdx, dir);
      for (const b of scope.querySelectorAll('button.padfocus')) if (b !== btns[this._pfIdx]) b.classList.remove('padfocus'); btns[this._pfIdx].classList.add('padfocus'); if (this._pfEl !== btns[this._pfIdx]) btns[this._pfIdx].scrollIntoView({ block: 'nearest' }); this._pfEl = btns[this._pfIdx]; this._pfKey = keyOf(this._pfEl);
      if (P.hitB[0]) { btns[this._pfIdx].click(); inp.pressed.delete('KeyE'); this.calm(); } return;
    }
    this.clearPadFocus(); this.padLegend(this.dialogue ? { id: 'dialogue' } : null);
    if (g.mode !== 'god' || this.modalOpen || !g.started) return;
    const ids = this.tools().map((t) => t[0]), cur = ids.indexOf(g.god.tool.id);
    if (P.hitB[5] || P.hitB[4]) { const n = ids[(cur + (P.hitB[5] ? 1 : -1) + ids.length) % ids.length]; g.god.setTool(n, n === 'zone' ? 'res' : n === 'road' ? 'dirt' : null); this.openSub(n); this.toast(TOOLS.find((t) => t[0] === n)[2] + ' tool', 1200); }
    const list = this.padItems(); if (list.length && (P.hitB[12] || P.hitB[13])) { const i = list.indexOf(g.god.tool.sub), n = list[(i + (P.hitB[13] ? 1 : -1) + list.length + (i < 0 ? 1 : 0)) % list.length]; g.god.setTool(g.god.tool.id, n); this.openSub(g.god.tool.id); }
    if (g.god.tool.id === 'build' && (P.hitB[14] || P.hitB[15])) { const tabs = TOOL_MENUS.build.map(([n]) => n), i = tabs.indexOf(this.buildTab); this.buildTab = tabs[(i + (P.hitB[15] ? 1 : -1) + tabs.length) % tabs.length]; g.god.setTool('build', null); this.openSub('build'); }
  }
  /** Wanted stars and Sam's health, top centre (only when it matters). */
  setWanted(n, hp) {
    let w = this._wantedEl; if (!w) { w = this._wantedEl = document.createElement('div'); w.id = 'wanted'; document.body.appendChild(w); }
    const h = Math.round(hp ?? 100), txt = (n > 0 ? `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>` : '') + (h < 99 ? `<span class="hp">❤ ${h}</span>` : '');
    if (txt !== this._wTxt) { this._wTxt = txt; w.innerHTML = txt; w.style.display = txt ? 'flex' : 'none'; }
  }
  /** PlayStation-style button legend along the bottom while a menu has the controller. */
  /**
   * The prompt bar along the bottom of a menu (or a conversation): what the buttons do, as key caps or controller
   * glyphs, instead of instructions written into the menus.
   */
  padLegend(scope, pad = true) {
    const id = scope ? scope.id : null, key = id && id + (pad ? ':pad' : ':kb') + (id === 'title' && $('menu-main').offsetParent ? ':main' : ''); if (key === this._legend) return; this._legend = key;
    const padbar = $('padbar'), kb = $('menuprompts'); padbar.classList.add('hidden'); kb.classList.add('hidden'); if (!id || (id === 'title' && !pad)) return;
    const P = (c, t) => `<b class="ps ${c}">${t}</b>`, K = (t) => `<b class="key">${t}</b>`, items = [];
    if (pad) {
      if (id !== 'dialogue') items.push(`<span>${P('', '✚')} Move</span>`, `<span>${P('ps-x', '✕')} Select</span>`); else items.push(`<span>${P('ps-x', '✕')} Continue</span>`);
      if (id !== 'title' || !$('menu-main').offsetParent) items.push(`<span>${P('ps-o', '○')} ${id === 'pausemenu' ? 'Resume' : id === 'planmenu' || id === 'dialogue' ? 'Close' : 'Back'}</span>`);
      if (id === 'planmenu') items.push(`<span>${P('', 'L1')}${P('', 'R1')} Page</span>`, `<span>${P('', 'L2')}${P('', 'R2')} Category</span>`);
      if (id === 'terminal') items.push(`<span>${P('', 'L1')}${P('', 'R1')} Tab</span>`, `<span>${P('', 'R')} Scroll</span>`);
    } else {
      if (id === 'dialogue') items.push(`<span>${K('E')} Continue</span>`);
      items.push(`<span>${K('Esc')} ${id === 'pausemenu' ? 'Resume' : 'Close'}</span>`);
      if (id === 'inventory') items.push(`<span>${K('R')} Drop</span>`);
    }
    const bar = pad ? padbar : kb; bar.innerHTML = items.join(''); bar.classList.remove('hidden');
  }
  /** ○ on a menu: close it (the title screen has nowhere to go back to). */
  padBack(scope) {
    const id = scope.id; if (id === 'title') { const back = ['btn-options-back', 'btn-slots-back', 'btn-net-back'].map((q) => $(q)).find((b) => b && b.offsetParent !== null); if (!back) return false; back.click(); return true; }   // the title: ○ goes back from a sub-menu to the main menu
    if (id === 'pausemenu') { if (this.pause.page !== 'main') { this.pause.page = 'main'; this.pause.render(); } else this.pause.hide(); this.game.input.pressed.delete('Escape'); return true; }
    if (id === 'planmenu') this.plan.close(); else if (id === 'terminal') this.closeTerminal(); else if (id === 'inventory') this.closeInventory(); else if (id === 'journal') this.closeJournal(); else if (id === 'perf') this.closePerf(); else if (id === 'howto') $('btn-howto').click(); else return false;
    this.game.input.pressed.delete('Escape'); this.game.input.pressed.delete('KeyG'); this.calm && this.calm(); return true;
  }
  /** Nearest button in a direction from the current one; falls back to next/previous in the list. */
  navFrom(btns, i, [dx, dy]) {
    const r0 = btns[i].getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2; let best = -1, bs = Infinity;
    btns.forEach((b, j) => { if (j === i) return; const r = b.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy, along = x * dx + y * dy; if (along <= 6) return; const perp = Math.abs(x * dy - y * dx), sc = along + perp * 2.2; if (sc < bs) { bs = sc; best = j; } });
    return best >= 0 ? best : (i + (dx + dy > 0 ? 1 : -1) + btns.length) % btns.length;
  }
  padItems() { const t = this.game.god.tool.id, vis = (l) => l.filter((k) => this.game.economy.visible(k)); if (t === 'build') return vis((TOOL_MENUS.build.find(([n]) => n === this.buildTab) || TOOL_MENUS.build[0])[1]); if (t === 'park' || t === 'util') return vis(TOOL_MENUS[t]); if (t === 'road') return ['dirt', 'paved', 'plaza', 'lamps']; if (t === 'track') return ['rail', 'mono', 'sky']; if (t === 'zone') return ['res', 'com', 'ind', 'none']; return []; }
  clearPadFocus() { if (this._pfOn) { document.querySelectorAll('.padfocus').forEach((b) => b.classList.remove('padfocus')); this._pfOn = false; } if (this.padScope()) this._pfOn = true; }

  // ---------- toolbox ----------
  /** The Track tool only appears once there's a station you could build. */
  trackReady() { const e = this.game.economy; if (!e || !this.game.buildings) return false; return ['railstation', 'monostation', 'skylift'].some((k) => e.visible(k) || this.game.buildings.count(k, false)); }
  tools() { const tr = this.trackReady(); return TOOLS.filter(([id]) => id !== 'track' || tr); }
  refreshTools() {
    const g = this.game, t = g.god.tool.id; for (const b of $('toolbox').querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.t === t);
  }
  openSub(id) {
    const g = this.game, sm = $('submenu');
    if (id === 'zone') { sm.innerHTML = [['res', 'Residential'], ['com', 'Commercial'], ['ind', 'Industrial'], ['none', 'Clear zone']].map(([k, n]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''}" data-s="${k}">${n}<small>drag to paint</small></button>`).join(''); sm.classList.remove('hidden'); return; }
    if (id === 'road') { const pop = g.population.count(); sm.innerHTML = [['dirt', 'Dirt path', '£2 a tile, dug by hand'], ['paved', 'Paved road', pop >= 15 ? '£20 + 1 stone a tile' : 'needs 15 residents'], ['plaza', 'Plaza', pop >= 10 ? '£12 + 1 stone a tile: for people, no cars' : 'needs 10 residents'], ['lamps', 'Street lamps', g.lamps ? g.lamps.info() : '']].map(([k, n, t]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''} ${(k === 'paved' && pop < 15) || (k === 'plaza' && pop < 10) ? 'locked' : ''}" data-s="${k}">${n}<small>${t}</small></button>`).join(''); sm.classList.remove('hidden'); return; }
    if (id === 'track') { if (!g.god.tool.sub) g.god.tool.sub = 'rail'; sm.innerHTML = [['rail', 'Railway track', '£40 a piece'], ['mono', 'Monorail beam', '£60 a piece'], ['sky', 'Sky lift cable', '£30 a piece']].map(([k, n, t]) => `<button class="sub ${g.god.tool.sub === k ? 'on' : ''}" data-s="${k}">${n}<small>${t}</small></button>`).join('') + '<div class="sub locked teaser">Click a station, then lay pieces<small>T/G tilt · Backspace undo · Esc stop</small></div>'; sm.classList.remove('hidden'); return; }
    let list = TOOL_MENUS[id], tabs = '';
    if (id === 'build') { tabs = TOOL_MENUS.build.map(([n]) => `<button class="subtab ${n === this.buildTab ? 'on' : ''}" data-tab="${n}">${n}</button>`).join(''); list = (TOOL_MENUS.build.find(([n]) => n === this.buildTab) || TOOL_MENUS.build[0])[1]; }
    if (!list) { sm.classList.add('hidden'); return; }
    const pop = g.population.count(), next = g.economy.nextMilestone(); list = list.filter((k) => g.economy.visible(k));
    const more = next ? `<div class="sub locked teaser">🔒 More to come…<small>new buildings at ${next} residents</small></div>` : '';
    sm.innerHTML = (tabs ? `<div class="tabrow">${tabs}</div>` : '') + (list.length ? '' : '<div class="sub locked teaser">Nothing here yet<small>grow the village</small></div>') + list.map((k) => {
      const d = BUILDINGS[k], un = g.economy.isUnlocked(k), p = g.economy.permits[k], mats = Object.entries(d.mat).map(([m, n]) => n + ' ' + m).join(', ');
      const status = un ? mats : (p === 'pending' ? 'permit pending…' : pop < d.permit.pop ? `needs ${d.permit.pop} residents` : `permit £${d.permit.cost} (Postbox form)`);
      const nb = g.buildings.count(k), ns = g.buildings.count(k, false) - nb, badge = (nb ? `<span class="tick">✓${nb > 1 ? ' ×' + nb : ''}</span>` : '') + (ns ? `<span class="tick site" title="${ns} placed, not built yet">🏗️${ns > 1 ? ' ×' + ns : ''}</span>` : '');   // placed but not built yet: a site badge, no tick
      return `<button class="sub ${g.god.tool.sub === k ? 'on' : ''} ${un ? '' : 'locked'} ${nb || ns ? 'built' : ''} ${nb && ns ? 'both' : ''}" data-s="${k}">${badge}${d.name}<small>${status}${ns ? ` · <b class="placed">${ns > 1 ? ns + ' placed' : 'placed'}, being built</b>` : ''}</small></button>`;
    }).join('') + more; sm.classList.remove('hidden'); this.subOpen = id;
  }
  refreshSub() { if (this.drawToolbox) this.drawToolbox(); const sm = $('submenu'); if (this.subOpen && sm && !sm.classList.contains('hidden') && this.game.mode === 'god') this.openSub(this.subOpen);
  }
  setHover(text) { const h = $('hover'); h.textContent = text; h.classList.remove('hidden'); this.hoverTimer = 0.2; }

  // ---------- messages / toasts ----------
  /**
   * Only what matters pops up: alarms, the story, milestones, and problems that need Sam (fires, floods, the food running
   * out, the bank, the guards, anything that's about him). Everything else (arrivals, gossip, the cricket, street fights,
   * the ice-cream van) goes quietly into the town news, and incidents have their own icon on the map.
   */
  loud(m) {
    if (m.kind === 'quiet') return false; if (m.kind === 'alarm' || m.kind === 'story') return true;
    const F = m.from;
    if (['The Council', 'Progress', 'Objective complete', 'Parish Council', 'Demo', 'Multiplayer', 'Raid night', 'Mods'].includes(F)) return true;
    if (['Fire!', 'Stockyard', 'The Water Board', 'The Harbour Master', 'The Electricity Board', 'Lift Guard', 'Hospital', 'Midshires Bank', 'Treasury', 'Weather', 'Logistics', 'Fire brigade'].includes(F)) return m.kind === 'warn' || (F === 'Treasury') || (F === 'Midshires Bank' && m.kind === 'good');
    if (F === 'Planning Office') return m.kind === 'good' || m.kind === 'warn';
    if (F === 'Police' || F === 'Police report') return /\bSam\b/.test(m.text) || m.text.startsWith('999');
    return false;
  }
  addMessage(m) {
    if (!this.loud(m)) return;
    const box = $('messages'); if ([...box.children].some((e) => e.dataset.txt === m.from + m.text)) return;   // not the same thing twice
    const el = document.createElement('div'); el.className = 'msg ' + (m.kind || ''); el.dataset.txt = m.from + m.text;
    el.innerHTML = `<div class="msg-from">${m.from}</div><div class="msg-text">${this.keyText(m.text)}</div>`; box.appendChild(el);
    while (box.children.length > 2) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, m.kind === 'alarm' ? 8000 : 5500);
  }
  setCountdown(n, label) { const c = $('countdown'); if (n == null) { c.classList.add('hidden'); return; } c.classList.remove('hidden'); if (c.dataset.n !== String(n)) { c.dataset.n = n; c.innerHTML = `<div>${label}</div><b>${n}</b>`; c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); Sfx.play('deny'); } }
  setAlert(text) { const a = $('alertbar'); if (!a) return; if (text) { a.textContent = text; a.classList.remove('hidden'); } else a.classList.add('hidden'); }
  /**
   * Something worth reading properly: a card in the middle of the screen with the game paused, until a button is pressed
   * (E, Enter, Space, Esc, ✕ or ○). A copy goes in the Postbox, so a missed one can be read again.
   */
  notice(title, body, { icon = '📜', from = 'Sam\'s notes', post = true } = {}) {
    (this.notices ||= []).push({ title, body, icon }); if (post && this.game.mail) this.game.mail.send(from, title, body, { kind: 'note' });
    if (!this.noticeOpen) this.nextNotice();
  }
  nextNotice() {
    const g = this.game, n = (this.notices || []).shift(); let el = $('notice');
    if (!n) { this.noticeOpen = false; if (el) el.classList.add('hidden'); if (this._noticeSpeed !== undefined) { g.clock.speed = this._noticeSpeed; this._noticeSpeed = undefined; } return; }
    if (!el) { el = document.createElement('div'); el.id = 'notice'; el.className = 'hidden'; $('app').appendChild(el); el.addEventListener('click', (e) => { if (e.target.closest('button')) this.nextNotice(); }); }
    this.noticeOpen = true; this._noticeT = 0.35; if (this._noticeSpeed === undefined) { this._noticeSpeed = g.clock.speed; g.clock.speed = 0; } g.input.unlock();
    const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    el.innerHTML = `<div class="box"><div class="nicon">${n.icon}</div><h2>${esc(n.title)}</h2><p>${esc(n.body).replace(/\n/g, '<br>')}</p><button class="nok">${g.input.padActive ? '✕ OK' : 'OK (E)'}</button><small>A copy is in the Postbox.</small></div>`;
    el.classList.remove('hidden');
  }
  /** Close the notice on a key or button (after a moment, so the key that caused it doesn't close it straight away). */
  noticeKeys(dt) {
    if (!this.noticeOpen) return; if ((this._noticeT -= dt) > 0) return; const inp = this.game.input, P = inp.pad;
    if (inp.hit('KeyE') || inp.hit('Enter') || inp.hit('Space') || inp.hit('Escape') || (inp.padActive && P && (P.hitB[0] || P.hitB[1]))) { for (const k of ['KeyE', 'Enter', 'Space', 'Escape']) inp.pressed.delete(k); this.nextNotice(); }
  }
  toast(text, ms = 2600) { ms = Math.min(9000, Math.max(ms, 1400 + String(text).length * 45)); const t = $('toast'); t.textContent = this.keyText(text);   // (long enough to read)
    t.classList.remove('hidden'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.add('hidden'), ms); }
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
    const prog = stepProgress(g, step), sig0 = cur + ':' + k + g.input.padActive, sig = sig0 + prog; if (sig === this._objSig) return; this._objSig = sig;
    $('obj-title').textContent = o.title.replace(/^\d+\. /, ''); $('obj-text').textContent = this.keyText(step.text); { let p = $('obj-prog'); if (!p) { p = document.createElement('div'); p.id = 'obj-prog'; $('obj-text').after(p); } p.textContent = prog; p.style.display = prog ? '' : 'none'; }
    el.innerHTML = `<div class="stepdots">${o.steps.map((s, n) => `<span class="${n < k ? 'd' : n === k ? 'c' : ''}"></span>`).join('')}<em>Step ${k + 1} of ${o.steps.length} · Goal ${cur + 1} of ${OBJECTIVES.length}</em></div>`;
    if (this._lastStep && this._lastStep !== sig0) { const b = $('objectives'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); Sfx.play('ui'); }
    this._lastStep = sig0;
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
    $('d-hint').textContent = `${'•'.repeat(d.idx + 1)}${'·'.repeat(Math.max(0, d.lines.length - d.idx - 1))}   ${pad ? (last ? '✕ to finish' : '✕ for more') : (last ? 'E to finish' : 'E for more')} · ${pad ? '○' : 'Esc'} to leave`;
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
  openTerminal(b, mode = 'computer') { this._pfScope = null; this.terminalB = b; this.termMode = mode; this.terminalTab = mode === 'post' ? 'letters' : mode === 'hatch' ? 'materials' : mode === 'stock' ? 'stock' : mode === 'shop' ? 'shop' : mode === 'register' ? 'register' : (this.terminalTab === 'letters' ? 'permits' : this.terminalTab); this.modalOpen = true; this.game.input.unlock(); if (mode === 'post') this.game.flags.postRead = true; else if (mode !== 'stock' && mode !== 'shop' && mode !== 'register') this.game.flags.terminalOpened = true; this.renderTerminal(); this.show('terminal'); $('terminal').classList.toggle('post', mode === 'post' || mode === 'register'); }
  openShop(b, who, goods) { this.counter = { b, who, goods }; this.openTerminal(b, 'shop'); }
  closeTerminal() { this.terminalB = null; this._termTab = null; this.hide('terminal'); this.calm(); }
  /** A little "Saved" in the corner when the town has saved itself. */
  saved() { let el = this._savedEl; if (!el) { el = this._savedEl = document.createElement('div'); el.id = 'savedchip'; el.textContent = '💾 Saved'; document.body.appendChild(el); } el.classList.add('on'); clearTimeout(this._svT); this._svT = setTimeout(() => el.classList.remove('on'), 1600); }
  /** After closing a window, ignore 'use' for a moment so the same press doesn't reopen it. */
  calm() { if (this.game.player) this.game.player.interactCD = 0.4; }

  // ---------- performance report ----------
  togglePerf() { if (this.perfOpen) return this.closePerf(); this.perfOpen = true; this.game.input.unlock(); const txt = this.game.perf.report();
    $('perf').innerHTML = `<div class="pwin"><h2><span>📊 Performance report</span><button data-p="close" class="xbtn" title="Close">✕</button></h2><p>Press <b>Copy</b>, then paste the whole thing into your chat with Claude. It says how smoothly the game runs on your computer and what's taking the time. Nothing is sent anywhere by itself.</p><textarea readonly spellcheck="false"></textarea><div class="prow"><button data-p="copy">📋 Copy</button><button data-p="refresh">🔄 Refresh</button><span class="ok"></span></div></div>`;
    $('perf').querySelector('textarea').value = txt; this.show('perf'); Sfx.play('ui'); }
  closePerf() { this.perfOpen = false; this.hide('perf'); this.calm(); }
  perfClick(e) {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.p, ta = $('perf').querySelector('textarea'), ok = $('perf').querySelector('.ok');
    if (a === 'close') return this.closePerf();
    if (a === 'refresh') { ta.value = this.game.perf.report(); ok.textContent = 'Updated.'; }
    if (a === 'copy') { const done = () => { ok.textContent = '✓ Copied! Now paste it to Claude.'; }; ta.select(); try { navigator.clipboard.writeText(ta.value).then(done, () => { document.execCommand('copy'); done(); }); } catch (err) { document.execCommand('copy'); done(); } }
  }

  // ---------- journal ----------
  openJournal() { this.journalOpen = true; this.modalOpen = true; this.game.input.unlock(); this.renderJournal(); this.show('journal'); Sfx.play('ui'); }
  closeJournal() { this.journalOpen = false; this.hide('journal'); this.calm(); }
  renderJournal() {
    const g = this.game, f = g.flags, cur = g.curios, P = g.population;
    const friends = P.sims.filter((s) => (s.samRel || 0) >= 40 && !s.remove).map((s) => s.name), acq = P.sims.filter((s) => (s.samRel || 0) >= 8 && (s.samRel || 0) < 40 && !s.remove).length;
    const items = CURIOS.map((c) => cur.found.has(c.id) ? `<div class="cu has" title="${c.desc}"><span class="ic">${c.icon}</span><b>${c.name}</b><small>${c.desc}</small></div>` : '<div class="cu"><span class="ic">?</span><b>Not found yet</b><small>Look for a glint on the ground.</small></div>').join('');
    const best = g.workgame.best || 0;
    $('journal').innerHTML = `<h2><span>SAM'S JOURNAL</span><button data-j="close" class="xbtn" title="Close">✕</button></h2>
      <div class="jstats"><div><b>${g.clock.totalDays}</b><span>days on the island</span></div><div><b>${g.buildings.list.filter((b) => b.state === 'done' && !b.def.special).length}</b><span>buildings finished</span></div><div><b>${f.gathered || 0}</b><span>things gathered</span></div><div><b>${best}</b><span>best gold chain</span></div><div><b>${f.favours || 0}</b><span>favours done</span></div><div><b>${f.cooked || 0}</b><span>campfire meals</span></div></div>
      <div class="jsec">Calendar: ${dateText(g.clock, true)}</div><div class="jcal">${(() => { const t = keyToday(g.clock); return (t ? `<div class="kd today"><span>${t.icon}</span><b>Today: ${t.name}</b></div>` : '') + upcoming(g.clock, 7).filter((k) => k.inDays > 0).map((k) => `<div class="kd${k.sam ? ' sam' : ''}"><span>${k.icon}</span><b>${k.name}</b><em>${DAYS[(new Date(Date.UTC(k.year, k.m, k.d)).getUTCDay() + 6) % 7]} ${k.d} ${MONTHS[k.m]}${k.year !== g.clock.year ? ' ' + k.year : ''} · ${k.inDays === 1 ? 'tomorrow' : `in ${k.inDays} days`}</em></div>`).join(''); })()}</div>
      <div class="jsec">Skills (practice makes perfect)</div><div class="jsk">${Object.entries(SKILLS).map(([k, d]) => `<div class="sk"><span class="ic">${d.icon}</span><b>${d.name}</b><em>Lv ${g.skills.level(k)} · ${g.skills.title(k)}</em><i><u style="width:${Math.round(g.skills.frac(k) * 100)}%"></u></i></div>`).join('')}</div>
      <div class="jsec">Friends (${friends.length})${acq ? ` · ${acq} acquaintances` : ''}</div><div class="jfr">${friends.length ? friends.join(', ') : 'Nobody yet. Talk to people, do them favours.'}</div>
      ${(() => { const A = f.asks || {}, rows = Object.entries(A).filter(([, L]) => L.length).sort((a, b) => b[1].length - a[1].length); return `<div class="jsec">What people have asked for (${rows.length})</div><div class="jfr">${rows.length ? rows.map(([id, L]) => `<b>${(BUILDINGS[id] || { name: id }).name}</b> ×${L.length} <small>(${L.map((i) => (P.sims.find((s) => s.id === i) || {}).first).filter(Boolean).slice(0, 4).join(', ')})</small>`).join(' · ') : 'Nobody\'s asked for anything yet. Talk to people.'}</div>`; })()}
      <div class="jsec">Album: photos and autographs (${g.photos.album.length})</div>${g.photos.html()}
      <div class="jsec">Curios found: ${cur.found.size} / ${CURIOS.length}</div><div class="cus">${items}</div>
      <div class="hint">${this.game.input.padActive ? 'D-pad ← opens this · ○ closes' : 'J opens this · Esc to close'}</div>`;
    g.photos.fill($('journal'));
  }

  // ---------- backpack ----------
  openInventory() { this.invOpen = true; this.modalOpen = true; this.game.input.unlock(); this.renderInventory(); this.show('inventory'); Sfx.play('ui'); }
  closeInventory() { this.invOpen = false; this.hide('inventory'); this.calm(); }
  renderInventory() {
    const g = this.game, P = g.player, n = P.invTotal();
    const tools = Object.keys(TOOL_NAMES).map((t) => `<div class="slot ${P.tools.has(t) ? 'has' : 'empty'}"><span class="ic">${TOOL_ICON[t]}</span>${TOOL_NAMES[t]}</div>`).join('');
    const rows = Object.entries(P.inv).map(([m, q]) => `<div class="row2"><span class="ic">${MAT_ICON[m] || ''}</span><span class="nm">${q} × ${MATERIALS[m].name}</span>${m === 'food' ? `<button data-inv="eat">Eat</button>` : ''}<button data-inv="drop" data-m="${m}">Drop</button></div>`).join('') || '<div class="row2"><span class="nm">Empty. Chop, mine, pick or take crates from the Stockyard.</span></div>';
    $('inventory').innerHTML = `<h2><span>BACKPACK</span><button data-inv="close" class="xbtn" title="Close">✕</button></h2><div>Tool belt</div><div class="slots">${tools}</div><div>Backpack ${n}/${BACKPACK}</div><div class="cap"><div style="width:${n / BACKPACK * 100}%"></div></div>${rows}${n ? '<div class="row2"><span class="nm"></span><button data-inv="dropall">Drop everything</button></div>' : ''}<div class="hint">${(this.game.input.padActive ? 'D-pad ↑ opens this · D-pad ↓ drops everything · △ eats · deliver to sites with ✕ · ○ closes' : 'I opens this · R drops everything · Q eats · deliver to sites with E')}</div>`;
  }
  invClick(e) {
    const b = e.target.closest('button'); if (!b) return; const P = this.game.player, a = b.dataset.inv;
    if (a === 'close') return this.closeInventory(); if (a === 'drop') P.drop(b.dataset.m); if (a === 'dropall') P.drop(); if (a === 'eat') P.eat();
    this.renderInventory();
  }
  renderTerminal() {
    const g = this.game, e = g.economy, tab = this.terminalTab, T = $('terminal');
    const post = this.termMode === 'post', hatch = this.termMode === 'hatch', stockM = this.termMode === 'stock', shopM = this.termMode === 'shop', regM = this.termMode === 'register';
    const tabs = regM ? [['register', 'Births and deaths']] : shopM ? [['shop', 'Over the counter']] : stockM ? [['stock', 'Store and take']] : hatch ? [['materials', 'Lift order form']] : post ? [['letters', `Letters${g.mail.unread() ? ' (' + g.mail.unread() + ' new)' : ''}`], ['news', 'Town news'], ['challenges', 'Challenges'], ['jobs', 'Jobs'], ['permits', 'Permit forms'], ['materials', 'Order form'], ['report', 'Accounts'], ['money', 'Money']] : [['permits', 'Permits'], ['challenges', 'Challenges'], ['jobs', 'Jobs'], ['materials', 'Trade'], ['residents', 'Residents'], ['report', 'Town report'], ['money', 'Money']]; if (g.story.pages.length) tabs.push(['notes', 'Notes']);
    let body = '';
    if (tab === 'news') {   // everything the town's been up to (only the important things pop up on screen)
      const L = g.messages.log.slice().reverse(); body = L.length ? `<div class="news">${L.map((m) => `<div class="nitem ${m.kind || ''}"><div class="nh"><b>${m.from}</b><span>${m.when || ''}</span></div><div class="nt">${m.text}</div></div>`).join('')}</div>` : '<div class="note">Nothing in the news yet.</div>';
    } else if (tab === 'letters') {
      const L = g.mail.letters; body = L.length ? L.map((l, i) => `<div class="letter ${l.read ? '' : 'new'} ${l.kind}"><div class="lh"><b>${l.title}</b><span>${l.date}</span></div><div class="lf">From: ${l.from}</div><div class="lb">${l.body.replace(/\n/g, '<br>')}</div></div>`).join('') : '<div class="note">The box is empty.</div>';
      setTimeout(() => { g.mail.markRead(); }, 0);
    }
    if (tab === 'register') {   // the parish register, in the vicar's best handwriting
      const R = g.flags.register || { births: [], deaths: [] }, row = (a) => `<tr><td>${a.date}</td><td><b>${a.name}</b></td><td>${a.age !== undefined ? 'aged ' + a.age + (a.cause ? ', ' + a.cause : '') : a.parents ? 'to ' + a.parents : ''}</td></tr>`;
      body = `<h3>Baptisms (births)</h3>${R.births.length ? `<table>${R.births.slice(0, 40).map(row).join('')}</table>` : '<div class="note">None yet.</div>'}<h3>Burials (deaths)</h3>${R.deaths.length ? `<table>${R.deaths.slice(0, 40).map(row).join('')}</table>` : '<div class="note">None yet, thank the Lord.</div>'}`;
    }
    if (tab === 'shop') {   // a shop or bar counter: buy from whoever is serving
      const c = this.counter || {}, P = g.player, goods = c.goods || [];
      body = `<div class="note">${c.who ? `<b>${c.who.first}</b> is serving.` : ''} ${P.drunk > 0.25 ? `You are ${P.drunk > 0.7 ? 'absolutely legless' : P.drunk > 0.45 ? 'quite merry' : 'a little tipsy'}.` : ''} ${g.netVisitor ? `In your pocket: ${fmtMoney(P.pocket || 0)}` : `Paid from the town funds (${fmtMoney(e.funds)})`}.</div><table class="market">` +
        goods.map(([n, p, fx], i) => `<tr><td>${n}</td><td>${p ? '£' + p.toFixed(2) : 'free'}</td><td><button data-act="buy" data-i="${i}" class="${(g.netVisitor ? P.pocket || 0 : e.funds) < p ? 'cant' : ''}">Buy</button></td></tr>`).join('') + '</table>';
    }
    if (tab === 'stock') {   // the Stockyard: store what Sam carries, or take exactly what he wants
      const P = g.player, room = P.invRoom(), carry = (m) => P.inv[m] || 0;
      body = `<div class="note">Backpack <b>${P.invTotal()}/${P.invTotal() + room}</b>${P.invTotal() ? `: ${P.invText()}` : ' (empty)'}.</div>
        <div class="stockbtns"><button data-act="storeall" class="${P.invTotal() ? '' : 'cant'}">⬇ Store everything</button> <button data-act="packsites" class="${room ? '' : 'cant'}">🏗️ Pack what the building sites need</button></div>
        <table class="market stocktbl"><tr><th>Goods</th><th>In store</th><th>Carrying</th><th>How many</th><th>Take</th><th>Put back</th><th></th></tr>` +
        Object.entries(MATERIALS).map(([m, d]) => { const have = Math.floor(e.stock[m] || 0), fill = Math.min(have, room);
          return `<tr data-row="${m}"><td>${d.name}</td><td>${have}</td><td>${carry(m)}</td>${this.qtyCell(m)}${this.stockBtns(m)}<td><button data-act="take" data-m="${m}" data-q="fill" class="${fill ? '' : 'cant'}">Fill up${fill ? ` (${fill})` : ''}</button></td></tr>`; }).join('') + '</table>' + perDayTable(e);
    }
    if (tab === 'permits') {
      const list = ALL_BUILDABLE.filter((k) => e.visible(k)).sort((a, b) => (e.permits[a] === 'approved') - (e.permits[b] === 'approved') || BUILDINGS[a].permit.pop - BUILDINGS[b].permit.pop || BUILDINGS[a].permit.cost - BUILDINGS[b].permit.cost), nx = e.nextMilestone();
      body = `<div class="note">Settlement: <b>${tierOf(g.population.count())}</b> · ${g.population.count()} residents. ${nx ? `The Council will consider new kinds of building at <b>${nx} residents</b>.` : 'Every permit is open to you.'}</div><table><tr><th>Building</th><th>Needs</th><th>Fee</th><th></th></tr>` + list.map((k) => {
        const d = BUILDINGS[k], p = e.permits[k], mats = Object.entries(d.mat).map(([m, n]) => `${n} ${m}`).join(', ');
        const btn = p === 'approved' ? '<span class="st">APPROVED</span>' : p === 'pending' ? '<span class="st">PENDING…</span>' : `<button data-act="permit" data-id="${k}" class="${g.population.count() < d.permit.pop || e.funds < d.permit.cost ? 'cant' : ''}">Request</button>`;
        return `<tr><td>${d.name}<br><small>${d.blurb}</small></td><td><small>${mats}<br>${d.permit.pop ? 'needs ' + d.permit.pop + ' residents' : ''}</small></td><td>${fmtMoney(d.permit.cost)}</td><td>${btn}</td></tr>`;
      }).join('') + '</table>';
    } else if (tab === 'materials') {
      body = `<div>Stockyard: ${Object.keys(MATERIALS).map((m) => `${MATERIALS[m].name} <b>${Math.floor(e.stock[m])}</b>`).join(' · ')}</div>
        <table class="market"><tr><th>Goods</th><th>In stock</th><th>Market (each)</th><th>How many</th><th>Buy</th><th>Sell</th></tr>` +
        Object.entries(MATERIALS).map(([m, d]) => { const tr = e.trend(m), arrow = tr > 0.02 ? `<span class="up">▲${Math.round(tr * 100)}%</span>` : tr < -0.02 ? `<span class="down">▼${Math.round(-tr * 100)}%</span>` : '<span class="flat">▬</span>';
          return `<tr data-row="${m}"><td>${d.name}</td><td>${Math.floor(e.stock[m])}</td><td>buy ${fmtMoney(e.buyPrice(m))} · sell ${fmtMoney(e.sellPrice(m))} ${arrow}</td>${this.qtyCell(m)}${this.tradeBtns(m)}</tr>`; }).join('') +
        `</table><div class="note">${g.buildings.count('postoffice') ? 'Post Office discount: 20% off · ' : ''}Orders on the way: ${e.orders.length + g.logistics.queue.length}${g.depot ? '' : ' · No Stockyard yet: deliveries wait on the Lift dock'}</div>`;
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
        <p>Newcomers arrive through the Lift when there are free beds and enough food (faster when there are jobs going). You can invite settlers for a fee.${P.why ? ` <b>Right now: ${P.why}.</b>` : ''}</p>
        <button data-act="invite" data-n="1" class="${e.funds < 500 ? 'cant' : ''}">Invite 1 (£500)</button> <button data-act="invite" data-n="3" class="${e.funds < 1500 ? 'cant' : ''}">Invite 3 (£1,500)</button>
        <div class="note">Queued invitations: ${P.invites}</div>`;
    } else if (tab === 'report') {
      const r = e.lastReport, P = g.population;
      body = `<table><tr><td>Funds</td><td>${fmtMoney(e.funds)}</td></tr><tr><td>Residents</td><td>${P.count()}</td></tr><tr><td>Buildings</td><td>${g.buildings.list.filter((b) => b.state === 'done').length} (+${g.buildings.list.filter((b) => b.state === 'site').length} under construction)</td></tr>
        <tr><td>Age</td><td>${g.tech.status().name}${g.tech.era < 2 ? ` · research ${g.tech.status().research}/${g.tech.status().need} for computers${g.tech.era < 1 ? ' (needs power too)' : ''}` : ''}</td></tr><tr><td>Power</td><td>${g.buildings.count('power') ? 'ONLINE' : 'none'}</td></tr><tr><td>Water</td><td>${g.buildings.count('water') ? 'ONLINE' : 'none'}</td></tr>
        <tr><td>Last month</td><td>${r ? `income ${fmtMoney(r.income)} · costs ${fmtMoney(r.cost)} · net ${fmtMoney(r.net)}` : 'no report yet'}</td></tr></table>`;
      // where the money comes from and where it goes: this week so far, and last week in full
      const rows = (lines) => lines.map(([k, v]) => `<tr><td>${k}</td><td class="${v < 0 ? 'bad' : 'ok'}">${v < 0 ? '−' : '+'}${fmtMoney(Math.abs(v))}</td></tr>`).join('');
      const now = Object.entries(e.ledger || {}).map(([k, v]) => [k, Math.round(v)]).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
      body += `<h3>This week so far</h3>${now.length ? `<table>${rows(now)}</table>` : '<div class="note">Nothing yet.</div>'}`;
      if (r && r.lines) body += `<h3>Last week in full</h3><table>${rows(r.lines)}<tr><td><b>Net</b></td><td class="${r.net < 0 ? 'bad' : 'ok'}"><b>${r.net < 0 ? '−' : '+'}${fmtMoney(Math.abs(r.net))}</b></td></tr></table>`;
      body += '';
      body += perDayTable(e);
    } else if (tab === 'money') {
      body = moneyHTML(g);
    } else if (tab === 'challenges') {
      const C = g.challenges, open = C.open(), D = C.doneIds;
      body = `` + (open.length ? open.map((c) => { const p = C.progress(c); return `<div class="chal"><span class="ic">${c.icon}</span><div><b>${c.title}</b> <small>grant ${fmtMoney(c.pay)}</small><br><small>${c.text}</small><i><u style="width:${Math.round(p.frac * 100)}%"></u></i><small>${p.have} / ${p.need}</small></div></div>`; }).join('') : '<div class="note">Nothing on the list right now. The Council will think of something when the town grows.</div>')
        + (D.length ? `<div class="note">Done (${D.length}): ${D.map((id) => { const c = CHALLENGES.find((q) => q.id === id); return c ? c.icon + ' ' + c.title : ''; }).join(' · ')}</div>` : '');
    } else if (tab === 'notes') {
      const pg = g.story.pages, wd = g.story.words || [], words = wd.length ? `<div class="page">Words people say that aren't words (and then go red): <b>${wd.join(', ')}</b>.</div>` : ''; body = pg.length || words ? pg.map((p) => `<div class="page">${p}</div>`).join('') + words : '<div class="note">No notes yet. Talk to residents regularly — some of them know more than they should.</div>';
    }
    const html = `<div class="win"><h2><span>${regM ? '📜 THE PARISH REGISTER' : shopM ? `🛒 ${(this.counter && this.counter.b.def.name || 'THE COUNTER').toUpperCase()}` : stockM ? '📦 THE STOCKYARD' : hatch ? '☎ LIFT INTERCOM · "Dave speaking"' : post ? '✉ THE POST · SAM CITY' : (g.tech.computers ? 'SAM CITY - PLANNING TERMINAL' : '📖 SAM CITY - PLANNING LEDGER')}</span><button data-act="close" class="xbtn" title="Close">✕</button></h2><div class="tabs">${tabs.map(([k, n]) => `<button data-act="tab" data-k="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}<span style="margin-left:auto">Funds: <b>${fmtMoney(e.funds)}</b></span></div>${body}</div>`;
    const keep = tab === this._termTab ? (T.querySelector('.win') || {}).scrollTop || 0 : 0; this._termTab = tab;   // redraws keep the scroll (unless the tab changed)
    if (html !== this._termHtml) { this._termHtml = html; T.innerHTML = html; const w = T.querySelector('.win'); if (w) w.scrollTop = keep; }
  }
  /** How many to trade, per material: a box to type into and a button that steps the amount (1, 5, 10, 25, 50, 100, 250) for a controller. */
  tq(m) { return (this._tq ||= {})[m] ?? 10; }
  qtyCell(m) { return `<td class="qtyc"><input class="tqty" data-m="${m}" inputmode="numeric" maxlength="5" value="${this.tq(m)}" aria-label="How many"><button data-act="tqstep" data-m="${m}" title="Step up: 1, 5, 10, 25, 50, 100, 250, then back to 1">+</button></td>`; }
  tradeBtns(m) { const e = this.game.economy, q = this.tq(m), c = e.quote(m, q, 'buy'); return `<td><button data-act="order" data-m="${m}" data-live="1" class="${e.funds < c || !q ? 'cant' : ''}">Buy ${q}<small>−${fmtMoney(c)}</small></button></td><td><button data-act="sell" data-m="${m}" data-live="1" class="${e.stock[m] < q || !q ? 'cant' : ''}">Sell ${q}<small>+${fmtMoney(e.quote(m, q, 'sell'))}</small></button></td>`; }
  stockBtns(m) { const g = this.game, P = g.player, q = this.tq(m), have = Math.floor(g.economy.stock[m] || 0), room = P.invRoom(), carry = P.inv[m] || 0; return `<td><button data-act="take" data-m="${m}" data-live="1" class="${have && room && q ? '' : 'cant'}">Take ${q}</button></td><td><button data-act="put" data-m="${m}" data-live="1" class="${carry && q ? '' : 'cant'}">Put ${Math.min(q, carry) || q} back</button></td>`; }
  /** Typing in an amount: keep it, and redo that row's buttons (not the whole page, so the box keeps the cursor). */
  qtyInput(el) {
    const m = el.dataset.m, v = Math.min(9999, parseInt(String(el.value).replace(/\D/g, ''), 10) || 0); (this._tq ||= {})[m] = v; if (String(v) !== el.value && el.value !== '') el.value = v;
    const row = el.closest('tr'); if (!row) return; const html = this.terminalTab === 'stock' ? this.stockBtns(m) : this.tradeBtns(m), tmp = document.createElement('tbody'); tmp.innerHTML = `<tr>${html}</tr>`;
    const cells = [...tmp.firstChild.children], old = [...row.querySelectorAll('td')].filter((td) => td.querySelector('[data-live]')); old.forEach((td, i) => cells[i] && td.replaceWith(cells[i]));
  }
  terminalClick(e) {
    const b = e.target.closest('button'); if (!b) return; const g = this.game, a = b.dataset.act; let r = null;
    if (a === 'close') return this.closeTerminal(); if (a === 'tab') { this.terminalTab = b.dataset.k; }
    if (a === 'permit') r = g.economy.requestPermit(b.dataset.id);
    const qn = b.dataset.live ? this.tq(b.dataset.m) : +b.dataset.q;   // (the amount in the row's box)
    if (a === 'tqstep') { const S = [1, 5, 10, 25, 50, 100, 250], q = this.tq(b.dataset.m); this._tq[b.dataset.m] = S.find((x) => x > q) || 1; }
    if ((a === 'order' || a === 'sell' || a === 'take' || a === 'put') && b.dataset.live && !qn) r = { ok: false, msg: 'Type how many first.' };
    else if (a === 'order') r = g.economy.orderMaterial(b.dataset.m, qn);
    else if (a === 'sell') r = g.economy.sellMaterial(b.dataset.m, qn);
    if (a === 'buy') r = g.player.buyGoods(this.counter, +b.dataset.i);
    if (a === 'storeall') r = g.player.storeAll(); if (a === 'packsites') r = g.player.packSites();
    if (a === 'take' && !r) { const P = g.player, m = b.dataset.m, have = Math.floor(g.economy.stock[m] || 0), q = b.dataset.q === 'fill' ? Math.min(have, P.invRoom()) : Math.min(qn, have, P.invRoom()); if (q <= 0) r = { ok: false, msg: have ? 'Your backpack is full.' : 'There is none in the Stockyard.' }; else { g.economy.stock[m] -= q; P.invAdd(m, q); Sfx.play('pickup'); } }
    if (a === 'put' && !r) { const P = g.player, m = b.dataset.m, n = Math.min(qn || 1, P.inv[m] || 0); if (n > 0) { P.invTake(m, n); g.economy.add(m, n, false); Sfx.play('drop'); } else r = { ok: false, msg: 'You are not carrying any.' }; }
    if (a === 'money') r = g.economy.moneyOp(b.dataset.op, b.dataset.arg);
    if (a === 'invite') { const n = +b.dataset.n; if (!g.economy.spend(500 * n, 'Invitations')) r = { ok: false, msg: 'Not enough funds.' }; else { g.population.invites += n; g.population.timer = Math.min(g.population.timer, 2); g.messages.push('Lift', `${n} resident(s) invited. They will arrive shortly.`); } }
    if (r && !r.ok) { this.toast(r.msg); Sfx.play('deny'); } else if (r && r.ok && (a === 'order' || a === 'sell')) Sfx.play('ui');
    this.renderTerminal();
  }

  // ---------- query ----------
  query(o) {
    const q = $('query'), g = this.game; let h = ''; clearTimeout(this._qt); this.qSim = null; this.qFollow = false; q.classList.remove('card');
    if (o.sim) { this.qSim = o.sim; this.qT = 0; q.classList.add('card'); this.simCard(); q.classList.remove('hidden'); Sfx.play('ui');
      const s = o.sim, alive = () => this.qSim === s && !s.remove;   // pins for them, their home and their work while the card is open
      if (g.markers) { g.markers.add(s.x, s.z, '👤', s.name, 3600, s, alive); if (s.home) g.markers.add(s.home.cx, s.home.cz, '🏠', `${s.first}'s home`, 3600, null, alive); if (s.workplace) g.markers.add(s.workplace.cx, s.workplace.cz, '💼', `${s.first}'s work`, 3600, null, alive); }
      return; }
    q.dataset.who = '';
    if (o.b) { const b = o.b; h = `<b>${b.def.name}</b><br>${b.def.blurb || ''}<br><i>${purposeOf(b.id, b.def)}</i><br>${b.graffiti ? 'Covered in graffiti.<br>' : ''}${b.state === 'site' ? `Under construction: ${Math.round(b.progress * 100)}%<br>Materials: ${Object.entries(b.need).map(([m, n]) => `${m} ${b.have[m] || 0}/${n}`).join(', ')}` : `Residents ${b.residents.length}/${b.def.beds || 0}${b.residents.length ? ': ' + b.residents.map((r) => r.first).join(', ') : ''}<br>Workers ${b.workers.length}/${Object.values(b.def.jobs || {}).reduce((x, c) => x + c, 0)}${b.workers.length ? ': ' + b.workers.map((r) => r.first).join(', ') : ''}`}`; }
    else if (o.node) h = `<b>${o.node.label}</b><br>${o.node.more}`;
    else h = g.god.describe(o.tile[0], o.tile[1]);
    q.innerHTML = h; q.classList.remove('hidden'); this._qt = setTimeout(() => q.classList.add('hidden'), 6000);
  }
  /** The card for a townsperson picked with Query: who they are, where they live and work, how they're doing. Stays (and
   *  keeps up to date) until closed; pins show them, their home and their work on the map. */
  /** A carter out with the cart: where to, and what's on it. */
  cartLine(s) {
    const C = this.game.carting, c = C && s.carting && C.carts.find((q) => q.w === s); if (!c) return '';
    const goods = Object.entries(c.load || {}).filter(([, n]) => n > 0).map(([m, n]) => `${n} ${MATERIALS[m] ? MATERIALS[m].name.toLowerCase() : m}`).join(', ') || 'nothing', site = `${c.s && c.s.def ? c.s.def.name : 'new building'} site`;
    const where = c.stage === 'toYard' ? `to the Stockyard to load up ${goods} for the ${site}` : c.stage === 'toSite' ? `taking ${goods} from the Stockyard to the ${site}` : `back to the ${c.yard.def.name} (empty)`;
    return `<div class="qline"><b>Carting</b> ${where}</div><div class="qline"><b>On the cart</b> ${c.stage === 'toSite' ? goods : 'nothing yet'}</div>`;
  }
  simCard() {
    const s = this.qSim, q = $('query'), g = this.game; if (!s) return;
    const bar = (label, v, col) => `<div class="qbar"><span>${label}</span><i><b style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%;background:${col}"></b></i></div>`;
    const fr = [...s.rel.values()].filter((v) => v >= 35).length, kids = g.population.sims.filter((k) => !k.remove && (k.parents || []).includes(s)).map((k) => k.first);
    const doing = s.pose === 'sleep' ? 'asleep' : s.down > 0 ? (s.dead ? 'dead' : 'hurt') : s.eating ? 'eating' : s.chat ? 'chatting' : s.activity === 'work' ? (s.working ? 'working' : 'at work') : s.activity || 'idle';
    const commute = s.home && s.workplace ? Math.round(Math.hypot(s.home.cx - s.workplace.cx, s.home.cz - s.workplace.cz)) : null;
    const dyn = `<div class="qline">${s.gender === 'f' ? 'Female' : 'Male'}, ${Math.floor(s.age)} · ${s.trait}${s.quirk && s.quirk.label ? ' · ' + s.quirk.label : ''}</div>
      <div class="qline"><b>Job</b> ${s.roleName}${s.workplace ? ' at the ' + s.workplace.def.name : s.kind === 'child' ? ' (school and play)' : ''}</div>
      <div class="qline"><b>Home</b> ${s.home ? 'the ' + s.home.def.name : s.homeless ? 'sleeping rough' : s.kind === 'visitor' ? 'a day trip' : 'none yet'}${commute !== null ? ` · ${commute} m from work` : ''}</div>
      <div class="qline"><b>Now</b> ${doing}${s.inside ? ' in the ' + s.inside.def.name : ''}</div>${this.cartLine(s)}
      ${bar('Mood', (s.mood + 1) / 2, s.mood > 0 ? '#5fd38a' : s.mood > -0.35 ? '#e8c04a' : '#e2574c')}${bar('Fed', 1 - s.hunger / 100, '#e8a04a')}${bar('Likes Sam', (s.samRel || 0) / 100, '#7aa8ff')}
      <div class="qline">${s.partner ? '<b>Partner</b> ' + s.partner.name + ' · ' : ''}${kids.length ? '<b>Children</b> ' + kids.join(', ') + ' · ' : ''}<b>Friends</b> ${fr}</div>`;
    // the buttons are made once per person (redrawing them twice a second would swallow clicks); only the details refresh
    if (q.dataset.who !== String(s.id)) { q.dataset.who = s.id; q.innerHTML = `<h2><span>${s.name}</span><button class="xbtn" data-q="close" title="Close">✕</button></h2><div class="qdyn"></div>
      <div class="qbtns">${s.home ? '<button data-q="home">🏠 Home</button>' : ''}${s.workplace ? '<button data-q="work">💼 Work</button>' : ''}<button data-q="follow">👁 Follow</button></div>`; }
    const d = q.querySelector('.qdyn'); if (d && d.innerHTML !== dyn) d.innerHTML = dyn; const f = q.querySelector('[data-q="follow"]'); if (f) f.classList.toggle('on', !!this.qFollow);
  }
  queryClick(e) {
    const b = e.target.closest('button'); if (!b || !this.qSim) return; const a = b.dataset.q, s = this.qSim, G = this.game.god;
    if (a === 'close') { this.qSim = null; this.qFollow = false; $('query').classList.add('hidden'); return; }
    const go = (x, z) => { G.target.set(x, 0, z); G.distGoal = Math.min(G.distGoal || G.dist, 70); this.qFollow = false; };
    if (a === 'home' && s.home) go(s.home.cx, s.home.cz); if (a === 'work' && s.workplace) go(s.workplace.cx, s.workplace.cz); if (a === 'follow') this.qFollow = !this.qFollow;
    Sfx.play('ui'); this.simCard();
  }

  /** The way out: how Sam left (ride, blast or stairs), the date it really is, and what Sam leaves behind. */
  showEnding(route = 'ride') {
    const g = this.game, e = $('ending'), now = new Date(), date = `${now.getDate()} ${now.toLocaleString('en-GB', { month: 'long' })} 2026`; e.classList.remove('hidden');
    const how = {
      ride: 'The cage sinks for a long time. Then doors, a corridor of strip lights, a fire exit, and a car park under a real sky: real wind, real rain, no cue cards.',
      blast: 'Down the ladder, rung after rung, into the dark under Sam City. A service tunnel, a fire door, and then rain on your face: a car park under a real sky. A bus goes past with an advert on the side for something called Netflix.',
      stairs: 'Through the door marked EXIT: a corridor, a lift that goes the right way, a lobby, revolving doors, and the street. It\'s raining. Everybody is looking down at a little glowing slab in their hand. A billboard over the road says SAM CITY 1995 · STILL ON AIR.',
    }[route] || '';
    const pop = g.population.count(), built = g.buildings.list.filter((b) => b.state === 'done' && !b.def.special).length, days = g.clock.totalDays || 0;
    e.innerHTML = `<div class="box"><h1>OUTSIDE</h1><p class="tag">${how}<br><br>The date on the bus shelter says <b>${date}</b>. It isn't 1995. It hasn't been 1995 for thirty-one years.<br>Sam City was a set. You were the star.</p><p class="tag small">${days} days in Sam City · ${pop} people · ${built} buildings, every one of them raised by hand</p><button id="btn-keep">Keep playing in the set</button></div>`;
    $('btn-keep').onclick = () => { e.classList.add('hidden'); this.game.ending = false; this.game.flags.escaped = true; this.game.player.teleport(this.game.plaza.x, this.game.plaza.z); this.fade(0); };
  }

  // ---------- per-frame ----------
  update(dt) {
    this.noticeKeys(dt);
    if (this.qSim) { const s = this.qSim, g = this.game; if (s.remove || g.mode !== 'god') { this.qSim = null; $('query').classList.add('hidden'); } else { if (this.qFollow) g.god.target.set(s.x, 0, s.z); if ((this.qT = (this.qT || 0) - dt) <= 0) { this.qT = 0.5; this.simCard(); } } }   // the query card keeps up
    if (this.buildDirty && performance.now() - (this._bdT || 0) > 250) { this.buildDirty = false; this._bdT = performance.now(); this.refreshSub(); if (this.plan.open && this.plan.tab === 'build') this.plan.render(); }
    if (this.plan.open && this.plan.tab !== 'build') { this._planT = (this._planT || 0) - dt; if (this._planT <= 0) { this._planT = 1; this.plan.render(); } }
    const g = this.game;
    if (this.hoverTimer > 0) { this.hoverTimer -= dt; if (this.hoverTimer <= 0 || g.mode !== 'god') $('hover').classList.add('hidden'); }
    if (this.dialogue) { const d = this.dialogue; d.shown = Math.min(d.full.length, d.shown + dt * 55); $('d-text').textContent = d.full.slice(0, Math.floor(d.shown)); }
    if (g.input.hit('KeyH')) { $('help').classList.remove('hidden'); $('help').classList.toggle('want'); this.helpT = 0; }   // the full controls line, only when asked for
    if (!g.input.padActive || !g.input.pad.connected) this.padLegend(this.dialogue ? { id: 'dialogue' } : this.padScope(), false);
    this._padT = (this._padT || 0) - dt; if (this._padT <= 0 && document.body.classList.contains('pad') !== !!g.input.padActive) { this._padT = 0.5; document.body.classList.toggle('pad', !!g.input.padActive); }   // keyboard caps or controller glyphs (at most twice a second: a drifting stick and a mouse mustn't restyle every frame)
    { const pp = $('pausedpill'), on = g.started && !g.ending && g.clock.speed === 0 && !this.modalOpen && !(g.introScene && g.introScene.live); if (pp && pp.classList.contains('hidden') === on) pp.classList.toggle('hidden', !on); }   // paused: say so, plainly, until it isn't
    this.acc += dt; if (this.acc < 0.25) return; this.acc = 0;
    const c = g.clock, P = g.population;
    $('h-pop').textContent = P.count().toLocaleString(); $('h-funds').textContent = fmtMoney(g.economy.funds); $('h-month').textContent = `${c.day} ${MONTHS[c.month]}`; $('h-year').textContent = c.year; $('h-sims').textContent = `${P.sims.filter((s) => !s.hidden).length}${P.simCap < 100000 ? "/" + P.simCap : ""}`;
    $('c-date').textContent = `${DAYS[c.weekday]} ${c.day} ${MONTHS[c.month]} ${c.year}${this.game.seasons ? ' · ' + ({ Winter: '❄', Spring: '🌸', Summer: '☀', Autumn: '🍂' })[this.game.seasons.season] : ''}`;
    { const dk = c.year * 400 + c.month * 32 + c.day; if (this._calK !== dk) { this._calK = dk; const t = keyToday(c), nx = upcoming(c, 4).filter((k) => k.inDays > 0), soon = nx.find((k) => k.inDays <= 7), el = $('c-special');   // today's special day, or the next one this week
      el.textContent = t ? `${t.icon} ${t.name}` : soon ? `${soon.icon} ${soon.name} ${soon.inDays === 1 ? 'tomorrow' : `in ${soon.inDays} days`}` : ''; el.classList.toggle('today', !!t);
      $('c-date').title = `${dateText(c, true)}\nComing up: ${nx.map((k) => `${k.name} (${k.d} ${MONTH_NAMES[k.m]}${k.inDays === 1 ? ', tomorrow' : `, in ${k.inDays} days`})`).join('; ')}`; } } $('c-time').textContent = c.hhmm;
    for (const b of $('c-speed').children) b.classList.toggle('on', +b.dataset.s === c.speed);
    $('stock').innerHTML = Object.keys(MATERIALS).map((m) => { const r = g.economy.perDay(m).yesterday, u = g.economy.perDay(m, 'used').yesterday, net = Math.round(r - u); return `<div title="Yesterday: +${Math.round(r)} gathered or made, −${Math.round(u)} used"><span>${MATERIALS[m].name}</span> <b>${Math.floor(g.economy.stock[m])}</b>${r || u ? `<i class="${net < 0 ? 'neg' : ''}">${net >= 0 ? '+' : '−'}${Math.abs(net)}/d</i>` : ''}</div>`; }).join('');   // with yesterday's change
    $('h-tier').textContent = tierOf(P.count());
    { const st = $('stock'), tb = $('toolbox'); if (st && tb && !tb.classList.contains('hidden')) { const room = window.innerHeight - (st.offsetTop + st.offsetHeight) - 18, h = tb.offsetHeight, k = h > room && room > 80 ? Math.max(0.6, room / h) : 1; if (k !== this._tbK) { this._tbK = k; tb.style.transformOrigin = 'bottom left'; tb.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : ''; } } }   // short screens: shrink the tool panel so it never covers the stock
    { const cb = $('clockbox'), mm = $('minimap'); if (cb && mm) { const big = mm.classList.contains('big'), b = big ? -1 : cb.offsetHeight + 22; if (b !== this._mmB) { this._mmB = b; if (big) mm.style.removeProperty('bottom'); else mm.style.setProperty('bottom', b + 'px', 'important'); } } }   // keep the corner map clear of the clock box (the island map fills the screen)
    const NS = g.netVisitor && g.net && g.net.stats; if (NS) { $('h-pop').textContent = NS.pop.toLocaleString(); $('h-funds').textContent = fmtMoney(NS.funds); $('h-tier').textContent = tierOf(NS.pop); $('h-sims').textContent = NS.sims; $('stock').innerHTML = Object.keys(MATERIALS).map((m) => `<div><span>${MATERIALS[m].name}</span> <b>${Math.floor(NS.stock[m] || 0)}</b></div>`).join(''); }   // visiting: the host's town
    $('b-hunger').style.width = Math.round(100 - g.player.hunger) + '%'; $('b-hunger').style.background = g.player.hunger > 70 ? '#ff6b6b' : '#e8b44a'; { const TI = TOOL_ICONS, ht = $('h-tools'), sig = [...g.player.tools].join(); if (ht.dataset.sig !== sig) { ht.dataset.sig = sig; ht.innerHTML = [...g.player.tools].map((t) => `<span class="tchip" title="${TOOL_NAMES[t]}">${TI[t] || '🔧'}</span>`).join('') || '<span class="tnone">No tools yet</span>'; } }   // the tool belt as icons
    $('b-energy').style.width = Math.round(g.player.energy) + '%'; $('b-energy').style.background = g.player.energy < 25 ? '#ff6b6b' : '#7be08f';
    $('h-carry').textContent = `${g.player.invTotal()}/${BACKPACK}`; $('h-pack').textContent = g.player.invText(); $('b-pack').style.width = (g.player.invTotal() / BACKPACK * 100) + '%'; const F = g.favours.list; $('h-favours').innerHTML = F.length ? '<b>Favours</b><br>' + F.map((f) => `! ${f.sim.first}${f.asked ? `: ${f.n} ${f.mat}` : ' wants a word'}`).join('<br>') : ''; $('h-keys').textContent = g.input.padActive ? 'D-pad ↑ backpack · ↓ drop · ← journal · Y eat' : 'I backpack · R drop · J journal · Q eat';
    if (this.helpT > 0) { this.helpT -= 0.25; if (this.helpT <= 0) $('help').classList.add('hidden'); }
    if (this._padWas !== g.input.padActive) { this._padWas = g.input.padActive; this.setMode(g.mode); }
    $('crosshair').classList.toggle('hidden', g.mode === 'god' && !g.input.padActive); $('crosshair').classList.toggle('godcur', g.mode === 'god');
    if (g.mode === 'sim') $('c-mode').textContent = 'SAM (' + (g.player.third ? '3rd' : '1st') + ' person)';
    this.renderObjectives();
  }
}
