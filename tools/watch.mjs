// node tools/watch.mjs <label> "<predicate over sim s, game g>" [hour] -> screenshot framing the first matching sim (demo city)
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const [label, pred, hour = '10', adv = '40'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall') && !m.text().includes('404')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.9'); await p.waitForTimeout(600);
const r = await p.evaluate(([pred, hour, adv, pre]) => {
  const g = window.__game; if (pre) new Function('g', pre)(g); g.clock.speed = 1; g.clock.hour = +hour; const f = new Function('s', 'g', 'return ' + pred); const find = () => g.population.sims.find((s) => { try { return f(s, g); } catch (e) { return false; } });
  let s = null; for (let t = 0; t < +adv && !s; t += 1) { g.advance(1); s = find(); } g.clock.speed = 0;
  if (!s) return 'none';
  g.setMode('sim'); g.player.teleport(s.x, s.z + 0.01); window.__target = s;
  g.player.placeCamera = (cam) => { const t = window.__target; let best = null; for (let k = 0; k < 16 && !best; k++) for (const d of [3.0, 2.4, 1.9, 1.5]) { const a = (t.heading || 0) + 0.5 + k * 0.4; const x = t.x + Math.sin(a) * d, z = t.z + Math.cos(a) * d; if (!g.world.collides(x, z, 0.35)) { best = [x, z]; break; } } best = best || [t.x + 2, t.z]; cam.position.set(best[0], t.sleeping ? 1.9 : 1.55, best[1]); cam.lookAt(t.x, t.sleeping ? 0.7 : 1.05, t.z); };
  return [s.name, s.activity, s.role, s.sitting && s.sitting.kind, !!s.chat];
}, [pred, hour, adv, process.env.PRE || '']);
console.log(label, JSON.stringify(r)); await p.waitForTimeout(1200);
await p.evaluate(() => { const t = window.__target; if (t) window.__game.player.teleport(t.x, t.z + 0.01); }); await p.waitForTimeout(500);
await p.screenshot({ path: S + label + '.png' }); console.log(logs.slice(0, 8).join('\n')); await b.close();
