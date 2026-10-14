# GreenChat

Real-time chat that works across the world. Search a username, send a friend request, and start talking instantly.

## Run locally
```bash
npm install
npm run dev
```
Then open http://localhost:5173

## Build
```bash
npm run build
```

## Tech
- React + Tailwind CSS on Vite
- Base44 platform (auth, database, real-time subscriptions)
- Row-Level Security (RLS) for per-user data privacy

## Structure
- `src/pages/GreenChat.jsx` — main app shell
- `src/components/greenchat/` — sidebar, chat view, and tab screens
- `src/components/ui/` — shadcn/ui components
- `src/lib/` — auth context, utils, query client
- `base44/entities/` — data schemas (UserProfile, Friendship, ChatMessage, Group)
- `base44/config.jsonc` — Base44 app config (app id)

> The live app is published at https://jakegreenchat.base44.app — the frontend talks to the Base44 hosted backend for auth and database, so it works out of the box locally with the app id in `base44/config.jsonc`.
