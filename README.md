# Sam City

A SimCity-style city builder where **you are also one of the sims**. Switch between a top-down planning view ("god mode") and a fully walkable 3D world (first/third person). Nothing is built by magic: materials are ordered at in-world computer terminals, delivered by truck from the Lift, hauled and assembled by builder sims, or by you when nobody else has the job. Underneath it all, something is off about the sky...

Playable prototype (Three.js, no build step), structured as a data-driven reference for a Unity port: see `docs/UNITY_PORT.md`.

## Run
```
python3 -m http.server 8000
# open http://localhost:8000/index.html
```
`?scale=0.75` gives a crisper render (default 0.6 = chunky pixel look); `?auto` skips the title screen; `?auto&demo` (or the **Demo City** button) generates a lively sandbox town.

## Controls
**Sim mode:** WASD move, Shift sprint, mouse look (click view to capture) or arrow keys, V first/third person, E interact (hold E to build or work a shift), TAB switch to god mode.
**God mode:** WASD pan, Q/E rotate, wheel zoom, right-drag pan, Shift+right-drag tilt, 1-7 tools (bulldoze, roads, zones, buildings, parks, utilities, query), R rotate ghost, Esc cancel, TAB back to Sam. F frames the whole island, G waves (sim mode). P pauses; clock buttons set 1x/2x/4x.

## The loop
1. Town Hall terminal: request **permits**, order **materials** (a truck drives from the Lift to the Supply Depot).
2. God mode: place roads and buildings (they auto-face the road). They appear as **construction sites**.
3. Builders (hired via a Builders' Yard) haul crates and build; or you do: take a crate at the depot (E), deliver to the site (E), hold E to build.
4. Sims arrive via the Lift when there are free beds and jobs; they sleep in their own homes, work 8-17 (builders 7-18), and wander in the evening. Terminals can invite residents.
5. Talk to people (they slip out of character). Build two Large buildings and the dome appears. Collect three script pages, then reach the Service Tunnel during the 02:00-04:00 guard rotation. Anywhere else near the Lift/tunnel, guards sedate you and you wake in hospital (or the town square).

The sim cap (shown in the HUD) adapts to frame rate.

## Life & animation
Citizens are articulated rigs (elbows, knees, neck, blinking face with smiles/frowns, hairstyles, hats, clothing and role uniforms) driven by a procedural animator with ~35 behaviours: walk/run with real stride, carrying crates, hammering/sawing, typing, reading, eating, watching TV, sleeping, clipboard rounds, guarding, machine levers, shop browsing, and idle fidgets that depend on personality (stretching, yawning, checking a watch, crossed arms, phone, scratching, humming). They sit on chairs, sofas and benches, chat in pairs with gestures and speech bubbles, glance at passers-by, greet Sam (wave/nod/grunt by personality), keep moods that colour posture and expression, and a few have dogs. As the story advances the "actors" start glancing at the camera and glitching. Ambient traffic, street lamps, trees, a harbour with cranes and boats, and seagulls round it out.

## Layout
`src/data` pure data (buildings, layouts, story, names) · `src/world` grid, A*, building lifecycle · `src/systems` economy, logistics, construction, population, story, security · `src/sim` NPC state machine · `src/player` Sam + god controls · `src/render` textures/meshes · `src/ui/UI.js` DOM · `tools/` headless Playwright scenarios (`window.__game`).

## Limits / roadmap
Single-storey interiors (towers have one lobby floor), instant roads, no save/load, guards use sedative darts only (no player weapon yet), no audio.
