import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.4'); await p.waitForTimeout(800);
for (let d = 0; d < 6; d++) console.log(await p.evaluate(() => { const g = window.__game; g.clock.speed = 1; const t0 = performance.now(); g.advance(240); const ms = (performance.now() - t0) / 2400; const c = {}; for (const s of g.population.sims) { const k = s.pose === 'sleep' ? 'sleep' : s.sitting ? 'sit' : s.chat ? 'chat' : s.moved ? 'move' : 'idle'; c[k] = (c[k] || 0) + 1; }
  return `d${g.clock.totalDays} ${g.clock.hhmm} sims${g.population.sims.length} pop${g.population.count()} kids${g.population.sims.filter((s) => s.kind === 'child').length} food${Math.floor(g.economy.stock.food)} ${ms.toFixed(2)}ms/step ` + JSON.stringify(c); }));
console.log(await p.evaluate(() => window.__game.messages.log.filter((m) => /couple|friends|family|grown|left|hungry|NO food/.test(m.text)).slice(-8).map((m) => m.text).join('\n')));
console.log('LOGS:', logs.slice(0, 8).join('\n') || 'clean'); await b.close();
