// node tools/round16.mjs -> builders' work queue order, upgrades (upstairs, Tudor, carts), the planning menu (tabs, ticks, grid navigation) and saving upgrades
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404|GPU stall/.test(m.text())) logs.push('console: ' + m.text()); });
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.5&noraids'); await p.waitForTimeout(1200);
const ev = (f, a) => p.evaluate(f, a); const shot = async (n) => { await p.waitForTimeout(150); await p.screenshot({ path: S + 'r16_' + n + '.png' }); };

console.log('queue', await ev(() => { const g = window.__game, B = g.buildings, w = g.world; g.clock.hour = 8; g.started = true;
  const free = (id) => { for (let z = 4; z < 36; z++) for (let x = 4; x < 36; x++) { const r = B.evaluate(id, x, z, 0); if (r.ok) return r; } return null; };
  const made = []; for (const id of ['cottage', 'bakery', 'semi']) { const r = free(id); if (r) made.push(B.place(id, r.x0, r.z0, r.rot)); }
  const q0 = g.construction.queue().map((q) => q.s ? q.s.id : 'paths').join(' > ');
  g.construction.move(g.construction.queue().find((q) => q.s === made[2]), 'top'); const q1 = g.construction.queue().map((q) => q.s ? q.s.id : 'paths').join(' > ');
  g.advance(40); const builders = g.population.sims.filter((s) => s.role === 'builder'); const onTop = builders.filter((s) => s.job && s.job.site === made[2]).length + ' (' + builders.map((s) => s.job ? s.job.type + ':' + (s.job.site ? s.job.site.id : 'road') : s.activity).join(', ') + ')';
  let t = 0; const doneAt = {}; while (t < 1200 && made.some((m) => m.state !== 'done')) { g.advance(5); t += 5; for (const m of made) if (m.state === 'done' && !doneAt[m.id]) doneAt[m.id] = t; }
  return `${q0}  ->  moved semi to top: ${q1}\n  builders ${builders.length}, on the top job after 40s: ${onTop}; finished at: ${Object.entries(doneAt).map(([k, v]) => k + ' ' + v + 's').join(', ')}`; }));

console.log('upgrades', await ev(() => { const g = window.__game, U = g.upgrades, B = g.buildings; g.clock.hour = 9;
  const home = B.list.find((b) => b.state === 'done' && b.id === 'cottage' && !b.level) || B.list.find((b) => b.state === 'done' && b.def.cat === 'res' && b.def.floors === 1 && !b.level), yard = ['forager', 'lumbercamp', 'quarry', 'fisher'].flatMap((k) => B.byDef(k)).sort((a, b) => b.workers.length - a.workers.length)[0], bldr = B.byDef('contractor')[0];
  for (const x of [home, yard, bldr]) U.order(x); window.__h = home; window.__y = yard;
  let t = 0; while (U.orders.length && t < 1200) { g.advance(5); t += 5; } const r1 = U.order(home); let t2 = 0; while (U.orders.length && t2 < 1200) { g.advance(5); t2 += 5; }
  return `3 upgrades in ${t}s, Tudor ${r1.ok} in ${t2}s: ${home.def.name} lvl ${home.level} wall ${home.def.wall} floors ${home.def.floors} beds ${home.def.beds} (bed spots ${home.spots.bed.length}); ${yard.def.name} lvl ${yard.level} carry x${yard.def.carry}; yard cart ${!!(yard.ext && yard.ext.cart)}; Builders' Yard lvl ${bldr.level} haul ${bldr.def.haul}`; }));
console.log('carts', await ev(() => { const g = window.__game, y = window.__y; g.clock.hour = 9.5; let seen = 0, max = 0; for (let k = 0; k < 120; k++) { g.advance(1); for (const s of y.workers) if (s.cart && s.cart.visible) { seen++; max = Math.max(max, s.carry ? s.carry.qty : 0); window.__c = s; } } return `cart sightings ${seen}, biggest load ${max}`; }));
await ev(() => { const g = window.__game, c = window.__c || window.__y.workers[0]; g.setMode('god'); g.god.target.set(c.x, 0, c.z); g.god.dist = 12; for (let i = 0; i < 8; i++) g.update(0.05); }); await shot('cart');
await ev(() => { const g = window.__game, h = window.__h; g.god.target.set(h.cx, 0, h.cz); g.god.dist = 32; for (let i = 0; i < 8; i++) g.update(0.05); }); await shot('tudor');

// sleeping upstairs
console.log('upstairs', await ev(() => { const g = window.__game, h = window.__h; g.clock.hour = 23; g.advance(30); const up = h.spots.bed.filter((s) => s.upstairs), who = up.map((s) => s.taken).filter((s) => s && s.name); return `${up.length} beds upstairs, ${who.length} taken; sleepers hidden: ${who.filter((s) => s.pose === 'sleep').map((s) => !s.mesh.visible).join(',') || 'nobody asleep yet'}`; }));

// the planning menu
await ev(() => { const g = window.__game; g.clock.hour = 10; g.setMode('god'); g.ui.plan.show('build'); }); await shot('menu_build');
console.log('menu', await ev(() => { const g = window.__game, ui = g.ui, el = document.getElementById('planmenu'); const ticks = el.querySelectorAll('.card .tick').length, cards = el.querySelectorAll('.card').length;
  const btns = [...el.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null), first = btns.findIndex((b) => b.classList.contains('card')), right = ui.navFrom(btns, first, [1, 0]), down = ui.navFrom(btns, first, [0, 1]);
  const pick = (i) => (btns[i].querySelector('b') || btns[i]).textContent.trim();
  return `build tab: ${cards} cards, ${ticks} ticked; nav from "${pick(first)}" right -> "${pick(right)}", down -> "${pick(down)}"; modal ${ui.modalOpen}`; }));
await ev(() => { const g = window.__game; g.ui.plan.cycleTab(1); }); await shot('menu_queue');
await ev(() => { const g = window.__game; g.ui.plan.cycleTab(1); }); await shot('menu_upgrades');
console.log('menu upgrade click', await ev(() => { const g = window.__game, el = document.getElementById('planmenu'), n0 = g.upgrades.orders.length; const btn = el.querySelector('button[data-a="upall"]') || el.querySelector('button[data-a="up1"]'); if (!btn) return 'no upgrade button'; btn.click(); return `orders ${n0} -> ${g.upgrades.orders.length}; queue now ${g.construction.queue().length}`; }));
console.log('place from menu', await ev(() => { const g = window.__game, ui = g.ui; ui.plan.show('build'); ui.plan.cat = 'Parks'; ui.plan.render(); const c = document.querySelector('#planmenu .card[data-a="place"]'); c.click(); return `menu open ${ui.plan.open}, tool ${g.god.tool.id}/${g.god.tool.sub}`; }));

// save + restore keeps upgrades, the order in progress and queue priorities
console.log('save', await ev(async () => { const g = window.__game, Sv = await import('/src/core/Save.js'); g.demoMode = false; const h = window.__h, lvl = h.level, ords = g.upgrades.orders.map((o) => o.def.name).join(','), d = JSON.parse(JSON.stringify(Sv.serialize(g)));
  Sv.restore(g, d); const h2 = g.buildings.list.find((b) => b.x0 === h.x0 && b.z0 === h.z0); return `level ${lvl} -> ${h2.level} (${h2.def.wall}, floors ${h2.def.floors}, beds ${h2.def.beds}); orders "${ords}" -> "${g.upgrades.orders.map((o) => o.def.name).join(',')}"`; }));
console.log(logs.length ? logs.slice(0, 10).join('\n') : 'LOGS: clean'); await b.close();
