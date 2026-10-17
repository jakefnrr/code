# GreenChat

A simple, production-minded messaging app built for the `/2GreenChat/` subdirectory on `https://jakescalzo.me`.

## Important note

This project is intentionally designed to use a Gmail-based registration and reset flow without outbound email delivery. The reset flow verifies the Gmail address + username pair and lets the user set a new password immediately. This avoids the "load failed" issue caused by email delivery, but it is less secure than an email-token reset flow.

For production, you should later replace this with a proper single-use reset token email flow using a provider such as Mailgun, SendGrid, or Postmark with verified sender credentials.

## Project structure

- `2GreenChat/index.html` – app shell and auth UI
- `2GreenChat/style.css` – layout, theme, responsive styling
- `2GreenChat/app.js` – frontend logic and API calls
- `2GreenChat/worker.js` – Worker API and KV-backed logic
- `2GreenChat/wrangler.toml` – Cloudflare Worker + KV configuration

## Local setup

1. Create a Cloudflare Worker project with the `2GreenChat/` folder as the app root.
2. Install Wrangler if needed.
3. Update `2GreenChat/wrangler.toml` and replace:
   - `replace-with-your-kv-namespace-id` with your actual KV namespace ID.
4. Run locally:

```bash
cd 2GreenChat
npx wrangler dev --local
```

Then open the app through the Worker route you configured.

## Production deployment

1. Log in to Cloudflare.
2. Create or select a KV namespace.
3. Update `wrangler.toml` with your namespace ID.
4. Deploy:

```bash
cd 2GreenChat
npx wrangler deploy
```

5. Ensure your frontend is served from the `/2GreenChat/` directory on `https://jakescalzo.me`.
6. Update your host configuration so `/2GreenChat/index.html` is reachable and assets resolve correctly.

## Cloudflare binding

In `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "GREENCHAT_KV"
id = "replace-with-your-kv-namespace-id"
```

This binding is used by the Worker to store users, sessions, friends, conversations, and settings.

## Registration and login behavior

- Registration requires:
  - Gmail address
  - Username
  - Password (8+ chars)
- Username must be unique.
- Gmail must be unique.
- Login uses username + password.

## Password reset behavior

The app no longer sends email. Instead:

1. User selects “Forgot password?”
2. User enters Gmail address and username
3. The Worker verifies the pair matches a stored account
4. The app reveals a password-reset form
5. User enters and confirms a new password
6. The Worker updates the password hash and the account persists

This avoids email delivery dependencies and eliminates the original “load failed” issue.

## Security notes

- Passwords are hashed server-side using PBKDF2 with a random salt.
- Session IDs are stored in HttpOnly cookies.
- Sensitive data is never returned to the browser beyond what is needed for the session.
- KV is used for persistent data, but it is eventually consistent. This is fine for a chat demo, but production-scale real-time messaging should use Durable Objects for stronger coordination.

## Limits and next steps

- This is a functional app scaffold and demo clone. It is not a copy of an unknown external website because direct access was not available in this environment.
- For stronger real-time behavior, add Durable Objects and WebSocket support.
- For production-grade password resets, add a verified email provider and send a single-use token email.
- For full multi-device real-time updates, use WebSocket events with Durable Objects to broadcast message updates to connected clients.

## Testing checklist

- Register new account
- Duplicate username rejected
- Duplicate email rejected
- Login works
- Log out works
- Reset password with matching email + username works
- Friend request flow works
- Conversations persist after refresh
- Messages are sent and retrieved
- Messages stay available after page refresh

## Deployment caution

Do not deploy this app until the `wrangler.toml` KV binding is replaced with a valid namespace. The app will not function correctly without a real Cloudflare KV binding.
