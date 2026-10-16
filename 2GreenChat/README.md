# GreenChat — Standalone Edition

A fully independent, real-time chat application migrated from Base44. Works on any static host (GitHub Pages) with a Cloudflare Worker backend.

**Live URL:** `https://jakescalzo.me/2GreenChat/index.html`

---

## Architecture

```
Browser (static files)          Cloudflare Worker (backend)
┌─────────────────────┐         ┌──────────────────────────┐
│  index.html         │         │  worker.js               │
│  style.css          │  HTTP   │  ├─ REST API (/api/*)    │
│  app.js             │ ◄─────► │  ├─ KV (data storage)   │
│                     │  WS     │  └─ Durable Object        │
│  Vanilla JS SPA     │ ◄─────► │     (real-time WebSocket) │
└─────────────────────┘         └──────────────────────────┘
```

| Component | Technology | Free Tier |
|-----------|-----------|-----------|
| Frontend | Static HTML/CSS/JS (GitHub Pages) | Unlimited |
| API | Cloudflare Worker | 100K req/day |
| Database | Cloudflare KV | 100K reads/day, 1K writes/day |
| Real-time | Durable Object (WebSocket) | 100K req/day |
| Email | Resend API | 3K emails/month, 100/day |

---

## File Structure

```
2GreenChat/
├── index.html      ← SPA shell + API URL config
├── style.css        ← Dark theme (matches original)
├── app.js           ← Frontend logic (auth, chat, friends, groups, profile)
├── worker.js        ← Cloudflare Worker backend (API + KV + Durable Object)
├── wrangler.toml    ← Worker configuration
└── README.md        ← This file
```

---

## Features (migrated from original Base44 app)

- ✅ Email + password registration with OTP email verification
- ✅ Login / logout with persistent sessions
- ✅ Password reset via email (secure, single-use, expiring tokens)
- ✅ Profile creation & editing (username, display name, bio, avatar color)
- ✅ Username search (case-insensitive)
- ✅ Friend requests (send / accept / decline)
- ✅ Friend list & sent requests
- ✅ Direct messages (DMs) with real-time WebSocket delivery
- ✅ Group chats (create, add members, group messaging)
- ✅ Notifications tab (incoming friend requests with unread badge)
- ✅ Settings tab (account info, logout)
- ✅ Responsive (desktop sidebar + mobile bottom tabs)
- ✅ Dark theme matching original (#0a0f0a bg, #10b981 green)
- ✅ Message persistence across refreshes
- ✅ XSS prevention (all user content HTML-escaped)
- ✅ PBKDF2 password hashing (100K iterations, SHA-256)
- ✅ Per-message authorization (users can only read their own conversations)

---

## Prerequisites

1. **Cloudflare account** (free) — https://dash.cloudflare.com/sign-up
2. **Node.js** (for running `wrangler` CLI)
3. **Resend account** (free) — https://resend.com — for email verification & password reset

---

## Setup Guide

### Step 1: Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### Step 2: Create a KV Namespace

```bash
cd 2GreenChat
npx wrangler kv namespace create KV
```

Copy the returned `id` and paste it into `wrangler.toml`:

```toml
[[kv.namespaces]]
binding = "KV"
id = "PASTE_YOUR_ID_HERE"
```

### Step 3: Set Up Email (Resend)

1. Create a free account at https://resend.com
2. Get your API key from the dashboard
3. (Optional but recommended) Verify your domain `jakescalzo.me` in Resend to send from a custom address. Without this, you can use the default `onboarding@resend.dev` sender for testing.

Set the Worker secrets:

```bash
npx wrangler secret put RESEND_API_KEY
# Paste your Resend API key

npx wrangler secret put EMAIL_FROM
# Enter: GreenChat <noreply@jakescalzo.me>
# (or use: onboarding@resend.dev for testing without domain verification)

npx wrangler secret put APP_URL
# Enter: https://jakescalzo.me/2GreenChat/index.html
```

### Step 4: Deploy the Worker

```bash
npx wrangler deploy
```

Note the Worker URL (e.g., `https://greenchat-api.your-subdomain.workers.dev`).

### Step 5: Configure the Frontend

Edit `index.html` and set the API URL:

```html
<script>
  window.GC_API_BASE = 'https://greenchat-api.your-subdomain.workers.dev';
</script>
```

For local development, use:

```html
<script>
  window.GC_API_BASE = 'http://localhost:8787';
</script>
```

### Step 6: Run the Worker Locally (for testing)

```bash
npx wrangler dev
```

This starts the Worker at `http://localhost:8787`. Open `index.html` in your browser (or serve it with `npx serve .`) and test.

### Step 7: Push to GitHub

The `2GreenChat/` folder is already in your repository. Push it to GitHub Pages:

```bash
git add 2GreenChat/
git commit -m "Add standalone GreenChat"
git push
```

GitHub Pages will serve it at `https://jakescalzo.me/2GreenChat/index.html`.

---

## Testing Checklist

After deployment, test these flows:

1. **Register** — Enter email + password, receive OTP email, enter code
2. **Login** — Use registered email + password
3. **Profile** — Create profile with username, display name, bio, avatar color
4. **Search** — Search for another user by username
5. **Friend request** — Send a request to another user
6. **Notifications** — Other user sees the request, accepts it
7. **DM** — Both users can send messages, see them appear in real-time
8. **Group** — Create a group, add members, send group messages
9. **Password reset** — Request reset, receive email, click link, set new password
10. **Logout** — Session ends, redirect to login
11. **Refresh** — Messages persist after page reload
12. **Mobile** — Bottom tab bar works on phone-width screens

### Two-account testing

Open the app in two browsers (or one normal + one incognito):
1. Register two accounts with different emails
2. Create profiles for both
3. From account A, search for B's username and send a friend request
4. From account B, check notifications, accept the request
5. From either account, open the chat and send a message
6. The other account should see it appear instantly

---

## Free Tier Limits

| Service | Limit | What happens if exceeded |
|---------|-------|------------------------|
| Cloudflare Workers | 100,000 requests/day | Worker stops responding (resets daily) |
| Cloudflare KV reads | 100,000/day | Reads fail (resets daily) |
| Cloudflare KV writes | 1,000/day | Writes fail (resets daily) |
| Cloudflare KV storage | 1 GB | Cannot write new data |
| Durable Objects | 100,000 requests/day | Real-time stops (messages still persist via API) |
| Resend | 3,000 emails/month, 100/day | Emails fail to send |

**Note:** KV writes are the most limited resource (1,000/day). Each message send = 1 write. Each friend request = ~5 writes. For personal use, this is plenty. For heavy traffic, consider upgrading.

---

## Troubleshooting

### "Email service not configured"
You haven't set the `RESEND_API_KEY` secret. Run `npx wrangler secret put RESEND_API_KEY`.

### Emails don't arrive
- Check your spam folder
- If using `onboarding@resend.dev` (default), some providers may block it — verify your domain in Resend
- Check Resend dashboard for delivery logs

### WebSocket doesn't connect
- Ensure the Worker is deployed and the URL in `index.html` is correct
- Check browser console for connection errors
- The app falls back to manual refresh if WebSocket fails (messages still persist)

### "Unauthorized" errors
- Your session may have expired — log out and log back in
- Ensure the Worker is running

### Messages don't appear in real-time
- WebSocket may have disconnected — the app auto-reconnects after 3 seconds
- Refresh the page to load latest messages from KV
- Check that Durable Objects are enabled on your Cloudflare plan (free tier includes them)

### CORS errors
- The Worker allows all origins (`*`). If you need to restrict, modify the `CORS` constant in `worker.js`.

### KV namespace errors
- Ensure the KV namespace ID in `wrangler.toml` is correct
- Run `npx wrangler kv namespace list` to verify

---

## Security Notes

- Passwords are hashed with PBKDF2 (100,000 iterations, SHA-256, 32-byte salt) — never stored in plaintext
- Session tokens are 256-bit random values stored in KV
- Password reset tokens are single-use and expire after 1 hour
- OTP codes expire after 10 minutes
- All user-generated content is HTML-escaped before rendering (XSS prevention)
- Users can only read messages where they are a participant
- Users can only accept/decline friend requests sent to them
- Only group owners can add members
- Password reset endpoint always returns success (prevents account enumeration)
- No secrets are exposed in frontend code — all in Worker secrets

---

## Data Model (KV Keys)

| Key Pattern | Value | Purpose |
|-------------|-------|---------|
| `user:{email}` | User JSON | Login lookup |
| `user:id:{id}` | User JSON | Profile lookup |
| `username:{lower}` | userId | Username uniqueness + search |
| `profile:{userId}` | Profile JSON | User profile |
| `session:{token}` | userId | Session validation |
| `otp:{email}` | OTP JSON | Registration verification |
| `reset:{token}` | Reset JSON | Password reset |
| `friendship:{id}` | Friendship JSON | Friend relationship |
| `fri:{uid}:{id}` | "1" | Friendship index per user |
| `frq:{uid}:{id}` | "1" | Pending requests TO user |
| `frs:{uid}:{id}` | "1" | Requests sent BY user |
| `group:{id}` | Group JSON | Group data |
| `grp:{uid}:{id}` | "1" | Group index per user |
| `msg:{chatId}:{revTs}:{id}` | "" (metadata=msg) | Message (paginated by timestamp) |

---

## What Was Removed from Base44

All Base44 dependencies have been replaced:

| Base44 Feature | Standalone Replacement |
|---------------|----------------------|
| Base44 Auth (email/password + OTP) | Custom PBKDF2 auth + Resend email |
| Base44 Entities (UserProfile, Friendship, ChatMessage, Group) | Cloudflare KV with indexed keys |
| Base44 Realtime subscriptions | WebSocket via Durable Object |
| Base44 SDK (`base44.entities.*`) | `fetch()` calls to Worker API |
| Base44 hosting | GitHub Pages (frontend) + Cloudflare Worker (backend) |
| Base44 password reset emails | Resend API with secure tokens |

No code references `*.base44.app` or uses the Base44 SDK. The app works independently.