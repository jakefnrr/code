const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;
const SALT_ROUNDS = 10;
const DATA_DIR = './database';
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(session({
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

// File-based database setup
function initializeDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: [],
      friends: [],
      friendLists: [],
      friendListMembers: [],
      messages: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log('Database file created');
  } else {
    console.log('Database file exists');
  }
}

function readDatabase() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], friends: [], friendLists: [], friendListMembers: [], messages: [] };
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Helper function to generate 3-digit friend code
function generateFriendCode() {
  return Math.floor(100 + Math.random() * 900).toString();
}

// Input validation helper
function validateInput(input, maxLength, allowEmpty = false) {
  if (!allowEmpty && (!input || input.trim() === '')) {
    return false;
  }
  if (input && input.length > maxLength) {
    return false;
  }
  return true;
}

// API Routes

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!validateInput(username, 20) || username.length < 3) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (!validateInput(password, 100) || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const data = readDatabase();

    // Check if username already exists
    if (data.users.some(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    let friendCode = generateFriendCode();

    // Ensure unique friend code
    while (data.users.some(u => u.friend_code === friendCode)) {
      friendCode = generateFriendCode();
    }

    const newUser = {
      id: data.users.length + 1,
      username,
      password: hashedPassword,
      friend_code: friendCode,
      created_at: new Date().toISOString()
    };

    data.users.push(newUser);

    if (writeDatabase(data)) {
      req.session.userId = newUser.id;
      req.session.username = username;
      req.session.friendCode = friendCode;

      res.json({
        success: true,
        userId: newUser.id,
        username: username,
        friendCode: friendCode
      });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!validateInput(username, 20) || !validateInput(password, 100)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const data = readDatabase();
    const user = data.users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.friendCode = user.friend_code;

      res.json({
        success: true,
        userId: user.id,
        username: user.username,
        friendCode: user.friend_code
      });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/user', (req, res) => {
  if (req.session.userId) {
    res.json({
      loggedIn: true,
      userId: req.session.userId,
      username: req.session.username,
      friendCode: req.session.friendCode
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// Search users by username or friend code
app.get('/api/users/search', (req, res) => {
  const { query } = req.query;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!query || query.length < 1) {
    return res.json([]);
  }

  try {
    const data = readDatabase();

    const users = data.users.filter(u =>
      u.id !== userId &&
      (u.username.toLowerCase().includes(query.toLowerCase()) || u.friend_code === query)
    ).slice(0, 20);

    // Check which users are already friends
    const friendshipMap = {};
    data.friends.forEach(f => {
      if (f.user_id === userId) {
        friendshipMap[f.friend_id] = f.status;
      }
    });

    const usersWithStatus = users.map(user => ({
      id: user.id,
      username: user.username,
      friend_code: user.friend_code,
      friendshipStatus: friendshipMap[user.id] || null
    }));

    res.json(usersWithStatus);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Send friend request
app.post('/api/friends/request', (req, res) => {
  const { friendId } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!friendId || isNaN(friendId)) {
    return res.status(400).json({ error: 'Valid Friend ID is required' });
  }

  if (parseInt(friendId) === userId) {
    return res.status(400).json({ error: 'Cannot add yourself as a friend' });
  }

  try {
    const data = readDatabase();

    // Check if target user exists
    const targetUser = data.users.find(u => u.id === parseInt(friendId));
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends or request exists
    const existing = data.friends.find(f =>
      f.user_id === userId && f.friend_id === parseInt(friendId)
    );

    if (existing) {
      return res.status(400).json({ error: 'Friend request already exists or already friends' });
    }

    // Create friend request
    const newRequest = {
      id: data.friends.length + 1,
      user_id: userId,
      friend_id: parseInt(friendId),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    data.friends.push(newRequest);

    if (writeDatabase(data)) {
      res.json({ success: true, requestId: newRequest.id });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Accept friend request
app.post('/api/friends/accept', (req, res) => {
  const { requestId } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!requestId || isNaN(requestId)) {
    return res.status(400).json({ error: 'Valid Request ID is required' });
  }

  try {
    const data = readDatabase();
    const request = data.friends.find(f =>
      f.id === parseInt(requestId) && f.friend_id === userId
    );

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update request to accepted
    request.status = 'accepted';

    // Create reverse friendship
    const reverseFriendship = {
      id: data.friends.length + 1,
      user_id: userId,
      friend_id: request.user_id,
      status: 'accepted',
      created_at: new Date().toISOString()
    };

    data.friends.push(reverseFriendship);

    if (writeDatabase(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get friend requests
app.get('/api/friends/requests', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    const requests = data.friends
      .filter(f => f.friend_id === userId && f.status === 'pending')
      .map(f => {
        const user = data.users.find(u => u.id === f.user_id);
        return {
          request_id: f.id,
          id: user.id,
          username: user.username,
          friend_code: user.friend_code
        };
      });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get friends list
app.get('/api/friends', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    const friends = data.friends
      .filter(f => f.user_id === userId && f.status === 'accepted')
      .map(f => {
        const user = data.users.find(u => u.id === f.friend_id);
        return {
          id: user.id,
          username: user.username,
          friend_code: user.friend_code
        };
      });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Create friend list
app.post('/api/lists', (req, res) => {
  const { name } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!validateInput(name, 50)) {
    return res.status(400).json({ error: 'List name is required and must be 50 characters or less' });
  }

  try {
    const data = readDatabase();

    const newList = {
      id: data.friendLists.length + 1,
      user_id: userId,
      name: name.trim(),
      created_at: new Date().toISOString()
    };

    data.friendLists.push(newList);

    if (writeDatabase(data)) {
      res.json({ success: true, listId: newList.id });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get friend lists
app.get('/api/lists', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    const lists = data.friendLists
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(list => {
        const members = data.friendListMembers
          .filter(m => m.list_id === list.id)
          .map(m => {
            const user = data.users.find(u => u.id === m.friend_id);
            return {
              id: user.id,
              username: user.username,
              friend_code: user.friend_code
            };
          });

        return {
          ...list,
          members
        };
      });

    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add friend to list
app.post('/api/lists/:listId/members', (req, res) => {
  const { listId } = req.params;
  const { friendId } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }

  try {
    const data = readDatabase();

    // Verify list belongs to user
    const list = data.friendLists.find(l => l.id === parseInt(listId) && l.user_id === userId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Check if already in list
    const existing = data.friendListMembers.find(m =>
      m.list_id === parseInt(listId) && m.friend_id === friendId
    );
    if (existing) {
      return res.status(400).json({ error: 'Friend already in list' });
    }

    // Add to list
    const newMember = {
      id: data.friendListMembers.length + 1,
      list_id: parseInt(listId),
      friend_id: friendId
    };

    data.friendListMembers.push(newMember);

    if (writeDatabase(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Remove friend from list
app.delete('/api/lists/:listId/members/:friendId', (req, res) => {
  const { listId, friendId } = req.params;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    // Verify list belongs to user
    const list = data.friendLists.find(l => l.id === parseInt(listId) && l.user_id === userId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Remove from list
    data.friendListMembers = data.friendListMembers.filter(m =>
      !(m.list_id === parseInt(listId) && m.friend_id === parseInt(friendId))
    );

    if (writeDatabase(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete friend list
app.delete('/api/lists/:listId', (req, res) => {
  const { listId } = req.params;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    // Verify list belongs to user
    const list = data.friendLists.find(l => l.id === parseInt(listId) && l.user_id === userId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    // Delete list members first
    data.friendListMembers = data.friendListMembers.filter(m => m.list_id !== parseInt(listId));

    // Delete list
    data.friendLists = data.friendLists.filter(l => l.id !== parseInt(listId));

    if (writeDatabase(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get messages with a friend
app.get('/api/messages/:friendId', (req, res) => {
  const { friendId } = req.params;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    const messages = data.messages
      .filter(m =>
        (m.sender_id === userId && m.receiver_id === parseInt(friendId)) ||
        (m.sender_id === parseInt(friendId) && m.receiver_id === userId)
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(m => {
        const sender = data.users.find(u => u.id === m.sender_id);
        return {
          id: m.id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          message: m.message,
          created_at: m.created_at,
          read: m.read,
          sender_username: sender.username
        };
      });

    // Mark received messages as read
    data.messages.forEach(m => {
      if (m.sender_id === parseInt(friendId) && m.receiver_id === userId && !m.read) {
        m.read = true;
      }
    });

    writeDatabase(data);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get unread message count
app.get('/api/messages/unread', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const data = readDatabase();

    const unreadMessages = data.messages.filter(m =>
      m.receiver_id === userId && !m.read
    );

    const bySender = {};
    unreadMessages.forEach(m => {
      if (!bySender[m.sender_id]) {
        bySender[m.sender_id] = 0;
      }
      bySender[m.sender_id]++;
    });

    res.json({
      total: unreadMessages.length,
      bySender
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Socket.io for real-time messaging
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log('User joined:', userId);

    // Notify friends that user is online
    try {
      const data = readDatabase();
      const friends = data.friends.filter(f =>
        f.user_id === userId && f.status === 'accepted'
      );

      friends.forEach(friend => {
        const friendSocketId = onlineUsers.get(friend.friend_id);
        if (friendSocketId) {
          io.to(friendSocketId).emit('userOnline', { userId });
        }
      });
    } catch (error) {
      console.error('Error notifying friends:', error);
    }
  });

  socket.on('sendMessage', (data) => {
    const { receiverId, message } = data;
    const senderId = socket.userId;

    if (!senderId || !receiverId || !message) {
      return;
    }

    const trimmedMessage = message.trim();
    if (!validateInput(trimmedMessage, 1000)) {
      socket.emit('error', { message: 'Message must be 1000 characters or less' });
      return;
    }

    if (trimmedMessage.length === 0) {
      return;
    }

    try {
      const dbData = readDatabase();

      // Verify receiver exists and is friend
      const isFriend = dbData.friends.some(f =>
        (f.user_id === senderId && f.friend_id === receiverId && f.status === 'accepted') ||
        (f.user_id === receiverId && f.friend_id === senderId && f.status === 'accepted')
      );

      if (!isFriend) {
        socket.emit('error', { message: 'You can only message friends' });
        return;
      }

      // Save message to database
      const newMessage = {
        id: dbData.messages.length + 1,
        sender_id: senderId,
        receiver_id: receiverId,
        message: trimmedMessage,
        created_at: new Date().toISOString(),
        read: false
      };

      dbData.messages.push(newMessage);
      writeDatabase(dbData);

      const messageData = {
        id: newMessage.id,
        sender_id: senderId,
        receiver_id: receiverId,
        message: trimmedMessage,
        created_at: newMessage.created_at,
        read: false
      };

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newMessage', messageData);
      }

      // Send confirmation to sender
      socket.emit('messageSent', messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log('User disconnected:', socket.userId);

      // Notify friends that user is offline
      try {
        const data = readDatabase();
        const friends = data.friends.filter(f =>
          f.user_id === socket.userId && f.status === 'accepted'
        );

        friends.forEach(friend => {
          const friendSocketId = onlineUsers.get(friend.friend_id);
          if (friendSocketId) {
            io.to(friendSocketId).emit('userOffline', { userId: socket.userId });
          }
        });
      } catch (error) {
        console.error('Error notifying friends:', error);
      }

      onlineUsers.delete(socket.userId);
    }
  });
});

// Start server
initializeDatabase();
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});