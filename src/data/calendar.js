// The calendar of the show: real dates from 1995 on (month lengths, weekdays, Easter), and the days the town keeps.
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SAM_BIRTHDAY = [3, 20];   // 20 April (month 0-based)

export const leap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
export const monthDays = (m, y) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
/** 0 = Monday ... 6 = Sunday. */
export const weekdayOf = (y, m, d) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;
export const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

/** Easter Sunday (the Gregorian computus): [month, day]. 1995: 16 April. */
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1; return [month - 1, day];
}
const shift = (y, [m, d], n) => { const t = new Date(Date.UTC(y, m, d + n)); return [t.getUTCMonth(), t.getUTCDate()]; };
/** The nth given weekday of a month (n = -1: the last one). */
function nth(y, m, wd, n) {
  if (n > 0) { const first = weekdayOf(y, m, 1); return [m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7]; }
  const last = monthDays(m, y), lw = weekdayOf(y, m, last); return [m, last - ((lw - wd + 7) % 7)];
}

/** The days the town keeps this year, in date order: { m, d, name, icon, holiday (a bank holiday), sam (Sam's own) }. */
const cache = new Map();
export function keyDates(y) {
  if (cache.has(y)) return cache.get(y);
  const E = easter(y), L = [];
  const add = ([m, d], name, icon, extra = {}) => L.push({ m, d, name, icon, ...extra });
  add([0, 1], 'New Year\'s Day', '🎉', { holiday: true });
  add([1, 14], 'Valentine\'s Day', '💘');
  add(shift(y, E, -47), 'Pancake Day', '🥞');
  add(shift(y, E, -21), 'Mother\'s Day', '💐');
  add([3, 1], 'April Fools\' Day', '🃏');
  add(shift(y, E, -2), 'Good Friday', '✝️', { holiday: true });
  add(E, 'Easter Sunday', '🐣');
  add(shift(y, E, 1), 'Easter Monday', '🐰', { holiday: true });
  add(SAM_BIRTHDAY, 'Sam\'s birthday', '🎂', { sam: true });
  add([3, 23], 'St George\'s Day', '🌹');
  add(y === 1995 ? [4, 8] : nth(y, 4, 0, 1), y === 1995 ? 'VE Day bank holiday' : 'May Day bank holiday', '🌼', { holiday: true });   // (1995: moved for VE Day's fiftieth)
  add(nth(y, 4, 0, -1), 'Spring bank holiday', '🌷', { holiday: true });
  add(nth(y, 5, 6, 3), 'Father\'s Day', '👔');
  add([5, 21], 'Midsummer', '☀️');
  add(nth(y, 7, 0, -1), 'Summer bank holiday', '🏖️', { holiday: true });
  add([9, 31], 'Halloween', '🎃');
  add([10, 5], 'Bonfire Night', '🎆');
  add(nth(y, 10, 6, 2), 'Remembrance Sunday', '🌺');
  add([11, 24], 'Christmas Eve', '🎄');
  add([11, 25], 'Christmas Day', '🎁', { holiday: true });
  add([11, 26], 'Boxing Day', '🥧', { holiday: true });
  add([11, 31], 'New Year\'s Eve', '🥂');
  L.sort((a, b) => a.m - b.m || a.d - b.d); cache.set(y, L); return L;
}
/** What today is (a key date), or null. */
export function today(c) { return keyDates(c.year).find((k) => k.m === c.month && k.d === c.day) || null; }
/** The next n key dates from today (today's included): { ...date, year, inDays }. */
export function upcoming(c, n = 5) {
  const out = [], t0 = Date.UTC(c.year, c.month, c.day);
  for (const y of [c.year, c.year + 1]) for (const k of keyDates(y)) { const t = Date.UTC(y, k.m, k.d); if (t >= t0) out.push({ ...k, year: y, inDays: Math.round((t - t0) / 86400000) }); }
  return out.slice(0, n);
}
/** "Tuesday 11th April 1995" (long) or "Tue 11 Apr 1995" (short). */
export function dateText(c, long = false) {
  const wd = weekdayOf(c.year, c.month, c.day);
  return long ? `${DAY_NAMES[wd]} ${ordinal(c.day)} ${MONTH_NAMES[c.month]} ${c.year}` : `${DAY_NAMES[wd].slice(0, 3)} ${c.day} ${MONTH_NAMES[c.month].slice(0, 3)} ${c.year}`;
}
