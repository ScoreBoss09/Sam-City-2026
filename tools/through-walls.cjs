// Through-walls check (developer tool). With a static server running (node serve.js 8133 --no-browser):
//   node tools/through-walls.cjs [port]
// Builds a terrace with a site beside it and asks Sam's real target picker what he'd interact with: a person behind the
// outside wall, in the open, in the same room, behind a partition; the site from inside and from outside; a tree and a
// rock in the open. Nothing behind a wall should come up.
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const port = process.argv[2] || '8133';
(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto('http://127.0.0.1:' + port + '/index.html?auto&noraids'); await p.waitForTimeout(9000);
  console.log(await p.evaluate(async () => {
    const g = window.__game, B = g.buildings, w = g.world, id = 'terrace', out = [];
    for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
    let rz = -1; for (let z = 10; z < 30 && rz < 0; z++) { let ok = 0; for (let x = 6; x < 34; x++) if (w.canRoad(x, z, 2)) ok++; if (ok >= 26) rz = z; }
    for (let x = 3; x < 37; x++) w.addRoad(x, rz, 2);
    let bb = null; for (const dz of [-1, -2, -3]) for (let x = 5; x < 35 && !bb; x++) { const e = B.evaluate(id, x, rz + dz, 0); if (e.ok && e.rot === 0) bb = B.place(id, e.x0, e.z0, e.rot); }
    B.finish(bb); g.setMode('sim'); const pl = g.player; for (const t of ['axe', 'hammer', 'shovel', 'basket']) pl.tools.add(t);
    const sim = g.population.sims.find((s) => !s.hidden) || g.population.sims[0];
    const tryAt = (label, sx, sz, tx, tz, yaw) => { pl.x = sx; pl.z = sz; pl.floorY = 0; pl.yaw = yaw; g.buildings.update(0.016); sim.x = tx; sim.z = tz; sim.frozen = true; sim.mesh.visible = true; sim.inside = null; sim.hidden = false; sim.pose = 'stand'; const t = pl.findTarget(); out.push(label.padEnd(44) + (t ? t.kind + ': ' + t.text : 'nothing')); };
    // Sam inside against the right party wall (x = +3.7 inside), the sim just outside it
    tryAt('sim behind the wall (Sam inside)', bb.cx + 3.3, bb.cz + 0.0, bb.cx + 4.6, bb.cz + 0.0, -Math.PI / 2);
    tryAt('sim in the open, same distance', bb.cx + 5.3, bb.cz + 6.0, bb.cx + 6.6, bb.cz + 6.0, -Math.PI / 2);
    tryAt('sim in the same room', bb.cx + 2.0, bb.cz + 2.6, bb.cx + 3.0, bb.cz + 2.6, -Math.PI / 2);
    tryAt('sim behind a partition wall', bb.cx + 1.0, bb.cz + 1.5, bb.cx + 1.0, bb.cz + 0.4, 0);
    sim.x = bb.cx + 40; sim.z = bb.cz + 40;
    // a planned site just outside the back wall
    let site = null; for (const [dx, dz] of [[0, -1], [1, 0], [-1, 0]]) { const e = B.evaluate('shack', bb.x0 + dx, bb.z0 + dz, 0); if (e.ok) { site = B.place('shack', e.x0, e.z0, e.rot); break; } }
    if (site) { const sx = Math.max(site.x0 * 8, Math.min(bb.cx, (site.x0 + site.w) * 8)), sz = Math.max(site.z0 * 8, Math.min(bb.cz, (site.z0 + site.d) * 8)); const dirx = Math.sign(sx - bb.cx), dirz = Math.sign(sz - bb.cz);
      pl.x = bb.cx + dirx * 3.3; pl.z = bb.cz + dirz * 3.3 + (dirx ? 0.5 : 0); g.buildings.update(0.016); const t = pl.findTarget(); out.push('site behind the wall (Sam inside)'.padEnd(44) + (t ? t.kind + ': ' + t.text : 'nothing'));
      pl.x = sx + dirx * 1.5; pl.z = sz + dirz * 1.5; pl.x = sx - dirx * 1.0 + (dirz ? 6 : 0); pl.z = sz - dirz * 1.0 + (dirx ? 6 : 0); g.buildings.update(0.016); const t2 = pl.findTarget(); out.push('site from outside'.padEnd(44) + (t2 ? t2.kind + ': ' + t2.text : 'nothing') + ' (inside=' + !!g.buildings.playerInside + ')'); }
    const tr = g.terrain.trees.find((t) => t.alive && !g.buildings.buildingAtPoint(t.x, t.z)); pl.x = tr.x + 1.5; pl.z = tr.z; pl.yaw = Math.PI / 2; g.buildings.update(0.016); const t3 = pl.findTarget(); out.push('tree in the open'.padEnd(44) + (t3 ? t3.kind + ': ' + t3.text : 'nothing'));
    const rk = g.resources.nodes.find((n) => n.kind === 'rock' && n.amount > 0); if (rk) { pl.x = rk.x + 1.4; pl.z = rk.z; g.buildings.update(0.016); const t4 = pl.findTarget(); out.push('rock in the open'.padEnd(44) + (t4 ? t4.kind + ': ' + t4.text : 'nothing')); }
    return out.join('\n');
  }));
  if (errs.length) console.log(errs.join('\n')); await b.close();
})();
