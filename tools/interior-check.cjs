// Interior checker (developer tool). With a static server running (node serve.js 8133 --no-browser):
//   node tools/interior-check.cjs <port> <outDir> id1 id2 ...      e.g. node tools/interior-check.cjs 8133 /tmp/out tavern chippy
// For each building id: builds it on open land beside a road in a fresh game, finishes it, then saves a top-down cut-away
// screenshot of every storey (<outDir>/<id>_<storey>.png) and prints a JSON report: spots (work/visit/idle/beds/seats/
// counters/tables) that the indoor route finder can't reach from the front door, staff spots vs jobs, furniture count.
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const [port = '8133', out = '/tmp/interiors', ...ids] = process.argv.slice(2);
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = {};
  for (const id of ids) {
    const page = await browser.newPage({ viewport: { width: 900, height: 900 } }); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
    await page.goto(`http://127.0.0.1:${port}/index.html?auto`, { waitUntil: 'load' }); await page.waitForTimeout(8000);
    const info = await page.evaluate(async (id) => {
      const g = window.__game, B = g.buildings, w = g.world, THREE = await import('three'), F = await import('./src/render/BuildingFactory.js');
      for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
      let rz = -1; for (let z = 10; z < 30 && rz < 0; z++) { let ok = 0; for (let x = 6; x < 34; x++) if (w.canRoad(x, z, 2)) ok++; if (ok >= 26) rz = z; }
      for (let x = 3; x < 37; x++) w.addRoad(x, rz, 2);
      let b = null; for (const dz of [-1, -2, -3, 1]) for (let x = 5; x < 35 && !b; x++) { const e = B.evaluate(id, x, rz + dz, 0); if (e.ok && e.rot === 0) b = B.place(id, e.x0, e.z0, e.rot); }
      if (!b) for (const dz of [-1, -2, -3, 1, 2]) for (let x = 5; x < 35 && !b; x++) { const e = B.evaluate(id, x, rz + dz, 0); if (e.ok) b = B.place(id, e.x0, e.z0, e.rot); }
      if (!b) return { error: 'could not place' };
      B.finish(b); b.era = 2; window.__b = b;
      const it = F.buildInterior(b); it.position.set(b.cx, 0, b.cz); it.rotation.y = b.rot * Math.PI / 2; g.scene.add(it); window.__it = it;
      const n = B.navGrid(b), free = (x, z) => { if (!n) return true; const cx = Math.floor((x - n.ox) / n.C), cz = Math.floor((z - n.oz) / n.C); return !!n.free[cz * n.W + cx]; };
      const loc = (p) => [+(p.x - b.cx).toFixed(2), +(p.z - b.cz).toFixed(2)];
      const T = [...b.spots.work.map((p) => ['work', p]), ...b.spots.visit.map((p) => ['visit', p]), ...b.spots.idle.map((p) => ['idle', p]), ...b.spots.bed.filter((s) => !s.upstairs).map((s) => ['bed', { x: s.ax, z: s.az }]), ...(b.spots.seat || []).map((s) => ['seat', s]), ...(b.spots.counters || []).flatMap((c) => [['counterStaff', c.staff], ['counterCust', c.cust]])];
      const bad = [];
      for (const [k, p] of T) { const path = B.navPath(b, b.doorIn.x, b.doorIn.z, p.x, p.z); let ok = true; if (path.length === 1) { for (let i = 1; i < 24; i++) { const t = i / 24; if (!free(b.doorIn.x + (p.x - b.doorIn.x) * t, b.doorIn.z + (p.z - b.doorIn.z) * t)) { ok = false; break; } } } if (!ok) bad.push(k + '@' + loc(p).join(',')); }
      const jobs = Object.values(b.def.jobs || {}).reduce((a, c) => a + c, 0);
      return { id, rot: b.rot, size: b.def.w + 'x' + b.def.d, floors: b.def.floors || 1, furniture: b.layout.furniture.length, upper: (b.layout.upper || []).length, walls: (b.layout.walls || []).length, jobs, work: b.spots.work.length, visit: b.spots.visit.length, seats: (b.spots.seat || []).length, counters: (b.spots.counters || []).length, tables: (b.spots.tables || []).length, unreachable: bad };
    }, id);
    const floors = info.floors || 1;
    for (let k = 0; k < floors && !info.error; k++) {
      await page.evaluate((k) => {
        const g = window.__game, b = window.__b, it = window.__it, THREE = window.__THREE;
        const hide = () => { if (b.ext) { b.ext.roof.visible = false; (b.ext.levels || []).forEach((q, i) => { if (q && i > 0) q.visible = i <= k; }); } (it.userData.lv || []).forEach((q, i) => { if (q) q.visible = i <= k; }); };
        if (!g.__wrapped) { const up = g.buildings.update.bind(g.buildings); g.buildings.update = (dt) => { up(dt); hide(); }; g.__wrapped = true; } g.__hide = hide;
        g.setMode('god'); g.clock.hour = 12; const D = Math.max(b.def.w, b.def.d) * 4;
        g.god.target.set(b.cx, k * 3.2, b.cz); g.god.yaw = b.rot * Math.PI / 2; g.god.pitch = 1.5; g.god.dist = g.god.distGoal = g.god._lastDist = D * 1.55 + 2;
      }, k);
      await page.evaluate(async (k) => { const THREE = await import('three'); const g = window.__game; g.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), k * 3.2 + 2.6)]; const up = window.__game.buildings.update; window.__game.buildings.update = (dt) => { up(dt); window.__game.__hide && 0; }; }, k);
      await page.evaluate((k) => { const g = window.__game, b = window.__b, it = window.__it; const up0 = g.buildings.update; g.buildings.update = (dt) => { up0(dt); if (b.ext) { b.ext.roof.visible = false; (b.ext.levels || []).forEach((q, i) => { if (q && i > 0) q.visible = i <= k; }); } (it.userData.lv || []).forEach((q, i) => { if (q) q.visible = i <= k; }); }; document.querySelectorAll('.panel, #messages, #toast, #help').forEach((e) => { e.style.display = 'none'; }); }, k);
      await page.waitForTimeout(1800);
      await page.screenshot({ path: path.join(out, `${id}_${k}.png`) });
    }
    if (process.env.EXT && !info.error) {   // EXT=1: also a street view of the outside (<id>_ext.png), roof on
      await page.evaluate(() => { const g = window.__game, b = window.__b; g.renderer.clippingPlanes = []; window.__it.visible = false; g.buildings.update = g.buildings.constructor.prototype.update.bind(g.buildings); if (b.ext) b.ext.roof.visible = true; (b.ext.levels || []).forEach((q) => { if (q) q.visible = true; });
        g.clock.hour = 15; g.god.target.set(b.cx, 3, b.cz); g.god.yaw = b.rot * Math.PI / 2 + 0.6; g.god.pitch = 0.32; g.god.dist = g.god.distGoal = g.god._lastDist = 17; });
      await page.waitForTimeout(2500); await page.screenshot({ path: path.join(out, `${id}_ext.png`) });
    }
    info.errors = errs.slice(0, 5); report[id] = info; await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})();
