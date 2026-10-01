import {useMemo,useState} from 'react';
import Editor from '@monaco-editor/react';
import {useStore} from './state/store';
import {Tree} from './components/explorer/Tree';
import {ExpBar} from './components/explorer/Toolbar';
import {TabBar} from './components/tabs/TabBar';
import {StatusBar} from './components/statusbar/Bar';
import {Palette} from './components/palette/Palette';
import {PreviewPane} from './components/preview/Pane';
import {Term} from './components/terminal/Term';
import {SettingsPanel} from './components/settings/Panel';
import {MobileNav} from './components/mobile/Nav';
import {Logo} from './components/common';
import {find,flatten} from './utils/tree';
import * as ops from './filesystem/ops';
import {langOf} from './utils/lang';
import {get} from './settings/store';
import {bundle} from './preview/bundle';
import {searchAll} from './search/engine';
import {exportZip,importZip} from './importExport/zip';
import {all,run} from './commands/registry';
import {registerBuiltin} from './commands/builtin';
export default function App(){
 const {ws,setFiles,openFile,closeFile,edit,showExplorer,showPreview,showTerm,toggle,view,setView}=useStore();
 const [pal,setPal]=useState(false); const [setOpen,setSetOpen]=useState(false); const [q,setQ]=useState('');
 const [split,setSplit]=useState(false);
 const s=get();
 const active=find(ws.files,ws.activePath??'')??null;
 const cmds=useMemo(()=>{registerBuiltin({newFile:()=>{const n=prompt('File name');if(n)setFiles(ops.createFile(ws.files,'/web',n))},newFolder:()=>{const n=prompt('Folder name');if(n)setFiles(ops.createFolder(ws.files,'/',n))},save:()=>{},saveAll:()=>{},closeTab:()=>ws.activePath&&closeFile(ws.activePath),toggleExplorer:()=>toggle('showExplorer'),togglePreview:()=>toggle('showPreview'),toggleTerminal:()=>toggle('showTerm'),exportZip:()=>exportZip(ws.files),importFiles:()=>document.getElementById('up')?.click(),openSettings:()=>setSetOpen(true),toggleTheme:()=>{},toggleSplit:()=>setSplit(v=>!v),focusSearch:()=>setView('code')});return all()},[ws.files]);
 const hits=q?searchAll(ws.files,{query:q,regex:false,caseSensitive:false,wholeWord:false,include:''}):[];
 const isMobile=typeof window!=='undefined'&&window.innerWidth<760;
 return <div className='layout'>
  <header><Logo/><span style={{opacity:.7}}>{ws.name}</span><span style={{flex:1}}/><button onClick={()=>setPal(true)}>⌘K Commands</button><button onClick={()=>setSetOpen(true)}>Settings</button></header>
  {(isMobile)&&<MobileNav view={view} setView={setView}/>}
  <div className='main'>
   {showExplorer&&<aside className={'side '+(view==='files'?'m':'')} style={{background:'#10142a',overflow:'auto'}}><ExpBar onFile={()=>{const n=prompt('File name');if(n)setFiles(ops.createFile(ws.files,'/',n))}} onFolder={()=>{const n=prompt('Folder name');if(n)setFiles(ops.createFolder(ws.files,'/',n))}}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder='Search project…' style={{margin:8,width:'calc(100% - 16px)'}}/><Tree files={ws.files} active={ws.activePath} onOpen={openFile} onCtx={(p)=>{if(confirm('Delete '+p+'?'))setFiles(ops.remove(ws.files,p))}}/>{q&&<div style={{padding:8}}>{hits.slice(0,20).map((h,i)=><div key={i} style={{fontSize:12}}>{h.path}:{h.line} — {h.text}</div>)}</div>}</aside>}
   <div style={{display:'grid',gridTemplateRows:'36px 1fr',minHeight:0}}>
    <TabBar open={ws.openTabs} active={ws.activePath} onSel={openFile} onClose={closeFile}/>
    <div style={{display:'grid',gridTemplateColumns:showPreview&&(split||view==='preview')?'1fr 1fr':'1fr',minHeight:0}}>
     <div style={{minHeight:0}}>{active?.kind==='file'?<Editor height='100%' language={langOf(active.path)} value={active.content??''} onChange={v=>active&&edit(active.path,v??'')} options={{fontSize:s.fontSize,tabSize:s.tabSize,wordWrap:s.wordWrap?'on':'off',minimap:{enabled:s.minimap},automaticLayout:true}}/>:<div style={{padding:24}}>Open a file from the explorer.</div>}</div>
     {showPreview&&<div style={{borderLeft:'1px solid #2a3358'}}><PreviewPane files={ws.files}/></div>}
    </div>
    {showTerm&&<div style={{height:180}}><Term files={flatten(ws.files).map(f=>f.path)}/></div>}
   </div>
  </div>
  <StatusBar file={ws.activePath} dirty={!!active?.dirty}/>
  <Palette open={pal} items={cmds} onPick={run} onClose={()=>setPal(false)}/>
  {setOpen&&<div onClick={()=>setSetOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'grid',placeItems:'center'}}><div onClick={e=>e.stopPropagation()} style={{background:'#161b2e',borderRadius:12}}><SettingsPanel/><button onClick={()=>setSetOpen(false)}>Close</button></div></div>}
  <input id='up' type='file' hidden multiple onChange={async e=>{if(!e.target.files)return;const {readUploads}=await import('./importExport/files');const n=await readUploads(e.target.files);setFiles([...ws.files,...n])}}/>
 </div>
}
