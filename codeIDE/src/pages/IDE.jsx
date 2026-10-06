import { useState, useEffect, useRef, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Folder } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { applyTheme } from '@/lib/themes';
import { useSettings } from '@/lib/useSettings';
import {
  emptyTree, serializeTree, deserializeTree, createEntry, deleteEntry,
  renameEntry, moveEntry, writeFile, resolvePath, findEntryFile,
} from '@/lib/fsUtils';
import { runCommand } from '@/lib/terminalCommands';
import { runPython } from '@/lib/pyodideRunner';
import { readDataTransferItems } from '@/lib/dragImport';


import Toolbar from '@/components/ide/Toolbar';
import FileExplorer from '@/components/ide/FileExplorer';
import EditorTabs from '@/components/ide/EditorTabs';
import CodeEditor from '@/components/ide/CodeEditor';
import Terminal from '@/components/ide/Terminal';
import Preview from '@/components/ide/Preview';
import SettingsPanel from '@/components/ide/SettingsPanel';
import NewProjectDialog from '@/components/ide/NewProjectDialog';

export default function IDE() {
  const { settings, update, loaded } = useSettings();
  const [projects, setProjects] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [tree, setTree] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [cwd, setCwd] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [termHistory, setTermHistory] = useState([]);
  const [previewPath, setPreviewPath] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [mobilePanel, setMobilePanel] = useState('editor');
  const [isDesktop, setIsDesktop] = useState(true);
  const saveTimer = useRef(null);

  // theme + ui scale
  useEffect(() => {
    applyTheme(settings.theme);
    document.documentElement.style.setProperty('--ide-ui-scale', (settings.uiScale || 100) / 100);
    document.body.classList.toggle('ide-glow-off', settings.glow === false);
    document.body.classList.toggle('ide-anim-off', settings.animations === false);
  }, [settings.theme, settings.uiScale, settings.glow, settings.animations]);

  // responsive
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // load project list
  const loadProjects = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      const res = await base44.entities.Project.filter(
        { created_by_id: me.id },
        { sort: '-updated_date', limit: 100 }
      );
      setProjects(res.items || []);
      return res.items || [];
    } catch {
      setProjects([]);
      return [];
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // debounced save
  const saveTree = useCallback((id, t) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving…');
    saveTimer.current = setTimeout(async () => {
      try {
        await base44.entities.Project.update(id, { files: serializeTree(t) });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('save failed');
      }
    }, 700);
  }, []);

  useEffect(() => {
    if (currentId && tree) saveTree(currentId, tree);
  }, [tree, currentId, saveTree]);

  function openProject(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setCurrentId(id);
    setTree(deserializeTree(p.files));
    setCwd([]);
    setTabs([]);
    setActivePath(null);
    setPreviewPath(null);
    setTermHistory([]);
    setExpanded({});
  }

  async function createProject(name) {
    const t = emptyTree();
    try {
      const created = await base44.entities.Project.create({ name, files: serializeTree(t) });
      const list = await loadProjects();
      setProjects(list);
      setCurrentId(created.id);
      setTree(t);
      setCwd([]);
      setTabs([]);
      setActivePath(null);
      setPreviewPath(null);
      setTermHistory([]);
      setShowNewProject(false);
    } catch (e) {
      alert('Could not create project: ' + (e.message || e));
    }
  }

  // file operations
  const handleSelectFile = (path) => {
    setTabs((prev) => (prev.some((t) => t.join('/') === path.join('/')) ? prev : [...prev, path]));
    setActivePath(path);
    if (!isDesktop) setMobilePanel('editor');
  };

  const toggleFolder = (path) => {
    const key = path.join('/');
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  };

  const handleRename = (path, newName) => {
    const r = renameEntry(tree, path, newName);
    if (r.ok) {
      setTree(r.tree);
      // update tabs/active that referenced this path
      const updatePath = (p) => (p.join('/') === path.join('/') ? [...path.slice(0, -1), newName] : p);
      setTabs((t) => t.map(updatePath));
      setActivePath((p) => (p ? updatePath(p) : p));
      setPreviewPath((p) => (p ? updatePath(p) : p));
    }
  };

  const handleDelete = (path) => {
    if (!confirm(`Delete '${path[path.length - 1]}'?`)) return;
    const r = deleteEntry(tree, path);
    if (r.ok) {
      setTree(r.tree);
      setTabs((t) => t.filter((p) => !p.join('/').startsWith(path.join('/'))));
      if (activePath && activePath.join('/').startsWith(path.join('/'))) setActivePath(null);
    }
  };

  const handleMove = (srcPath, destFolderPath) => {
    const r = moveEntry(tree, srcPath, destFolderPath);
    if (r.ok) setTree(r.tree);
    else alert('Move failed: ' + r.error);
  };

  const handleCreateEntry = (parentPath, name, type) => {
    const r = createEntry(tree, parentPath, name, type);
    if (r.ok) setTree(r.tree);
    else alert(r.error);
  };

  const handleDropExternal = async (dataTransfer, destPath) => {
    const nodes = await readDataTransferItems(dataTransfer);
    if (!nodes.length) return;
    let t = tree;
    const { mergeSubtree } = await import('@/lib/fsUtils');
    for (const node of nodes) {
      const r = mergeSubtree(t, destPath, node);
      if (r.ok) t = r.tree;
    }
    setTree(t);
    // expand dest
    setExpanded((e) => ({ ...e, [destPath.join('/')]: true }));
  };

  // editor content change
  const handleEditorChange = (value) => {
    if (!activePath) return;
    const r = writeFile(tree, activePath, value);
    if (r.ok) setTree(r.tree);
  };

  // terminal
  const handleCommand = async (cmd) => {
    const result = await runCommand({
      tree, cwd, input: cmd,
      runPython: (code) => runPython(code, tree, cwd),
      openPreview: (path) => { setPreviewPath(path); setReloadKey((k) => k + 1); },
    });
    if (result.clear) { setTermHistory([]); return; }
    if (result.tree && result.tree !== tree) setTree(result.tree);
    if (result.cwd && result.cwd !== cwd) setCwd(result.cwd);
    setTermHistory((h) => [...h, { cmd, cwd, output: result.output }]);
  };

  // run
  const handleRun = () => {
    if (!tree) return;
    let entry = previewPath && resolvePath(tree, previewPath) ? previewPath : findEntryFile(tree);
    if (!entry) {
      setTermHistory((h) => [...h, { cmd: '▶ Run', cwd, output: 'No HTML entry file found. Create an index.html, or open a file and run it.' }]);
      return;
    }
    setPreviewPath(entry);
    setReloadKey((k) => k + 1);
    if (!isDesktop) setMobilePanel('preview');
  };

  const handleSaveNow = () => {
    if (currentId && tree) {
      base44.entities.Project.update(currentId, { files: serializeTree(tree) })
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('save failed'));
    }
  };

  const activeFile = activePath ? resolvePath(tree, activePath) : null;
  const activeContent = activeFile && !activeFile.binary ? activeFile.content : '';

  if (!loaded) {
    return <div className="ide-loading"><div className="ide-spinner" /></div>;
  }

  const explorerProps = {
    tree, selectedPath: activePath, onSelectFile: handleSelectFile,
    onToggle: toggleFolder, expanded, onRename: handleRename, onDelete: handleDelete,
    onMove: handleMove, onDropExternal: handleDropExternal,
    onCollapseAll: () => setExpanded({}), onCreateEntry: handleCreateEntry,
    projectName: projects.find((p) => p.id === currentId)?.name,
  };

  const editorPanel = (
    <div className="ide-editor-pane">
      <EditorTabs tabs={tabs} activePath={activePath} onSelect={setActivePath} onClose={(p) => setTabs((t) => t.filter((x) => x.join('/') !== p.join('/')))} />
      <div className="ide-editor-host">
        {activeFile ? (
          activeFile.binary ? (
            <div className="ide-editor-empty">Binary file — preview only.</div>
          ) : (
            <CodeEditor file={activeFile} value={activeContent} onChange={handleEditorChange} settings={settings} />
          )
        ) : (
          <div className="ide-editor-empty">
            <div className="ide-editor-empty-title">Select a file to edit</div>
            <div className="ide-editor-empty-sub">Or create one from the explorer. Drag files/folders from your computer.</div>
          </div>
        )}
      </div>
    </div>
  );

  const previewPanel = (
    <Preview
      tree={tree} entryPath={previewPath} reloadKey={reloadKey}
      autoReload={settings.autoReload}
      onNavigate={(path) => { setPreviewPath(path); setReloadKey((k) => k + 1); }}
    />
  );

  const explorerPanel = <FileExplorer {...explorerProps} />;
  const terminalPanel = (
    <Terminal
      history={termHistory} cwd={cwd}
      onCommand={handleCommand} fontSize={settings.terminalFontSize}
      onClear={() => setTermHistory([])}
    />
  );

  return (
    <div className="ide-root">
      <Toolbar
        projects={projects} currentId={currentId}
        onSelectProject={openProject} onNewProject={() => setShowNewProject(true)}
        onRun={handleRun} onOpenSettings={() => setShowSettings(true)}
        onSave={handleSaveNow} saveStatus={saveStatus}
        hasProject={!!currentId}
      />

      {!currentId ? (
        <div className="ide-welcome">
          <div className="ide-welcome-card">
            <h1>Welcome to NexusIDE</h1>
            <p>A browser-based IDE with a real terminal, live preview, and Python via WebAssembly.</p>
            <button className="ide-btn-primary ide-btn-lg" onClick={() => setShowNewProject(true)}>
              {projects.length ? 'Create a new project' : 'Create your first project'}
            </button>
            {projects.length > 0 && (
              <div className="ide-welcome-list">
                <div className="ide-welcome-list-title">Or open an existing project</div>
                {projects.map((p) => (
                  <button key={p.id} className="ide-welcome-project" onClick={() => openProject(p.id)}>
                    <Folder size={15} className="ide-accent-icon" /> {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : isDesktop ? (
        <div className="ide-layout">
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={20}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={20} minSize={12} maxSize={40}>{explorerPanel}</Panel>
                <PanelResizeHandle className="ide-resize-v" />
                <Panel minSize={20}>
                  <PanelGroup direction="horizontal">
                    <Panel minSize={20}>{editorPanel}</Panel>
                    <PanelResizeHandle className="ide-resize-h" />
                    <Panel defaultSize={40} minSize={20}>{previewPanel}</Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </Panel>
            <PanelResizeHandle className="ide-resize-h" />
            <Panel defaultSize={50} minSize={10}>{terminalPanel}</Panel>
          </PanelGroup>
        </div>
      ) : (
        <div className="ide-mobile">
          <div className="ide-mobile-stage">
            {mobilePanel === 'explorer' && explorerPanel}
            {mobilePanel === 'editor' && editorPanel}
            {mobilePanel === 'preview' && previewPanel}
            {mobilePanel === 'terminal' && terminalPanel}
          </div>
          <div className="ide-mobile-tabs">
            <button className={mobilePanel === 'explorer' ? 'active' : ''} onClick={() => setMobilePanel('explorer')}>Files</button>
            <button className={mobilePanel === 'editor' ? 'active' : ''} onClick={() => setMobilePanel('editor')}>Editor</button>
            <button className={mobilePanel === 'preview' ? 'active' : ''} onClick={() => setMobilePanel('preview')}>Preview</button>
            <button className={mobilePanel === 'terminal' ? 'active' : ''} onClick={() => setMobilePanel('terminal')}>Terminal</button>
          </div>
        </div>
      )}

      {showSettings && <SettingsPanel settings={settings} update={update} onClose={() => setShowSettings(false)} />}
      {showNewProject && <NewProjectDialog onCreate={createProject} onClose={() => setShowNewProject(false)} />}
    </div>
  );
}