import { useState, useRef, useEffect } from 'react';
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp } from 'lucide-react';
import FileTreeItem from './FileTreeItem';

export default function FileExplorer({
  tree,
  selectedPath,
  onSelectFile,
  onToggle,
  expanded,
  onRename,
  onDelete,
  onMove,
  onDropExternal,
  onCollapseAll,
  onCreateEntry,
  projectName,
}) {
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const [creating, setCreating] = useState(null); // { type: 'file'|'folder', parentPath: [] }
  const [createVal, setCreateVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  function startCreate(type) {
    setCreating({ type, parentPath: [] });
    setCreateVal('');
  }

  function commitCreate() {
    const v = createVal.trim();
    if (v) onCreateEntry([], v, creating.type);
    setCreating(null);
    setCreateVal('');
  }

  return (
    <div
      className={`ide-explorer ${dragOverRoot ? 'ide-explorer-drop' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files') || e.dataTransfer.items?.length) { e.preventDefault(); setDragOverRoot(true); } }}
      onDragLeave={() => setDragOverRoot(false)}
      onDrop={(e) => {
        if (e.dataTransfer.getData('application/x-ide-path')) return;
        e.preventDefault();
        setDragOverRoot(false);
        if (e.dataTransfer.items && e.dataTransfer.items.length) onDropExternal(e.dataTransfer, []);
      }}
    >
      <div className="ide-explorer-header">
        <span className="ide-explorer-title">{projectName || 'PROJECT'}</span>
        <div className="ide-explorer-tools">
          <button title="New File" onClick={() => startCreate('file')} className="ide-tool-btn"><FilePlus size={15} /></button>
          <button title="New Folder" onClick={() => startCreate('folder')} className="ide-tool-btn"><FolderPlus size={15} /></button>
          <button title="Collapse All" onClick={onCollapseAll} className="ide-tool-btn"><ChevronsDownUp size={15} /></button>
          <button title="Refresh" className="ide-tool-btn"><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="ide-tree">
        {dragOverRoot && (
          <div className="ide-drop-banner">Drop files or folders to import</div>
        )}
        {creating && (
          <div className="ide-tree-row" style={{ paddingLeft: 8 }}>
            <span className="ide-tree-chevron-spacer" />
            <span style={{ fontSize: 13, color: 'var(--ide-text-dim)' }}>
              {creating.type === 'folder' ? '📁' : '📄'}
            </span>
            <input
              ref={inputRef}
              className="ide-tree-input"
              value={createVal}
              placeholder={creating.type === 'folder' ? 'folder name' : 'name (e.g. main.py, notes.txt, index.html)'}
              onChange={(e) => setCreateVal(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate();
                if (e.key === 'Escape') { setCreating(null); setCreateVal(''); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {(tree?.children || []).map((child) => (
          <FileTreeItem
            key={child.id}
            node={child}
            path={[child.name]}
            depth={0}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
            onToggle={onToggle}
            expanded={expanded}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
            onDropExternal={onDropExternal}
            onDropOnFolder={() => {}}
            onContextMenu={() => {}}
          />
        ))}
        {(!tree?.children || tree.children.length === 0) && !dragOverRoot && !creating && (
          <div className="ide-empty-tree">
            Empty project.<br />Drag files/folders here, or use the toolbar.
          </div>
        )}
      </div>
    </div>
  );
}