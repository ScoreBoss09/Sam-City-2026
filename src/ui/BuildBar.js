import { BUILDINGS, MATERIALS, TOOL_MENUS, ROLES } from '../data/buildings.js';
import { ICON, CAT_ICON } from '../data/icons.js';
import { purposeOf } from '../data/purpose.js';
import { MAT_ICON } from '../player/Player.js';
import { fmtMoney } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { Previews } from './Previews.js';

/**
 * The planning view's toolbar, along the bottom like Cities: Skylines: what to build (by category), the tools (bulldoze,
 * move, info), and the town's pages (work queue, upgrades, money, the town overview). Picking a category opens a strip
 * of cards above the bar, each with a picture of the building; pick one and click on the map to place it. Hovering a card
 * says what it is; right-clicking it (or anything on the map) says everything about it. The pages open docked above the
 * bar, so the town stays in view. It works the same with a mouse, the keyboard or a controller (L1/R1 category, D-pad
 * through the cards, ✕ places, □ the work queue).
 */
const $ = (id) => document.getElementById(id);
const CATS = [{ k: 'road', name: 'Roads', icon: '🛣️', tool: 'road' },
  ...TOOL_MENUS.build.map(([n, l]) => ({ k: n, name: n === 'Commerce' ? 'Shops' : n, icon: CAT_ICON[n] || '🏗️', tool: 'build', list: l })),
  { k: 'Parks', name: 'Parks', icon: '🌳', tool: 'park', list: TOOL_MENUS.park }, { k: 'Utilities', name: 'Utilities', icon: '⚡', tool: 'util', list: TOOL_MENUS.util }];
const TOOLSET = [
  { k: 'bulldoze', name: 'Bulldoze', icon: '🚜', tool: 'bulldoze', hint: 'Click or drag over a path, a building site or a building to clear it.' },
  { k: 'move', name: 'Move', icon: '🌱', tool: 'move', hint: 'Click a berry bush, rock, iron ore or clay pit, then where it should go. A villager digs it up and moves it.' },
  { k: 'query', name: 'Info', icon: '🔍', tool: 'query', hint: 'Click anything to find out about it: a person, a building, a site, a tree. (Right-click does the same with any tool.)' },
];
const PANELS = [{ k: 'queue', name: 'Queue', title: 'Work queue', icon: '📋' }, { k: 'upgrades', name: 'Upgrades', icon: '⬆️' }, { k: 'money', name: 'Money', icon: '💷' }, { k: 'town', name: 'Town', icon: '🏘️' }];
const ALL = [...CATS, ...TOOLSET, ...PANELS];
const ROADS = [['dirt', 'Dirt path', '#8a6a44', 'Dug by hand. £2 a square.'], ['paved', 'Paved road', '#5d636c', '£20 and a stone a square. Carts and cars go faster.'], ['plaza', 'Plaza', '#c9a46a', '£12 and a stone a square. For people: no cars.'], ['lamps', 'Street lamps', '#2a3446', 'Light the paths at night. Click a corner or the side of a path.']];
const TRACKS = [['rail', 'Railway track', '£40 a piece'], ['mono', 'Monorail beam', '£60 a piece'], ['sky', 'Sky lift cable', '£30 a piece']];
const mats = (m) => Object.entries(m || {}).map(([k, n]) => `<span class="m">${MAT_ICON[k] || ''}${n}</span>`).join('');
const matText = (m) => Object.entries(m || {}).map(([k, n]) => `${n} ${(MATERIALS[k] || { name: k }).name.toLowerCase()}`).join(', ');

export class BuildBar {
  constructor(game) {
    this.game = game; this.cat = null; this.sel = -1; this.previews = new Previews(game); this.t = 0;
    const el = this.el = document.createElement('div'); el.id = 'buildbar'; el.className = 'hidden';
    el.innerHTML = '<div id="bb-strip" class="hidden"><div class="bb-head"><b class="bb-title"></b><span class="bb-hint"></span></div><div class="bb-cards"></div></div><div id="bb-row"></div>';
    $('app').appendChild(el); const info = this.info = document.createElement('div'); info.id = 'bb-info'; info.className = 'hidden'; $('app').appendChild(info);
    this.row = el.querySelector('#bb-row'); this.strip = el.querySelector('#bb-strip'); this.cards = el.querySelector('.bb-cards');
    this.row.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) this.pick(b.dataset.c); });
    this.cards.addEventListener('click', (e) => { const b = e.target.closest('.bb-card'); if (b) this.choose(b.dataset.k); });
    this.cards.addEventListener('contextmenu', (e) => { e.preventDefault(); const b = e.target.closest('.bb-card'); if (b) this.showInfo(b.dataset.k, b, false); });
    this.cards.addEventListener('mouseover', (e) => { const b = e.target.closest('.bb-card'); if (b && (this.info.dataset.k !== b.dataset.k || this.info.classList.contains('hidden'))) this.showInfo(b.dataset.k, b, true); });
    this.cards.addEventListener('mouseleave', () => { if (this.info.classList.contains('brief')) this.hideInfo(); });
    this.cards.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { this.cards.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });   // (the mouse wheel scrolls the strip sideways)
    info.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) this.hideInfo(); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.previews.onReady((id, url) => { for (const pv of document.querySelectorAll(`#buildbar .bb-card[data-k="${id}"] .pv, #bb-info[data-k="${id}"] .pv`)) if (url) { pv.style.backgroundImage = `url(${url})`; pv.classList.add('ok'); } });
    this.drawRow();
  }
  // ---------- the bar ----------
  drawRow() {
    const g = this.game, Q = g.construction ? g.construction.queue().length : 0, U = g.upgrades ? g.upgrades.candidates().filter((b) => g.upgrades.check(b).ok).length : 0, W = g.overview && g.overview.data ? g.overview.data.warn.length : 0;
    const badge = { queue: Q, upgrades: U, town: W }, btn = (c) => `<button data-c="${c.k}" class="bb-btn ${this.cat === c.k ? 'on' : ''}" title="${c.title || c.name}"><i>${c.icon}</i><span>${c.name}</span>${badge[c.k] ? `<em class="${c.k === 'town' ? 'warn' : ''}">${badge[c.k]}</em>` : ''}</button>`;
    const html = `<div class="bb-group">${CATS.map(btn).join('')}</div><div class="bb-sep"></div><div class="bb-group">${TOOLSET.map(btn).join('')}</div><div class="bb-sep"></div><div class="bb-group">${PANELS.map(btn).join('')}</div>`;
    if (html !== this._row) { this._row = html; this.row.innerHTML = html; }
  }
  /** A category, a tool or a page: pick it (or put it away if it's already picked). */
  pick(k) {
    const g = this.game, c = ALL.find((q) => q.k === k); if (!c) return; Sfx.play('ui'); this.hideInfo(); this.sel = -1;
    if (this.cat === k) { this.close(); return; }
    if (PANELS.includes(c)) { this.cat = k; this.strip.classList.add('hidden'); g.god.setTool('pan'); g.ui.plan.dock(k); this.drawRow(); return; }
    if (g.ui.plan.open) g.ui.plan.close(true);
    this.cat = k;
    if (c.tool === 'road') g.god.setTool('road', this.roadSub || 'dirt');
    else if (c.tool === 'build') { g.ui.buildTab = c.k; g.god.setTool('build', null); }
    else g.god.setTool(c.tool, null);
    this.drawStrip(true); this.drawRow();
  }
  close() { const g = this.game; this.cat = null; this.sel = -1; this.strip.classList.add('hidden'); this.hideInfo(); if (g.ui.plan.open) g.ui.plan.close(true); if (g.god.tool.id !== 'pan') g.god.setTool('pan'); this.drawRow(); }
  /** L1/R1 on a controller. */
  cycle(d) { const i = ALL.findIndex((c) => c.k === this.cat), n = ALL[(i + d + ALL.length) % ALL.length]; this.pick(n.k); }
  // ---------- the strip of cards ----------
  items() {
    const g = this.game, c = ALL.find((q) => q.k === this.cat); if (!c) return [];
    if (c.tool === 'road') return ROADS.map(([k]) => k);
    if (!c.list) return [];
    const l = c.list.filter((k) => g.economy.visible(k)); if (c.k === 'Transport' && g.ui.trackReady()) l.push(...TRACKS.map(([k]) => 'track:' + k)); return l;
  }
  drawStrip(reset) {
    const g = this.game, c = ALL.find((q) => q.k === this.cat); if (!c || PANELS.includes(c)) { this.strip.classList.add('hidden'); return; }
    const e = g.economy, pop = g.population.count(), sub = g.god.tool.sub;
    this.strip.classList.remove('hidden'); this.strip.querySelector('.bb-title').textContent = `${c.icon} ${c.name}`;
    const pad = g.input.padActive, next = e.nextMilestone && e.nextMilestone();
    this.strip.querySelector('.bb-hint').textContent = c.hint || (c.tool === 'road' ? (pad ? 'D-pad to choose, ✕ on the map to draw' : 'Pick one, then drag on the map to draw') : (pad ? 'D-pad to choose, ✕ on the map to place · △ turns it' : 'Pick a building, then click on the map to place it · R turns it · right-click a card for the full story'));
    if (c.hint) { this.cards.innerHTML = ''; this.cards.classList.add('empty'); return; } this.cards.classList.remove('empty');
    const html = this.items().map((k) => {
      if (c.tool === 'road') { const r = ROADS.find((q) => q[0] === k), lock = (k === 'paved' && pop < 15) || (k === 'plaza' && pop < 10); return `<button class="bb-card road ${sub === k ? 'on' : ''} ${lock ? 'locked' : ''}" data-k="${k}"><span class="pv sw" style="--sw:${r[2]}"><i class="em">${k === 'lamps' ? '💡' : ''}</i></span><span class="nm">${r[1]}</span><span class="st">${lock ? `🔒 ${k === 'paved' ? 15 : 10} residents` : r[3].split('.')[0]}</span></button>`; }
      if (k.startsWith('track:')) { const t = TRACKS.find((q) => 'track:' + q[0] === k); return `<button class="bb-card road ${g.god.tool.id === 'track' && sub === t[0] ? 'on' : ''}" data-k="${k}"><span class="pv sw" style="--sw:#3a4250"><i class="em">🛤️</i></span><span class="nm">${t[1]}</span><span class="st">${t[2]}</span></button>`; }
      const d = BUILDINGS[k], n = g.buildings.count(k), sites = g.buildings.count(k, false) - n, un = e.isUnlocked(k), p = e.permits[k], url = this.previews.get(k);
      const st = un ? mats(d.mat) || '<span class="m">free</span>' : p === 'pending' ? '⏳ permit pending' : pop < d.permit.pop ? `🔒 ${d.permit.pop} residents` : `📮 permit ${fmtMoney(d.permit.cost)}`;
      const asked = !n && g.flags.asks && g.flags.asks[k] && g.flags.asks[k].length;
      return `<button class="bb-card ${sub === k ? 'on' : ''} ${un ? '' : 'locked'} ${n ? 'built' : ''}" data-k="${k}"><span class="pv ${url ? 'ok' : ''}" ${url ? `style="background-image:url(${url})"` : ''}><i class="em">${ICON[k] || '🏠'}</i></span>${n ? `<b class="tick">✓${n > 1 ? n : ''}</b>` : sites ? '<b class="tick site">🏗️</b>' : ''}${asked ? '<b class="ask">🙋</b>' : ''}<span class="nm">${d.name}</span><span class="st">${st}</span></button>`;
    }).join('') + (next && c.tool !== 'road' ? `<div class="bb-more">🔒 More at<br><b>${next}</b> residents</div>` : '');
    if (html !== this._cards || reset) { this._cards = html; const sl = reset ? 0 : this.cards.scrollLeft; this.cards.innerHTML = html || '<div class="bb-more">Nothing here yet.<br>Grow the town.</div>'; this.cards.scrollLeft = sl; }
  }
  /** A card picked: that's the tool now (or say why not). */
  choose(k) {
    const g = this.game, c = ALL.find((q) => q.k === this.cat), pop = g.population.count(); if (!c) return;
    if (c.tool === 'road') { if ((k === 'paved' && pop < 15) || (k === 'plaza' && pop < 10)) { Sfx.play('deny'); g.ui.toast(`${k === 'paved' ? 'Paving' : 'A plaza'} needs ${k === 'paved' ? 15 : 10} residents.`); return; } this.roadSub = k; g.god.setTool('road', k); }
    else if (k.startsWith('track:')) g.god.setTool('track', k.slice(6));
    else {
      const d = BUILDINGS[k], e = g.economy, p = e.permits[k];
      if (!e.isUnlocked(k)) { Sfx.play('deny'); const box = g.mail.box; g.ui.toast(p === 'pending' ? `The ${d.name}'s permit is with the Council. They reply by morning.` : pop < d.permit.pop ? `The ${d.name} needs ${d.permit.pop} residents first (you have ${pop}).` : box ? `The ${d.name} needs a permit: fill in a form at the Postbox (walk Sam there and press E).` : 'Permits go by post: build a Postbox first (Civic), then fill in a form there.', 4200); if (box && pop >= d.permit.pop && p !== 'pending' && g.markers) g.markers.add(box.cx, box.cz, '📮', 'Postbox: permit forms', 120); return; }
      g.god.setTool(c.tool, k);
    }
    Sfx.play('ui'); this.drawStrip(); this.sel = this.items().indexOf(k);
  }
  // ---------- what a building is ----------
  /** brief: the hover note (name, cost, what for); otherwise the whole story, which stays until closed. */
  showInfo(k, anchor, brief) {
    const g = this.game, I = this.info; let h = '';
    if (ROADS.some((r) => r[0] === k)) { const r = ROADS.find((q) => q[0] === k); h = `<div class="bi-head"><b>${r[1]}</b></div><p>${r[3]}</p>`; brief = true; }
    else if (k.startsWith('track:')) { const t = TRACKS.find((q) => 'track:' + q[0] === k); h = `<div class="bi-head"><b>${t[1]}</b></div><p>${t[2]}. Lay it between stations, then a train, a monorail or a cable car runs on it.</p>`; brief = true; }
    else {
      const d = BUILDINGS[k]; if (!d) return; const e = g.economy, n = g.buildings.count(k), sites = g.buildings.count(k, false) - n, p = e.permits[k], pop = g.population.count(), url = this.previews.get(k);
      const permit = e.isUnlocked(k) ? '<span class="ok">Permit granted</span>' : p === 'pending' ? 'Permit form sent: the Council replies by morning' : pop < d.permit.pop ? `Needs <b>${d.permit.pop}</b> residents (you have ${pop}), then a permit (${fmtMoney(d.permit.cost)}, by post)` : `Needs a permit: <b>${fmtMoney(d.permit.cost)}</b>, a form at the Postbox`;
      const jobs = Object.entries(d.jobs || {}).map(([r, c]) => `${c} ${(ROLES[r] && ROLES[r].name || r).toLowerCase()}${c > 1 ? 's' : ''}`).join(', ');
      const asked = g.flags.asks && g.flags.asks[k] && g.flags.asks[k].length;
      if (brief) h = `<div class="bi-head"><b>${d.name}</b>${n ? `<span class="have">✓ ${n} in town</span>` : ''}</div><p>${purposeOf(k, d)}</p><div class="bi-cost">${e.isUnlocked(k) ? mats(d.mat) || 'Free' : permit}</div><small class="bi-more">Right-click for more</small>`;
      else h = `<button class="bi-x" data-x="1">✕</button><div class="pv big ${url ? 'ok' : ''}" ${url ? `style="background-image:url(${url})"` : ''}><i class="em">${ICON[k] || '🏠'}</i></div>
        <div class="bi-head"><b>${d.name}</b><span class="cat">${CAT_ICON[(TOOL_MENUS.build.find(([, l]) => l.includes(k)) || ['Parks'])[0]] || ''} ${(TOOL_MENUS.build.find(([, l]) => l.includes(k)) || [TOOL_MENUS.util.includes(k) ? 'Utilities' : 'Parks'])[0]}</span></div>
        ${d.blurb ? `<p class="blurb">${d.blurb}</p>` : ''}<p>${purposeOf(k, d)}</p>
        <dl>${d.beds ? `<dt>Homes</dt><dd>${d.beds} ${d.beds > 1 ? 'people' : 'person'}</dd>` : ''}${jobs ? `<dt>Jobs</dt><dd>${jobs}</dd>` : ''}<dt>To build</dt><dd>${matText(d.mat) || 'nothing: free'}${d.work ? ` · ${d.work < 40 ? 'quick' : d.work < 120 ? 'a day or two' : 'a big job'} for the builders` : ''}</dd>
        <dt>Size</dt><dd>${d.w * 4} × ${d.d * 4} m${d.floors > 1 ? `, ${d.floors} storeys` : ''}</dd><dt>Permit</dt><dd>${permit}</dd><dt>In town</dt><dd>${n ? `${n} built` : 'none yet'}${sites ? ` · ${sites} being built` : ''}${asked ? ` · 🙋 ${asked} ${asked > 1 ? 'people have' : 'person has'} asked for one` : ''}</dd></dl>`;
    }
    I.innerHTML = h; I.dataset.k = k; I.classList.toggle('brief', !!brief); I.classList.remove('hidden');
    const r = anchor.getBoundingClientRect(), w = I.offsetWidth, sh = this.strip.getBoundingClientRect(); I.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + r.width / 2 - w / 2)) + 'px'; I.style.bottom = (innerHeight - sh.top + 10) + 'px';
  }
  hideInfo() { this.info.classList.add('hidden'); this.info.dataset.k = ''; }
  // ---------- every frame ----------
  update(dt, inp) {
    const g = this.game, show = g.mode === 'god' && g.started && !g.ending && !g.netVisitor && !(g.cutscene && g.cutscene.live) && !(g.introScene && g.introScene.live);
    this.el.classList.toggle('hidden', !show); if (!show) { this.hideInfo(); return; }
    this.previews.step();
    const c = ALL.find((q) => q.k === this.cat), T = g.god.tool.id;
    if (c && !PANELS.includes(c) && c.tool !== T && !(c.k === 'Transport' && T === 'track')) { this.cat = null; this.strip.classList.add('hidden'); this.hideInfo(); this.drawRow(); }   // (the tool was put down another way: Esc, or a right-click)
    if (c && PANELS.includes(c) && !g.ui.plan.open) { this.cat = null; this.drawRow(); }
    if ((this.t -= dt) <= 0) { this.t = 0.5; this.drawRow(); if (this.cat && !this.strip.classList.contains('hidden')) this.drawStrip(); }
  }
  /** The controller, when no menu has it: L1/R1 category, D-pad left/right through the cards, □ the work queue. */
  pad(P) {
    const g = this.game; if (P.hitB[5] || P.hitB[4]) { this.cycle(P.hitB[5] ? 1 : -1); return; }
    const L = this.items(); if (!L.length || !(P.hitB[14] || P.hitB[15])) return;
    const cur = this.sel >= 0 ? this.sel : L.indexOf(g.god.tool.sub), i = cur < 0 ? (P.hitB[15] ? 0 : L.length - 1) : (cur + (P.hitB[15] ? 1 : -1) + L.length) % L.length; this.choose(L[i]); this.sel = i;
    const card = this.cards.querySelector(`.bb-card[data-k="${L[i]}"]`); if (card) { card.scrollIntoView({ block: 'nearest', inline: 'center' }); this.showInfo(L[i], card, true); }
  }
}
