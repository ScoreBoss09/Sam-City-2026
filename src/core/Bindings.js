/**
 * Your own keys and buttons. Every action has the key the game was written with (`code`); a binding says which key on
 * YOUR keyboard (or which button on your controller) does that action. Input translates as the key is pressed, so the
 * whole game follows the binding without knowing about it. Saved in this browser.
 */
export const KEY_ACTIONS = [
  { id: 'fwd', label: 'Walk forward (planning: pan)', code: 'KeyW', group: 'Moving' },
  { id: 'back', label: 'Walk back', code: 'KeyS', group: 'Moving' },
  { id: 'left', label: 'Step left', code: 'KeyA', group: 'Moving' },
  { id: 'right', label: 'Step right', code: 'KeyD', group: 'Moving' },
  { id: 'sprint', label: 'Sprint', code: 'ShiftLeft', group: 'Moving' },
  { id: 'jump', label: 'Jump', code: 'Space', group: 'Moving' },
  { id: 'bike', label: 'Bike or car (planning: the work queue)', code: 'KeyB', group: 'Moving' },
  { id: 'camera', label: 'First / third person', code: 'KeyV', group: 'Moving' },
  { id: 'use', label: 'Use, talk, work (hold) · planning: rotate right', code: 'KeyE', group: 'Doing' },
  { id: 'eat', label: 'Eat · planning: rotate left', code: 'KeyQ', group: 'Doing' },
  { id: 'punch', label: 'Punch / shoot', code: 'KeyF', group: 'Doing' },
  { id: 'kick', label: 'Kick', code: 'KeyX', group: 'Doing' },
  { id: 'emote', label: 'Emote', code: 'KeyG', group: 'Doing' },
  { id: 'door', label: 'Open / shut a door', code: 'KeyC', group: 'Doing' },
  { id: 'drop', label: 'Drop everything · planning: turn the building', code: 'KeyR', group: 'Doing' },
  { id: 'bag', label: 'Backpack', code: 'KeyI', group: 'Menus' },
  { id: 'journal', label: 'Journal', code: 'KeyJ', group: 'Menus' },
  { id: 'map', label: 'Island map', code: 'KeyM', group: 'Menus' },
  { id: 'town', label: 'Town overview (what needs doing)', code: 'KeyO', group: 'Menus' },
  { id: 'planning', label: 'Planning view / Sam', code: 'Tab', group: 'Menus' },
  { id: 'help', label: 'Show the controls', code: 'KeyH', group: 'Menus' },
  { id: 'pause', label: 'Pause / carry on', code: 'KeyP', group: 'Game speed' },
  { id: 'speedcycle', label: 'Cycle speed (1x, 2x, 4x, paused)', code: 'Period', group: 'Game speed' },
  { id: 'faster', label: 'Faster', code: 'Equal', group: 'Game speed' },
  { id: 'slower', label: 'Slower', code: 'Minus', group: 'Game speed' },
];
/** Controller slots, by what they do in the standard layout (the index is the button the game reads). */
export const PAD_ACTIONS = [
  [0, 'Use, talk, work · menus: select'], [1, 'Emote · menus: back'], [2, 'Punch'], [3, 'Eat'], [4, 'Sprint'], [5, 'Camera'], [6, 'Jump'], [7, 'Kick'],
  [8, 'Game speed (tap) · speed menu (hold)'], [9, 'Planning view / Sam'], [10, 'Bike'], [11, 'Island map'], [12, 'Backpack'], [13, 'Drop everything'], [14, 'Journal'], [15, 'Open / shut a door'],
];
export const PAD_NAMES = ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'PS'];
const NAMES = { Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt', Tab: 'Tab', Enter: 'Enter', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  Period: '.', Comma: ',', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`', Equal: '= / +', Minus: '−', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  NumpadAdd: 'Num +', NumpadSubtract: 'Num −', NumpadEnter: 'Num Enter', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down' };
export function keyName(code) { if (!code) return '—'; if (NAMES[code]) return NAMES[code]; if (/^Key[A-Z]$/.test(code)) return code.slice(3); if (/^Digit\d$/.test(code)) return code.slice(5); if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6); return code; }
const STORE = 'samcity-binds';

/** How fast the view turns: the mouse, the right stick, and each while aiming down the sights (1 = as the game came). */
export const SENS = { mouse: 1, mouseAim: 1, pad: 1, padAim: 1, invertMouse: false, invertPad: false };

export class Bindings {
  constructor() { this.keys = {}; this.pad = PAD_NAMES.map((_, i) => i); this.sens = { ...SENS }; this.load(); }
  load() {
    try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s) { if (s.keys) this.keys = s.keys; if (Array.isArray(s.pad) && s.pad.length === this.pad.length) this.pad = s.pad; if (s.sens) for (const k in SENS) if (typeof s.sens[k] === typeof SENS[k] && (typeof SENS[k] !== 'number' || Number.isFinite(s.sens[k]))) this.sens[k] = s.sens[k]; } } catch (e) { /* defaults */ }
    this.build();
  }
  save() { try { localStorage.setItem(STORE, JSON.stringify({ keys: this.keys, pad: this.pad, sens: this.sens })); } catch (e) { /* no storage */ } this.build(); }
  reset() { this.keys = {}; this.pad = PAD_NAMES.map((_, i) => i); this.sens = { ...SENS }; this.save(); }
  /** One sensitivity setting (clamped to something usable). */
  setSens(k, v) { if (!(k in SENS)) return; this.sens[k] = typeof SENS[k] === 'boolean' ? !!v : Math.max(0.2, Math.min(4, +v || 1)); this.save(); }
  /** The key on your keyboard for an action (its own key unless you changed it). */
  keyFor(a) { return this.keys[a.id] || a.code; }
  /** Bind action `id` to the key `code`: whatever had that key gets this action's old key (a swap, so nothing is lost). */
  setKey(id, code) {
    const a = KEY_ACTIONS.find((q) => q.id === id); if (!a) return; const old = this.keyFor(a);
    const other = KEY_ACTIONS.find((q) => q !== a && this.keyFor(q) === code); if (other) this.keys[other.id] = old;
    this.keys[id] = code; for (const q of KEY_ACTIONS) if (this.keys[q.id] === q.code) delete this.keys[q.id]; this.save();
  }
  /** Controller: the game's button `slot` is done by your button `btn` (swapped with whichever slot had it). */
  setPad(slot, btn) { const j = this.pad.indexOf(btn); if (j >= 0) this.pad[j] = this.pad[slot]; this.pad[slot] = btn; this.save(); }
  /** physical key -> the key the game listens for (null = does nothing now; undefined = unchanged). */
  build() {
    const m = {}; let changed = false;
    for (const a of KEY_ACTIONS) { const k = this.keyFor(a); if (k !== a.code) { changed = true; m[k] = a.code; if (!(a.code in m)) m[a.code] = null; } }
    for (const a of KEY_ACTIONS) { const k = this.keyFor(a); m[k] = a.code; }   // (a key moved onto another action wins over the "now unused" mark)
    this.map = changed ? m : null;
    // the letters in prompts and help ("Press E to...") follow the keys you chose
    this.labels = {}; for (const a of KEY_ACTIONS) { const k = this.keyFor(a); if (k !== a.code && /^Key[A-Z]$/.test(a.code)) this.labels[a.code.slice(3)] = keyName(k); }
  }
  translate(code) { if (!this.map) return code; const v = this.map[code]; return v === undefined ? code : v; }
}
