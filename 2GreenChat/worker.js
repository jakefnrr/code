// worker.js — GreenChat standalone backend (Cloudflare Worker + KV + Durable Objects)
// Deploy: npx wrangler deploy
// Docs: see README.md

// ========== Durable Object: ChatHub ==========
// Manages WebSocket connections and broadcasts real-time events to connected clients.
export class ChatHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = [];
  }

  async fetch(request) {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const token = url.searchParams.get('token');
      if (!token) return new Response('No token', { status: 401 });
      const userId = await this.env.KV.get(`session:${token}`);
      if (!userId) return new Response('Invalid session', { status: 401 });

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.connections.push({ ws: server, userId });
      server.accept();

      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') server.send(JSON.stringify({ type: 'pong' }));
        } catch (e) {}
      });

      server.addEventListener('close', () => {
        this.connections = this.connections.filter((c) => c.ws !== server);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // Internal broadcast from Worker
    if (url.pathname === '/notify') {
      try {
        const { event, data, participants } = await request.json();
        for (const c of this.connections) {
          if (!participants || participants.includes(c.userId)) {
            c.ws.send(JSON.stringify({ type: event, data }));
          }
        }
      } catch (e) {}
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }
}

// ========== Constants ==========
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
const MAX_TEXT = 500;
const OTP_TTL = 600; // 10 minutes
const RESET_TTL = 3600; // 1 hour
const PBKDF2_ITERATIONS = 100000;

// ========== Helpers ==========
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateId() { return crypto.randomUUID(); }
function generateOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
function reverseTs() { return String(9999999999999 - Date.now()).padStart(13, '0'); }

async function sendEmail(env, to, subject, html) {
  if (!env.RESEND_API_KEY) throw new Error('Email service not configured. Set RESEND_API_KEY secret.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM || 'GreenChat <onboarding@resend.dev>', to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${await res.text()}`);
}

async function getAuthUserId(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) throw new Error('Unauthorized');
  const token = auth.slice(7);
  const userId = await env.KV.get(`session:${token}`);
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

async function getUser(env, userId) {
  const d = await env.KV.get(`user:id:${userId}`);
  return d ? JSON.parse(d) : null;
}

async function getProfile(env, userId) {
  const d = await env.KV.get(`profile:${userId}`);
  return d ? JSON.parse(d) : null;
}

async function notify(env, event, data, participants) {
  try {
    const id = env.CHAT_HUB.idFromName('global');
    const stub = env.CHAT_HUB.get(id);
    await stub.fetch('https://chat-hub/notify', {
      method: 'POST',
      body: JSON.stringify({ event, data, participants }),
    });
  } catch (e) {}
}

function otpHtml(code) {
  return `<div style="font-family:sans-serif;max-width:400px;margin:auto">
    <h2 style="color:#10b981">GreenChat</h2>
    <p>Your verification code is:</p>
    <h1 style="font-size:32px;letter-spacing:8px;color:#10b981">${code}</h1>
    <p>This code expires in 10 minutes.</p>
  </div>`;
}

function resetHtml(url) {
  return `<div style="font-family:sans-serif;max-width:400px;margin:auto">
    <h2 style="color:#10b981">GreenChat</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="${url}" style="color:#10b981">${url}</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, ignore this email.</p>
  </div>`;
}

// ========== Auth Handlers ==========
async function handleRegister(request, env) {
  const { email, password } = await body(request);
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

  const ekey = `user:${email.toLowerCase()}`;
  if (await env.KV.get(ekey)) return json({ error: 'An account with this email already exists' }, 409);

  const id = generateId();
  const salt = generateToken();
  const passwordHash = await hashPassword(password, salt);
  const user = { id, email, passwordHash, salt, verified: false, createdAt: Date.now() };
  await env.KV.put(ekey, JSON.stringify(user));
  await env.KV.put(`user:id:${id}`, JSON.stringify(user));

  const otp = generateOtp();
  await env.KV.put(`otp:${email.toLowerCase()}`, JSON.stringify({ code: otp, expiresAt: Date.now() + 600000 }), { expirationTtl: OTP_TTL });
  await sendEmail(env, email, 'Your GreenChat verification code', otpHtml(otp));
  return json({ ok: true });
}

async function handleVerifyOtp(request, env) {
  const { email, code } = await body(request);
  if (!email || !code) return json({ error: 'Email and code are required' }, 400);

  const otpData = await env.KV.get(`otp:${email.toLowerCase()}`);
  if (!otpData) return json({ error: 'No verification code found. Please register again.' }, 400);
  const otp = JSON.parse(otpData);
  if (otp.code !== code) return json({ error: 'Invalid verification code' }, 400);
  if (Date.now() > otp.expiresAt) return json({ error: 'Verification code expired' }, 400);

  const user = JSON.parse(await env.KV.get(`user:${email.toLowerCase()}`));
  user.verified = true;
  await env.KV.put(`user:${email.toLowerCase()}`, JSON.stringify(user));
  await env.KV.put(`user:id:${user.id}`, JSON.stringify(user));
  await env.KV.delete(`otp:${email.toLowerCase()}`);

  const token = generateToken();
  await env.KV.put(`session:${token}`, user.id);
  return json({ ok: true, token, user: { id: user.id, email: user.email, verified: true } });
}

async function handleResendOtp(request, env) {
  const { email } = await body(request);
  if (!email) return json({ error: 'Email is required' }, 400);
  const user = await env.KV.get(`user:${email.toLowerCase()}`);
  if (!user) return json({ ok: true });

  const otp = generateOtp();
  await env.KV.put(`otp:${email.toLowerCase()}`, JSON.stringify({ code: otp, expiresAt: Date.now() + 600000 }), { expirationTtl: OTP_TTL });
  await sendEmail(env, email, 'Your GreenChat verification code', otpHtml(otp));
  return json({ ok: true });
}

async function handleLogin(request, env) {
  const { email, password } = await body(request);
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);

  const userData = await env.KV.get(`user:${email.toLowerCase()}`);
  if (!userData) return json({ error: 'Invalid email or password' }, 401);
  const user = JSON.parse(userData);
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) return json({ error: 'Invalid email or password' }, 401);
  if (!user.verified) return json({ error: 'Please verify your email first' }, 403);

  const token = generateToken();
  await env.KV.put(`session:${token}`, user.id);
  return json({ ok: true, token, user: { id: user.id, email: user.email, verified: true } });
}

async function handleLogout(request, env) {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) await env.KV.delete(`session:${auth.slice(7)}`);
  return json({ ok: true });
}

async function handleMe(request, env) {
  const userId = await getAuthUserId(request, env);
  const user = await getUser(env, userId);
  const profile = await getProfile(env, userId);
  return json({ user: { id: user.id, email: user.email }, profile });
}

async function handleResetRequest(request, env) {
  const { email } = await body(request);
  if (!email) return json({ error: 'Email is required' }, 400);

  const userData = await env.KV.get(`user:${email.toLowerCase()}`);
  if (userData) {
    const user = JSON.parse(userData);
    const token = generateToken();
    await env.KV.put(`reset:${token}`, JSON.stringify({ userId: user.id, expiresAt: Date.now() + 3600000 }), { expirationTtl: RESET_TTL });
    const appUrl = env.APP_URL || 'https://jakescalzo.me/2GreenChat/index.html';
    await sendEmail(env, email, 'Reset your GreenChat password', resetHtml(`${appUrl}#/reset?token=${token}`));
  }
  return json({ ok: true });
}

async function handleResetPassword(request, env) {
  const { token, password } = await body(request);
  if (!token || !password) return json({ error: 'Token and password are required' }, 400);
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

  const resetData = await env.KV.get(`reset:${token}`);
  if (!resetData) return json({ error: 'Invalid or expired reset link' }, 400);
  const reset = JSON.parse(resetData);
  if (Date.now() > reset.expiresAt) return json({ error: 'Reset link expired' }, 400);

  const user = await getUser(env, reset.userId);
  if (!user) return json({ error: 'Account not found' }, 400);
  const salt = generateToken();
  user.salt = salt;
  user.passwordHash = await hashPassword(password, salt);
  await env.KV.put(`user:${user.email.toLowerCase()}`, JSON.stringify(user));
  await env.KV.put(`user:id:${user.id}`, JSON.stringify(user));
  await env.KV.delete(`reset:${token}`);
  return json({ ok: true });
}

// ========== Profile Handlers ==========
async function handleGetProfile(request, env) {
  const userId = await getAuthUserId(request, env);
  const profile = await getProfile(env, userId);
  return json({ profile });
}

async function handleUpdateProfile(request, env) {
  const userId = await getAuthUserId(request, env);
  const { username, displayName, bio, avatarColor } = await body(request);
  if (!username || !username.trim()) return json({ error: 'Username is required' }, 400);

  const lower = username.trim().toLowerCase();
  const existing = await env.KV.get(`username:${lower}`);
  if (existing && existing !== userId) return json({ error: 'That username is taken' }, 409);

  const profile = {
    userId,
    username: username.trim(),
    displayName: (displayName || '').trim(),
    bio: (bio || '').trim(),
    avatarColor: avatarColor || String(Math.floor(Math.random() * 360)),
  };
  await env.KV.put(`profile:${userId}`, JSON.stringify(profile));
  await env.KV.put(`username:${lower}`, userId);
  return json({ profile });
}

// ========== User Search ==========
async function handleSearchUsers(request, env) {
  const userId = await getAuthUserId(request, env);
  const q = (new URL(request.url).searchParams.get('q') || '').toLowerCase();
  if (!q) return json({ results: [] });

  const result = await env.KV.list({ prefix: 'username:', limit: 1000 });
  const results = [];
  for (const key of result.keys) {
    const uname = key.name.slice('username:'.length);
    if (!uname.includes(q)) continue;
    const uid = await env.KV.get(key.name);
    if (uid === userId) continue;
    const profile = await getProfile(env, uid);
    if (profile) results.push({ userId: uid, username: profile.username, displayName: profile.displayName, avatarColor: profile.avatarColor });
    if (results.length >= 12) break;
  }
  return json({ results });
}

// ========== Friends Handlers ==========
async function handleGetFriends(request, env) {
  const userId = await getAuthUserId(request, env);
  const result = await env.KV.list({ prefix: `fri:${userId}:` });
  const friends = [];
  for (const key of result.keys) {
    const fid = key.name.split(':')[2];
    const fData = await env.KV.get(`friendship:${fid}`);
    if (!fData) continue;
    const f = JSON.parse(fData);
    if (f.status !== 'accepted') continue;
    friends.push({ userId: f.fromUserId === userId ? f.toUserId : f.fromUserId, username: f.fromUserId === userId ? f.toUsername : f.fromUsername });
  }
  return json({ friends });
}

async function handleGetRequests(request, env) {
  const userId = await getAuthUserId(request, env);
  const result = await env.KV.list({ prefix: `frq:${userId}:` });
  const requests = [];
  for (const key of result.keys) {
    const fid = key.name.split(':')[2];
    const fData = await env.KV.get(`friendship:${fid}`);
    if (!fData) continue;
    const f = JSON.parse(fData);
    if (f.status !== 'pending') continue;
    requests.push({ id: f.id, fromUserId: f.fromUserId, fromUsername: f.fromUsername });
  }
  return json({ requests });
}

async function handleGetSent(request, env) {
  const userId = await getAuthUserId(request, env);
  const result = await env.KV.list({ prefix: `frs:${userId}:` });
  const sent = [];
  for (const key of result.keys) {
    const fid = key.name.split(':')[2];
    const fData = await env.KV.get(`friendship:${fid}`);
    if (!fData) continue;
    const f = JSON.parse(fData);
    if (f.status !== 'pending') continue;
    sent.push({ id: f.id, toUserId: f.toUserId, toUsername: f.toUsername });
  }
  return json({ sent });
}

async function handleFriendRequest(request, env) {
  const userId = await getAuthUserId(request, env);
  const { toUserId } = await body(request);
  if (!toUserId) return json({ error: 'Target user is required' }, 400);
  if (toUserId === userId) return json({ error: 'You cannot add yourself' }, 400);

  const myProfile = await getProfile(env, userId);
  if (!myProfile) return json({ error: 'Please create your profile first' }, 400);
  const targetProfile = await getProfile(env, toUserId);
  if (!targetProfile) return json({ error: 'User not found' }, 404);

  const result = await env.KV.list({ prefix: `fri:${userId}:` });
  for (const key of result.keys) {
    const fid = key.name.split(':')[2];
    const fData = await env.KV.get(`friendship:${fid}`);
    if (!fData) continue;
    const f = JSON.parse(fData);
    const other = f.fromUserId === userId ? f.toUserId : f.fromUserId;
    if (other === toUserId) {
      if (f.status === 'accepted') return json({ error: 'You are already friends' }, 409);
      if (f.status === 'pending') return json({ error: 'Friend request already sent' }, 409);
    }
  }

  const id = generateId();
  const friendship = { id, fromUserId: userId, fromUsername: myProfile.username, toUserId, toUsername: targetProfile.username, status: 'pending', createdAt: Date.now() };
  await env.KV.put(`friendship:${id}`, JSON.stringify(friendship));
  await env.KV.put(`fri:${userId}:${id}`, '1');
  await env.KV.put(`fri:${toUserId}:${id}`, '1');
  await env.KV.put(`frq:${toUserId}:${id}`, '1');
  await env.KV.put(`frs:${userId}:${id}`, '1');
  await notify(env, 'friend_request', { fromUserId: userId, fromUsername: myProfile.username }, [toUserId]);
  return json({ ok: true });
}

async function handleAcceptFriend(request, env) {
  const userId = await getAuthUserId(request, env);
  const { friendshipId } = await body(request);
  if (!friendshipId) return json({ error: 'Friendship ID is required' }, 400);

  const fData = await env.KV.get(`friendship:${friendshipId}`);
  if (!fData) return json({ error: 'Friend request not found' }, 404);
  const f = JSON.parse(fData);
  if (f.toUserId !== userId) return json({ error: 'Not authorized' }, 403);
  if (f.status !== 'pending') return json({ error: 'Already processed' }, 400);

  f.status = 'accepted';
  await env.KV.put(`friendship:${friendshipId}`, JSON.stringify(f));
  await env.KV.delete(`frq:${userId}:${friendshipId}`);
  await env.KV.delete(`frs:${f.fromUserId}:${friendshipId}`);
  await notify(env, 'friend_accept', { fromUserId: userId, fromUsername: f.toUsername }, [f.fromUserId]);
  return json({ ok: true });
}

async function handleDeclineFriend(request, env) {
  const userId = await getAuthUserId(request, env);
  const { friendshipId } = await body(request);
  if (!friendshipId) return json({ error: 'Friendship ID is required' }, 400);

  const fData = await env.KV.get(`friendship:${friendshipId}`);
  if (!fData) return json({ error: 'Friend request not found' }, 404);
  const f = JSON.parse(fData);
  if (f.toUserId !== userId) return json({ error: 'Not authorized' }, 403);

  await env.KV.delete(`friendship:${friendshipId}`);
  await env.KV.delete(`fri:${userId}:${friendshipId}`);
  await env.KV.delete(`fri:${f.fromUserId}:${friendshipId}`);
  await env.KV.delete(`frq:${userId}:${friendshipId}`);
  await env.KV.delete(`frs:${f.fromUserId}:${friendshipId}`);
  return json({ ok: true });
}

// ========== Groups Handlers ==========
async function handleGetGroups(request, env) {
  const userId = await getAuthUserId(request, env);
  const result = await env.KV.list({ prefix: `grp:${userId}:` });
  const groups = [];
  for (const key of result.keys) {
    const gid = key.name.split(':')[2];
    const gData = await env.KV.get(`group:${gid}`);
    if (gData) groups.push(JSON.parse(gData));
  }
  return json({ groups });
}

async function handleCreateGroup(request, env) {
  const userId = await getAuthUserId(request, env);
  const { name } = await body(request);
  if (!name || !name.trim()) return json({ error: 'Group name is required' }, 400);

  const myProfile = await getProfile(env, userId);
  if (!myProfile) return json({ error: 'Please create your profile first' }, 400);

  const id = generateId();
  const group = { id, name: name.trim(), ownerId: userId, members: [userId], memberUsernames: [myProfile.username], createdAt: Date.now() };
  await env.KV.put(`group:${id}`, JSON.stringify(group));
  await env.KV.put(`grp:${userId}:${id}`, '1');
  return json({ group });
}

async function handleAddMember(request, env, path) {
  const userId = await getAuthUserId(request, env);
  const groupId = path.split('/')[3];
  const { userId: newMemberId } = await body(request);
  if (!groupId || !newMemberId) return json({ error: 'Group ID and user ID are required' }, 400);

  const gData = await env.KV.get(`group:${groupId}`);
  if (!gData) return json({ error: 'Group not found' }, 404);
  const group = JSON.parse(gData);
  if (group.ownerId !== userId) return json({ error: 'Only the group owner can add members' }, 403);
  if (group.members.includes(newMemberId)) return json({ error: 'User is already a member' }, 400);

  const newMemberProfile = await getProfile(env, newMemberId);
  if (!newMemberProfile) return json({ error: 'User not found' }, 404);

  group.members.push(newMemberId);
  group.memberUsernames.push(newMemberProfile.username);
  await env.KV.put(`group:${groupId}`, JSON.stringify(group));
  await env.KV.put(`grp:${newMemberId}:${groupId}`, '1');
  return json({ ok: true });
}

// ========== Messages Handlers ==========
async function handleGetMessages(request, env, path) {
  const userId = await getAuthUserId(request, env);
  const chatId = decodeURIComponent(path.split('/').pop());
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  if (chatId.startsWith('group_')) {
    const gData = await env.KV.get(`group:${chatId.slice(6)}`);
    if (!gData) return json({ error: 'Group not found' }, 404);
    if (!JSON.parse(gData).members.includes(userId)) return json({ error: 'Not authorized' }, 403);
  } else {
    if (!chatId.split('_').includes(userId)) return json({ error: 'Not authorized' }, 403);
  }

  const result = await env.KV.list({ prefix: `msg:${chatId}:`, limit, cursor });
  const messages = result.keys.map((k) => k.metadata).filter(Boolean).reverse();
  return json({ messages, cursor: result.list_complete ? null : result.cursor });
}

async function handleSendMessage(request, env) {
  const userId = await getAuthUserId(request, env);
  const { chatId, text, participants } = await body(request);
  if (!chatId || !text || !text.trim()) return json({ error: 'Chat ID and text are required' }, 400);
  if (text.length > MAX_TEXT) return json({ error: `Message too long (${MAX_TEXT} char max)` }, 400);
  if (!participants || !participants.includes(userId)) return json({ error: 'Not authorized' }, 403);

  const myProfile = await getProfile(env, userId);
  if (!myProfile) return json({ error: 'Please create your profile first' }, 400);

  const msgId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const message = { id: msgId, chatId, senderId: userId, senderUsername: myProfile.username, text: text.trim(), timestamp: Date.now(), participants };
  await env.KV.put(`msg:${chatId}:${reverseTs()}:${msgId}`, '', { metadata: message });
  await notify(env, 'message', message, participants);
  return json({ message });
}

// ========== WebSocket ==========
async function handleWebSocket(request, env) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return new Response('No token', { status: 401 });
  if (!(await env.KV.get(`session:${token}`))) return new Response('Invalid session', { status: 401 });
  const id = env.CHAT_HUB.idFromName('global');
  return env.CHAT_HUB.get(id).fetch(request);
}

// ========== Main Worker ==========
export default {
  async fetch(request, env) {
    const { pathname: path, method } = new URL(request.url);

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.headers.get('Upgrade') === 'websocket') return handleWebSocket(request, env);
    if (path === '/api/health') return json({ ok: true });

    try {
      if (path === '/api/auth/register' && method === 'POST') return await handleRegister(request, env);
      if (path === '/api/auth/verify-otp' && method === 'POST') return await handleVerifyOtp(request, env);
      if (path === '/api/auth/resend-otp' && method === 'POST') return await handleResendOtp(request, env);
      if (path === '/api/auth/login' && method === 'POST') return await handleLogin(request, env);
      if (path === '/api/auth/logout' && method === 'POST') return await handleLogout(request, env);
      if (path === '/api/auth/me' && method === 'GET') return await handleMe(request, env);
      if (path === '/api/auth/reset-request' && method === 'POST') return await handleResetRequest(request, env);
      if (path === '/api/auth/reset-password' && method === 'POST') return await handleResetPassword(request, env);
      if (path === '/api/profile' && method === 'GET') return await handleGetProfile(request, env);
      if (path === '/api/profile' && method === 'PUT') return await handleUpdateProfile(request, env);
      if (path === '/api/users/search' && method === 'GET') return await handleSearchUsers(request, env);
      if (path === '/api/friends' && method === 'GET') return await handleGetFriends(request, env);
      if (path === '/api/friends/requests' && method === 'GET') return await handleGetRequests(request, env);
      if (path === '/api/friends/sent' && method === 'GET') return await handleGetSent(request, env);
      if (path === '/api/friends/request' && method === 'POST') return await handleFriendRequest(request, env);
      if (path === '/api/friends/accept' && method === 'POST') return await handleAcceptFriend(request, env);
      if (path === '/api/friends/decline' && method === 'POST') return await handleDeclineFriend(request, env);
      if (path === '/api/groups' && method === 'GET') return await handleGetGroups(request, env);
      if (path === '/api/groups' && method === 'POST') return await handleCreateGroup(request, env);
      if (path.startsWith('/api/groups/') && path.endsWith('/members') && method === 'POST') return await handleAddMember(request, env, path);
      if (path.startsWith('/api/messages/') && method === 'GET') return await handleGetMessages(request, env, path);
      if (path === '/api/messages' && method === 'POST') return await handleSendMessage(request, env);
      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: err.message?.includes('Unauthorized') ? 'Unauthorized' : (err.message || 'Server error') }, err.message?.includes('Unauthorized') ? 401 : 500);
    }
  },
};