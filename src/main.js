import { Sfx } from './core/Sfx.js';
import { Game } from './Game.js';
import { Assets } from './render/Assets.js';
import { VERSION } from './version.js';
import { installPack, clearStored } from './core/TexturePack.js';

const params = new URLSearchParams(location.search);
document.getElementById('ver').textContent = 'version ' + VERSION;
await Assets.load();
const game = new Game(document.getElementById('view'), { scale: parseFloat(params.get('scale')) || 0.6, post: params.get('post') !== '0' });
window.__game = game;
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
import { hasSave, clearSave, saveInfo } from './core/Save.js';
const cont = document.getElementById('btn-continue'), sv = saveInfo(); if (sv && sv.ok) cont.classList.remove('hidden'); else if (sv) { cont.classList.remove('hidden'); cont.disabled = true; cont.textContent = 'Old save (smaller map): start a new game'; cont.title = 'The map and its squares got bigger, so saves from before can\'t be continued. Sorry!'; } cont.onclick = () => begin(false, true);
document.getElementById('btn-new').onclick = () => { clearSave(); begin(false); game.ui.modalOpen = true; game.clock.speed = 0; document.getElementById('howto').classList.remove('hidden'); };
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
document.getElementById('btn-demo').onclick = () => begin(true);
if (params.has('auto')) begin(params.has('demo'));
// texture pack: pick the zip once, the game remembers it
{ const st = document.getElementById('tex-status'), clr = document.getElementById('btn-tex-clear'), file = document.getElementById('tex-file');
  const show = () => { st.textContent = Assets.source === 'installed' ? ' ✓ textures on' : Assets.source === 'folder' ? ' ✓ textures on (folder)' : ' (optional: pick the "PNG - Pixel Art Textures" zip)'; clr.classList.toggle('hidden', Assets.source !== 'installed'); }; show();
  const go = async (f) => { if (!f) return; st.textContent = ' unpacking… 0%'; game.skipRender = true; try { const n = await installPack(f, (d, t) => { st.textContent = ` unpacking… ${Math.round(d / t * 100)}%`; }); st.textContent = ` ✓ ${n} textures installed, restarting…`; game.save && game.started && game.save(); setTimeout(() => location.reload(), 700); } catch (e) { game.skipRender = false; st.textContent = ' ✗ ' + (e.message || 'could not read that file'); } };
  document.getElementById('btn-tex').onclick = () => file.click(); file.onchange = () => go(file.files[0]);
  clr.onclick = async () => { await clearStored(); location.reload(); };
  const title = document.getElementById('title'); title.addEventListener('dragover', (e) => e.preventDefault()); title.addEventListener('drop', (e) => { e.preventDefault(); go(e.dataTransfer.files[0]); }); }
