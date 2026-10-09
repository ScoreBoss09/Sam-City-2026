// node tools/round13.mjs -> dogs never stand inside walls and follow owners indoors; doors stay shut unless used; day 10 min / night 3 min
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.4&noraids'); await p.waitForTimeout(1000);
const ev = (f, a) => p.evaluate(f, a);
console.log('clock', await ev(() => { const c = window.__game.clock; return `day rate ${(c.rate(12) * 600).toFixed(2)}h per 600s (want 14), night ${(c.rate(23) * 180).toFixed(2)}h per 180s (want 10)`; }));
console.log('dogs', await ev(() => { const g = window.__game; let n = 0, inWall = 0, indoors = 0, open = 0, doorSamples = 0; const dogs = () => g.population.sims.filter((s) => s.dog).map((s) => s.dog);
  for (let k = 0; k < 600; k++) { g.advance(0.2); for (const d of dogs()) { n++; if (g.world.collides(d.x, d.z, 0.12, true)) inWall++; if (g.buildings.buildingAtPoint(d.x, d.z)) indoors++; }
    for (const b of g.buildings.list) if (b.ext && b.ext.doors && b.ext.doors.length) { doorSamples++; if ((b.doorK || 0) > 0.5) open++; } }
  return `${dogs().length} dogs, ${n} samples: in a wall ${inWall}, indoors ${indoors}; doors open ${(100 * open / doorSamples).toFixed(1)}% of the time`; }));
// C closes a door even with people inside
console.log('C with people inside', await ev(() => { const g = window.__game, h = g.buildings.list.find((b) => b.def.beds && b.residents.length && b.ext && b.ext.doors.length); g.setMode('sim'); const a = h.rot * Math.PI / 2; g.player.teleport(h.doorOut.x, h.doorOut.z); g.player.yaw = a; h.doorHeld = true; for (let i = 0; i < 20; i++) g.update(0.05); const k1 = h.doorK; g.input.pressed.add('KeyC'); g.update(0.05); for (let i = 0; i < 30; i++) g.update(0.05); return `open ${k1.toFixed(2)} -> after C ${(h.doorK || 0).toFixed(2)} (inside: ${h.residents.length})`; }));
console.log(logs.join('\n')); await b.close();
