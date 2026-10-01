// Cloudflare Worker: KV-backed progress sync for Sakura Japanese.
// KV namespace: "shared-store" (binding SHARED_KV — see wrangler.toml).
//
// Setup (one time):
//   wrangler kv:namespace list        -> find "shared-store", copy its id into wrangler.toml
//   cd Japanese/workers && wrangler deploy
// Then paste the worker URL into js/core/kv-config.js as WORKER_URL.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/progress\/([\w-]+)$/);
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,PUT,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!m) return new Response("Use /progress/:userId", { status: 404, headers: cors });
    const key = "progress:" + m[1];
    if (req.method === "GET") {
      const v = await env.SHARED_KV.get(key, "json");
      return Response.json(v || {}, { headers: cors });
    }
    if (req.method === "PUT") {
      const body = await req.json();
      await env.SHARED_KV.put(key, JSON.stringify(body));
      return Response.json({ ok: true }, { headers: cors });
    }
    return new Response("Method not allowed", { status: 405, headers: cors });
  }
};
