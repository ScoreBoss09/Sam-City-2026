import { Game } from './Game.js';

const params = new URLSearchParams(location.search);
const game = new Game(document.getElementById('view'), { scale: parseFloat(params.get('scale')) || 0.6 });
window.__game = game;
game.run();
const begin = (demo) => { if (demo === true) game.demo(); game.start(); };
document.getElementById('btn-new').onclick = () => begin(false);
document.getElementById('btn-demo').onclick = () => begin(true);
if (params.has('auto')) begin(params.has('demo'));
