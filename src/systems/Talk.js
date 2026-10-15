import * as D from '../data/dialogue.js';
import { N96 } from '../data/nineties2.js';
import { A } from '../data/humour.js';
import { ROLES, BUILDINGS } from '../data/buildings.js';
import { NEEDS, WISHES, RECENT, NEWS_RULES, SPOUSE_RE } from '../data/mentions.js';
import { ELDER_LINES } from '../data/story.js';
import { REGIONS, REGION_FALLBACK, TICS, CATCHPHRASES, MEMORY, KID_GREET, KID_BYE } from '../data/voices.js';
import { HOBBY, OPINION } from '../data/hobbies.js';
import { STORIES, KIDS_F, KIDS_M } from '../data/stories.js';
import { ROLE_TALK, PLACE_TALK, TRAIT_TALK, QUIRK_TALK, AGE_TALK, ADULT_TALK } from '../data/talk90s.js';
import { TIME_TALK, DAY_TALK, WEATHER_TALK, SEASON_TALK, NEWS_TALK, GOSSIP_ABOUT, GOSSIP_QUIRK, GOSSIP_ROLE, RUNNING, REQUESTS, JOKES, KID_JOKES, ADULT_JOKES, SMALLTALK, KID_SMALLTALK } from '../data/talkworld.js';
import { mulberry32, pick } from '../util.js';
import { today as keyToday } from '../data/calendar.js';
import { KEYDAY_TALK } from '../data/keydays.js';

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const OPENERS = Object.values(D.TRAIT_OPEN).flat().filter((o) => o);
const HEARD_MAX = 400, SAVE_HEARD = 80, GLOBAL_RECENT = 60;
// a hobby that suits a quirk (the football-mad one follows football...)
const QUIRK_HOBBY = { footy: 'football', raver: 'raving', gambler: 'horses', karaoke: 'karaoke', gamer: 'games', birdwatcher: 'birds', trainspotter: 'trains', jogger: 'keepfit', busker: 'guitar', boyracer: 'motors', homebody: 'soaps', dancer: 'linedancing', earlybird: 'gardening' };
// ordinary words that can lose their capital after an opener ("Well, the..."); anything else (names, places, titles) keeps it
const LOWER_OK = new Set(('the a an and but so it it\'s its that that\'s this there there\'s these those they they\'re they\'ve we we\'re we\'ve you you\'re you\'ve your my me our he she his her what what\'s who '
  + 'how why when where if did do does don\'t didn\'t have has had haven\'t is isn\'t was wasn\'t been got get go going just oh ooh well not no yes nothing everything everyone everybody somebody someone some all every '
  + 'one two three four five six seven eight nine ten best mind can can\'t could couldn\'t would wouldn\'t should nice lovely good bit still right back up out on in at as for with since after before apparently '
  + 'honestly basically funny fancy any anyway course of only never always sometimes again more most much many once even then now here up down off over under round still too very really quite proper '
  + 'born back went came saw heard had made took found lost won bought said told asked tried started finished done been working work home life people folk kids nobody none whatever thanks ta cheers '
  + 'love dear lad lass mate pal let let\'s look listen hang hold keep stop come put take give tell say ask think know reckon guess wait shh sorry pardon excuse hello hiya morning evening afternoon night '
  + 'last next first new old big little long short great grand bloody blimey cor crikey gosh golly dear crumbs heavens lord tea dinner breakfast lunch supper chips pint fish rain sun snow weather fire').split(' '));
// ...plus every word the dialogue itself uses in lower case mid-sentence (so "Right, happier than..." but "Right, Gazza...")
let CORPUS = null;
const corpus = () => {
  if (CORPUS) return CORPUS; CORPUS = new Set(LOWER_OK); const seen = new Set();
  const walk = (x) => { if (typeof x === 'string') { for (const w of x.match(/(?<=[a-z,] )[a-z][a-z']*/g) || []) CORPUS.add(w); } else if (x && typeof x === 'object' && !seen.has(x)) { seen.add(x); for (const v of Object.values(x)) walk(v); } };
  walk([D, TRAIT_TALK, ROLE_TALK, AGE_TALK, SMALLTALK, HOBBY, OPINION, STORIES, MEMORY, TIME_TALK, DAY_TALK, WEATHER_TALK, SEASON_TALK, NEWS_TALK, GOSSIP_ABOUT, REQUESTS, QUIRK_TALK, PLACE_TALK, KID_SMALLTALK, JOKES]);
  return CORPUS;
};
const lowerFirst = (t, names) => { const w = (t.match(/^[A-Za-z']+/) || [''])[0]; return w && w !== 'I' && !/^I'/.test(w) && corpus().has(w.toLowerCase()) && !(names && names.has(w)) ? t.charAt(0).toLowerCase() + t.slice(1) : t; };
const weighted = (opts) => { let t = 0; for (const o of opts) t += o[1]; let r = Math.random() * t; for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; } return opts.length ? opts[opts.length - 1][0] : null; };

/**
 * Conversations with townsfolk: a greeting, then a few things that suit who they are, and a goodbye.
 * Answers depend on who they are (role, trait, quirk, age, partner, persona, their own voice), how well they know Sam,
 * what they've already told him, the time, the day, the weather, the season and what's been happening in town.
 *
 * Individual voices: every sim gets a stable voice from their name (region, verbal tic, catchphrase, two hobbies, opinions,
 * two or three running stories). Memory: each sim remembers which lines Sam has heard from them (s.mem.h) and won't repeat
 * one until they've run out, remembers the last chat (s.mem.last) and how far each story has got (s.mem.st); a small
 * town-wide buffer stops the same line coming from lots of people in a row. Memory is saved with the sim (Save.js).
 */
export class Talk {
  constructor(game) {
    this.game = game; this.recent = []; this.cur = null; this.oddOk = false;
    if (game.messages && game.messages.on) game.messages.on('msg', (m) => this.logNews(m));   // the town's news, for gossip
  }
  /** Does the town have what this line talks about? (no chip-shop talk before there's a chip shop) */
  ok(t) { if (typeof t !== 'string') return true; const B = this.game.buildings; for (const [re, ids] of NEEDS) if (re.test(t) && !ids.some((id) => B.count(id))) return false; return true; }
  /** A line for this speaker: { m, f } picks by gender. */
  resolve(t) { if (t && typeof t === 'object' && !Array.isArray(t) && (t.m || t.f)) { const s = this.cur; return (s && s.gender === 'f' ? t.f : t.m) || t.m || t.f; } return t; }
  /** The lines from a pool this speaker can use right now (town has the thing, a story oddity only now and then, no spouse talk from singles). */
  usable(arr) {
    const s = this.cur, single = s && s.kind === 'resident' && !s.partner, out = [], spouse = [];
    for (const r of arr) {
      const t = this.resolve(r); if (typeof t !== 'string') { out.push(t); continue; }
      if (!this.ok(t) || (t[0] === '~' && !this.oddOk)) continue;
      if (single && SPOUSE_RE.test(t)) spouse.push(t); else out.push(t);
    }
    return out.length ? out : spouse;
  }
  /** Pick from a pool, falling back to the whole pool if nothing fits (the old behaviour). */
  pk(arr) { if (!arr || !arr.length) return arr && arr[0]; const ok = this.usable(arr); return this.choose(ok.length ? ok : arr.map((t) => this.resolve(t))); }
  /** Pick from a pool, or null if nothing in it fits the town or the speaker. */
  pk2(arr) { if (!arr || !arr.length) return null; const ok = this.usable(arr); return ok.length ? this.choose(ok) : null; }
  /** Prefer lines this person hasn't said to Sam yet (or said longest ago), and lines nobody else has just said. */
  choose(list) {
    if (!list.length) return null; const s = this.cur, m = s ? this.mem(s) : null, key = (t) => (typeof t === 'string' ? hashStr(t) : -1);
    let c = list;
    if (m && c.length > 1) {
      const f = c.filter((t) => typeof t !== 'string' || !m.hs.has(key(t)));
      if (f.length) c = f; else { let best = c[0], bi = Infinity; for (const t of c) { const i = m.h.lastIndexOf(key(t)); if (i < bi) { bi = i; best = t; } } c = [best]; }   // all heard: the one heard longest ago
    }
    if (c.length > 1) { const g = c.filter((t) => typeof t !== 'string' || !this.recent.includes(key(t))); if (g.length) c = g; }
    const t = pick(c); if (typeof t !== 'string') return t;
    this.remember(t); return t[0] === '~' ? t.slice(1) : t;
  }
  remember(t) {
    const k = hashStr(t), s = this.cur; this.recent.push(k); if (this.recent.length > GLOBAL_RECENT) this.recent.shift();
    if (!s || t.length < 8) return; const m = this.mem(s);
    if (m.hs.has(k)) { const i = m.h.indexOf(k); if (i >= 0) m.h.splice(i, 1); }
    m.h.push(k); m.hs.add(k); while (m.h.length > HEARD_MAX) m.hs.delete(m.h.shift());
  }
  /** With adult humour on, half the time use the 18+ line bank instead (never for children). */
  mix(base, extra, s) { return this.game.ui.adult && extra && extra.length && (!s || s.kind !== 'child') && Math.random() < 0.5 ? extra : base; }
  adultOk(s) { return this.game.ui.adult && s.kind !== 'child' && (s.age ?? 30) >= 18; }

  // ---------- who they are ----------
  /** What this person remembers about talking to Sam. */
  mem(s) { if (!s.mem) s.mem = { h: [], st: {}, last: null, n: 0 }; if (!s.mem.hs) s.mem.hs = new Set(s.mem.h); return s.mem; }
  saveMem(s) { const m = s.mem; if (!m) return undefined; return { h: m.h.slice(-SAVE_HEARD).map((k) => k.toString(36)), st: m.st, d: m.last ? m.last.day : undefined, n: m.n }; }
  loadMem(s, d) { if (!d) return; const h = (d.h || []).map((x) => parseInt(x, 36)).filter((x) => !Number.isNaN(x)); s.mem = { h, hs: new Set(h), st: d.st || {}, last: d.d != null ? { day: d.d, hour: 12, topics: [] } : null, n: d.n || 0 }; }
  /** How this person talks: worked out from their name, so it never changes and needs no saving. */
  voice(s) {
    if (s.voice) return s.voice;
    const r = mulberry32(hashStr((s.name || 'x') + '#voice')), P = (a) => a[Math.floor(r() * a.length)], age = s.age ?? 30, kid = s.kind === 'child' || age < 13;
    const region = s.look && s.look.dialect && REGIONS[s.look.dialect] ? s.look.dialect : P(REGION_FALLBACK);
    const tic = r() < (kid ? 0.6 : 0.85) ? P(kid ? TICS.kid : TICS.adult) : null, catchphrase = P(kid ? CATCHPHRASES.kid : CATCHPHRASES.adult);
    const hk = Object.keys(HOBBY).filter((k) => age >= (HOBBY[k].min || 0) && age <= (HOBBY[k].max || 200)), hobbies = [];
    const qh = s.quirk && QUIRK_HOBBY[s.quirk.id]; if (qh && HOBBY[qh] && r() < 0.7) hobbies.push(qh);
    while (hobbies.length < 2 && hk.length > hobbies.length) { const h = P(hk); if (!hobbies.includes(h)) hobbies.push(h); }
    const op = {}; for (const [dim, opts] of Object.entries(OPINION)) {
      let keys = Object.keys(opts);
      if (dim === 'band') keys = age >= 55 ? ['oldies', 'oldies', 'oldies', ...keys] : age < 25 ? [...keys, 'oasis', 'blur', 'spice', 'dance'] : keys;
      if (dim === 'team') keys = hobbies.includes('football') || (s.quirk && s.quirk.id === 'footy') ? keys.filter((k) => k !== 'none') : [...keys, 'none', 'none'];
      op[dim] = P(keys);
    }
    const fits = (w) => (kid ? !!w.kid && (w.max == null || age <= w.max) : !w.kid && age >= (w.min || 0) && age <= (w.max ?? 200));
    const arcs = Object.keys(STORIES).filter((id) => fits(STORIES[id].who || {})), stories = [];
    while (stories.length < 3 && arcs.length > stories.length) { const a = P(arcs); if (!stories.includes(a)) stories.push(a); }
    const R = REGIONS[region] || REGIONS.plain;
    return (s.voice = { region, tic, catchphrase, hobbies, op, stories, town: P(R.towns), dau: P(KIDS_F), son: P(KIDS_M), ticRate: 0.18 + r() * 0.3, tagRate: 0.06 + r() * 0.14, catchRate: 0.08 + r() * 0.14, chatty: r() });
  }
  /** Stable personal details per townsperson, generated from their name. */
  persona(s) {
    if (s.persona) return s.persona; const r = mulberry32(hashStr(s.name || 'x'));
    const p = { town: D.TOWNS[Math.floor(r() * D.TOWNS.length)], town2: D.TOWNS[Math.floor(r() * D.TOWNS.length)], job: D.OLD_JOBS[Math.floor(r() * D.OLD_JOBS.length)], job2: D.OLD_JOBS[Math.floor(r() * D.OLD_JOBS.length)],
      hobby: D.HOBBIES[Math.floor(r() * D.HOBBIES.length)], pet: D.PETS[Math.floor(r() * D.PETS.length)], food: D.FOODS[Math.floor(r() * D.FOODS.length)], fam: Math.floor(r() * D.FAMILY.length), about: Math.floor(r() * D.ABOUT.length) };
    const v = this.voice(s); p.town = v.town;   // home town to match the accent
    if (HOBBY[v.hobbies[0]]) p.hobby = HOBBY[v.hobbies[0]].label;   // the hobby they actually go on about
    return (s.persona = p);
  }
  names() { return new Set(this.game.population.sims.map((q) => q.first)); }
  others(s) { return this.game.population.residents().filter((q) => q !== s && !q.remove); }
  fill(t, s, extra = {}) {
    if (typeof t !== 'string') return t;
    const p = this.persona(s), v = this.voice(s), need = (k) => extra[k] === undefined && t.includes('{' + k + '}');
    const lady = (j) => (s.gender === 'm' && typeof j === 'string' ? j.replace(/\blady\b/, 'man') : j);   // a lollipop man, not a lollipop lady
    const map = { first: s.first || s.name.split(' ')[0], town: p.town, town2: p.town2, job: lady(p.job), job2: p.job2, hobby: p.hobby, pet: p.pet, food: p.food, p: s.partner ? s.partner.first : 'my other half', team: v.op.team === 'none' ? 'England' : v.op.team, dau: v.dau, son: v.son };
    if (need('a') || need('b') || need('rj')) {
      const res = this.others(s).filter((q) => q.kind === 'resident'), a = res.length ? pick(res) : null, rest = res.filter((q) => q !== a && q !== a?.partner), b = rest.length ? pick(rest) : null;
      map.a = a ? a.first : pick(['Big Trev', 'Mrs Hargreaves', 'Dave from the corner']); map.b = b ? b.first : pick(['Sharon', 'old Ron', 'Kev']); map.rj = this.runningVictim() || 'Big Trev';
    }
    if (need('bld')) { const L = this.game.buildings.list.filter((b) => b.state === 'done' && b.def.jobs); map.bld = L.length ? pick(L).def.name : 'Stockyard'; }
    Object.assign(map, extra);
    return t.replace(/\{(\w+)\}/g, (m, k) => (map[k] !== undefined ? map[k] : m)).replace(/\b([Aa]) (?=(electrician|optician|accountant|ice-cream man)\b)/g, '$1n ');
  }

  // ---------- the conversation ----------
  topics(s) {
    const kid = s.kind === 'child', vis = s.kind === 'visitor';
    const f = this.game.favours.forSim(s), fav = f ? [['favour', f.asked ? `Here's your ${f.n} ${f.mat}.` : 'You look like you need something?']] : [];
    return [...fav, ['how', 'How are you doing?'], ['work', kid ? 'What are you up to?' : vis ? 'Enjoying your visit?' : 'How\'s work?'], ['news', 'Heard any news or gossip?'], ['about', kid ? 'What\'s your favourite thing?' : 'Tell me about yourself.'], ['help', 'Any advice for me?'], ['bye', 'See you later.']];
  }
  /** What they might talk about, weighted for who they are and what's going on. */
  topicWeights(s) {
    const g = this.game, kid = s.kind === 'child', vis = s.kind === 'visitor', age = s.age ?? 30, rel = s.samRel || 0, v = this.voice(s), m = this.mem(s);
    const story = this.storyLine(s, true), news = this.freshNews(s).length > 0, last = (m.last && m.last.day === g.clock.totalDays && m.last.topics) || [];
    let w;
    if (kid) w = [['how', 1], ['about', 1], ['work', 0.7], ['kidsmall', 1.5], ['joke', 0.9], ['age', 1.2], ['small', 0.5], ['catch', 0.3], ['story', story === 'new' ? 3.5 : story ? 0.4 : 0]];
    else if (vis) w = [['how', 0.9], ['work', 1], ['age', 1.6], ['small', 1.3], ['news', 0.6], ['opinion', 0.6], ['region', 0.6], ['joke', 0.3]];
    else {
      w = [['how', 1.1], ['work', s.role || age >= 66 || s.kind === 'resident' ? 1.2 : 0.5], ['news', 1.3], ['about', rel < 8 ? 1.7 : 0.5], ['help', 0.45], ['wish', 0.6],
        ['story', story === 'new' ? 3.5 : story ? 0.45 : 0], ['hobby', 1.2], ['opinion', 1], ['small', 1.3], ['gossip', 1.1], ['joke', s.trait === 'cheerful' ? 0.8 : 0.35], ['request', 0.35], ['running', 0.5],
        ['quirk', s.quirk ? 0.9 : 0], ['trait', 0.7], ['region', 0.55], ['age', 0.8], ['town', news ? 2.4 : 0], ['catch', 0.25]];
    }
    // don't go over the same ground twice in a day
    return w.filter(([k, x]) => x > 0).map(([k, x]) => [k, last.includes(k) && k !== 'story' ? x * 0.25 : x]);
  }
  /**
   * One short conversation, no menus: a greeting, a favour if they have one, then two or three things
   * that suit who they are, and a goodbye.
   */
  conversation(s) {
    const g = this.game; this.cur = s; this.oddOk = (g.story ? g.story.stage : 0) >= 1 && Math.random() < 0.3; this.ticN = 0; this.catchN = 0;
    try {
      const m = this.mem(s), v = this.voice(s), lines = [this.greet(s)], f = g.favours.forSim(s), done = []; let page = null;
      const add = (topic) => { const r = this.reply(s, topic); if (!r || !r.text) return false; lines.push(this.decorate(r.text, s, v)); if (r.page) page = r.page; done.push(topic); return true; };
      if (f) add('favour');
      const pool = this.topicWeights(s), extra = s.trait === 'cheerful' ? 0.6 : s.trait === 'shy' ? 0.12 : s.trait === 'busy' ? 0.1 : 0.32;
      const n = f ? 1 : 2 + (Math.random() < extra + (v.chatty > 0.8 ? 0.25 : 0) ? 1 : 0), used = new Set(); let said = 0;
      for (let tries = 0; said < n && tries < 14; tries++) { const left = pool.filter(([k]) => !used.has(k)); if (!left.length) break; const t = weighted(left); used.add(t); if (add(t)) said++; }
      lines.push(this.bye(s, v));
      m.last = { day: g.clock.totalDays, hour: g.clock.hour, topics: done }; m.n = (m.n || 0) + 1;
      return { lines: lines.map((t) => this.gender(t, s).replace(/\b([Tt])he The\b/g, '$1he').replace(/\ba The\b/g, 'the').replace(/  +/g, ' ')), page };   // (no "the The Red Lion")
    } finally { this.cur = null; }
  }
  /** The right other half for the speaker (and no other half at all for single folk). */
  gender(t, s) {
    if (typeof t !== 'string') return t; const f = (s.gender || (s.look && s.look.gender)) === 'f';
    if (f) t = t.replace(/\b(the|my) wife\b/gi, '$1 husband').replace(/\b(my|the) missus\b/gi, 'my fella').replace(/\bmy girlfriend\b/gi, 'my boyfriend').replace(/\bher indoors\b/gi, 'him indoors');
    else t = t.replace(/\b(the|my) husband\b/gi, '$1 wife').replace(/\bmy boyfriend\b/gi, 'my girlfriend').replace(/\bmy fella\b/gi, 'my missus').replace(/\bhim indoors\b/gi, 'her indoors');
    if (s.kind === 'resident' && !s.partner) t = t.replace(/\b(the|my) (husband|wife|missus|fella)\b/gi, (m0, d) => `${d.charAt(0) === d.charAt(0).toUpperCase() ? 'My' : 'my'} ${f ? 'sister' : 'brother'}`);
    return t;
  }
  /** Their verbal tic now and then, or a word from home on the end. */
  decorate(t, s, v) {
    if (typeof t !== 'string' || t.length < 14 || /Here, take this/.test(t)) return t;
    const tic = v.tic;
    if (tic && this.ticN < 1 && Math.random() < v.ticRate) {
      const opened = OPENERS.some((o) => t.startsWith(o)) || /^[^ ]+[.!?,]/.test(t);
      if (tic.pre && !opened && /^[A-Z]/.test(t)) { this.ticN++; return tic.pre + lowerFirst(t, this.names()); }
      if (tic.suf && /[a-z0-9]\.$/.test(t) && !/\.\.\.$/.test(t)) { this.ticN++; return t.slice(0, -1) + tic.suf; }
    }
    const R = REGIONS[v.region]; if (R && R.tag && (s.kind !== 'child' || (s.age ?? 8) >= 11) && t.length < 110 && /[a-z]\.$/.test(t) && Math.random() < v.tagRate) return t.slice(0, -1) + pick(R.tag) + '.';
    return t;
  }
  greet(s) {
    const g = this.game, h = g.clock.hour, rel = s.samRel || 0, v = this.voice(s), m = this.mem(s), day = g.clock.totalDays; let lines;
    if (s.kind === 'child') lines = Math.random() < 0.5 ? KID_GREET : D.GREET.child; else if (s.kind === 'visitor') lines = D.GREET.visitor;
    else { const k = rel >= 40 ? 'friend' : rel >= 8 ? 'acquaintance' : 'stranger'; lines = this.mix(D.GREET[k], A.GREET[k], s); }
    if (s.kind === 'visitor') lines = this.mix(lines, A.GREET.visitor, s);
    let t = this.fill(this.pk(lines), s);
    // a hello from home (not for first meetings: they still need to say who they are)
    const R = REGIONS[v.region]; if (s.kind !== 'child' && rel >= 8 && R && Math.random() < 0.38) t = this.fill(this.pk(R.greet), s);
    // they remember the last chat
    if (m.last && s.kind !== 'visitor') {
      const dd = day - m.last.day, mk = dd === 0 && Math.random() < 0.75 ? 'again' : dd === 1 && Math.random() < 0.45 ? 'yesterday' : dd >= 7 && Math.random() < 0.7 ? 'long' : m.n >= 10 && Math.random() < 0.12 ? 'often' : null;
      if (mk && s.kind !== 'child') { const ml = this.fill(this.pk(MEMORY[mk]), s); t = mk === 'again' ? ml : mk === 'yesterday' ? (Math.random() < 0.5 ? t + ' ' + ml : ml) : t + ' ' + ml; }
      else if (mk === 'again' && s.kind === 'child') t = pick(['You again! Hiya!', 'Sam\'s back! Sam\'s back!', 'Hello again, Sam!']);
    }
    if (s.kind !== 'child' && Math.random() < 0.5) { const k = g.weather && g.weather.rain > 0.4 ? 'rain' : (h >= 22 || h < 5) ? 'night' : h < 11 ? 'morning' : h >= 17 ? 'evening' : null; if (k) t += ' ' + this.pk(this.mix(D.GREET[k], A.GREET[k], s)); }
    if (Math.random() < v.catchRate * 0.6) { t += ' ' + v.catchphrase; this.catchN++; }
    return t;
  }
  bye(s, v) {
    let t;
    if (s.kind === 'child') t = this.pk(Math.random() < 0.55 ? KID_BYE : D.BYE);
    else if (s.trait === 'grumpy') t = this.pk(this.mix(D.BYE_GRUMPY, A.BYE_GRUMPY, s));
    else if (s.trait === 'shy') t = this.pk(D.BYE_SHY);
    else if (REGIONS[v.region] && Math.random() < 0.4) t = this.pk(REGIONS[v.region].bye);
    else t = this.pk(this.mix(D.BYE, A.BYE, s));
    if (s.kind !== 'child' && s.trait !== 'shy' && !this.catchN && Math.random() < v.catchRate) t += ' ' + v.catchphrase;
    return this.fill(t, s);
  }
  reply(s, topic) {
    const g = this.game, P = this.persona(s), old = ['favour', 'how', 'work', 'news', 'about', 'help', 'wish'].includes(topic), open = s.kind === 'child' || !old ? '' : this.pk(D.TRAIT_OPEN[s.trait] || ['']); let text = '', page = null;
    s.talkCount = (s.talkCount || 0) + 1; s.talked = s.talked || {}; const day = g.clock.totalDays;
    if (s.talked[topic] !== day) { s.talked[topic] = day; s.samRel = Math.min(100, (s.samRel || 0) + (old ? 3 : 2)); }
    if (topic === 'favour') { const f = g.favours.forSim(s); if (!f) text = 'Oh, never mind, it\'s sorted.'; else if (!f.asked) { f.asked = true; text = f.text + ` I\'ll give you £${f.reward} for your trouble.`; } else text = g.favours.complete(f); }
    else if (topic === 'how') {
      if (s.kind === 'child') text = this.pk(D.CHILD_TALK);
      else {
        const m = s.mood ?? 0, mk = m > 0.35 ? 'happy' : m > -0.05 ? 'content' : m > -0.4 ? 'fedup' : 'miserable'; text = this.pk(this.mix(D.MOOD[mk], A.MOOD[mk], s));
        const why = []; if (s.hunger > 65) why.push('hungry'); if (s.tired) why.push('tired'); if (!s.home && s.kind === 'resident') why.push('homeless');
        if (s.partner) why.push('partner'); else if (s.kind === 'resident' && s.friendCount && s.friendCount() === 0) why.push('lonely');
        if (s.arrivalDay !== undefined && g.clock.totalDays - s.arrivalDay < 2) why.push('newcomer'); if (g.raids && g.raids.count && g.raids.state !== 'idle') why.push('raid');
        if (s.kind === 'resident' && s.age < 66) why.push(s.workplace ? 'work' : 'nowork');
        if (why.length) { const k = pick(why.slice(0, 2)); text += ' ' + this.fill(this.pk(this.mix(D.REASON[k], A.REASON[k], s)), s); }
      }
    } else if (topic === 'work') text = this.workLine(s);
    else if (topic === 'news') {
      const slip = g.story.slipLine(); page = g.story.pageFor(s);
      text = slip && Math.random() < 0.6 ? slip : this.gossip(s);
      if (page) text += '  ...Here, take this. Found it in the bins behind the office. Didn\'t get it from me, alright?';
    } else if (topic === 'about') {
      if (s.kind === 'child') text = this.pk(['My favourite thing is ', 'I really like ']) + this.pk(['frogs!', 'climbing trees.', 'the campfire.', 'my teacher. Don\'t tell anyone.', 'jam sandwiches.', 'the seagulls. They\'re naughty.', 'Gladiators!', 'my bike. It\'s a Raleigh.', 'Toy Story.', 'my nan\'s dog.', 'swimming. I got my ten metres badge.', 'Monster Munch.']);
      else {
        const v = this.voice(s), R = REGIONS[v.region], home = R && Math.random() < 0.3 ? this.pk2(R.home) : null;
        text = (home ? home : this.fill(D.ABOUT[P.about], s)) + ' ' + (s.quirk && Math.random() < 0.45 ? s.quirk.about : this.fill(this.pk(this.mix(D.ABOUT2, A.ABOUT2, s)), s));
        if ((s.samRel || 0) > 15 && Math.random() < 0.6) text += ' ' + this.fill(D.FAMILY[P.fam], s);
      }
    } else if (topic === 'help') text = this.advice(s);
    else if (topic === 'wish') { const w = this.wish(s); text = w || this.advice(s); }
    else if (topic === 'bye') text = this.bye(s, this.voice(s));
    else { text = this.extra(s, topic); if (!text) return null; }
    text = this.fill(text, s);
    const o = topic === 'bye' ? '' : open, soft = /[,.]{0,1}\.\.\. $|, $|I suppose $/.test(o) || o === 'Ooh, ';
    const body = soft ? lowerFirst(text.charAt(0).toUpperCase() + text.slice(1), this.names()) : text.charAt(0).toUpperCase() + text.slice(1);
    return { text: o + body, page };
  }
  /** The newer topics: their stories, hobbies, opinions, small talk, gossip by name, town news, jokes... */
  extra(s, topic) {
    const g = this.game, v = this.voice(s), m = this.mem(s), age = s.age ?? 30, last = (m.last && m.last.topics) || [];
    switch (topic) {
      case 'story': return this.storyLine(s);
      case 'hobby': {
        const h = v.hobbies[last.includes('hobby') ? 1 : Math.random() < 0.65 ? 0 : 1] || v.hobbies[0], H = HOBBY[h]; if (!H) return null;
        const t = this.pk2(H.lines); if (!t) return null;
        return (last.includes('hobby') && Math.random() < 0.35 ? this.fill(this.pk(MEMORY.hobby), s, { hobby: H.label }) + ' ' : '') + t;
      }
      case 'opinion': {
        const dims = Object.keys(OPINION).filter((d) => !(d === 'team' && v.op.team === 'none' && Math.random() < 0.6));
        for (let i = 0; i < 4; i++) { const d = pick(dims), L = OPINION[d][v.op[d]], t = L && this.pk2(L); if (t) return t; }
        return null;
      }
      case 'small': return this.smallLine(s);
      case 'kidsmall': return this.pk2(Math.random() < 0.55 ? KID_SMALLTALK : AGE_TALK.child);
      case 'gossip': return this.gossipAbout(s);
      case 'town': return this.townLine(s);
      case 'joke': {
        const L = s.kind === 'child' ? KID_JOKES : this.adultOk(s) && Math.random() < 0.35 ? ADULT_JOKES : JOKES, t = this.pk2(L); if (!t) return null;
        return (last.includes('joke') && s.kind !== 'child' ? this.pk(MEMORY.joke) + ' ' : s.kind === 'child' ? pick(['Want to hear a joke? ', 'Knock knock! No, wait. ', '']) : pick(['Here, I heard a good one. ', 'Want a joke? ', 'Do you know this one? ', ''])) + t;
      }
      case 'request': return this.pk2(REQUESTS);
      case 'running': { const i = Math.floor(g.clock.totalDays / 6), L = [...RUNNING[i % RUNNING.length], ...RUNNING[(i + 3) % RUNNING.length]]; return this.runningVictim() ? this.pk2(L) : null; }
      case 'quirk': { if (!s.quirk) return null; const L = QUIRK_TALK[s.quirk.id]; return this.pk2(L && L.length ? L : s.quirk.lines || []); }
      case 'trait': return this.pk2(this.adultOk(s) && Math.random() < 0.15 ? ADULT_TALK.smalltalk : TRAIT_TALK[s.trait] || TRAIT_TALK.cheerful);
      case 'region': { const R = REGIONS[v.region]; return R ? this.pk2(Math.random() < 0.8 ? R.say : R.home) : null; }
      case 'catch': if (this.catchN++) return null; return v.catchphrase + (s.kind === 'child' ? pick([' That\'s my word.', ' I say that a lot.', '']) : pick([' That\'s what I always say.', ' As I always say.', ' My mum used to say that. Now I do.', '']));
      case 'age': {
        if (s.kind === 'visitor') return this.pk2(AGE_TALK.visitor);
        if (s.kind === 'child') return this.pk2(AGE_TALK.child);
        const nw = s.arrivalDay !== undefined && g.clock.totalDays - s.arrivalDay >= 0 && g.clock.totalDays - s.arrivalDay < 2;
        const L = nw && Math.random() < 0.6 ? AGE_TALK.newcomer : age < 20 ? AGE_TALK.teen : age >= 66 ? (Math.random() < 0.75 ? AGE_TALK.pensioner : ELDER_LINES) : AGE_TALK.adult;
        return this.pk2(L);
      }
    }
    return null;
  }
  /** What they say about their job: by the place they work, by role, the old lines and (18+) the cheeky ones. */
  workLine(s) {
    const g = this.game, key = s.kind === 'child' ? 'child' : s.kind === 'visitor' ? 'visitor' : s.role && (D.WORK[s.role] || ROLE_TALK[s.role]) ? s.role : s.age >= 66 ? 'retired' : 'unemployed';
    const id = s.workplace && s.workplace.id, L = [];
    if (id) { if (N96.work[id]) L.push(...N96.work[id]); if (PLACE_TALK[id]) L.push(...PLACE_TALK[id]); }
    if (D.WORK[key]) L.push(...D.WORK[key]); if (ROLE_TALK[key]) L.push(...ROLE_TALK[key]);
    if (key === 'unemployed' || key === 'retired') L.push(...AGE_TALK[key]); if (key === 'visitor') L.push(...AGE_TALK.visitor);
    if (this.adultOk(s)) { if (A.WORK[key]) L.push(...A.WORK[key]); if (ADULT_TALK.role[key] && Math.random() < 0.5) L.push(...ADULT_TALK.role[key]); }
    let text = this.pk(L.length ? L : D.WORK.unemployed);
    if (s.workplace && Math.random() < 0.4 && (this.mem(s).n || 0) < 3) text += ` I work at the ${s.workplace.def.name}, you know.`;
    return text;
  }
  /** Small talk: the weather, the time, the day, the season, or whatever's on their mind. */
  smallLine(s) {
    const g = this.game, c = g.clock, h = c.hour, w = g.weather, hz = g.hazards, kid = s.kind === 'child', opts = [];
    let wk = null;
    if (hz && hz.powerCut > 0) wk = 'powercut';
    else if (w && w.rain > 0.3) wk = w.snowy ? 'snow' : w.storm ? 'storm' : 'rain';
    else if (w && w.mist > 0.3) wk = 'mist';
    else if (hz && hz.drought) wk = 'hot';
    else if (c.month >= 5 && c.month <= 7 && h > 9 && h < 19) wk = 'sunny';
    else if (c.month === 11 || c.month <= 1) wk = 'cold';
    if (wk && WEATHER_TALK[wk]) opts.push([WEATHER_TALK[wk], wk === 'sunny' || wk === 'cold' ? 1 : 2.5]);
    { const t = keyToday(c); if (t && KEYDAY_TALK[t.name]) opts.push([KEYDAY_TALK[t.name], t.sam ? (s.samRel || 0) >= 8 ? 9 : 3 : 4]); }   // the day itself comes up first (and his friends don't forget Sam's birthday)
    if (kid) { opts.push([KID_SMALLTALK, 2]); return this.pk2(weighted(opts)) || this.pk2(KID_SMALLTALK); }
    const tk = h >= 22 || h < 5 ? 'late' : h < 8 ? 'early' : h < 12 ? 'morning' : h < 14 ? 'lunch' : h < 17 ? 'afternoon' : 'evening';
    const sk = c.month >= 2 && c.month <= 4 ? 'spring' : c.month <= 7 && c.month >= 5 ? 'summer' : c.month >= 8 && c.month <= 10 ? 'autumn' : 'winter';
    opts.push([TIME_TALK[tk], 1.2], [DAY_TALK[c.weekday] || DAY_TALK[0], 1.3], [SEASON_TALK[c.month] || [], 0.9], [SEASON_TALK[sk], 0.7], [SMALLTALK, 1.6]);
    if (this.adultOk(s)) opts.push([ADULT_TALK.smalltalk, 0.6]);
    for (let i = 0; i < 4; i++) { const t = this.pk2(weighted(opts)); if (t) return t; }
    return this.pk2(SMALLTALK);
  }
  /** The person everyone's running joke is about (the same one for the whole town). */
  runningVictim() {
    const res = this.game.population.residents().filter((q) => q.kind === 'resident' && q.first); if (!res.length) return null;
    let best = null, bh = Infinity; for (const q of res) { const hh = hashStr(q.name + '#rj'); if (hh < bh) { bh = hh; best = q; } }
    return best.first;
  }
  /** Gossip about the neighbours by name: a friend, a couple, someone's quirk or job, the new arrival... */
  gossipAbout(s) {
    const g = this.game, P = g.population, res = this.others(s), opts = []; if (!res.length) return null;
    const adults = res.filter((q) => q.kind === 'resident');
    const best = [...(s.rel || new Map()).entries()].filter(([, x]) => x >= 30).sort((a, b) => b[1] - a[1])[0], fr = best && res.find((q) => q.id === best[0]);
    if (fr) opts.push([GOSSIP_ABOUT.friend, { a: fr.first }, 1.4]);
    const cp = adults.filter((q) => q.partner && q.partner !== s && q.id < q.partner.id); if (cp.length) { const q = pick(cp); opts.push([GOSSIP_ABOUT.couple, { a: q.first, b: q.partner.first }, 1]); }
    const qk = adults.filter((q) => q.quirk && GOSSIP_QUIRK[q.quirk.id]); if (qk.length) { const q = pick(qk); opts.push([GOSSIP_QUIRK[q.quirk.id], { a: q.first }, 2]); }
    const rl = adults.filter((q) => q.role && q.workplace && GOSSIP_ROLE[q.role]); if (rl.length) { const q = pick(rl); opts.push([GOSSIP_ROLE[q.role], { a: q.first, bld: q.workplace.def.name }, 2]); }
    const kids = res.filter((q) => q.kind === 'child'); if (kids.length) opts.push([GOSSIP_ABOUT.child, { a: pick(kids).first }, 0.6]);
    const olds = adults.filter((q) => q.age >= 66); if (olds.length) opts.push([GOSSIP_ABOUT.old, { a: pick(olds).first }, 0.7]);
    const nw = adults.filter((q) => q.arrivalDay !== undefined && g.clock.totalDays - q.arrivalDay >= 0 && g.clock.totalDays - q.arrivalDay < 3); if (nw.length) opts.push([GOSSIP_ABOUT.newcomer, { a: pick(nw).first }, 1.2]);
    const jl = adults.filter((q) => P.canWork(q) && !q.workplace); if (jl.length) opts.push([GOSSIP_ABOUT.jobless, { a: pick(jl).first }, 0.5]);
    const dr = adults.filter((q) => q.drunk > 0.4); if (dr.length) opts.push([GOSSIP_ABOUT.drunk, { a: pick(dr).first }, 0.8]);
    const hl = adults.filter((q) => q.homeless); if (hl.length) opts.push([GOSSIP_ABOUT.homeless, { a: pick(hl).first }, 0.8]);
    if (adults.length) opts.push([GOSSIP_ABOUT.any, { a: pick(adults).first }, 2.2]);
    if (this.adultOk(s) && adults.length) opts.push([ADULT_TALK.smalltalk.filter((t) => t.includes('{a}')), { a: pick(adults).first }, 0.3]);
    for (let i = 0; i < 4 && opts.length; i++) { const o = weighted(opts.map((x) => [x, x[2]])); const t = this.pk2(o[0]); if (t) return this.fill(t, s, o[1]); opts.splice(opts.indexOf(o), 1); }
    return null;
  }

  // ---------- town news ----------
  /** Note what's been happening (from the message feed), for people to talk about over the next few days. */
  logNews(msg) {
    const g = this.game, F = g.flags; if (!F || !msg || typeof msg.text !== 'string' || !g.clock) return;
    for (const [re, k] of NEWS_RULES) {
      const mm = re.exec(msg.text); if (!mm) continue; const gr = mm.groups || {}, first = (n) => (n ? n.trim().split(' ')[0] : undefined);
      const day = g.clock.totalDays, L = F.news || (F.news = []);
      if (L.some((n) => n.k === k && n.day === day)) return;
      L.push({ k, day, a: k === 'guest' ? gr.a : first(gr.a), b: first(gr.b), bld: gr.bld ? gr.bld.trim() : undefined }); while (L.length > 16) L.shift();
      return;
    }
  }
  freshNews(s) { const g = this.game, day = g.clock.totalDays; return (g.flags.news || []).filter((n) => day - n.day <= 3 && NEWS_TALK[n.k] && NEWS_TALK[n.k].length && n.a !== s.first && n.b !== s.first); }
  townLine(s) {
    const L = this.freshNews(s); if (!L.length) return null; const day = this.game.clock.totalDays;
    for (let i = 0; i < 3; i++) {
      const n = weighted(L.map((x) => [x, 4 - Math.min(3, day - x.day)])), t = this.pk2(NEWS_TALK[n.k]); if (!t) continue;
      const res = this.others(s), any = () => (res.length ? pick(res).first : 'Big Trev');
      return this.fill(t, s, { a: n.a || any(), b: n.b || any(), bld: n.bld || 'Stockyard' });
    }
    return null;
  }

  // ---------- running stories ----------
  /** The next bit of one of their stories (peek: 'new' if there's news, true if there's something to say). */
  storyLine(s, peek = false) {
    const g = this.game, v = this.voice(s), m = this.mem(s), day = g.clock.totalDays, single = !s.partner;
    let fresh = null, any = null, echo = null;
    for (const id of v.stories) {
      const A0 = STORIES[id]; if (!A0) continue; const st = m.st[id] || { i: -1, d: -99 }, w = A0.who || {};
      if (st.i < 0 && ((w.single && !single) || (w.partner && single))) continue;   // only start the ones that suit them now
      const next = st.i + 1 < A0.steps.length ? this.resolve(A0.steps[st.i + 1]) : null;
      if (next && day - st.d >= (A0.gap || 2) && this.ok(next)) { if (this.recent.includes(hashStr(next))) echo = echo || id; else if (!fresh) fresh = id; }   // not the same news somebody else has just told Sam
      if (st.i >= 0 && !any) any = id;
    }
    if (!fresh && !any) fresh = echo;
    if (peek) return fresh ? 'new' : !!any;
    const id = fresh || any; if (!id) return null;
    const A0 = STORIES[id], st = m.st[id] || (m.st[id] = { i: -1, d: -99 }), extra = { nbr: this.neighbour(s, st, id) };
    if (fresh) {
      st.i++; st.d = day; const t = this.resolve(A0.steps[st.i]); this.recent.push(hashStr(t)); if (this.recent.length > GLOBAL_RECENT) this.recent.shift();
      const lead = st.i > 0 && m.last && Math.random() < 0.35 ? this.pk(MEMORY.story) + ' ' : '';
      return lead + this.fill(t, s, extra);
    }
    const t = this.pk2(st.i >= A0.steps.length - 1 ? A0.done : A0.idle); return t ? this.fill(t, s, extra) : null;
  }
  /** The neighbour in a story: a real resident, remembered by name. */
  neighbour(s, st, id = '') {
    const res = this.others(s).filter((q) => q.kind === 'resident');
    if (st.nb && (res.some((q) => q.first === st.nb) || !res.length)) return st.nb;
    const q = res.length ? res[hashStr(s.name + '#nb' + id + res.length) % res.length] : null; st.nb = q ? q.first : 'Mrs Hargreaves next door'; return st.nb;
  }

  // ---------- the original topics ----------
  /** Something the town hasn't got yet that this person would like (only things the town could build soon). */
  wish(s) {
    const g = this.game, e = g.economy, k = Object.keys(WISHES).filter((id) => !g.buildings.count(id, false) && (e.visible(id) || (BUILDINGS[id] && BUILDINGS[id].permit.pop <= g.population.count() + 10))); if (!k.length) return null;
    // the same person keeps asking for the same thing; everyone who asks is remembered (see the journal), and thanks Sam when it's built
    const id = s && s.wishFor && k.includes(s.wishFor) ? s.wishFor : pick(k); if (s) { s.wishFor = id; const A = g.flags.asks || (g.flags.asks = {}), L = A[id] || (A[id] = []); if (!L.includes(s.id)) L.push(s.id); }
    return pick(WISHES[id]);
  }
  gossip(s) {
    const g = this.game, P = g.population, res = P.residents().filter((q) => q !== s && !q.remove), opts = [];
    const couple = res.find((q) => q.partner && q.partner !== s && Math.random() < 0.5); if (couple) opts.push(['couple', { a: couple.first, b: couple.partner.first }]);
    const fr = res.find((q) => [...q.rel.entries()].some(([id, v]) => v >= 35)); if (fr) { const id = [...fr.rel.entries()].find(([, v]) => v >= 35)[0], o = P.sims.find((q) => q.id === id); if (o && o !== s) opts.push(['friends', { a: fr.first, b: o.first }]); }
    const newest = res.filter((q) => q.arrivalDay !== undefined).sort((a, b) => b.arrivalDay - a.arrivalDay)[0]; if (newest && g.clock.totalDays - newest.arrivalDay < 3) opts.push(['newcomer', { a: newest.first }]);
    const hungry = res.find((q) => q.hunger > 80); if (hungry) opts.push(['hungry', { a: hungry.first }]);
    const recent = (g.flags.recent || []).filter((r) => g.clock.totalDays - r.day <= 4); if (recent.length) { const r = recent[Math.floor(Math.random() * recent.length)]; opts.push(['recent', r], ['recent', r]); }
    if (g.economy.stock.food < Math.max(3, P.count() * 0.5) && P.count() > 2) opts.push(['noFood', {}], ['noFood', {}]);
    if (P.freeBeds() === 0 && P.count() > 2) opts.push(['noHomes', {}]);
    if (g.raids && g.raids.count) opts.push(['raid', {}]);
    if (g.weather && g.weather.rain > 0.3) opts.push(['rain', {}]);
    if (P.count() > 12) opts.push(['growing', {}]);
    if ((s.samRel || 0) > 10) opts.push(['sam', {}]);
    if (g.buildings.count('tavern') && res.length) opts.push(['pub', { a: pick(res).first }]);
    opts.push(['quiet', {}], ['nineties', { a: res.length ? pick(res).first : 'Dave' }], ['nineties', { a: res.length ? pick(res).first : 'Sharon' }]);
    // the town's own news and the neighbours by name come up here too
    if (this.freshNews(s).length) opts.push(['town', {}], ['town', {}]);
    if (res.length) opts.push(['named', {}]);
    const [k, extra] = pick(opts);
    if (k === 'town' || k === 'named') { const t = k === 'town' ? this.townLine(s) : this.gossipAbout(s); if (t) return t; return this.fill(this.pk(D.GOSSIP.quiet), s); }
    if (k === 'recent') return this.fill(this.pk(RECENT[extra.id] && RECENT[extra.id].length && Math.random() < 0.6 ? RECENT[extra.id] : RECENT._), s, { bld: extra.name });
    return this.fill(this.pk(this.mix(D.GOSSIP[k] || A.GOSSIP[k], A.GOSSIP[k], s)), s, extra);
  }
  advice(s) {
    const g = this.game, B = g.buildings, E = g.economy, P = g.population, p = g.player, tips = [];
    if (!B.list.some((b) => b.def.stores)) tips.push(D.HELP.noYard);
    if (!g.starterHome) tips.push(D.HELP.noHome);
    if (!B.list.some((b) => b.id === 'postbox')) tips.push(D.HELP.postbox); else if (Object.values(E.permits).filter((x) => x === 'approved').length < 8) tips.push(D.HELP.permits);
    if (!B.count('forager') && !B.count('fisher') && !B.count('farm')) tips.push(D.HELP.noFood); else if (E.stock.food < P.count()) tips.push(D.HELP.lowFood);
    if (P.freeBeds() === 0 && P.count() > 0) tips.push(D.HELP.beds);
    if (P.residents().some((q) => !q.workplace && P.canWork(q))) tips.push(D.HELP.jobs);
    if (!B.count('contractor') && P.count() >= 4) tips.push(D.HELP.builders);
    if (p.hunger > 55) tips.push(D.HELP.hungrySam); if (p.energy < 35) tips.push(D.HELP.tiredSam);
    if (g.roadPlans.count) tips.push(D.HELP.roads); if (g.raids && g.raids.count) tips.push(D.HELP.raid);
    tips.push(D.HELP.minigame, this.pk(this.mix(D.HELP.generic, A.HELP, s)));
    return g.ui.keyText(this.choose(tips.slice(0, Math.min(3, tips.length))) || tips[0]);
  }
}
