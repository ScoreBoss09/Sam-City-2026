// How each townsperson talks: where they're from (regional greetings, goodbyes, little asides), a personal verbal tic,
// a catchphrase, and what they say when Sam comes back for another chat. Every sim gets a stable mix of these from their
// name (see Talk.voice), so the same person always sounds like themselves. Plain data: mods can push to any list.
// Placeholders as in dialogue.js: {first}, {p} (partner), {a} {b} (other residents), {town}, {hobby}, {team}, {day}.

/** Regions. The first eight match the dialects in look.dialect (Population.makePerson); the rest are for everyone else. */
export const REGIONS = {
  north: {
    towns: ['Wigan', 'Bolton', 'Rochdale', 'Stockport', 'Oldham', 'Bury', 'Preston', 'Blackburn', 'Salford', 'Burnley', 'Lancaster'],
    greet: ['Now then, Sam.', 'Alright, love?', 'Hiya, chuck!', 'Ey up, Sam, how do?', 'Ooh, hello, love. Come here.', 'Now then, stranger.', 'Alright, cock?'],
    bye: ['Ta-ra, love.', 'See you in a bit, chuck.', 'Ta-ra, Sam. Mind how you go.', 'Right, I\'m off for a brew.', 'Go on, get yourself home, love.'],
    tag: [', love', ', chuck', ', our kid', ', cock'],
    say: ['I\'m that nesh I\'ve had a vest on since September.', 'Put the kettle on, love, I\'m spitting feathers.', 'You can\'t beat a barm cake with chips in. You can\'t.', 'It\'s gone dead dark already. It\'s like living in a coal hole.', 'I\'ve been mithered all day, Sam. Mithered.', 'I said to her, I said, you\'re having me on.', 'Down the ginnel, past the chippy, you can\'t miss it.', 'That\'s summat and nowt, that.'],
    home: ['I\'m Lancashire born and bred. We put chips on everything and we\'re proud of it.', 'Where I come from, you get rain sideways and a pie for a fiver. Lovely.', 'Back home, our street had a corner shop, a chippy and a pub. That was it. That was plenty.'],
  },
  yorks: {
    towns: ['Barnsley', 'Halifax', 'Doncaster', 'Rotherham', 'Harrogate', 'Huddersfield', 'Wakefield', 'Bradford', 'Scarborough', 'Whitby', 'Leeds'],
    greet: ['Ey up, Sam.', 'Now then, lad.', 'Ey up, love. Y\'alright?', 'How do, Sam?', 'Now then. Owt happening?', 'Ey up, it\'s the gaffer.'],
    bye: ['Ta-ra, lad.', 'See thee, Sam.', 'Right, I\'m off. Ta-ra.', 'Mind how tha goes.', 'Ta-ra, love. Don\'t do owt daft.'],
    tag: [', lad', ', love', ', tha knows', ', like'],
    say: ['Hear all, see all, say nowt. That\'s my motto.', 'If tha ever does owt for nowt, do it for thysen.', 'By \'eck, it\'s parky today.', 'Don\'t be mardy, Sam, it doesn\'t suit thee.', 'I\'m not tight. I\'m careful. There\'s a difference.', 'Yorkshire pudding is a starter, not a side. Fight me.', 'Proper Yorkshire tea or nowt. None of that fancy stuff.', 'It\'s nobbut a mile up the road.'],
    home: ['God\'s own county, me. Don\'t let anyone tell you different.', 'Back home it\'s all moors, mills and rain. I miss it something rotten.', 'Yorkshire through and through. Cut me in half and I\'ve got it written down the middle like a stick of rock.'],
  },
  cockney: {
    towns: ['Bethnal Green', 'Walthamstow', 'Romford', 'Lewisham', 'Bermondsey', 'Dagenham', 'Peckham', 'Basildon', 'Stepney', 'Bow'],
    greet: ['Alright, guv?', 'Wotcha, Sam!', 'Oi oi, here he is!', 'Cor, look who it is!', 'Alright, me old china?', 'Hello, hello, what\'s all this then?', 'Watcha, sunshine!'],
    bye: ['Laters, guv.', 'Be lucky, Sam.', 'Cheerio, me old mucker.', 'Mind how you go, sunshine.', 'Ta-ta for now, innit.', 'Keep your pecker up.'],
    tag: [', innit', ', guv', ', mate', ', son', ', sunshine'],
    say: ['Cor blimey, my plates of meat are killing me.', 'I was up the apples and pears before you could say knife.', 'Use your loaf, Sam.', 'Have a butcher\'s at that.', 'He\'s a right geezer, him.', 'I tell you what, that\'s a right liberty.', 'Don\'t mug me off, Sam.', 'It\'s all gone a bit Pete Tong, innit.'],
    home: ['East End, me. My nan was born within the sound of Bow bells and never let anyone forget it.', 'Back home we had pie and mash on a Saturday and a knees-up every other.', 'I\'m a Londoner. Everything up here is cheaper and slower and I love it.'],
  },
  brummie: {
    towns: ['Birmingham', 'Solihull', 'Sutton Coldfield', 'Erdington', 'Kings Heath', 'Small Heath', 'Acocks Green', 'Selly Oak'],
    greet: ['Alright, bab?', 'Ow do, Sam!', 'Y\'alright, bab?', 'Ello, Sam, our kid!', 'Ey up, bab, where you off to?'],
    bye: ['Tara-a-bit, bab.', 'See ya, bab.', 'Tara, Sam!', 'Right, I\'m off up the Bull Ring. Joking. Tara!'],
    tag: [', bab', ', our kid', ', mate'],
    say: ['That\'s bostin\', that is.', 'I\'m going to have a cob for me dinner. A cob! A bread roll! Honestly.', 'Bit of a gooseberry, that one.', 'Spaghetti Junction, Sam. You haven\'t lived till you\'ve gone round it four times.', 'I\'m not being funny, bab, but that\'s well dodgy.', 'Ozzy Osbourne went to my cousin\'s school. Allegedly.'],
    home: ['Brum, me. Second city. Don\'t let anyone call it the third.', 'Where I\'m from there\'s more canals than Venice. Fact. Look it up.', 'We had the Rotunda and the Bull Ring. You lot have got a Stockyard.'],
  },
  west: {
    towns: ['Taunton', 'Bristol', 'Yeovil', 'Truro', 'Penzance', 'Exeter', 'Bridgwater', 'Weston-super-Mare', 'Barnstaple', 'Frome'],
    greet: ['Alright, my lover?', 'Hello, my ansum!', 'Ow be on, Sam?', 'Alright, me dear?', 'Morning, my lover. Proper day, idn\'t it?'],
    bye: ['Cheers, drive!', 'See you dreckly, my lover.', 'Ta-ra, me dear.', 'Gert lush talking to you, Sam.', 'Right, I\'m off for a drop of scrumpy.'],
    tag: [', my lover', ', my ansum', ', me dear', ', idn\'t it'],
    say: ['Where\'s that to, then?', 'I\'ll do it dreckly. Dreckly means when I feel like it.', 'That\'s proper job, that is.', 'Nothing a drop of cider won\'t sort.', 'Jam first, then cream. Anyone tells you different, they\'re from Devon.', 'Gert lush, that is. Gert lush.', 'Ooh arr. Sorry. I only do that for the tourists.'],
    home: ['West Country, me. Cider, cream teas and a combine harvester. Like the song.', 'Back home it\'s all lanes too narrow for two cars and a tractor in front of you.', 'I grew up by the sea. Pasties for dinner, pasties for tea.'],
  },
  scouse: {
    towns: ['Liverpool', 'Birkenhead', 'Bootle', 'Kirkby', 'Huyton', 'Wallasey', 'Anfield', 'Toxteth', 'Crosby'],
    greet: ['Alright, la?', 'Ey, Sam, la, how\'s it going?', 'Alright, lad? Sound.', 'Ey up, la!', 'Ey, it\'s our Sam!', 'Alright, kidda?'],
    bye: ['See ya, la.', 'Ta-ra, lad. Sound.', 'Laters, la. Be good.', 'Ey, calm down, calm down. I\'m only going.', 'Ta-ra well!'],
    tag: [', la', ', lad', ', kidda', ', like'],
    say: ['That\'s boss, that.', 'I\'m made up, me.', 'Sound, la. Dead sound.', 'Ey, calm down, calm down! Sorry. Everyone says that to me since Harry Enfield.', 'Scouse for tea. You haven\'t lived.', 'It\'s dead good, that, la.', 'Ey, I\'m not being funny but that\'s well rotten.', 'Me ma would go spare.'],
    home: ['Liverpool, me. Two cathedrals, two football teams, one sense of humour.', 'Where I\'m from you can\'t walk ten yards without someone telling you a joke or nicking your hubcaps. Joking. Mostly.', 'Back home I could see the Liver Birds from my nan\'s bedroom window.'],
  },
  geordie: {
    towns: ['Newcastle', 'Gateshead', 'South Shields', 'Byker', 'Whitley Bay', 'Jarrow', 'Wallsend', 'North Shields'],
    greet: ['Howay, Sam!', 'Alreet, pet?', 'Whey aye, it\'s Sam!', 'Now then, bonny lad.', 'Alreet, hinny?', 'How man, Sam!'],
    bye: ['Ta-ra, pet.', 'Howay then, see ya.', 'Laters, bonny lad.', 'Gan canny, Sam.', 'Ta-ra, hinny. Divvent be a stranger.'],
    tag: [', pet', ', man', ', like', ', hinny'],
    say: ['Whey aye, man!', 'It\'s canny out, like.', 'Divvent be daft, man.', 'I\'m gannin\' yem soon. Home. I\'m going home.', 'I\'m clamming for a cuppa, pet.', 'That\'s a canny bit of work, that.', 'Haddaway and sh... Sorry. Haddaway.', 'Toon Army, man! Keegan\'s boys!'],
    home: ['Geordie, me. Where the bridges are bigger than your ego and the Brown Ale\'s stronger.', 'Back home I\'d walk over the Tyne Bridge every morning. Now I walk past a Stockyard.', 'Newcastle born. We went out in T-shirts in January. Never owned a coat.'],
  },
  posh: {
    towns: ['Cheltenham', 'Henley', 'Tunbridge Wells', 'Guildford', 'Harrogate', 'Winchester', 'Windsor', 'Bath', 'Marlow'],
    greet: ['Oh, hello, Sam. How frightfully nice.', 'Sam, darling!', 'Good morning, Sam. Or is it afternoon? One loses track.', 'Ah, Sam. Splendid.', 'Hello, old thing.'],
    bye: ['Toodle-pip!', 'Must dash, darling.', 'Cheerio, Sam. Do keep in touch.', 'Ta-ta, old thing.', 'Righto. Mwah, mwah.'],
    tag: [', darling', ', old thing', ', what', ', dear'],
    say: ['One simply doesn\'t, does one?', 'Mummy would be appalled. Absolutely appalled.', 'It\'s all a bit common, isn\'t it? But terribly fun.', 'I had Pimm\'s at Henley this summer. Rained the whole time. Marvellous.', 'Daddy says the Lottery is a tax on the hopeful.', 'I simply adore a village fête. So quaint.', 'We used to have a Labrador called Horlicks.', 'Is there anywhere round here that does a decent claret?'],
    home: ['I grew up in a rather large house in the Cotswolds. Draughty. Lovely.', 'Boarding school, then a gap year in Goa, then here. Don\'t ask.', 'Mummy and Daddy still don\'t know I\'m here. They think I\'m in Verbier.'],
  },
  plain: {
    towns: ['Kettering', 'Swindon', 'Bedford', 'Ipswich', 'Norwich', 'Lincoln', 'Peterborough', 'Reading', 'Northampton', 'Luton', 'Stevenage', 'Crawley'],
    greet: ['Hello, Sam.', 'Alright, Sam?', 'Hiya, Sam.', 'Oh, hello there.', 'Morning, Sam. Or whatever it is.', 'Oh, Sam! Hello.'],
    bye: ['Bye, Sam.', 'See you, Sam.', 'Cheers then.', 'Take care now.', 'Catch you later.'],
    tag: [', mate', ', Sam'],
    say: ['Can\'t complain. Well, I can. I just don\'t.', 'Nothing ever happens where I\'m from. That\'s why I like it here. Same, really.', 'I like a nice roundabout. Don\'t judge me.', 'It\'s the little things, isn\'t it?', 'Bit of a nothing day. I like those.'],
    home: ['I\'m from a perfectly normal town with a perfectly normal shopping precinct. You\'ve never heard of it.', 'Where I grew up there was a ring road, a Woolworths and a man who sold hot dogs outside the station. Happy days.', 'Home was a new town. Roundabouts everywhere. I still dream about roundabouts.'],
  },
  scottish: {
    towns: ['Glasgow', 'Edinburgh', 'Dundee', 'Aberdeen', 'Paisley', 'Kilmarnock', 'Falkirk', 'Stirling', 'Inverness'],
    greet: ['Awright, Sam?', 'Hiya, pal!', 'Och, it\'s yersel!', 'How\'s it gaun, Sam?', 'Aye, hello there.', 'Well, if it isnae Sam.'],
    bye: ['Cheerio, pal.', 'See ye efter, Sam.', 'Haste ye back!', 'Right, I\'m away.', 'Mind how ye go, pal.'],
    tag: [', pal', ', ken', ', aye', ', so it is'],
    say: ['It\'s a dreich day, Sam. Dreich.', 'Och, dinnae fash yersel.', 'I could murder a can of Irn-Bru.', 'That\'s pure magic, so it is.', 'Ye cannae beat a square sausage on a roll.', 'Jings, crivvens, help ma boab!', 'You call this cold? This is T-shirt weather where I\'m from.', 'I\'m no being funny but that\'s a load of mince.'],
    home: ['I\'m from Glasgow. People make a lot of jokes. Most of them are true.', 'Back home it rained so much the sheep had gills. Feels like home here, Sam.', 'Scotland, me. I saw Braveheart four times. Mel Gibson\'s accent was mince but I still cried.'],
  },
  welsh: {
    towns: ['Swansea', 'Cardiff', 'Newport', 'Merthyr', 'Llanelli', 'Aberystwyth', 'Bangor', 'Wrexham', 'Pontypridd', 'Rhyl'],
    greet: ['Hiya, Sam! Alright, butt?', 'Alright, love? Tidy.', 'Shwmae, Sam!', 'Oh, hiya! How be?', 'Well, look who it is, now.'],
    bye: ['Ta-ra now, Sam.', 'See you now in a minute.', 'Hwyl, Sam!', 'Ta-ra, butt. Tidy.', 'Come here, give us a cwtch. No? Ta-ra then.'],
    tag: [', butt', ', love', ', isn\'t it', ', now'],
    say: ['That\'s tidy, that is.', 'I\'ll do it now in a minute. Which means later.', 'Give us a cwtch, Sam. Go on.', 'Lush! Absolutely lush.', 'Where to are you off?', 'Duw, Duw, it\'s hot.', 'Tom Jones is from near my mam\'s. She\'s still got the knickers she nearly threw.', 'Rugby\'s a religion where I\'m from. Chapel second.'],
    home: ['Valleys, me. Chapel, choir and coal. Well, not the coal any more.', 'Back home everyone knew everyone. And everyone\'s business. Like here, really.', 'I\'m Welsh. We sing. Get used to it.'],
  },
  midlands: {
    towns: ['Nottingham', 'Derby', 'Leicester', 'Mansfield', 'Loughborough', 'Chesterfield', 'Burton', 'Coventry'],
    greet: ['Ay up, me duck!', 'Alright, duck?', 'Ay up, Sam, how\'s tha doing?', 'Ello, me duck. Y\'alright?', 'Ay up, look who it is.'],
    bye: ['Tara, me duck.', 'See ya, duck.', 'Right, I\'m off, duck. Tara.', 'Mind how you go, me duck.'],
    tag: [', me duck', ', duck', ', youth'],
    say: ['It\'s black over Bill\'s mother\'s. It\'ll rain.', 'I\'m mashing a pot of tea in a minute, duck.', 'Gizza cob, I\'m clammed.', 'It\'s nesh out, duck. Wrap up.', 'Robin Hood was from my way. He\'d have done well here.'],
    home: ['East Midlands, me. Nobody knows where it is, including us.', 'Back home it was pit villages and a market every Saturday. Proper community.', 'I\'m from near Nottingham. Robin Hood, lace and Brian Clough. That\'s all you need.'],
  },
};
/** Regions for people whose look has no dialect (weighted by repeats). */
export const REGION_FALLBACK = ['plain', 'plain', 'plain', 'plain', 'scottish', 'welsh', 'midlands', 'midlands', 'north', 'yorks'];

/** A personal verbal tic: `pre` goes before a sentence, `suf` replaces the full stop at the end. Each sim has one. */
export const TICS = {
  adult: [
    { pre: 'To be fair, ' }, { pre: 'At the end of the day, ' }, { pre: 'I\'m not being funny, but ' }, { pre: 'If you ask me, ' }, { pre: 'Honestly, ' },
    { pre: 'Between you and me, ' }, { pre: 'I tell you what, ' }, { pre: 'As it goes, ' }, { pre: 'Basically, ' }, { pre: 'Mind you, ' }, { pre: 'Truth be told, ' },
    { pre: 'Well, I mean, ' }, { pre: 'Funnily enough, ' }, { pre: 'Thing is, ' }, { pre: 'Put it this way, ' }, { pre: 'Don\'t quote me, but ' }, { pre: 'Not being funny, ' },
    { suf: ', know what I mean?' }, { suf: ', if you know what I mean.' }, { suf: ', to be fair.' }, { suf: ', and that\'s the truth.' }, { suf: ', so there you go.' },
    { suf: ', bless.' }, { suf: ', touch wood.' }, { suf: ', as they say.' }, { suf: ', you know?' }, { suf: ', and Bob\'s your uncle.' }, { suf: ', apparently.' },
    { suf: ', I swear.' }, { suf: ', or so they tell me.' }, { suf: ', end of.' }, { suf: ', God love it.' }, { suf: ', no word of a lie.' }, { suf: ', like I always say.' },
    { suf: ', mark my words.' }, { suf: ', but there you are.' }, { suf: ', you follow?' }, { suf: '. Cor blimey.' }, { suf: '. Bless him.' }, { suf: ', isn\'t it?' },
  ],
  kid: [
    { pre: 'Like, ' }, { pre: 'Guess what? ' }, { pre: 'Basically, ' }, { pre: 'Right, so, ' }, { pre: 'Honest, ' },
    { suf: ', and that.' }, { suf: '. Wicked!' }, { suf: '. Honest!' }, { suf: '. Cross my heart.' }, { suf: '. NOT!' }, { suf: ', innit.' }, { suf: '. Ace!' }, { suf: ', like.' },
  ],
};

/** Each person's own catchphrase, said now and then. */
export const CATCHPHRASES = {
  adult: [
    'Lovely jubbly.', 'Mustn\'t grumble.', 'Every day\'s a school day.', 'It\'ll all come out in the wash.', 'Worse things happen at sea.', 'You couldn\'t make it up.',
    'Well, I\'ll go to the foot of our stairs.', 'Well, I\'ll be blowed.', 'Don\'t get me started.', 'That\'s the way the cookie crumbles.', 'Every cloud, Sam. Every cloud.',
    'You\'re only young once. Twice if you\'re lucky.', 'Can\'t say fairer than that.', 'Nice to see you, to see you... nice!', 'I don\'t believe it!', 'Cushty.',
    'It\'s all swings and roundabouts.', 'Cheap as chips, me.', 'Keep calm and put the kettle on.', 'Life\'s too short for instant coffee.', 'Same again tomorrow, eh?',
    'Waste not, want not.', 'It never rains but it pours.', 'You\'ll be alright, Sam. You\'ve got a kind face.', 'Laugh or you\'ll cry, that\'s what I say.',
    'Proper job.', 'There\'s nowt as funny as folk.', 'Champion!', 'Smashing, super, great!', 'Say what you see!', 'I\'ve started so I\'ll finish.',
    'Today I have been mostly... standing here.', 'Scorchio!', 'Suits you!', 'I\'ll get me coat.', 'Brilliant! Brilliant!', 'Look at what you could have won.',
    'Don\'t have nightmares.', 'Pass the sick bag, Alice.', 'Cowabunga. No, I don\'t know why I said that either.', 'If it\'s not one thing it\'s another.',
    'Steady the Buffs!', 'Bob\'s your uncle, Fanny\'s your aunt.', 'Right as rain.', 'Not on my watch.', 'Chin up, chest out.', 'It\'s all go round here.',
    'Never a dull moment.', 'Can\'t win \'em all.', 'Ooh, you are awful. But I like you.', 'What\'s for tea?', 'Hey ho, off we go.', 'Onwards and upwards.',
    'Tomorrow\'s another day.', 'One day at a time, Sam.', 'Little and often, that\'s the trick.', 'Stick the kettle on, I\'ll be two minutes.', 'More tea, vicar?',
    'Same old, same old.', 'You know me.', 'Give over!', 'Get away!', 'Well, there you go.', 'What a palaver.', 'Who\'d have thought it?', 'Strewth.',
    'Happy days.', 'Nice one, Sam.', 'Sorted.', 'Bob on.', 'I should cocoa.', 'Gordon Bennett!', 'Blimey O\'Reilly!', 'Heavens to Betsy.',
  ],
  kid: ['Wicked!', 'Ace!', 'Mint!', 'As if!', 'Whatever!', 'Cowabunga!', 'It\'s Morphin\' time!', 'Awooga!', 'Talk to the hand!', 'No way, Jose!', 'Not!', 'Eat my shorts!', 'Shut up! No way!', 'Bagsy!', 'Wicked in the extreme!', 'Gnarly!'],
};

/** Said at the start when Sam comes back. again = same day, yesterday, long = over a week, often = lots of chats. */
export const MEMORY = {
  again: ['Back again, Sam? People will talk.', 'Twice in one day! Are you after something?', 'Forget something, Sam?', 'Oh, hello again. Miss me?', 'You again! I\'ll start charging.', 'We must stop meeting like this, Sam.', 'Hello again. I\'ve not done anything since you left, honest.', 'Blimey, Sam, you can\'t keep away.', 'Again? I\'ve not had time to think of anything new.', 'Sam! Back so soon? Sit down before you wear the road out.'],
  yesterday: ['Like I was saying yesterday, Sam...', 'Oh, hello! Two days running. You\'re spoiling me.', 'Sam! Where were we yesterday? Oh yes.', 'Good to see you again. I was thinking about what you said yesterday. Well, not much. A bit.', 'Hello again, Sam. Same time tomorrow?', 'Sam! I told everyone we had a natter yesterday. I\'ve gone up in the world.'],
  long: ['Long time no see, Sam!', 'Ooh, look what the cat dragged in. Where\'ve you been hiding?', 'Sam! I thought you\'d gone up the Lift.', 'Well, well. I\'d nearly forgotten what you looked like.', 'Stranger! Thought you\'d gone off me.', 'There you are! I\'ve saved up loads to tell you.'],
  often: ['Sam, you\'re my best customer. For chats, I mean.', 'You and me, Sam. Like Morecambe and Wise.', 'Honestly, Sam, you\'re the only one who listens.', 'Hello, my favourite visitor.', 'We should get you a chair with your name on.'],
  // follow-ups to what came up last time
  story: ['Did I tell you the latest? I did, didn\'t I. Well, here\'s more.', 'Oh, I\'ve got an update for you.', 'You\'ll never guess what\'s happened since.', 'Remember what I was telling you? Well.'],
  joke: ['I\'ve got another one for you. Ready?', 'Did you get that joke last time? Never mind, here\'s another.'],
  hobby: ['Before you ask, yes, I\'ve been at the {hobby} again.', 'I know, I know, I go on about {hobby}. Can\'t help it.'],
};

/** A child's way of saying hello and bye (a bit of variety on top of dialogue.js). */
export const KID_GREET = ['Sam! Sam! Sam!', 'Hiya Sam! Want to see something?', 'Oi, Sam! Are you playing?', 'Hello Sam. My mum says you\'re in charge. Are you?', 'Sam! Guess what I found!', 'Hiya! I\'m not supposed to be out here.', 'Sam! Do you want to be on my team?', 'Hello! Have you got 10p?', 'Sam! I lost a tooth. Look!', 'It\'s Sam! Everybody, it\'s Sam!', 'Hello, Mr Sam. Or is it just Sam?'];
export const KID_BYE = ['Bye Sam! Race you!', 'See ya! Wouldn\'t wanna be ya!', 'Bye! Gotta go, my tea\'s ready.', 'Laters, alligator!', 'Bye Sam! Don\'t tell my mum you saw me!', 'Ta-ra! I\'m going to be in so much trouble.', 'Bye! You\'re it!', 'See you, Sam! Byeeee!'];
