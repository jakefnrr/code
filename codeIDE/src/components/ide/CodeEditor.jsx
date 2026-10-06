import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

function langFor(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return html();
    case 'css':
      return css();
    case 'js':
    case 'jsx':
    case 'mjs':
      return javascript({ jsx: true });
    case 'ts':
    case 'tsx':
      return javascript({ typescript: true, jsx: true });
    case 'json':
      return json();
    case 'py':
      return python();
    case 'md':
    case 'markdown':
      return markdown();
    case 'sql':
      return sql();
    default:
      return [];
  }
}

export default function CodeEditor({ file, value, onChange, settings }) {
  const extensions = useMemo(() => {
    const exts = [langFor(file?.name || ''), EditorState.tabSize.of(settings.tabSize || 2)];
    if (settings.wordWrap) exts.push(EditorView.lineWrapping);
    return exts;
  }, [file?.name, settings.tabSize, settings.wordWrap]);

  const theme = useMemo(
    () =>
      EditorView.theme(
        {
          '&': {
            backgroundColor: 'var(--ide-editor-bg)',
            color: 'var(--ide-text)',
            fontSize: (settings.editorFontSize || 14) + 'px',
            height: '100%',
          },
          '.cm-content': { caretColor: 'var(--ide-accent)' },
          '.cm-cursor': { borderLeftColor: 'var(--ide-accent)' },
          '.cm-gutters': {
            backgroundColor: 'var(--ide-editor-bg)',
            color: 'var(--ide-text-dim)',
            border: 'none',
          },
          '.cm-activeLineGutter': { backgroundColor: 'var(--ide-editor-active)' },
          '.cm-activeLine': { backgroundColor: 'var(--ide-editor-active)' },
          '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--ide-selection)' },
          '&.cm-focused': { outline: 'none' },
          '.cm-matchingBracket': {
            backgroundColor: 'var(--ide-selection)',
            outline: '1px solid var(--ide-accent)',
          },
          '.cm-foldGutter': { color: 'var(--ide-text-dim)' },
        },
        { dark: true }
      ),
    [settings.editorFontSize]
  );

  if (!file) return null;

  return (
    <CodeMirror
      value={value ?? ''}
      height="100%"
      theme={theme}
      extensions={extensions}
      basicSetup={{
        lineNumbers: settings.lineNumbers !== false,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        highlightSelectionMatches: true,
        searchKeymap: true,
      }}
      onChange={onChange}
      style={{ height: '100%' }}
    />
  );
}