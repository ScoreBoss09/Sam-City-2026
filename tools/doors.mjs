// node tools/doors.mjs -> doors open/close, sims don't walk through furniture, placement works after sim mode, tool rack glow only when needed
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
// furniture clipping: sample sims inside buildings for a while
console.log('clip', await ev(() => { const g = window.__game; let bad = 0, n = 0; const ex = {};
  for (let k = 0; k < 400; k++) { g.advance(0.5); for (const s of g.population.sims) { const b = s.inside; if (!b || b.def.open || s.sitting || s.pose === 'sleep' || !b.layout) continue; n++;
    const fc = b.colliders.slice(5); for (const c of fc) if (s.x > c.minx + 0.05 && s.x < c.maxx - 0.05 && s.z > c.minz + 0.05 && s.z < c.maxz - 0.05) { bad++; ex[b.id] = (ex[b.id] || 0) + 1; break; } } }
  return `${bad}/${n} samples inside furniture ` + JSON.stringify(ex); }));
// doors
const st = await ev(() => { const g = window.__game, h = g.buildings.list.find((b) => b.id === 'cottage' && b.state === 'done'); g.setMode('sim'); g.player.third = true; const a = h.rot * Math.PI / 2; g.player.teleport(h.doorOut.x + Math.sin(a) * 3, h.doorOut.z + Math.cos(a) * 3); g.player.yaw = a; g.player.pitch = -0.1; window.__h = h; return h.doorK || 0; });
await p.waitForTimeout(800); const shut = await ev(() => window.__h.doorK || 0); await p.screenshot({ path: S + 'door_shut.png' });
await ev(() => { const g = window.__game, h = window.__h; g.player.teleport(h.doorOut.x, h.doorOut.z); }); await p.waitForTimeout(900);
console.log('door', st.toFixed(2), '->', shut.toFixed(2), '-> near', (await ev(() => window.__h.doorK || 0)).toFixed(2)); await p.screenshot({ path: S + 'door_open.png' });
// placement after sim mode
await ev(() => { const g = window.__game; g.setMode('god'); g.god.setTool('build', 'shack'); });
await p.mouse.move(600, 380); await p.waitForTimeout(300); await p.mouse.move(640, 400); await p.waitForTimeout(300);
console.log('ghost visible', await ev(() => window.__game.god.ghost.visible), 'modal', await ev(() => window.__game.ui.modalOpen), 'over', await ev(() => window.__game.ui.mouseOverCanvas));
console.log(logs.join('\n')); await b.close();
