import { TILE } from '../config.js';
import { pick } from '../util.js';

/** Sandbox: instantly builds a lively town so the look and the simulation can be explored. */
export function generateDemo(g) {
  const w = g.world, B = g.buildings; g.demoMode = true;
  g.tech.era = 2; g.tech.age = 4; g.tech.research = 999;
  for (const k of Object.keys(g.economy.permits)) { g.economy.permits[k] = 'approved'; g.economy.revealed.add(k); } g.economy.lastTier = 'City';
  g.economy.funds = 750000; for (const m of Object.keys(g.economy.stock)) g.economy.stock[m] = 400; g.economy.stock.food = 1500;
  // a grid of paved streets (a row of plots either side of each), joined to the Lift
  const ld = g.lift.doorTile; for (let z = ld.z; z <= 30; z++) w.addRoad(ld.x, z, 2);
  for (const z of [9, 13, 17, 21, 25, 29]) for (let x = 6; x <= 34; x++) w.addRoad(x, z, 2);
  for (const x of [7, 13, 25, 31]) for (let z = 9; z <= 29; z++) w.addRoad(x, z, 2);
  const place = (id, x, z) => { const r = B.evaluate(id, x, z, Math.floor(Math.random() * 4)); if (r.ok) { B.place(id, r.x0, r.z0, r.rot, { instant: true }); return true; } return false; };
  const plan = [['church', 32, 16], ['villagehall', 20, 31], ['chippy', 24, 24], ['bakery', 26, 20], ['postoffice', 29, 19], ['bookies', 30, 24], ['video', 21, 24], ['launderette', 26, 13], ['newsagent', 18, 24], ['bandstand', 24, 32], ['phonebox', 20, 20], ['busstop', 19, 13], ['allotment', 7, 33], ['allotment', 9, 33], ['power', 9, 28], ['water', 10, 12], ['factory', 10, 22], ['foundry', 15, 22], ['brickworks', 10, 27], ['glassworks', 14, 28], ['clinic', 21, 12], ['police', 16, 12], ['townhall', 16, 18], ['school', 22, 22], ['hotel', 22, 17], ['skyscraper', 17, 17], ['office', 28, 12], ['tavern', 22, 27], ['plaza', 24, 29], ['ballfield', 28, 22], ['park', 27, 17], ['contractor', 15, 27], ['stockyard', 12, 18], ['farm', 28, 32], ['farm', 33, 31], ['forager', 6, 22], ['forager', 7, 12], ['fisher', 5, 30], ['fisher', 6, 26], ['lumbercamp', 5, 10], ['quarry', 5, 16], ['apartments', 28, 27], ['apartments', 33, 27], ['campfire', 20, 20], ['well', 18, 20]];
  const ring = []; for (let r = 0; r <= 4; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === r) ring.push([dx, dz]);
  for (const [id, x, z] of plan) for (const [dx, dz] of ring) if (place(id, x + dx, z + dz)) break;
  // transport and policing for the demo: a railway, a monorail, a sky lift, bikes, horses, the police and the fire brigade
  for (const [id, x, z] of [['railstation', 10, 11], ['railstation', 28, 27], ['railstation', 32, 11], ['monostation', 15, 27], ['monostation', 33, 20], ['skylift', 9, 22], ['skylift', 27, 7], ['cycleshop', 16, 20], ['stables', 22, 27], ['police', 14, 16], ['watchhouse', 30, 15], ['firestation', 22, 10], ['nightclub', 27, 31]]) for (const [dx, dz] of ring) if (place(id, x + dx, z + dz)) break;
  for (const b of B.byDef('cycleshop')) { b.def.vehicle = 2; b.level = 2; }
  for (let z = 6; z < 36; z++) for (let x = 4; x < 37; x++) if (w.road[w.idx(x, z)] === 2 && (x + z) % 2 === 0) g.lamps.tiles.add(x + ',' + z); g.lamps.dirty = true;
  for (const [id, x, z] of [['stockyard', 20, 14], ['surveyor', 24, 14], ['campfire', 18, 17], ['hut', 12, 14]]) if (!B.byDef(id).length) for (const [dx, dz] of ring) if (place(id, x + dx, z + dz)) break;
  // a plaza in front of the pub and the chippy: paving, tables out, no cars (the streets themselves stay as they are)
  for (const id of ['tavern', 'chippy']) for (const b of B.byDef(id)) { const d = b.doorTile; if (d) for (let dz = -1; dz <= 1; dz++) for (let dx = -2; dx <= 2; dx++) { const x = d.x + dx, z = d.z + dz, i = w.inBounds(x, z) && w.idx(x, z); if (i !== false && w.isLand(x, z) && !w.occ[i] && !w.res[i] && w.road[i] !== 2) { w.road[i] = 0; w.addRoad(x, z, 3); } } }
  for (const it of g.tools.items) { g.tools.take(it); g.player.tools.add(it.id); }
  const zones = [['cottage', 0.18], ['bungalow', 0.06], ['semi', 0.06], ['shack', 0.04], ['hut', 0.06], ['cabin', 0.1], ['townhouse', 0.12], ['shop', 0.14], ['forager', 0.04], ['fisher', 0.04], ['park', 0.06], ['school', 0.02], ['apartments', 0.04]];
  for (let i = 0; i < 900; i++) { const x = 4 + Math.floor(Math.random() * 33), z = 6 + Math.floor(Math.random() * 30); let r = Math.random(), id = 'cottage'; for (const [k, p] of zones) { if ((r -= p) < 0) { id = k; break; } } if (id === 'school' && B.count('school')) id = 'cottage'; place(id, x, z); }
  let n = 0; while (g.population.freeBeds() > 0 && g.population.sims.length < 70 && n++ < 90) g.population.arrive();
  g.clock.hour = 10; g.advance(2);
  g.messages.log.length = 0; g.story.objective = 99; g.story.stage = 1; g.story.domeRevealed = false;
  g.messages.push('Demo', 'Sandbox city generated. Everything is unlocked. Explore with TAB.', 'good');
}
