import { Game } from './Game.js';

const params = new URLSearchParams(location.search);
const game = new Game(document.getElementById('view'), { scale: parseFloat(params.get('scale')) || 0.6 });
window.__game = game;
game.run();
const begin = () => { game.start(); };
document.getElementById('btn-new').onclick = begin;
if (params.has('auto')) begin();
