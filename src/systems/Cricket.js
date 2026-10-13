import * as THREE from 'three';
import { pick } from '../util.js';

// Sunday afternoon cricket on the Cricket Green (April to September): two village elevens (well, sixes) in whites,
// a bowler, a batsman at each end, fielders, an umpire and a crowd round the rope with a flask of tea.
const CROWD = ['Shot!', 'Howzat!', 'Well bowled!', 'Lovely cover drive.', 'That\'s gone for four.', 'Run! No! Yes! Wait! Sorry!', 'Bit of swing in the air today.',
  'Tea at four, I hope. They\'ve done egg and cress.', 'He thinks he\'s Botham.', 'He thinks he\'s Dickie Bird, that umpire.', 'Ball of the century, that. Well, of the afternoon.',
  'Lovely day for it.', 'Where\'s the ball gone? Is it in the pond again?', 'Catch it! Oh. Never mind.', 'Plumb LBW, that. Plumb.', 'Owzat!', 'Good length, that.', 'Lovely stuff.'];
const CROWD_A = ['Pass the Pimm\'s.', 'Three pints in and he\'s still fielding at slip.', 'That umpire wants his eyes testing.', 'If he bowls one more wide I\'m going to the pub.'];
const TEAMS = [['Sam City', 0x2a6a3a], ['Old Lift Boys', 0x7a1f2a], ['Dome Wanderers', 0x23407a]];

export class Cricket {
  constructor(game) { this.game = game; this.m = null; }
  /** This person is wanted at the match (a player, the umpire, or one of the crowd). */
  calling(s) { const m = this.m; return m && m.live && m.roles.has(s) ? m : null; }
  update(dt) {
    const g = this.game, c = g.clock, f = g.buildings.list.find((b) => b.id === 'ballfield' && b.state === 'done');
    const live = !!f && c.isSunday && c.month >= 3 && c.month <= 8 && c.hour >= 13.5 && c.hour < 17.5 && !(g.raids && g.raids.alert) && !(g.weather && g.weather.rain > 0.5);
    if (live && !this.m && this.playedDay !== c.totalDays) this.start(f);
    if (this.m && (!live || this.m.f !== f)) this.end();
    if (this.m) this.play(dt);
  }
  start(f) {
    const g = this.game, c = g.clock; this.playedDay = c.totalDays;
    const free = g.population.sims.filter((s) => s.kind === 'resident' && !s.leaving && !s.crook && !s.fight && s.age < 60 && s.activity !== 'work' && s.activity !== 'police' && !s.riding);
    if (free.length < 6) return;
    free.sort((a, b) => ((a.id * 7919 + c.totalDays) % 97) - ((b.id * 7919 + c.totalDays) % 97));
    const n = Math.min(6, Math.floor(free.length / 2)), home = free.slice(0, n), away = free.slice(n, 2 * n), ump = free[2 * n] || null, opp = TEAMS[1 + (Math.floor(c.totalDays / 7) % 2)];
    const m = this.m = { live: true, f, home, away, ump, roles: new Map(), runs: 0, wk: 0, balls: 0, t: 3, ball: null, opp, x: f.cx, z: f.cz };
    const L = (lx, lz) => { const [x, z] = f.toWorld(lx, lz); return { b: f, x, z }; }, face = (p, tx, tz) => { const [wx, wz] = f.toWorld(tx, tz); return { ...p, face: Math.atan2(wx - p.x, wz - p.z) }; };
    // the batting side: two at the crease, the rest padded up by the pavilion; the fielding side spread round the ground
    away.forEach((s, i) => m.roles.set(s, i === 0 ? face(L(0.35, -3.7), 0, 4) : i === 1 ? face(L(-0.45, 3.5), 0, -4) : face(L(-4.6 + i * 0.7, -5.4), 0, 0)));
    const field = [[0, 6.2], [0, -5.6], [3.6, -3.2], [-4.2, 0.5], [4.5, 2.5], [-2.8, 5]];   // bowler at the top of his run, keeper, slip, point, mid-on, fine leg
    home.forEach((s, i) => m.roles.set(s, face(L(...field[i % field.length]), 0, 0)));
    if (ump) m.roles.set(ump, face(L(0.9, 4.6), 0, -4));
    for (const s of home) s.wear('cricket', c.totalDays * 24 + 18, TEAMS[0][1]); for (const s of away) s.wear('cricket', c.totalDays * 24 + 18, opp[1]); if (ump) ump.wear('sunday', c.totalDays * 24 + 18);
    // the crowd: a good few of everybody else, round the boundary rope
    const R = Math.min(f.def.w, f.def.d) * 2 - 0.2; let k = 0;
    for (const s of g.population.sims) { if (m.roles.has(s) || s.leaving || s.crook || (s.kind !== 'resident' && s.kind !== 'child') || s.activity === 'work' || s.activity === 'police' || (s.id * 13 + c.totalDays) % 10 >= 4) continue;
      const a = (k++ * 2.399) % (Math.PI * 2); if (Math.abs(Math.cos(a)) > 0.92 && Math.sin(a) < -0.3) continue; const p = L(Math.cos(a) * R, Math.sin(a) * R); m.roles.set(s, face(p, 0, 0)); }
    m.spot = (s) => m.roles.get(s) || null; m.hold = (s) => m.roles.has(s);
    const geo = new THREE.SphereGeometry(0.07, 6, 4); m.ball = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9a1a1a })); m.ball.visible = false; g.scene.add(m.ball);
    m.bowler = home[0]; m.striker = away[0]; m.next = 2;
    if (g.markers) g.markers.add(f.cx, f.cz, '🏏', 'Sunday cricket', 4 * 60);
    g.messages.push('Town', `Sunday cricket on the green: ${TEAMS[0][0]} v ${opp[0]}. Bring a flask.`);
  }
  play(dt) {
    const g = this.game, m = this.m, f = m.f; m.t -= dt * Math.max(0.2, g.clock.speed);
    const W = (lx, lz) => f.toWorld(lx, lz);
    if (m.fly) {   // the ball in the air (bowled, or hit)
      const q = m.fly; q.t += dt * Math.max(0.2, g.clock.speed) / q.dur; const t = Math.min(1, q.t);
      m.ball.position.set(q.x0 + (q.x1 - q.x0) * t, 0.2 + Math.sin(t * Math.PI) * q.h, q.z0 + (q.z1 - q.z0) * t); m.ball.visible = true;
      if (t >= 1) { m.fly = null; if (q.then) q.then(); }
      return;
    }
    if (m.t > 0) return; m.t = 5 + Math.random() * 4; m.balls++;
    const [bx, bz] = W(0, 4.4), [sx, sz] = W(0, -3.6), bow = m.bowler, bat = m.striker;
    if (bow && bow.mesh.visible) bow.emote = { upper: 'point', t: 0.8 };
    m.fly = { x0: bx, z0: bz, x1: sx, z1: sz, h: 0.5, t: 0, dur: 0.7, then: () => this.shot() };
    void bat;
  }
  shot() {
    const g = this.game, m = this.m, f = m.f, r = Math.random(), crowd = [...m.roles.keys()].filter((s) => !m.home.includes(s) && !m.away.includes(s) && s !== m.ump && s.mesh.visible && !s.path.length);
    const cheer = (n, upper = 'clap') => { for (let i = 0; i < n && crowd.length; i++) { const s = crowd.splice(Math.floor(Math.random() * crowd.length), 1)[0]; s.emote = { upper, t: 2 }; if (i === 0 && s.kind !== 'child') g.social.say(s, pick(g.ui.adult && Math.random() < 0.3 ? CROWD_A : CROWD), 2.4); else if (i === 0) g.social.say(s, pick(['Shot!', 'Owzat!', 'Can I have a go?', 'Is it tea yet?']), 2.2); s.moodBoost += 0.02; } };
    if (r < 0.1) {   // out! the umpire's finger goes up, and the next one walks out
      m.wk++; if (m.ump && m.ump.mesh.visible) { m.ump.emote = { upper: 'point', t: 2 }; g.social.say(m.ump, 'Out!', 2); } cheer(3, 'cheer');
      const nxt = m.away[m.next]; if (nxt && m.striker) { const ps = m.roles.get(m.striker), pn = m.roles.get(nxt); m.roles.set(nxt, ps); m.roles.set(m.striker, pn); nxt.phase = 0; m.striker.phase = 0; m.striker = nxt; m.next++; }
      else if (!nxt) { m.allOut = true; this.end(); }
      return;
    }
    if (r < 0.45) { cheer(1); return; }   // a dot ball: played back to the bowler
    const run = r > 0.93 ? 6 : r > 0.8 ? 4 : 1 + Math.floor(Math.random() * 2), a = Math.random() * Math.PI * 2, d = run >= 4 ? 8.5 : 4 + Math.random() * 3;
    const [x0, z0] = f.toWorld(0, -3.6), [x1, z1] = f.toWorld(Math.cos(a) * d, Math.sin(a) * d - 1);
    m.runs += run; m.fly = { x0, z0, x1, z1, h: run === 6 ? 5 : 1.2, t: 0, dur: run === 6 ? 1.6 : 1.1, then: () => { m.ball.visible = false; } };
    cheer(run >= 4 ? 5 : 2, run >= 4 ? 'cheer' : 'clap');
    if (run === 6 && g.mode === 'sim' && Math.hypot(g.player.x - f.cx, g.player.z - f.cz) < 25) g.ui.toast('Six! Straight over the rope.', 1500);
  }
  end() {
    const g = this.game, m = this.m; if (!m) return; this.m = null; m.live = false;
    if (m.ball) { g.scene.remove(m.ball); m.ball.geometry.dispose(); m.ball.material.dispose(); }
    for (const s of m.roles.keys()) { if (s.activity === 'event') s.phase = 0; }
    if (!m.allOut && g.weather && g.weather.rain > 0.5) { g.messages.push('Town', 'Rain stopped play at the cricket. The covers come on and everyone piles into the pavilion.'); return; }
    if (m.balls > 6) { const won = (m.runs + m.wk * 7) % 3 !== 0; g.messages.push('Town', `Cricket: ${m.opp[0]} ${m.runs} for ${m.wk}${m.allOut ? ' (all out)' : ''}. ${won ? `${TEAMS[0][0]} knock them off before tea. Jubilant scenes in the pavilion.` : `${TEAMS[0][0]} collapse after the scones. There's always next Sunday.`}`); }
  }
}
