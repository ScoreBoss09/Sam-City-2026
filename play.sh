#!/bin/sh
# Starts a tiny local web server (no caching, so new versions always show) and opens the game.
cd "$(dirname "$0")"
python3 serve.py 8123 2>/dev/null || python serve.py 8123
