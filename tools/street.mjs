// node tools/street.mjs [tag] -> a fixed street of homes and shops for judging the look (day, street level, night)
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/', tag = process.argv[2] || 'x';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); p.on('pageerror', (e) => console.log('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.6&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
console.log(await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 8), tz = Math.floor(d.z / 8) + 8; g.clock.hour = 10.5;
  for (let x = tx - 14; x < tx + 14; x++) g.world.addRoad(x, tz, 2); for (let z = tz - 7; z < tz; z++) g.world.addRoad(tx, z, 2);
  const row = ['cottage', 'semi', 'bungalow', 'townhouse', 'shack', 'cabin', 'chippy', 'newsagent', 'tavern', 'bakery'], out = []; let x = tx - 13;
  for (const id of row) { const def = B.evaluate(id, x, tz - 1, 0); let ok = null; for (let dx = 0; dx < 4 && !ok; dx++) { const e = B.evaluate(id, x + dx + Math.floor((def.w - 1) / 2), tz - Math.ceil(def.d / 2), 0); if (e.ok && e.rot === 0) { ok = B.place(id, e.x0, e.z0, 0, { instant: true }); x = e.x0 + e.w + 0; } } out.push(id + (ok ? '' : ':X')); }
  window.__tz = tz; return out.join(' '); }));
await ev(() => { const g = window.__game, tz = window.__tz; g.setMode('sim'); g.player.third = true; g.player.teleport((g.lift.doorOut.x) - 22, (tz + 0.5) * 8 + 3); g.player.yaw = -1.15; g.player.pitch = -0.05; g.player.camDist = 6; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + `street_${tag}_day.png` });
await ev(() => { const g = window.__game; g.player.yaw = -0.5; g.player.teleport(g.player.x + 30, g.player.z + 1); }); await p.waitForTimeout(1200); await p.screenshot({ path: S + `street_${tag}_day2.png` });
await ev(() => { const g = window.__game; g.clock.hour = 22; g.advance(0.3); }); await p.waitForTimeout(1500); await p.screenshot({ path: S + `street_${tag}_night.png` });
await ev(() => { const g = window.__game; g.clock.hour = 11; g.setMode('god'); g.god.target.set(g.player.x, 0, g.player.z - 8); g.god.dist = 60; g.god.pitch = 0.7; g.god.yaw = 0.3; }); await p.waitForTimeout(1500); await p.screenshot({ path: S + `street_${tag}_god.png` });
await b.close();
