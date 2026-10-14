import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = "jakefnrr/code";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const filePath = typeof body.path === "string" ? body.path : "";
    const find = typeof body.find === "string" ? body.find : "";
    const replace = typeof body.replace === "string" ? body.replace : "";
    const message = typeof body.message === "string" && body.message ? body.message : `Patch ${filePath}`;
    if (!filePath || !find) return Response.json({ error: 'path and find are required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GreenChat-Base44"
    };

    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      headers, signal: AbortSignal.timeout(15000)
    });
    if (!getRes.ok) return Response.json({ error: `get ${getRes.status}` }, { status: 502 });
    const getData = await getRes.json();
    const sha = getData.sha;
    const decoded = decodeURIComponent(escape(atob(getData.content.replace(/\n/g, ""))));
    if (!decoded.includes(find)) return Response.json({ error: 'find string not present', ok: false }, { status: 409 });
    const updated = decoded.split(find).join(replace);

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: btoa(unescape(encodeURIComponent(updated))), sha }),
      signal: AbortSignal.timeout(15000)
    });
    const putData = await putRes.json().catch(() => ({}));
    if (!putRes.ok) return Response.json({ error: `put ${putRes.status}: ${JSON.stringify(putData)}` }, { status: 502 });
    return Response.json({ ok: true, commit: putData.commit?.sha, path: filePath });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}