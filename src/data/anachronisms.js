// Slips from the year it really is. Somebody says something from 2026, catches themselves and puts it right with
// something from 1995 (often too quickly). Sam notices the odd word (w) and wonders about it.
//   s: what slips out, c: the correction, w: the word Sam wonders about. Plain data: mods and writers can add their own.
export const ANACHRONISMS = [
  { s: 'Hang on, let me just check my phone—', c: 'my... Filofax. Let me check my Filofax.', w: 'phone' },
  { s: 'Have you seen that new series on Netflix?', c: 'On the telly, I mean. BBC Two. Wednesday nights.', w: 'Netflix' },
  { s: 'I\'ll just Google it—', c: 'look it up. In the library. In a book.', w: 'Google' },
  { s: 'I\'ll WhatsApp you the details—', c: 'ring you. On the landline. After six, when it\'s cheaper.', w: 'WhatsApp' },
  { s: 'Our Jade\'s never off TikTok.', c: 'Her Tamagotchi! Never off her Tamagotchi.', w: 'TikTok' },
  { s: 'Just tap your card on the—', c: 'sorry, cash only. Obviously. Cash.', w: 'tap your card' },
  { s: 'The Wi-Fi\'s rubbish down this end.', c: 'The wireless, I mean. The radio. Can\'t get Radio 1.', w: 'Wi-Fi' },
  { s: 'Is my Uber here yet?', c: 'My taxi. Minicab. The minicab.', w: 'Uber' },
  { s: 'Let\'s take a selfie!', c: 'A photo. With a camera. A disposable one. From Boots.', w: 'selfie' },
  { s: 'I saw it on the group chat—', c: 'down the pub. Somebody said it down the pub.', w: 'group chat' },
  { s: 'Stick it on Facebook—', c: 'on the noticeboard. At the church hall.', w: 'Facebook' },
  { s: 'Ask Alexa, she\'ll know—', c: 'Alex. My cousin Alex. He knows everything.', w: 'Alexa' },
  { s: 'Since the pandemic it\'s all gone quiet round here.', c: 'Since the... miners\' strike. That\'s what I meant.', w: 'the pandemic' },
  { s: 'I\'ll screenshot that—', c: 'remember it. I\'ll remember it. In my head.', w: 'screenshot' },
  { s: 'I\'ve gone vegan, me.', c: 'Veggie. Like Linda McCartney. Sausages and that.', w: 'vegan' },
  { s: 'It\'s giving main character energy.', c: 'It\'s... ace. Top. Mint. Wicked.', w: 'main character energy' },
  { s: 'Back in 2019 we had a lovely summer.', c: '1979! 1979. Long time ago now.', w: '2019' },
  { s: 'Roll on 2027—', c: '1996! Roll on 1996. Nearly there.', w: '2027' },
  { s: 'My smart meter says the gas is—', c: 'the gas man. The gas man says.', w: 'smart meter' },
  { s: 'I\'ll stream it later.', c: 'Tape it. Off the telly. On a VHS. Long play.', w: 'stream it' },
  { s: 'Pop it in the cloud—', c: 'in the... loft. In the loft. In a box.', w: 'the cloud' },
  { s: 'Can you AirDrop me that?', c: 'Post it. Second class is fine.', w: 'AirDrop' },
  { s: 'My Fitbit says I\'ve done ten thousand steps.', c: 'My feet say. My feet. They\'re killing me.', w: 'Fitbit' },
  { s: 'Did you see the King on the news?', c: 'The Queen! The Queen. God bless her.', w: 'the King' },
  { s: 'Mate, that\'s so cringe.', c: 'That\'s... pants. Rubbish. A load of old pants.', w: 'cringe' },
  { s: 'I\'ll Zoom you in the morning.', c: 'I\'ll zoom round. On my bike. In the morning.', w: 'Zoom' },
  { s: 'I got it off Amazon, came next day.', c: 'Out of the Argos catalogue. Took six weeks.', w: 'Amazon' },
  { s: 'Is this place on Google Maps?', c: 'In the A to Z. Is it in the A to Z.', w: 'Google Maps' },
  { s: 'The kids just want to be YouTubers now.', c: 'Blue Peter presenters. They all want to be on Blue Peter.', w: 'YouTubers' },
  { s: 'My ring doorbell caught him on camera.', c: 'My... neighbour. Nosy Pat. Pat saw him.', w: 'ring doorbell' },
];
// what Sam makes of it (in the log): {w} is the odd word; {p} / {P} he or she (whoever said it), {him} him or her
export const SAM_WONDERS = [
  '"{w}"? What\'s a {w}?',
  '{w}. Never heard of it. And {p} went red when {p} said it.',
  'There it is again. "{w}". Like something that slipped out.',
  'Why did {p} look up at the sky when {p} said "{w}"?',
  'Everybody keeps saying words that aren\'t words. "{w}".',
  '"{w}". I\'m writing that one down.',
];
// a neighbour, overhearing, covers for them
export const COVER_UPS = ['Ha! {P}\'s always saying daft things.', 'Don\'t mind {him}, {p}\'s had a long day.', 'Shhh!', 'Ignore {him}, Sam. Too much sun.', 'Right! Who wants a cup of tea?'];
