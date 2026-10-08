// node tools/interior.mjs <label> <buildingId> [inside|door] : camera inside / at the door of the first finished building of that type (demo city)
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const [label, id, view = 'inside'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } });
const logs = []; p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) logs.push(m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.9'); await p.waitForTimeout(600);
const r = await p.evaluate(([id, view]) => {
  const g = window.__game; g.clock.speed = 0; g.clock.hour = 12; const bd = g.buildings.byDef(id)[0]; if (!bd) return 'none';
  g.setMode('sim'); const q = bd.geo, o = q.doorOut, dx = q.cx - o[0], dz = q.cz - o[1], L = Math.hypot(dx, dz), out = { cx: q.cx, cz: q.cz, o };
  const yaw = Math.atan2(-dx, -dz); g.player.third = false;
  if (view === 'inside') { g.player.teleport(q.cx - dx / L * 0.5, q.cz - dz / L * 0.5, yaw); g.player.yaw = yaw + Math.PI; g.player.pitch = -0.25; }
  else { g.player.teleport(o[0] - dx / L * 2.2, o[1] - dz / L * 2.2, yaw); g.player.yaw = yaw; g.player.pitch = -0.05; }
  return out;
}, [id, view]);
console.log(label, JSON.stringify(r)); await p.waitForTimeout(2500);
await p.screenshot({ path: S + label + '.png' }); console.log(logs.slice(0, 8).join('\n')); await b.close();
