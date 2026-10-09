// node tools/placefuzz.mjs -> real-mouse new game flow, then tries placing after lots of different actions; reports why the ghost is missing
import { chromium } from '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/node_modules/playwright-core/index.mjs';
const S = '/tmp/claude-0/-home-user-Sam-City-2026/6309cccc-23e7-5301-8e65-4b7cab65a79b/scratchpad/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); p.on('pageerror', (e) => console.log('PAGEERROR: ' + e.stack));
await p.goto('http://localhost:8123/index.html?scale=0.5'); await p.waitForTimeout(1200);
const ev = (f, a) => p.evaluate(f, a);
const state = () => ev(() => { const g = window.__game, gc = g.god; return JSON.stringify({ mode: g.mode, tool: gc.tool, ghost: gc.ghost.visible, tile: gc.tileBox.visible, modal: g.ui.modalOpen, over: g.ui.mouseOverCanvas, pad: g.input.padActive, locked: g.input.locked, mx: +g.input.mouse.x.toFixed(2), my: +g.input.mouse.y.toFixed(2), hover: document.getElementById('hover').textContent.slice(0, 50), under: (document.elementFromPoint(700, 420) || {}).id || (document.elementFromPoint(700, 420) || {}).className }); });
const pickBuilding = async (tab, name) => { await p.click('#toolbox .tool[data-t="build"]'); await p.waitForTimeout(200); await p.click(`#submenu .subtab[data-tab="${tab}"]`); await p.waitForTimeout(200); const btn = p.locator('#submenu button.sub', { hasText: name }).first(); await btn.click(); await p.waitForTimeout(200); };
const hover = async () => { await p.mouse.move(650, 400, { steps: 5 }); await p.mouse.move(700, 420, { steps: 5 }); await p.waitForTimeout(250); };
await p.click('#btn-new'); await p.waitForTimeout(600); await p.click('#btn-howto'); await p.waitForTimeout(400);
await pickBuilding('Homes', 'Log Cabin'); await hover(); console.log('1 new game, pick cabin, hover:', await state());
await p.mouse.click(700, 420); await p.waitForTimeout(300); console.log('  after click: sites', await ev(() => window.__game.buildings.list.filter((b) => b.state === 'site').length));
// road tool then back
await p.click('#toolbox .tool[data-t="road"]'); await p.waitForTimeout(150); await hover(); console.log('2 road tool:', await state());
await pickBuilding('Civic', 'Stockyard'); await hover(); console.log('3 stockyard:', await state());
// to sim and back with Tab
await p.keyboard.press('Tab'); await p.waitForTimeout(500); await p.mouse.click(640, 380); await p.waitForTimeout(300); await p.keyboard.press('Tab'); await p.waitForTimeout(500);
await pickBuilding('Homes', 'Log Cabin'); await hover(); console.log('4 after sim mode:', await state());
// toast under the cursor
await ev(() => window.__game.ui.toast('A toast right here', 3000)); await hover(); console.log('5 toast up:', await state());
// escape key then pick again
await p.keyboard.press('Escape'); await p.waitForTimeout(200); await pickBuilding('Homes', 'Log Cabin'); await hover(); console.log('6 after Esc:', await state());
// a message arrives / submenu refresh while hovering
await ev(() => window.__game.ui.refreshSub()); await hover(); console.log('7 after submenu refresh:', await state());
await p.screenshot({ path: S + 'placefuzz.png' });
await b.close();
