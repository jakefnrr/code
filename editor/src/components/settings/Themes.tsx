import {themes} from '../../themes/themes';
export function ThemePicker({v,onPick}:{v:string;onPick:(s:string)=>void}){return <div style={{display:'flex',gap:8}}>{themes.map(t=><button key={t.id} onClick={()=>onPick(t.id)} style={{border:t.id===v?'2px solid #7c5cff':'1px solid #333',borderRadius:8,padding:8,background:t.bg,color:t.fg}}>{t.name}</button>)}</div>}
