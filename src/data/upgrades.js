// Building upgrades: plain data. Each step costs materials and builder work, then changes the building's def.
// Homes grow an upstairs and then get a Tudor makeover; gatherers' yards get carts so workers haul more per trip.

const GATHER_YARDS = ['forager', 'fisher', 'lumbercamp', 'quarry', 'farm', 'brickworks', 'glassworks', 'foundry'];

const HOME = [
  { name: 'Upstairs rooms', icon: '🪜', desc: 'A second storey with bedrooms up the stairs.', mat: { timber: 8, stone: 4 }, work: 30, pop: 4,
    apply(def) { def.floors += 1; def.bedsUp = (def.bedsUp || 0) + (def.w * def.d >= 4 ? 2 : 1); def.stairs = true; } },
  { name: 'Tudor makeover', icon: '🏡', desc: 'Black-and-white timber framing and a tiled roof. Another bed, and the family are thrilled.', mat: { timber: 10, brick: 6, glass: 2 }, work: 40, pop: 12,
    apply(def) { def.wall = 'tudor'; def.roof = 'gable'; def.roofColor = 0x7a4a37; def.bedsUp = (def.bedsUp || 0) + 1; def.homeJoy = 0.1; def.stairs = true; } },
];
const TALL_HOME = [HOME[1]];
const YARD = [
  { name: 'Hand carts', icon: '🛒', desc: 'Workers knock up hand carts and haul twice as much each trip.', mat: { timber: 8 }, work: 20, pop: 0,
    apply(def) { def.carry = 2; def.cart = 1; } },
  { name: 'Wagons and steel tools', icon: '🛞', desc: 'Four-wheeled wagons (three times the load) and steel tools that work a quarter faster.', mat: { timber: 10, steel: 2 }, work: 35, pop: 15,
    apply(def) { def.carry = 3; def.cart = 2; def.toolSpeed = 1.25; } },
];
const BUILDERS = [
  { name: 'Wheelbarrows', icon: '🛒', desc: 'Builders haul twice as much from the Stockyard on each trip.', mat: { timber: 8 }, work: 20, pop: 0,
    apply(def) { def.haul = 8; def.cart = 1; } },
  { name: 'Steel tools and scaffolding', icon: '🔧', desc: 'Builders work 30% faster.', mat: { timber: 6, steel: 3 }, work: 30, pop: 15,
    apply(def) { def.buildSpeed = 1.3; def.cart = 1; } },
];

/** The list of upgrade steps for a building type (empty if it has none). */
export function upgradesFor(id, base) {
  if (GATHER_YARDS.includes(id)) return YARD;
  if (id === 'contractor') return BUILDERS;
  if (base.cat === 'res' && base.floors === 1) return HOME;
  if (base.cat === 'res' && base.floors === 2) return TALL_HOME;
  return [];
}
