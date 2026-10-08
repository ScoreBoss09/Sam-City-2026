import { TILE } from '../config.js';
import { pick } from '../util.js';

/** Sandbox: instantly builds a lively town so the look and the simulation can be explored. */
export function generateDemo(g) {
  const w = g.world, B = g.buildings; g.demoMode = true;
  for (const k of Object.keys(g.economy.permits)) g.economy.permits[k] = 'approved';
  g.economy.funds = 750000; for (const m of Object.keys(g.economy.stock)) g.economy.stock[m] = 400; g.population.simCap = 70;
  for (const z of [10, 25, 30]) for (let x = 8; x <= 32; x++) w.addRoad(x, z, 2);
  for (const x of [8, 13, 25, 31]) for (let z = 10; z <= 30; z++) w.addRoad(x, z, 2);
  for (let z = 15; z <= 30; z++) w.addRoad(19, z);
  const place = (id, x, z) => { const r = B.evaluate(id, x, z, Math.floor(Math.random() * 4)); if (r.ok) { B.place(id, r.x0, r.z0, r.rot, { instant: true }); return true; } return false; };
  const plan = [['power', 9, 28], ['water', 10, 12], ['factory', 10, 22], ['foundry', 15, 22], ['brickworks', 10, 27], ['glassworks', 14, 28], ['clinic', 21, 12], ['police', 16, 12], ['townhall', 16, 18], ['school', 22, 22], ['hotel', 22, 17], ['skyscraper', 17, 17], ['office', 28, 12], ['tavern', 22, 27], ['plaza', 24, 29], ['ballfield', 28, 22], ['park', 27, 17], ['contractor', 15, 27], ['stockyard', 12, 18], ['farm', 28, 32], ['lumbercamp', 5, 10], ['quarry', 5, 16], ['apartments', 28, 27], ['apartments', 33, 27], ['campfire', 20, 20], ['well', 18, 20]];
  for (const [id, x, z] of plan) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 1], [-2, 1], [3, 0], [-3, 0], [0, 2], [0, -2]]) if (place(id, x + dx, z + dz)) break;
  const zones = [['cottage', 0.28], ['hut', 0.12], ['cabin', 0.12], ['townhouse', 0.14], ['shop', 0.14], ['forager', 0.04], ['fisher', 0.04], ['park', 0.06], ['school', 0.02], ['apartments', 0.04]];
  for (let i = 0; i < 900; i++) { const x = 4 + Math.floor(Math.random() * 33), z = 6 + Math.floor(Math.random() * 30); let r = Math.random(), id = 'cottage'; for (const [k, p] of zones) { if ((r -= p) < 0) { id = k; break; } } if (id === 'school' && B.count('school')) id = 'cottage'; place(id, x, z); }
  g.population.simCap = 70; let n = 0; while (g.population.freeBeds() > 0 && g.population.sims.length < 70 && n++ < 90) g.population.arrive();
  g.clock.hour = 10; g.advance(2);
  g.messages.log.length = 0; g.story.objective = 99; g.story.stage = 1; g.story.domeRevealed = false;
  g.messages.push('Demo', 'Sandbox city generated. Everything is unlocked. Explore with TAB.', 'good');
}
