// Body-type lineup: node tools/lab2.mjs out.png [cols]
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const out = process.argv[2] || 'lab2.png';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1400, height: 700 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=1'); await p.waitForTimeout(800);
await p.evaluate(async () => {
  const g = window.__game; g.clock.speed = 0; g.clock.hour = 11; const { Sim } = await import('/src/sim/Sim.js');
  const spec = [['m', 25, 'average'], ['f', 25, 'average'], ['m', 30, 'heavy'], ['f', 30, 'heavy'], ['m', 28, 'tall'], ['f', 28, 'short'], ['m', 40, 'stocky'], ['f', 22, 'slim'], ['m', 70, 'elderly'], ['f', 72, 'elderly'], ['m', 9, 'child'], ['f', 8, 'child']];
  window.lab = spec.map(([gender, age], i) => { const P = g.population.makePerson({ gender, age }); const s = new Sim(g, { name: P.name, trait: ['cheerful', 'grumpy', 'shy', 'busy'][i % 4], x: 66 + (i % 6) * 2.4, z: 80 + Math.floor(i / 6) * 3.2, heading: 0, look: P.look, gender, age });
    const up = ['idle', 'wave', 'idle', 'talk', 'idle', 'idle'][i % 6]; s.decideAnim = () => ({ lower: 'stand', upper: up, speaking: true }); s.updateLook = () => {}; g.population.sims.push(s); return s; });
  g.player.teleport(60, 60); g.setMode('sim'); g.player.placeCamera = (cam) => { cam.position.set(72.5, 2.4, 91); cam.lookAt(72.5, 1.1, 82); }; g.population.update = () => {}; g.social.update = () => {}; g.security.update = () => {};
  document.getElementById('messages').style.display = 'none';
});
await p.waitForTimeout(2500); await p.screenshot({ path: out });
console.log(logs.slice(0, 10).join('\n')); await b.close();
