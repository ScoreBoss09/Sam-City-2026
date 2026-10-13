// What townsfolk do with their spare time, and what they think about things (bands, soaps, football, papers, crisps...).
// Each sim gets two hobbies and one opinion of each kind from their name (Talk.voice), so they always back the same team
// and always hate the same soap. Plain data: mods can add hobbies or opinions. {a} is another resident, {team} theirs.

/** label = how they'd name it ("I'm mad about {hobby}"), min/max = ages it suits. */
export const HOBBY = {
  pigeons: { label: 'pigeon racing', min: 30, lines: [
    'My birds came in from Lille on Saturday. Six hundred miles and not one of them stopped for a pint.', 'I\'ve got a pigeon called Shearer. Fastest in the loft. Bit of a show-off.',
    'Pigeons are cleverer than people, Sam. They always find their way home. My husband can\'t find his way back from the pub.', 'Lost a bird in the fog last week. Turned up on Tuesday looking very pleased with itself.',
    'The secret\'s in the corn. And talking to them. I sing to mine. Mostly Simply Red.', 'Somebody\'s cat\'s been eyeing my loft. Somebody\'s cat is on borrowed time.',
    'I clock them in with the old timer my dad left me. Still works. Ticks like a bomb.', 'Pigeon racing\'s not a hobby, Sam. It\'s a way of life. And a lot of cleaning.',
    '{a} reckons pigeons are flying rats. {a} is wrong and I\'ve told them so.', 'Bred a lovely blue chequer hen this spring. I\'m calling her Ulrika.' ] },
  allotment: { label: 'the allotment', min: 28, lines: [
    'Runner beans are up to my shoulder on the allotment. Taller than {a}.', 'Somebody\'s been nicking rhubarb off the allotment. I\'ve got my suspicions.',
    'Up the allotment by seven, flask of tea, Radio 2 on. Bliss.', 'Slugs, Sam. Slugs are the enemy. I go out with a torch at midnight. Don\'t look at me like that.',
    'I\'m growing a marrow for the show. I talk to it. It\'s called Gerald.', 'The shed on my allotment is nicer than my house. It\'s got a deckchair AND a kettle.' ] },
  gardening: { label: 'gardening', min: 25, lines: [
    'My roses are coming on lovely. I feed them banana skins. And tea leaves. And swearing.', 'I\'ve put in a water feature. Little stone frog that wees into a bowl. Classy.',
    'Lawn stripes, Sam. Proper stripes, like Wembley. Took me all Sunday.', 'Slugs had my lettuces. Every single one. Overnight. Like a heist.',
    'I watch Gardeners\' World religiously. Geoff Hamilton is a saint.', 'Planted tulips upside down. Nobody told me there was a right way up.',
    'My hanging baskets are the envy of the street. {a} pretends not to look. {a} looks.', 'Gnomes. I\'ve got eleven. Somebody keeps turning them round to face the wall.',
    'Nothing beats a tomato you grew yourself. Even if it\'s the size of a marble.', 'I\'ve got a greenhouse now. Do you know what a greenhouse is in this weather? Heaven.' ] },
  darts: { label: 'darts', min: 18, lines: [
    'One hundred and eighty! Well, nearly. Sixty, mostly. One hundred and eighty in my dreams.', 'Phil Taylor. The Power. Greatest player that ever lived, and he\'s from Stoke.',
    'I\'m in the darts team. We lose every week, but we lose with dignity. And crisps.', 'Double top to finish. Every time. Well, double one. Then double one again.',
    'Bristow said it\'s all in the wrist. I\'ve got two wrists and I\'m still rubbish.', 'Darts is a sport. You need concentration, hand-eye coordination and about six pints.',
    'Our captain, {a}, throws like a man swatting a wasp. Somehow it goes in.', 'I bought new flights. Union Jack ones. Made no difference but I look the part.',
    'Bullseye was on. Jim Bowen. Super, smashing, great. I always wanted the speedboat.', 'Got the dartboard at home on the back of the door. The door looks like a colander.' ] },
  football: { label: 'football', min: 12, lines: [
    'Did you see {team} at the weekend? Don\'t. Just don\'t.', 'I\'ve supported {team} since I was six. Thick and thin. Mostly thin.',
    'Euro 96, Sam. Gazza against Scotland. Dentist\'s chair. I\'ll be talking about it when I\'m ninety.', 'Southgate should have just leathered it. Leathered it! Poor lad.',
    'Shearer cost fifteen million. FIFTEEN MILLION. For one man. I could buy the whole of Swindon for that.', 'Cantona came back from his ban and scored. Collar up. You\'ve got to admire it.',
    'Keegan on the telly: "I would love it if we beat them! Love it!" Never seen a grown man so close to tears.', 'Sunday league for the Crown and Anchor. I play left back. I play left back very slowly.',
    'I\'ve got the Euro 96 shirt. The grey one. Everyone says it looks like a wet pavement. I love it.', 'Juninho at Middlesbrough. Tiny little fella. Like a wind-up toy. Brilliant.',
    'They play Three Lions after every goal now. Even in the Sunday league. Even when we lose.', 'Match of the Day, Des Lynam, a tin of Stella. That\'s my Saturday night sorted.' ] },
  soaps: { label: 'the soaps', min: 14, lines: [
    'Coronation Street, EastEnders, Emmerdale, Brookside. I can\'t go out four nights a week. I\'ve got commitments.', 'Did you see what Grant Mitchell did? Shouting again. That man needs a nice cup of tea.',
    'Brookside had a body under the patio. Under the PATIO, Sam. I check mine every morning.', 'Neighbours at half one, then again at half five. Twice in one day. It\'s the only way.',
    'I\'ve got the Christmas Corrie double bill on tape. I watch it in August when I\'m sad.', 'Dot Cotton is my hero. She\'s had a terrible life and she\'s still got her fags.',
    'Don\'t ring me during EastEnders. Don\'t knock. If there\'s a fire, wait till the credits.', 'Bet Lynch and her earrings. They don\'t make women like that any more.',
    'Pat Butcher\'s earrings could pick up Radio 1.', 'The Emmerdale plane crash. I still can\'t look at a plane without shaking. Well, we never see planes here anyway.' ] },
  motors: { label: 'tinkering with motors', min: 17, lines: [
    'Got the bonnet up on the Cortina again. She\'s older than my marriage and more reliable.', 'Rover 214, Sam. British made. Well, mostly Honda, but don\'t tell anyone.',
    'Halfords had a sale. I\'ve bought fluffy dice, a steering wheel cover and go-faster stripes. It\'s still slow.', 'Top Gear on a Thursday. Clarkson\'s a gobby so-and-so, but he knows his cars.',
    'Changed my own oil. Got more on me than in the engine.', 'Escort RS Cosworth. One day. Big whale tail on the back. One day.',
    'My Metro failed its MOT on "everything", it said. Just "everything".', 'Nothing like the smell of a garage on a Sunday morning. Oil, rust and Swarfega.',
    'I can strip a carburettor in ten minutes. Putting it back together, that\'s more like ten days.', '{a} asked me to look at their car. I looked at it. Then I backed away slowly.' ] },
  bingo: { label: 'bingo', min: 30, lines: [
    'Two fat ladies, eighty-eight! I won a fiver on Tuesday. Bought a scratchcard. Lost it.', 'Bingo night, Sam, is the highlight of my week. Don\'t laugh. There\'s a raffle.',
    'I sit in the same seat every week with my lucky troll and a bag of Werther\'s.', 'Shouted "house" too early last month. They still haven\'t let me forget it.',
    'Dabbers, Sam. I\'ve got eight colours. You need a system.', 'Legs eleven! Everyone whistles. I love that bit.',
    '{a} won the big one. Never seen anyone run so fast with a hip like that.', 'The caller does a lovely voice. Like a man reading the shipping forecast on a ghost train.' ] },
  fishing: { label: 'fishing', min: 14, lines: [
    'Sat on the bank six hours. Caught nothing. Best day of my week.', 'Fishing\'s not about fish, Sam. It\'s about not being at home.',
    'Had a pike on the line this big. It got away. They always get away. That\'s the rules.', 'Maggots in the fridge again. My husband\'s not speaking to me.',
    'Night fishing on the pier. Flask of soup, a radio, and the sea going shhh. Lovely.', 'I tie my own flies. Took me three years to get one that didn\'t look like a dead moth.',
    'Caught a mackerel off the harbour wall with a bit of silver foil. Silver foil!', 'My lucky hat has been fishing longer than I have. It\'s got its own chair.',
    'Me and {a} went fishing. Didn\'t say a word for five hours. Perfect day.', 'Mullet off the rocks this morning. The fish, not the haircut. Though I\'ve got that too.' ] },
  raving: { label: 'raving', min: 17, max: 40, lines: [
    'Went to a rave in a field outside Leeds. Ten thousand people, one portaloo. Mad for it.', 'You ring a number, a man tells you a car park, then another number. You end up in a barn at four in the morning. Magic.',
    'Ministry of Sound, Sam. Been once. My ears still ring.', 'Born Slippy. Lager lager lager. Shouting. Honestly, best record ever made.',
    'I\'ve got a whistle and some glow sticks in my bag at all times. Just in case.', 'The Prodigy at the Brixton Academy. I didn\'t come down for a week. In a good way. Energy-wise.',
    'Dancing till the sun comes up and then a fry-up at a services on the M62. Living.', 'The Criminal Justice Act says you can\'t have repetitive beats. It\'s all repetitive beats! That\'s the point!',
    'Bottle of water and a lot of hugging. That\'s raving.', 'My mum thinks raves are about drugs. I tell her it\'s about the music. Mostly the music.' ] },
  golf: { label: 'golf', min: 30, lines: [
    'Went round in a hundred and four. Lost six balls. The pond\'s mine now, really.', 'Faldo won the Masters! Norman threw it away. Six shots! I felt for him. I didn\'t.',
    'Golf is a good walk spoiled. I just like the little pencils.', 'I\'ve got a new driver. Titanium. Still go left. Expensively left.',
    'The nineteenth hole is the best hole. Pint and a cheese toastie.', 'I\'m trying to get into the club. Six-year waiting list and a man in a blazer looked at my shoes.' ] },
  linedancing: { label: 'line dancing', min: 25, lines: [
    'Achy Breaky Heart, every Wednesday at the village hall. Boots, hat, the lot.', 'Line dancing\'s all about the grapevine, Sam. And not crashing into Doris.',
    'We\'re doing the Cotton Eye Joe in a competition in March. We\'ve got matching shirts. With tassels.', 'My hat cost forty quid. Genuine Stetson. From the market.',
    'Yee-haw. Sorry. You say it once and it never leaves you.', 'Half the class are over sixty. They\'d run rings round you, Sam.' ] },
  karaoke: { label: 'karaoke', min: 18, lines: [
    'I do a very emotional Unchained Melody. Robson and Jerome have nothing on me.', 'Friday karaoke, I always do Wonderwall. Everyone sings along. Or groans. Hard to tell.',
    'I can hit the high note in I Will Always Love You. Dogs come running.', 'Total Eclipse of the Heart, with actions. Turn around! I do the turn.',
    'Me and {a} did Islands in the Stream. Brought the house down. Well, somebody fell off a chair.', 'Some people do My Way like it\'s a hymn. I do it like it\'s Vegas.' ] },
  crosswords: { label: 'crosswords', min: 25, lines: [
    'Seven letters, "mad for it, Mancunian". Gallagher? No, that\'s nine.', 'I do the cryptic every morning. I get about two clues. I count it.',
    'Countdown, Sam. I got a nine-letter word last week. Carol looked right at me. Through the telly.', 'Jigsaws in winter, crosswords in summer. A thousand pieces of sky. I love it.',
    'I\'ve got a dictionary on the arm of my chair. The pages are falling out.', '~Three down, "a small island community" in four letters. Home. Is it home? I don\'t like that one.' ] },
  carboot: { label: 'car boot sales', min: 22, lines: [
    'Got a Soda Stream, a lava lamp and a Rubik\'s Cube for two quid at the car boot. All working. Except the Rubik\'s.', 'Car boot\'s a Sunday religion. Up at six, flask, torch, cash in a bum bag.',
    'Somebody was selling a box of Spitting Image puppets. Well, one. Thatcher. I bought it. It\'s in the loft.', 'You haggle, Sam. Always haggle. A man who pays full price at a car boot is a man with no soul.',
    'Found a Toby jug that might be worth a fortune. Taking it on the Antiques Roadshow. Hugh Scully will weep.', 'Bought my own toaster back. Sold it two years ago. Same scorch mark.' ] },
  diy: { label: 'DIY', min: 25, lines: [
    'Put up a shelf on Saturday. It\'s holding up beautifully. Well, it\'s holding.', 'B&Q on a Sunday. Wander round, buy a hinge, come home, can\'t find the screwdriver.',
    'I\'m doing the hall in Magnolia. Everything\'s Magnolia. It\'s the law.', 'Artexed the ceiling myself. Swirls everywhere. Like the Milky Way, my husband says. Not as a compliment.',
    'Changing Rooms, Sam. Have you seen it? MDF everywhere. Somebody cried over a purple wall.', 'Drilled through a pipe. The kitchen was a swimming pool for a day. Character building.',
    'I\'ve got a Black and Decker Workmate. It\'s my pride and joy. I\'ve never used it.' ] },
  horses: { label: 'the horses', min: 22, lines: [
    'Frankie Dettori rode all seven winners at Ascot! Seven! Bookies were crying in the street.', 'I had a fiver each way on a horse called Lucky Sam. Came fourth. Unlucky Sam.',
    'Grand National\'s the big one. I pick by the name. Never fails. Well, always fails.', 'Got a tip from a man in the pub. Horse was called Glue Factory. Should\'ve guessed.',
    'Tote, Yankee, Canadian, Lucky Fifteen. I know all the bets. I just don\'t know any winners.', 'Desert Orchid. Now THAT was a horse. Grey. Gorgeous. Like Sinatra.' ] },
  cooking: { label: 'baking', min: 18, lines: [
    'Made a Victoria sponge. It sank in the middle. Filled it with jam. Nobody noticed.', 'Ready Steady Cook! Five pounds of ingredients. I could do that. I\'d do a cheese toastie.',
    'I\'m doing Delia\'s Christmas cake. In June. You have to feed it brandy for months.', 'My scones are famous. Ask anyone. Well, ask {a}. They\'ve had four.',
    'Toad in the hole on a Tuesday, fish on a Friday, roast on a Sunday. You can set your watch by my oven.', 'I\'ve got a bread maker. Wedding present. Still in the box. It\'s a lovely box.',
    'Angel Delight. Butterscotch. Don\'t let anyone tell you it\'s not cooking.' ] },
  snooker: { label: 'snooker', min: 16, lines: [
    'Hendry won AGAIN. Jimmy White will win it one year. One year. I\'ll cry.', 'Pot Black, Sam. Whispering Ted. "And for those of you watching in black and white, the pink is behind the green."',
    'I made a break of twenty-two on Tuesday. Twenty-two! Then I potted the white.', 'Snooker is chess with balls. That\'s what my dad said. I still don\'t know what it means.',
    'The World Championship is on at the Crucible. Two weeks of sleeping in front of the telly. Heaven.', 'Chalk your cue, cue ball control, and never, ever play {a} for money.' ] },
  rugby: { label: 'rugby', min: 16, lines: [
    'Jonah Lomu ran over Mike Catt like he wasn\'t there. Like a train going through a hedge.', 'Will Carling called the RFU fifty-seven old farts. Got sacked for a day. Legend.',
    'Rugby league, Sam, not union. Wigan. Proper rugby. Mud and thighs.', 'Five Nations on a Saturday. Pint, pie, shouting at the Welsh. Or with them, if I\'m in Cardiff.',
    'I played prop at school. Still got the ears to prove it.', 'You get thugs playing a gentleman\'s game in rugby. Football\'s the other way round.' ] },
  cricket: { label: 'cricket', min: 14, lines: [
    'Test Match Special on the radio. Rain stopped play. Lovely. They talk about cake for an hour.', 'England collapsed again. All out for ninety-two. Proud tradition.',
    'Atherton\'s a fine captain. Dirt in the pocket and all. Never did understand that.', 'I\'ve got my whites in the airing cupboard ready. Ready since April.',
    'Darren Gough\'s got a run-up like a man chasing a bus. I love him.', 'Cricket\'s not boring, Sam. It\'s just slow. Like me.' ] },
  trains: { label: 'model railways', min: 25, lines: [
    'My layout\'s in the loft. Forty foot of track, three stations, a little man waving. I call him Sam.', 'Hornby, Sam. Only Hornby. Anything else is a toy.',
    '~I\'ve built a scale model of this town. Every building. Every tree. I keep a little figure where you are. Is that strange?', 'My wife says it\'s a train set. It is NOT a train set. It\'s a model railway.',
    'Spent four hours on a level crossing. It\'s smaller than a matchbox. It\'s beautiful.', 'The trains run on time in my loft. More than you can say for British Rail.' ] },
  knitting: { label: 'knitting', min: 20, lines: [
    'I\'m knitting a jumper for my husband. It\'s on its third sleeve. I don\'t know what happened.', 'Knit one, purl one, watch Countdown. Bliss.',
    'Knitted everyone tea cosies for Christmas. Some people got two. They know who they are.', 'I\'ve got a Fair Isle on the go. Four colours. My eyes have gone funny.',
    'Knitted a scarf in Newcastle colours for {a}. They support someone else. I didn\'t ask.', 'I knit in the pub. Don\'t laugh. Nobody bothers you if you\'ve got needles.' ] },
  birds: { label: 'birdwatching', min: 18, lines: [
    'Saw a goldfinch this morning! Little red face! Made my week.', 'Bill Oddie says patience is everything. I say a flask and a good hide.',
    'My binoculars are better than my glasses. I wear them round the house.', 'Herring gull, lesser black-backed gull, great black-backed gull. They\'re not all just seagulls, Sam.',
    '~I keep a list. Two hundred and eight species. Well, six here. Always the same six.', 'A robin follows me round the garden. I\'ve named him Terry.' ] },
  amdram: { label: 'amateur dramatics', min: 20, lines: [
    'We\'re doing Blithe Spirit at the village hall. I\'m the ghost. I\'ve got to wear grey make-up. I love it.', 'Panto season\'s coming. I\'m the back end of the cow again. Typecast.',
    'I forgot my lines on opening night. Made it up. Got a standing ovation. Nobody noticed.', 'The director says I\'m too big. "Less, darling. Less." I don\'t do less.',
    'Oh yes I did! Oh no I didn\'t! Sorry, panto rehearsals.', 'I had a small part in a Crimewatch reconstruction once. I was "man at bus stop". Very moving.' ] },
  caravan: { label: 'caravanning', min: 30, lines: [
    'Took the caravan to Skegness. Rained for nine days. Played Scrabble. Lovely holiday.', 'We\'ve got a Swift Challenger. Awning, the lot. Two-ring hob. Luxury.',
    'Car in front doing forty on the A1 with a caravan? That\'s me. You\'re welcome.', 'Caravan Club site in the Lakes. Chemical toilet. Never mind. Views, Sam. Views.',
    'Nothing beats a bacon butty under an awning with the rain drumming down.' ] },
  metal: { label: 'metal detecting', min: 25, lines: [
    'Found a ring pull, three bottle tops and a Victorian penny. The penny made my year.', 'Somebody found a Roman hoard in Suffolk with a detector. That\'ll be me. Any day now.',
    'The beep, Sam. The beep is everything. My heart goes every time.', 'Dug up a whole bike once. Under a field. Who buries a bike?',
    'I go over the beach after the tourists. Loose change, earrings, false teeth. You\'d be amazed.' ] },
  keepfit: { label: 'keep-fit', min: 18, lines: [
    'Mr Motivator on GMTV every morning! Bodysuit, bum bag, the lot. I\'m doing the lunges in my kitchen.', 'Step aerobics on Thursdays. I\'ve got the leotard. You don\'t want to see it.',
    'Rosemary Conley\'s hip and thigh diet. Lost four pounds. Found them again at the chippy.', 'I walk the coast path every morning. Five miles. The seagulls know me.',
    'Did the Great North Run. Well, the Great North Walk. Well, I got the bus for a bit.', 'I\'ve got a ThighMaster. Under the bed. Doing very well under there.' ] },
  quizzes: { label: 'pub quizzes', min: 20, lines: [
    'Pub quiz, Thursday. Our team\'s called The Usual Suspects. We usually come fourth.', 'I know every capital in the world and every Number One since 1975. Ask me anything except sport.',
    'We lost by one point because {a} thought Sheffield was the capital of Australia.', 'Fifteen to One, William G. Stewart. I got to the final once. In my head.',
    'Who had a hit with Spaceman this year? Babylon Zoo. See? I know things.', 'I want to go on Telly Addicts. Noel Edmonds and a big sofa. I know every theme tune ever written.' ] },
  guitar: { label: 'playing the guitar', min: 14, lines: [
    'I know three chords. That\'s every Oasis song, Sam.', 'I\'ve been learning Wonderwall for six months. I\'ve got the first bit. Today is gonna be the day...',
    'Got a Squier Strat from the Exchange and Mart. Sounds like a cat in a dustbin. I love it.', 'I\'m starting a band. We\'re called The Lift. Sounds better than it is.',
    'My fingers are like leather from the strings. Good for picking up hot chips.', 'Me and {a} jammed in the garage on Saturday. The police came. Twice.' ] },
  games: { label: 'computer games', min: 12, max: 45, lines: [
    'Championship Manager. I\'ve taken Scarborough to the Champions League. Not slept since Tuesday.', 'PlayStation! Wipeout and Ridge Racer. The graphics are like real life, Sam. Real life!',
    'Sonic on the Mega Drive. I can do Green Hill Zone in my sleep. I do, actually. I dream it.', 'Doom on my dad\'s PC. You need a 486 and nerves of steel.',
    'Sensible Soccer is better than real football. I said it. I\'m not taking it back.', 'Super Mario Kart. I\'m unbeatable on Rainbow Road. Ask {a}. They threw the controller.' ] },
  bowls: { label: 'bowls', min: 50, lines: [
    'Crown green bowls on a Sunday. Whites, flask, and a lot of tutting.', 'Bowls is a contact sport, Sam, when Edna\'s on the other team.',
    'I\'ve got a new set of woods. Henselite. Lovely bias on them.', 'We play for the Over Sixties Cup. The trophy\'s a teapot. It\'s very important.',
    'Bowls on the telly, Sam. Whispering commentators and a lot of men in cardigans. Unmissable.' ] },
  stamps: { label: 'stamp collecting', min: 30, lines: [
    'I\'ve got a Penny Red. Not the Black, the Red. Still. Very nice.', 'I\'ve got the whole set of the Royal Mail Christmas stamps since 1966. Bar one. Bar 1971. Don\'t ask.',
    'Tweezers, magnifying glass and a quiet Sunday. That\'s philately, Sam. Philately. Don\'t snigger.', 'Nobody writes letters any more except the Planning Office. The stamps on those are very boring.' ] },
};

/** Opinions. Each sim holds one of each, always the same. Lines are what they say for that choice. */
export const OPINION = {
  band: {
    oasis: ['Oasis, Sam. Best band in the world. Better than the Beatles. Noel said so and he\'d know.', 'I was at Knebworth! Quarter of a million people. I couldn\'t see a thing. Best night of my life.', 'Don\'t Look Back in Anger. Every wedding, every party, every pub at closing time.', 'Liam\'s got the voice, Noel\'s got the songs. Blur have got... art school.', 'Blur? Southern softies. Oasis would have them in a fight. Not that I approve of fighting.', 'Champagne Supernova. Seven minutes. I don\'t know what it means and I don\'t care.'],
    blur: ['Blur, every time. Parklife! Clever lyrics, proper songs.', 'Oasis are just shouting with a Beatles record on. Blur have got wit.', 'Country House beat Roll With It. That\'s history, that is. Look it up.', 'Damon Albarn could read the phone book and I\'d buy it.', 'Girls and Boys. Best dance-floor song of the decade. Fight me.', 'The Great Escape is a masterpiece. Track by track. I\'ll explain it to you sometime.'],
    pulp: ['Pulp. Common People. Jarvis is a genius. A thin, wobbly genius.', 'Did you see Jarvis at the Brits? Wiggled his bum at Michael Jackson! National hero!', 'Oasis and Blur can fight it out. Pulp are better than both.', 'Disco 2000! I said let\'s all meet up in the year 2000. I hope everyone remembers.'],
    spice: ['Spice Girls! Wannabe! Girl Power, Sam! Zig-a-zig-ah!', 'I\'ve got a favourite Spice Girl but I\'m not saying. Fine. It\'s Ginger.', 'Say You\'ll Be There. Already got the single. Bought two in case.', 'Guitar bands are so last year, Sam. It\'s all about pop now. Girl Power.'],
    takethat: ['Take That split up in February. I\'m still not over it. I\'ve kept the newspapers.', 'Back for Good. Best song ever written. I won\'t hear otherwise.', 'Robbie left and it all fell apart. I always said he was trouble. Lovely trouble.', 'Gary Barlow writes a proper tune. Better than those Gallagher brothers shouting.'],
    oldies: ['Modern music? Noise. Give me Cliff, Tom Jones and a bit of Shirley Bassey.', 'They don\'t write songs like the Beatles any more. Or the Searchers. Or Freddie and the Dreamers.', 'All this Britpop. My lad plays it through the floor. I put on Engelbert and turn it up.', 'Simply Red. Mick Hucknall\'s got the voice of an angel and the hair of a carrot.'],
    dance: ['I don\'t do guitar bands. Give me the Prodigy, Underworld, a bit of Orbital.', 'Firestarter! Did you see Keith in that video? My nan nearly called the police.', 'Dance music is the future, Sam. In ten years nobody will play a guitar.', 'Children by Robert Miles. Puts me in a trance. Literally. I missed my stop.'],
  },
  soap: {
    corrie: ['Coronation Street is the only soap. Proper northern, proper funny.', 'Reg Holdsworth in the supermarket. Comic genius.', 'Jack and Vera Duckworth are the real thing. I know a dozen couples like that.', 'Curly Watts and Raquel. Broke my heart, that wedding.'],
    eastenders: ['EastEnders. It\'s miserable, it\'s shouty, and I love it.', 'Grant and Phil Mitchell. Two bald heads, no brains. Can\'t take my eyes off them.', 'Doof doof doof doof. That bit at the end, Sam. Gets me every time.', 'Peggy Mitchell slapping someone in the Queen Vic. "Get outta my pub!" Brilliant.'],
    emmerdale: ['Emmerdale, me. Lovely scenery. Sheep, mostly. And the odd plane crash.', 'I like Emmerdale because it\'s more like here. A pub, some fields and a lot of drama.', 'The Dingles are my favourite family on telly. I\'m sure they\'re based on my in-laws.'],
    brookside: ['Brookside is the only soap with any guts. Literally, under the patio.', 'Brookie! Sinbad, Barry Grant, the Jordaches. Proper telly.', 'Channel 4 do the best soap. Grittier. Like a soap with grit in it. Brookside.'],
    neighbours: ['Neighbours! Everybody needs good neighbours. And sunshine. And Scott and Charlene.', 'I like the Australian ones. The weather\'s better, even if the acting isn\'t.', 'Home and Away at ten past six. Summer Bay. One day I\'ll go there.', 'Harold Bishop is the nicest man on telly. Everyone needs a Harold.'],
    none: ['Soaps? Rubbish. Everyone shouting and having affairs. I can get that in the pub.', 'I don\'t watch soaps. I watch the news. Same thing, different music.', 'I never watch soaps. Though I do know exactly what\'s going on in all of them.'],
  },
  team: {
    'Man United': ['Man United won the Double. AGAIN. Cantona, Giggs, Beckham. The kids are alright.', 'Cantona, Sam! Collar up! Ooh aah Cantona! Kung-fu kick and all, I still love him.', 'You can\'t win anything with kids, said Hansen. Ha! We won everything with kids.', 'Old Trafford, Theatre of Dreams. My season ticket is my most prized possession.'],
    'Liverpool': ['Liverpool. Fowler, McManaman, Collymore. Best football in the country.', 'Those white suits at the Cup Final. Spice Boys. Lost to United. I\'ve burnt the photos.', 'You\'ll Never Walk Alone. Gets me in the throat every time.', 'Robbie Fowler, God. That\'s all you need to know.'],
    'Newcastle': ['Newcastle! Keegan, Ginola, Asprilla, and now Shearer. Fifteen million! Toon Army!', 'Twelve point lead, Sam. TWELVE. And we blew it. I can\'t talk about it.', 'Four-three against Liverpool. Keegan slumped over the hoarding. That was me in my front room.', 'Shearer\'s come home. Number nine. I cried at the unveiling.'],
    'Arsenal': ['Arsenal. Bergkamp, Wright, Adams. One-nil to the Arsenal!', 'They\'re bringing in some French fella as manager. Wenger. Never heard of him. Won\'t last.', 'Ian Wright, Wright, Wright! Best striker in the country.', 'Highbury. Marble halls. Proper class.'],
    'Leeds': ['Leeds United. Tony Yeboah. That volley against Liverpool. Bar down, in!', 'Marching on Together. Through thick and thin. Mostly thin, lately.', 'Elland Road on a Saturday. Best atmosphere in the league. Don\'t argue.'],
    'Aston Villa': ['Villa, Sam. Claret and blue. Dwight Yorke always smiling.', 'We won the League Cup! Three-nil against Leeds. Holte End were bouncing.', 'European Cup winners, 1982. Don\'t forget it. I haven\'t.'],
    'Spurs': ['Spurs, me. Klinsmann dived, we all loved it. He\'s gone now. Sob.', 'Teddy Sheringham. Clever player. Too clever for Spurs, probably.', 'Glory glory Tottenham Hotspur. Not much glory lately, but we sing it anyway.'],
    'Everton': ['Everton! Won the Cup in \'95. Big Dunc. Nobody remembers. I remember.', 'The School of Science. We\'re the people\'s club, Sam. Never forget it.', 'Southall in goal. Best keeper in the world. Shirt hanging out and all.'],
    'Blackburn': ['Blackburn Rovers, champions in \'95! Jack Walker\'s money. Shearer\'s gone now, mind. Gutted.', 'Rovers won the League. Blackburn! I still pinch myself.', 'We sold Shearer. Fifteen million. Jack Walker should\'ve chained him to the goalpost.'],
    'Chelsea': ['Chelsea. Gullit\'s the manager now! Dreadlocks and sexy football!', 'Vialli, Di Matteo, Zola. It\'s like a holiday in Italy at Stamford Bridge.', 'Blue is the colour. We\'ll win something soon. Watch this space.'],
    'Sheffield Wednesday': ['Wednesday, Sam. The Owls. We\'ve got a brass band in the crowd. That\'s class.', 'Hillsborough on a Saturday, pie at half time, and a lot of hoping.', 'Up the Owls! Even when we\'re rubbish, we\'re rubbish with style.'],
    'Middlesbrough': ['Boro! Juninho and Ravanelli! In Middlesbrough! It\'s like Carnival in the rain.', 'Ravanelli scored a hat-trick on his debut and pulled his shirt over his head. Silver fox!', 'Bryan Robson\'s building something special at the Riverside. You\'ll see.'],
    'Forest': ['Nottingham Forest. Two European Cups. Two! Cloughie\'s boys.', 'Stuart Pearce at Euro 96, Sam. That scream after the penalty. I screamed too. In a library.', 'Psycho! Best left back England ever had.'],
    'none': ['Football? Twenty-two grown men chasing a pig\'s bladder. No thank you.', 'I don\'t follow football. I just say "it\'s coming home" when everyone else does.', 'Not a football person, me. I was ironing during Euro 96. Missed the whole thing. Lovely peace.'],
  },
  paper: {
    sun: ['I get the Sun for the sport and the horoscopes. Mostly the sport.', 'Gotcha! Sorry, that\'s an old Sun headline. I quote it at people.'],
    mirror: ['I\'ve always had the Mirror. My dad had the Mirror. My nan had the Mirror and a fag.', 'Daily Mirror, cup of tea, crossword. Seven sharp.'],
    mail: ['The Daily Mail says house prices are going up, crime\'s going up and everything gives you cancer.', 'I read the Mail for the letters page. People are furious about everything. It\'s lovely.'],
    guardian: ['The Guardian. Someone has to. Though I do the cryptic and nothing else.', 'I read the Guardian. My father-in-law calls me a communist. I call him Derek.'],
    telegraph: ['The Telegraph, every morning. Proper paper. Folds nicely.', 'I take the Telegraph. For the obituaries. Well, the crossword.'],
    none: ['Papers? It\'s all lies. I get my news from Ceefax and the woman in the post office.', 'I don\'t buy a paper. I read the one in the café. Someone always does the crossword in pen. Monster.'],
  },
  crisps: {
    walkers: ['Walkers ready salted. Plain is a flavour, Sam. A noble flavour.', 'Gary Lineker on the Walkers adverts. Nicest man in football. I\'d let him have my crisps.'],
    monster: ['Monster Munch, pickled onion. Make your eyes water and your fingers smell for a week.', 'Monster Munch on your fingers like claws. I still do it. I\'m forty.'],
    quavers: ['Quavers. They melt on your tongue. Like a cheesy cloud.', 'Quavers have no calories. I read it somewhere. Probably on a packet of Quavers.'],
    frazzles: ['Frazzles. Bacon crisps that taste more like bacon than bacon.', 'Frazzles and a pint of shandy. Tea of champions.'],
    wotsits: ['Wotsits. Orange fingers for days.', 'Cheesy Wotsits, Sam. If they\'re good enough for the Royal Family. Which they probably aren\'t.'],
    skips: ['Skips! Prawn cocktail. They fizz on your tongue.', 'Skips and a can of Lilt. Totally tropical taste.'],
    saltvinegar: ['Salt and vinegar or nothing. If your eyes aren\'t watering, what\'s the point?', 'Chipsticks, salt and vinegar. Like a little bag of chips. In crisp form.'],
    hulahoops: ['Hula Hoops on every finger, then eat them one by one. You\'re never too old.', 'Hula Hoops, original. The rings of power.'],
  },
  telly: {
    gladiators: ['Gladiators, Saturday night. Wolf, Jet, Lightning, Hunter. Ulrika shouting "Contenders, ready!" Awooga!', 'I could do the Wall on Gladiators. Well, the bottom bit. The very bottom bit.'],
    houseparty: ['Noel\'s House Party! Mr Blobby. Gotchas. Crinkley Bottom. I\'ve laughed till I cried.', 'I want a Gotcha. I\'ve written to Noel four times. Someone\'s got to set me up.'],
    blinddate: ['Blind Date, Saturday. Cilla. "Our Graham will remind you." I\'d love to go on it.', 'Number one, what\'s your idea of a perfect date? I\'ve got my answer ready. In case.'],
    onlyfools: ['Only Fools and Horses. Del Boy falling through the bar. Never gets old.', 'This time next year, Sam, we\'ll be millionaires. Rodney, you plonker!'],
    onefoot: ['One Foot in the Grave. Victor Meldrew. "I don\'t believe it!" That\'s my husband all over.', 'Victor Meldrew is my spirit animal.'],
    fathered: ['Father Ted. "Down with this sort of thing." I nearly wet myself.', 'Small cows, Sam. These cows are small. Those ones are far away.'],
    fastshow: ['The Fast Show. Suits you, sir! Scorchio! I\'ll get me coat!', 'Swiss Toni. "Making love to a beautiful woman is like..." My husband does it at dinner parties.'],
    xfiles: ['The X-Files. Mulder and Scully. The truth is out there. Out where, though?', 'I watch the X-Files with the lights off. Then I can\'t sleep. Every week.'],
    countdown: ['Countdown. Richard Whiteley, Carol Vorderman, the clock. My afternoons are sacred.', 'I got a seven-letter word on Countdown and nobody was there to see it.'],
    bigbreakfast: ['The Big Breakfast. Chris Evans and Gaby Roslin. Zig and Zag. Can\'t start the day without it.', 'Paula Yates on the bed, Zig and Zag shouting. It\'s chaos and I love it.'],
    menbehaving: ['Men Behaving Badly. Gary and Tony and a fridge full of lager. That\'s my husband\'s dream life.', 'Men Behaving Badly is a documentary as far as I\'m concerned.'],
    casualty: ['Casualty, Saturday night. Somebody always falls off a ladder in the first five minutes.', 'I watch Casualty and diagnose people before Charlie does.'],
  },
};
