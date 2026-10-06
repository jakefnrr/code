// Build a self-contained HTML document for the live preview iframe.
// Resolves relative href/src/url() references across the shared file tree
// by creating blob URLs for every file (text and binary).

import { resolvePath } from './fsUtils';

function mimeFor(path) {
  const p = path.toLowerCase();
  if (p.endsWith('.html') || p.endsWith('.htm')) return 'text/html';
  if (p.endsWith('.css')) return 'text/css';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'text/javascript';
  if (p.endsWith('.json')) return 'application/json';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.xml')) return 'application/xml';
  return 'text/plain';
}

function baseDirOf(pathArray) {
  return pathArray.slice(0, -1);
}

function resolveRef(baseDir, ref) {
  if (/^(https?:|data:|blob:|mailto:|tel:|#|javascript:)/i.test(ref)) return null;
  const parts = [...baseDir];
  for (const seg of ref.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts;
}

function rewriteCss(css, baseDir, blobUrls) {
  return css.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, ref) => {
    if (/^(https?:|data:|blob:)/i.test(ref)) return m;
    const p = resolveRef(baseDir, ref);
    if (!p) return m;
    const key = p.join('/');
    if (blobUrls[key]) return `url(${q}${blobUrls[key]}${q})`;
    return m;
  });
}

export async function buildPreview(tree, entryPath) {
  const entry = resolvePath(tree, entryPath);
  if (!entry || entry.type !== 'file') return null;

  // Collect every file path -> node
  const files = {};
  (function walk(node, path) {
    if (node.type === 'file') files[path.join('/')] = node;
    else for (const c of node.children || []) walk(c, [...path, c.name]);
  })(tree, []);

  // Create blob URLs for all files
  const blobUrls = {};
  for (const [p, node] of Object.entries(files)) {
    try {
      let blob;
      if (node.binary && node.content) {
        const res = await fetch(node.content);
        blob = await res.blob();
      } else {
        blob = new Blob([node.content || ''], { type: mimeFor(p) });
      }
      blobUrls[p] = URL.createObjectURL(blob);
    } catch {
      // skip
    }
  }

  const baseDir = baseDirOf(entryPath);
  const doc = new DOMParser().parseFromString(entry.content || '', 'text/html');

  // <link rel=stylesheet> -> rewrite CSS url() and point to a fresh blob
  doc.querySelectorAll('link[href]').forEach((el) => {
    const href = el.getAttribute('href');
    const p = resolveRef(baseDir, href);
    if (!p) return;
    const key = p.join('/');
    if (el.getAttribute('rel') === 'stylesheet' && files[key] && !files[key].binary) {
      const rewritten = rewriteCss(files[key].content || '', p, blobUrls);
      const url = URL.createObjectURL(new Blob([rewritten], { type: 'text/css' }));
      blobUrls['__css__' + key] = url;
      el.setAttribute('href', url);
    } else if (blobUrls[key]) {
      el.setAttribute('href', blobUrls[key]);
    }
  });

  doc.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src');
    const p = resolveRef(baseDir, src);
    if (!p) return;
    const key = p.join('/');
    if (blobUrls[key]) el.setAttribute('src', blobUrls[key]);
  });

  doc
    .querySelectorAll('img[src],audio[src],video[src],source[src],track[src],embed[src],input[src]')
    .forEach((el) => {
      const src = el.getAttribute('src');
      if (!src) return;
      const p = resolveRef(baseDir, src);
      if (!p) return;
      const key = p.join('/');
      if (blobUrls[key]) el.setAttribute('src', blobUrls[key]);
    });

  doc.querySelectorAll('a[href]').forEach((el) => {
    const href = el.getAttribute('href');
    const p = resolveRef(baseDir, href);
    if (p && blobUrls[p.join('/')]) {
      // navigate inside preview by reloading with new entry
      el.setAttribute('data-ide-internal', p.join('/'));
      el.setAttribute('href', '#');
    }
  });

  doc.querySelectorAll('style').forEach((el) => {
    el.textContent = rewriteCss(el.textContent || '', baseDir, blobUrls);
  });

  // Inline script to handle internal link clicks
  const shim = doc.createElement('script');
  shim.textContent = `
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[data-ide-internal]');
      if (a) { e.preventDefault(); parent.postMessage({ idePreviewNavigate: a.getAttribute('data-ide-internal') }, '*'); }
    });
  `;
  doc.body.appendChild(shim);

  return { html: '<!DOCTYPE html>' + doc.documentElement.outerHTML, blobUrls };
}