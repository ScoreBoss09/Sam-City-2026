import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.4&noraids'); await p.waitForTimeout(900);
console.log(await p.evaluate(() => { const g = window.__game, w = g.world, out = []; g.setMode('sim'); for (let z = 2; z < 38; z++) for (let x = 2; x < 38; x++) { const i = w.idx(x, z); if (w.terrain[i] !== 3 || w.occ[i]) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.terrain[w.idx(x + dx, z + dz)] === 0) { const [cx, cz] = w.center(x, z); g.player.teleport(cx, cz); g.player.yaw = Math.atan2(-dx, -dz); const t = g.player.findTarget(); out.push(t ? t.kind + ':' + (t.nk || '') + ':' + t.text.slice(0, 30) : 'null'); if (out.length > 6) return out.join(' | '); } } return out.join(' | '); }));
await b.close();
