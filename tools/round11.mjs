// node tools/round11.mjs -> jobs page in the post, C opens doors (closed doors block Sam), jump clears the Stockyard fence, smooth pad zoom
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
// jobs page
await ev(() => { const g = window.__game, pb = g.buildings.list.find((b) => b.id === 'postbox') || g.buildings.list[0]; g.setMode('sim'); g.ui.openTerminal(pb, 'post'); g.ui.terminalTab = 'jobs'; g.ui.renderTerminal(); });
await p.waitForTimeout(400); console.log('jobs:', (await ev(() => document.getElementById('terminal').innerText)).replace(/\n+/g, ' | ').slice(0, 600)); await p.screenshot({ path: S + 'r11_jobs.png' });
await ev(() => window.__game.ui.closeTerminal());
// doors: no auto-open for Sam, closed door blocks, C opens
await ev(() => { const g = window.__game, h = g.buildings.list.find((b) => b.id === 'cottage' && b.state === 'done'); window.__h = h; g.player.third = true; const a = h.rot * Math.PI / 2; g.player.teleport(h.doorOut.x, h.doorOut.z); g.player.yaw = a; g.player.pitch = -0.1; });
await p.waitForTimeout(700); console.log('near, no C -> doorK', await ev(() => (window.__h.doorK || 0).toFixed(2)), 'prompt:', await ev(() => document.getElementById('prompt-text').textContent));
await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
console.log('walked at closed door -> inside?', await ev(() => window.__game.buildings.playerInside === window.__h));
await p.keyboard.press('KeyC'); await p.waitForTimeout(700); console.log('after C doorK', await ev(() => (window.__h.doorK || 0).toFixed(2)));
await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW'); console.log('walked through open door -> inside?', await ev(() => window.__game.buildings.playerInside === window.__h));
// jump the stockyard fence
const r = await ev(() => { const g = window.__game, y = g.buildings.list.find((b) => b.id === 'stockyard' && b.state === 'done'); window.__y = y; const a = y.rot * Math.PI / 2, fx = Math.sin(a), fz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a), dd = y.def.d * 2 + 2.2; g.player.teleport(y.cx + fx * dd + sx * 3.6, y.cz + fz * dd + sz * 3.6); g.player.yaw = a; g.player.pitch = -0.1; window.__inside = () => { const q = window.__game.player, dx = q.x - y.cx, dz = q.z - y.cz; return Math.abs(dx * fx + dz * fz) < y.def.d * 2 - 0.4; }; return 1; });
await p.keyboard.down('KeyW'); await p.waitForTimeout(1300); const before = await ev(() => 'inside=' + window.__inside());
await p.keyboard.press('Space'); await p.waitForTimeout(250); await p.screenshot({ path: S + 'r11_jump.png' }); await p.waitForTimeout(1200); await p.keyboard.up('KeyW');
console.log('fence: before jump', before, '-> inside the yard after jumping?', await ev(() => window.__inside()));
// smooth pad zoom
console.log('zoom', await ev(() => { const g = window.__game; g.setMode('god'); const inp = g.input, out = []; const d0 = g.god.dist; inp.padActive = true; inp.pad.zoom = -1; for (let i = 0; i < 30; i++) { g.god.update(1 / 30, inp, true); out.push(g.god.dist); } const steps = out.slice(1).map((v, i) => Math.abs(v - out[i])); return `${d0.toFixed(1)} -> ${out[out.length - 1].toFixed(1)}, biggest single-frame change ${Math.max(...steps).toFixed(2)}`; }));
console.log(logs.join('\n')); await b.close();
