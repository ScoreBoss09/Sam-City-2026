// Terrace walk-through (developer tool). With a static server running (node serve.js 8133 --no-browser):
//   node tools/terrace-walk.cjs [port]
// Builds a Victorian terrace in a fresh game, then steers Sam with his real movement code (Player.tryMove) through the
// front door, every downstairs room, up the stairs, every upstairs room, back down and out, approaching doorways at an
// angle. Prints ok / STUCK for each waypoint; any STUCK means Sam can't get round the house there.
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const port = process.argv[2] || '8133';
(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + port + '/index.html?auto&noraids'); await p.waitForTimeout(9000);
  const out = await p.evaluate(() => {
    const g = window.__game, B = g.buildings, w = g.world, id = 'terrace';
    for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
    let rz = -1; for (let z = 10; z < 30 && rz < 0; z++) { let ok = 0; for (let x = 6; x < 34; x++) if (w.canRoad(x, z, 2)) ok++; if (ok >= 26) rz = z; }
    for (let x = 3; x < 37; x++) w.addRoad(x, rz, 2);
    let bb = null; for (const dz of [-1, -2, -3]) for (let x = 5; x < 35 && !bb; x++) { const e = B.evaluate(id, x, rz + dz, 0); if (e.ok && e.rot === 0) bb = B.place(id, e.x0, e.z0, e.rot); }
    B.finish(bb); bb.doorK = 1; bb.doorHeld = true;
    g.mode = 'sim'; const pl = g.player; pl.teleport(bb.cx - 2, bb.cz + 5.5);
    const log = [];
    const go = (lx, lz, name, y) => {
      const tx = bb.cx + lx, tz = bb.cz + lz; let t = 0;
      for (; t < 900; t++) { const dx = tx - pl.x, dz = tz - pl.z, d = Math.hypot(dx, dz); if (d < 0.15) break; const s = Math.min(d, 4.5 / 60); pl.tryMove(dx / d * s, dz / d * s); }
      const d = Math.hypot(tx - pl.x, tz - pl.z); log.push((d < 0.15 ? 'ok   ' : 'STUCK') + ' ' + name + ' at ' + (pl.x - bb.cx).toFixed(2) + ',' + (pl.z - bb.cz).toFixed(2) + ' y=' + (pl.floorY || 0).toFixed(2) + ' (' + t + ' steps)'); return d < 0.15;
    };
    // ground floor
    go(-2, 3.4, 'in the front door'); go(-1.6, 3.0, 'hall'); go(0.6, 2.6, 'diag into parlour'); go(2.8, 2.6, 'parlour right'); go(0.0, 2.0, 'parlour by lamp'); go(-0.3, 3.0, 'parlour door'); go(-1.6, 3.0, 'back to hall'); go(-1.6, -0.2, 'hall by back room');
    go(0.4, -0.5, 'diag into back room'); go(1.1, 0.6, 'back room by table'); go(-0.2, -1.0, 'back room by kitchen door'); go(0.6, -2.2, 'diag into kitchen'); go(2.9, -2.2, 'kitchen right'); go(-0.4, -2.9, 'kitchen hall door');
    go(-1.8, -3.0, 'hall under the stairs'); go(-1.8, 2.9, 'hall front'); go(-3.1, 2.9, 'foot of stairs'); go(-3.1, -3.0, 'up the stairs');
    go(-1.8, -3.0, 'landing back'); go(0.2, -2.3, 'diag into bathroom'); go(-1.6, -2.0, 'out to landing');
    go(0.2, 0.1, 'diag into back bedroom'); go(2.2, -1.2, 'back bedroom foot of beds'); go(3.2, -0.2, 'back bedroom corner'); go(-1.6, 0.0, 'out to landing'); go(-1.6, 1.9, 'landing by front bedroom');
    go(0.5, 2.0, 'diag into front bedroom'); go(1.0, 3.2, 'front bedroom by window'); go(1.2, 1.3, 'front bedroom foot of bed'); go(-1.6, 2.2, 'out to landing');
    go(-1.8, -3.0, 'landing back'); go(-3.1, -3.0, 'top of stairs'); go(-3.1, -2.4, 'step onto the flight'); go(-3.1, 2.9, 'down the stairs'); go(-2, 3.4, 'front door'); go(-2, 5.5, 'outside');
    return log;
  });
  console.log(out.join('\n')); if (errs.length) console.log(errs.join('\n')); await b.close(); process.exit(out.some((l) => l.startsWith('STUCK')) ? 1 : 0);
})();
