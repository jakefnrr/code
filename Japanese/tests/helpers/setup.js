// Shared test setup: paths + loading all data banks into globals.
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', '..');
function allJs(dir) {
  const out = [];
  (function walk(p) { for (const f of fs.readdirSync(p)) { const fp = path.join(p, f); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else if (f.endsWith('.js')) out.push(fp); } })(dir);
  return out;
}
function dataFiles() {
  const out = [];
  (function walk(rel) {
    const abs = path.join(D, rel);
    for (const f of fs.readdirSync(abs).sort()) {
      const fp = path.join(abs, f);
      if (fs.statSync(fp).isDirectory()) walk(path.join(rel, f));
      else if (f.endsWith('.js')) out.push(path.join(rel, f));
    }
  })('data');
  return out;
}
function loadData() {
  global.window = global;
  const files = dataFiles();
  files.forEach(f => eval(fs.readFileSync(path.join(D, f), 'utf8')));
  return files;
}
module.exports = { fs, path, D, allJs, loadData };
