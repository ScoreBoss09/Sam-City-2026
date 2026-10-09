# Sam City

Build a town from a single wooden hut, and live in it. You are **Sam**, one of the townsfolk: switch between a top-down planning view and a fully walkable 3D world (first or third person). Nothing is built by magic. Timber is felled, stone is quarried, bricks are fired, food is foraged and farmed, and every building is hauled together and built by hand, by builders or by you. Everyone eats, sleeps, makes friends, falls in love, starts families and grows up.

Playable prototype (Three.js, no build step), structured as a data-driven reference for a future Unity port (`docs/UNITY_PORT.md`).

## Play it
- **In the browser:** https://scoreboss09.github.io/Sam-City-2026/ (one-time setup: repo Settings > Pages > Source "Deploy from a branch" > `gh-pages` / root; the branch appears after the first Actions run).
- **Download:** https://github.com/ScoreBoss09/Sam-City-2026/releases/download/latest/SamCity-playable.zip (rebuilt on every push). Close any old Sam City window first, unzip into a new folder, then double-click `play.bat` (Windows) or run `./play.sh` (Mac/Linux). Needs Python 3 installed. The title screen shows the version date so you can check it's the newest; the launcher tells the browser not to keep old copies and picks another port if an old copy is still running.

## Run
```
python3 -m http.server 8000
# open http://localhost:8000/index.html
```
`?scale=0.75` gives a crisper render (default 0.6 = chunky pixel look), `?post=0` turns the pixel-art outline pass off, `?auto` skips the title screen, `?auto&demo` (or the **Demo City** button) builds a lively sandbox town. Progress autosaves in the browser; use **Continue** on the title screen.

## Controls
**Keyboard and mouse, Sam:** WASD move, Shift sprint, mouse look (click the view to capture) or arrow keys, V first/third person, E interact, Q eat, I backpack, R drop what you carry, J journal, H hide the help bar, F swing the club (raids only), C open/close a door, Space jump (high enough to clear a fence), 1-8 emotes (dance, cheer, shrug, facepalm, two fingers, air guitar, clap, think), G cycles emotes, M big map, TAB planning view.
**Keyboard and mouse, planning view:** WASD pan, Q/E rotate, wheel zoom, right-drag pan, Shift+right-drag tilt, F frame the island, 1-7 tools, R rotate the ghost, Esc cancel, TAB back to Sam. P pauses; the clock buttons set 1x/2x/4x.

**Controller (Xbox/PlayStation layout, plug it in and press any button):**
| Button | Sam | Planning view |
|---|---|---|
| Left stick | walk | move the map (the yellow cursor is the centre of the screen) |
| Right stick | look | rotate (left/right) and zoom (up/down), smooth |
| A / Cross | interact, tap in the green to work | place, or hold and move to paint paths |
| B / Circle | emote (press again for the next one) | cancel tool |
| X / Square, RT | swing the club | frame the island |
| LT / L2 | jump | zoom in |
| Y / Triangle | eat | rotate the building |
| LB / L1 | sprint | previous tool |
| RB / R1 | first/third person | next tool |
| D-pad | up: backpack, down: drop, left: journal, right: open/close a door | up/down: pick a building, left/right: building tab |
| Start | planning view / Sam | planning view / Sam |
| Back / Select | pause | pause |
| R3 | big map | |
Menus and the terminal: D-pad or stick to move, A to press, B to close.

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
The island is empty: just the Supply Lift, the forest and a tool rack. The game opens in the planning view and nothing happens until you order it.
1. **Plan:** draw a dirt path with the Roads tool and order a Stockyard and a Wooden Hut beside it. They appear as building sites.
2. **Tools:** TAB into Sam, walk to the glowing Tool Rack and pick up the Axe, Hammer and Shovel (Basket, Pickaxe and Fishing rod too, when you need them).
3. **Dig the path:** stand on the staked tiles and hold E.
4. **Build:** chop trees, carry the timber to each site, hold E to build. The first hut becomes Sam's home.
5. **Eat and sleep:** Sam gets hungry and tired. Pick berries and press Q, or eat at the Stockyard or a campfire; sleep in your bed at night. If you forget, Sam collapses.
6. Build the Surveyor's Hut for its planning terminal (permits, trade), a Campfire and a Forager, and settlers start arriving when there is a free bed and food in the Stockyard. Builders from a Builders' Yard will dig paths and build for you.
The minimap (bottom right in Sam's view) shows a yellow star where the current objective wants you.

## How the town grows
1. Settlers arrive through the Supply Lift when there are free beds, work and food.
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
Single-storey interiors (towers have one lobby floor), synthesised sound effects only (no music files), weapons only exist during raids.
