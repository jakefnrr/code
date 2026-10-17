var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const isPublicRoute = [
      "/api/signup",
      "/api/login",
      "/api/password-reset-request",
      "/api/password-reset-verify",
      "/api"
    ].some((route) => pathname.startsWith(route));
    let user = null;
    if (!isPublicRoute && pathname !== "/") {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const payload = await verifyToken(token, env);
          user = payload.user;
        } catch (e) {
        }
      }
    }
    try {
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
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
async function verifyToken(token, env) {
  if (!token) {
    throw new Error("No token provided");
  }
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  return { user: { id: payload.sub, email: payload.email } };
}
__name(verifyToken, "verifyToken");
async function handleSignup(request, env) {
  const body = await request.json();
  const { email, password, full_name } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const existingUser = await env.USER_DATA.get(email);
  if (existingUser) {
    return new Response(JSON.stringify({ error: "Email already registered" }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });
  }
  const passwordHash = await hashPassword(password);
  const userRecord = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    full_name: full_name || email.split("@")[0],
    created_at: Date.now(),
    online: false
  };
  await env.USER_DATA.put(email, JSON.stringify(userRecord));
  await env.FRIEND_DATA.put(`FRIENDS:${email}`, JSON.stringify([]));
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${email}`, JSON.stringify([]));
  await env.CHAT_DATA.put(`CONVERSATIONS:${email}`, JSON.stringify({}));
  return new Response(JSON.stringify({
    success: true,
    user: { id: userRecord.id, email: userRecord.email, full_name: userRecord.full_name }
  }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleSignup, "handleSignup");
async function handleLogin(request, env) {
  const body = await request.json();
  const { email, password } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const userStr = await env.USER_DATA.get(email);
  if (!userStr) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const user = JSON.parse(userStr);
  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const token = btoa(JSON.stringify({ sub: user.id, email: user.email }));
  user.online = true;
  await env.USER_DATA.put(email, JSON.stringify(user));
  return new Response(JSON.stringify({
    success: true,
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, online: user.online }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleLogin, "handleLogin");
async function handleLogout(request, env) {
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
    } catch (e) {
    }
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleLogout, "handleLogout");
async function handleMe(authUser, env) {
  if (!authUser) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const userStr = await env.USER_DATA.get(authUser.email);
  if (!userStr) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const userData = JSON.parse(userStr);
  return new Response(JSON.stringify({ user: { id: userData.id, email: userData.email, full_name: userData.full_name, online: userData.online } }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleMe, "handleMe");
async function handlePasswordResetRequest(request, env) {
  const body = await request.json();
  const { email } = body;
  if (!email) {
    return new Response(JSON.stringify({ error: "Email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const userStr = await env.USER_DATA.get(email);
  if (!userStr) {
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  const resetToken = crypto.randomUUID();
  const tokenExpires = Date.now() + 36e5;
  await env.CHAT_DATA.put(`RESET_TOKEN:${resetToken}`, JSON.stringify({
    email,
    expiresAt: tokenExpires,
    used: false
  }));
  await sendPasswordResetEmail(email, resetToken, env);
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handlePasswordResetRequest, "handlePasswordResetRequest");
async function handlePasswordResetVerify(request, env) {
  const body = await request.json();
  const { resetToken, newPassword } = body;
  if (!resetToken || !newPassword) {
    return new Response(JSON.stringify({ error: "Reset token and new password required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const tokenStr = await env.CHAT_DATA.get(`RESET_TOKEN:${resetToken}`);
  if (!tokenStr) {
    return new Response(JSON.stringify({ error: "Invalid or expired reset token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const token = JSON.parse(tokenStr);
  if (token.used) {
    return new Response(JSON.stringify({ error: "Reset token already used" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (Date.now() > token.expiresAt) {
    return new Response(JSON.stringify({ error: "Reset token expired" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  token.used = true;
  await env.CHAT_DATA.put(`RESET_TOKEN:${resetToken}`, JSON.stringify(token));
  const userStr = await env.USER_DATA.get(token.email);
  if (!userStr) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const user = JSON.parse(userStr);
  user.passwordHash = await hashPassword(newPassword);
  await env.USER_DATA.put(user.email, JSON.stringify(user));
  return new Response(JSON.stringify({ success: true, message: "Password updated successfully" }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handlePasswordResetVerify, "handlePasswordResetVerify");
async function handleSearchUsers(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const query = request.headers.get("x-search") || "";
  if (!query) {
    return new Response(JSON.stringify({ users: [] }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  const searchLower = query.toLowerCase();
  const users = [];
  const emailMatch = await env.USER_DATA.get(`search:${searchLower}`);
  if (emailMatch) {
    const userData = JSON.parse(emailMatch);
    if (userData.email !== user.email) {
      users.push({ id: userData.id, email: userData.email, full_name: userData.full_name, online: userData.online });
    }
  }
  return new Response(JSON.stringify({ users: users.slice(0, 20) }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleSearchUsers, "handleSearchUsers");
async function handleGetFriends(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  const friends = friendsStr ? JSON.parse(friendsStr) : [];
  const requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${user.email}`);
  const requests = requestsStr ? JSON.parse(requestsStr) : [];
  return new Response(JSON.stringify({ friends, requests }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleGetFriends, "handleGetFriends");
async function handleSendFriendRequest(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await request.json();
  const { targetEmail } = body;
  if (!targetEmail) {
    return new Response(JSON.stringify({ error: "Target email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (targetEmail === user.email) {
    return new Response(JSON.stringify({ error: "Cannot send friend request to yourself" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  const friends = friendsStr ? JSON.parse(friendsStr) : [];
  if (friends.includes(targetEmail)) {
    return new Response(JSON.stringify({ error: "Already friends" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${targetEmail}`);
  const requests = requestsStr ? JSON.parse(requestsStr) : [];
  if (requests.includes(user.email)) {
    return new Response(JSON.stringify({ error: "Friend request already sent" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const requestData = {
    from: user.email,
    to: targetEmail,
    created_at: Date.now(),
    accepted: false
  };
  let targetRequests = requestsStr ? JSON.parse(requestsStr) : [];
  targetRequests.push(requestData);
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${targetEmail}`, JSON.stringify(targetRequests));
  let senderRequests = [];
  const senderRequestsStr = await env.FRIEND_DATA.get(`SENT_REQUESTS:${user.email}`);
  if (senderRequestsStr) {
    senderRequests = JSON.parse(senderRequestsStr);
  }
  senderRequests.push(requestData);
  await env.FRIEND_DATA.put(`SENT_REQUESTS:${user.email}`, JSON.stringify(senderRequests));
  return new Response(JSON.stringify({ success: true, request: requestData }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleSendFriendRequest, "handleSendFriendRequest");
async function handleAcceptFriendRequest(req2, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await req2.json();
  const { fromEmail } = body;
  if (!fromEmail) {
    return new Response(JSON.stringify({ error: "From email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  let requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${user.email}`);
  let requests = requestsStr ? JSON.parse(requestsStr) : [];
  const requestIndex = requests.findIndex((r) => r.from === fromEmail);
  if (requestIndex === -1) {
    return new Response(JSON.stringify({ error: "No pending request from this user" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const requestObj = requests[requestIndex];
  let friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  let friends = friendsStr ? JSON.parse(friendsStr) : [];
  if (!friends.includes(fromEmail)) {
    friends.push(fromEmail);
  }
  await env.FRIEND_DATA.put(`FRIENDS:${user.email}`, JSON.stringify(friends));
  let senderFriendsStr = await env.FRIEND_DATA.get(`FRIENDS:${fromEmail}`);
  let senderFriends = senderFriendsStr ? JSON.parse(senderFriendsStr) : [];
  if (!senderFriends.includes(user.email)) {
    senderFriends.push(user.email);
  }
  await env.FRIEND_DATA.put(`FRIENDS:${fromEmail}`, JSON.stringify(senderFriends));
  requests.splice(requestIndex, 1);
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${user.email}`, JSON.stringify(requests));
  let senderRequestsStr = await env.FRIEND_DATA.get(`SENT_REQUESTS:${fromEmail}`);
  let senderRequests = senderRequestsStr ? JSON.parse(senderRequestsStr) : [];
  senderRequests = senderRequests.filter((r) => r.from !== user.email || r.to !== fromEmail);
  await env.FRIEND_DATA.put(`SENT_REQUESTS:${fromEmail}`, JSON.stringify(senderRequests));
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleAcceptFriendRequest, "handleAcceptFriendRequest");
async function handleRejectFriendRequest(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await request.json();
  const { fromEmail } = body;
  if (!fromEmail) {
    return new Response(JSON.stringify({ error: "From email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  let requestsStr = await env.FRIEND_DATA.get(`FRIEND_REQUESTS:${user.email}`);
  let requests = requestsStr ? JSON.parse(requestsStr) : [];
  requests = requests.filter((r) => r.from !== fromEmail);
  await env.FRIEND_DATA.put(`FRIEND_REQUESTS:${user.email}`, JSON.stringify(requests));
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleRejectFriendRequest, "handleRejectFriendRequest");
async function handleRemoveFriend(req2, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await req2.json();
  const { targetEmail } = body;
  if (!targetEmail) {
    return new Response(JSON.stringify({ error: "Target email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  let friendsStr = await env.FRIEND_DATA.get(`FRIENDS:${user.email}`);
  let friends = friendsStr ? JSON.parse(friendsStr) : [];
  friends = friends.filter((f) => f !== targetEmail);
  await env.FRIEND_DATA.put(`FRIENDS:${user.email}`, JSON.stringify(friends));
  let targetFriendsStr = await env.FRIEND_DATA.get(`FRIENDS:${targetEmail}`);
  let targetFriends = targetFriendsStr ? JSON.parse(targetFriendsStr) : [];
  targetFriends = targetFriends.filter((f) => f !== user.email);
  await env.FRIEND_DATA.put(`FRIENDS:${targetEmail}`, JSON.stringify(targetFriends));
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleRemoveFriend, "handleRemoveFriend");
async function handleGetConversations(req2, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const conversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${user.email}`);
  const conversations = conversationsStr ? JSON.parse(conversationsStr) : {};
  return new Response(JSON.stringify({ conversations }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleGetConversations, "handleGetConversations");
async function handleGetMessages(req2, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const url = new URL(req2.url);
  const targetEmail = url.searchParams.get("target") || "";
  if (!targetEmail) {
    return new Response(JSON.stringify({ error: "Target user required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const conversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${user.email}`);
  const conversations = conversationsStr ? JSON.parse(conversationsStr) : {};
  const conversationKey = `conv:${user.email}:${targetEmail}`;
  const messages = conversations[conversationKey] || [];
  return new Response(JSON.stringify({ messages: messages.slice().reverse() }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleGetMessages, "handleGetMessages");
async function handleSendMessage(request, env, user) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await req.json();
  const { targetEmail, content } = body;
  if (!targetEmail || !content) {
    return new Response(JSON.stringify({ error: "Target email and content required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (content.trim() === "") {
    return new Response(JSON.stringify({ error: "Message cannot be empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const message = {
    id: crypto.randomUUID(),
    from: user.email,
    to: targetEmail,
    content,
    created_at: Date.now(),
    read: false
  };
  const conversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${user.email}`);
  const conversations = conversationsStr ? JSON.parse(conversationsStr) : {};
  const conversationKey = `conv:${user.email}:${targetEmail}`;
  if (!conversations[conversationKey]) {
    conversations[conversationKey] = [];
  }
  conversations[conversationKey].push(message);
  await env.CHAT_DATA.put(`CONVERSATIONS:${user.email}`, JSON.stringify(conversations));
  const recipientConversationsStr = await env.CHAT_DATA.get(`CONVERSATIONS:${targetEmail}`);
  const recipientConversations = recipientConversationsStr ? JSON.parse(recipientConversationsStr) : {};
  if (!recipientConversations[conversationKey]) {
    recipientConversations[conversationKey] = [];
  }
  recipientConversations[conversationKey].push(message);
  await env.CHAT_DATA.put(`CONVERSATIONS:${targetEmail}`, JSON.stringify(recipientConversations));
  return new Response(JSON.stringify({ success: true, message }), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleSendMessage, "handleSendMessage");

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-wpBDXp/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-wpBDXp/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
