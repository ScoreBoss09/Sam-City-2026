import { Game } from './Game.js';

const params = new URLSearchParams(location.search);
const game = new Game(document.getElementById('view'), { scale: parseFloat(params.get('scale')) || 0.6, post: params.get('post') !== '0' });
window.__game = game;
game.run();
const begin = (demo, cont) => { if (demo === true) game.demo(); if (cont) game.loadSave(); game.start(); };
import { hasSave, clearSave } from './core/Save.js';
const cont = document.getElementById('btn-continue'); if (hasSave()) cont.classList.remove('hidden'); cont.onclick = () => begin(false, true);
document.getElementById('btn-new').onclick = () => { clearSave(); begin(false); };
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
document.getElementById('btn-demo').onclick = () => begin(true);
if (params.has('auto')) begin(params.has('demo'));
