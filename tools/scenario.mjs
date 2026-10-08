import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5'); await p.waitForTimeout(1000);
const ev = (f) => p.evaluate(f);
console.log(await ev(() => {
  const g = window.__game; g.clock.speed = 1;
  for (const k of ['cottage', 'contractor', 'shop', 'clinic', 'power']) g.economy.permits[k] = 'approved';
  g.economy.orderMaterial('timber', 25); g.economy.orderMaterial('brick', 25); g.economy.orderMaterial('glass', 10); g.economy.orderMaterial('steel', 10);
  g.advance(20); return JSON.stringify({ stock: g.economy.stock, trucks: g.logistics.trucks.length, funds: g.economy.funds });
}));
console.log(await ev(() => {
  const g = window.__game, B = g.buildings;
  const r1 = B.evaluate('cottage', 27, 17, 0); const c1 = r1.ok ? B.place('cottage', r1.x0, r1.z0, r1.rot) : null;
  const r2 = B.evaluate('contractor', 14, 17, 0); const c2 = r2.ok ? B.place('contractor', r2.x0, r2.z0, r2.rot) : null;
  window.sites = [c1, c2];
  return JSON.stringify({ r1: [r1.ok, r1.reason, r1.x0, r1.z0, r1.rot], r2: [r2.ok, r2.reason, r2.x0, r2.z0, r2.rot] });
}));
console.log(await ev(() => {
  const g = window.__game; // act as the player: deliver and build
  for (const s of window.sites) { for (const m of Object.keys(s.need)) { const n = s.need[m]; g.economy.stock[m] -= n; g.buildings.deliver(s, m, n); } }
  for (const s of window.sites) { g.buildings.addWork(s, 200); }
  return JSON.stringify(window.sites.map((s) => [s.id, s.state, s.progress]));
}));
console.log(await ev(() => { const g = window.__game; g.advance(120); return JSON.stringify({ pop: g.population.count(), sims: g.population.sims.length, builders: g.population.sims.filter((s) => s.role === 'builder').length, obj: g.story.objective, free: g.population.freeBeds(), vac: g.population.vacancies().length }); }));
await p.evaluate(() => { const g = window.__game; g.setMode('god'); g.clock.hour = 11; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'sc1.png' });
console.log(logs.slice(0, 20).join('\n')); await b.close();
