// Building upgrades: plain data. Each step costs materials and builder work, then changes the building's def.
// Homes grow an upstairs and then get a Tudor makeover; gatherers' yards get carts so workers haul more per trip.

const GATHER_YARDS = ['forager', 'fisher', 'lumbercamp', 'quarry', 'farm', 'brickworks', 'glassworks', 'foundry'];

// `age` is the architecture age an upgrade needs (see ages.js): you can't fit steel tools before there's a foundry.
const HOME = [
  { name: 'Upstairs rooms', icon: '🪜', age: 1, desc: 'A second storey with bedrooms up a proper staircase.', mat: { timber: 8, stone: 4 }, work: 30, pop: 4,
    apply(def) { def.floors += 1; def.bedsUp = (def.bedsUp || 0) + (def.w * def.d >= 4 ? 2 : 1); def.stairs = true; } },
  { name: 'Tudor makeover', icon: '🏡', age: 1, desc: 'Black-and-white timber framing and a tiled roof. Another bed, and the family are thrilled.', mat: { timber: 10, brick: 6, glass: 2 }, work: 40, pop: 12,
    apply(def) { def.wall = 'tudor'; def.roof = 'gable'; def.roofColor = 0x7a4a37; def.bedsUp = (def.bedsUp || 0) + 1; def.homeJoy = 0.1; def.stairs = true; } },
  { name: 'Gas lamps and a bay window', icon: '🪟', age: 2, desc: 'Gas lighting, a coal range and a bay window to wave from. Cosier evenings.', mat: { brick: 6, glass: 3, steel: 1 }, work: 30, pop: 20,
    apply(def) { def.homeJoy = (def.homeJoy || 0) + 0.05; } },
  { name: 'Central heating and double glazing', icon: '🔥', age: 3, desc: 'Radiators in every room and no more ice on the inside of the windows.', mat: { steel: 3, glass: 4 }, work: 30, pop: 35,
    apply(def) { def.homeJoy = (def.homeJoy || 0) + 0.08; def.heating = true; } },
];
const TALL_HOME = [HOME[1], HOME[2], HOME[3]];
const YARD = [
  { name: 'Hand carts', icon: '🛒', age: 0, desc: 'Workers knock up hand carts and haul twice as much each trip.', mat: { timber: 8 }, work: 20, pop: 0,
    apply(def) { def.carry = 2; def.cart = 1; } },
  { name: 'Wagons and steel tools', icon: '🛞', age: 2, desc: 'Four-wheeled wagons (three times the load) and steel tools that work a quarter faster.', mat: { timber: 10, steel: 2 }, work: 35, pop: 15,
    apply(def) { def.carry = 3; def.cart = 2; def.toolSpeed = 1.25; } },
  { name: 'Steam engine', icon: '♨️', age: 2, desc: 'A little steam engine does the heavy lifting: half as fast again.', mat: { steel: 4, brick: 4 }, work: 40, pop: 25,
    apply(def) { def.toolSpeed = (def.toolSpeed || 1) * 1.3; } },
  { name: 'Motor lorry', icon: '🚚', age: 3, desc: 'A lorry hauls four times the load to the Stockyard.', mat: { steel: 6, glass: 1 }, work: 40, pop: 35,
    apply(def) { def.carry = 4; } },
];
const BUILDERS = [
  { name: 'Wheelbarrows', icon: '🛒', age: 0, desc: 'Builders haul twice as much from the Stockyard on each trip.', mat: { timber: 8 }, work: 20, pop: 0,
    apply(def) { def.haul = 8; def.cart = 1; } },
  { name: 'Steel tools and scaffolding', icon: '🔧', age: 2, desc: 'Builders work 30% faster.', mat: { timber: 6, steel: 3 }, work: 30, pop: 15,
    apply(def) { def.buildSpeed = 1.3; def.cart = 1; } },
  { name: 'Cranes and concrete mixers', icon: '🏗️', age: 3, desc: 'Builders work 60% faster than with bare hands.', mat: { steel: 8 }, work: 40, pop: 35,
    apply(def) { def.buildSpeed = 1.6; } },
];
// the cycle shop: what it sells (and what the townsfolk, and Sam, ride)
const CYCLES = [
  { name: 'Safety bicycles', icon: '🚲', age: 2, desc: 'Chain-driven bicycles with two wheels the same size. Far easier to get on.', mat: { steel: 3, timber: 2 }, work: 25, pop: 10,
    apply(def) { def.vehicle = 1; } },
  { name: 'Motorbikes', icon: '🏍️', age: 3, desc: 'Petrol motorbikes: noisy, fast and very exciting.', mat: { steel: 6, glass: 1 }, work: 35, pop: 25,
    apply(def) { def.vehicle = 2; } },
];
const STABLES = [
  { name: 'Shire horses', icon: '🐴', age: 0, desc: 'Big strong horses: the carts run faster and more of them.', mat: { timber: 6 }, work: 20, pop: 8,
    apply(def) { def.carts = 2; } },
];
const POLICE = [
  { name: 'Police bicycles', icon: '🚲', age: 2, desc: 'Officers patrol further and catch crooks faster.', mat: { steel: 2 }, work: 20, pop: 15,
    apply(def) { def.policeSpeed = 1.35; } },
  { name: 'Panda cars and radios', icon: '🚓', age: 3, desc: 'Police cars and radios: officers get anywhere in town in no time.', mat: { steel: 6, glass: 2 }, work: 35, pop: 30,
    apply(def) { def.policeSpeed = 1.9; def.policeCar = true; } },
];

// Sam Tower's last step, once the seams in the sky have shown (story.domeRevealed): a stair up to the ceiling of the sky
const TOWER = [
  { name: 'Stairway to Heaven', icon: '🪜', age: 0, desc: 'A steel stair from the roof of Sam Tower that winds up and up, past the clouds, until it touches the sky.', mat: { steel: 40, timber: 20, glass: 6 }, work: 160, pop: 0,
    need: (g) => !!(g.story && g.story.domeRevealed), apply(def) { def.stairway = true; } },
];

/** The list of upgrade steps for a building type (empty if it has none). */
export function upgradesFor(id, base) {
  if (GATHER_YARDS.includes(id)) return YARD;
  if (id === 'contractor') return BUILDERS;
  if (id === 'cycleshop') return CYCLES;
  if (id === 'stables') return STABLES;
  if (id === 'police' || id === 'watchhouse') return POLICE;
  if (id === 'skyscraper') return TOWER;
  if (base.cat === 'res' && base.floors === 1 && base.w * base.d >= 4) return HOME;   // (a one-room shack or caravan has no room for stairs)
  if (base.cat === 'res' && base.floors === 2) return TALL_HOME;
  return [];
}
