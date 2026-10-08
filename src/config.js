// Global tunables. In Unity these map to a single ScriptableObject ("GameConfig").
export const TILE = 4;            // metres per grid tile
export const MAP = 40;            // tiles per side
export const WALL_H = 3.2;        // height of one storey
export const WALL_T = 0.3;        // wall thickness
export const DOOR_W = 2.0;        // doorway width
export const DAY_SECONDS = 240;   // real seconds per in-game day at 1x
export const START_FUNDS = 30000;
export const START_HOUR = 6.5;
export const START_MONTH = 4;     // 0-based (4 = May)
export const START_YEAR = 2004;
export const DAYS_PER_MONTH = 30;
export const MAX_SIMS_HARD = 90;  // absolute ceiling for the performance governor
export const MIN_SIMS = 10;
