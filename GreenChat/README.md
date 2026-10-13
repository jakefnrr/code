# GreenChat

Real-time chat that works across the world. Search a username, send a friend request, and start talking instantly.

## Features
- **Chats** — direct messages with your friends, delivered in real time
- **Friends** — search by username and send friend requests
- **Groups** — create group chats and add members
- **Notifications** — live incoming friend requests
- **Profile** — username, display name, bio, and avatar color
- **Settings** — account info and logout

## Tech
- React + Tailwind CSS on Vite
- Base44 platform (auth, database, real-time subscriptions)
- Row-Level Security (RLS) for per-user data privacy

## Structure
- `src/pages/GreenChat.jsx` — main app shell
- `src/components/greenchat/` — sidebar, chat view, and tab screens
- `src/lib/greenchat.js` — shared helpers (chat ids, avatars, formatting)
- `base44/entities/` — data schemas (UserProfile, Friendship, ChatMessage, Group)

> Note: GreenChat is a hosted app on the Base44 platform. This folder contains the project source for reference; the live app runs on Base44 infrastructure (auth, database, real-time).
