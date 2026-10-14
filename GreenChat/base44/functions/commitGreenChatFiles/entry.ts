import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = "jakefnrr/code";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const files = Array.isArray(body.files) ? body.files : [];
    const message = typeof body.message === "string" && body.message ? body.message : "Add GreenChat";
    if (files.length === 0) return Response.json({ error: 'files is required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const H = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GreenChat-Base44",
      "Content-Type": "application/json"
    };
    const api = (p, opts) => fetch(`https://api.github.com/repos/${REPO}${p}`, { headers: H, signal: AbortSignal.timeout(20000), ...opts });

    // 1. default branch
    const repoRes = await api("");
    if (!repoRes.ok) return Response.json({ error: `repo ${repoRes.status}` }, { status: 502 });
    const branch = (await repoRes.json()).default_branch;

    // 2. base commit sha
    const refRes = await api(`/git/refs/heads/${branch}`);
    if (!refRes.ok) return Response.json({ error: `ref ${refRes.status}` }, { status: 502 });
    const baseCommitSha = (await refRes.json()).object.sha;

    // 3. base tree sha
    const baseCommitRes = await api(`/git/commits/${baseCommitSha}`);
    if (!baseCommitRes.ok) return Response.json({ error: `basecommit ${baseCommitRes.status}` }, { status: 502 });
    const baseTreeSha = (await baseCommitRes.json()).tree.sha;

    // 4. create blobs (batched 6)
    const entries = [];
    for (let i = 0; i < files.length; i += 6) {
      const batch = files.slice(i, i + 6);
      const blobs = await Promise.allSettled(batch.map(async f => {
        if (typeof f.path !== "string" || typeof f.content !== "string") throw new Error("bad file");
        const r = await api("/git/blobs", { method: "POST", body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(f.content))), encoding: "base64" }) });
        const d = await r.json();
        if (!r.ok) throw new Error(`blob ${f.path}: ${r.status}`);
        return { path: f.path, mode: "100644", type: "blob", sha: d.sha };
      }));
      for (const b of blobs) entries.push(b.status === "fulfilled" ? b.value : { error: String(b.reason) });
    }
    const valid = entries.filter(e => e && e.sha);
    if (valid.length === 0) return Response.json({ error: 'no blobs created', entries }, { status: 502 });

    // 5. tree
    const treeRes = await api("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: baseTreeSha, tree: valid }) });
    const treeData = await treeRes.json();
    if (!treeRes.ok) return Response.json({ error: `tree ${treeRes.status}: ${JSON.stringify(treeData)}` }, { status: 502 });
    const newTreeSha = treeData.sha;

    // 6. commit
    const commitRes = await api("/git/commits", { method: "POST", body: JSON.stringify({ message, tree: newTreeSha, parents: [baseCommitSha] }) });
    const commitData = await commitRes.json();
    if (!commitRes.ok) return Response.json({ error: `commit ${commitRes.status}: ${JSON.stringify(commitData)}` }, { status: 502 });
    const newCommitSha = commitData.sha;

    // 7. update ref
    const refUpdateRes = await api(`/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: newCommitSha }) });
    const refUpdateData = await refUpdateRes.json();
    if (!refUpdateRes.ok) return Response.json({ error: `refupdate ${refUpdateRes.status}: ${JSON.stringify(refUpdateData)}` }, { status: 502 });

    return Response.json({ ok: true, commit: newCommitSha, branch, files: valid.length, errors: entries.filter(e => !e || !e.sha) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}