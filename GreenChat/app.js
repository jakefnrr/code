"use strict";
/* GreenChat frontend. No localStorage. Session lives in HttpOnly cookie set by Worker. */
const API = (window.GREENCHAT_API || "").replace(/\/$/, "");
const api = (p, o = {}) => fetch(API + p, { credentials: "include", ...o });
const j = async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || r.status); return d; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const state = { me: null, convos: [], active: null, ws: null, wsRetry: 0, lastMsg: 0, poll: null };
const $ = (id) => document.getElementById(id);

function setConn(cls) { $("conn-dot").className = "dot " + cls; }
function avatarColor(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.codePointAt(0)) >>> 0; return `hsl(${h % 360} 55% 32%)`; }
function avatarHTML(u) { const t = esc((u.display || u.username || "?")).trim()[0] || "?"; return `<span class="avatar" style="background:${avatarColor(u.username)}">${t.toUpperCase()}</span>`; }
function fmtTs(t) { return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

async function boot() {
  $("backend-url").textContent = API || "(same origin)";
  try {
    state.me = await api("/api/me").then(j);
  } catch { state.me = null; }
  if (!state.me) { $("setup-overlay").classList.remove("hidden"); return; }
  onLogin();
}
function onLogin() {
  $("setup-overlay").classList.add("hidden");
  $("me-label").textContent = "@" + state.me.username;
  $("me-card").innerHTML = `${avatarHTML(state.me)}<div><b>${esc(state.me.display)}</b><br><span class="muted">@${esc(state.me.username)}</span></div>`;
  switchView("chats"); refreshAll(); connectWS();
}
$("setup-btn").onclick = async () => {
  const username = $("setup-username").value.trim(), display = $("setup-display").value.trim();
  try { state.me = await api("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, display }) }).then(j); onLogin(); }
  catch (e) { $("setup-error").textContent = e.message; }
};

function switchView(v) {
  document.querySelectorAll("#sidebar .nav-btn,#bottomnav .nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  ["chats", "friends", "requests", "search", "settings"].forEach(x => $("view-" + x).classList.toggle("hidden", x !== v));
  document.body.classList.remove("chatting");
}
document.querySelectorAll(".nav-btn").forEach(b => b.onclick = () => { switchView(b.dataset.view); if (b.dataset.view === "requests") loadRequests(); if (b.dataset.view === "chats") loadConvos(); });

async function refreshAll() { await Promise.all([loadConvos(), loadFriends(), loadRequests()]); }

async function loadConvos() {
  try {
    state.convos = await api("/api/convos").then(j);
    const f = ($("chat-filter").value || "").toLowerCase();
    $("chat-list").innerHTML = state.convos.filter(c => !f || c.peer.username.toLowerCase().includes(f)).map(c => `
      <div class="row ${state.active === c.id ? "active" : ""}" data-c="${c.id}">
        ${avatarHTML(c.peer)}<div class="grow"><b>${esc(c.peer.display)}</b> <span class="muted">@${esc(c.peer.username)}</span>
        <div class="sub">${esc(c.lastText || "No messages yet")}</div></div>
        ${c.unread ? `<span class="unread">${c.unread}</span>` : ""}
      </div>`).join("") || `<div class="empty">No chats yet. Add friends to start.</div>`;
    document.querySelectorAll("#chat-list .row").forEach(r => r.onclick = () => openChat(r.dataset.c));
  } catch (e) { setConn("offline"); }
}
$("chat-filter").oninput = loadConvos;

async function loadFriends() {
  const list = await api("/api/friends").then(j).catch(() => []);
  $("friend-list").innerHTML = list.map(u => `<div class="row">${avatarHTML(u)}<div class="grow"><b>${esc(u.display)}</b> <span class="muted">@${esc(u.username)}</span><div class="sub">${u.online ? "🟢 Online" : "⚪ Offline"}</div></div><button class="mini" data-chat="${u.id}">Chat</button><button class="mini" data-rm="${u.id}">Remove</button></div>`).join("") || `<div class="empty">No friends yet. Search for users above.</div>`;
  document.querySelectorAll("[data-chat]").forEach(b => b.onclick = async (e) => { e.stopPropagation(); const c = await api("/api/convos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peerId: b.dataset.chat }) }).then(j); switchView("chats"); await loadConvos(); openChat(c.id); });
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = async (e) => { e.stopPropagation(); if (!confirm("Remove friend?")) return; await api("/api/friends/" + b.dataset.rm, { method: "DELETE" }); refreshAll(); });
}

async function loadRequests() {
  const d = await api("/api/requests").then(j).catch(() => ({ incoming: [], outgoing: [] }));
  $("req-badge").classList.toggle("hidden", !d.incoming.length);
  $("req-badge").textContent = d.incoming.length || "";
  $("req-in").innerHTML = d.incoming.map(r => `<div class="row">${avatarHTML(r.from)}<div class="grow"><b>${esc(r.from.display)}</b> <span class="muted">@${esc(r.from.username)}</span></div><button class="mini ok" data-acc="${r.id}">Accept</button><button class="mini" data-dec="${r.id}">Decline</button></div>`).join("") || `<div class="empty">No incoming requests.</div>`;
  $("req-out").innerHTML = d.outgoing.map(r => `<div class="row">${avatarHTML(r.to)}<div class="grow"><b>${esc(r.to.display)}</b> <span class="muted">@${esc(r.to.username)}</span></div></div>`).join("") || `<div class="empty">No outgoing requests.</div>`;
  document.querySelectorAll("[data-acc]").forEach(b => b.onclick = async () => { await api("/api/requests/" + b.dataset.acc + "/accept", { method: "POST" }); refreshAll(); });
  document.querySelectorAll("[data-dec]").forEach(b => b.onclick = async () => { await api("/api/requests/" + b.dataset.dec + "/decline", { method: "POST" }); refreshAll(); });
}

let searchT;
$("search-input").oninput = () => { clearTimeout(searchT); searchT = setTimeout(async () => {
  const q = $("search-input").value.trim(); if (q.length < 2) { $("search-results").innerHTML = ""; return; }
  const res = await api("/api/users?q=" + encodeURIComponent(q)).then(j).catch(() => []);
  $("search-results").innerHTML = res.map(u => `<div class="row">${avatarHTML(u)}<div class="grow"><b>${esc(u.display)}</b> <span class="muted">@${esc(u.username)}</span></div><button class="mini ok" data-add="${u.id}">Add</button></div>`).join("") || `<div class="empty">No users found.</div>`;
  document.querySelectorAll("[data-add]").forEach(b => b.onclick = async () => { try { await api("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toId: b.dataset.add }) }); b.textContent = "Sent ✓"; b.disabled = true; } catch (e) { alert(e.message); } });
}, 300); };

$("set-save").onclick = async () => { try { state.me = await api("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display: $("set-display").value }) }).then(j); onLogin(); } catch (e) { alert(e.message); } };
$("set-logout").onclick = async () => { await api("/api/logout", { method: "POST" }); location.reload(); };
$("back-btn").onclick = () => { document.body.classList.remove("chatting"); state.active = null; closeWS(); loadConvos(); };

async function openChat(id) {
  state.active = id;
  document.body.classList.add("chatting");
  $("no-chat").classList.add("hidden"); $("active-chat").classList.remove("hidden");
  loadConvos();
  const c = state.convos.find(x => x.id === id);
  if (c) { $("peer-name").textContent = c.peer.display; $("peer-status").textContent = "@" + c.peer.username + (c.peer.online ? " • Online" : ""); $("peer-avatar").textContent = (c.peer.display[0] || "?").toUpperCase(); $("peer-avatar").style.background = avatarColor(c.peer.username); }
  await loadMessages(); connectWS();
}
async function loadMessages() {
  if (!state.active) return;
  const d = await api(`/api/convos/${state.active}/messages`).then(j).catch(() => ({ messages: [] }));
  renderMessages(d.messages || []);
  loadConvos();
}
function renderMessages(msgs) {
  state.lastMsg = msgs.reduce((m, x) => Math.max(m, x.ts), state.lastMsg);
  $("messages").innerHTML = msgs.map(m => `<div class="msg ${m.from === state.me.id ? "mine" : "theirs"}">${esc(m.text)}<span class="ts">${fmtTs(m.ts)}</span></div>`).join("");
  $("messages").scrollTop = $("messages").scrollHeight;
}
function appendLive(m) {
  if (m.convo !== state.active) { loadConvos(); return; }
  if (m.ts <= state.lastMsg) return;
  state.lastMsg = m.ts;
  const div = document.createElement("div");
  div.className = "msg " + (m.from === state.me.id ? "mine" : "theirs");
  div.innerHTML = `${esc(m.text)}<span class="ts">${fmtTs(m.ts)}</span>`;
  $("messages").appendChild(div); $("messages").scrollTop = $("messages").scrollHeight;
  api(`/api/convos/${state.active}/read`, { method: "POST" }).then(loadConvos);
}
$("send-form").onsubmit = async (e) => {
  e.preventDefault();
  const t = $("msg-input").value.trim(); if (!t || !state.active) return;
  $("msg-input").value = "";
  try {
    if (state.ws && state.ws.readyState === 1) state.ws.send(JSON.stringify({ text: t }));
    else { const m = await api(`/api/convos/${state.active}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) }).then(j); appendLive({ ...m, convo: state.active }); }
  } catch (err) { alert(err.message); }
};

function wsURL() {
  const base = API || location.origin;
  const u = new URL(base + "/api/ws" + (state.active ? "?convo=" + state.active : ""));
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
}
function closeWS() { try { state.ws && state.ws.close(); } catch {} state.ws = null; clearInterval(state.poll); }
function connectWS() {
  closeWS();
  if (!state.me) return;
  if (!("WebSocket" in window)) return startPoll();
  let ws;
  try { ws = new WebSocket(wsURL()); } catch { return startPoll(); }
  state.ws = ws;
  ws.onopen = () => { setConn("online"); state.wsRetry = 0; if (state.active) loadMessages(); };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === "msg") appendLive(m);
    else if (m.t === "typing" && m.convo === state.active && m.from !== state.me.id) { $("typing").textContent = "typing…"; $("typing").classList.remove("hidden"); clearTimeout(window._tt); window._tt = setTimeout(() => $("typing").classList.add("hidden"), 1500); }
    else if (m.t === "read" || m.t === "presence") loadConvos();
  };
  ws.onclose = () => { setConn("retry"); const d = Math.min(1000 * 2 ** state.wsRetry++, 15000); setTimeout(() => { if (state.me) connectWS(); }, d); startPoll(); };
  ws.onerror = () => { try { ws.close(); } catch {} };
  let ti; $("msg-input").oninput = () => { if (ws.readyState === 1 && state.active) { if (!ti || Date.now() - ti > 2000) { ws.send(JSON.stringify({ typing: true })); ti = Date.now(); } } };
}
function startPoll() { clearInterval(state.poll); state.poll = setInterval(() => { if (state.active) loadMessages(); else loadConvos(); }, 3000); }

boot();
