import { DAYLIGHT_SECONDS, NIGHT_SECONDS, DAWN, DUSK, DAYS_PER_MONTH, START_HOUR, START_MONTH, START_YEAR } from '../config.js';
import { Emitter } from '../util.js';
export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export class Clock extends Emitter {
  constructor() { super(); this.hour = START_HOUR; this.day = 1; this.month = START_MONTH; this.year = START_YEAR; this.speed = 1; this.sleepBoost = 0; this.totalDays = 0; }
  get scale() { return this.sleepBoost || this.speed; }
  /** Advance by real dt; returns the scaled game dt in seconds. */
  tick(dt) {
    const gdt = dt * this.scale, h0 = Math.floor(this.hour);
    this.hour += gdt * this.rate(); if (Math.floor(this.hour) !== h0 && this.hour < 24) this.emit('hour');
    while (this.hour >= 24) {
      this.hour -= 24; this.day++; this.totalDays++; this.emit('day');
      if (this.day > DAYS_PER_MONTH) { this.day = 1; this.month++; if (this.month > 11) { this.month = 0; this.year++; } this.emit('month'); }
    }
    return gdt;
  }
  /** Game hours per (scaled) second right now: days pass slowly, nights quickly. */
  rate(h = this.hour) { return h >= DAWN && h < DUSK ? (DUSK - DAWN) / DAYLIGHT_SECONDS : (24 - DUSK + DAWN) / NIGHT_SECONDS; }
  get hhmm() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  get isNight() { return this.hour < 5.5 || this.hour >= 19.5; }
  serialize() { return { hour: this.hour, day: this.day, month: this.month, year: this.year, totalDays: this.totalDays }; }
  load(s) { Object.assign(this, s); }
}
