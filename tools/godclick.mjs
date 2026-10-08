import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.7'); await p.waitForTimeout(700);
const proj = (x, z) => p.evaluate(([x, z]) => { const g = window.__game, v = new (g.camera.position.constructor)(x, 0, z).project(g.camera), r = document.getElementById('view').getBoundingClientRect(); return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height]; }, [x, z]);
await p.waitForTimeout(300);
await p.evaluate(() => { const g = window.__game; g.clock.speed = 0; g.god.dist = 80; g.god.target.set(88, 0, 70); });
await p.click('button.tool[data-t="build"]'); await p.waitForTimeout(300);
console.log('submenu tabs', await p.evaluate(() => [...document.querySelectorAll('#submenu .subtab')].map((e) => e.textContent).join(',')), '| items', await p.evaluate(() => [...document.querySelectorAll('#submenu .sub')].map((e) => e.textContent.replace(/\s+/g, ' ')).join(' ; ')));
await p.click('button.sub[data-s="hut"]'); await p.waitForTimeout(300);
const [sx, sz] = await proj(27 * 4 + 2, 17 * 4 + 2); await p.mouse.move(sx, sz); await p.waitForTimeout(500);
console.log('hover', await p.evaluate(() => document.getElementById('hover').textContent));
await p.screenshot({ path: S + 'gc1.png' });
await p.mouse.click(sx, sz); await p.waitForTimeout(500);
console.log('placed', await p.evaluate(() => window.__game.buildings.list.filter((b) => b.id === 'hut').map((b) => [b.state, b.x0, b.z0])));
// locked item feedback
await p.click('button.subtab[data-tab="Industry"]'); await p.click('button.sub[data-s="quarry"]'); await p.mouse.move(sx + 80, sz + 20); await p.waitForTimeout(400);
console.log('locked hover', await p.evaluate(() => document.getElementById('hover').textContent));
// roads: dirt tool drag
await p.click('button.tool[data-t="road"]'); await p.waitForTimeout(200); const [a1, a2] = await proj(27 * 4 + 2, 15 * 4 + 2), [c1, c2] = await proj(31 * 4 + 2, 15 * 4 + 2);
await p.mouse.move(a1, a2); await p.mouse.down(); await p.mouse.move(c1, c2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
console.log('road tiles x27..31', await p.evaluate(() => [27, 28, 29, 30, 31].map((x) => window.__game.world.road[window.__game.world.idx(x, 15)]).join('')), 'funds', await p.evaluate(() => window.__game.economy.funds));
await p.screenshot({ path: S + 'gc2.png' });
console.log(logs.join('\n')); await b.close();
