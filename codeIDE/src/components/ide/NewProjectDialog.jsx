import { useState } from 'react';
import { X } from 'lucide-react';

export default function NewProjectDialog({ onCreate, onClose }) {
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    const n = name.trim() || 'Untitled';
    onCreate(n);
  }

  return (
    <div className="ide-modal-overlay" onClick={onClose}>
      <form className="ide-modal ide-modal-sm" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ide-modal-header">
          <span>New Project</span>
          <button type="button" className="ide-tool-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ide-modal-body">
          <label className="ide-field-label">Project name</label>
          <input
            className="ide-input"
            value={name}
            autoFocus
            placeholder="AwesomeWebsite"
            onChange={(e) => setName(e.target.value)}
          />
          <p style={{ fontSize: 12, color: 'var(--ide-text-dim)', marginTop: 12, lineHeight: 1.6 }}>
            Starts empty — add files and folders from the explorer, the terminal, or by dragging them in.
          </p>
        </div>
        <div className="ide-modal-footer">
          <button type="button" className="ide-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="ide-btn-primary">Create</button>
        </div>
      </form>
    </div>
  );
}