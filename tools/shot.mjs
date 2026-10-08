// Headless smoke test + screenshot helper: node tools/shot.mjs <out.png> [js to eval before shot] [wait ms]
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const [out = 'shot.png', script = '', wait = '1500', url = 'http://localhost:8123/index.html?auto'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const logs = []; p.on('console', (m) => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto(url); await p.waitForTimeout(800);
if (script) { const r = await p.evaluate(script); if (r !== undefined) console.log('eval ->', JSON.stringify(r)); }
await p.waitForTimeout(+wait); await p.screenshot({ path: out });
console.log(logs.slice(0, 25).join('\n')); await b.close();
