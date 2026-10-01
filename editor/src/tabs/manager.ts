export interface TabState{open:string[];active:string|null}
export const openTab=(s:TabState,p:string):TabState=>({open:s.open.includes(p)?s.open:[...s.open,p],active:p});
export const closeTab=(s:TabState,p:string):TabState=>{const open=s.open.filter(x=>x!==p);return{open,active:s.active===p?(open.at(-1)??null):s.active}};
export const closeAll=():TabState=>({open:[],active:null});
