#!/bin/sh
# Starts Sam City with the multiplayer relay open to your local network (friends open the address it prints).
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then exec node serve.js 8123 --lan; fi
echo "Multiplayer needs Node.js (nodejs.org)."
