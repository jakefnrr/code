// Neon Chat 2 - Main Application
// Connects frontend to Cloudflare Worker API with KV persistence

// --- Configuration ---
const API_BASE = '/api';
const LANGUAGES = ['en', 'fr', 'th', 'ja'];

// --- State ---
let currentUser = null;
let currentLanguage = 'en';
let currentConversationId = null;
let messages = [];
let friends = [];
let requests = [];
let username = '';

// --- Language System ---
const translations = {
    en: {
        welcome: 'Enter your username to begin',
        login: 'ENTER NEON CHAT',
        error: 'Error',
        success: 'Success',
        sending: 'SENDING...',
        message_sent: 'Message sent',
        empty_message: 'Message cannot be empty',
        username_taken: 'Username already taken',
        username_invalid: 'Username invalid',
        user_not_found: 'User not found',
        already_friends: 'Already friends',
        request_sent: 'Request sent',
        request_already_sent: 'Request already sent',
        cannot_add_self: 'Cannot add yourself',
        not_authorized: 'Not authorized',
        loading_chats: 'LOADING CHATS...',
        loading_friends: 'LOADING FRIENDS...',
        loading_requests: 'LOADING REQUESTS...',
        logout: 'LOG OUT',
        change_username: 'CHANGE USERNAME',
        logout_success: 'Logged out successfully',
        settings: 'SETTINGS',
        account: 'ACCOUNT',
        language: 'LANGUAGE',
        send: 'SEND',
        back: 'BACK',
        conversation: 'Conversation',
        no_conversations: 'No conversations yet',
        no_friends: 'No friends yet',
        no_requests: 'No requests yet',
        search_placeholder: 'Enter username to search',
        search_no_results: 'No users found',
        friend_added: 'Friend added',
        request_declined: 'Request declined',
        request_accepted: 'Request accepted',
        online: 'Online',
        offline: 'Offline',
        message_just_now: 'Just now',
        minute: 'minute',
        minutes: 'minutes',
        hour: 'hour',
        hours: 'hours',
        day: 'day',
        days: 'days'
    },
    fr: {
        welcome: 'Entrez votre nom d\'utilisateur pour commencer',
        login: 'ENTRER DANS NEON CHAT',
        error: 'Erreur',
        success: 'Succès',
        sending: 'ENVOI...',
        message_sent: 'Message envoyé',
        empty_message: 'Le message ne peut pas être vide',
        username_taken: 'Nom d\'utilisateur déjà pris',
        username_invalid: 'Nom d\'utilisateur invalide',
        user_not_found: 'Utilisateur introuvable',
        already_friends: 'Déjà amis',
        request_sent: 'Demande envoyée',
        request_already_sent: 'Demande déjà envoyée',
        cannot_add_self: 'Ne pouvez pas vous ajouter vous-même',
        not_authorized: 'Non autorisé',
        loading_chats: 'CHARGEMENT DES DISCUSSIONS...',
        loading_friends: 'CHARGEMENT DES AMIS...',
        loading_requests: 'CHARGEMENT DES DEMANDES...',
        logout: 'SE DÉCONNECTER',
        change_username: 'MODIFIER NOM D\'UTILISATEUR',
        logout_success: 'Déconnexion réussie',
        settings: 'PARAMÈTRES',
        account: 'COMPTE',
        language: 'LANGUE',
        send: 'ENVOYER',
        back: 'RETOUR',
        conversation: 'Conversation',
        no_conversations: 'Aucune discussion pour le moment',
        no_friends: 'Aucun ami pour le moment',
        no_requests: 'Aucune demande pour le moment',
        search_placeholder: 'Entrez un nom d\'utilisateur à rechercher',
        search_no_results: 'Aucun utilisateur trouvé',
        friend_added: 'Ami ajouté',
        request_declined: 'Demande refusée',
        request_accepted: 'Demande acceptée',
        online: 'En ligne',
        offline: 'Hors ligne',
        message_just_now: 'Il y a tout juste',
        minute: 'minute',
        minutes: 'minutes',
        hour: 'heure',
        hours: 'heures',
        day: 'jour',
        days: 'jours'
    },
    th: {
        welcome: 'กรอกรหัสผู้ใช้เพื่อเริ่มต้น',
        login: 'เข้าใช้งานเนออนแชท',
        error: 'ข้อผิดพลาด',
        success: 'สำเร็จ',
        sending: 'กำลังส่ง...',
        message_sent: 'ส่งข้อความแล้ว',
        empty_message: 'ข้อความไม่ได้รับอนุญาต',
        username_taken: 'ชื่อผู้ใช้ซ้ำแล้ว',
        username_invalid: 'ชื่อผู้ใช้ไม่ถูกต้อง',
        user_not_found: 'ไม่พบผู้ใช้',
        already_friends: 'เพื่อนแล้ว',
        request_sent: 'ส่งคำขอ',
        request_already_sent: 'ส่งคำขอแล้ว',
        cannot_add_self: 'ห้ามเพิ่มตัวเอง',
        not_authorized: 'ไม่ได้รับอนุญาต',
        loading_chats: 'กำลังโหลดการสนทนา...',
        loading_friends: 'กำลังโหลดเพื่อน...',
        loading_requests: 'กำลังโหลดคำขอ...',
        logout: 'ออกจากระบบ',
        change_username: 'เปลี่ยนชื่อผู้ใช้',
        logout_success: 'ออกจากระบบสำเร็จ',
        settings: 'การตั้งค่า',
        account: 'บัญชี',
        language: 'ภาษา',
        send: 'ส่ง',
        back: 'กลับ',
        conversation: 'การสนทนา',
        no_conversations: 'ไม่มีการสนทนาสำหรับขณะนี้',
        no_friends: 'ไม่มีเพื่อนสำหรับขณะนี้',
        no_requests: 'ไม่มีคำขอสำหรับขณะนี้',
        search_placeholder: 'ป้อนชื่อผู้ใช้เพื่อค้นหา',
        search_no_results: 'ไม่พบผู้ใช้',
        friend_added: 'เพื่อนเพิ่ม',
        request_declined: 'ปฏิเสธคำขอ',
        request_accepted: 'ยอมรับคำขอ',
        online: 'ออนไลน์',
        offline: 'ออฟไลน์',
        message_just_now: 'เพิ่งสักครู่',
        minute: 'นาที',
        minutes: 'นาที',
        hour: 'ชั่วโมง',
        hours: 'ชั่วโมง',
        day: 'วัน',
        days: 'วัน'
    },
    ja: {
        welcome: 'ユーザーネームを入力して開始',
        login: 'NEON CHATへようこそ',
        error: 'エラー',
        success: '成功',
        sending: '送信中...',
        message_sent: 'メッセージ送信完了',
        empty_message: 'メッセージは空にできません',
        username_taken: 'ユーザーネームは既に取られています',
        username_invalid: 'ユーザーネームが無効です',
        user_not_found: 'ユーザーが見つかりません',
        already_friends: '既に友達',
        request_sent: 'リクエスト送信',
        request_already_sent: 'リクエスト既に送信済み',
        cannot_add_self: '自分を追加できません',
        not_authorized: '認証されていません',
        loading_chats: 'チャット読み込み中...',
        loading_friends: '友達読み込み中...',
        loading_requests: 'リクエスト読み込み中...',
        logout: 'ログアウト',
        change_username: 'ユーザー名変更',
        logout_success: 'ログアウト完了',
        settings: '設定',
        account: 'アカウント',
        language: '言語',
        send: '送信',
        back: '戻る',
        conversation: '会話',
        no_conversations: '現在の会話はありません',
        no_friends: '友達がいません',
        no_requests: 'リクエストはありません',
        search_placeholder: 'ユーザー名を検索',
        search_no_results: 'ユーザーが見つかりません',
        friend_added: '友達追加',
        request_declined: 'リクエスト拒否',
        request_accepted: 'リクエスト承認',
        online: 'オンライン',
        offline: 'オフライン',
        message_just_now: 'すぐ以前',
        minute: '分',
        minutes: '分',
        hour: '時間',
        hours: '時間',
        day: '日',
        days: '日'
    }
};

function i18n(key) {
    return translations[currentLanguage][key] || key;
}

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && translations[currentLanguage][key]) {
            el.textContent = translations[currentLanguage][key];
        }
    });
    
    // Update placeholder texts
    const inputs = document.querySelectorAll('input[placeholder]');
    inputs.forEach(input => {
        const key = input.getAttribute('data-i18n-placeholder');
        if (key && translations[currentLanguage][key]) {
            input.placeholder = translations[currentLanguage][key];
        }
    });
    
    // Update button texts with data-i18n
    document.querySelectorAll('button[data-i18n]').forEach(btn => {
        const key = btn.getAttribute('data-i18n');
        if (key && translations[currentLanguage][key]) {
            btn.textContent = translations[currentLanguage][key];
        }
    });
}

// --- DOM Elements ---
const welcomeScreen = document.getElementById('welcome-screen');
const chatInterface = document.getElementById('chat-interface');
const friendsSection = document.getElementById('friends-section');
const requestsSection = document.getElementById('requests-section');
const searchSection = document.getElementById('search-section');
const settingsSection = document.getElementById('settings-section');

const authContainer = document.getElementById('auth-container');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const authStatus = document.getElementById('auth-status');

const conversationTitle = document.getElementById('conversation-title');
const messagesList = document.getElementById('messages-list');
const loadingMessages = document.getElementById('loading-messages');
const messageInputField = document.getElementById('message-input-field');
const sendBtn = document.getElementById('send-btn');
const messageInputForm = document.getElementById('message-input');

const friendsGrid = document.getElementById('friends-grid');
const loadingFriends = document.getElementById('loading-friends');

const requestsList = document.getElementById('requests-list');
const loadingRequests = document.getElementById('loading-requests');

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

const usernameDisplay = document.getElementById('username-display');
const newUsernameInput = document.getElementById('new-username');
const changeUsernameBtn = document.getElementById('change-username-btn');
const changeUsernameStatus = document.getElementById('change-username-status');
const logoutBtn = document.getElementById('logout-btn');

const languageSelect = document.getElementById('language-select');

const statusMessage = document.getElementById('status-message');
const loadingOverlay = document.getElementById('loading-overlay');

const navChats = document.querySelector('[data-nav="chats"]');
const navFriends = document.querySelector('[data-nav="friends"]');
const navRequests = document.querySelector('[data-nav="requests"]');
const navSearch = document.querySelector('[data-nav="search"]');
const navSettings = document.querySelector('[data-nav="settings"]');

// --- Show/Hide Screens ---
function showScreen(screenId) {
    [welcomeScreen, chatInterface, friendsSection, requestsSection, searchSection, settingsSection].forEach(s => {
        s.classList.add('hidden');
    });
    if (screenId && document.getElementById(screenId)) {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

function hideAllSections() {
    [friendsSection, requestsSection, searchSection, settingsSection].forEach(s => s.classList.add('hidden'));
}

// --- API Functions ---
async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const defaults = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const config = { ...defaults, ...options };
    
    // Add auth cookie if we have a session
    if (currentUser && currentUser.session) {
        config.headers['Cookie'] = `gc_session=${currentUser.session}`;
    }
    
    const response = await fetch(url, {
        ...config,
        ...options,
    });
    
    return { response, data: await response.json().catch(() => ({})) };
}

async function apiGet(path) {
    return api(path);
}

async function apiPost(path, body) {
    return api(path, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

async function apiPatch(path, body) {
    return api(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

async function apiDelete(path) {
    return api(path, {
        method: 'DELETE',
    });
}

// --- Authentication ---
async function loginOrRegister(username) {
    username = username.trim();
    if (!username || username.length < 3 || username.length > 24) {
        showAuthError(i18n('username_invalid'));
        return false;
    }
    
    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        showAuthError(i18n('username_invalid'));
        return false;
    }
    
    // Try login first
    const { data, response } = await apiPost('/api/login', { username });
    
    if (response.status === 200) {
        currentUser = data.user;
        currentUser.session = response.headers.get('Set-Cookie')?.match(/gc_session=([a-f0-9]+)/)?.[1];
        if (!currentUser.session) {
            showAuthError(i18n('server_error'));
            return false;
        }
        localStorage.setItem('neonchat-user', JSON.stringify({ username, session: currentUser.session }));
        return true;
    }
    
    // Login failed, try registration
    if (data.error === 'Username taken' || response.status === 409) {
        showAuthError(i18n('username_taken'));
        return false;
    }
    
    const { data: regData, response: regResponse } = await apiPost('/api/register', { username });
    
    if (regResponse.status !== 201) {
        showAuthError(regData.error || i18n('server_error'));
        return false;
    }
    
    currentUser = regData.user;
    currentUser.session = regResponse.headers.get('Set-Cookie')?.match(/gc_session=([a-f0-9]+)/)?.[1];
    localStorage.setItem('neonchat-user', JSON.stringify({ username, session: currentUser.session }));
    return true;
}

function showAuthError(message) {
    if (authStatus) {
        authStatus.textContent = message;
        authStatus.className = 'status error';
        authStatus.style.display = 'block';
    }
}

function clearAuthStatus() {
    if (authStatus) {
        authStatus.style.display = 'none';
        authStatus.textContent = '';
    }
}

// --- Initialize User ---
function initUser() {
    // Check for remembered session
    const saved = localStorage.getItem('neonchat-user');
    if (saved) {
        try {
            const userData = JSON.parse(saved);
            // Verify session by calling /api/me
            const { data } = apiGet('/api/me');
            // We'll handle this after the page loads
            currentUser = { ...userData, session: userData.session };
            
            // Check language preference
            const savedLang = localStorage.getItem('neonchat-lang');
            if (savedLang && LANGUAGES.includes(savedLang)) {
                currentLanguage = savedLang;
                languageSelect.value = savedLang;
            }
            
            return true;
        } catch (e) {
            localStorage.removeItem('neonchat-user');
        }
    }
    
    // Set default language
    languageSelect.value = currentLanguage;
    return false;
}

// --- Chat Interface ---
function showChat() {
    showScreen('chat-interface');
    showScreen('friends-section');
    updateUsernameDisplay();
    loadChats();
    loadFriends();
    loadRequests();
    startPolling();
}

function updateUsernameDisplay() {
    if (usernameDisplay && currentUser) {
        usernameDisplay.value = currentUser.username;
    }
}

function showStatus(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.className = `status ${type || ''}`;
    el.style.display = message ? 'block' : 'none';
}

// --- Render Functions ---
function renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.from === currentUser.id ? 'yours' : 'other'}`;
    const time = formatTimestamp(msg.ts);
    div.innerHTML = `
        <span class="sender">${escapeHtml(msg.from)}</span>
        <p>${escapeHtml(msg.text)}</p>
        <span class="timestamp">${time}</span>
    `;
    return div;
}

function formatTimestamp(ts) {
    const now = Date.now();
    const diff = now - ts;
    const minute = 60000;
    const hour = 3600000;
    const day = 86400000;
    
    if (diff < 0) return i18n('message_just_now');
    
    if (diff < minute) {
        return i18n('message_just_now');
    } else if (diff < hour) {
        const mins = Math.floor(diff / minute);
        return `${mins} ${mins === 1 ? i18n('minute') : i18n('minutes') || 'min'} ${i18n('ago')}`;
    } else if (diff < day) {
        const hrs = Math.floor(diff / hour);
        return `${hrs} ${hrs === 1 ? i18n('hour') : i18n('hours') || 'hr'} ${i18n('ago')}`;
    } else {
        const days = Math.floor(diff / day);
        return `${days} ${days === 1 ? i18n('day') : i18n('days') || 'day'} ${i18n('ago')}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMessages(messagesToRender) {
    messagesList.innerHTML = '';
    
    if (!messagesToRender || messagesToRender.length === 0) {
        messagesList.innerHTML = `<p>${i18n('no_conversations')}</p>`;
        return;
    }
    
    messagesToRender.forEach(msg => {
        const div = renderMessage(msg);
        messagesList.appendChild(div);
    });
    
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
}

function renderFriends(friendList) {
    friendsGrid.innerHTML = '';
    
    if (!friendList || friendList.length === 0) {
        friendsGrid.innerHTML = `<p>${i18n('no_friends')}</p>`;
        return;
    }
    
    friendList.forEach(friend => {
        const online = friend.online ? 'online' : 'offline';
        const div = document.createElement('div');
        div.className = `friend-card ${online}`;
        div.innerHTML = `
            <div class="friend-info">
                <span class="friend-dot"></span>
                <span class="friend-name">${escapeHtml(friend.username)}</span>
                <span class="friend-status">${online}</span>
            </div>
            <button class="btn" data-friend-id="${friend.id}" data-action="message">
                ${i18n('message')}
            </button>
        `;
        friendsGrid.appendChild(div);
    });
    
    // Add event listeners to message buttons
    document.querySelectorAll('.friend-card .btn[data-action="message"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const friendId = btn.getAttribute('data-friend-id');
            openConversationWithFriend(friendId);
        });
    });
}

function renderRequests(requestList) {
    requestsList.innerHTML = '';
    
    if (!requestList || requestList.length === 0) {
        requestsList.innerHTML = `<p>${i18n('no_requests')}</p>`;
        return;
    }
    
    requestList.forEach(req => {
        const div = document.createElement('div');
        div.className = 'request-item';
        div.innerHTML = `
            <div class="request-info">
                <span class="dot"></span>
                <span>${escapeHtml(req.fromUsername)}</span>
            </div>
            <div>
                <button class="btn accept" data-request-id="${req.id}">${i18n('accept')}</button>
                <button class="btn decline" data-request-id="${req.id}">${i18n('decline')}</button>
            </div>
        `;
        requestsList.appendChild(div);
    });
    
    // Add event listeners
    document.querySelectorAll('.request-item .accept').forEach(btn => {
        btn.addEventListener('click', () => {
            const reqId = btn.getAttribute('data-request-id');
            acceptRequest(reqId);
        });
    });
    
    document.querySelectorAll('.request-item .decline').forEach(btn => {
        btn.addEventListener('click', () => {
            const reqId = btn.getAttribute('data-request-id');
            declineRequest(reqId);
        });
    });
}

// --- API Calls for UI ---
async function loadChats() {
    if (!currentUser) return;
    
    showLoading(true);
    showStatus(loadingMessages, i18n('loading_chats'), 'loading');
    
    const { data } = await apiGet('/api/convos');
    
    if (data.error) {
        showStatus(loadingMessages, data.error, 'error');
        return;
    }
    
    if (data.convos && data.convos.length > 0) {
        // Render first conversation by default
        const firstConv = data.convos[0];
        currentConversationId = firstConv.id;
        loadConversationMessages(firstConv.id);
    }
    
    showLoading(false);
}

async function loadConversationMessages(convoId) {
    currentConversationId = convoId;
    conversationTitle.textContent = i18n('conversation');
    
    const { data } = await apiGet(`/api/convos/${convoId}/messages`);
    
    if (data.error) {
        showStatus(loadingMessages, data.error, 'error');
        return;
    }
    
    messages = data.messages || [];
    renderMessages(messages);
    showStatus(loadingMessages, '', 'success');
}

async function loadFriends() {
    if (!currentUser) return;
    
    showLoading(true);
    showStatus(loadingFriends, i18n('loading_friends'), 'loading');
    
    const { data } = await apiGet('/api/friends');
    
    if (data.error) {
        showStatus(loadingFriends, data.error, 'error');
        return;
    }
    
    friends = data.friends || [];
    renderFriends(friends);
    
    showLoading(false);
}

async function loadRequests() {
    if (!currentUser) return;
    
    showLoading(true);
    showStatus(loadingRequests, i18n('loading_requests'), 'loading');
    
    const { data } = await apiGet('/api/requests');
    
    if (data.error) {
        showStatus(loadingRequests, data.error, 'error');
        return;
    }
    
    requests = data.requests || [];
    renderRequests(requests.incoming || []);
    
    showLoading(false);
}

async function searchUsers(query) {
    if (!query || query.length < 2) {
        showSearchResults([]);
        return;
    }
    
    showLoading(true);
    
    const { data } = await apiGet('/api/users?q=' + encodeURIComponent(query));
    
    if (data.error) {
        showSearchResults([]);
        showLoading(false);
        return;
    }
    
    showSearchResults(data.users || []);
    showLoading(false);
}

function showSearchResults(users) {
    searchResults.innerHTML = '';
    
    if (!users || users.length === 0) {
        searchResults.innerHTML = `<p>${i18n('search_no_results')}</p>`;
        return;
    }
    
    users.forEach(user => {
        const alreadyFriends = friends.some(f => f.id === user.id);
        const hasRequest = requests.some(r => r.from.id === user.id || r.to.id === user.id);
        
        const div = document.createElement('div');
        div.className = 'search-result';
        div.innerHTML = `
            <span>${escapeHtml(user.username)}</span>
            <div class="status">${i18n('online')}</div>
            <button class="btn" data-user-id="${user.id}">
                ${alreadyFriends ? i18n('friends') : hasRequest ? i18n('request_sent') : i18n('add_friend')}
            </button>
        `;
        searchResults.appendChild(div);
    });
    
    // Add event listeners
    document.querySelectorAll('.search-result button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute('data-user-id');
            handleUserAction(userId, btn);
        });
    });
});

function handleUserAction(userId, button) {
    const user = friends.find(f => f.id === userId);
    const hasRequest = requests.some(r => r.from.id === userId || r.to.id === userId);
    
    if (button.textContent.trim() === i18n('add_friend')) {
        sendFriendRequest(userId);
    } else if (button.textContent.trim() === i18n('request_sent')) {
        showStatus(statusMessage, i18n('request_already_sent'), 'error');
    } else if (button.textContent.trim() === i18n('friends')) {
        openConversationWithFriend(userId);
    }
}

async function sendFriendRequest(toId) {
    if (!currentUser) return;
    
    const { data } = await apiPost('/api/friends', { toId });
    
    if (data.error) {
        showStatus(statusMessage, data.error, 'error');
        return;
    }
    
    showStatus(statusMessage, i18n('request_sent'), 'success');
    loadRequests();
}

async function acceptRequest(reqId) {
    if (!currentUser) return;
    
    const { data } = await apiPost(`/api/requests/${reqId}/accept`, {});
    
    if (data.error) {
        showStatus(statusMessage, data.error, 'error');
        return;
    }
    
    showStatus(statusMessage, i18n('request_accepted'), 'success');
    loadRequests();
    loadChats();
}

async function declineRequest(reqId) {
    if (!currentUser) return;
    
    const { data } = await apiPost(`/api/requests/${reqId}/decline`, {});
    
    if (data.error) {
        showStatus(statusMessage, data.error, 'error');
        return;
    }
    
    showStatus(statusMessage, i18n('request_declined'), 'success');
    loadRequests();
}

// --- Search ---
searchInput.addEventListener('input', (e) => {
    searchUsers(e.target.value.trim());
});

// --- Settings ---
changeUsernameBtn.addEventListener('click', async () => {
    const newName = newUsernameInput.value.trim();
    if (!newName || newName === currentUser.username) {
        showStatus(changeUsernameStatus, i18n('username_invalid'), 'error');
        return;
    }
    
    // Validate username
    if (newName.length < 3 || newName.length > 24) {
        showStatus(changeUsernameStatus, i18n('username_invalid'), 'error');
        return;
    }
    
    if (!/^[A-Za-z0-9_]+$/.test(newName)) {
        showStatus(changeUsernameStatus, i18n('username_invalid'), 'error');
        return;
    }
    
    showStatus(changeUsernameStatus, i18n('sending'), 'loading');
    
    // Try to change username - we need to handle this carefully
    // Since the worker may not have a specific username change endpoint,
    // we'll register with the new name and handle the session
    
    const { data, response } = await apiPost('/api/register', { username: newName });
    
    if (response.status === 201) {
        // Update current user
        currentUser.username = newName;
        usernameDisplay.value = newName;
        localStorage.setItem('neonchat-user', JSON.stringify({ username: newName, session: currentUser.session }));
        showStatus(changeUsernameStatus, i18n('success'), 'success');
    } else if (data.error === 'Username taken') {
        showStatus(changeUsernameStatus, i18n('username_taken'), 'error');
    } else {
        showStatus(changeUsernameStatus, data.error || i18n('server_error'), 'error');
    }
    
    newUsernameInput.value = '';
});

logoutBtn.addEventListener('click', async () => {
    if (!currentUser) {
        // Just go back to welcome
        currentUser = null;
        showScreen('welcome-screen');
        showStatus(authStatus, i18n('logout_success'), 'success');
        return;
    }
    
    const { data } = await apiPost('/api/logout', {});
    
    if (data.ok) {
        currentUser = null;
        localStorage.removeItem('neonchat-user');
        showScreen('welcome-screen');
        showStatus(authStatus, i18n('logout_success'), 'success');
    }
});

languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    localStorage.setItem('neonchat-lang', currentLanguage);
    translatePage();
});

// --- Polling ---
function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    pollingInterval = setInterval(() => {
        if (currentUser && currentConversationId) {
            loadConversationMessages(currentConversationId);
        }
    }, 15000); // Poll every 15 seconds
}

// --- Event Listeners ---
loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    if (!username) {
        showAuthError(i18n('username_invalid'));
        return;
    }
    const success = await loginOrRegister(username);
    if (success) {
        showScreen('chat-interface');
        showScreen('friends-section');
        updateUsernameDisplay();
        loadChats();
        loadFriends();
        loadRequests();
        translatePage();
    }
});

usernameInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

sendBtn.addEventListener('click', async () => {
    const text = messageInputField.value.trim();
    if (!text) {
        showStatus(statusMessage, i18n('empty_message'), 'error');
        return;
    }
    
    if (!currentConversationId) {
        showStatus(statusMessage, i18n('not_authorized'), 'error');
        return;
    }
    
    showStatus(statusMessage, i18n('sending'), 'loading');
    sendBtn.disabled = true;
    
    const { data } = await apiPost(`/api/convos/${currentConversationId}/messages`, { text });
    
    if (data.error) {
        showStatus(statusMessage, data.error, 'error');
    } else {
        const msg = data.msg || data;
        appendMessage(msg);
        messageInputField.value = '';
        showStatus(statusMessage, i18n('message_sent'), 'success');
    }
    
    sendBtn.disabled = false;
    sendBtn.textContent = i18n('send');
});

messageInputField.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

logoutBtn.addEventListener('click', async () => {
    if (currentUser) {
        const { data } = await apiPost('/api/logout', {});
        if (data.ok) {
            currentUser = null;
            localStorage.removeItem('neonchat-user');
            showScreen('welcome-screen');
            showStatus(authStatus, i18n('logout_success'), 'success');
        }
    } else {
        currentUser = null;
        showScreen('welcome-screen');
        showStatus(authStatus, i18n('logout_success'), 'success');
    }
});

changeUsernameBtn.addEventListener('click', async () => {
    const newName = newUsernameInput.value.trim();
    if (!newName || newName === currentUser.username) {
        showStatus(changeUsernameStatus, i18n('username_invalid'), 'error');
        return;
    }
    
    if (newName.length < 3 || newName.length > 24) {
        showStatus(changeUsernameStatus, i18n('username_invalid'), 'error');
        return;
    }
    
    if (!/^[A-Za-z0-9_]+$/.test(newName)) {
        showStatus(changeUsernameStatus, i18n('username_invalid'), 'error');
        return;
    }
    
    showStatus(changeUsernameStatus, i18n('sending'), 'loading');
    
    const { data } = await apiPost('/api/register', { username: newName });
    
    if (data && data.user) {
        currentUser.username = newName;
        usernameDisplay.value = newName;
        localStorage.setItem('neonchat-user', JSON.stringify({ username: newName, session: currentUser.session }));
        showStatus(changeUsernameStatus, i18n('success'), 'success');
    } else if (data.error === 'Username taken') {
        showStatus(changeUsernameStatus, i18n('username_taken'), 'error');
    } else {
        showStatus(changeUsernameStatus, data.error || i18n('server_error'), 'error');
    }
    
    newUsernameInput.value = '';
});

// Navigation
navChats.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllSections();
    showScreen('chat-interface');
    loadChats();
});

navFriends.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllSections();
    showScreen('friends-section');
    loadFriends();
});

navRequests.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllSections();
    showScreen('requests-section');
    loadRequests();
});

navSearch.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllSections();
    showScreen('search-section');
    searchInput.focus();
    searchUsers(searchInput.value.trim());
});

navSettings.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllSections();
    showScreen('settings-section');
    // Show account settings by default
    document.getElementById('account-settings').style.display = 'block';
    document.getElementById('language-settings').style.display = 'none';
});

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    // Set up language
    const savedLang = localStorage.getItem('neonchat-lang');
    if (savedLang && LANGUAGES.includes(savedLang)) {
        currentLanguage = savedLang;
        languageSelect.value = savedLang;
    }
    
    translatePage();
    
    // Initialize user
    const started = initUser();
    
    if (started && currentUser) {
        showChat();
    } else {
        showScreen('welcome-screen');
    }
});

// Helper to append message to current conversation
function appendMessage(msg) {
    if (currentConversationId) {
        const div = renderMessage(msg);
        messagesList.appendChild(div);
        messagesList.scrollTop = messagesList.scrollHeight;
        
        // Also update the messages array
        if (!messages.some(m => m.id === msg.id)) {
            messages.push(msg);
        }
    }
}

// Initial load
initUser();