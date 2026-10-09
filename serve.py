#!/usr/bin/env python3
"""Tiny web server for Sam City that tells the browser never to keep old copies of the game files,
so a freshly downloaded version always shows up (no stale cache)."""
import http.server, os, socketserver, sys, webbrowser, threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache'); self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a): pass

NoCache.extensions_map['.js'] = 'text/javascript'
# if an older copy of the game is still running on this port, use the next free one (otherwise the browser
# would quietly show the OLD game from the OLD folder)
httpd = None
for port in range(PORT, PORT + 20):
    try: httpd = socketserver.TCPServer(('127.0.0.1', port), NoCache); PORT = port; break
    except OSError: continue
if httpd is None: print('No free port found. Close other Sam City windows and try again.'); input(); sys.exit(1)
with httpd:
    url = f'http://localhost:{PORT}/index.html?v={int(os.path.getmtime("index.html"))}'
    print(f'Sam City running at {url}  (close this window to stop)')
    if '--no-browser' not in sys.argv: threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    httpd.serve_forever()
