import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';

export default function Terminal({ history, cwd, onCommand, fontSize, onClear }) {
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const prompt = '~/' + (cwd.length ? cwd.join('/') : '') + ' $';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, input]);

  async function submit() {
    const cmd = input;
    setInput('');
    if (cmd.trim()) setCmdHistory((h) => [...h, cmd]);
    setHistIdx(-1);
    await onCommand(cmd);
  }

  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length) {
        const idx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
        setHistIdx(idx);
        setInput(cmdHistory[idx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= cmdHistory.length) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(idx); setInput(cmdHistory[idx]); }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onClear();
    }
  }

  return (
    <div className="ide-terminal" onClick={() => inputRef.current?.focus()}>
      <div className="ide-terminal-header">
        <TerminalIcon size={14} className="ide-accent-icon" />
        <span className="ide-terminal-title">TERMINAL</span>
        <button className="ide-tool-btn" title="Clear" onClick={onClear}><Trash2 size={13} /></button>
      </div>
      <div className="ide-terminal-body" ref={scrollRef} style={{ fontSize: (fontSize || 13) + 'px' }}>
        <div className="ide-terminal-line ide-terminal-hint">
          Type 'help' for commands. Python runs for real via Pyodide (WASM).
        </div>
        {history.map((h, i) => (
          <div key={i}>
            <div className="ide-terminal-line">
              <span className="ide-terminal-prompt">~/{h.cwd.join('/')} $</span>
              <span className="ide-terminal-cmd">{h.cmd}</span>
            </div>
            {h.output && <pre className="ide-terminal-output">{h.output}</pre>}
          </div>
        ))}
        <div className="ide-terminal-line ide-terminal-active">
          <span className="ide-terminal-prompt">{prompt}</span>
          <input
            ref={inputRef}
            className="ide-terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}