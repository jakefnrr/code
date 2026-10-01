import type {Command} from '../types/commands';
const m=new Map<string,Command>();
export const register=(c:Command)=>{m.set(c.id,c)};
export const all=()=>[...m.values()];
export const run=(id:string)=>m.get(id)?.run();
