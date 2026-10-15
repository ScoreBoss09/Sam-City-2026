import { DAYLIGHT_SECONDS, NIGHT_SECONDS, DAWN, DUSK, START_HOUR, START_MONTH, START_DAY, START_YEAR } from '../config.js';
import { Emitter } from '../util.js';
import { monthDays, weekdayOf } from '../data/calendar.js';
export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];   // weekday 0 is a Monday
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The show's clock: real dates (real month lengths and weekdays) from Monday 3rd April 1995. Emits hour, day, week (each Monday) and month. */
export class Clock extends Emitter {
  constructor() { super(); this.hour = START_HOUR; this.day = START_DAY; this.month = START_MONTH; this.year = START_YEAR; this.speed = 1; this.sleepBoost = 0; this.totalDays = 0; }
  get scale() { return this.sleepBoost || this.speed; }
  /** Advance by real dt; returns the scaled game dt in seconds. */
  tick(dt) {
    const gdt = dt * this.scale, h0 = Math.floor(this.hour);
    this.hour += gdt * this.rate(); if (Math.floor(this.hour) !== h0 && this.hour < 24) this.emit('hour');
    while (this.hour >= 24) {
      this.hour -= 24; this.day++; this.totalDays++;
      if (this.day > monthDays(this.month, this.year)) { this.day = 1; this.month++; if (this.month > 11) { this.month = 0; this.year++; } this.emit('month'); }
      this.emit('day'); if (this.weekday === 0) this.emit('week');
    }
    return gdt;
  }
  /** Game hours per (scaled) second right now: days pass slowly, nights quickly. */
  rate(h = this.hour) { return h >= DAWN && h < DUSK ? (DUSK - DAWN) / DAYLIGHT_SECONDS : (24 - DUSK + DAWN) / NIGHT_SECONDS; }
  get hhmm() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  get weekday() { const k = this.year * 400 + this.month * 32 + this.day; if (this._wk !== k) { this._wk = k; this._wd = weekdayOf(this.year, this.month, this.day); } return this._wd; }   // (0 Monday ... 6 Sunday)
  get isSunday() { return this.weekday === 6; }
  get isNight() { return this.hour < 5.5 || this.hour >= 19.5; }
  serialize() { return { hour: this.hour, day: this.day, month: this.month, year: this.year, totalDays: this.totalDays }; }
  load(s) { Object.assign(this, s); }
}
