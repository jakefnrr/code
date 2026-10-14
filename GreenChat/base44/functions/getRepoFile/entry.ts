import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = "jakefnrr/code";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.trim() : "";
    if (!path) return Response.json({ error: 'path is required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GreenChat-Base44"
      },
      signal: AbortSignal.timeout(15000)
    });

    if (res.status === 404) return Response.json({ error: 'not found', notFound: true }, { status: 404 });
    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: `github ${res.status}: ${t}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.encoding === "base64" ? data.content.replace(/\n/g, "") : (data.content || "");
    const content = raw ? atob(raw) : "";
    return Response.json({ path: data.path, sha: data.sha, content, size: data.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}