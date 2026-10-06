import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export const DEFAULT_SETTINGS = {
  theme: 'neon-green',
  uiScale: 100,
  editorFontSize: 14,
  terminalFontSize: 13,
  glow: true,
  animations: true,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  autoSave: true,
  lineNumbers: true,
  autoReload: true,
};

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me && me.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...me.settings });
        }
      } catch {
        // not logged in yet or updateMe unsupported — keep defaults
      }
      setLoaded(true);
    })();
  }, []);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { base44.auth.updateMe({ settings: next }); } catch {}
      return next;
    });
  }, []);

  return { settings, update, loaded };
}