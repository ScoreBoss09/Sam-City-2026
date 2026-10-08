import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.7'); await p.waitForTimeout(700);
const ev = (f, a) => p.evaluate(f, a);
// 1. go to the forest edge and chop with real key presses
console.log('tree spot', await ev(() => { const g = window.__game, R = g.resources; g.clock.speed = 0; let best = null, bd = 1e9; for (const t of g.terrain.trees) { const st = R.standPoint(t, t); if (!st) continue; const d = Math.hypot(st.x - 80, st.z - 40); if (d < bd) { bd = d; best = { t, st }; } }
  window.T = best.t; const st = best.st; g.player.teleport(st.x, st.z); g.player.yaw = Math.atan2(-(best.t.x - st.x), -(best.t.z - st.z)); g.player.heading = Math.atan2(best.t.x - st.x, best.t.z - st.z); g.player.pitch = -0.1; return [st.x.toFixed(1), st.z.toFixed(1), best.t.x.toFixed(1), best.t.z.toFixed(1)]; }));
await p.waitForTimeout(500); console.log('target', await ev(() => { const t = window.__game.player.target; return t && [t.kind, t.text]; }));
await p.keyboard.down('KeyE'); await p.waitForTimeout(3500); await p.keyboard.up('KeyE');
console.log('carry after chop', await ev(() => JSON.stringify(window.__game.player.carry)));
await p.screenshot({ path: S + 'pr1.png' });
// 2. store at stockyard
await ev(() => { const g = window.__game, y = g.depot; const pk = y.spots.pickup[0]; g.player.teleport(pk.x, pk.z + 1.2); g.player.yaw = 0; });
await p.waitForTimeout(400); await p.keyboard.press('KeyE'); await p.waitForTimeout(400);
console.log('stock timber', await ev(() => window.__game.economy.stock.timber), 'stored flag', await ev(() => window.__game.flags.stored));
// 3. economy loop: place hut + forager hut + campfire by API, let sims run
console.log(await ev(() => { const g = window.__game, B = g.buildings; g.clock.speed = 1; g.economy.stock.timber = 80;
  for (let x = 12; x <= 26; x++) g.world.addRoad(x, 21, 1); for (let z = 15; z <= 21; z++) { g.world.addRoad(14, z, 1); g.world.addRoad(26, z, 1); }
  const put = (id, x, z) => { const r = B.evaluate(id, x, z, 0); return r.ok ? B.place(id, r.x0, r.z0, r.rot) : null; };
  const sites = [put('hut', 16, 19), put('hut', 24, 19), put('forager', 12, 19), put('hut', 28, 17)].filter(Boolean);
  for (const s of sites) { for (const m of Object.keys(s.need)) { g.economy.stock[m] -= s.need[m]; B.deliver(s, m, s.need[m]); } B.addWork(s, 999); }
  g.advance(100); return JSON.stringify({ sites: sites.length, done: sites.filter((s) => s.state === 'done').length, pop: g.population.count(), sims: g.population.sims.length }); }));
for (let i = 0; i < 6; i++) console.log(await ev(() => { const g = window.__game; g.advance(80); const c = {}; for (const s of g.population.residents()) { const k = s.role || s.kind; c[k] = (c[k] || 0) + 1; } return JSON.stringify({ t: g.clock.hhmm, d: g.clock.totalDays, pop: g.population.count(), roles: c, food: Math.floor(g.economy.stock.food), timber: Math.floor(g.economy.stock.timber), gathered: g.economy.gathered, hung: g.population.residents().map((s) => Math.round(s.hunger)).join(',') }); }));
console.log(logs.slice(0, 12).join('\n')); await b.close();
