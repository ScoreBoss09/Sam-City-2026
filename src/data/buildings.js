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
  carter:      { name: 'Carter',           wage: 40, shirt: 0x8a6a3a, pants: 0x3a3020, accessory: 'waistcoat', hat: 'flat' },
  porter:      { name: 'Station Porter',   wage: 45, shirt: 0x1b2340, pants: 0x1b2340, accessory: 'waistcoat', hat: { type: 'cap', color: 0x1b2340 } },
  mechanic:    { name: 'Mechanic',         wage: 50, shirt: 0x2a4a8a, pants: 0x2a4a8a, accessory: 'overalls', hat: { type: 'cap', color: 0x2a4a8a } },
  firefighter: { name: 'Firefighter',      wage: 55, shirt: 0x2a2a2e, pants: 0x2a2a2e, accessory: 'vest', hat: 'hard' },
  entertainer: { name: 'Entertainer',      wage: 50, shirt: 0x8a2ab0, pants: 0x1a1a1a, accessory: 'waistcoat' },
  guard:       { name: 'Constable',        wage: 60, shirt: 0x24366b, pants: 0x1b2340, accessory: 'uniform', hat: 'police' },
  engineer:    { name: 'Engineer',         wage: 70, shirt: 0xd9732b, pants: 0x3a3a3a, accessory: 'overalls', hat: { type: 'beanie', color: 0xd9732b } },
  baker:       { name: 'Baker',            wage: 40, shirt: 0xf2efe6, pants: 0x8a8a8a, accessory: 'apron', hat: { type: 'beanie', color: 0xf4f4f4 } },
  cook:        { name: 'Pub Cook',         wage: 38, shirt: 0xf4f4f4, pants: 0x2d3340, accessory: 'apron', hat: { type: 'cap', color: 0xf4f4f4 } },
  fryer:       { name: 'Chip Fryer',       wage: 38, shirt: 0xf4f4f4, pants: 0x2d3340, accessory: 'apron' },
  librarian:   { name: 'Librarian',        wage: 40, shirt: 0x8a6a8a, pants: 0x3a3a4a, accessory: 'cardigan' },
  vicar:       { name: 'Vicar',            wage: 35, shirt: 0x1a1a1a, pants: 0x1a1a1a, accessory: 'coat' },
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
  shack: {
    name: 'Log Cabin', cat: 'res', w: 1, d: 1, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xc9a85a,
    mat: { timber: 6 }, work: 10, beds: 1, layout: 'shack', permit: { cost: 0, pop: 0 }, tab: 'Homes',
    blurb: 'A snug one-room log cabin for one person. The first home anyone gets.',
  },
  hut: {
    name: 'Wooden Hut', cat: 'res', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xc9a85a,
    mat: { timber: 8 }, work: 14, beds: 2, layout: 'hut', permit: { cost: 0, pop: 0 }, tab: 'Homes',
    blurb: 'A rough one-room home with straw beds. Sleeps 2.',
  },
  cabin: {
    name: 'Family Cabin', cat: 'res', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'gable', roofColor: 0x9a6a40,
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
    name: 'The Red Lion', dining: true, income: 90, joy: 0.04, cat: 'com', w: 3, d: 3, floors: 2, wall: 'tudor', roof: 'gable', roofColor: 0x7a5a44,
    mat: { timber: 18, stone: 12 }, work: 50, jobs: { publican: 2, cook: 1 }, layout: 'tavern', permit: { cost: 600, pop: 12 }, tab: 'Food',
    blurb: 'The pub. Pub grub from the kitchen, warm beer, a dartboard, a beer garden out the back and a function room upstairs for do\'s. Raises mood.',
  },
  shop: {
    name: 'General Store', shopping: true, income: 70, cat: 'com', w: 2, d: 2, floors: 1, wall: 'tudor', roof: 'gable', roofColor: 0x7a4a37,
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
    mat: { timber: 12, stone: 4 }, work: 30, jobs: { builder: 4 }, layout: 'contractor', permit: { cost: 250, pop: 3 }, tab: 'Industry',
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
    mat: { timber: 10 }, work: 16, layout: 'yard', permit: { cost: 0, pop: 0 }, tab: 'Civic',
    blurb: 'Stores gathered and delivered goods. Builders collect from here.',
  },
  campfire: {
    name: 'Campfire', joy: 0.03, cat: 'park', w: 2, d: 2, floors: 0, park: 'camp', needsRoad: false,
    mat: { timber: 4 }, work: 6, permit: { cost: 0, pop: 0 }, tab: 'Civic',
    blurb: 'Warmth, light, and a place to share a meal.',
  },
  postbox: {
    name: 'Postbox', cat: 'civic', w: 1, d: 1, floors: 0, park: 'postbox',
    mat: { timber: 2 }, work: 4, permit: { cost: 0, pop: 0 }, tab: 'Civic',
    blurb: 'Letters arrive here: reports, permit forms, replies and the odd note from a neighbour.',
  },
  well: {
    name: 'Well', cat: 'util', w: 1, d: 1, floors: 0, park: 'well', needsRoad: false,
    mat: { stone: 6, timber: 2 }, work: 8, permit: { cost: 150, pop: 6 }, tab: 'Civic',
    blurb: 'Clean water. Residents are happier with a well nearby.',
  },
  school: {
    name: 'Schoolhouse', joy: 0.02, cat: 'civic', w: 3, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x8a5040,
    mat: { timber: 10, brick: 12 }, work: 44, jobs: { teacher: 1 }, layout: 'school', permit: { cost: 1200, pop: 20 }, tab: 'Civic',
    blurb: 'Children learn here during the day.',
  },
  townhall: {
    name: 'Town Hall', income: 90, joy: 0.03, cat: 'civic', w: 3, d: 3, floors: 2, wall: 'civic', roof: 'dome', roofColor: 0x3a6ea5,
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
    mat: { brick: 12, steel: 4, glass: 2 }, work: 45, jobs: { guard: 3 }, layout: 'police', permit: { cost: 1500, pop: 15 }, tab: 'Civic',
    blurb: 'Keeps the peace. Three constables.',
  },
  office: {
    name: 'Office Block', income: 90, cat: 'com', w: 3, d: 3, floors: 3, wall: 'grey', roof: 'flatac', roofColor: 0x6b7078,
    mat: { brick: 16, steel: 6, glass: 10 }, work: 62, jobs: { clerk: 6 }, layout: 'office', permit: { cost: 4000, pop: 45 }, tab: 'Commerce',
    blurb: 'Desk jobs for six clerks.',
  },
  factory: {
    name: 'Factory', income: 100, cat: 'ind', w: 4, d: 3, floors: 1, wall: 'industrial', roof: 'factory', roofColor: 0x5b6068,
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
    name: 'Grand Hotel', income: 90, cat: 'com', w: 3, d: 3, floors: 8, wall: 'brick', roof: 'flat', roofColor: 0x6b7078, large: true,
    mat: { brick: 24, steel: 30, glass: 20 }, work: 150, jobs: { clerk: 10 }, layout: 'lobby', permit: { cost: 12000, pop: 50 }, tab: 'Commerce',
    blurb: 'A landmark of the skyline.',
  },
  skyscraper: {
    name: 'Sam Tower', income: 90, cat: 'com', w: 3, d: 3, floors: 12, wall: 'glass', roof: 'spire', roofColor: 0x4a525c, large: true,
    mat: { steel: 60, glass: 40, brick: 20 }, work: 220, jobs: { clerk: 16 }, layout: 'lobby', permit: { cost: 20000, pop: 65 }, tab: 'Commerce',
    blurb: 'The tallest building in town.',
  },
  park: {
    name: 'Pocket Park', joy: 0.05, cat: 'park', w: 2, d: 2, floors: 0, park: 'park', needsRoad: false,
    mat: { timber: 2 }, work: 8, permit: { cost: 150, pop: 6 }, tab: 'Parks', blurb: 'Trees, benches, happy residents.',
  },
  plaza: {
    name: 'Fountain Plaza', joy: 0.07, cat: 'park', w: 3, d: 3, floors: 0, park: 'plaza', needsRoad: false,
    mat: { stone: 10 }, work: 16, permit: { cost: 700, pop: 20 }, tab: 'Parks', blurb: 'A fountain and room to socialise.',
  },
  ballfield: {
    name: 'Cricket Green', joy: 0.06, cat: 'park', w: 4, d: 4, floors: 0, park: 'field', needsRoad: false,
    mat: { timber: 6 }, work: 22, permit: { cost: 1200, pop: 25 }, tab: 'Parks', blurb: 'Sunday cricket, rounders, and a man in white trousers who takes it far too seriously.',
  },

  // ----- more homes -----
  bungalow: {
    name: 'Bungalow', cat: 'res', w: 2, d: 2, floors: 1, wall: 'tan', roof: 'gable', roofColor: 0x8a4a3a,
    mat: { timber: 6, brick: 8 }, work: 30, beds: 3, layout: 'house', permit: { cost: 350, pop: 10 }, tab: 'Homes',
    blurb: 'Pebble-dashed, net curtains, a gnome. Sleeps 3. Nobody under 60 has ever chosen one.',
  },
  semi: {
    name: 'Semi-Detached', cat: 'res', w: 2, d: 2, floors: 2, wall: 'brick', roof: 'gable', roofColor: 0x7a3a2a,
    mat: { timber: 8, brick: 12, glass: 2 }, work: 44, beds: 5, layout: 'house', permit: { cost: 1100, pop: 22 }, tab: 'Homes',
    blurb: 'Half a house, one shared wall, and you can hear everything. Everything. Sleeps 5.',
  },
  flats: {
    name: 'Council Flats', cat: 'res', w: 3, d: 3, floors: 3, wall: 'grey', roof: 'flat', roofColor: 0x5b6068,
    mat: { brick: 18, stone: 8, steel: 4, glass: 4 }, work: 70, beds: 9, layout: 'apartments', permit: { cost: 2600, pop: 34 }, tab: 'Homes',
    blurb: 'Concrete, a lift that smells of wee, and a fantastic view. Sleeps 9.',
  },
  // ----- 1990s high street and estate (more to build) -----
  terrace: {
    name: 'Victorian Terrace', cat: 'res', w: 2, d: 2, floors: 2, wall: 'brick', roof: 'gable', roofColor: 0x5a3a30,
    mat: { timber: 8, brick: 14, glass: 2 }, work: 46, beds: 5, layout: 'house', permit: { cost: 1300, pop: 22 }, tab: 'Homes',
    blurb: 'Two up, two down, an outside loo nobody uses and a front step scrubbed every Monday. Sleeps 5.',
  },
  caravan: {
    name: 'Static Caravan', cat: 'res', w: 1, d: 1, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xd8d8d0,
    mat: { timber: 3, steel: 1 }, work: 10, beds: 1, layout: 'shack', permit: { cost: 120, pop: 6 }, tab: 'Homes',
    blurb: 'Bunting, a gas bottle and a tiny telly. Cheap, cheerful and rocks a bit in a gale. Sleeps 1 (cosily).',
  },
  maisonettes: {
    name: 'Maisonettes', cat: 'res', w: 3, d: 2, floors: 3, wall: 'tan', roof: 'flat', roofColor: 0x5b6068,
    mat: { brick: 16, stone: 6, glass: 4 }, work: 60, beds: 8, layout: 'apartments', permit: { cost: 2200, pop: 32 }, tab: 'Homes',
    blurb: 'Deck access, a stairwell that echoes and a roof you really shouldn\'t be on. Sleeps 8.',
  },
  curryhouse: {
    name: 'Taj Mahal Curry House', cat: 'com', w: 2, d: 2, floors: 1, wall: 'brick', roof: 'flat', roofColor: 0x7a1a2a, shopping: true, dining: true, income: 85, joy: 0.03,
    mat: { brick: 10, timber: 4, glass: 2 }, work: 32, jobs: { fryer: 2 }, layout: 'chippy', permit: { cost: 700, pop: 14 }, tab: 'Food',
    blurb: 'Friday night: six pints of lager, a lamb bhuna and a poppadom the size of a dustbin lid. People eat here.',
  },
  cafe: {
    name: 'Greasy Spoon Caf\u00e9', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xc0392b, shopping: true, dining: true, income: 50, joy: 0.02,
    mat: { timber: 6, brick: 6, glass: 2 }, work: 24, jobs: { fryer: 1 }, layout: 'chippy', permit: { cost: 300, pop: 8 }, tab: 'Food',
    blurb: 'Full English all day, tea you could stand a spoon in, and the Sun on every table. People eat here.',
  },
  supermarket: {
    name: 'Kwik Shop Supermarket', cat: 'com', w: 3, d: 3, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xd04030, shopping: true, income: 140, produce: { food: 0.5 },
    mat: { brick: 18, steel: 6, glass: 6 }, work: 60, jobs: { shopkeeper: 4 }, layout: 'shop', permit: { cost: 3000, pop: 38 }, tab: 'Commerce',
    blurb: 'Trolleys with one wonky wheel, own-brand everything and a 10p carrier bag. The roof has a view.',
  },
  arcade: {
    name: 'Amusement Arcade', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0x8a2ab0, shopping: true, income: 70, joy: 0.04,
    mat: { brick: 10, steel: 3, glass: 3 }, work: 34, jobs: { shopkeeper: 1 }, layout: 'arcade', permit: { cost: 1100, pop: 22 }, tab: 'Commerce',
    blurb: 'Tekken, Street Fighter II, a 2p pusher that never pushes and a change machine full of 10ps.',
  },
  records: {
    name: 'Our Prize Records', cat: 'com', w: 2, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2a2a3a, shopping: true, income: 60, joy: 0.02,
    mat: { brick: 10, timber: 4, glass: 3 }, work: 30, jobs: { shopkeeper: 1 }, layout: 'video', permit: { cost: 900, pop: 18 }, tab: 'Commerce',
    blurb: 'CD singles for \u00a31.99, a listening booth and an argument about Blur and Oasis every Saturday.',
  },
  bank: {
    name: 'Midshires Bank', cat: 'com', w: 2, d: 2, floors: 2, wall: 'civic', roof: 'flat', roofColor: 0x3a4a5a, income: 110,
    mat: { brick: 12, stone: 8, steel: 4, glass: 3 }, work: 48, jobs: { clerk: 2 }, layout: 'bank', interest: 0.01, permit: { cost: 2400, pop: 30 }, tab: 'Commerce',
    blurb: 'Pens on little chains, a cashpoint that eats your card and a manager who says no. Upstairs offices.',
  },
  nightclub: {
    name: 'Ritzy Nightclub', cat: 'com', w: 3, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2a1a3a, dining: true, income: 120, joy: 0.05,
    mat: { brick: 14, steel: 4, glass: 2 }, work: 44, jobs: { publican: 1, entertainer: 1 }, layout: 'nightclub', permit: { cost: 2200, pop: 36 }, tab: 'Commerce',
    blurb: 'Sticky carpets, a smoke machine, Alcopops and Vengaboys at 1am. No trainers.',
  },
  cinema: {
    name: 'Odium Cinema', cat: 'com', w: 3, d: 3, floors: 2, wall: 'civic', roof: 'flat', roofColor: 0x6a2a2a, shopping: true, income: 110, joy: 0.06,
    mat: { brick: 20, steel: 8, glass: 4 }, work: 70, jobs: { shopkeeper: 2 }, layout: 'cinema', permit: { cost: 4000, pop: 45 }, tab: 'Commerce',
    blurb: 'Showing Independence Day for the fourth month running. Pick\u2019n\u2019mix by the pound.',
  },
  garage: {
    name: 'Garage & MOT', cat: 'com', w: 2, d: 2, floors: 1, wall: 'industrial', roof: 'flat', roofColor: 0x4a4e56, income: 75,
    mat: { brick: 8, steel: 6 }, work: 34, jobs: { mechanic: 2 }, layout: 'garage', workUpper: 'hammer', permit: { cost: 1500, pop: 26 }, tab: 'Transport',
    blurb: 'Tyres, exhausts and a sharp intake of breath. "That\'ll be the big end, mate."',
  },
  firestation: {
    name: 'Fire Station', cat: 'civic', w: 3, d: 2, floors: 2, wall: 'brick', roof: 'flat', roofColor: 0xb02a20, joy: 0.02,
    mat: { brick: 16, steel: 6, glass: 2 }, work: 52, jobs: { firefighter: 3 }, layout: 'firestation', permit: { cost: 600, pop: 6 }, tab: 'Civic',
    blurb: 'A shiny red engine, a pole nobody is allowed to slide down, and a charity calendar every Christmas.',
  },
  leisure: {
    name: 'Leisure Centre', cat: 'civic', w: 3, d: 3, floors: 1, wall: 'white', roof: 'flat', roofColor: 0x2a6aa8, joy: 0.06,
    mat: { brick: 18, steel: 6, glass: 6 }, work: 60, jobs: { clerk: 2 }, layout: 'leisure', heals: true, permit: { cost: 3500, pop: 40 }, tab: 'Civic',
    blurb: 'A pool that smells of chlorine and verrucas, squash courts and step aerobics in shiny leotards.',
  },
  secondary: {
    name: 'Comprehensive School', cat: 'civic', w: 3, d: 3, floors: 2, wall: 'brick', roof: 'flat', roofColor: 0x5a5e66, joy: 0.02,
    mat: { brick: 20, timber: 8, glass: 4 }, work: 70, jobs: { teacher: 3 }, layout: 'school', permit: { cost: 2600, pop: 35 }, tab: 'Civic',
    blurb: 'Portakabins, a smoking shelter behind the bike sheds and a supply teacher in tears by Wednesday.',
  },
  // ----- the essentials, from the start: somewhere to pray and be buried, a doctor, a fire brigade, a lock-up -----
  chapel: {
    name: 'Chapel', cat: 'civic', w: 2, d: 2, floors: 1, wall: 'stone', roof: 'gable', roofColor: 0x4a4e56, joy: 0.03,
    mat: { stone: 8, timber: 6 }, work: 30, jobs: { vicar: 1 }, layout: 'chapel', permit: { cost: 200, pop: 3 }, tab: 'Civic',
    blurb: 'A little stone chapel: Sunday service, weddings, christenings and funerals. Build a Graveyard beside it.',
  },
  graveyard: {
    name: 'Graveyard', cat: 'park', w: 2, d: 2, floors: 0, park: 'graveyard', needsRoad: false,
    mat: { stone: 4 }, work: 8, permit: { cost: 80, pop: 3 }, tab: 'Parks',
    blurb: 'Headstones, a yew tree and a lychgate. Where the townsfolk are laid to rest (the register is kept in the church).',
  },
  surgery: {
    name: 'Doctor\'s Surgery', cat: 'civic', w: 2, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x5a3a30, heals: true,
    mat: { timber: 6, brick: 6 }, work: 30, jobs: { doctor: 1 }, layout: 'surgery', permit: { cost: 300, pop: 4 }, tab: 'Civic',
    blurb: 'A GP and a waiting room full of out-of-date magazines. Patches people up (Sam too). The Clinic comes later.',
  },
  carpark: {
    name: 'Multi-Storey Car Park', cat: 'com', w: 3, d: 3, floors: 0, wall: 'grey', roof: 'none', special_ext: 'carpark', layout: 'none', needsRoad: true,
    mat: { stone: 20, steel: 8 }, work: 50, permit: { cost: 1600, pop: 30 }, tab: 'Transport', income: 0, rent: 30,
    blurb: 'Grey, echoing, smells faintly of wee. Commuters park here instead of all along the street.',
  },
  lockup: {
    name: 'The Lock-Up', cat: 'civic', w: 1, d: 1, floors: 1, wall: 'stone', roof: 'none', special_ext: 'lockup',
    mat: { stone: 8 }, work: 24, layout: 'none', permit: { cost: 250, pop: 6 }, tab: 'Civic',
    blurb: 'A round stone tower (just like the one on the Everton badge). Drunks, vagrants and troublemakers spend the night here.',
  },
  // ----- the high street and the estate, mid-90s -----
  butcher: {
    name: 'Family Butcher', cat: 'com', w: 2, d: 2, floors: 1, wall: 'tudor', roof: 'gable', roofColor: 0x7a3a2a, shopping: true, income: 45, produce: { food: 0.4 },
    mat: { timber: 6, brick: 6 }, work: 26, jobs: { shopkeeper: 1 }, layout: 'butcher', workUpper: 'saw', permit: { cost: 300, pop: 8 }, tab: 'Food',
    blurb: 'Sawdust on the floor, a straw boater and a pencil behind the ear. "Anything else for you, love?"',
  },
  kebab: {
    name: 'Bosphorus Kebab House', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xd04030, shopping: true, dining: true, income: 70, joy: 0.02,
    mat: { brick: 8, steel: 2, glass: 2 }, work: 28, jobs: { fryer: 1 }, layout: 'kebab', workUpper: 'saw', permit: { cost: 600, pop: 16 }, tab: 'Food',
    blurb: 'Open till 3am. Large doner, chilli sauce, salad you will not eat. The real end of every night out.',
  },
  offy: {
    name: 'The Offy', cat: 'com', w: 1, d: 1, floors: 1, wall: 'brick', roof: 'flat', roofColor: 0x2a4a2a, shopping: true, income: 50,
    mat: { brick: 5, glass: 1 }, work: 14, jobs: { shopkeeper: 1 }, layout: 'kiosk', permit: { cost: 200, pop: 10 }, tab: 'Commerce',
    blurb: 'Off-licence: Hooch, 20 Embassy, a scratchcard and a bag of Space Raiders. ID? Behave.',
  },
  snooker: {
    name: 'Pot Black Snooker Club', cat: 'com', w: 3, d: 2, floors: 1, wall: 'brick', roof: 'flat', roofColor: 0x1a3a2a, income: 60, joy: 0.03, shopping: true, visitUpper: 'snookershot',
    mat: { brick: 12, timber: 8 }, work: 36, jobs: { publican: 1 }, layout: 'snooker', permit: { cost: 900, pop: 18 }, tab: 'Commerce',
    blurb: 'Green baize, smoke you could cut and a lad who thinks he\'s Ronnie O\'Sullivan. Twelve-minute maximum, my foot.',
  },
  wmc: {
    name: 'Working Men\'s Club', cat: 'com', w: 3, d: 3, floors: 1, wall: 'brick', roof: 'flat', roofColor: 0x4a3a30, dining: true, income: 70, joy: 0.04,
    mat: { brick: 16, timber: 8 }, work: 44, jobs: { publican: 1, entertainer: 1 }, layout: 'tavern', permit: { cost: 1100, pop: 22 }, tab: 'Food',
    blurb: 'Subsidised bitter, a turn on a Saturday, meat raffle at nine and a committee that takes itself very seriously.',
  },
  bingo: {
    name: 'Eyes Down Bingo Hall', cat: 'com', w: 3, d: 3, floors: 1, wall: 'civic', roof: 'flat', roofColor: 0x8a2a5a, income: 90, joy: 0.04, shopping: true, visitUpper: 'dab',
    mat: { brick: 18, steel: 4, glass: 2 }, work: 50, jobs: { entertainer: 1, clerk: 1 }, layout: 'bingo', permit: { cost: 1600, pop: 28 }, tab: 'Commerce',
    blurb: '"Two little ducks, twenty-two! Legs eleven!" Dabbers at the ready. Full house wins a microwave.',
  },
  hairdresser: {
    name: 'Curl Up & Dye', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xd86aa0, shopping: true, income: 50, joy: 0.01,
    mat: { brick: 8, glass: 2 }, work: 26, jobs: { shopkeeper: 2 }, layout: 'salon', workUpper: 'scissors', visitUpper: 'idle', permit: { cost: 500, pop: 12 }, tab: 'Commerce',
    blurb: 'The Rachel, curtains, a number two all over, or a perm for your nan. Going anywhere nice on your holidays?',
  },
  toyshop: {
    name: 'Tiny Tots Toy Shop', cat: 'com', w: 2, d: 2, floors: 1, wall: 'tan', roof: 'gable', roofColor: 0x2a6aa8, shopping: true, income: 55, joy: 0.03,
    mat: { brick: 8, timber: 4, glass: 2 }, work: 28, jobs: { shopkeeper: 1 }, layout: 'shop', permit: { cost: 700, pop: 18 }, tab: 'Commerce',
    blurb: 'Sold out of Buzz Lightyears since October. Plenty of Pogs, Polly Pockets, Micro Machines and Crazy Bones.',
  },
  poundshop: {
    name: 'Everything A Pound', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xe8c020, shopping: true, income: 60,
    mat: { brick: 8, glass: 2 }, work: 26, jobs: { shopkeeper: 1 }, layout: 'shop', permit: { cost: 600, pop: 24 }, tab: 'Commerce',
    blurb: 'Everything a pound. Except the things that are 99p. And the bucket that\'s two pound.',
  },
  tanning: {
    name: 'Tropical Tan Studio', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xf28a2a, shopping: true, income: 50,
    mat: { brick: 6, glass: 2, steel: 2 }, work: 24, jobs: { shopkeeper: 1 }, layout: 'tanning', visitUpper: 'idle', permit: { cost: 800, pop: 26 }, tab: 'Commerce',
    blurb: 'Sunbeds, goggles and a radio playing Ibiza anthems. Come out the colour of a satsuma.',
  },
  phoneshop: {
    name: 'Carphone Corner', cat: 'com', w: 2, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2a3a8a, shopping: true, income: 80,
    mat: { brick: 8, glass: 4, steel: 2 }, work: 30, jobs: { shopkeeper: 1 }, layout: 'video', visitUpper: 'brickphone', permit: { cost: 1500, pop: 32 }, tab: 'Commerce',
    blurb: 'Pagers, Nokia 2110s and a Motorola StarTAC in the window. Free connection on a twelve-month Cellnet contract.',
  },
  computers: {
    name: 'Byte Size Computers', cat: 'com', w: 2, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x5a5e66, shopping: true, income: 80, joy: 0.02,
    mat: { brick: 8, glass: 4, steel: 3 }, work: 34, jobs: { clerk: 1 }, layout: 'computers', visitUpper: 'type', permit: { cost: 1600, pop: 34 }, tab: 'Commerce',
    blurb: 'Windows 95 on a 486 DX2, Encarta on CD-ROM, a 28.8k modem and an argument about whether the Amiga is dead.',
  },
  bowling: {
    name: 'Superbowl Tenpin', cat: 'com', w: 3, d: 3, floors: 1, wall: 'white', roof: 'flat', roofColor: 0x2a2a6a, income: 100, joy: 0.05, shopping: true, visitUpper: 'bowl',
    mat: { brick: 16, timber: 10, steel: 4 }, work: 56, jobs: { clerk: 2 }, layout: 'bowling', permit: { cost: 2600, pop: 36 }, tab: 'Commerce',
    blurb: 'Ten lanes, hired shoes, bumpers for the kids and a fruit machine that took your bus fare.',
  },
  laserquest: {
    name: 'Laser Zone', cat: 'com', w: 3, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x1a1a3a, income: 80, joy: 0.05, shopping: true, visitUpper: 'aim',
    mat: { brick: 12, steel: 4 }, work: 40, jobs: { entertainer: 1 }, layout: 'laser', permit: { cost: 2000, pop: 30 }, tab: 'Commerce',
    blurb: 'Dry ice, UV paint and a vest that beeps. Every birthday party from 1994 to 1999 happened here.',
  },
  youthclub: {
    name: 'Youth Club', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x5a5e66, joy: 0.03,
    mat: { brick: 12, timber: 8 }, work: 36, jobs: { teacher: 1 }, layout: 'youthclub', permit: { cost: 700, pop: 20 }, tab: 'Civic',
    blurb: 'Table tennis, a tuck shop, a knackered pool table and Doc Martens. Keeps the kids off the streets: less vandalism.',
  },
  // ----- transport and keeping the peace -----
  stables: {
    name: "Carter's Yard", cat: 'com', w: 3, d: 2, floors: 1, wall: 'timber', roof: 'gable', roofColor: 0x6a4a2a, income: 30,
    mat: { timber: 10, stone: 2 }, work: 28, jobs: { carter: 2 }, layout: 'stables', workUpper: 'broom', permit: { cost: 250, pop: 4 }, tab: 'Transport',
    blurb: 'Horses, carts and a carter who whistles. Carters cart up to 24 loads at a time from the Stockyard to the building sites, and fetch your orders from the Lift.',
  },
  cycleshop: {
    name: 'Cycle Shop', cat: 'com', w: 2, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x5a3a30, shopping: true, income: 50, vehicle: 0,
    mat: { timber: 6, brick: 6, steel: 2 }, work: 30, jobs: { mechanic: 1 }, layout: 'cycleshop', workUpper: 'hammer', permit: { cost: 600, pop: 10 }, tab: 'Transport',
    blurb: 'Sells penny-farthings, then (upgrade) safety bicycles, then motorbikes. Townsfolk ride them about; Sam can buy one here (B to ride).',
  },
  railstation: {
    name: 'Railway Station', cat: 'util', w: 3, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x4a4e56, joy: 0.02,
    mat: { brick: 14, steel: 8, timber: 6 }, work: 50, jobs: { porter: 1 }, layout: 'station', transit: 'rail', permit: { cost: 1800, pop: 20 }, tab: 'Transport',
    blurb: 'Build two or more: a viaduct joins them and a train runs between. Sam can buy a ticket (E) and ride.',
  },
  monostation: {
    name: 'Monorail Station', cat: 'util', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0xd04030, joy: 0.03,
    mat: { steel: 12, glass: 6, brick: 4 }, work: 50, jobs: { porter: 1 }, layout: 'station', transit: 'mono', permit: { cost: 4000, pop: 45 }, tab: 'Transport',
    blurb: 'The future! Build two or more and a monorail glides between them on a concrete beam. Ride it (E).',
  },
  skylift: {
    name: 'Sky Lift Station', cat: 'util', w: 2, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2a6aa8, joy: 0.04,
    mat: { steel: 10, glass: 4 }, work: 40, jobs: { porter: 1 }, layout: 'station', transit: 'sky', permit: { cost: 3500, pop: 40 }, tab: 'Transport',
    blurb: 'Cable cars high over the rooftops between two or more stations. Brilliant views. Ride it (E).',
  },
  watchhouse: {
    name: 'Watch House', cat: 'civic', w: 2, d: 2, floors: 1, wall: 'stone', roof: 'gable', roofColor: 0x5a5e66,
    mat: { stone: 8, timber: 6 }, work: 30, jobs: { guard: 2 }, layout: 'watchhouse', permit: { cost: 250, pop: 3 }, tab: 'Civic',
    blurb: 'Night watchmen with lanterns and rattles patrol the streets, chase thieves and break up fights. A cell for the night.',
  },
  // ----- food & shops -----
  allotment: {
    name: 'Allotment', cat: 'park', w: 2, d: 2, floors: 0, park: 'allotment', needsRoad: false, produce: { food: 0.6 }, joy: 0.02,
    mat: { timber: 3 }, work: 6, permit: { cost: 60, pop: 3 }, tab: 'Food',
    blurb: 'Veg beds and a shed full of old men hiding from their wives. Grows a little food by itself.',
  },
  bakery: {
    name: 'Bakery', cat: 'com', w: 2, d: 2, floors: 1, wall: 'tudor', roof: 'gable', roofColor: 0x8a5a3a, shopping: true, produce: { food: 1.2 }, income: 40,
    mat: { timber: 8, stone: 6 }, work: 28, jobs: { baker: 2 }, layout: 'bakery', permit: { cost: 350, pop: 7 }, tab: 'Food',
    blurb: 'Bakers turn out bread, pasties and iced buns. Makes food every hour someone is working.',
  },
  chippy: {
    name: 'Chip Shop', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0x2a6aa8, shopping: true, dining: true, income: 80, joy: 0.03,
    mat: { timber: 6, brick: 8, glass: 2 }, work: 30, jobs: { fryer: 2 }, layout: 'chippy', permit: { cost: 450, pop: 10 }, tab: 'Food',
    blurb: 'Cod, chips, mushy peas, and a battered sausage of questionable origin. People eat here.',
  },
  newsagent: {
    name: 'Newsagent', cat: 'com', w: 1, d: 1, floors: 1, wall: 'brick', roof: 'flat', roofColor: 0x3a5a3a, shopping: true, income: 45,
    mat: { timber: 4, brick: 4 }, work: 14, jobs: { shopkeeper: 1 }, layout: 'kiosk', permit: { cost: 150, pop: 5 }, tab: 'Commerce',
    blurb: 'Papers, fags, penny sweets and a top shelf everybody pretends not to look at.',
  },
  launderette: {
    name: 'Launderette', cat: 'com', w: 2, d: 2, floors: 1, wall: 'white', roof: 'flat', roofColor: 0x6b7078, shopping: true, income: 60,
    mat: { brick: 10, steel: 3, glass: 2 }, work: 34, jobs: { shopkeeper: 1 }, layout: 'launderette', permit: { cost: 900, pop: 20 }, tab: 'Commerce',
    blurb: 'Rows of washing machines and one bloke in his boxers waiting for his jeans.',
  },
  video: {
    name: 'Blockbusted Video', cat: 'com', w: 2, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2a3a8a, shopping: true, income: 70, joy: 0.02,
    mat: { brick: 10, glass: 3, timber: 4 }, work: 34, jobs: { shopkeeper: 1 }, layout: 'video', permit: { cost: 1000, pop: 24 }, tab: 'Commerce',
    blurb: 'VHS rentals. Be kind, rewind. There is a curtained room at the back that nobody discusses.',
  },
  bookies: {
    name: 'Bookies', cat: 'com', w: 2, d: 2, floors: 1, wall: 'tan', roof: 'flat', roofColor: 0x2a6a3a, shopping: true, income: 120,
    mat: { brick: 10, glass: 2 }, work: 32, jobs: { clerk: 1 }, layout: 'bookies', permit: { cost: 1400, pop: 28 }, tab: 'Commerce',
    blurb: 'Little pens, big losses. Sam can have a flutter on the horses here (E).',
  },
  postoffice: {
    name: 'Post Office', cat: 'civic', w: 2, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x6a3a2a, shopping: true, income: 50,
    mat: { brick: 10, timber: 6, glass: 2 }, work: 34, jobs: { clerk: 2 }, layout: 'postoffice', permit: { cost: 800, pop: 16 }, tab: 'Commerce',
    blurb: 'Pensions, stamps and a queue. Lift orders get 20% cheaper with a Post Office in town.',
  },
  // ----- community -----
  villagehall: {
    name: 'Village Hall', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'brick', roof: 'gable', roofColor: 0x5a6a80, joy: 0.05,
    mat: { brick: 12, timber: 10 }, work: 40, jobs: { clerk: 1 }, layout: 'hall', permit: { cost: 800, pop: 14 }, tab: 'Civic',
    blurb: 'Jumble sales, aerobics, the WI. The village fête is held here once it exists.',
  },
  library: {
    name: 'Library', cat: 'civic', w: 2, d: 2, floors: 1, wall: 'stone', roof: 'gable', roofColor: 0x5a3a2a, joy: 0.02,
    mat: { stone: 12, timber: 8 }, work: 34, jobs: { librarian: 2 }, layout: 'library', permit: { cost: 700, pop: 14 }, tab: 'Civic',
    blurb: 'Books, silence and research. Librarians (and the Schoolhouse and Town Hall) push science along until, with power, computers arrive.',
  },
  harbour: {
    name: 'Harbour', cat: 'prod', w: 3, d: 2, floors: 1, wall: 'timber', roof: 'gable', roofColor: 0x6a4a3a, needsShore: true, income: 60,
    mat: { timber: 18, stone: 10 }, work: 48, jobs: { fisher: 3 }, layout: 'shed', permit: { cost: 900, pop: 12 }, tab: 'Food',
    blurb: 'Builds jetties along the west shore with boats. Fishers work from it; once the town is big, cranes and cargo follow.',
  },
  church: {
    name: "St Sam's Church", cat: 'civic', w: 3, d: 3, floors: 2, wall: 'stone', roof: 'church', roofColor: 0x4a525c, joy: 0.08,
    mat: { stone: 24, timber: 12, glass: 4 }, work: 80, jobs: { vicar: 1 }, layout: 'church', permit: { cost: 1600, pop: 20 }, tab: 'Civic',
    blurb: 'Bells, pews and a vicar who has seen things. Big mood boost for the whole village.',
  },
  billboard: {
    name: 'Billboard', cat: 'park', w: 1, d: 1, floors: 0, park: 'billboard', joy: 0, needsRoad: false,
    mat: { timber: 2, steel: 1 }, work: 6, permit: { cost: 60, pop: 8 }, tab: 'Parks',
    blurb: 'A big poster hoarding. Advertisers pay rent (a few quid a week), and the posters change every few days.', income: 0, rent: 12,
  },
  phonebox: {
    name: 'Phone Box', cat: 'park', w: 1, d: 1, floors: 0, park: 'phonebox', joy: 0.01,
    mat: { steel: 1, glass: 1, timber: 1 }, work: 6, permit: { cost: 80, pop: 4 }, tab: 'Parks',
    blurb: 'A red K6 telephone box. Smells of wee, full of cards. Sam can make a call (E).',
  },
  busstop: {
    name: 'Bus Shelter', cat: 'park', w: 1, d: 1, floors: 0, park: 'busstop', joy: 0.01,
    mat: { timber: 3, glass: 1 }, work: 6, permit: { cost: 120, pop: 8 }, tab: 'Parks',
    blurb: 'Teenagers, graffiti and a timetable that is pure fiction. Brings more visitors.',
  },
  bandstand: {
    name: 'Bandstand', cat: 'park', w: 2, d: 2, floors: 0, park: 'bandstand', needsRoad: false, joy: 0.06,
    mat: { timber: 8, stone: 4 }, work: 16, permit: { cost: 600, pop: 18 }, tab: 'Parks',
    blurb: 'A brass band plays on summer evenings. Badly. Everyone loves it.',
  },
  // Story / world pieces (cannot be built by the player)
  surveyor: {
    name: "Planning Office", cat: 'civic', w: 2, d: 2, floors: 1, wall: 'logs', roof: 'thatch', roofColor: 0xb89a4a,
    mat: { timber: 10, stone: 4 }, work: 16, layout: 'terminalhut', permit: { cost: 400, pop: 15 }, tab: 'Civic',
    blurb: 'The planning office. Its computer terminal handles permits, trade and the town report.',
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
    ['Homes', ['shack', 'caravan', 'hut', 'cabin', 'bungalow', 'cottage', 'semi', 'terrace', 'townhouse', 'maisonettes', 'flats', 'apartments']],
    ['Food', ['forager', 'allotment', 'fisher', 'bakery', 'butcher', 'farm', 'harbour', 'cafe', 'chippy', 'kebab', 'curryhouse', 'tavern', 'wmc']],
    ['Industry', ['lumbercamp', 'quarry', 'contractor', 'brickworks', 'glassworks', 'foundry', 'factory']],
    ['Transport', ['stables', 'cycleshop', 'garage', 'carpark', 'railstation', 'monostation', 'skylift']],
    ['Civic', ['stockyard', 'postbox', 'surveyor', 'villagehall', 'postoffice', 'school', 'library', 'chapel', 'church', 'townhall', 'surgery', 'clinic', 'watchhouse', 'lockup', 'police', 'firestation', 'youthclub', 'secondary', 'leisure']],
    ['Commerce', ['newsagent', 'offy', 'shop', 'hairdresser', 'toyshop', 'poundshop', 'launderette', 'video', 'records', 'arcade', 'phoneshop', 'computers', 'tanning', 'bookies', 'snooker', 'bingo', 'bank', 'supermarket', 'nightclub', 'laserquest', 'bowling', 'cinema', 'office', 'hotel', 'skyscraper']],
  ],
  park: ['campfire', 'graveyard', 'billboard', 'phonebox', 'park', 'busstop', 'bandstand', 'plaza', 'ballfield'],
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
  concrete:   { base: '#b4b2ab', line: '#8e8c86', kind: 'panels', win: '#2a3c50', frame: '#5a5e66', wins: 2 },
  ironglass:  { base: '#3a3f46', line: '#22262c', kind: 'curtain', win: '#8fb8cc', frame: '#1e2226', wins: 0 },
};
