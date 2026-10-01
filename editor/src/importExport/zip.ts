import JSZip from 'jszip';
import type {FileNode} from '../types';
import {flatten} from '../utils/tree';
import {zipEntrySafe} from '../security/zipSafety';
export async function exportZip(files:FileNode[]){const z=new JSZip();for(const f of flatten(files)){if(f.kind==='file'){const n=f.path.replace(/^\//,'');if(zipEntrySafe(n))z.file(n,f.content??'')}}const b=await z.generateAsync({type:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='strata-project.zip';a.click()}
export async function importZip(file:File):FileNode[]{const z=await JSZip.loadAsync(file);const out:FileNode[]=[];for(const [name,entry] of Object.entries(z.files)){if(entry.dir||!zipEntrySafe(name))continue;const text=await entry.async('string');out.push({id:'/'+name,name:name.split('/').pop()!,path:'/'+name,kind:'file',content:text.slice(0,200000)})}return out}
