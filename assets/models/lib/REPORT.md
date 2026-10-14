# Asset check

4 model(s): 4 fine, 0 need attention.

| Model | Category | Triangles (before → after, budget) | Distance versions | Materials | Draw calls | File size | Verdict |
|---|---|---|---|---|---|---|---|
| plant | furniture | 532 → **532** (2,000) | none | 1 → 1 | 1 → 1 | 40 KB → 8 KB (all versions) | OK |
| plant_2 | furniture | 482 → **482** (2,000) | none | 1 → 1 | 1 → 1 | 36 KB → 7 KB (all versions) | OK |
| plant_3 | furniture | 844 → **844** (2,000) | none | 1 → 1 | 1 → 1 | 62 KB → 11 KB (all versions) | OK |
| wall_clock | props | 432 → **432** (500) | none | 1 → 1 | 3 → 3 | 47 KB → 21 KB (all versions) | OK |

### wall_clock
- Size: 0.35 × 0.35 × 0.06 m (width × height × depth)
- kept separate so the game can move them: move_hand_hour, move_hand_min

## Budgets

| Category (folder) | Triangles | Materials | Biggest texture | Distance versions at |
|---|---|---|---|---|
| Small props (cups, signs, bins) (`props`) | 500 | 2 | 512 px | 10 m, 25 m |
| Furniture (`furniture`) | 2,000 | 3 | 1024 px | 12 m, 30 m |
| People (`people`) | 3,000 | 3 | 1024 px | 15 m, 40 m |
| Animals (horses, dogs) (`animals`) | 3,000 | 3 | 1024 px | 15 m, 40 m |
| Bikes and motorbikes (`bikes`) | 4,000 | 3 | 1024 px | 15 m, 40 m |
| Cars, vans and buses (`cars`) | 8,000 | 4 | 1024 px | 20 m, 55 m |
| Building shells (`buildings`) | 20,000 | 6 | 2048 px | 45 m, 110 m |
| First-person guns (one on screen) (`guns`) | 10,000 | 4 | 2048 px | always close |
