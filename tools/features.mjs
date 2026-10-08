// node tools/features.mjs -> checks: lift countdown, campfire sitting, postbox letters, one-person cabin, target lock, visitors
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) logs.push(m.text()); });
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { const g = window.__game, B = g.buildings, d = g.lift.doorOut, tx = Math.floor(d.x / 4), tz = Math.floor(d.z / 4); g.clock.hour = 10;
  for (let z = tz; z < tz + 10; z++) g.world.addRoad(tx, z, 1); for (const it of g.tools.items) { g.tools.take(it); g.player.tools.add(it.id); }
  const put = (id, x, z) => { const r = B.evaluate(id, x, z, 0); return r.ok ? B.place(id, r.x0, r.z0, r.rot, { instant: true }) : null; };
  window.__cab = put('shack', tx + 1, tz + 3); window.__camp = put('campfire', tx - 3, tz + 4); window.__pb = put('postbox', tx + 1, tz + 6); window.__yard = put('stockyard', tx - 2, tz + 8); g.economy.stock.food = 20; g.setMode('sim'); });
// one-person cabin: it became Sam's home
console.log('cabin', await ev(() => { const g = window.__game, c = window.__cab; return c && JSON.stringify({ beds: c.spots.bed.length, home: g.starterHome === c, w: c.w }); }));
// lift countdown
await ev(() => { const g = window.__game, L = g.lift; g.player.teleport(L.cx, L.cz); });
await p.waitForTimeout(2500); console.log('countdown shown', await ev(() => document.getElementById('countdown').textContent));
await ev(() => { const g = window.__game; g.player.teleport(g.lift.doorOut.x, g.lift.doorOut.z + 12); }); await p.waitForTimeout(400);
console.log('countdown after stepping off', await ev(() => document.getElementById('countdown').classList.contains('hidden')), 'sedated?', await ev(() => window.__game.player.sedated > 0));
// campfire: sit
await ev(() => { const g = window.__game, s = window.__camp.spots.seat[0]; g.player.teleport(s.x + 0.5, s.z); g.player.energy = 40; }); await p.waitForTimeout(300);
console.log('seat prompt', await ev(() => document.getElementById('prompt-text').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
console.log('sitting?', await ev(() => !!window.__game.player.seat), 'energy', await ev(() => Math.round(window.__game.player.energy)));
await p.screenshot({ path: S + 'feat_sit.png' });
await p.keyboard.down('KeyW'); await p.waitForTimeout(300); await p.keyboard.up('KeyW'); console.log('stood up?', await ev(() => !window.__game.player.seat));
// postbox
await ev(() => { const g = window.__game, pb = window.__pb; g.mail.send('Test', 'Hello', 'Body'); g.player.teleport(pb.cx, pb.cz + 1.6); }); await p.waitForTimeout(300);
console.log('post prompt', await ev(() => document.getElementById('prompt-text').textContent)); await p.keyboard.press('KeyE'); await p.waitForTimeout(400);
await p.screenshot({ path: S + 'feat_post.png' }); console.log('letters', await ev(() => window.__game.mail.letters.length)); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
// lock: start chopping, then walk away: the job must let go
await ev(() => { const g = window.__game; let best = null, bd = 1e9; for (const t of g.terrain.trees) { if (!t.alive || Math.hypot(t.x - g.lift.trigger.x, t.z - g.lift.trigger.z) < 26) continue; const d = Math.hypot(t.x - g.player.x, t.z - g.player.z); if (d < bd) { bd = d; best = t; } } const st = g.resources.standPoint(best, best); g.player.teleport(st.x, st.z); g.player.yaw = Math.atan2(-(best.x - st.x), -(best.z - st.z)); window.__tree = best; });
await p.waitForTimeout(200); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); console.log('locked', await ev(() => !!window.__game.player.lock));
await ev(() => { const g = window.__game; g.player.teleport(g.player.x + 25, g.player.z); }); await p.waitForTimeout(300);
console.log('far away -> lock released', await ev(() => !window.__game.player.lock), 'minigame hidden', await ev(() => !window.__game.workgame.active));
// visitors
await ev(() => { const g = window.__game; g.population.visitorTimer = 0; g.advance(3); for (let i = 0; i < 6; i++) g.advance(10); });
console.log('visitors', await ev(() => JSON.stringify(window.__game.population.sims.filter((s) => s.kind === 'visitor').map((s) => [s.activity, s.phase, s.visits, s.emote && s.emote.upper]))));
console.log(logs.join('\n')); await b.close();
