import { WALL_H } from '../config.js';
import { upperFurniture } from '../world/Levels.js';
import { Sfx } from '../core/Sfx.js';
import { pick } from '../util.js';

/**
 * Nights out. Upstairs at the Red Lion the pianist plays from five till closing and the regulars go up to dance round
 * the old piano (or sit at the tables with a pint and sing along); at O'Malley's the fiddler plays in the corner and
 * somebody always ends up doing Riverdance; the Ritzy's dance floor fills from nine and empties at two.
 *
 * A building with music has a dance floor in its layout (`dance`: local centre, radius, storey). Upstairs floors are
 * reached through the foot of the stairs (`upstair`); the people up there are drawn with that storey, so they're seen
 * through the windows from the street and when Sam goes up.
 */
const MOVES = {
  piano: ['dance', 'dance', 'twist', 'clap', 'cheers', 'twist', 'macarena'],
  jig: ['riverdance', 'riverdance', 'clap', 'cheers', 'riverdance', 'dance'],
  club: ['dance', 'pogo', 'macarena', 'whigfield', 'runningman', 'dance', 'robot', 'airguitar', 'pogo', 'dance'],
};
const SHOUT = {
  piano: ['Daisy, Daisy!', 'Give us a song!', 'Knees up!', 'Play it again!', 'Ooh, I love this one!', 'All together now!'],
  jig: ['Whoop!', 'Sláinte!', 'Faster!', 'Give us The Wild Rover!', 'Go on, Michael Flatley!'],
  club: ['WHOOOO!', 'Tune!', 'I LOVE this song!', 'Hands in the air!', 'This is my song!', 'Oi oi!'],
};
// tunes as [semitones from A4 (or null for a rest), beats]
const DAISY = [[5, 3], [2, 3], [-2, 3], [-7, 3], [-5, 1], [-3, 1], [-2, 1], [-5, 2], [-2, 1], [-7, 6], [0, 3], [5, 3], [2, 3], [-2, 3], [-5, 1], [-3, 1], [-2, 1], [0, 2], [2, 1], [0, 6],
  [2, 1], [3, 1], [2, 1], [0, 1], [5, 2], [2, 1], [0, 1], [-2, 4], [0, 1], [2, 2], [-2, 1], [-5, 2], [-2, 1], [-5, 1], [-7, 4], [-7, 1], [-2, 2], [2, 1], [0, 3], [-7, 2], [-2, 1], [2, 2], [0, 1], [2, 1], [3, 1], [5, 1], [2, 1], [-2, 2], [0, 1], [-2, 6]];
const REEL = [[2, 1], [-2, 1], [-2, 1], [-7, 1], [-2, 1], [-2, 1], [2, 1], [-2, 1], [2, 1], [5, 1], [3, 1], [2, 1], [3, 1], [0, 1], [0, 1], [-5, 1], [0, 1], [0, 1], [3, 1], [0, 1], [3, 1], [7, 1], [5, 1], [3, 1],
  [2, 1], [-2, 1], [-2, 1], [-7, 1], [-2, 1], [-2, 1], [2, 1], [-2, 1], [2, 1], [5, 1], [3, 1], [2, 1], [3, 1], [2, 1], [0, 1], [-2, 1], [0, 1], [2, 1], [-2, 2], [-2, 1], [-2, 3]];
const hz = (n) => 440 * Math.pow(2, n / 12);

export class Nightlife {
  constructor(game) { this.game = game; this.t = 0; this.note = 0; this.beat = 0; this.shoutT = 8; }
  /** The pianist, the fiddler or the DJ, if they're at it right now. */
  player(b) {
    const L = b.layout; if (!L || !L.dance) return null;
    for (const s of b.workers) {
      if (s.role !== 'entertainer' || s.activity !== 'work' || s.remove) continue;
      if (L.piano ? s.upstairs && s.upstairs.piano && s.upstairs.b === b : s.inside === b && s.phase === 2 && !s.path.length) return s;
    }
    return null;
  }
  /** Is there music on (somebody playing, or the club open with the DJ in)? */
  on(b) { if (!b || b.state !== 'done' || !b.layout || !b.layout.dance) return false; if (this.player(b)) return true; return !b.layout.piano && !b.layout.dance.jig && b.workers.some((w) => w.inside === b && w.activity === 'work'); }   // (the club: the music's on while there's anyone behind the bar)
  kind(b) { const L = b.layout; return L && L.dance ? (L.piano ? 'piano' : L.dance.jig ? 'jig' : 'club') : null; }
  /** A free spot on the floor (world x, z), a step from everybody else dancing there. */
  spot(b) {
    const D = b.layout.dance, others = this.game.population.sims.filter((q) => q.danceAt === b || (q.upstairs && q.upstairs.b === b && q.upstairs.dance));
    let best = null, bd = -1;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * D.r, lx = D.x + Math.cos(a) * r, lz = D.z + Math.sin(a) * r, [x, z] = b.toWorld(lx, lz);
      const near = others.reduce((m, q) => Math.min(m, Math.hypot(q.x - x, q.z - z)), 9); if (near > 0.85) return { x, z }; if (near > bd) { bd = near; best = { x, z }; }
    }
    return best;
  }
  /** A free chair upstairs (world position and facing), for watching with a pint. */
  upSeat(b) {
    const taken = (b._upSeats || (b._upSeats = new Map())); for (const [k, s] of taken) if (!s || s.remove || !s.upstairs || s.upstairs.b !== b) taken.delete(k);
    const free = upperFurniture(b.def).filter((f) => f.t === 'chair' && f.k === 1 && !taken.has(f.x + ',' + f.z)); if (!free.length) return null;
    const f = pick(free), [x, z] = b.toWorld(f.x, f.z); return { key: f.x + ',' + f.z, x, z, heading: (b.rot + (f.r || 0)) * Math.PI / 2 };
  }
  /** Up the stairs: to the piano stool, a chair or the dance floor. */
  climb(s, b, what) {
    const L = b.layout; if (!L || !L.dance) return false; let at = null, heading = s.heading, show = { b, k: L.dance.k || 1, y: (L.dance.k || 1) * WALL_H, gx: s.x, gz: s.z, show: true };
    if (what === 'piano') { const p = L.piano, [x, z] = b.toWorld(p.x, p.z), [px, pz] = b.toWorld(p.x, p.z - 1); at = { x, z }; heading = Math.atan2(px - x, pz - z); show.piano = true; }
    else if (what === 'seat') { const st = this.upSeat(b); if (!st) return this.climb(s, b, 'dance'); at = st; heading = st.heading; show.seat = st.key; b._upSeats.set(st.key, s); }
    else { at = this.spot(b); if (!at) return false; const [cx, cz] = b.toWorld(L.dance.x, L.dance.z); heading = Math.atan2(cx - at.x, cz - at.z) + (Math.random() - 0.5) * 1.6; show.dance = true; }
    s.upstairs = show; s.x = at.x; s.z = at.z; s.rideY = show.y; s.heading = heading; s.faceGoal = undefined; s.glide = null; s.vel = 0; s.path = []; s.upTo = null; return true;
  }
  /** What a dancer is doing this moment (they change step every few bars; couples dance together). */
  move(s, b) {
    const k = this.kind(b) || 'club', L = MOVES[k], t = Math.floor((this.game.elapsed + s.id * 3.7) / 7);
    if (k === 'piano' && s.partner && s.partner.upstairs && s.partner.upstairs.dance && s.partner.upstairs.b === b && Math.hypot(s.partner.x - s.x, s.partner.z - s.z) < 1.6 && t % 3 === 0) return 'slowdance';
    return L[(t * 7 + s.id) % L.length];
  }
  update(dt) {
    const g = this.game; if (!g.started) return;
    if ((this.t -= dt) <= 0) {   // couples dance together: the second one up goes to their other half
      this.t = 2;
      for (const s of g.population.sims) { const U = s.upstairs, q = s.partner; if (!U || !U.dance || !q || !q.upstairs || !q.upstairs.dance || q.upstairs.b !== U.b || s.id < q.id || Math.hypot(q.x - s.x, q.z - s.z) < 1.2) continue; const h = Math.random() * Math.PI * 2; s.x = q.x + Math.sin(h) * 0.62; s.z = q.z + Math.cos(h) * 0.62; s.heading = Math.atan2(q.x - s.x, q.z - s.z); q.heading = Math.atan2(s.x - q.x, s.z - q.z); }
    }
    // the music, and a shout now and then, when Sam's in there
    const P = g.player, b = g.mode === 'sim' && g.buildings.playerInside; if (!b || !b.layout || !b.layout.dance || !this.on(b) || !g.clock.speed) return;
    const k = this.kind(b), up = (P.floorY || 0) > WALL_H * 0.5, near = !b.layout.piano || up, vol = near ? 1 : 0.35;
    if ((this.shoutT -= dt) <= 0) { this.shoutT = 5 + Math.random() * 7; const ds = g.population.sims.filter((s) => (s.danceAt === b || (s.upstairs && s.upstairs.b === b && !s.upstairs.piano)) && s.mesh.visible && !s.bubble); if (ds.length) g.social.say(pick(ds), pick(SHOUT[k]), 2.2); }
    if ((this.beat -= dt) > 0) return;
    if (k === 'club') { this.beat = 0.47; this.note++; Sfx.tone(this.note % 2 ? 55 : 62, 0.12, { type: 'sine', vol: 0.07 }); if (this.note % 2) Sfx.noise(0.04, { freq: 7000, q: 0.7, vol: 0.025, type: 'highpass', delay: 0.23 }); if (this.note % 4 === 0) Sfx.tone(hz([-24, -24, -21, -19][(this.note / 4) % 4 | 0]), 0.35, { type: 'square', vol: 0.025 }); return; }
    const tune = k === 'piano' ? DAISY : REEL, [n, len] = tune[this.note++ % tune.length], step = k === 'piano' ? 0.2 : 0.13; this.beat = len * step;
    if (k === 'piano') {   // a pub piano: the tune on top, oom-pah in the left hand
      if (n !== null) Sfx.tone(hz(n + 12), Math.min(0.5, len * step), { type: 'triangle', vol: 0.05 * vol });
      for (let i = 0; i < len; i++) Sfx.tone(hz(i % 3 === 0 ? -14 : -2), 0.12, { type: 'triangle', vol: 0.03 * vol, delay: i * step });
    } else if (n !== null) Sfx.tone(hz(n + 12), len * step * 0.95, { type: 'sawtooth', vol: 0.025 * vol });   // the fiddle
  }
}
