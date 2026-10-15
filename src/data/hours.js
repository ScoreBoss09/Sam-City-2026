// Opening hours [open, close] (close past 24 means after midnight). Staff work these hours (long days are split into
// an early and a late shift when there are two or more staff); anything not listed keeps office hours (9 to 5).
export const HOURS = {
  tavern: [11, 23], wmc: [12, 23], nightclub: [21, 26], snooker: [11, 23], bingo: [13, 22.5], cinema: [13, 23.5], bowling: [10, 23], laserquest: [10, 21], arcade: [10, 21.5], youthclub: [16, 21.5], leisure: [7, 21],
  chippy: [11.5, 22], kebab: [17, 27], curryhouse: [17, 23.5], cafe: [7, 15.5], bakery: [6, 14], butcher: [8, 17], offy: [10, 22], newsagent: [6, 18.5], supermarket: [8, 20], shop: [7.5, 19], video: [10, 22],
  hotel: [0, 24], clinic: [0, 24], police: [0, 24], firestation: [0, 24], railstation: [6, 23], monostation: [6, 23], skylift: [7, 22], garage: [8, 18], launderette: [8, 20], bookies: [9.5, 21],
};
export function inHours(h, w) { if (!w) return false; const [o, c] = w; return c > 24 ? h >= o || h < c - 24 : h >= o && h < c; }
/** This worker's own shift at their workplace's hours (or null if the place keeps office hours). */
export function shiftOf(b, sim) {
  const w = b && HOURS[b.id]; if (!w) return null; const [o, c] = w, span = c - o;
  if (b.id === 'firestation') return b.workers.indexOf(sim) % 2 ? [20, 32] : [8, 20];   // two watches: days, and nights (asleep upstairs unless the bells go down) if (span >= 24) { if (b.workers.length < 2) return [8, 20]; const n = b.workers.length, i = Math.max(0, b.workers.indexOf(sim)), len = 24 / Math.min(3, n), s = (i % Math.min(3, n)) * len; return [s, s + len]; }   // round the clock: shifts
  const n = b.workers.length, i = b.workers.indexOf(sim); if (n < 2 || span <= 9) return w;
  const mid = o + span / 2; return i % 2 === 0 ? [o, mid + 0.5] : [mid - 0.5, c];   // early and late, with a handover
}
