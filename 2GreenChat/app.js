// app.js — GreenChat standalone frontend (vanilla JS SPA)
// Talks to the Cloudflare Worker backend defined in worker.js.

'use strict';

// ─── Config ───
const API_BASE = window.GC_API_BASE || 'http://localhost:8787';

// ─── State ───
const state = {
  token: localStorage.getItem('gc_token'),
  user: null,
  profile: null,
  activeTab: 'chats',
  activeChat: null,       // { chatId, title, subtitle, participants }
  messages: [],
  unread: 0,
  ws: null,
  wsReconnect: null,
};

// ─── Utils ───
const $ = (s) => document.querySelector(s);
const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function avatarStyle(color) {
  const hue = parseInt(color || '150', 10) || 150;
  return `background-color: hsl(${hue}, 60%, 36%)`;
}

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].charAt(0).toUpperCase();
  return (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
}

function formatTime(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dmChatId(a, b) { return [a, b].sort().join('_'); }
function randomHue() { return String(Math.floor(Math.random() * 360)); }

const I = {
  chats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  friends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  groups: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
};

// ─── API ───
async function api(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : null });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Auth ───
async function loadMe() {
  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    state.profile = data.profile;
    return true;
  } catch {
    state.token = null;
    localStorage.removeItem('gc_token');
    return false;
  }
}

async function doRegister(email, password) {
  return api('/api/auth/register', 'POST', { email, password });
}
async function doVerifyOtp(email, code) {
  const data = await api('/api/auth/verify-otp', 'POST', { email, code });
  state.token = data.token;
  localStorage.setItem('gc_token', data.token);
  return data;
}
async function doResendOtp(email) {
  return api('/api/auth/resend-otp', 'POST', { email });
}
async function doLogin(email, password) {
  const data = await api('/api/auth/login', 'POST', { email, password });
  state.token = data.token;
  localStorage.setItem('gc_token', data.token);
  return data;
}
async function doLogout() {
  try { await api('/api/auth/logout', 'POST'); } catch {}
  state.token = null;
  state.user = null;
  state.profile = null;
  localStorage.removeItem('gc_token');
  disconnectWS();
  location.hash = '#/login';
  render();
}
async function doResetRequest(email) {
  return api('/api/auth/reset-request', 'POST', { email });
}
async function doResetPassword(token, password) {
  return api('/api/auth/reset-password', 'POST', { token, password });
}

// ─── WebSocket ───
function connectWS() {
  if (!state.token) return;
  disconnectWS();
  const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws?token=' + state.token;
  try {
    state.ws = new WebSocket(wsUrl);
  } catch { scheduleReconnect(); return; }
  state.ws.onmessage = (e) => {
    try { handleWSMessage(JSON.parse(e.data)); } catch {}
  };
  state.ws.onclose = () => { state.ws = null; scheduleReconnect(); };
  state.ws.onerror = () => { try { state.ws.close(); } catch {} };
}
function disconnectWS() {
  if (state.wsReconnect) { clearTimeout(state.wsReconnect); state.wsReconnect = null; }
  if (state.ws) { try { state.ws.close(); } catch {}; state.ws = null; }
}
function scheduleReconnect() {
  if (state.wsReconnect) return;
  state.wsReconnect = setTimeout(() => { state.wsReconnect = null; if (state.token) connectWS(); }, 3000);
}
function handleWSMessage(msg) {
  if (msg.type === 'message' && state.activeChat && msg.data.chatId === state.activeChat.chatId) {
    state.messages.push(msg.data);
    appendMessage(msg.data);
    scrollChatBottom();
  } else if (msg.type === 'friend_request') {
    state.unread = (state.unread || 0) + 1;
    updateBadge();
    if (state.activeTab === 'notifications' && !state.activeChat) loadNotifications();
  } else if (msg.type === 'friend_accept') {
    if (state.activeTab === 'friends' && !state.activeChat) loadFriends();
    if (state.activeTab === 'chats' && !state.activeChat) loadChats();
  }
}

// ─── Router ───
function parseHash() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  return { path, params: new URLSearchParams(qs || '') };
}
function navigate(path) { location.hash = '#' + path; }

// ─── Render ───
function render() {
  const { path } = parseHash();
  const app = el('app');

  if (state.token && !state.user) {
    app.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    loadMe().then((ok) => {
      if (ok) { connectWS(); render(); }
      else render();
    });
    return;
  }

  if (!state.token) {
    if (path === '/register') return renderRegister();
    if (path === '/forgot') return renderForgot();
    if (path === '/reset') return renderReset();
    return renderLogin();
  }

  if (!state.profile) return renderProfileSetup();
  renderApp();
}

// ─── Login ───
function renderLogin() {
  el('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">${I.chats}</div>
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Log in to your account</p>
        <form class="auth-form" id="loginForm">
          <div id="loginError" class="auth-error" style="display:none"></div>
          <div class="field">
            <label>Email</label>
            <input type="email" id="loginEmail" placeholder="you@example.com" required>
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" id="loginPassword" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn-primary" id="loginBtn">Log in</button>
        </form>
        <p class="auth-footer">Don't have an account? <a href="#/register">Create one</a></p>
        <p class="auth-footer"><a href="#/forgot">Forgot password?</a></p>
      </div>
    </div>`;
  el('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('loginEmail').value.trim();
    const password = el('loginPassword').value;
    const btn = el('loginBtn');
    const err = el('loginError');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Logging in…';
    try {
      await doLogin(email, password);
      await loadMe();
      connectWS();
      navigate('/app');
      render();
    } catch (ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Log in';
    }
  });
}

// ─── Register ───
function renderRegister() {
  el('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">${I.userPlus}</div>
        <h1 class="auth-title">Create your account</h1>
        <p class="auth-sub">Sign up to get started</p>
        <form class="auth-form" id="registerForm">
          <div id="regError" class="auth-error" style="display:none"></div>
          <div class="field">
            <label>Email</label>
            <input type="email" id="regEmail" placeholder="you@example.com" required>
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" id="regPassword" placeholder="At least 6 characters" required>
          </div>
          <div class="field">
            <label>Confirm Password</label>
            <input type="password" id="regConfirm" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn-primary" id="regBtn">Create account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login">Log in</a></p>
      </div>
    </div>`;
  el('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('regEmail').value.trim();
    const password = el('regPassword').value;
    const confirm = el('regConfirm').value;
    const btn = el('regBtn');
    const err = el('regError');
    err.style.display = 'none';
    if (password !== confirm) { err.textContent = 'Passwords do not match'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      await doRegister(email, password);
      renderOtp(email);
    } catch (ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Create account';
    }
  });
}

function renderOtp(email) {
  el('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">${I.mail}</div>
        <h1 class="auth-title">Verify your email</h1>
        <p class="auth-sub">Enter the 6-digit code sent to ${escapeHtml(email)}</p>
        <form class="auth-form" id="otpForm">
          <div id="otpError" class="auth-error" style="display:none"></div>
          <div class="otp-inputs">
            ${Array.from({ length: 6 }, (_, i) => `<input type="text" maxlength="1" inputmode="numeric" data-idx="${i}">`).join('')}
          </div>
          <button type="submit" class="btn-primary" id="otpBtn">Verify</button>
        </form>
        <p class="auth-footer"><a href="#" id="resendLink">Resend code</a></p>
        <p class="auth-footer"><a href="#/login">Back to login</a></p>
      </div>
    </div>`;
  const inputs = document.querySelectorAll('.otp-inputs input');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '');
      if (inp.value && i < 5) inputs[i + 1].focus();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !inp.value && i > 0) inputs[i - 1].focus();
    });
  });
  if (inputs[0]) inputs[0].focus();
  el('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = Array.from(inputs).map((i) => i.value).join('');
    if (code.length !== 6) return;
    const btn = el('otpBtn');
    const err = el('otpError');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'Verifying…';
    try {
      await doVerifyOtp(email, code);
      await loadMe();
      connectWS();
      navigate('/app');
      render();
    } catch (ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Verify';
    }
  });
  el('resendLink').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await doResendOtp(email); } catch {}
  });
}

// ─── Forgot Password ───
function renderForgot() {
  el('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">${I.mail}</div>
        <h1 class="auth-title">Reset password</h1>
        <p class="auth-sub">We'll send you a link to reset it</p>
        <form class="auth-form" id="forgotForm">
          <div id="fError" class="auth-error" style="display:none"></div>
          <div class="field">
            <label>Email address</label>
            <input type="email" id="fEmail" placeholder="you@example.com" required>
          </div>
          <button type="submit" class="btn-primary" id="fBtn">Send reset link</button>
        </form>
        <p class="auth-footer"><a href="#/login">← Back to log in</a></p>
      </div>
    </div>`;
  el('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('fEmail').value.trim();
    const btn = el('fBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await doResetRequest(email);
      el('app').innerHTML = `
        <div class="auth-wrap">
          <div class="auth-card">
            <div class="auth-icon">${I.check}</div>
            <div class="auth-success">
              <h2>Check your email</h2>
              <p>If an account exists for ${escapeHtml(email)}, a reset link has been sent. Check your spam folder if you don't see it.</p>
              <a href="#/login" class="btn-primary" style="display:block;text-align:center;line-height:42px">Back to log in</a>
            </div>
          </div>
        </div>`;
    } catch (ex) {
      el('fError').textContent = ex.message; el('fError').style.display = 'block';
      btn.disabled = false; btn.textContent = 'Send reset link';
    }
  });
}

// ─── Reset Password ───
function renderReset() {
  const { params } = parseHash();
  const token = params.get('token');
  if (!token) {
    el('app').innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <div class="auth-icon">${I.alert}</div>
          <h1 class="auth-title">Invalid reset link</h1>
          <p class="auth-sub">This password reset link is missing or invalid</p>
          <div class="auth-form" style="text-align:center">
            <p style="color:var(--muted);font-size:14px;margin-bottom:16px">The link you used appears to be incomplete. Please request a new password reset email.</p>
            <a href="#/forgot" class="btn-primary" style="display:block;text-align:center;line-height:42px">Request a new link</a>
          </div>
        </div>
      </div>`;
    return;
  }
  el('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon">${I.lock}</div>
        <h1 class="auth-title">New password</h1>
        <p class="auth-sub">Enter your new password</p>
        <form class="auth-form" id="resetForm">
          <div id="rError" class="auth-error" style="display:none"></div>
          <div class="field">
            <label>New password</label>
            <input type="password" id="rPass" placeholder="At least 6 characters" required>
          </div>
          <div class="field">
            <label>Confirm password</label>
            <input type="password" id="rConfirm" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn-primary" id="rBtn">Reset password</button>
        </form>
      </div>
    </div>`;
  el('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = el('rPass').value;
    const confirm = el('rConfirm').value;
    const btn = el('rBtn');
    const err = el('rError');
    err.style.display = 'none';
    if (password !== confirm) { err.textContent = 'Passwords do not match'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Resetting…';
    try {
      await doResetPassword(token, password);
      el('app').innerHTML = `
        <div class="auth-wrap">
          <div class="auth-card">
            <div class="auth-icon">${I.check}</div>
            <div class="auth-success">
              <h2>Password reset!</h2>
              <p>Your password has been updated. You can now log in.</p>
              <a href="#/login" class="btn-primary" style="display:block;text-align:center;line-height:42px">Back to log in</a>
            </div>
          </div>
        </div>`;
    } catch (ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Reset password';
    }
  });
}

// ─── Profile Setup (first-time) ───
function renderProfileSetup() {
  el('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card" style="max-width:480px">
        <div style="background:var(--primary);color:var(--primary-fg);padding:20px 24px;border-radius:var(--radius) var(--radius) 0 0;margin:-24px -24px 24px">
          <h1 style="font-size:22px;font-weight:700">GreenChat</h1>
          <p style="font-size:14px;opacity:.9">Welcome! Let's set up your profile.</p>
        </div>
        ${profileFormHTML(null)}
      </div>
    </div>`;
  attachProfileForm(null);
}

// ─── Main App ───
function renderApp() {
  const tabs = [
    { id: 'chats', label: 'Chats', icon: I.chats },
    { id: 'friends', label: 'Friends', icon: I.friends },
    { id: 'groups', label: 'Groups', icon: I.groups },
    { id: 'notifications', label: 'Notif', icon: I.bell },
    { id: 'profile', label: 'Profile', icon: I.user },
    { id: 'settings', label: 'Settings', icon: I.settings },
  ];
  el('app').innerHTML = `
    <div class="app-layout">
      <nav class="sidebar">
        ${tabs.map((t) => `
          <button class="tab-btn ${state.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
            ${t.icon}
            <span>${t.label}</span>
            ${t.id === 'notifications' && state.unread > 0 ? `<span class="badge">${state.unread > 9 ? '9+' : state.unread}</span>` : ''}
          </button>`).join('')}
        <div class="sidebar-spacer"></div>
        <div class="sidebar-avatar">
          <div class="avatar" style="${avatarStyle(state.profile?.avatarColor)}">${initials(state.profile?.displayName || state.profile?.username)}</div>
        </div>
      </nav>
      <main class="main-content" id="mainContent"></main>
    </div>`;
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => { state.activeChat = null; state.activeTab = btn.dataset.tab; renderApp(); });
  });
  loadUnread();
  renderMainContent();
}

function renderMainContent() {
  const mc = el('mainContent');
  if (state.activeChat) { renderChatView(mc); return; }
  switch (state.activeTab) {
    case 'chats': loadChats(); break;
    case 'friends': loadFriends(); break;
    case 'groups': loadGroups(); break;
    case 'notifications': loadNotifications(); break;
    case 'profile': renderProfileTab(mc); break;
    case 'settings': renderSettingsTab(mc); break;
  }
}

function updateBadge() {
  const badge = document.querySelector('.tab-btn[data-tab="notifications"] .badge');
  if (state.unread > 0) {
    if (badge) badge.textContent = state.unread > 9 ? '9+' : state.unread;
    else {
      const btn = document.querySelector('.tab-btn[data-tab="notifications"]');
      if (btn) btn.insertAdjacentHTML('beforeend', `<span class="badge">${state.unread > 9 ? '9+' : state.unread}</span>`);
    }
  } else if (badge) badge.remove();
}

async function loadUnread() {
  try {
    const data = await api('/api/friends/requests');
    state.unread = (data.requests || []).length;
    updateBadge();
  } catch {}
}

// ─── Chats Tab ───
async function loadChats() {
  const mc = el('mainContent');
  mc.innerHTML = `<div class="tab-header"><h1>Chats</h1><p class="tab-body" style="border:none;padding:0">Pick a friend to start messaging</p></div><div class="tab-body"><div class="loading-text">Loading…</div></div>`;
  try {
    const data = await api('/api/friends');
    const friends = data.friends || [];
    if (friends.length === 0) {
      mc.innerHTML = `<div class="tab-header"><h1>Chats</h1><p>Pick a friend to start messaging</p></div><div class="tab-body"><div class="empty-state">${I.chats}<p>No chats yet. Add a friend from the Friends tab to start chatting.</p></div></div>`;
      return;
    }
    mc.innerHTML = `<div class="tab-header"><h1>Chats</h1><p>Pick a friend to start messaging</p></div><div class="tab-body">${friends.map((f) => `
      <div class="chat-row" data-uid="${f.userId}" data-name="${escapeHtml(f.username)}">
        <div class="avatar" style="${avatarStyle(undefined)}">${initials(f.username)}</div>
        <div><p class="name">${escapeHtml(f.username)}</p><p class="sub">Tap to chat</p></div>
      </div>`).join('')}</div>`;
    mc.querySelectorAll('.chat-row').forEach((row) => {
      row.addEventListener('click', () => openChat(dmChatId(state.user.id, row.dataset.uid), row.dataset.name, '', [state.user.id, row.dataset.uid]));
    });
  } catch (ex) {
    mc.innerHTML = `<div class="tab-body"><div class="loading-text">${escapeHtml(ex.message)}</div></div>`;
  }
}

// ─── Friends Tab ───
let friendSearchTimer;
async function loadFriends() {
  const mc = el('mainContent');
  mc.innerHTML = `
    <div class="tab-header">
      <h1>Friends</h1>
      <div class="search-bar">${I.search}<input type="text" id="friendSearch" placeholder="Search by username…"></div>
    </div>
    <div class="tab-body" id="friendsBody"><div class="loading-text">Loading…</div></div>`;
  el('friendSearch').addEventListener('input', (e) => {
    clearTimeout(friendSearchTimer);
    const q = e.target.value.trim();
    friendSearchTimer = setTimeout(() => doFriendSearch(q), 300);
  });
  await refreshFriendsLists();
}

async function doFriendSearch(q) {
  const body = el('friendsBody');
  if (!q) return refreshFriendsLists();
  try {
    const data = await api('/api/users/search?q=' + encodeURIComponent(q));
    const results = data.results || [];
    body.innerHTML = `<div class="list-section"><h3>Results</h3>${results.length === 0 ? '<p style="color:var(--muted);font-size:14px;padding:8px 0">No users found.</p>' : results.map((r) => `
      <div class="list-item">
        <div class="avatar" style="${avatarStyle(r.avatarColor)}">${initials(r.username)}</div>
        <div class="info"><p class="name">${escapeHtml(r.username)}</p>${r.displayName ? `<p class="sub">${escapeHtml(r.displayName)}</p>` : ''}</div>
        <button class="btn-add" data-uid="${r.userId}">${I.userPlus} Add</button>
      </div>`).join('')}</div>`;
    body.querySelectorAll('.btn-add').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await api('/api/friends/request', 'POST', { toUserId: btn.dataset.uid }); btn.innerHTML = 'Request sent'; btn.disabled = true; }
        catch (ex) { btn.innerHTML = escapeHtml(ex.message); btn.disabled = false; }
      });
    });
  } catch {}
}

async function refreshFriendsLists() {
  const body = el('friendsBody');
  if (!body) return;
  try {
    const [fr, sent] = await Promise.all([api('/api/friends'), api('/api/friends/sent')]);
    const friends = fr.friends || [];
    const sentReqs = sent.sent || [];
    const q = el('friendSearch')?.value.trim();
    if (q) return;
    body.innerHTML = `
      <div class="list-section"><h3>Your friends (${friends.length})</h3>${friends.length === 0 ? '<p style="color:var(--muted);font-size:14px">No friends yet. Search above to find people.</p>' : friends.map((f) => `
        <button class="list-item clickable" data-uid="${f.userId}" data-name="${escapeHtml(f.username)}">
          <div class="avatar" style="${avatarStyle(undefined)}">${initials(f.username)}</div>
          <div class="info"><p class="name">${escapeHtml(f.username)}</p></div>
          ${I.chat}
        </button>`).join('')}</div>
      ${sentReqs.length > 0 ? `<div class="list-section"><h3>Sent requests (${sentReqs.length})</h3>${sentReqs.map((f) => `
        <div class="list-item">
          <div class="avatar" style="${avatarStyle(undefined)}">${initials(f.toUsername)}</div>
          <div class="info"><p class="name">${escapeHtml(f.toUsername)}</p></div>
          <span class="tag">Pending</span>
        </div>`).join('')}</div>` : ''}`;
    body.querySelectorAll('.list-item.clickable').forEach((row) => {
      row.addEventListener('click', () => openChat(dmChatId(state.user.id, row.dataset.uid), row.dataset.name, '', [state.user.id, row.dataset.uid]));
    });
  } catch {}
}

// ─── Groups Tab ───
async function loadGroups() {
  const mc = el('mainContent');
  mc.innerHTML = `
    <div class="tab-header">
      <h1>Groups</h1>
      <form id="groupForm" style="display:flex;gap:8px;margin-top:12px">
        <input type="text" id="groupName" placeholder="New group name…" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:999px;padding:10px 16px;color:var(--foreground);outline:none;font-size:14px">
        <button type="submit" class="btn-add">${I.plus} Create</button>
      </form>
    </div>
    <div class="tab-body" id="groupsBody"><div class="loading-text">Loading…</div></div>`;
  el('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = el('groupName').value.trim();
    if (!name) return;
    try { await api('/api/groups', 'POST', { name }); el('groupName').value = ''; await refreshGroups(); }
    catch (ex) { alert(ex.message); }
  });
  await refreshGroups();
}

async function refreshGroups() {
  const body = el('groupsBody');
  if (!body) return;
  try {
    const data = await api('/api/groups');
    const groups = data.groups || [];
    if (groups.length === 0) {
      body.innerHTML = `<div class="empty-state">${I.groups}<p>No groups yet. Create one above to start a group chat.</p></div>`;
      return;
    }
    body.innerHTML = groups.map((g) => {
      const isOwner = g.ownerId === state.user.id;
      return `<div class="group-row" data-gid="${g.id}">
        <div class="group-row-top">
          <button class="group-icon" data-open="${g.id}">${I.groups}</button>
          <button style="flex:1;text-align:left;min-width:0" data-open="${g.id}">
            <p class="name">${escapeHtml(g.name)}</p>
            <p class="sub">${(g.members || []).length} members</p>
          </button>
          <button class="btn-icon chat" data-open="${g.id}">${I.chat}</button>
          ${isOwner ? `<button class="btn-icon" data-add="${g.id}" title="Add member">${I.userPlus}</button>` : ''}
        </div>
        <div class="add-member-box" id="addBox-${g.id}" style="display:none">
          <div class="search-bar">${I.search}<input type="text" placeholder="Search username to add…" data-msearch="${g.id}"></div>
          <div id="memberResults-${g.id}"></div>
        </div>
      </div>`;
    }).join('');
    body.querySelectorAll('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = groups.find((x) => x.id === btn.dataset.open);
        openChat('group_' + g.id, g.name, (g.memberUsernames || []).join(', '), g.members);
      });
    });
    body.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const box = el('addBox-' + btn.dataset.add);
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      });
    });
    body.querySelectorAll('[data-msearch]').forEach((inp) => {
      let t;
      inp.addEventListener('input', () => {
        clearTimeout(t);
        const q = inp.value.trim();
        const gid = inp.dataset.msearch;
        t = setTimeout(async () => {
          const res = el('memberResults-' + gid);
          if (!q) { res.innerHTML = ''; return; }
          try {
            const data = await api('/api/users/search?q=' + encodeURIComponent(q));
            const g = groups.find((x) => x.id === gid);
            res.innerHTML = (data.results || []).map((r) => {
              const already = (g.members || []).includes(r.userId);
              return `<div class="member-result" data-uid="${r.userId}" data-gid="${gid}">
                <div class="avatar" style="${avatarStyle(r.avatarColor)}">${initials(r.username)}</div>
                <span>${escapeHtml(r.username)}</span>
                ${already ? '<span class="tag">In group</span>' : I.plus}
              </div>`;
            }).join('');
            res.querySelectorAll('.member-result').forEach((mr) => {
              mr.addEventListener('click', async () => {
                if (mr.querySelector('.tag')) return;
                try { await api(`/api/groups/${mr.dataset.gid}/members`, 'POST', { userId: mr.dataset.uid }); await refreshGroups(); }
                catch (ex) { alert(ex.message); }
              });
            });
          } catch {}
        }, 300);
      });
    });
  } catch (ex) {
    body.innerHTML = `<div class="loading-text">${escapeHtml(ex.message)}</div>`;
  }
}

// ─── Notifications Tab ───
async function loadNotifications() {
  const mc = el('mainContent');
  mc.innerHTML = `<div class="tab-header"><h1>Notifications</h1><p>Friend requests sent to you</p></div><div class="tab-body" id="notifBody"><div class="loading-text">Loading…</div></div>`;
  const body = el('notifBody');
  try {
    const data = await api('/api/friends/requests');
    const reqs = data.requests || [];
    state.unread = reqs.length;
    updateBadge();
    if (reqs.length === 0) {
      body.innerHTML = `<div class="empty-state">${I.bell}<p>You're all caught up. No new notifications.</p></div>`;
      return;
    }
    body.innerHTML = reqs.map((f) => `
      <div class="list-item" style="padding:14px 20px;border-bottom:1px solid hsl(150,18%,15%,.5)">
        <div class="avatar" style="${avatarStyle(undefined)}">${initials(f.fromUsername)}</div>
        <div class="info"><p class="name">${escapeHtml(f.fromUsername)}</p><p class="sub">wants to be your friend</p></div>
        <button class="btn-icon accept" data-accept="${f.id}">${I.check}</button>
        <button class="btn-icon decline" data-decline="${f.id}">${I.x}</button>
      </div>`).join('');
    body.querySelectorAll('[data-accept]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await api('/api/friends/accept', 'POST', { friendshipId: btn.dataset.accept }); await loadNotifications(); }
        catch { btn.disabled = false; }
      });
    });
    body.querySelectorAll('[data-decline]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await api('/api/friends/decline', 'POST', { friendshipId: btn.dataset.decline }); await loadNotifications(); }
        catch { btn.disabled = false; }
      });
    });
  } catch (ex) {
    body.innerHTML = `<div class="loading-text">${escapeHtml(ex.message)}</div>`;
  }
}

// ─── Profile Tab ───
function profileFormHTML(profile) {
  const isCreate = !profile;
  return `
    <form id="profileForm" class="profile-form">
      <div class="profile-avatar-row">
        <div class="avatar" id="profAvatar" style="${avatarStyle(state.profile?.avatarColor || state._tempColor)}">${initials(state.profile?.displayName || state.profile?.username || state._tempName || '')}</div>
        <button type="button" id="colorBtn">Change color</button>
      </div>
      <div class="field"><label>Username</label><input type="text" id="profUsername" value="${escapeHtml(state.profile?.username || '')}" placeholder="e.g. greenleaf"></div>
      <div class="field"><label>Display name</label><input type="text" id="profDisplay" value="${escapeHtml(state.profile?.displayName || '')}" placeholder="Optional"></div>
      <div class="field"><label>Bio</label><textarea id="profBio" rows="3" placeholder="Tell people a bit about yourself">${escapeHtml(state.profile?.bio || '')}</textarea></div>
      <div id="profError" class="auth-error" style="display:none"></div>
      <button type="submit" class="btn-primary" id="profBtn">${isCreate ? 'Create profile' : 'Save changes'}</button>
    </form>`;
}

function attachProfileForm(profile) {
  if (!state._tempColor) state._tempColor = state.profile?.avatarColor || randomHue();
  el('colorBtn').addEventListener('click', () => {
    state._tempColor = randomHue();
    updateProfAvatar();
  });
  el('profDisplay').addEventListener('input', updateProfAvatar);
  el('profUsername').addEventListener('input', updateProfAvatar);
  el('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el('profUsername').value.trim();
    const displayName = el('profDisplay').value.trim();
    const bio = el('profBio').value.trim();
    const btn = el('profBtn');
    const err = el('profError');
    err.style.display = 'none';
    if (!username) { err.textContent = 'Username is required.'; err.style.display = 'block'; return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const data = await api('/api/profile', 'PUT', { username, displayName, bio, avatarColor: state._tempColor });
      state.profile = data.profile;
      state._tempColor = null; state._tempName = null;
      render();
    } catch (ex) {
      err.textContent = ex.message; err.style.display = 'block';
      btn.disabled = false; btn.textContent = profile ? 'Save changes' : 'Create profile';
    }
  });
}

function updateProfAvatar() {
  const name = el('profDisplay')?.value.trim() || el('profUsername')?.value.trim();
  const av = el('profAvatar');
  if (av) { av.style.cssText = avatarStyle(state._tempColor); av.textContent = initials(name); }
}

function renderProfileTab(mc) {
  mc.innerHTML = `<div class="tab-header"><h1>Profile</h1><p>Update your details anytime</p></div><div class="tab-body">${profileFormHTML(state.profile)}</div>`;
  attachProfileForm(state.profile);
}

// ─── Settings Tab ───
function renderSettingsTab(mc) {
  mc.innerHTML = `
    <div class="tab-header"><h1>Settings</h1></div>
    <div class="tab-body">
      <div style="padding:24px 20px;max-width:420px">
        <div class="settings-card">
          <p class="label">Signed in as</p>
          <p class="value">${escapeHtml(state.profile?.username || state.user?.email)}</p>
          <p class="small">${escapeHtml(state.user?.email)}</p>
        </div>
        <div class="settings-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">${I.chat}<p style="font-weight:600">About GreenChat</p></div>
          <p style="font-size:14px;color:var(--muted);line-height:1.5">Real-time chat that works across the world. Search a username, send a friend request, and start talking instantly.</p>
        </div>
        <button class="btn-logout" id="logoutBtn">${I.logout} Log out</button>
      </div>
    </div>`;
  el('logoutBtn').addEventListener('click', doLogout);
}

// ─── Chat View ───
function openChat(chatId, title, subtitle, participants) {
  state.activeChat = { chatId, title, subtitle, participants };
  renderApp();
}

async function renderChatView(mc) {
  const { chatId, title, subtitle, participants } = state.activeChat;
  mc.innerHTML = `
    <div class="chat-view">
      <div class="chat-header">
        <button class="chat-back" id="chatBack">${I.back}</button>
        <div class="avatar" style="${avatarStyle(undefined)}">${initials(title)}</div>
        <div style="min-width:0">
          <p class="title">${escapeHtml(title)}</p>
          ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
      </div>
      <div class="chat-messages" id="chatMessages"><div class="loading-text">Loading…</div></div>
      <form class="chat-composer" id="chatForm">
        <input type="text" id="chatInput" placeholder="Type a message…">
        <button type="submit" class="chat-send" id="chatSend">${I.send}</button>
      </form>
    </div>`;
  el('chatBack').addEventListener('click', () => { state.activeChat = null; state.messages = []; renderApp(); });
  el('chatForm').addEventListener('submit', handleSend);
  state.messages = [];
  try {
    const data = await api('/api/messages/' + encodeURIComponent(chatId) + '?limit=50');
    state.messages = data.messages || [];
    renderMessages();
  } catch (ex) {
    el('chatMessages').innerHTML = `<div class="loading-text">${escapeHtml(ex.message)}</div>`;
  }
}

function renderMessages() {
  const c = el('chatMessages');
  if (!c) return;
  if (state.messages.length === 0) {
    c.innerHTML = '<p class="loading-text">No messages yet. Say hello 👋</p>';
    return;
  }
  c.innerHTML = state.messages.map((m) => messageHTML(m)).join('');
  scrollChatBottom();
}

function messageHTML(m) {
  const mine = m.senderId === state.user.id;
  return `<div class="msg ${mine ? 'mine' : 'theirs'}">
    ${!mine ? `<p class="sender">${escapeHtml(m.senderUsername)}</p>` : ''}
    <div class="bubble">${escapeHtml(m.text)}</div>
    <span class="time">${formatTime(m.timestamp)}</span>
  </div>`;
}

function appendMessage(m) {
  const c = el('chatMessages');
  if (!c) return;
  c.insertAdjacentHTML('beforeend', messageHTML(m));
}

function scrollChatBottom() {
  const c = el('chatMessages');
  if (c) c.scrollTop = c.scrollHeight;
}

async function handleSend(e) {
  e.preventDefault();
  const input = el('chatInput');
  const btn = el('chatSend');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  btn.disabled = true;
  try {
    const data = await api('/api/messages', 'POST', { chatId: state.activeChat.chatId, text, participants: state.activeChat.participants });
    state.messages.push(data.message);
    appendMessage(data.message);
    scrollChatBottom();
  } catch (ex) {
    input.value = text;
    alert(ex.message);
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

// ─── Init ───
window.addEventListener('hashchange', render);
render();