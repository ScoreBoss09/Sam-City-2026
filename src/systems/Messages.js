import { Emitter } from '../util.js';
/** Feed of messages from the city (and from "you" in god mode). */
export class Messages extends Emitter {
  constructor() { super(); this.log = []; }
  push(from, text, kind = '') { const m = { from, text, kind, t: performance.now() }; this.log.push(m); if (this.log.length > 80) this.log.shift(); this.emit('msg', m); }
}
