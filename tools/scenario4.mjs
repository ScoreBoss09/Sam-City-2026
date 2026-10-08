import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
// 1. Sedation at the lift
await ev(() => { const g = window.__game; g.clock.speed = 1; g.clock.hour = 12; const l = g.lift; g.player.teleport(l.doorOut.x, l.doorOut.z - 4, 0); g.player.yaw = 0; });
await p.waitForTimeout(600); console.log('warn msgs:', await ev(() => window.__game.messages.log.filter((m) => /Guard/.test(m.from)).length));
await ev(() => window.__game.advance(8)); // dart flight
console.log('sedated:', await ev(() => window.__game.player.sedated > 0));
await p.screenshot({ path: S + 'sc4_sedate.png' });
await ev(() => window.__game.advance(0.1)); await p.waitForTimeout(4500);
console.log('woke at:', await ev(() => { const g = window.__game; return JSON.stringify({ x: g.player.x.toFixed(1), z: g.player.z.toFixed(1), plaza: [g.plaza.x, g.plaza.z], sed: g.player.sedated }); }));
// 2. Dome reveal: give the city two hotels instantly
await ev(() => { const g = window.__game, B = g.buildings; g.economy.permits.hotel = 'approved'; for (let x = 9; x <= 30; x++) g.world.addRoad(x, 25); for (let z = 15; z <= 25; z++) g.world.addRoad(14, z);
  const out = []; for (let z = 5; z < 36 && out.length < 2; z++) for (let x = 3; x < 38 && out.length < 2; x++) { const r = B.evaluate('hotel', x, z, 0); if (r.ok) { B.place('hotel', r.x0, r.z0, r.rot, { instant: true }); out.push([r.x0, r.z0]); } }
  window.hot = out; g.advance(5); });
console.log('hotels:', await ev(() => JSON.stringify({ hot: window.hot, large: window.__game.largeCount(), dome: window.__game.story.domeRevealed, stage: window.__game.story.stage })));
await ev(() => { const g = window.__game; g.advance(8); g.clock.hour = 22; g.player.teleport(78, 80, 0); g.player.yaw = 0; g.player.pitch = 0.6; g.glitch = 0; });
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'sc4_dome.png' });
// 3. Escape: pages, rotation time, walk to the barrier
await ev(() => { const g = window.__game; g.story.clues = 3; g.clock.hour = 3; g.clock.speed = 0; const t = g.tunnel; g.player.teleport(t.trigger.x - 9, t.trigger.z, 0); });
console.log('escape-ready yaw/pos', await ev(() => { const g = window.__game; return JSON.stringify([g.player.x, g.player.z, g.tunnel.trigger]); }));
await ev(() => { const g = window.__game; g.player.yaw = -Math.PI / 2; });  // forward = (-sin(yaw), -cos) = (-1,0) -> west? tunnel mouth faces west, trigger west of barrier..
await p.keyboard.down('KeyW'); await p.waitForTimeout(3000); await p.keyboard.up('KeyW');
console.log('ending:', await ev(() => JSON.stringify({ e: window.__game.ending, x: window.__game.player.x, trig: window.__game.tunnel.trigger })));
await p.waitForTimeout(3500); await p.screenshot({ path: S + 'sc4_end.png' });
console.log(logs.slice(0, 20).join('\n')); await b.close();
