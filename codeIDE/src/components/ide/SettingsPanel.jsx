import { X } from 'lucide-react';
import { THEMES } from '@/lib/themes';
import { DEFAULT_SETTINGS } from '@/lib/useSettings';

export default function SettingsPanel({ settings, update, onClose }) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return (
    <div className="ide-modal-overlay" onClick={onClose}>
      <div className="ide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ide-modal-header">
          <span>Settings</span>
          <button className="ide-tool-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ide-modal-body">
          <section className="ide-settings-section">
            <h3>Appearance</h3>
            <div className="ide-theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`ide-theme-card ${s.theme === t.id ? 'ide-theme-card-active' : ''}`}
                  onClick={() => update({ theme: t.id })}
                >
                  <span className="ide-theme-swatch" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
                  <span className="ide-theme-label">{t.label}</span>
                </button>
              ))}
            </div>

            <Row label="UI scale">
              <input type="range" min="80" max="140" step="5" value={s.uiScale} onChange={(e) => update({ uiScale: +e.target.value })} />
              <span className="ide-setting-val">{s.uiScale}%</span>
            </Row>
            <Row label="Glow effects"><Toggle on={s.glow} onClick={() => update({ glow: !s.glow })} /></Row>
            <Row label="Animations"><Toggle on={s.animations} onClick={() => update({ animations: !s.animations })} /></Row>
          </section>

          <section className="ide-settings-section">
            <h3>Editor</h3>
            <Row label="Font size">
              <input type="range" min="10" max="28" value={s.editorFontSize} onChange={(e) => update({ editorFontSize: +e.target.value })} />
              <span className="ide-setting-val">{s.editorFontSize}px</span>
            </Row>
            <Row label="Tab size">
              <select value={s.tabSize} onChange={(e) => update({ tabSize: +e.target.value })}>
                <option value={2}>2</option><option value={4}>4</option><option value={8}>8</option>
              </select>
            </Row>
            <Row label="Word wrap"><Toggle on={s.wordWrap} onClick={() => update({ wordWrap: !s.wordWrap })} /></Row>
            <Row label="Line numbers"><Toggle on={s.lineNumbers} onClick={() => update({ lineNumbers: !s.lineNumbers })} /></Row>
            <Row label="Auto-save"><Toggle on={s.autoSave} onClick={() => update({ autoSave: !s.autoSave })} /></Row>
          </section>

          <section className="ide-settings-section">
            <h3>Terminal</h3>
            <Row label="Font size">
              <input type="range" min="10" max="24" value={s.terminalFontSize} onChange={(e) => update({ terminalFontSize: +e.target.value })} />
              <span className="ide-setting-val">{s.terminalFontSize}px</span>
            </Row>
          </section>

          <section className="ide-settings-section">
            <h3>Preview</h3>
            <Row label="Auto reload"><Toggle on={s.autoReload} onClick={() => update({ autoReload: !s.autoReload })} /></Row>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="ide-setting-row">
      <span className="ide-setting-label">{label}</span>
      <div className="ide-setting-control">{children}</div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button className={`ide-toggle ${on ? 'ide-toggle-on' : ''}`} onClick={onClick}>
      <span className="ide-toggle-knob" />
    </button>
  );
}