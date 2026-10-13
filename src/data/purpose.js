import { ROLES } from './buildings.js';

// What each building is FOR, in one line: shown on the build cards and by the Query tool.
const SPECIAL = {
  stockyard: 'Stores every material and the town\'s food. Builders fetch from here.', surveyor: 'Planning terminal: permits, trade and orders.',
  contractor: 'Builders\' Yard: builders dig paths and build for you.', postbox: 'Your post: accounts, permits, the paper, jobs.', campfire: 'Somewhere to eat, cook and rest.',
  well: 'Water for the neighbours; softens droughts.', water: 'Piped water: faster growth and protection from drought.', power: 'Electricity: the Electric age, tellies and motor cars.',
  school: 'Children learn here; adds research.', library: 'Research towards computers.', townhall: 'Research and civic pride.', secondary: 'Teenagers learn here; adds research.',
  clinic: 'Doctors heal the sick and the injured (Sam too).', police: 'Constables patrol, catch crooks and break up fights.', watchhouse: 'Night watchmen patrol, catch crooks and break up fights.',
  firestation: 'Firefighters rush to put out fires.', church: 'Sunday service and weddings. Cheers people up.', bandstand: 'The brass band plays in the evening.',
  bank: 'Pays 1% interest on the town funds every month.', supermarket: 'Sells food: adds to the food store while staff are in.', garage: 'Keeps the motor cars running: needed for cars on the roads.',
  stables: 'Horse-and-cart traffic, and carts fetch your Lift orders.', cycleshop: 'Townsfolk ride bikes; Sam can buy one.', railstation: 'Two or more make a railway Sam can ride.',
  monostation: 'Two or more make a monorail Sam can ride.', skylift: 'Two or more make a sky lift Sam can ride.', leisure: 'Swimming and keep-fit: happier, healthier townsfolk.',
  nightclub: 'Night life (and the odd scuffle at closing time).', cinema: 'Films: a big lift in spirits.', arcade: 'Games for the kids, joy for all.', records: 'Music for the young ones; a little joy.',
  chapel: 'Sunday service, weddings and funerals; keeps the register of births and deaths.', graveyard: 'Where the dead are buried.', billboard: 'Adverts; brings in a little rent each month.', carpark: 'Commuters park here (and pay).', surgery: 'A doctor patches people up (Sam too).', lockup: 'Holds drunks, vagrants and troublemakers overnight.',
  youthclub: 'Keeps the teenagers busy: fewer vandals.', butcher: 'Sells meat: adds a little food while staffed.', kebab: 'Late-night food (open till the small hours).',
  snooker: 'A game of snooker for the townsfolk.', bowling: 'Tenpin bowling: a big lift in spirits.', laserquest: 'Laser tag: children (and grown men) love it.', bingo: 'Eyes down: a night out for the over-sixties (and everybody else).',
  harbour: 'Jetties and boats; fish and trade.', phonebox: 'Sam can make a call (10p).', bookies: 'Sam can bet on the horses.', postoffice: 'Lift orders 20% cheaper.', villagehall: 'Where the fête is held.',
};
export function purposeOf(id, def) {
  const bits = []; if (SPECIAL[id]) bits.push(SPECIAL[id]);
  if (def.beds) bits.push(`Home for ${def.beds}.`);
  if (def.jobs) bits.push(`${Object.entries(def.jobs).map(([r, n]) => `${n} ${(ROLES[r] ? ROLES[r].name : r).toLowerCase()}${n > 1 ? 's' : ''}`).join(', ')}.`);
  if (def.produce && def.produce.food && !SPECIAL[id]) bits.push('Makes food.');
  if (def.dining && !SPECIAL[id]) bits.push('People eat and drink here.'); else if (def.shopping && !SPECIAL[id]) bits.push('People shop here.');
  if (def.income) bits.push(`Rates £${def.income}/month.`);
  if (def.joy && !SPECIAL[id]) bits.push('Cheers up the neighbourhood.');
  return bits.join(' ');
}

/** The one-line purposes, by building id (mods add to this). */
export const PURPOSE = SPECIAL;
