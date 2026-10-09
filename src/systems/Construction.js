import { TILE } from '../config.js';

/** Hands out haul/build tasks for sites. Used by builder sims and (manually) by the player. */
export class ConstructionSystem {
  constructor(game) { this.game = game; }
  /** Building sites plus upgrade orders: everything builders can work on. */
  get sites() { const g = this.game, L = g.buildings.list.filter((b) => b.state === 'site'); return g.upgrades ? L.concat(g.upgrades.orders) : L; }
  workable(s) { return s.progress < this.game.buildings.supply(s) - 0.0005; }
  nextPrio() { const f = this.game.flags; f.prioN = Math.max(f.prioN || 0, ...this.sites.map((s) => s.prio || 0)) + 1; return f.prioN; }
  /** The builders' work list, top first: sites and upgrades in the order the player set, plus one entry for all the paths. */
  queue() {
    const g = this.game, items = this.sites.map((s) => ({ kind: s.upgradeOf ? 'upgrade' : 'site', s, prio: s.prio ?? 1e5 }));
    if (g.roadPlans.count) items.push({ kind: 'roads', prio: g.flags.roadPrio ?? 1e9 });
    return items.sort((a, b) => a.prio - b.prio);
  }
  /** Move a queue entry: dir -1 up, +1 down, 'top' to the top, 'bottom' to the end. */
  move(item, dir) {
    const Q = this.queue(), i = Q.findIndex((q) => (item.kind === 'roads' ? q.kind === 'roads' : q.s === item.s)); if (i < 0) return;
    const set = (q, p) => { if (q.kind === 'roads') this.game.flags.roadPrio = p; else q.s.prio = p; };
    Q.forEach((q, k) => set(q, k + 1));   // renumber 1..n so moves are clean
    if (dir === 'top') { set(Q[i], 0); } else if (dir === 'bottom') { set(Q[i], Q.length + 1); }
    else { const j = i + dir; if (j < 0 || j >= Q.length) return; set(Q[i], j + 1); set(Q[j], i + 1); }
    this.game.flags.prioN = Q.length + 2;
  }
  /** Everyone works down the list: the top job takes all the builders it can use, then the next, and so on. Paths are one entry. */
  /** Goods left on the Lift dock that nobody has claimed yet. */
  dockPiles() { const g = this.game; if (!g.lift) return []; const d = g.logistics.dock(); return g.piles.list.filter((p) => Math.hypot(p.x - d.x, p.z - d.z) < 7 && g.piles.total(p) - (p.reserved || 0) > 0); }
  requestTask(sim) {
    const g = this.game, B = g.buildings, depot = g.depot, cap = 6;
    // up to two builders at a time cart deliveries from the Lift dock to the Stockyard
    if (depot && g.population.sims.filter((q) => q.job && q.job.type === 'fetch').length < 2) { const p = this.dockPiles()[0]; if (p) { const qty = this.haulSize(sim); p.reserved = (p.reserved || 0) + qty; return { type: 'fetch', pile: p, qty }; } }
    for (const it of this.queue()) {
      if (it.kind === 'roads') { const p = g.roadPlans.next(sim); if (p) { p.reserved = sim; return { type: 'road', plan: p }; } continue; }
      const s = it.s;
      if (this.workable(s) && (s.builders || 0) < 2) return { type: 'build', site: s };
      if (depot) for (const mat of Object.keys(s.need)) {
        const miss = B.missing(s, mat), avail = g.economy.stock[mat];
        if (miss > 0 && avail > 0) { const qty = Math.min(this.haulSize(sim), miss, avail); g.economy.stock[mat] -= qty; s.reserved[mat] = (s.reserved[mat] || 0) + qty; return { type: 'haul', site: s, mat, qty }; }
      }
      if (this.workable(s) && (s.builders || 0) < cap) return { type: 'build', site: s };
    }
    return null;
  }
  haulSize(sim) { const wp = sim && sim.workplace; return (wp && wp.def.haul) || 4; }
  /** The highest job on the list that builders could be doing something about right now. */
  focus() {
    const g = this.game; for (const it of this.queue()) { if (it.kind === 'roads') { if ([...g.roadPlans.plans.values()].some((p) => !p.reserved)) return it; continue; } const s = it.s; if (this.workable(s) || Object.keys(s.need).some((m) => g.buildings.missing(s, m) > 0 && g.economy.stock[m] > 0)) return it; }
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
