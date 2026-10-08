// node tools/look.mjs <label> -> early camp (instant buildings) screenshots: third person + god view
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const label = process.argv[2] || 'look';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.6&noraids'); await p.waitForTimeout(800);
await p.evaluate(() => { const g = window.__game, B = g.buildings, w = g.world, d = g.lift.doorOut, tx = Math.floor(d.x / 4), tz = Math.floor(d.z / 4);
  for (let z = tz; z < tz + 9; z++) w.addRoad(tx, z, 1); for (let x = tx - 6; x < tx + 6; x++) w.addRoad(x, tz + 6, 1); for (let z = tz + 7; z < tz + 10; z++) g.roadPlans.plan(tx + 3, z, 1);
  const put = (id, x, z, inst = true) => { const r = B.evaluate(id, x, z, 0); if (r.ok) return B.place(id, r.x0, r.z0, r.rot, { instant: inst }); };
  put('stockyard', tx + 2, tz + 3); put('hut', tx - 2, tz + 3); put('surveyor', tx - 3, tz + 8); const s = put('forager', tx + 3, tz + 8, false); if (s) { s.have.timber = 3; B.refreshSite(s); }
  put('campfire', tx - 5, tz + 4);
  g.economy.stock.timber = 14; g.economy.stock.food = 6; g.population.invites = 1; g.population.timer = 0; g.advance(25); g.clock.hour = 11; g.clock.speed = 0;
  g.setMode('sim'); g.player.third = true; g.player.teleport((tx + 0.5) * 4, (tz + 7.5) * 4, Math.PI); g.player.yaw = 0; g.player.pitch = -0.12; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + label + '_sim.png' });
await p.evaluate(() => { const g = window.__game; g.setMode('god'); g.god.dist = 75; g.god.target.set(g.lift.doorOut.x, 0, g.lift.doorOut.z + 22); });
await p.waitForTimeout(1200); await p.screenshot({ path: S + label + '_god.png' });
console.log(logs.join('\n') || 'ok'); await b.close();
