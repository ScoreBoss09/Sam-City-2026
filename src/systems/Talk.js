import * as D from '../data/dialogue.js';
import { ROLES } from '../data/buildings.js';
import { mulberry32, pick } from '../util.js';

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * Conversations with townsfolk: a greeting, then a menu of topics (how are you, work, news, their life story, advice, goodbye).
 * Answers depend on who they are (role, trait, age, partner, persona), how well they know Sam, the time, the weather and the state of the town.
 */
export class Talk {
  constructor(game) { this.game = game; }
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
  greet(s) {
    const g = this.game, h = g.clock.hour, rel = s.samRel || 0; let lines;
    if (s.kind === 'child') lines = D.GREET.child; else if (s.kind === 'visitor') lines = D.GREET.visitor;
    else lines = rel >= 40 ? D.GREET.friend : rel >= 8 ? D.GREET.acquaintance : D.GREET.stranger;
    let t = this.fill(pick(lines), s);
    if (s.kind !== 'child' && Math.random() < 0.5) { const extra = g.weather && g.weather.rain > 0.4 ? D.GREET.rain : (h >= 22 || h < 5) ? D.GREET.night : h < 11 ? D.GREET.morning : h >= 17 ? D.GREET.evening : null; if (extra) t += ' ' + pick(extra); }
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
        const m = s.mood ?? 0; text = pick(m > 0.35 ? D.MOOD.happy : m > -0.05 ? D.MOOD.content : m > -0.4 ? D.MOOD.fedup : D.MOOD.miserable);
        const why = []; if (s.hunger > 65) why.push('hungry'); if (s.tired) why.push('tired'); if (!s.home && s.kind === 'resident') why.push('homeless');
        if (s.partner) why.push('partner'); else if (s.kind === 'resident' && s.friendCount && s.friendCount() === 0) why.push('lonely');
        if (s.arrivalDay !== undefined && g.clock.day - s.arrivalDay < 2) why.push('newcomer'); if (g.raids && g.raids.count && g.raids.state !== 'idle') why.push('raid');
        if (s.kind === 'resident' && s.age < 66) why.push(s.workplace ? 'work' : 'nowork');
        if (why.length) text += ' ' + this.fill(pick(D.REASON[pick(why.slice(0, 2))]), s);
      }
    } else if (topic === 'work') {
      const key = s.kind === 'child' ? 'child' : s.kind === 'visitor' ? 'visitor' : s.role && D.WORK[s.role] ? s.role : s.age >= 66 ? 'retired' : 'unemployed';
      text = pick(D.WORK[key]); if (s.workplace && Math.random() < 0.4) text += ` I work at the ${s.workplace.def.name}, you know.`;
    } else if (topic === 'news') {
      const slip = g.story.slipLine(); page = g.story.pageFor(s);
      text = slip && Math.random() < 0.6 ? slip : this.gossip(s);
      if (page) text += '  ...Here, take this. Found it in the bins behind the office. Didn\'t get it from me, alright?';
    } else if (topic === 'about') {
      if (s.kind === 'child') text = pick(['My favourite thing is ', 'I really like ']) + pick(['frogs!', 'climbing trees.', 'the campfire.', 'my teacher. Don\'t tell anyone.', 'jam sandwiches.', 'the seagulls. They\'re naughty.']);
      else { text = this.fill(D.ABOUT[P.about], s) + ' ' + this.fill(pick(D.ABOUT2), s); if ((s.samRel || 0) > 15 && Math.random() < 0.6) text += ' ' + this.fill(D.FAMILY[P.fam], s); }
    } else if (topic === 'help') text = this.advice(s);
    else if (topic === 'bye') text = pick(s.trait === 'grumpy' ? D.BYE_GRUMPY : s.trait === 'shy' ? D.BYE_SHY : D.BYE);
    const o = topic === 'bye' ? '' : open, soft = /[,.]{0,1}\.\.\. $|, $|I suppose $/.test(o) || o === 'Ooh, ';
    const body = soft && !/^I[ ']/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text.charAt(0).toUpperCase() + text.slice(1);
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
    opts.push(['quiet', {}]);
    const [k, extra] = pick(opts); return this.fill(pick(D.GOSSIP[k]), s, extra);
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
    tips.push(D.HELP.minigame, pick(D.HELP.generic));
    return g.ui.keyText(tips[Math.floor(Math.random() * Math.min(3, tips.length))]);
  }
}
