// node tools/round9.mjs -> lift escape at shift change, no stumps on the Lift, build minigame stops without materials, combo spill
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
console.log('tunnel gone', await ev(() => !window.__game.buildings.list.some((b) => b.id === 'tunnel')));
console.log('trees near lift', await ev(() => { const g = window.__game, L = g.lift.trigger; return g.terrain.trees.filter((t) => Math.hypot(t.x - L.x, t.z - L.z) < 14).map((t) => t.alive).join(','); }));
await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 4), tz = Math.floor(d.z / 4); g.clock.hour = 10;
  for (let z = tz; z < tz + 10; z++) g.world.addRoad(tx, z, 1); for (const it of g.tools.items) { g.tools.take(it); g.player.tools.add(it.id); }
  const put = (id, x, z, o = { instant: true }) => { for (let dx = 0; dx < 6; dx++) for (const s of [1, -1]) { const r = B.evaluate(id, x + dx * s, z, 0); if (r.ok) return B.place(id, r.x0, r.z0, r.rot, o); } return null; };
  window.__s1 = put('shack', tx + 1, tz + 3, {}); window.__s2 = put('shack', tx - 2, tz + 3, {}); window.__s3 = put('shack', tx + 2, tz + 6, {});
  g.economy.stock.food = 20; g.setMode('sim'); });
console.log('sites', await ev(() => [window.__s1, window.__s2, window.__s3].map((s) => s && [s.state, s.progress.toFixed(2), window.__game.buildings.supply(s).toFixed(2)].join('/')).join(' ')));
// build on a site with no materials: minigame must not run
await ev(() => { const g = window.__game, s = window.__s1; g.player.teleport(s.cx, s.cz + s.d * 2 + 1.2); g.player.yaw = 0; });
await p.waitForTimeout(200); console.log('prompt at empty site', await ev(() => document.getElementById('prompt-text').textContent));
await p.keyboard.press('KeyE'); await p.waitForTimeout(400); console.log('minigame active w/o materials', await ev(() => window.__game.workgame.active));
// give materials to s1 and play perfect taps
await ev(() => { const g = window.__game, s = window.__s1; for (const k in s.need) s.have[k] = s.need[k]; g.buildings.refreshSite && g.buildings.refreshSite(s); });
await p.keyboard.press('KeyE'); await p.waitForTimeout(300); console.log('minigame active with materials', await ev(() => window.__game.workgame.active));
const before = await ev(() => [window.__s2.progress, window.__s3.progress]);
await ev(() => { const g = window.__game, wg = g.workgame; for (let i = 0; i < 6; i++) { wg.combo = 5 + i; g.player.chainSpill(wg.combo, g.player.lock || { b: window.__s1 }); } });
console.log('spill', before.map((x) => x.toFixed(3)).join(','), '->', await ev(() => [window.__s2.progress, window.__s3.progress].map((x) => x.toFixed(3)).join(',')));
await p.screenshot({ path: S + 'r9_spill.png' });
// lift at shift change with clues -> escape
await ev(() => { const g = window.__game; g.workgame.stop && g.workgame.stop(); g.player.lock = null; g.clock.hour = 10; g.player.teleport(g.lift.cx, g.lift.cz); });
await p.waitForTimeout(1500); console.log('daytime countdown', await ev(() => document.getElementById('countdown').textContent));
await ev(() => { const g = window.__game; g.clock.hour = 2.5; g.story.clues = 3; }); await p.waitForTimeout(9000);
console.log('escape?', await ev(() => !!window.__game.ending), await ev(() => (document.querySelector('#ending, .ending') || {}).textContent || ''));
await p.screenshot({ path: S + 'r9_escape.png' });
console.log(logs.join('\n')); await b.close();
