// script.js – simple client‑side chat using localStorage
// ------------------------------------------------------------
// Data model (stored in localStorage as JSON strings):
//   friends: ["Alice", "Bob", ...]
//   messages:<friendName> => [{from:'me'|'friend',text:string,timestamp:number},...]
const friendListEl = document.getElementById('friendList');
const newFriendInput = document.getElementById('newFriend');
const addFriendBtn = document.getElementById('addFriendBtn');
const chatHeader = document.getElementById('chatWith');
const messagesEl = document.getElementById('messages');
const msgForm = document.getElementById('msgForm');
const msgInput = document.getElementById('msgInput');
let currentFriend = null;
// ----- Utility functions -------------------------------------------------
function loadFriends() {
  const data = localStorage.getItem('greenchat_friends');
  return data ? JSON.parse(data) : [];
}
function saveFriends(list) {
  localStorage.setItem('greenchat_friends', JSON.stringify(list));
}
function loadMessages(friend) {
  const key = `greenchat_messages_${friend}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}
function saveMessages(friend, msgs) {
  const key = `greenchat_messages_${friend}`;
  localStorage.setItem(key, JSON.stringify(msgs));
}
function renderFriends() {
  const friends = loadFriends();
  friendListEl.innerHTML = '';
  friends.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    li.className = 'friend-item';
    li.addEventListener('click', () => selectFriend(name));
    friendListEl.appendChild(li);
  });
}
function selectFriend(name) {
  currentFriend = name;
  chatHeader.textContent = `Chat with ${name}`;
  renderMessages();
  // highlight selected friend
  document.querySelectorAll('.friend-item').forEach(el => {
    el.classList.toggle('selected', el.textContent === name);
  });
}
function renderMessages() {
  if (!currentFriend) {
    messagesEl.innerHTML = '<p class="info">Select a friend to start chatting.</p>';
    return;
  }
  const msgs = loadMessages(currentFriend);
  messagesEl.innerHTML = '';
  msgs.forEach(m => {
    const div = document.createElement('div');
    div.className = m.from === 'me' ? 'msg me' : 'msg friend';
    div.textContent = m.text;
    messagesEl.appendChild(div);
  });
  // scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function addFriend(name) {
  if (!name) return;
  const friends = loadFriends();
  if (friends.includes(name)) {
    alert('Friend already exists');
    return;
  }
  friends.push(name);
  saveFriends(friends);
  renderFriends();
  newFriendInput.value = '';
}
function sendMessage(text) {
  if (!currentFriend) return;
  if (!text) return;
  const msgs = loadMessages(currentFriend);
  msgs.push({from: 'me', text, timestamp: Date.now()});
  saveMessages(currentFriend, msgs);
  renderMessages();
  msgInput.value = '';
}
// ----- Event listeners ---------------------------------------------------
addFriendBtn.addEventListener('click', () => {
  const name = newFriendInput.value.trim();
  addFriend(name);
});
msgForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  sendMessage(text);
});
// ------------------------------------------------------------
// Initialise UI
renderFriends();
renderMessages();