// filesystem utilities for the IDE file tree

function emptyTree() {
  return { id: Math.random().toString(36).slice(2), type: 'folder', name: 'untitled', children: [] };
}

function serializeTree(tree) {
  if (!tree) return {};
  const result = {};
  (function walk(node) {
    if (node.type === 'file') {
      result[node.path.join('/')] = { name: node.name, content: node.content, binary: node.binary };
    } else if (node.type === 'folder') {
      result[node.path.join('/')] = { name: node.name, children: [] };
      if (node.children) {
        node.children.forEach(child => walk(child));
      }
    }
  })(tree);
  return result;
}

function deserializeTree(serialized) {
  if (!serialized) return emptyTree();
  const root = { id: Math.random().toString(36).slice(2), type: 'folder', name: 'root', children: [] };
  const entries = Object.keys(serialized);
  for (const key of entries) {
    const data = serialized[key];
    if (data.type === 'file' || (data.name && !data.children)) {
      const entry = { id: key, type: 'file', name: data.name || 'file', content: data.content || '', binary: data.binary || false, path: [key] };
      // place at root level
      root.children = root.children || [];
      root.children.push(entry);
    } else if (data.type === 'folder' || (data.children && data.children.length > 0)) {
      const folder = { id: key, type: 'folder', name: data.name || 'folder', children: [], path: [key] };
      if (data.children) {
        data.children.forEach(childData => {
          const child = deserializeTree(childData);
          child.path = ['root', ...child.path].filter(p => p);
          folder.children.push(child);
        });
      }
      root.children = root.children || [];
      root.children.push(folder);
    }
  }
  return root;
}

function resolvePath(tree, path) {
  if (!tree || !path) return null;
  const segments = Array.isArray(path) ? path : path.split('/').filter(s => s);
  let node = tree;
  for (const seg of segments) {
    if (!node || node.type !== 'folder') return null;
    node = (node.children || []).find(c => c.name === seg);
    if (!node) return null;
  }
  return node;
}

function findEntryFile(tree, path) {
  if (!tree || !path) return null;
  const node = resolvePath(tree, path);
  if (!node || node.type !== 'file') return null;
  return node;
}

function normalizePath(path) {
  if (!path) return [];
  const parts = path.split('/').filter(s => s && s !== '.');
  const result = [];
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else {
      result.push(part);
    }
  }
  return result;
}

function pathExists(tree, path) {
  if (!tree) return false;
  const segments = Array.isArray(path) ? path : path.split('/').filter(s => s);
  let node = tree;
  for (const seg of segments) {
    if (!node || node.type !== 'folder') return false;
    node = (node.children || []).find(c => c.name === seg);
    if (!node) return false;
  }
  return true;
}

function listDir(tree, path) {
  const node = pathExists(tree, path) ? resolvePath(tree, path) : null;
  if (!node || node.type !== 'folder') return null;
  return node.children || [];
}

function createEntry(tree, parentPath, name, type) {
  const parent = resolvePath(tree, parentPath);
  if (!parent || parent.type !== 'folder') {
    return { ok: false, error: 'Parent directory not found' };
  }

  // Check for name collision
  const existing = (parent.children || []).find(c => c.name === name);
  if (existing) {
    return { ok: false, error: 'A file or folder with that name already exists' };
  }

  const newEntry = {
    id: Math.random().toString(36).slice(2),
    type: type,
    name: name,
    children: [],
    path: [...parentPath, name]
  };

  const newChildren = [...(parent.children || []), newEntry];
  const newParent = { ...parent, children: newChildren };

  // Update tree - find root and replace parent
  const updatedTree = updateTreeParent(tree, parent, newParent);
  return { ok: true, tree: updatedTree };
}

function updateTreeParent(tree, oldParent, newParent) {
  if (!tree) return tree;
  if (tree === oldParent) return newParent;
  if (tree.type === 'folder' && tree.children) {
    const newChildren = tree.children.map(c => c.id === oldParent.id ? newParent : c);
    return { ...tree, children: newChildren };
  }
  // recursive search
  const findAndUpdate = (node) => {
    if (node.type === 'folder' && node.children) {
      node.children = node.children.map(c => {
        if (c.id === oldParent.id) return newParent;
        if (c.type === 'folder' && c.children) {
          return { ...c, children: findAndUpdate(c) };
        }
        return c;
      });
    }
    return node;
  };
  return findAndUpdate(tree);
}

function deleteEntry(tree, path) {
  const node = resolvePath(tree, path);
  if (!node) {
    return { ok: false, error: 'Entry not found' };
  }

  const isFolder = node.type === 'folder';
  const segments = Array.isArray(path) ? path : path.split('/').filter(s => s);
  const targetName = segments[segments.length - 1];

  // Cannot delete root
  if (path.length <= 1 || (Array.isArray(path) && path.join('/') === '')) {
    return { ok: false, error: 'Cannot delete root' };
  }

  // Find parent
  const parentPath = segments.slice(0, -1);
  const parent = resolvePath(tree, parentPath);
  if (!parent || parent.type !== 'folder') {
    return { ok: false, error: 'Parent not found' };
  }

  // Remove from parent's children
  const newChildren = (parent.children || []).filter(c => c.name !== targetName);
  const newParent = { ...parent, children: newChildren };

  const updatedTree = updateTreeParent(tree, parent, newParent);
  return { ok: true, tree: updatedTree };
}

function renameEntry(tree, path, newName) {
  const node = resolvePath(tree, path);
  if (!node) {
    return { ok: false, error: 'Entry not found' };
  }

  const parentPath = path.slice(0, -1);
  const parent = resolvePath(tree, parentPath);
  if (!parent || parent.type !== 'folder') {
    return { ok: false, error: 'Parent not found' };
  }

  // Check for name collision
  const existing = (parent.children || []).find(c => c.name === newName && c.id !== node.id);
  if (existing) {
    return { ok: false, error: 'A file or folder with that name already exists' };
  }

  // Rename the node
  node.name = newName;

  // Update path on node and all descendants
  const updatePaths = (n) => {
    n.path = [...parentPath, n.name];
    if (n.children) {
      n.children.forEach(updatePaths);
    }
  };
  updatePaths(node);

  const newParent = { ...parent, children: (parent.children || []).map(c => c.id === node.id ? node : c) };
  const updatedTree = updateTreeParent(tree, parent, newParent);
  return { ok: true, tree: updatedTree };
}

function moveEntry(tree, srcPath, destFolderPath) {
  const srcNode = resolvePath(tree, srcPath);
  if (!srcNode) {
    return { ok: false, error: 'Source not found' };
  }

  const destParent = resolvePath(tree, destFolderPath);
  if (!destParent || destParent.type !== 'folder') {
    return { ok: false, error: 'Destination not found' };
  }

  // Cannot move a folder into its own descendant
  const destPathStr = destFolderPath.join ? destFolderPath.join('/') : destFolderPath;
  const srcPathStr = srcPath.join ? srcPath.join('/') : srcPath.join('/');
  if (isDescendantOf(destParent, srcNode)) {
    return { ok: false, error: 'Cannot move a folder into its own descendant' };
  }

  // Remove from current parent
  const srcParentPath = srcPath.slice(0, -1);
  const srcParent = resolvePath(tree, srcParentPath);
  if (!srcParent) {
    return { ok: false, error: 'Source parent not found' };
  }

  const srcNewChildren = (srcParent.children || []).filter(c => c.id !== srcNode.id);
  const srcNewParent = { ...srcParent, children: srcNewChildren };

  // Add to new parent
  const newDestChildren = [...(destParent.children || {}), srcNode];
  const newDestParent = { ...destParent, children: newDestChildren };

  // Update tree
  const afterRemove = updateTreeParent(tree, srcParent, srcNewParent);
  const updatedTree = updateTreeParent(afterRemove, destParent, newDestParent);

  // Update srcNode path
  srcNode.path = [...destFolderPath, srcNode.name];

  return { ok: true, tree: updatedTree };
}

function isDescendantOf(node, potentialAncestor) {
  let current = node;
  while (current) {
    if (current.id === potentialAncestor.id) return true;
    current = current.parent;
  }
  return false;
}

// writeFile - writes content to a file at the given path, creating intermediate folders if needed
function writeFile(tree, path, content) {
  const segments = Array.isArray(path) ? path : path.split('/').filter(s => s);
  const fileName = segments.pop(); // last segment is the filename
  const parentPath = segments;

  // Ensure parent directory exists
  let parent = resolvePath(tree, parentPath);
  if (!parent || parent.type !== 'folder') {
    // create intermediate folders
    let currentPath = [];
    for (const seg of parentPath) {
      currentPath.push(seg);
      const r = createEntry(tree, currentPath, seg, 'folder');
      if (!r.ok) return r;
      tree = r.tree;
      parent = r.tree; // re-resolve
    }
  }

  // Now create or overwrite the file
  const existing = (parent.children || []).find(c => c.name === fileName && c.type === 'file');
  if (existing) {
    existing.content = content;
  } else {
    const newFile = {
      id: Math.random().toString(36).slice(2),
      type: 'file',
      name: fileName,
      content: content,
      binary: false,
      path: [...parentPath, fileName]
    };
    const newChildren = [...(parent.children || []), newFile];
    const newParent = { ...parent, children: newChildren };
    tree = updateTreeParent(tree, parent, newParent);
  }

  return { ok: true, tree };
}

export {
  emptyTree,
  serializeTree,
  deserializeTree,
  createEntry,
  deleteEntry,
  renameEntry,
  moveEntry,
  writeFile,
  resolvePath,
  findEntryFile,
  listDir,
  normalizePath,
  pathExists
};