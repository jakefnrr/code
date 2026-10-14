import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = "jakefnrr/code";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const message = typeof body.message === "string" && body.message ? body.message : `Update ${path}`;
    const sha = typeof body.sha === "string" && body.sha ? body.sha : undefined;
    const branch = typeof body.branch === "string" && body.branch ? body.branch : undefined;
    if (!path) return Response.json({ error: 'path is required' }, { status: 400 });
    if (content === "") return Response.json({ error: 'content is required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const encoded = btoa(unescape(encodeURIComponent(content)));
    const payload = { message, content: encoded };
    if (sha) payload.sha = sha;
    if (branch) payload.branch = branch;

    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "GreenChat-Base44"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ error: `github ${res.status}: ${JSON.stringify(data)}` }, { status: 502 });
    return Response.json({ ok: true, commit: data.commit?.sha, path: data.content?.path });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}