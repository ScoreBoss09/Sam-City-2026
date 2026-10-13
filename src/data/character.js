// Little things that make each townsperson themselves: a quirk (what they do with their free time and how they talk),
// when they go to bed and get up, and how short their fuse is. Plain data.

export const QUIRKS = [
  { id: 'jogger', label: 'keep-fit fanatic', bed: -0.8, wake: -1.2, temper: 0.3, leisure: 'jog', about: 'I run five miles every morning. In a shell suit. Feel the burn, Sam!',
    lines: ['Feel the burn!', 'Just doing my laps!', 'Eat your greens, Sam!', 'Mr Motivator says hello!'] },
  { id: 'nightowl', label: 'night owl', bed: 2.2, wake: 1.6, temper: 0.4, leisure: 'pub', about: 'I never sleep before one. The night\'s when it all happens.',
    lines: ['Is it morning already? Ugh.', 'Who\'s up for a late one?', 'Night is young, Sam!'] },
  { id: 'earlybird', label: 'early bird', bed: -1.4, wake: -1.6, temper: 0.2, leisure: 'park', about: 'Up with the lark, me. Best part of the day\'s gone by nine.',
    lines: ['Lovely morning for it!', 'You\'re up late. It\'s gone seven!', 'Early to bed, early to rise!'] },
  { id: 'hothead', label: 'short fuse', bed: 0.6, wake: 0.3, temper: 0.95, leisure: 'pub', about: 'People say I\'ve got a temper. I have NOT got a temper!',
    lines: ['What you looking at?', 'Don\'t start.', 'I\'m calm. I\'m CALM.', 'You want some?'] },
  { id: 'gossip', label: 'town gossip', bed: 0.2, wake: 0, temper: 0.3, leisure: 'street', about: 'If it happens in this town, I knew about it first. Usually before it happened.',
    lines: ['Ooh, have you heard?', 'Don\'t tell anyone I told you...', 'You\'ll never guess who I saw!'] },
  { id: 'busker', label: 'street musician', bed: 1.0, wake: 1.0, temper: 0.2, leisure: 'busk', about: 'I play Wonderwall on the high street. Every day. People love it. Mostly.',
    lines: ['Any requests? It\'ll be Wonderwall.', 'Spare 10p for a musician?', 'Today is gonna be the day...'] },
  { id: 'birdwatcher', label: 'twitcher', bed: -0.6, wake: -1.0, temper: 0.1, leisure: 'watch', about: 'Birdwatching. I\'ve seen every bird on this island. All four of them. Always the same four.',
    lines: ['Was that a lesser spotted warbler?', 'Shh! You\'ll scare the gulls.', 'Same four birds. Every day. Odd.'] },
  { id: 'conspiracy', label: 'conspiracy nut', bed: 1.4, wake: 0.8, temper: 0.5, leisure: 'watch', about: 'Crop circles, Elvis in a chip shop in Skegness, the Loch Ness Monster. The truth is out there, Sam.',
    lines: ['The truth is out there.', 'Elvis is alive. Saw him in Woolworths.', 'Crop circles! Explain THAT.', 'Mulder would understand me.'] },
  { id: 'gambler', label: 'flutter on the horses', bed: 0.8, wake: 0.5, temper: 0.6, leisure: 'shop', about: 'One more each-way bet and I\'m quids in. Any day now.',
    lines: ['Got a hot tip on the 3:15!', 'It could be you!', 'Double or quits?'] },
  { id: 'homebody', label: 'homebody', bed: -0.5, wake: 0.2, temper: 0.2, leisure: 'home', about: 'Me? I\'m happiest with my slippers on and the telly on.',
    lines: ['Is Countdown on yet?', 'I\'ll be in if anyone needs me.', 'Kettle\'s always on.'] },
  { id: 'dancer', label: 'dance-floor legend', bed: 1.8, wake: 1.4, temper: 0.4, leisure: 'pub', about: 'I\'ve won every dance-off at the Ritzy since 1994. Ask anyone.',
    lines: ['Heeeey Macarena!', 'Everybody dance now!', 'Watch this move!'] },
  { id: 'worrier', label: 'worrier', bed: -0.2, wake: -0.4, temper: 0.15, leisure: 'home', about: 'Did I leave the iron on? I always think I left the iron on.',
    lines: ['Did I leave the gas on?', 'Is it going to rain? It looks like rain.', 'Mind how you go, Sam, it\'s dangerous out.'] },
  { id: 'raver', label: 'raver', bed: 2.6, wake: 2.0, temper: 0.3, leisure: 'pub', about: 'Every weekend there\'s a party in a field somewhere. You just ring a number and they tell you where. Mad for it.',
    lines: ['Is there a party?', 'Loved up, Sam!', 'Bangin\'!', 'Everybody in the place!'] },
  { id: 'boyracer', label: 'boy racer', bed: 1.6, wake: 1.2, temper: 0.7, leisure: 'street', about: 'Vauxhall Nova, lowered, spoiler, blue lights under the sills. Nought to sixty in about a fortnight.',
    lines: ['Max Power, mate!', 'Heard my exhaust? You will.', 'She\'s got furry dice AND a Halfords spoiler.'] },
  { id: 'gamer', label: 'games nut', bed: 2.0, wake: 1.4, temper: 0.35, leisure: 'home', about: 'Sega or Nintendo? Both. And the PlayStation. And an Amiga for Sensible Soccer.',
    lines: ['Sega!', 'I\'ve finished Sonic in under an hour.', 'Up, up, down, down, left, right...'] },
  { id: 'footy', label: 'football mad', bed: 0.4, wake: 0, temper: 0.6, leisure: 'pub', about: 'Season ticket since I was six. Euro 96, I was at Wembley for the Holland game. Four-one. Shearer, Sheringham, Shearer, Sheringham.',
    lines: ['It\'s coming home!', 'Referee! Are you blind?!', 'Shearer! What a striker.'] },
  { id: 'karaoke', label: 'karaoke king', bed: 1.2, wake: 0.6, temper: 0.25, leisure: 'pub', about: 'Thursday is karaoke at the Red Lion. I do My Way, Wonderwall and a very emotional Total Eclipse of the Heart.',
    lines: ['And now, the end is near...', 'Turn around, bright eyes!', 'Any requests?'] },
  { id: 'trainspotter', label: 'anorak', bed: -0.6, wake: -0.8, temper: 0.1, leisure: 'watch', about: 'Trains, buses, number plates. I keep a notebook. Several notebooks.',
    lines: ['That\'s a Class 47, that is.', 'Got that one in my book already.', 'The 10:14 is running two minutes late.'] },
];

/** The quirk, bedtime, wake time and temper for a new sim (children go to bed earlier and get up for school). */
export function character(kind, age) {
  const q = QUIRKS[Math.floor(Math.random() * QUIRKS.length)], child = kind === 'child' || age < 16, old = age >= 62;
  const bed = child ? 19.3 + Math.random() * 1.6 : 21.4 + q.bed + (Math.random() - 0.5) * 2.2 - (old ? 0.8 : 0);
  const wake = child ? 6.6 + Math.random() * 0.8 : 6.6 + q.wake + (Math.random() - 0.5) * 1.6 - (old ? 0.5 : 0);
  return { quirk: q, bedH: Math.max(19, Math.min(26, bed)), wakeH: Math.max(4.8, Math.min(9.5, wake)), temper: Math.min(1, q.temper + (Math.random() - 0.5) * 0.3) };
}
