// node tools/perflong.mjs -> long run of a ~14-person town: GPU memory (geometries/textures), draw calls, JS time per frame and spikes
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } }); p.on('pageerror', (e) => console.log('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.4'); await p.waitForTimeout(1000);
const ev = (f, a) => p.evaluate(f, a);
console.log(await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 8), tz = Math.floor(d.z / 8); g.clock.hour = 8;
  for (let z = tz; z < tz + 16; z++) g.world.addRoad(tx, z, 1); for (let x = tx - 14; x < tx + 14; x++) { g.world.addRoad(x, tz + 5, 1); g.world.addRoad(x, tz + 10, 1); g.world.addRoad(x, tz + 15, 1); }
  const put = (id) => { for (let r = 1; r < 14; r++) for (const s of [1, -1]) for (const zz of [3, 7, 8, 12, 13, 17]) { const e = B.evaluate(id, tx + r * s, tz + zz, 0); if (e.ok) return B.place(id, e.x0, e.z0, e.rot, { instant: true }); } return null; };
  const ids = ['stockyard', 'postbox', 'campfire', 'forager', 'lumbercamp', 'contractor', 'quarry', 'hut', 'hut', 'hut', 'cabin', 'cabin', 'shack', 'well', 'surveyor', 'farm', 'tavern']; const miss = ids.filter((id) => !put(id));
  for (let i = 0; i < 14; i++) g.population.arrive(); g.economy.stock.food = 200; g.economy.stock.timber = 60; g.setMode('sim'); g.player.third = true;
  return 'missing: ' + (miss.join(',') || 'none') + ' pop ' + g.population.count() + ' quarrymen ' + g.population.sims.filter((s) => s.role === 'quarryman').length; }));
const snap = () => ev(() => { const g = window.__game, i = g.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geo: i.memory.geometries, tex: i.memory.textures, sims: g.population.sims.length, scene: g.scene.children.length, hhmm: g.clock.hhmm }; });
console.log('start', JSON.stringify(await snap()));
// simulate ~3 game days quickly (no render), sampling JS step cost and leaks
for (let k = 0; k < 6; k++) {
  const r = await ev(() => { const g = window.__game; let worst = 0, tot = 0; for (let i = 0; i < 1500; i++) { const t = performance.now(); g.skipRender = true; g.update(0.1); g.skipRender = false; const d = performance.now() - t; tot += d; if (d > worst) worst = d; } g.render(); return `avg ${(tot / 1500).toFixed(2)}ms worst ${worst.toFixed(1)}ms`; });
  console.log(`+150s game`, r, JSON.stringify(await snap()));
}
await b.close();
