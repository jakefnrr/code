import { Play, Settings, Plus, Folder, Save, ChevronDown } from 'lucide-react';

export default function Toolbar({
  projects, currentId, onSelectProject, onNewProject, onRun, onOpenSettings,
  onSave, saveStatus, hasProject,
}) {
  return (
    <div className="ide-toolbar">
      <div className="ide-brand">
        <span className="ide-brand-dot" />
        <span className="ide-brand-name">NEXUS<span className="ide-brand-accent">IDE</span></span>
      </div>

      <div className="ide-project-switcher">
        {hasProject ? (
          <>
            <Folder size={14} className="ide-dim-icon" />
            <select
              className="ide-project-select"
              value={currentId || ''}
              onChange={(e) => onSelectProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        ) : (
          <span className="ide-no-project">No project</span>
        )}
      </div>

      <div className="ide-toolbar-spacer" />

      <div className="ide-toolbar-actions">
        {hasProject && (
          <>
            <span className="ide-save-status">{saveStatus}</span>
            <button className="ide-tool-btn" title="Save now" onClick={onSave}><Save size={15} /></button>
            <button className="ide-btn-run" onClick={onRun}>
              <Play size={15} /> RUN
            </button>
          </>
        )}
        <button className="ide-btn-ghost" onClick={onNewProject}>
          <Plus size={15} /> New
        </button>
        <button className="ide-tool-btn" title="Settings" onClick={onOpenSettings}>
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}