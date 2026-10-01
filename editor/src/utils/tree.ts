import type {FileNode} from '../types';
export function find(files:FileNode[],path:string):FileNode|null{for(const f of files){if(f.path===path)return f;if(f.children){const r=find(f.children,path);if(r)return r}}return null}
export function flatten(files:FileNode[],out:FileNode[]=[]){for(const f of files){out.push(f);if(f.children)flatten(f.children,out)}return out}
export function count(files:FileNode[]){return flatten(files).length}
