import * as THREE from 'three';
import { pick, angleDiff } from '../util.js';

const CHAT_LINES = ['Hi!', 'Nice day', 'Ha ha!', 'Really?', 'Hmm...', 'Oh no', 'Lunch?', 'Did you hear?', 'No way!', 'Same here', 'Ha!', 'Right?', 'Well...', 'Good one'];
const GREET = { cheerful: ['Hi Sam!', 'Morning!', 'Hey Sam!'], grumpy: ['Hmph.', '...', 'Sam.'], shy: ['H-hi', 'Oh, hi...', '...hi'], busy: ['Hey!', 'Hi, bye!', 'Sam!'] };
const texCache = {};
function bubbleTexture(text, kind) {
  const k = text + kind; if (texCache[k]) return texCache[k];
  const c = document.createElement('canvas'); c.width = 192; c.height = 64; const x = c.getContext('2d');
  x.font = 'bold 22px monospace'; const w = Math.min(184, x.measureText(text).width + 22);
  x.fillStyle = kind === 'name' ? 'rgba(14,26,43,.85)' : '#fffdf4'; x.strokeStyle = '#1a2230'; x.lineWidth = 3;
  const bx = (192 - w) / 2, by = 6, bh = 36; x.beginPath(); x.roundRect(bx, by, w, bh, 8); x.fill(); if (kind !== 'name') { x.stroke(); x.beginPath(); x.moveTo(90, by + bh); x.lineTo(98, by + bh + 12); x.lineTo(104, by + bh); x.closePath(); x.fillStyle = '#fffdf4'; x.fill(); }
  x.fillStyle = kind === 'name' ? '#fff' : '#1a2230'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 96, by + bh / 2 + 1, 176);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; return (texCache[k] = t);
}
function makeSprite(text, kind) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(text, kind), transparent: true, depthWrite: false })); s.scale.set(3.0, 1.0, 1); s.renderOrder = 10; return s; }

/** Conversations, greetings, speech bubbles and name tags. */
export class Social {
  constructor(game) { this.game = game; this.timer = 0; this.sprites = new Set(); }
  say(sim, text, dur = 2.4) {
    if (sim.bubble) { this.game.scene.remove(sim.bubble.sprite); }
    const sprite = makeSprite(text, 'say'); this.game.scene.add(sprite); sim.bubble = { sprite, t: dur, dur };
  }
  startChat(a, b) {
    const dur = 9 + Math.random() * 18, first = Math.random() < 0.5;
    a.chat = { partner: b, t: dur, speaker: first, turn: 1.5 + Math.random() * 2, laugh: 0 }; b.chat = { partner: a, t: dur, speaker: !first, turn: 2, laugh: 0 };
    for (const [s, o] of [[a, b], [b, a]]) { s.faceGoal = Math.atan2(o.x - s.x, o.z - s.z); s.chatCool = 40 + Math.random() * 60; }
    this.say(first ? a : b, pick(['Hi!', 'Hey you!', 'Oh, hello!']), 2);
  }
  endChat(s) {
    const c = s.chat; if (!c) return; s.chat = null; s.moodBoost += 0.12 * (s.style.soc + 0.3); s.faceGoal = undefined;
    if (c.partner && c.partner.chat && c.partner.chat.partner === s) { c.partner.chat = null; c.partner.moodBoost += 0.12; c.partner.faceGoal = undefined; }
  }
  update(dt) {
    const g = this.game, sims = g.population.sims; this.timer -= dt;
    // conversation timers
    for (const s of sims) {
      const c = s.chat; if (!c) continue;
      if (!c.partner || c.partner.remove || !c.partner.chat) { s.chat = null; continue; }
      c.t -= dt; c.turn -= dt; c.laugh = Math.max(0, c.laugh - dt);
      if (c.turn <= 0) { c.speaker = !c.speaker; c.turn = 1.6 + Math.random() * 2.6; if (c.speaker) { if (Math.random() < 0.22) { c.laugh = 1.6; c.partner.chat.laugh = 1.6; this.say(s, pick(['Ha ha!', 'Ha!', 'Good one']), 1.8); } else this.say(s, pick(CHAT_LINES), 2.2); } }
      if (c.t <= 0) this.endChat(s);
    }
    // look for new chats
    if (this.timer <= 0) {
      this.timer = 1.2;
      for (const s of sims) {
        if (s.chat || s.sleeping || s.kind === 'security' || s.chatCool > 0 || s.frozen || s.job || s.carry || s.working) continue;
        if (!['leisure', 'visit', 'home'].includes(s.activity) && !(s.activity === 'work' && s.phase === 2)) continue;
        if (Math.random() > 0.35 * s.style.soc) continue;
        for (const o of sims) {
          if (o === s || o.chat || o.sleeping || o.kind === 'security' || o.chatCool > 0 || o.frozen || o.job || o.carry || o.inside !== s.inside) continue;
          if (!['leisure', 'visit', 'home'].includes(o.activity) && !(o.activity === 'work' && o.phase === 2)) continue;
          if (Math.hypot(o.x - s.x, o.z - s.z) < 3.0 && !s.sitting && !o.sitting) { this.startChat(s, o); break; }
        }
      }
    }
    // Truman-style cracks in the performance
    const stage = g.story.stage, cam = g.camera.position;
    if (stage >= 2 && this.timer > 1.1) for (const s of sims) {
      if (s.kind !== 'resident' || s.sleeping || (s.inside && s.inside !== g.buildings.playerInside) || !s.mesh.visible) continue;
      if (Math.random() < 0.0035 * (stage - 1) && !s.glanceCam) { s.glanceTarget = { x: cam.x, z: cam.z, y: cam.y + 3 }; s.glanceT = 1.1; s.glanceCam = true; setTimeout(() => (s.glanceCam = false), 20000); }
      if (stage >= 3 && Math.random() < 0.0012) { s.freezeT = 0.9; this.say(s, '...', 1.2); }
    }
    // greet the player
    const p = g.player;
    if (g.mode === 'sim') for (const s of sims) {
      if (s.sleeping || s.chat || s.frozen || s.kind === 'security' || s.emote) continue; if (s.inside && s.inside !== g.buildings.playerInside) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < 5 && g.clock.hour - s.greeted > 1.5 || (s.greeted > g.clock.hour + 5)) {
        s.greeted = g.clock.hour;
        const t = s.trait; s.emote = { upper: t === 'cheerful' ? 'wave' : (t === 'grumpy' ? 'idle' : 'nod'), t: 1.9 };
        s.glanceTarget = { x: p.x, z: p.z, y: 1.6 }; s.glanceT = 2.5; this.say(s, pick(GREET[t] || GREET.cheerful), 2.2);
      }
    }
  }
  /** Everyone looks up when the dome is revealed, then pretends nothing happened. */
  skyReaction() {
    for (const s of this.game.population.sims) {
      if (s.kind !== 'resident' || s.sleeping || (s.inside && !s.inside.def.open)) continue;
      s.anim.fid = 'lookup'; s.anim.fidT = 0; s.anim.fidDur = 3.2; s.glanceTarget = { x: s.x, z: s.z, y: 40 }; s.glanceT = 3;
      setTimeout(() => { if (!s.remove) this.say(s, pick(['Nothing to see!', 'Lovely day!', 'What sky?', 'Back to it...']), 2.4); }, 3200 + Math.random() * 1500);
    }
  }
  render(dt) {
    const g = this.game, cam = g.camera.position, godFar = g.mode === 'god' && g.god.dist > 85, p = g.player;
    for (const s of g.population.sims) {
      const b = s.bubble; const vis = !s.mesh.visible || godFar;
      if (b) {
        b.t -= dt; if (b.t <= 0 || vis || s.remove) { g.scene.remove(b.sprite); s.bubble = null; }
        else { const sc = Math.min(1, b.t * 4, (b.dur - b.t) * 6 + 0.2); b.sprite.position.set(s.x, 2.55 + (s.sitting ? -0.35 : 0), s.z); b.sprite.scale.set(3 * sc, 1 * sc, 1); }
      }
      // name tags near Sam
      const near = g.mode === 'sim' && s.mesh.visible && Math.hypot(p.x - s.x, p.z - s.z) < 5.5 && !s.bubble && !s.sleeping;
      if (near && !s.tag) { s.tag = makeSprite(s.name, 'name'); s.tag.scale.set(2.4, 0.8, 1); g.scene.add(s.tag); }
      if (s.tag) { if (near) s.tag.position.set(s.x, 2.4 + (s.sitting ? -0.35 : 0), s.z); if (!near || s.remove) { g.scene.remove(s.tag); s.tag = null; } }
    }
  }
}
