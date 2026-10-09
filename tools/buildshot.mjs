// node tools/buildshot.mjs -> screenshot of Sam building a hut with the timing minigame
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.6&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 8), tz = Math.floor(d.z / 8); g.clock.hour = 10.5;
  for (let z = tz; z < tz + 9; z++) g.world.addRoad(tx, z, 1); for (const it of g.tools.items) { g.tools.take(it); g.player.tools.add(it.id); }
  const r = B.evaluate('hut', tx + 2, tz + 6, 0); const s = B.place('hut', r.x0, r.z0, r.rot); s.have.timber = 8; B.refreshSite(s); window.__s = s;
  g.setMode('sim'); g.player.inv = { timber: 3, food: 2 }; const px = s.cx - 6.5, pz = s.cz + 1; g.player.teleport(px, pz); const h = Math.atan2(s.cx - px, s.cz - pz); g.player.heading = h; g.player.yaw = h + Math.PI + 0.35; g.player.pitch = -0.2; });
await p.waitForTimeout(500); for (let i = 0; i < 5; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(220); }
await p.screenshot({ path: S + 'mg_build.png' }); console.log(await ev(() => window.__s.progress.toFixed(2)));
console.log(logs.join('\n')); await b.close();
