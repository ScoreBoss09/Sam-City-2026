// All buildings, materials and jobs are plain data -> ScriptableObjects in Unity.
// permit.pop doubles as the settlement tier gate: Camp 0, Hamlet 6, Village 15, Town 30, City 60.

export const MATERIALS = {
  timber: { name: 'Timber', price: 12, color: 0xb5834a },
  stone:  { name: 'Stone',  price: 15, color: 0x9a9a92 },
  brick:  { name: 'Brick',  price: 25, color: 0xa8442f },
  steel:  { name: 'Steel',  price: 70, color: 0x7b8794 },
  glass:  { name: 'Glass',  price: 50, color: 0x7ec8e3 },
  food:   { name: 'Food',   price: 5,  color: 0x7aa63a },
};
export const BUILD_MATS = ['timber', 'stone', 'brick', 'steel', 'glass'];
export const TIERS = [['Camp', 0], ['Hamlet', 6], ['Village', 15], ['Town', 30], ['City', 60]];
export function tierOf(pop) { let t = TIERS[0]; for (const x of TIERS) if (pop >= x[1]) t = x; return t[0]; }

export const ROLES = {
  builder:     { name: 'Builder',          wage: 50, shirt: 0xd9a441, pants: 0x3b4a63, accessory: 'vest', hat: 'hard' },
  lumberjack:  { name: 'Lumberjack',       wage: 45, shirt: 0xa83a32, pants: 0x4a3a2a, accessory: 'jumper', hat: { type: 'beanie', color: 0x5a4a32 } },
  forager:     { name: 'Forager',          wage: 35, shirt: 0x6a7a3a, pants: 0x5a4a32, accessory: 'tunic', hat: 'flat', hatF: 'bonnet' },
  fisher:      { name: 'Fisher',           wage: 40, shirt: 0xd9b34a, pants: 0x2f3d5a, accessory: 'jumper', hat: { type: 'beanie', color: 0x24366b } },
  quarryman:   { name: 'Quarryman',        wage: 55, shirt: 0x7a7068, pants: 0x3a3630, accessory: 'waistcoat', hat: 'flat' },
  farmer:      { name: 'Farmer',           wage: 40, shirt: 0xb89a5a, pants: 0x3a4a63, accessory: 'overalls', hat: 'sun' },
  brickmaker:  { name: 'Brickmaker',       wage: 50, shirt: 0xa8573a, pants: 0x4a4036, accessory: 'apron', hat: 'flat' },
  glassblower: { name: 'Glassblower',      wage: 60, shirt: 0x6a9ab8, pants: 0x2d3340, accessory: 'apron' },
  smith:       { name: 'Smith',            wage: 65, shirt: 0x44464a, pants: 0x2a2a2a, accessory: 'apron' },
  publican:    { name: 'Publican',         wage: 45, shirt: 0xe8e0d0, pants: 0x2d3340, accessory: 'waistcoat' },
  teacher:     { name: 'Teacher',          wage: 55, shirt: 0xcdbfd6, pants: 0x3a3a4a, accessory: 'cardigan' },
  shopkeeper:  { name: 'Shopkeeper',       wage: 40, shirt: 0x3f8f5a, pants: 0x4a4a4a, accessory: 'apron' },
  clerk:       { name: 'Clerk',            wage: 45, shirt: 0xdfe3ea, pants: 0x2d3340, accessory: 'tie' },
  factory:     { name: 'Machine Operator', wage: 55, shirt: 0x5c6f8c, pants: 0x30343c, accessory: 'overalls', hat: 'flat' },
  doctor:      { name: 'Doctor',           wage: 90, shirt: 0xf4f4f4, pants: 0x77b6c9, accessory: 'coat' },
  guard:       { name: 'Constable',        wage: 60, shirt: 0x24366b, pants: 0x1b2340, accessory: 'uniform', hat: 'police' },
  engineer:    { name: 'Engineer',         wage: 70, shirt: 0xd9732b, pants: 0x3a3a3a, accessory: 'overalls', hat: { type: 'beanie', color: 0xd9732b } },
};

// What gatherers do. node = resource kind they walk to; mat = what they bring back to the Stockyard.
export const GATHER = {
  lumberjack:  { node: 'tree',  mat: 'timber', per: 1, time: 1.8, cap: 6, upper: 'chop',    tool: 'axe' },
  forager:     { node: 'berry', mat: 'food',   per: 2, time: 1.4, cap: 8, upper: 'harvest', tool: null, carryProp: 'basket' },
  fisher:      { node: 'fish',  mat: 'food',   per: 2, time: 2.4, cap: 6, upper: 'fish',    tool: 'rod' },
  quarryman:   { node: 'rock',  mat: 'stone',  per: 1, time: 2.0, cap: 5, upper: 'mine',    tool: 'pick' },
  farmer:      { node: 'field', mat: 'food',   per: 2, time: 1.6, cap: 8, upper: 'harvest', tool: 'sickle', carryProp: 'basket' },
  brickmaker:  { node: 'clay',  mat: 'brick',  per: 1, time: 2.0, cap: 5, upper: 'dig',     tool: 'shovel' },
  glassblower: { node: 'sand',  mat: 'glass',  per: 1, time: 2.4, cap: 4, upper: 'dig',     tool: 'shovel' },
  smith:       { node: 'ore',   mat: 'steel',  per: 1, time: 2.4, cap: 4, upper: 'mine',    tool: 'pick' },
};

// cat: res | prod | civic | com | ind | util | park | special
export const BUILDINGS = {
  hut: {
    name: 'Wooden Hut', cat: 'res', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xc9a85a,
    mat: { timber: 8 }, work: 14, beds: 2, layout: 'hut', permit: { cost: 0, pop: 0 }, tab: 'Homes',
    blurb: 'A rough one-room home with straw beds. Sleeps 2.',
  },
  cabin: {
    name: 'Log Cabin', cat: 'res', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'gable', roofColor: 0x9a6a40,
    mat: { timber: 12, stone: 4 }, work: 24, beds: 4, layout: 'cabin', permit: { cost: 200, pop: 6 }, tab: 'Homes',
    blurb: 'Sturdy cabin with a hearth. Sleeps 4.',
  },
  cottage: {
    name: 'Stone Cottage', cat: 'res', w: 2, d: 2, floors: 1, wall: 'stone', roof: 'gable', roofColor: 0x9a4a37,
    mat: { timber: 6, stone: 10 }, work: 30, beds: 4, layout: 'house', permit: { cost: 500, pop: 15 }, tab: 'Homes',
    blurb: 'A proper English cottage. Sleeps 4.',
  },
  townhouse: {
    name: 'Brick Townhouse', cat: 'res', w: 2, d: 2, floors: 2, wall: 'brick', roof: 'gable', roofColor: 0x5a6a80,
    mat: { timber: 8, brick: 10 }, work: 40, beds: 5, layout: 'house', permit: { cost: 1500, pop: 30 }, tab: 'Homes',
    blurb: 'Two-storey family home. Sleeps 5.',
  },
  apartments: {
    name: 'Apartments', cat: 'res', w: 3, d: 3, floors: 4, wall: 'brick', roof: 'flat', roofColor: 0x6b7078,
    mat: { brick: 26, steel: 8, glass: 8, timber: 6 }, work: 90, beds: 12, layout: 'apartments', permit: { cost: 5000, pop: 45 }, tab: 'Homes',
    blurb: 'Dense housing for 12 residents.',
  },

  forager: {
    name: "Forager's Hut", cat: 'prod', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xb89a4a,
    mat: { timber: 6 }, work: 12, jobs: { forager: 2 }, layout: 'shed', permit: { cost: 0, pop: 0 }, tab: 'Food',
    blurb: 'Foragers pick wild berries and bring food to the Stockyard.',
  },
  fisher: {
    name: "Fisher's Hut", cat: 'prod', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xb89a4a, needsShore: true,
    mat: { timber: 8 }, work: 16, jobs: { fisher: 2 }, layout: 'shed', permit: { cost: 80, pop: 3 }, tab: 'Food',
    blurb: 'Must be built on the shore. Fishers catch food from the sea.',
  },
  farm: {
    name: 'Farm', cat: 'prod', w: 4, d: 3, floors: 1, wall: 'timber', roof: 'gable', roofColor: 0x7a3a2a, special_ext: 'farm',
    mat: { timber: 14, stone: 2 }, work: 40, jobs: { farmer: 3 }, layout: 'shed', permit: { cost: 300, pop: 8 }, tab: 'Food',
    blurb: 'Fields of crops: the most reliable food supply.',
  },
  tavern: {
    name: 'Tavern', cat: 'com', w: 3, d: 3, floors: 2, wall: 'tudor', roof: 'gable', roofColor: 0x7a5a44,
    mat: { timber: 18, stone: 12 }, work: 50, jobs: { publican: 2 }, layout: 'tavern', permit: { cost: 600, pop: 12 }, tab: 'Food',
    blurb: 'Hot meals, a warm fire and good company. Raises mood.',
  },
  shop: {
    name: 'General Store', cat: 'com', w: 2, d: 2, floors: 1, wall: 'tudor', roof: 'gable', roofColor: 0x7a4a37,
    mat: { timber: 8, brick: 6, stone: 2 }, work: 28, jobs: { shopkeeper: 2 }, layout: 'shop', permit: { cost: 900, pop: 15 }, tab: 'Commerce',
    blurb: 'Residents shop here. Brings in tax income.',
  },

  lumbercamp: {
    name: 'Lumber Camp', cat: 'prod', w: 3, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xb89a4a,
    mat: { timber: 10 }, work: 18, jobs: { lumberjack: 3 }, layout: 'shed', permit: { cost: 80, pop: 0 }, tab: 'Industry',
    blurb: 'Lumberjacks fell trees in the forest and bring timber back.',
  },
  quarry: {
    name: 'Quarry', cat: 'prod', w: 3, d: 2, floors: 1, wall: 'stone', roof: 'flat', roofColor: 0x6d6a64,
    mat: { timber: 10 }, work: 22, jobs: { quarryman: 3 }, layout: 'shed', permit: { cost: 200, pop: 6 }, tab: 'Industry',
    blurb: 'Quarrymen break rocks into building stone.',
  },
  contractor: {
    name: "Builders' Yard", cat: 'civic', w: 3, d: 2, floors: 1, wall: 'timber', roof: 'gable', roofColor: 0x8a6444,
    mat: { timber: 12, stone: 4 }, work: 30, jobs: { builder: 4 }, layout: 'contractor', permit: { cost: 250, pop: 5 }, tab: 'Industry',
    blurb: 'Hire builders so you do not have to do all the labour yourself.',
  },
  brickworks: {
    name: 'Brickworks', cat: 'prod', w: 3, d: 3, floors: 1, wall: 'brick', roof: 'factory', roofColor: 0x5b4a40,
    mat: { timber: 10, stone: 12 }, work: 44, jobs: { brickmaker: 3 }, layout: 'shed', permit: { cost: 500, pop: 12 }, tab: 'Industry',
    blurb: 'Digs clay and fires it into bricks.',
  },
  glassworks: {
    name: 'Glassworks', cat: 'prod', w: 3, d: 3, floors: 1, wall: 'brick', roof: 'factory', roofColor: 0x4a5a6a,
    mat: { brick: 12, stone: 6, timber: 8 }, work: 60, jobs: { glassblower: 3 }, layout: 'shed', permit: { cost: 1500, pop: 28 }, tab: 'Industry',
    blurb: 'Melts beach sand into glass.',
  },
  foundry: {
    name: 'Foundry', cat: 'prod', w: 3, d: 3, floors: 1, wall: 'industrial', roof: 'factory', roofColor: 0x4a4a4e,
    mat: { brick: 14, stone: 10, timber: 8 }, work: 66, jobs: { smith: 3 }, layout: 'shed', permit: { cost: 1800, pop: 30 }, tab: 'Industry',
    blurb: 'Smelts iron ore into steel.',
  },
  stockyard: {
    name: 'Stockyard', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'timber', roof: 'none', stores: true, open: true, special_ext: 'stockyard',
    mat: { timber: 10 }, work: 16, layout: 'yard', permit: { cost: 150, pop: 6 }, tab: 'Civic',
    blurb: 'Stores gathered and delivered goods. Builders collect from here.',
  },
  campfire: {
    name: 'Campfire', cat: 'park', w: 2, d: 2, floors: 0, park: 'camp', needsRoad: false,
    mat: { timber: 3, stone: 2 }, work: 6, permit: { cost: 0, pop: 0 }, tab: 'Civic',
    blurb: 'Warmth, light, and a place to share a meal.',
  },
  well: {
    name: 'Well', cat: 'util', w: 1, d: 1, floors: 0, park: 'well', needsRoad: false,
    mat: { stone: 6, timber: 2 }, work: 8, permit: { cost: 150, pop: 6 }, tab: 'Civic',
    blurb: 'Clean water. Residents are happier with a well nearby.',
  },
  school: {
    name: 'Schoolhouse', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x8a5040,
    mat: { timber: 10, brick: 12 }, work: 44, jobs: { teacher: 1 }, layout: 'school', permit: { cost: 1200, pop: 20 }, tab: 'Civic',
    blurb: 'Children learn here during the day.',
  },
  townhall: {
    name: 'Town Hall', cat: 'civic', w: 3, d: 3, floors: 2, wall: 'civic', roof: 'dome', roofColor: 0x3a6ea5,
    mat: { stone: 14, timber: 12, brick: 14, glass: 4 }, work: 80, jobs: { clerk: 2 }, layout: 'townhall', permit: { cost: 2000, pop: 25 }, tab: 'Civic',
    blurb: 'More planning terminals and clerks.',
  },
  clinic: {
    name: 'Hospital', cat: 'civic', w: 3, d: 3, floors: 2, wall: 'white', roof: 'flat', roofColor: 0xcfd5dc,
    mat: { brick: 16, steel: 6, glass: 6, timber: 6 }, work: 70, jobs: { doctor: 3 }, layout: 'clinic', permit: { cost: 3000, pop: 35 }, tab: 'Civic',
    blurb: 'Treats the sick and injured.',
  },
  police: {
    name: 'Police Station', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2d4a8a,
    mat: { brick: 12, steel: 4, glass: 2 }, work: 45, jobs: { guard: 3 }, layout: 'police', permit: { cost: 2500, pop: 28 }, tab: 'Civic',
    blurb: 'Keeps the peace. Three constables.',
  },
  office: {
    name: 'Office Block', cat: 'com', w: 3, d: 3, floors: 3, wall: 'grey', roof: 'flatac', roofColor: 0x6b7078,
    mat: { brick: 16, steel: 6, glass: 10 }, work: 62, jobs: { clerk: 6 }, layout: 'office', permit: { cost: 4000, pop: 45 }, tab: 'Commerce',
    blurb: 'Desk jobs for six clerks.',
  },
  factory: {
    name: 'Factory', cat: 'ind', w: 4, d: 3, floors: 1, wall: 'industrial', roof: 'factory', roofColor: 0x5b6068,
    mat: { brick: 18, steel: 10, timber: 6 }, work: 72, jobs: { factory: 8 }, layout: 'factory', permit: { cost: 3500, pop: 40 }, tab: 'Industry',
    blurb: 'Heavy industry. Eight jobs, lots of tax.',
  },
  power: {
    name: 'Power Plant', cat: 'util', w: 3, d: 3, floors: 1, wall: 'industrial', roof: 'plant', roofColor: 0x5b6068,
    mat: { brick: 14, steel: 14 }, work: 70, jobs: { engineer: 3 }, layout: 'power', permit: { cost: 3000, pop: 40 }, tab: 'Civic',
    blurb: 'Powers the town. Unpowered towns grow slowly.',
  },
  water: {
    name: 'Water Tower', cat: 'util', w: 2, d: 2, floors: 1, wall: 'industrial', roof: 'tank', roofColor: 0x6d737c,
    mat: { steel: 8, timber: 6 }, work: 40, jobs: { engineer: 1 }, layout: 'pump', permit: { cost: 1200, pop: 25 }, tab: 'Civic',
    blurb: 'Piped water for the whole town.',
  },
  hotel: {
    name: 'Grand Hotel', cat: 'com', w: 3, d: 3, floors: 8, wall: 'brick', roof: 'flat', roofColor: 0x6b7078, large: true,
    mat: { brick: 24, steel: 30, glass: 20 }, work: 150, jobs: { clerk: 10 }, layout: 'lobby', permit: { cost: 12000, pop: 50 }, tab: 'Commerce',
    blurb: 'A landmark of the skyline.',
  },
  skyscraper: {
    name: 'Sam Tower', cat: 'com', w: 3, d: 3, floors: 12, wall: 'glass', roof: 'spire', roofColor: 0x4a525c, large: true,
    mat: { steel: 60, glass: 40, brick: 20 }, work: 220, jobs: { clerk: 16 }, layout: 'lobby', permit: { cost: 20000, pop: 65 }, tab: 'Commerce',
    blurb: 'The tallest building in town.',
  },
  park: {
    name: 'Pocket Park', cat: 'park', w: 2, d: 2, floors: 0, park: 'park', needsRoad: false,
    mat: { timber: 2 }, work: 8, permit: { cost: 150, pop: 6 }, tab: 'Parks', blurb: 'Trees, benches, happy residents.',
  },
  plaza: {
    name: 'Fountain Plaza', cat: 'park', w: 3, d: 3, floors: 0, park: 'plaza', needsRoad: false,
    mat: { stone: 10 }, work: 16, permit: { cost: 700, pop: 20 }, tab: 'Parks', blurb: 'A fountain and room to socialise.',
  },
  ballfield: {
    name: 'Ball Field', cat: 'park', w: 4, d: 4, floors: 0, park: 'field', needsRoad: false,
    mat: { timber: 6 }, work: 22, permit: { cost: 1200, pop: 25 }, tab: 'Parks', blurb: 'Weekend rounders and cricket.',
  },
  // Story / world pieces (cannot be built by the player)
  surveyor: {
    name: "Surveyor's Hut", cat: 'civic', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xb89a4a,
    mat: {}, work: 0, layout: 'terminalhut', special: true,
  },
  lift: {
    name: 'Supply Lift', cat: 'special', w: 4, d: 3, floors: 1, wall: 'industrial', roof: 'none', open: true, special: true,
    mat: {}, work: 0, layout: 'none',
  },
  tunnel: {
    name: 'Service Tunnel', cat: 'special', w: 3, d: 3, floors: 1, wall: 'industrial', roof: 'none', open: true, special: true,
    mat: {}, work: 0, layout: 'none',
  },
};

export const TOOL_MENUS = {
  build: [
    ['Homes', ['hut', 'cabin', 'cottage', 'townhouse', 'apartments']],
    ['Food', ['forager', 'fisher', 'farm', 'tavern']],
    ['Industry', ['lumbercamp', 'quarry', 'contractor', 'brickworks', 'glassworks', 'foundry', 'factory']],
    ['Civic', ['stockyard', 'school', 'townhall', 'clinic', 'police']],
    ['Commerce', ['shop', 'office', 'hotel', 'skyscraper']],
  ],
  park: ['campfire', 'park', 'plaza', 'ballfield'],
  util: ['well', 'power', 'water'],
};
export const ALL_BUILDABLE = [...TOOL_MENUS.build.flatMap(([, l]) => l), ...TOOL_MENUS.park, ...TOOL_MENUS.util];

export const FACADES = {
  tan:        { base: '#c9a97a', line: '#b39069', kind: 'plain',  win: '#35506b', frame: '#f4ecd9', wins: 2 },
  brick:      { base: '#9c4b36', line: '#7d3b2b', kind: 'bricks', win: '#26384e', frame: '#efe6cf', wins: 2 },
  grey:       { base: '#8b9099', line: '#767b83', kind: 'plain',  win: '#24364d', frame: '#dfe3e8', wins: 2 },
  glass:      { base: '#3b6d8f', line: '#2a526e', kind: 'curtain', win: '#5aa4c9', frame: '#2a3b4a', wins: 0 },
  civic:      { base: '#d8ccb0', line: '#c3b697', kind: 'plain',  win: '#2b4260', frame: '#ffffff', wins: 2 },
  industrial: { base: '#85594a', line: '#6c473b', kind: 'corrugated', win: '#2b3a4c', frame: '#c6c9ce', wins: 1 },
  white:      { base: '#e5e9ee', line: '#cfd5dc', kind: 'plain',  win: '#3b6f9a', frame: '#ffffff', wins: 2 },
  timber:     { base: '#a8774a', line: '#8c6238', kind: 'planks', win: '#2d4660', frame: '#f1e6cc', wins: 2 },
  logs:       { base: '#7a5230', line: '#4a3018', kind: 'logs',   win: '#1e2a34', frame: '#3a2616', wins: 1 },
  stone:      { base: '#9a968c', line: '#6f6c64', kind: 'stones', win: '#2d4056', frame: '#ddd6c4', wins: 2 },
  tudor:      { base: '#eadfc6', line: '#3b2a1c', kind: 'tudor',  win: '#2d4056', frame: '#3b2a1c', wins: 2 },
};
