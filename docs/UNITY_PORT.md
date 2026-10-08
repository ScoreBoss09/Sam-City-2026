# Porting Sam City to Unity

| Prototype | Unity |
|---|---|
| `src/config.js` | `GameConfig` ScriptableObject |
| `src/data/buildings.js` (BUILDINGS, MATERIALS, ROLES, FACADES) | `BuildingDef`, `MaterialDef`, `RoleDef` ScriptableObjects |
| `src/data/layouts.js` (local-space furniture, beds, work/terminal spots) | One prefab per building with child anchors (`Bed_n`, `Work_n`, `Terminal_n`, `Idle_n`, `Door`) |
| `src/data/story.js` | JSON / ScriptableObject dialogue + objective assets |
| `World.js` (grid, A*) | Plain C# `CityGrid` (keep for placement; NavMesh optional for walking) |
| `BuildingManager.js` | MonoBehaviour: site -> finished prefab swap, roof hidden when Sam is inside |
| `Sim.js` | `SimAgent` state machine (sleep/home/work/leisure/visit/leave) |
| `Construction/Economy/Logistics/Population` | Pure C# services (unit-testable) |
| `Player.js`, `GodControls.js` | Cinemachine first/third rig + god camera, tool state machine |
| `Terrain.js` | Terrain/Tilemap, roads as a tile layer |
| `UI.js` | UI Toolkit bound to the same getters |
| Sim-cap governor (`Population.update`) | Keep; raise/lower cap from smoothed frame time, add animation LOD |

Notes: 1 tile = 4 m, 3.2 m per storey. Pixel look = low-res render texture with point filtering and flat-shaded low-poly; replace the procedural facade textures with authored 64x52 ones. Sims are ~7 boxes; use skinned models plus GPU instancing. Interiors are built lazily near Sam; use pooled prefabs/additive scenes. `tools/*.mjs` scenarios drive `window.__game` and can be ported to Play Mode tests.
