
/**
 * Cloudflare Pages Function: shared key-value store
 *
 * TEMPORARY SECURITY MODE
 *
 * GET  /api/shared?key=example  -> Read existing data
 * POST /api/shared              -> BLOCKED
 *
 * Writes are temporarily disabled while authentication
 * and the stored-XSS vulnerability are being fixed.
 */

const MAX_KEY_LEN = 128;

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
    "Cache-Control": "no-store",
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
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// READ EXISTING DATA
export async function onRequestGet(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const key = sanitizeKey(url.searchParams.get("key"));

  if (!key) {
    return json({ error: "Missing or invalid key" }, 400);
  }

  try {
    // Cloudflare KV
    if (env.SHARED_KV) {
      const raw = await env.SHARED_KV.get(key);

      if (raw === null) {
        return json({
          key,
          value: null,
          updated_at: null,
        });
      }

      let parsed;

      try {
        parsed = JSON.parse(raw);
      } catch {
        return json({
          key,
          value: raw,
          updated_at: null,
        });
      }

      return json({
        key,
        value: parsed.value ?? null,
        updated_at: parsed.updated_at ?? null,
      });
    }

    // Cloudflare D1
    if (env.DB) {
      const row = await env.DB.prepare(
        "SELECT value, updated_at FROM shared_store WHERE key = ?"
      )
        .bind(key)
        .first();

      if (!row) {
        return json({
          key,
          value: null,
          updated_at: null,
        });
      }

      let value;

      try {
        value = JSON.parse(row.value);
      } catch {
        value = row.value;
      }

      return json({
        key,
        value,
        updated_at: row.updated_at,
      });
    }

    return json({
      error: "No storage binding configured",
      key,
      value: null,
    }, 501);

  } catch (err) {
    return json({
      error: "Storage read failed",
    }, 500);
  }
}

// BLOCK ALL DATABASE WRITES TEMPORARILY
export async function onRequestPost() {
  return json({
    ok: false,
    error: "Writes temporarily disabled for security maintenance.",
  }, 403);
}
