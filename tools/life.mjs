import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.8'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
console.log(await ev(() => {
  const g = window.__game, B = g.buildings; g.clock.speed = 1;
  for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
  g.economy.funds = 900000; g.population.simCap = 60; for (const m of ['timber', 'brick', 'steel', 'glass']) g.economy.stock[m] = 500;
  for (let x = 9; x <= 31; x++) g.world.addRoad(x, 24); for (let z = 15; z <= 24; z++) { g.world.addRoad(25, z); g.world.addRoad(13, z); }
  const place = (id, x, z) => { const r = B.evaluate(id, x, z, 0); return r.ok ? B.place(id, r.x0, r.z0, r.rot, { instant: true }) : null; };
  const out = [place('contractor', 16, 17), place('cottage', 27, 17), place('cottage', 27, 21), place('cottage', 22, 21), place('cottage', 11, 18), place('cottage', 11, 21), place('shop', 17, 21), place('shop', 28, 26), place('office', 20, 27), place('clinic', 15, 26)].map((x) => x && x.id);
  const pk = B.evaluate('park', 20, 18, 0); if (pk.ok) B.place('park', pk.x0, pk.z0, pk.rot, { instant: true });
  g.population.invites = 12; g.population.timer = 0; g.advance(120);
  return JSON.stringify({ out, pop: g.population.count(), sims: g.population.sims.length });
}));
console.log(await ev(() => { const g = window.__game; g.clock.hour = 9.5; g.advance(30); const c = {}; for (const s of g.population.sims) { const k = (s.sleeping ? 'sleep' : s.sitting ? 'sit:' + s.sitting.kind : s.chat ? 'chat' : s.moved ? 'walk' : 'stand') + '/' + s.activity; c[k] = (c[k] || 0) + 1; } return JSON.stringify(c); }));
console.log(await ev(() => { const g = window.__game; g.clock.hour = 20; g.advance(40); const c = {}; for (const s of g.population.sims) { const k = (s.sleeping ? 'sleep' : s.sitting ? 'sit:' + s.sitting.kind : s.chat ? 'chat' : s.moved ? 'walk' : 'stand') + '/' + s.activity; c[k] = (c[k] || 0) + 1; } return JSON.stringify(c); }));
await ev(() => { const g = window.__game; g.clock.hour = 14; g.advance(5); g.clock.speed = 0; g.setMode('sim'); const s = g.population.sims.find((s) => s.kind === 'resident'); g.player.teleport(22 * 4, 20.5 * 4); g.player.yaw = 0; g.player.pitch = -0.3; g.player.camDist = 7; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'life1.png' });
await ev(() => { const g = window.__game; g.clock.hour = 22.5; g.clock.speed = 1; g.advance(70); g.clock.speed = 0; const s = g.population.sims.find((s) => s.sleeping); if (s) { g.player.teleport(s.home.doorIn.x, s.home.doorIn.z); g.player.yaw = Math.PI; } window.sleeper = !!s; });
await p.waitForTimeout(800); await p.screenshot({ path: S + 'life2.png' });
console.log('sleeper', await ev(() => window.sleeper));
console.log(logs.slice(0, 15).join('\n')); await b.close();
