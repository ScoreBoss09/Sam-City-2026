// Global tunables. In Unity these map to a single ScriptableObject ("GameConfig").
export const TILE = 8;            // metres per grid tile: room for a road with two lanes and a pavement each side
export const UNIT = 4;            // metres per building size unit (def.w / def.d are in these)
export const MAP = 40;            // tiles per side
export const WALL_H = 3.2;        // height of one storey
export const WALL_T = 0.3;        // wall thickness
export const DOOR_W = 2.0;        // doorway width
export const DAYLIGHT_SECONDS = 600;  // real seconds for 06:00-20:00 at 1x (a long, Minecraft-style day)
export const NIGHT_SECONDS = 180;     // real seconds for 20:00-06:00 at 1x (a shorter night)
export const DAWN = 6, DUSK = 20;
export const DAY_SECONDS = DAYLIGHT_SECONDS + NIGHT_SECONDS;   // a whole day
export const START_FUNDS = 2500;
export const START_HOUR = 9;
export const START_MONTH = 4;     // 0-based (4 = May)
export const START_YEAR = 2004;
export const DAYS_PER_MONTH = 8;   // short months so the seasons come round in a play session
export const MAX_SIMS_HARD = 90;  // absolute ceiling for the performance governor
export const MIN_SIMS = 10;
