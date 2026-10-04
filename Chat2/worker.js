export class NeonChatRoom {
  constructor(state, env) { this.env = env; this.onlineSockets = new Map(); }
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const getSession = () => {
      const c = req.headers.get("Cookie") || "";
      const m = c.match /gc_session=([a-f0-9]+)/;
      return m ? m[1] : null;
    };

    const sha = async (s) => {
      const enc = new TextEncoder();
      const b = await crypto.subtle.digest("SHA-256", enc.encode(s));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
    };

    const rnd = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");

    const K = {
      user: (id) => `nc:user:${id}`,
      uname: (n) => `nc:uname:${n.toLowerCase()}`,
      sess: (t) => `nc:sess:${t}`,
      req: (id) => `nc:req:${id}`,
      reqs: (uid) => `nc:reqs:${uid}`,
      friends: (uid) => `nc:friends:${uid}`,
      convo: (id) => `nc:convo:${id}`,
      msgs: (id) => `nc:msgs:${id}`,
      unread: (c, u) => `nc:unread:${c}:${u}`,
      online: (uid) => `nc:online:${uid}`,
    };

    const kvGet = async (env, k, fb = null) => {
      try {
        const v = await env.SHARED_KV.get(k, "json");
        return v ?? fb;
      } catch { return fb; }
    };

    const kvPut = async (env, k, v) => {
      await env.SHARED_KV.put(k, JSON.stringify(v));
    };

    const jsonResp = (d, s = 200, extra = {}) => {
      const headers = { "Content-Type": "application/json", ...extra["headers"] || {} };
      return new Response(JSON.stringify(d), { status: s, headers });
    };

    const corsHeaders = () => ({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    const me = async (env, req) => {
      const t = getSession(req);
      if (!t) return null;
      const s = await kvGet(env, K.sess(await sha(t)));
      if (!s) return null;
      return kvGet(env, K.user(s.uid));
    };

    const getInbox = async (env, uid) => {
      const idxKey = "nc:usernames";
      const idx = await kvGet(env, idxKey, []) || [];
      return idx.filter((n) => n !== undefined);
    };

    const cidFor = (a, b) => "nc:convo:" + [a, b].sort().join("_");

    // -------- API: Register --------
    if (path === "/api/register" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const username = String(b.username || "").trim();
      const password = String(b.password || "default_pass");

      // Validation
      if (!username || username.length < 3 || username.length > 24)
        return jsonResp({ error: "Username: 3-24 chars, letters/numbers/_" }, 400);
      if (!/^[A-Za-z0-9_]+$/.test(username))
        return jsonResp({ error: "Username: letters, numbers, underscore only" }, 400);
      if (password.length < 4 || password.length > 128)
        return jsonResp({ error: "Password: at least 4 characters" }, 400);

      // Check taken
      const unameKey = K.uname(username);
      const existing = await kvGet(env, unameKey);
      if (existing) return jsonResp({ error: "Username taken" }, 409);

      // Create user
      const id = rnd(16);
      const lang = (b.lang && ["en", "fr", "th", "ja"].includes(b.lang)) ? b.lang : "en";
      const pwHash = await (async (pw, salt) => {
        const enc = new TextEncoder();
        const sha256 = await crypto.subtle.digest("SHA-256", enc.encode(salt + ":" + pw));
        return [...new Uint8Array(sha256)].map(x => x.toString(16).padStart(2, "0")).join("");
      })(password, rnd(8));

      const u = {
        id, username, lang, pw: pwHash,
        created: Date.now(), online: false, lastSeen: Date.now(),
      };

      const tok = rnd(32);
      await kvPut(env, K.user(id), u);
      await kvPut(env, unameKey, { id });
      await kvPut(env, K.sess(await sha(tok)), { uid: id, created: Date.now() });
      await kvPut(env, K.friends(id), []);
      await kvPut(env, K.reqs(id), []);
      const idx = await kvGet(env, "nc:usernames", []);
      if (!idx.includes(username)) { idx.push(username); await kvPut(env, "nc:usernames", idx.slice(-5000)); }
      await kvPut(env, K.online(id), false);

      return jsonResp({
        ok: true, user: { id: u.id, username: u.username, lang: u.lang, online: false },
        token: tok,
      }, 201, {
        headers: { "Set-Cookie": `gc_session=${tok}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000` },
        ...corsHeaders(),
      });
    }

    // -------- API: Login --------
    if (path === "/api/login" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const username = String(b.username || "").trim();

      const unameKey = K.uname(username);
      const ref = await kvGet(env, unameKey);
      if (!ref) return jsonResp({ error: "Username not found" }, 404);
      const usr = await kvGet(env, K.user(ref.id));
      if (!usr) return jsonResp({ error: "User data missing" }, 404);

      const tok = rnd(32);
      await kvPut(env, K.sess(await sha(tok)), { uid: usr.id, created: Date.now() });
      await kvPut(env, K.online(usr.id), true);

      return jsonResp({
        ok: true, user: { id: usr.id, username: usr.username, lang: usr.lang, online: true },
        token: tok,
      }, 200, {
        headers: { "Set-Cookie": `gc_session=${tok}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000` },
        ...corsHeaders(),
      });
    }

    // -------- API: Me --------
    const u = await me(env, req);
    if (!u) {
      // 401 unauthenticated - return JSON for API, HTML for page redirects handled client-side
      if (path.startsWith("/api/")) return jsonResp({ error: "Not signed in" }, 401);
    } else {
      await kvPut(env, K.online(u.id), true);
    }

    // -------- API: Me (GET) --------
    if (path === "/api/me" && req.method === "GET") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      return jsonResp({ user: { id: u.id, username: u.username, lang: u.lang, online: u.online } });
    }

    // -------- API: Me (PATCH - language) --------
    if (path === "/api/me" && req.method === "PATCH") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const b = await req.json().catch(() => ({}));
      if (["en", "fr", "th", "ja"].includes(b.lang)) { u.lang = b.lang; await kvPut(env, K.user(u.id), u); }
      return jsonResp({ user: { id: u.id, username: u.username, lang: u.lang, online: u.online } });
    }

    // -------- API: Logout --------
    if (path === "/api/logout" && req.method === "POST") {
      if (u) {
        await kvPut(env, K.online(u.id), false);
        const t = getSession(req);
        if (t) await env.SHARED_KV.delete(K.sess(await sha(t)));
      }
      return jsonResp({ ok: true }, 200, {
        headers: { "Set-Cookie": "gc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" },
        ...corsHeaders(),
      });
    }

    // -------- API: Users (search) --------
    if (path === "/api/users" && req.method === "GET") {
      const q = (url.searchParams.get("q") || "").toLowerCase().slice(0, 32);
      if (q.length < 2) return jsonResp([]);
      const idx = await kvGet(env, "nc:usernames", []) || [];
      const out = [];
      for (const n of idx.filter(x => x.toLowerCase().includes(q)).slice(0, 20)) {
        const ref = await kvGet(env, K.uname(n));
        if (!ref || ref.id === u?.id) continue;
        const usr = await kvGet(env, K.user(ref.id));
        if (usr) out.push({ id: usr.id, username: usr.username, lang: usr.lang });
      }
      return jsonResp(out);
    }

    // -------- API: Friends (GET) --------
    if (path === "/api/friends" && req.method === "GET") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const ids = await kvGet(env, K.friends(u.id), []) || [];
      const out = [];
      for (const fid of ids) {
        const f = await kvGet(env, K.user(fid));
        if (f) out.push({ id: f.id, username: f.username, lang: f.lang, online: !!(await kvGet(env, K.online(fid))) });
      }
      return jsonResp(out);
    }

    // -------- API: Friends (POST - send request) --------
    if (path === "/api/friends" && req.method === "POST") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const b = await req.json().catch(() => ({}));
      const toId = String(b.toId || "");
      if (!toId || toId === u.id) return jsonResp({ error: "Invalid recipient" }, 400);
      const target = await kvGet(env, K.user(toId));
      if (!target) return jsonResp({ error: "User not found" }, 404);

      const myF = await kvGet(env, K.friends(u.id), []) || [];
      if (myF.includes(toId)) return jsonResp({ error: "Already friends" }, 409);

      const ids = await kvGet(env, K.reqs(u.id), []) || [];
      for (const rid of ids) {
        const r = await kvGet(env, K.req(rid));
        if (r && r.status === "pending" && ((r.from === u.id && r.to === toId) || (r.from === toId && r.to === u.id)))
          return jsonResp({ error: "Request already pending" }, 409);
      }

      const rid = rnd(12);
      await kvPut(env, K.req(rid), { id: rid, from: u.id, to: toId, status: "pending", ts: Date.now() });
      await kvPut(env, K.reqs(u.id), [...ids, rid]);

      const tIds = await kvGet(env, K.reqs(toId), []) || [];
      await kvPut(env, K.reqs(toId), [...tIds, rid]);

      return jsonResp({ ok: true, id: rid }, 201, ...corsHeaders());
    }

    // -------- API: Requests (GET) --------
    if (path === "/api/requests" && req.method === "GET") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const ids = await kvGet(env, K.reqs(u.id), []) || [];
      const incoming = [], outgoing = [];
      for (const rid of ids) {
        const r = await kvGet(env, K.req(rid));
        if (!r || r.status !== "pending") continue;
        if (r.to === u.id) {
          const f = await kvGet(env, K.user(r.from));
          incoming.push({ id: rid, from: { id: f.id, username: f.username, lang: f.lang } });
        } else {
          const t = await kvGet(env, K.user(r.to));
          outgoing.push({ id: rid, to: { id: t.id, username: t.username, lang: t.lang } });
        }
      }
      return jsonResp({ incoming, outgoing });
    }

    // -------- API: Requests (POST - accept/decline) --------
    let m = path.match(/^\/api\/requests\/([a-f0-9]+)\/(accept|decline)$/);
    if (m && req.method === "POST") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const r = await kvGet(env, K.req(m[1]));
      if (!r || r.to !== u.id || r.status !== "pending") return jsonResp({ error: "Request not found" }, 404);
      r.status = m[2] === "accept" ? "accepted" : "declined";
      await kvPut(env, K.req(m[1]), r);

      if (r.status === "accepted") {
        for (const [a, b] of [[r.from, r.to], [r.to, r.from]]) {
          const f = await kvGet(env, K.friends(a), []) || [];
          if (!f.includes(b)) { f.push(b); await kvPut(env, K.friends(a), f); }
        }
      }
      return jsonResp({ ok: true, status: r.status });
    }

    // -------- API: Conversations (GET) --------
    if (path === "/api/convos" && req.method === "GET") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const myFriends = await kvGet(env, K.friends(u.id), []) || [];
      const out = [];
      for (const fid of myFriends) {
        const cid = cidFor(u.id, fid);
        const c = await kvGet(env, K.convo(cid)) || {};
        const peer = await kvGet(env, K.user(fid));
        const unread = await kvGet(env, K.unread(cid, u.id), 0) || 0;
        out.push({ id: cid, peer: { id: peer.id, username: peer.username, lang: peer.lang, online: !!(await kvGet(env, K.online(peer.id))) }, lastText: c.lastText || "", lastTs: c.lastTs || 0, unread });
      }
      out.sort((a, b) => b.lastTs - a.lastTs);
      return jsonResp(out);
    }

    // -------- API: Conversations (POST - create) --------
    if (path === "/api/convos" && req.method === "POST") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const b = await req.json().catch(() => ({}));
      const peerId = String(b.peerId || "");
      if (!peerId) return jsonResp({ error: "Peer ID required" }, 400);

      const peer = await kvGet(env, K.user(peerId));
      if (!peer) return jsonResp({ error: "User not found" }, 404);

      const myF = await kvGet(env, K.friends(u.id), []) || [];
      if (!myF.includes(peer.id)) return jsonResp({ error: "You must be friends to chat" }, 403);

      const cid = cidFor(u.id, peer.id);
      if (!await kvGet(env, K.convo(cid))) {
        await kvPut(env, K.convo(cid), { id: cid, members: [u.id, peer.id], lastText: "", lastTs: 0 });
      }
      return jsonResp({ id: cid }, 201);
    }

    // -------- API: Messages (GET) --------
    m = path.match(/^\/api\/convos\/([^/]+)\/messages$/);
    if (m) {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      const c = await kvGet(env, K.convo(m[1]));
      if (!c || !c.members.includes(u.id)) return jsonResp({ error: "No access" }, 403);
      if (req.method === "GET") {
        const msgs = await kvGet(env, K.msgs(m[1]), []) || [];
        await kvPut(env, K.unread(m[1], u.id), 0);
        return jsonResp({ messages: msgs });
      }
      if (req.method === "POST") {
        if (!u) return jsonResp({ error: "Not signed in" }, 401);
        const b = await req.json().catch(() => ({}));
        const text = String(b.text || "").trim();
        if (!text) return jsonResp({ error: "Message cannot be empty" }, 400);

        // Rate limit: 20 msgs / 60s
        const rlKey = `nc:rl:${u.id}`;
        const rl = await kvGet(env, rlKey, []) || [];
        const now = Date.now(), win = rl.filter(t => now - t < 60000);
        if (win.length >= 20) return jsonResp({ error: "Slow down — rate limit" }, 429);
        win.push(now); await kvPut(env, rlKey, win);

        // Save message
        const msg = { id: rnd(12), from: u.id, text, ts: Date.now() };
        const msgs = await kvGet(env, K.msgs(m[1]), []) || [];
        msgs.push(msg); await kvPut(env, K.msgs(m[1]), msgs.slice(-500));

        // Update conversation
        await kvPut(env, K.convo(m[1]), { ...c, lastText: text.slice(0, 120), lastTs: msg.ts });

        // Update unread for other members
        for (const mId of c.members) {
          if (mId !== u.id) {
            const uUnread = (await kvGet(env, K.unread(m[1], mId), 0)) || 0;
            await kvPut(env, K.unread(m[1], mId), uUnread + 1);
          }
        }

        return jsonResp(msg, 201);
      }
    }

    // -------- API: Conversations (POST - read) --------
    m = path.match(/^\/api\/convos\/([^/]+)\/read$/);
    if (m && req.method === "POST") {
      if (!u) return jsonResp({ error: "Not signed in" }, 401);
      await kvPut(env, K.unread(m[1], u.id), 0);
      return jsonResp({ ok: true });
    }

    return jsonResp({ error: "Not found: " + path }, 404);
  }
}

export default {
  async fetch(request, env) {
    const room = new NeonChatRoom(null, env);
    return room.fetch(request);
  },
};