import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = "jakefnrr/code";
const LIVE = "https://jakegreenchat.base44.app";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const H = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GreenChat-Base44",
      "Content-Type": "application/json"
    };
    const ghGet = async (p) => {
      const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${p}`, { headers: H, signal: AbortSignal.timeout(15000) });
      const d = await r.json();
      if (!r.ok) return { ok: false, status: r.status };
      return { ok: true, sha: d.sha, content: decodeURIComponent(escape(atob(d.content.replace(/\n/g, "")))) };
    };
    const ghPut = async (p, content, sha, message) => {
      const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${p}`, {
        method: "PUT", headers: H,
        body: JSON.stringify({ message, content: btoa(unescape(encodeURIComponent(content))), sha }),
        signal: AbortSignal.timeout(15000)
      });
      const d = await r.json();
      return { ok: r.ok, commit: d.commit?.sha, error: r.ok ? undefined : d.message };
    };

    const result = { liveUrl: LIVE };

    // 1. Root index.html: point the GreenChat button at the live app
    const root = await ghGet("index.html");
    if (root.ok) {
      const before = (root.content.match(/<a[^>]*>GreenChat<\/a>/i) || [null])[0];
      const after = `<a href="${LIVE}" target="_blank" rel="noopener" class="corner-btn" style="background: rgba(30, 255, 120, 0.18); border-color: rgba(67, 255, 143, 0.45); color: #45ff90;">GreenChat</a>`;
      let changed = false;
      if (before && before !== after) {
        const newRoot = root.content.replace(/<a[^>]*>GreenChat<\/a>/i, after);
        changed = newRoot !== root.content;
        if (changed) {
          const p = await ghPut("index.html", newRoot, root.sha, "Point GreenChat button to live app");
          result.rootPut = p;
        }
      }
      result.rootButtonBefore = before;
      result.rootButtonChanged = changed;
    } else {
      result.rootError = root.status;
    }

    // 2. GreenChat/index.html: replace the static landing with the real Vite entry
    //    that redirects to the live app when served without a build (e.g. GitHub Pages).
    const g = await ghGet("GreenChat/index.html");
    if (g.ok) {
      const entry = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GreenChat</title>
<meta name="description" content="GreenChat - real-time messaging." />
<meta name="theme-color" content="#0a0f0a" />
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
<script>
  // Served statically without a Vite build (e.g. GitHub Pages), the app bundle
  // won't load - redirect to the live hosted app instead.
  setTimeout(function () {
    var r = document.getElementById('root');
    if (!r || !r.hasChildNodes()) window.location.replace('${LIVE}');
  }, 2500);
</script>
</body>
</html>
`;
      const p = await ghPut("GreenChat/index.html", entry, g.sha, "Replace landing with real app entry (redirects to live app)");
      result.greenIndexPut = p;
    } else {
      result.greenIndexError = g.status;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}