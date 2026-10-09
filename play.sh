#!/bin/sh
# Starts a tiny local web server (no caching, so new versions always show) and opens the game.
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then exec node serve.js 8123; fi
if command -v python3 >/dev/null 2>&1; then exec python3 serve.py 8123; fi
exec python serve.py 8123
