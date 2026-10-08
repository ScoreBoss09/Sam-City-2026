import { ZONE } from '../world/World.js';
import { BUILDINGS } from '../data/buildings.js';

/** Zones auto-propose construction sites (needs the permit + road frontage). The sites still need materials and workers. */
export class Planner {
  constructor(game) { this.game = game; this.timer = 10; }
  update(dt) {
    this.timer -= dt; if (this.timer > 0) return; this.timer = 12;
    const g = this.game, w = g.world; if (g.construction.sites.length >= 3) return;
    const want = [[ZONE.RES, 'cottage'], [ZONE.COM, 'shop'], [ZONE.IND, 'factory']];
    for (const [zone, id] of want) {
      if (!g.economy.isUnlocked(id)) continue;
      const def = BUILDINGS[id];
      for (let z = 0; z < w.zone.length / 40; z++) for (let x = 0; x < 40; x++) {
        if (w.zone[w.idx(x, z)] !== zone) continue;
        const ev = g.buildings.evaluate(id, x + Math.floor(def.w / 2), z + Math.floor(def.d / 2), 0); if (!ev.ok) continue;
        let allZoned = true; for (let zz = ev.z0; zz < ev.z0 + ev.d; zz++) for (let xx = ev.x0; xx < ev.x0 + ev.w; xx++) if (w.zone[w.idx(xx, zz)] !== zone) allZoned = false;
        if (!allZoned) continue;
        g.buildings.place(id, ev.x0, ev.z0, ev.rot); g.messages.push('Zoning', `${def.name} planned on a zoned lot.`); return;
      }
    }
  }
}
