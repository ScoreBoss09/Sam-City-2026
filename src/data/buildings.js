// All buildings, materials and jobs are plain data -> ScriptableObjects in Unity.

export const MATERIALS = {
  timber: { name: 'Timber', price: 20, color: 0xb5834a },
  brick:  { name: 'Brick',  price: 30, color: 0xa8442f },
  steel:  { name: 'Steel',  price: 80, color: 0x7b8794 },
  glass:  { name: 'Glass',  price: 60, color: 0x7ec8e3 },
};

export const ROLES = {
  builder:    { name: 'Builder',          wage: 50, shirt: 0xe0a21b, pants: 0x3b4a63 },
  shopkeeper: { name: 'Shopkeeper',       wage: 40, shirt: 0x3f8f5a, pants: 0x4a4a4a },
  clerk:      { name: 'Clerk',            wage: 45, shirt: 0xdfe3ea, pants: 0x2d3340 },
  factory:    { name: 'Machine Operator', wage: 55, shirt: 0x5c6f8c, pants: 0x30343c },
  doctor:     { name: 'Doctor',           wage: 90, shirt: 0xf4f4f4, pants: 0x77b6c9 },
  guard:      { name: 'Officer',          wage: 60, shirt: 0x24366b, pants: 0x1b2340 },
  engineer:   { name: 'Engineer',         wage: 70, shirt: 0xd9732b, pants: 0x3a3a3a },
};

// cat: res | com | ind | civic | util | park | special
export const BUILDINGS = {
  cottage: {
    name: 'Cottage', cat: 'res', w: 2, d: 2, floors: 1, wall: 'tan', roof: 'gable', roofColor: 0xb04a37,
    mat: { timber: 6, brick: 2 }, work: 18, beds: 3, layout: 'house', permit: { cost: 200, pop: 0 },
    blurb: 'A snug starter home for up to 3 residents.',
  },
  townhouse: {
    name: 'Townhouse', cat: 'res', w: 2, d: 2, floors: 2, wall: 'brick', roof: 'gable', roofColor: 0x3e5a8c,
    mat: { timber: 8, brick: 8 }, work: 34, beds: 4, layout: 'house', permit: { cost: 1500, pop: 8 },
    blurb: 'Two-storey family home. Sleeps 4.',
  },
  apartments: {
    name: 'Apartments', cat: 'res', w: 3, d: 3, floors: 4, wall: 'brick', roof: 'flat', roofColor: 0x6b7078,
    mat: { brick: 24, steel: 8, glass: 6 }, work: 90, beds: 12, layout: 'apartments', permit: { cost: 5000, pop: 25 },
    blurb: 'Dense housing for 12 residents.',
  },
  contractor: {
    name: "Builders' Yard", cat: 'civic', w: 3, d: 2, floors: 1, wall: 'industrial', roof: 'flat', roofColor: 0x6d737c,
    mat: { timber: 8, brick: 5 }, work: 30, jobs: { builder: 4 }, layout: 'contractor', permit: { cost: 400, pop: 0 },
    blurb: 'Hire builders so you do not have to do all the labour yourself.',
  },
  depot: {
    name: 'Supply Depot', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'industrial', roof: 'flat', roofColor: 0x5d636b,
    mat: { timber: 6, brick: 6 }, work: 26, layout: 'depot', permit: { cost: 600, pop: 5 },
    blurb: 'Delivered materials are stored here for builders to collect.',
  },
  shop: {
    name: 'General Store', cat: 'com', w: 2, d: 2, floors: 1, wall: 'tan', roof: 'flatac', roofColor: 0x74797f,
    mat: { timber: 5, brick: 4, glass: 3 }, work: 26, jobs: { shopkeeper: 2 }, layout: 'shop', permit: { cost: 1000, pop: 6 },
    blurb: 'Residents shop here. Brings in tax income.',
  },
  office: {
    name: 'Office Block', cat: 'com', w: 3, d: 3, floors: 3, wall: 'grey', roof: 'flatac', roofColor: 0x6b7078,
    mat: { brick: 14, steel: 6, glass: 10 }, work: 62, jobs: { clerk: 6 }, layout: 'office', permit: { cost: 4000, pop: 20 },
    blurb: 'Desk jobs for six clerks.',
  },
  factory: {
    name: 'Factory', cat: 'ind', w: 4, d: 3, floors: 1, wall: 'industrial', roof: 'factory', roofColor: 0x5b6068,
    mat: { brick: 18, steel: 10, timber: 6 }, work: 72, jobs: { factory: 8 }, layout: 'factory', permit: { cost: 3500, pop: 15 },
    blurb: 'Heavy industry. Eight jobs, lots of tax.',
  },
  clinic: {
    name: 'Hospital', cat: 'civic', w: 3, d: 3, floors: 2, wall: 'white', roof: 'flat', roofColor: 0xcfd5dc,
    mat: { brick: 16, steel: 6, glass: 6 }, work: 70, jobs: { doctor: 3 }, layout: 'clinic', permit: { cost: 3000, pop: 15 },
    blurb: 'Treats the sick. Sedated trespassers wake up here.',
  },
  police: {
    name: 'Police Station', cat: 'civic', w: 3, d: 2, floors: 1, wall: 'grey', roof: 'flat', roofColor: 0x2d4a8a,
    mat: { brick: 10, steel: 4, glass: 2 }, work: 45, jobs: { guard: 3 }, layout: 'police', permit: { cost: 2500, pop: 12 },
    blurb: 'Keeps order. Three officers.',
  },
  power: {
    name: 'Power Plant', cat: 'util', w: 3, d: 3, floors: 1, wall: 'industrial', roof: 'plant', roofColor: 0x5b6068,
    mat: { brick: 14, steel: 14 }, work: 70, jobs: { engineer: 3 }, layout: 'power', permit: { cost: 3000, pop: 10 },
    blurb: 'Powers the city. Unpowered cities grow slowly.',
  },
  water: {
    name: 'Water Tower', cat: 'util', w: 2, d: 2, floors: 1, wall: 'industrial', roof: 'tank', roofColor: 0x6d737c,
    mat: { steel: 8, timber: 6 }, work: 40, jobs: { engineer: 1 }, layout: 'pump', permit: { cost: 1200, pop: 6 },
    blurb: 'Clean water. Makes residents happier.',
  },
  hotel: {
    name: 'Grand Hotel', cat: 'com', w: 3, d: 3, floors: 8, wall: 'brick', roof: 'flat', roofColor: 0x6b7078, large: true,
    mat: { brick: 24, steel: 30, glass: 20 }, work: 150, jobs: { clerk: 10 }, layout: 'lobby', permit: { cost: 15000, pop: 40 },
    blurb: 'A landmark. Large buildings change things...',
  },
  skyscraper: {
    name: 'Sam Tower', cat: 'com', w: 3, d: 3, floors: 12, wall: 'glass', roof: 'spire', roofColor: 0x4a525c, large: true,
    mat: { steel: 60, glass: 40, brick: 20 }, work: 220, jobs: { clerk: 16 }, layout: 'lobby', permit: { cost: 25000, pop: 60 },
    blurb: 'The tallest thing in the city. Maybe too tall.',
  },
  park: {
    name: 'Pocket Park', cat: 'park', w: 2, d: 2, floors: 0, park: 'park', needsRoad: false,
    mat: { timber: 2 }, work: 8, permit: { cost: 300, pop: 3 }, blurb: 'Trees, benches, happy residents.',
  },
  plaza: {
    name: 'Fountain Plaza', cat: 'park', w: 3, d: 3, floors: 0, park: 'plaza', needsRoad: false,
    mat: { brick: 6 }, work: 16, permit: { cost: 900, pop: 10 }, blurb: 'A fountain and room to socialise.',
  },
  ballfield: {
    name: 'Ball Field', cat: 'park', w: 4, d: 4, floors: 0, park: 'field', needsRoad: false,
    mat: { timber: 6 }, work: 22, permit: { cost: 1500, pop: 12 }, blurb: 'Weekend baseball.',
  },
  // Story / world pieces (cannot be built by the player)
  townhall: {
    name: 'Town Hall', cat: 'civic', w: 3, d: 3, floors: 2, wall: 'civic', roof: 'dome', roofColor: 0x3a6ea5,
    mat: {}, work: 0, jobs: { clerk: 2 }, layout: 'townhall', special: true,
  },
  lift: {
    name: 'The Lift', cat: 'special', w: 4, d: 3, floors: 1, wall: 'industrial', roof: 'none', open: true, special: true,
    mat: {}, work: 0, layout: 'none',
  },
  tunnel: {
    name: 'Service Tunnel', cat: 'special', w: 3, d: 3, floors: 1, wall: 'industrial', roof: 'none', open: true, special: true,
    mat: {}, work: 0, layout: 'none',
  },
};

export const TOOL_MENUS = {
  build: ['cottage', 'townhouse', 'apartments', 'contractor', 'depot', 'shop', 'office', 'factory', 'clinic', 'police', 'hotel', 'skyscraper'],
  park: ['park', 'plaza', 'ballfield'],
  util: ['power', 'water'],
};

export const FACADES = {
  tan:        { base: '#c9a97a', line: '#b39069', kind: 'plain',  win: '#35506b', frame: '#f4ecd9', wins: 2 },
  brick:      { base: '#9c4b36', line: '#7d3b2b', kind: 'bricks', win: '#26384e', frame: '#efe6cf', wins: 2 },
  grey:       { base: '#8b9099', line: '#767b83', kind: 'plain',  win: '#24364d', frame: '#dfe3e8', wins: 2 },
  glass:      { base: '#3b6d8f', line: '#2a526e', kind: 'curtain', win: '#5aa4c9', frame: '#2a3b4a', wins: 0 },
  civic:      { base: '#d8ccb0', line: '#c3b697', kind: 'plain',  win: '#2b4260', frame: '#ffffff', wins: 2 },
  industrial: { base: '#85594a', line: '#6c473b', kind: 'corrugated', win: '#2b3a4c', frame: '#c6c9ce', wins: 1 },
  white:      { base: '#e5e9ee', line: '#cfd5dc', kind: 'plain',  win: '#3b6f9a', frame: '#ffffff', wins: 2 },
  timber:     { base: '#a8774a', line: '#8c6238', kind: 'planks', win: '#2d4660', frame: '#f1e6cc', wins: 2 },
};
