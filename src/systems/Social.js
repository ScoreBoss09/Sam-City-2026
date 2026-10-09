import * as THREE from 'three';
import { pick, angleDiff } from '../util.js';
import { A } from '../data/humour.js';

const CHAT_LINES = ['Nice weather.', 'Did you hear?', 'No way!', 'Really?', 'Lovely!', 'Busy day...', 'Cup of tea?', 'You don\'t say!', 'Ooh, go on then.', 'Mustn\'t grumble.', 'Typical!', 'Bless him.', 'Cheeky!',
  'Have you seen the new cabin?', 'My knees, honestly.', 'Same again tomorrow.', 'Blimey.', 'She never!', 'Fancy that.', 'Proper job.', 'Not bad, you?', 'Put the kettle on.', 'Mind you...', 'I said to him, I said...',
  'Shocking.', 'Smashing!', 'Champion.', 'Bit nippy.', 'Did you get any berries?', 'Lovely bit of timber, that.', 'The Lift was late again.', 'Where\'s Sam off to?', 'Quiz night?', 'Ta-ra then!', 'Sorry, sorry.', 'Who\'s got the biscuits?'];
const GREET = { cheerful: ['Morning, Sam!', 'Alright, Sam?', 'Lovely day!', 'Hiya, Sam!', 'Ey up, Sam!', 'There\'s our Sam!', 'Cooee!'], grumpy: ['Hmph.', 'Sam.', 'Oh. It\'s you.', 'What now?', 'Mm.', 'Don\'t track mud in.'], shy: ['Oh, um, hi', 'Hello...', 'Morning...', '*waves*', 'Oh! Sam.'], busy: ['Sam! Can\'t stop!', 'Hiya, bye!', 'Cheers, Sam!', 'Late, late, late!', 'Morning! Gotta dash!'] };
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

const COMPAT = { cheerful: { cheerful: 0.8, grumpy: 0.2, shy: 0.6, busy: 0.5 }, grumpy: { cheerful: 0.2, grumpy: 0.45, shy: 0.3, busy: 0.4 }, shy: { cheerful: 0.6, grumpy: 0.3, shy: 0.75, busy: 0.4 }, busy: { cheerful: 0.5, grumpy: 0.4, shy: 0.4, busy: 0.6 } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Conversations, relationships, greetings, speech bubbles and name tags. */
export class Social {
  constructor(game) { this.game = game; this.timer = 0; this.sprites = new Set(); }
  say(sim, text, dur = 2.4) {
    if (sim.bubble) { this.game.scene.remove(sim.bubble.sprite); sim.bubble.sprite.material.dispose(); }
    const sprite = makeSprite(text, 'say'); this.game.scene.add(sprite); sim.bubble = { sprite, t: dur, dur };
  }
  startChat(a, b) {
    const dur = 4 + Math.random() * 7, first = Math.random() < 0.5;
    a.chat = { partner: b, t: dur, speaker: first, turn: 1.5 + Math.random() * 2, laugh: 0 }; b.chat = { partner: a, t: dur, speaker: !first, turn: 2, laugh: 0 };
    for (const [s, o] of [[a, b], [b, a]]) { s.faceGoal = Math.atan2(o.x - s.x, o.z - s.z); s.chatCool = 40 + Math.random() * 60; }
    this.say(first ? a : b, pick(['Alright?', 'Oh, hello!', 'Fancy seeing you!']), 2);
  }
  /** Chatting builds (or damages) relationships; friends can become couples. */
  relate(a, b) {
    const comp = (COMPAT[a.trait] || {})[b.trait] ?? 0.5; let d = 3 + comp * 8 + Math.random() * 3;
    if (comp < 0.35 && Math.random() < 0.3) d = -7;
    const old = a.rel.get(b.id) || 0, nv = clamp(old + d, 0, 100); a.rel.set(b.id, nv); b.rel.set(a.id, clamp((b.rel.get(a.id) || 0) + d, 0, 100));
    const aff = Math.min(nv, b.rel.get(a.id));
    if (old < 35 && aff >= 35 && !a.partner) { this.say(a, 'Good mate!', 2); this.game.messages.push('Town', `${a.name} and ${b.name} have become friends.`); }
    if (d < 0) this.say(a, pick(['Hmph!', 'Honestly...']), 1.8);
    if (aff >= 60 && this.canDate(a, b)) this.startCouple(a, b);
  }
  canDate(a, b) {
    if (a.partner || b.partner || a.kind !== 'resident' || b.kind !== 'resident' || a.age < 18 || b.age < 18 || a.age > 68 || b.age > 68) return false;
    if (a.parents.includes(b) || b.parents.includes(a) || (a.parents.length && a.parents.some((p) => b.parents.includes(p)))) return false;
    const same = a.gender === b.gender; return same ? a.orient !== 'h' && b.orient !== 'h' : a.orient !== 'g' && b.orient !== 'g';
  }
  startCouple(a, b) {
    a.partner = b; b.partner = a; a.single = b.single = false; a.coupleDay = b.coupleDay = this.game.clock.totalDays; this.say(a, '♥', 3); this.say(b, '♥', 3);
    this.game.messages.push('Town', `${a.name} and ${b.name} are now a couple.`, 'good'); this.game.population.moveIn(a, b);
  }
  endChat(s) {
    const c = s.chat; if (!c) return; if (c.partner && c.partner.chat && s.id < c.partner.id) this.relate(s, c.partner); s.chat = null; s.moodBoost += 0.12 * (s.style.soc + 0.3); s.faceGoal = undefined;
    if (c.partner && c.partner.chat && c.partner.chat.partner === s) { c.partner.chat = null; c.partner.moodBoost += 0.12; c.partner.faceGoal = undefined; }
  }
  update(dt) {
    const g = this.game, sims = g.population.sims; this.timer -= dt;
    // conversation timers
    for (const s of sims) {
      const c = s.chat; if (!c) continue;
      if (!c.partner || c.partner.remove || !c.partner.chat) { s.chat = null; continue; }
      c.t -= dt; c.turn -= dt; c.laugh = Math.max(0, c.laugh - dt);
      if (c.turn <= 0) { c.speaker = !c.speaker; c.turn = 1.6 + Math.random() * 2.6; if (c.speaker) { if (s.partner === c.partner && Math.random() < 0.4) this.say(s, pick(['Love you', 'Darling', '♥', 'Missed you']), 2); else if (Math.random() < 0.22) { c.laugh = 1.6; c.partner.chat.laugh = 1.6; this.say(s, pick(['Ha ha!', 'Ha!', 'Good one!']), 1.8); }
        else { const adult = g.ui.adult && s.kind !== 'child' && c.partner.kind !== 'child' && Math.random() < 0.45; this.say(s, pick(adult ? A.CHAT : CHAT_LINES), 2.2); if (Math.random() < 0.2) s.emote = { upper: pick(['shrug', 'facepalm', 'think', 'point', 'clap']), t: 1.6 }; } } }
      if (c.t <= 0) this.endChat(s);
    }
    // look for new chats
    if (this.timer <= 0) {
      this.timer = 1.2;
      for (const s of sims) {
        if (s.chat || s.sleeping || (s.kind === 'security' || s.kind === 'raider' || s.down > 0 || s.activity === 'shelter') || s.chatCool > 0 || s.frozen || s.job || s.carry || s.working) continue;
        if (!['leisure', 'visit', 'home'].includes(s.activity) && !(s.activity === 'work' && s.phase === 2)) continue;
        if (Math.random() > 0.35 * s.style.soc) continue;
        for (const o of sims) {
          if (o === s || o.chat || o.sleeping || (o.kind === 'security' || o.kind === 'raider' || o.down > 0 || o.activity === 'shelter') || o.chatCool > 0 || o.frozen || o.job || o.carry || o.inside !== s.inside) continue;
          if (!['leisure', 'visit', 'home'].includes(o.activity) && !(o.activity === 'work' && o.phase === 2)) continue;
          if (Math.hypot(o.x - s.x, o.z - s.z) < 3.0 && !s.sitting && !o.sitting) { this.startChat(s, o); break; }
        }
      }
    }
    if (this.timer > 1.1) for (const s of sims) if (s.partner && s.id < s.partner.id && !s.bubble && !s.sleeping && Math.hypot(s.x - s.partner.x, s.z - s.partner.z) < 3.5 && s.inside === s.partner.inside && Math.random() < 0.08) this.say(s, '♥', 2);
    // cracks in the performance in the performance
    const stage = g.story.stage, cam = g.camera.position;
    if (stage >= 2 && this.timer > 1.1) for (const s of sims) {
      if (s.kind !== 'resident' || s.sleeping || (s.inside && s.inside !== g.buildings.playerInside) || !s.mesh.visible) continue;
      if (Math.random() < 0.0009 * (stage - 1) && !s.glanceCam) { s.glanceTarget = { x: cam.x, z: cam.z, y: cam.y + 3 }; s.glanceT = 1.1; s.glanceCam = true; setTimeout(() => (s.glanceCam = false), 20000); }
      if (stage >= 3 && Math.random() < 0.0003) { s.freezeT = 0.7; }
    }
    // greet the player
    const p = g.player;
    if (g.mode === 'sim') for (const s of sims) {
      if (s.sleeping || s.chat || s.frozen || (s.kind === 'security' || s.kind === 'raider' || s.down > 0 || s.activity === 'shelter') || s.emote) continue; if (s.inside && s.inside !== g.buildings.playerInside) continue;
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < 5 && g.clock.hour - s.greeted > 1.5 || (s.greeted > g.clock.hour + 5)) {
        s.greeted = g.clock.hour;
        const t = s.trait; s.emote = { upper: t === 'cheerful' ? 'wave' : (t === 'grumpy' ? (g.ui.adult && s.kind !== 'child' && Math.random() < 0.2 ? 'vsign' : 'idle') : 'nod'), t: 1.9 };
        s.glanceTarget = { x: p.x, z: p.z, y: 1.6 }; s.glanceT = 2.5; this.say(s, pick(g.ui.adult && s.kind !== 'child' && Math.random() < 0.4 ? A.SOCIAL_GREET[t] || A.SOCIAL_GREET.cheerful : GREET[t] || GREET.cheerful), 2.2);
      }
    }
  }
  skyReaction() {}
  render(dt) {
    const g = this.game, cam = g.camera.position, godFar = g.mode === 'god' && g.god.dist > 85, p = g.player;
    for (const s of g.population.sims) {
      const b = s.bubble; const vis = !s.mesh.visible || godFar;
      if (b) {
        b.t -= dt; if (b.t <= 0 || vis || s.remove) { g.scene.remove(b.sprite); b.sprite.material.dispose(); s.bubble = null; }
        else { const sc = Math.min(1, b.t * 4, (b.dur - b.t) * 6 + 0.2); b.sprite.position.set(s.x, 2.55 + (s.sitting ? -0.35 : 0), s.z); b.sprite.scale.set(3 * sc, 1 * sc, 1); }
      }
      // name tags near Sam
      const near = g.mode === 'sim' && s.mesh.visible && Math.hypot(p.x - s.x, p.z - s.z) < 5.5 && !s.bubble && !s.sleeping;
      if (near && !s.tag) { s.tag = makeSprite(s.name, 'name'); s.tag.scale.set(2.4, 0.8, 1); g.scene.add(s.tag); }
      if (s.tag) { if (near) s.tag.position.set(s.x, 2.4 + (s.sitting ? -0.35 : 0), s.z); if (!near || s.remove) { g.scene.remove(s.tag); s.tag = null; } }
    }
  }
}
