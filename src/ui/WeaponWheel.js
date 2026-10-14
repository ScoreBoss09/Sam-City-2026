/**
 * The weapon wheel (hold Tab, or hold △ on a controller, in combat mode), like GTA V and Red Dead: eight slices round the
 * screen, one per kind of weapon, with what you're carrying in each. Point at a slice with the mouse or the right stick,
 * scroll (or D-pad ← →) between the guns in that slice, and let go to take it out. Time slows to a crawl while it's open
 * (playing alone). Also draws the little gun pictures the HUD uses.
 */

/** Side-on silhouettes in a 100 x 40 box (rectangles and polygons), one per weapon. */
const SHAPES = {
  pistol: 'M14 9h50v9H14z M16 18h12l-3 19H13z M30 18h6v7h-6z M44 6h6v3h-6z',
  magnum: 'M34 10h48v6H34z M16 7h20v13H16z M14 20h11l-6 18H9z M26 20h6v6h-6z M76 7h4v3h-4z',
  mp: 'M8 8h56v11H8z M64 11h10v5H64z M14 19h11l-2 17H13z M34 19h8v22h-8z',
  smg: 'M12 9h58v11H12z M70 12h14v4H70z M24 20h8v16h-8z M42 20h7v20h-7z M0 10h12v3H3v4h9v3H0z',
  ar: 'M0 10h18v14H8l-8-4z M18 9h34v11H18z M50 10h20v9H50z M70 12h24v4H70z M42 5h10v4H42z M30 20h7v14h-7z M45 20h9l-2 18h-8z',
  shotgun: 'M0 12h22v13H10l-10-5z M22 10h22v9H22z M44 10h54v5H44z M56 15h18v6H56z M28 19h7v12h-7z',
  sniper: 'M0 12h22v12H10l-10-4z M22 11h30v8H22z M52 13h48v3H52z M28 2h28v7H28z M32 9h4v2h-4z M48 9h4v2h-4z M34 19h6v12h-6z M80 16l-6 14h2l6-14z M84 16l6 14h-2l-6-14z',
  lmg: 'M0 10h16v14H6L0 20z M16 8h48v14H16z M64 12h32v4H64z M34 22h18v14H34z M24 22h7v13h-7z M30 3h20v3H30z M86 16l-5 14h2l5-14z M90 16l5 14h-2l-5-14z',
  launcher: 'M2 8h88v12H2z M90 6h8v16h-8z M28 20h7v13h-7z M56 20h7v13h-7z M40 2h8v6h-8z',
  nade: 'M50 6h10v6H50z M58 4h14v3H58z M50 12c10 0 16 7 16 14s-7 13-16 13-16-6-16-13 6-14 16-14z',
  fist: 'M34 12h32c4 0 6 3 6 6v12c0 5-4 9-9 9H40c-5 0-8-4-8-9V16c0-2 1-4 2-4z M34 12v-4h8v4 M44 12V7h8v5 M54 12V7h8v5 M64 12V8h6v6',
};
export function gunIcon(k, cls = '') { const d = SHAPES[k] || SHAPES.fist; return `<svg class="gicon ${cls}" viewBox="0 0 100 40" aria-hidden="true"><path d="${d}" fill="currentColor" fill-rule="evenodd"/></svg>`; }

/** The slices, clockwise from the top. 'nade' is the grenade in hand; null is fists. */
export const WHEEL = [
  { id: 'pistols', name: 'Pistols', guns: ['pistol', 'magnum'] },
  { id: 'smgs', name: 'SMGs', guns: ['smg', 'mp'] },
  { id: 'rifles', name: 'Rifles', guns: ['ar'] },
  { id: 'shotguns', name: 'Shotguns', guns: ['shotgun'] },
  { id: 'snipers', name: 'Sniper rifles', guns: ['sniper'] },
  { id: 'heavy', name: 'Heavy', guns: ['lmg', 'launcher'] },
  { id: 'throw', name: 'Grenades', guns: ['nade'] },
  { id: 'unarmed', name: 'Unarmed', guns: [null] },
];
/** Every gun, in wheel order (the order 1-9 and the scroll wheel go through them). */
export const GUN_ORDER = WHEEL.flatMap((s) => s.guns).filter((k) => k && k !== 'nade');

const R0 = 74, R1 = 188, GAP = 0.035;
const pt = (a, r) => `${(Math.sin(a) * r).toFixed(1)} ${(-Math.cos(a) * r).toFixed(1)}`;
function slicePath(i) { const n = WHEEL.length, a0 = (i - 0.5) * (Math.PI * 2 / n) + GAP, a1 = (i + 0.5) * (Math.PI * 2 / n) - GAP; return `M${pt(a0, R0)} L${pt(a0, R1)} A${R1} ${R1} 0 0 1 ${pt(a1, R1)} L${pt(a1, R0)} A${R0} ${R0} 0 0 0 ${pt(a0, R0)}Z`; }

export class WeaponWheel {
  constructor(combat) { this.C = combat; this.open = false; this.sel = 0; this.vx = 0; this.vy = 0; this.pick = {}; this.el = null; }
  build() {
    if (this.el) return; const n = WHEEL.length;
    let svg = '<svg class="wsvg" viewBox="-200 -200 400 400">';
    for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n, cx = Math.sin(a) * 131, cy = -Math.cos(a) * 131; svg += `<g class="wslice" data-i="${i}"><path d="${slicePath(i)}"/><foreignObject x="${(cx - 46).toFixed(1)}" y="${(cy - 30).toFixed(1)}" width="92" height="60"><div class="wsl" xmlns="http://www.w3.org/1999/xhtml"></div></foreignObject></g>`; }
    svg += '</svg>';
    document.getElementById('app').insertAdjacentHTML('beforeend', `<div id="wwheel" class="hidden">${svg}<div class="wmid"><div class="wname"></div><div class="wammo"></div><div class="wvar"></div></div><div class="whint"></div></div>`);
    this.el = document.getElementById('wwheel');
  }
  /** What's in a slice for this player: the gun shown (their pick in that slice if they have it) and how many they carry there. */
  slice(P, i) {
    const s = WHEEL[i], have = s.guns.filter((k) => (k === null ? true : k === 'nade' ? (P.nades || 0) > 0 : P.slots && P.slots.includes(k)));
    const want = this.pick[s.id], k = have.includes(want) ? want : have.includes(P.gun) ? P.gun : have[0];
    return { s, have, k: k === undefined ? s.guns[0] : k, owned: have.length > 0 };
  }
  show(P) {
    this.build(); this.open = true; this.vx = this.vy = 0; const cur = WHEEL.findIndex((s) => s.guns.includes(P.nadeHand ? 'nade' : P.gun ?? null)); this.sel = cur >= 0 ? cur : 0;
    this.el.classList.remove('hidden'); this.draw(P);
  }
  hide() { this.open = false; if (this.el) this.el.classList.add('hidden'); }
  /** Point at a slice: mouse movement (dx, dy) adds up like a little joystick; a stick gives the direction straight. */
  aim(dx, dy, sx, sy) {
    if (Math.hypot(sx, sy) > 0.5) { this.vx = sx * 100; this.vy = sy * 100; }
    else { this.vx += dx; this.vy += dy; const L = Math.hypot(this.vx, this.vy); if (L > 100) { this.vx *= 100 / L; this.vy *= 100 / L; } }
    if (Math.hypot(this.vx, this.vy) > 35) { const n = WHEEL.length, a = Math.atan2(this.vx, -this.vy), i = ((Math.round(a / (Math.PI * 2 / n)) % n) + n) % n; if (i !== this.sel) { this.sel = i; return true; } }
    return false;
  }
  /** Scroll between the guns in the slice you're pointing at. */
  cycle(P, dir) { const sl = this.slice(P, this.sel); if (sl.have.length < 2) return false; const j = sl.have.indexOf(sl.k); this.pick[sl.s.id] = sl.have[(j + dir + sl.have.length) % sl.have.length]; return true; }
  /** The weapon to take out on letting go (undefined: nothing to take in that slice). */
  chosen(P) { const sl = this.slice(P, this.sel); return sl.owned ? sl.k : undefined; }
  draw(P) {
    if (!this.el) return; const W = this.C.weapons, n = WHEEL.length;
    for (let i = 0; i < n; i++) {
      const sl = this.slice(P, i), g = this.el.querySelector(`.wslice[data-i="${i}"]`), box = g.querySelector('.wsl'), k = sl.k;
      g.classList.toggle('on', i === this.sel); g.classList.toggle('none', !sl.owned); g.classList.toggle('cur', (P.nadeHand ? 'nade' : P.gun ?? null) === k && sl.owned);
      const am = k && k !== 'nade' && P.ammo && P.ammo[k], count = k === 'nade' ? `×${P.nades || 0}` : am ? `${am.mag + am.res}` : '';
      box.innerHTML = gunIcon(k === null ? 'fist' : k) + `<span>${sl.owned ? count : ''}</span>${sl.have.length > 1 ? `<em>${sl.have.indexOf(k) + 1}/${sl.have.length}</em>` : ''}`;
    }
    const sl = this.slice(P, this.sel), k = sl.k, w = k && W[k];
    this.el.querySelector('.wname').textContent = k === null ? 'Fists' : k === 'nade' ? 'Frag grenade' : w ? w.name : sl.s.name;
    const am = k && P.ammo && P.ammo[k];
    this.el.querySelector('.wammo').innerHTML = !sl.owned ? '<i>Not carrying one: the police station armoury has them</i>' : k === null ? 'Punch (fire) · melee' : k === 'nade' ? `${P.nades} left · fire to throw` : am ? `<b>${am.mag}</b> / ${am.res}` : '';
    this.el.querySelector('.wvar').textContent = sl.have.length > 1 ? '◀ scroll / D-pad ▶ for the other ' + sl.s.name.toLowerCase().replace(/s$/, '') : '';
    const pad = this.C.game.input.padActive; this.el.querySelector('.whint').textContent = pad ? 'Right stick: choose · let go of △ to take it' : 'Move the mouse to choose · let go of Tab to take it · 1-9 pick straight away';
  }
}
