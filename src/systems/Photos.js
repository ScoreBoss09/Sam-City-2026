import * as THREE from 'three';
import { Sfx } from '../core/Sfx.js';
import { pick } from '../util.js';
import { MONTHS } from '../core/Clock.js';

/**
 * Sam's album. With a camera (a disposable from the newsagent, or a Polaroid off the car boot sale), meeting a celebrity
 * means a proper photo: the two of them pose, the minder takes it, there's a flash, and the star signs it across the
 * bottom. Without one, it's an autograph in the book. Everything is kept to look back on (Journal, J: Album).
 * The pictures live in this browser (IndexedDB); the save only lists them (who, when, what they wrote).
 */
const DB = 'samcity-photos', STORE = 'pics', W = 640, H = 420;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  return dbp;
}
async function put(id, data) { const d = await db(); if (!d) return false; return new Promise((res) => { try { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(data, id); tx.oncomplete = () => res(true); tx.onerror = () => res(false); } catch (e) { res(false); } }); }
async function get(id) { const d = await db(); if (!d) return null; return new Promise((res) => { try { const r = d.transaction(STORE).objectStore(STORE).get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } }); }
const SCRIPT = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive';

export class Photos {
  constructor(game) { this.game = game; this.shoot = null; this.cache = new Map(); }
  get album() { return this.game.flags.album || (this.game.flags.album = []); }
  get hasCamera() { return !!this.game.flags.camera; }
  /** Meet a celebrity: a signed photo (with a camera) or an autograph. guest: the Guests visit ({ G, s, minder }). */
  meet(v) {
    const g = this.game, P = g.player, s = v.s; if (this.shoot) return;
    if (!this.hasCamera) {   // the autograph book
      const e = { id: 'a' + Date.now().toString(36), kind: 'autograph', who: v.G.name, title: v.G.title, sign: v.G.sign, day: g.clock.totalDays }; this.album.push(e);
      s.path = []; s.faceGoal = Math.atan2(P.x - s.x, P.z - s.z); s.emote = { upper: 'thumbsup', t: 1.8 }; g.social.say(s, pick(['There you go, love.', 'Who do I make it out to? Sam? Lovely.', 'Anything for a fan!']), 2.4);
      g.ui.toast(`✍️ ${v.G.name} signs your autograph book: "${v.G.sign}". (It's in your Journal. A camera from the newsagent would get you a photo too.)`, 5000); Sfx.play('pickup'); return;
    }
    // the photo: Sam and the star side by side facing the minder, who takes it
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);   // the way Sam's looking, and his right
    const cx = P.x + fx * 3.4, cz = P.z + fz * 3.4;   // where the camera stands: in front of Sam
    s.path = []; s.frozen = true; s.x = P.x + rx * 0.85; s.z = P.z + rz * 0.85; s.heading = Math.atan2(cx - s.x, cz - s.z); s.emote = { upper: pick(['thumbsup', 'vsign', 'wave']), t: 3 };
    P.heading = Math.atan2(cx - P.x, cz - P.z); P.poseT = 1.3; P.emoteName = pick(['thumbsup', 'vsign', 'cheer']); P.emoteT = 3; P.vx = P.vz = P.speed = 0;
    const m = v.minder; if (m && !m.remove) { m.path = []; m.frozen = true; m.x = cx; m.z = cz; m.heading = Math.atan2(P.x - cx, P.z - cz); m.emote = { upper: 'phone', t: 3 }; }
    g.social.say(s, pick(['Say cheese!', 'Big smiles!', 'Get my good side, Trevor.']), 1.6);
    this.shoot = { v, t: 1.1, cam: { x: cx, z: cz }, mid: { x: (P.x + s.x) / 2, z: (P.z + s.z) / 2 } };
  }
  update(dt) {
    const sh = this.shoot; if (!sh) return; if ((sh.t -= dt) > 0) return; this.shoot = null;
    const g = this.game, v = sh.v, s = v.s, P = g.player;
    try { this.snap(v, sh); } catch (e) { console.warn('photo failed', e); g.ui.toast('The camera jammed. Typical.', 2200); }
    s.frozen = false; if (v.minder) v.minder.frozen = false; v.met = true;
  }
  /** Draw the moment from the minder's spot into a Polaroid, sign it, keep it. */
  snap(v, sh) {
    const g = this.game, P = g.player, R = g.renderer, canvas = R.domElement;
    const cam = new THREE.PerspectiveCamera(38, canvas.width / canvas.height, 0.15, 500), fy = (P.floorY || 0);
    cam.position.set(sh.cam.x, fy + 1.55, sh.cam.z); cam.lookAt(sh.mid.x, fy + 1.15, sh.mid.z); cam.updateMatrixWorld();
    const hide = []; const vis = (o, on) => { if (o && o.visible !== on) { hide.push([o, o.visible]); o.visible = on; } };
    vis(P.mesh, true); if (v.minder) vis(v.minder.mesh, false); if (g.combat.vm) vis(g.combat.vm, false); for (const q of g.population.sims) if (q.bubble) vis(q.bubble.sprite, false); if (P.bubble) vis(P.bubble.sprite, false);   // Sam in the picture (even in first person); not the minder's own head
    g.post.render(g.scene, cam);
    const out = document.createElement('canvas'); out.width = W; out.height = H; const x = out.getContext('2d');
    // a Polaroid: the picture, a white frame with a deep bottom edge, the signature across it, and the date in biro
    x.fillStyle = '#f7f4ec'; x.fillRect(0, 0, W, H);
    const pw = W - 40, ph = H - 120, sa = canvas.width / canvas.height, pa = pw / ph; let sw = canvas.width, shh = canvas.height, sx = 0, sy = 0;
    if (sa > pa) { sw = canvas.height * pa; sx = (canvas.width - sw) / 2; } else { shh = canvas.width / pa; sy = (canvas.height - shh) / 2; }
    x.drawImage(canvas, sx, sy, sw, shh, 20, 20, pw, ph);
    for (const [o, on] of hide) o.visible = on;
    x.fillStyle = 'rgba(255,240,200,0.10)'; x.fillRect(20, 20, pw, ph);   // a touch of old film
    x.save(); x.translate(W / 2, H - 58); x.rotate(-0.035); x.fillStyle = '#1b2a8a'; x.textAlign = 'center';
    let fs = 30; x.font = `${fs}px ${SCRIPT}`; while (x.measureText(v.G.sign).width > W - 70 && fs > 14) { fs -= 2; x.font = `${fs}px ${SCRIPT}`; }
    x.fillText(v.G.sign, 0, 0); x.restore();
    x.fillStyle = '#5a5a66'; x.font = '13px "Courier New", monospace'; x.textAlign = 'right'; x.fillText(`${g.clock.day} ${MONTHS[g.clock.month]} ${g.clock.year}`, W - 26, H - 18);
    x.textAlign = 'left'; x.fillText(`Sam & ${v.G.name}`, 26, H - 18);
    const data = out.toDataURL('image/jpeg', 0.86), id = 'p' + Date.now().toString(36);
    this.cache.set(id, data); put(id, data);
    this.album.push({ id, kind: 'photo', who: v.G.name, title: v.G.title, sign: v.G.sign, day: g.clock.totalDays });
    Sfx.play('shutter'); const fl = document.getElementById('flash'); if (fl) { fl.style.transition = 'none'; fl.style.opacity = '0.9'; requestAnimationFrame(() => { fl.style.transition = 'opacity .5s'; fl.style.opacity = '0'; }); }
    g.particles.burst(sh.cam.x, (P.floorY || 0) + 1.6, sh.cam.z, 0xffffff, 10, 0.5, 0.3, 0.05);
    g.ui.toast(`📸 A photo with ${v.G.name}, signed "${v.G.sign}". It's in your album (Journal).`, 4500);
    g.flags.autographs = (g.flags.autographs || 0) + 1;
  }
  /** A picture by id (from memory, else the browser's store): a data URL, or null if this browser hasn't got it. */
  async image(id) { if (this.cache.has(id)) return this.cache.get(id); const d = await get(id); if (d) this.cache.set(id, d); return d; }
  /** The album, as HTML for the Journal (pictures are filled in after, as they load). */
  html() {
    const A = this.album; if (!A.length) return `<div class="jfr">Nothing yet. When somebody famous comes to town, go and say hello${this.hasCamera ? ' (you\'ve a camera now: you\'ll get a photo)' : '. Buy a camera (the newsagent sells disposables) and you\'ll get a signed photo, not just an autograph'}.</div>`;
    return `<div class="album">${A.slice().reverse().map((e) => e.kind === 'photo'
      ? `<figure class="pol" data-pid="${e.id}"><div class="ph"><span>Developing...</span></div><figcaption><b>${e.who}</b><small>${e.title} · day ${e.day}</small></figcaption></figure>`
      : `<figure class="auto"><div class="sig">${e.sign.replace(/</g, '&lt;')}</div><figcaption><b>${e.who}</b><small>Autograph · ${e.title} · day ${e.day}</small></figcaption></figure>`).join('')}</div>`;
  }
  /** Put the pictures into an album that's just been drawn. */
  async fill(root) { for (const f of root.querySelectorAll('.pol[data-pid]')) { const d = await this.image(f.dataset.pid), ph = f.querySelector('.ph'); if (!ph) continue; ph.innerHTML = d ? `<img src="${d}" alt="">` : '<span>(This photo is on another computer)</span>'; } }
}
