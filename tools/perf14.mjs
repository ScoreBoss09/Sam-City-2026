// node tools/perf14.mjs -> a ~14-person town with a quarry; times every system per frame and counts path searches
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } }); p.on('pageerror', (e) => console.log('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.4&noraids'); await p.waitForTimeout(1000);
const ev = (f, a) => p.evaluate(f, a);
console.log(await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 8), tz = Math.floor(d.z / 8); g.clock.hour = 8;
  for (let z = tz; z < tz + 14; z++) g.world.addRoad(tx, z, 1); for (let x = tx - 12; x < tx + 12; x++) { g.world.addRoad(x, tz + 6, 1); g.world.addRoad(x, tz + 12, 1); }
  const put = (id, x, z) => { for (let dx = 0; dx < 10; dx++) for (const s of [1, -1]) for (const dz of [0, 2, -2]) { const r = B.evaluate(id, x + dx * s, z + dz, 0); if (r.ok) return B.place(id, r.x0, r.z0, r.rot, { instant: true }); } return null; };
  const ids = ['stockyard', 'postbox', 'campfire', 'forager', 'lumbercamp', 'contractor', 'quarry', 'fisher', 'hut', 'hut', 'hut', 'cabin', 'cabin', 'shack', 'well', 'surveyor']; const out = [];
  for (const [i, id] of ids.entries()) out.push(id + (put(id, tx + (i % 2 ? 3 : -3), tz + 4 + (i % 3) * 6) ? '' : ':X'));
  for (let i = 0; i < 14; i++) g.population.arrive(); g.economy.stock.food = 80; g.economy.stock.timber = 40;
  // instrument
  const W = g.world, fp = W.findPath.bind(W); window.__pf = { n: 0, ms: 0, fail: 0 }; W.findPath = (...a) => { const t = performance.now(), r = fp(...a); window.__pf.n++; window.__pf.ms += performance.now() - t; if (!r) window.__pf.fail++; return r; };
  const T = window.__T = {}; const wrap = (name, obj, fn) => { const f = obj[fn].bind(obj); obj[fn] = (...a) => { const t = performance.now(); const r = f(...a); T[name] = (T[name] || 0) + performance.now() - t; return r; }; };
  for (const [n, o, f] of [['population', g.population, 'update'], ['resources', g.resources, 'update'], ['social', g.social, 'update'], ['buildings', g.buildings, 'update'], ['player', g.player, 'update'], ['economy', g.economy, 'update'], ['logistics', g.logistics, 'update'], ['traffic', g.traffic, 'update'], ['planner', g.planner, 'update'], ['story', g.story, 'update'], ['ui', g.ui, 'update'], ['minimap', g.minimap, 'update'], ['decor', g.decor, 'update'], ['seasons', g.seasons, 'update'], ['events', g.events, 'update'], ['tech', g.tech, 'update'], ['render', g, 'render'], ['construction', g.construction, 'update']]) if (o && o[f]) wrap(n, o, f);
  return out.join(' ') + ' pop ' + g.population.count(); }));
for (const mode of ['god', 'sim']) {
  await ev((m) => { const g = window.__game; g.setMode(m); if (m === 'sim') g.player.third = true; for (const k in window.__T) window.__T[k] = 0; window.__pf = { n: 0, ms: 0, fail: 0 }; window.__fr = []; let last = performance.now(); const tick = () => { const n = performance.now(); window.__fr.push(n - last); last = n; if (window.__fr.length < 600) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, mode);
  await p.waitForTimeout(25000);
  console.log(mode, await ev(() => { const f = window.__fr.slice().sort((a, b) => a - b), T = window.__T, tot = Object.values(T).reduce((a, b) => a + b, 0); return `frames ${f.length} median ${f[f.length >> 1].toFixed(0)}ms p95 ${f[Math.floor(f.length * 0.95)].toFixed(0)}ms max ${f[f.length - 1].toFixed(0)}ms | paths ${window.__pf.n} (${window.__pf.fail} failed) ${window.__pf.ms.toFixed(0)}ms | ` + Object.entries(T).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)}%`).join(' '); }));
}
await b.close();
