// Real terminal command interpreter operating on the shared file tree.
// Returns { tree, cwd, output, clear } — the IDE applies tree/cwd changes.

import {
  resolvePath, listDir, createEntry, deleteEntry, renameEntry, moveEntry,
  readFile, normalizePath, pathExists,
} from './fsUtils';

function parseArgs(input) {
  const matches = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return matches.map((s) => s.replace(/^"|"$/g, ''));
}

export async function runCommand({ tree, cwd, input, runPython, openPreview }) {
  const trimmed = input.trim();
  if (!trimmed) return { tree, cwd, output: '' };
  const parts = parseArgs(trimmed);
  const cmd = parts[0];
  const args = parts.slice(1);
  const out = [];

  switch (cmd) {
    case 'pwd':
      out.push('/' + cwd.join('/'));
      break;

    case 'ls': {
      const target = args[0] ? normalizePath(cwd, args[0]) : cwd;
      const listing = listDir(tree, target);
      if (!listing) out.push(`ls: ${args[0]}: No such file or directory`);
      else if (listing.length === 0) out.push('');
      else
        out.push(
          listing
            .map((c) => (c.type === 'folder' ? c.name + '/' : c.name))
            .join('   ')
        );
      break;
    }

    case 'cd': {
      if (!args[0] || args[0] === '~' || args[0] === '/') {
        return { tree, cwd: [] };
      }
      const target = normalizePath(cwd, args[0]);
      const node = resolvePath(tree, target);
      if (!node) out.push(`cd: ${args[0]}: No such file or directory`);
      else if (node.type !== 'folder')
        out.push(`cd: ${args[0]}: Not a directory`);
      else return { tree, cwd: target };
      break;
    }

    case 'mkdir': {
      if (!args[0]) { out.push('mkdir: missing operand'); break; }
      const recursive = args.includes('-p');
      for (const a of args.filter((x) => !x.startsWith('-'))) {
        const target = normalizePath(cwd, a);
        const name = target[target.length - 1];
        const parent = target.slice(0, -1);
        if (recursive) {
          // create intermediate folders
          let cur = tree;
          let acc = [];
          let ok = true;
          for (const seg of target) {
            const r = createEntry(cur, acc, seg, 'folder');
            if (r.ok) { cur = r.tree; }
            else if (r.error && r.error.includes('already exists')) { cur = tree; }
            else { out.push(`mkdir: ${r.error}`); ok = false; break; }
            acc = [...acc, seg];
            tree = cur;
          }
          if (!ok) break;
        } else {
          const r = createEntry(tree, parent, name, 'folder');
          if (r.ok) tree = r.tree;
          else out.push(`mkdir: cannot create directory '${a}': ${r.error}`);
        }
      }
      break;
    }

    case 'touch': {
      if (!args[0]) { out.push('touch: missing operand'); break; }
      for (const a of args) {
        const target = normalizePath(cwd, a);
        if (pathExists(tree, target)) continue; // touch updates mtime; no-op here
        const name = target[target.length - 1];
        const parent = target.slice(0, -1);
        const r = createEntry(tree, parent, name, 'file');
        if (r.ok) tree = r.tree;
        else out.push(`touch: cannot create '${a}': ${r.error}`);
      }
      break;
    }

    case 'cat': {
      if (!args[0]) { out.push('cat: missing operand'); break; }
      for (const a of args) {
        const target = normalizePath(cwd, a);
        const r = readFile(tree, target);
        if (!r.ok) out.push(`cat: ${a}: ${r.error}`);
        else if (r.binary) out.push(`cat: ${a}: binary file (not printable)`);
        else out.push(r.content || '');
      }
      break;
    }

    case 'rm': {
      const recursive = args.some((a) => a === '-r' || a === '-rf' || a === '-fr' || a === '-f');
      const files = args.filter((a) => !a.startsWith('-'));
      if (files.length === 0) { out.push('rm: missing operand'); break; }
      for (const f of files) {
        const target = normalizePath(cwd, f);
        const node = resolvePath(tree, target);
        if (!node) { out.push(`rm: ${f}: No such file or directory`); continue; }
        if (node.type === 'folder' && !recursive) {
          out.push(`rm: ${f}: is a directory (use -r)`);
          continue;
        }
        const r = deleteEntry(tree, target);
        if (r.ok) tree = r.tree;
        else out.push(`rm: ${f}: ${r.error}`);
      }
      break;
    }

    case 'mv': {
      if (args.length < 2) { out.push('mv: missing destination operand'); break; }
      const src = normalizePath(cwd, args[0]);
      const dest = normalizePath(cwd, args[1]);
      const destNode = resolvePath(tree, dest);
      if (destNode && destNode.type === 'folder') {
        const r = moveEntry(tree, src, dest);
        if (r.ok) tree = r.tree;
        else out.push(`mv: ${r.error}`);
      } else {
        const r = renameEntry(tree, src, dest[dest.length - 1]);
        if (r.ok) tree = r.tree;
        else out.push(`mv: ${r.error}`);
      }
      break;
    }

    case 'cp':
      out.push('cp: not implemented in this terminal (use the explorer to copy)');
      break;

    case 'echo':
      out.push(args.join(' '));
      break;

    case 'clear':
      return { tree, cwd, output: '', clear: true };

    case 'open': {
      if (!args[0]) { out.push('open: missing file'); break; }
      const target = normalizePath(cwd, args[0]);
      const node = resolvePath(tree, target);
      if (!node) out.push(`open: ${args[0]}: No such file`);
      else if (node.type !== 'folder') {
        openPreview(target);
        out.push(`Opening ${args[0]} in live preview...`);
      } else {
        out.push(`open: ${args[0]}: Is a directory`);
      }
      break;
    }

    case 'tree': {
      const node = args[0] ? resolvePath(tree, normalizePath(cwd, args[0])) : resolvePath(tree, cwd);
      if (!node) { out.push('tree: not found'); break; }
      const lines = [];
      (function walk(n, prefix) {
        if (n.type !== 'folder') return;
        for (const c of n.children || []) {
          lines.push(prefix + (c.type === 'folder' ? c.name + '/' : c.name));
          if (c.type === 'folder') walk(c, prefix + '  ');
        }
      })(node, '');
      out.push(lines.join('\n'));
      break;
    }

    case 'python3':
    case 'python': {
      if (!args[0]) { out.push('python: missing file (e.g. python3 main.py)'); break; }
      const target = normalizePath(cwd, args[0]);
      const r = readFile(tree, target);
      if (!r.ok) { out.push(`python: can't open file '${args[0]}': ${r.error}`); break; }
      if (r.binary) { out.push(`python: '${args[0]}' is a binary file`); break; }
      out.push(`$ python3 ${args[0]}`);
      try {
        const result = await runPython(r.content, tree, cwd);
        if (result.loading) out.push('[loading Python runtime via Pyodide — first run downloads ~10MB...]');
        if (result.stdout) out.push(result.stdout);
        if (result.stderr) out.push(result.stderr);
        if (!result.stdout && !result.stderr) out.push('(no output)');
      } catch (e) {
        out.push(`python: ${e.message || e}`);
      }
      break;
    }

    case 'help':
      out.push(
        'Available commands:',
        '  ls [path]       list directory contents',
        '  cd [path]       change directory (cd .. to go up, cd / for root)',
        '  pwd             print working directory',
        '  mkdir <name>    create a directory (-p for parents)',
        '  touch <name>    create an empty file',
        '  cat <file>      print file contents',
        '  rm [-r] <name>  remove file (or folder with -r)',
        '  mv <src> <dst>  move or rename',
        '  echo <text>     print text',
        '  open <file>     open a file in the live preview',
        '  tree [path]     show directory tree',
        '  python3 <file>  run a Python file (real execution via Pyodide WASM)',
        '  clear           clear the terminal',
        '  help            show this help'
      );
      break;

    case 'whoami':
      out.push('developer');
      break;

    case 'date':
      out.push(new Date().toString());
      break;

    default:
      out.push(`${cmd}: command not found. Type 'help' for available commands.`);
  }

  return { tree, cwd, output: out.join('\n') };
}