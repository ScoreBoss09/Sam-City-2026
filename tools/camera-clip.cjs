// Indoor camera clipping check (developer tool). With a static server running (node serve.js 8133 --no-browser):
//   node tools/camera-clip.cjs <building id> [port]          e.g. node tools/camera-clip.cjs terrace
// Builds the building in a fresh game, stands Sam everywhere he can stand on every storey (and the roof), turns him to
// 8 directions at two pitches, runs his real third-person camera, then ray-tests the drawn meshes: is anything between
// his head and the camera, or between the camera and the corners of its near plane? Prints how many poses clip and why.
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const id = process.argv[2] || 'terrace', port = process.argv[3] || '8133';
(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://127.0.0.1:' + port + '/index.html?auto&noraids'); await p.waitForTimeout(9000);
  const out = await p.evaluate(async (id) => {
    const g = window.__game, B = g.buildings, w = g.world, THREE = await import('three');
    for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
    let rz = -1; for (let z = 10; z < 30 && rz < 0; z++) { let ok = 0; for (let x = 6; x < 34; x++) if (w.canRoad(x, z, 2)) ok++; if (ok >= 26) rz = z; }
    for (let x = 3; x < 37; x++) w.addRoad(x, rz, 2);
    let bb = null; for (const dz of [-1, -2, -3]) for (let x = 5; x < 35 && !bb; x++) { const e = B.evaluate(id, x, rz + dz, 0); if (e.ok && e.rot === 0) bb = B.place(id, e.x0, e.z0, e.rot); }
    B.finish(bb); g.setMode('sim'); const pl = g.player; pl.third = true;
    pl.teleport(bb.cx - 2, bb.cz + 3); g.buildings.update(0.016);   // builds the interior
    for (let i = 0; i < 5; i++) { g.buildings.update(0.016); }
    const cam = g.camera, rc = new THREE.Raycaster(), res = { poses: 0, bad: 0, examples: [] };
    const solids = []; g.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.visible) { let q = o, sam = false; while (q) { if (q === pl.rig.root || q === pl.mesh) sam = true; q = q.parent; } const mt = Array.isArray(o.material) ? o.material[0] : o.material; if (!sam && !(mt && mt.transparent && mt.opacity < 0.9)) solids.push(o); } });
    const near = (o, a, bpt) => { const d = new THREE.Vector3().subVectors(bpt, a), L = d.length(); if (L < 1e-3) return null; rc.set(a, d.normalize()); rc.far = L - 0.02; rc.near = 0.0; const box = new THREE.Box3(); const hits = rc.intersectObjects(o, false); return hits[0] || null; };
    // restrict to meshes of this building (interior + exterior) for speed
    const mine = solids.filter((o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return Math.abs(v.x - bb.cx) < 6 && Math.abs(v.z - bb.cz) < 6; });
    const pts = []; for (let lx = -3.4; lx <= 3.4; lx += 0.5) for (let lz = -3.4; lz <= 3.4; lz += 0.5) for (const k of [0, 1]) pts.push([lx, lz, k]);
    for (const [lx, lz, k] of pts) {
      const x = bb.cx + lx, z = bb.cz + lz; pl.x = x; pl.z = z; pl.floorY = k * 3.2; pl.onTop = false;
      if (w.collides(x, z, pl.bodyR ? pl.bodyR() : 0.4, false, pl.floorY) || !pl.footing(x, z) || Math.abs(pl._fy - k * 3.2) > 0.01) continue;   // only where Sam can stand
      g.buildings.update(0.016);
      for (let a = 0; a < 8; a++) for (const pitch of [-0.35, 0.15]) {
        pl.yaw = a * Math.PI / 4; pl.pitch = pitch; pl.camD = undefined;
        pl.placeCamera(cam); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); res.poses++;
        const [hx, hy, hz] = pl.headPos(), head = new THREE.Vector3(hx, hy + 0.1, hz), cp = cam.position.clone();
        let hit = near(mine, head, cp), bad = hit ? 'between' : null;
        if (!bad) { const hh = Math.tan(cam.fov * Math.PI / 360) * cam.near, ww = hh * cam.aspect; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = new THREE.Vector3(sx * ww, sy * hh, -cam.near).applyMatrix4(cam.matrixWorld); const h2 = near(mine, cp, c); if (h2) { hit = h2; bad = 'corner'; break; } } }
        if (bad) { const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(), hy = hit.point.y - k * 3.2, kind = bad + ' ' + (Math.abs(n.y) > 0.7 ? (n.y > 0 ? 'upward face (floor/tread/top) ' : 'downward face (ceiling/underside) ') : 'vertical face (wall/side) ') + (hy < 0.3 ? 'low' : hy < 2.05 ? 'mid' : 'high'); res.kinds = res.kinds || {}; res.kinds[kind] = (res.kinds[kind] || 0) + 1; res.bad++; if (res.examples.length < 40 && Math.random() < 0.15) res.examples.push(`${kind} hit@${(hit.point.x - bb.cx).toFixed(2)},${(hit.point.z - bb.cz).toFixed(2)} cam@${(cp.x - bb.cx).toFixed(2)},${(cp.z - bb.cz).toFixed(2)} obj=${hit.object.name || hit.object.parent && hit.object.parent.name || ''} ${bad} at local ${lx.toFixed(1)},${lz.toFixed(1)} floor ${k} yaw ${(a * 45)} pitch ${pitch} cam y ${(cp.y - k * 3.2).toFixed(2)} d ${(pl.camD || 0).toFixed(2)}`); }
      }
    }
    return res;
  }, id);
  console.log(`${out.bad} of ${out.poses} camera poses clip`); console.log(JSON.stringify(out.kinds, null, 1)); console.log(out.examples.join('\n')); if (errs.length) console.log(errs.join('\n')); await b.close();
})();
