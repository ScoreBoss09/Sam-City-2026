import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
console.log(await ev(() => {
  const g = window.__game, B = g.buildings;
  for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
  g.economy.funds = 500000; g.population.simCap = 60;
  for (const m of ['timber', 'brick', 'steel', 'glass']) g.economy.stock[m] = 200;
  const place = (id, x, z) => { const r = B.evaluate(id, x, z, 0); return r.ok ? B.place(id, r.x0, r.z0, r.rot) : null; };
  const c = place('contractor', 14, 17); B.addWork(c, 0); for (const m of Object.keys(c.need)) { g.economy.stock[m] -= c.need[m]; B.deliver(c, m, c.need[m]); } B.addWork(c, 100);
  // roads for a block
  for (let x = 9; x <= 30; x++) for (const z of [15]) g.world.addRoad(x, z);
  for (let z = 15; z <= 30; z++) g.world.addRoad(26, z);
  const placed = [place('cottage', 28, 17), place('cottage', 28, 21), place('cottage', 24, 21), place('shop', 28, 25), place('power', 22, 25), place('clinic', 15, 13)];
  g.advance(60);
  return JSON.stringify({ placed: placed.map((x) => x && x.id), builders: g.population.sims.filter((s) => s.role === 'builder').length, sites: g.construction.sites.length });
}));
for (let i = 0; i < 4; i++) console.log(await ev(() => { const g = window.__game; g.advance(60); return JSON.stringify({ t: g.clock.hhmm, sites: g.construction.sites.map((s) => [s.id, +s.progress.toFixed(2), Object.entries(s.have).map(([k, v]) => k[0] + v).join('')]), pop: g.population.count(), sims: g.population.sims.length, jobs: g.population.sims.filter((s) => s.job).map((s) => s.job.type + ':' + s.job.step) }); }));
await ev(() => { const g = window.__game; g.advance(600); });
console.log(await ev(() => { const g = window.__game; return JSON.stringify({ t: g.clock.hhmm, done: g.buildings.list.filter((b) => b.state === 'done').length, sites: g.construction.sites.length, pop: g.population.count(), obj: g.story.objective, funds: Math.round(g.economy.funds), perf: g.population.simCap, sleeping: g.population.sims.filter((s) => s.pose === 'sleep').length }); }));
// night + sleeping check
console.log(await ev(() => { const g = window.__game; g.clock.hour = 22.5; g.advance(60); return JSON.stringify({ t: g.clock.hhmm, sleeping: g.population.sims.filter((s) => s.pose === 'sleep').length, total: g.population.sims.length, acts: g.population.sims.map((s) => s.activity).join(',') }); }));
await ev(() => { const g = window.__game; g.setMode('god'); g.god.dist = 110; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'sc2_night.png' });
await ev(() => { const g = window.__game; g.clock.hour = 11; g.advance(1); g.setMode('sim'); const th = g.townhall; g.player.teleport(th.doorIn.x, th.doorIn.z + 0.5, 0); g.player.yaw = Math.atan2(th.doorOut.x - th.doorIn.x, th.doorOut.z - th.doorIn.z) + Math.PI; g.player.pitch = -0.2; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'sc2_hall.png' });
console.log(logs.slice(0, 20).join('\n')); await b.close();
