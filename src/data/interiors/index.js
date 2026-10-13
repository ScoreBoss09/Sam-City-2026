// Interiors by building id (these win over the shared layout by def.layout in layouts.js). Each module exports an object
// { buildingId: (def) => layout }. See src/data/interiors/README.md for the layout contract.
import { FOOD } from './food.js';
import { SHOPS } from './shops.js';
import { CIVIC } from './civic.js';
export const ID_LAYOUTS = { ...FOOD, ...SHOPS, ...CIVIC };
