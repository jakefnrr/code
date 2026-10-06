import { X } from 'lucide-react';

export default function EditorTabs({ tabs, activePath, onSelect, onClose }) {
  if (!tabs.length) return null;
  return (
    <div className="ide-tabs">
      {tabs.map((path) => {
        const active = activePath && activePath.join('/') === path.join('/');
        return (
          <div
            key={path.join('/')}
            className={`ide-tab ${active ? 'ide-tab-active' : ''}`}
            onClick={() => onSelect(path)}
          >
            <span className="ide-tab-name">{path[path.length - 1]}</span>
            <button
              className="ide-tab-close"
              onClick={(e) => { e.stopPropagation(); onClose(path); }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}