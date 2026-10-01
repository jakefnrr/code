import type {FileNode} from '../types';
import {find} from '../utils/tree';
import {safeName,safePath} from '../validation/paths';
import {langOf} from '../utils/lang';
export function siblings(files:FileNode[],parent:string){if(parent==='/')return files;const n=find(files,parent);return n?.children??[]}
export function createFile(files:FileNode[],parent:string,name:string):FileNode[]{if(!safeName(name))throw new Error('bad name');const path=(parent==='/'?'':parent)+'/'+name;if(!safePath(path))throw new Error('bad path');const node:FileNode={id:path,name,path,kind:'file',content:'',lang:langOf(path)};if(parent==='/')return [...files,node];return files.map(f=>f.path===parent?{...f,children:[...(f.children??[]),node]}:f.children?{...f,children:createFile(f.children,parent,name)}:f)}
export function createFolder(files:FileNode[],parent:string,name:string):FileNode[]{const path=(parent==='/'?'':parent)+'/'+name;const node:FileNode={id:path,name,path,kind:'folder',children:[]};if(parent==='/')return [...files,node];return files.map(f=>f.path===parent?{...f,children:[...(f.children??[]),node]}:f.children?{...f,children:createFolder(f.children,parent,name)}:f)}
export function remove(files:FileNode[],path:string):FileNode[]{return files.filter(f=>f.path!==path).map(f=>f.children?{...f,children:remove(f.children,path)}:f)}
export function rename(files:FileNode[],path:string,name:string):FileNode[]{return files.map(f=>{if(f.path===path){const np=f.path.split('/').slice(0,-1).join('/')+'/'+name||'/'+name;return{...f,name,path:np}}return f.children?{...f,children:rename(f.children,path,name)}:f})}
export function duplicate(files:FileNode[],path:string):FileNode[]{const n=find(files,path);if(!n)return files;const copy:FileNode={...n,id:n.id+'_copy',path:n.path+'_copy',name:n.name+' copy',children:n.children?JSON.parse(JSON.stringify(n.children)):undefined};return [...files,copy]}
export function move(files:FileNode[],src:string,dest:string):FileNode[]{const n=find(files,src);if(!n)return files;return createAt(remove(files,src),dest,n)}
function createAt(files:FileNode[],dest:string,node:FileNode):FileNode[]{if(dest==='/')return [...files,node];return files.map(f=>f.path===dest?{...f,children:[...(f.children??[]),node]}:f.children?{...f,children:createAt(f.children,dest,node)}:f)}
export function setContent(files:FileNode[],path:string,content:string):FileNode[]{return files.map(f=>f.path===path?{...f,content,dirty:true}:f.children?{...f,children:setContent(f.children,path,content)}:f)}
