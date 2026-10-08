// Story + dialogue data. Plain data so writers can edit it and Unity can load it as JSON/ScriptableObjects.
// The deeper story is never announced: it surfaces only through small oddities in conversation and a few crumpled pages.

export const SCRIPT_PAGES = [
  'Running order, day 412 — "SAM walks to the Town Hall. Nobody mentions the Lift. If SAM looks up for more than five seconds, bring in some cloud."',
  'Staff notice — "The east tunnel is CLOSED, utility access only. Gate guards change over between 02:00 and 04:00. The gate is unmanned in that window. Nobody tells SAM."',
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
    'They don\'t like anyone going near the east tunnel. Take my word.',
    'Strange thing: the Lift never seems to go back up with anyone in it.',
  ],
  [
    'Go at night, when the gate guards change over. I never said that.',
    'Take care of yourself, Sam. You\'ve been good to us.',
  ],
];

const step = (text, done, target) => ({ text, done, target });
const obj = (id, title, steps, extra = {}) => ({ id, title, steps, text: steps.map((x) => x.text).join(' '), done: (g) => steps.every((x) => x.done(g)), target: (g) => { const s = steps.find((x) => !x.done(g)); return s && s.target ? s.target(g) : null; }, ...extra });
const hasB = (g, id, state) => g.buildings.list.some((b) => b.id === id && (!state || b.state === state));
const nearestTree = (g) => { let best = null, bd = 1e9; for (const t of g.terrain.trees) { if (!t.alive) continue; const d = Math.hypot(t.x - g.player.x, t.z - g.player.z); if (d < bd) { bd = d; best = t; } } return best && { x: best.x, z: best.z }; };
const siteOf = (g, id) => { const b = g.buildings.list.find((q) => q.id === id && q.state === 'site'); return b && { x: b.cx, z: b.cz }; };
const siteFull = (g, id) => g.buildings.list.some((b) => b.id === id && (b.state === 'done' || (b.state === 'site' && Object.keys(b.need).every((m) => (b.have[m] || 0) >= b.need[m]))));
const haulTarget = (g, id) => (g.player.invTotal() >= 4 ? siteOf(g, id) : (nearestTree(g)));
const nearestPlan = (g) => { let best = null, bd = 1e9; for (const p of g.roadPlans.plans.values()) { const d = Math.hypot(p.cx - g.player.x, p.cz - g.player.z); if (d < bd) { bd = d; best = p; } } return best && { x: best.cx, z: best.cz }; };
const rackTarget = (g) => { const u = g.tools.untaken[0]; return u ? { x: u.x, z: u.z } : null; };

export const OBJECTIVES = [
  obj('plan', '1. Plan your camp (planning view)', [
    step('Click ROADS (left), then drag a dirt path away from the Supply Lift.', (g) => g.roadPlans.count + (g.flags.pathsBuilt || 0) >= 3, (g) => ({ x: g.lift.doorOut.x, z: g.lift.doorOut.z + 6 })),
    step('Click BUILDINGS, the Civic tab, then Stockyard. Click beside your path to order it.', (g) => hasB(g, 'stockyard')),
    step('Now order a Log Cabin for Sam (BUILDINGS, Homes) beside the path.', (g) => hasB(g, 'shack') || hasB(g, 'hut')),
  ]),
  obj('tools', '2. Become Sam and pick up tools', [
    step('Press TAB to step into Sam\'s shoes.', (g) => g.flags.sawSim),
    step('Walk to the glowing Tool Rack (yellow star on your map) and pick up the Axe with E.', (g) => g.player.tools.has('axe'), rackTarget),
    step('Pick up the Hammer.', (g) => g.player.tools.has('hammer'), rackTarget),
    step('Pick up the Shovel.', (g) => g.player.tools.has('shovel'), rackTarget),
  ]),
  obj('dig', '3. Dig the path', [
    step('Stand on a staked path tile and tap E when the marker is in the green to dig it.', (g) => (g.flags.pathsBuilt || 0) >= 3 || (g.roadPlans.count === 0 && (g.flags.pathsBuilt || 0) >= 1), nearestPlan),
  ]),
  obj('yard', '4. Raise the Stockyard', [
    step('Chop trees: tap E in the green. Then take the timber to the Stockyard site and press E to deliver (it needs 10).', (g) => siteFull(g, 'stockyard'), (g) => haulTarget(g, 'stockyard')),
    step('Build the Stockyard: stand by the site and tap E in the green.', (g) => hasB(g, 'stockyard', 'done'), (g) => siteOf(g, 'stockyard')),
  ]),
  obj('hut', '5. A roof for Sam', [
    step('Bring 6 timber to the Log Cabin site. Chop more, or press E at the Stockyard to pack what the site needs.', (g) => siteFull(g, 'shack') || siteFull(g, 'hut'), (g) => (g.player.invTotal() ? (siteOf(g, 'shack') || siteOf(g, 'hut')) : (g.depot ? { x: g.depot.doorOut.x, z: g.depot.doorOut.z } : nearestTree(g)))),
    step('Build the Log Cabin (tap E in the green). It will be Sam\'s home.', (g) => hasB(g, 'shack', 'done') || hasB(g, 'hut', 'done'), (g) => siteOf(g, 'shack') || siteOf(g, 'hut')),
  ]),
  obj('eat', '6. Eat something', [
    step('Pick up the Basket from the Tool Rack.', (g) => g.player.tools.has('basket'), rackTarget),
    step('Pick berries from a bush (tap E), then press Q to eat.', (g) => (g.flags.ate || 0) >= 1),
  ]),
  obj('post', '7. A postbox for letters', [
    step('Planning view: order a Postbox (BUILDINGS, Civic) beside the path, then build it. It only needs 2 timber.', (g) => hasB(g, 'postbox', 'done'), (g) => siteOf(g, 'postbox') || nearestTree(g)),
    step('Check the post (E at the red Postbox). Reports and permit forms come by letter.', (g) => g.flags.postRead, (g) => { const b = g.mail.box; return b && { x: b.cx, z: b.cz }; }),
  ]),
  obj('feed', '8. Feed the camp', [
    step('Order a Campfire and a Forager\'s Hut (Food tab) and build them. The forager brings food to the Stockyard.', (g) => g.buildings.count('campfire') && g.buildings.count('forager'), (g) => siteOf(g, 'campfire') || siteOf(g, 'forager')),
  ]),
  obj('settle', '9. Welcome settlers', [
    step('Settlers need beds: build more Log Cabins (1 bed) or Wooden Huts (2). They arrive when there is a free bed and 3 food in the Stockyard. Reach 6 residents.', (g) => g.population.count() >= 6),
    step('Sleep through a night in Sam\'s own bed (E, after 20:00 or when tired).', (g) => g.flags.slept),
  ]),
  obj('yard2', '10. Builders and lumber', [step('Post permit forms (Postbox) for a Lumber Camp and a Builders\' Yard, then build both.', (g) => g.buildings.count('lumbercamp') && g.buildings.count('contractor'), (g) => siteOf(g, 'lumbercamp') || siteOf(g, 'contractor'))]),
  obj('hamlet', '11. Grow the hamlet', [step('Reach 15 residents: build Log Cabins, a Quarry and a Farm.', (g) => g.population.count() >= 15 && g.buildings.count('quarry') && g.buildings.count('farm'), (g) => nearestSite(g))]),
  obj('village', '12. A proper village', [step('Raise a Tavern and a Brickworks, then begin on Stone Cottages.', (g) => g.buildings.count('tavern') && g.buildings.count('brickworks') && g.buildings.count('cottage') >= 1, (g) => nearestSite(g))]),
  obj('town', '13. Become a town', [step('Reach 30 residents with a Town Hall and a Schoolhouse.', (g) => g.population.count() >= 30 && g.buildings.count('townhall') && g.buildings.count('school'), (g) => nearestSite(g))]),
  obj('city', '14. Become a city', [step('Grow to 60 residents with a Glassworks, a Foundry and a Hospital.', (g) => g.population.count() >= 60 && g.buildings.count('glassworks') && g.buildings.count('foundry') && g.buildings.count('clinic'), (g) => nearestSite(g))]),
  obj('landmark', '15. Crown the skyline', [step('Build the Grand Hotel or Sam Tower.', (g) => g.largeCount() >= 1, (g) => nearestSite(g))]),
];
function nearestSite(g) {
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
