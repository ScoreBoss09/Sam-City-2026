// node tools/talktree.mjs -> talks to a few demo-city residents through every topic and prints the answers
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.5&noraids'); await p.waitForTimeout(900);
const ev = (f, a) => p.evaluate(f, a);
for (let k = 0; k < 3; k++) {
  const who = await ev((k) => { const g = window.__game, s = g.population.residents().filter((q) => q.kind === 'resident' || q.kind === 'child')[k * 7]; g.setMode('sim'); g.player.teleport(s.x + 1, s.z); g.startDialogue(s); return `${s.name} (${s.roleName}, ${s.trait}, ${Math.floor(s.age)})`; }, k);
  await p.waitForTimeout(300); console.log('\n== ' + who + '\n  > ' + await ev(() => window.__game.ui.dialogue.full));
  for (let i = 1; i <= 5; i++) { await p.keyboard.press('Digit' + i); await p.waitForTimeout(150); console.log(`  [${i}] ` + await ev(() => window.__game.ui.dialogue && window.__game.ui.dialogue.full)); }
  if (k === 0) await p.screenshot({ path: S + 'talk.png' });
  await p.keyboard.press('Digit6'); await p.waitForTimeout(150);
}
console.log('skin sample', await ev(() => { const g = window.__game, f = new Set([0xf8dcc6, 0xf6d9c2, 0xf3d0b5, 0xf0cbb0, 0xefc7a8, 0xeac0a0, 0xe8bd9a, 0xe4b894, 0xe0b48f]), R = g.population.residents(); return `${R.filter((s) => f.has(s.look.skin)).length}/${R.length} fair`; }));
console.log(logs.join('\n')); await b.close();
