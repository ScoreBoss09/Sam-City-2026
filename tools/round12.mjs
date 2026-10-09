// node tools/round12.mjs -> one-thread conversations, pad close of the post, eras (ledger -> power -> computers), harbour only when built
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
console.log('harbour visible at start?', await ev(() => window.__game.harbor.root.visible));
await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 4), tz = Math.floor(d.z / 4); g.clock.hour = 10;
  for (let z = tz; z < tz + 12; z++) g.world.addRoad(tx, z, 2); for (let x = tx - 10; x < tx + 10; x++) g.world.addRoad(x, tz + 8, 2);
  const put = (id, x, z) => { for (let dx = 0; dx < 8; dx++) for (const s of [1, -1]) { const r = B.evaluate(id, x + dx * s, z, 0); if (r.ok) return B.place(id, r.x0, r.z0, r.rot, { instant: true }); } return null; };
  window.__po = put('surveyor', tx + 2, tz + 4); window.__pb = put('postbox', tx - 2, tz + 6); window.__h = put('cottage', tx + 3, tz + 10); window.__lib = put('library', tx - 4, tz + 10);
  for (let i = 0; i < 3; i++) g.population.arrive(); g.setMode('sim'); });
console.log('era', await ev(() => JSON.stringify(window.__game.tech.status())), 'planning office prompt:', await ev(() => { const g = window.__game, t = window.__po.spots.terminal[0]; g.player.teleport(t.x, t.z); return 1; }));
await p.waitForTimeout(400); console.log('  ', await ev(() => document.getElementById('prompt-text').textContent));
await ev(() => window.__game.ui.openTerminal(window.__po)); await p.waitForTimeout(300); console.log('  title:', await ev(() => document.querySelector('#terminal h2 span').textContent)); await ev(() => window.__game.ui.closeTerminal());
// conversation
const s1 = await ev(() => { const g = window.__game, s = g.population.residents()[0]; g.player.teleport(s.x + 1, s.z); g.startDialogue(s); return s.name; });
const lines = []; for (let i = 0; i < 8; i++) { await p.waitForTimeout(250); const t = await ev(() => { const d = window.__game.ui.dialogue; return d ? d.full + ' || ' + document.getElementById('d-hint').textContent : null; }); if (!t) break; lines.push(t); await p.keyboard.press('KeyE'); await p.waitForTimeout(60); await p.keyboard.press('KeyE'); }
console.log('chat with', s1, '\n  ' + lines.join('\n  ')); console.log('  closed?', await ev(() => !window.__game.ui.dialogue), 'choices html:', await ev(() => document.getElementById('d-choices').innerHTML.length));
// post closes with pad A on Close, and does not reopen
await ev(() => { const g = window.__game, pb = window.__pb; g.player.teleport(pb.cx, pb.cz + 1.6); g.ui.openTerminal(pb, 'post'); });
await p.waitForTimeout(200);
console.log('pad close:', await ev(() => { const g = window.__game, ui = g.ui, inp = g.input; inp.padActive = true; inp.pad.connected = true; const btns = [...document.querySelectorAll('#terminal button')].filter((x) => !x.disabled && x.offsetParent !== null); ui._pfIdx = btns.findIndex((x) => x.dataset.act === 'close'); inp.pad.hitB = []; inp.pad.hitB[0] = true; inp.pressed.add('KeyE'); ui.padUpdate(inp, 0.016); inp.pad.hitB = []; const closed = !ui.terminalB; g.player.interact(0.016); return closed + ' reopened? ' + !!ui.terminalB; }));
// eras
await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 4), tz = Math.floor(d.z / 4); for (let dx = 0; dx < 10; dx++) for (const s of [1, -1]) { const r = B.evaluate('power', tx + dx * s, tz + 11, 0); if (r.ok) { window.__pw = B.place('power', r.x0, r.z0, r.rot, { instant: true }); return; } } });
await ev(() => { const g = window.__game; for (let i = 0; i < 100; i++) g.tech.update(1); });
console.log('after power:', await ev(() => JSON.stringify(window.__game.tech.status())), 'cottage era', await ev(() => window.__h.era));
await ev(() => { const g = window.__game; g.tech.research = 95; for (let i = 0; i < 200; i++) g.tech.update(1); });
console.log('after research:', await ev(() => JSON.stringify(window.__game.tech.status())), 'cottage era', await ev(() => window.__h.era), 'office era', await ev(() => window.__po.era));
// harbour
console.log('harbour after building one?', await ev(() => { const g = window.__game, B = g.buildings; for (let z = 4; z < 36; z++) for (let x = 1; x < 30; x++) { let r = B.evaluate('harbour', x, z, 0); if (!r.ok && r.reason === 'Needs road frontage') { const [dx, dz] = r.geo.doorTile; if (g.world.addRoad(dx, dz, 1)) r = B.evaluate('harbour', x, z, r.rot); } if (r.ok) { B.place('harbour', r.x0, r.z0, r.rot, { instant: true }); g.harbor.update(0.1, 1); return g.harbor.root.visible; } } return 'no shore spot (needs road)'; }));
console.log(logs.join('\n')); await b.close();
