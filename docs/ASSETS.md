# Making models for Sam City

Sam City is going on Steam, so it has to run well on ordinary PCs, including laptops with built-in graphics. What slows a game like this down is not how many models exist, but how many **triangles** and **draw calls** (one per separate part with its own material) are on screen at once. Most models appear many times over (every townsperson's bike, every chair in every café), so a model's cost is multiplied by every copy you can see.

For scale: a whole street-level view of the town is about 250,000 triangles today. Thirty copies of a 26,000-triangle bike would add about 800,000 triangles and 960 draw calls. Checked, the same thirty add 68,000 triangles and 151 draw calls, and look the same at the size you see them.

## The budgets

Triangles are for the closest version. The checker makes the cheaper distance versions for you.

| Folder | What goes in it | Triangles | Materials | Biggest texture |
|---|---|---|---|---|
| `props` | cups, signs, bins, small clutter | 500 | 2 | 512 px |
| `furniture` | chairs, tables, beds, shop fittings | 2,000 | 3 | 1024 px |
| `people` | characters | 3,000 | 3 | 1024 px |
| `animals` | horses, dogs | 3,000 | 3 | 1024 px |
| `bikes` | bicycles, motorbikes | 4,000 | 3 | 1024 px |
| `cars` | cars, vans, buses | 8,000 | 4 | 1024 px |
| `buildings` | whole building shells | 20,000 | 6 | 2048 px |
| `guns` | first-person guns (only ever one on screen) | 10,000 | 4 | 2048 px |

## What to make

The full list of models needed to give every building a proper inside (with names, sizes and which existing pieces each one replaces) is in **[INTERIOR_ASSETS.md](INTERIOR_ASSETS.md)**.

## How to hand models over

1. Export from Blender as **glTF Binary (.glb)**: 1 unit = 1 metre, +Y up (the default), the model's front facing **+Z** (the way it drives or walks).
2. Put it in `assets/incoming/<folder>/`, for example `assets/incoming/bikes/bmx.glb`. Or just send the files and say what each one is.
3. Run the check (or ask Claude to):

   ```
   cd tools/assets && npm install      (only the first time)
   node tools/assets/check.mjs         (from the repo root)
   ```

   It only redoes new or changed files (`--force` redoes everything; `--report` just measures; `--keep` leaves the triangle count alone).
4. Read `assets/models/lib/REPORT.md` (also printed).

## What the check does

- **Measures** triangles, draw calls, materials, textures, size in metres and file size, against the budget for the folder.
- **Tidies:** removes duplicate data, joins parts that share a material into one draw call, merges plain-colour materials onto one small palette texture (8 materials became 1 on the test bike), shrinks oversized textures, and moves the origin to the bottom middle (where the model stands).
- **Keeps moving parts separate:** anything named with `wheel`, `door`, `keep_` or `move_` (for example `wheel_front`, `door_left`) stays its own part, so the game can spin or open it. Name the parent object; everything under it moves together. Put each part's **origin where it turns** (a clock hand on the dial centre, a wheel on its axle, a door on its hinge) and model it in its **rest position** (a clock hand pointing at twelve, a door shut); the game turns it from there. The check keeps that pivot exactly where you put it.
- **Cuts to the budget** if it's over, keeping the shape (it reports how much it changed, as a percentage of the model's size). If it can't get under without damage, it says so and you'll need to simplify it in Blender.
- **Makes two distance versions** at about 40% and 12% of the triangles. The game switches to them at a distance (15 m and 40 m for bikes) and stops drawing the model altogether beyond its range (140 m for bikes).
- **Compresses** everything. The test bike went from 718 KB to 52 KB for all three versions together.

## Verdicts

| Verdict | Meaning |
|---|---|
| **OK** | Within budget, ready to use. |
| **OK (cut to budget)** | It was over budget and the check brought it under without visibly changing it. Worth a look in the report. |
| **OK, with warnings** | Usable, but something's worth fixing, such as too many materials. |
| **OVER: needs work in Blender** | Can't get under the budget without spoiling the shape. Simplify it, or split it into parts. |
| **FIX THE SCALE** | Hundreds of metres across means it was exported in centimetres (scale by 0.01, or tick *Apply Unit* in the export). A few centimetres across means it's too small. |
| **SKIPPED** | It isn't in one of the folders above. |

## Blender tips

- **Decimate modifier** (Collapse, ratio around 0.1–0.2) is the quickest way to bring a high-detail model down. Apply it, look at it from game distances, and only fix the bits that look wrong.
- **Fewer materials:** give parts that are the same colour the same material. The checker merges plain colours anyway, but each textured material is still its own draw call.
- **Small details** like bolts, stitching and chain links read better as texture than as geometry at the game's pixel size, if at all.
- **Hidden faces** (the inside of a closed box, the underside of things on the floor) can go.
- **Round things:** 16–24 sides is plenty for a wheel. Beyond that, nobody sees the difference at game size.

## In the game

Checked models are listed in `assets/models/lib/manifest.json`, and the game loads them through `src/render/ModelLib.js`:

```js
const bike = game.models.spawn('bikes/bmx');            // a copy (null while it's still loading in the background)
game.models.turn(bike, 'wheel_front', distance / 0.34); // spin a part kept separate
```

Every copy shares its geometry and materials with all the others, and switches between its distance versions by itself.

**Furniture swaps in by itself.** A model named after one of the game's furniture pieces (the entries in [INTERIOR_ASSETS.md](INTERIOR_ASSETS.md) that say "replaces `x`") takes that piece's place in every room as soon as it has passed the check: `furniture/plant.glb` replaced the old block plant in about 170 buildings. Its variations (`plant_2`, `plant_3`) are mixed in by position. Copies of the same model in a building are merged into one draw call. What blocks Sam and the townsfolk is fitted to the model's own footprint, and a stool's seat height is read from the model (townsfolk sit up on a bar stool), so a piece can be smaller or taller than the block it replaces.

Everything else needs hooking up to whatever uses it, and that is done per kind of model: entries that say "in place of `x` here" (only in certain buildings), the wall clock, the bikes townsfolk ride, and so on.
