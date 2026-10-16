import { T } from '../world/World.js';
import { MAP } from '../config.js';
import { Sim } from '../sim/Sim.js';
import { QUIRKS } from '../data/character.js';
import { FAIR_SKINS } from '../data/people.js';

const KEY = 'samcity-save-v1';
const SAVE_V = 2;   // 2: the 8 m grid (older saves were on the small 4 m grid and can't be carried over)
/**
 * Twelve named save slots plus three rotating autosaves ('a1'..'a3'), kept in the browser's database (IndexedDB: far
 * more room than localStorage). Everything is read into memory at start-up (initSaves), so the rest of the game can ask
 * about saves straight away; writes go to memory at once and to the database in the background (no hitch).
 * The old three localStorage slots are carried over the first time.
 */
export const SLOTS = 12;
export const AUTOS = ['a1', 'a2', 'a3'];
const META = 'samcity-slots-meta', cache = new Map(); let meta = {}, db = null;
let slot = 1; try { slot = Math.min(SLOTS, Math.max(1, +localStorage.getItem('samcity-slot') || 1)); } catch (e) { /* no storage */ }
const keyOf = (n) => (n === 1 || n === '1' ? KEY : KEY + '-' + n);   // (the old localStorage keys)
const idOf = (n) => String(n);
const saveMeta = () => { try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { /* no storage */ } };
const openDB = () => new Promise((res) => { try { const r = indexedDB.open('samcity-saves', 1); r.onupgradeneeded = () => r.result.createObjectStore('slots'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
const tx = (mode, fn) => new Promise((res) => { if (!db) return res(false); try { const t = db.transaction('slots', mode), st = t.objectStore('slots'), q = fn(st); t.oncomplete = () => res(q && 'result' in q ? q.result : true); t.onerror = () => res(false); } catch (e) { res(false); } });
const put = (id, text) => (db ? tx('readwrite', (st) => st.put(text, id)) : Promise.resolve((() => { try { localStorage.setItem(keyOf(id), text); return true; } catch (e) { return false; } })()));
function metaOf(text, name, auto) { try { const d = JSON.parse(text); return { name: name || 'Sam City', auto: !!auto, v: d.v || 1, t: d.t, pop: (d.sims || []).length, funds: d.economy && d.economy.funds, clock: d.clock }; } catch (e) { return null; } }
/** Read every save into memory (and carry the old localStorage ones over). Call once before the menus are used. */
export async function initSaves() {
  try { meta = JSON.parse(localStorage.getItem(META) || '{}') || {}; } catch (e) { meta = {}; }
  db = await openDB();
  if (db) { const keys = await tx('readonly', (st) => st.getAllKeys()), vals = await tx('readonly', (st) => st.getAll()); if (Array.isArray(keys) && Array.isArray(vals)) keys.forEach((k, i) => cache.set(String(k), vals[i])); }
  for (const n of [...Array.from({ length: SLOTS }, (_, i) => i + 1), ...AUTOS]) {   // old saves in localStorage (or everything, if there's no database)
    let s = null; try { s = localStorage.getItem(keyOf(n)); } catch (e) { /* no storage */ } if (!s || cache.has(idOf(n))) continue;
    cache.set(idOf(n), s); if (!meta[n]) meta[n] = metaOf(s, typeof n === 'string' ? 'Autosave' : `Slot ${n}`, typeof n === 'string');
    if (db && await put(idOf(n), s)) { try { localStorage.removeItem(keyOf(n)); } catch (e) { /* fine */ } }   // moved over safely
  }
  for (const [id, text] of cache) if (!meta[id]) meta[id] = metaOf(text, id[0] === 'a' ? 'Autosave' : `Slot ${id}`, id[0] === 'a');
  for (const id of Object.keys(meta)) if (id[0] !== '_' && !cache.has(id)) delete meta[id];
  saveMeta();
}
export const currentSlot = () => slot;
export function setSlot(n) { slot = n; try { localStorage.setItem('samcity-slot', String(n)); } catch (e) { /* no storage */ } }
/** What's in a slot: null if empty, else { ok, name, t (saved at), pop, funds, clock, auto }. */
export function slotInfo(n) { const m = meta[idOf(n)]; return m ? { ...m, ok: (m.v || 1) === SAVE_V } : null; }
export const slotName = (n) => (meta[idOf(n)] && meta[idOf(n)].name) || '';
export function renameSlot(n, name) { const m = meta[idOf(n)]; if (m) { m.name = String(name).slice(0, 40) || m.name; saveMeta(); } }
export const saveInfo = () => slotInfo(slot);
export const hasSave = () => cache.has(idOf(slot));
export const clearSave = (n = slot) => { const id = idOf(n); cache.delete(id); delete meta[id]; saveMeta(); tx('readwrite', (st) => st.delete(id)); try { localStorage.removeItem(keyOf(n)); } catch (e) { /* private mode */ } };
/** A save as text (to download and send), and putting one back into a slot. */
export const exportSlot = (n) => cache.get(idOf(n)) || null;
export function importSlot(n, text, name) { const d = JSON.parse(text); if (!d || !d.sims || !d.economy) throw new Error('That file isn\'t a Sam City 1995 save.'); const s = JSON.stringify(d), id = idOf(n); cache.set(id, s); meta[id] = metaOf(s, name || 'Imported town'); saveMeta(); put(id, s); return d; }
/** Write the town to slot n (default: this game's slot). Returns false if it can't be saved right now. */
function writeTo(g, n, name, auto) {
  if (g.demoMode || g.ending || !g.started || g.netVisitor) return false;
  try { const text = JSON.stringify(serialize(g)), id = idOf(n); cache.set(id, text); meta[id] = metaOf(text, name || slotName(n) || g.townName || 'Sam City', auto); saveMeta(); put(id, text); return true; } catch (e) { return false; }
}
export function save(g, n = slot, name) { return writeTo(g, n, name, false); }
/** A backup in the next of the three autosave slots (the oldest is replaced). */
export function autosave(g) { const i = (meta._autoN = ((meta._autoN || 0) % AUTOS.length) + 1), id = AUTOS[i - 1], ok = writeTo(g, id, `Autosave: ${slotName(slot) || 'Sam City'}`, true); if (ok && meta[id]) { meta[id].from = slot; saveMeta(); } return ok; }
export function load(n = slot) { try { const s = cache.get(idOf(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

/** Snapshot of everything that matters. Sims are stored by value and rebuilt on load. */
export function serialize(g) {
  const w = g.world, sims = g.population.sims.filter((s) => s.kind === 'resident' || s.kind === 'child');
  const idOf = new Map(sims.map((s, i) => [s, i]));
  return {
    v: SAVE_V, t: Date.now(), tech: g.tech.serialize(), clock: g.clock.serialize(), economy: g.economy.serialize(), story: g.story.serialize(), flags: g.flags,
    terrain: Array.from(w.terrain).join(''), roads: Array.from(w.road).join(''), zones: Array.from(w.zone).join(''),
    trees: g.terrain.trees.map((t) => (t.alive ? t.amount : 0)).join(''), nodes: g.resources.nodes.filter((n) => n.kind !== 'field').map((n) => +n.amount.toFixed(1)),
    buildings: g.buildings.list.map((b) => ({ id: b.id, x0: b.x0, z0: b.z0, rot: b.rot, state: b.state, progress: b.progress, have: b.have, starter: b === g.starterHome, era: b.era, prio: b.prio, crew: b.crew, level: b.level || 0, buried: b.buried || 0, over: b.over, light: b.light, lightAuto: b.lightAuto })), upgrades: g.upgrades.serialize(),
    sims: sims.map((s) => ({ name: s.name, first: s.first, surname: s.surname, gender: s.gender, age: s.age, kind: s.kind, trait: s.trait, look: s.baseLook || s.look, hunger: s.hunger, orient: s.orient, mood: s.moodBoost, actor: s.actor, talk: s.talkCount, gaveClue: !!s.gaveClue, samRel: s.samRel || 0, married: !!s.married, quirk: s.quirk ? s.quirk.id : undefined, tm: g.talk ? g.talk.saveMem(s) : undefined,
      home: s.home ? g.buildings.list.indexOf(s.home) : -1, work: s.workplace ? g.buildings.list.indexOf(s.workplace) : -1, role: s.role, partner: s.partner ? idOf.get(s.partner) : -1, parents: s.parents.map((p) => idOf.get(p)).filter((i) => i !== undefined), coupleDay: s.coupleDay || 0,
      rel: [...s.rel.entries()].map(([id, v]) => { const o = g.population.sims.find((q) => q.id === id); return o && idOf.has(o) ? [idOf.get(o), Math.round(v)] : null; }).filter(Boolean) })),
    raids: g.raids.serialize(), movedNodes: Object.entries(g.resources.moved).map(([id, [tx, tz]]) => [+id, tx, tz]), lamps: g.lamps.serialize(), crime: g.crime.serialize(), hazards: g.hazards.serialize(), curios: g.curios.serialize(), post: g.mail.serialize(), roadPlans: g.roadPlans.serialize(), toolsTaken: g.tools.takenIds(),
    cars: g.cars ? g.cars.serialize() : [], player: { bike: g.player.bike, x: g.player.x, z: g.player.z, heading: g.player.heading, yaw: g.player.yaw, energy: g.player.energy, hunger: g.player.hunger, tools: [...g.player.tools], inv: g.player.inv }, piles: g.piles.serialize(),
  };
}

/** A townsperson's quirk and what they remember telling Sam (see Talk), so they're the same person after loading. */
function restoreTalk(g, sim, s) {
  const q = s.quirk && QUIRKS.find((x) => x.id === s.quirk); if (q && sim.quirk !== q) { sim.quirk = q; if (sim.kind === 'resident') { sim.bedH = Math.max(19, Math.min(26, 21.4 + q.bed)); sim.wakeH = Math.max(4.8, Math.min(9.5, 6.6 + q.wake)); } }
  if (s.tm && g.talk) g.talk.loadMem(sim, s.tm);
}
/** Rebuild the world from a snapshot (called right after a fresh Game has been constructed). */
export function restore(g, d) {
  if ((d.v || 1) !== SAVE_V) throw new Error('This save is from the old, smaller map');
  const w = g.world, B = g.buildings, P = g.population;
  // wipe the freshly created starter town
  for (const s of P.sims.slice()) { s.dispose(); } P.sims = []; P.names.clear();
  for (const b of B.list.slice()) B.remove(b);
  w.road.fill(0); w.zone.fill(0);
  for (let i = 0; i < w.terrain.length; i++) w.terrain[i] = +d.terrain[i];
  for (let i = 0; i < w.road.length; i++) { w.road[i] = +d.roads[i]; w.zone[i] = +d.zones[i]; }
  // trees and resource nodes
  g.terrain.trees.forEach((t, i) => { const a = +d.trees[i]; if (a === 0 && t.alive) g.terrain.killTree(t); else if (a > 0) { t.amount = a; if (a < 3) g.terrain.setTree(t.idx, 0.55 + 0.15 * a); } });
  for (const [id, tx, tz] of d.movedNodes || []) { const n = g.resources.nodes.find((q) => q.seedId === id); if (n && g.resources.canReplant(tx, tz)) g.resources.moveNode(n, tx, tz); }
  g.resources.nodes.filter((n) => n.kind !== 'field').forEach((n, i) => { if (d.nodes[i] !== undefined) { n.amount = d.nodes[i]; g.resources.visual(n); } });
  g.terrain.paintAll();
  // buildings
  const made = []; g.starterHome = null; g.flags.noStarter = true;
  if (d.tech) g.tech.load(d.tech);   // buildings go up in the right architectural age
  for (const s of d.buildings) {
    if (s.id === 'tunnel') continue;   // older saves: the tunnel is gone
    const b = B.place(s.id, s.x0, s.z0, s.rot, { instant: s.state === 'done', era: s.era ?? (d.tech ? d.tech.era : 0), over: s.over });
    if (s.state !== 'done') { b.progress = s.progress; b.have = s.have || {}; B.refreshSite(b); if (s.prio !== undefined) b.prio = s.prio; if (s.crew) b.crew = s.crew; }
    if (s.level) g.upgrades.applyLevel(b, s.level); if (s.buried) b.buried = s.buried; if (s.light !== undefined && s.light !== null) { b.light = s.light; b.lightAuto = s.lightAuto; }   // (Sam's light switch, as he left it)
    if (s.id === 'lift') g.lift = b; if (s.id === 'surveyor') g.surveyor = b; if (s.starter) { g.starterHome = b; b.reservedForPlayer = true; if (b.spots.bed[0]) b.spots.bed[0].taken = 'player'; }
    made.push(b);
  }
  delete g.flags.noStarter; g.security.guards = []; g.security.init(); g.raids.reset(); g.raids.load(d.raids); g.mail.load(d.post); g.curios.load(d.curios);
  g.upgrades.orders.slice().forEach((o) => g.upgrades.drop(o)); g.upgrades.load(d.upgrades, made); g.roadPlans.load(d.roadPlans); g.tools.build(g.tools.x, g.tools.z, d.toolsTaken || []); g.player.tools = new Set((d.player && d.player.tools) || []); if (d.player && d.player.hunger != null) g.player.hunger = d.player.hunger;
  // economy, clock, story
  g.tech.load(d.tech); g.lamps.load(d.lamps); g.crime.load(d.crime); g.hazards.load(d.hazards); g.economy.load(d.economy); g.clock.load(d.clock); g.story.load(d.story); Object.assign(g.flags, d.flags);
  // citizens
  const sims = d.sims.map((s) => {
    const home = made[s.home]; const x = home ? home.doorIn.x : g.plaza.x, z = home ? home.doorIn.z : g.plaza.z;
    if (s.look && s.look.skin !== undefined && !FAIR_SKINS.includes(s.look.skin)) s.look.skin = FAIR_SKINS[(s.name || '').length % FAIR_SKINS.length];   // (older saves: the look chosen for the setting)
    const sim = new Sim(g, { name: s.name, first: s.first, surname: s.surname, gender: s.gender, age: s.age, kind: s.kind, trait: s.trait, look: s.look, x, z, inside: home || null, actor: s.actor });
    sim.hunger = s.hunger; sim.orient = s.orient; sim.moodBoost = s.mood || 0; sim.talkCount = s.talk || 0; sim.samRel = s.samRel || 0; sim.gaveClue = s.gaveClue; sim.coupleDay = s.coupleDay; sim.married = !!s.married; restoreTalk(g, sim, s); P.names.add(s.name); P.sims.push(sim); return sim;
  });
  d.sims.forEach((s, i) => {
    const sim = sims[i]; if (s.home >= 0 && made[s.home]) { sim.home = made[s.home]; made[s.home].residents.push(sim); const sp = made[s.home].spots.bed.find((q) => !q.taken); if (sp) sp.taken = sim; }
    if (s.work >= 0 && made[s.work] && s.role) { const wb = made[s.work]; wb.workers.push(sim); sim.workplace = wb; sim.role = s.role; sim.workSpot = wb.workers.length - 1; }
    if (s.partner >= 0) { sim.partner = sims[s.partner]; sim.single = false; } sim.parents = s.parents.map((j) => sims[j]);
    for (const [j, v] of s.rel) sim.rel.set(sims[j].id, v);
  });
  if (g.cars && d.cars) g.cars.load(d.cars);
  const p = d.player; g.player.teleport(p.x, p.z, p.heading); g.player.bike = p.bike; g.player.yaw = p.yaw; g.player.energy = p.energy; g.player.inv = p.inv || (p.carry ? { [p.carry.mat]: p.carry.qty } : {}); g.piles.load(d.piles);
  g.flags.loaded = true;
}
