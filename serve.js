// Tiny web server for Sam City using Node.js (no extra packages needed), for computers without Python.
// Same job as serve.py: serve the game folder without caching, find a free port, open the browser.
const http = require('http'), fs = require('fs'), path = require('path'), { exec } = require('child_process');
const root = __dirname, start = +(process.argv[2] || 8123);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(root, p)); if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }); res.end(data);
  });
});
let port = start;
server.on('error', (e) => { if (e.code === 'EADDRINUSE' && port < start + 20) { port++; server.listen(port, '127.0.0.1'); } else { console.log('Could not start: ' + e.message); } });
server.on('listening', () => {
  const url = `http://localhost:${port}/index.html?v=${Math.floor(fs.statSync(path.join(root, 'index.html')).mtimeMs / 1000)}`;
  console.log(`Sam City running at ${url}  (close this window to stop)`);
  if (!process.argv.includes('--no-browser')) { const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`; exec(cmd); }
});
server.listen(port, '127.0.0.1');
