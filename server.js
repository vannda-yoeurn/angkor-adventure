/* =====================================================================
 * server.js — ម៉ាស៊ីនមេពហុអ្នកលេង «អង្គរ: ដំណើរផ្សងព្រេង»
 * Node.js + Express (បម្រើឯកសារហ្គេម) + Socket.io (ទំនាក់ទំនងពេលវេលាជាក់ស្ដែង)
 * ដំណើរការ៖  npm install  →  npm start  →  បើក http://localhost:3000
 * ===================================================================== */
const path = require('path');
const http = require('http');
const os = require('os');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4; // អ្នកលេងអតិបរមាក្នុងមួយបន្ទប់

const app = express();
app.use(express.static(path.join(__dirname, 'public'))); // បម្រើ index.html, main.js ...
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// rooms: ឈ្មោះបន្ទប់ → Map(socket.id → {id, name, look, s})
const rooms = new Map();

// សម្អាតទិន្នន័យដែលទទួលពីអ្នកលេង (កុំទុកចិត្ត client)
const cleanName = (n) => String(n || 'Player').replace(/[<>]/g, '').trim().slice(0, 16) || 'Player';
const cleanLook = (l) => ({ gender: l && l.gender === 'f' ? 'f' : 'm', outfit: Math.max(0, Math.min(2, (l && l.outfit) | 0)) });
const num = (v, lim = 500) => Math.max(-lim, Math.min(lim, Number(v) || 0));
function cleanState(s) {
  if (!s || typeof s !== 'object') return null;
  const out = { x: num(s.x), y: num(s.y, 50), z: num(s.z), r: num(s.r, 100), atk: num(s.atk, 2), mv: s.mv ? 1 : 0,
    w: s.w === 'knife' ? 'knife' : 'sword', look: cleanLook(s.look), v: null };
  if (s.v && ['moto', 'car', 'boat'].includes(s.v.t)) out.v = { t: s.v.t, x: num(s.v.x), z: num(s.v.z), h: num(s.v.h, 1000), c: num(s.v.c, 0xffffff) };
  return out;
}

io.on('connection', (socket) => {
  let room = null;

  // ចូលបន្ទប់
  socket.on('join', (data, cb) => {
    if (typeof cb !== 'function' || room) return;
    const r = String((data && data.room) || 'angkor').trim().slice(0, 20) || 'angkor';
    const players = rooms.get(r) || new Map();
    if (players.size >= MAX_PLAYERS) return cb({ ok: false, error: 'full' });
    room = r; rooms.set(r, players);
    const p = { id: socket.id, name: cleanName(data && data.name), look: cleanLook(data && data.look), s: null };
    players.set(socket.id, p);
    socket.join(r);
    cb({ ok: true, players: [...players.values()].filter((x) => x.id !== socket.id) });
    socket.to(r).emit('playerJoined', p);
    console.log(`[+] ${p.name} បានចូលបន្ទប់ "${r}" (${players.size}/${MAX_PLAYERS})`);
  });

  // ទីតាំង/ចលនា → ផ្ញើបន្តទៅអ្នកលេងផ្សេង
  socket.on('state', (s) => {
    const p = room && rooms.get(room) && rooms.get(room).get(socket.id);
    const st = cleanState(s);
    if (!p || !st) return;
    p.s = st; p.look = st.look;
    socket.to(room).volatile.emit('state', { id: socket.id, s: st });
  });

  // ការវាយ (PvP) → ផ្ញើទៅអ្នកលេងដែលត្រូវវាយ
  socket.on('hit', (d) => {
    const players = room && rooms.get(room);
    if (!players || !d || !players.has(d.to) || d.to === socket.id) return;
    io.to(d.to).emit('hit', { from: socket.id, dmg: Math.max(0, Math.min(40, Number(d.dmg) || 0)) });
  });

  // ការជជែក
  socket.on('chat', (msg) => {
    const p = room && rooms.get(room) && rooms.get(room).get(socket.id);
    if (!p) return;
    const text = String(msg || '').trim().slice(0, 120);
    if (text) io.to(room).emit('chat', { name: p.name, msg: text });
  });

  // ចាកចេញ
  socket.on('disconnect', () => {
    if (!room) return;
    const players = rooms.get(room);
    if (!players) return;
    const p = players.get(socket.id);
    players.delete(socket.id);
    socket.to(room).emit('playerLeft', socket.id);
    if (players.size === 0) rooms.delete(room);
    if (p) console.log(`[-] ${p.name} បានចាកចេញពីបន្ទប់ "${room}"`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log(' អង្គរ: ដំណើរផ្សងព្រេង — Server កំពុងដំណើរការ');
  console.log(`  កុំព្យូទ័រនេះ:  http://localhost:${PORT}`);
  // បង្ហាញអាសយដ្ឋាន LAN សម្រាប់មិត្តភក្តិ
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  LAN:          http://${a.address}:${PORT}`);
  }
  console.log('==============================================');
});
