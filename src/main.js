import { Sfx } from './core/Sfx.js';
import { Game } from './Game.js';
import { Assets } from './render/Assets.js';
import { VERSION } from './version.js';
import { preloadModels } from './render/GLB.js';
preloadModels();   // furniture models (assets/models) load in the background
import { installPack, clearStored } from './core/TexturePack.js';

const params = new URLSearchParams(location.search);
document.getElementById('ver').textContent = 'version ' + VERSION; document.getElementById('titlever').textContent = 'Version ' + VERSION;
await Promise.all([Assets.load(), document.fonts ? Promise.all(['400 16px Barlow', '600 16px Barlow', '700 16px Barlow', '700 16px "Barlow Condensed"'].map((f) => document.fonts.load(f))).catch(() => {}) : null]);   // (the canvas signs and bubbles use the UI type too)
import { Mods } from './core/Mods.js';
await Mods.load();   // mods/index.json: extra textures, speech, adverts, guests, shop goods, buildings, events, scripts
const game = new Game(document.getElementById('view'), { scale: parseFloat(params.get('scale')) || 0.6, post: params.get('post') !== '0' });
window.__game = game;
Mods.start(game);
game.run();
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => Sfx.resume());
game.input.onActivity = () => Sfx.resume();
const soundOpt = document.getElementById('opt-sound'); try { if (localStorage.getItem('samcity-sound') === '0') soundOpt.checked = false; } catch (e) { /* no storage */ }
soundOpt.onchange = () => { Sfx.enabled = soundOpt.checked; try { localStorage.setItem('samcity-sound', soundOpt.checked ? '1' : '0'); } catch (e) { /* no storage */ } }; Sfx.enabled = soundOpt.checked;
const padOpt = document.getElementById('opt-pad'); try { if (localStorage.getItem('samcity-pad') === '0' || params.has('nopad')) padOpt.checked = false; } catch (e) { /* no storage */ }
const applyPad = () => { game.input.padEnabled = padOpt.checked; if (!padOpt.checked) game.input.padActive = false; try { localStorage.setItem('samcity-pad', padOpt.checked ? '1' : '0'); } catch (e) { /* no storage */ } }; padOpt.onchange = applyPad; applyPad();
const padBtn = document.getElementById('c-pad'); const padLabel = () => { padBtn.textContent = '🎮 controller: ' + (padOpt.checked ? 'on' : 'off'); }; padLabel();
padBtn.onclick = () => { padOpt.checked = !padOpt.checked; applyPad(); padLabel(); game.ui.toast(padOpt.checked ? 'Controller input on' : 'Controller input off (keyboard and mouse only)'); padBtn.blur(); };
const adultOpt = document.getElementById('opt-adult'); try { if (localStorage.getItem('samcity-adult') === '0' || params.has('clean')) adultOpt.checked = false; } catch (e) { /* no storage */ }
const applyAdult = () => { game.ui.adult = adultOpt.checked; try { localStorage.setItem('samcity-adult', adultOpt.checked ? '1' : '0'); } catch (e) { /* no storage */ } }; adultOpt.onchange = applyAdult; applyAdult();
const raidOpt = document.getElementById('opt-raids'); try { if (localStorage.getItem('samcity-raids') === '0') raidOpt.checked = false; } catch (e) { /* no storage */ }
const begin = (demo, cont) => { game.raids.enabled = raidOpt.checked && !params.has('noraids'); try { localStorage.setItem('samcity-raids', raidOpt.checked ? '1' : '0'); } catch (e) { /* no storage */ } if (demo === true) game.demo(); if (cont) game.loadSave(); game.start(); };
import { clearSave, slotInfo, setSlot, currentSlot, SLOTS } from './core/Save.js';
import { MONTHS } from './core/Clock.js';
// ---- the main menu: Continue / New Game / Load Game / Demo / Options, with three save slots ----
const $ = (id) => document.getElementById(id), menus = ['menu-main', 'menu-slots', 'menu-options', 'menu-net'];
const showMenu = (id) => { for (const m of menus) $(m).classList.toggle('hidden', m !== id); game.ui._pfScope = null; };
const describe = (n, inf) => !inf ? `Slot ${n}: empty` : !inf.ok ? `Slot ${n}: old save (can't be continued)` : `Slot ${n}: ${inf.pop} residents · ${inf.clock ? MONTHS[inf.clock.month] + ' ' + inf.clock.year : ''} · £${Math.round(inf.funds || 0).toLocaleString()}${inf.t ? ' · saved ' + new Date(inf.t).toLocaleDateString() : ''}`;
const cont = $('btn-continue');
{ let best = null; for (let n = 1; n <= SLOTS; n++) { const inf = slotInfo(n); if (inf && inf.ok && (!best || (inf.t || 0) > (best.inf.t || 0))) best = { n, inf }; }
  if (best) { cont.classList.remove('hidden'); cont.textContent = `Continue (slot ${best.n})`; cont.onclick = () => { setSlot(best.n); begin(false, true); }; } }
const newGame = (n) => { setSlot(n); clearSave(n); begin(false); game.playIntro(); };
function slotMenu(mode) {
  $('slots-title').textContent = mode === 'new' ? 'New game: pick a save slot' : 'Load game'; const list = $('slot-list'); list.innerHTML = ''; let armed = 0;
  for (let n = 1; n <= SLOTS; n++) {
    const inf = slotInfo(n), b = document.createElement('button'); b.className = 'slot'; b.dataset.slot = n; b.textContent = describe(n, inf);
    if (mode === 'load' && !(inf && inf.ok)) b.disabled = true;
    b.onclick = () => { if (mode === 'load') { setSlot(n); begin(false, true); return; } if (inf && armed !== n) { armed = n; b.textContent = `Slot ${n}: press again to start over (this save will be lost)`; return; } newGame(n); };
    list.appendChild(b);
    if (inf && mode === 'load') { const d = document.createElement('button'); d.className = 'slot del small'; d.dataset.del = n; d.textContent = '🗑 delete'; d.onclick = () => { if (d.dataset.armed) { clearSave(n); slotMenu(mode); } else { d.dataset.armed = 1; d.textContent = 'press again to delete'; } }; list.appendChild(d); }
  }
  showMenu('menu-slots');
}
$('btn-new').onclick = () => { let empty = 0; for (let n = SLOTS; n >= 1; n--) if (!slotInfo(n)) empty = n; if (empty && !cont.classList.contains('hidden')) slotMenu('new'); else if (empty) newGame(empty); else slotMenu('new'); };
$('btn-load').onclick = () => slotMenu('load');
// multiplayer: host (opens your latest town, or a new one) or join a friend's town by its code
$('btn-net').onclick = () => showMenu('menu-net');
{ const r = $('net-relay'); try { r.value = localStorage.getItem('samcity-relay') || ''; } catch (e) { /* no storage */ } const set = () => { game.net.relay = r.value; try { localStorage.setItem('samcity-relay', r.value); } catch (e) { /* no storage */ } }; r.onchange = set; set(); $('btn-net-host').addEventListener('click', set, true); $('btn-net-join').addEventListener('click', set, true); } $('btn-net-back').onclick = () => showMenu('menu-main');
$('btn-net-host').onclick = async () => { const st = $('net-status'); try { let best = null; for (let n = 1; n <= SLOTS; n++) { const inf = slotInfo(n); if (inf && inf.ok && (!best || (inf.t || 0) > (best.t || 0))) best = { n, t: inf.t }; } if (best) { setSlot(best.n); begin(false, true); } else newGame(1); const code = await game.net.host(); game.ui.toast(`Hosting! Friends join with the code ${code}`, 6000); game.messages.push('Multiplayer', `Your town is open to visitors. Code: ${code}`); } catch (e) { st.textContent = e.message; } };
$('btn-net-join').onclick = async () => { const st = $('net-status'), code = $('net-code').value.trim(); if (!code) { st.textContent = 'Type the code your friend sees on their screen.'; return; } st.textContent = 'Connecting...'; try { await game.net.join(code, $('net-name').value.trim() || 'Visitor'); game.raids.enabled = false; game.start(); game.netVisitor = true; game.clock.speed = 0; game.setMode('sim'); } catch (e) { st.textContent = e.message; } }; $('btn-slots-back').onclick = () => showMenu('menu-main');
$('btn-options').onclick = () => showMenu('menu-options'); $('btn-options-back').onclick = () => showMenu('menu-main');
// options: picture quality and volume, remembered between sessions
{ const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* no storage */ } };
  const setQ = (q) => { put('samcity-quality', q); game.lockQuality = q !== 'auto'; game.renderScale = q === 'high' ? 1 : q === 'low' ? 0.45 : (parseFloat(params.get('scale')) || 0.6); if (game.atmosphere && game.atmosphere.sun) game.atmosphere.sun.castShadow = q !== 'low'; game.resize(); for (const b of document.querySelectorAll('[data-q]')) b.classList.toggle('on', b.dataset.q === q); };
  let lost = 0; try { lost = +localStorage.getItem('samcity-ctxlost') || 0; localStorage.removeItem('samcity-ctxlost'); } catch (e) { /* no storage */ }
  for (const b of document.querySelectorAll('[data-q]')) b.onclick = () => setQ(b.dataset.q); setQ(Date.now() - lost < 3600e3 ? 'auto' : 'high');   // the best picture, unless the graphics card was reset last time (then Auto, which steps down when it's slow)   // always start on the best picture (it can be lowered in Options or the pause menu for this session)
  let vol = +get('samcity-volume', 7); const setV = (v) => { vol = Math.max(0, Math.min(10, v)); put('samcity-volume', vol); Sfx.setVolume(vol * 0.05); $('vol').textContent = vol; };
  $('vol-down').onclick = () => setV(vol - 1); $('vol-up').onclick = () => setV(vol + 1); setV(vol);
  // tick boxes become buttons too, so a controller can change them
  for (const lab of document.querySelectorAll('#menu-options label.opt')) { const inp = lab.querySelector('input'), b = document.createElement('button'); b.className = 'optbtn'; b.dataset.opt = inp.id; const txt = lab.textContent.trim(); const draw = () => { b.innerHTML = `<span>${txt}</span><i class="sw${inp.checked ? ' on' : ''}"></i>`; }; draw(); b.onclick = () => { inp.checked = !inp.checked; inp.onchange && inp.onchange(); draw(); }; inp.addEventListener('change', draw); lab.after(b); lab.classList.add('hidden'); } }
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
$('btn-demo').onclick = () => begin(true);
if (params.has('auto')) begin(params.has('demo'), params.has('cont'));
// if the game stopped responding last time (and had to be reloaded), say where it was
import { Watchdog } from './core/Watchdog.js';
Watchdog.lastFreeze().then((r) => {
  let slow = []; try { slow = JSON.parse(localStorage.getItem('samcity-slow') || '[]'); localStorage.removeItem('samcity-slow'); } catch (e) { /* no storage */ }
  const counts = {}; for (const q of slow) counts[q.k] = Math.max(counts[q.k] || 0, q.ms); const sl = Object.entries(counts).map(([k, ms]) => `${k} up to ${(ms / 1000).toFixed(1)} s`).join(', ');
  if (r && r.label) game.ui.showError(`Last time the game stopped responding (in: ${r.label.replace(/^town: /, 'town system ')}, ${new Date(r.at).toLocaleString()}).${sl ? ' Slow before that: ' + sl + '.' : ''} Tell Claude this line if it happens again.`);
  else if (sl) game.ui.showError(`Last time some frames were very slow: ${sl}. Tell Claude this line if the game stutters.`);
});   // ?auto&cont: straight back into the current save slot (the in-game Load)
// texture pack: pick the zip once, the game remembers it
{ const st = document.getElementById('tex-status'), clr = document.getElementById('btn-tex-clear'), file = document.getElementById('tex-file');
  const show = () => { st.textContent = Assets.source === 'installed' ? ' ✓ textures on' : Assets.source === 'folder' ? ' ✓ textures on (folder)' : ' (optional: pick the "PNG - Pixel Art Textures" zip)'; clr.classList.toggle('hidden', Assets.source !== 'installed'); }; show();
  const go = async (f) => { if (!f) return; st.textContent = ' unpacking… 0%'; game.skipRender = true; try { const n = await installPack(f, (d, t) => { st.textContent = ` unpacking… ${Math.round(d / t * 100)}%`; }); st.textContent = ` ✓ ${n} textures installed, restarting…`; game.save && game.started && game.save(); setTimeout(() => location.reload(), 700); } catch (e) { game.skipRender = false; st.textContent = ' ✗ ' + (e.message || 'could not read that file'); } };
  document.getElementById('btn-tex').onclick = () => file.click(); file.onchange = () => go(file.files[0]);
  clr.onclick = async () => { await clearStored(); location.reload(); };
  const title = document.getElementById('title'); title.addEventListener('dragover', (e) => e.preventDefault()); title.addEventListener('drop', (e) => { e.preventDefault(); go(e.dataTransfer.files[0]); }); }
