import { KEY_ACTIONS, PAD_ACTIONS, PAD_NAMES, keyName } from '../core/Bindings.js';
import { Sfx } from '../core/Sfx.js';

const RESERVED = ['Escape', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight', 'ContextMenu'];

/**
 * Change the keys and controller buttons, like any game: pick an action, press the key (or button) you want for it.
 * A key that already does something else swaps over, so nothing is ever left without a key. Used on the title screen's
 * Options and in the pause menu.
 */
export class ControlsMenu {
  constructor(game) { this.game = game; this.tab = 'keys'; this.wait = null; }
  html() {
    const B = this.game.input.binds, row = (label, btn) => `<div class="bind"><span>${label}</span>${btn}</div>`;
    let body = '';
    if (this.tab === 'keys') {
      let grp = '';
      for (const a of KEY_ACTIONS) {
        if (a.group !== grp) { grp = a.group; body += `<div class="bindgrp">${grp}</div>`; }
        const waiting = this.wait === a.id, k = B.keyFor(a);
        body += row(a.label, `<button data-c="key" data-id="${a.id}" class="keycap${waiting ? ' waiting' : ''}${k !== a.code ? ' changed' : ''}">${waiting ? 'Press a key… (Esc: cancel)' : keyName(k)}</button>`);
      }
      body += '<div class="bindnote">Mouse: look and aim · right button: aim · wheel: zoom · 1-8: emotes and planning tools · arrow keys: look</div>';
    } else {
      for (const [slot, label] of PAD_ACTIONS) { const waiting = this.wait === 'pad' + slot, btn = B.pad[slot]; body += row(label, `<button data-c="pad" data-slot="${slot}" class="keycap${waiting ? ' waiting' : ''}${btn !== slot ? ' changed' : ''}">${waiting ? 'Press a button… (Esc: cancel)' : PAD_NAMES[btn]}</button>`); }
      body += '<div class="bindnote">Sticks: left moves, right looks. In combat mode the triggers aim and fire.</div>';
    }
    return `<div class="ptabs"><button data-c="tab" data-t="keys" class="${this.tab === 'keys' ? 'on' : ''}">Keyboard</button><button data-c="tab" data-t="pad" class="${this.tab === 'pad' ? 'on' : ''}">Controller</button></div>
      <div class="binds">${body}</div><button data-c="reset">Reset to the usual keys</button>`;
  }
  /** A button in the Controls screen was pressed; redraw() redraws whichever menu it lives in. */
  click(btn, redraw) {
    const I = this.game.input, B = I.binds, a = btn.dataset.c; Sfx.play('ui');
    const done = () => { this.wait = null; I.capture = null; I.padCapture = null; redraw(); };
    if (a === 'tab') { this.tab = btn.dataset.t; this.wait = null; I.capture = null; I.padCapture = null; return redraw(); }
    if (a === 'reset') { B.reset(); this.game.ui.toast('Controls back to the usual keys.', 1800); return done(); }
    if (a === 'key') {
      const id = btn.dataset.id; this.wait = id; redraw();
      setTimeout(() => { I.capture = (code) => { if (RESERVED.includes(code)) { if (code !== 'Escape') this.game.ui.toast(`${keyName(code)} is kept by the browser.`, 1800); } else B.setKey(id, code); done(); }; }, 0);   // (after this click, so it isn't the key)
      return;
    }
    if (a === 'pad') {
      const slot = +btn.dataset.slot; this.wait = 'pad' + slot; redraw();
      const esc = (code) => { if (code === 'Escape') done(); else I.capture = esc; }; setTimeout(() => { I.padCapture = (b) => { B.setPad(slot, b); done(); }; I.capture = esc; }, 250);   // (let go of the ✕ that chose it first)
    }
  }
}
