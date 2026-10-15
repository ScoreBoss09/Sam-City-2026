// Sam City 1995 multiplayer relay on its own, for playing over the internet. Run it on any machine people can reach
// (a cheap cloud server, or your own PC with the port forwarded on your router):
//   node relay-server.js 8124
// Then everyone (host and visitors) plays from their own copy of the game and types this machine's address
// (e.g. 203.0.113.7:8124) into Main menu > Multiplayer > Relay address. No game files are needed here.
const http = require('http'), port = +(process.argv[2] || 8124);
const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('Sam City 1995 relay is running. Point the game\'s Relay address here.\n'); });
require('./netrelay.js')(server);
server.listen(port, '0.0.0.0', () => console.log(`Sam City 1995 relay listening on port ${port}. Players type this machine's address and :${port} as the Relay address.`));
