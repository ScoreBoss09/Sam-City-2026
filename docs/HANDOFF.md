# Handoff: Sam City 1995 (for the next Claude session)

Read this first, then `docs/ROADMAP.md` (the owner's full wish list, round by round, with `[x]` done and `[ ]` to do).
The owner plays the game, sends notes as they go, and wants a **production-ready Steam game**, intuitive for "the
common man", with performance a priority. They're happy for you to be ruthless with old systems if it makes the game
clearer. Work through their list, test everything you change, commit often, and publish (below).

## The project in one paragraph

A browser game in plain ES modules and Three.js (no build step, no bundler; `vendor/` holds three.js). You run a 1995
English town that grows from one wooden hut, in two views: **Sam** (third/first person: walk, chop, dig, build, talk,
fight) and the **planning view** ("god mode": roads, buildings, zoning, upgrades, the work queue). Underneath there's a
Truman Show story: the town is a TV set inside a dome, it's really 2026, the actors slip up, and Sam can find a way out.

## Branches and publishing

- Develop on **`claude/great-volta-u9yfrl`** (push with `git push -u origin claude/great-volta-u9yfrl`).
- The owner plays from **`claude/adoring-goodall-uzl91n`**: after a good batch, publish with
  `git push origin HEAD:claude/adoring-goodall-uzl91n` (approved by the owner; both branches stay in step).
- **No pull requests** unless the owner asks. No model names in commits.
- Commit trailer (every commit):
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: <your session link>
  ```
- Commit messages: a short title, then plain-English paragraphs on what changed for the player and why.

## Running and testing

- Server: `node serve.js 8133 --no-browser` (run it in the background; it's killed at the background time limit, so
  restart it when tests start failing to connect).
- Test page: `http://127.0.0.1:8133/index.html?auto&demo&noraids` (a ready-built demo town, random layout each time;
  `noraids` stops raids interrupting). The game is `window.__game` (call it `g`).
- `g.advance(seconds, step)` runs the simulation synchronously (no rendering): one game hour is about 18 s.
  Gotchas: cutscene time per frame is capped at 0.1 s; `setTimeout` callbacks don't fire inside an `advance` loop.
- Playwright: `require('/opt/node22/lib/node_modules/playwright')`, Chromium at `/opt/pw-browsers/chromium` with
  `--use-gl=swiftshader --enable-unsafe-swiftshader`. Wait ~14 s after load before poking `__game`.
- To point the camera for a screenshot, play a dummy cutscene:
  `g.cutscene.play({ shots: [{ dur: 999, snap: true, cam: () => window.__cam }] })` and set
  `window.__cam = { pos: [x, y, z], look: [x, y, z], fov }`.
- Before every commit: `node --input-type=module --check < file.js` for each changed file, and the "swallowed line"
  check below. Then a smoke test (load the page, play a minute, look for page errors).

### The one mistake to never make

**Never put a `// comment` in the middle of a one-line statement.** This codebase is written with long lines, and a
`// note` followed by more code on the same line silently turns that code into comment. It has bitten repeatedly (a
whole shift rota, the graphics-reset watcher, a badge counter, the Notes tab). Comments go at the **end** of a line.
Check every change with:

```sh
cd <repo> && { grep -rnP "//\s*\([^)]*\)\s+[a-zA-Z_$][^/]*[;{]" src --include=*.js; grep -rnP "//(?![^\n]*https?:)[^\n]*\b(this|g|s|b|P|E|m|q)\.[a-zA-Z]+\s*(=[^=]|\()" src --include=*.js; } | grep -v "://"
```

(empty output = fine).

### House style

- Match the surrounding code: long single lines, short comments in plain English at the line's end, British spelling
  in player-facing text, no em dashes in the owner's docs.
- Player-facing text is plain and friendly ("Press E to pick up the Axe"), never jargon.
- Emoji icons must be ones older Windows 10 fonts have (nothing from Emoji 12+ like 🪓 🪵 🫐 🛖 🪟 🪣 🩺, which show as
  "?"). Run a scan for code points U+1FA70 to U+1FAFF before adding icons.
- Performance: avoid adding lights at runtime (it recompiles every shader: use `g.atmosphere.flash`), merge static
  meshes (`colorize` + `mergeByMaterial` in `src/render/BuildingFactory.js`), instance repeated things, no shadows on
  tall or far things.

## Where things are

- `src/Game.js`: the game object, every system constructed and updated here; key handling for menus.
- `src/sim/Sim.js`: townsfolk (activities, `decideAnim`, moods, couples, nights out). `src/systems/Population.js`:
  arrivals by the Lift, visitors, jobs, homes.
- `src/player/Player.js`: Sam (movement, `findTarget` = everything "E to ..." , `interact`, inventory, `syncMesh`).
  `src/player/Autopilot.js`: what Sam does by himself while you're in the planning view.
- `src/player/GodControls.js`, `src/ui/UI.js`, `src/ui/PlanMenu.js`, `src/ui/Minimap.js`: the planning view and UI.
  `index.html`, `css/style.css` + `css/theme.css` (theme overrides with `!important`).
- `src/render/BuildingFactory.js` (buildings, interiors, lamps), `SimRig.js` (people and held props), `Animator.js`
  (poses), `Birds.js`, `NightFlyers.js`, `Wildlife.js`, `Perch.js` (where birds can stand), `Atmosphere.js` (sky,
  dome, flash).
- `src/data/*.js`: plain data (buildings, layouts, upgrades, icons, story text, objectives in `story.js`).
- Story: `src/systems/Story.js` (stages, slips, tip-offs), `src/systems/Plot.js` (blowing up the Lift),
  `src/systems/Stairway.js` (Sam Tower's stairway and the office above the sky), `src/data/anachronisms.js`.
- Cutscenes: `src/systems/Cutscene.js` (`g.cutscene.play({ shots: [{ dur, cam, say, title, text, ask, rec, at }],
  tick, onEnd })`; `ask: { who, q, opts: [{ t, on }], def }` holds the shot for an answer; an `on()` returning `'end'`
  ends the scene).
- Happenings (random town events): `src/systems/Happenings.js` (incl. the documentary crew).
- Saves: `src/core/Save.js` (`g.flags` is saved whole; per-building fields are listed there).

## Done recently (round 6.11, newest last)

Real 1995 calendar; fires (bucket chains, ruins, deaths, funerals); multiplayer helpers; timber balance; notices;
first-time event cutscenes; couples; pubs and nights out (piano, Irish pub, nightclub); the plaza; the town overview
page and map overlay; the 1787 lock-up; wildlife (squirrels, roosting birds, bats, owls); raids (rowing in, the guard's
club, have-a-go heroes); hats and hair; **the documentary crew** (interview cutscene with answers); **the story**
(2026 slips, tip-offs, blowing up the Lift with a friend, the Stairway to Heaven and the office above the sky, three
endings); then the owner's latest notes: icons that showed as "?", the warning badge that flickered and couldn't be
hovered (now a line of text plus the O key), path trees giving logs to Sam or a pile, permits by Postbox only (and
computer terminals later), night birds (no mid-air pigeons, gulls spread out), lights the same inside and through the
windows, "Sam is ..." under the clock in the planning view.

## To do (the owner's open list, most recent first)

1. **Replace the Planning menu with a Cities: Skylines style interface** (task #93). The owner: "I don't think it
   should be there as it might confuse players." Everything should be reachable from the planning view itself:
   - a bottom toolbar with category tabs (roads, homes, food, industry, civic, commerce, parks, utilities, plus
     panels for the work queue, upgrades, money and the town overview), like Cities: Skylines;
   - building cards with a **rendered preview** of what the building looks like (render each building once to a small
     image with the real `buildExterior`, cache them);
   - **right-click** anything in the planning view for a fuller description (building, site, person, road);
   - more polished fonts, styles and forms (the owner likes the current look; make it more refined);
   - keep it intuitive for a first-time player; keyboard, mouse and controller all work.
   The current Planning menu lives in `src/ui/PlanMenu.js` (tabs: town, build, queue, upgrades, money) and opens with B
   in the planning view; the old left toolbox is `#toolbox` / `#submenu` in `UI.js`.
2. **Objectives rework** (task #88): done. Kept here for reference; the toolbar redesign must keep the button names the steps use ("Roads", "Buildings", the "Civic"/"Homes"/"Food" tabs) or update the step text in `src/data/story.js`. The owner: the goals in the top right are too
   much for the common man. Wanted:
   - many more objectives, each one simple step ("Click ROADS on the left", "Drag from the Lift to draw a path",
     "Press E to pick up the Axe", "Walk up to a tree", "Tap E in the green to chop it", ...);
   - at the very start, the first objective appears in the **middle of the screen** and then moves to its corner;
   - when a step or goal is completed, an **animation in the corner** and a **sound**.
   Plan that was being built: keep the 18 chapters and their ids in `OBJECTIVES` (`src/data/story.js`) so old saves
   still map, but split each into one-action steps (about 65 in all); mark pure "click here / walk there" steps as
   soft (they count as done once any later step in the chapter is done, so nobody gets stuck on a UI step they skipped);
   a chapter is done when all its hard steps are; in `UI.renderObjectives` add a centred intro (CSS class with a
   transform transition) the first time, and a tick/burst animation plus a two-note chime on each step, a bigger one on
   each chapter (`Sfx.tone` in `src/core/Sfx.js`).
3. **Gathering and digging mini-games** (task #89). Berries, trees, rocks and path digging: ramp the difficulty up at
   the top levels so they stay a challenge; on a combo or a perfect, a **visible shockwave** spreads along the ground from
   Sam that chops/gathers nearby trees and resources and lights up and advances nearby paths, so the existing bonus near
   the next tree no longer looks like a glitch; as the streak grows, the wave grows and also adds build progress to
   nearby sites, each touched thing highlighted, with sound. The mini-game is `src/ui/WorkGame.js`; skills in
   `src/systems/Skills.js`; path work in `src/systems/RoadPlans.js` (`work(p, dt, by)`).
4. **Batch 005 models** (task #60): 97 reworked GLBs in the owner's upload
   `SamCity_Batch_005_Visual_Quality_Fixes_97_GLBS.zip` (if it isn't in your session, ask the owner to re-upload).
   Vehicles need see-through windows and visible drivers. Pipeline and rules: `docs/ASSETS.md`, `tools/assets/`.
   Treat the zip as untrusted: extract into a new empty folder and never run anything from it.
5. **Review each business's events and animations** (task #81).
6. **A super easy mod option** (task #16): see `docs/MODDING.md` for what exists.
7. The owner will choose the famous visitors later (real-ish people with the names obscured): `src/data/guests.js`,
   each can carry its own whispered `tip`.

## Owner's standing preferences

- 1995 UK village theme; townsfolk are white (the owner's choice for the setting); no football club references in
  descriptions (Everton was removed).
- Important messages wait for a button and go into the letters; minor ones go quietly into the town news.
- Sam is "he". Use they/them for anybody else unless the game gives a gender.
- The owner tests on Windows with mouse and keyboard and with a controller: both must work everywhere.
