# Sam City

Build a town from a single wooden hut, and live in it. You are **Sam**, one of the townsfolk: switch between a top-down planning view and a fully walkable 3D world (first or third person). Nothing is built by magic. Timber is felled, stone is quarried, bricks are fired, food is foraged and farmed, and every building is hauled together and built by hand, by builders or by you. Everyone eats, sleeps, makes friends, falls in love, starts families and grows up.

Playable prototype (Three.js, no build step), structured as a data-driven reference for a future Unity port (`docs/UNITY_PORT.md`).

## Play it
- **In the browser:** https://scoreboss09.github.io/Sam-City-2026/ (one-time setup: repo Settings > Pages > Source "Deploy from a branch" > `gh-pages` / root; the branch appears after the first Actions run).
- **Download:** the Releases page has `SamCity-playable.zip` (rebuilt on every push). Unzip it, then double-click `play.bat` (Windows) or run `./play.sh` (Mac/Linux). Needs Python 3 installed. Or use "Code > Download ZIP" on the repo.

## Run
```
python3 -m http.server 8000
# open http://localhost:8000/index.html
```
`?scale=0.75` gives a crisper render (default 0.6 = chunky pixel look), `?post=0` turns the pixel-art outline pass off, `?auto` skips the title screen, `?auto&demo` (or the **Demo City** button) builds a lively sandbox town. Progress autosaves in the browser; use **Continue** on the title screen.

## Controls
**Keyboard and mouse, Sam:** WASD move, Shift sprint, mouse look (click the view to capture) or arrow keys, V first/third person, E interact, Q eat, I backpack, R drop what you carry, J journal, H hide the help bar, F swing the club (raids only), G wave, M big map, TAB planning view.
**Keyboard and mouse, planning view:** WASD pan, Q/E rotate, wheel zoom, right-drag pan, Shift+right-drag tilt, F frame the island, 1-7 tools, R rotate the ghost, Esc cancel, TAB back to Sam. P pauses; the clock buttons set 1x/2x/4x.

**Controller (Xbox/PlayStation layout, plug it in and press any button):**
| Button | Sam | Planning view |
|---|---|---|
| Left stick | walk | move the map (the yellow cursor is the centre of the screen) |
| Right stick | look | rotate (left/right) and zoom (up/down) |
| A / Cross | interact, tap in the green to work | place, or hold and move to paint paths |
| B / Circle | wave | cancel tool |
| X / Square, RT | swing the club | frame the island |
| Y / Triangle | eat | rotate the building |
| LB / L1 | sprint | previous tool |
| RB / R1 | first/third person | next tool |
| D-pad | up: backpack, down: drop | up/down: pick a building, left/right: building tab |
| Start | planning view / Sam | planning view / Sam |
| Back / Select | pause | pause |
| R3 | big map | |
Menus and the terminal: D-pad or stick to move, A to press, B to close.

## Working (the timing bar)
Chopping, mining, digging, picking, fishing and building show a timing bar. Tap E (A) when the white marker is in the green; gold is perfect and perfects in a row build a combo. Holding E still works, just slowly.

## Things to do besides building
- **Talk to everyone** (E): six topics each, their own life stories, gossip about the town, advice, and favours (a yellow ! means someone needs something fetched).
- **Fish** from the beach facing the sea: wait for the BITE, then tap E. Catch streaks shrink the window.
- **Cook** at a campfire with 2 food for a full belly and extra energy, or just sit by the fire to rest.
- **Curios**: 14 odd little things glint on the ground around the island. Your journal (J) keeps them, with your friends and records.
- **Village fête** every few days at a park or the campfire: bunting, stalls, a tune, and a happier town.
- **Post**: the red Postbox brings monthly accounts, permit replies, the local paper and notes from neighbours.

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
2. **Hamlet** (6) → **Village** (15) → **Town** (30) → **City** (60): each tier unlocks new buildings (Log Cabins, Quarry, Farm, Tavern, Brickworks, Stone Cottages, School, Town Hall, Glassworks, Foundry, Hospital, Power, Hotel, Tower...). Paths can be paved once the village is big enough (1 stone per tile).
3. Gatherers work raw resources (forest, rocks, iron ore, clay pits, berry bushes, fields, the sea and beach) and carry them to the Stockyard. You can trade surplus with the Lift for money, or buy goods at a premium.
4. Citizens get hungry (meals at home, the campfire or the tavern; workers pack lunch), sleep in their own beds, chat, become friends, couple up and move in together, have children who go to school and grow up. Mood affects whether people stay.

There is more going on in Sam City than a town. You will have to explore to find out.

## Life & look
Citizens are English men, women, children and elders in a range of heights and builds, each with a face, hairstyle, hat and clothes, driven by a procedural animator with ~40 behaviours (walking, running, carrying, chopping, mining, harvesting, fishing, digging, hammering, typing, reading, eating, sleeping, gesturing, fidgeting, waving) and speech bubbles. The renderer draws to a low-res target and adds a pixel-art outline, colour grade and dithered palette (`src/render/Post.js`). Day/night, moonlight, campfire light, chimney smoke, clouds and their shadows, harbour boats, seagulls, traffic and dogs add life.

## Raids (optional, off with the title-screen tick box or `?noraids`)
Weapons are part of the story, not the game. Once the town has 10 residents and a few days behind it, a small band occasionally lands from the sea, heads for the Stockyard and the food stores and shoves anyone in their way. Nobody is ever killed: victims are knocked down and get back up (faster with a Clinic). Citizens run indoors, the gate guards sedate raiders with darts near their posts, and a Police Station sends its officers after raiders anywhere. Sam can take a club from the Stockyard during a raid (E) and swing it with F; it is hung back up afterwards. Raiders caught are marched off and drop what they stole; the rest row away with it. Later raids carry pistols. The actors' lines slip now and then, as ever. Test with `window.__game.raids.trigger()` or `node tools/raid.mjs`.

## Optional pixel-art textures
The game ships with generated textures. For richer walls, roofs, ground and water, build a local texture set from the "PNG - Pixel Art Textures" pack (its licence forbids redistribution, so the result is git-ignored and never committed):
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
Single-storey interiors (towers have one lobby floor), no audio, weapons only exist during raids, simple weather-free skies.
