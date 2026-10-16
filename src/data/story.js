// Story + dialogue data. Plain data so writers can edit it and Unity can load it as JSON/ScriptableObjects.
// The deeper story is never announced: it surfaces only through small oddities in conversation and a few crumpled pages.

export const SCRIPT_PAGES = [
  'Running order, day 412 — "SAM walks to the Town Hall. Nobody mentions the Lift. If SAM looks up for more than five seconds, bring in some cloud."',
  'Staff notice — "Lift crew change over between 02:00 and 04:00. The platform is unmanned in that window. Nobody tells SAM."',
  'Contingency sheet — "If SAM reaches the edge of the set: sedate, return to hospital or town square, resume the day as normal."',
];

export const GREETINGS = {
  cheerful: ['Morning, Sam! Lovely day for it.', 'Alright, Sam? Town\'s looking grand.', 'Hello there! Fancy a brew later?'],
  grumpy: ['Hmph. Sam. What is it?', 'Busy day. Make it quick, will you?', 'Roads in this town. Disgraceful. Not that I\'d live anywhere else.'],
  shy: ['Oh! Um, hello, Sam.', 'Morning... lovely weather, isn\'t it?', 'I was just, er, having a wander. Hello.'],
  busy: ['Can\'t stop, Sam. Things to do.', 'Hiya, Sam — late as ever.', 'Walk and talk? No? Cheers, bye!'],
};
export const ROLE_LINES = {
  builder: ['Give me timber and a plan and I\'ll give you a building.', 'Mind your head round the scaffolding.', 'Bit of rain and the whole site goes to mud.'],
  lumberjack: ['Forest\'s thinning near the path. Plenty further in, mind.', 'Nothing like the smell of fresh-cut timber.', 'My back\'s killing me. Worth it for the wages.'],
  forager: ['Good crop of blackberries this week.', 'Mind the thorns. Learnt that the hard way.', 'The bushes grow back, thank goodness.'],
  fisher: ['Mackerel were biting this morning.', 'Quiet work, fishing. Suits me.', 'Seagulls nick half my catch.'],
  quarryman: ['Dusty work, but honest.', 'Plenty of good stone out west.', 'Careful with those boulders, Sam.'],
  farmer: ['Wheat\'s coming on nicely.', 'No rest for a farmer. Cows don\'t keep office hours.', 'Soil\'s good here. Strangely good.'],
  brickmaker: ['Best clay on the island, that.', 'The kiln never goes cold.', 'Fired a hundred this week.'],
  glassblower: ['Beach sand makes lovely glass.', 'Mind the furnace, it bites.', 'Windows for the whole town, soon enough.'],
  smith: ['Iron from the hills, steel from my forge.', 'Good steel takes patience.', 'Hammer, anvil, repeat.'],
  publican: ['Pint? Well, a cup of tea, in your case.', 'Stew\'s on. Same recipe as always.', 'Best seat\'s by the fire.'],
  teacher: ['The children are coming along nicely.', 'Reading, writing and a bit of arithmetic.', 'Such bright little things.'],
  shopkeeper: ['Fresh stock every day. Same stock every day, really.', 'Business is steady. Remarkably steady.', 'Anything I can get you, Sam?'],
  clerk: ['Filing, filing, filing. Someone has to.', 'The paperwork never ends.', 'Forms in triplicate, as always.'],
  factory: ['Machines hum all day. You get used to it.', 'Shift\'s long, but the pay is fair.', 'Don\'t ask what we make. I\'m not sure myself.'],
  doctor: ['Everyone round here is remarkably healthy.', 'If you feel faint, come and see me.', 'Eat your greens, Sam.'],
  guard: ['Keep to the roads, Sam. Away from the edges.', 'All quiet. It\'s always all quiet.', 'Nothing to report. Nothing ever to report.'],
  engineer: ['Power\'s steady. It\'s always steady.', 'Don\'t touch the panels, Sam.', 'Lovely bit of kit, this.'],
};
export const NIGHT_LINES = ['Shouldn\'t you be in bed?', 'Late night, Sam. Streetlights make everything look like a stage set.', 'Can\'t sleep either, eh?'];
export const HUNGRY_LINES = ['I\'m absolutely famished.', 'Is there any food at the Stockyard? My stomach\'s growling.', 'Haven\'t eaten since this morning, Sam.', 'Could murder a bacon sandwich.'];
export const PARTNER_LINES = ['{p} and I are thinking of making things official.', 'Have you seen {p}? Best thing that ever happened to me.', '{p} says I work too hard. They might be right.'];
export const CHILD_LINES = ['Are you the builder? Can I help?', 'I\'m going to be a lumberjack when I grow up!', 'Tag! You\'re it. Oh... you\'re too slow.', 'Mum says I\'m not allowed near the building site.'];
export const ELDER_LINES = ['In my day this was all trees.', 'Knees aren\'t what they were, Sam.', 'I\'ve seen a lot in my time. Mostly the same Tuesday.'];

/** Slip lines: small oddities that grow as the story advances. Deliberately mundane at first. */
export const SLIPS = [
  [],
  [
    'Funny thing, I can never remember what\'s past the east road.',
    'Lovely weather. Same as yesterday, mind. And the day before.',
    'I\'ve lived here all my life. Well — since I arrived, anyway.',
    'Don\'t know why, but I always feel like someone\'s watching the bus stop.',
  ],
  [
    'Between us, the sun\'s always in exactly the right place.',
    'Ever notice nobody round here ever gets a cold?',
    'My contract — I mean, my tenancy — says I\'m not to talk about the weather.',
    'The tide\'s always the same at six. Odd, that.',
  ],
  [
    'You ever look up at night and feel the sky\'s a bit... close?',
    'They don\'t like anyone going near the Lift at night. Take my word.',
    'Strange thing: the Lift never seems to go back up with anyone in it.',
  ],
  [
    'Go at night, when the Lift crew change over. I never said that.',
    'Take care of yourself, Sam. You\'ve been good to us.',
  ],
];

import { BUILDINGS } from './buildings.js';
const step = (text, done, target, need) => ({ text, done, target, need });
/** "Residents 12/15 · Quarry ✓ · Farm ✗": how far along a step is (need = { pop, b: [building ids] }). */
export function stepProgress(g, st) {
  const n = st.need; if (!n) return ''; const out = [];
  if (n.pop) out.push(`Residents ${Math.min(n.pop, g.population.count())}/${n.pop}`);
  for (const id of n.b || []) { const done = g.buildings.count(id) > 0, site = !done && g.buildings.list.some((b) => b.id === id && b.state === 'site'); out.push(`${(BUILDINGS[id] || { name: id }).name} ${done ? '✓' : site ? '🏗️' : '✗'}`); }
  return out.join(' · ');
}
/** A step that's only a way of getting somewhere ("click Roads", "walk to the rack"): it counts as done once a real step after it is. */
const soft = (text, done, target, need) => ({ text, done, target, need, soft: true });
/**
 * A goal: steps one at a time. stepDone(g, i): done itself, or a soft step with a real step after it done (so nobody
 * is stuck on "click Roads" after drawing the path another way). The goal is done when every step is.
 */
const obj = (id, title, steps, extra = {}) => {
  const o = { id, title, steps, text: steps.map((x) => x.text).join(' '), ...extra };
  o.state = (g) => { const now = performance.now(); if (o._s && now - o._t < 80) return o._s; const d = steps.map((x) => !!x.done(g)); o._t = now; return (o._s = d.map((v, i) => v || (!!steps[i].soft && d.some((w, j) => j > i && w && !steps[j].soft)))); };   // (worked out once a frame)
  o.current = (g) => o.state(g).indexOf(false);
  o.done = (g) => o.current(g) < 0;
  o.target = (g) => { const s = steps[o.current(g)]; return s && s.target ? s.target(g) : null; };
  return o;
};
const hasB = (g, id, state) => g.buildings.list.some((b) => b.id === id && (!state || b.state === state));
const nearestTree = (g) => { let best = null, bd = 1e9; for (const t of g.terrain.trees) { if (!t.alive) continue; const d = Math.hypot(t.x - g.player.x, t.z - g.player.z); if (d < bd) { bd = d; best = t; } } return best && { x: best.x, z: best.z }; };
const siteOf = (g, id) => { const b = g.buildings.list.find((q) => q.id === id && q.state === 'site'); return b && { x: b.cx, z: b.cz }; };
const siteFull = (g, id) => g.buildings.list.some((b) => b.id === id && (b.state === 'done' || (b.state === 'site' && Object.keys(b.need).every((m) => (b.have[m] || 0) >= b.need[m]))));
const haulTarget = (g, id) => (g.player.invTotal() >= 4 ? siteOf(g, id) : (nearestTree(g)));
const nearestPlan = (g) => { let best = null, bd = 1e9; for (const p of g.roadPlans.plans.values()) { const d = Math.hypot(p.cx - g.player.x, p.cz - g.player.z); if (d < bd) { bd = d; best = p; } } return best && { x: best.cx, z: best.cz }; };
const rackTarget = (g) => { const u = g.tools.untaken[0]; return u ? { x: u.x, z: u.z } : null; };
const paths = (g) => g.roadPlans.count + (g.flags.pathsBuilt || 0);
const liftFront = (g) => ({ x: g.lift.doorOut.x, z: g.lift.doorOut.z + 6 });
const near = (g, p, r) => !!p && Math.hypot(p.x - g.player.x, p.z - g.player.z) < r && g.mode === 'sim';
const carrying = (g, m) => g.player.inv[m] || 0;
const permitted = (g, id) => ['pending', 'approved'].includes(g.economy.permits[id]) || g.buildings.count(id, false) > 0;
const postboxT = (g) => { const b = g.mail.box; return b && { x: b.cx, z: b.cz }; };
const nearestSiteT = (g) => nearestSite(g);

/** The order before the objectives were rewritten (old saves store a position in this list). */
export const OLD_OBJECTIVES = ['plan', 'tools', 'dig', 'yard', 'hut', 'eat', 'post', 'feed', 'settle', 'yard2', 'hamlet', 'village', 'town', 'city', 'landmark'];
export const OBJECTIVES = [
  obj('plan', '1. Plan your camp', [
    soft('Click Roads on the toolbar at the bottom.', (g) => g.god.tool.id === 'road'),
    step('Drag from the Supply Lift to draw a dirt path.', (g) => paths(g) >= 1, liftFront),
    step('Make the path three squares long.', (g) => paths(g) >= 3, liftFront),
    soft('Click Civic on the toolbar.', (g) => g.god.tool.id === 'build' && g.ui.buildTab === 'Civic'),
    step('Pick the Stockyard card, then click beside your path to place it.', (g) => hasB(g, 'stockyard')),
    soft('Click Homes on the toolbar.', (g) => g.god.tool.id === 'build' && g.ui.buildTab === 'Homes'),
    step('Pick the Log Cabin card and place it beside the path. It will be Sam\'s home.', (g) => hasB(g, 'shack') || hasB(g, 'hut')),
  ]),
  obj('tools', '2. Become Sam', [
    step('Press TAB to step into Sam\'s shoes.', (g) => g.flags.sawSim),
    soft('Walk to the Tool Rack (the yellow star on your map).', (g) => near(g, g.tools, 4), rackTarget),
    step('Press E to pick up the Axe.', (g) => g.player.tools.has('axe'), rackTarget),
    step('Pick up the Hammer.', (g) => g.player.tools.has('hammer'), rackTarget),
    step('Pick up the Shovel.', (g) => g.player.tools.has('shovel'), rackTarget),
  ]),
  obj('dig', '3. Dig the path', [
    soft('Walk to a staked path square (little flags at the corners).', (g) => near(g, nearestPlan(g), 5), nearestPlan),
    step('Tap E when the marker is in the green to dig.', (g) => (g.flags.pathsBuilt || 0) >= 1, nearestPlan),
    step('Dig the rest of the path.', (g) => (g.flags.pathsBuilt || 0) >= 3 || (g.roadPlans.count === 0 && (g.flags.pathsBuilt || 0) >= 1), nearestPlan),
  ]),
  obj('yard', '4. Raise the Stockyard', [
    soft('Walk up to a tree.', (g) => near(g, nearestTree(g), 3.5), nearestTree),
    soft('Tap E in the green to chop it.', (g) => carrying(g, 'timber') >= 1, nearestTree),
    soft('Keep chopping until you carry 10 timber.', (g) => carrying(g, 'timber') >= 10, nearestTree),
    step('Take it to the Stockyard site and press E to deliver it.', (g) => siteFull(g, 'stockyard'), (g) => haulTarget(g, 'stockyard')),
    step('Build it: stand by the site and tap E in the green.', (g) => hasB(g, 'stockyard', 'done'), (g) => siteOf(g, 'stockyard')),
  ]),
  obj('hut', '5. A roof for Sam', [
    soft('Get 6 timber: chop more, or press E at the Stockyard.', (g) => carrying(g, 'timber') >= 6, (g) => (g.depot ? { x: g.depot.doorOut.x, z: g.depot.doorOut.z } : nearestTree(g))),
    step('Deliver it to the Log Cabin site (press E there).', (g) => siteFull(g, 'shack') || siteFull(g, 'hut'), (g) => siteOf(g, 'shack') || siteOf(g, 'hut')),
    step('Build the Log Cabin: tap E in the green.', (g) => hasB(g, 'shack', 'done') || hasB(g, 'hut', 'done'), (g) => siteOf(g, 'shack') || siteOf(g, 'hut')),
  ]),
  obj('eat', '6. Eat something', [
    step('Pick up the Basket from the Tool Rack.', (g) => g.player.tools.has('basket'), rackTarget),
    soft('Find a berry bush and tap E to pick berries.', (g) => carrying(g, 'food') >= 1),
    step('Press Q to eat.', (g) => (g.flags.ate || 0) >= 1),
  ]),
  obj('post', '7. A postbox for letters', [
    soft('Press TAB for the planning view.', (g) => g.mode === 'god'),
    step('Place a Postbox (Civic on the toolbar).', (g) => hasB(g, 'postbox'), (g) => siteOf(g, 'postbox')),
    step('Build the Postbox. It only needs 2 timber.', (g) => hasB(g, 'postbox', 'done'), (g) => siteOf(g, 'postbox') || nearestTree(g)),
    step('Press E at the red Postbox to read your post.', (g) => g.flags.postRead, (g) => { const b = g.mail.box; return b && { x: b.cx, z: b.cz }; }),
  ]),
  obj('feed', '8. Feed the camp', [
    step('Place a Campfire (Parks on the toolbar).', (g) => hasB(g, 'campfire'), null, { b: ['campfire'] }),
    step('Place a Forager\'s Hut (Food on the toolbar). The forager brings food to the Stockyard.', (g) => hasB(g, 'forager'), null, { b: ['forager'] }),
    step('Build them both.', (g) => g.buildings.count('campfire') && g.buildings.count('forager'), (g) => siteOf(g, 'campfire') || siteOf(g, 'forager'), { b: ['campfire', 'forager'] }),
  ]),
  obj('settle', '9. Welcome settlers', [
    step('Build another home: settlers need a bed (a Log Cabin or a Wooden Hut).', (g) => g.buildings.list.filter((b) => b.state === 'done' && b.def.cat === 'res').length >= 2, nearestSiteT),
    step('Wait for 3 residents. They come when there\'s a free bed and 3 food in the Stockyard.', (g) => g.population.count() >= 3, null, { pop: 3 }),
    step('Reach 6 residents.', (g) => g.population.count() >= 6, nearestSiteT, { pop: 6 }),
    step('Sleep a night in Sam\'s bed (E on the bed, after 20:00).', (g) => g.flags.slept),
  ]),
  obj('yard2', '10. Builders and lumber', [
    soft('Press E at the Postbox and open Permit forms.', (g) => permitted(g, 'lumbercamp') || permitted(g, 'contractor'), postboxT),
    step('Post a permit form for a Lumber Camp.', (g) => permitted(g, 'lumbercamp'), postboxT),
    step('Post a permit form for a Builders\' Yard.', (g) => permitted(g, 'contractor'), postboxT),
    step('Build the Lumber Camp.', (g) => g.buildings.count('lumbercamp'), (g) => siteOf(g, 'lumbercamp') || nearestSite(g), { b: ['lumbercamp'] }),
    step('Build the Builders\' Yard. Its builders then do the building for you.', (g) => g.buildings.count('contractor'), (g) => siteOf(g, 'contractor') || nearestSite(g), { b: ['contractor'] }),
  ]),
  obj('safe', '11. Look after the camp', [
    step('Build a Well. If anything catches fire, neighbours fetch water from it.', (g) => hasB(g, 'well', 'done'), (g) => siteOf(g, 'well') || nearestSite(g), { b: ['well'] }),
    step('Build a Doctor\'s Surgery. Anyone hurt is patched up there.', (g) => hasB(g, 'surgery', 'done') || hasB(g, 'clinic', 'done'), (g) => siteOf(g, 'surgery') || nearestSite(g)),
  ]),
  obj('hamlet', '12. Grow the hamlet', [
    step('Build a Quarry for stone.', (g) => g.buildings.count('quarry'), nearestSiteT, { b: ['quarry'] }),
    step('Build a Farm.', (g) => g.buildings.count('farm'), nearestSiteT, { b: ['farm'] }),
    step('Reach 15 residents.', (g) => g.population.count() >= 15, nearestSiteT, { pop: 15 }),
    step('Build a Carter\'s Yard: its carts take materials to the building sites.', (g) => hasB(g, 'stables', 'done'), (g) => siteOf(g, 'stables') || nearestSite(g), { b: ['stables'] }),
  ]),
  obj('village', '13. A proper village', [
    step('Build a pub: the Red Lion.', (g) => g.buildings.count('tavern'), nearestSiteT, { b: ['tavern'] }),
    step('Build a Brickworks.', (g) => g.buildings.count('brickworks'), nearestSiteT, { b: ['brickworks'] }),
    step('Build a Stone Cottage.', (g) => g.buildings.count('cottage') >= 1, nearestSiteT, { b: ['cottage'] }),
    step('Open a Newsagent: papers, sweets and the Lottery.', (g) => hasB(g, 'newsagent', 'done'), (g) => siteOf(g, 'newsagent') || nearestSite(g), { b: ['newsagent'] }),
  ]),
  obj('town', '14. Become a town', [
    step('Reach 30 residents.', (g) => g.population.count() >= 30, nearestSiteT, { pop: 30 }),
    step('Build a Town Hall.', (g) => g.buildings.count('townhall'), nearestSiteT, { b: ['townhall'] }),
    step('Build a Schoolhouse.', (g) => g.buildings.count('school'), nearestSiteT, { b: ['school'] }),
    step('Build a Police Station. A bigger town has more trouble.', (g) => hasB(g, 'police', 'done'), (g) => siteOf(g, 'police') || nearestSite(g), { b: ['police'] }),
  ]),
  obj('money', '15. Balance the books', [
    step('Build a Bank. With the Bank and the Town Hall you can set the rates and borrow.', (g) => hasB(g, 'bank', 'done') && hasB(g, 'townhall', 'done'), (g) => siteOf(g, 'bank') || nearestSite(g), { b: ['bank', 'townhall'] }),
  ]),
  obj('power', '16. Switch on the power', [
    step('Reach 40 residents.', (g) => g.population.count() >= 40, nearestSiteT, { pop: 40 }),
    step('Build a Power Plant. The electric age begins.', (g) => g.tech && g.tech.era >= 1, (g) => siteOf(g, 'power') || nearestSite(g), { b: ['power'] }),
  ]),
  obj('city', '17. Become a city', [
    step('Reach 60 residents.', (g) => g.population.count() >= 60, nearestSiteT, { pop: 60 }),
    step('Build a Glassworks.', (g) => g.buildings.count('glassworks'), nearestSiteT, { b: ['glassworks'] }),
    step('Build a Foundry.', (g) => g.buildings.count('foundry'), nearestSiteT, { b: ['foundry'] }),
    step('Build a Hospital.', (g) => g.buildings.count('clinic'), nearestSiteT, { b: ['clinic'] }),
  ]),
  obj('landmark', '18. Crown the skyline', [step('Build the Grand Hotel or Sam Tower.', (g) => g.largeCount() >= 1, nearestSiteT)]),
];function nearestSite(g) {
  const s = g.buildings.list.filter((b) => b.state === 'site'); if (!s.length) return null;
  const p = g.player; s.sort((a, b) => Math.hypot(a.cx - p.x, a.cz - p.z) - Math.hypot(b.cx - p.x, b.cz - p.z)); return { x: s[0].cx, z: s[0].cz };
}

export const INTRO = [
  ['Planning Office', 'Welcome to Sam City, Sam. There is nothing here but the Lift, the forest and a rack of tools. Everything will be ordered from this planning view and built by hand.'],
  ['Planning Office', 'Follow the objectives on the right. First, order a path and your first two buildings. Nothing happens until you do.'],
];

// ---- raids: weapons exist in this world, but only as an occasional, uneasy fact of life ----
export const RAIDER_LINES = ['Hand it over!', 'Nobody move!', 'Grab the crates!', 'Out of the way!', 'Take the lot!', 'Stay back, mate!'];
export const RAIDER_SLIPS = ['Was that loud enough for the back row?', 'Just hit your mark, yeah?', 'Do we get paid extra for the pistol?', 'We were told the stockyard was unattended...', 'Remind me, which one of us is meant to win?'];
export const ALERT_LINES = ['Get inside, quick!', 'Raiders on the beach!', 'Lock the door!', 'Keep your head down!', 'Someone fetch the guards!'];
export const ALERT_SLIPS = ['Is this today? I thought it was Thursday.', 'Right, hide. That is in the notes, isn\'t it?', 'Funny, nobody ever really gets hurt here.', 'They always land at the same beach, have you noticed?'];
export const DOWN_LINES = ['Ow...', 'Ugh, my head...', 'Not again...'];
export const RAID_CALM_LINES = ['Well. That was exciting.', 'Is it over? Is it over?', 'I need a cup of tea after that.'];

// more slips, elders, children and late-night lines (nineties.js)
import { N90 } from './nineties.js';
N90.slips.forEach((l, i) => { if (SLIPS[i]) SLIPS[i].push(...l); });
ELDER_LINES.push(...N90.elder); NIGHT_LINES.push(...N90.night); CHILD_LINES.push(...N90.child.slice(0, 6));
import { N96 } from './nineties2.js';
N96.slips.forEach((l, i) => { if (SLIPS[i]) SLIPS[i].push(...l); });
ELDER_LINES.push(...N96.elder); CHILD_LINES.push(...N96.child.slice(0, 6));
