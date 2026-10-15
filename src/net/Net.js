import * as THREE from 'three';
import * as SaveGame from '../core/Save.js';
import { createRig } from '../render/SimRig.js';
import { Animator } from '../render/Animator.js';
import { pick } from '../util.js';
import { Sfx } from '../core/Sfx.js';
import { SHOP_GOODS, GENERIC_GOODS } from '../data/shopgoods.js';
import { WIN_KILLS, WEAPONS } from '../systems/Combat.js';
import { TOOLS } from '../player/Player.js';
import { MAP } from '../config.js';
import { MATERIALS } from '../data/buildings.js';

/**
 * Multiplayer (see docs/MULTIPLAYER.md). The host's game is the town: it simulates everything and sends visitors a
 * snapshot ten times a second (townsfolk, Sam, the other visitors, the time and the weather) plus building changes.
 * A visitor's game shows that town, moves its own character locally and sends where it is. Visitors help but don't
 * decide: they hammer at building sites, gather into their backpacks, deliver to sites, dig paths and put things in the
 * Stockyard (all done in the host's town, which sends back site progress, roads, trees and stock twice a second); the
 * planning desks, the post and the Lift intercom say access denied, and there's no planning view or town money.
 * They can walk, run, ride, punch, kick and shoot (GTA-style), and so can Sam back.
 * Transport: by default a direct browser-to-browser link (WebRTC through PeerJS, vendor/peerjs.min.js): the host
 * registers 'samcity-<CODE>' with the free PeerJS matchmaker and visitors connect to it by the code alone - no IP
 * addresses, ports or servers, and it works between houses on different networks (PeerJS's relay steps in when a
 * router won't allow a direct link). The host's browser plays the relay's part (netrelay.js) for its visitors.
 * Typing a Relay address instead uses a WebSocket to relay-server.js / serve.js as before.
 */
/** What a puppet of this player should be doing (ANIM index), and whether it's holding / aiming a gun. */
const animCode = (P) => (P.dead || P.down > 0 || P.sedated > 0 ? 4 : P.mounted ? 5 : P.speed > 3.2 ? 2 : P.speed > 0.3 ? 1 : 0);
const gunFlags = (P) => (P.gun ? 1 : 0) | (P.aiming ? 2 : 0) | (P.stance === 'crouch' || P.slideT > 0 ? 4 : 0) | (P.stance === 'prone' ? 8 : 0) | gunKind(P.gun);
const gunKind = (k) => { const W = WEAPONS[k]; return !W ? 0 : W.rocket ? 32 : W.slot === 0 ? 16 : 0; };
const gunProp = (f) => (f & 32 ? 'tube' : f & 16 ? 'rifle' : 'pistol');
let peerLib = null;
/** Load PeerJS (vendor/peerjs.min.js) the first time multiplayer is used. */
function loadPeer() {
  if (window.Peer) return Promise.resolve(); if (peerLib) return peerLib;
  return (peerLib = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'vendor/peerjs.min.js'; sc.onload = res; sc.onerror = () => { peerLib = null; rej(new Error('Could not load the multiplayer library (vendor/peerjs.min.js).')); }; document.head.appendChild(sc); }));
}
const ANIM = ['stand', 'walk', 'walk', 'sit', 'lie', 'ride'];
/** What someone's arms are doing while they work (sent with where they are, so everyone sees the hammering). */
const WORK_POSES = ['', 'hammer', 'chop', 'mine', 'dig', 'harvest', 'fish', 'point'];
const workCode = (P) => { const t = P.working && P.target; if (!t) return 0; const u = t.kind === 'site' ? 'hammer' : t.kind === 'road' ? 'dig' : t.kind === 'douse' ? 'point' : t.kind === 'gather' ? t.upper : ''; return Math.max(0, WORK_POSES.indexOf(u)); };
const keyOf = (b) => b.id + '@' + b.x0 + ',' + b.z0;
const VISITOR_LOOKS = [0x2a7ab0, 0x3a9a54, 0x8a3ab0, 0xd8342c, 0xf2c94c, 0x16a085, 0xe07fa0];

export class Net {
  constructor(game) { this.game = game; this.role = null; this.ws = null; this.code = null; this.puppets = new Map(); this.sendT = 0; this.bsig = new Map(); this.announced = new Set(); this.visitors = new Map(); }
  /** The relay: this computer's game server, or (for internet play) an address typed in the Multiplayer menu. */
  get url() { const r = (this.relay || '').trim(); if (/^wss?:\/\//.test(r)) return r; if (r) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + r.replace(/\/$/, '') + '/net'; return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/net'; }
  open(code, role, name) { return (this.relay || '').trim() ? this.openWs(code, role, name) : this.openPeer(code, role, name); }
  /** Code-only internet play: PeerJS. The host keeps the visitors' links (ids 1, 2...); 'to' picks one, else everyone. */
  async openPeer(code, role, name) {
    await loadPeer(); const P = window.Peer, ID = (c) => 'samcity-' + c.toLowerCase();
    return new Promise((resolve, reject) => {
      let done = false; const fail = (msg) => { if (!done) { done = true; clearTimeout(tm); try { peer.destroy(); } catch (e) { /* gone */ } reject(new Error(msg)); } };
      const ok = (m) => { if (!done) { done = true; clearTimeout(tm); this.id = m.id; this.code = code; this.role = role; resolve(m); } };
      const opt = window.SAMCITY_PEER, peer = role === 'host' ? new P(ID(code), opt) : new P(opt), tm = setTimeout(() => fail(role === 'host' ? 'Could not reach the matchmaking service. Are you online?' : "Couldn't reach your friend's game. Check the code, and that they're still hosting."), 25000);
      this.peer = peer; this.links = role === 'host' ? new Map() : null;
      peer.on('error', (e) => {
        const t = e && e.type;
        if (t === 'unavailable-id') fail('CODE_TAKEN');
        else if (t === 'peer-unavailable') fail('No game with that code. Check it with your friend (it changes each time they host).');
        else if (t === 'browser-incompatible') fail('This browser cannot do multiplayer. Try Chrome, Edge or Firefox.');
        else if (!done) fail('Could not connect: ' + ((e && e.message) || t || 'network trouble') + '. Are you online?');
      });
      if (role === 'host') {
        let next = 1;
        peer.on('open', () => ok({ id: 0, code }));
        peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* keep the links we have */ } });   // lost the matchmaker: visitors already here stay
        peer.on('connection', (conn) => {
          const id = next++;
          conn.on('data', (d) => {
            let m; try { m = typeof d === 'string' ? JSON.parse(d) : d; } catch (e) { return; }
            if (m.t === 'join') { if (this.links.size >= 7) { conn.send(JSON.stringify({ t: 'error', msg: 'That town is full.' })); setTimeout(() => conn.close(), 500); return; } this.links.set(id, conn); conn.send(JSON.stringify({ t: 'joined', id, code })); this.onMessage({ t: 'peer', id, name: String(m.name || 'Visitor').slice(0, 20) }); return; }
            if (!this.links.has(id)) return; m.from = id; this.onMessage(m);
          });
          conn.on('close', () => { if (this.links.delete(id)) this.onMessage({ t: 'left', id }); });
        });
      } else {
        peer.on('open', () => {
          const conn = peer.connect(ID(code), { reliable: true }); this.link = conn;
          conn.on('open', () => conn.send(JSON.stringify({ t: 'join', name })));
          conn.on('data', (d) => { let m; try { m = typeof d === 'string' ? JSON.parse(d) : d; } catch (e) { return; } if (m.t === 'joined') ok(m); else if (m.t === 'error') fail(m.msg); else this.onMessage(m); });
          conn.on('close', () => { if (this.role) this.lost(); });
        });
      }
    });
  }
  openWs(code, role, name) {
    return new Promise((resolve, reject) => {
      let ws; try { ws = new WebSocket(this.url); } catch (e) { reject(new Error('Multiplayer needs the game running from serve.js (play.bat / play.sh).')); return; }
      this.ws = ws; ws.onopen = () => ws.send(JSON.stringify({ t: 'join', code, role, name }));
      ws.onerror = () => reject(new Error(this.relay ? `Could not reach the relay at ${this.relay}. Is relay-server.js running there, and is the port open?` : 'Could not reach the multiplayer relay. Start the game with play-multiplayer.bat / .sh (needs Node.js), or type a Relay address.'));
      ws.onclose = () => { if (this.role) this.lost(); };
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } if (m.t === 'joined') { this.id = m.id; this.code = m.code; this.role = role; resolve(m); } else if (m.t === 'error') reject(new Error(m.msg)); else this.onMessage(m); };
    });
  }
  send(m) {
    if (this.links) { const txt = JSON.stringify(m); if (m.to) { const c = this.links.get(m.to); if (c && c.open) c.send(txt); } else for (const c of this.links.values()) if (c.open) c.send(txt); return; }
    if (this.link) { if (this.link.open) this.link.send(JSON.stringify(m)); return; }
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
  }
  lost() { const g = this.game, was = this.role; this.role = null; if (was === 'visitor') { g.ui.toast('The host has gone. Back to the title screen...', 3000); setTimeout(() => location.reload(), 3000); } else g.ui.toast('Multiplayer connection lost.', 3000); }

  // ---------- hosting ----------
  async host() {
    let code;
    for (let tries = 0; ; tries++) {   // a fresh code each time; try another if somebody else has it
      code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
      try { await this.open(code, 'host'); break; } catch (e) { if (e.message !== 'CODE_TAKEN' || tries > 4) throw e; }
    } for (const b of this.game.buildings.list) this.bsig.set(b.id + '@' + b.x0 + ',' + b.z0, b.state); this.badge(); this.hookAttack(); return code;
  }
  /** A visitor arrived: send them the town as it is now (a save game) and everyone's looks. */
  welcome(id, name) {
    const g = this.game, d = SaveGame.serialize(g), looks = g.population.sims.filter((s) => !s.remove).map((s) => [s.id, s.look]);
    this.send({ t: 'world', to: id, d, looks, you: id, col: VISITOR_LOOKS[id % VISITOR_LOOKS.length] });
    if (g.combat.on) { g.combat.score.set('v' + id, g.combat.score.get('v' + id) || 0); setTimeout(() => { this.send({ t: 'dm', on: true, to: id }); g.combat.board(); }, 1500); }
    for (const s of g.population.sims) this.announced.add(s.id);
    this.visitors.set(id, { id, name: name || 'Visitor ' + id, x: g.lift.doorOut.x, z: g.lift.doorOut.z, y: 0, h: 0, a: 0 });
    this.puppet('v' + id, { shirt: VISITOR_LOOKS[id % VISITOR_LOOKS.length], hat: { type: 'cap', color: VISITOR_LOOKS[id % VISITOR_LOOKS.length] } }, name);
    g.messages.push('Lift', `${name || 'A visitor'} has come down the Lift to visit your town.`, 'good'); g.ui.toast(`👋 ${name || 'A visitor'} has joined (${this.visitors.size} visiting)`, 2600); this.badge();
  }
  hostTick() {
    const g = this.game, P = g.player, q = (v) => Math.round(v * 10);
    // townsfolk: id, x, z, y, heading, animation (visible ones only)
    const sims = [], looks = [];
    for (const s of g.population.sims) { if (s.remove) continue; if (!this.announced.has(s.id)) { this.announced.add(s.id); looks.push([s.id, s.look]); }
      // indoors still counts (visitors may walk in)
      const hid = !!s.hidden || (s.pose === 'sleep' && s.bedSpot && s.bedSpot.upstairs); const a = hid ? 6 : s.pose === 'sleep' || s.down > 0 ? 4 : s.sitting || (s.trip && s.trip.stage === 'ride') ? 3 : s.riding && s.vehLv >= 0 ? 5 : s.vel > 3.6 ? 2 : s.vel > 0.3 ? 1 : 0;
      sims.push([s.id, q(s.x), q(s.z), q(s.rideY || 0), Math.round(s.heading * 100), a]); }
    const vis = [...this.visitors.values()].map((v) => [v.id, q(v.x), q(v.z), q(v.y), Math.round(v.h * 100), v.a, v.name, v.f || 0, v.w || 0]);
    const c = g.clock; const bots = g.combat.on ? g.combat.bots.map((b) => [b.key, q(b.x), q(b.z), q(b.y), Math.round(b.h * 100), b.alive ? (Math.hypot(b.vx || 0, b.vz || 0) > 3.2 ? 2 : Math.hypot(b.vx || 0, b.vz || 0) > 0.3 ? 1 : 0) : 4, (b.alive ? 1 : 0) | (b.target ? 2 : 0) | (b.stance === 'crouch' ? 4 : 0) | (b.stance === 'prone' ? 8 : 0) | gunKind(b.gun), b.name, b.rig.look.shirt, b.rig.look.pants]) : [];
    this.send({ t: 'snap', bots, sims, looks, sam: [q(P.x), q(P.z), q((P.floorY || 0) + (P.jumpY || 0)), Math.round(P.heading * 100), animCode(P), gunFlags(P), workCode(P)], vis, clock: [c.hour, c.day, c.month, c.year, c.totalDays], rain: g.weather ? g.weather.rain : 0, lines: Object.values(g.transport.lines).filter(Boolean).map((L) => [L.kind, +L.s.toFixed(2), L.dir, +L.wait.toFixed(2), L.atStop ?? -1]), tt: +g.transport.t.toFixed(2), stats: (this.statT = (this.statT || 0) + 1) % 10 === 1 ? { pop: g.population.count(), funds: Math.round(g.economy.funds), sims: g.population.sims.length, stock: g.economy.stock } : undefined });
    { const ts = JSON.stringify(g.flags.tracks || {}); if (ts !== this.tracksSig) { if (this.tracksSig !== undefined) this.send({ t: 'tracks', tracks: g.flags.tracks }); this.tracksSig = ts; } }
    // buildings: tell visitors about anything placed, finished or knocked down
    const now = new Map(); for (const b of g.buildings.list) now.set(b.id + '@' + b.x0 + ',' + b.z0, b);
    for (const [k, b] of now) { const st = this.bsig.get(k); if (st === undefined) this.send({ t: 'bld', op: 'add', id: b.id, x0: b.x0, z0: b.z0, rot: b.rot, state: b.state, over: b.over }); else if (st !== b.state) this.send({ t: 'bld', op: 'state', key: k, state: b.state }); this.bsig.set(k, b.state); }
    for (const k of [...this.bsig.keys()]) if (!now.has(k)) { this.send({ t: 'bld', op: 'del', key: k }); this.bsig.delete(k); }
    if ((this.syncN = (this.syncN || 0) + 1) % 5 === 0) this.syncWorld();
  }
  /** What visitors need to help: how far along each site is and what it has, the roads and planned paths, the trees and
   *  rocks and bushes (only what changed), and the Stockyard. */
  syncWorld() {
    const g = this.game, w = g.world, T = g.terrain, R = g.resources, diff = (now, was) => { const ch = []; if (was) for (let i = 0; i < now.length; i++) if (now[i] !== was[i]) ch.push([i, now[i]]); return ch; };
    const road = Array.from(w.road), trees = T.trees.map((t) => (t.alive ? t.amount : 0)), nodes = R.nodes.filter((n) => n.kind !== 'field').map((n) => Math.floor(n.amount)), plans = JSON.stringify(g.roadPlans.serialize());
    const m = { t: 'sync', sites: g.buildings.list.filter((b) => b.state === 'site').map((b) => [keyOf(b), +b.progress.toFixed(3), b.have]), rc: diff(road, this.lastRoad), tc: diff(trees, this.lastTrees), nc: diff(nodes, this.lastNodes), stock: g.economy.stock };
    if (plans !== this.lastPlans) m.plans = JSON.parse(plans);
    this.lastRoad = road; this.lastTrees = trees; this.lastNodes = nodes; this.lastPlans = plans; this.send(m);
  }
  applySync(m) {
    const g = this.game, w = g.world, T = g.terrain, R = g.resources;
    for (const [key, pr, have] of m.sites || []) { const b = this.bsig.get(key); if (b && b.state === 'site') { b.progress = pr; b.have = have || {}; g.buildings.refreshSite(b); } }
    for (const [i, v] of m.rc || []) { w.road[i] = v; w.events.emit('tile', i % MAP, Math.floor(i / MAP)); }
    if (m.plans) g.roadPlans.load(m.plans);
    for (const [i, a] of m.tc || []) { const t = T.trees[i]; if (!t) continue; if (a === 0 && t.alive) { t.amount = 1; T.chopTree(t); } else if (a > 0 && !t.alive) { if (T.regrow(t)) t.amount = a; } else if (a > 0 && t.amount !== a) { t.amount = a; T.setTree(t.idx, a >= 3 ? 1 : 0.55 + 0.15 * a); } }
    const N = R.nodes.filter((n) => n.kind !== 'field'); for (const [i, a] of m.nc || []) { const n = N[i]; if (n) { n.amount = a; R.visual(n); } }
    if (m.stock) Object.assign(g.economy.stock, m.stock);
  }
  /** Visiting: our work, done in the host's town. Hammering and digging are added up and sent with our position. */
  help(op, ref, x) {
    const g = this.game;
    if (op === 'build') { const q = this.workQ || (this.workQ = new Map()), k = keyOf(ref); q.set(k, (q.get(k) || 0) + x); ref.progress = Math.min(0.98, Math.max(ref.progress, Math.min(g.buildings.supply(ref), ref.progress + x / Math.max(1, ref.def.work)))); g.buildings.refreshSite(ref); return; }   // (it shows straight away; the host finishes it)
    if (op === 'dig') { const q = this.digQ || (this.digQ = new Map()), k = ref.x + ',' + ref.z; q.set(k, (q.get(k) || 0) + x); return; }
    if (op === 'take') { this.send({ t: 'help', op, nk: x, x: Math.round(ref.x * 100) / 100, z: Math.round(ref.z * 100) / 100 }); return; }
    if (op === 'deliver') this.send({ t: 'help', op, key: keyOf(ref), items: x });
  }
  /** Visiting: put everything in the backpack in the host's Stockyard. */
  storeAll(P) {
    const g = this.game, items = { ...P.inv }; if (!Object.keys(items).length) return; this.send({ t: 'help', op: 'store', items });
    for (const [m, n] of Object.entries(items)) g.economy.stock[m] = (g.economy.stock[m] || 0) + n; g.ui.toast(`Stored ${P.invText()} in the town's Stockyard`); P.inv = {}; Sfx.play('drop');
  }
  /** Hosting: a visitor's work arrives. */
  applyHelp(m) {
    const g = this.game, v = this.visitors.get(m.from), B = g.buildings; if (!v) return; const find = (k) => B.list.find((b) => keyOf(b) === k);
    if (m.op === 'build') { const b = find(m.key); if (b && b.state === 'site') { B.addWork(b, Math.min(60, +m.amt || 0)); v.built = (v.built || 0) + 1; } }
    else if (m.op === 'dig') { const [x, z] = String(m.key).split(',').map(Number), p = g.roadPlans.get(x, z); if (p) g.roadPlans.work(p, Math.min(8, +m.amt || 0)); }
    else if (m.op === 'deliver') { const b = find(m.key); if (!b || b.state !== 'site') return; const got = []; for (const [mat, n] of m.items || []) { const k = Math.min(+n || 0, (b.need[mat] || 0) - (b.have[mat] || 0)); if (k > 0 && MATERIALS[mat]) { B.deliver(b, mat, k); got.push(`${k} ${MATERIALS[mat].name.toLowerCase()}`); } } if (got.length) g.messages.push('Visitors', `${v.name} delivered ${got.join(', ')} to the ${b.def.name}.`, 'quiet'); }
    else if (m.op === 'store') { const got = []; for (const [mat, n] of Object.entries(m.items || {})) { const k = Math.max(0, Math.min(60, Math.floor(+n || 0))); if (k && MATERIALS[mat]) { g.economy.add(mat, k); got.push(`${k} ${MATERIALS[mat].name.toLowerCase()}`); } } if (got.length) g.messages.push('Visitors', `${v.name} put ${got.join(', ')} in the Stockyard.`, 'quiet'); }
    else if (m.op === 'take') {   // a chop, a swing of the pick, a handful of berries: the same tree or rock goes down here
      const near = (o) => Math.hypot(o.x - m.x, o.z - m.z) < 1.6;
      if (m.nk === 'tree') { const t = g.terrain.trees.find((q) => q.alive && near(q)); if (t) { g.terrain.fallFrom = { x: v.x, z: v.z }; g.terrain.hitTree(t); g.terrain.chopTree(t); } }
      else { const n = g.resources.nodes.find((q) => q.kind === m.nk && !q.infinite && q.amount >= 1 && near(q)); if (n) g.resources.take(n); }
    }
  }
  // ---------- visiting ----------
  async join(code, name) {
    const g = this.game; this.name = name || 'Visitor'; await this.open(code.toUpperCase(), 'visitor', this.name);
    return new Promise((resolve) => { this.onWorld = resolve; g.ui.toast('Connected. Coming down the Lift...', 2000); });
  }
  /** The town arrives: build it here (without its people: they're shown as puppets the host moves). */
  applyWorld(m) {
    const g = this.game, d = m.d; d.sims = []; SaveGame.restore(g, d); g.netVisitor = true; g.clock.speed = 0;
    for (const s of g.population.sims) s.remove = true;
    this.looks = new Map(m.looks); for (const b of g.buildings.list) this.bsig.set(b.id + '@' + b.x0 + ',' + b.z0, b);
    const P = g.player, col = m.col || 0x2a7ab0; g.scene.remove(P.mesh); P.rig = createRig({ shirt: col, pants: 0x2d3a55, skin: 0xe8c0a0, hair: 0x6a4a2a, hairStyle: 'short', hat: { type: 'cap', color: col }, backpack: true }); P.mesh = P.rig.root; P.anim = new Animator(P.rig, { trait: 'cheerful' }); g.scene.add(P.mesh);
    // visitors get a bit of spending money for the day
    P.teleport(g.lift.doorOut.x, g.lift.doorOut.z + 2); P.pocket = 60; P.inv = {}; P.tools = new Set(Object.keys(TOOLS)); this.puppet('sam', { shirt: 0xe8772e, hat: { type: 'cap', color: 0xe8772e }, hairStyle: 'side', backpack: true }, 'Sam');   // (their own backpack, and a full set of tools to help with)
    this.hookAttack(); this.badge(); if (this.onWorld) this.onWorld(); g.messages.push('Lift', `You're visiting the host's town. Help out: build at the sites, gather and deliver, dig paths, put what you gather in the Stockyard. (The planning is the host's.)`);
  }
  visitorTick() { const g = this.game; if (g.population.sims.length) { for (const s of g.population.sims) s.dispose(); g.population.sims.length = 0; }   // only the host's people live here
    const P = this.game.player, q = (v) => Math.round(v * 10); this.send({ t: 'me', p: [q(P.x), q(P.z), q((P.floorY || 0) + (P.jumpY || 0)), Math.round(P.heading * 100), animCode(P), gunFlags(P), workCode(P)] });
    if (this.workQ && this.workQ.size) { for (const [key, amt] of this.workQ) this.send({ t: 'help', op: 'build', key, amt: Math.round(amt * 100) / 100 }); this.workQ.clear(); }
    if (this.digQ && this.digQ.size) { for (const [key, amt] of this.digQ) this.send({ t: 'help', op: 'dig', key, amt: Math.round(amt * 100) / 100 }); this.digQ.clear(); } }
  applySnap(m) {
    const g = this.game, seen = new Set(), dq = (v) => v / 10;
    for (const [id, look] of m.looks || []) this.looks.set(id, look);
    for (const [id, x, z, y, h, a] of m.sims) { const k = 's' + id; seen.add(k); let p = this.puppets.get(k); if (!p) { if (a === 6) continue; p = this.puppet(k, this.looks.get(id) || {}); } this.target(p, dq(x), dq(z), dq(y), h / 100, a); }
    for (const k of [...this.puppets.keys()]) if (/^s\d/.test(k) && !seen.has(k)) this.drop(k);
    const [x, z, y, h, a, f, sw] = m.sam, sp = this.puppets.get('sam'); this.target(sp, dq(x), dq(z), dq(y), h / 100, a, f); if (sp) sp.w = sw || 0;
    for (const [id, vx, vz, vy, vh, va, name, vf, vw] of m.vis) { if (id === this.id) continue; const k = 'v' + id; const p = this.puppets.get(k) || this.puppet(k, { shirt: VISITOR_LOOKS[id % VISITOR_LOOKS.length], hat: { type: 'cap', color: VISITOR_LOOKS[id % VISITOR_LOOKS.length] } }, name); this.target(p, dq(vx), dq(vz), dq(vy), vh / 100, va, vf); p.w = vw || 0; }
    { const bs = new Set(); for (const [k, bx, bz, by, bh, ba, bf, name, shirt, pants] of m.bots || []) { bs.add(k); const p = this.puppets.get(k) || this.puppet(k, { shirt, pants, longSleeve: true, hat: { type: 'cap', color: shirt } }, name); this.target(p, dq(bx), dq(bz), dq(by), bh / 100, ba, bf); } for (const k of [...this.puppets.keys()]) if (/^b\d/.test(k) && !bs.has(k)) this.drop(k); }
    if (m.stats) this.stats = m.stats;
    const T = g.transport; if (m.tt !== undefined) T.t = m.tt; for (const [k, s, dir, wait, at] of m.lines || []) { const L = T.lines[k]; if (L && L.kind !== 'sky') { L.s = s; L.dir = dir; L.wait = wait; L.atStop = at; } }   // the trains run where the host's do
    const c = g.clock; [c.hour, c.day, c.month, c.year, c.totalDays] = m.clock; if (g.weather) g.weather.want = m.rain;
  }
  applyBuilding(m) {
    const g = this.game;
    if (m.op === 'add') { const b = g.buildings.place(m.id, m.x0, m.z0, m.rot, { instant: m.state === 'done', over: m.over }); if (b) this.bsig.set(m.id + '@' + m.x0 + ',' + m.z0, b); }
    else { const b = this.bsig.get(m.key); if (!b) return; if (m.op === 'del') { g.buildings.remove(b); this.bsig.delete(m.key); } else if (m.state === 'done' && b.state !== 'done') g.buildings.finish(b); }
  }
  /** Visiting: buy from whoever is behind the counter (a puppet standing in a shop). */
  shopTargets(P, consider) {
    const g = this.game;
    for (const p of this.puppets.values()) { if (!/^s\d/.test(p.k) || p.a === 6 || p.a === 1 || p.a === 2) continue; const d = Math.hypot(p.x - P.x, p.z - P.z); if (d > 3.4) continue;
      const b = g.buildings.list.find((q) => q.state === 'done' && (q.def.shopping || q.def.dining || SHOP_GOODS[q.id]) && g.buildings.onBuilding(q, p.x, p.z)); if (!b || !g.buildings.onBuilding(b, P.x, P.z, 1)) continue;
      consider({ kind: 'act', text: `Buy something (£${(P.pocket || 0).toFixed(2)} in your pocket)`, act: () => g.ui.openShop(b, null, SHOP_GOODS[b.id] || GENERIC_GOODS) }, d - 0.8); return; }
  }
  // ---------- puppets (other people, moved by the network) ----------
  puppet(k, look, name) {
    const rig = createRig({ ...look }), anim = new Animator(rig, { trait: 'cheerful' }), p = { k, rig, anim, x: 0, z: 0, y: 0, h: 0, tx: 0, tz: 0, ty: 0, th: 0, a: 0, init: false, name };
    this.game.scene.add(rig.root); this.puppets.set(k, p);
    if (name) { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.font = 'bold 18px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#000'; x.fillText(name, 65, 23); x.fillStyle = '#ffd23f'; x.fillText(name, 64, 22); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false })); sp.scale.set(1.6, 0.4, 1); sp.position.y = 2.35; rig.root.add(sp); }
    return p;
  }
  target(p, x, z, y, h, a, f = 0) { if (!p) return; p.tx = x; p.tz = z; p.ty = y; p.th = h; p.a = a; p.f = f; if (!p.init) { p.init = true; p.x = x; p.z = z; p.y = y; p.h = h; } }
  drop(k) { const p = this.puppets.get(k); if (!p) return; this.game.scene.remove(p.rig.root); this.puppets.delete(k); }
  animate(dt) {
    for (const p of this.puppets.values()) {
      const k = Math.min(1, dt * 10), ox = p.x, oz = p.z; p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; p.y += (p.ty - p.y) * k; let dh = p.th - p.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); p.h += dh * k;
      const g = this.game; if (g.combat.on && p.a === 4 && !p.ragged && p.init) { p.ragged = true; g.combat.ragdoll(p.rig, new THREE.Vector3(Math.random() - 0.5, 0.3, Math.random() - 0.5).multiplyScalar(4)); g.combat.blood(p.x, p.y + 1, p.z, null, true, true); } if (p.a !== 4) p.ragged = false;
      const r = p.rig.root; r.visible = p.a !== 6 && !p.ragged; r.position.set(p.x, p.y, p.z); r.rotation.y = p.h; const dist = Math.hypot(p.x - ox, p.z - oz);
      const wp = p.w && p.a === 0 ? WORK_POSES[p.w] : '';   // hammering, chopping, digging...
      p.anim.update(dt, { lower: (p.f & 8) && p.a !== 4 ? 'prone' : ['hammer', 'dig', 'harvest'].includes(wp) ? 'crouch' : ANIM[p.a] || 'stand', crouch: (p.f & 4) ? 1 : 0, gunProp: gunProp(p.f || 0), upper: p.hitT > 0 ? 'punch' : p.a === 5 ? 'handlebars' : (p.f & 1) && p.a !== 4 && ((p.f & 2) || p.shotT > 0) ? 'aim' : wp || 'idle', dist, speed: dist / Math.max(dt, 1e-3), step: 0.38 + 0.21 * dist / Math.max(dt, 1e-3), run: p.a === 2, turning: false, lookYaw: 0, lookPitch: 0 }); if (p.hitT > 0) p.hitT -= dt; if (p.shotT > 0) p.shotT -= dt;
    }
  }
  // ---------- Raid night: a timed shootout with the set's prop pistols (host starts it from the Planning menu) ----------
  startRaid(secs = 180) {
    const g = this.game; if (this.role !== 'host') return; this.raid = { until: performance.now() / 1000 + secs, score: new Map([[0, 0]]), names: new Map([[0, 'Sam']]) }; for (const v of this.visitors.values()) { this.raid.score.set(v.id, 0); this.raid.names.set(v.id, v.name); }
    this.send({ t: 'raid', on: true, secs }); this.raidOn(true, secs);
  }
  raidOn(on, secs) {
    const g = this.game, P = g.player; g.raidNight = on; P.gun = on;
    g.ui.toast(on ? `🎯 RAID NIGHT! Prop pistols for everyone (F / □ to fire). Most knock-downs in ${Math.round(secs / 60)} minutes wins. The townsfolk run for cover.` : '🎯 Raid night is over. Put the pistols back in the props cupboard.', 5000);
    if (on) Sfx.play('bell');
  }
  /** Our shot hit someone: tell whoever needs to know. */
  shot(ref, dmg = 34, ex = {}) {
    const g = this.game;
    if (this.role === 'host') {
      if (ref.k && ref.k[0] === 'v') { this.send({ t: 'hurt', to: +ref.k.slice(1), dmg, x: g.player.x, z: g.player.z, by: 'sam', dir: ex.dir }); this.score(0); }
      else if (ref.knockDown) { ref.knockDown(4); g.social.say(ref, pick(['Argh!', 'I\'m hit! Oh. Blanks.', 'Not in the face!']), 2); this.score(0); }
    } else if (ref.k) this.send({ t: 'hit', who: ref.k, dmg, gun: true, head: ex.head, dir: ex.dir });
  }
  score(id) { if (!this.raid) return; this.raid.score.set(id, (this.raid.score.get(id) || 0) + 1); }
  raidTick() {
    const g = this.game, R = this.raid; if (!R) return;
    const table = [...R.score.entries()].map(([id, n]) => [R.names.get(id) || 'Visitor', n]).sort((a, b) => b[1] - a[1]); this.send({ t: 'score', table, left: Math.max(0, Math.round(R.until - performance.now() / 1000)) }); const now = performance.now() / 1000; this.board(table, R.until - now);
    if (now > R.until) { this.raid = null; this.send({ t: 'raid', on: false }); this.raidOn(false); const w = table[0]; if (w) { g.messages.push('Raid night', `${w[0]} wins Raid night with ${w[1]} knock-downs!`, 'good'); this.send({ t: 'toast', text: `🏆 ${w[0]} wins Raid night with ${w[1]} knock-downs!` }); g.ui.toast(`🏆 ${w[0]} wins Raid night with ${w[1]} knock-downs!`, 5000); } this.board(null); }
  }
  board(table, left) {
    let b = document.getElementById('raidboard'); if (!table) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'raidboard'; document.getElementById('app').appendChild(b); }
    b.innerHTML = (left == null ? `<b>⚔️ COMBAT · first to ${WIN_KILLS}</b>` : `<b>🎯 RAID NIGHT ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b>`) + table.map(([n, k]) => `<div><span>${n}</span><span>${k}</span></div>`).join('');
  }
  /** Our shot's streak, for everyone else's screens. */
  bang(f, e) { const r = (v) => Math.round(v * 100) / 100; this.send({ t: 'bang', f: f.map(r), e: e.map((q) => q.map(r)), by: this.role === 'host' ? 'sam' : 'v' + this.id }); }
  // ---------- fighting across the network ----------
  /** When our character punches or kicks, see if it lands on someone from another game. */
  hookAttack() {
    const g = this.game, P = g.player; if (P._netHooked) return; P._netHooked = true; const orig = P.attack.bind(P);
    P.attack = (kind) => { orig(kind); const fx = Math.sin(P.heading), fz = Math.cos(P.heading);
      for (const p of this.puppets.values()) { const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz); if (d > 1.6 || (dx * fx + dz * fz) / (d || 1) < 0.3 || Math.abs(p.y - (P.floorY || 0)) > 1) continue;
        this.send(this.role === 'host' ? { t: 'hurt', to: +p.k.slice(1), dmg: kind === 'kick' ? 18 : 12, x: P.x, z: P.z } : { t: 'hit', who: p.k, dmg: kind === 'kick' ? 18 : 12 }); break; } };
  }
  onMessage(m) {
    const g = this.game;
    switch (m.t) {
      case 'peer': this.welcome(m.id, m.name); break;
      case 'left': { const v = this.visitors.get(m.id); this.visitors.delete(m.id); this.drop('v' + m.id); if (v) g.ui.toast(`${v.name} has gone back up the Lift.`, 2200); this.badge(); break; }
      case 'me': { const v = this.visitors.get(m.from); if (!v) break; const [x, z, y, h, a, f, wk] = m.p.map((n, i) => (i < 3 ? n / 10 : i === 3 ? n / 100 : n)); Object.assign(v, { x, z, y, h, a, f: f || 0, w: wk || 0 }); const pp = this.puppets.get('v' + m.from); this.target(pp, x, z, y, h, a, f); if (pp) pp.w = wk || 0; break; }
      case 'help': if (this.role === 'host') this.applyHelp(m); break;
      case 'sync': if (g.netVisitor) this.applySync(m); break;
      case 'hit': {   // a visitor thumped someone in the host's town
        const v = this.visitors.get(m.from); if (!v) break; const pp = this.puppets.get('v' + m.from); if (pp) pp.hitT = 0.4; if (m.gun && this.raid) this.score(m.from);
        if (m.who === 'sam') { g.player.takeHit(m.dmg, { x: v.x, z: v.z, by: 'v' + m.from, dir: m.dir }); break; }
        if (m.who[0] === 'b') { g.combat.botHit(m.who, m.dmg, 'v' + m.from, m.dir, m.head); break; }
        if (m.who[0] === 'v') { this.send({ t: 'hurt', to: +m.who.slice(1), dmg: m.dmg, x: v.x, z: v.z, by: 'v' + m.from, dir: m.dir }); break; }
        const s = g.population.sims.find((q) => 's' + q.id === m.who); if (s && !(s.down > 0)) { s.knockDown(m.gun ? 4 : 3); g.social.say(s, pick(['Oi!', 'What was that for?!', 'Police! Police!']), 2); if (g.crime && g.crime.cops().some((c) => Math.hypot(c.x - v.x, c.z - v.z) < 30)) g.messages.push('Police', `The police are after ${v.name}!`, 'warn'); }
        break; }
      case 'world': this.applyWorld(m); break;
      case 'snap': if (g.netVisitor) this.applySnap(m); break;
      case 'bld': if (g.netVisitor) this.applyBuilding(m); break;
      case 'tracks': if (g.netVisitor) { g.flags.tracks = m.tracks; g.transport.acc = 0; } break;
      case 'hurt': g.player.takeHit(m.dmg, { x: m.x, z: m.z, by: m.by, dir: m.dir }); { const p = this.puppets.get('sam'); if (p) p.hitT = 0.4; } break;
      case 'hostgone': this.lost(); break;
      case 'raid': this.raidOn(m.on, m.secs || 0); if (!m.on) this.board(null); break;
      case 'score': this.board(m.table, m.left); break;   // a null table clears it
      case 'toast': g.ui.toast(m.text, 5000); break;
      case 'dm': g.combat.setOn(m.on, true); break;
      case 'dmkill': if (this.role === 'host') g.combat.kill(m.by, 'v' + m.from); break;
      case 'feed': g.combat.addFeed(m.by, m.victim, m.bn, m.vn); break;
      case 'nade': if (m.by === 'v' + this.id) break; g.combat.addNade(new THREE.Vector3(...m.p), new THREE.Vector3(...m.v), m.by, false, m.rocket); if (this.role === 'host' && m.from) this.send(m); break;
      case 'bang': if (m.by === 'v' + this.id) break; g.combat.tracer(m.f, m.e); { const pp = this.puppets.get(m.by); if (pp) pp.shotT = 1.5; } Sfx.noise(0.1, { freq: 800, vol: 0.18, type: 'lowpass' }); if (this.role === 'host' && m.from) this.send({ t: 'bang', f: m.f, e: m.e, by: 'v' + m.from }); break;
      default: break;
    }
  }
  update(dt) {
    if (!this.role) return; this.sendT -= dt; this.animate(dt);
    if (this.sendT > 0) return; this.sendT = 0.1;
    if (this.role === 'host' && this.raid && (this.raidT = (this.raidT || 0) + 1) % 10 === 0) this.raidTick();
    if (this.role === 'host' && this.visitors.size) this.hostTick(); else if (this.role === 'visitor' && this.game.netVisitor) this.visitorTick();
  }
  badge() {
    let b = document.getElementById('netbadge'); if (!b) { b = document.createElement('div'); b.id = 'netbadge'; document.getElementById('app').appendChild(b); }
    b.textContent = this.role === 'host' ? `🌐 Hosting · code ${this.code} · ${this.visitors.size} visiting` : `🌐 Visiting town ${this.code}`;
  }
}
