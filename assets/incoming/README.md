# Drop models here

Put `.glb` files in a folder for what they are: `props`, `furniture`, `people`, `animals`, `bikes`, `cars`, `buildings` or `guns` (for example `assets/incoming/bikes/bmx.glb`), then run `node tools/assets/check.mjs`.

`review.json` holds back models that pass the check but don't look right in a room yet (each with what it needs); take a line out to let one in.

Budgets, export settings and what the check does are in [docs/ASSETS.md](../../docs/ASSETS.md); the list of what to make is in [docs/INTERIOR_ASSETS.md](../../docs/INTERIOR_ASSETS.md).
