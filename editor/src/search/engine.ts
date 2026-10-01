import type {FileNode} from '../types';
import {flatten} from '../utils/tree';
import {toRegExp} from '../utils/regex';
import type {SearchOptions} from '../types';
export interface Hit{path:string;line:number;text:string}
export function searchAll(files:FileNode[],o:SearchOptions):Hit[]{const out:Hit[]=[];let re;try{re=toRegExp(o.query,o)}catch{return []}for(const f of flatten(files)){if(f.kind!=='file'||!f.content)continue;if(o.include&&!f.path.includes(o.include))continue;const lines=f.content.split('\n');lines.forEach((t,i)=>{re.lastIndex=0;if(re.test(t))out.push({path:f.path,line:i+1,text:t.slice(0,200)})})}return out.slice(0,500)}
export function replaceAll(content:string,o:SearchOptions,repl:string){try{const re=toRegExp(o.query,o);return content.replace(re,repl)}catch{return content}}
