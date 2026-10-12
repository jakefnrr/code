const STORAGE_KEYS = {
  deviceId: 'chat_device_id',
  username: 'chat_username',
  friends: 'chat_friends',
  messages: 'chat_messages',
  config: 'chat_config',
};

const DEFAULT_CONFIG = {
  websocketUrl: '',
  useLocalFallback: true,
};

class ChatApp {
  constructor() {
    this.deviceId = localStorage.getItem(STORAGE_KEYS.deviceId) || this.createDeviceId();
    this.username = localStorage.getItem(STORAGE_KEYS.username) || `User-${this.deviceId.slice(0, 4)}`;
    this.friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.friends) || '[]');
    this.messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
    this.config = { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.config) || '{}') };
    this.websocket = null;
    this.selectedFriend = 'General';
    this.pendingMedia = [];

    this.elements = {
      usernameInput: document.getElementById('usernameInput'),
      usernameLabel: document.getElementById('usernameLabel'),
      avatar: document.getElementById('avatar'),
      saveUsernameBtn: document.getElementById('saveUsernameBtn'),
      friendInput: document.getElementById('friendInput'),
      addFriendBtn: document.getElementById('addFriendBtn'),
      friendList: document.getElementById('friendList'),
      activeChatTitle: document.getElementById('activeChatTitle'),
      messageList: document.getElementById('messageList'),
      messageInput: document.getElementById('messageInput'),
      sendBtn: document.getElementById('sendBtn'),
      fileInput: document.getElementById('fileInput'),
      mediaPreview: document.getElementById('mediaPreview'),
      emojiRow: document.getElementById('emojiRow'),
      connectionStatus: document.getElementById('connectionStatus'),
    };

    this.bindEvents();
    this.mountState();
    this.connectRealtime();
  }

  createDeviceId() {
    const id = crypto.randomUUID ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(STORAGE_KEYS.deviceId, id);
    return id;
  }

  bindEvents() {
    this.elements.saveUsernameBtn.addEventListener('click', () => this.saveUsername());
    this.elements.usernameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.saveUsername();
    });

    this.elements.addFriendBtn.addEventListener('click', () => this.addFriend());
    this.elements.friendInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.addFriend();
    });

    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    this.elements.messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
    });

    this.elements.fileInput.addEventListener('change', (event) => this.handleFiles(event.target.files));

    this.elements.emojiRow.addEventListener('click', (event) => {
      const button = event.target.closest('[data-emoji]');
      if (!button) return;
      const emoji = button.dataset.emoji;
      this.elements.messageInput.value += emoji;
      this.elements.messageInput.focus();
    });
  }

  mountState() {
    this.elements.usernameInput.value = this.username;
    this.elements.usernameLabel.textContent = this.username;
    this.elements.avatar.textContent = this.username.slice(0, 1).toUpperCase();
    this.renderFriends();
    this.renderMessages();
  }

  saveUsername() {
    const name = this.elements.usernameInput.value.trim();
    if (!name) {
      alert('Please enter a username.');
      return;
    }

    this.username = name;
    localStorage.setItem(STORAGE_KEYS.username, name);
    this.elements.usernameLabel.textContent = name;
    this.elements.avatar.textContent = name.slice(0, 1).toUpperCase();

    const payload = {
      type: 'profile_update',
      deviceId: this.deviceId,
      username: name,
      timestamp: Date.now(),
    };

    this.sendRealtimePayload(payload);
  }

  addFriend() {
    const name = this.elements.friendInput.value.trim();
    if (!name || name === this.username) return;

    if (!this.friends.includes(name)) {
      this.friends.push(name);
      this.persistFriends();
      this.renderFriends();
    }

    this.elements.friendInput.value = '';
    this.selectedFriend = name;
    this.elements.activeChatTitle.textContent = name;
    this.renderMessages();
  }

  persistFriends() {
    localStorage.setItem(STORAGE_KEYS.friends, JSON.stringify(this.friends));
  }

  removeFriend(friendName) {
    this.friends = this.friends.filter((friend) => friend !== friendName);
    this.persistFriends();
    this.renderFriends();
    if (this.selectedFriend === friendName) {
      this.selectedFriend = 'General';
      this.elements.activeChatTitle.textContent = 'General';
      this.renderMessages();
    }
  }

  renderFriends() {
    this.elements.friendList.innerHTML = '';

    const generalItem = document.createElement('li');
    generalItem.className = 'friend-item';
    generalItem.innerHTML = `
      <div class="friend-meta">
        <span class="friend-dot"></span>
        <span>General</span>
      </div>
      <button data-friend="General" class="friend-select">Open</button>
    `;
    this.elements.friendList.appendChild(generalItem);

    this.friends.forEach((friend) => {
      const item = document.createElement('li');
      item.className = 'friend-item';
      item.innerHTML = `
        <div class="friend-meta">
          <span class="friend-dot"></span>
          <span>${this.escapeHtml(friend)}</span>
        </div>
        <div>
          <button data-friend="${this.escapeHtml(friend)}" class="friend-select">Open</button>
          <button data-remove="${this.escapeHtml(friend)}" class="friend-remove">×</button>
        </div>
      `;
      this.elements.friendList.appendChild(item);
    });

    this.elements.friendList.querySelectorAll('.friend-select').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedFriend = button.dataset.friend;
        this.elements.activeChatTitle.textContent = this.selectedFriend;
        this.renderMessages();
      });
    });

    this.elements.friendList.querySelectorAll('.friend-remove').forEach((button) => {
      button.addEventListener('click', () => {
        const friend = button.dataset.remove;
        this.removeFriend(friend);
      });
    });
  }

  handleFiles(files) {
    const selected = Array.from(files || []);

    this.pendingMedia = selected.map((file) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `media-${Date.now()}-${Math.random()}`,
      file,
      type: file.type,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    this.renderMediaPreview();
  }

  renderMediaPreview() {
    if (!this.pendingMedia.length) {
      this.elements.mediaPreview.classList.add('hidden');
      this.elements.mediaPreview.innerHTML = '';
      return;
    }

    this.elements.mediaPreview.classList.remove('hidden');
    this.elements.mediaPreview.innerHTML = '';

    this.pendingMedia.forEach((media) => {
      const card = document.createElement('div');
      card.className = 'preview-card';

      const removeButton = document.createElement('button');
      removeButton.className = 'preview-remove';
      removeButton.textContent = '×';
      removeButton.addEventListener('click', () => {
        this.pendingMedia = this.pendingMedia.filter((item) => item.id !== media.id);
        URL.revokeObjectURL(media.previewUrl);
        this.renderMediaPreview();
      });

      if (media.type.startsWith('image/')) {
        card.innerHTML = `<img src="${media.previewUrl}" alt="${this.escapeHtml(media.name)}" />`;
      } else {
        card.innerHTML = `<video src="${media.previewUrl}" controls></video>`;
      }

      card.appendChild(removeButton);
      this.elements.mediaPreview.appendChild(card);
    });
  }

  async sendMessage() {
    const text = this.elements.messageInput.value.trim();
    if (!text && !this.pendingMedia.length) return;

    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`,
      sender: this.username,
      senderId: this.deviceId,
      room: this.selectedFriend,
      text,
      media: this.pendingMedia.map((media) => ({
        name: media.name,
        type: media.type,
        previewUrl: media.previewUrl,
      })),
      createdAt: Date.now(),
      isOwn: true,
    };

    this.appendMessage(payload);
    this.persistMessages(payload);
    this.sendRealtimePayload({ type: 'chat_message', ...payload });

    this.elements.messageInput.value = '';
    this.pendingMedia.forEach((media) => URL.revokeObjectURL(media.previewUrl));
    this.pendingMedia = [];
    this.renderMediaPreview();
  }

  appendMessage(message) {
    const item = {
      ...message,
      sender: message.sender || this.username,
      room: message.room || this.selectedFriend,
      isOwn: Boolean(message.isOwn),
    };

    this.messages.push(item);
    this.renderMessages();
  }

  persistMessages(message) {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
    current.push(message);
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(current));
  }

  renderMessages() {
    this.elements.messageList.innerHTML = '';

    const visibleMessages = this.messages.filter((message) => {
      const room = message.room || 'General';
      return room === this.selectedFriend || room === 'General';
    });

    if (!visibleMessages.length) {
      const empty = document.createElement('div');
      empty.className = 'message';
      empty.innerHTML = '<div class="bubble">No messages yet. Start the conversation.</div>';
      this.elements.messageList.appendChild(empty);
      return;
    }

    visibleMessages.forEach((message) => {
      const messageNode = document.createElement('div');
      messageNode.className = `message ${message.senderId === this.deviceId ? 'self' : ''}`;

      const head = document.createElement('div');
      head.className = 'message-head';
      head.textContent = `${message.sender} • ${this.formatTime(message.createdAt)}`;

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = message.text || 'Sent media';

      messageNode.appendChild(head);

      if (message.media && message.media.length) {
        message.media.forEach((media) => {
          const mediaWrap = document.createElement('div');
          mediaWrap.className = 'message-media';

          if (media.type.startsWith('image/')) {
            mediaWrap.innerHTML = `<img src="${media.previewUrl || media.url || ''}" alt="${this.escapeHtml(media.name || 'image')}" />`;
          } else {
            mediaWrap.innerHTML = `<video src="${media.previewUrl || media.url || ''}" controls></video>`;
          }

          bubble.appendChild(mediaWrap);
        });
      }

      messageNode.appendChild(bubble);
      this.elements.messageList.appendChild(messageNode);
    });

    this.elements.messageList.scrollTop = this.elements.messageList.scrollHeight;
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  connectRealtime() {
    const wsUrl = this.config.websocketUrl;

    if (!wsUrl) {
      this.elements.connectionStatus.textContent = 'Local only';
      this.elements.connectionStatus.parentElement.querySelector('.status-dot').style.background = '#22c55e';
      return;
    }

    try {
      this.websocket = new WebSocket(wsUrl);
      this.websocket.addEventListener('open', () => {
        this.elements.connectionStatus.textContent = 'Online';
        this.elements.connectionStatus.parentElement.querySelector('.status-dot').style.background = '#22c55e';
        this.sendRealtimePayload({ type: 'presence', deviceId: this.deviceId, username: this.username });
      });

      this.websocket.addEventListener('message', (event) => {
        const payload = JSON.parse(event.data);
        this.handleIncomingRealtime(payload);
      });

      this.websocket.addEventListener('close', () => {
        this.elements.connectionStatus.textContent = 'Reconnecting';
        this.elements.connectionStatus.parentElement.querySelector('.status-dot').style.background = '#f59e0b';
      });

      this.websocket.addEventListener('error', () => {
        this.elements.connectionStatus.textContent = 'Offline';
        this.elements.connectionStatus.parentElement.querySelector('.status-dot').style.background = '#ef4444';
      });
    } catch (error) {
      this.elements.connectionStatus.textContent = 'Local only';
      this.elements.connectionStatus.parentElement.querySelector('.status-dot').style.background = '#22c55e';
    }
  }

  sendRealtimePayload(payload) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(payload));
    }
  }

  handleIncomingRealtime(payload) {
    if (!payload) return;

    if (payload.type === 'chat_message') {
      const incoming = {
        ...payload,
        isOwn: payload.senderId === this.deviceId,
      };

      const exists = this.messages.some((m) => m.id === incoming.id);
      if (!exists) {
        this.messages.push(incoming);
        this.persistMessages(incoming);
        this.renderMessages();
      }
    }

    if (payload.type === 'profile_update') {
      if (payload.deviceId !== this.deviceId && payload.username) {
        this.friends = [...new Set([...this.friends, payload.username])];
        this.persistFriends();
        this.renderFriends();
      }
    }
  }
}

const app = new ChatApp();
