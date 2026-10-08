import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 600, height: 400 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.3'); await p.waitForTimeout(600);
console.log(await p.evaluate(() => { const g = window.__game, B = g.buildings; g.clock.speed = 1; g.economy.stock.timber = 200;
  for (let x = 12; x <= 26; x++) g.world.addRoad(x, 21, 1); for (let z = 15; z <= 21; z++) { g.world.addRoad(14, z, 1); g.world.addRoad(26, z, 1); }
  const put = (id, x, z) => { const r = B.evaluate(id, x, z, 0); return r.ok ? B.place(id, r.x0, r.z0, r.rot, { instant: true }) : r.reason; };
  const res = [put('hut', 17, 20), put('hut', 22, 20), put('forager', 11, 20), put('hut', 17, 24), put('lumbercamp', 22, 24)];
  g.population.invites = 6; g.population.timer = 0; g.advance(150);
  return JSON.stringify(res.map((r) => (typeof r === 'string' ? r : r.id))); }));
for (let i = 0; i < 3; i++) console.log(await p.evaluate(() => { const g = window.__game; g.advance(60); return g.clock.hhmm + ' ' + g.population.residents().map((s) => `${s.first}[${s.role || s.kind}|${s.activity}|ph${s.phase}|h${Math.round(s.hunger)}|cd${Math.round(s.eatCD)}|${s.home ? 'H' : '-'}|${s.inside ? 'in' : 'out'}|p${s.path.length}${s.job ? '|' + s.job.type + s.job.step : ''}]`).join(' '); }));
console.log(await p.evaluate(() => { const g = window.__game; const s = g.population.residents().find((s) => s.hunger > 95); if (!s) return 'none'; return JSON.stringify({ n: s.first, x: s.x, z: s.z, path: s.path, vel: s.vel, frozen: s.frozen, chat: !!s.chat, sit: !!s.sitting, glide: s.glide, freeze: s.freezeT, face: s.faceGoal, hdg: s.heading, home: s.home && [s.home.cx, s.home.cz, s.home.id], dest: s.dest && [s.dest.x, s.dest.z], inside: s.inside && s.inside.id, act: s.activity }); }));
console.log(logs.join('\n')); await b.close();
