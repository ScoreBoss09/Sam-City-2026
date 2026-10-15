import * as THREE from 'three';
import { MATERIALS, BUILD_MATS, ROLES, GATHER, BUILDINGS } from '../data/buildings.js';
import { TILE } from '../config.js';

/**
 * The town on one page: people and homes, who works at what (and how far they walk to it), every material's stock,
 * what comes in and goes out a day, and what the whole build queue still needs. The same sums drive the warning
 * badge on the town panel (hover it to see what's wrong, click for this page) and the god-mode overlay that shows
 * where one trade's workers are, where they live and where they work.
 */
const MAKER = { timber: 'lumbercamp', stone: 'quarry', brick: 'brickworks', glass: 'glassworks', steel: 'foundry', food: 'farm' };
const plural = (n) => (/man$/i.test(n) ? n.replace(/man$/i, 'men') : n + 's').toLowerCase(), r1 = (v) => (v >= 10 || v === 0 ? Math.round(v) : Math.round(v * 10) / 10);

export class Overview {
  constructor(game) { this.game = game; this.t = 0; this.data = null; this.role = null; this.grp = null; this.dots = []; this.tex = {}; }
  /** Everything the page and the badge need, worked out fresh. */
  compute() {
    const g = this.game, P = g.population, B = g.buildings, E = g.economy, done = B.list.filter((b) => b.state === 'done');
    const res = P.adults(), kids = P.sims.filter((s) => s.kind === 'child' && !s.remove).length, visitors = P.sims.filter((s) => s.kind === 'visitor' && !s.remove).length;
    let beds = 0, used = 0; for (const b of done) if (b.def.beds) { beds += b.def.beds; used += b.residents.length; }
    const homeless = res.filter((s) => !s.home).length, idle = res.filter((s) => !s.workplace && s.age >= 16 && s.age < 66).length;
    // jobs by trade
    const roles = {};
    for (const b of done) for (const [r, n] of Object.entries(b.def.jobs || {})) { const o = roles[r] || (roles[r] = { role: r, jobs: 0, filled: 0, atWork: 0, walk: 0, places: 0 }); o.jobs += n; o.places++; }
    for (const s of res) { if (!s.workplace || !s.role) continue; const o = roles[s.role] || (roles[s.role] = { role: s.role, jobs: 0, filled: 0, atWork: 0, walk: 0, places: 0 }); o.filled++; if (s.activity === 'work') o.atWork++; if (s.home) o.walk += Math.hypot(s.home.cx - s.workplace.cx, s.home.cz - s.workplace.cz); }
    for (const o of Object.values(roles)) { o.walk = o.filled ? o.walk / o.filled : 0; o.name = (ROLES[o.role] && ROLES[o.role].name) || o.role; o.mat = GATHER[o.role] ? GATHER[o.role].mat : null; }
    // materials: in store, in and out a day, and what the work queue still needs
    const need = {}; for (const m of Object.keys(MATERIALS)) need[m] = 0;
    for (const s of B.list) if (s.state === 'site' || s.upgradeOf || s.need) { if (!s.need || s.state === 'done' && !s.upgradeOf) continue; for (const [m, n] of Object.entries(s.need)) need[m] += Math.max(0, n - ((s.have && s.have[m]) || 0)); }
    for (const p of g.roadPlans.list()) if (p.type >= 2 && !p.paid) need.stone++;
    const mats = Object.keys(MATERIALS).map((m) => {
      const d = E.perDay(m), u = E.perDay(m, 'used'), made = Math.max(d.avg, d.yesterday), use = Math.max(u.avg, u.yesterday), stock = Math.floor(E.stock[m] || 0);
      const makers = Object.values(roles).filter((o) => o.mat === m), short = need[m] - stock, days = short > 0 ? (made > 0 ? short / made : Infinity) : 0;
      return { m, name: MATERIALS[m].name, stock, made, use, need: need[m], short, days, makers };
    });
    // what's wrong
    const warn = [];
    for (const r of mats) {
      if (r.m === 'food') { const per = Math.max(r.use, P.count() * 0.6); if (per > 0 && r.stock < per * 1.5) warn.push({ k: 'food', text: `Food is running low: ${r.stock} left, about ${r1(per)} eaten a day.${r.made ? ` ${r1(r.made)} a day coming in.` : ' Nothing coming in.'} More farms, foragers or fishers, or buy food at the Lift.` }); continue; }
      if (!BUILD_MATS.includes(r.m) || r.short <= 0 || r.days < 1.5) continue;
      const mk = r.makers.reduce((a, o) => ({ jobs: a.jobs + o.jobs, filled: a.filled + o.filled }), { jobs: 0, filled: 0 }), where = BUILDINGS[MAKER[r.m]];
      const why = !mk.jobs ? (where ? ` No ${where.name} yet.` : '') : mk.filled < mk.jobs ? ` ${mk.jobs - mk.filled} of the ${mk.jobs} jobs making it are empty.` : '';
      warn.push({ k: r.m, text: `${r.name} is holding up building: the work queue needs ${r.need}, there's ${r.stock} in store, ${r.made ? `about ${r1(r.made)} a day coming in (${r.days === Infinity ? 'never' : Math.ceil(r.days) + ' days'} to catch up)` : 'and none coming in'}.${why} Buy some at the Lift, or build more to make it.` });
    }
    if (homeless) warn.push({ k: 'homes', text: `${homeless} ${homeless === 1 ? 'person has' : 'people have'} no home. Build more houses (${beds - used} beds free).` });
    { const empty = Object.values(roles).reduce((a, o) => a + Math.max(0, o.jobs - o.filled), 0); if (empty >= 3 && !idle && beds - used <= 1) warn.push({ k: 'jobs', text: `${empty} jobs are empty and everybody's working: the town needs more people, so more homes.` }); }
    if (E.funds < 0) warn.push({ k: 'funds', text: 'The town is overdrawn: sell goods at the Lift, raise the rates or borrow.' });
    for (const o of Object.values(roles)) if (o.filled >= 2 && o.walk > 110) warn.push({ k: 'walk:' + o.role, text: `The ${plural(o.name)} walk ${Math.round(o.walk)} m to work on average: homes near their work would get more done.` });
    return (this.data = { res: res.length, kids, visitors, beds, used, homeless, idle, roles: Object.values(roles).sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name)), mats, warn, builders: res.filter((s) => s.role === 'builder').length, busy: res.filter((s) => s.role === 'builder' && s.job).length });
  }
  update(dt) {
    const g = this.game; if (!g.started) return;
    if ((this.t -= dt) <= 0) { this.t = 2; this.compute(); this.badge(); }
    if (this.grp) this.follow();
  }
  /** The round warning badge on the town panel (hover: what's wrong; click: the town page). */
  badge() {
    const el = document.getElementById('h-warn'), pop = document.getElementById('h-warnpop'); if (!el) return; const W = this.data.warn;
    el.classList.toggle('hidden', !W.length || this.game.netVisitor); el.textContent = W.length > 1 ? W.length : '!';
    if (pop) pop.innerHTML = W.map((w) => `<div>⚠️ ${w.text}</div>`).join('') + '<small>Click for the town overview.</small>';
  }
  // ---- where one trade's people are, live and work (god mode)
  toggle(role) { if (this.role === role) return this.hide(); this.hide(); this.role = role; this.build(); }
  hide() { const g = this.game; if (this.grp) { g.scene.remove(this.grp); this.grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.isSprite) o.material.dispose(); }); for (const d of this.dots) d.sp.material.dispose(); } this.grp = null; this.dots = []; this.role = null; }
  icon(ch, ring) {
    const k = ch + ring; if (this.tex[k]) return this.tex[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = 'rgba(16,24,40,.9)'; x.beginPath(); x.arc(32, 32, 27, 0, Math.PI * 2); x.fill(); x.strokeStyle = ring; x.lineWidth = 5; x.stroke();
    x.font = '30px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (this.tex[k] = t);
  }
  build() {
    const g = this.game, grp = new THREE.Group(); grp.name = 'overview:' + this.role; const R = ROLES[this.role], col = '#' + ((R && R.shirt) || 0xffcc33).toString(16).padStart(6, '0');
    const people = g.population.sims.filter((s) => s.role === this.role && !s.remove), homes = new Set(), works = new Set(), seg = [];
    const pin = (x, z, ch, ring, s = 4.5, y = 9) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon(ch, ring), depthTest: false, transparent: true })); sp.scale.set(s, s, 1); sp.position.set(x, y, z); sp.renderOrder = 31; grp.add(sp); return sp; };
    for (const s of people) {
      this.dots.push({ s, sp: pin(s.x, s.z, '●', col, 2.4, 3.2) });
      if (s.home && !homes.has(s.home)) { homes.add(s.home); pin(s.home.cx, s.home.cz, '🏠', '#7be08a'); }
      if (s.workplace && !works.has(s.workplace)) { works.add(s.workplace); pin(s.workplace.cx, s.workplace.cz, '⚒️', '#ffb24a', 5.5, 11); }
      if (s.home && s.workplace) seg.push(s.home.cx, 1.2, s.home.cz, s.workplace.cx, 1.2, s.workplace.cz);
    }
    if (seg.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)); const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.75, depthTest: false })); ln.renderOrder = 30; grp.add(ln); }
    g.scene.add(grp); this.grp = grp; this.count = { people: people.length, homes: homes.size, works: works.size };
    g.ui.toast(`${plural((R && R.name) || this.role).replace(/^./, (c) => c.toUpperCase())}: ${people.length} (● where they are now), ${homes.size} homes (🏠), ${works.size} workplaces (⚒️). Open the town page again to hide.`, 4200);
  }
  follow() {
    const g = this.game; this.grp.visible = g.mode === 'god';
    for (const d of this.dots) { const s = d.s; d.sp.visible = !s.remove && !s.hidden; d.sp.position.set(s.x, 3.2 + (s.rideY || 0), s.z); }
  }
  /** The town page (in the planning menu). */
  html() {
    const D = this.data || this.compute(), f = r1, g = this.game;
    let h = `<div class="jobsum"><span>Residents <b>${D.res}</b>${D.kids ? ` + ${D.kids} children` : ''}${D.visitors ? ` · ${D.visitors} visiting` : ''}</span><span>Beds <b>${D.used}/${D.beds}</b> (${D.beds - D.used} free)</span><span>No home <b class="${D.homeless ? 'bad' : ''}">${D.homeless}</b></span><span>Out of work <b>${D.idle}</b></span><span>Builders <b>${D.busy}/${D.builders}</b> busy</span></div>`;
    h += D.warn.length ? D.warn.map((w) => `<div class="note bad">⚠️ ${w.text}</div>`).join('') : '<div class="note">✓ Nothing is holding the town up.</div>';
    h += '<h3>Materials</h3><table class="pl"><tr><th>Material</th><th>In store</th><th>In a day</th><th>Used a day</th><th>Work queue needs</th><th>Made by</th></tr>';
    for (const r of D.mats) {
      const mk = r.makers.map((o) => `${o.filled}/${o.jobs} ${plural(o.name)}`).join(', ') || '—', st = r.short > 0 ? `<td class="bad">${r.need}<br><small>short by ${r.short}${r.made ? `, ${r.days === Infinity ? '' : Math.ceil(r.days) + ' days'}` : ''}</small></td>` : `<td class="${r.need ? 'ok' : ''}">${r.need || '—'}</td>`;
      h += `<tr><td>${r.name}</td><td>${r.stock}</td><td>+${f(r.made)}</td><td>−${f(r.use)}</td>${st}<td>${mk}</td></tr>`;
    }
    h += '</table><h3>Who works at what</h3><table class="pl"><tr><th>Job</th><th>Filled</th><th>At work now</th><th>Walk to work</th><th></th></tr>';
    for (const o of D.roles) h += `<tr><td>${o.name}${o.mat ? ` <small>(${MATERIALS[o.mat].name.toLowerCase()})</small>` : ''}</td><td class="${o.filled < o.jobs ? 'bad' : ''}">${o.filled}/${o.jobs}</td><td>${o.atWork}</td><td>${o.filled ? Math.round(o.walk) + ' m' : '—'}</td><td><button data-a="overlay" data-k="${o.role}" class="${this.role === o.role ? 'on' : ''}">${this.role === o.role ? 'Hide' : '🗺️ Show on map'}</button></td></tr>`;
    h += '</table>'; void g; return h;
  }
  /** One line for the top of the work queue: everything still to be delivered, against what's in store. */
  queueLine() {
    const D = this.data || this.compute(), parts = D.mats.filter((r) => r.need > 0).map((r) => `<span class="${r.short > 0 ? 'bad' : 'ok'}">${r.name} ${r.need}<small> (${r.stock} in store)</small></span>`);
    return parts.length ? `<div class="pnote qneed">Still needed for everything queued: ${parts.join(' · ')}</div>` : '';
  }
}
void TILE;
