# Sam City

Build a town from a single wooden hut, and live in it. You are **Sam**, one of the townsfolk: switch between a top-down planning view and a fully walkable 3D world (first or third person). Nothing is built by magic. Timber is felled, stone is quarried, bricks are fired, food is foraged and farmed, and every building is hauled together and built by hand, by builders or by you. Everyone eats, sleeps, makes friends, falls in love, starts families and grows up.

Playable prototype (Three.js, no build step), structured as a data-driven reference for a future Unity port (`docs/UNITY_PORT.md`).

## Play it
- **In the browser:** https://scoreboss09.github.io/Sam-City-2026/ (one-time setup: repo Settings > Pages > Source "Deploy from a branch" > `gh-pages` / root; the branch appears after the first Actions run).
- **Download:** https://github.com/ScoreBoss09/Sam-City-2026/releases/download/latest/SamCity-playable.zip (rebuilt on every push). Close any old Sam City window first, unzip into a new folder, then double-click `play.bat` (Windows) or run `./play.sh` (Mac/Linux). Needs **Node.js** (nodejs.org, the LTS button) **or** Python 3 installed, just one. Don't open `index.html` directly: browsers won't run the game from a file, and the title screen will say so. The title screen shows the version date so you can check it's the newest; the launcher tells the browser not to keep old copies and picks another port if an old copy is still running.

## Run
```
python3 -m http.server 8000
# open http://localhost:8000/index.html
```
`?scale=0.75` gives a crisper render (default 0.6 = chunky pixel look), `?post=0` turns the pixel-art outline pass off, `?auto` skips the title screen, `?auto&demo` (or the **Demo City** button) builds a lively sandbox town. Progress autosaves in the browser. The main menu has **Continue**, **New Game**, **Load Game** (three save slots), **Demo City** and **Options** (picture quality, volume, sound, controller, raids, adult humour, texture pack, and the controls list).

## Controls
**Keyboard and mouse, Sam:** WASD move, Shift sprint, mouse look (click the view to capture) or arrow keys, V first/third person, E interact, Q eat, I backpack, R drop what you carry, J journal, H hide the help bar, F punch (swing the club during a raid), X kick, B get on/off your bike, C open/close a door, Space jump (high enough to clear a fence), 1-8 emotes (dance, cheer, shrug, facepalm, two fingers, air guitar, clap, think), 9 the Macarena, 0 the robot, G cycles every emote (running man, thumbs up, salute, bow, Mexican wave...), M big map, TAB planning view, Esc the pause menu (save, load, sound, controls).
**Moving like a shooter:** Sam has real momentum now: he speeds up, slows down and swings round instead of sliding, turns before setting off the other way, plants his feet (the stride matches the speed), and lands from a jump with bent knees. Jog by default, Shift / L1 to sprint, Z (or the stick half-pushed) to walk. With a gun: right mouse / L2 aims over the shoulder (Sam strafes and side-steps), left click / F / R2 fires, ○ jumps, and a crosshair shows where the shot goes.

**Combat mode (single player or multiplayer):** Esc / hold CREATE > **Combat mode** turns it on (and off again, back to normal life). A Call of Duty style free-for-all, in first person with the gun in your hands (V / D-pad up switches to over the shoulder): alone you fight bots (rival gangs in shell suits; **Bots** in the same menu sets how many, 0-10), and when hosting your friends join in too. Everyone starts with an assault rifle, a pistol and two frag grenades; the **police station is the armoury**: primaries (assault rifle, SMG, pump shotgun, sniper rifle with a scope, light machine gun) and secondaries (pistol, .357 Magnum, machine pistol, rocket launcher), with ammo and grenades topped up. Magazines and reloads, hip-fire spread that tightens when you aim down the sights, recoil, headshots. Hold the grenade button to see its arc and where it lands; let go to throw. Explosions are big: fireball, flash, shockwave, smoke. Stand, crouch (nearly as quick as walking), go prone, or slide out of a sprint. Melee is a one-hit knock-down at close range. **Cover, GTA style:** next to a wall, a car-height wall, a fence or a pillar, Q / ○ puts your back to it (the camera goes over the shoulder); move along it, stop at the corner, aim to lean out round it (or pop up over low cover) and fire, or fire without aiming to shoot blind without showing yourself. Hidden, you're very hard to hit; leaning out, you're exposed. Bots use cover too: they duck behind walls and pop up or step out to shoot. Hits bleed, the dead go limp as ragdolls, and you're back a few seconds later near the police station. Bots only know what they see (in front of them, in the open; crouching and lying down make you harder to spot) and hear (gunfire and explosions, roughly where), take a moment to react and miss their first shots. First to 20 kills wins the round.

| | Keyboard and mouse | Controller |
|---|---|---|
| Aim down the sights / scope | right mouse | L2 |
| Fire | left click | R2 |
| Jump | Space | ✕ |
| Crouch / prone | C / Z (sprint + C slides) | ○ (hold for prone) |
| Reload | R | □ |
| Take cover / leave cover | Q (or push away from it) | ○ tap next to something (crouches otherwise) |
| In cover: peek out / pop up | aim (right mouse) at an edge, or over low cover | L2 |
| In cover: blind fire | fire without aiming | R2 |
| Swap weapon | 1 / 2 / mouse wheel | △ |
| At the armoury: next primary / secondary | E / R | □ / △ |
| Grenade (hold to aim, release to throw) | G | R1 |
| Sprint (also steadies the scope) | Shift | L1 or L3 |
| Melee | F | R3 |
| First person / over the shoulder | V | D-pad up |

**Keyboard and mouse, planning view:** B opens the Planning menu, WASD pan, Q/E rotate, wheel zoom, right-drag pan, Shift+right-drag tilt, F frame the island, 1-7 tools, R rotate the ghost, Esc cancel, TAB back to Sam. P pauses; the clock buttons set 1x/2x/4x.

**Controller (PlayStation 5 DualSense, or any standard pad; plug it in and press any button). On-screen prompts use the PlayStation symbols:**
| Button | Sam | Planning view |
|---|---|---|
| Left stick | walk | move the map (the yellow cursor is the centre of the screen) |
| Right stick | look | rotate (left/right) and zoom (up/down), smooth |
| ✕ Cross | interact, tap in the green to work, lift up | place, or hold and move to paint paths |
| ○ Circle | emote (press again for the next one) | cancel tool |
| □ Square | punch (club in a raid) | **Planning menu** |
| R2 | kick | zoom out |
| L2 | jump | zoom in |
| △ Triangle | eat, lift down | rotate the building |
| L1 | sprint | previous tool |
| L3 | get on/off your bike | |
| R1 | first/third person | next tool |
| D-pad | up: backpack, down: drop, left: journal, right: open/close a door | up/down: pick a building, left/right: building tab |
| OPTIONS | planning view / Sam | planning view / Sam |
| CREATE | tap: game speed 1x → 2x → 4x → pause; hold: the menu | tap: game speed 1x → 2x → 4x → pause; hold: the menu |
| R3 | big map | frame the whole island |
Menus and the terminal: a button legend appears along the bottom; in the Post and the Lift intercom L1/R1 change tab and the right stick scrolls long letters; the highlight stays on the same button when prices or stock change. D-pad or stick to move (it jumps to the nearest button in that direction, so grids work too), ✕ to press, ○ always goes back / closes. In the Planning menu L1/R1 change page and L2/R2 change category, and the highlight starts on the first card.

## The map and the streets
The island is 320 m across, on a grid of 8 m squares. One square of paved road holds two lanes (traffic keeps left) with a pavement and kerb on each side, and people walk on the pavements. A dirt path is a cart track down the middle with grass verges. Buildings keep their real size and sit at the front of their plot, so smaller homes get a back garden. Woods can be walked into to reach the trees. Saves from before the bigger map can't be continued (the title screen says so); start a new game.

## Horse-and-cart days, and the Lift
Until the Power Plant brings electricity there are no lorries and no cars. Goods you order arrive in the Lift cage and are left on the dock; builders (and Sam) cart them to the Stockyard, two builders at a time, using wheelbarrows once the Builders' Yard has them. The Work queue shows what's waiting at the Lift. Once the power is on, lorries deliver and cars appear on paved roads.

The Lift is a shaft in the ground: the cage rises out of it and sinks back down. Newcomers ride up in it; people who are leaving queue at the edge, step into the cage and go down. It won't go down with Sam on the platform, and the guards' ten-second countdown still applies.

## The ages of the town
The town is built in the materials of its time, and rebuilt (one building at a time) as each new age arrives:
1. **Timber & Thatch** (the start): timber, thatch and rough stone.
2. **Brick & Masonry** (a Brickworks): brick, dressed stone and Tudor timber framing.
3. **Industrial** (a Foundry and a Glassworks): mass brick, iron and steel, big panes of glass; railways and bicycles.
4. **Electric** (a Power Plant): steel frames, concrete, electric light, motor cars and motorbikes.
5. **Modern** (computers): concrete towers, glass facades, monorails and sky lifts.
Buildings and upgrades unlock with their age (no steel tools before there's a foundry); the Planning menu says what the next age needs. Home upgrades now run Upstairs rooms → Tudor makeover → Gas lamps and a bay window → Central heating; yards get Hand carts → Wagons → a Steam engine → a Motor lorry; the Builders' Yard ends with cranes and concrete mixers.

## Moving bushes and rocks
A berry bush or rock where you want to build? Planning view → **🌱 Move plants** (key 8): click the bush or rock, then click where it should go. A villager who's free (or a forager or builder) walks over, digs it up, carries it across and plants it again. The build tool tells you when a bush or rock is what's in the way.

## The Stockyard
Press E at the Stockyard to open it: store everything you're carrying, pack exactly what the building sites still need, or take what you want yourself (1, 5, or fill your backpack) and put things back.

## Animals and birds
Rabbits, deer, squirrels and foxes (at night) in the woods; sheep and cows in the fields (more once there's a farm); chickens, cats and night-time hedgehogs round the houses; ducks bobbing along the shore. Seagulls soar and bank over the coast, circle up on thermals, dive for fish and settle on rooftops until you get too close; a murmuration of starlings swirls over the woods at dusk; pigeons peck about the town squares and clatter off when people walk through them.

## The Lift market
The Lift order form is a little market: every good has a buy and a sell price, with a ▲/▼ trend. Prices drift with the news (shortages and gluts on the mainland), climb as you buy and drop as you sell, and each button shows exactly what that deal will cost or pay. Big orders cost more per unit, big sales fetch less; give the market time and prices settle back.

## Getting about
- **Horse and cart:** build a **Carter's Yard** and horse-drawn carts trot along every road; before the power comes on they also fetch your Lift orders. Motor cars take over once there's electricity (and a **Garage & MOT** keeps lots of them running).
- **Bikes:** a **Cycle Shop** sells penny-farthings, then (upgrade) safety bicycles, then motorbikes. Townsfolk ride them on longer trips; Sam can buy one at the shop door (E) and hop on with B.
- **Railway, monorail, sky lift:** build two or more stations of a kind and they're joined up: a brick viaduct with a steam (later electric) train, a monorail on a concrete beam, or cable cars high over the rooftops. Buy a ticket at any station (E) and ride.

## Crime, police and fisticuffs
Pickpockets and muggers (who will rob Sam too), burglars at night, shoplifters and vandals turn up now and then, and fights break out, especially outside the pub and the nightclub at closing time, with a crowd egging them on. A **Watch House** (from the start: night watchmen with lanterns and rattles) and later a **Police Station** (whistle-blowing bobbies, then police bicycles, then panda cars and radios) put constables on the beat on day and night shifts; they chase crooks, break up fights and return what was stolen. Sam can fight: F punches (jab, cross, then a harder third in a quick combo), X kicks. Floor a crook and get a reward; hit an innocent and they'll hit back or run, and you'll get wanted stars until you keep out of the police's way. Get caught and it's a night in the cells and a fine. Sam's health shows top centre when he's been hurt; the Clinic and Leisure Centre patch him up quickly.

## Weather and peril
Summer thunderstorms, autumn mist and winter snow, plus **blizzards** (everyone slows down), **floods** along the coast after big storms, **droughts** after dry summer days (brown grass, failing crops, more fires; wells and a Water Tower help), **building fires** (flames and smoke inside, orange windows; a Fire Station's crew rush over with hoses, and without one the neighbours form a bucket chain; Sam can help by holding E next to the fire) and **power cuts** in the electric age.

## Something's always happening
Every few minutes (less often in a small village): the ice-cream van, an escaped pig (catch it with E), a protest, a lottery winner, a TV crew that won't say what it's filming, snowball fights, car prangs, chimney fires, power cuts... and, much later on, the odd thing nobody can explain.

## The high street, 1996
More to build: a Family Butcher, the Bosphorus Kebab House (open till three), the Offy, Pot Black Snooker Club, a Working Men's Club, Eyes Down Bingo Hall (with a caller doing the calls), Curl Up & Dye, Tiny Tots Toy Shop (sold out of Buzz Lightyears), Everything A Pound, Tropical Tan Studio, Carphone Corner, Byte Size Computers, Superbowl Tenpin, Laser Zone and a Youth Club (which keeps the vandals down). Each has its own kit inside, and the people in them play snooker, bowl, dab their bingo cards and talk about their trade.

Sam's emotes now include Whigfield's Saturday Night, Riverdance, the Liam (hands behind the back), the pogo, Three Lions, a Power Rangers pose, singing into a hairbrush and raising a pint (G cycles through them all); the townsfolk know exactly what you're doing. They have their own moves too: brick phones, Game Boys, dabbers.

## The townsfolk
Everyone keeps their own hours: early birds, night owls, children in bed by eight, constables on night shift. House lights go off one by one as people go to bed. Each person has a quirk (keep-fit fanatic, town gossip, street musician, conspiracy nut, short fuse...) that shapes what they do with their free time, what they say when you pass, and how quick they are to start a fight. Every building says what it's for on its card and in the Query tool, and the workplaces are kitted out for the job: horses in the Carter's Yard, bikes on the stands, a car up on the ramp at the garage, a DJ at the decks, a pool at the Leisure Centre, cells at the Watch House.

## Street lights
Roads tool → **Street lamps**: £15 a lamp on any road or path. Point at the corner or side of the road square where you want it (the marker shows the spot); the lamp's arm always reaches in over the road. Click it again to remove it. They look like their age (lanterns on posts, oil lamps, Victorian gas lamps, orange sodium, modern white) and light a pool on the road at night.

## Upstairs, lifts, roofs and glass
- **Every window is glass.** You can see into shops, pubs and homes from the street (and out of them), and windows glow warm at night.
- **Staircases.** Two- and three-storey buildings (semis, terraces, townhouses, the pub, the clinic, the office block and more) have real stairs up to furnished upper floors. Homes that get the *Upstairs rooms* upgrade grow a staircase too. Walk onto the bottom step and keep going.
- **Lifts.** Buildings of four storeys or more (the Grand Hotel, Sam Tower, blocks of flats) have a lift in the back corner. Step into the cab: E (✕) goes up a floor, Q (△) goes down, and at the top it takes you back to the ground.
- **Roofs.** Big flat-roofed buildings (not houses) let you out onto the roof: Sam Tower's lift goes all the way up, and the others have a stair to a roof hatch. Mind the edge; the parapet stops you.
- **Modelled buildings.** Some buildings are proper models made in Blender from scripts (`tools/blender/`), with their windows where the real thing has them: the Victorian terrace has its canted bay, sash windows, slate roof and chimney stacks, and inside a hall and stairs, the front parlour, the back room and the kitchen under the back window. More types are on the way.
- **Jump on the furniture.** Sam can hop up onto beds, tables, settees and worktops (Space), and steps off the edge to get down.
- Upper floors are only drawn when you're nearby, and far-off glass and floors are skipped, so it stays quick.

## Sam's own life while you plan
In the planning view Sam carries on by himself: he sleeps at night, eats when hungry, fetches materials and builds the top job on the Work queue, digs paths, chops timber or picks berries when stocks are low, works shifts, chats with people and sits on benches. The clock box says what he's doing, and when you press TAB you take over wherever he is. During the opening tutorial he leaves the work to you.

## Performance report
Press **F8**, or the 📊 button under the clock (or 📊 Report in the Planning menu), then **Copy**, and paste it to Claude. It lists frame rate and stutters, what takes the time, draw calls, your GPU and browser, and the size of the town.

## The Planning menu (B, or X on the controller, in the planning view)
One big menu that works the same with a controller or a mouse:
- **Build**: every building you can place, by category, as big cards. A green ✓ (and ×2, ×3...) means you already have that type; 🏗️ means one is being built. Locked ones say why, and if the town is big enough you can request the permit right there. Pick one and you're back on the map to place it.
- **Work queue**: the builders' to-do list, in order. Everyone helps with the top job first (fetching its materials, then building) and only moves down when it's waiting on something. ⤒ Top, ▲ and ▼ reorder it; all the paths count as one entry. 👁 shows you where it is.
- **Upgrades**: grouped by building type. **Homes** get *Upstairs rooms* (a second storey, more beds; people go up to sleep) and then a *Tudor makeover* (black-and-white timber framing, a tiled roof, another bed and happier residents). **Gathering yards** (forager, lumber camp, quarry, fisher, farm, brickworks, glassworks, foundry) get *Hand carts* (workers pull a cart and bring back twice as much) and then *Wagons and steel tools* (three times the load, a quarter faster). The **Builders' Yard** gets *Wheelbarrows* (twice the haul) and *Steel tools and scaffolding* (30% faster building). Upgrades cost materials and builder time, show scaffolding while they're done, join the Work queue, and Sam can deliver to them and hammer away too.

## Working (the timing bar)
Chopping, mining, digging, picking, fishing and building show a timing bar. Tap E (A) when the white marker is in the green; gold is perfect and perfects in a row build a combo. Holding E still works, just slowly.

## Things to do besides building
- **Talk to everyone** (E): a short chat with no menus, E for the next line. Each person greets you and tells you two or three things that suit them (how they feel, their work, gossip, their life story, a tip), and asks a favour if they have one (a yellow ! means someone needs something fetched; talk again once you have it).
- **Fish** from the beach facing the sea: wait for the BITE, then tap E. Catch streaks shrink the window.
- **Cook** at a campfire with 2 food for a full belly and extra energy, or just sit by the fire to rest.
- **Curios**: 14 odd little things glint on the ground around the island. Your journal (J) keeps them, with your friends and records.
- **Village fête** every few days at a park or the campfire: bunting, stalls, a tune, and a happier town.
- **Skills**: practice makes perfect. Every good tap teaches Sam a little Woodcutting, Quarrying, Digging, Foraging, Fishing or Building (levels 1-10, from Novice to Grand Master). Higher levels work faster with a wider green zone, and from level 5 you get the odd spare log, stone, berry or fish. The timing bar shows your level; the journal (J) shows them all.
- **Council challenges**: the Challenges page in the post lists three side goals at a time (a full larder, make friends, find curios, pave roads, a cheerful town, a wedding...). Each pays a grant into the town funds, and new ones appear as the town grows.
- **Weddings**: couples who have been together a while get married at St Sam's on a Saturday. You get an invitation the day before; at 11 the guests gather at the church door under a flower arch, confetti flies and the bells ring.
- **Market day** every week (09:00-15:00) at a park, plaza or the campfire: a Greengrocer (3 food for £12), a Swap stall that buys whatever's in your backpack at full price (better than the Lift), and a Lucky dip (£5, anything from a tenner to a Tamagotchi that's already died).
- **Bonfire Night** (5 November): a big bonfire with a guy on top from 18:00 and fireworks from 19:00, with the whole town watching. **New Year's Eve**: fireworks over the town at midnight.
- **Weather**: summer thunderstorms with lightning and thunder, and morning mist rolling in off the sea on autumn and winter days.
- **Post**: the red Postbox brings monthly accounts, permit replies, the local paper and notes from neighbours. Its **Jobs** page shows every workplace, how many jobs are filled, who works where and who is looking for work.
- **Doors** are shut by default. Sam opens or shuts them with C (D-pad right), even with people inside; villagers only open a door for the moment they walk through it.
- **Days and nights**: daylight (06:00-20:00) lasts 10 real minutes, the night 3. Sam needs about one sleep a night. A month is 8 days.
- **Dogs** trot along behind their owners through the doors and indoors.
- **Order supplies** on the yellow intercom post beside the Lift. The goods cage comes down with your crates; a truck takes them to the Stockyard, or they wait on the dock for you to carry. A Post Office knocks 20% off.
- **Phone Box**: 10p for a random call. **Bookies**: £20 on a horse with a silly name. **The Red Lion**: sit down for a pint.
- **Church** on Sunday mornings (bells), the **brass band** at the Bandstand in the evening, pub banter every night.
- **Combos spread**: perfect taps in a row on a building site also nudge the two nearest unfinished sites along a little, even without materials. A site with no materials won't start the timing bar.

## Humour
The title screen has an **Adult humour (18+)** tick box, on by default: 1990s British telly-and-pub humour with swearing, innuendo, Del Boy, Euro 96, Teletext, Oasis vs Blur, rude phone calls and cheeky letters. Untick it (or add `?clean`) for the family version. Children always stay clean.

## Backpack
Sam carries up to 12 things in a backpack (I to open). Gathered goods go in it; press E at a building site to deliver what it needs, E at the Stockyard to store everything (or, with an empty pack, to pack what the sites need). R drops the pack on the ground as a pile you can pick up again.

## How a new game starts
No instructions: Sam opens his eyes on his back in the grass, a dog sniffing at his face, and a security guard leaning over him: "Wake up, Sam. You need to get to work." (Any button skips it.)

The island is empty: just the Supply Lift, the forest and a tool rack. The game opens in the planning view and nothing happens until you order it.
1. **Plan:** draw a dirt path with the Roads tool and order a Stockyard and a Wooden Hut beside it. They appear as building sites.
2. **Tools:** TAB into Sam, walk to the glowing Tool Rack and pick up the Axe, Hammer and Shovel (Basket, Pickaxe and Fishing rod too, when you need them).
3. **Dig the path:** stand on the staked tiles and hold E.
4. **Build:** chop trees, carry the timber to each site, hold E to build. The first hut becomes Sam's home.
5. **Eat and sleep:** Sam gets hungry and tired. Pick berries and press Q, or eat at the Stockyard or a campfire; sleep in your bed at night. If you forget, Sam collapses.
6. Build the Surveyor's Hut for its planning terminal (permits, trade), a Campfire and a Forager, and settlers start arriving when there is a free bed and food in the Stockyard. Builders from a Builders' Yard will dig paths and build for you.
The minimap (bottom right in Sam's view) shows a yellow star where the current objective wants you.

## Round 3 additions
- **Pause menu** (Esc when walking about or on the Pan tool, or Create on a controller): resume, save to a slot, load a slot, sound and volume, game speed, the controls, and save-and-quit to the title screen.
- **A slower start.** The first days are calm: fights, muggings, robberies, fires, lottery wins and protests only turn up as the town grows, and more often where people are homeless, skint or drinking too much. Morris dancers wait until there's a proper village.
- **Protests** with home-made placards and a real cause (Ban the Bomb, Stop the Bypass, Kill the Bill, veal crates, and "Can't pay, won't pay" when the rates are high). Passers-by heckle. A big one on a Sunday in a bigger town brings the riot police; leave it too long and windows get smashed. The crowd cheers when it's broken up.
- **The Lottery** needs a Newsagent. The winner has to collect from the newsagent and get home or to the bank, and muggers (and Sam) can have it off them on the way.
- **Nobody just vanishes.** Anyone badly hurt waits for an ambulance, a doctor or a neighbour to carry them to the clinic (or up the Lift). The "dead" are collected by undertakers and taken to the church or the Lift. There are no burials.
- **Talk** only mentions things the town has (no pub talk before there's a pub), people chat about what's just been built, and ask Sam for things the town hasn't got yet.
- **Fires:** with no fire brigade, neighbours run a bucket chain from the nearest well or water tower. The fire engine fills up at a well, drives to the fire with its bell ringing, and goes back to refill if it runs dry.
- **Carter's Yard:** carters take a horse and cart to the Stockyard, load up to 24 of whatever the next job on the work queue needs, and drop it at the site. Every horse and cart has a carter driving it.
- **Planning menu → 💷 Money & goods:** what each kind of building earns or costs a month, goods gathered and used per day, and (with a Town Hall and a Bank) the rates, from Low to Steep, and Bank loans. **Work queue:** set a crew for each job (Auto, or 2 to 10 builders) and how many jobs builders work on at once. **Upgrades:** "Upgrade everything that's ready", and the right stick scrolls long lists.
- **Homes:** a light switch by the front door, curtains drawn after dark, and inside windows now line up with the outside ones. New buildings get a street lamp outside the door. Buildings next to each other no longer overlap their roofs or flicker at shared walls.
- **The Red Lion** has a beer garden, a kitchen with a cook, and a function room upstairs.
- **Night crew:** on Wednesday nights (or the first night Sam sleeps after that), a crew from the Lift replants felled trees and tops up rocks and berry bushes. You can only watch them from the planning view. Tree stumps are cleared after two days.
- **More animals:** pigeons, badgers, pigs, horses and swans. Ducks sit properly in the sea, gulls stay out of the water, and dogs wait on the pavement instead of in the road.
- **More since then:** bucket chains follow a walkable route from the well and everyone carries a bucket; drinkers in the Red Lion's beer garden on dry days; a do in the upstairs function room most Saturday nights (wedding receptions, 40ths, retirements) with dancing and the bass through the floor; a proper Morris dance with hankies, bells and clacking sticks; townsfolk remember what they asked for (journal, Build menu) and thank Sam when it's built; objectives show progress; the stock bar shows yesterday's change; carts show what they're carrying; pause menu Graphics and gameplay page (picture quality, shadows, automatic quality, lamps with new buildings).
- **Objectives** rewritten for all of this (wells, the surgery, the Carter's Yard, the newsagent, police, the bank and power). Old saves keep their place.
- Smaller fixes: the sea doesn't shimmer from high up, the Track tool appears only once there's a station, the Zones tool is gone, the Stockyard opens on "Store everything", the minimap no longer covers the clock, ○ in the build menu closes the building list, and placing a building says how many ways it can face (R or △ turns it).

## Life in 1996 (latest additions)
- **Sundays:** the clock shows the day of the week. On Sundays the schools, builders and most shops shut; pubs, cafés, hotels, the church and the emergency services stay open. Church in the morning (in their Sunday best), the pub after, and from April to September **Sunday cricket** on a proper cricket green (pitch, stumps, boundary rope, pavilion, scoreboard): two sides in whites, an umpire, a crowd round the rope, runs, wickets and a result in the paper.
- **Occasions:** wedding dress and suit, cricket whites, Sunday best, mourning black.
- **Shops and pubs:** walk up to whoever is serving and buy over the counter (sausage rolls, cod and chips, the Daily Mirror, scratchcards, a Tamagotchi...). The pub has a proper bar: Boddingtons, Stella, Guinness, Hooch, snakebite and black, a Babycham.
- **Drink:** sims and Sam get merry, then wobbly (walking, the camera, slurred speech), and more likely to start a fight. Sleep it off. Cycling drunk past a copper gets you a star. Late at night a car may weave home from the pub: the police pull it over, or someone gets hurt.
- **Hard times:** a week out of work and someone can lose their home: they sleep rough on benches and in shop doorways, beg, and sometimes steal. The police take local offenders to **The Lock-Up** (a round stone tower), or let them off with a caution if there's nowhere to hold them. A job gets them back on their feet.
- **Births and deaths:** people grow old; the very old slip away in their sleep. A service at the church, then a horse-drawn hearse leads the mourners to the Lift. A headstone appears in the graveyard. The church keeps **the parish register** (walk up to the church door).
- **Serious crime (rare):** an armed raid on the bank or post office, or arson in the night. Big rewards for catching the gang.
- **Special guests:** a footballer, a pop star, a soap actor... comes down the Lift with a minder. Crowds follow; ask for a photo and an autograph. Some of them whisper things they shouldn't.
- **Adverts:** billboards (made-up 90s brands: Mococoa, Elk Lager, Zing! Cola...), and now and then a townsperson turns to an invisible camera and does a little advert.
- **Pause:** the town freezes as if told to hold. A few touch their earpieces. A few turn, slowly, to look at Sam. Faces appear at windows and duck when he looks.
- **Roofs:** taller buildings have a stair hut on the roof with a door; the lift stops at every floor and the roof; you can jump off (it hurts).
- **Accounts:** every pound is booked: the Accounts tab and the Treasury letter show exactly where money came from and went.
- **Map markers** for fires, fights, robberies, filming crews, guests and funerals. Full-scale brawls at closing time.
- **Getting about:** the **Track** tool lays railway, monorail and sky-lift track piece by piece (straights, curves, climbs) between stations; piers only go on clear ground. Townsfolk walk to the station, wait on the platform, board, ride (you can see them through the windows) and get off. Sam waits on the platform, boards the real train and can walk about inside the carriage.
- **Cars:** households own cars parked at the kerb; commuters drive to work and park (in a multi-storey Car Park if there's one). Sam can buy a car at the garage (or take someone else's...). Cars stay wherever they're left.
- **Multiplayer:** friends visit your town from anywhere over the internet with just a code: Main menu > Multiplayer > Host shows a 4-letter code; your friend types it and presses Join. No IP addresses or servers. Visitors ride the trains, buy in shops with their own pocket money, and fight; the host can start **Raid night**, a timed shootout with the set's prop pistols. See `docs/MULTIPLAYER.md`.
- **Driving:** Sam's car has throttle, brakes, reverse and proper steering.
- **Mods:** `mods/` folder for new speech, names, clothes, adverts, guests, shop goods, buildings, blocky models, events and scripts. See `docs/MODDING.md`.
- The wish list and progress: `docs/ROADMAP.md`.

## More to build
New in the menus: Victorian Terrace, Static Caravan, Maisonettes, Taj Mahal Curry House, Greasy Spoon Café, Kwik Shop Supermarket, Amusement Arcade, Our Prize Records, Midshires Bank, Ritzy Nightclub, Odium Cinema, Garage & MOT, Fire Station, Leisure Centre and a Comprehensive School. Every interior also has more in it: plants, pictures, lamps, clocks, shelves and crates, depending on the building.

## How the town grows
1. Settlers arrive through the Supply Lift when there are free beds, work and food. There is no fixed population cap: the town keeps growing until your computer starts to slow down (measured against your own screen's refresh rate), holds there, and grows again if it speeds up. A fast PC gets a bigger town.
2. **Hamlet** (6) → **Village** (15) → **Town** (30) → **City** (60). Like any city builder, you only see buildings once the population reaches their milestone; the Council then writes to say which new permit forms you can post. There are 45+ buildings to find, from Log Cabins, Allotments and a Newsagent up through the Bakery, Chip Shop, The Red Lion pub, Village Hall, Post Office, St Sam's Church, Launderette, Video Rental and Bookies, to Council Flats, the Hospital, Power Plant, Grand Hotel and Sam Tower. Paths can be paved once the village is big enough (1 stone per tile).
3. Gatherers work raw resources (forest, rocks, iron ore, clay pits, berry bushes, fields, the sea and beach) and carry them to the Stockyard. You can trade surplus with the Lift for money, or buy goods at a premium.
4. Parks, the church, the pub, the bandstand and the village hall lift everyone's mood; bakeries and allotments make food; shops, the pub and the bookies pay rates each month.
5. Citizens get hungry (meals at home, the campfire, the pub or the chippy; workers pack lunch), sleep in their own beds, chat, become friends, couple up and move in together, have children who go to school and grow up. Mood affects whether people stay.

There is more going on in Sam City than a town. You will have to explore to find out.

## The march of progress
The town starts in the **Steam & candle** age: no electricity, ledgers instead of computers, wireless sets instead of tellies, oil lamps by the doors. Finish a **Power Plant** and the **Electric** age begins (tellies, TV aerials, electric lamps). The **Computer** age needs power plus research from the Schoolhouse, a Library and the Town Hall: then the Planning Office gets a terminal, homes get satellite dishes, uPVC doors and burglar alarms. Old buildings are modernised one at a time, so the town changes gradually. The Accounts page shows the age and research.

The west-shore jetties, boats and (later) cranes only appear once you build a **Harbour**.

## Seasons
The calendar turns the town: blossom in spring, golden street trees and drifting leaves in autumn, and in winter snow on the ground and roofs, frosted pines, falling snow and snowmen built by the children. In December every home and shop gets fairy lights and a big tree goes up by the campfire or plaza. The clock shows the season.

## Life & look
Citizens are English men, women, children and elders in a range of heights and builds, each with a face, hairstyle, hat and clothes, driven by a procedural animator with ~40 behaviours (walking, running, carrying, chopping, mining, harvesting, fishing, digging, hammering, typing, reading, eating, drinking, praying, sleeping, gesturing, fidgeting, waving, dancing, cheering, clapping, shrugging, facepalming and the odd V-sign) and speech bubbles. The renderer draws to a low-res target and adds a pixel-art outline, colour grade and dithered palette (`src/render/Post.js`). Day/night, moonlight, campfire light, chimney smoke, clouds and their shadows, harbour boats, seagulls, traffic and dogs add life.

## Raids (optional, off with the title-screen tick box or `?noraids`)
Weapons are part of the story, not the game. Once the town has 10 residents and a few days behind it, a small band occasionally lands from the sea, heads for the Stockyard and the food stores and shoves anyone in their way. Nobody is ever killed: victims are knocked down and get back up (faster with a Clinic). Citizens run indoors, the gate guards sedate raiders with darts near their posts, and a Police Station sends its officers after raiders anywhere. Sam can take a club from the Stockyard during a raid (E) and swing it with F; it is hung back up afterwards. Raiders caught are marched off and drop what they stole; the rest row away with it. Later raids carry pistols. The actors' lines slip now and then, as ever. Test with `window.__game.raids.trigger()` or `node tools/raid.mjs`.

## Optional pixel-art textures
The game ships with generated textures. For richer walls, roofs, ground and water use the "PNG - Pixel Art Textures" pack. Its licence forbids redistribution, so it can't come inside the download, but installing it is one click:

**Easy way:** on the title screen press **🎨 Add texture pack** and pick the pack's zip file (or drag the zip onto the title screen). The game unpacks the bits it needs in a few seconds, remembers them, and restarts with textures on. "remove" turns them off again.

**Developer way** (writes a `textures/` folder next to the game):
```
pip install pillow
python3 tools/build_textures.py path/to/PNG_-_Pixel_Art_Textures.zip
```
This writes `textures/` (about 300 KB). Reload the game: brick, stone, planks, stucco, roof tiles, thatch, grass, sand, dirt, water, bark, leaves and window frames switch over automatically. The same set also gives interiors wood/tile/carpet floors and wallpaper or painted wall lining, painted double doors swung open at every entrance, and woven patterns (plaid, gingham, corduroy, houndstooth, diamond) on clothes plus upholstered/wooden furniture. Delete the folder to go back to the generated look.

For anything the pack lacks (thatch, log walls, your own or AI-generated art), convert any image into a seamless pixel tile that replaces a texture by name:
```
python3 tools/pixelate.py my_thatch.png roof_thatch                 # 64 px, 24-colour palette
python3 tools/pixelate.py cloth.png fab_plaid --grey --size 32       # tintable greyscale fabric
```
Names the game looks up are listed in `tools/build_textures.py` (`wall_*`, `roof_*`, `floor_*`, `int_*`, `fab_*`, `door_*`, `ground_*`).

## Layout
`src/data` pure data (buildings, layouts, story, names) · `src/world` grid, A*, building lifecycle · `src/systems` economy, resources, logistics, construction, population, social, story, security · `src/sim` NPC state machine · `src/player` Sam + planning tools · `src/render` textures, meshes, rig/animator, post-process · `src/ui/UI.js` DOM · `src/core` input, clock, save · `tools/` headless Playwright scenarios (`window.__game`).

## Limits / roadmap
Villagers don't use the stairs or lifts yet (only Sam does; people who sleep upstairs just head up out of sight), synthesised sound effects only (no music files), weapons only exist during raids.
