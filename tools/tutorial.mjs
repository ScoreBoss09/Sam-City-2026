import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5'); await p.waitForTimeout(700);
const ev = (f, a) => p.evaluate(f, a);
const obj = async (l) => console.log(l.padEnd(34), '| objective #' + await ev(() => window.__game.story.objective), '|', await ev(() => (window.__game.story.currentObjective || {}).text));
await ev(() => { window.__game.clock.speed = 0; }); await obj('start');
// 1 terminal
await ev(() => { const g = window.__game, t = g.townhall.spots.terminal[0]; g.player.teleport(t.x, t.z + 0.3); g.player.yaw = 0; }); await p.waitForTimeout(400); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(500); await obj('after terminal');
// 2 chop until 8, store, twice
for (let rep = 0; rep < 5 && (await ev(() => window.__game.flags.stored || 0)) < 10; rep++) {
  await ev(() => { const g = window.__game, R = g.resources; let best = null, bd = 1e9; for (const t of g.terrain.trees) { if (!t.alive) continue; const st = R.standPoint(t, t); if (!st) continue; const d = Math.hypot(st.x - 80, st.z - 40); if (d < bd) { bd = d; best = { t, st }; } } const { t, st } = best; g.player.teleport(st.x, st.z); g.player.yaw = Math.atan2(-(t.x - st.x), -(t.z - st.z)); g.player.heading = Math.atan2(t.x - st.x, t.z - st.z); g.player.pitch = -0.1; });
  await p.waitForTimeout(300); await p.keyboard.down('KeyE'); await p.waitForTimeout(14000); await p.keyboard.up('KeyE');
  console.log('carry', await ev(() => JSON.stringify(window.__game.player.carry)));
  await ev(() => { const g = window.__game, pk = g.depot.spots.pickup[0]; g.player.teleport(pk.x, pk.z + 1.3); g.player.yaw = 0; }); await p.waitForTimeout(300); await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
}
await obj('after storing timber');
// 3 place a hut in planning view with the mouse
await p.keyboard.press('Tab'); await p.waitForTimeout(400); await ev(() => { const g = window.__game; g.god.dist = 80; g.god.target.set(96, 0, 72); });
await p.click('button.tool[data-t="build"]'); await p.click('button.sub[data-s="hut"]');
const spot = await ev(() => { const g = window.__game, B = g.buildings; for (let x = 14; x < 26; x++) { const r = B.evaluate('hut', x, 17, 0); if (r.ok) return [r.x0, r.z0, r.geo.cx, r.geo.cz]; } return null; });
await ev((c) => { window.__game.god.target.set(c[2], 0, c[3] - 6); }, spot); await p.waitForTimeout(300);
const [sx, sy] = await ev((c) => { const g = window.__game, v = new (g.camera.position.constructor)(c[2], 0, c[3]).project(g.camera), r = document.getElementById('view').getBoundingClientRect(); return [r.left + (v.x * 0.5 + 0.5) * r.width, r.top + (-v.y * 0.5 + 0.5) * r.height]; }, [0, 0, spot[2] + 1, spot[3] + 1]);
await p.mouse.move(sx, sy); await p.waitForTimeout(600); console.log('dbg', await ev(() => { const g = window.__game; return JSON.stringify({ hover: g.god.hover, ghost: [g.god.ghost.position.x, g.god.ghost.position.z], vis: g.god.ghost.visible, tgt: [g.god.target.x, g.god.target.z], mouse: [g.input.mouse.x, g.input.mouse.y] }); }), [sx, sy]);
console.log('spot', JSON.stringify(spot), 'hover:', await ev(() => document.getElementById('hover').textContent), 'tool', await ev(() => JSON.stringify(window.__game.god.tool))); await p.mouse.click(sx, sy); await p.waitForTimeout(400); await obj('after placing hut');
// 4 haul + build
await p.keyboard.press('Tab'); await p.waitForTimeout(300);
for (let i = 0; i < 3; i++) {
  await ev(() => { const g = window.__game, pk = g.depot.spots.pickup[0]; g.player.teleport(pk.x, pk.z + 1.3); g.player.yaw = 0; }); await p.waitForTimeout(300); await p.keyboard.press('KeyE'); await p.waitForTimeout(250);
  await ev(() => { const g = window.__game, s = g.buildings.list.find((b) => b.state === 'site'); g.player.teleport(s.doorOut.x, s.doorOut.z + 0.5); g.player.yaw = Math.atan2(-(s.cx - s.doorOut.x), -(s.cz - s.doorOut.z)); }); await p.waitForTimeout(300); await p.keyboard.press('KeyE'); await p.waitForTimeout(250);
}
console.log('site', await ev(() => { const s = window.__game.buildings.list.find((b) => b.state === 'site'); return s && JSON.stringify({ have: s.have, need: s.need, progress: s.progress }); }));
await p.keyboard.down('KeyE'); await p.waitForTimeout(16000); await p.keyboard.up('KeyE'); await p.waitForTimeout(300);
console.log('hut states', await ev(() => window.__game.buildings.list.filter((b) => b.id === 'hut').map((b) => b.state + ':' + b.progress.toFixed(2))));
await obj('after building');
await p.screenshot({ path: S + 'tut1.png' }); console.log(logs.join('\n')); await b.close();
