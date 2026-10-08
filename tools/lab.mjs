// Animation lab: node tools/lab.mjs out.png  -> a lineup of sims in different poses, close camera.
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const out = process.argv[2] || 'lab.png';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=1'); await p.waitForTimeout(800);
await p.evaluate(async () => {
  const g = window.__game; g.clock.speed = 0; g.clock.hour = 11;
  const { Sim } = await import('/src/sim/Sim.js'); const { ROLES } = await import('/src/data/buildings.js');
  const items = [['stand', 'idle', 'cheerful', {}], ['walk', 'idle', 'cheerful', {}], ['walk', 'carry', 'busy', {}], ['stand', 'wave', 'cheerful', {}], ['crouch', 'hammer', 'busy', { hat: { type: 'hard' }, accessory: 'vest' }],
    ['stand', 'talk', 'cheerful', { hairStyle: 'long' }], ['sit', 'type', 'shy', { glasses: true, accessory: 'tie' }], ['stand', 'clipboard', 'grumpy', { accessory: 'coat' }], ['stand', 'guard', 'grumpy', { hat: { type: 'police' }, accessory: 'uniform' }],
    ['stand', 'phone', 'busy', { hairStyle: 'afro' }], ['sit', 'eat', 'cheerful', { skirt: true, hairStyle: 'pony' }], ['lie', 'sleep', 'shy', {}]];
  window.lab = items.map(([lower, upper, trait, look], i) => {
    const s = new Sim(g, { name: 'L' + i, trait, x: 70 + (i % 6) * 2.2, z: 80 + Math.floor(i / 6) * 4, heading: 0, look: { shirt: [0x4a7bd1, 0xd1584a, 0x56a86b, 0xd9b34a, 0x8a5ac7][i % 5], hairStyle: ['short', 'long', 'bun', 'afro', 'side', 'pony'][i % 6], ...look } });
    s.decideAnim = () => ({ lower, upper, speaking: true }); s.moved = lower === 'walk'; s.vel = lower === 'walk' ? 1.9 : 0; s.dist = 0.03; s.hidden = false; s.updateLook = () => {}; g.population.sims.push(s); return s;
  });
  g.player.teleport(60, 60); g.setMode('sim'); g.player.placeCamera = (cam) => { cam.position.set(76.5, 2.2, 88); cam.lookAt(76.5, 1.0, 82); };
  g.population.update = () => {}; g.social.update = () => {}; g.security.update = () => {};
});
await p.waitForTimeout(2500); await p.screenshot({ path: out });
await p.evaluate(() => { window.__game.player.placeCamera = (cam) => { cam.position.set(76.5, 3.2, 86.5); cam.lookAt(76.5, 1.1, 78); }; });
await p.waitForTimeout(800);
console.log(logs.slice(0, 15).join('\n')); await b.close();
