export function FileSearch({v,setV}:{v:string;setV:(s:string)=>void}){return <input value={v} onChange={e=>setV(e.target.value)} placeholder='Filter files…' style={{width:'100%',padding:6}}/>}
