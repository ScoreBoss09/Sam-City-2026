import { MONTHS } from '../core/Clock.js';
import { Sfx } from '../core/Sfx.js';

/** Letters delivered to the Postbox: monthly accounts, permit replies, news and notes from the neighbours. */
export class Mail {
  constructor(game) { this.game = game; this.letters = []; this.welcomed = false; }
  get box() { return this.game.buildings.list.find((b) => b.id === 'postbox' && b.state === 'done') || null; }
  unread() { return this.letters.filter((l) => !l.read).length; }
  send(from, title, body, opts = {}) {
    const c = this.game.clock; this.letters.unshift({ from, title, body, date: `${c.day} ${MONTHS[c.month]} ${c.year}`, read: false, kind: opts.kind || 'letter' });
    if (this.letters.length > 40) this.letters.length = 40;
    if (this.box && this.game.started && !opts.quiet) { this.game.ui.toast('✉ New post in the Postbox: ' + title, 3000); Sfx.play('pickup'); }
  }
  markRead() { for (const l of this.letters) l.read = true; }
  update() {
    const b = this.box; if (!b) return;
    if (!this.welcomed) { this.welcomed = true; this.send('The Planning Office', 'Welcome to your Postbox', 'Dear Sam,\n\nFrom now on we will write to you here. You will find the monthly accounts, replies to your permit forms and any news from the Lift.\n\nTo ask for a new kind of building, fill in a Permit form (in this box) and post it back. We usually reply by the next morning.\n\nYours faithfully,\nThe Planning Office', { quiet: true }); }
    const f = b.ext && b.ext.flag; if (f) { const want = this.unread() ? 0 : -Math.PI / 2; f.rotation.x += (want - f.rotation.x) * 0.15; }
  }
  serialize() { return { letters: this.letters, welcomed: this.welcomed }; }
  load(s) { if (!s) return; this.letters = s.letters || []; this.welcomed = !!s.welcomed; }
}
