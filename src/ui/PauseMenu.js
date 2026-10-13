import { Sfx } from '../core/Sfx.js';
import { SLOTS, slotInfo, setSlot, currentSlot, save as saveTo } from '../core/Save.js';
import { MONTHS } from '../core/Clock.js';

// The in-game menu (Esc, or Create/Share on a controller): resume, save to a slot, load a slot, sound, game speed,
// the controls, and quit to the title screen. The town holds still while it's open.
const $ = (id) => document.getElementById(id);
export class PauseMenu {
  constructor(game) {
    this.game = game; this.open = false; this.page = 'main';
    const el = document.createElement('div'); el.id = 'pausemenu'; el.className = 'hidden'; $('app').appendChild(el); this.el = el;
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.click(b); });
    // every session starts on the best picture (main.js); lower settings picked here last for the session
  }
  store(k, v) { try { localStorage.setItem('samcity-' + k, v); } catch (e) { /* no storage */ } }
  show() { const g = this.game; if (this.open || !g.started || g.ending) return; this.open = true; this.page = 'main'; this.speed = g.clock.speed; g.clock.speed = 0; g.input.unlock(); this.render(); this.el.classList.remove('hidden'); Sfx.play('ui'); }
  hide() { if (!this.open) return; const g = this.game; this.open = false; this.el.classList.add('hidden'); g.clock.speed = g.netVisitor ? 0 : this.speed || 1; g.ui.calm && g.ui.calm(); g.input.pressed.delete('Escape'); }
  describe(n) {
    const inf = slotInfo(n); if (!inf) return `Slot ${n}: empty`;
    return `Slot ${n}: ${inf.pop} residents · ${inf.clock ? MONTHS[inf.clock.month] + ' ' + inf.clock.year : ''}${inf.t ? ' · ' + new Date(inf.t).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}${n === currentSlot() ? ' (this game)' : ''}`;
  }
  render() {
    const g = this.game, P = this.page, sp = this.speed ?? 1, vol = Math.round((Sfx.volume ?? 0.35) / 0.05);
    let body = '';
    if (P === 'main') body = `<button data-a="resume">▶ Resume</button>${g.netVisitor || g.demoMode ? '' : '<button data-a="savepage">💾 Save game</button>'}<button data-a="loadpage">📂 Load game</button><button data-a="options">🔊 Sound and speed</button>${g.netVisitor ? (g.deathmatch ? '<p class="ctl">⚔️ Combat mode is on (the host can turn it off).</p>' : '') : `<button data-a="combat">⚔️ Combat mode: <b>${g.combat.on ? 'ON' : 'off'}</b></button>${g.combat.on ? `<button data-a="bots">🤖 Bots: <b>${g.combat.bots.length}</b> (press for more / fewer)</button>` : ''}`}<button data-a="graphics">🖥️ Graphics and gameplay</button><button data-a="controls">🎮 Controls</button><button data-a="quit">🚪 Save and quit to the title screen</button>`;
    else if (P === 'save') body = `<p>Save this town to a slot. (It also saves itself every minute to slot ${currentSlot()}.)</p>` + Array.from({ length: SLOTS }, (_, i) => `<button data-a="save" data-n="${i + 1}">${this.describe(i + 1)}</button>`).join('') + '<button data-a="back">Back</button>';
    else if (P === 'load') body = '<p>Load a saved town. (This game is saved first.)</p>' + Array.from({ length: SLOTS }, (_, i) => { const inf = slotInfo(i + 1); return `<button data-a="load" data-n="${i + 1}" class="${inf && inf.ok ? '' : 'cant'}">${this.describe(i + 1)}</button>`; }).join('') + '<button data-a="back">Back</button>';
    else if (P === 'options') body = `<div class="prow">Sound effects <button data-a="sound">${Sfx.enabled ? 'On' : 'Off'}</button></div><div class="prow">Volume <button data-a="vol" data-d="-1">−</button><b>${vol}</b><button data-a="vol" data-d="1">+</button></div>`
      + (g.netVisitor ? '' : `<div class="prow">Game speed ${[0, 1, 2, 4].map((s) => `<button data-a="speed" data-s="${s}" class="${s === sp ? 'on' : ''}">${s ? s + 'x' : 'Pause'}</button>`).join('')}</div>`) + '<button data-a="back">Back</button>';
    else if (P === 'graphics') { const sc = Math.round((g.renderScale || 0.6) * 100), sh = g.atmosphere.sun.castShadow;
      body = `<div class="prow">Picture quality ${[40, 60, 80, 100].map((s) => `<button data-a="scale" data-s="${s}" class="${Math.abs(s - sc) < 6 ? 'on' : ''}">${s}%</button>`).join('')}</div>`
        + `<div class="prow">Shadows <button data-a="shadows">${sh ? 'On' : 'Off'}</button></div>`
        + `<div class="prow">Lower quality by itself if it runs slowly <button data-a="autoq">${g.lockQuality ? 'Off' : 'On'}</button></div>`
        + `<div class="prow">Street lamp outside each new building <button data-a="autolamps">${g.flags.noAutoLamps ? 'Off' : 'On'}</button></div>`
        + '<p class="ctl">Lower picture quality and no shadows run faster on older machines.</p><button data-a="back">Back</button>'; }
    else if (P === 'controls') body = `<div class="ctl"><b>Walking about (Sam)</b><br>WASD move · Shift sprint · mouse look · V first/third person · E use (hold to work) · Space jump · Z walk · F punch. Combat mode: right mouse aim, left click fire, R reload, Q cover, 1 / 2 / wheel swap, hold G grenade, C crouch, Z prone, F melee, V first person · X kick · Q eat · I backpack · J journal · B bike / car · C doors · 1-8 emotes · M map · TAB planning view<br><br><b>Planning view</b><br>WASD pan · Q/E rotate · wheel zoom · right-drag pan · R rotate the building · B Planning menu · F frame the island · 1-9 tools<br><br><b>Controller</b><br>Left stick move · right stick look · ✕ use · □ punch · R2 kick · L2 jump · △ eat · ○ emote / back · L1 sprint · R1 first/third person · L3 bike / car · R3 map · D-pad: ↑ backpack, ↓ drop, ← journal, → doors · Options planning view · Create this menu</div><button data-a="back">Back</button>`;
    this.el.innerHTML = `<div class="box"><h2>${{ main: '⏸ PAUSED', save: '💾 SAVE GAME', load: '📂 LOAD GAME', options: '🔊 SOUND AND SPEED', graphics: '🖥️ GRAPHICS AND GAMEPLAY', controls: '🎮 CONTROLS' }[P]}</h2>${body}</div>`;
    this.game.ui._pfScope = null;
  }
  click(b) {
    const g = this.game, a = b.dataset.a; Sfx.play('ui');
    if (a === 'resume') return this.hide();
    if (a === 'combat') { g.combat.setOn(!g.combat.on); if (g.combat.on && g.mode !== 'sim') g.setMode('sim'); return this.hide(); }
    if (a === 'bots') { const N = [0, 2, 4, 6, 8, 10], n = N[(N.indexOf(g.combat.bots.length) + 1) % N.length]; g.combat.botCount = n; g.combat.setBots(n); return this.render(); }
    if (a === 'savepage') { this.page = 'save'; return this.render(); } if (a === 'loadpage') { this.page = 'load'; return this.render(); }
    if (a === 'options') { this.page = 'options'; return this.render(); } if (a === 'controls') { this.page = 'controls'; return this.render(); } if (a === 'graphics') { this.page = 'graphics'; return this.render(); } if (a === 'back') { this.page = 'main'; return this.render(); }
    if (a === 'save') { setSlot(+b.dataset.n); const ok = saveTo(g); g.ui.toast(ok ? `Saved to slot ${b.dataset.n}.` : 'Could not save (is the browser storage full?).', 2400); return this.render(); }
    if (a === 'load') { if (b.classList.contains('cant')) return; if (!g.netVisitor && !g.demoMode) saveTo(g); setSlot(+b.dataset.n); location.href = location.pathname + '?auto&cont'; return; }
    if (a === 'quit') { if (!g.netVisitor && !g.demoMode) saveTo(g); location.href = location.pathname; return; }
    if (a === 'sound') { Sfx.enabled = !Sfx.enabled; try { localStorage.setItem('samcity-sound', Sfx.enabled ? '1' : '0'); } catch (e) { /* no storage */ } const o = $('opt-sound'); if (o) o.checked = Sfx.enabled; }
    if (a === 'vol') { const v = Math.max(0, Math.min(10, Math.round(Sfx.volume / 0.05) + +b.dataset.d)); Sfx.setVolume(v * 0.05); try { localStorage.setItem('samcity-volume', String(v)); } catch (e) { /* no storage */ } }
    if (a === 'speed') this.speed = +b.dataset.s;
    if (a === 'scale') { g.renderScale = +b.dataset.s / 100; g.lockQuality = true; g.resize(); this.store('scale', String(g.renderScale)); }
    if (a === 'shadows') { const s = g.atmosphere.sun; s.castShadow = !s.castShadow; g.lockQuality = true; this.store('shadows', s.castShadow ? '1' : '0'); }
    if (a === 'autoq') { g.lockQuality = !g.lockQuality; if (!g.lockQuality) { try { localStorage.removeItem('samcity-scale'); localStorage.removeItem('samcity-shadows'); } catch (e) { /* no storage */ } } }
    if (a === 'autolamps') g.flags.noAutoLamps = !g.flags.noAutoLamps;
    this.render();
  }
}
