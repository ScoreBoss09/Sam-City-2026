// node tools/padstuck.mjs -> a controller whose right stick / triggers rest off-centre must not spin the camera or cycle tools
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.addInitScript(() => { const btn = (on) => ({ pressed: on, value: on ? 1 : 0 });
  // standard pad with right stick resting at +1 (broken/drifting) and RB held down, plus a non-standard "joystick" with every axis at -1
  window.__pad = { connected: true, mapping: 'standard', index: 0, id: 'drifty', axes: [0, 0, 1, -0.9], buttons: Array.from({ length: 17 }, (_, i) => btn(i === 5)) };
  const wheel = { connected: true, mapping: '', index: 1, id: 'wheel', axes: [-1, -1, -1, -1, -1, -1], buttons: Array.from({ length: 20 }, () => btn(true)) };
  navigator.getGamepads = () => [wheel, window.__pad]; });
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
const g0 = await ev(() => { const g = window.__game; return [g.god.yaw, g.god.dist, g.god.tool.id]; }); await p.waitForTimeout(1500);
const g1 = await ev(() => { const g = window.__game; return [g.god.yaw, g.god.dist, g.god.tool.id]; });
console.log('god view still?', JSON.stringify(g0) === JSON.stringify(g1), g0, g1);
await ev(() => window.__game.setMode('sim')); const s0 = await ev(() => window.__game.player.yaw); await p.waitForTimeout(1500); const s1 = await ev(() => window.__game.player.yaw);
console.log('sim camera still?', Math.abs(s1 - s0) < 1e-6, s0, s1);
// once the drifting stick is actually moved and released, it still works normally
await ev(() => { window.__pad.axes = [0, 0, 0, 0]; }); await p.waitForTimeout(200); await ev(() => { window.__pad.axes = [0, 0, -1, 0]; }); await p.waitForTimeout(500); const s2 = await ev(() => window.__game.player.yaw);
console.log('real right-stick push turns the camera?', Math.abs(s2 - s1) > 0.1);
console.log(logs.join('\n')); await b.close();
