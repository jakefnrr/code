// server.js - Express + WebSocket chat backend
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('better-sqlite3');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ----- SQLite setup (single file: chat.db) -----
const db = new sqlite3(path.join(__dirname, 'chat.db'), { readonly: false });

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL
  );
  CREATE TABLE IF NOT EXISTS friendships (
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Helper: get user by username
function getUserByUsername(username) {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  return row; // {id, username} or null
}

// ----- REST Routes -----

// POST /api/login - authenticate (or create) a user
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username required' });
  let user = getUserByUsername(username);
  if (!user) {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const info = stmt.run(username);
    user = { id: info.lastInsertRowid, username };
  }
  res.json({ user });
});

// GET /api/users - list all usernames
app.get('/api/users', (req, res) => {
  const rows = db.prepare('SELECT id, username FROM users').all();
  res.json({ users: rows.map(r => ({ id: r.id, username: r.username })) });
});

// POST /api/friends - add mutual friendship
app.post('/api/friends', (req, res) => {
  const { currentUser, friend } = req.body;
  if (!currentUser || !friend) return res.status(400).json({ message: 'Missing data' });

  const user = getUserByUsername(currentUser);
  const friendUser = getUserByUsername(friend);
  if (!user || !friendUser) return res.status(404).json({ message: 'User not found' });

  const stmt = db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)');
  stmt.run(user.id, friendUser.id);
  stmt.run(friendUser.id, user.id); // mutual
  res.json({ ok: true });
});

// GET /api/users/:username/friends - fetch friend list
app.get('/api/users/:username/friends', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const rows = db.prepare(`
    SELECT u.id, u.username FROM users u
    JOIN friendships f ON (f.friend_id = u.id)
    WHERE f.user_id = ?
  `).all(user.id);
  res.json({ friends: rows.map(r => ({ id: r.id, username: r.username })) });
});

// POST /api/messages - store a message (optional history)
app.post('/api/messages', (req, res) => {
  const { from, to, content } = req.body;
  const sender = getUserByUsername(from);
  const receiver = getUserByUsername(to);
  if (!sender || !receiver) return res.status(404).json({ message: 'User not found' });

  const stmt = db.prepare(
    'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
  );
  stmt.run(sender.id, receiver.id, content);
  res.json({ ok: true });
});

// GET /api/messages/:user1/:user2 - fetch history between two users
app.get('/api/messages/:user1/:user2', (req, res) => {
  const u1 = getUserByUsername(req.params.user1);
  const u2 = getUserByUsername(req.params.user2);
  if (!u1 || !u2) return res.status(404).json({ message: 'User not found' });

  const rows = db.prepare(`
    SELECT m.id, m.content, m.created_at,
           u.username AS from_username
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(u1.id, u2.id, u2.id, u1.id);

  res.json({ messages: rows });
});

// ----- WebSocket Server -----
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Map: username -> WebSocket instance
const userWsMap = {};

wss.on('connection', ws => {
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'auth':
          const user = getUserByUsername(msg.username);
          if (user) {
            userWsMap[msg.username] = ws;
            ws.username = msg.username;
            ws.send(JSON.stringify({ type: 'auth_ok' }));
          } else {
            ws.send(JSON.stringify({ type: 'auth_err', message: 'User not found' }));
          }
          break;

        case 'private_message':
          const recipientWs = userWsMap[msg.to];
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'new_message',
              from: msg.from,
              content: msg.content
            }));
          } else {
            console.log(`User ${msg.to} not online; would need DB store for offline.`);
          }
          break;

        default:
          console.log('Unknown WS msg type:', msg.type);
      }
    } catch (e) {
      console.error('WS message parse error:', e);
    }
  });

  ws.on('close', () => {
    if (ws.username) {
      delete userWsMap[ws.username];
    }
  });
});

// ----- Port & Start -----
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat server listening on http://localhost:${PORT}`);
});