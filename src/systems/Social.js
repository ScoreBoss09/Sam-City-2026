import * as THREE from 'three';
import { pick, angleDiff } from '../util.js';
import { A } from '../data/humour.js';

const CHAT_LINES = ['Nice weather.', 'Did you hear?', 'No way!', 'Really?', 'Lovely!', 'Busy day...', 'Cup of tea?', 'You don\'t say!', 'Ooh, go on then.', 'Mustn\'t grumble.', 'Typical!', 'Bless him.', 'Cheeky!',
  'Have you seen the new cabin?', 'My knees, honestly.', 'Same again tomorrow.', 'Blimey.', 'She never!', 'Fancy that.', 'Proper job.', 'Not bad, you?', 'Put the kettle on.', 'Mind you...', 'I said to him, I said...',
  'Shocking.', 'Smashing!', 'Champion.', 'Bit nippy.', 'Did you get any berries?', 'Lovely bit of timber, that.', 'The Lift was late again.', 'Where\'s Sam off to?', 'Quiz night?', 'Ta-ra then!', 'Sorry, sorry.', 'Who\'s got the biscuits?'];
const GREET = { cheerful: ['Morning, Sam!', 'Alright, Sam?', 'Lovely day!', 'Hiya, Sam!', 'Ey up, Sam!', 'There\'s our Sam!', 'Cooee!'], grumpy: ['Hmph.', 'Sam.', 'Oh. It\'s you.', 'What now?', 'Mm.', 'Don\'t track mud in.'], shy: ['Oh, um, hi', 'Hello...', 'Morning...', '*waves*', 'Oh! Sam.'], busy: ['Sam! Can\'t stop!', 'Hiya, bye!', 'Cheers, Sam!', 'Late, late, late!', 'Morning! Gotta dash!'] };
const texCache = new Map(), TEX_MAX = 160;   // the most recent bubbles and name tags; older pictures are freed (every drunken slur used to be kept forever)
/** A speech bubble (or name tag) picture. Long lines wrap onto up to four lines, and the type only gets smaller when it must,
 *  so nothing is squashed; the texture remembers its size in world units (userData.w / .h) for the sprite. */
function bubbleTexture(text, kind) {
  const k = text + kind, hit = texCache.get(k); if (hit) { texCache.delete(k); texCache.set(k, hit); return hit; }
  if (texCache.size >= TEX_MAX) { const [old, t] = texCache.entries().next().value; texCache.delete(old); t.dispose(); }
  const c = document.createElement('canvas'), x = c.getContext('2d'), maxW = 300, PX = 3 / 192; let size = 22, lines = [text];
  const F = (sz) => `600 ${sz}px Barlow, 'Segoe UI', sans-serif`, wrap = (sz) => { x.font = F(sz); const out = []; let cur = ''; for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
  if (kind !== 'name') for (size = 22; size >= 12; size -= 2) { lines = wrap(size); if (lines.length <= (size > 16 ? 3 : 4) && lines.every((l) => x.measureText(l).width <= maxW)) break; }
  x.font = F(size); const lh = size * 1.18, tw = Math.max(...lines.map((l) => x.measureText(l).width)), bw = Math.min(maxW + 16, tw + 22), bh = lines.length * lh + 14, tail = kind === 'name' ? 0 : 12;
  c.width = Math.max(192, Math.ceil(bw + 8)); c.height = Math.ceil(bh + tail + 10); x.font = F(size);
  x.fillStyle = kind === 'name' ? 'rgba(10,15,25,.82)' : '#fffdf6'; x.strokeStyle = 'rgba(20,26,38,.85)'; x.lineWidth = 2.5;
  const bx = (c.width - bw) / 2, by = 4, mid = c.width / 2; x.beginPath(); x.roundRect(bx, by, bw, bh, kind === 'name' ? bh / 2 : 14); x.fill(); if (kind !== 'name') { x.stroke(); x.beginPath(); x.moveTo(mid - 6, by + bh); x.lineTo(mid + 2, by + bh + tail); x.lineTo(mid + 8, by + bh); x.closePath(); x.fillStyle = '#fffdf4'; x.fill(); }
  x.fillStyle = kind === 'name' ? '#fff' : '#1a2230'; x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach((l, i) => x.fillText(l, mid, by + 7 + lh * (i + 0.5)));
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.userData = { w: c.width * PX, h: c.height * PX }; texCache.set(k, t); return t;
}
/** Up close a bubble keeps the size it has from 6 m away (so it never fills the screen), and right in your face it's hidden. */
function closeK(p, cam) { const d = Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z); return d < 1.3 ? 0 : Math.min(1, d / 6); }
function makeSprite(text, kind) { const m = bubbleTexture(text, kind), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: m, transparent: true, depthWrite: false })); s.scale.set(m.userData.w, m.userData.h, 1); s.userData.size = m.userData; s.renderOrder = 10; return s; }

const COMPAT = { cheerful: { cheerful: 0.8, grumpy: 0.2, shy: 0.6, busy: 0.5 }, grumpy: { cheerful: 0.2, grumpy: 0.45, shy: 0.3, busy: 0.4 }, shy: { cheerful: 0.6, grumpy: 0.3, shy: 0.75, busy: 0.4 }, busy: { cheerful: 0.5, grumpy: 0.4, shy: 0.4, busy: 0.6 } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Conversations, relationships, greetings, speech bubbles and name tags. */
// regional tics, added now and then to the end of what people say
const TICS = { north: [', love', ', our kid', ', pet'], cockney: [', innit', ', guv', ', me old china', ', mate'], brummie: [', bab', ', our kid'], west: [', my lover', ', my ansum', ', me dear'],
  scouse: [', la', ', lad', ', calm down'], geordie: [', pet', ', man', ', like'], posh: [', darling', ', old thing', ', what?'], yorks: [', lad', ', love', ', tha knows'] };
export class Social {
  constructor(game) { this.game = game; this.timer = 0; this.sprites = new Set(); }
  say(sim, text, dur = 2.4) {
    if (sim.bubble) { this.game.scene.remove(sim.bubble.sprite); sim.bubble.sprite.material.dispose(); }
    if (typeof text === 'string' && sim.look) { if (sim.look.gender === 'f') text = text.replace(/\b(the|my) wife\b/gi, '$1 husband').replace(/\bmy missus\b/gi, 'my fella'); else text = text.replace(/\b(the|my) husband\b/gi, '$1 wife'); }   // the right other half for the speaker
    const tl = sim.look && TICS[sim.look.dialect]; if (tl && typeof text === 'string' && text.length < 90 && /[a-z][.!?]$/.test(text) && Math.random() < 0.2) text = text.slice(0, -1) + pick(tl) + text.slice(-1);
    if (sim.drunk > 0.55 && typeof text === 'string') text = text.replace(/s(?=[aeiou ])/g, (m) => Math.random() < 0.6 ? 'sh' : m).replace(/\.$/, Math.random() < 0.4 ? '... *hic*' : '.');   // slurring
    const sprite = makeSprite(text, 'say'); this.game.scene.add(sprite); sim.bubble = { sprite, t: dur, dur };
  }
  startChat(a, b) {
    const dur = 4 + Math.random() * 7, first = Math.random() < 0.5;
    a.chat = { partner: b, t: dur, speaker: first, turn: 1.5 + Math.random() * 2, laugh: 0 }; b.chat = { partner: a, t: dur, speaker: !first, turn: 2, laugh: 0 };
    for (const [s, o] of [[a, b], [b, a]]) { s.faceGoal = Math.atan2(o.x - s.x, o.z - s.z); s.chatCool = 40 + Math.random() * 60; }
    this.say(first ? a : b, pick(['Alright?', 'Oh, hello!', 'Fancy seeing you!']), 2);
  }
  /** Standing in or right in front of a doorway, where a chat would block everyone. */
  inDoorway(s) { for (const b of this.game.buildings.list) { const d = b.doorPos || b.doorOut; if (d && Math.abs(d.x - s.x) < 2.2 && Math.abs(d.z - s.z) < 2.2) return true; } return false; }
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
        else { const adult = g.ui.adult && s.kind !== 'child' && c.partner.kind !== 'child' && Math.random() < 0.45; { const L = (adult ? A.CHAT : CHAT_LINES).filter((t) => g.talk.ok(t)); this.say(s, pick(L.length ? L : CHAT_LINES), 2.2); } if (Math.random() < 0.2) s.emote = { upper: pick(['shrug', 'facepalm', 'think', 'point', 'clap']), t: 1.6 }; } } }
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
          if (Math.hypot(o.x - s.x, o.z - s.z) < 3.0 && !s.sitting && !o.sitting && !s.path.length && !o.path.length && !this.inDoorway(s) && !this.inDoorway(o)) { this.startChat(s, o); break; }
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
    // only the few nearest speakers show their bubble (a crowd all talking at once is just noise); none but the one Sam's talking to during a chat
    const talk = g.ui.dialogue && g.ui.dialogue.sim, near = g.population.sims.filter((s) => s.bubble && !s.remove && (!talk || s === talk)).map((s) => [s, (s.x - cam.x) ** 2 + (s.z - cam.z) ** 2]).filter(([, d]) => g.mode === 'god' || d < 900).sort((a, b) => a[1] - b[1]).slice(0, g.mode === 'god' ? 6 : 3), shown = new Set(near.map(([s]) => s));
    const noTags = (g.combat && g.combat.on) || p.aiming;   // no name tags over the sights
    for (const s of g.population.sims) {
      const b = s.bubble; const vis = !s.mesh.visible || godFar;
      if (b) {
        b.t -= dt; if (b.t <= 0 || vis || s.remove) { g.scene.remove(b.sprite); b.sprite.material.dispose(); s.bubble = null; }
        else { const z = b.sprite.userData.size || { w: 3, h: 1 }; b.sprite.position.set(s.x, 2.55 + (s.sitting ? -0.35 : 0) + (z.h - 1) / 2, s.z); const sc = Math.min(1, b.t * 4, (b.dur - b.t) * 6 + 0.2) * closeK(b.sprite.position, cam); b.sprite.visible = sc > 0 && shown.has(s); b.sprite.scale.set(z.w * sc, z.h * sc, 1); }
      }
      // name tags near Sam
      const near = g.mode === 'sim' && !noTags && s.mesh.visible && Math.hypot(p.x - s.x, p.z - s.z) < 5.5 && !s.bubble && !s.sleeping;
      if (near && !s.tag) { s.tag = makeSprite(s.name, 'name'); s.tag.scale.set(s.tag.userData.size.w * 0.8, s.tag.userData.size.h * 0.8, 1); g.scene.add(s.tag); }
      if (s.tag) { if (near) { s.tag.position.set(s.x, 2.4 + (s.sitting ? -0.35 : 0), s.z); const k = 0.8 * closeK(s.tag.position, cam), z = s.tag.userData.size; s.tag.visible = k > 0; s.tag.scale.set(z.w * k, z.h * k, 1); } if (!near || s.remove) { g.scene.remove(s.tag); s.tag.material.dispose(); s.tag = null; } }
    }
  }
}
