import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 500 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo'); await p.waitForTimeout(700);
console.log(await p.evaluate(() => { const g = window.__game; g.clock.speed = 1; let ev = []; for (let i = 0; i < 400; i++) { g.advance(30); const r = g.raids; if (r.state !== 'idle' && !ev.length || (ev.length && ev[ev.length-1][1] !== r.count)) ev.push([g.clock.totalDays, r.count, r.state]); } return JSON.stringify({ days: g.clock.totalDays, raids: g.raids.count, ev, pop: g.population.count(), fps: g.fps }); }));
console.log(logs.join('\n')); await b.close();
