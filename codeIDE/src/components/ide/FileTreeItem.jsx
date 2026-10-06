import { useState } from 'react';
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen, Trash2, Pencil } from 'lucide-react';

export default function FileTreeItem({
  node,
  path,
  depth,
  selectedPath,
  onSelectFile,
  onToggle,
  expanded,
  onRename,
  onDelete,
  onMove,
  onDropExternal,
  onDropOnFolder,
  onContextMenu,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.name);
  const [dragOver, setDragOver] = useState(false);
  const isFolder = node.type === 'folder';
  const isOpen = isFolder && expanded;
  const isSelected = selectedPath && selectedPath.join('/') === path.join('/');

  const pad = { paddingLeft: depth * 12 + 8 };

  function commitRename() {
    const v = renameVal.trim();
    if (v && v !== node.name) onRename(path, v);
    setRenaming(false);
  }

  function handleDragStart(e) {
    e.stopPropagation();
    e.dataTransfer.setData('application/x-ide-path', JSON.stringify(path));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    if (!isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copyMove';
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  async function handleDrop(e) {
    if (!isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const srcPath = e.dataTransfer.getData('application/x-ide-path');
    if (srcPath) {
      onMove(JSON.parse(srcPath), path);
      return;
    }
    // external OS files
    if (e.dataTransfer.items && e.dataTransfer.items.length) {
      onDropExternal(e.dataTransfer, path);
    }
  }

  return (
    <div>
      <div
        className={`ide-tree-row ${isSelected ? 'ide-tree-selected' : ''} ${dragOver ? 'ide-tree-drop' : ''}`}
        style={pad}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => (isFolder ? onToggle(path) : onSelectFile(path))}
        onContextMenu={(e) => onContextMenu(e, path, node)}
      >
        {isFolder ? (
          <>
            <button className="ide-tree-chevron" onClick={(e) => { e.stopPropagation(); onToggle(path); }}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isOpen ? <FolderOpen size={15} className="ide-accent-icon" /> : <Folder size={15} className="ide-accent-icon" />}
          </>
        ) : (
          <>
            <span className="ide-tree-chevron-spacer" />
            <FileIcon size={15} className="ide-dim-icon" />
          </>
        )}

        {renaming ? (
          <input
            className="ide-tree-input"
            value={renameVal}
            autoFocus
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="ide-tree-name" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}>
            {node.name}
          </span>
        )}

        <span className="ide-tree-actions">
          <button
            title="Rename"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameVal(node.name); }}
            className="ide-tree-action"
          >
            <Pencil size={12} />
          </button>
          <button
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(path); }}
            className="ide-tree-action ide-tree-action-danger"
          >
            <Trash2 size={12} />
          </button>
        </span>
      </div>

      {isFolder && isOpen && (node.children || []).map((child) => (
        <FileTreeItem
          key={child.id}
          node={child}
          path={[...path, child.name]}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onToggle={onToggle}
          expanded={expanded}
          onRename={onRename}
          onDelete={onDelete}
          onMove={onMove}
          onDropExternal={onDropExternal}
          onDropOnFolder={onDropOnFolder}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}