import { Sfx } from './core/Sfx.js';
import { Game } from './Game.js';
import { Assets } from './render/Assets.js';

const params = new URLSearchParams(location.search);
await Assets.load();
const game = new Game(document.getElementById('view'), { scale: parseFloat(params.get('scale')) || 0.6, post: params.get('post') !== '0' });
window.__game = game;
game.run();
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => Sfx.resume());
game.input.onActivity = () => Sfx.resume();
const soundOpt = document.getElementById('opt-sound'); try { if (localStorage.getItem('samcity-sound') === '0') soundOpt.checked = false; } catch (e) { /* no storage */ }
soundOpt.onchange = () => { Sfx.enabled = soundOpt.checked; try { localStorage.setItem('samcity-sound', soundOpt.checked ? '1' : '0'); } catch (e) { /* no storage */ } }; Sfx.enabled = soundOpt.checked;
const raidOpt = document.getElementById('opt-raids'); try { if (localStorage.getItem('samcity-raids') === '0') raidOpt.checked = false; } catch (e) { /* no storage */ }
const begin = (demo, cont) => { game.raids.enabled = raidOpt.checked && !params.has('noraids'); try { localStorage.setItem('samcity-raids', raidOpt.checked ? '1' : '0'); } catch (e) { /* no storage */ } if (demo === true) game.demo(); if (cont) game.loadSave(); game.start(); };
import { hasSave, clearSave } from './core/Save.js';
const cont = document.getElementById('btn-continue'); if (hasSave()) cont.classList.remove('hidden'); cont.onclick = () => begin(false, true);
document.getElementById('btn-new').onclick = () => { clearSave(); begin(false); game.ui.modalOpen = true; game.clock.speed = 0; document.getElementById('howto').classList.remove('hidden'); };
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
document.getElementById('btn-demo').onclick = () => begin(true);
if (params.has('auto')) begin(params.has('demo'));
