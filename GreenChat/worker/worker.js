/**
 * GreenChat Worker — realtime chat backend.
 * Frontend (GreenChat/) -> this Worker -> Durable Object (WebSocket) -> KV (shared-store) for persistence.
 * Deploy from GreenChat/:  wrangler deploy
 */
export class ChatRoom {
  constructor(state, env) { this.state = state; this.env = env; this.sockets = new Map(); }
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("need websocket", { status: 426 });
      const uid = url.searchParams.get("uid");
      if (!uid) return new Response("unauthorized", { status: 401 });
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();
      this.sockets.set(uid, server);
      await this.state.storage.put("online:" + uid, Date.now());
      this.broadcast({ t: "presence", uid }, uid);
      server.addEventListener("message", async (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m.typing) { this.broadcast({ t: "typing", from: uid, convo: m.convo }, uid); return; }
        if (m.text && m.convo) {
          const msg = await saveMessage(this.env, m.convo, uid, String(m.text).slice(0, 2000));
          if (msg) this.broadcast({ t: "msg", ...msg, convo: m.convo });
        }
      });
      const close = async () => { this.sockets.delete(uid); await this.state.storage.delete("online:" + uid); this.broadcast({ t: "presence", uid }); };
      server.addEventListener("close", close); server.addEventListener("error", close);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response("ok");
  }
  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const [uid, ws] of this.sockets) { if (uid === except) continue; try { ws.send(s); } catch {} }
  }
}

const enc = new TextEncoder();
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", enc.encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const rnd = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");
const K = { user: id => `gc:user:${id}`, uname: n => `gc:uname:${n.toLowerCase()}`, sess: t => `gc:sess:${t}`, req: id => `gc:req:${id}`, reqs: uid => `gc:reqs:${uid}`, friends: uid => `gc:friends:${uid}`, convo: id => `gc:convo:${id}`, msgs: id => `gc:msgs:${id}`, unread: (c, u) => `gc:unread:${c}:${u}` };
async function kvGet(env, k, fb = null) { try { const v = await env.SHARED_KV.get(k, "json"); return v ?? fb; } catch { return fb; } }
async function kvPut(env, k, v) { await env.SHARED_KV.put(k, JSON.stringify(v)); }
const json = (d, s = 200, extra = {}) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json", ...cors(), ...extra } });
function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Credentials": "true" }; }
function cookie(req) { const h = req.headers.get("Cookie") || ""; const m = h.match(/gc_session=([a-f0-9]+)/); return m ? m[1] : null; }
async function me(env, req) { const t = cookie(req); if (!t) return null; const s = await kvGet(env, K.sess(await sha(t))); if (!s) return null; return kvGet(env, K.user(s.uid)); }
async function saveMessage(env, convoId, from, text) {
  const c = await kvGet(env, K.convo(convoId)); if (!c || !c.members.includes(from)) return null;
  text = text.trim().slice(0, 2000); if (!text) return null;
  const msg = { id: rnd(12), from, text, ts: Date.now() };
  const msgs = (await kvGet(env, K.msgs(convoId), [])) || [];
  msgs.push(msg); await kvPut(env, K.msgs(convoId), msgs.slice(-500));
  await kvPut(env, K.convo(convoId), { ...c, lastText: text.slice(0, 120), lastTs: msg.ts });
  for (const m of c.members) if (m !== from) { const u = (await kvGet(env, K.unread(convoId, m), 0)) || 0; await kvPut(env, K.unread(convoId, m), u + 1); }
  return msg;
}
const pub = (u) => u ? { id: u.id, username: u.username, display: u.display, online: !!u.online } : null;
async function markOnline(env, u, on) { u.online = on; u.lastSeen = Date.now(); await kvPut(env, K.user(u.id), u); }

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    const needKV = ["/api/register", "/api/me", "/api/convos", "/api/friends", "/api/requests", "/api/users", "/api/logout", "/api/ws"];
    if (needKV.some(p => path.startsWith(p)) && !env.SHARED_KV) return json({ error: "SHARED_KV not bound" }, 501);

    // Realtime socket: auth via session, DO room per user for fan-out
    if (path === "/api/ws") {
      const u = await me(env, req);
      if (!u) return new Response("unauthorized", { status: 401 });
      await markOnline(env, u, true);
      const id = env.CHAT_ROOM.idFromName("global");
      const room = env.CHAT_ROOM.get(id);
      return room.fetch("https://do/ws?uid=" + u.id);
    }

    if (path === "/api/register" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const username = String(b.username || "").trim();
      if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return json({ error: "Username: 3-24 chars, letters/numbers/_" }, 400);
      if (await kvGet(env, K.uname(username))) return json({ error: "Username taken" }, 409);
      const id = rnd(16);
      const u = { id, username, display: String(b.display || username).slice(0, 40) || username, created: Date.now(), online: true, lastSeen: Date.now() };
      const tok = rnd(32);
      await kvPut(env, K.user(id), u); await kvPut(env, K.uname(username), { id });
      await kvPut(env, K.sess(await sha(tok)), { uid: id, created: Date.now() });
      await kvPut(env, K.friends(id), []); await kvPut(env, K.reqs(id), []);
      const idx = (await kvGet(env, "gc:usernames", [])) || [];
      if (!idx.includes(username)) { idx.push(username); await kvPut(env, "gc:usernames", idx.slice(-5000)); }
      return json(pub(u), 201, { "Set-Cookie": `gc_session=${tok}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000` });
    }

    const u = await me(env, req);
    if (!u) return json({ error: "Not signed in" }, 401);
    const body = async () => { try { return await req.json(); } catch { return {}; } };

    if (path === "/api/me" && req.method === "GET") return json(pub(u));
    if (path === "/api/me" && req.method === "PATCH") {
      const b = await body();
      if (b.display !== undefined) u.display = String(b.display).slice(0, 40) || u.username;
      await kvPut(env, K.user(u.id), u); return json(pub(u));
    }
    if (path === "/api/logout" && req.method === "POST") {
      const t = cookie(req); if (t) await env.SHARED_KV.delete(K.sess(await sha(t)));
      await markOnline(env, u, false);
      return json({ ok: true }, 200, { "Set-Cookie": "gc_session=; HttpOnly; Path=/; Max-Age=0" });
    }
    if (path === "/api/users" && req.method === "GET") {
      const q = (url.searchParams.get("q") || "").toLowerCase().slice(0, 32);
      if (q.length < 2) return json([]);
      const idx = (await kvGet(env, "gc:usernames", [])) || [];
      const out = [];
      for (const n of idx.filter(x => x.toLowerCase().includes(q)).slice(0, 20)) {
        const ref = await kvGet(env, K.uname(n)); if (!ref || ref.id === u.id) continue;
        const usr = await kvGet(env, K.user(ref.id)); if (usr) out.push(pub(usr));
      }
      return json(out);
    }

    // ---- Friend requests ----
    if (path === "/api/requests" && req.method === "GET") {
      const ids = (await kvGet(env, K.reqs(u.id), [])) || [];
      const incoming = [], outgoing = [];
      for (const rid of ids) {
        const r = await kvGet(env, K.req(rid)); if (!r || r.status !== "pending") continue;
        if (r.to === u.id) { const f = await kvGet(env, K.user(r.from)); incoming.push({ id: rid, from: pub(f) }); }
        else { const t = await kvGet(env, K.user(r.to)); outgoing.push({ id: rid, to: pub(t) }); }
      }
      return json({ incoming, outgoing });
    }
    if (path === "/api/requests" && req.method === "POST") {
      const b = await body();
      const toId = String(b.toId || "");
      if (!toId || toId === u.id) return json({ error: "Invalid recipient" }, 400);
      const target = await kvGet(env, K.user(toId));
      if (!target) return json({ error: "User not found" }, 404);
      const myF = (await kvGet(env, K.friends(u.id), [])) || [];
      if (myF.includes(toId)) return json({ error: "Already friends" }, 409);
      const ids = (await kvGet(env, K.reqs(u.id), [])) || [];
      for (const rid of ids) { const r = await kvGet(env, K.req(rid)); if (r && r.status === "pending" && ((r.from === u.id && r.to === toId) || (r.from === toId && r.to === u.id))) return json({ error: "Request already pending" }, 409); }
      const rid = rnd(12);
      await kvPut(env, K.req(rid), { id: rid, from: u.id, to: toId, status: "pending", ts: Date.now() });
      await kvPut(env, K.reqs(u.id), [...ids, rid]);
      const tIds = (await kvGet(env, K.reqs(toId), [])) || [];
      await kvPut(env, K.reqs(toId), [...tIds, rid]);
      return json({ ok: true, id: rid }, 201);
    }
    let m = path.match(/^\/api\/requests\/([a-f0-9]+)\/(accept|decline)$/);
    if (m && req.method === "POST") {
      const r = await kvGet(env, K.req(m[1]));
      if (!r || r.to !== u.id || r.status !== "pending") return json({ error: "Request not found" }, 404);
      r.status = m[2] === "accept" ? "accepted" : "declined";
      await kvPut(env, K.req(m[1]), r);
      if (r.status === "accepted") {
        for (const [a, b] of [[r.from, r.to], [r.to, r.from]]) {
          const f = (await kvGet(env, K.friends(a), [])) || [];
          if (!f.includes(b)) { f.push(b); await kvPut(env, K.friends(a), f); }
        }
      }
      return json({ ok: true, status: r.status });
    }

    // ---- Friends ----
    if (path === "/api/friends" && req.method === "GET") {
      const ids = (await kvGet(env, K.friends(u.id), [])) || [];
      const out = [];
      for (const fid of ids) { const f = await kvGet(env, K.user(fid)); if (f) out.push(pub(f)); }
      return json(out);
    }
    m = path.match(/^\/api\/friends\/([a-f0-9]+)$/);
    if (m && req.method === "DELETE") {
      for (const [a, b] of [[u.id, m[1]], [m[1], u.id]]) {
        const f = ((await kvGet(env, K.friends(a), [])) || []).filter(x => x !== b);
        await kvPut(env, K.friends(a), f);
      }
      return json({ ok: true });
    }

    // ---- Conversations (1:1 between friends) ----
    const cidFor = (a, b) => "dm_" + [a, b].sort().join("_");
    if (path === "/api/convos" && req.method === "GET") {
      const ids = (await kvGet(env, K.friends(u.id), [])) || [];
      const out = [];
      for (const fid of ids) {
        const cid = cidFor(u.id, fid);
        const c = (await kvGet(env, K.convo(cid))) || {};
        const peer = await kvGet(env, K.user(fid));
        out.push({ id: cid, peer: pub(peer), lastText: c.lastText || "", lastTs: c.lastTs || 0, unread: (await kvGet(env, K.unread(cid, u.id), 0)) || 0 });
      }
      out.sort((a, b) => b.lastTs - a.lastTs);
      return json(out);
    }
    if (path === "/api/convos" && req.method === "POST") {
      const b = await body();
      const peer = await kvGet(env, K.user(String(b.peerId || "")));
      if (!peer) return json({ error: "User not found" }, 404);
      const myF = (await kvGet(env, K.friends(u.id), [])) || [];
      if (!myF.includes(peer.id)) return json({ error: "You must be friends to chat" }, 403);
      const cid = cidFor(u.id, peer.id);
      if (!await kvGet(env, K.convo(cid))) await kvPut(env, K.convo(cid), { id: cid, members: [u.id, peer.id], lastText: "", lastTs: 0 });
      return json({ id: cid }, 201);
    }
    m = path.match(/^\/api\/convos\/([^/]+)\/messages$/);
    if (m) {
      const c = await kvGet(env, K.convo(m[1]));
      if (!c || !c.members.includes(u.id)) return json({ error: "No access" }, 403);
      if (req.method === "GET") {
        const msgs = (await kvGet(env, K.msgs(m[1]), [])) || [];
        await kvPut(env, K.unread(m[1], u.id), 0);
        return json({ messages: msgs });
      }
      if (req.method === "POST") {
        const b = await body();
        // simple per-user rate limit: 20 msgs / 60s
        const rl = (await kvGet(env, `gc:rl:${u.id}`, [])) || [];
        const now = Date.now(), win = rl.filter(t => now - t < 60000);
        if (win.length >= 20) return json({ error: "Slow down — rate limit" }, 429);
        win.push(now); await kvPut(env, `gc:rl:${u.id}`, win);
        const msg = await saveMessage(env, m[1], u.id, String(b.text || ""));
        if (!msg) return json({ error: "Empty message" }, 400);
        return json(msg, 201);
      }
    }
    m = path.match(/^\/api\/convos\/([^/]+)\/read$/);
    if (m && req.method === "POST") { await kvPut(env, K.unread(m[1], u.id), 0); return json({ ok: true }); }

    return json({ error: "Not found: " + path }, 404);
  }
};
