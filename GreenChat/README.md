# GreenChat

Realtime chat for jakescalzo.me. Frontend here, backend = Cloudflare Worker + Durable Object, persistence = existing `shared-store` KV (`d726fc2081e044f7b7ed1bc7b9b9d543`).

## Files
- `index.html` — entry point (open `/GreenChat/` when deployed)
- `style.css`, `app.js`, `config.js` — frontend (no frameworks, no localStorage)
- `worker/worker.js` — API + `ChatRoom` Durable Object (WebSocket fan-out)
- `worker/wrangler.toml` — Worker config, already points at `shared-store`

## Deploy backend
1. `cd GreenChat/worker && npx wrangler login && npx wrangler deploy`
2. Copy the Worker URL into `config.js` (`window.GREENCHAT_API = "https://greenchat-api.<you>.workers.dev"`).
   Or route it on your domain (`jakescalzo.me/api/*` → Worker) and leave `config.js` empty.
3. Commit + push (Pages serves the frontend statically; no secrets in repo).

## How it works
- First visit → `POST /api/register` creates user + `HttpOnly` cookie session (`gc:sess:<hash>` in KV). Cookie proves identity; client IDs are never trusted.
- Friends: `POST /api/requests` → accept/decline; friendships in `gc:friends:<uid>`. Guards: no self-add, no duplicates, only recipient can accept/decline.
- Messages: REST `POST /api/convos/:id/messages` persists to `gc:msgs:<convo>` (KV); the `ChatRoom` Durable Object broadcasts over WebSocket instantly. If WS drops, the app polls every 3s and reconnects with backoff. No localStorage anywhere.
- KV keys: `gc:user:<id>`, `gc:uname:<name>`, `gc:sess:<hash>`, `gc:req:<id>`, `gc:reqs:<uid>`, `gc:friends:<uid>`, `gc:convo:<id>`, `gc:msgs:<id>`, `gc:unread:<convo>:<uid>`, `gc:usernames`, `gc:rl:<uid>`.
- Security: HttpOnly session cookies, per-conversation membership checks, 2000-char limit, 20 msg/min rate limit, CORS+credentials, Unicode-safe escaping.

## Test
1. Open `/GreenChat/` in two browsers/profiles, register `alice` and `bob`.
2. As alice: Search → bob → Add. As bob: Requests → Accept.
3. Chat both ways — messages arrive without refresh. Reload — history persists. Kill network briefly — status dot goes orange, then reconnects.
