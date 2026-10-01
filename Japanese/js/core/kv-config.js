// Cloudflare KV sync config — your KV namespace is named "shared-store".
// 1) wrangler kv:namespace list  -> copy the id of shared-store into workers/wrangler.toml
// 2) Deploy:  cd Japanese/workers && wrangler deploy
// 3) Paste the worker URL below. Leave "" to stay local-only (app still works fully).
window.KV_CONFIG = {
  WORKER_URL: "",          // e.g. "https://sakura-progress.you.workers.dev"
  USER_ID: "mom",           // one id per person: "mom", ...
  SYNC_MS: 4000            // debounce delay before pushing to KV
};
