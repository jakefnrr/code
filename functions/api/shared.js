/**
 * Cloudflare Pages Function: shared key-value store
 *
 * Routes:
 *   GET  /api/shared?key=notes:room:lobby  -> { key, value, updated_at }
 *   POST /api/shared  { key, value }        -> { ok: true }
 *
 * Works with either binding (bind at least one in Pages dashboard):
 *   - KV namespace binding named  SHARED_KV
 *   - D1 database binding named    DB  (table shared_store)
 *
 * D1 setup SQL (run once with wrangler or in dashboard):
 *   CREATE TABLE IF NOT EXISTS shared_store (
 *     key TEXT PRIMARY KEY,
 *     value TEXT NOT NULL,
 *     updated_at INTEGER NOT NULL
 *   );
 *
 * Frontend falls back to localStorage when this API is not
 * configured yet, so the site keeps working before setup.
 */

const MAX_KEY_LEN = 128;
const MAX_VALUE_BYTES = 500 * 1024; // 500 KB

function sanitizeKey(raw) {
  if (typeof raw !== "string") return null;
  const key = raw.trim().slice(0, MAX_KEY_LEN);
  if (!key) return null;
  if (!/^[A-Za-z0-9:_\-.]+$/.test(key)) return null;
  return key;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = sanitizeKey(url.searchParams.get("key"));

  if (!key) {
    return json({ error: "Missing or invalid ?key= (letters, numbers, :, -, _, .)" }, 400);
  }

  try {
    // 1) KV binding (preferred — simplest)
    if (env.SHARED_KV) {
      const raw = await env.SHARED_KV.get(key);
      if (raw === null) return json({ key, value: null, updated_at: null });
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return json({ key, value: raw, updated_at: null });
      }
      return json({ key, value: parsed.value ?? null, updated_at: parsed.updated_at ?? null });
    }

    // 2) D1 binding
    if (env.DB) {
      const row = await env.DB.prepare(
        "SELECT value, updated_at FROM shared_store WHERE key = ?"
      )
        .bind(key)
        .first();
      if (!row) return json({ key, value: null, updated_at: null });
      let value = null;
      try {
        value = JSON.parse(row.value);
      } catch {
        value = row.value;
      }
      return json({ key, value, updated_at: row.updated_at });
    }

    return json(
      {
        error: "No storage binding yet. Bind a KV namespace named SHARED_KV (or D1 named DB) in Cloudflare Pages > Settings > Bindings.",
        key,
        value: null,
      },
      501
    );
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body = null;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON: { key, value }" }, 400);
  }

  const key = sanitizeKey(body.key);
  if (!key) {
    return json({ error: "Missing or invalid key (letters, numbers, :, -, _, .)" }, 400);
  }

  const valueText = JSON.stringify(body.value ?? null);
  if (valueText.length > MAX_VALUE_BYTES) {
    return json({ error: "Value too large (max ~500KB)" }, 413);
  }

  const now = Date.now();

  try {
    if (env.SHARED_KV) {
      await env.SHARED_KV.put(key, JSON.stringify({ value: body.value ?? null, updated_at: now }));
      return json({ ok: true, key, updated_at: now });
    }

    if (env.DB) {
      await env.DB.prepare(
        `INSERT INTO shared_store (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
        .bind(key, valueText, now)
        .run();
      return json({ ok: true, key, updated_at: now });
    }

    return json(
      {
        error: "No storage binding yet. Bind a KV namespace named SHARED_KV (or D1 named DB) in Cloudflare Pages > Settings > Bindings.",
      },
      501
    );
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, 500);
  }
}
