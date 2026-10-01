import {create} from 'zustand';
import type {FileNode,Workspace} from '../types';
import {seedFiles} from '../filesystem/seed';
import * as ops from '../filesystem/ops';
interface S{ws:Workspace;showExplorer:boolean;showPreview:boolean;showTerm:boolean;view:string;toggle:(k:'showExplorer'|'showPreview'|'showTerm')=>void;setView:(v:string)=>void;setFiles:(f:FileNode[])=>void;openFile:(p:string)=>void;closeFile:(p:string)=>void;edit:(p:string,c:string)=>void;}
const init:Workspace={id:'ws1',name:'My Project',files:JSON.parse(JSON.stringify(seedFiles)),openTabs:['/README.md'],activePath:'/README.md',updatedAt:Date.now()};
export const useStore=create<S>((set)=>({ws:init,showExplorer:true,showPreview:true,showTerm:false,view:'code',toggle:(k)=>set(s=>({[k]:!s[k]} as any)),setView:(view)=>set({view}),setFiles:(files)=>set(s=>({ws:{...s.ws,files}})),openFile:(p)=>set(s=>({ws:{...s.ws,openTabs:s.ws.openTabs.includes(p)?s.ws.openTabs:[...s.ws.openTabs,p],activePath:p}})),closeFile:(p)=>set(s=>{const open=s.ws.openTabs.filter(x=>x!==p);return{ws:{...s.ws,openTabs:open,activePath:s.ws.activePath===p?(open.at(-1)??null):s.ws.activePath}}}),edit:(p,c)=>set(s=>({ws:{...s.ws,files:ops.setContent(s.ws.files,p,c)}}))}));
