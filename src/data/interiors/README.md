# Interiors: the layout contract

Each building's interior is a pure-data **layout** returned by `(def) => layout`. Layouts in `src/data/interiors/*.js`
are keyed by building **id** and win over the older shared layouts in `src/data/layouts.js` (keyed by `def.layout`).
Use the helpers in `kit.js` (`empty()`, `dims(def)`, `wall()`, `floor()`, `counter()`, `table()`).

## Space
- Building-local metres. Origin = middle of the building. **+z is the front** (street side). The front door is in the
  front wall at `x = dims(def).door`, `z = +D/2`; it's 2 m wide. Keep a 1.6 m deep clear zone inside it.
- `W = def.w * 4`, `D = def.d * 4`. Outside walls are 0.3 m thick: usable floor is `x ∈ [-I, I]`, `z ∈ [-J, J]`
  where `I = W/2 - 0.3`, `J = D/2 - 0.3` (from `dims(def)`).
- Furniture `{ t, x, z, r }`: `t` is a type in `FURN` (src/render/Furniture.js plus src/render/furniture/*.js), `x,z` its
  centre, `r` quarter turns (0..3). A piece faces **+z** at r = 0; r = 1 faces +x, r = 2 faces -z, r = 3 faces -x.
  Its footprint is `FURN[t].s` = [x, z] (swapped for r = 1, 3). `solid` pieces block Sam and the sims.
- Things against the back wall usually face +z (r = 0); against the left wall r = 1; right wall r = 3; front wall r = 2.

## Fields
- `furniture` — ground floor pieces.
- `walls` — inside partition walls `{ a: [x, z], b: [x, z], doors: [centre positions along the wall], k: storey, col }`,
  axis-aligned, 0.12 m thick, doorways 1.2 m wide (that's what the indoor route finder needs: don't go narrower, and
  keep doorways clear of furniture by ~0.7 m both sides). They're drawn and collided automatically.
- `floors` — floor coverings `{ x0, x1, z0, z1, kind: 'carpet' | 'lino' | 'tiles' | 'boards', col, k }`.
- `lights` — ceiling pendants `{ x, z, k }`.
- `work` — where staff stand (need at least as many as the building's total `jobs`; `counter()` adds one).
- `visit` — where customers/visitors stand (browsing, queueing, playing). `idle` — loitering spots.
- `counters` — **serving points**: `{ staff: {x,z}, cust: {x,z}, kind: 'till' | 'bar' | 'hatch' | 'desk', goods }`.
  Staff stand at `staff` behind the counter facing the customer at `cust`. Every business that serves the public needs
  at least one. `goods` (optional) names what's handed over: 'pint', 'chips', 'food', 'cup', 'bag', 'ticket', 'video'...
- `tables` — `{ x, z, seats: [{x, z}] }` for places that serve food or drink at tables (cafés, restaurants, pubs).
  `table(l, x, z, n)` adds a table with n chairs (chairs become seats automatically).
- `kitchen` — `[{ x, z }]` where a cook stands (restaurants, cafés, the pub kitchen, chippy fryers).
- `seats` — extra seats `{ x, z, r, kind }` for pieces that aren't chairs (cinema rows, bar stools built into a model...).
  Chairs, stools, sofas, benches and pews already make seats. `seatKind` overrides the seat kind for the whole layout
  ('dining', 'waiting', 'desk', 'pew', 'sofa').
- `beds` — `{ x, z, ax, az }` (lie at x,z; approach from ax,az) for hospitals, the surgery, hotel rooms.
- `terminals` — where Sam uses a desk/terminal (the planning office, town hall).
- `upper` — furniture for upper storeys `{ t, x, z, r, k }` (k = 1, 2, ...). Walls/floors/lights take a `k` too.
- `stairPref` — where a multi-storey building's stairs go: 'left' (up the left wall from the front), 'right', 'back'
  (along the back wall), 'backr'. Without it the stairs go wherever there's least furniture. The stair lane is ~1.05 m
  wide; keep furniture and walls off it on every floor. Buildings of 4+ storeys have a lift in the back-right corner
  (≈2.2 m square) instead: keep that and 2.4 m in front of it clear.
- `noDress: true` — don't scatter the automatic decor (plants, pictures, clocks) along the walls.

## Furniture modules
`src/render/furniture/*.js` export `SIZES` (`{ name: { s: [x, z], solid } }`) and `MAKERS` (`{ name: (g) => {...} }`) built
with `kit.js` (`box(g, w, h, d, colour, x, y, z, opts)` puts a box's **bottom** at y). Plain colours merge into one draw
call; emissive, transparent or textured materials cost a draw each, so use glow sparingly.

## Checking
`node serve.js 8133 --no-browser &` then `node tools/interior-check.cjs 8133 /tmp/out <id> <id>...` writes top-down
cut-away screenshots of every storey and reports spots the route finder can't reach.
