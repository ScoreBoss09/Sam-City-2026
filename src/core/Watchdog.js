/**
 * Freeze detective. A tiny background worker hears a heartbeat from every section of every frame (the same sections the
 * F8 report times). If the heartbeat stops for several seconds while the game is on screen, the worker writes down which
 * section was the last to finish (IndexedDB: the main page may be stuck and can't), and:
 *  - if the game comes back, it says on screen how long it stalled and where;
 *  - if it never comes back (you have to reload), the next start says where it stopped.
 * It also watches for the graphics card being reset by the browser or driver ("WebGL context lost"), which freezes the
 * picture without any error: the game saves at once and says so, with a button to reload.
 */
const WORKER = `
let last = Date.now(), label = 'start', hidden = false, stuck = false, since = 0, db = null;
const open = () => new Promise((res) => { try { const r = indexedDB.open('samcity-watchdog', 1); r.onupgradeneeded = () => r.result.createObjectStore('w'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
const put = async (v) => { db = db || await open(); if (!db) return; try { const t = db.transaction('w', 'readwrite'); t.objectStore('w').put(v, 'last'); } catch (e) { /* nothing to do */ } };
onmessage = (e) => {
  const d = e.data; if (d.hidden !== undefined) { hidden = d.hidden; last = Date.now(); return; }
  if (stuck) { stuck = false; postMessage({ recovered: Date.now() - since, label }); put(null); }
  last = Date.now(); label = d.l;
};
setInterval(() => { if (hidden || stuck) return; const gap = Date.now() - last; if (gap > 6000) { stuck = true; since = last; put({ label, at: new Date().toISOString() }); } }, 1000);
`;

export class Watchdog {
  constructor(game) {
    this.game = game; this.w = null; this.label = 'start';
    try { this.w = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }))); } catch (e) { this.w = null; }
    if (this.w) {
      this.w.onmessage = (e) => { const d = e.data; if (d.recovered) { const s = Math.round(d.recovered / 1000); game.perf && game.perf.note(`stalled ${s} s after "${d.label}"`); game.ui && game.ui.showError(`The game stopped responding for ${s} seconds (after: ${d.label}). It's going again. If this keeps happening, press F8 and copy the report.`); } };
      document.addEventListener('visibilitychange', () => this.w.postMessage({ hidden: document.hidden }));
      this.w.postMessage({ hidden: true });   // quiet until the game is running
    }
  }
  /** Heartbeat: the section of the frame that just finished. */
  beat(label) { if (this.w && label !== this.label) { this.label = label; this.w.postMessage({ l: label }); } else if (this.w && (this.n = (this.n || 0) + 1) % 30 === 0) this.w.postMessage({ l: label }); }
  /** Start listening once the game is on screen (loading the town can take a few seconds). */
  start() { if (this.w) this.w.postMessage({ hidden: document.hidden }); }
  /** What happened last time, if the game froze and had to be reloaded. */
  static lastFreeze() {
    return new Promise((res) => { try { const r = indexedDB.open('samcity-watchdog', 1); r.onupgradeneeded = () => r.result.createObjectStore('w'); r.onerror = () => res(null);
      r.onsuccess = () => { const db = r.result; try { const t = db.transaction('w', 'readwrite'), st = t.objectStore('w'), q = st.get('last'); q.onsuccess = () => { res(q.result || null); st.put(null, 'last'); }; q.onerror = () => res(null); } catch (e) { res(null); } }; } catch (e) { res(null); } });
  }
  /** The graphics card was reset: save, say so, offer a reload. */
  static watchContext(game, canvas) {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); try { game.save(); } catch (er) { /* best effort */ } game.contextLost = true;
      try { localStorage.setItem('samcity-ctxlost', String(Date.now())); } catch (er) { /* no storage */ }
      game.perf && game.perf.note('WebGL context lost (graphics card reset)');
      game.ui && game.ui.showError('The graphics card stopped responding and the browser reset it, so the picture froze. Your town has been saved. Reload to carry on: the game will start on a lighter picture setting.', true);
    });
    canvas.addEventListener('webglcontextrestored', () => { game.contextLost = false; game.perf && game.perf.note('WebGL context restored'); });
  }
}
