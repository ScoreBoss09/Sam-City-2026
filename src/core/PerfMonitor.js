import { VERSION } from '../version.js';
import { Assets } from '../render/Assets.js';

/**
 * Keeps a rolling record of how the game is running (frame times, where the time goes, what the GPU is drawing)
 * and turns it into a plain-text report the player can copy and paste. Cheap: a few performance.now() calls a frame.
 */
export class PerfMonitor {
  constructor(game) {
    this.game = game; this.N = 1800; this.frames = new Float32Array(this.N); this.js = new Float32Array(this.N); this.n = 0; this.i = 0;
    this.sec = {}; this.secFrames = 0; this.events = []; this.worst = []; this.t0 = 0; this.started = performance.now();
  }
  begin() { this.t0 = this.last = performance.now(); }
  /** Time since the previous lap goes to this section. */
  lap(name) { const now = performance.now(); this.sec[name] = (this.sec[name] || 0) + (now - this.last); this.last = now; }
  frame(rawSec, jsMs) {
    const ms = rawSec * 1000; if (ms > 1000 || document.hidden) return;   // tab was in the background
    this.frames[this.i] = ms; this.js[this.i] = jsMs; this.i = (this.i + 1) % this.N; this.n = Math.min(this.N, this.n + 1); this.secFrames++;
    if (ms > 50) { const g = this.game; this.worst.push({ ms: Math.round(ms), js: Math.round(jsMs), at: g.clock ? `day ${g.clock.totalDays} ${g.clock.hhmm}` : '', mode: g.mode, pop: g.population ? g.population.count() : 0 }); this.worst.sort((a, b) => b.ms - a.ms); this.worst.length = Math.min(this.worst.length, 8); }
  }
  note(text) { const g = this.game; this.events.push(`${new Date().toLocaleTimeString()} (day ${g.clock ? g.clock.totalDays : 0}) ${text}`); if (this.events.length > 12) this.events.shift(); }
  stats() {
    const a = Array.from(this.frames.subarray(0, this.n)).sort((x, y) => x - y), j = Array.from(this.js.subarray(0, this.n)).sort((x, y) => x - y), q = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0;
    const avg = a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
    return { n: a.length, fps: avg ? 1000 / avg : 0, avg, p50: q(a, 0.5), p95: q(a, 0.95), p99: q(a, 0.99), max: a[a.length - 1] || 0, slow: a.filter((v) => v > 33).length, jank: a.filter((v) => v > 100).length, js50: q(j, 0.5), js95: q(j, 0.95) };
  }
  gpu() { try { const gl = this.game.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return 'unknown'; } }
  report() {
    const g = this.game, s = this.stats(), r = g.renderer, info = r.info, P = g.population, B = g.buildings, f = (v, d = 1) => (+v).toFixed(d);
    const secs = Object.entries(this.sec).sort((x, y) => y[1] - x[1]), tot = secs.reduce((t, [, v]) => t + v, 0) || 1;
    const sims = P.sims.filter((q) => !q.remove), vis = sims.filter((q) => q.mesh.visible).length, near = sims.filter((q) => q.mesh.visible && !q.lowDetail).length;
    const kinds = {}; for (const q of sims) kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    const mem = performance.memory ? `${f(performance.memory.usedJSHeapSize / 1048576, 0)} MB used of ${f(performance.memory.jsHeapSizeLimit / 1048576, 0)} MB` : 'not available in this browser';
    let roads = 0; for (const v of g.world.road) if (v) roads++;
    const lines = [
      '=== SAM CITY PERFORMANCE REPORT ===',
      `Version ${VERSION} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · played ${f((performance.now() - this.started) / 60000, 0)} min this session`,
      '',
      '-- Frames (last ' + s.n + ') --',
      `FPS ${f(s.fps)} · frame ms: median ${f(s.p50)}, 95% ${f(s.p95)}, 99% ${f(s.p99)}, worst ${f(s.max, 0)}`,
      `Slow frames (>33 ms): ${s.slow} · stutters (>100 ms): ${s.jank} · game code per frame: median ${f(s.js50)} ms, 95% ${f(s.js95)} ms`,
      `Where the time goes: ${secs.map(([k, v]) => `${k} ${f(100 * v / tot, 0)}%`).join(', ')}`,
      `Worst frames: ${this.worst.length ? this.worst.map((w) => `${w.ms}ms (code ${w.js}ms, ${w.mode}, pop ${w.pop}, ${w.at})`).join('; ') : 'none over 50 ms'}`,
      '',
      '-- Drawing --',
      `Draw calls ${info.render.calls} · triangles ${info.render.triangles} · geometries ${info.memory.geometries} · textures ${info.memory.textures} · shader programs ${(info.programs || []).length}`,
      `Render scale ${f(g.renderScale, 2)} · canvas ${r.domElement.width}x${r.domElement.height} · window ${innerWidth}x${innerHeight} @${devicePixelRatio}x · sun shadows ${g.atmosphere.sun.castShadow ? 'on' : 'off'} · texture pack ${Assets.source || 'none'}`,
      `GPU: ${this.gpu()}`,
      `Browser: ${navigator.userAgent.replace(/\s+/g, ' ').slice(0, 160)} · CPU threads ${navigator.hardwareConcurrency || '?'} · RAM ${navigator.deviceMemory ? navigator.deviceMemory + ' GB+' : '?'}`,
      `JS memory: ${mem}`,
      '',
      '-- Town --',
      `Day ${g.clock.totalDays} ${g.clock.hhmm} · speed ${g.clock.speed}x · view ${g.mode} · era ${g.tech ? g.tech.era : 0}`,
      `Residents ${P.count()} · people objects ${sims.length} (${Object.entries(kinds).map(([k, v]) => k + ' ' + v).join(', ')}) · visible ${vis}, full detail ${near}`,
      `Buildings ${B.list.filter((b) => b.state === 'done').length} done, ${B.list.filter((b) => b.state === 'site').length} sites, ${g.upgrades ? g.upgrades.orders.length : 0} upgrades · road tiles ${roads} · trees ${g.terrain.trees.filter((t) => t.alive).length} · cars ${g.traffic && g.traffic.cars ? g.traffic.cars.length : 0}`,
      `Quality guard: ${this.events.length ? '' : 'no changes'}`, ...this.events.map((e) => '  ' + e),
      '=== END ===',
    ];
    return lines.join('\n');
  }
}
