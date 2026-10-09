// node tools/jam.mjs -> how often walking people get stuck in crowds (demo town, a few game hours)
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } }); p.on('pageerror', (e) => console.log('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.3&noraids'); await p.waitForTimeout(1200);
console.log(await p.evaluate(() => { const g = window.__game; g.clock.hour = 7.5; const last = new Map(); let samples = 0, stuck = 0, longest = 0; const run = new Map();
  for (let k = 0; k < 600; k++) { g.advance(1);
    if (k % 3) continue; for (const s of g.population.sims) { if (s.hidden || s.remove) continue; const l = last.get(s); last.set(s, { x: s.x, z: s.z });
      if (!l || !s.path.length || s.chat || s.sitting || s.down > 0) { run.delete(s); continue; } samples++; if (Math.hypot(s.x - l.x, s.z - l.z) < 0.5) { stuck++; const r = (run.get(s) || 0) + 3; run.set(s, r); longest = Math.max(longest, r); } else run.delete(s); } }
  const worst = [...run.entries()].filter(([, r]) => r > 30).map(([s, r]) => `${s.name} ${s.kind}/${s.role}/${s.activity}/ph${s.phase} ${r}s at ${s.x.toFixed(1)},${s.z.toFixed(1)} in ${s.inside ? s.inside.def.name : "-"} path${s.path.length} next ${s.path[0].x.toFixed(1)},${s.path[0].z.toFixed(1)} vel ${s.vel.toFixed(2)} frz ${!!s.frozen} glide ${!!s.glide} near ${g.population.sims.filter((o) => o !== s && Math.hypot(o.x - s.x, o.z - s.z) < 1.2).length}`);
  return worst.join("\n") + "\n" + `walkers stuck ${(100 * stuck / samples).toFixed(2)}% of samples (${stuck}/${samples}), longest jam ${longest} s, ${g.clock.hhmm}`; }));
await b.close();
