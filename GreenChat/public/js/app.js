// App State
const state = {
    currentUser: null,
    currentChatFriend: null,
    socket: null,
    friends: [],
    friendRequests: [],
    friendLists: [],
    onlineUsers: new Set()
};

// DOM Elements
const elements = {
    // Auth
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    showSignup: document.getElementById('show-signup'),
    showLogin: document.getElementById('show-login'),

    // Navigation
    navUserSection: document.getElementById('nav-user-section'),
    navUsername: document.getElementById('nav-username'),
    profileBtn: document.getElementById('profile-btn'),
    logoutBtn: document.getElementById('logout-btn'),

    // Sidebar
    searchInput: document.getElementById('search-input'),
    friendsList: document.getElementById('friends-list'),
    listsContainer: document.getElementById('lists-container'),
    requestsList: document.getElementById('requests-list'),
    requestBadge: document.getElementById('request-badge'),
    createListBtn: document.getElementById('create-list-btn'),

    // Chat
    chatView: document.getElementById('chat-view'),
    emptyState: document.getElementById('empty-state'),
    chatUsername: document.getElementById('chat-username'),
    chatFriendCode: document.getElementById('chat-friend-code'),
    chatStatus: document.getElementById('chat-status'),
    messagesContainer: document.getElementById('messages-container'),
    messageForm: document.getElementById('message-form'),
    messageInput: document.getElementById('message-input'),
    chatBackBtn: document.getElementById('chat-back-btn'),

    // Modals
    profileModal: document.getElementById('profile-modal'),
    createListModal: document.getElementById('create-list-modal'),
    addToListModal: document.getElementById('add-to-list-modal'),
    searchModal: document.getElementById('search-modal'),
    profileUsername: document.getElementById('profile-username'),
    profileFriendCode: document.getElementById('profile-friend-code'),
    copyFriendCode: document.getElementById('copy-friend-code'),
    createListForm: document.getElementById('create-list-form'),
    listName: document.getElementById('list-name'),
    availableLists: document.getElementById('available-lists'),
    searchResults: document.getElementById('search-results'),

    // Toast
    toastContainer: document.getElementById('toast-container')
};

// Initialize App
function init() {
    checkAuth();
    setupEventListeners();
    initSocket();
}

// Check Authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();

        if (data.loggedIn) {
            state.currentUser = data;
            showApp();
            loadFriends();
            loadFriendRequests();
            loadFriendLists();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuth();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth forms
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.signupForm.addEventListener('submit', handleSignup);
    elements.showSignup.addEventListener('click', showSignupForm);
    elements.showLogin.addEventListener('click', showLoginForm);

    // Navigation
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.profileBtn.addEventListener('click', () => showModal('profile-modal'));

    // Search
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });

    // Chat
    elements.messageForm.addEventListener('submit', handleSendMessage);
    elements.chatBackBtn.addEventListener('click', closeChat);

    // Friend lists
    elements.createListBtn.addEventListener('click', () => showModal('create-list-modal'));
    elements.createListForm.addEventListener('submit', handleCreateList);

    // Modal close buttons
    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal.id);
        });
    });

    // Copy friend code
    elements.copyFriendCode.addEventListener('click', handleCopyFriendCode);

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                hideModal(modal.id);
            });
        }
    });
}

// Initialize Socket
function initSocket() {
    state.socket = io();

    state.socket.on('connect', () => {
        console.log('Connected to server');
        if (state.currentUser) {
            state.socket.emit('join', state.currentUser.userId);
        }
    });

    state.socket.on('newMessage', (message) => {
        if (state.currentChatFriend &&
            (message.sender_id === state.currentChatFriend.id ||
             message.receiver_id === state.currentChatFriend.id)) {
            appendMessage(message);
        }
        loadFriends(); // Refresh to update unread counts
    });

    state.socket.on('messageSent', (message) => {
        appendMessage(message);
    });

    state.socket.on('error', (data) => {
        showToast(data.message || 'An error occurred', 'error');
    });

    state.socket.on('userOnline', (data) => {
        state.onlineUsers.add(data.userId);
        updateFriendStatus(data.userId, true);
    });

    state.socket.on('userOffline', (data) => {
        state.onlineUsers.delete(data.userId);
        updateFriendStatus(data.userId, false);
    });
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            state.currentUser = data;
            showApp();
            loadFriends();
            loadFriendRequests();
            loadFriendLists();
            state.socket.emit('join', data.userId);
            showToast('Welcome back!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            state.currentUser = data;
            showApp();
            loadFriends();
            loadFriendRequests();
            loadFriendLists();
            state.socket.emit('join', data.userId);
            showToast('Account created successfully!', 'success');
        } else {
            showToast(data.error || 'Signup failed', 'error');
        }
    } catch (error) {
        showToast('Signup failed. Please try again.', 'error');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        state.currentUser = null;
        state.currentChatFriend = null;
        state.friends = [];
        state.friendRequests = [];
        state.friendLists = [];
        showAuth();
        showToast('Logged out successfully', 'info');
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

// UI Functions
function showAuth() {
    elements.authContainer.style.display = 'flex';
    elements.appContainer.style.display = 'none';
    elements.navUserSection.style.display = 'none';
}

function showApp() {
    elements.authContainer.style.display = 'none';
    elements.appContainer.style.display = 'flex';
    elements.navUserSection.style.display = 'flex';
    elements.navUsername.textContent = state.currentUser.username || 'User';
    elements.profileUsername.textContent = state.currentUser.username || 'User';
    elements.profileFriendCode.textContent = state.currentUser.friendCode || 'N/A';
}

function showSignupForm(e) {
    e.preventDefault();
    elements.loginForm.style.display = 'none';
    elements.signupForm.style.display = 'flex';
    elements.authTitle.textContent = 'Create Account';
    elements.authSubtitle.textContent = 'Join Chat and connect with friends';
}

function showLoginForm(e) {
    e.preventDefault();
    elements.signupForm.style.display = 'none';
    elements.loginForm.style.display = 'flex';
    elements.authTitle.textContent = 'Welcome to Chat';
    elements.authSubtitle.textContent = 'Connect with friends around the world';
}

// Tab Functions
function handleTabChange(e) {
    const tabBtn = e.target.closest('.tab-btn');
    const tabName = tabBtn.dataset.tab;

    // Update active states
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data for the tab
    if (tabName === 'friends') {
        loadFriends();
    } else if (tabName === 'lists') {
        loadFriendLists();
    } else if (tabName === 'requests') {
        loadFriendRequests();
    }
}

// Friend Functions
async function loadFriends() {
    try {
        const response = await fetch('/api/friends');
        if (!response.ok) {
            throw new Error('Failed to load friends');
        }
        const friends = await response.json();
        state.friends = friends || [];
        renderFriends();
    } catch (error) {
        console.error('Failed to load friends:', error);
        state.friends = [];
        renderFriends();
    }
}

function renderFriends() {
    elements.friendsList.innerHTML = '';

    if (!state.friends || state.friends.length === 0) {
        elements.friendsList.innerHTML = `
            <div class="empty-state">
                <p>No friends yet. Search for people to add!</p>
            </div>
        `;
        return;
    }

    state.friends.forEach(friend => {
        if (!friend) return;

        const isOnline = state.onlineUsers.has(friend.id);
        const isActive = state.currentChatFriend && state.currentChatFriend.id === friend.id;

        const friendElement = document.createElement('div');
        friendElement.className = `friend-item ${isActive ? 'active' : ''}`;
        friendElement.innerHTML = `
            <div class="avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="friend-info">
                <div class="friend-name">${escapeHtml(friend.username)}</div>
                <div class="friend-code">Code: ${escapeHtml(friend.friend_code)}</div>
            </div>
            <div class="friend-status ${isOnline ? 'online' : ''}"></div>
            <div class="friend-actions">
                <button class="btn-icon" onclick="openAddToListModal(${friend.id})" title="Add to list">
                    <i class="fas fa-list"></i>
                </button>
            </div>
        `;
        friendElement.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-icon')) {
                openChat(friend);
            }
        });
        elements.friendsList.appendChild(friendElement);
    });
}

async function handleSearch(e) {
    const query = e.target.value.trim();

    if (query.length < 1) {
        hideModal('search-modal');
        return;
    }

    try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
        const users = await response.json();
        renderSearchResults(users);
        showModal('search-modal');
    } catch (error) {
        console.error('Search failed:', error);
    }
}

function renderSearchResults(users) {
    elements.searchResults.innerHTML = '';

    if (!users || users.length === 0) {
        elements.searchResults.innerHTML = `
            <div class="empty-state">
                <p>No users found</p>
            </div>
        `;
        return;
    }

    users.forEach(user => {
        if (!user) return;

        const resultElement = document.createElement('div');
        resultElement.className = 'search-result-item';

        let actionButton = '';
        if (user.friendshipStatus === 'pending') {
            actionButton = '<button class="btn-add-friend" disabled>Pending</button>';
        } else if (user.friendshipStatus === 'accepted') {
            actionButton = '<button class="btn-add-friend" disabled>Friends</button>';
        } else {
            actionButton = `<button class="btn-add-friend" onclick="sendFriendRequest(${user.id})">Add Friend</button>`;
        }

        resultElement.innerHTML = `
            <div class="avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="search-result-info">
                <div class="search-result-name">${escapeHtml(user.username)}</div>
                <div class="search-result-code">Code: ${escapeHtml(user.friend_code)}</div>
            </div>
            <div class="search-result-actions">
                ${actionButton}
            </div>
        `;
        elements.searchResults.appendChild(resultElement);
    });
}

async function sendFriendRequest(friendId) {
    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Friend request sent!', 'success');
            hideModal('search-modal');
            elements.searchInput.value = '';
        } else {
            showToast(data.error || 'Failed to send request', 'error');
        }
    } catch (error) {
        showToast('Failed to send friend request', 'error');
    }
}

// Friend Request Functions
async function loadFriendRequests() {
    try {
        const response = await fetch('/api/friends/requests');
        if (!response.ok) {
            throw new Error('Failed to load friend requests');
        }
        const requests = await response.json();
        state.friendRequests = requests || [];
        renderFriendRequests();
    } catch (error) {
        console.error('Failed to load friend requests:', error);
        state.friendRequests = [];
        renderFriendRequests();
    }
}

function renderFriendRequests() {
    elements.requestsList.innerHTML = '';

    if (!state.friendRequests || state.friendRequests.length === 0) {
        elements.requestsList.innerHTML = `
            <div class="empty-state">
                <p>No pending friend requests</p>
            </div>
        `;
        elements.requestBadge.style.display = 'none';
        return;
    }

    elements.requestBadge.textContent = state.friendRequests.length;
    elements.requestBadge.style.display = 'block';

    state.friendRequests.forEach(request => {
        if (!request) return;

        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.innerHTML = `
            <div class="avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="request-info">
                <div class="request-name">${escapeHtml(request.username)}</div>
                <div class="request-code">Code: ${escapeHtml(request.friend_code)}</div>
            </div>
            <div class="request-actions">
                <button class="btn-accept" onclick="acceptFriendRequest(${request.request_id})">Accept</button>
                <button class="btn-reject" onclick="rejectFriendRequest(${request.request_id})">Reject</button>
            </div>
        `;
        elements.requestsList.appendChild(requestElement);
    });
}

async function acceptFriendRequest(requestId) {
    try {
        const response = await fetch('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Friend request accepted!', 'success');
            loadFriendRequests();
            loadFriends();
        } else {
            showToast(data.error || 'Failed to accept request', 'error');
        }
    } catch (error) {
        showToast('Failed to accept friend request', 'error');
    }
}

async function rejectFriendRequest(requestId) {
    // For now, we'll just reload - in a real app, you'd want a reject endpoint
    showToast('Request rejected', 'info');
    loadFriendRequests();
}

// Friend List Functions
async function loadFriendLists() {
    try {
        const response = await fetch('/api/lists');
        if (!response.ok) {
            throw new Error('Failed to load friend lists');
        }
        const lists = await response.json();
        state.friendLists = lists || [];
        renderFriendLists();
    } catch (error) {
        console.error('Failed to load friend lists:', error);
        state.friendLists = [];
        renderFriendLists();
    }
}

function renderFriendLists() {
    elements.listsContainer.innerHTML = '';

    if (!state.friendLists || state.friendLists.length === 0) {
        elements.listsContainer.innerHTML = `
            <div class="empty-state">
                <p>No friend lists yet. Create one to organize your friends!</p>
            </div>
        `;
        return;
    }

    state.friendLists.forEach(list => {
        if (!list) return;

        const listElement = document.createElement('div');
        listElement.className = 'list-item';

        const membersHtml = (list.members || []).map(member => `
            <div class="list-member">
                ${escapeHtml(member.username)}
                <span class="list-member-remove" onclick="removeFromList(${list.id}, ${member.id})">
                    <i class="fas fa-times"></i>
                </span>
            </div>
        `).join('');

        listElement.innerHTML = `
            <div class="list-header">
                <span class="list-name">${escapeHtml(list.name)}</span>
                <div class="list-actions">
                    <button class="btn-icon" onclick="deleteList(${list.id})" title="Delete list">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="list-members">
                ${membersHtml || '<span class="text-muted">No members yet</span>'}
            </div>
        `;
        elements.listsContainer.appendChild(listElement);
    });
}

async function handleCreateList(e) {
    e.preventDefault();
    const name = elements.listName.value.trim();

    if (!name) return;

    try {
        const response = await fetch('/api/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (data.success) {
            showToast('List created successfully!', 'success');
            elements.listName.value = '';
            hideModal('create-list-modal');
            loadFriendLists();
        } else {
            showToast(data.error || 'Failed to create list', 'error');
        }
    } catch (error) {
        showToast('Failed to create list', 'error');
    }
}

async function deleteList(listId) {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
        const response = await fetch(`/api/lists/${listId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('List deleted', 'success');
            loadFriendLists();
        } else {
            showToast(data.error || 'Failed to delete list', 'error');
        }
    } catch (error) {
        showToast('Failed to delete list', 'error');
    }
}

function openAddToListModal(friendId) {
    renderAvailableLists(friendId);
    showModal('add-to-list-modal');
}

function renderAvailableLists(friendId) {
    elements.availableLists.innerHTML = '';

    if (!state.friendLists || state.friendLists.length === 0) {
        elements.availableLists.innerHTML = `
            <div class="empty-state">
                <p>No lists available. Create one first!</p>
            </div>
        `;
        return;
    }

    state.friendLists.forEach(list => {
        if (!list) return;

        const isAlreadyInList = (list.members || []).some(m => m.id === friendId);

        const listElement = document.createElement('div');
        listElement.className = 'available-list-item';
        listElement.textContent = list.name;

        if (!isAlreadyInList) {
            listElement.addEventListener('click', () => addToList(list.id, friendId));
        } else {
            listElement.style.opacity = '0.5';
            listElement.style.cursor = 'not-allowed';
            listElement.textContent += ' (already added)';
        }

        elements.availableLists.appendChild(listElement);
    });
}

async function addToList(listId, friendId) {
    try {
        const response = await fetch(`/api/lists/${listId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Added to list!', 'success');
            hideModal('add-to-list-modal');
            loadFriendLists();
        } else {
            showToast(data.error || 'Failed to add to list', 'error');
        }
    } catch (error) {
        showToast('Failed to add to list', 'error');
    }
}

async function removeFromList(listId, friendId) {
    try {
        const response = await fetch(`/api/lists/${listId}/members/${friendId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Removed from list', 'success');
            loadFriendLists();
        } else {
            showToast(data.error || 'Failed to remove from list', 'error');
        }
    } catch (error) {
        showToast('Failed to remove from list', 'error');
    }
}

// Chat Functions
async function openChat(friend) {
    if (!friend) return;

    state.currentChatFriend = friend;

    // Update UI
    elements.emptyState.style.display = 'none';
    elements.chatView.style.display = 'flex';
    elements.chatUsername.textContent = friend.username || 'Unknown';
    elements.chatFriendCode.textContent = `Code: ${friend.friend_code || 'N/A'}`;

    const isOnline = state.onlineUsers.has(friend.id);
    elements.chatStatus.textContent = isOnline ? 'Online' : 'Offline';
    elements.chatStatus.className = `status ${isOnline ? 'online' : ''}`;

    // Load messages
    await loadMessages(friend.id);

    // Update active state in friends list
    renderFriends();

    // Focus message input
    elements.messageInput.focus();
}

function closeChat() {
    state.currentChatFriend = null;
    elements.chatView.style.display = 'none';
    elements.emptyState.style.display = 'flex';
    elements.messagesContainer.innerHTML = '';
    renderFriends();
}

async function loadMessages(friendId) {
    try {
        const response = await fetch(`/api/messages/${friendId}`);
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        const messages = await response.json();
        elements.messagesContainer.innerHTML = '';
        (messages || []).forEach(message => appendMessage(message));
        scrollToBottom();
    } catch (error) {
        console.error('Failed to load messages:', error);
        showToast('Failed to load messages', 'error');
    }
}

function appendMessage(message) {
    if (!message || !state.currentUser) return;

    const isSent = message.sender_id === state.currentUser.userId;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;

    const time = new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageElement.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble">${escapeHtml(message.message || '')}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    elements.messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

function handleSendMessage(e) {
    e.preventDefault();
    const message = elements.messageInput.value.trim();

    if (!message || !state.currentChatFriend) return;

    state.socket.emit('sendMessage', {
        receiverId: state.currentChatFriend.id,
        message: message
    });

    elements.messageInput.value = '';
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function updateFriendStatus(userId, isOnline) {
    const friendElements = document.querySelectorAll('.friend-item');
    friendElements.forEach(element => {
        const statusElement = element.querySelector('.friend-status');
        if (statusElement) {
            if (isOnline) {
                statusElement.classList.add('online');
            } else {
                statusElement.classList.remove('online');
            }
        }
    });

    // Update current chat if this is the friend we're chatting with
    if (state.currentChatFriend && state.currentChatFriend.id === userId) {
        elements.chatStatus.textContent = isOnline ? 'Online' : 'Offline';
        elements.chatStatus.className = `status ${isOnline ? 'online' : ''}`;
    }
}

// Utility Functions
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    }[type];

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleCopyFriendCode() {
    const friendCode = elements.profileFriendCode.textContent;
    navigator.clipboard.writeText(friendCode).then(() => {
        showToast('Friend code copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// Make functions globally available for onclick handlers
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.rejectFriendRequest = rejectFriendRequest;
window.deleteList = deleteList;
window.removeFromList = removeFromList;
window.openAddToListModal = openAddToListModal;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);