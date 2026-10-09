// node tools/round15.mjs -> skills, council challenges, wedding, Bonfire Night fireworks, market stalls, thunderstorm and morning mist
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); const logs = []; p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' && !/404|GPU stall/.test(m.text())) logs.push('console: ' + m.text()); });
await p.goto('http://localhost:8123/index.html?auto&demo&scale=0.5&noraids'); await p.waitForTimeout(1200);
const ev = (f, a) => p.evaluate(f, a);
const shot = async (n) => { await p.waitForTimeout(150); await p.screenshot({ path: S + 'r15_' + n + '.png' }); };

console.log('skills', await ev(() => { const g = window.__game, k = g.skills; const l0 = k.level('chop'), b0 = k.bonus('chop'); k.gain('chop', 45); return `chop lv ${l0} -> ${k.level('chop')} (${k.title('chop')}), bonus ${b0} -> ${k.bonus('chop').toFixed(2)}, zone x${k.zone('chop').toFixed(2)}, total ${k.total()}`; }));
await ev(() => window.__game.ui.openJournal()); await shot('journal'); await ev(() => window.__game.ui.closeJournal());

console.log('challenges', await ev(() => { const g = window.__game, B = g.buildings, d = g.depot; let ok = false; for (let dx = -4; dx <= 4 && !ok; dx++) for (let dz = -4; dz <= 4 && !ok; dz++) { const r = B.evaluate('postbox', Math.floor(d.doorOut.x / 4) + dx, Math.floor(d.doorOut.z / 4) + dz, 0); if (r.ok) { B.place('postbox', r.x0, r.z0, r.rot, { instant: true }); ok = true; } }
  g.started = true; const f0 = g.economy.funds; g.economy.stock.food = 50; g.economy.stock.timber = 60; g.advance(3); return `postbox ${ok}; done ${g.flags.challenges.join(',')}; funds +${g.economy.funds - f0}; open now: ${g.challenges.open().map((c) => c.id + ' ' + g.challenges.progress(c).have + '/' + c.need).join(', ')}`; }));
await ev(() => { const g = window.__game; g.ui.openTerminal(g.buildings.byDef('postbox')[0], 'post'); g.ui.terminalTab = 'challenges'; g.ui.renderTerminal(); }); await shot('challenges'); await ev(() => window.__game.ui.closeTerminal());

console.log('wedding', await ev(() => { const g = window.__game, P = g.population, c = g.clock; let a = P.adults().find((s) => s.partner && s.partner.kind === 'resident');
  if (!a) { const [x, y] = P.adults().filter((s) => !s.partner).slice(0, 2); g.social.couple ? g.social.couple(x, y) : (x.partner = y, y.partner = x); a = x; }
  P.adults().forEach((s) => { s.coupleDay = -10; s.married = false; }); while (c.totalDays % 7 !== 4) c.totalDays++; c.hour = 9.5; g.advance(1); const w = g.celebrations.wed; if (!w) return 'no wedding planned';
  c.totalDays++; c.hour = 10.9; g.advance(3); const live = !!(g.celebrations.wed && g.celebrations.wed.live); g.advance(60); const at = g.population.sims.filter((s) => s.activity === 'event').length; const [cx, cz] = w.couple(0); const dA = Math.hypot(w.a.x - cx, w.a.z - cz).toFixed(1);
  g.setMode('sim'); const ch = w.church, ux = ch.doorOut.x - ch.cx, uz = ch.doorOut.z - ch.cz, L = Math.hypot(ux, uz); g.player.teleport(cx + ux / L * 11, cz + uz / L * 11); g.player.yaw = Math.atan2(ux, uz); g.player.third = true; g.player.pitch = 0.05; c.hour = 12.1; window.__w = w; g.setMode('god'); g.god.target.set(cx, 0, cz); g.god.dist = 28;
  return `${w.a.name} & ${w.b.name}: live ${live}, ${w.guests.size} guests, ${at} at the event, bride/groom ${dA} m from the door`; }));
await ev(() => { for (let i = 0; i < 40; i++) window.__game.update(0.05); }); await shot('wedding');
console.log('  after', await ev(() => { const g = window.__game, w = window.__w; g.clock.hour = 13.6; g.advance(2); return `married ${!!w.a.married}/${!!w.b.married}, weddings ${g.flags.weddings}, wed now ${g.celebrations.wed}`; }));

console.log('bonfire', await ev(() => { const g = window.__game, c = g.clock; c.month = 10; c.day = 5; c.hour = 18.4; g.advance(2); const bf = g.celebrations.bonfire; if (!bf) return 'no bonfire'; g.advance(40); c.hour = 19.6;
  const at = g.population.sims.filter((s) => s.activity === 'event').length; g.setMode('sim'); g.player.teleport(bf.x + 16, bf.z + 16); g.player.yaw = Math.atan2(16, 16) - 0.25; g.player.third = true; g.player.pitch = 0.32; window.__bf = bf; return `lit at ${bf.x.toFixed(0)},${bf.z.toFixed(0)}; ${at} in the crowd`; }));
await ev(() => { const g = window.__game, bf = window.__bf; for (let i = 0; i < 4; i++) g.fireworks.launch(bf.fx + i * 3, bf.fz, { h: 18 + i * 3 }); for (let i = 0; i < 26; i++) g.update(0.05); }); await shot('bonfire');
console.log('  fireworks alive', await ev(() => window.__game.fireworks.alive), 'flash', await ev(() => window.__game.atmosphere.flash.toFixed(2)));
console.log('  after', await ev(() => { const g = window.__game; g.clock.hour = 22.6; g.advance(1); return `bonfire gone: ${!g.celebrations.bonfire}, bonfires ${g.flags.bonfires}, sims at event ${g.population.sims.filter((s) => s.activity === 'event').length}`; }));

console.log('market', await ev(() => { const g = window.__game, c = g.clock; c.month = 5; c.day = 3; while (c.totalDays % 7 !== 2) c.totalDays++; c.hour = 9.2; g.advance(1); const m = g.celebrations.market; if (!m) return 'no market';
  g.advance(40); const st = g.celebrations.stalls.find((s) => s.id === 'swap'); g.player.inv = { timber: 4, stone: 2 }; g.player.teleport(st.x, st.z); g.update(0.05); const tgt = g.player.target && g.player.target.text; const f0 = g.economy.funds; g.celebrations.useStall(st); const sold = g.economy.funds - f0;
  const veg = g.celebrations.stalls.find((s) => s.id === 'veg'); g.celebrations.useStall(veg); const dip = g.celebrations.stalls.find((s) => s.id === 'dip'); g.celebrations.useStall(dip);
  const v = g.celebrations.stalls[0], a = Math.atan2(m.x - v.x, m.z - v.z); g.setMode('god'); g.god.target.set(m.x, 0, m.z); g.god.dist = 26; c.hour = 11;
  return `at the ${m.site.def.name}; prompt "${tgt}"; sold for £${sold}; inv now ${g.player.invText()}; market count ${g.flags.market}; shoppers ${g.population.sims.filter((s) => s.activity === 'leisure' && Math.hypot(s.x - m.x, s.z - m.z) < 10).length}`; }));
await ev(() => { for (let i = 0; i < 20; i++) window.__game.update(0.05); }); await shot('market');
await ev(() => { const g = window.__game, bf = { x: g.celebrations.market.x, z: g.celebrations.market.z }; g.setMode('god'); g.god.dist = 60; g.clock.hour = 21; for (let i = 0; i < 6; i++) g.fireworks.launch(bf.x + i * 4 - 10, bf.z, { h: 16 + i * 2 }); for (let i = 0; i < 28; i++) g.update(0.05); }); await shot('fireworks_god');

console.log('storm', await ev(() => { const g = window.__game, w = g.weather; g.clock.month = 6; g.clock.hour = 15; w.storm = true; w.want = 1; w.rain = 1; w.timer = 999; w.snowy = false; for (let i = 0; i < 4; i++) g.update(0.05); w.strike(); for (let i = 0; i < 2; i++) g.update(0.03); return `flash ${w.flash.toFixed(2)} bolt ${w.bolt.visible}`; }));
await shot('storm');
console.log('mist', await ev(() => { const g = window.__game, w = g.weather; w.storm = false; w.want = 0; w.rain = 0; g.clock.month = 10; g.clock.totalDays += 1; g.clock.hour = 3.5; g.update(0.05); w.mistK = 1; g.clock.hour = 7; for (let i = 0; i < 80; i++) g.update(0.05); return `mist ${w.mist.toFixed(2)} fog ${g.scene.fog.near.toFixed(0)}-${g.scene.fog.far.toFixed(0)}`; }));
await shot('mist');
await ev(() => { const g = window.__game; g.setMode('god'); for (let i = 0; i < 10; i++) g.update(0.05); }); await shot('mist_god');
console.log(logs.length ? logs.slice(0, 10).join('\n') : 'LOGS: clean'); await b.close();
