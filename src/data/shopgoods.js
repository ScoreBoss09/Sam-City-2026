// What Sam can buy over the counter, by building id. Plain data (mods can add to it: see docs/MODDING.md).
//   [name, price in £, effect]  effect keys: hunger (−n fills you up), energy (+n), drunk (+n, 0..1), mood (+n), inv: [material, qty], note (a line Sam thinks)
// A counter only sells while somebody is working behind it.

const PINTS = [
  ['a pint of Boddingtons', 1.7, { drunk: 0.16, note: 'The Cream of Manchester. Mostly head.' }],
  ['a pint of Carling Black Label', 1.6, { drunk: 0.16 }],
  ['a pint of Stella', 1.9, { drunk: 0.22, note: 'Reassuringly expensive.' }],
  ['a pint of Guinness', 2.0, { drunk: 0.18, hunger: -6, note: 'Good things come to those who wait. You wait. And wait.' }],
  ['a bottle of Newcastle Brown', 1.8, { drunk: 0.2, note: 'Served in a little half-pint glass, for some reason.' }],
  ['a pint of Strongbow', 1.7, { drunk: 0.18 }],
  ['a pint of mild', 1.3, { drunk: 0.12, note: 'Old Tom at the bar nods approvingly.' }],
  ['a lager shandy', 1.2, { drunk: 0.06, note: 'The barman says nothing. Loudly.' }],
  ['a Hooch', 1.8, { drunk: 0.15, note: 'Alcoholic lemonade. Whatever next.' }],
  ['a Bacardi Breezer', 2.1, { drunk: 0.14 }],
  ['a snakebite and black', 1.8, { drunk: 0.24, note: 'Purple. Lethal.' }],
  ['a Babycham', 1.5, { drunk: 0.1, note: 'In a saucer glass with a little deer on it.' }],
  ['a gin and tonic', 2.2, { drunk: 0.18 }],
  ['a whisky mac', 2.4, { drunk: 0.26, note: 'Warms you right through.' }],
  ['a Pernod and black', 2.0, { drunk: 0.2 }],
  ['a Diamond White', 1.9, { drunk: 0.26, note: 'Tastes of nothing and regret.' }],
  ['a pint of tap water', 0, { drunk: -0.15, note: 'The barman sighs.' }],
  ['a packet of pork scratchings', 0.4, { hunger: -10 }],
  ['a bag of Scampi Fries', 0.35, { hunger: -8, note: 'They smell like a harbour. Delicious.' }],
  ['a Sunday roast (beef and Yorkshire)', 4.5, { hunger: -70, mood: 0.1 }],
];

export const SHOP_GOODS = {
  tavern: PINTS, wmc: PINTS.filter((d) => !/Breezer|Hooch|Babycham/.test(d[0])), snooker: PINTS.slice(0, 8), bowling: PINTS.slice(0, 4),
  nightclub: [['a bottle of Hooch', 2.5, { drunk: 0.16 }], ['a Bacardi Breezer', 2.8, { drunk: 0.15 }], ['a Red Bull and vodka', 3.5, { drunk: 0.2, energy: 30 }], ['a bottle of Becks', 2.5, { drunk: 0.18 }], ['a bottle of water', 1.5, { drunk: -0.1 }]],
  offy: [['four cans of Stella', 4.0, { drunk: 0.4 }], ['a bottle of Thunderbird', 2.5, { drunk: 0.35, note: 'The label says "wine". Allegedly.' }], ['a bottle of Mad Dog 20/20', 2.2, { drunk: 0.35 }], ['a bottle of Blue Nun', 3.5, { drunk: 0.3 }], ['a packet of Monster Munch', 0.2, { hunger: -6 }], ['a bottle of Irn-Bru', 0.6, { energy: 10 }]],
  bakery: [['a sausage roll', 0.6, { hunger: -20 }], ['an iced finger', 0.4, { hunger: -10, mood: 0.03 }], ['a cheese and onion pasty', 0.9, { hunger: -28 }], ['a crusty loaf', 0.7, { inv: ['food', 1] }]],
  chippy: [['cod and chips', 2.5, { hunger: -50 }], ['a battered sausage', 1.2, { hunger: -25 }], ['a saveloy and chips', 1.8, { hunger: -40 }], ['chips and curry sauce', 1.1, { hunger: -30 }], ['a pickled egg', 0.3, { hunger: -6, note: 'From the big jar. Bold move.' }], ['a can of Lilt', 0.5, { energy: 6 }]],
  cafe: [['a full English', 3.2, { hunger: -60, energy: 10 }], ['a mug of builder\'s tea', 0.5, { energy: 12 }], ['a bacon butty', 1.5, { hunger: -30 }], ['beans on toast', 1.2, { hunger: -30 }]],
  kebab: [['a doner kebab with everything', 3.0, { hunger: -55, drunk: -0.05, note: 'Best thing that\'s ever happened to you.' }], ['chips and cheese', 1.5, { hunger: -30 }], ['a can of Tango', 0.5, { energy: 6, note: 'You\'ve been Tango\'d.' }]],
  curryhouse: [['a chicken tikka masala', 5.5, { hunger: -60 }], ['a lamb vindaloo', 6, { hunger: -60, note: 'You\'ll regret that in the morning.' }], ['a pint of Cobra', 2.4, { drunk: 0.18 }], ['poppadoms and the pickle tray', 1.5, { hunger: -12 }]],
  butcher: [['a pork pie', 1.0, { hunger: -25 }], ['a pound of sausages', 1.6, { inv: ['food', 2] }], ['a scotch egg', 0.6, { hunger: -15 }]],
  newsagent: [['the Daily Mirror', 0.3, { note: 'Page 3 and the football. The usual.' }], ['a Wispa', 0.25, { hunger: -5, mood: 0.02 }], ['a packet of Panini stickers', 0.2, { mood: 0.02, note: 'Swaps: Gascoigne, Gascoigne, Gascoigne.' }], ['a Lottery scratchcard', 1.0, { lotto: true }], ['a Curly Wurly', 0.15, { hunger: -4 }], ['a disposable camera', 5, { camera: true, note: 'Twenty-seven shots. Keep it for when somebody famous comes to town.' }]],
  toyshop: [['a tube of Pogs', 1.5, { mood: 0.04 }], ['a Polly Pocket', 12, { mood: 0.06, note: 'Tiny. You will lose it by teatime.' }], ['a Super Soaker', 15, { mood: 0.05 }]],
  records: [['(What\'s the Story) Morning Glory? on CD', 12, { mood: 0.06 }], ['Parklife on cassette', 9, { mood: 0.05 }], ['the new Now That\'s What I Call Music', 13, { mood: 0.05 }], ['a Wonderwall CD single', 3, { mood: 0.03 }]],
  video: [['a night\'s rental of Braveheart', 2.5, { mood: 0.05 }], ['Four Weddings and a Funeral (rental)', 2.5, { mood: 0.04 }], ['a big bag of Revels', 0.8, { hunger: -8 }]],
  poundshop: [['a pack of AA batteries', 1, {}], ['a lava lamp (sort of)', 1, { mood: 0.03 }], ['some own-brand cola', 1, { energy: 8 }]],
  supermarket: [['a weekly shop', 25, { inv: ['food', 6] }], ['a Pot Noodle', 0.6, { hunger: -25, note: 'The slag of all snacks.' }], ['a big bottle of Tizer', 0.9, { energy: 10 }]],
  icecream: [['a 99 with a flake', 0.8, { hunger: -8, mood: 0.04 }], ['a Feast', 0.6, { hunger: -8 }], ['a Screwball (with the bubblegum at the bottom)', 0.5, { hunger: -6, mood: 0.03 }], ['a Mini Milk', 0.2, { hunger: -3 }]],
  carboot: [['a Polaroid camera (works, mostly)', 4, { camera: true, note: 'Shake it like a... no, that\'s later. Keep it for when somebody famous comes to town.' }], ['a foot spa (used once)', 1.5, { mood: 0.03, note: 'It hums. It may be haunted.' }], ['a box of old videos', 0.5, { mood: 0.03, note: 'Three of them are Jaws 3.' }], ['a Soda Stream', 3, { mood: 0.05, energy: 5 }], ['a stack of Reader\'s Digests', 0.2, { note: 'Increase Your Word Power, 1987.' }], ['a Betamax player (untested)', 2, { note: 'Nobody has Betamax tapes. That\'s not the point.' }], ['a home-made jam', 0.5, { inv: ['food', 1] }]],
};
/** Anything else that sells things gets a generic counter. */
export const GENERIC_GOODS = [['a few bits and bobs', 2, { mood: 0.02 }]];
