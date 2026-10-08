import * as THREE from 'three';
import { MATERIALS } from '../data/buildings.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';

const ASKS = {
  food: ['Could you bring me {n} food? The cupboard\'s bare.', 'I\'d kill for some berries. {n}, if you can spare them.', 'My little one\'s hungry. {n} food would see us right.'],
  timber: ['I\'m fixing my fence. Could you fetch me {n} timber?', 'I need {n} timber for a shelf. My husband\'s useless at chopping.', 'Bring me {n} timber and I\'ll owe you one.'],
  stone: ['Could you fetch me {n} stone? Building a little wall for my roses.', 'I need {n} stone for a rockery. Don\'t ask.'],
};
const THANKS = ['Oh, you star! Thank you, Sam.', 'You\'re a diamond, you are.', 'Cheers, Sam! I won\'t forget this.', 'Ta very much! Here, take this for your trouble.', 'Lovely! You\'ve made my day.'];

/** Small requests from townsfolk: fetch something, get paid, make a friend. A "!" floats over anyone with a favour to ask. */
export class Favours {
  constructor(game) {
    this.game = game; this.list = []; this.timer = 40;
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ffd23f'; x.strokeStyle = '#1a2230'; x.lineWidth = 6; x.beginPath(); x.arc(32, 32, 26, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#1a2230'; x.font = 'bold 40px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 32, 34); this.tex = new THREE.CanvasTexture(c);
  }
  forSim(s) { return this.list.find((f) => f.sim === s) || null; }
  update(dt) {
    const g = this.game; this.timer -= dt;
    for (const f of this.list) if (f.sim.remove) f.dead = true; this.list = this.list.filter((f) => { if (f.dead && f.icon) f.icon.parent && f.icon.parent.remove(f.icon); return !f.dead; });
    if (this.timer <= 0) {
      this.timer = 90 + Math.random() * 120;
      const cand = g.population.residents().filter((s) => s.kind === 'resident' && !this.forSim(s) && s.age >= 16); if (this.list.length >= 3 || !cand.length || g.population.count() < 2) return;
      const s = pick(cand), mats = ['food', 'food', 'timber']; if (g.buildings.count('quarry') || g.economy.stock.stone > 0) mats.push('stone'); const mat = pick(mats), n = mat === 'food' ? 2 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 4);
      const f = { sim: s, mat, n, reward: n * (mat === 'stone' ? 12 : 8) + 10, text: pick(ASKS[mat]).replace('{n}', n) };
      f.icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthTest: false, transparent: true })); f.icon.scale.set(0.55, 0.55, 1); f.icon.position.y = 2.45; f.icon.renderOrder = 20; s.mesh.add(f.icon); this.list.push(f);
      if (g.started) g.messages.push(s.name, `Sam, could I ask a favour? Come and find me.`, '');
    }
    const t = performance.now() / 300; for (const f of this.list) if (f.icon) f.icon.position.y = 2.45 + Math.sin(t + f.sim.id) * 0.08;
  }
  /** Sam hands over what is needed (if carried). Returns the reply text. */
  complete(f) {
    const g = this.game, p = g.player, have = p.inv[f.mat] || 0;
    if (have < f.n) return `No rush, love. I need ${f.n} ${MATERIALS[f.mat].name.toLowerCase()}. You've got ${have} on you.`;
    p.invTake(f.mat, f.n); g.economy.earn(f.reward); f.sim.samRel = Math.min(100, (f.sim.samRel || 0) + 18); f.sim.moodBoost += 0.3; f.dead = true; if (f.icon && f.icon.parent) f.icon.parent.remove(f.icon);
    this.list = this.list.filter((q) => q !== f); g.flags.favours = (g.flags.favours || 0) + 1; Sfx.play('done'); g.ui.toast(`Favour done! +£${f.reward}, and ${f.sim.first} thinks the world of you.`, 3000);
    return pick(THANKS);
  }
  serialize() { return []; }
}
