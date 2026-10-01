import {ext} from './path';
const m:Record<string,string>={html:'html',css:'css',js:'javascript',ts:'typescript',tsx:'typescript',json:'json',py:'python',md:'markdown',xml:'xml',yaml:'yaml',yml:'yaml',sh:'shell',sql:'sql',java:'java',c:'c',cpp:'cpp',cs:'csharp',php:'php'};
export const langOf=(p:string)=>m[ext(p)]||'plaintext';
