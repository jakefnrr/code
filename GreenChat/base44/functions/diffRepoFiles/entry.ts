import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = "jakefnrr/code";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = typeof req.json === 'function' ? await req.json() : req;
    const localPaths = body.localPaths || [];
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const H = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GreenChat-Base44"
    };
    const rr = await fetch(`https://api.github.com/repos/${REPO}`, { headers: H, signal: AbortSignal.timeout(15000) });
    const rd = await rr.json();
    const branch = rd.default_branch || "main";
    const tr = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${branch}?recursive=1`, { headers: H, signal: AbortSignal.timeout(15000) });
    const td = await tr.json();
    if (!tr.ok) return Response.json({ error: 'tree fetch failed', detail: td.message }, { status: 500 });
    const repoPaths = new Set((td.tree || []).filter(t => t.type === "blob" && t.path.startsWith("GreenChat/")).map(t => t.path));
    const missing = localPaths.filter(p => !repoPaths.has(p));
    return Response.json({ branch, repoBlobCount: repoPaths.size, localCount: localPaths.length, missingCount: missing.length, missing });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}