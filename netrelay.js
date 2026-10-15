// A tiny WebSocket relay for Sam City 1995 multiplayer (plain Node, no packages). Rooms by code: one host, any number of
// visitors. Messages from the host go to its visitors (or one of them, with "to"); messages from a visitor go to the host
// (stamped with "from"). The relay doesn't understand the game at all; the host's browser runs the town.
const crypto = require('crypto');
module.exports = function attach(server) {
  const rooms = new Map(); let nextId = 1;
  const send = (p, data, op = 1) => {
    const pl = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)); let h;
    if (pl.length < 126) h = Buffer.from([0x80 | op, pl.length]);
    else if (pl.length < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(pl.length, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(pl.length), 2); }
    try { p.socket.write(Buffer.concat([h, pl])); } catch (e) { /* gone */ }
  };
  const parse = (p) => {
    for (;;) {
      const b = p.buf; if (b.length < 2) return null;
      const fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80; let len = b[1] & 0x7f, off = 2;
      if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; } else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
      const mo = off; if (masked) off += 4; if (b.length < off + len) return null;
      let pl = Buffer.from(b.subarray(off, off + len)); if (masked) for (let i = 0; i < pl.length; i++) pl[i] ^= b[mo + (i & 3)];
      p.buf = b.subarray(off + len);
      if (op === 8) { try { p.socket.end(); } catch (e) { /* gone */ } return null; }
      if (op === 9) { send(p, pl, 10); continue; }
      if (op === 0 || op === 1 || op === 2) { p.frags.push(pl); if (!fin) continue; const all = Buffer.concat(p.frags); p.frags = []; return all.toString('utf8'); }
    }
  };
  const leave = (p) => {
    const r = p.room && rooms.get(p.room); p.room = null; if (!r) return;
    if (r.host === p) { for (const v of r.visitors.values()) { send(v, { t: 'hostgone' }); try { v.socket.end(); } catch (e) { /* gone */ } } rooms.delete(p.code); }
    else { r.visitors.delete(p.id); if (r.host) send(r.host, { t: 'left', id: p.id }); }
  };
  const onMsg = (p, txt) => {
    let m; try { m = JSON.parse(txt); } catch (e) { return; }
    if (m.t === 'join') {
      const code = String(m.code || '').toUpperCase().slice(0, 8); p.code = code;
      if (m.role === 'host') { if (rooms.has(code)) return send(p, { t: 'error', msg: 'That code is already in use.' }); rooms.set(code, { host: p, visitors: new Map() }); p.room = code; p.role = 'host'; return send(p, { t: 'joined', id: p.id, code }); }
      const r = rooms.get(code); if (!r) return send(p, { t: 'error', msg: 'No game with that code.' });
      if (r.visitors.size >= 7) return send(p, { t: 'error', msg: 'That town is full.' });
      r.visitors.set(p.id, p); p.room = code; p.role = 'visitor'; send(p, { t: 'joined', id: p.id, code }); return send(r.host, { t: 'peer', id: p.id, name: String(m.name || 'Visitor').slice(0, 20) });
    }
    const r = p.room && rooms.get(p.room); if (!r) return;
    if (p.role === 'host') { if (m.to) { const v = r.visitors.get(m.to); if (v) send(v, txt); } else for (const v of r.visitors.values()) send(v, txt); }
    else { m.from = p.id; send(r.host, m); }
  };
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key']; if (!req.url.startsWith('/net') || !key) { socket.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    socket.setNoDelay(true);
    const p = { id: nextId++, socket, room: null, role: null, buf: Buffer.alloc(0), frags: [] };
    socket.on('data', (d) => { p.buf = Buffer.concat([p.buf, d]); let m; while ((m = parse(p)) !== null) onMsg(p, m); });
    socket.on('close', () => leave(p)); socket.on('error', () => leave(p));
  });
};
