# Sam City

Build a town from a single wooden hut, and live in it. You are **Sam**, one of the townsfolk: switch between a top-down planning view and a fully walkable 3D world (first or third person). Nothing is built by magic. Timber is felled, stone is quarried, bricks are fired, food is foraged and farmed, and every building is hauled together and built by hand, by builders or by you. Everyone eats, sleeps, makes friends, falls in love, starts families and grows up.

Playable prototype (Three.js, no build step), structured as a data-driven reference for a future Unity port (`docs/UNITY_PORT.md`).

## Run
```
python3 -m http.server 8000
# open http://localhost:8000/index.html
```
`?scale=0.75` gives a crisper render (default 0.6 = chunky pixel look), `?post=0` turns the pixel-art outline pass off, `?auto` skips the title screen, `?auto&demo` (or the **Demo City** button) builds a lively sandbox town. Progress autosaves in the browser; use **Continue** on the title screen.

## Controls
**Sim mode:** WASD move, Shift sprint, mouse look (click the view to capture) or arrow keys, V first/third person, E interact (hold E to chop, mine, harvest, fish, build or work a shift), G wave, TAB planning view.
**Planning view:** WASD pan, Q/E rotate, wheel zoom, right-drag pan, Shift+right-drag tilt, F frame the island, 1-7 tools (bulldoze, roads, zones, buildings, parks, utilities, query), R rotate the ghost, Esc cancel, TAB back to Sam. P pauses; the clock buttons set 1x/2x/4x.

## How the town grows
1. **Camp** (0 residents): Sam has a hut, a campfire, a Stockyard and a Surveyor's Hut with a planning terminal. Chop trees at the forest edge, store timber in the Stockyard, place a Wooden Hut and build it (carry timber to the site, hold E).
2. Settlers arrive through the Supply Lift when there are free beds, work and food. Place a Forager's Hut and a Campfire so people can eat; request permits at the terminal for more.
3. **Hamlet** (6) → **Village** (15) → **Town** (30) → **City** (60): each tier unlocks new buildings (Log Cabins, Quarry, Farm, Tavern, Brickworks, Stone Cottages, School, Town Hall, Glassworks, Foundry, Hospital, Power, Hotel, Tower...). Roads start as dirt tracks and can be paved once the village is big enough.
4. Gatherers work raw resources (forest, rocks, iron ore, clay pits, berry bushes, fields, the sea and beach) and carry them to the Stockyard. You can trade surplus with the Lift for money, or buy goods at a premium.
5. Citizens get hungry (meals at home, the campfire or the tavern; workers pack lunch), sleep in their own beds, chat, become friends, couple up and move in together, have children who go to school and grow up. Mood affects whether people stay.

There is more going on in Sam City than a town. You will have to explore to find out.

## Life & look
Citizens are English men, women, children and elders in a range of heights and builds, each with a face, hairstyle, hat and clothes, driven by a procedural animator with ~40 behaviours (walking, running, carrying, chopping, mining, harvesting, fishing, digging, hammering, typing, reading, eating, sleeping, gesturing, fidgeting, waving) and speech bubbles. The renderer draws to a low-res target and adds a pixel-art outline, colour grade and dithered palette (`src/render/Post.js`). Day/night, moonlight, campfire light, chimney smoke, clouds and their shadows, harbour boats, seagulls, traffic and dogs add life.

## Optional pixel-art textures
The game ships with generated textures. For richer walls, roofs, ground and water, build a local texture set from the "PNG - Pixel Art Textures" pack (its licence forbids redistribution, so the result is git-ignored and never committed):
```
pip install pillow
python3 tools/build_textures.py path/to/PNG_-_Pixel_Art_Textures.zip
```
This writes `textures/` (about 300 KB). Reload the game: brick, stone, planks, stucco, roof tiles, thatch, grass, sand, dirt, water, bark, leaves and window frames switch over automatically. Delete the folder to go back to the generated look.

## Layout
`src/data` pure data (buildings, layouts, story, names) · `src/world` grid, A*, building lifecycle · `src/systems` economy, resources, logistics, construction, population, social, story, security · `src/sim` NPC state machine · `src/player` Sam + planning tools · `src/render` textures, meshes, rig/animator, post-process · `src/ui/UI.js` DOM · `src/core` input, clock, save · `tools/` headless Playwright scenarios (`window.__game`).

## Limits / roadmap
Single-storey interiors (towers have one lobby floor), no audio, no player weapon (guards use sedative darts), simple weather-free skies.
