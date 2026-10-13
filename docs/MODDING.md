# Modding Sam City

Mods are folders inside `mods/`. A mod is switched on by adding its folder name to `mods/index.json`:

```json
{ "mods": ["example", "my-mod"] }
```

Each mod has a `mod.json`. Every part is optional, so a mod can be as small as a few lines of speech. Mods load in the order listed, before the game starts. Problems are reported in the message log ("Mods: loaded ... (problems: ...)") and in the browser console, and a broken mod never stops the game.

`mods/example/` is a complete working example (switch it on to try it).

## Textures
```json
"textures": { "grass": "grass.png", "brick": "my_brick.png" }
```
Replaces any image from the texture pack by name (the names are the keys of `textures/manifest.json` in a texture pack). Images are pixel art: keep them small (16 to 64 px) and seamless.

## Speech
```json
"speech": {
  "gossip": ["Something a grown-up says when gossiping."],
  "about":  ["A line about themselves."],
  "family": ["A line about their family."],
  "child":  ["Something a child says (keep it clean)."],
  "elder":  ["Something an old person says."],
  "night":  ["Said to Sam late at night."],
  "pub":    ["Said in the pub (adult humour setting)."],
  "chat":   ["A catchphrase (adult humour setting)."],
  "slips":  [[], ["Stage 1 slip of the act"], ["Stage 2"], ["Stage 3"], ["Stage 4"]]
}
```
`slips` are the cracks in the show, by story stage (0 = none yet, 4 = nearly the end). Keep them subtle.

More things people say when Sam talks to them (all optional, added to the built-in lists in `src/data/talkworld.js`, `voices.js`, `hobbies.js`, `talk90s.js` and `stories.js`):
```json
"speech": {
  "jokes":        ["A clean cracker joke."],
  "smalltalk":    ["A bit of chat about nothing in particular."],
  "requests":     ["A little favour someone asks Sam."],
  "catchphrases": ["Somebody's catchphrase."],
  "hobbies":      { "bellringing": { "label": "bell ringing", "lines": ["Did a full peal on Sunday. Three hours. My arms!"] } },
  "work":         { "baker": ["Something a baker says about the job."] },
  "stories":      { "allotmentfeud": { "who": { "min": 30 }, "steps": ["First bit.", "Next bit, a few days later."], "idle": ["Nothing new yet."], "done": ["After it's all over."] } }
}
```
Lines can use `{a}` (another resident's name), `{first}` (their own), `{town}`, `{team}` and, in stories, `{nbr}` (a neighbour they keep coming back to). Lines that mention a pub, chippy, school and so on are only said once the town has one.

## Townsfolk: names and looks
```json
"names": { "male": ["Barry"], "female": ["Maureen"], "surnames": ["Ackroyd"] },
"looks": { "topsMale": ["#7a2a6a"], "topsFemale": ["#2a8a7a"], "pants": ["#222222"], "hair": ["#3b2a1a"] }
```
Colours are `"#rrggbb"` strings or numbers. New townsfolk pick from the combined lists.

## Adverts
```json
"adverts": [["HEADLINE", "The strapline under it", "#background", "#text"]],
"pitches": ["What a townsperson says when they suddenly do an advert at the camera."]
```
Billboards cycle through every poster. Use made-up brands.

## Celebrity guests
```json
"guests": [{ "name": "Kenny Dash", "title": "The Northern Soul DJ", "gender": "m", "age": 50,
  "look": { "shirt": "#1a1a1a" }, "sign": "What they write on an autograph", "lines": ["Said to the crowd"], "hint": false }]
```
`hint: true` means they always whisper something about the show to Sam. Use made-up people.

## Shop and pub goods
```json
"shopgoods": { "tavern": [["a pint of Tetley's", 1.6, { "drunk": 0.15 }]] }
```
Keyed by building id. Effects: `hunger` (negative fills you up), `energy`, `drunk` (0 to 1), `mood`, `inv: ["food", 2]`, `note` (a line Sam thinks), `lotto: true`.

## Buildings
```json
"buildings": {
  "soulclub": { "name": "Soul Club", "menu": "Commerce", "age": 3, "purpose": "Dancing till dawn.",
    "w": 2, "d": 2, "floors": 1, "wall": "brick", "roof": "flat", "layout": "tavern",
    "dining": true, "jobs": { "publican": 1 }, "permit": { "cost": 500, "pop": 10 }, "mat": { "brick": 10, "timber": 4 }, "work": 30,
    "blurb": "Shown on the build card." }
}
```
A building is a def like those in `src/data/buildings.js` (copy one and change it). Useful fields:
- `menu`: Homes, Food, Industry, Transport, Civic or Commerce (or a new name for a new tab). `age`: 0 Timber & Thatch, 1 Brick, 2 Industrial, 3 Electric, 4 Modern.
- `w`, `d` (size in 4 m units), `floors`, `wall` (brick, tan, grey, civic, white, industrial, glass, tudor), `roof` (gable, flat, hip, thatch, none), `roofColor`.
- `layout`: the interior (shop, tavern, house, office, cafe, clinic, school, church, ...; see `src/data/layouts.js`).
- `beds` (a home), `jobs` ({ role: count }, roles in `ROLES`), `shopping` / `dining` (people visit), `income` (per worker per month), `rent` (per month), `joy` (cheers people up), `heals`.

## Models (furniture, buildings, hats)
Models are blocky, like everything else in the game: a list of boxes, each `[width, height, depth, "#colour", x, y, z]` in metres (`y` is the bottom of the box; add `{ "glow": true }` as an 8th item for lit-up parts). No 3D software needed: sketch it on squared paper.
```json
"models": {
  "jukebox": [[0.9, 1.1, 0.5, "#5a2a1a", 0, 0, 0], [0.8, 0.35, 0.06, "#ffd23f", 0, 1.1, 0.2, { "glow": true }]],
  "tophat":  [[0.32, 0.03, 0.32, "#111111", 0, 0, 0], [0.24, 0.28, 0.24, "#111111", 0, 0.03, 0]]
},
"furniture": { "jukebox": { "size": [0.9, 0.5], "solid": true, "model": "jukebox" } },
"hats": { "tophat": "tophat" }
```
- **Furniture** can then be used by name anywhere furniture is (and by scripts).
- **Hats** are worn with `"look": { "hat": { "type": "model", "model": "tophat" } }` (on a guest, or set from a script); `y` counts up from the crown of the head.
- **A whole building** can be a model: give the building `"model": "teahut"` and `"modelH"` (its height). The front of the building faces +z. One building unit is 4 m, so a 1 x 1 building is 4 m square, centred on 0, 0.

## Events
```json
"events": [{ "id": "allnighter", "hours": [22, 24], "chance": 0.08, "who": "resident",
  "message": "{name} has been dancing since nine.", "icon": "🕺", "label": "All-nighter", "say": ["Keep the faith!"] }]
```
Rolled every game hour between `hours`. `chance` is per hour. `who`: resident, child or any. `{name}` is the person it happened to; they say one of `say`, and `icon` puts a marker on the map.

## Scripts
```json
"script": "main.js"
```
An ES module whose default export is called once the game exists:
```js
export default function (game, api) {
  game.clock.on('hour', () => { /* ... */ });
  // api.say(sim, text), api.message(from, text), api.mark(x, z, icon, label)
  // api.BUILDINGS, api.SHOP_GOODS, api.ADS, api.GUESTS
}
```
`game` is the whole game (`game.population.sims`, `game.buildings.list`, `game.economy`, `game.player`, `game.clock`, `game.messages`, ...). Scripts can do anything, so only install mods you trust.

## Tips
- Test with the Demo City button: it builds a busy town quickly.
- Keep it in period (mid-90s England) and keep the story subtle.
- Console platforms: data mods (everything except `script`) are the safe, portable kind.
