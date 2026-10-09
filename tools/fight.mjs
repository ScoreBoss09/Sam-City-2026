import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&scale=0.9'); await p.waitForTimeout(700);
console.log(await p.evaluate(() => { const g = window.__game; g.clock.hour = 11; { const B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 8), tz = Math.floor(d.z / 8); for (let z = tz; z < tz + 8; z++) g.world.addRoad(tx, z, 1); const r0 = B.evaluate('stockyard', tx + 2, tz + 5, 0); B.place('stockyard', r0.x0, r0.z0, r0.rot, { instant: true }); g.economy.stock.food = 30; } g.raids.trigger(); g.advance(20); const r = g.raids.raiders[0]; g.setMode('sim'); g.player.weapon = 'club'; g.player.third = true; g.clock.speed = 0;
  g.player.teleport(r.x - 1.2, r.z - 0.2, Math.PI / 2); g.player.yaw = -Math.PI / 2; g.player.pitch = -0.1; window.__r = r; return [r.rstate, r.hp, g.raids.pickup ? 'pickup' : 'none']; }));
await p.waitForTimeout(500);
for (let i = 0; i < 3; i++) {
  console.log(await p.evaluate(() => { const g = window.__game, r = window.__r; g.player.heading = Math.atan2(r.x - g.player.x, r.z - g.player.z); g.player.swingT = 0.6; g.player.swingHit = false; return 'swing'; }));
  await p.waitForTimeout(250); if (i === 0) await p.screenshot({ path: S + 'fight_swing.png' });
  await p.evaluate(() => window.__game.advance(0.4)); await p.waitForTimeout(300);
  console.log(await p.evaluate(() => { const r = window.__r; return [r.hp, r.captured, r.rstate, r.down]; }));
}
await p.screenshot({ path: S + 'fight_after.png' });
console.log(logs.join('\n')); await b.close();
