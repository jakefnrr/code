"use strict";
/* GreenChat frontend. No localStorage. Session lives in HttpOnly cookie set by Worker. */
const API = (window.GREENCHAT_API || "").replace(/\/$/, "");
const api = (p, o = {}) => fetch(API + p, { credentials: "include", ...o });
const j = async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || r.status); return d; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const state = { me: null, convos: [], active: null, ws: null, wsRetry: 0, lastMsg: 0, poll: null, lang: "en" };

const STRINGS = {
en: {"home-btn":"ALL PROJECTS","fab-account":"Make an account","login-title":"Log in","setup-pass-ph":"Password","setup-have":"Already have an account?","setup-login-link":"Login","setup-login-btn":"Login","setup-back-create":"Back to create account","setup-new":"Make a new account","nav-chats":"Chats","nav-friends":"Friends","nav-requests":"Requests","nav-search":"Search","nav-settings":"Settings","setup-lang-p":"Choose your language","setup-user-p":"Choose a username to get started.","setup-user-ph":"Choose a username","setup-btn":"Create my account","chats-filter":"Search chats...","search-ph":"Search by username...","msg-ph":"Message...","chat-empty":"Select a conversation to start messaging.","req-incoming":"Incoming","req-outgoing":"Outgoing","settings-lang":"Language","settings-logout":"Log out this device","del-btn":"Delete my account","del-sure1":"Are you sure you want to delete your account?","del-sure2":"Are you really sure? This cannot be undone.","del-yes":"Yes, continue","del-confirm":"Yes, delete it","del-cancel":"Cancel","chats-empty":"No chats yet. Add friends to start.","convo-nomsgs":"No messages yet","friends-empty":"No friends yet. Search for users above.","online":"🟢 Online","offline":"⚪ Offline","btn-chat":"Chat","btn-remove":"Remove","btn-accept":"Accept","btn-decline":"Decline","btn-add":"Add","btn-sent":"Sent ✓","req-empty-in":"No incoming requests.","req-empty-out":"No outgoing requests.","search-empty":"No users found.","friends-confirm":"Remove friend?","typing":"typing…","st-online":"Online","st-offline":"Offline"},
th: {"home-btn":"โปรเจกต์ทั้งหมด","fab-account":"สร้างบัญชี","login-title":"เข้าสู่ระบบ","setup-pass-ph":"รหัสผ่าน","setup-have":"มีบัญชีอยู่แล้ว?","setup-login-link":"เข้าสู่ระบบ","setup-login-btn":"เข้าสู่ระบบ","setup-back-create":"กลับไปสร้างบัญชี","setup-new":"สร้างบัญชีใหม่","nav-chats":"แชท","nav-friends":"เพื่อน","nav-requests":"คำขอ","nav-search":"ค้นหา","nav-settings":"ตั้งค่า","setup-lang-p":"เลือกภาษาของคุณ","setup-user-p":"เลือกชื่อผู้ใช้เพื่อเริ่มต้น","setup-user-ph":"เลือกชื่อผู้ใช้","setup-btn":"สร้างบัญชีของฉัน","chats-filter":"ค้นหาแชท...","search-ph":"ค้นหาด้วยชื่อผู้ใช้...","msg-ph":"ข้อความ...","chat-empty":"เลือกการสนทนาเพื่อเริ่มส่งข้อความ","req-incoming":"คำขอที่ได้รับ","req-outgoing":"คำขอที่ส่ง","settings-lang":"ภาษา","settings-logout":"ออกจากระบบอุปกรณ์นี้","del-btn":"ลบบัญชีของฉัน","del-sure1":"คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี?","del-sure2":"แน่ใจจริงๆ หรือ? การกระทำนี้ไม่สามารถย้อนกลับได้","del-yes":"ใช่ ดำเนินการต่อ","del-confirm":"ใช่ ลบเลย","del-cancel":"ยกเลิก","chats-empty":"ยังไม่มีแชท เพิ่มเพื่อนเพื่อเริ่มต้น","convo-nomsgs":"ยังไม่มีข้อความ","friends-empty":"ยังไม่มีเพื่อน ค้นหาผู้ใช้ด้านบน","online":"🟢 ออนไลน์","offline":"⚪ ออฟไลน์","btn-chat":"แชท","btn-remove":"ลบ","btn-accept":"ยอมรับ","btn-decline":"ปฏิเสธ","btn-add":"เพิ่ม","btn-sent":"ส่งแล้ว ✓","req-empty-in":"ไม่มีคำขอที่ได้รับ","req-empty-out":"ไม่มีคำขอที่ส่ง","search-empty":"ไม่พบผู้ใช้","friends-confirm":"ลบเพื่อน?","typing":"กำลังพิมพ์…","st-online":"ออนไลน์","st-offline":"ออฟไลน์"},
fr: {"home-btn":"Tous les projets","fab-account":"Créer un compte","login-title":"Connexion","setup-pass-ph":"Mot de passe","setup-have":"Déjà un compte ?","setup-login-link":"Connexion","setup-login-btn":"Se connecter","setup-back-create":"Retour à la création","setup-new":"Créer un nouveau compte","nav-chats":"Discussions","nav-friends":"Amis","nav-requests":"Demandes","nav-search":"Recherche","nav-settings":"Réglages","setup-lang-p":"Choisissez votre langue","setup-user-p":"Choisissez un pseudo pour commencer.","setup-user-ph":"Choisissez un pseudo","setup-btn":"Créer mon compte","chats-filter":"Rechercher...","search-ph":"Rechercher par pseudo...","msg-ph":"Message...","chat-empty":"Sélectionnez une conversation pour commencer.","req-incoming":"Reçues","req-outgoing":"Envoyées","settings-lang":"Langue","settings-logout":"Déconnecter cet appareil","del-btn":"Supprimer mon compte","del-sure1":"Voulez-vous vraiment supprimer votre compte ?","del-sure2":"Vraiment sûr ? Cette action est irréversible.","del-yes":"Oui, continuer","del-confirm":"Oui, supprimer","del-cancel":"Annuler","chats-empty":"Aucune discussion. Ajoutez des amis.","convo-nomsgs":"Aucun message","friends-empty":"Aucun ami. Recherchez des utilisateurs ci-dessus.","online":"🟢 En ligne","offline":"⚪ Hors ligne","btn-chat":"Discuter","btn-remove":"Retirer","btn-accept":"Accepter","btn-decline":"Refuser","btn-add":"Ajouter","btn-sent":"Envoyé ✓","req-empty-in":"Aucune demande reçue.","req-empty-out":"Aucune demande envoyée.","search-empty":"Aucun utilisateur trouvé.","friends-confirm":"Retirer cet ami ?","typing":"écrit…","st-online":"En ligne","st-offline":"Hors ligne"}
};
const t = (k) => (STRINGS[state.lang] && STRINGS[state.lang][k]) || STRINGS.en[k] || k;
function applyLang(l) {
  state.lang = STRINGS[l] ? l : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-setlang]").forEach(b => b.classList.toggle("sel", b.dataset.setlang === state.lang));
}
const $ = (id) => document.getElementById(id);

function setConn(cls) { $("conn-dot").className = "dot " + cls; }
function avatarColor(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.codePointAt(0)) >>> 0; return `hsl(${h % 360} 55% 32%)`; }
function avatarHTML(u) { const t = esc((u.username || "?")).trim()[0] || "?"; return `<span class="avatar" style="background:${avatarColor(u.username)}">${t.toUpperCase()}</span>`; }
function fmtTs(t) { return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

async function boot() {
  try {
    state.me = await api("/api/me").then(j);
  } catch { state.me = null; }
  if (!state.me) {
    applyLang("en");
    $("setup-lang-step").classList.remove("hidden");
    $("setup-user-step").classList.add("hidden");
    $("setup-login-step").classList.add("hidden");
    $("setup-overlay").classList.remove("hidden");
    $("fab-account").classList.remove("hidden");
    $("bottom-left-account").classList.remove("hidden");
    return;
  }
  $("fab-account").classList.add("hidden");
  $("bottom-left-account").classList.add("hidden");
  applyLang(state.me.lang || "en");
  onLogin();
}
function onLogin() {
  $("fab-account").classList.add("hidden");
  $("setup-overlay").classList.add("hidden");
  $("me-label").textContent = state.me.username;
  $("me-card").innerHTML = `${avatarHTML(state.me)}<div><b>${esc(state.me.username)}</b></div>`;
  
  // Show username display at top left
  $("user-display").style.display = "inline";
  $("user-display").textContent = `user ${state.me.id}`;
  
  // Show edit profile at bottom left
  $("profile-edit").style.display = "inline";
  $("profile-edit").onclick = editUsername;
  
  // Update settings username display
  $("settings-username-display").textContent = `Username: ${state.me.username}`;
  
  switchView("chats"); refreshAll(); connectWS();
}

function editUsername() {
  const newName = prompt("Enter your new username:"); if (!newName) return;
  if (!/^[A-Za-z0-9_]{3,24}$/.test(newName)) { alert("Username: 3-24 chars, letters/numbers/_"); return; }
  try { state.me = await api("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: state.me.lang }) }).then(j); } catch (e) { alert(e.message); return; }
  $("me-label").textContent = state.me.username;
  $("me-card").innerHTML = `${avatarHTML(state.me)}<div><b>${esc(state.me.username)}</b></div>`;
  $("user-display").textContent = `user ${state.me.id}`;
}
document.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => {
  applyLang(b.dataset.lang);
  $("setup-lang-step").classList.add("hidden");
  $("setup-user-step").classList.remove("hidden");
});
$("goto-login").onclick = () => { $("setup-user-step").classList.add("hidden"); $("setup-login-step").classList.remove("hidden"); };
$("goto-create").onclick = () => { $("setup-login-step").classList.add("hidden"); $("setup-user-step").classList.remove("hidden"); };
$("setup-btn").onclick = async () => {
  const username = $("setup-username").value.trim();
  try { state.me = await api("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) }).then(j); applyLang(state.me.lang || state.lang); onLogin(); }
  catch (e) { $("setup-error").textContent = e.message; }
};
$("login-btn").onclick = async () => {
  const username = $("login-username").value.trim(), password = $("login-password").value;
  try { state.me = await api("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }).then(j); applyLang(state.me.lang || state.lang); onLogin(); }
  catch (e) { $("login-error").textContent = e.message; }
};
$("fab-account").onclick = () => {
  $("setup-lang-step").classList.remove("hidden");
  $("setup-user-step").classList.add("hidden");
  $("setup-login-step").classList.add("hidden");
  $("setup-overlay").classList.remove("hidden");
};
$("bottom-left-account").onclick = () => {
  $("setup-lang-step").classList.remove("hidden");
  $("setup-user-step").classList.add("hidden");
  $("setup-login-step").classList.add("hidden");
  $("setup-overlay").classList.remove("hidden");
};

function switchView(v) {
  document.querySelectorAll("#sidebar .nav-btn,#bottomnav .nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  ["chats", "friends", "requests", "search", "settings"].forEach(x => { const el = $("view-" + x); if (el) el.classList.toggle("hidden", x !== v); });
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
        ${avatarHTML(c.peer)}<div class="grow"><b>${esc(c.peer.username)}</b>
        <div class="sub">${esc(c.lastText || t("convo-nomsgs"))}</div></div>
        ${c.unread ? `<span class="unread">${c.unread}</span>` : ""}
      </div>`).join("") || `<div class="empty">${t("chats-empty")}</div>`;
    document.querySelectorAll("#chat-list .row").forEach(r => r.onclick = () => openChat(r.dataset.c));
  } catch (e) { setConn("offline"); }
}
$("chat-filter").oninput = loadConvos;

async function loadFriends() {
  const list = await api("/api/friends").then(j).catch(() => []);
  $("friend-list").innerHTML = list.map(u => `<div class="row">${avatarHTML(u)}<div class="grow"><b>${esc(u.username)}</b><div class="sub">${u.online ? t("online") : t("offline")}</div></div><button class="mini" data-chat="${u.id}">${t("btn-chat")}</button><button class="mini" data-rm="${u.id}">${t("btn-remove")}</button></div>`).join("") || `<div class="empty">${t("friends-empty")}</div>`;
  document.querySelectorAll("[data-chat]").forEach(b => b.onclick = async (e) => { e.stopPropagation(); const c = await api("/api/convos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ peerId: b.dataset.chat }) }).then(j); switchView("chats"); await loadConvos(); openChat(c.id); });
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = async (e) => { e.stopPropagation(); if (!confirm(t("friends-confirm"))) return; await api("/api/friends/" + b.dataset.rm, { method: "DELETE" }); refreshAll(); });
}

async function loadRequests() {
  const d = await api("/api/requests").then(j).catch(() => ({ incoming: [], outgoing: [] }));
  $("req-badge").classList.toggle("hidden", !d.incoming.length);
  $("req-badge").textContent = d.incoming.length || "";
  $("req-in").innerHTML = d.incoming.map(r => `<div class="row">${avatarHTML(r.from)}<div class="grow"><b>${esc(r.from.username)}</b></div><button class="mini ok" data-acc="${r.id}">${t("btn-accept")}</button><button class="mini" data-dec="${r.id}">${t("btn-decline")}</button></div>`).join("") || `<div class="empty">${t("req-empty-in")}</div>`;
  $("req-out").innerHTML = d.outgoing.map(r => `<div class="row">${avatarHTML(r.to)}<div class="grow"><b>${esc(r.to.username)}</b></div></div>`).join("") || `<div class="empty">${t("req-empty-out")}</div>`;
  document.querySelectorAll("[data-acc]").forEach(b => b.onclick = async () => { await api("/api/requests/" + b.dataset.acc + "/accept", { method: "POST" }); refreshAll(); });
  document.querySelectorAll("[data-dec]").forEach(b => b.onclick = async () => { await api("/api/requests/" + b.dataset.dec + "/decline", { method: "POST" }); refreshAll(); });
}

let searchT;
$("search-input").oninput = () => { clearTimeout(searchT); searchT = setTimeout(async () => {
  const q = $("search-input").value.trim(); if (q.length < 2) { $("search-results").innerHTML = ""; return; }
  const res = await api("/api/users?q=" + encodeURIComponent(q)).then(j).catch(() => []);
  $("search-results").innerHTML = res.map(u => `<div class="row">${avatarHTML(u)}<div class="grow"><b>${esc(u.username)}</b></div><button class="mini ok" data-add="${u.id}">${t("btn-add")}</button></div>`).join("") || `<div class="empty">${t("search-empty")}</div>`;
  document.querySelectorAll("[data-add]").forEach(b => b.onclick = async () => { try { await api("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toId: b.dataset.add }) }); b.textContent = t("btn-sent"); b.disabled = true; } catch (e) { alert(e.message); } });
}, 300); };

document.querySelectorAll("[data-setlang]").forEach(b => b.onclick = async () => {
  try { state.me = await api("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: b.dataset.setlang }) }).then(j); } catch {}
  applyLang(b.dataset.setlang); refreshAll();
});
const delReset = () => { $("del-btn").classList.remove("hidden"); $("del-step1").classList.add("hidden"); $("del-step2").classList.add("hidden"); };
function forceSignupReset() {
  state.me = null; state.convos = []; state.active = null; state.lastMsg = 0; state.wsRetry = 0;
  document.body.classList.remove("chatting");
  const ac = $("active-chat"), nc = $("no-chat");
  if (ac) ac.classList.add("hidden"); if (nc) nc.classList.remove("hidden");
  for (const id of ["setup-username","login-username","setup-password","login-password"]) { const el = $(id); if (el) el.value = ""; }
  const se = $("setup-error"), le = $("login-error"); if (se) se.textContent = ""; if (le) le.textContent = "";
  delReset(); switchView("chats");
  $("setup-lang-step").classList.remove("hidden");
  $("setup-user-step").classList.add("hidden");
  $("setup-login-step").classList.add("hidden");
  $("setup-overlay").classList.remove("hidden");
  $("fab-account").classList.remove("hidden");
  $("me-label").textContent = ""; $("me-card").innerHTML = "";
  setConn("offline");
}
$("del-btn").onclick = () => { $("del-btn").classList.add("hidden"); $("del-step1").classList.remove("hidden"); };
$("del-no1").onclick = delReset;
$("del-yes1").onclick = () => { $("del-step1").classList.add("hidden"); $("del-step2").classList.remove("hidden"); };
$("del-no2").onclick = delReset;
$("del-yes2").onclick = async () => {
  try { await api("/api/me", { method: "DELETE" }); } catch {}
  forceSignupReset();
};
$("back-btn").onclick = () => { document.body.classList.remove("chatting"); state.active = null; closeWS(); loadConvos(); };

async function openChat(id) {
  state.active = id;
  document.body.classList.add("chatting");
  $("no-chat").classList.add("hidden"); $("active-chat").classList.remove("hidden");
  loadConvos();
  const c = state.convos.find(x => x.id === id);
  if (c) { $("peer-name").textContent = c.peer.username; $("peer-status").textContent = (c.peer.online ? t("st-online") : t("st-offline")); $("peer-avatar").textContent = (c.peer.username[0] || "?").toUpperCase(); $("peer-avatar").style.background = avatarColor(c.peer.username); }
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
    else if (m.t === "typing" && m.convo === state.active && m.from !== state.me.id) { $("typing").textContent = t("typing"); $("typing").classList.remove("hidden"); clearTimeout(window._tt); window._tt = setTimeout(() => $("typing").classList.add("hidden"), 1500); }
    else if (m.t === "read" || m.t === "presence") loadConvos();
  };
  ws.onclose = () => { setConn("retry"); const d = Math.min(1000 * 2 ** state.wsRetry++, 15000); setTimeout(() => { if (state.me) connectWS(); }, d); startPoll(); };
  ws.onerror = () => { try { ws.close(); } catch {} };
  let ti; $("msg-input").oninput = () => { if (ws.readyState === 1 && state.active) { if (!ti || Date.now() - ti > 2000) { ws.send(JSON.stringify({ typing: true })); ti = Date.now(); } } };
}
function startPoll() { clearInterval(state.poll); state.poll = setInterval(() => { if (state.active) loadMessages(); else loadConvos(); }, 3000); }

boot();
