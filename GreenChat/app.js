import { setupTokenAuth } from './auth.js';

const API_BASE = '/api';

const state = {
  user: null,
  currentConversation: null,
  isLoggedIn: false,
};

const elements = {
  userPanel: document.getElementById('userPanel'),
  usernameDisplay: document.getElementById('usernameDisplay'),
  logoutBtn: document.getElementById('logoutBtn'),
  sidebar: document.getElementById('sidebar'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  friendsSection: document.getElementById('friendsSection'),
  friendsList: document.getElementById('friendsList'),
  requestsSection: document.getElementById('requestsSection'),
  requestsList: document.getElementById('requestsList'),
  main: document.getElementById('main'),
  conversations: document.getElementById('conversations'),
  conversationList: document.getElementById('conversationList'),
  chatArea: document.getElementById('chatArea'),
  chatHeader: document.getElementById('chatHeader'),
  chatUser: document.getElementById('chatUser'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  backBtn: document.getElementById('backBtn'),
};

async function loadUser() {
  const response = await fetch(`${API_BASE}/me`, {
    credentials: 'include',
  });
  
  if (response.ok) {
    const data = await response.json();
    state.user = data.user;
    state.isLoggedIn = true;
    
    elements.usernameDisplay.textContent = state.user.full_name || state.user.email;
    elements.userPanel.style.display = 'flex';
    
    // Load friends and conversations
    await loadFriends();
    await loadConversations();
  } else {
    state.user = null;
    state.isLoggedIn = false;
    elements.userPanel.style.display = 'none';
    showScreen('login');
  }
}

function showScreen(screenName) {
  // Hide all sections
  elements.sidebar.style.display = 'none';
  elements.main.style.display = 'none';
  
  if (screenName === 'login') {
    elements.userPanel.style.display = 'none';
    elements.sidebar.style.display = 'block';
    elements.main.style.display = 'block';
    elements.conversations.style.display = 'block';
    elements.conversationList.innerHTML = '<div class="empty-state">Please log in to start chatting</div>';
    elements.chatArea.style.display = 'none';
  } else if (screenName === 'dashboard') {
    elements.sidebar.style.display = 'block';
    elements.main.style.display = 'block';
    elements.conversations.style.display = 'block';
    elements.chatArea.style.display = 'block';
  }
}

async function loadFriends() {
  if (!state.user) return;
  
  const response = await fetch(`${API_BASE}/friends`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  if (response.ok) {
    const { friends, requests } = await response.json();
    
    // Render friends
    if (friends.length === 0) {
      elements.friendsList.innerHTML = '<div class="list-empty">No friends yet</div>';
    } else {
      elements.friendsList.innerHTML = friends
        .map(friendEmail => {
          const friendStr = localStorage.getItem(`user_${friendEmail}`);
          let name = friendEmail;
          if (friendStr) {
            const u = JSON.parse(friendStr);
            name = u.full_name || friendEmail;
          }
          return `<div class="conversation-item ${state.user.email === friendEmail ? 'active' : ''}" data-email="${friendEmail}">
            <div class="conversation-avatar">${name.slice(0, 2).toUpperCase()}</div>
            <div class="conversation-info">
              <div class="name" title="${name}">${name}</div>
              <div class="preview">Online</div>
            </div>
            <div class="online-indicator"></div>
          </div>`;
        })
        .join('');
    }
    
    // Render requests
    if (requests.length === 0) {
      elements.requestsList.innerHTML = '<div class="list-empty">No requests</div>';
    } else {
      elements.requestsList.innerHTML = requests
        .map(req => {
          const isPending = !req.accepted;
          return `<div class="conversation-item pending" data-email="${req.from}">
            <div class="conversation-avatar">${req.from.slice(0, 2).toUpperCase()}</div>
            <div class="conversation-info">
              <div class="name">${req.from}</div>
              <div class="pending-request">Friend request</div>
            </div>
            <div class="online-indicator"></div>
          </div>`;
        })
        .join('');
    }
  }
}

async function loadConversations() {
  if (!state.user) return;
  
  const response = await fetch(`${API_BASE}/conversations?userEmail=${state.user.email}`, {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  if (response.ok) {
    const { conversations } = await response.json();
    
    if (Object.keys(conversations).length === 0) {
      elements.conversationList.innerHTML = '<div class="empty-state">Select a conversation to start chatting</div>';
      elements.chatArea.style.display = 'none';
      return;
    }
    
    elements.conversationList.innerHTML = Object.entries(conversations)
      .map(([key, messages]) => {
        const userEmail = key.split(':')[1];
        const otherUser = userEmail !== state.user.email ? userEmail : userEmail.replace(/^conv:/, '');
        
        // Get the most recent message
        const msgs = messages || [];
        const lastMsg = msgs.length > 0 
          ? msgs[msgs.length - 1] 
          : { content: 'No messages yet', from: state.user.email, created_at: 0 };
        
        const isOutgoing = lastMsg.from === state.user.email;
        const lastMsgContent = isOutgoing 
          ? lastMsg.content 
          : (lastMsg.content ? lastMsg.content.substring(0, 30) + '...' : 'No messages yet');
        
        const lastMsgTime = lastMsg.created_at 
          ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : '';
        
        const otherName = localStorage.getItem(`user_${otherUser}`);
        let displayName = otherUser;
        if (otherName) {
          const u = JSON.parse(otherName);
          displayName = u.full_name || otherUser;
        }
        
        const cls = isOutgoing ? 'conversation-item outgoing' : 'conversation-item incoming';
        
        return `<div class="conversation-item ${state.user.email === otherUser ? 'active' : ''}" data-email="${otherUser}">
          <div class="conversation-avatar">${displayName.slice(0, 2).toUpperCase()}</div>
          <div class="conversation-info">
            <div class="name" title="${displayName}">${displayName}</div>
            <div class="preview ${isOutgoing ? 'outgoing' : 'incoming'}">${lastMsgContent}</div>
          </div>
          <div class="timestamp">${lastMsgTime}</div>
        </div>`;
      })
      .join('');
    
    elements.chatArea.style.display = 'block';
  }
}

function getToken() {
  // Get token from localStorage or cookie
  return localStorage.getItem('greenchat_token') || '';
}

function setToken(token) {
  localStorage.setItem('greenchat_token', token);
}

async function handleSearch() {
  const query = elements.searchInput.value.trim();
  if (!query || !state.user) return;
  
  const response = await fetch(`${API_BASE}/users/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  if (response.ok) {
    const { users } = await response.json();
    renderSearchResults(users);
  }
}

function renderSearchResults(users) {
  const container = document.createElement('div');
  container.className = 'sidebar-section';
  container.innerHTML = `<h3>Results</h3>`;
  
  if (users.length === 0) {
    container.innerHTML += '<div class="list-empty">No users found</div>';
  } else {
    container.innerHTML += users
      .map(user => {
        const name = localStorage.getItem(`user_${user.email}`) 
          ? (JSON.parse(localStorage.getItem(`user_${user.email}`)).full_name || user.email)
          : user.email;
        
        const isFriend = document.querySelector(`[data-email="${user.email}"]`);
        const alreadyFriend = isFriend ? 'already-friend' : '';
        
        return `<div class="conversation-item ${alreadyFriend}" data-email="${user.email}" style="cursor: pointer;">
          <div class="conversation-avatar">${name.slice(0, 2).toUpperCase()}</div>
          <div class="conversation-info">
            <div class="name">${name}</div>
            <div class="preview">Send friend request</div>
          </div>
        </div>`;
      })
      .join('');
  }
  
  // Replace requests section
  elements.requestsList.innerHTML = '';
  elements.requestsSection.appendChild(container);
  
  // Add click handlers
  container.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const email = item.dataset.email;
      startConversation(email);
    });
  });
}

async function startConversation(targetEmail) {
  state.currentConversation = targetEmail;
  
  // Hide conversation list, show chat area
  elements.conversationList.style.display = 'none';
  elements.chatArea.style.display = 'block';
  
  // Update chat header
  const otherName = localStorage.getItem(`user_${targetEmail}`);
  let displayName = targetEmail;
  if (otherName) {
    const u = JSON.parse(otherName);
    displayName = u.full_name || targetEmail;
  }
  
  elements.chatUser.textContent = displayName;
  elements.chatHeader.classList.add('active');
  elements.backBtn.style.display = 'inline-block';
  
  // Load messages
  await loadMessages(targetEmail);
  
  // Update sidebar
  elements.conversationList.querySelectorAll('.conversation-item').forEach(el => {
    el.classList.toggle('active', el.dataset.email === targetEmail);
  });
}

async function loadMessages(targetEmail) {
  if (!state.user) return;
  
  const url = new URL(`${API_BASE}/messages`);
  url.searchParams.set('target', targetEmail);
  
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  if (response.ok) {
    const { messages } = await response.json();
    
    // Reverse so oldest first
    const sorted = messages.sort((a, b) => a.created_at - b.created_at);
    
    elements.messages.innerHTML = sorted.map(msg => {
      const otherEmail = msg.from === state.user.email ? targetEmail : msg.from;
      const otherName = localStorage.getItem(`user_${otherEmail}`);
      let name = otherEmail;
      if (otherName) {
        const u = JSON.parse(otherName);
        name = u.full_name || otherEmail;
      }
      
      const isOutgoing = msg.from === state.user.email;
      const cls = isOutgoing ? 'message outgoing' : 'message incoming';
      
      return `<div class="${cls}">
        <span>${escapeHtml(msg.content)}</span>
        <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>`;
    }).join('');
    
    // Scroll to bottom
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage() {
  const content = elements.messageInput.value.trim();
  if (!content || !state.user || !state.currentConversation) return;
  
  await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetEmail: state.currentConversation,
      content,
    }),
  });
  
  elements.messageInput.value = '';
  await loadMessages(state.currentConversation);
}

// Event listeners
elements.logoutBtn.addEventListener('click', async () => {
  await fetch(`${API_BASE}/logout`, {
    method: 'GET',
    credentials: 'include',
  });
  state.user = null;
  state.isLoggedIn = false;
  elements.usernameDisplay.textContent = 'Loading...';
  elements.userPanel.style.display = 'none';
  showScreen('login');
});

elements.searchBtn.addEventListener('click', handleSearch);

elements.searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

elements.messages.addEventListener('click', (e) => {
  const msgDiv = e.target.closest('.message');
  if (!msgDiv) return;
  
  // Could add read receipt logic here
});

elements.sendBtn.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

elements.backBtn.addEventListener('click', () => {
  elements.conversationList.style.display = 'block';
  elements.chatArea.style.display = 'none';
  elements.chatHeader.classList.remove('active');
  elements.backBtn.style.display = 'none';
  state.currentConversation = null;
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (!state.isLoggedIn) {
    showScreen('login');
  } else {
    loadUser();
  }
});