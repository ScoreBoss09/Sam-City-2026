// The architecture timeline. The town is built, and rebuilt, in the materials of its age:
//   0 Timber & Thatch   timber, thatch and rough stone
//   1 Brick & Masonry   brick, dressed stone, proper timber framing (Tudor)
//   2 Industrial        mass brick, iron and steel, big panes of glass
//   3 Electric          steel frames, reinforced concrete, electric light then power
//   4 Modern            concrete towers, glass facades, mixed modern materials
// Buildings keep their plan and use; their walls and roofs change as the age turns (one building at a time).

export const AGES = ['Timber & Thatch', 'Brick & Masonry', 'Industrial', 'Electric', 'Modern'];
export const AGE_ICON = ['🌲', '🧱', '🏭', '💡', '🏙️'];
export const AGE_NEEDS = [
  '',
  'a finished Brickworks',
  'a Foundry and a Glassworks',
  'a working Power Plant',
  'the Computer age (power + research from the School, Library and Town Hall)',
];

// what each facade becomes in each age (a building's own wall is the "intended" modern look)
const WALLS = {
  brick:      ['timber', 'brick', 'brick', 'brick', 'brick'],
  tan:        ['timber', 'tudor', 'brick', 'tan', 'tan'],
  grey:       ['stone', 'stone', 'brick', 'concrete', 'concrete'],
  civic:      ['stone', 'stone', 'civic', 'civic', 'civic'],
  white:      ['timber', 'tudor', 'brick', 'white', 'white'],
  industrial: ['timber', 'brick', 'industrial', 'industrial', 'industrial'],
  glass:      ['stone', 'brick', 'ironglass', 'concrete', 'glass'],
  tudor:      ['timber', 'tudor', 'tudor', 'tudor', 'tudor'],
};

/** The def as it looks in a given age: same footprint, storeys and roof shape, period walls and roof covering. */
export function styleDef(def, age = 4) {
  if (!def || def.special || def.park || age >= 4 && def.wall !== 'grey') return def;
  const w = WALLS[def.wall]; let wall = w ? w[Math.max(0, Math.min(4, age))] : def.wall;
  if (age >= 4 && def.wall === 'grey') wall = def.large || def.floors >= 3 ? 'concrete' : 'grey';
  const out = { ...def, wall };
  if (age === 0 && def.roof === 'gable' && def.layout !== 'church' && (def.floors || 1) <= 2) { out.roof = 'thatch'; out.roofColor = 0xc9a45a; }
  return out;
}

/** Minimum age for each building (anything not listed is available from the start). */
export const BUILD_AGE = {
  townhouse: 1, bungalow: 3, semi: 3, terrace: 2, flats: 3, apartments: 3, maisonettes: 4, caravan: 3,
  bakery: 0, chippy: 2, cafe: 2, curryhouse: 3, harbour: 1,
  brickworks: 0, glassworks: 1, foundry: 1, factory: 2, garage: 3,
  school: 1, library: 1, townhall: 1, church: 1, villagehall: 1, postoffice: 1, clinic: 1, police: 2, firestation: 0, chapel: 0, graveyard: 0, surgery: 0, lockup: 0, secondary: 3, leisure: 4,
  newsagent: 2, launderette: 3, video: 4, records: 3, arcade: 3, bookies: 2, bank: 1, supermarket: 4, nightclub: 3, cinema: 3, office: 3, hotel: 3, skyscraper: 4,
  power: 2, water: 2, phonebox: 3, busstop: 3, bandstand: 2,
  butcher: 0, hairdresser: 1, offy: 2, snooker: 2, wmc: 2, irish: 2, toyshop: 2, kebab: 3, bingo: 3, bowling: 3, youthclub: 3, laserquest: 4, poundshop: 4, tanning: 4, phoneshop: 4, computers: 4,
  cycleshop: 2, railstation: 2, monostation: 4, skylift: 4, stables: 0, watchhouse: 0, carpark: 3, billboard: 2,
};
