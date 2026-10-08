import { TILE } from '../config.js';

/** Hands out haul/build tasks for sites. Used by builder sims and (manually) by the player. */
export class ConstructionSystem {
  constructor(game) { this.game = game; }
  get sites() { return this.game.buildings.list.filter((b) => b.state === 'site'); }
  workable(s) { return s.progress < this.game.buildings.supply(s) - 0.0005; }

  requestTask(sim) {
    const g = this.game, B = g.buildings, depot = g.depot, sites = this.sites;
    if (!sites.length) return null;
    for (const s of sites) if (this.workable(s) && (s.builders || 0) < 2) return { type: 'build', site: s };
    if (depot) {
      sites.sort((a, b) => Math.hypot(a.cx - depot.cx, a.cz - depot.cz) - Math.hypot(b.cx - depot.cx, b.cz - depot.cz));
      for (const s of sites) for (const mat of Object.keys(s.need)) {
        const miss = B.missing(s, mat), avail = g.economy.stock[mat];
        if (miss > 0 && avail > 0) { const qty = Math.min(4, miss, avail); g.economy.stock[mat] -= qty; s.reserved[mat] = (s.reserved[mat] || 0) + qty; return { type: 'haul', site: s, mat, qty }; }
      }
    }
    for (const s of sites) if (this.workable(s) && (s.builders || 0) < 3) return { type: 'build', site: s };
    return null;
  }
  /** Walkable tile centre around the site footprint closest to the sim. */
  perimeterPoint(site, from) {
    const w = this.game.world; let best = null, bd = 1e9;
    for (let z = site.z0 - 1; z <= site.z0 + site.d; z++) for (let x = site.x0 - 1; x <= site.x0 + site.w; x++) {
      const inner = x >= site.x0 && x < site.x0 + site.w && z >= site.z0 && z < site.z0 + site.d; if (inner || !w.walkable(x, z)) continue;
      const [cx, cz] = w.center(x, z), d = Math.hypot(cx - from.x, cz - from.z) + (w.road[w.idx(x, z)] ? 0 : 3); if (d < bd) { bd = d; best = { x: cx, z: cz }; }
    }
    return best || { x: site.doorOut.x, z: site.doorOut.z };
  }
  /** Material the player should grab next (largest unmet need), or null. */
  nextMaterialFor(playerQty = 4) {
    const g = this.game;
    for (const s of this.sites) for (const mat of Object.keys(s.need)) {
      const miss = g.buildings.missing(s, mat); if (miss > 0 && g.economy.stock[mat] > 0) return { site: s, mat, qty: Math.min(playerQty, miss, g.economy.stock[mat]) };
    }
    return null;
  }
}
