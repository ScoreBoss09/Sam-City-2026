// Talk that needs something to exist in town before anyone says it (no pub talk before there's a pub), what people
// wish the town had, and what they say about things just built. Plain data: mods can add to it.

/** A line that matches the pattern is only said if one of these buildings is finished. */
export const NEEDS = [
  [/chip ?shop|chippy|saveloy|battered sausage/i, ['chippy']],
  [/\bpub\b|pints?\b|landlord|last orders|lager|bitter\b|jukebox|snakebite|bacardi|hooch|babycham|pub quiz/i, ['tavern', 'wmc', 'nightclub', 'snooker']],
  [/video shop|blockbust|rental/i, ['video']], [/bookie/i, ['bookies']], [/launderette/i, ['launderette']],
  [/\bschool\b|teacher|double maths|playground/i, ['school', 'secondary']], [/vicar|church|hymn|songs of praise|sermon/i, ['church', 'chapel']],
  [/post office/i, ['postoffice']], [/newsagent|paper round/i, ['newsagent']], [/cinema|the pictures/i, ['cinema']], [/bingo/i, ['bingo']],
  [/supermarket/i, ['supermarket']], [/curry|vindaloo|tikka/i, ['curryhouse']], [/kebab/i, ['kebab']], [/nightclub|the ritzy/i, ['nightclub']],
  [/library/i, ['library']], [/\bclinic\b|the doctor'?s|surgery/i, ['clinic', 'surgery']], [/police station|coppers?\b|bobbies/i, ['police', 'watchhouse']],
  [/bandstand|brass band/i, ['bandstand']], [/cricket/i, ['ballfield']], [/arcade/i, ['arcade']], [/bowling/i, ['bowling']],
  [/\bcarts?\b|carter|horse and cart|\bBoxer\b/, ['stables']], [/fire station|fire engine|fire brigade/i, ['firestation']], [/railway station|the station\b|the trains?\b/i, ['railstation', 'monostation']],
  [/allotment/i, ['allotment']], [/village hall/i, ['villagehall']], [/the bakery/i, ['bakery']], [/Red Lion|beer garden|function room/i, ['tavern']], [/harbour/i, ['harbour']],
  [/greasy spoon|the caf[eé]\b/i, ['cafe']], [/hospital/i, ['clinic']], [/the bank\b|cash machine/i, ['bank']], [/leisure centre|wave machine/i, ['leisure']], [/youth club/i, ['youthclub']],
  [/the shop\b|corner shop/i, ['shop', 'supermarket', 'newsagent']], [/the Ritzy|\bRitzy\b/i, ['nightclub']],
];
/** Lines about a husband, wife or in-laws: single folk only say these when they've nothing else to say. */
export const SPOUSE_RE = /\b(my|the) (husband|wife|missus|fella)\b|\b(him|her) indoors\b|mother-in-law|\bin-laws\b/i;
/** Town news, from the message feed: [pattern, news key]. Named groups a, b (people) and bld (a building) are kept for the gossip (NEWS_TALK in talkworld.js). */
export const NEWS_RULES = [
  [/The fire at the (?<bld>.+?) is out/, 'fireout'], [/The (?<bld>.+?) is on fire/, 'fire'], [/fire has broken out at the (?<bld>.+?) in the dead/, 'fire'],
  [/riot police|Windows smashed|car has been set alight/i, 'riot'], [/protest outside the (?<bld>[^:]+):/i, 'protest'],
  [/(?<a>[A-Z][\w'-]+(?: [A-Z][\w'-]+)?) has five numbers on the National Lottery/, 'lottery'], [/Morris dancers/, 'morris'], [/ice-cream van/, 'icecream'], [/pig has escaped/, 'pig'],
  [/TV crew/, 'tvcrew'], [/street party/i, 'streetparty'], [/car boot sale/i, 'carboot'], [/water main/, 'watermain'], [/Snowball fight/i, 'snowballs'], [/car prang/, 'prang'],
  [/Power cut!/, 'powercut'], [/FLOOD!/, 'flood'], [/Drought!/, 'drought'], [/Raiders are landing/, 'raid'],
  [/(?<a>.+?) and (?<b>.+?) are getting married/, 'wedding'], [/^(?<a>\S+) and (?<b>\S+) are married/, 'wedding'], [/(?<a>.+?) and (?<b>.+?) are now a couple/, 'couple'],
  [/(?<a>.+?) and (?<b>.+?) have a new addition to the family/, 'baby'], [/(?<a>.+?) passed away/, 'lift'], [/(?<a>.+?) was taken up the Lift/, 'lift'], [/(?<a>.+?) has been taken up the Lift\. Nobody/, 'lift'],
  [/An ambulance is on its way to (?<a>.+?)\./, 'hurt'], [/(?<a>.+?) is being patched up/, 'hurt'], [/balaclavas are heading for the (?<bld>.+?)!/, 'robbery'],
  [/(?<a>\S+) and (?<b>\S+) came to blows/, 'brawl'], [/Mass brawl/, 'brawl'], [/(?<a>.+?) is cooling off in the/, 'nicked'], [/Sam was arrested/, 'samnicked'], [/caught a \w+!/, 'caught'],
  [/fête is on/, 'fete'], [/bonfire is lit/i, 'bonfire'], [/Happy New Year/, 'newyear'], [/is in Sam City today! (?<a>.+?) has just come down/, 'guest'],
  [/(?<a>.+?) has been out of work for over a week/, 'roughsleeper'], [/function room upstairs/, 'functionroom'], [/cricket/i, 'cricket'], [/SIRIUS/, 'stagelight'],
];
/** Things people wish the town had (said to Sam when it hasn't got one yet). */
export const WISHES = {
  tavern: ['We need a proper pub, Sam. Somewhere to have a pint after work.', 'A town without a pub isn\'t a town. It\'s a waiting room.'],
  chippy: ['I\'d give my right arm for a chip shop. Cod and chips on a Friday, that\'s all I ask.', 'No chippy? What do people eat on a Friday?'],
  school: ['The kids need a school, Sam. They\'re running feral.', 'If there was a school I could have a cup of tea in peace.'],
  clinic: ['What happens if somebody gets ill round here? We need a doctor.', 'My knee\'s playing up and there\'s nowhere to go.'],
  surgery: ['A doctor\'s surgery would be nice. I\'ve had this cough since March.'],
  church: ['We should have a church. For weddings, christenings, and that.'], chapel: ['A little chapel would be lovely. Somewhere quiet on a Sunday.'],
  newsagent: ['Where am I supposed to get my paper? And my Lottery ticket?', 'A newsagent, Sam. For the paper, sweets and twenty Embassy.'],
  postoffice: ['A post office would save me a trip. Where do I get my pension?'], bakery: ['Fresh bread! A bakery! Is that too much to ask?'],
  police: ['We need some proper police. I don\'t feel safe at night.'], watchhouse: ['Somebody should keep an eye on things at night. A watchman or something.'],
  park: ['Somewhere green to sit, Sam. A park. With benches.'], bandstand: ['A bandstand! For a bit of music on a Sunday.'], ballfield: ['A cricket green. Then we\'d really be an English village.'],
  video: ['A video shop would be the thing. Friday night, a takeaway and a film.'], library: ['A library, Sam. Somewhere warm and quiet.'],
  supermarket: ['One of them big supermarkets would be handy. Everything under one roof.'], cinema: ['A cinema! Toy Story\'s on and I\'ve got nowhere to see it.'],
  launderette: ['A launderette would change my life. I\'m not even joking.'], bank: ['There\'s nowhere to put my money but under the mattress.'], firestation: ['If there\'s a fire we\'re done for. We need a fire station.'],
};
/** What people say about something that's just been finished. {bld} is its name. */
export const RECENT = {
  _: ['Have you seen the new {bld}? Smashing job.', 'The {bld} has really smartened the place up.', 'Everyone\'s talking about the new {bld}.', 'I walked past the {bld} this morning. Lovely.'],
  tavern: ['The {bld}\'s open! First round\'s on you, Sam.', 'Been in the {bld} yet? Nice pint, that.'],
  chippy: ['The {bld}\'s open! The smell of vinegar on a Friday night. Heaven.', 'Had my first fish supper from the {bld}. Proper job.'],
  school: ['The kids have started at the {bld}. The peace and quiet!', 'My lad says the {bld} is "well boring". So it\'s working.'],
  clinic: ['Good to have the {bld}. Peace of mind, that.'], surgery: ['The doctor at the {bld} looked at my knee. Said "hmm". Very reassuring.'],
  church: ['Lovely, the {bld}. I\'ll be there on Sunday.'], chapel: ['The {bld} is ever so pretty. They do a nice service.'],
  newsagent: ['Got my paper from the {bld}! And a Lottery ticket. It could be me.'], cricket: [],
  police: ['Feel safer with the {bld} there, I do.'], park: ['I had my lunch in the {bld}. On a bench. Like a proper town.'],
};
