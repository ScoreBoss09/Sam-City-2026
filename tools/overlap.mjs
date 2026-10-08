// node tools/overlap.mjs -> counts sims standing inside each other in the demo city over a day
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } }); const logs = []; p.on('console', (m) => { if (m.text().startsWith('t')) console.log(m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.4&noraids'); await p.waitForTimeout(800);
console.log(await p.evaluate(() => { const g = window.__game; g.clock.speed = 1; let worst = 0, samples = 0, total = 0;
  for (let k = 0; k < 48; k++) { g.advance(5); const L = g.population.sims.filter((s) => !s.hidden && !s.sitting && s.pose !== 'sleep' && !(s.down > 0)); let n = 0;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (L[i].inside === L[j].inside && Math.hypot(L[i].x - L[j].x, L[i].z - L[j].z) < 0.35) n++; worst = Math.max(worst, n); total += n; samples++; if (n > 3) console.log("t" + k, n, JSON.stringify(L.filter((a) => L.some((b2) => b2 !== a && b2.inside === a.inside && Math.hypot(a.x - b2.x, a.z - b2.z) < 0.35)).slice(0, 6).map((s) => [s.activity, s.inside ? s.inside.id : "-", s.kind, s.phase, s.path.length, s.chat ? 1 : 0, s.frozen ? 1 : 0, s.x.toFixed(1), s.z.toFixed(1)]))); }
  return `overlapping pairs (<0.35 m): avg ${(total / samples).toFixed(2)}, worst ${worst}, sims ${g.population.sims.length}`; }));
console.log(logs.join('\n')); await b.close();
