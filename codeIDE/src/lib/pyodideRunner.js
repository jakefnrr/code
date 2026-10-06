// Real Python execution in the browser via Pyodide (CPython compiled to WASM).
// Loaded lazily from a CDN on first python3 command — no fake output.

const PYODIDE_VERSION = '0.26.2';
const SCRIPT_SRC = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;

let pyodidePromise = null;
let loadingNotified = false;

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) return resolve();
    const existing = document.getElementById('pyodide-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Pyodide script')));
      return;
    }
    const s = document.createElement('script');
    s.id = 'pyodide-script';
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Pyodide from CDN'));
    document.head.appendChild(s);
  });
}

export async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript();
      const py = await window.loadPyodide();
      return py;
    })();
  }
  return pyodidePromise;
}

export function isPyodideLoading() {
  return loadingNotified;
}

// runPython(code, tree, cwd) -> { stdout, stderr, loading }
export async function runPython(code, tree, cwd) {
  loadingNotified = true;
  const py = await getPyodide();
  loadingNotified = false;

  // Write every .py file in the project into the Pyodide virtual FS so imports work.
  const pyFiles = [];
  (function walk(node, path) {
    if (node.type === 'file' && node.name.endsWith('.py'))
      pyFiles.push({ path: path.join('/'), content: node.content || '' });
    else if (node.type === 'folder')
      for (const c of node.children || []) walk(c, [...path, c.name]);
  })(tree, []);

  for (const f of pyFiles) {
    const dir = f.path.split('/').slice(0, -1).join('/');
    if (dir) {
      try { py.FS.mkdirTree(dir); } catch {}
    }
    try { py.FS.writeFile(f.path, f.content); } catch {}
  }

  const cwdStr = '/' + cwd.join('/');
  let stdout = '';
  let stderr = '';
  py.setStdout({ batched: (s) => { stdout += s + '\n'; } });
  py.setStderr({ batched: (s) => { stderr += s + '\n'; } });

  // Make cwd and project root importable
  const prefix = `import sys\nfor p in [${JSON.stringify(cwdStr)}, '/']:\n    if p not in sys.path: sys.path.insert(0, p)\n`;
  try {
    await py.runPythonAsync(prefix);
    await py.runPythonAsync(code);
  } catch (e) {
    stderr += (e.message || String(e)) + '\n';
  }

  return { stdout: stdout.replace(/\n$/, ''), stderr: stderr.replace(/\n$/, '') };
}