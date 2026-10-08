// node tools/raid.mjs [demo|early] -> triggers a raid, logs its progress, saves screenshots raid_*.png
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const mode = process.argv[2] || 'demo';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } });
const logs = []; p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) logs.push(m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto' + (mode === 'demo' ? '&demo' : '') + '&scale=0.9'); await p.waitForTimeout(700);
const info = () => p.evaluate(() => { const g = window.__game, r = g.raids; return { state: r.state, t: Math.round(r.t), stolen: Math.round(r.stolen), raiders: r.raiders.map((x) => [x.rstate, x.hp, x.captured ? 'cap' : x.remove ? 'gone' : x.down > 0 ? 'down' : '', x.weapon]).join(' | '), downSims: g.population.sims.filter((s) => s.down > 0 && s.kind !== 'raider').length, shelter: g.population.sims.filter((s) => s.activity === 'shelter').length, food: Math.round(g.economy.stock.food), guards: g.population.sims.filter((s) => s.kind === 'security' && s.engaged).length }; });
console.log('trigger', await p.evaluate(() => { const g = window.__game; g.clock.speed = 1; g.clock.hour = 11; if (!window.__early) { g.raids.enabled = true; } return g.raids.trigger(); }));
for (let i = 0; i < 12; i++) {
  await p.evaluate(() => window.__game.advance(10)); const s = await info(); console.log(i * 10 + 10, JSON.stringify(s));
  if (i === 2 || i === 5) { await p.evaluate(() => { const g = window.__game, r = g.raids.raiders.find((x) => !x.remove); if (!r) return; g.clock.speed = 0; g.setMode('sim'); g.player.third = true; g.player.teleport(r.x - 2.5, r.z - 2.5, 0); g.player.yaw = Math.atan2(-(r.x - (r.x - 2.5)), -(r.z - (r.z - 2.5))); g.player.pitch = -0.1; }); await p.waitForTimeout(1500); await p.screenshot({ path: S + `raid_${i}.png` }); await p.evaluate(() => { window.__game.clock.speed = 1; }); }
  if (s.state === 'idle') break;
}
console.log(logs.slice(0, 8).join('\n')); await b.close();
