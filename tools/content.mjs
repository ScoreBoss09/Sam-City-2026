// node tools/content.mjs -> screenshots: fête, night sky, journal, fishing; checks curios / cooking
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.6&noraids'); await p.waitForTimeout(900);
const ev = (f, a) => p.evaluate(f, a);
// fête
console.log('fete', await ev(() => { const g = window.__game, s = g.events.site(); if (!s) return 'no site'; g.clock.hour = 13; g.clock.totalDays = 5; g.advance(30); g.setMode('sim'); g.player.third = true; g.player.teleport(s.cx, s.cz + 11, 0); g.player.yaw = 0; g.player.pitch = -0.15; return s.def.name; }));
await p.waitForTimeout(1500); await p.screenshot({ path: S + 'c_fete.png' });
// night sky
await ev(() => { const g = window.__game; g.events.end(); g.clock.hour = 23.5; g.player.pitch = 0.55; }); await p.waitForTimeout(2500); await p.screenshot({ path: S + 'c_night.png' });
// curios + journal
console.log('curio', await ev(() => { const g = window.__game, it = g.curios.items[0]; g.clock.hour = 11; g.player.pitch = -0.1; g.player.teleport(it.x + 0.8, it.z); return g.player.findTarget() && g.player.findTarget().kind; }));
await p.waitForTimeout(300); console.log('state', await ev(() => JSON.stringify({ modal: window.__game.ui.modalOpen, t: window.__game.player.target && window.__game.player.target.kind, seat: !!window.__game.player.seat, sed: window.__game.player.sedated, mode: window.__game.mode, dlg: !!window.__game.ui.dialogue }))); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); console.log('found', await ev(() => window.__game.curios.found.size));
await p.keyboard.press('KeyJ'); await p.waitForTimeout(400); await p.screenshot({ path: S + 'c_journal.png' }); await p.keyboard.press('KeyJ');
// cooking at the campfire
console.log('cook', await ev(() => { const g = window.__game, c = g.buildings.byDef('campfire')[0]; if (!c) return 'no camp'; g.player.inv = { food: 3 }; g.player.hunger = 60; g.player.teleport(c.cx + 3.5, c.cz); const t = g.player.findTarget(); return t && t.kind; }));
await p.waitForTimeout(400); console.log('state', await ev(() => JSON.stringify({ modal: window.__game.ui.modalOpen, t: window.__game.player.target && window.__game.player.target.kind, seat: !!window.__game.player.seat }))); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); console.log('after cook', await ev(() => [window.__game.player.hunger, window.__game.player.invText()]));
// fishing
console.log('fish spot', await ev(() => { const g = window.__game, w = g.world; for (let z = 2; z < 38; z++) for (let x = 2; x < 38; x++) { const i = w.idx(x, z); if (w.terrain[i] !== 3 || w.occ[i]) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.terrain[w.idx(x + dx, z + dz)] === 0) { const [cx, cz] = w.center(x, z); g.player.teleport(cx, cz); g.player.yaw = Math.atan2(-dx, -dz); const t = g.player.findTarget(); if (t && t.nk === 'fish') return 'ok'; } } return 'none'; }));
await p.waitForTimeout(400); await p.keyboard.press('KeyE'); await p.waitForTimeout(400); console.log('fishing', await ev(() => JSON.stringify({ active: window.__game.workgame.active, kind: window.__game.workgame.kind, st: window.__game.workgame.fishState, t: window.__game.player.target && window.__game.player.target.kind }))); let caught = 0;
for (let i = 0; i < 120 && caught < 2; i++) { const st = await ev(() => window.__game.workgame.fishState); if (st === 'bite') { await p.keyboard.press('KeyE'); caught++; await p.waitForTimeout(300); if (caught === 1) await p.screenshot({ path: S + 'c_fish.png' }); } else await p.waitForTimeout(60); }
console.log('caught', caught, 'inv', await ev(() => window.__game.player.invText()));
console.log(logs.join('\n')); await b.close();
