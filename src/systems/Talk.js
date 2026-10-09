import * as D from '../data/dialogue.js';
import { A } from '../data/humour.js';
import { ROLES } from '../data/buildings.js';
import { mulberry32, pick } from '../util.js';

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * Conversations with townsfolk: a greeting, then a menu of topics (how are you, work, news, their life story, advice, goodbye).
 * Answers depend on who they are (role, trait, age, partner, persona), how well they know Sam, the time, the weather and the state of the town.
 */
export class Talk {
  constructor(game) { this.game = game; }
  /** With adult humour on, half the time use the 18+ line bank instead (never for children). */
  mix(base, extra, s) { return this.game.ui.adult && extra && extra.length && (!s || s.kind !== 'child') && Math.random() < 0.5 ? extra : base; }
  /** Stable personal details per townsperson, generated from their name. */
  persona(s) {
    if (s.persona) return s.persona; const r = mulberry32(hashStr(s.name || 'x'));
    const p = { town: D.TOWNS[Math.floor(r() * D.TOWNS.length)], town2: D.TOWNS[Math.floor(r() * D.TOWNS.length)], job: D.OLD_JOBS[Math.floor(r() * D.OLD_JOBS.length)], job2: D.OLD_JOBS[Math.floor(r() * D.OLD_JOBS.length)],
      hobby: D.HOBBIES[Math.floor(r() * D.HOBBIES.length)], pet: D.PETS[Math.floor(r() * D.PETS.length)], food: D.FOODS[Math.floor(r() * D.FOODS.length)], fam: Math.floor(r() * D.FAMILY.length), about: Math.floor(r() * D.ABOUT.length) };
    return (s.persona = p);
  }
  fill(t, s, extra = {}) {
    const p = this.persona(s); const map = { first: s.first || s.name.split(' ')[0], town: p.town, town2: p.town2, job: p.job, job2: p.job2, hobby: p.hobby, pet: p.pet, food: p.food, p: s.partner ? s.partner.first : 'my other half', ...extra };
    return t.replace(/\{(\w+)\}/g, (m, k) => (map[k] !== undefined ? map[k] : m));
  }
  topics(s) {
    const kid = s.kind === 'child', vis = s.kind === 'visitor';
    const f = this.game.favours.forSim(s), fav = f ? [['favour', f.asked ? `Here's your ${f.n} ${f.mat}.` : 'You look like you need something?']] : [];
    return [...fav, ['how', 'How are you doing?'], ['work', kid ? 'What are you up to?' : vis ? 'Enjoying your visit?' : 'How\'s work?'], ['news', 'Heard any news or gossip?'], ['about', kid ? 'What\'s your favourite thing?' : 'Tell me about yourself.'], ['help', 'Any advice for me?'], ['bye', 'See you later.']];
  }
  /**
   * One short conversation, no menus: a greeting, a favour if they have one, then two or three things
   * that suit who they are (how they feel, their work, gossip, their life, a tip), and a goodbye.
   */
  conversation(s) {
    const lines = [this.greet(s)], f = this.game.favours.forSim(s); let page = null;
    const add = (topic) => { const r = this.reply(s, topic); lines.push(r.text); if (r.page) page = r.page; };
    if (f) add('favour');
    const pool = s.kind === 'child' ? ['how', 'about', 'work'] : ['how', 'work', 'news', 'news', 'about', 'help'];
    if ((s.samRel || 0) < 8 && s.kind !== 'child') pool.push('about');
    const n = f ? 1 : 2 + (Math.random() < 0.35 ? 1 : 0), used = new Set();
    while (used.size < n && used.size < new Set(pool).size) { const t = pick(pool); if (used.has(t)) continue; used.add(t); add(t); }
    lines.push(this.reply(s, 'bye').text);
    return { lines, page };
  }
  greet(s) {
    const g = this.game, h = g.clock.hour, rel = s.samRel || 0; let lines;
    if (s.kind === 'child') lines = D.GREET.child; else if (s.kind === 'visitor') lines = D.GREET.visitor;
    else { const k = rel >= 40 ? 'friend' : rel >= 8 ? 'acquaintance' : 'stranger'; lines = this.mix(D.GREET[k], A.GREET[k], s); }
    if (s.kind === 'visitor') lines = this.mix(lines, A.GREET.visitor, s);
    let t = this.fill(pick(lines), s);
    if (s.kind !== 'child' && Math.random() < 0.5) { const k = g.weather && g.weather.rain > 0.4 ? 'rain' : (h >= 22 || h < 5) ? 'night' : h < 11 ? 'morning' : h >= 17 ? 'evening' : null; if (k) t += ' ' + pick(this.mix(D.GREET[k], A.GREET[k], s)); }
    return t;
  }
  reply(s, topic) {
    const g = this.game, P = this.persona(s), open = s.kind === 'child' ? '' : pick(D.TRAIT_OPEN[s.trait] || ['']); let text = '', page = null;
    s.talkCount = (s.talkCount || 0) + 1; s.talked = s.talked || {}; const day = g.clock.totalDays;
    if (s.talked[topic] !== day) { s.talked[topic] = day; s.samRel = Math.min(100, (s.samRel || 0) + 3); }
    if (topic === 'favour') { const f = g.favours.forSim(s); if (!f) text = 'Oh, never mind, it\'s sorted.'; else if (!f.asked) { f.asked = true; text = f.text + ` I\'ll give you £${f.reward} for your trouble.`; } else text = g.favours.complete(f); }
    else if (topic === 'how') {
      if (s.kind === 'child') text = pick(D.CHILD_TALK);
      else {
        const m = s.mood ?? 0, mk = m > 0.35 ? 'happy' : m > -0.05 ? 'content' : m > -0.4 ? 'fedup' : 'miserable'; text = pick(this.mix(D.MOOD[mk], A.MOOD[mk], s));
        const why = []; if (s.hunger > 65) why.push('hungry'); if (s.tired) why.push('tired'); if (!s.home && s.kind === 'resident') why.push('homeless');
        if (s.partner) why.push('partner'); else if (s.kind === 'resident' && s.friendCount && s.friendCount() === 0) why.push('lonely');
        if (s.arrivalDay !== undefined && g.clock.day - s.arrivalDay < 2) why.push('newcomer'); if (g.raids && g.raids.count && g.raids.state !== 'idle') why.push('raid');
        if (s.kind === 'resident' && s.age < 66) why.push(s.workplace ? 'work' : 'nowork');
        if (why.length) { const r = pick(why.slice(0, 2)); text += ' ' + this.fill(pick(this.mix(D.REASON[r], A.REASON[r], s)), s); }
      }
    } else if (topic === 'work') {
      const key = s.kind === 'child' ? 'child' : s.kind === 'visitor' ? 'visitor' : s.role && D.WORK[s.role] ? s.role : s.age >= 66 ? 'retired' : 'unemployed';
      text = pick(this.mix(D.WORK[key] || D.WORK.unemployed, A.WORK[key], s)); if (s.workplace && Math.random() < 0.4) text += ` I work at the ${s.workplace.def.name}, you know.`;
    } else if (topic === 'news') {
      const slip = g.story.slipLine(); page = g.story.pageFor(s);
      text = slip && Math.random() < 0.6 ? slip : this.gossip(s);
      if (page) text += '  ...Here, take this. Found it in the bins behind the office. Didn\'t get it from me, alright?';
    } else if (topic === 'about') {
      if (s.kind === 'child') text = pick(['My favourite thing is ', 'I really like ']) + pick(['frogs!', 'climbing trees.', 'the campfire.', 'my teacher. Don\'t tell anyone.', 'jam sandwiches.', 'the seagulls. They\'re naughty.']);
      else { text = this.fill(D.ABOUT[P.about], s) + ' ' + this.fill(pick(this.mix(D.ABOUT2, A.ABOUT2, s)), s); if ((s.samRel || 0) > 15 && Math.random() < 0.6) text += ' ' + this.fill(D.FAMILY[P.fam], s); }
    } else if (topic === 'help') text = this.advice(s);
    else if (topic === 'bye') text = pick(s.kind === 'child' ? D.BYE : s.trait === 'grumpy' ? this.mix(D.BYE_GRUMPY, A.BYE_GRUMPY, s) : s.trait === 'shy' ? D.BYE_SHY : this.mix(D.BYE, A.BYE, s));
    const o = topic === 'bye' ? '' : open, soft = /[,.]{0,1}\.\.\. $|, $|I suppose $/.test(o) || o === 'Ooh, ';
    const w0 = text.split(/[ ,.!?']/)[0], proper = /^I$/.test(w0) || D.TOWNS.some((t) => text.startsWith(t)) || /^(Sam|Mr|Mrs|Euro|Oasis|Blur|Noel|Del|Gazza|Ulrika|Gladiators|Teletext|Christmas|Sunday|Friday|Tuesday|Thursday)/.test(w0) || (s.first && w0 === s.first);
    const body = soft && !proper ? text.charAt(0).toLowerCase() + text.slice(1) : text.charAt(0).toUpperCase() + text.slice(1);
    return { text: o + body, page };
  }
  gossip(s) {
    const g = this.game, P = g.population, res = P.residents().filter((q) => q !== s && !q.remove), opts = [];
    const couple = res.find((q) => q.partner && q.partner !== s && Math.random() < 0.5); if (couple) opts.push(['couple', { a: couple.first, b: couple.partner.first }]);
    const fr = res.find((q) => [...q.rel.entries()].some(([id, v]) => v >= 35)); if (fr) { const id = [...fr.rel.entries()].find(([, v]) => v >= 35)[0], o = P.sims.find((q) => q.id === id); if (o && o !== s) opts.push(['friends', { a: fr.first, b: o.first }]); }
    const newest = res.filter((q) => q.arrivalDay !== undefined).sort((a, b) => b.arrivalDay - a.arrivalDay)[0]; if (newest && g.clock.day - newest.arrivalDay < 3) opts.push(['newcomer', { a: newest.first }]);
    const hungry = res.find((q) => q.hunger > 80); if (hungry) opts.push(['hungry', { a: hungry.first }]);
    const blds = g.buildings.list.filter((b) => b.state === 'done' && !b.def.special); if (blds.length) opts.push(['building', { bld: blds[blds.length - 1 - Math.floor(Math.random() * Math.min(3, blds.length))].def.name }]);
    if (g.economy.stock.food < Math.max(3, P.count() * 0.5) && P.count() > 2) opts.push(['noFood', {}], ['noFood', {}]);
    if (P.freeBeds() === 0 && P.count() > 2) opts.push(['noHomes', {}]);
    if (g.raids && g.raids.count) opts.push(['raid', {}]);
    if (g.weather && g.weather.rain > 0.3) opts.push(['rain', {}]);
    if (P.count() > 12) opts.push(['growing', {}]);
    if ((s.samRel || 0) > 10) opts.push(['sam', {}]);
    if (g.buildings.count('tavern') && res.length) opts.push(['pub', { a: pick(res).first }]);
    opts.push(['quiet', {}]);
    const [k, extra] = pick(opts); return this.fill(pick(this.mix(D.GOSSIP[k] || A.GOSSIP[k], A.GOSSIP[k], s)), s, extra);
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
    tips.push(D.HELP.minigame, pick(this.mix(D.HELP.generic, A.HELP, s)));
    return g.ui.keyText(tips[Math.floor(Math.random() * Math.min(3, tips.length))]);
  }
}
