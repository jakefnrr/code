const API_BASE = '/2GreenChat/api';

const state = {
  user: null,
  activeConversationId: null,
  conversations: [],
  friends: [],
  requests: [],
  searchResults: [],
  timer: null,
  resetValidation: null,
};

const els = {
  authShell: document.getElementById('auth-shell'),
  appShell: document.getElementById('app-shell'),
  authMessage: document.getElementById('auth-message'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  resetValidateForm: document.getElementById('reset-validate-form'),
  resetSetForm: document.getElementById('reset-set-form'),
  resetTrigger: document.getElementById('reset-password-trigger'),
  resetBackBtn: document.getElementById('reset-back-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  navButtons: [...document.querySelectorAll('.nav-item')],
  views: {
    chat: document.getElementById('chat-view'),
    friends: document.getElementById('friends-view'),
    settings: document.getElementById('settings-view')
  },
  conversationList: document.getElementById('conversation-list'),
  friendList: document.getElementById('friend-list'),
  friendRequestList: document.getElementById('friend-request-list'),
  messagesContainer: document.getElementById('messages-container'),
  chatTitle: document.getElementById('chat-title'),
  currentUser: document.getElementById('current-user'),
  messageForm: document.getElementById('message-form'),
  messageInput: document.getElementById('message-input'),
  friendSearchInput: document.getElementById('friend-search-input'),
  friendSearchBtn: document.getElementById('friend-search-btn'),
  profileForm: document.getElementById('profile-form'),
  passwordForm: document.getElementById('password-form'),
  displayNameInput: document.getElementById('display-name-input'),
  usernameInput: document.getElementById('username-input'),
  emailInput: document.getElementById('email-input'),
  deleteAccountBtn: document.getElementById('delete-account-btn'),
  typingIndicator: document.getElementById('typing-indicator'),
};

function setMessage(message, isError = false) {
  els.authMessage.textContent = message;
  els.authMessage.style.color = isError ? '#d83b3b' : '#179a56';
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
  });

  const rawText = await response.text();
  let data = null;
  try { data = rawText ? JSON.parse(rawText) : {}; } catch (error) { data = { error: 'Failed to parse server response.' }; }

  if (!response.ok) {
    const msg = data?.error || 'Request failed.';
    throw new Error(msg);
  }

  return data;
}

function showAuthView(name) {
  const panels = [
    document.getElementById('login-panel'),
    document.getElementById('register-panel'),
    document.getElementById('reset-panel')
  ];

  panels.forEach((panel) => panel.classList.add('hidden'));
  const target = name === 'login' ? document.getElementById('login-panel') :
                  name === 'register' ? document.getElementById('register-panel') :
                  document.getElementById('reset-panel');
  target.classList.remove('hidden');

  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.authTab === name);
  });
  setMessage('');
}

function setAppVisible(isLoggedIn) {
  els.authShell.classList.toggle('hidden', isLoggedIn);
  els.appShell.classList.toggle('hidden', !isLoggedIn);
}

function renderConversations() {
  els.conversationList.innerHTML = '';
  if (!state.conversations.length) {
    els.conversationList.innerHTML = '<div class="empty-state">No conversations yet.</div>';
    return;
  }

  for (const conversation of state.conversations) {
    const item = document.createElement('button');
    item.className = 'conversation-item' + (conversation.id === state.activeConversationId ? ' active' : '');
    item.type = 'button';
    item.innerHTML = `
      <div class="avatar">${(conversation.name || 'U').slice(0, 1).toUpperCase()}</div>
      <div class="meta">
        <strong>${conversation.name || 'Conversation'}</strong>
        <small>${conversation.preview || 'No messages yet'}</small>
      </div>
      ${conversation.unread ? `<span class="badge">${conversation.unread}</span>` : ''}
    `;
    item.addEventListener('click', () => selectConversation(conversation.id));
    els.conversationList.appendChild(item);
  }
}

function renderFriendList() {
  els.friendList.innerHTML = '';
  if (!state.friends.length) {
    els.friendList.innerHTML = '<div class="empty-state">No friends yet.</div>';
    return;
  }

  for (const friend of state.friends) {
    const row = document.createElement('div');
    row.className = 'friend-item';
    row.innerHTML = `
      <div class="avatar">${(friend.username || 'U').slice(0,1).toUpperCase()}</div>
      <div class="meta">
        <strong>${friend.displayName || friend.username}</strong>
        <small>@${friend.username}</small>
      </div>
      <button type="button" data-friend-action="message" data-user-id="${friend.id}">Chat</button>
    `;
    row.querySelector('button').addEventListener('click', () => startChatWithUser(friend));
    els.friendList.appendChild(row);
  }
}

function renderRequests() {
  els.friendRequestList.innerHTML = '';
  if (!state.requests.length) {
    els.friendRequestList.innerHTML = '<div class="empty-state">No pending requests.</div>';
    return;
  }

  for (const request of state.requests) {
    const row = document.createElement('div');
    row.className = 'request-item';
    row.innerHTML = `
      <div class="meta">
        <strong>${request.username}</strong>
        <small>${request.type === 'incoming' ? 'Wants to be friends' : 'Outgoing request'}</small>
      </div>
      ${request.type === 'incoming' ? `
        <div class="actions">
          <button data-request-action="accept" data-user-id="${request.userId}">Accept</button>
          <button data-request-action="reject" data-user-id="${request.userId}" class="ghost">Reject</button>
        </div>
      ` : ''}
    `;

    if (request.type === 'incoming') {
      row.querySelector('[data-request-action="accept"]').addEventListener('click', () => handleFriendAction('accept', request.userId));
      row.querySelector('[data-request-action="reject"]').addEventListener('click', () => handleFriendAction('reject', request.userId));
    }
    els.friendRequestList.appendChild(row);
  }
}

function renderMessages(messages) {
  els.messagesContainer.innerHTML = '';
  if (!messages.length) {
    els.messagesContainer.innerHTML = '<div class="empty-state">No messages yet. Say hello.</div>';
    return;
  }

  for (const message of messages) {
    const bubble = document.createElement('div');
    const mine = message.senderId === state.user.id;
    bubble.className = `message-bubble ${mine ? 'mine' : 'their'}`;
    bubble.innerHTML = `
      <div class="message-meta">
        <span>${mine ? 'You' : message.senderName || 'User'}</span>
        <span>${new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      <div class="message-content">${escapeHtml(message.content)}</div>
    `;
    els.messagesContainer.appendChild(bubble);
  }
  els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadMe() {
  try {
    const result = await api('/me');
    state.user = result.user;
    setAppVisible(true);
    initUserHeader();
    await Promise.all([loadConversations(), loadFriends(), loadRequests()]);
    if (!state.activeConversationId && state.conversations.length) selectConversation(state.conversations[0].id);
    startPolling();
  } catch (error) {
    setAppVisible(false);
    showAuthView('login');
  }
}

function initUserHeader() {
  els.currentUser.textContent = `${state.user.displayName || state.user.username}`;
  els.displayNameInput.value = state.user.displayName || '';
  els.usernameInput.value = state.user.username || '';
  els.emailInput.value = state.user.email || '';
}

async function loadConversations() {
  try {
    const result = await api('/conversations');
    state.conversations = result.conversations || [];
    renderConversations();
    if (state.activeConversationId && !state.conversations.some((c) => c.id === state.activeConversationId)) {
      state.activeConversationId = null;
      els.chatTitle.textContent = 'Choose a chat';
      renderMessages([]);
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadFriends() {
  try {
    const result = await api('/friends');
    state.friends = result.friends || [];
    renderFriendList();
  } catch (error) {
    console.error(error);
  }
}

async function loadRequests() {
  try {
    const result = await api('/friends/requests');
    state.requests = result.requests || [];
    renderRequests();
  } catch (error) {
    console.error(error);
  }
}

async function loadMessagesForConversation(conversationId) {
  try {
    const result = await api(`/messages?conversationId=${encodeURIComponent(conversationId)}`);
    renderMessages(result.messages || []);
  } catch (error) {
    console.error(error);
  }
}

async function selectConversation(conversationId) {
  state.activeConversationId = conversationId;
  renderConversations();
  const conversation = state.conversations.find((item) => item.id === conversationId);
  els.chatTitle.textContent = conversation ? conversation.name : 'Choose a chat';
  await loadMessagesForConversation(conversationId);
}

async function startChatWithUser(friend) {
  try {
    const result = await api('/conversations/open', {
      method: 'POST',
      body: JSON.stringify({ userId: friend.id })
    });
    state.activeConversationId = result.conversationId;
    await loadConversations();
    await selectConversation(result.conversationId);
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handleFriendAction(action, userId) {
  try {
    await api('/friends/action', {
      method: 'POST',
      body: JSON.stringify({ action, userId })
    });
    await loadFriends();
    await loadRequests();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function searchUsers() {
  const query = els.friendSearchInput.value.trim();
  if (!query) return;
  try {
    const result = await api(`/users/search?q=${encodeURIComponent(query)}`);
    const matches = result.users || [];
    const existingIds = new Set(state.friends.map((f) => f.id));
    const rows = matches.filter((user) => user.id !== state.user.id && !existingIds.has(user.id));
    for (const user of rows) {
      const row = document.createElement('div');
      row.className = 'friend-item';
      row.innerHTML = `
        <div class="avatar">${(user.username || 'U').slice(0,1).toUpperCase()}</div>
        <div class="meta">
          <strong>${user.displayName || user.username}</strong>
          <small>@${user.username}</small>
        </div>
        <button type="button" data-user-id="${user.id}" data-request="send">Add</button>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        try {
          await api('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id })
          });
          await loadFriends();
          await loadRequests();
          setMessage('Friend request sent.');
        } catch (error) {
          setMessage(error.message, true);
        }
      });
      els.friendList.appendChild(row);
    }
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (!state.activeConversationId) return;
  const content = els.messageInput.value.trim();
  if (!content) return;

  try {
    await api('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ conversationId: state.activeConversationId, content })
    });
    els.messageInput.value = '';
    await loadMessagesForConversation(state.activeConversationId);
    await loadConversations();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const result = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setMessage('');
    await loadMe();
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;

  if (!email.endsWith('@gmail.com')) {
    setMessage('Use a Gmail address ending in @gmail.com.', true);
    return;
  }

  try {
    await api('/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password })
    });
    setMessage('Registration successful. Please log in.');
    document.getElementById('register-form').reset();
    showAuthView('login');
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handleProfileSave(event) {
  event.preventDefault();
  const payload = {
    displayName: els.displayNameInput.value.trim(),
    username: els.usernameInput.value.trim(),
    email: els.emailInput.value.trim(),
  };

  try {
    const result = await api('/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.user = result.user;
    initUserHeader();
    setMessage('Profile saved.');
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handlePasswordChange(event) {
  event.preventDefault();
  const newPassword = document.getElementById('new-password-input').value;
  const confirmPassword = document.getElementById('confirm-password-input').value;
  if (newPassword.length < 8) {
    setMessage('Password must be at least 8 characters.', true);
    return;
  }
  if (newPassword !== confirmPassword) {
    setMessage('Passwords do not match.', true);
    return;
  }

  try {
    await api('/settings/password', {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    document.getElementById('password-form').reset();
    setMessage('Password updated.');
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function logout() {
  try {
    await api('/logout', { method: 'POST' });
  } catch (error) {
    console.error(error);
  }
  state.user = null;
  state.conversations = [];
  state.friends = [];
  state.requests = [];
  setAppVisible(false);
  showAuthView('login');
  els.friendSearchInput.value = '';
}

async function deleteAccount() {
  if (!confirm('Delete your account permanently? This cannot be undone.')) return;
  try {
    await api('/settings/delete', { method: 'POST' });
    await logout();
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handleResetValidate(event) {
  event.preventDefault();
  const email = document.getElementById('reset-email').value.trim();
  const username = document.getElementById('reset-username').value.trim();

  try {
    const result = await api('/reset-validate', {
      method: 'POST',
      body: JSON.stringify({ email, username })
    });
    state.resetValidation = { email, username };
    document.getElementById('reset-set-form').classList.remove('hidden');
    setMessage('Verified. Choose a new password.');
  } catch (error) {
    setMessage(error.message, true);
  }
}

async function handleResetSet(event) {
  event.preventDefault();
  if (!state.resetValidation) return;
  const newPassword = document.getElementById('reset-new-password').value;
  const confirmPassword = document.getElementById('reset-confirm-password').value;
  if (newPassword.length < 8) {
    setMessage('Password must be at least 8 characters.', true);
    return;
  }
  if (newPassword !== confirmPassword) {
    setMessage('Passwords do not match.', true);
    return;
  }

  try {
    await api('/reset-set', {
      method: 'POST',
      body: JSON.stringify({
        email: state.resetValidation.email,
        username: state.resetValidation.username,
        newPassword,
      })
    });
    document.getElementById('reset-set-form').classList.add('hidden');
    document.getElementById('reset-validate-form').reset();
    document.getElementById('reset-set-form').reset();
    state.resetValidation = null;
    showAuthView('login');
    setMessage('Password updated successfully.');
  } catch (error) {
    setMessage(error.message, true);
  }
}

function startPolling() {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(async () => {
    if (!state.user) return;
    try {
      await loadConversations();
      if (state.activeConversationId) await loadMessagesForConversation(state.activeConversationId);
      await loadFriends();
      await loadRequests();
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }, 4000);
}

function attachEventHandlers() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => showAuthView(button.dataset.authTab));
  });

  els.resetTrigger.addEventListener('click', () => {
    document.getElementById('reset-set-form').classList.add('hidden');
    showAuthView('reset');
  });
  els.resetBackBtn.addEventListener('click', () => {
    document.getElementById('reset-set-form').classList.add('hidden');
    showAuthView('login');
  });

  els.loginForm.addEventListener('submit', handleLogin);
  els.registerForm.addEventListener('submit', handleRegister);
  els.resetValidateForm.addEventListener('submit', handleResetValidate);
  els.resetSetForm.addEventListener('submit', handleResetSet);
  els.logoutBtn.addEventListener('click', logout);
  els.messageForm.addEventListener('submit', sendMessage);
  els.friendSearchBtn.addEventListener('click', searchUsers);
  els.friendSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchUsers();
  });
  els.profileForm.addEventListener('submit', handleProfileSave);
  els.passwordForm.addEventListener('submit', handlePasswordChange);
  els.deleteAccountBtn.addEventListener('click', deleteAccount);

  els.navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      Object.entries(els.views).forEach(([key, element]) => {
        element.classList.toggle('hidden', key !== view);
      });
      els.navButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    });
  });
}

attachEventHandlers();
showAuthView('login');
loadMe();
