// Story + dialogue data. Plain data so writers can edit it and Unity can load it as JSON/ScriptableObjects.

export const SCRIPT_PAGES = [
  'SCRIPT p.14 — "SAM never questions the sun. If SAM looks up for more than five seconds, cue clouds." (Cloud cue: Power Plant roof, panel C.)',
  'SCRIPT p.31 — "The east tunnel is a CLOSED UTILITY CORRIDOR. Security rotates at 02:00 and the gate stays unmanned until 04:00. Nobody tells SAM."',
  'SCRIPT p.47 — "If SAM reaches the edge of the set, trigger CONTINGENCY ZETA: sedate, return to Hospital or Town Square, resume episode."',
];

export const GREETINGS = {
  cheerful: ['Morning, Sam! Isn\'t it a lovely day?', 'Sam! Great to see you. The city is looking good.', 'Hello there! I love this town.'],
  grumpy: ['Hmph. Sam. What do you want?', 'Busy day. Make it quick.', 'The roads in this city are a disgrace. Not that I\'d leave.'],
  shy: ['Oh! H-hi Sam.', 'Um... hello. Nice weather.', 'I was just, uh, walking. Hi.'],
  busy: ['Can\'t talk long, Sam. Deadlines.', 'Hi Sam — I\'m late. As always.', 'Walk with me? No? Okay, bye!'],
};
export const ROLE_LINES = {
  builder: ['More timber at the depot would be nice.', 'Give me bricks and a plan and I\'ll give you a building.'],
  shopkeeper: ['Fresh stock every day. Same stock every day, actually.', 'Business is good. Sales figures are... remarkably steady.'],
  clerk: ['Filing, filing, filing. Somebody has to.', 'The paperwork never ends. Nobody reads it, either.'],
  factory: ['The machines hum all day. Don\'t ask what we make.', 'Shift\'s long, but the pay is fair.'],
  doctor: ['Everybody here is remarkably healthy. Suspiciously so.', 'If you feel faint, come see me.'],
  guard: ['Keep to the roads, Sam. Away from the edges.', 'Nothing to report. Nothing ever to report.'],
  engineer: ['Power is steady. Power is always steady.', 'Don\'t touch the panels, Sam.'],
};
export const NIGHT_LINES = ['Shouldn\'t you be asleep?', 'Late night, Sam. Streetlights make everything look like a set.'];

/** Slip lines: the "actors" occasionally break character. Higher tiers appear as the story advances. */
export const SLIPS = [
  [],
  [
    'Lovely weather! Same as yesterday. And the day before. Funny, that.',
    'Sorry, I lost my — what was my line? Never mind!',
    'I\'ve lived here my whole life. Since... Monday. I mean, since forever!',
    'You know, nobody can remember what\'s past the east road. Isn\'t that odd?',
  ],
  [
    'Don\'t stare at the sky when the lights come on, Sam. They... prefer you didn\'t.',
    'Someone changed the cue cards again — the, uh, menus. I meant the menus.',
    'Between us? The sun is always exactly where it should be.',
    'My contract says I can\'t discuss the... weather. Weather! Lovely weather.',
  ],
  [
    'You saw it too? The sky. I\'m not allowed to answer that.',
    'They\'re watching more closely tonight. Stay away from the tunnel. Please.',
    'My name isn\'t really what it says on my badge. Forget I said that.',
    'Every time a tower goes up, the producers get nervous. Have you noticed?',
  ],
  [
    'Go at night, when the guards rotate. I never said that. I was never here.',
    'Take care, Sam. For what it\'s worth... I liked playing your neighbour.',
  ],
];

export const OBJECTIVES = [
  { id: 'terminal', text: 'Walk to the Town Hall and use a computer terminal (E).', done: (g) => g.flags.terminalOpened, target: (g) => g.townhall && g.townhall.doorOut },
  { id: 'order', text: 'At the terminal, order Timber and Brick (Materials tab).', done: (g) => g.flags.orderPlaced },
  { id: 'permits', text: 'Request permits for a Cottage and a Builders\' Yard (Permits tab).', done: (g) => g.economy.isUnlocked('cottage') && g.economy.isUnlocked('contractor') },
  { id: 'place', text: 'Press TAB for GOD MODE. Build a road, then place a Cottage next to it.', done: (g) => g.buildings.list.some((b) => b.id === 'cottage' && b !== g.starterHome) },
  { id: 'build', text: 'Switch to Sam (TAB). Carry crates from the Depot (E) and build the site (hold E).', done: (g) => g.buildings.list.some((b) => b.id === 'cottage' && b !== g.starterHome && b.state === 'done'), target: (g) => nearestSite(g) },
  { id: 'yard', text: 'Place and finish a Builders\' Yard so builders can be hired.', done: (g) => g.buildings.count('contractor') > 0, target: (g) => nearestSite(g) },
  { id: 'grow10', text: 'Grow Sam City to 10 residents. Keep building homes.', done: (g) => g.population.count() >= 10 },
  { id: 'services', text: 'Build a General Store, Hospital and Power Plant.', done: (g) => g.buildings.count('shop') && g.buildings.count('clinic') && g.buildings.count('power'), target: (g) => nearestSite(g) },
  { id: 'grow30', text: 'Reach 30 residents.', done: (g) => g.population.count() >= 30 },
  { id: 'towers', text: 'Build two Large buildings (Grand Hotel / Sam Tower).', done: (g) => g.largeCount() >= 2, target: (g) => nearestSite(g) },
  { id: 'sky', text: 'Something is wrong with the sky. Talk to residents and collect 3 script pages.', done: (g) => g.story.clues >= 3 },
  { id: 'escape', text: 'Reach the Service Tunnel between 02:00 and 04:00, while the guards rotate.', done: (g) => g.flags.escaped, target: (g) => g.tunnel && g.tunnel.doorOut },
];
function nearestSite(g) {
  const s = g.buildings.list.filter((b) => b.state === 'site'); if (!s.length) return null;
  const p = g.player; s.sort((a, b) => Math.hypot(a.cx - p.x, a.cz - p.z) - Math.hypot(b.cx - p.x, b.cz - p.z)); return { x: s[0].cx, z: s[0].cz };
}

export const INTRO = [
  ['Planning Office', 'Welcome to Sam City, Sam. The land is empty. The city is yours to grow, from the ground up.'],
  ['Planning Office', 'Use the computer terminals in Town Hall to order materials and request permits. TAB switches to the planning view.'],
];
