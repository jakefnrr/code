# Chat App

A browser-based real-time chat app concept designed for a Cloudflare KV + Worker setup.

This folder includes:
- `index.html` — the chat UI
- `styles.css` — chat styling
- `app.js` — client-side logic, local persistence, media support, and WebSocket-ready wiring
- `worker-template.js` — Cloudflare Worker template for KV-backed message storage and account persistence

## Features
- one account per device using `localStorage`
- username saved in Cloudflare KV
- friend list stored in KV
- text messages
- emoji quick buttons
- image and video attachments
- local fallback mode for testing without a backend
- WebSocket-ready for real-time online sync

## How it works

### Local-first mode
The app works without a server by storing data in the browser using `localStorage`.

### Cloudflare Worker mode
The app is designed to plug into a Cloudflare Worker with a KV namespace bound as `KV_CHAT`.

Example Worker binding:
- `KV_CHAT` = your Cloudflare KV namespace

Then call these endpoints:
- `POST /api/user`
- `POST /api/messages`

For full real-time updates, connect your frontend app to a WebSocket endpoint that broadcasts messages and profile changes to all connected clients.

## Security note
This is a frontend/demo implementation. For production, add:
- secure auth or device ownership checks
- message validation and rate limits
- signed uploads for media storage
- Cloudflare R2 for actual image/video persistence
- proper friend/follow request handling

## Quick start
1. Open `chat/index.html` in a browser.
2. Set a username.
3. Add friends.
4. Send a message or upload media.

## Suggested Cloudflare upgrade
For a production-grade version, pair this with:
- Cloudflare Workers
- Cloudflare KV
- Cloudflare R2
- Durable Objects or WebSockets for real-time delivery

This gives you a strong base for a real messaging app that supports:
- usernames
- friends list
- chat history
- media uploads
- online/offline syncing
- device-specific accounts

## Important
This repo is static HTML/JS and does not have a built-in backend. The included Worker file is a template you can deploy to Cloudflare.

The browser app supports both:
- local-only testing
- Cloudflare-ready real-time integration
