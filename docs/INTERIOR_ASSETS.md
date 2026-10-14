# Interior assets: everything to make

This is the list of 3D models needed to give every building in Sam City a proper inside. The goal is a bowling alley that looks like a bowling alley, a chippy that looks like a chippy, and so on for every building in the game. Read it together with **[ASSETS.md](ASSETS.md)**: the budgets, export settings and checks there apply to everything here.

The town is set in **1990s Britain**. It starts as a timber village and grows through five ages (Timber & Thatch, Brick & Masonry, Industrial, Electric, Modern), so the 1990s look is what most buildings are seen in. Where an older building also needs an earlier look (oil lamps rather than strip lights, a brass till rather than an electronic one), it's listed under **Earlier ages**. Those come second.

## How to read an entry

`folder/name` — what it is · size · notes

- **`folder/name`** is the file to make: `furniture/lane` is `assets/incoming/furniture/lane.glb`. The folder sets the budget (ASSETS.md). Use the name exactly as written, lower case.
- **★** marks a hero item: the thing that makes the room read as what it is. Make these first.
- **Size** is width × depth × height in metres, as it stands with its front facing you.
- **fits W × D** means the model **replaces an existing block model** in the game, so its floor footprint has to fit inside W × D or it will block walkways. Height is up to you (a sensible real height is given).
- **×3** means make three variations (`plant_1`, `plant_2`, `plant_3`), so a room isn't full of identical copies.
- **Moving parts:** name them as given (`door_left`, `move_reels`...). Anything with `door`, `wheel`, `move_` or `keep_` in its name stays a separate part the game can animate. Name the parent object and everything under it moves together.
- **Glow:** screens, neon and lit signs. Give them an emission colour in Blender, and keep to **one glowing material per model** (each one is an extra draw call).

## Rules that apply to everything

- **Export:** `.glb`, 1 unit = 1 metre, front facing **+Z**, standing on the floor at Y = 0. Wall-hung items have their back flat (it goes against the wall).
- **Stock is part of the shelf.** A shelf of videos, a bar's bottles, a rack of bikes: model the whole unit with its contents as **one model**, not 200 separate tapes. Small labels, covers and spines go on one small texture (256–512 px).
- **Colour:** plain colours are best, and the checker merges them onto one palette for free. Use a texture only for printed things (posters, labels, screens, signs).
- **Detail:** things are seen from a few metres away, at the game's chunky pixel resolution. Bolts, stitching and fine trim won't show; strong shapes and clear silhouettes will.
- **Lights** (the fittings themselves) are models; the game makes the actual light.

## Make these first

These are used in the most buildings, so they change the look of the whole town fastest:

1. `props/wall_clock` (done) and `furniture/grandfather_clock` (in 67 buildings)
2. `furniture/plant` ×3
3. `props/picture` ×4
4. `props/strip_light` and `props/pendant_light`
5. `furniture/counter` and `furniture/till`
6. `furniture/chair`, `furniture/table`, `furniture/stool`
7. `furniture/shelf` and `furniture/shelfbooks`
8. `furniture/reception`
9. `furniture/bench`, `furniture/locker`, `props/notice_board`
10. `furniture/crate`, `furniture/barrel`, `furniture/rack`
11. The home set: `furniture/sofa`, `armchair`, `tvunit`, `kitchen`, `dbed`, `wardrobe`, `bath`, `toilet`, `basin`

After that, the hero item of each building (★), then the rest.

---

## 1. Shared kit (used in many buildings)

### Walls, ceilings and lights
- ★ `props/wall_clock` — round office clock, white face, black frame · 0.35 × 0.06 × 0.35 · the clock the game hangs on a wall (over the door, mostly) in nearly every shop, pub, office and civic building · hands as `move_hand_hour`, `move_hand_min`, pivots on the dial centre, pointing at twelve when not turned. **Done** (the first production model: in the game, keeping the town's time)
- ★ `furniture/grandfather_clock` — longcase (grandfather) clock: wooden case, brass face, pendulum behind a glass door · 0.5 × 0.3 × 1.9 · fits 0.5 × 0.3 · replaces `clock` (in 67 buildings' layouts) · hands `move_hand_hour`, `move_hand_min`, pendulum `move_pendulum`
- ★ `props/picture` ×4 — framed pictures: a landscape, a seaside print, a horse, a football team photo · 0.8 × 0.05 × 0.6 · fits 0.8 × 0.08 · replaces `picture`
- `props/picture_queen` — the Queen's official portrait in a gilt frame (civic buildings) · 0.6 × 0.05 × 0.8
- `props/poster` ×6 — wall posters (band, film, health notice, holiday advert, missing cat, Neighbourhood Watch) · 0.7 × 0.02 × 1.0 · fits 1.0 × 0.1 · replaces `poster`
- ★ `props/strip_light` — 1.5 m fluorescent fitting with opal diffuser (glow) · 1.5 × 0.2 × 0.1
- ★ `props/pendant_light` — ceiling flex with a fabric shade (glow bulb) · 0.4 × 0.4 × 0.6
- `props/spotlights` — three spotlights on a ceiling bar (shops, salon) · 1.2 × 0.12 × 0.2
- `props/ceiling_fan` — four-blade fan with light · 1.2 × 1.2 × 0.4 · blades as `move_blades`
- `props/radiator` — white panel radiator · 1.0 × 0.12 × 0.6 · fits 1.0 × 0.12 · replaces `radiator`
- `props/notice_board` — cork board with pinned notices and leaflets · 1.2 × 0.05 × 0.9
- `props/fire_extinguisher` — red extinguisher on a wall bracket · 0.2 × 0.2 × 0.6
- `props/exit_sign` — green "running man" fire exit sign (glow) · 0.4 × 0.05 × 0.2
- `props/cctv` — 1990s box camera on a bracket · 0.15 × 0.35 × 0.2
- `props/payphone` — BT wall payphone with a hood · 0.35 × 0.25 × 0.6
- `props/mirror` — wall mirror · 1.4 × 0.05 × 0.9 · fits 1.4 × 0.1 · replaces `mirror`
- `props/bin_office` — waste-paper bin · 0.3 × 0.3 × 0.35
- `props/bin_pedal` — kitchen pedal bin · 0.3 × 0.3 × 0.45
- `props/wet_floor_sign` — yellow A-frame "caution wet floor" · 0.3 × 0.25 × 0.6
- `props/open_sign` — neon OPEN sign for a window (glow) · 0.6 × 0.05 × 0.3
- `props/leaflet_rack` — wall rack of leaflets · 0.5 × 0.1 × 0.7
- `props/calendar` — wall calendar, 1996 · 0.3 × 0.02 × 0.5
- `props/coat_stand` — bentwood coat stand with a coat and brolly · 0.5 × 0.5 × 1.8
- `furniture/pegs` — row of coat hooks with coats and bags · 2.0 × 0.3 × 1.6 · fits 2.0 × 0.4 · replaces `pegs`

### Plants
- ★ `furniture/plant` ×3 — rubber plant in a pot, yucca, spider plant on a stand · 0.5 × 0.5 × 1.3 · fits 0.6 × 0.6 · replaces `plant`
- `props/plant_small` ×2 — pot plant for a windowsill or desk · 0.25 × 0.25 × 0.35
- `props/vase_flowers` — vase of flowers · 0.2 × 0.2 × 0.45

### Seating
- ★ `furniture/chair` — wooden dining chair · 0.45 × 0.5 × 0.9 · fits 0.5 × 0.5 · replaces `chair`
- `furniture/chair_stacking` — grey plastic stacking chair on steel legs · 0.45 × 0.5 × 0.8
- `furniture/chair_office` — swivel chair on castors · 0.6 × 0.6 × 1.0
- `furniture/chair_velvet` — padded restaurant chair, red velvet · 0.5 × 0.55 × 0.95
- ★ `furniture/stool` — bar stool, chrome with a red vinyl seat · 0.4 × 0.4 × 0.75 · fits 0.45 × 0.45 · replaces `stool`
- ★ `furniture/bench` — wooden slatted bench · 2.0 × 0.6 × 0.45 · fits 2.0 × 0.6 · replaces `bench`
- `furniture/bench_waiting` — four joined plastic waiting seats on a steel beam · 2.0 × 0.6 × 0.8
- ★ `furniture/sofa` — three-seater · 2.2 × 0.9 × 0.85 · fits 2.2 × 0.95 · replaces `sofa`. Make `sofa` (floral, homes) and `sofa_leather` (hotel, salon, office)
- `furniture/armchair` — fireside armchair · 0.85 × 0.85 × 0.95 · fits 0.9 × 0.85 · replaces `armchair`
- `furniture/beanbag` — big beanbag (youth club, kids' rooms, library) · 0.8 × 0.8 × 0.6

### Tables and desks
- ★ `furniture/table` — square dining or pub table · 0.9 × 0.9 × 0.75 · fits 1.4 × 1.4 (chairs are placed around it) · replaces `table`
- `furniture/table_cafe` — small formica café table on a pedestal · 0.7 × 0.7 × 0.75
- `furniture/table_restaurant` — table with a white cloth, cutlery and folded napkins · 0.9 × 0.9 × 0.75
- `furniture/table_folding` — trestle table (halls, jumble sales) · 1.8 × 0.75 × 0.75
- `furniture/coffeetable` — low coffee table · 1.0 × 0.55 × 0.45 · fits 1.0 × 0.55 · replaces `coffeetable`
- ★ `furniture/desk` — wooden office desk with drawers, papers and a desk lamp · 1.6 × 0.8 × 0.75 · fits 1.8 × 0.9 · replaces `desk`

### Storage and back-of-house
- ★ `furniture/shelf` — wall shelving unit with general stock (boxes, tins, packets) · 2.1 × 0.5 × 2.0 · fits 2.1 × 0.55 · replaces `shelf`
- ★ `furniture/shelfbooks` — bookcase full of books, ring binders, a few ornaments · 2.1 × 0.5 × 2.0 · fits 2.1 × 0.55 · replaces `shelfbooks`
- ★ `furniture/locker` — bank of three grey steel lockers · 0.9 × 0.5 × 1.9 · fits 0.9 × 1.0 · replaces `locker` · doors `door_1`, `door_2`, `door_3`
- `furniture/filing` — four-drawer filing cabinet · 0.5 × 0.6 × 1.3 · fits 0.6 × 0.6 · replaces `filing`
- ★ `furniture/crate` ×2 — wooden crate; a stack of cardboard boxes · 0.9 × 0.9 × 0.7 · fits 0.9 × 0.9 · replaces `crate`
- ★ `furniture/barrel` — wooden barrel · 0.6 × 0.6 × 0.9 · fits 0.7 × 0.7 · replaces `barrel`
- ★ `furniture/rack` — steel storage racking with boxes and tools · 1.8 × 0.4 × 2.0 · fits 1.8 × 0.4 · replaces `rack`
- `furniture/chest` — wooden blanket box · 1.0 × 0.55 × 0.55 · fits 1.0 × 0.6 · replaces `chest` · lid `move_lid`
- `furniture/safe` — heavy green safe · 0.9 × 0.8 × 1.2 · fits 1.0 × 0.9 · replaces `safe` · `door_safe`
- `furniture/pallet_boxes` — pallet stacked with shrink-wrapped boxes · 1.2 × 1.0 × 1.3
- `props/sack_pile` — pile of sacks (flour, grain, potatoes, sand) · 1.0 × 0.8 × 0.6

### Shop fittings
- ★ `furniture/counter` — shop counter with a laminate top · 2.6 × 0.8 × 1.0 · fits 2.6 × 0.8 · replaces `counter`
- `furniture/counter_glass` — glass-fronted display counter (jewellery, cakes, phones) · 2.4 × 0.8 × 1.0
- ★ `furniture/till` — counter section with a 1990s electronic cash register, card machine and carrier bags · 1.4 × 0.7 × 1.3 · fits 1.4 × 0.7 · replaces `till` · cash drawer `move_drawer`
- ★ `furniture/gondola` — double-sided island shelving with groceries · 2.4 × 0.9 × 1.5 · fits 2.4 × 0.9 · replaces `gondola`
- ★ `furniture/fridge` — upright glass-door drinks chiller (glow inside) · 1.8 × 0.7 × 2.0 · fits 1.8 × 0.7 · replaces `fridge` · `door_left`, `door_right`
- `furniture/chest_freezer` — ice-cream / frozen-food chest freezer with a sliding glass lid · 1.5 × 0.7 × 0.9
- `furniture/magrack` — magazine and newspaper rack · 1.6 × 0.45 × 1.4 · fits 1.6 × 0.45 · replaces `magrack`
- `props/baskets` — stack of red plastic shopping baskets · 0.45 × 0.35 × 0.6 · fits 0.5 × 0.5 · replaces `baskets`
- `furniture/sweetjars` — wall shelves of sweet jars · 1.6 × 0.4 × 1.8 · fits 1.6 × 0.4 · replaces `sweetjars`
- `props/lottery_stand` — pink National Lottery play-slip stand with little pens · 0.5 × 0.4 × 1.3
- `props/cig_gantry` — wall unit of cigarettes behind the counter · 1.2 × 0.25 × 1.0
- `props/card_spinner` — greetings-card spinner · 0.6 × 0.6 × 1.7
- `props/crisps_stand` — wire stand of crisp boxes · 0.6 × 0.4 × 1.4
- `props/dump_bin` — wire bargain bin full of goods · 0.9 × 0.6 × 0.8

### Pub and bar
- ★ `furniture/bar` — wooden bar counter with a brass foot rail and bar towels · 4.0 × 0.9 × 1.1 · fits 4.0 × 0.9 · replaces `bar`
- ★ `furniture/backbar` — back-bar: optics, bottles, glasses, mirror, crisp boxes · 3.6 × 0.5 × 2.2 · fits 3.6 × 0.5 · replaces `backbar`
- ★ `props/beer_pumps` — four hand-pulls and a lager font with brand clips · 0.8 × 0.3 × 0.5
- ★ `furniture/fruitmachine` — fruit machine with a lit front (glow) · 0.75 × 0.6 × 1.8 · fits 0.8 × 0.6 · replaces `fruitmachine` · reels `move_reels`
- `furniture/jukebox` — 1990s CD jukebox (glow) · 0.9 × 0.5 × 1.5 · fits 0.9 × 0.5 · replaces `jukebox`
- `props/dartboard` — dartboard in a cabinet with a chalk scoreboard · 0.6 × 0.08 × 0.7 · fits 0.6 × 0.1 · replaces `dartboard` · `door_left`, `door_right`
- `furniture/cig_machine` — cigarette vending machine · 0.7 × 0.4 × 1.6
- `furniture/quiz_machine` — pub quiz machine (glow screen) · 0.7 × 0.6 × 1.7
- `furniture/pool_table_pub` — coin-operated pub pool table · 1.2 × 2.1 × 0.8
- `furniture/piano` — old upright piano · 1.5 × 0.6 × 1.3

### Commercial kitchen
- `furniture/kitchen_steel` — stainless prep bench with a shelf underneath · 1.8 × 0.7 × 0.9
- `furniture/cooker_steel` — six-burner range with an oven · 1.2 × 0.8 × 0.9
- `props/extractor_hood` — steel extractor canopy · 1.6 × 1.0 × 0.6
- `furniture/sink_steel` — double stainless sink unit with taps · 1.4 × 0.6 × 0.9
- `props/tea_urn` — catering water urn with tap · 0.35 × 0.35 × 0.6

### Office and electronics
- ★ `furniture/pcdesk` — office desk with a beige PC, CRT monitor (glow screen), keyboard, phone, in-tray · 1.6 × 0.8 × 1.2 · fits 1.6 × 0.8 · replaces `pcdesk`
- `furniture/copier` — big photocopier · 1.0 × 0.7 × 1.1 · fits 1.0 × 0.7 · replaces `copier` · lid `move_lid`
- `furniture/cooler` — office water cooler · 0.35 × 0.35 × 1.3 · fits 0.4 × 0.4 · replaces `cooler`
- `furniture/tv` — CRT TV on a black stand with a VCR (glow screen) · 1.0 × 0.5 × 1.3 · fits 1.2 × 0.5 · replaces `tv`
- `props/tv_bracket` — CRT TV on a wall bracket, high up (glow screen) · 0.55 × 0.5 × 0.5
- `props/fax` — fax machine · 0.4 × 0.35 × 0.2
- `props/desk_phone` — beige office phone · 0.25 × 0.2 × 0.1
- `props/desk_lamp` — anglepoise lamp · 0.2 × 0.4 × 0.5
- `props/vending_snacks` — snack vending machine (glow) · 0.9 × 0.8 × 1.8
- `props/vending_drinks` — cans vending machine (glow) · 0.9 × 0.8 × 1.8

### Bathroom
- `furniture/toilet` — close-coupled toilet · 0.4 × 0.7 × 0.8 · fits 0.45 × 0.7 · replaces `toilet` · seat lid `move_lid`
- `furniture/basin` — pedestal basin with taps · 0.55 × 0.45 × 0.85 · fits 0.6 × 0.45 · replaces `basin`
- `furniture/bath` — bath with taps and a shower curtain · 1.7 × 0.75 × 0.55 · fits 1.7 × 0.75 · replaces `bath`. Make two: `bath` (white) and `bath_avocado` (that 1970s green)
- `furniture/urinals` — row of three urinals with dividers · 2.0 × 0.4 × 1.2
- `furniture/hand_dryer` — wall hand dryer · 0.3 × 0.2 × 0.3

---

## 2. Homes

**Huts, cabins and cottages (Timber & Thatch, Brick & Masonry):** Log Cabin (`shack`), Wooden Hut (`hut`), Family Cabin (`cabin`), and the Stone Cottage in its early years.
- ★ `furniture/strawbed` — straw mattress on a plank frame with a wool blanket · 1.0 × 1.9 × 0.45 · fits 1.1 × 2.0 · replaces `strawbed`
- ★ `furniture/firepit` — central fire pit ringed with stones, pot on a tripod (glow embers) · 1.2 × 1.2 × 0.9 · fits 1.2 × 1.2 · replaces `firepit`
- ★ `furniture/hearth` — stone fireplace with a cooking pot on a crane (glow) · 1.8 × 0.8 × 1.6 · fits 1.8 × 0.8 · replaces `hearth`
- `furniture/table_plank` — rough plank table · 1.4 × 0.8 × 0.75
- `furniture/stool_three` — three-legged stool · 0.35 × 0.35 × 0.45
- `furniture/spinning_wheel` — spinning wheel · 0.8 × 0.5 × 0.9 · wheel `wheel_spin`
- `furniture/washstand` — jug and bowl on a wooden stand · 0.6 × 0.45 × 0.8
- `furniture/dresser_welsh` — Welsh dresser with plates · 1.4 × 0.5 × 2.0
- `furniture/range` — black cast-iron kitchen range · 1.3 × 0.7 × 1.2 · fits 1.3 × 0.7 · replaces `range`
- `furniture/larder` — larder cupboard · 0.9 × 0.5 × 1.8 · fits 0.9 × 0.5 · replaces `larder`
- `furniture/stove` — pot-bellied stove with flue (glow) · 0.8 × 0.8 × 1.2 · fits 1.2 × 0.8 · replaces `stove`
- `furniture/mangle` — iron mangle · 0.7 × 0.6 × 1.3 · fits 0.7 × 0.6 · replaces `mangle`
- `furniture/gramophone` — horn gramophone on a cabinet · 0.6 × 0.5 × 1.2 · fits 0.6 × 0.5 · replaces `gramophone`
- `furniture/tin_bath` — tin bath (used in front of the fire) · 1.2 × 0.6 × 0.45
- `props/oil_lamp` — hanging oil lamp (glow) · 0.25 × 0.25 × 0.5
- `props/candle` — candle in a holder (glow) · 0.1 × 0.1 × 0.25
- `props/rag_rug` — round rag rug · 1.6 × 1.6 × 0.02
- `props/pots_pans` — pots and pans hanging from a rail · 1.0 × 0.2 × 0.6
- `props/firewood` — basket of firewood · 0.5 × 0.4 × 0.5

**1990s homes:** Stone Cottage, Brick Townhouse, Bungalow, Semi-Detached, Victorian Terrace, and each flat. Living room, kitchen, bathroom, a main bedroom and a kids' room.
- ★ `furniture/sofa` and `furniture/armchair` (shared kit)
- ★ `furniture/tvunit` — teak-effect TV cabinet with a CRT TV (glow), VCR and video tapes · 1.2 × 0.5 × 1.2 · fits 1.2 × 0.5 · replaces `tvunit`
- ★ `furniture/mantel` — fireplace with a gas fire, mantelpiece, carriage clock and photos · 1.4 × 0.35 × 1.2 · fits 1.4 × 0.35 · replaces `mantel`
- `furniture/gasfire` — free-standing gas fire with fake coals (glow) · 1.0 × 0.35 × 0.7 · fits 1.4 × 0.4 · replaces `gasfire`
- `furniture/rug` — living-room rug · 2.2 × 1.5 · fits 2.2 × 1.5 · replaces `rug`
- `furniture/lamp` — standard lamp with a fringed shade · 0.4 × 0.4 × 1.6 · fits 0.4 × 0.4 · replaces `lamp`
- `furniture/hifi` — stereo stack (tuner, tape deck, CD) with speakers · 0.6 × 0.4 × 1.0 · fits 0.6 × 0.4 · replaces `hifi`
- `furniture/phonetable` — telephone seat or table with a cordless phone and the Yellow Pages · 0.5 × 0.4 × 0.75 · fits 0.5 × 0.4 · replaces `phonetable`
- ★ `furniture/kitchen` — fitted kitchen run: cupboards, sink, hob, kettle, toaster, microwave · 2.6 × 0.6 × 2.2 · fits 2.6 × 0.65 · replaces `kitchen`
- `furniture/kitchenlow` — the same run, base units only (worktop height 0.95) · 2.6 × 0.6 × 0.95 · fits 2.6 × 0.65 · replaces `kitchenlow`
- `furniture/fridgefreezer` — fridge-freezer with magnets and a drawing · 0.6 × 0.65 × 1.8 · fits 0.6 × 0.65 · replaces `fridgefreezer` · `door_top`, `door_bottom`
- `furniture/washer` — front-loading washing machine · 0.6 × 0.6 × 0.85 · fits 0.8 × 0.8 · replaces `washer` (homes only; the launderette has its own) · drum `move_drum`
- `furniture/ironing` — ironing board with an iron and a pile of shirts · 1.2 × 0.35 × 0.9 · fits 1.2 × 0.35 · replaces `ironing`
- `furniture/airer` — clothes airer with washing on it · 0.9 × 0.5 × 1.2 · fits 0.9 × 0.5 · replaces `airer`
- ★ `furniture/dbed` — double bed with a floral duvet · 1.5 × 2.0 × 0.9 · fits 1.6 × 2.1 · replaces `dbed`
- `furniture/bed` — single bed · 1.0 × 2.0 × 0.8 · fits 1.3 × 2.2 · replaces `bed`
- `furniture/bunk` — bunk beds with kids' duvets (football, cartoon) · 1.0 × 2.0 × 1.6 · fits 1.0 × 2.0 · replaces `bunk`
- `furniture/cot` — baby's cot with a mobile · 0.65 × 1.25 × 1.0 · fits 0.7 × 1.3 · replaces `cot`
- `furniture/bedside` — bedside table with a lamp and a clock radio · 0.45 × 0.4 × 0.55 · fits 0.45 × 0.4 · replaces `bedside`
- `furniture/wardrobe` — double wardrobe · 1.2 × 0.6 × 2.0 · fits 1.2 × 0.6 · replaces `wardrobe` · `door_left`, `door_right`
- `furniture/dresser` — dressing table with a mirror · 1.1 × 0.5 × 1.4 · fits 1.1 × 0.5 · replaces `dresser`
- `furniture/homepc` — computer desk with a beige home PC, joystick and floppy disks (glow screen) · 1.2 × 0.6 × 1.2 · fits 1.2 × 0.6 · replaces `homepc`
- `props/games_console` — games console on the carpet with two controllers and a cartridge · 0.5 × 0.4 × 0.1
- `props/toys_floor` — scattered toys: Lego, an action figure, a toy car · 0.8 × 0.6 × 0.15
- `props/laundry_basket` — wicker laundry basket · 0.5 × 0.4 × 0.6
- `furniture/towel_rail` — heated towel rail · 0.6 × 0.15 × 1.0
- `furniture/shower` — corner shower cubicle · 0.9 × 0.9 × 2.0 · `door_shower`
- (plus the shared bathroom set: `toilet`, `basin`, `bath`)

**Flats** (Apartments, Council Flats, Maisonettes): entrance hall and corridors, plus a studio flat.
- ★ `furniture/mailboxes` — bank of twelve metal letterboxes · 1.2 × 0.3 × 1.2
- ★ `furniture/lift_doors` — steel lift doors with a call button and floor indicator (glow) · 2.2 × 0.3 × 2.4 · `door_left`, `door_right`
- `props/entryphone` — door entry panel with buttons · 0.25 × 0.08 × 0.4
- `furniture/reception` — the caretaker's desk (shared kit, under civic)
- `furniture/kitchenette` — studio kitchenette: two rings, sink, little fridge · 1.6 × 0.6 × 1.8
- `furniture/sofabed` — sofa bed, unfolded with bedding · 1.4 × 2.0 × 0.8
- `props/stair_rail` — steel stair handrail section · 2.0 × 0.1 × 1.0

**Static Caravan:**
- ★ `furniture/caravan_dinette` — U-shaped bench seating round a fold-down table · 2.0 × 1.6 × 0.9
- `furniture/caravan_kitchen` — narrow caravan kitchen: two rings, sink, tiny fridge · 1.6 × 0.55 × 1.8
- `furniture/caravan_bed` — fixed double bed with a bedspread · 1.4 × 1.9 × 0.6
- `props/gas_heater` — portable Calor gas heater (glow) · 0.45 × 0.35 × 0.7
- `props/net_curtain` — net curtain on a wire · 1.0 × 0.02 × 0.8

---

## 3. Food and drink

**The Red Lion (pub)** — from the start of the game, so it has an early version too.
- ★ `furniture/bar`, `furniture/backbar`, `props/beer_pumps` (shared kit)
- ★ `furniture/settle` — high-backed wooden pub settle · 1.6 × 0.6 × 1.2
- `furniture/table_pub` — round cast-iron pub table · 0.7 × 0.7 × 0.75
- `furniture/stool` (shared), `furniture/fruitmachine`, `furniture/jukebox`, `props/dartboard`, `furniture/cig_machine`, `furniture/quiz_machine`, `furniture/pool_table_pub`, `furniture/piano`
- `props/brewery_mirror` — gilt-lettered brewery advertising mirror · 0.9 × 0.05 × 1.2
- `props/horse_brasses` — horse brasses on a leather strap · 0.2 × 0.05 × 1.0
- `props/chalk_menu` — chalkboard of pub grub · 0.6 × 0.05 × 0.9
- `props/beer_mats` — table of beer mats, ashtray and a pint · 0.4 × 0.4 × 0.2
- Earlier ages: `furniture/ale_stillage` — barrels on a wooden stillage with taps · 2.0 × 0.8 × 1.2; `props/tankards` — pewter tankards on hooks · 1.0 × 0.15 × 0.3

**Working Men's Club:** everything the pub has, plus:
- ★ `furniture/club_stage` — low stage with a sparkly curtain, an organ and a drum kit · 4.0 × 2.0 × 2.5 · curtain `move_curtain`
- ★ `furniture/tombola` — tombola drum on a stand · 0.6 × 0.5 × 1.0 · drum `move_drum`
- `props/mic_stand` — compère's microphone on a stand · 0.4 × 0.4 × 1.6
- `furniture/trophy_cabinet` — glass cabinet of darts and bowls trophies · 1.2 × 0.4 × 1.8
- `props/committee_board` — "Committee" board with gold names · 0.8 × 0.05 × 1.1
- `furniture/dominoes_table` — small table with a dominoes game going · 0.8 × 0.8 × 0.75

**Chip Shop:**
- ★ `furniture/fryer` — stainless three-pan fryer range with a glass hot cabinet of battered fish and sausages (glow) · 2.4 × 0.9 × 1.4 · fits 2.4 × 0.9 · replaces `fryer`
- ★ `props/menu_backlit` — backlit menu board above the counter (glow) · 2.0 × 0.08 × 0.8
- `props/salt_vinegar` — salt shakers, vinegar bottles, wooden forks and paper on a ledge · 0.8 × 0.25 × 0.3
- `furniture/potato_peeler` — potato rumbler (peeling machine) · 0.6 × 0.6 × 1.1
- `props/pickled_eggs` — big jars of pickled eggs and onions · 0.4 × 0.2 × 0.35
- `props/pie_warmer` — pie warmer cabinet (glow) · 0.5 × 0.4 × 0.5
- `furniture/queue_rail` — chrome queue rail · 2.0 × 0.1 × 1.0

**Greasy Spoon Café:**
- ★ `furniture/cafe_counter` — counter with a tea urn, cake stand under a dome, till · 2.6 × 0.8 × 1.2
- ★ `furniture/griddle` — flat-top griddle and hob behind the counter · 1.2 × 0.7 × 0.95
- `furniture/table_cafe` (shared), `furniture/chair_stacking` (shared)
- `props/sauce_set` — squeezy ketchup tomato, brown sauce, salt and pepper, sugar bowl · 0.25 × 0.15 × 0.2
- `props/letter_menu` — black peg-letter menu board · 0.8 × 0.05 × 0.6
- `props/milkshake_mixer` — chrome milkshake mixer · 0.2 × 0.25 × 0.5

**Taj Mahal Curry House:**
- ★ `furniture/table_restaurant` (shared) with `furniture/chair_velvet`
- ★ `furniture/tandoor` — clay tandoor oven (glow) · 0.9 × 0.9 × 0.9
- `furniture/host_lectern` — host's lectern with a reservations book · 0.5 × 0.4 × 1.2
- `furniture/fish_tank` — tropical fish tank on a cabinet (glow) · 1.2 × 0.45 × 1.4
- `props/elephant_statue` — carved wooden elephant · 0.6 × 0.3 × 0.6
- `props/brass_lantern` — hanging brass lantern (glow) · 0.3 × 0.3 × 0.6
- `props/poppadom_stand` — poppadom stand with pickle tray · 0.3 × 0.3 × 0.25
- `furniture/beer_fridge` — slim fridge of Cobra lager (glow) · 0.6 × 0.6 × 1.8

**Bosphorus Kebab House:**
- ★ `furniture/spit` — doner spit: rotating meat cone in front of a gas grill (glow) · 0.6 × 0.6 × 1.0 · fits 0.6 × 0.6 · replaces `spit` · meat `move_meat`
- ★ `furniture/salad_counter` — glass counter with tubs of salad, chillies and sauces · 2.4 × 0.8 × 1.2
- `props/menu_backlit` (chip shop)
- `furniture/window_shelf` — window counter shelf with stools · 2.4 × 0.4 × 1.0
- `props/pitta_warmer` — pitta bread warmer · 0.4 × 0.35 × 0.3

**Bakery** — from the start, so it has an early version too.
- ★ `furniture/oven` — bakery deck oven with three doors (glow) · 1.6 × 1.0 × 1.8 · fits 1.6 × 1.0 · replaces `oven` · `door_1`, `door_2`, `door_3`
- ★ `furniture/bread_shelf` — wall rack of loaves, cobs and baps · 2.1 × 0.5 × 2.0
- ★ `furniture/cake_counter` — glass display counter of cakes, iced buns and doughnuts · 2.4 × 0.8 × 1.2
- `furniture/dough_mixer` — big floor-standing dough mixer · 0.8 × 0.9 × 1.4 · bowl `move_bowl`
- `furniture/bake_bench` — floured workbench with dough and a rolling pin · 2.2 × 0.9 × 0.9 (in place of the shared `workbench`)
- `furniture/bread_slicer` — bread slicing machine · 0.6 × 0.5 × 0.9
- `furniture/proving_cabinet` — tall proving cabinet · 0.8 × 0.8 × 1.9
- Earlier ages: `furniture/bread_oven_brick` — brick bread oven with a wooden peel · 1.6 × 1.2 × 1.6

**Family Butcher:**
- ★ `furniture/meatcase` — refrigerated glass counter of meats, sausages and pies, with parsley trim · 2.4 × 0.9 × 1.2 · fits 2.4 × 0.9 · replaces `meatcase`
- ★ `furniture/butcher_block` — big wooden chopping block with a cleaver · 0.8 × 0.8 × 0.9
- ★ `props/meat_rail` — hook rail with hanging game birds and strings of sausages · 2.0 × 0.3 × 0.8
- `furniture/mincer` — electric mincer on a stand · 0.5 × 0.5 × 1.2
- `props/scales_butcher` — old enamel shop scales · 0.5 × 0.4 × 0.5
- `furniture/cold_room_door` — heavy cold-room door · 1.2 × 0.2 × 2.1 · `door_cold`

**The Offy (off-licence):**
- ★ `furniture/winerack` — wall wine racking, full · 2.0 × 0.5 × 2.0 · fits 2.0 × 0.5 · replaces `winerack`
- ★ `furniture/offy_counter` — counter with a security screen, the till and sweets at the front · 2.0 × 0.7 × 1.6
- `props/spirits_shelf` — spirits on shelves behind the counter · 1.6 × 0.3 × 1.2
- `props/can_stack` — stacked crates of beer cans (special offer) · 0.8 × 0.6 × 1.0
- `furniture/fridge` (shared), `props/lottery_stand` (shared), `props/cig_gantry` (shared)

---

## 4. Shops

**General Store** — from the start, so it has an early version too.
- ★ `furniture/till`, `furniture/counter`, `furniture/shelf`, `furniture/gondola`, `furniture/magrack`, `props/baskets`, `furniture/sweetjars` (shared)
- `props/veg_crates` — tilted crates of fruit and veg · 1.2 × 0.8 × 0.9
- `props/broom_display` — brushes, mops and buckets on a stand · 0.6 × 0.6 × 1.6
- Earlier ages: `furniture/counter_old` — wooden shop counter with brass scales and a ledger · 2.6 × 0.8 × 1.1; `props/grain_sacks` — open sacks of flour, oats and beans with scoops · 1.2 × 0.6 × 0.7; `furniture/till_brass` — brass till · 0.5 × 0.45 × 0.5

**Kwik Shop Supermarket:**
- ★ `furniture/checkout` — checkout with a conveyor belt, barcode scanner (glow), till and bagging area · 0.9 × 2.4 × 1.2 · fits 0.9 × 2.4 · replaces `checkout` · belt `move_belt`
- ★ `furniture/gondola` ×5 stock versions: `gondola` (tins and jars), `gondola_cereal`, `gondola_crisps`, `gondola_toiletries`, `gondola_cleaning` · 2.4 × 0.9 × 1.5 · fit 2.4 × 0.9
- ★ `furniture/multideck` — open-front dairy chiller with milk, yoghurts and cheese (glow) · 2.4 × 0.9 × 2.0
- `furniture/chest_freezer` (shared)
- `furniture/veg_stand` — tiered fruit and veg stand · 2.4 × 1.2 × 1.2
- `furniture/trolley_bay` — row of nested shopping trolleys · 1.0 × 2.4 × 1.0
- `props/aisle_sign` — hanging aisle sign ("Aisle 3: Tins and Sauces") · 1.2 × 0.05 × 0.4
- `furniture/security_gates` — anti-theft gates at the door · 1.4 × 0.4 × 1.5
- `furniture/service_desk` — customer service desk with cigarettes and the lottery · 2.4 × 0.8 × 1.1

**Tiny Tots Toy Shop:**
- ★ `furniture/toyshelf` — shelving of boxed toys: dolls, action figures, board games, Lego · 2.1 × 0.5 × 2.0 · fits 2.1 × 0.55 · replaces `toyshelf`
- ★ `furniture/rocking_horse` — dapple-grey rocking horse · 1.2 × 0.4 × 1.0
- ★ `furniture/train_table` — model railway layout on a table · 1.8 × 1.0 × 0.9 · train `move_train`
- `props/teddy_big` — giant teddy bear · 0.8 × 0.6 × 1.2
- `furniture/toy_cabinet` — glass cabinet of Pogs, Tamagotchis and Polly Pockets · 1.0 × 0.5 × 1.5
- `props/super_soakers` — Super Soakers hung on a pegboard · 1.2 × 0.15 × 1.0
- `props/kites` — kites hanging from the ceiling · 1.5 × 0.6 × 0.8
- `furniture/dolls_house` — doll's house display · 0.9 × 0.5 × 1.0

**Everything A Pound:**
- ★ `props/dump_bin` ×3 (shared) — bargain bins of different stock
- ★ `furniture/pegwall` — pegboard wall of hanging bagged goods · 2.1 × 0.4 × 2.0
- `furniture/shelf_household` — shelving of household bits: bowls, batteries, cleaning · 2.1 × 0.5 × 2.0
- `props/party_stuff` — balloons, banners and party packs · 0.8 × 0.4 × 1.2

**Our Prize Records:**
- ★ `furniture/record_bins` — browser racks of LPs and CDs · 1.8 × 0.8 × 1.0
- ★ `furniture/cd_wall` — wall of CDs and cassettes · 2.1 × 0.3 × 2.0
- ★ `furniture/listening_post` — listening booth with headphones · 0.6 × 0.5 × 1.5
- `furniture/record_counter` — counter with a till and two turntables · 2.4 × 0.8 × 1.2
- `props/charts_board` — Top 40 chart board · 0.8 × 0.05 × 1.4
- `props/band_standee` — cardboard cut-out of a Britpop band · 1.2 × 0.3 × 1.8

**Blockbusted Video:**
- ★ `furniture/vhs` — shelving of VHS boxes, covers facing out · 2.1 × 0.45 × 2.0 · fits 2.1 × 0.5 · replaces `vhs`. Make `vhs` (films) and `vhs_new` ("New Releases", brighter)
- ★ `furniture/video_counter` — counter with a returns slot, membership cards and sweets · 2.6 × 0.8 × 1.1
- `props/film_standee` — cardboard film standee · 1.0 × 0.4 × 1.8
- `furniture/popcorn_stand` — stand of popcorn and sweets · 0.8 × 0.5 × 1.4
- `props/tv_bracket` (shared) playing trailers
- `furniture/games_shelf` — shelf of console game rentals · 1.2 × 0.4 × 1.6

**Carphone Corner (mobile phone shop):**
- ★ `furniture/phone_wall` — wall display of mobile phones (bricks, flip phones, pagers) on stands · 2.1 × 0.3 × 2.0
- ★ `furniture/counter_glass` (shared) with phones in it
- `furniture/sales_desk` — desk with a PC and contract forms · 1.4 × 0.7 × 1.1
- `props/phone_standee` — promotional standee · 0.8 × 0.3 × 1.8

**Byte Size Computers:**
- ★ `furniture/pc_display` — display table of beige PCs with CRTs (glow) · 1.6 × 0.8 × 1.2 (in place of `pcdesk` here)
- ★ `furniture/software_shelf` — shelves of big software boxes (games, Windows 95) · 2.1 × 0.4 × 2.0
- `furniture/console_kiosk` — demo kiosk with a console and a TV (glow) · 0.8 × 0.6 × 1.6
- `props/printer` — dot-matrix printer with paper · 0.5 × 0.35 × 0.2
- `props/win95_standee` — "Start me up" standee · 0.8 × 0.3 × 1.8

**Newsagent:**
- ★ `furniture/magrack` and `furniture/sweetjars` (shared)
- ★ `furniture/news_counter` — counter with chocolate display boxes, the lottery terminal, and cigarettes behind · 2.0 × 0.7 × 1.6
- `furniture/paper_stand` — newspaper stand with bundles · 1.0 × 0.5 × 0.9
- `furniture/ice_cream_freezer` — Wall's ice-cream chest freezer · 1.2 × 0.6 × 0.9
- `props/card_spinner` (shared)
- `props/paper_bags` — paper-round bags on hooks · 0.6 × 0.15 × 0.8

**Launderette:**
- ★ `furniture/washer_big` — commercial front-loading washer with a porthole · 0.8 × 0.8 × 1.2 · drum `move_drum` (this replaces `washer` in the launderette only, so the name is new)
- ★ `furniture/dryer_stack` — two big tumble dryers stacked · 0.8 × 0.8 × 1.9 · drums `move_drum_top`, `move_drum_bottom`
- `furniture/folding_table` — folding table with laundry · 1.8 × 0.7 × 0.9
- `furniture/change_machine` — coin change machine (glow) · 0.5 × 0.35 × 1.2
- `furniture/soap_vending` — soap powder vending machine · 0.6 × 0.4 × 1.4
- `props/laundry_trolley` — wire laundry cart · 0.7 × 0.5 × 0.9

**Bookies:**
- ★ `furniture/tv_wall` — bank of four racing TVs on a gantry (glow) · 2.4 × 0.5 × 2.2 (in place of `tv` here)
- ★ `furniture/betting_counter` — counter with a security screen and slip trays · 2.8 × 0.9 × 1.6 (in place of `reception`)
- ★ `furniture/slip_ledge` — wall ledge with betting slips and little pens · 2.0 × 0.4 × 1.1
- `props/racing_post` — racing pages pinned to a board · 1.2 × 0.05 × 0.9
- `props/slip_bin` — bin overflowing with losing slips · 0.4 × 0.4 × 0.6

**Curl Up & Dye (hairdresser):**
- ★ `furniture/salonchair` — hydraulic styling chair at a mirror station · 0.8 × 0.9 × 1.6 · fits 0.8 × 0.9 · replaces `salonchair`
- ★ `furniture/backwash` — backwash basin with a reclining chair · 0.7 × 1.3 × 1.0
- ★ `furniture/hood_dryer` — sit-under hood dryer with a seat · 0.7 × 0.9 × 1.5
- `props/roller_trolley` — trolley of rollers, perm curlers and sprays · 0.4 × 0.4 × 0.9
- `furniture/salon_desk` — reception desk with an appointment book · 1.4 × 0.6 × 1.1
- `furniture/product_shelf` — shelves of shampoos and hairspray · 1.2 × 0.3 × 1.8

**Tropical Tan Studio:**
- ★ `furniture/sunbed` — lie-down sunbed with UV tubes (glow) · 1.0 × 2.2 × 1.1 · fits 1.0 × 2.2 · replaces `sunbed` · lid `move_lid`
- ★ `furniture/tan_booth` — stand-up tanning booth (glow) · 1.0 × 1.0 × 2.1 · `door_booth`
- `furniture/tan_desk` — reception desk with a coin timer · 1.4 × 0.6 × 1.1
- `props/towel_shelf` — shelf of rolled towels and goggles · 1.0 × 0.35 × 1.4
- `props/beach_poster` — tropical beach poster · 1.0 × 0.02 × 0.7

**Cycle Shop:**
- ★ `furniture/bike` — bicycle on a floor stand · 0.5 × 1.7 × 1.0 · fits 0.5 × 1.7 · replaces `bike`. Make a racer, a mountain bike, a BMX and a Raleigh Chopper (`bike`, `bike_mtb`, `bike_bmx`, `bike_chopper`). Wheels as `wheel_front` and `wheel_rear`
- ★ `furniture/bike_wall` — wall rack of hanging bikes · 2.1 × 0.5 × 2.2
- ★ `furniture/repair_stand` — workshop stand with a bike clamped in it · 0.8 × 1.7 × 1.4
- `furniture/tyres` — stack of tyres and inner tubes · 0.8 × 0.8 × 1.0 · fits 0.9 × 0.9 · replaces `tyres`
- `props/helmet_shelf` — shelf of helmets and lights · 1.0 × 0.3 × 1.2
- `props/tool_board` — pegboard of bike tools · 1.2 × 0.1 × 1.0

**Garage & MOT:**
- ★ `cars/car` — the car on the lift: a 1990s hatchback · 1.7 × 4.0 × 1.4 · fits 1.9 × 4.0 · replaces `car` · `wheel_*` for each wheel, `door_left`, `door_right`, `move_bonnet`
- ★ `furniture/car_lift` — two-post car lift · 3.2 × 1.2 × 2.2 · arms `move_arms`
- `furniture/tyre_changer` — tyre changing machine · 0.9 × 0.9 × 1.1
- `furniture/wheel_balancer` — wheel balancer · 0.8 × 0.7 × 1.2
- `furniture/tool_chest` — red rolling tool chest · 0.9 × 0.5 × 1.1
- `furniture/oil_drums` — two oil drums and a drip tray · 1.2 × 0.6 × 0.9
- `furniture/engine_hoist` — engine crane · 1.0 × 1.6 × 1.8
- `furniture/garage_counter` — parts counter with keys on hooks · 2.0 × 0.7 × 1.1
- `furniture/tyres` (shared with the cycle shop, bigger car tyres version `tyres_car`)

---

## 5. Leisure and nightlife

**Superbowl Tenpin (bowling alley):**
- ★ `furniture/lane` — polished lane with gutters and aiming arrows, the pin deck with ten pins at the far end, and the masking unit (lit logo) above it · 1.2 × 7.5 × 1.3 · fits 1.3 × 7.5 · replaces `lane` · pins `move_pins`, sweep bar `move_sweep`
- ★ `furniture/ball_return` — ball return with coloured balls · 0.8 × 1.0 × 0.9
- ★ `furniture/score_monitor` — overhead scoring monitors on a pole (glow) · 1.2 × 0.4 × 2.6
- ★ `furniture/shoe_counter` — counter with pigeonholes of bowling shoes behind · 2.8 × 0.9 × 2.2 (in place of `reception`)
- `furniture/bowl_seats` — horseshoe of moulded seats by the lanes · 2.4 × 1.6 × 0.8
- `furniture/ball_rack` — rack of house balls · 1.8 × 0.4 × 1.2 (in place of `rack` here)
- `furniture/score_console` — scoring keypad console · 0.6 × 0.5 × 1.0

**Laser Zone (laser quest):**
- ★ `furniture/pillar` — arena pillar daubed in UV paint with neon bands (glow) · 0.7 × 0.7 × 2.2 · fits 0.8 × 0.8 · replaces `pillar`
- ★ `furniture/arena_wall` — low maze wall with peep holes, UV graffiti · 2.0 × 0.3 × 1.4
- ★ `furniture/vest_rack` — charging rack of laser vests and guns (glow) · 2.0 × 0.5 × 1.8
- `furniture/briefing_bench` — briefing room bench with a TV · 2.0 × 0.6 × 0.5
- `props/fog_machine` — smoke machine · 0.5 × 0.3 × 0.3
- `props/uv_tube` — black-light tube (glow) · 1.2 × 0.1 × 0.1
- `props/score_screen` — scores screen (glow) · 1.0 × 0.1 × 0.7

**Amusement Arcade:**
- ★ `furniture/arcade` ×4 — arcade cabinets: a fighting game, a shoot-'em-up with light guns, a sit-down racer, a pinball machine (glow screens) · 0.9 × 0.9 × 1.9 · fits 0.9 × 0.9 · replaces `arcade` (`arcade`, `arcade_gun`, `arcade_racer`, `arcade_pinball`)
- ★ `furniture/coin_pusher` — penny falls / two-pence pusher (glow) · 1.4 × 1.2 × 1.9 · shelf `move_pusher`
- ★ `furniture/claw_crane` — teddy grabber (glow) · 1.0 × 1.0 × 2.0 · claw `move_claw`
- `furniture/air_hockey` — air hockey table · 1.2 × 2.2 × 0.9
- `furniture/prize_counter` — ticket-prize counter with prizes on the wall · 2.6 × 0.8 × 2.2
- `furniture/change_machine` (shared with the launderette)

**Pot Black Snooker Club:**
- ★ `furniture/snookertable` — snooker table with balls racked · 1.8 × 3.4 × 0.85 · fits 1.9 × 3.4 · replaces `snookertable`
- ★ `props/table_light` — long canopy light over a table (glow) · 1.0 × 2.4 × 0.4
- ★ `props/cue_rack` — wall cue rack with cues and rests · 1.2 × 0.1 × 1.4
- `props/score_abacus` — wall scoreboard, wooden · 0.8 × 0.08 × 0.4
- `furniture/spectator_chair` — tall spectator chair · 0.6 × 0.6 × 1.2
- `furniture/trophy_cabinet` (WMC)

**Ritzy Nightclub:**
- ★ `furniture/decks` — DJ booth: two turntables, mixer, record box (glow) · 2.2 × 0.9 × 1.2 · fits 2.2 × 0.9 · replaces `decks` · platters `move_platters`
- ★ `furniture/speaker` — big speaker stack · 0.7 × 0.6 × 1.8 · fits 0.7 × 0.6 · replaces `speaker`
- ★ `props/mirrorball` — mirror ball on a motor · 0.4 × 0.4 × 0.6 · fits 0.4 × 0.4 · replaces `mirrorball` · ball `move_ball`
- ★ `furniture/dancefloor` — light-up dance floor panel, 2 × 2 m (glow) · 2.0 × 2.0 × 0.05
- `props/light_rig` — lighting truss with par cans and a laser · 3.0 × 0.4 × 0.5
- `furniture/podium` — dancers' podium · 1.2 × 1.2 × 0.6
- `furniture/booth_seats` — curved booth seating with a table · 2.2 × 1.6 × 1.0
- `furniture/cloakroom` — cloakroom hatch with coats on rails · 2.0 × 1.0 × 2.0
- `furniture/rope` — chrome posts and red velvet rope · 2.4 × 0.3 × 0.9 · fits 2.4 × 0.3 · replaces `rope` (also used in the bank)

**Odium Cinema:**
- ★ `furniture/cinema_seats` — row of four red flip-up seats with cup holders · 3.0 × 0.6 × 1.0 (in place of `pew` here)
- ★ `furniture/screen` — screen with red curtains on a stage front · 5.0 × 0.3 × 3.8 · fits 5.0 × 0.3 · replaces `screen` · curtains `move_curtain_left`, `move_curtain_right`
- ★ `furniture/concession` — concessions counter: popcorn machine, drinks dispenser, hot-dog roller · 2.6 × 0.8 × 1.8
- ★ `furniture/pick_n_mix` — pick 'n' mix wall · 2.0 × 0.5 × 1.8
- `furniture/ticket_booth` — ticket booth with a glass front · 1.6 × 1.2 × 2.2
- `props/poster_case` — lit poster case with a film poster (glow) · 0.8 × 0.08 × 1.2
- `props/projector_window` — projection window with the beam (glow) · 0.6 × 0.2 × 0.4

**Eyes Down Bingo Hall:**
- ★ `furniture/bingostand` — caller's stand with the ball blower (balls inside) · 1.4 × 1.0 × 1.6 · fits 1.4 × 1.0 · replaces `bingostand` · balls `move_balls`
- ★ `furniture/bingo_board` — big lit number board, 1 to 90 (glow) · 3.0 × 0.2 × 1.5 (in place of `board` here)
- `furniture/table_folding` (shared) with `furniture/chair_stacking`
- `props/dabbers` — bingo books and dabbers on the table · 0.6 × 0.3 × 0.15
- `props/prize_shelf` — prize shelf (hamper, telly, teddy) · 1.6 × 0.4 × 1.2

**Leisure Centre:**
- ★ `furniture/pool` — swimming pool: blue tiles, lane ropes, steps, ladders and depth markings · 6.0 × 4.0 × 0.3 (the water surface sits at floor level) · fits 6.0 × 4.0 · replaces `pool`
- ★ `furniture/lifeguard_chair` — tall lifeguard chair · 0.8 × 0.8 × 2.0
- ★ `furniture/weights` — weight bench with a barbell · 1.6 × 0.8 × 1.2 · fits 1.6 × 0.8 · replaces `weights`
- `furniture/treadmill` — treadmill · 0.8 × 1.8 × 1.4 · belt `move_belt`
- `furniture/exercise_bike` — exercise bike · 0.5 × 1.0 × 1.2 · pedals `move_pedals`
- `furniture/rowing_machine` — rowing machine · 0.5 × 2.2 × 0.5
- `props/gym_mats` — stack of blue gym mats · 1.0 × 2.0 × 0.3
- `furniture/turnstile` — entry turnstile · 1.0 × 0.3 × 1.0 · arms `move_arms`
- `furniture/changing_bench` — changing-room bench with pegs above · 2.0 × 0.5 × 1.8
- `props/float_rack` — rack of floats and armbands · 1.0 × 0.4 × 1.2

**Youth Club:**
- ★ `furniture/pingpong` — table-tennis table with net and bats · 1.5 × 2.7 × 0.76 · fits 1.6 × 2.8 · replaces `pingpong`
- ★ `furniture/table_football` — table football · 0.8 × 1.4 × 0.9 · rods `move_rods`
- `furniture/snookertable` (shared with the snooker club)
- `furniture/beanbag` (shared)
- `furniture/tuck_shop` — tuck shop hatch with crisps and pop · 2.0 × 0.6 × 1.2
- `props/graffiti_board` — graffiti board · 2.0 × 0.05 × 1.2
- `furniture/tv` with `props/games_console` (shared)

**Village Hall:**
- ★ `furniture/hall_stage` — stage with curtains and steps · 4.0 × 2.5 × 2.6 · curtains `move_curtain`
- ★ `furniture/table_folding` with `furniture/chair_stacking` (shared)
- `furniture/serving_hatch` — kitchen hatch with a tea urn and cups · 2.0 × 0.6 × 1.2
- `furniture/piano` (shared)
- `props/bunting` — bunting strung across · 4.0 × 0.05 × 0.4
- `furniture/jumble_table` — trestle table piled with jumble sale bits · 1.8 × 0.75 × 1.0

---

## 6. Civic and services

**Schoolhouse** (early school, from the Brick & Masonry age):
- ★ `furniture/desk_pupil` — wooden pupil's desk with a lift-up lid and an inkwell, bench attached · 0.7 × 0.6 × 0.75 (in place of `desk` here)
- ★ `furniture/board` — blackboard on an easel, with chalk sums · 1.5 × 0.6 × 1.8 · fits 3.0 × 0.2 · replaces `board` (wall version for other buildings: `board_wall`, a whiteboard or noticeboard)
- `furniture/globe` — globe on a stand · 0.5 × 0.5 × 1.1 · fits 0.5 × 0.5 · replaces `globe`
- `furniture/teacher_desk` — teacher's desk with a bell and a cane · 1.4 × 0.7 × 0.8
- `props/abacus` — big abacus · 0.8 × 0.3 × 1.0
- `props/wall_map` — map of the world on rollers · 1.2 × 0.05 × 0.9
- `furniture/nature_table` — table of conkers, leaves and a bird's nest · 1.2 × 0.6 × 0.8

**Comprehensive School** (1990s):
- ★ `furniture/desk_double` — two-seat classroom table on steel legs · 1.2 × 0.6 × 0.72, with `furniture/chair_stacking`
- ★ `furniture/whiteboard` — wall whiteboard and pens · 2.4 × 0.1 × 1.2
- ★ `furniture/av_trolley` — tall trolley with a TV and video, strapped on · 0.7 × 0.6 × 1.8
- `furniture/ohp` — overhead projector on a trolley · 0.6 × 0.6 × 1.2
- `furniture/computer_row` — bench of three school computers (RM / BBC Micro) (glow) · 2.4 × 0.7 × 1.2
- `furniture/lab_bench` — science bench with gas taps, a sink and stools · 2.4 × 0.9 × 0.9
- `furniture/locker` (shared), `furniture/trophy_cabinet` (WMC), `furniture/pegs` (shared)

**Library:**
- ★ `furniture/shelfbooks` (shared), plus `furniture/shelf_kids` — low, colourful children's book boxes · 1.6 × 0.5 × 0.8
- ★ `furniture/library_desk` — issue desk with a date stamp, ticket trays and a returns box · 2.8 × 0.9 × 1.1 (in place of `reception` here)
- `furniture/card_catalogue` — wooden card-index cabinet · 1.0 × 0.5 × 1.2
- `furniture/reading_table` — reading table with green banker's lamps · 1.8 × 0.9 × 0.75
- `furniture/microfiche` — microfiche reader (glow) · 0.6 × 0.6 × 1.2
- `furniture/book_trolley` — returns trolley · 0.9 × 0.4 × 1.0
- `furniture/paper_poles` — newspapers on wooden poles in a rack · 1.0 × 0.4 × 1.4

**Town Hall:**
- ★ `furniture/council_table` — horseshoe council table with microphones and name plates · 4.0 × 3.0 × 0.8
- ★ `furniture/mayor_chair` — tall carved mayor's chair · 0.8 × 0.8 × 1.6
- `furniture/reception` — reception desk with a bell and leaflets · 2.6 × 0.8 × 1.1 · fits 2.8 × 0.9 · replaces `reception` (the generic desk used in many buildings)
- `furniture/terminal` — desk with a computer terminal (the planning computer) (glow) · 1.6 × 0.8 × 1.2 · fits 1.8 × 0.9 · replaces `terminal`
- `props/flag_stand` — Union flag on a pole · 0.5 × 0.5 × 2.2
- `furniture/mace_case` — glass case with the town's mace · 1.2 × 0.5 × 1.2
- `props/picture_queen` (shared)

**Hospital:**
- ★ `furniture/hbed` — hospital bed with rails, a blanket and a clipboard · 1.0 × 2.0 × 0.9 · fits 1.1 × 2.0 · replaces `hbed`
- ★ `furniture/drip_stand` — drip stand with a bag · 0.5 × 0.5 × 1.9
- ★ `furniture/heart_monitor` — heart monitor on a trolley (glow screen) · 0.5 × 0.5 × 1.3
- ★ `furniture/nurses_station` — nurses' station desk with files and a phone · 2.4 × 0.9 × 1.1
- `furniture/curtain_screen` — cubicle curtain on a rail · 2.0 × 0.05 × 2.1 · curtain `move_curtain`
- `furniture/wheelchair` — wheelchair · 0.65 × 1.0 × 0.95 · `wheel_left`, `wheel_right`
- `furniture/stretcher` — trolley stretcher · 0.7 × 2.0 × 0.9
- `furniture/bedside_hospital` — hospital bedside cabinet with grapes and a jug · 0.45 × 0.45 × 0.8
- `props/oxygen` — oxygen cylinder on a trolley · 0.4 × 0.4 × 1.2
- `props/xray_box` — X-ray light box on the wall (glow) · 0.8 × 0.08 × 0.5
- `furniture/bench_waiting` (shared)

**Doctor's Surgery:**
- ★ `furniture/exam_couch` — examination couch with a paper roll · 0.7 × 1.9 × 0.75 (in place of `hbed` here)
- ★ `furniture/gp_desk` — GP's desk with a PC, prescription pad and a BP cuff · 1.4 × 0.7 × 1.1
- `props/eye_chart` — eye test chart · 0.4 × 0.02 × 0.6
- `furniture/scales_doctor` — doctor's weighing scales with a height measure · 0.5 × 0.6 × 1.9
- `furniture/reception_hatch` — reception window with a sliding glass hatch · 2.0 × 0.6 × 1.8
- `furniture/fish_tank` (curry house)
- `props/toy_box` — toy box in the waiting room · 0.6 × 0.4 × 0.4

**Police Station:**
- ★ `furniture/police_desk` — front desk with a glass partition and a bell · 2.6 × 0.9 × 1.8 (in place of `reception` here)
- ★ `furniture/cells` — holding cell: bars, a bench bed and a steel toilet · 3.0 × 1.6 × 2.4 · fits 3.0 × 1.6 · replaces `cells` · door `door_cell`
- ★ `furniture/gun_rack` — armoury rack of rifles and pistols behind a mesh door (combat mode's armoury) · 1.8 × 0.5 × 2.0 · `door_mesh`
- `furniture/interview_table` — interview table with a twin-cassette tape recorder · 1.2 × 0.8 × 0.75
- `props/height_chart` — mugshot height chart · 1.0 × 0.02 × 2.1
- `props/wanted_board` — Wanted and missing posters · 1.2 × 0.05 × 0.9
- `furniture/riot_shields` — rack of riot shields and helmets · 1.4 × 0.5 × 1.8
- `props/radio_set` — police radio base set · 0.5 × 0.4 × 0.3

**Watch House** (the early police, from the start):
- ★ `furniture/cells` (shared with the police station; also make an early version `cells_old`: stone and an iron grille)
- ★ `furniture/ledger` — high desk with a big ledger and a quill · 1.6 × 0.8 × 1.2 · fits 1.8 × 0.9 · replaces `ledger`
- `props/lantern` — watchman's lantern (glow) · 0.25 × 0.25 × 0.4
- `props/truncheons` — rack of truncheons and a rattle · 0.8 × 0.1 × 0.6

**Fire Station:**
- ★ `cars/firetruck` — 1990s fire engine with ladders on top · 2.3 × 5.4 × 3.0 · fits 2.3 × 5.4 · replaces `firetruck` · `wheel_*` for each wheel, ladder `move_ladder`, `door_*` for the lockers
- ★ `furniture/fire_pole` — brass pole down through a hole in the ceiling · 0.6 × 0.6 × 3.2
- ★ `furniture/kit_rack` — helmets, jackets and boots on pegs · 2.0 × 0.5 × 2.0
- `furniture/hose_rack` — rolled hoses on a rack · 1.2 × 0.5 × 1.4
- `furniture/ba_rack` — breathing apparatus sets · 1.2 × 0.5 × 1.6
- `props/fire_bell` — big brass alarm bell · 0.4 × 0.2 × 0.4
- `furniture/mess_table` — mess table with mugs · 1.8 × 0.9 × 0.75

**Post Office:**
- ★ `furniture/po_counter` — counter positions with glass screens and pull-down slots · 2.8 × 0.9 × 2.0 (in place of `reception` here)
- ★ `furniture/sorting_frame` — pigeonhole sorting frame with letters · 2.0 × 0.5 × 1.8
- `furniture/postbox_inside` — posting box in the wall · 0.5 × 0.4 × 1.2
- `furniture/parcel_scales` — parcel scales on the counter end · 0.6 × 0.5 × 1.1
- `props/mail_sacks` — grey mail sacks · 1.0 × 0.8 × 0.6
- `furniture/form_stand` — stand of forms (TV licence, passports) · 0.8 × 0.4 × 1.4
- `furniture/rope` (shared queue barrier)

**Midshires Bank:**
- ★ `furniture/bankcounter` — banking counter with security glass and cashier positions · 3.6 × 0.8 × 2.0 · fits 3.6 × 0.8 · replaces `bankcounter`
- ★ `furniture/vault_door` — round vault door, ajar, in its frame · 2.0 × 0.6 × 2.2 · `door_vault`
- ★ `props/cashpoint` — wall cash machine (glow screen) · 0.7 × 0.4 × 1.0
- `furniture/adviser_desk` — mortgage adviser's desk with chairs · 1.4 × 0.7 × 0.75
- `furniture/cheque_stand` — writing stand with pens on chains · 1.2 × 0.5 × 1.1
- `furniture/safe` (shared), `furniture/rope` (shared)

**St Sam's Church:**
- ★ `furniture/pew` — wooden pew with hymn books and a kneeler · 3.0 × 0.6 × 1.0 · fits 3.0 × 0.6 · replaces `pew`
- ★ `furniture/altar` — altar with a white cloth, a cross and candles (glow) · 2.0 × 0.8 × 1.0 · fits 2.0 × 0.9 · replaces `altar`
- ★ `furniture/pulpit` — raised wooden pulpit with steps · 1.2 × 1.2 × 2.0
- ★ `furniture/organ` — pipe organ with a console · 2.5 × 1.5 × 3.5
- `furniture/lectern_eagle` — brass eagle lectern with a Bible · 0.6 × 0.6 × 1.5
- `furniture/font` — stone font · 0.8 × 0.8 × 1.0
- `props/hymn_board` — hymn number board · 0.5 × 0.05 × 1.0
- `furniture/candle_stand` — votive candle stand (glow) · 0.8 × 0.4 × 1.1
- `furniture/choir_stalls` — choir stalls · 3.0 × 0.8 × 1.2

**Chapel:**
- ★ `furniture/pew` and `furniture/altar` (shared with the church)
- `furniture/harmonium` — harmonium · 1.2 × 0.5 × 1.1
- `furniture/lectern` — plain wooden lectern · 0.5 × 0.5 × 1.2
- `props/hymn_board` (shared)

**Planning Office:**
- ★ `furniture/drafting` — drafting table with plans, a lamp and a T-square · 1.6 × 1.0 × 1.2 · fits 1.8 × 1.0 · replaces `drafting`
- ★ `furniture/town_model` — architect's model of the town on a table · 1.6 × 1.2 × 1.0
- `furniture/terminal` (shared)
- `furniture/plan_chest` — wide map drawers · 1.4 × 1.0 × 1.0
- `props/theodolite` — surveyor's theodolite on a tripod · 0.6 × 0.6 × 1.6
- `props/rolled_plans` — bin of rolled plans · 0.4 × 0.4 × 0.9

**Builders' Yard (office):**
- ★ `furniture/drafting` (shared)
- ★ `props/hard_hats` — hard hats and hi-vis vests on pegs · 1.2 × 0.3 × 1.6
- `furniture/site_board` — site planning board with dockets · 2.0 × 0.05 × 1.2
- `furniture/cement_mixer` — cement mixer · 1.0 × 1.4 × 1.4 · drum `move_drum`
- `props/scaffold_pile` — stack of scaffold poles and boards · 3.0 × 0.8 × 0.6
- `props/wheelbarrow` — builder's wheelbarrow · 0.6 × 1.5 × 0.7 · `wheel_barrow`

**The Lock-Up:**
- ★ `furniture/cells_old` (shared with the watch house)
- `props/straw_pile` — straw on the floor · 1.2 × 1.0 × 0.2
- `props/bucket` — slop bucket · 0.3 × 0.3 × 0.35

**Office Block:**
- ★ `furniture/pcdesk`, `furniture/copier`, `furniture/cooler`, `furniture/filing` (shared kit)
- ★ `furniture/office_partition` — fabric-covered desk partition screen · 1.6 × 0.06 × 1.4
- `furniture/meeting_table` — meeting table with chairs and a speakerphone · 2.4 × 1.2 × 0.75
- `furniture/flipchart` — flipchart on an easel · 0.7 × 0.6 × 1.8
- `furniture/boss_desk` — big executive desk with a leather chair · 2.0 × 0.9 × 0.75
- `props/fax` and `props/desk_phone` (shared kit)
- `props/franking_machine` — post franking machine · 0.5 × 0.4 × 0.3

**Grand Hotel:**
- ★ `furniture/hotel_desk` — grand reception desk with a brass bell and the guest register · 2.8 × 0.9 × 1.1 (in place of `reception` here)
- ★ `furniture/keyrack` — wall of key pigeonholes with room keys on brass fobs · 1.2 × 0.1 × 1.2 · fits 1.2 × 0.1 · replaces `keyrack`
- ★ `furniture/trolley` — brass luggage trolley with suitcases · 0.8 × 1.2 × 1.8 · fits 0.8 × 1.2 · replaces `trolley` · `wheel_*`
- ★ `props/chandelier` — crystal chandelier (glow) · 1.2 × 1.2 × 1.0
- `furniture/sofa_leather` (shared), `furniture/plant` palm variant (shared)
- `furniture/grandfather_clock` (shared kit)
- `furniture/brochure_stand` — stand of tourist leaflets · 0.5 × 0.4 × 1.5
- Hotel rooms upstairs: `furniture/twin_beds` — two single beds with a headboard · 2.4 × 2.1 × 1.0; `furniture/trouser_press` · 0.4 × 0.1 × 1.1; `props/tea_tray` — kettle, cups and biscuits · 0.4 × 0.3 × 0.25; `furniture/minibar` — little fridge under the TV unit · 1.0 × 0.5 × 0.8; `furniture/luggage_rack` · 0.7 × 0.45 × 0.5

**Sam Tower** (the office tower lobby and floors):
- ★ `furniture/security_desk` — security desk with a bank of CCTV monitors (glow) · 2.8 × 0.9 × 1.3 (in place of `reception` here)
- ★ `furniture/security_gates` — row of glass security gates (glow) · 2.4 × 0.8 × 1.0 · `move_gates`
- ★ `furniture/lift_doors` (flats) as a bank of lifts
- `furniture/lobby_sculpture` — abstract steel sculpture on a plinth · 1.2 × 1.2 × 2.4
- `furniture/water_feature` — lobby water wall · 2.0 × 0.4 × 2.2
- `furniture/server_rack` — computer server rack with blinking lights (glow) · 0.6 × 1.0 × 2.0
- Office floors: the Office Block set

The game's `reception0` (a plain desk without the bell) is replaced by `furniture/reception` too.

---

## 7. Work and industry

Every production building currently shares one generic shed, so each needs its own set.

**Stockyard** (an open yard where building materials are kept):
- ★ `props/timber_stack` — stacked sawn timber on bearers · 2.4 × 1.0 × 0.8
- ★ `props/steel_girders` — stacked steel girders · 3.0 × 0.8 × 0.6
- `props/brick_pallets` (brickworks), `props/stone_blocks` (quarry)
- `props/glass_crate` — A-frame crate of glass panes · 1.6 × 0.8 × 1.4
- `furniture/gate_hut` — small yard office hut with a window · 2.0 × 2.0 × 2.4 · `door_hut`

**Forager's Hut:**
- ★ `furniture/drying_rack` — herb and mushroom drying rack · 1.8 × 0.5 × 1.8 (in place of `rack` here)
- ★ `props/forage_baskets` — baskets of berries, nuts and mushrooms · 1.0 × 0.6 × 0.5
- `furniture/sorting_table` — sorting table with sieves · 2.0 × 0.8 × 0.9
- `props/forage_bags` — sacks and bags on hooks · 1.0 × 0.2 × 0.8

**Fisher's Hut and the Harbour shed:**
- ★ `furniture/net_rack` — fishing nets hung to dry · 2.0 × 0.4 × 2.0 (in place of `rack` here)
- ★ `props/lobster_pots` — stack of lobster pots · 1.0 × 0.8 × 1.0
- ★ `furniture/gutting_table` — gutting table with fish and a knife · 2.0 × 0.8 × 0.9
- `props/fish_boxes` — fish boxes on ice · 1.2 × 0.8 × 0.6
- `furniture/smoking_rack` — kipper smoking rack · 1.0 × 0.8 × 1.8
- `props/buoys_oars` — buoys, oars and a coil of rope · 1.2 × 0.6 × 1.0
- `props/anchor` — anchor and chain (harbour) · 0.8 × 0.4 × 1.0

**Farm:**
- ★ `furniture/hay` — hay bales (two square, one round) · 1.2 × 1.2 × 1.0 · fits 1.2 × 1.2 · replaces `hay`
- ★ `props/milk_churns` — milk churns · 0.8 × 0.4 × 0.7
- `props/feed_sacks` — feed sacks · 1.0 × 0.6 × 0.6
- `props/pitchforks` — pitchforks and rakes on the wall · 1.0 × 0.1 × 1.8
- `furniture/butter_churn` — wooden butter churn (earlier ages) · 0.5 × 0.5 × 1.0
- `furniture/milking_stool` — milking stool and pail · 0.4 × 0.4 × 0.4
- `cars/tractor` — small tractor (1990s, parked in the barn) · 1.6 × 3.2 × 2.2 · `wheel_*`

**Lumber Camp:**
- ★ `furniture/sawhorse` — sawhorse with a log and a bow saw · 1.4 × 0.6 × 0.9
- ★ `props/log_pile` — stacked logs · 2.0 × 1.0 × 1.0
- `furniture/saw_bench` — saw bench with a circular saw (later ages) · 2.0 × 0.8 × 1.0 · blade `move_blade`
- `props/axe_rack` — axes and saws on the wall · 1.2 × 0.1 × 1.0
- `furniture/grindstone` — treadle grindstone · 0.8 × 0.6 × 1.0 · stone `move_stone`
- `props/plank_stack` — stack of sawn planks · 2.4 × 0.8 × 0.6

**Quarry:**
- ★ `props/stone_blocks` — dressed stone blocks · 1.5 × 1.0 × 0.8
- ★ `furniture/mason_bench` — mason's banker bench with chisels and mallets · 1.6 × 0.8 × 0.9
- `furniture/stone_saw` — stone cutting saw · 2.0 × 1.0 × 1.4
- `props/sledgehammers` — sledgehammers and crowbars on the wall · 1.0 × 0.1 × 1.2
- `props/rubble` — rubble pile · 1.4 × 1.0 × 0.5

**Brickworks:**
- ★ `furniture/kiln` — brick kiln with a glowing mouth (glow) · 2.5 × 2.5 × 2.5
- ★ `props/brick_pallets` — stacked bricks on pallets · 1.2 × 1.0 × 1.0
- `furniture/mould_bench` — brick-moulding bench with wooden moulds · 2.0 × 0.8 × 0.9
- `furniture/brick_racks` — drying racks of green bricks · 2.0 × 0.6 × 1.6
- `props/clay_heap` — clay heap · 1.4 × 1.2 × 0.6
- `furniture/pug_mill` — pug mill (clay mixer) · 1.0 × 1.6 × 1.4

**Glassworks:**
- ★ `furniture/glass_furnace` — glass furnace with a glowing glory hole (glow) · 2.0 × 1.6 × 2.2
- ★ `furniture/marver` — steel marver table with blowpipes · 1.6 × 0.8 × 0.9
- `furniture/annealing_oven` — annealing oven · 1.6 × 1.0 × 1.4
- `furniture/glass_shelf` — shelves of finished glassware · 2.0 × 0.4 × 1.8
- `props/blowpipes` — rack of blowpipes · 0.8 × 0.3 × 1.6
- `props/sand_sacks` — sacks of sand and potash · 1.0 × 0.6 × 0.6

**Foundry:**
- ★ `furniture/crucible_furnace` — crucible furnace with molten metal (glow) · 1.6 × 1.6 × 1.8
- ★ `furniture/anvil` — anvil on a stump with a hammer · 0.6 × 0.3 × 0.8 · fits 0.8 × 0.5 · replaces `anvil`
- `props/casting_moulds` — sand casting moulds · 1.2 × 0.8 × 0.4
- `props/ingots` — stacked iron ingots · 1.0 × 0.6 × 0.4
- `props/tongs_rack` — tongs and ladles on the wall · 1.0 × 0.1 × 1.2
- `furniture/quench_trough` — quenching trough · 1.4 × 0.5 × 0.6
- `furniture/bellows` — big forge bellows · 1.2 × 0.6 × 0.8 · `move_bellows`

**Factory:**
- ★ `furniture/machine` ×3 — production machines: a lathe, a press, a packing machine · 2.2 × 1.5 × 1.8 · fits 2.2 × 1.5 · replaces `machine` (`machine`, `machine_press`, `machine_packer`) · moving parts `move_*`
- ★ `furniture/conveyor` — conveyor belt section with boxes · 3.0 × 0.8 × 0.9 · belt `move_belt`
- ★ `furniture/time_clock` — clocking-in machine with a card rack · 0.8 × 0.2 × 1.6
- `cars/forklift` — forklift truck · 1.2 × 2.4 × 2.1 · forks `move_forks`, `wheel_*`
- `furniture/pallet_boxes` (shared)
- `props/safety_signs` — hard-hat and danger signs · 0.6 × 0.02 × 0.4
- `furniture/tea_point` — kettle, mugs and a biscuit tin on a cupboard · 1.0 × 0.5 × 1.0

**Power Plant:**
- ★ `furniture/generator` — turbine generator with pipes and gauges · 2.2 × 1.6 × 2.0 · fits 2.2 × 1.6 · replaces `generator`
- ★ `furniture/control_desk` — control desk with dials, switches and lights (glow) · 2.4 × 0.9 × 1.3
- `furniture/transformer` — transformer with cooling fins · 1.6 × 1.2 × 1.8
- `props/pipe_run` — section of big pipes with valves · 3.0 × 0.6 × 1.2
- `furniture/fuse_board` — wall fuse and switchboard · 1.6 × 0.3 × 2.0
- `props/danger_signs` — "Danger of death" signs · 0.4 × 0.02 × 0.3

**Water Tower:**
- ★ `furniture/water_pump` — pump with pipes and a valve wheel · 2.2 × 1.6 × 1.6 (in place of `generator` here) · `move_wheel`
- `furniture/pressure_tank` — pressure tank with gauges · 1.2 × 1.2 × 2.0
- `props/valve_wheels` — pipe section with valve wheels · 2.0 × 0.4 × 1.2

**Carter's Yard (stables):**
- ★ `animals/horse` — a shire horse, standing (and a second, brown, colour) · 0.8 × 2.4 × 1.8 · fits 0.8 × 2.4 · replaces `horse`
- ★ `furniture/stable_stall` — stable stall partition with a hay rack · 3.0 × 0.2 × 1.8
- ★ `furniture/haycart` — hay cart · 1.6 × 2.4 × 1.6 · fits 1.6 × 2.4 · replaces `haycart` · `wheel_left`, `wheel_right`
- `furniture/hay` (farm)
- `props/saddle_rack` — saddles and harness on pegs · 1.2 × 0.4 × 1.4
- `furniture/water_trough` — stone water trough · 1.6 × 0.6 × 0.6
- `props/horseshoes` — horseshoes on nails · 0.8 × 0.05 × 0.6

---

## 8. Transport

**Railway Station:**
- ★ `furniture/ticket` — ticket office window with a counter, a glass screen and a speech grille · 2.4 × 1.0 × 2.4 · fits 2.4 × 1.0 · replaces `ticket` (also used at the monorail and sky lift)
- ★ `furniture/departure_board` — flip-dot departure board on a frame (glow) · 2.4 × 0.3 × 2.8 (in place of `board` here)
- ★ `props/station_clock` — double-sided hanging station clock · 0.6 × 0.3 × 0.8 · hands `move_hand_hour`, `move_hand_min`
- `furniture/luggage_trolley` — porter's luggage trolley with cases · 0.8 × 1.6 × 1.0 · `wheel_front`, `wheel_back`
- `furniture/ticket_machine` — 1990s ticket machine (glow) · 0.7 × 0.5 × 1.7
- `furniture/chocolate_machine` — platform chocolate machine · 0.6 × 0.4 × 1.6
- `props/timetable` — timetable poster case · 0.8 × 0.05 × 1.1
- Earlier ages: `furniture/waiting_fire` — waiting-room fireplace and benches · 1.8 × 0.8 × 1.4

**Monorail Station:**
- ★ `furniture/ticket` (shared)
- ★ `furniture/gate_line` — row of automatic ticket gates (glow) · 2.4 × 1.0 × 1.0 · paddles `move_gates`
- `furniture/info_screen` — information screen on a post (glow) · 1.2 × 0.3 × 2.4
- `furniture/bench_modern` — steel perforated bench · 1.8 × 0.6 × 0.45

**Sky Lift Station:**
- ★ `furniture/ticket` (shared)
- ★ `furniture/queue_rails` — zig-zag queue rails · 3.0 × 2.0 × 1.0
- `furniture/turnstile` (shared with the leisure centre)
- `props/safety_board` — "Please keep your hands inside the car" board · 1.0 × 0.05 × 0.8

**Multi-Storey Car Park:**
- ★ `cars/hatchback`, `cars/estate`, `cars/saloon` — 1990s parked cars · about 1.7 × 4.2 × 1.4 · `wheel_*`, `door_*`
- ★ `furniture/pay_machine` — pay-and-display machine (glow) · 0.6 × 0.4 × 1.6
- ★ `furniture/barrier` — entry barrier with a ticket post · 3.0 × 0.5 × 1.2 · arm `move_arm`
- `props/level_sign` — painted level number on a pillar · 0.6 × 0.02 × 0.6
- `props/bollard` — yellow bollard · 0.2 × 0.2 × 0.9

---

## 9. Outdoor places (no inside)

These have no interior. They're listed so the whole town is covered.

- **Campfire:** `furniture/firepit` (homes), `furniture/log_seat` — log bench · 1.6 × 0.5 × 0.45, `props/kettle_hook` — kettle on a tripod hook · 0.6 × 0.6 × 1.0
- **Well:** `furniture/well` — stone well with a roof, bucket and winch · 1.5 × 1.5 × 2.2 · `move_winch`
- **Postbox:** `furniture/pillar_box` — red pillar box · 0.5 × 0.5 × 1.5
- **Phone Box:** `furniture/phone_box` — red K6 phone box with a BT payphone inside · 1.0 × 1.0 × 2.5 · `door_box`
- **Bus Shelter:** `furniture/bus_shelter` — glass bus shelter with a timetable and a seat · 3.0 × 1.4 × 2.4
- **Billboard:** `furniture/billboard` — billboard on legs (advert texture) · 6.0 × 0.6 × 4.5
- **Pocket Park:** `furniture/park_bench` — iron-and-wood park bench · 1.8 × 0.6 × 0.8, `props/litter_bin` · 0.5 × 0.5 × 0.9, `furniture/lamp_post` · 0.4 × 0.4 × 4.0, `furniture/swings` · 2.4 × 1.6 × 2.2 · `move_swing`, `furniture/flower_bed` · 2.0 × 1.0 × 0.4
- **Fountain Plaza:** `furniture/fountain` — tiered stone fountain · 3.0 × 3.0 × 2.0, `furniture/statue` — town statue on a plinth · 1.2 × 1.2 × 3.0, `furniture/planter` · 1.2 × 1.2 × 0.8
- **Cricket Green:** `props/stumps` — stumps and bails · 0.25 × 0.1 × 0.75, `furniture/roller` — heavy pitch roller · 1.2 × 1.0 × 1.0 · `move_roller`, `furniture/scoreboard` — wooden scoreboard with tin numbers · 3.0 × 0.5 × 2.5, `furniture/sight_screen` · 4.0 × 0.5 × 3.0, `furniture/deckchair` · 0.6 × 1.0 × 0.9
- **Graveyard:** `furniture/headstone` ×5 — headstones (round-top, square, cross, angel, a broken old one) · 0.6 × 0.2 × 1.0, `furniture/tomb` — table tomb · 2.0 × 1.0 × 0.9, `props/grave_flowers` · 0.4 × 0.3 × 0.3, `furniture/yew` — a clipped yew · 1.5 × 1.5 × 2.5
- **Allotment:** `furniture/veg_bed` ×3 — raised beds of cabbages, leeks and beans on canes · 2.0 × 1.0 × 0.8, `furniture/allotment_shed` · 2.0 × 1.6 × 2.2 · `door_shed`, `furniture/water_butt` · 0.6 × 0.6 × 1.0, `furniture/compost_bin` · 1.0 × 1.0 × 0.9, `furniture/scarecrow` · 0.8 × 0.4 × 1.8, `furniture/cold_frame` · 1.2 × 0.6 × 0.5
- **Bandstand:** `props/music_stand` · 0.4 × 0.4 × 1.2, `furniture/deckchair` (cricket green), `furniture/band_chair` · 0.45 × 0.5 × 0.9

---

## 10. Special places

**The Supply Lift** (where supplies, visitors and undertakers arrive):
- ★ `furniture/lift_car` — the caged goods lift car, gates open · 3.0 × 3.0 × 2.6 · gates `door_left`, `door_right`
- `furniture/lift_panel` — heavy call panel with big buttons (glow) · 0.4 × 0.2 × 1.4
- `props/supply_crates` — stencilled supply crates · 1.0 × 1.0 × 1.0
- `furniture/pallet_truck` — hand pallet truck · 0.6 × 1.6 × 1.2 · `wheel_front`

**The Service Tunnel** (behind the scenes):
- ★ `props/tunnel_pipes` — wall run of pipes and cable trays · 3.0 × 0.5 × 1.5
- ★ `furniture/staff_door` — grey "STAFF ONLY" door with a keypad (glow) · 1.2 × 0.2 × 2.1 · `door_staff`
- `furniture/monitor_desk` — desk of CCTV monitors showing the town (glow) · 2.4 × 0.9 × 1.4
- `props/caged_light` — caged bulkhead light (glow) · 0.3 × 0.15 × 0.2
- `furniture/costume_rail` — clothes rail of townsfolk costumes · 1.8 × 0.6 × 1.8

---

## Totals

About **640 models** (counting each variation), covering all 97 places in the game and every one of its 122 current furniture pieces. Shared kit is reused across many buildings, so after the "Make these first" list and the hero items (★, about 200), most buildings need only five to ten new pieces each.

Before handing models over, check:
- named exactly as listed
- metres, with the front facing +Z
- within the "fits" footprint where one is given
- moving parts named as listed
- no more than one glowing material per model

Then run the checker (ASSETS.md); it tells you whether each one is within budget.
