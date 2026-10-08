// node tools/pad.mjs -> drives the game with a fake gamepad (title menu, god-mode tools, sim movement, interact)
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.addInitScript(() => { const btn = () => ({ pressed: false, value: 0 }); window.__pad = { connected: true, id: 'fake', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) }; navigator.getGamepads = () => [window.__pad]; });
await p.goto('http://localhost:8123/index.html?scale=0.5&noraids'); await p.waitForTimeout(900);
const ev = (f, a) => p.evaluate(f, a);
const press = async (i, ms = 120) => { await ev((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await p.waitForTimeout(ms); await ev((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await p.waitForTimeout(120); };
const stick = async (a, ms) => { await ev((a) => { window.__pad.axes = a; }, a); await p.waitForTimeout(ms); await ev(() => { window.__pad.axes = [0, 0, 0, 0]; }); await p.waitForTimeout(100); };
await press(13); await press(12);   // wake pad + move focus
console.log('title focus', await ev(() => document.querySelector('#title .padfocus') && document.querySelector('#title .padfocus').textContent));
await p.screenshot({ path: S + 'pad_title.png' });
// focus New Game and press A
for (let i = 0; i < 4; i++) { const t = await ev(() => document.querySelector('#title .padfocus') && document.querySelector('#title .padfocus').id); if (t === 'btn-new') break; await press(13); }
await press(0); await p.waitForTimeout(600); await p.screenshot({ path: S + 'pad_howto.png' }); await press(0); await p.waitForTimeout(300);
console.log('started', await ev(() => [window.__game.started, window.__game.mode]));
await press(5); await press(5);   // RB twice -> roads
console.log('tool', await ev(() => JSON.stringify(window.__game.god.tool)));
await ev(() => { const g = window.__game; g.god.target.set(g.lift.doorOut.x + 2, 0, g.lift.doorOut.z + 3); g.god.dist = 70; }); await p.waitForTimeout(200);
await ev(() => { window.__pad.buttons[0] = { pressed: true, value: 1 }; }); await stick([0, 1, 0, 0], 1500); await ev(() => { window.__pad.buttons[0] = { pressed: false, value: 0 }; }); await p.waitForTimeout(200);
console.log('plans after painting', await ev(() => window.__game.roadPlans.count));
await p.screenshot({ path: S + 'pad_god.png' });
await press(9); await p.waitForTimeout(300); console.log('mode', await ev(() => window.__game.mode));
const p0 = await ev(() => [window.__game.player.x, window.__game.player.z]); await stick([0, -1, 0, 0], 1200); const p1 = await ev(() => [window.__game.player.x, window.__game.player.z]);
console.log('moved', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(2));
await ev(() => { const g = window.__game, it = g.tools.items[0]; g.player.teleport(it.x, it.z + 1.1); }); await p.waitForTimeout(300); console.log('prompt', await ev(() => document.getElementById('prompt').textContent)); await press(0);
console.log('tools', await ev(() => [...window.__game.player.tools]));
await p.screenshot({ path: S + 'pad_sim.png' });
console.log(logs.join('\n')); await b.close();
