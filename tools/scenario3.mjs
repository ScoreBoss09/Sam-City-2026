import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const logs = []; p.on('console', (m) => { if (!m.text().includes('GPU stall')) logs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:8123/index.html?auto&scale=0.5'); await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
// Walk into the town hall with real key events
await ev(() => { const g = window.__game; g.clock.speed = 0; const th = g.townhall; g.player.teleport(th.doorOut.x, th.doorOut.z + 6, 0); g.player.yaw = 0; g.player.pitch = -0.1; });
await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await p.keyboard.up('KeyW');
console.log('after walk:', await ev(() => { const g = window.__game; const th = g.townhall; return JSON.stringify({ x: g.player.x.toFixed(1), z: g.player.z.toFixed(1), inside: !!g.buildings.playerInside, hall: [th.cx, th.cz] }); }));
// teleport next to a terminal, check target, press E
await ev(() => { const g = window.__game; const t = g.townhall.spots.terminal[0]; g.player.teleport(t.x, t.z + 0.4, 0); g.player.yaw = 0; });
await p.waitForTimeout(500);
console.log('target:', await ev(() => { const t = window.__game.player.target; return t && t.kind; }));
await p.keyboard.press('KeyE'); await p.waitForTimeout(400);
console.log('terminal open:', await ev(() => window.__game.ui.modalOpen));
await p.screenshot({ path: S + 'sc3_term.png' });
// click order + permit buttons
await p.click('button[data-k="materials"]'); await p.click('button[data-act="order"][data-m="timber"][data-q="5"]'); await p.click('button[data-act="order"][data-m="stone"][data-q="5"]');
await p.click('button[data-k="permits"]'); await p.click('button[data-act="permit"][data-id="lumbercamp"]');
console.log('after terminal:', await ev(() => { const g = window.__game; return JSON.stringify({ flags: g.flags, orders: g.economy.orders.length, permits: [g.economy.permits.lumbercamp], funds: g.economy.funds }); }));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
console.log('closed:', await ev(() => !window.__game.ui.modalOpen));
// collision test: walk into a wall of the hall for 1s
await ev(() => { const g = window.__game; const th = g.townhall; g.player.teleport(th.cx, th.cz, 0); g.player.yaw = Math.PI / 2; }); // face -x (west)
await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await p.keyboard.up('KeyW');
console.log('wall stop:', await ev(() => { const g = window.__game, th = g.townhall; return JSON.stringify({ x: g.player.x.toFixed(2), wallX: (th.cx - 4).toFixed(2) }); }));
// Tab toggle
await p.keyboard.press('Tab'); await p.waitForTimeout(300);
console.log('mode:', await ev(() => window.__game.mode));
await p.keyboard.press('Tab'); await p.waitForTimeout(300);
console.log('mode:', await ev(() => window.__game.mode));
console.log(logs.slice(0, 20).join('\n')); await b.close();
