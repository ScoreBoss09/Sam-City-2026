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

export const OBJECTIVES = [
  { id: 'terminal', text: 'Visit the Surveyor\'s Hut and read the planning terminal (E).', done: (g) => g.flags.terminalOpened, target: (g) => g.townhall && g.townhall.doorOut },
  { id: 'gather', text: 'Fell trees at the edge of the northern forest (hold E) and store 10 timber in the Stockyard.', done: (g) => (g.flags.stored || 0) >= 10, target: (g) => g.depot && g.depot.doorOut },
  { id: 'hut', text: 'Press TAB for the planning view. Place a Wooden Hut beside a road.', done: (g) => g.buildings.list.some((b) => b.id === 'hut' && b !== g.starterHome) },
  { id: 'buildhut', text: 'Back in the world (TAB): carry timber from the Stockyard to the site (E), then hold E to build.', done: (g) => g.buildings.list.filter((b) => b.id === 'hut' && b.state === 'done').length >= 2, target: (g) => nearestSite(g) },
  { id: 'feed', text: 'Everyone needs to eat. Place a Campfire and a Forager\'s Hut, and build them.', done: (g) => g.buildings.count('campfire') && g.buildings.count('forager'), target: (g) => nearestSite(g) },
  { id: 'settlers', text: 'Welcome settlers: reach 6 residents. They need beds, food and work.', done: (g) => g.population.count() >= 6 },
  { id: 'yard', text: 'Request permits at the terminal for a Lumber Camp and a Builders\' Yard, and build both.', done: (g) => g.buildings.count('lumbercamp') && g.buildings.count('contractor'), target: (g) => nearestSite(g) },
  { id: 'hamlet', text: 'Grow the hamlet to 15 residents: build Log Cabins, a Quarry and a Farm.', done: (g) => g.population.count() >= 15 && g.buildings.count('quarry') && g.buildings.count('farm'), target: (g) => nearestSite(g) },
  { id: 'village', text: 'Raise a Tavern and a Brickworks, then begin on Stone Cottages.', done: (g) => g.buildings.count('tavern') && g.buildings.count('brickworks') && g.buildings.count('cottage') >= 1, target: (g) => nearestSite(g) },
  { id: 'town', text: 'Reach 30 residents with a Town Hall and a Schoolhouse.', done: (g) => g.population.count() >= 30 && g.buildings.count('townhall') && g.buildings.count('school'), target: (g) => nearestSite(g) },
  { id: 'city', text: 'Grow to 60 residents with a Glassworks, a Foundry and a Hospital.', done: (g) => g.population.count() >= 60 && g.buildings.count('glassworks') && g.buildings.count('foundry') && g.buildings.count('clinic'), target: (g) => nearestSite(g) },
  { id: 'landmark', text: 'Crown the skyline with the Grand Hotel or Sam Tower.', done: (g) => g.largeCount() >= 1, target: (g) => nearestSite(g) },
];
function nearestSite(g) {
  const s = g.buildings.list.filter((b) => b.state === 'site'); if (!s.length) return null;
  const p = g.player; s.sort((a, b) => Math.hypot(a.cx - p.x, a.cz - p.z) - Math.hypot(b.cx - p.x, b.cz - p.z)); return { x: s[0].cx, z: s[0].cz };
}

export const INTRO = [
  ['Planning Office', 'Welcome to Sam City, Sam. It is little more than a hut, a campfire and a lot of forest. Everything here will be built by hand.'],
  ['Planning Office', 'Gather timber, feed your people, and the town will grow. Press TAB for the planning view.'],
];

// ---- raids: weapons exist in this world, but only as an occasional, uneasy fact of life ----
export const RAIDER_LINES = ['Hand it over!', 'Nobody move!', 'Grab the crates!', 'Out of the way!', 'Take the lot!', 'Stay back, mate!'];
export const RAIDER_SLIPS = ['Was that loud enough for the back row?', 'Just hit your mark, yeah?', 'Do we get paid extra for the pistol?', 'We were told the stockyard was unattended...', 'Remind me, which one of us is meant to win?'];
export const ALERT_LINES = ['Get inside, quick!', 'Raiders on the beach!', 'Lock the door!', 'Keep your head down!', 'Someone fetch the guards!'];
export const ALERT_SLIPS = ['Is this today? I thought it was Thursday.', 'Right, hide. That is in the notes, isn\'t it?', 'Funny, nobody ever really gets hurt here.', 'They always land at the same beach, have you noticed?'];
export const DOWN_LINES = ['Ow...', 'Ugh, my head...', 'Not again...'];
export const RAID_CALM_LINES = ['Well. That was exciting.', 'Is it over? Is it over?', 'I need a cup of tea after that.'];
