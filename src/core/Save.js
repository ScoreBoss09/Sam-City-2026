import { T } from '../world/World.js';
import { MAP } from '../config.js';
import { Sim } from '../sim/Sim.js';

const KEY = 'samcity-save-v1';
export const hasSave = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
export const clearSave = () => { try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ } };

/** Snapshot of everything that matters. Sims are stored by value and rebuilt on load. */
export function serialize(g) {
  const w = g.world, sims = g.population.sims.filter((s) => s.kind === 'resident' || s.kind === 'child');
  const idOf = new Map(sims.map((s, i) => [s, i]));
  return {
    v: 1, t: Date.now(), tech: g.tech.serialize(), clock: g.clock.serialize(), economy: g.economy.serialize(), story: g.story.serialize(), flags: g.flags,
    terrain: Array.from(w.terrain).join(''), roads: Array.from(w.road).join(''), zones: Array.from(w.zone).join(''),
    trees: g.terrain.trees.map((t) => (t.alive ? t.amount : 0)).join(''), nodes: g.resources.nodes.filter((n) => n.kind !== 'field').map((n) => +n.amount.toFixed(1)),
    buildings: g.buildings.list.map((b) => ({ id: b.id, x0: b.x0, z0: b.z0, rot: b.rot, state: b.state, progress: b.progress, have: b.have, starter: b === g.starterHome, era: b.era })),
    sims: sims.map((s) => ({ name: s.name, first: s.first, surname: s.surname, gender: s.gender, age: s.age, kind: s.kind, trait: s.trait, look: s.look, hunger: s.hunger, orient: s.orient, mood: s.moodBoost, actor: s.actor, talk: s.talkCount, gaveClue: !!s.gaveClue, samRel: s.samRel || 0, married: !!s.married,
      home: s.home ? g.buildings.list.indexOf(s.home) : -1, work: s.workplace ? g.buildings.list.indexOf(s.workplace) : -1, role: s.role, partner: s.partner ? idOf.get(s.partner) : -1, parents: s.parents.map((p) => idOf.get(p)).filter((i) => i !== undefined), coupleDay: s.coupleDay || 0,
      rel: [...s.rel.entries()].map(([id, v]) => { const o = g.population.sims.find((q) => q.id === id); return o && idOf.has(o) ? [idOf.get(o), Math.round(v)] : null; }).filter(Boolean) })),
    raids: g.raids.serialize(), curios: g.curios.serialize(), post: g.mail.serialize(), roadPlans: g.roadPlans.serialize(), toolsTaken: g.tools.takenIds(),
    player: { x: g.player.x, z: g.player.z, heading: g.player.heading, yaw: g.player.yaw, energy: g.player.energy, hunger: g.player.hunger, tools: [...g.player.tools], inv: g.player.inv }, piles: g.piles.serialize(),
  };
}
export function save(g) { if (g.demoMode || g.ending || !g.started) return false; try { localStorage.setItem(KEY, JSON.stringify(serialize(g))); return true; } catch (e) { return false; } }
export function load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

/** Rebuild the world from a snapshot (called right after a fresh Game has been constructed). */
export function restore(g, d) {
  const w = g.world, B = g.buildings, P = g.population;
  // wipe the freshly created starter town
  for (const s of P.sims.slice()) { s.dispose(); } P.sims = []; P.names.clear();
  for (const b of B.list.slice()) B.remove(b);
  w.road.fill(0); w.zone.fill(0);
  for (let i = 0; i < w.terrain.length; i++) w.terrain[i] = +d.terrain[i];
  for (let i = 0; i < w.road.length; i++) { w.road[i] = +d.roads[i]; w.zone[i] = +d.zones[i]; }
  // trees and resource nodes
  g.terrain.trees.forEach((t, i) => { const a = +d.trees[i]; if (a === 0 && t.alive) g.terrain.killTree(t); else if (a > 0) { t.amount = a; if (a < 3) g.terrain.setTree(t.idx, 0.55 + 0.15 * a); } });
  g.resources.nodes.filter((n) => n.kind !== 'field').forEach((n, i) => { if (d.nodes[i] !== undefined) { n.amount = d.nodes[i]; g.resources.visual(n); } });
  g.terrain.paintAll();
  // buildings
  const made = []; g.starterHome = null; g.flags.noStarter = true;
  for (const s of d.buildings) {
    if (s.id === 'tunnel') continue;   // older saves: the tunnel is gone
    const b = B.place(s.id, s.x0, s.z0, s.rot, { instant: s.state === 'done', era: s.era ?? (d.tech ? d.tech.era : 0) });
    if (s.state !== 'done') { b.progress = s.progress; b.have = s.have || {}; B.refreshSite(b); }
    if (s.id === 'lift') g.lift = b; if (s.id === 'surveyor') g.surveyor = b; if (s.starter) { g.starterHome = b; b.reservedForPlayer = true; if (b.spots.bed[0]) b.spots.bed[0].taken = 'player'; }
    made.push(b);
  }
  delete g.flags.noStarter; g.security.guards = []; g.security.init(); g.raids.reset(); g.raids.load(d.raids); g.mail.load(d.post); g.curios.load(d.curios);
  g.roadPlans.load(d.roadPlans); g.tools.build(g.tools.x, g.tools.z, d.toolsTaken || []); g.player.tools = new Set((d.player && d.player.tools) || []); if (d.player && d.player.hunger != null) g.player.hunger = d.player.hunger;
  // economy, clock, story
  g.tech.load(d.tech); g.economy.load(d.economy); g.clock.load(d.clock); g.story.load(d.story); Object.assign(g.flags, d.flags);
  // citizens
  const sims = d.sims.map((s) => {
    const home = made[s.home]; const x = home ? home.doorIn.x : g.plaza.x, z = home ? home.doorIn.z : g.plaza.z;
    const sim = new Sim(g, { name: s.name, first: s.first, surname: s.surname, gender: s.gender, age: s.age, kind: s.kind, trait: s.trait, look: s.look, x, z, inside: home || null, actor: s.actor });
    sim.hunger = s.hunger; sim.orient = s.orient; sim.moodBoost = s.mood || 0; sim.talkCount = s.talk || 0; sim.samRel = s.samRel || 0; sim.gaveClue = s.gaveClue; sim.coupleDay = s.coupleDay; sim.married = !!s.married; P.names.add(s.name); P.sims.push(sim); return sim;
  });
  d.sims.forEach((s, i) => {
    const sim = sims[i]; if (s.home >= 0 && made[s.home]) { sim.home = made[s.home]; made[s.home].residents.push(sim); const sp = made[s.home].spots.bed.find((q) => !q.taken); if (sp) sp.taken = sim; }
    if (s.work >= 0 && made[s.work] && s.role) { const wb = made[s.work]; wb.workers.push(sim); sim.workplace = wb; sim.role = s.role; sim.workSpot = wb.workers.length - 1; }
    if (s.partner >= 0) { sim.partner = sims[s.partner]; sim.single = false; } sim.parents = s.parents.map((j) => sims[j]);
    for (const [j, v] of s.rel) sim.rel.set(sims[j].id, v);
  });
  const p = d.player; g.player.teleport(p.x, p.z, p.heading); g.player.yaw = p.yaw; g.player.energy = p.energy; g.player.inv = p.inv || (p.carry ? { [p.carry.mat]: p.carry.qty } : {}); g.piles.load(d.piles);
  g.flags.loaded = true;
}
