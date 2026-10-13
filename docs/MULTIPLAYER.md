# Multiplayer

## How to play (just a code, from anywhere)
1. Both players start the game as usual (**play.bat** on Windows, **play.sh** on Mac/Linux). Both need to be online.
2. Host: main menu > **Multiplayer** > **Host**. Your latest town opens and a 4-letter code appears at the top of the screen (e.g. `PZWE`). Tell your friend the code (text it, ring them).
3. Friend: main menu > **Multiplayer**, type their name and the code, **Join**.
4. Visitors come down the Lift into your town. They can walk, run, ride, punch and kick (and so can Sam back); they can't plan, build or spend your money. Up to 7 visitors. To visit theirs, swap roles.

No IP addresses, ports, routers or servers. The two games talk directly (WebRTC) after a free matchmaking service
(PeerJS, `0.peerjs.com`) introduces them by the code; if a home router won't allow a direct link, PeerJS's relay
carries the traffic instead. The library is bundled (`vendor/peerjs.min.js`). The code changes every time you host.

If it won't connect: check the code; make sure the host is still on the Multiplayer screen's town (hosting); try
Chrome, Edge or Firefox; a strict work or school network can block it (home broadband is fine).

### Your own relay (optional, advanced)
Under **Multiplayer > Advanced > Own relay** you can instead type the address of a `node relay-server.js 8124` you run
yourself (cloud server, or a PC with the port forwarded), or use `node serve.js --lan` on one network. Leave it empty
for the code-only way above. For testing, `window.SAMCITY_PEER = { host, port, path, secure }` points PeerJS at your
own PeerJS server.

What's in: the town arrives as a save snapshot; townsfolk, Sam and the other visitors move ten times a second; buildings placed, finished or knocked down appear for everyone; time of day and rain follow the host; punches and kicks land across the network (on townsfolk, on Sam, on other visitors), and the police notice.
Code: `src/net/Net.js` (the game side and, by default, the host's link to its visitors), `netrelay.js` (the optional WebSocket relay).
Also: visitors ride the trains and sky lift (kept in step with the host's) and buy from shopkeepers with their own pocket money (£60).

### Raid night (opt-in shootout)
The host starts it from the **Planning menu** (🎯 Start Raid night). For three minutes everyone (Sam and the visitors) carries one of the set's prop pistols: **F** (□ on a controller) fires a blank down the line of the camera. Anyone hit is knocked flat (it's a TV set; nobody gets hurt for real), the townsfolk run indoors, and a scoreboard at the top counts knock-downs. Most knock-downs wins.

Not yet: Steam / console networking behind the same messages.

# Multiplayer plan

The goal: friends visit your town. The host is Sam and owns the town (planning view, money, building); visitors arrive by the Lift as other characters with fewer powers. GTA-style action: fights, chases, the police after you.

## Model: host-authoritative
- The **host** runs the whole simulation exactly as now (sims, economy, crime, events). Nothing about the single-player game changes.
- **Visitors** run a thin client: they render the town from snapshots and send only their own inputs.
- One town, one truth: no lockstep, no shared simulation, so the existing systems don't need to be deterministic.

## What visitors can and can't do
| | Host (Sam) | Visitor |
|---|---|---|
| Walk, run, jump, ride bikes, swim | yes | yes |
| Punch, kick, chase, get arrested | yes | yes (the police treat them the same) |
| Talk to townsfolk, buy in shops and pubs | yes | yes (own pocket money, not the town funds) |
| Planning view, build, bulldoze, permits, Lift orders | yes | no |
| Work shifts, deliver materials, build by hand | yes | yes (helps the host's town) |
| Save the town | yes | no (visitors keep only their own character) |

## Network
- Transport: WebRTC data channels (peer to peer, host as the hub) for the browser build; Steamworks networking (Steam Datagram Relay) on Steam; the platform services on PS5 and Xbox. Keep one small interface (`send(peer, msg)`, `onMessage`) so the transport can be swapped.
- Lobby: Steam lobbies / platform sessions; in the browser a join code exchanged through a tiny signalling server.

## Messages
- Visitor to host, 30 times a second: input (move vector, look yaw/pitch, buttons pressed).
- Host to visitors, 10 to 20 times a second: snapshot of what is near each visitor (interest management, about 60 m): sims (id, x, z, heading, animation state, speech bubble), vehicles, players, doors, fires.
- Host to visitors, reliable: events (messages, markers, toasts), building placed/finished/removed, time of day and weather, economy figures the HUD shows.
- On join: the town itself (the same snapshot as a save game, `src/core/Save.js` serialize), then deltas.

## Code changes needed (in order)
1. **Split Player into "a body" and "a controller"**, so the same character code can be driven by the keyboard/pad (local), by network input (a visitor on the host), or by snapshots (a remote character on a visitor's screen).
2. `game.players[]` instead of `game.player`, with the host as players[0]. Systems that look at Sam (crime, police, townsfolk greeting him, story) keep using the host; fights and arrests consider every player.
3. A `Net` module: transport, join/leave, snapshot packing (quantised positions, sim ids), interpolation buffer on the visitor.
4. A visitor client mode: no simulation update; apply snapshots; render; send input. Planning view disabled.
5. Shootouts (GTA-style) are a later, optional mode (a "Raid night" game rule) since the base game has no guns; it reuses the raids/militia club code.

## Platforms
- Steam: Steamworks lobbies, invites and relay networking; Steam Input for controllers (already controller-first).
- PS5 / Xbox: needs a native engine port for certification (see `docs/UNITY_PORT.md`); the data files (`src/data/*.js`) and this message design carry over.
- Cross-play: possible once the transport is behind the interface above.
