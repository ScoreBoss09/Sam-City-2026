import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const DAYS = +(process.argv[2] || 14);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 650 } });
const logs = []; p.on('console', (m) => { if (!/GPU stall|404/.test(m.text())) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5'); await p.waitForTimeout(600);
await p.evaluate(() => {
  const g = window.__game, B = g.buildings, w = g.world, E = g.economy; g.clock.speed = 1; window.msgs = []; g.messages.on('msg', (m) => window.msgs.push(m.from + ': ' + m.text));
  E.stock.food = 20; const order = ['stockyard', 'surveyor', 'forager', 'hut', 'campfire', 'lumbercamp', 'hut', 'contractor', 'hut', 'forager', 'cabin', 'quarry', 'farm', 'cabin', 'well', 'cabin', 'tavern', 'brickworks', 'cabin', 'cottage', 'cottage', 'shop', 'school', 'cottage', 'cottage'];
  let idx = 0, roadRow = 21; window.bot = { placed: [], idx: 0 };
  const ensureRoads = () => { for (let x = 9; x <= 31; x++) w.addRoad(x, 15, 1); for (let x = 9; x <= 31; x++) w.addRoad(x, roadRow, 1); for (let z = 15; z <= roadRow; z++) { w.addRoad(9, z, 1); w.addRoad(19, z, 1); w.addRoad(31, z, 1); } };
  const spot = (id) => { for (let z = 6; z < 36; z++) for (let x = 4; x < 38; x++) { const r = B.evaluate(id, x, z, 0); if (r.ok) return r; } return null; };
  const tick = () => {
    if (E.stock.timber < 30) E.stock.timber += 8; if (E.stock.stone < 10 && B.count('quarry') === 0) E.stock.stone += 4; // stand-in for the player gathering
    E.funds = Math.max(E.funds, 1500);
    const id = order[idx]; if (!id) return;
    if (E.permits[id] === 'locked') { E.requestPermit(id); }
    if (E.permits[id] !== 'approved') return;
    ensureRoads(); const r = spot(id); if (!r) { idx++; return; }
    const site = B.place(id, r.x0, r.z0, r.rot); window.bot.placed.push(id); idx++;
    if (B.count('contractor') === 0 || g.population.count() < 4) { // the player builds it himself
      for (const m of Object.keys(site.need)) { const n = site.need[m]; if (E.stock[m] < n) E.stock[m] = n; E.stock[m] -= n; B.deliver(site, m, n); } B.addWork(site, 999); }
  };
  g.clock.on('hour', () => { try { tick(); } catch (e) { console.error(e); } });
});
for (let d = 0; d < DAYS; d++) { if (process.env.DIAG && d >= 10) for (let k = 0; k < 3; k++) console.log(await p.evaluate(() => { window.__game.advance(0.5); return 1; }) && await p.evaluate(() => JSON.stringify(window.__game.population.residents().map((s) => [s.name, s.activity, Math.round(s.hunger), s.phase, s.eatCD | 0, s.eating ? 1 : 0, s.path.length, s.inside ? s.inside.id : "-", s.sitting ? s.sitting.kind : "", s.x.toFixed(0), s.z.toFixed(0), s.down || 0, s.panic ? 1 : 0, s.packed || 0, s.path[0] ? [s.path[0].x.toFixed(1), s.path[0].z.toFixed(1)] : null, s.freezeT || 0, s.frozen ? 1 : 0, s.chat ? 1 : 0, s.glide ? 1 : 0]))));
  console.log(await p.evaluate(() => { const g = window.__game; g.advance(240); const c = {}; for (const s of g.population.residents()) { const k = s.role || s.kind; c[k] = (c[k] || 0) + 1; } const st = g.economy.stock; const done = g.buildings.list.filter((b) => b.state === 'done').length, sites = g.buildings.list.filter((b) => b.state === 'site').length;
    return `day${g.clock.totalDays} pop${g.population.count()} (${g.population.sims.filter((s) => s.kind === 'child').length}kids, ${g.population.adults().filter((s) => s.partner).length / 2 | 0} couples) bld${done}+${sites} T${st.timber | 0} S${st.stone | 0} B${st.brick | 0} F${st.food | 0} hunger${Math.round(g.population.residents().reduce((a, s) => a + s.hunger, 0) / Math.max(1, g.population.count()))} mood${(g.population.residents().reduce((a, s) => a + s.mood, 0) / Math.max(1, g.population.count())).toFixed(2)} ` + JSON.stringify(c); }));
}
console.log((await p.evaluate(() => window.msgs.filter((m) => /couple|friends|left|family|grown|hungry|NO food/.test(m)).slice(0, 14))).join('\n'));
console.log(logs.slice(0, 10).join('\n')); await b.close();
