import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';
import { buildPreview } from '@/lib/previewBuilder';

export default function Preview({ tree, entryPath, reloadKey, autoReload, onNavigate }) {
  const iframeRef = useRef(null);
  const [blobUrls, setBlobUrls] = useState([]);
  const [device, setDevice] = useState('desktop');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let made = [];
    (async () => {
      if (!tree || !entryPath) return;
      setLoading(true);
      const result = await buildPreview(tree, entryPath);
      if (cancelled) return;
      // revoke previous
      blobUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
      if (!result) { setBlobUrls([]); setLoading(false); return; }
      made = Object.values(result.blobUrls);
      setBlobUrls(made);
      if (iframeRef.current) iframeRef.current.srcdoc = result.html;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      made.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, JSON.stringify(entryPath), reloadKey]);

  useEffect(() => {
    function onMsg(e) {
      if (e.data && e.data.idePreviewNavigate) onNavigate && onNavigate(e.data.idePreviewNavigate.split('/'));
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onNavigate]);

  const widths = { desktop: '100%', tablet: '768px', mobile: '390px' };

  return (
    <div className="ide-preview">
      <div className="ide-preview-header">
        <span className="ide-preview-title">LIVE PREVIEW</span>
        <span className="ide-preview-url">{entryPath ? entryPath.join('/') : '—'}</span>
        <div className="ide-preview-tools">
          {loading && <RefreshCw size={13} className="ide-spin ide-accent-icon" />}
          <button className={`ide-tool-btn ${device === 'desktop' ? 'ide-tool-active' : ''}`} onClick={() => setDevice('desktop')} title="Desktop"><Monitor size={14} /></button>
          <button className={`ide-tool-btn ${device === 'tablet' ? 'ide-tool-active' : ''}`} onClick={() => setDevice('tablet')} title="Tablet"><Tablet size={14} /></button>
          <button className={`ide-tool-btn ${device === 'mobile' ? 'ide-tool-active' : ''}`} onClick={() => setDevice('mobile')} title="Mobile"><Smartphone size={14} /></button>
          <button className="ide-tool-btn" title="Reload" onClick={() => { if (iframeRef.current && entryPath) { /* trigger rebuild via reloadKey handled by parent */ } }}><RefreshCw size={14} /></button>
          <button className="ide-tool-btn" title="Open in new tab" disabled={!entryPath}><ExternalLink size={14} /></button>
        </div>
      </div>
      <div className="ide-preview-stage">
        {!entryPath ? (
          <div className="ide-preview-empty">
            <div>No preview running.</div>
            <div className="ide-preview-empty-sub">Open an HTML file or hit ▶ Run.</div>
          </div>
        ) : (
          <div className="ide-preview-device" style={{ width: widths[device], maxWidth: '100%' }}>
            <iframe
              ref={iframeRef}
              title="preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              className="ide-preview-iframe"
            />
          </div>
        )}
      </div>
    </div>
  );
}