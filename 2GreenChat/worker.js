const HTML_UTF8 = 'text/html;charset=UTF-8';
const JS_UTF8 = 'application/javascript;charset=UTF-8';
const CSS_UTF8 = 'text/css;charset=UTF-8';

const kv = GREENCHAT_KV;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      ...headers,
    },
  });
}

function textResponse(content, status = 200, contentType = 'text/plain; charset=utf-8') {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    },
  });
}

function parseBody(request) {
  return request.json().catch(() => ({}));
}

function randomId(label = 'id') {
  return `${label}_${crypto.getRandomValues(new Uint8Array(16)).reduce((acc, x) => acc + x.toString(16).padStart(2, '0'), '')}`;
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((chunk) => parseInt(chunk, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      iterations: 120000,
      hash: 'SHA-256',
      salt,
    },
    key,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getUserByUsername(username) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized) return null;
  const key = `user:username:${normalized}`;
  const raw = await kv.get(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function getUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;
  const key = `user:email:${normalized}`;
  const userId = await kv.get(key);
  if (!userId) return null;
  return getUserById(userId);
}

async function getUserById(id) {
  if (!id) return null;
  const raw = await kv.get(`user:id:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function setUser(user) {
  await kv.put(`user:id:${user.id}`, JSON.stringify(user));
  await kv.put(`user:username:${user.username.toLowerCase()}`, user.id);
  await kv.put(`user:email:${user.email.toLowerCase()}`, user.id);
}

function getCookieHeader(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  const found = cookies.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? found.split('=').slice(1).join('=') : null;
}

async function getSessionUser(request) {
  const sessionId = getCookieHeader(request, 'greenchat_session');
  if (!sessionId) return null;
  const sessionRaw = await kv.get(`session:${sessionId}`);
  if (!sessionRaw) return null;
  const session = JSON.parse(sessionRaw);
  const user = await getUserById(session.userId);
  if (!user) return null;
  return user;
}

async function createSession(userId) {
  const id = randomId('session');
  await kv.put(`session:${id}`, JSON.stringify({ userId, createdAt: Date.now() }), { expirationTtl: 60 * 60 * 24 * 7 });
  return id;
}

async function rateLimit(key, limit, ttlSeconds) {
  const current = await kv.get(`rate:${key}`);
  const now = Date.now();
  if (!current) {
    await kv.put(`rate:${key}`, JSON.stringify({ count: 1, startedAt: now }), { expirationTtl: ttlSeconds });
    return true;
  }

  const parsed = JSON.parse(current);
  if (now - parsed.startedAt > ttlSeconds * 1000) {
    await kv.put(`rate:${key}`, JSON.stringify({ count: 1, startedAt: now }), { expirationTtl: ttlSeconds });
    return true;
  }

  if (parsed.count >= limit) return false;
  parsed.count += 1;
  await kv.put(`rate:${key}`, JSON.stringify(parsed), { expirationTtl: ttlSeconds });
  return true;
}

function normalizeUsername(name) {
  return String(name || '').trim().toLowerCase();
}

async function createConversationBetween(userIdA, userIdB) {
  const ids = [userIdA, userIdB].sort();
  const key = `conversation:${ids[0]}:${ids[1]}`;
  const existing = await kv.get(key);
  if (existing) return JSON.parse(existing);

  const conversation = {
    id: randomId('conversation'),
    participants: ids,
    name: 'Direct chat',
    messages: [],
    createdAt: Date.now(),
  };

  await kv.put(key, JSON.stringify(conversation));

  const userA = await getUserById(userIdA);
  const userB = await getUserById(userIdB);
  if (userA) {
    userA.conversations = [...new Set([...(userA.conversations || []), conversation.id])];
    await setUser(userA);
  }
  if (userB) {
    userB.conversations = [...new Set([...(userB.conversations || []), conversation.id])];
    await setUser(userB);
  }

  return conversation;
}

async function getConversationById(id) {
  const raw = await kv.get(`conversation:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function getConversationForUsers(userIdA, userIdB) {
  const ids = [userIdA, userIdB].sort();
  const key = `conversation:${ids[0]}:${ids[1]}`;
  const raw = await kv.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function ensureFriendship(userIdA, userIdB) {
  const a = await getUserById(userIdA);
  const b = await getUserById(userIdB);
  if (!a || !b) return false;
  const key = `friendship:${[userIdA, userIdB].sort().join(':')}`;
  const existing = await kv.get(key);
  if (existing) return true;

  const record = {
    userA: userIdA,
    userB: userIdB,
    status: 'accepted',
    createdAt: Date.now(),
  };
  await kv.put(key, JSON.stringify(record));
  return true;
}

async function addFriendRequest(fromUserId, toUserId) {
  const key = `friendrequest:${[fromUserId, toUserId].sort().join(':')}`;
  const existing = await kv.get(key);
  if (existing) return false;

  const record = {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: Date.now(),
  };
  await kv.put(key, JSON.stringify(record));
  return true;
}

async function getFriendRequestsForUser(userId) {
  const allKeys = await kv.list({ prefix: 'friendrequest:' });
  const results = [];
  for (const item of allKeys.keys) {
    const record = JSON.parse(await kv.get(item.name));
    if (record.toUserId === userId && record.status === 'pending') {
      const user = await getUserById(record.fromUserId);
      results.push({ userId: record.fromUserId, username: user.username, displayName: user.displayName || user.username });
    }
  }
  return results;
}

async function getFriendsForUser(userId) {
  const allKeys = await kv.list({ prefix: 'friendship:' });
  const list = [];
  for (const item of allKeys.keys) {
    const record = JSON.parse(await kv.get(item.name));
    if (record.status !== 'accepted') continue;
    const [a, b] = [record.userA, record.userB];
    if (a === userId || b === userId) {
      const otherId = a === userId ? b : a;
      const user = await getUserById(otherId);
      if (user) list.push({ id: user.id, username: user.username, displayName: user.displayName || user.username, email: user.email });
    }
  }
  return list;
}

async function getFriendsStatusForUser(userId) {
  const friendships = await getFriendsForUser(userId);
  const requests = await getFriendRequestsForUser(userId);
  return { friends: friendships, requests };
}

async function normalizeMessageRecord(record) {
  const sender = await getUserById(record.senderId);
  return {
    id: record.id,
    senderId: record.senderId,
    senderName: sender ? (sender.displayName || sender.username) : 'User',
    content: record.content,
    createdAt: record.createdAt,
  };
}

async function getUserSafe(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    createdAt: user.createdAt,
  };
}

async function createUserRecord({ email, username, password }) {
  const normalizedUsername = normalizeUsername(username);
  const existingUsername = await getUserByUsername(normalizedUsername);
  if (existingUsername) throw new Error('Username already exists.');

  const existingEmail = await getUserByEmail(email);
  if (existingEmail) throw new Error('Email already in use.');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const passwordHash = await hashPassword(password, saltHex);

  const user = {
    id: randomId('user'),
    username: normalizedUsername,
    email: String(email).trim().toLowerCase(),
    displayName: normalizedUsername,
    passwordHash,
    salt: saltHex,
    conversations: [],
    createdAt: Date.now(),
  };

  await setUser(user);
  return user;
}

async function verifyLogin(username, password) {
  const user = await getUserByUsername(normalizeUsername(username));
  if (!user) {
    const byEmail = await getUserByEmail(username);
    if (byEmail) return verifyLogin(byEmail.username, password);
    return null;
  }

  const hashed = await hashPassword(password, user.salt);
  if (hashed === user.passwordHash) return user;
  return null;
}

function getPathSegments(url) {
  return url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const segments = getPathSegments(url);
  const route = segments.slice(2).join('/');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie' } });
  }

  if (route === 'me') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    return json({ user: await getUserSafe(user) }, 200);
  }

  if (route === 'register') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (!await rateLimit(`register:${request.headers.get('CF-Connecting-IP') || 'unknown'}`, 8, 300)) {
      return json({ error: 'Too many registrations. Please try again later.' }, 429);
    }
    const payload = await parseBody(request);
    if (!payload.email || !payload.username || !payload.password) return json({ error: 'Missing required fields.' }, 400);
    if (!String(payload.email).trim().toLowerCase().endsWith('@gmail.com')) return json({ error: 'Use a Gmail address ending in @gmail.com.' }, 400);
    if (String(payload.password).length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
    try {
      const user = await createUserRecord({ email: payload.email, username: payload.username, password: payload.password });
      return json({ ok: true, user: await getUserSafe(user) }, 201);
    } catch (error) {
      return json({ error: error.message || 'Registration failed.' }, 400);
    }
  }

  if (route === 'login') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const payload = await parseBody(request);
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '');
    const user = await verifyLogin(username, password);
    if (!user) return json({ error: 'Invalid username or password.' }, 401);
    const sessionId = await createSession(user.id);
    return new Response(JSON.stringify({ ok: true, user: await getUserSafe(user) }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `greenchat_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      }
    });
  }

  if (route === 'logout') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const sessionId = getCookieHeader(request, 'greenchat_session');
    if (sessionId) await kv.delete(`session:${sessionId}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 'greenchat_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      }
    });
  }

  if (route === 'reset-validate') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const payload = await parseBody(request);
    const email = String(payload.email || '').trim().toLowerCase();
    const username = String(payload.username || '').trim();
    if (!email || !username) return json({ error: 'Both Gmail and username are required.' }, 400);
    if (!email.endsWith('@gmail.com')) return json({ error: 'Use a Gmail address.' }, 400);
    if (!await rateLimit(`reset:${request.headers.get('CF-Connecting-IP') || 'unknown'}`, 10, 300)) {
      return json({ error: 'Too many reset attempts. Please try again later.' }, 429);
    }

    const user = await getUserByUsername(normalizeUsername(username));
    if (!user) return json({ error: 'We could not verify that account.' }, 400);
    if (user.email.toLowerCase() !== email.toLowerCase()) return json({ error: 'We could not verify that account.' }, 400);
    return json({ ok: true }, 200);
  }

  if (route === 'reset-set') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const payload = await parseBody(request);
    const email = String(payload.email || '').trim().toLowerCase();
    const username = String(payload.username || '').trim();
    const newPassword = String(payload.newPassword || '');
    if (!email || !username || !newPassword) return json({ error: 'Missing fields' }, 400);
    if (newPassword.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
    if (!await rateLimit(`resetset:${request.headers.get('CF-Connecting-IP') || 'unknown'}`, 8, 300)) {
      return json({ error: 'Too many reset attempts. Please try again later.' }, 429);
    }

    const user = await getUserByUsername(normalizeUsername(username));
    if (!user) return json({ error: 'We could not update that password.' }, 400);
    if (user.email.toLowerCase() !== email.toLowerCase()) return json({ error: 'We could not update that password.' }, 400);

    const saltHex = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
    user.salt = saltHex;
    user.passwordHash = await hashPassword(newPassword, saltHex);
    await setUser(user);

    return json({ ok: true }, 200);
  }

  if (route === 'users/search') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) return json({ users: [] }, 200);

    const list = await kv.list({ prefix: 'user:id:' });
    const matches = [];
    for (const item of list.keys) {
      const record = JSON.parse(await kv.get(item.name));
      if (!record || record.id === user.id) continue;
      const haystack = `${record.username} ${record.displayName || ''}`.toLowerCase();
      if (haystack.includes(q)) matches.push({ id: record.id, username: record.username, displayName: record.displayName || record.username });
    }
    return json({ users: matches.slice(0, 20) }, 200);
  }

  if (route === 'friends') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const friends = await getFriendsForUser(user.id);
    return json({ friends }, 200);
  }

  if (route === 'friends/requests') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const requests = await getFriendRequestsForUser(user.id);
    return json({ requests }, 200);
  }

  if (route === 'friends/request') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const payload = await parseBody(request);
    const targetId = payload.userId;
    const target = await getUserById(targetId);
    if (!target) return json({ error: 'User not found.' }, 404);
    const added = await addFriendRequest(user.id, target.id);
    if (!added) return json({ error: 'Request already exists.' }, 409);
    return json({ ok: true }, 200);
  }

  if (route === 'friends/action') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const payload = await parseBody(request);
    const { action, userId } = payload;
    const key = `friendrequest:${[userId, user.id].sort().join(':')}`;
    const record = await kv.get(key);
    if (!record) return json({ error: 'No such request.' }, 404);
    const parsed = JSON.parse(record);
    if (parsed.toUserId !== user.id && parsed.fromUserId !== user.id) return json({ error: 'Not allowed' }, 403);

    if (action === 'accept') {
      parsed.status = 'accepted';
      await kv.put(key, JSON.stringify(parsed));
      await ensureFriendship(user.id, userId);
      const conversation = await createConversationBetween(user.id, userId);
      return json({ ok: true, conversationId: conversation.id }, 200);
    }

    if (action === 'reject') {
      parsed.status = 'rejected';
      await kv.put(key, JSON.stringify(parsed));
      return json({ ok: true }, 200);
    }

    return json({ error: 'Unknown action.' }, 400);
  }

  if (route === 'conversations') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const allKeys = await kv.list({ prefix: 'conversation:' });
    const conversations = [];
    for (const item of allKeys.keys) {
      const conversation = JSON.parse(await kv.get(item.name));
      const allowed = conversation.participants.includes(user.id);
      if (!allowed) continue;
      const partnerId = conversation.participants.find((id) => id !== user.id);
      const partner = await getUserById(partnerId);
      const lastMessage = conversation.messages && conversation.messages.length ? conversation.messages[conversation.messages.length - 1] : null;
      conversations.push({
        id: conversation.id,
        name: partner ? (partner.displayName || partner.username) : 'Unknown user',
        preview: lastMessage ? lastMessage.content : 'No messages yet',
        unread: 0,
      });
    }
    return json({ conversations }, 200);
  }

  if (route === 'conversations/open') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const payload = await parseBody(request);
    const otherUser = await getUserById(payload.userId);
    if (!otherUser) return json({ error: 'User not found.' }, 404);
    const conversation = await createConversationBetween(user.id, otherUser.id);
    return json({ conversationId: conversation.id }, 200);
  }

  if (route === 'messages') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const conversationId = String(url.searchParams.get('conversationId') || '').trim();
    const conversation = await getConversationById(conversationId);
    if (!conversation || !conversation.participants.includes(user.id)) return json({ error: 'Conversation not found.' }, 404);
    const messages = await Promise.all((conversation.messages || []).map(normalizeMessageRecord));
    return json({ messages }, 200);
  }

  if (route === 'messages/send') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const payload = await parseBody(request);
    const conversationId = payload.conversationId;
    const content = String(payload.content || '').trim();
    if (!conversationId || !content) return json({ error: 'Conversation ID and message are required.' }, 400);
    const conversation = await getConversationById(conversationId);
    if (!conversation || !conversation.participants.includes(user.id)) return json({ error: 'Conversation not found.' }, 404);

    const message = {
      id: randomId('message'),
      senderId: user.id,
      content,
      createdAt: Date.now(),
    };
    conversation.messages = [...(conversation.messages || []), message];
    await kv.put(`conversation:${conversation.id}`, JSON.stringify(conversation));
    return json({ ok: true, message }, 200);
  }

  if (route === 'settings') {
    if (request.method === 'POST') {
      const user = await getSessionUser(request);
      if (!user) return json({ error: 'Not logged in' }, 401);
      const payload = await parseBody(request);
      const newUsername = String(payload.username || '').trim();
      const newEmail = String(payload.email || '').trim().toLowerCase();
      const displayName = String(payload.displayName || '').trim();

      if (newUsername && normalizeUsername(newUsername) !== user.username.toLowerCase()) {
        const existing = await getUserByUsername(normalizeUsername(newUsername));
        if (existing && existing.id !== user.id) return json({ error: 'Username already exists.' }, 409);
        user.username = normalizeUsername(newUsername);
      }

      if (newEmail && newEmail !== user.email.toLowerCase()) {
        const existing = await getUserByEmail(newEmail);
        if (existing && existing.id !== user.id) return json({ error: 'Email already exists.' }, 409);
        user.email = newEmail;
      }

      if (displayName) user.displayName = displayName;
      await setUser(user);
      return json({ ok: true, user: await getUserSafe(user) }, 200);
    }

    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    return json({ user: await getUserSafe(user) }, 200);
  }

  if (route === 'settings/password') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    const payload = await parseBody(request);
    const newPassword = String(payload.newPassword || '');
    if (newPassword.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
    const saltHex = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
    user.salt = saltHex;
    user.passwordHash = await hashPassword(newPassword, saltHex);
    await setUser(user);
    return json({ ok: true }, 200);
  }

  if (route === 'settings/delete') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const user = await getSessionUser(request);
    if (!user) return json({ error: 'Not logged in' }, 401);
    await kv.delete(`user:id:${user.id}`);
    await kv.delete(`user:username:${user.username.toLowerCase()}`);
    await kv.delete(`user:email:${user.email.toLowerCase()}`);
    return json({ ok: true }, 200);
  }

  return json({ error: 'Not found.' }, 404);
}

async function serveStaticFile(pathname) {
  const normalized = pathname.replace(/^\/+/,'').replace(/^2GreenChat\//,'');
  if (normalized === 'index.html') {
    return textResponse(await fetch('https://jakescalzo.me/2GreenChat/index.html').then(r => r.text()).catch(() => 'Not found'), 200, HTML_UTF8);
  }
  if (normalized === 'style.css') {
    return textResponse(`/* generated by worker */\n`, 200, CSS_UTF8);
  }
  if (normalized === 'app.js') {
    return textResponse(`console.log('GreenChat worker loaded');`, 200, JS_UTF8);
  }
  return textResponse('Not found', 404, 'text/plain;charset=UTF-8');
}

addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === '/2GreenChat/' || pathname === '/2GreenChat') {
    event.respondWith(fetch('https://jakescalzo.me/2GreenChat/index.html'));
    return;
  }

  if (pathname === '/2GreenChat/index.html' || pathname === '/2GreenChat/style.css' || pathname === '/2GreenChat/app.js') {
    event.respondWith(fetch(request));
    return;
  }

  if (pathname.startsWith('/2GreenChat/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  event.respondWith(textResponse('Not found', 404, 'text/plain;charset=UTF-8'));
});
