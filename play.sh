#!/bin/sh
# Starts a tiny local web server and opens the game (the browser needs http://, not file://).
cd "$(dirname "$0")"
PORT=8123
echo "Sam City running at http://localhost:$PORT  (Ctrl+C to stop)"
( sleep 1; (command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT") || (command -v open >/dev/null && open "http://localhost:$PORT") ) >/dev/null 2>&1 &
python3 -m http.server $PORT 2>/dev/null || python -m http.server $PORT
