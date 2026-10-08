// Conversation data for talking to townsfolk. Plain data: easy to extend, and loadable as JSON in a Unity port.
// {name} = Sam's name for them, {first} = their first name, {town} = home town, {p} = partner, {a} {b} = other residents,
// {bld} = a building, {job} = old job, {hobby} = hobby, {pet} = pet, {food} = favourite food.

export const TOWNS = ['Halifax', 'Whitby', 'Bury St Edmunds', 'Kettering', 'Penzance', 'Barnsley', 'Chester', 'Ludlow', 'Grimsby', 'Bath', 'Rotherham', 'Stoke', 'Swindon', 'Lancaster',
  'Harrogate', 'Margate', 'Ipswich', 'Kendal', 'Truro', 'Doncaster', 'Shrewsbury', 'Wigan', 'Norwich', 'Exeter', 'Hull', 'Bolton', 'Scarborough', 'Cheltenham', 'Hereford',
  'Blackpool', 'Lincoln', 'Durham', 'Carlisle', 'Bedford', 'Stockport', 'Skegness', 'Taunton', 'Worthing', 'Dudley', 'Hastings', 'Salisbury', 'Wolverhampton', 'Rochdale'];
export const OLD_JOBS = ['postman', 'dinner lady', 'bus driver', 'plumber', 'milkman', 'bank clerk', 'hairdresser', 'gardener', 'school caretaker', 'taxi driver', 'butcher',
  'nurse', 'electrician', 'window cleaner', 'baker', 'bricklayer', 'librarian', 'chip shop owner', 'traffic warden', 'shop assistant', 'lollipop lady', 'mechanic',
  'tea lady at the council', 'paperboy', 'carpet fitter', 'pub landlord', 'swimming instructor', 'call centre operator', 'removals man', 'sheep shearer'];
export const HOBBIES = ['knitting', 'birdwatching', 'darts', 'gardening', 'crosswords', 'model railways', 'fishing', 'bowls', 'baking', 'brass band', 'pigeon racing',
  'jigsaws', 'rambling', 'amateur dramatics', 'stamp collecting', 'snooker', 'growing marrows', 'bell ringing', 'quizzes', 'watercolours', 'ballroom dancing', 'cricket'];
export const PETS = ['a ginger cat called Marmalade', 'a whippet called Dennis', 'two budgies', 'a tortoise who is older than me', 'a goldfish called Brian', 'a border collie called Meg',
  'a hamster that bites', 'a three-legged cat called Tripod', 'a rabbit called Sir Hopsalot', 'no pets, just a very loud kettle'];
export const FOODS = ['a proper fry-up', 'fish and chips with mushy peas', 'shepherd\'s pie', 'beans on toast', 'a Sunday roast with Yorkshire puddings', 'cheese and pickle sandwiches',
  'toad in the hole', 'a bacon butty', 'steak and kidney pie', 'scones with jam then cream', 'sticky toffee pudding', 'a cheese toastie', 'bangers and mash'];

export const GREET = {
  stranger: ['Oh, hello. You must be Sam. Everyone mentions you.', 'Hello there. I don\'t think we\'ve properly met. I\'m {first}.', 'Alright? I\'m {first}. Pleased to meet you, I\'m sure.', 'You\'re the one who built the Stockyard, aren\'t you? I\'m {first}.'],
  acquaintance: ['Hello again, Sam.', 'Alright, Sam? How\'s tricks?', 'Ah, Sam. Good to see you.', 'Evening, Sam. Or is it afternoon? I lose track.', 'Sam! Just the person.'],
  friend: ['Sam! My favourite person on the island.', 'There\'s our Sam! Brightens my day, you do.', 'Sam, love! Come here.', 'Alright, mate? Kettle\'s always on at mine.', 'My old pal Sam. What\'s new?'],
  morning: ['Morning! Sun\'s up, so am I. Just about.', 'Early bird, are we?', 'Morning, Sam. Had your cuppa yet?'],
  evening: ['Evening, Sam. Long day?', 'Nearly home time. Can\'t come soon enough.', 'Lovely evening for it.'],
  night: ['Bit late to be wandering about, isn\'t it?', 'Can\'t sleep either?', 'Shh, you\'ll wake the whole street.'],
  rain: ['Lovely weather for ducks.', 'It\'s chucking it down, Sam!', 'Typical. I left the washing out.', 'Proper British weather, this.'],
  child: ['Hiya! Are you a grown-up?', 'Hello Sam! Watch this, I can do a cartwheel. Nearly.', 'Sam! Sam! Guess what!'],
  visitor: ['Oh, excuse me, are you a local?', 'Hello! We\'re just visiting. Isn\'t it quaint?', 'Pardon me, is this the famous Sam City?'],
};
export const TRAIT_OPEN = {
  cheerful: ['', 'Ooh, ', 'Well, ', 'Ha! '],
  grumpy: ['Hmph. ', 'If you must know, ', 'Look, ', 'Well, '],
  shy: ['Um... ', 'Oh, er, ', 'Well... I suppose ', ''],
  busy: ['Quickly then: ', 'Right, ', 'In short: ', ''],
};

export const MOOD = {
  happy: ['I\'m right as rain, thanks for asking.', 'Couldn\'t be better. Honestly, I\'m chuffed to bits.', 'Can\'t complain. Well, I could, but I won\'t!', 'Living the dream, Sam. Living the dream.', 'Grand, ta. Sun on my face, food in my belly.', 'Over the moon, me.'],
  content: ['Not bad, not bad.', 'Mustn\'t grumble.', 'Fair to middling.', 'Getting by, like everyone.', 'Same as ever. Which is fine, I suppose.', 'Oh, you know. Ticking along.'],
  fedup: ['Bit fed up, if I\'m honest.', 'Had better days, Sam.', 'Don\'t ask.', 'I\'m about ready for a holiday. Not that we\'re allowed... I mean, not that I can afford one.', 'Knackered and grumpy, thanks.'],
  miserable: ['Honestly? I\'m miserable.', 'I\'m thinking of packing it all in and taking the Lift.', 'Nothing\'s going right, Sam.', 'I\'ve had it up to here.'],
};
export const REASON = {
  hungry: ['I\'m starving, though. Is there any food in the Stockyard?', 'Could murder a bacon butty right now.', 'My stomach thinks my throat\'s been cut.', 'Haven\'t had a bite since breakfast.'],
  tired: ['I\'m dead on my feet.', 'Could sleep for a week.', 'Up since the crack of dawn.'],
  homeless: ['I\'ve nowhere to sleep yet. A cabin would be lovely.', 'Kipping wherever I can. We need more homes, Sam.'],
  partner: ['{p} and I are getting on famously.', 'Have you met {p}? Best thing that ever happened to me.', '{p} says I talk too much. Rubbish.'],
  lonely: ['It\'s a bit lonely, mind. Haven\'t made many friends yet.', 'I could do with a few more friends round here.'],
  newcomer: ['Still finding my feet, mind. Only just got here.', 'Everything\'s still new to me.'],
  raid: ['Still a bit shaken after those raiders.', 'Didn\'t sleep a wink after the raid.'],
  work: ['Work keeps me busy, which is how I like it.', 'Work\'s steady.'],
  nowork: ['I could do with a job, though. Idle hands and all that.', 'Nobody\'s hiring. Build something with jobs, would you?'],
};

export const WORK = {
  baker: ['Up at four every morning. The bread won\'t bake itself.', 'Fresh loaves, iced buns, Cornish pasties. Help yourself. Well, pay first.', 'Flour gets everywhere. I sneeze dough.'],
  fryer: ['Cod, chips, mushy peas. The holy trinity.', 'Salt and vinegar? Course you do.', 'The fryer\'s hotter than the sun. I\'ve got no eyebrows left.'],
  vicar: ['Sunday service at ten. There\'s tea after. That\'s the real draw.', 'I pray for this village every night. Some nights harder than others.', 'Bless you, Sam. Have you thought about the church roof fund?'],
  builder: ['Give me timber and a plan and I\'ll give you a building.', 'Mind your head round the scaffolding.', 'Bit of rain and the whole site goes to mud.', 'Measure twice, cut once. That\'s the motto.', 'I\'ve built more cabins than I\'ve had hot dinners.', 'If the Stockyard runs dry, we just stand about. Keep it stocked!', 'Paths first, then foundations. That\'s how my old gaffer taught me.'],
  lumberjack: ['Forest\'s thinning near the path. Plenty further in, mind.', 'Nothing like the smell of fresh-cut timber.', 'My back\'s killing me. Worth it for the wages.', 'Timber! Sorry, habit.', 'A good swing is all in the hips.', 'The trees here grow back suspiciously quickly.', 'I name every tree before I chop it. Is that odd?'],
  forager: ['Good crop of blackberries this week.', 'Mind the thorns. Learnt that the hard way.', 'The bushes grow back, thank goodness.', 'Purple fingers, every single day.', 'I eat one for every three I pick. Don\'t tell anyone.', 'The best berries are always just out of reach.'],
  fisher: ['Mackerel were biting this morning.', 'Quiet work, fishing. Suits me.', 'Seagulls nick half my catch.', 'The sea\'s always calm here. Never seen a proper wave.', 'Caught a fish this big. Well. This big.', 'Fish, chips and a sea breeze. What more do you want?'],
  quarryman: ['Dusty work, but honest.', 'Plenty of good stone out west.', 'Careful with those boulders, Sam.', 'I\'ll be coughing grit till Christmas.', 'Stone\'s heavier than it looks. Everything is, these days.'],
  farmer: ['Wheat\'s coming on nicely.', 'No rest for a farmer.', 'Soil\'s good here. Strangely good.', 'Rain or shine, the crops need tending.', 'Grew a marrow the size of a dog last year.', 'You can\'t rush a field, Sam.'],
  brickmaker: ['Best clay on the island, that.', 'The kiln never goes cold.', 'Fired a hundred this week.', 'Every brick I make, I sign. Tiny initials. Look closely.'],
  glassblower: ['Beach sand makes lovely glass.', 'Mind the furnace, it bites.', 'Windows for the whole town, soon enough.', 'Glass is just patient sand.'],
  smith: ['Iron from the hills, steel from my forge.', 'Good steel takes patience.', 'Hammer, anvil, repeat.', 'My arms are like tree trunks. Feel that. Go on.'],
  publican: ['Pint? Well, a cup of tea, in your case.', 'Stew\'s on. Same recipe as always.', 'Best seat\'s by the fire.', 'I hear everything behind this bar. Everything.', 'Quiz night\'s on Thursday. Bring your brain.'],
  teacher: ['The children are coming along nicely.', 'Reading, writing and a bit of arithmetic.', 'Such bright little things.', 'One of them asked me where the sky ends. I changed the subject.', 'Nature walk tomorrow. Don\'t tell them it\'s educational.'],
  shopkeeper: ['Fresh stock every day. Same stock every day, really.', 'Business is steady. Remarkably steady.', 'Anything I can get you, Sam?', 'Visitors love a souvenir.', 'We\'ve run out of milk again. We\'ve never had milk.'],
  clerk: ['Filing, filing, filing. Someone has to.', 'The paperwork never ends.', 'Forms in triplicate, as always.', 'I stamped forty-two permits today. A personal best.'],
  factory: ['Machines hum all day. You get used to it.', 'Shift\'s long, but the pay is fair.', 'Don\'t ask what we make. I\'m not sure myself.', 'Clock in, clock out. Lovely.'],
  doctor: ['Everyone round here is remarkably healthy.', 'If you feel faint, come and see me.', 'Eat your greens, Sam.', 'Get some sleep. Doctor\'s orders.', 'Funny, nobody here ever catches a cold.'],
  guard: ['Keep to the roads, Sam. Away from the edges.', 'All quiet. It\'s always all quiet.', 'Nothing to report. Nothing ever to report.', 'Raiders? We\'ll see them off.'],
  engineer: ['Power\'s steady. It\'s always steady.', 'Don\'t touch the panels, Sam.', 'Lovely bit of kit, this.', 'If the lights flicker, it\'s not me.'],
  unemployed: ['Between jobs, as they say.', 'I\'d work if there were jobs going. Build a Forager\'s Hut or a Lumber Camp, eh?', 'I\'m keeping busy. Mostly by sitting.', 'Put me to work, Sam. Anything!'],
  retired: ['Me? Retired. I\'ve earned my sit-down.', 'I potter. Pottering is an art.', 'Forty years I worked. Now I watch others do it.', 'I do the crossword and tell people where they\'re going wrong.'],
  child: ['School! Boring. Well, the nature walk was good.', 'I\'m going to be a lumberjack when I grow up!', 'I help my mum. Sometimes.', 'Playing! Want to play? You\'re it!'],
  visitor: ['We came down on the Lift this morning. Ever so smooth.', 'Just sightseeing. We\'ve heard so much about Sam City.', 'Is it true everything here is built by hand?', 'My sister came last year. She said it was just the same. Exactly the same.'],
};

export const ABOUT = [
  'I\'m from {town}, originally. Used to be a {job} before I came down the Lift.',
  'Born and bred in {town}. Worked as a {job} for years.',
  '{town}, me. Proper {town}. I was a {job}, if you can believe it.',
];
export const ABOUT2 = [
  'In my spare time it\'s {hobby}. Can\'t get enough of it.', 'I\'m mad about {hobby}. Ask me anything.', 'Weekends are for {hobby}, rain or shine.',
  'I\'ve got {pet}.', 'Back home I had {pet}. Miss them terribly.',
  'Favourite meal? {food}. No contest.', 'If you ever want to make me happy, Sam: {food}.',
];
export const FAMILY = ['My mum still writes every week. Well, I think it\'s every week. The letters all look the same.', 'I\'ve got three brothers. All taller than me. All annoying.',
  'Only child, me. Spoilt rotten, my nan said.', 'My gran taught me everything I know. Mostly about tea.', 'I miss my sister. She\'s in {town2}. Or was.',
  'My dad was a {job2}. I swore I\'d never be one. Look at me now.', 'Never married. Came close once. She preferred his moustache.'];

export const GOSSIP = {
  pub: ['Pub quiz on Thursday. {a} knows every capital city and nothing else.', 'The Red Lion\'s darts team lost again. {a} blamed the lighting.'],
  couple: ['Have you heard? {a} and {b} are walking out together. Ooh!', '{a} and {b}, eh? Saw it coming a mile off.', 'Between you and me, {a} is smitten with {b}.'],
  friends: ['{a} and {b} are thick as thieves these days.', '{a} and {b} were laughing about something by the campfire all evening.'],
  newcomer: ['There\'s a new face: {a}. Arrived on the Lift. Seems nice enough.', 'Have you met {a} yet? Only just got here.'],
  hungry: ['{a} looks half-starved. Someone ought to get more food in.', 'Poor {a} was asking everyone for a bite to eat.'],
  building: ['Have you seen the new {bld}? Smashing job.', 'The {bld} has really smartened the place up.', 'Everyone\'s talking about the {bld}.'],
  noFood: ['The Stockyard\'s nearly out of food, Sam. People are getting tetchy.', 'If we don\'t get more food in, folk will start leaving.'],
  noHomes: ['We need more homes. People sleep wherever they can.', 'More cabins, Sam! There\'s a queue at the Lift.'],
  raid: ['Did you hear about the raiders? Landed right on the beach!', 'They say the raiders came by boat. From where, though? There\'s nothing out there.'],
  rain: ['Rain\'s set in. The farmer\'s happy, at least.', 'My roof leaks. Don\'t tell the builders.'],
  growing: ['Town\'s growing fast. I remember when it was just a Stockyard.', 'Busy, isn\'t it? Lovely to see.'],
  quiet: ['Nothing much happens here. Which is nice. Mostly.', 'Same old, same old.', 'Quiet week. Quiet month. Quiet... always, really.'],
  sam: ['People say you work harder than anyone, Sam.', 'They\'re saying you can fell a tree in four swings. Is that true?', 'Somebody said you talk to everyone. That\'s rare round here.'],
};

export const HELP = {
  noYard: 'Order a Stockyard in the planning view (TAB). Everything we gather needs somewhere to go.',
  noHome: 'Get yourself a Log Cabin, Sam. You can\'t sleep in a field forever.',
  noFood: 'We need food. A Forager\'s Hut picks berries for the Stockyard, and a Fisher\'s Hut does fish.',
  lowFood: 'Food\'s running low. More foragers, a fisher, or a farm once you can.',
  beds: 'No spare beds means no new settlers. Build more homes.',
  jobs: 'Folk need jobs. Workplaces like a Lumber Camp or a Quarry give them something to do.',
  postbox: 'Build a Postbox. The Planning Office only talks by letter until you\'ve got a proper office.',
  permits: 'Want bigger buildings? Post a permit form at the Postbox. They reply by morning.',
  builders: 'A Builders\' Yard means builders do the hauling and hammering for you.',
  hungrySam: 'You look peaky, Sam. Eat something: press Q with food in your backpack.',
  tiredSam: 'Get some sleep, Sam. Your bed or a sit by the fire.',
  minigame: 'Tip: when you chop, tap right on the gold. Keep the chain going and it flies.',
  roads: 'Paths help. Draw them in the planning view, then dig them with your shovel.',
  raid: 'If the raiders come, there\'s a club by the Stockyard. Or build a Police Station.',
  generic: ['Keep the Stockyard full and people stay happy.', 'Talk to folk. You\'d be surprised what people know.', 'Paths first, then buildings. That\'s my advice.', 'Don\'t go near the Lift platform. Trust me.'],
};

export const BYE = ['Ta-ra, Sam!', 'Cheerio!', 'See you later, alligator.', 'Mind how you go.', 'Right, I\'d best be off.', 'Toodle-pip!', 'Cheers, Sam. Don\'t be a stranger.', 'Bye now. Put the kettle on sometime.'];
export const BYE_GRUMPY = ['Right. Good.', 'Off you pop.', 'Finally.', 'Mm. Bye.'];
export const BYE_SHY = ['Oh, um, bye then.', 'Nice talking... bye!', 'Ta-ra. Sorry. Bye.'];

export const CHILD_TALK = ['Do you know any jokes? What\'s brown and sticky? A stick!', 'I found a frog. I called him Kevin.', 'Mum says don\'t talk to strangers. You\'re not a stranger, you\'re Sam.',
  'How high does the sky go? My teacher wouldn\'t say.', 'I can whistle. Pfffff. Nearly.', 'When I grow up I\'m going to build a castle. With a moat. And sharks.', 'Have you got any sweets?'];
