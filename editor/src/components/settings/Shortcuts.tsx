export const SHORTCUTS=[['Ctrl+K','Command palette'],['Ctrl+S','Save'],['Ctrl+F','Find'],['Ctrl+`','Terminal']] as const;
export function Shortcuts(){return <ul>{SHORTCUTS.map(([k,d])=><li key={k}>{k} — {d}</li>)}</ul>}
