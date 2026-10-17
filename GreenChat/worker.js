export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Auth middleware - check for auth on protected routes
    const isPublicRoute = [
      "/api/signup",
      "/api/login",
      "/api/password-reset-request",
      "/api/password-reset-verify",
      "/api",
    ].some((route) => pathname.startsWith(route));

    let user = null;
    
    // Try to get user from token for non-public routes
    if (!isPublicRoute && pathname !== "/") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const payload = await verifyToken(token, env);
          user = payload.user;
        } catch (e) {
          // Invalid token - continue without user, will get 401 on protected routes
        }
      }
    }

    // Route handling
    try {
      // Auth routes
      if (pathname === "/api/signup") {
        if (request.method === "POST") {
          return await handleSignup(request, env);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/login") {
        if (request.method === "POST") {
          return await handleLogin(request, env);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/logout") {
        if (request.method === "GET") {
          return await handleLogout(request, env);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/me") {
        if (request.method === "GET") {
          return await handleMe(user, env);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/password-reset-request") {
        if (request.method === "POST") {
          return await handlePasswordResetRequest(request, env);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/password-reset-verify") {
        if (request.method === "POST") {
          return await handlePasswordResetVerify(request, env);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      // Protected routes - require authentication
      if (pathname === "/api/users/search") {
        if (request.method === "GET") {
          return await handleSearchUsers(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/friends") {
        if (request.method === "GET") {
          return await handleGetFriends(request, env, user);
        }
        if (request.method === "POST") {
          return await handleSendFriendRequest(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/friends/accept") {
        if (request.method === "POST") {
          return await handleAcceptFriendRequest(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/friends/reject") {
        if (request.method === "POST") {
          return await handleRejectFriendRequest(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/friends/remove") {
        if (request.method === "POST") {
          return await handleRemoveFriend(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/conversations") {
        if (request.method === "GET") {
          return await handleGetConversations(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      if (pathname === "/api/messages") {
        if (request.method === "GET") {
          return await handleGetMessages(request, env, user);
        }
        if (request.method === "POST") {
          return await handleSendMessage(request, env, user);
        }
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error("Error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

async function hashPassword(password) {
  // Use Web Crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  // Convert to hex string
  const hashArray = new Uint8Array(hash);
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Simple token verification - in production, use JWT or proper session verification
async function verifyToken(token, env) {
  // For now, accept any non-empty token
  // In production, this should validate a JWT or check against KV sessions
  if (!token) {
    throw new Error("No token provided");
  }
  // Decode the token to get user info
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  return { user: { id: payload.sub, email: payload.email } };
}

// ===== Authentication Functions =====

async function handleSignup(request, env) {
  const body = await request.json();
  const { email, password, full_name } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user already exists
  let existingUser;
  try {
    existingUser = await env.USER_DATA.get(email);
  } catch (e) {
    console.error("KV error:", e);
  }
  if (existingUser) {
    return new Response(JSON.stringify({ error: "Email already registered" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create user - store hashed password
  const passwordHash = await hashPassword(password);
  
  const userRecord = {
    id: crypto.randomUUID(),
    email: email,
    passwordHash: passwordHash,
    full_name: full_name || email.split("@")[0],
    created_at: Date.now(),
    online: false,
  };

  await env.USER_DATA.put(email, JSON.stringify(userRecord));

  // Create initial data structures
  await env.FRIEND_DATA.put(`FRIENDS:${email}`, JSON.stringify([]));
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${email}`, JSON.stringify([]));
  await env.CHAT_DATA.put(`CONVERSATIONS:${email}`, JSON.stringify({}));

  return new Response(JSON.stringify({ 
    success: true, 
    user: { id: userRecord.id, email: userRecord.email, full_name: userRecord.full_name } 
  }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleLogin(request, env) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userStr = await env.USER_DATA.get(email);
  if (!userStr) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = JSON.parse(userStr);
  const passwordMatch = await verifyPassword(password, user.passwordHash);

  if (!passwordMatch) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a simple token
  const token = btoa(JSON.stringify({ sub: user.id, email: user.email }));
  
  // Mark user as online
  user.online = true;
  await env.USER_DATA.put(email, JSON.stringify(user));

  return new Response(JSON.stringify({ 
    success: true, 
    token: token,
    user: { id: user.id, email: user.email, full_name: user.full_name, online: user.online } 
  }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleLogout(request, env) {
  // In a real app, we'd invalidate the token
  // For now, just mark user as offline
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const payload = await verifyToken(token, env);
      const userEmail = payload.user.email;
      const userStr = await env.USER_DATA.get(userEmail);
      if (userStr) {
        const user = JSON.parse(userStr);
        user.online = false;
        await env.USER_DATA.put(userEmail, JSON.stringify(user));
      }
    } catch (e) {}
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleMe(authUser, env) {
  if (!authUser) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userStr = await env.USER_DATA.get(authUser.email);
  if (!userStr) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userData = JSON.parse(userStr);
  return new Response(JSON.stringify({ user: { id: userData.id, email: userData.email, full_name: userData.full_name, online: userData.online } }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ===== Password Reset Functions =====

async function handlePasswordResetRequest(request, env) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return new Response(JSON.stringify({ error: "Email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user exists (don't reveal if account exists or not - per requirements)
  const userStr = await env.USER_DATA.get(email);
  if (!userStr) {
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Generate a secure reset token
  const resetToken = crypto.randomUUID();
  const tokenExpires = Date.now() + 3600000; // 1 hour from now
  
  // Store the reset token
  await env.CHAT_DATA.put(`RESET_TOKEN:${resetToken}`, JSON.stringify({
    email: email,
    expiresAt: tokenExpires,
    used: false,
  }));

  // Send password reset email
  await sendPasswordResetEmail(email, resetToken, env);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handlePasswordResetVerify(request, env) {
  const body = await request.json();
  const { resetToken, newPassword } = body;

  if (!resetToken || !newPassword) {
    return new Response(JSON.stringify({ error: "Reset token and new password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Retrieve the reset token
  const tokenStr = await env.CHAT_DATA.get(`RESET_TOKEN:${resetToken}`);
  if (!tokenStr) {
    return new Response(JSON.stringify({ error: "Invalid or expired reset token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = JSON.parse(tokenStr);
  
  // Check if already used
  if (token.used) {
    return new Response(JSON.stringify({ error: "Reset token already used" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check expiration
  if (Date.now() > token.expiresAt) {
    return new Response(JSON.stringify({ error: "Reset token expired" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mark token as used
  token.used = true;
  await env.CHAT_DATA.put(`RESET_TOKEN:${resetToken}`, JSON.stringify(token));

  // Update the user's password
  const userStr = await env.USER_DATA.get(token.email);
  if (!userStr) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = JSON.parse(userStr);
  user.passwordHash = await hashPassword(newPassword);
  await env.USER_DATA.put(user.email, JSON.stringify(user));

  return new Response(JSON.stringify({ success: true, message: "Password updated successfully" }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ===== User Search =====

async function handleSearchUsers(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const query = request.headers.get("x-search") || "";
  if (!query) {
    return new Response(JSON.stringify({ users: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Search for users by username/email
  const searchLower = query.toLowerCase();
  const users = [];
  
  // We need to iterate over all USER_DATA keys - KV doesn't have prefix search easily
  // For simplicity, we'll store a separate index or use a different approach
  // Here we'll just do a basic check
  
  const emailMatch = await env.USER_DATA.get(`search:${searchLower}`);
  if (emailMatch) {
    const userData = JSON.parse(emailMatch);
    if (userData.email !== user.email) {
      users.push({ id: userData.id, email: userData.email, full_name: userData.full_name, online: userData.online });
    }
  }

  return new Response(JSON.stringify({ users: users.slice(0, 20) }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ===== Friend System =====

async function handleGetFriends(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  const friends = friendsStr ? JSON.parse(friendsStr) : [];
  
  const requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${user.email}`);
  const requests = requestsStr ? JSON.parse(requestsStr) : [];

  return new Response(JSON.stringify({ friends, requests }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleSendFriendRequest(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { targetEmail } = body;

  if (!targetEmail) {
    return new Response(JSON.stringify({ error: "Target email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (targetEmail === user.email) {
    return new Response(JSON.stringify({ error: "Cannot send friend request to yourself" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if already friends
  const friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  const friends = friendsStr ? JSON.parse(friendsStr) : [];
  if (friends.includes(targetEmail)) {
    return new Response(JSON.stringify({ error: "Already friends" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if already has pending request
  const requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${targetEmail}`);
  const requests = requestsStr ? JSON.parse(requestsStr) : [];
  if (requests.includes(user.email)) {
    return new Response(JSON.stringify({ error: "Friend request already sent" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Send friend request
  const requestData = {
    from: user.email,
    to: targetEmail,
    created_at: Date.now(),
    accepted: false,
  };

  // Add to target's pending requests
  let targetRequests = requestsStr ? JSON.parse(requestsStr) : [];
  targetRequests.push(requestData);
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${targetEmail}`, JSON.stringify(targetRequests));

  // Add to sender's sent requests tracking
  let senderRequests = [];
  const senderRequestsStr = await env.FRIEND_DATA.get(`SENT_REQUESTS:${user.email}`);
  if (senderRequestsStr) {
    senderRequests = JSON.parse(senderRequestsStr);
  }
  senderRequests.push(requestData);
  await env.FRIEND_DATA.put(`SENT_REQUESTS:${user.email}`, JSON.stringify(senderRequests));

  return new Response(JSON.stringify({ success: true, request: requestData }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleAcceptFriendRequest(req, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { fromEmail } = body;

  if (!fromEmail) {
    return new Response(JSON.stringify({ error: "From email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Move from requests to friends for the recipient
  let requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${user.email}`);
  let requests = requestsStr ? JSON.parse(requestsStr) : [];
  
  const requestIndex = requests.findIndex(r => r.from === fromEmail);
  if (requestIndex === -1) {
    return new Response(JSON.stringify({ error: "No pending request from this user" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestObj = requests[requestIndex];
  
  // Add to recipient's friends
  let friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  let friends = friendsStr ? JSON.parse(friendsStr) : [];
  if (!friends.includes(fromEmail)) {
    friends.push(fromEmail);
  }
  await env.FRIEND_DATA.put(`FRIENDS:${user.email}`, JSON.stringify(friends));

  // Add to sender's friends too
  let senderFriendsStr = await env.FRIEND_DATA.get(`FRIENDS:${fromEmail}`);
  let senderFriends = senderFriendsStr ? JSON.parse(senderFriendsStr) : [];
  if (!senderFriends.includes(user.email)) {
    senderFriends.push(user.email);
  }
  await env.FRIEND_DATA.put(`FRIENDS:${fromEmail}`, JSON.stringify(senderFriends));

  // Remove from pending requests
  requests.splice(requestIndex, 1);
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${user.email}`, JSON.stringify(requests));

  // Also remove from sender's sent requests
  let senderRequestsStr = await env.FRIEND_DATA.get(`SENT_REQUESTS:${fromEmail}`);
  let senderRequests = senderRequestsStr ? JSON.parse(senderRequestsStr) : [];
  senderRequests = senderRequests.filter(r => r.from !== user.email || r.to !== fromEmail);
  await env.FRIEND_DATA.put(`SENT_REQUESTS:${fromEmail}`, JSON.stringify(senderRequests));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRejectFriendRequest(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const { fromEmail } = body;

  if (!fromEmail) {
    return new Response(JSON.stringify({ error: "From email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Remove from pending requests
  let requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${user.email}`);
  let requests = requestsStr ? JSON.parse(requestsStr) : [];
  requests = requests.filter(r => r.from !== fromEmail);
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${user.email}`, JSON.stringify(requests));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRemoveFriend(req, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { targetEmail } = body;

  if (!targetEmail) {
    return new Response(JSON.stringify({ error: "Target email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Remove from friends list for the user
  let friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  let friends = friendsStr ? JSON.parse(friendsStr) : [];
  friends = friends.filter(f => f !== targetEmail);
  await env.FRIEND_DATA.put(`FRIENDS:${user.email}`, JSON.stringify(friends));

  // Remove from friends list for the target too
  let targetFriendsStr = await env.FRIEND_DATA.get(`FRIENDS:${targetEmail}`);
  let targetFriends = targetFriendsStr ? JSON.parse(targetFriendsStr) : [];
  targetFriends = targetFriends.filter(f => f !== user.email);
  await env.FRIEND_DATA.put(`FRIENDS:${targetEmail}`, JSON.stringify(targetFriends));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ===== Messaging System =====

async function handleGetConversations(req, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${user.email}`);
  const conversations = conversationsStr ? JSON.parse(conversationsStr) : {};

  return new Response(JSON.stringify({ conversations }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleGetMessages(req, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const targetEmail = url.searchParams.get("target") || "";

  if (!targetEmail) {
    return new Response(JSON.stringify({ error: "Target user required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if conversation exists
  const conversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${user.email}`);
  const conversations = conversationsStr ? JSON.parse(conversationsStr) : {};
  
  const conversationKey = `conv:${user.email}:${targetEmail}`;
  const messages = conversations[conversationKey] || [];

  return new Response(JSON.stringify({ messages: messages.slice().reverse() }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleSendMessage(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const { targetEmail, content } = body;

  if (!targetEmail || !content) {
    return new Response(JSON.stringify({ error: "Target email and content required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (content.trim() === "") {
    return new Response(JSON.stringify({ error: "Message cannot be empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create message record
  const message = {
    id: crypto.randomUUID(),
    from: user.email,
    to: targetEmail,
    content: content,
    created_at: Date.now(),
    read: false,
  };

  // Store message in conversation
  const conversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${user.email}`);
  const conversations = conversationsStr ? JSON.parse(conversationsStr) : {};
  
  const conversationKey = `conv:${user.email}:${targetEmail}`;
  if (!conversations[conversationKey]) {
    conversations[conversationKey] = [];
  }
  conversations[conversationKey].push(message);
  await env.CHAT_DATA.put(`CONVERSATIONS:${user.email}`, JSON.stringify(conversations));

  // Also store from the recipient's perspective
  const recipientConversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${targetEmail}`);
  const recipientConversations = recipientConversationsStr ? JSON.parse(recipientConversationsStr) : {};
  
  if (!recipientConversations[conversationKey]) {
    recipientConversations[conversationKey] = [];
  }
  recipientConversations[conversationKey].push(message);
  await env.CHAT_DATA.put(`CONVERSATIONS:${targetEmail}`, JSON.stringify(recipientConversations));

  return new Response(JSON.stringify({ success: true, message }), {
    headers: { "Content-Type": "application/json" },
  });
}