import {Btn} from '../common/Button';
export function ExpBar({onFile,onFolder}:{onFile:()=>void;onFolder:()=>void}){return <div style={{display:'flex',gap:6,padding:8}}><Btn onClick={onFile}>+ File</Btn><Btn onClick={onFolder}>+ Folder</Btn></div>}
