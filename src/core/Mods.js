import { Assets } from '../render/Assets.js';
import { GOSSIP, ABOUT2, FAMILY, CHILD_TALK } from '../data/dialogue.js';
import { ELDER_LINES, NIGHT_LINES, SLIPS } from '../data/story.js';
import { A } from '../data/humour.js';
import { JOKES, SMALLTALK, REQUESTS } from '../data/talkworld.js';
import { CATCHPHRASES } from '../data/voices.js';
import { HOBBY } from '../data/hobbies.js';
import { ROLE_TALK } from '../data/talk90s.js';
import { STORIES } from '../data/stories.js';
import { MALE, FEMALE, SURNAMES, TOPS_M, TOPS_F, PANTS, HAIRS } from '../data/people.js';
import { ADS, PITCHES } from '../data/adverts.js';
import { GUESTS } from '../data/guests.js';
import { SHOP_GOODS } from '../data/shopgoods.js';
import { BUILDINGS, TOOL_MENUS, ALL_BUILDABLE } from '../data/buildings.js';
import { BUILD_AGE } from '../data/ages.js';
import { PURPOSE } from '../data/purpose.js';
import { addModel, buildModel, modelBoxes } from '../render/Models.js';
import { registerFurniture } from '../render/Furniture.js';
import { setModelBuilder } from '../render/BuildingFactory.js';
import { HAT_MODELS } from '../render/SimRig.js';

/**
 * Mods: folders under mods/, switched on by listing them in mods/index.json. Each has a mod.json (all parts optional):
 *   textures   { "grass": "my_grass.png", ... }        replace any texture-pack image by name
 *   speech     { "gossip": [...], "child": [...], "elder": [...], "night": [...], "pub": [...], "chat": [...], "about": [...], "family": [...], "slips": [[], [...], ...],
 *                "jokes": [...], "smalltalk": [...], "requests": [...], "catchphrases": [...], "hobbies": { id: { label, lines } }, "work": { role: [...] }, "stories": { id: { steps, idle, done, who } } }
 *   names      { "male": [...], "female": [...], "surnames": [...] }
 *   looks      { "topsMale": [0xRRGGBB...], "topsFemale": [...], "pants": [...], "hair": [...] }   (numbers, or "#rrggbb" strings)
 *   adverts    [["HEADLINE", "strapline", "#bg", "#fg"], ...]     pitches: ["an advert a townsperson says", ...]
 *   guests     [{ name, title, gender, age, look, sign, lines, hint }]
 *   shopgoods  { "tavern": [["a pint of Old Peculier", 1.9, { "drunk": 0.2 }]], ... }
 *   buildings  { "myshop": { ...a building def, "menu": "Commerce", "age": 2, "purpose": "what it's for" } }
 *   events     [{ "id", "hours": [10, 16], "chance": 0.05, "message", "icon", "say": [...], "who": "resident|child|any" }]   (chance per game hour)
 *   script     "main.js"   an ES module whose default export is called as fn(game, api) once the game exists
 * See docs/MODDING.md.
 */
const col = (v) => (typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : v);
export const Mods = {
  list: [], events: [], scripts: [], errors: [],
  async load() {
    let ids = []; try { const r = await fetch('mods/index.json', { cache: 'no-store' }); if (r.ok) ids = (await r.json()).mods || []; } catch (e) { return; }
    for (const id of ids) {
      try { const r = await fetch(`mods/${id}/mod.json`, { cache: 'no-store' }); if (!r.ok) throw new Error('no mod.json'); const m = await r.json(); await this.apply(id, m); this.list.push({ id, name: m.name || id }); }
      catch (e) { this.errors.push(`${id}: ${e.message}`); console.warn('mod failed', id, e); }
    }
  },
  async apply(id, m) {
    if (m.models) { for (const [k, v] of Object.entries(m.models)) addModel(k, v); setModelBuilder(buildModel); }
    if (m.furniture) for (const [k, f] of Object.entries(m.furniture)) registerFurniture(k, f.size || [1, 1], f.solid !== false, () => buildModel(f.model || k));
    if (m.hats) for (const [k, name] of Object.entries(m.hats)) HAT_MODELS[k] = modelBoxes(name || k);
    if (m.textures) await Promise.all(Object.entries(m.textures).map(async ([k, f]) => { const img = new Image(); img.src = `mods/${id}/${f}`; await img.decode(); Assets.add(k, img); Assets.ok = true; }));
    const S = m.speech || {};
    if (S.gossip) GOSSIP.nineties.push(...S.gossip); if (S.about) ABOUT2.push(...S.about); if (S.family) FAMILY.push(...S.family); if (S.child) CHILD_TALK.push(...S.child);
    if (S.elder) ELDER_LINES.push(...S.elder); if (S.night) NIGHT_LINES.push(...S.night); if (S.pub) A.PUB.push(...S.pub); if (S.chat) A.CHAT.push(...S.chat);
    if (S.slips) S.slips.forEach((l, i) => { if (SLIPS[i]) SLIPS[i].push(...l); });
    // conversation pools (Talk): jokes, small talk, requests, catchphrases, hobbies, job talk, running stories
    if (S.jokes) JOKES.push(...S.jokes); if (S.smalltalk) SMALLTALK.push(...S.smalltalk); if (S.requests) REQUESTS.push(...S.requests); if (S.catchphrases) CATCHPHRASES.adult.push(...S.catchphrases);
    if (S.hobbies) for (const [k, h] of Object.entries(S.hobbies)) { if (HOBBY[k]) HOBBY[k].lines.push(...(h.lines || [])); else if (h && h.lines) HOBBY[k] = { label: h.label || k, min: h.min || 16, max: h.max, lines: h.lines }; }
    if (S.work) for (const [k, l] of Object.entries(S.work)) ROLE_TALK[k] = (ROLE_TALK[k] || []).concat(l);
    if (S.stories) for (const [k, a] of Object.entries(S.stories)) if (a && a.steps) STORIES[k] = { who: {}, idle: [], done: [], ...a };
    const N = m.names || {}; if (N.male) MALE.push(...N.male); if (N.female) FEMALE.push(...N.female); if (N.surnames) SURNAMES.push(...N.surnames);
    const L = m.looks || {}; if (L.topsMale) TOPS_M.push(...L.topsMale.map(col)); if (L.topsFemale) TOPS_F.push(...L.topsFemale.map(col)); if (L.pants) PANTS.push(...L.pants.map(col)); if (L.hair) HAIRS.push(...L.hair.map(col));
    if (m.adverts) ADS.push(...m.adverts); if (m.pitches) PITCHES.push(...m.pitches); if (m.guests) GUESTS.push(...m.guests.map((q) => ({ lines: ['Hello!'], sign: q.name, look: {}, age: 30, gender: 'm', ...q })));
    if (m.shopgoods) for (const [k, list] of Object.entries(m.shopgoods)) SHOP_GOODS[k] = (SHOP_GOODS[k] || []).concat(list);
    if (m.buildings) for (const [k, d] of Object.entries(m.buildings)) {
      const { menu = 'Commerce', age = 0, purpose, ...def } = d; BUILDINGS[k] = { tab: menu, permit: { cost: 300, pop: 0 }, mat: { timber: 6 }, work: 20, w: 2, d: 2, floors: 1, wall: 'brick', roof: 'gable', layout: 'shop', ...def };
      const tab = TOOL_MENUS.build.find(([n]) => n === menu); if (tab) tab[1].push(k); else if (def.park) TOOL_MENUS.park.push(k); else TOOL_MENUS.build.push([menu, [k]]);
      ALL_BUILDABLE.push(k); BUILD_AGE[k] = age; if (purpose && PURPOSE) PURPOSE[k] = purpose;
    }
    if (m.events) this.events.push(...m.events.map((e) => ({ hours: [0, 24], chance: 0.05, who: 'resident', ...e, mod: id })));
    if (m.script) this.scripts.push(`../../mods/${id}/${m.script}`);
  },
  /** Called once the game exists: run mod scripts, and start rolling mod events every game hour. */
  async start(game) {
    const api = { Mods: this, BUILDINGS, SHOP_GOODS, ADS, GUESTS, say: (s, t) => game.social.say(s, t, 2.6), message: (from, t) => game.messages.push(from, t), mark: (x, z, icon, label) => game.markers && game.markers.add(x, z, icon, label, 60) };
    for (const p of this.scripts) { try { const mod = await import(p); if (typeof mod.default === 'function') mod.default(game, api); } catch (e) { this.errors.push(`${p}: ${e.message}`); console.warn('mod script failed', p, e); } }
    if (this.events.length) game.clock.on('hour', () => this.roll(game));
    if (this.list.length) game.messages.push('Mods', `Loaded: ${this.list.map((q) => q.name).join(', ')}${this.errors.length ? ` (problems: ${this.errors.join('; ')})` : ''}`);
  },
  roll(g) {
    if (!g.started) return; const h = g.clock.hour;
    for (const e of this.events) {
      if (h < e.hours[0] || h >= e.hours[1] || Math.random() > e.chance) continue;
      const pool = g.population.sims.filter((s) => (e.who === 'any' ? s.kind === 'resident' || s.kind === 'child' : s.kind === e.who) && s.pose !== 'sleep' && !s.inside), s = pool[Math.floor(Math.random() * pool.length)];
      if (e.message) g.messages.push(e.from || 'Town', e.message.replace('{name}', s ? s.name : 'Someone'));
      if (s && e.say && e.say.length) g.social.say(s, e.say[Math.floor(Math.random() * e.say.length)], 3);
      if (s && e.icon && g.markers) g.markers.add(s.x, s.z, e.icon, e.label || e.id, 60, s);
    }
  },
};
