import type {FileNode} from '../types';
export async function readUploads(list:FileList):Promise<FileNode[]>{const out:FileNode[]=[];for(const f of Array.from(list)){const t=await f.text();out.push({id:'/'+f.name,name:f.name,path:'/'+f.name,kind:'file',content:t.slice(0,500000)})}return out}
