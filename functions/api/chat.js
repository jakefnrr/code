/**
 * Cloudflare Pages Function: POST /api/chat
 * Body: { messages: [{role, content}], model? }
 *
 * SETUP - pick ONE:
 *
 * OPTION A (Recommended, no API key in code) - Workers AI binding:
 *  1. Cloudflare Dashboard > Workers & Pages > your Pages project (jakefnrr/code)
 *  2. Settings > Functions > Add binding > AI catalog: variable name = AI
 *  3. Redeploy. This function will call env.AI.run() automatically.
 *
 * OPTION B - AI Gateway / API token:
 *  1. That "AI tab on the left sidebar" is AI Gateway / Workers AI.
 *  2. Get: Account ID + API Token (Workers AI read) OR Gateway endpoint.
 *  3. Pages > Settings > Environment variables: CF_ACCOUNT_ID, CF_AI_TOKEN
 *     (optionally CF_GATEWAY = gateway name, CF_MODEL override)
 *  4. Redeploy.
 */

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function json(d, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be JSON { messages: [] }" }, 400);
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : null;
  if (!messages || !messages.length) return json({ error: "No messages" }, 400);
  const model = body.model || env.CF_MODEL || DEFAULT_MODEL;

  // Clean messages to role/content strings only (safety + smaller payload)
  const clean = messages
    .filter((m) => m && typeof m.content === "string")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.content.slice(0, 8000),
    }));

  try {
    // OPTION A: Workers AI binding
    if (env.AI) {
      const url = new URL(request.url);
      if (url.searchParams.get("stream") === "1") {
        const stream = await env.AI.run(model, { messages: clean, stream: true });
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...cors() },
        });
      }
      const out = await env.AI.run(model, { messages: clean });
      const reply =
        out?.response ?? out?.result?.response ?? (typeof out === "string" ? out : JSON.stringify(out));
      return json({ reply, model });
    }

    // OPTION B: REST via API token (+ optional AI Gateway)
    const account = env.CF_ACCOUNT_ID;
    const token = env.CF_AI_TOKEN;
    if (!account || !token) {
      return json(
        {
          error:
            "No AI binding found. Add Workers AI binding named AI (Settings > Functions > Add binding), OR set env vars CF_ACCOUNT_ID + CF_AI_TOKEN and redeploy.",
        },
        501
      );
    }
    const gateway = env.CF_GATEWAY; // optional gateway name
    const url = gateway
      ? `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/workers-ai/${model}`
      : `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: clean }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: data?.errors?.[0]?.message || "Workers AI error", data }, r.status);
    const reply = data?.result?.response ?? data?.response ?? JSON.stringify(data.result ?? data);
    return json({ reply, model });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
