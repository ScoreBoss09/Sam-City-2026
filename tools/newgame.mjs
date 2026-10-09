// node tools/newgame.mjs -> plays the opening of a new game through real key presses / clicks, printing objective progress
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5&noraids'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
const state = async (l) => console.log(l.padEnd(26), JSON.stringify(await ev(() => { const g = window.__game, o = g.story.currentObjective; return { obj: o && o.title, steps: o && o.steps.map((s) => (s.done(g) ? 1 : 0)).join(''), sims: g.population.sims.filter((s) => !s.hidden).length, mode: g.mode, plans: g.roadPlans.count, roads: g.flags.pathsBuilt || 0, inv: g.player.invText(), tools: [...g.player.tools].join(','), hunger: Math.round(g.player.hunger), energy: Math.round(g.player.energy), stock: g.economy.stock.timber + 't/' + g.economy.stock.food + 'f', b: g.buildings.list.map((q) => q.id + ':' + q.state).join(' ') }; })));
const screen = (wx, wz) => ev(([x, z]) => { const g = window.__game, v = new (g.camera.position.constructor)(x, 0, z).project(g.camera), r = document.getElementById('view').getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, [wx, wz]);
// tap E whenever the timing marker sits in the gold/green zone (like a player would)
const work = async (ms, until, arg) => { const t0 = Date.now(); await p.keyboard.press('KeyE'); while (Date.now() - t0 < ms) { if (until && await ev(until, arg)) break; const ok = await ev(() => { const w = window.__game.workgame; if (!w.active) return 'start'; return Math.abs(w.pos - w.center) < w.k.perfect / 2 ? 'hit' : ''; }); if (ok || Date.now() - (work.last || 0) > 400) { await p.keyboard.press('KeyE'); work.last = Date.now(); } else await p.waitForTimeout(8); } };
await state('start');
await p.screenshot({ path: S + 'ng_0.png' });
// ---- god mode: path, stockyard, hut
await p.click('button.tool[data-t="road"]'); await p.waitForTimeout(200);
const lift = await ev(() => { const d = window.__game.lift.doorOut; return [d.x, d.z]; });
await ev(() => { const g = window.__game; g.god.dist = 70; g.god.target.set(g.lift.doorOut.x, 0, g.lift.doorOut.z + 14); }); await p.waitForTimeout(300);
const tx = Math.floor(lift[0] / 8); const z0 = Math.floor(lift[1] / 8);
let [ax, ay] = await screen((tx + 0.5) * 8, (z0 + 0.5) * 8); let [bx, by] = await screen((tx + 0.5) * 8, (z0 + 4.5) * 8);
await p.mouse.move(ax, ay); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(ax + (bx - ax) * i / 12, ay + (by - ay) * i / 12); await p.waitForTimeout(40); } await p.mouse.up();
await state('after path drag');
const placeAt = async (tab, id) => {
  await p.click('button.tool[data-t="build"]'); await p.waitForTimeout(100); if (tab) { await p.click(`button.subtab[data-tab="${tab}"]`); await p.waitForTimeout(100); } await p.click(`button.sub[data-s="${id}"]`); await p.waitForTimeout(100);
  const spot = await ev(([id, tx, z0]) => { const B = window.__game.buildings; for (let dz = 1; dz < 7; dz++) for (const dx of [-1, 1, -2, 2, -3, 3]) { const r = B.evaluate(id, tx + dx, z0 + dz, 0); if (r.ok) return [r.geo.cx, r.geo.cz, tx + dx, z0 + dz]; } return null; }, [id, tx, z0]);
  if (!spot) { console.log('no spot for', id); return; }
  const [sx, sy] = await screen((spot[2] + 0.5) * 8, (spot[3] + 0.5) * 8); await p.mouse.move(sx, sy); await p.waitForTimeout(300); await p.mouse.click(sx, sy); await p.waitForTimeout(200);
};
await placeAt('Civic', 'stockyard'); await placeAt('Homes', 'shack');
await state('after ordering');
await p.screenshot({ path: S + 'ng_1.png' });
// ---- sim mode: tools
await p.keyboard.press('Escape'); await p.keyboard.press('Tab'); await p.waitForTimeout(300); await state('TAB');
for (const id of ['axe', 'hammer', 'shovel', 'basket']) { await ev((id) => { const g = window.__game, it = g.tools.items.find((i) => i.id === id); g.player.teleport(it.x, it.z + 1.2); }, id); await p.waitForTimeout(250); await p.keyboard.press('KeyE'); await p.waitForTimeout(150); }
await state('tools');
await p.screenshot({ path: S + 'ng_2.png' });
// ---- dig the planned path
for (let k = 0; k < 12 && await ev(() => window.__game.roadPlans.count); k++) { await ev(() => { const g = window.__game, q = [...g.roadPlans.plans.values()][0]; g.player.teleport(q.cx, q.cz); }); await p.waitForTimeout(150); await work(6000, () => !window.__game.roadPlans.count || ![...window.__game.roadPlans.plans.values()].some((q) => Math.hypot(q.cx - window.__game.player.x, q.cz - window.__game.player.z) < 3)); }
await state('dug');
// ---- chop & deliver to both sites
const haul = async (id) => {
  for (let k = 0; k < 10; k++) {
    const full = await ev((id) => { const s = window.__game.buildings.list.find((q) => q.id === id); return !s || s.state !== 'site' || Object.keys(s.need).every((m) => (s.have[m] || 0) >= s.need[m]); }, id); if (full) break;
    await ev(() => { const g = window.__game, R = g.resources; let best = null, bd = 1e9; for (const t of g.terrain.trees) { if (!t.alive || Math.hypot(t.x - g.lift.trigger.x, t.z - g.lift.trigger.z) < 26) continue; const d = Math.hypot(t.x - g.player.x, t.z - g.player.z); if (d < bd) { bd = d; best = t; } } const st = R.standPoint(best, best); g.player.teleport(st.x, st.z); g.player.heading = Math.atan2(best.x - st.x, best.z - st.z); g.player.yaw = g.player.heading + Math.PI; });
    await p.waitForTimeout(150); await work(12000, () => window.__game.player.invTotal() >= 10);
    await ev((id) => { const g = window.__game, s = g.buildings.list.find((q) => q.id === id); g.player.teleport(s.doorOut.x, s.doorOut.z); }, id); await p.waitForTimeout(200); await p.keyboard.press('KeyE'); await p.waitForTimeout(200);
  }
  await ev((id) => { const g = window.__game, s = g.buildings.list.find((q) => q.id === id); g.player.teleport(s.doorOut.x, s.doorOut.z); }, id); await p.waitForTimeout(200);
  console.log('  site before build', await ev((id) => { const s = window.__game.buildings.list.find((q) => q.id === id); return JSON.stringify(s.have) + ' ' + s.state; }, id)); await ev((id) => { const g = window.__game, s = g.buildings.list.find((q) => q.id === id); g.player.teleport(s.cx, s.cz); }, id); const t0 = Date.now(); await work(20000, (id) => window.__game.buildings.list.some((q) => q.id === id && q.state === 'done'), id); console.log('  built in', ((Date.now() - t0) / 1000).toFixed(1), 's; stuck?', await ev(() => { const g = window.__game; return g.world.collides(g.player.x, g.player.z, 0.4); }));
};
await haul('stockyard'); await state('stockyard');
await haul('shack'); await state('cabin');
// ---- eat: berries
await ev(() => { const g = window.__game, n = g.resources.nodes.filter((q) => q.kind === 'berry' && q.amount >= 1).sort((a, b) => Math.hypot(a.x - g.player.x, a.z - g.player.z) - Math.hypot(b.x - g.player.x, b.z - g.player.z))[0]; const st = g.resources.standPoint(n, n); g.player.teleport(st.x, st.z); g.player.inv = {}; g.player.hunger = 70; });
await p.waitForTimeout(150); await work(5000, () => (window.__game.player.inv.food || 0) >= 4); await p.keyboard.press('KeyQ'); await p.waitForTimeout(300);
await state('ate');
await ev(() => window.__game.advance(5)); await state('end');
await p.keyboard.press('KeyR'); await p.waitForTimeout(200); console.log('dropped -> piles', await ev(() => window.__game.piles.list.length), 'inv', await ev(() => window.__game.player.invText())); await p.keyboard.press('KeyE'); await p.waitForTimeout(200); console.log('picked up -> inv', await ev(() => window.__game.player.invText())); await p.keyboard.press('KeyI'); await p.waitForTimeout(300); await p.screenshot({ path: S + 'ng_inv.png' }); await p.keyboard.press('KeyI');
await p.waitForTimeout(300); await p.screenshot({ path: S + 'ng_3.png' });
console.log(logs.slice(0, 15).join('\n')); await b.close();
