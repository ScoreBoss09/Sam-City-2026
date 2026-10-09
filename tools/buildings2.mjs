// node tools/buildings2.mjs -> every new building builds + renders, hidden unlocks, Lift deliveries, emotes, phone, bookies, adult talk
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
// hidden menus at pop 0
console.log('menu at pop 0:', await ev(() => { const g = window.__game; g.setMode('god'); g.god.setTool('build', null); g.ui.buildTab = 'Commerce'; g.ui.openSub('build'); return document.getElementById('submenu').innerText.replace(/\n+/g, ' | '); }));
console.log('visible count', await ev(() => { const g = window.__game, E = g.economy; return Object.keys(E.permits).filter((k) => E.visible(k)).length; }));
// place every new building instantly near the lift door
const ids = ['bungalow', 'semi', 'flats', 'allotment', 'bakery', 'chippy', 'newsagent', 'launderette', 'video', 'bookies', 'postoffice', 'villagehall', 'church', 'phonebox', 'busstop', 'bandstand', 'tavern'];
console.log('placed', await ev((ids) => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 8), tz = Math.floor(d.z / 8); g.clock.hour = 10;
  for (let z = tz; z < tz + 26; z++) { g.world.addRoad(tx, z, 1); } for (let x = tx - 12; x < tx + 12; x++) { g.world.addRoad(x, tz + 8, 1); g.world.addRoad(x, tz + 16, 1); g.world.addRoad(x, tz + 24, 1); }
  window.__bs = {}; const out = [];
  for (const id of ids) { let done = null; for (let r = 1; r < 14 && !done; r++) for (const [dx, dz] of [[r, 0], [-r, 0], [r, 3], [-r, 3], [r, 6], [-r, 6], [r, 9], [-r, 9], [r, 12], [-r, 12], [r, 15], [-r, 15], [r, 18], [-r, 18]]) { const ev = B.evaluate(id, tx + dx, tz + dz, 0); if (ev.ok) { done = B.place(id, ev.x0, ev.z0, ev.rot, { instant: true }); break; } } window.__bs[id] = done; out.push(id + (done ? '' : ':FAIL')); }
  return out.join(' '); }, ids));
await p.waitForTimeout(400);
await ev(() => { const g = window.__game, c = window.__bs.church; g.god.focus ? g.god.focus(c.cx, c.cz) : 0; });
await p.screenshot({ path: S + 'b2_god.png' });
// economy: income + produce
console.log('income/produce', await ev(() => { const g = window.__game, E = g.economy; const f0 = E.stock.food; g.clock.hour = 12; E.hourly(); const joy = g.buildings.townJoy(); return `food +${(E.stock.food - f0).toFixed(1)} joy ${joy.toFixed(2)}`; }));
// lift delivery without stockyard -> pile on the dock
await ev(() => { const g = window.__game; g.economy.funds = 5000; g.economy.orderMaterial('timber', 20); for (let i = 0; i < 10; i++) g.economy.update(1); });
await ev(() => { const g = window.__game; g.setMode('sim'); g.player.teleport(g.lift.doorOut.x + 6, g.lift.doorOut.z + 6); g.player.yaw = Math.PI * 0.75; });
for (let i = 0; i < 12; i++) { await p.waitForTimeout(500); }
console.log('lift cage busy?', await ev(() => window.__game.lift.ext.busy()), 'piles', await ev(() => JSON.stringify(window.__game.piles.list.map((q) => q.items))), 'queue', await ev(() => window.__game.logistics.queue.length));
await p.screenshot({ path: S + 'b2_lift.png' });
// intercom prompt
console.log('intercom', await ev(() => { const g = window.__game, L = g.lift, [hx, hz] = L.toWorld(L.ext.hatch.x, L.ext.hatch.z); g.player.teleport(hx, hz + 0.6); return 1; }));
await p.waitForTimeout(400); console.log('  prompt:', await ev(() => document.getElementById('prompt-text').textContent));
// emotes + jump
await ev(() => { const g = window.__game, c = window.__bs.bandstand; g.player.teleport(c.cx, c.cz + 6); g.player.yaw = 0; g.player.third = true; });
for (const k of ['Digit1', 'Digit5', 'Space']) { await p.keyboard.press(k); await p.waitForTimeout(500); console.log(k, await ev(() => [window.__game.player.emoteName, window.__game.player.anim.upper, window.__game.player.anim.lower, (window.__game.player.jumpY || 0).toFixed(2)].join('/'))); }
await p.keyboard.press('Digit1'); await p.waitForTimeout(700); await p.screenshot({ path: S + 'b2_dance.png' });
// phone + bet
await ev(() => { const g = window.__game, c = window.__bs.phonebox; g.player.teleport(c.cx, c.cz + 1.4); g.player.yaw = 0; }); await p.waitForTimeout(300);
console.log('phone prompt', await ev(() => document.getElementById('prompt-text').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(2200); console.log('  ', await ev(() => document.getElementById('toast').textContent));
await ev(() => { const g = window.__game, c = window.__bs.bookies, v = c.spots.visit[0]; g.player.teleport(v.x, v.z); }); await p.waitForTimeout(300);
console.log('bet prompt', await ev(() => document.getElementById('prompt-text').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(3200); console.log('  ', await ev(() => document.getElementById('toast').textContent));
// interiors
for (const id of ['church', 'chippy', 'launderette']) { await ev((id) => { const g = window.__game, c = window.__bs[id]; g.player.teleport(c.cx, c.cz + 1); g.player.third = true; g.player.yaw = 0; g.player.pitch = -0.3; }, id); await p.waitForTimeout(600); await p.screenshot({ path: S + 'b2_in_' + id + '.png' }); }
// adult talk sample
console.log('talk', await ev(() => { const g = window.__game; const s = g.population.makePerson ? null : null; return 'ok'; }));
console.log(logs.join('\n')); await b.close();
