// Cloudflare KV Configuration
// To use: Bind a KV namespace named SHARED_KV in Cloudflare Pages > Settings > Bindings
// Or use D1 named DB as alternative

// KV binding - set this from your Cloudflare deployment
const KV_NAMESPACE = 'SHARED_KV';

// Storage keys
const STORAGE_KEYS = {
    USER: 'greenchat_user',
    FRIENDS: 'greenchat_friends',
    CHATS: 'greenchat_chats'
};

// Initial state
let currentUser = null;
let currentChatFriend = null;
let messages = [];

/* ===== DOM Elements === */
const loginPage = document.getElementById('loginPage');
const chatPage = document.getElementById('chatPage');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const friendsList = document.getElementById('friendsList');
const messagesContainer = document.getElementById('messages');
const currentChatSpan = document.getElementById('currentChat');
const currentUserSpan = document.getElementById('currentUser');
const addFriendBtn = document.getElementById('addFriendBtn');
const menuBtn = document.getElementById('menuBtn');

// ===== Authentication Functions === */

async function loginWithGoogle() {
    // Google OAuth flow - redirect to Google
    window.location.href = '/api/auth/google';
}

async function showEmailLogin() {
    // Show email/username login form
    loginPage.innerHTML = `
        <div class="login-container">
            <h1>GreenChat</h1>
            <p>Real-time messaging</p>
            <div class="login-form">
                <input type="email" id="emailInput" placeholder="Email" required>
                <input type="text" id="usernameInput" placeholder="Username" required>
                <button class="btn-primary" onclick="finishEmailLogin()">Join GreenChat</button>
            </div>
        </div>
    `;
}

async function finishEmailLogin() {
    const email = document.getElementById('emailInput').value;
    const username = document.getElementById('usernameInput').value;
    
    // Save user to KV
    const userKey = `${STORAGE_KEYS.USER}:${username}`;
    await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username })
    });
    
    currentUser = { email, username };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    showChatPage();
}

// ===== Initialize App === */

async function initApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showChatPage();
    } else {
        showLoginPage();
    }
    
    // Load friends from KV
    await loadFriends();
    
    // Event listeners
    sendBtn.onclick = sendMessage;
    messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendMessage();
    });
    addFriendBtn.onclick = showAddFriendModal;
    menuBtn.onclick = toggleSidebar;
}

// ===== Cloudflare KV Functions === */

async function loadFriends() {
    try {
        const response = await fetch(`/api/kv?key=${STORAGE_KEYS.FRIENDS}`);
        const data = await response.json();
        renderFriends(data || []);
    } catch (err) {
        console.error('Failed to load friends:', err);
        renderFriends([]);
    }
}

async function saveFriend(friendData) {
    try {
        const response = await fetch('/api/kv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: STORAGE_KEYS.FRIENDS, value: friendData })
        });
        const result = await response.json();
        if (result.success) await loadFriends();
    } catch (err) {
        console.error('Failed to save friend:', err);
    }
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatFriend) return;
    
    const message = {
        id: Date.now(),
        text,
        user: currentUser.username,
        timestamp: new Date().toISOString(),
        to: currentChatFriend
    };
    
    // Save message to KV
    await fetch('/api/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key: `${STORAGE_KEYS.CHATS}:${currentChatFriend}:${currentUser.username}`,
            value: message
        })
    });
    
    // Add to local display
    addMessageToUI(message, 'user');
    messageInput.value = '';
    
    // Real-time: reload messages after short delay
    setTimeout(loadMessages, 500);
}

async function loadMessages() {
    if (!currentChatFriend) return;
    
    const keyPrefix = `${STORAGE_KEYS.CHATS}:${currentChatFriend}`;
    try {
        const response = await fetch(`/api/kv?prefix=${keyPrefix}`);
        const data = await response.json();
        renderMessages(data || []);
        currentChatSpan.textContent = `Chatting with ${currentChatFriend}`;
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function addMessageToUI(message, type) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${type}`;
    msgEl.innerHTML = `
        <div class="message-user">${message.user}</div>
        <div>${text(message.text)}</div>
        <div class="message-time">${formatTime(message.timestamp)}</div>
    `;
    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderFriends(friends) {
    if (friends.length === 0) {
        friendsList.innerHTML = '<p class="empty-state">No friends yet. Add someone above!</p>';
        return;
    }
    
    friendsList.innerHTML = friends.map(friend => `
        <div class="friend-item ${friend.online ? 'online' : ''}" onclick="selectFriend('${friend.username}')">
            <div class="friend-info">
                <div class="friend-icon"></div>
                <div>
                    <div class="friend-name">${friend.username}</div>
                    <div class="friend-status">${friend.online ? 'Online' : 'Offline'}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderMessages(messages) {
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<p class="empty-state">Start a conversation</p>';
        return;
    }
    
    messagesContainer.innerHTML = messages.map(msg => `
        <div class="message ${msg.user === currentUser.username ? 'user' : 'other'}">
            <div class="message-user">${msg.user}</div>
            <div>${text(msg.text)}</div>
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        </div>
    `).join('');
}

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);
    
    if (diffMinutes === 0) return 'Just now';
    if (diffMinutes === 1) return '1 min ago';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
}

function selectFriend(username) {
    currentChatFriend = username;
    loadMessages();
    renderFriends(friendsList.querySelectorAll('.friend-item').map(el => {
        const name = el.querySelector('.friend-name').textContent;
        return { username: name, online: el.classList.contains('online') }
    }));
    currentChatSpan.textContent = `Chatting with ${username}`;
}

function toggleSidebar() {
    // Mobile sidebar toggle
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

/* ===== Add Friend Modal === */

async function showAddFriendModal() {
    const username = prompt('Enter username to add as friend:');
    if (!username) return;
    
    // Check if user exists or add as friend
    const existingFriends = await getFriends();
    if (existingFriends.some(f => f.username === username)) {
        alert('User is already in your friends list!');
        return;
    }
    
    await saveFriend({ username, online: false });
}

// Helper to get all friends
async function getFriends() {
    const response = await fetch(`/api/kv?key=${STORAGE_KEYS.FRIENDS}`);
    return await response.json() || [];
}

// Start the app
initApp();