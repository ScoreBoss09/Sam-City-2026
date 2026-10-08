import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
console.log(await p.evaluate(() => { const g = window.__game, B = g.buildings; g.setMode('sim'); for (const it of g.tools.items) { g.tools.take(it); g.player.tools.add(it.id); }
  const d = g.lift.doorOut, tx = Math.floor(d.x / 4), tz = Math.floor(d.z / 4); for (let z = tz; z < tz + 7; z++) g.world.addRoad(tx, z, 1);
  const r = B.evaluate('stockyard', tx + 2, tz + 2, 0); const s = B.place('stockyard', r.x0, r.z0, r.rot);
  g.player.carry = { mat: 'timber', qty: 8 }; g.player.teleport(s.doorOut.x, s.doorOut.z + 0.8);
  const t = g.player.findTarget(); return JSON.stringify({ door: s.doorOut, c: [s.cx, s.cz], fp: [s.x0, s.z0, s.w, s.d], t: t && { kind: t.kind, text: t.text } }); }));
console.log(logs.join('\n')); await b.close();
