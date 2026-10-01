import type {Workspace} from '../types';
import {uid} from '../utils/id';
import {seedFiles} from '../filesystem/seed';
import {load,save} from '../utils/storage';
const K='strata.workspaces';
export function listWS():Workspace[]{return load(K,[])}
export function createWS(name:string):Workspace{const ws={id:uid('ws'),name,files:JSON.parse(JSON.stringify(seedFiles)),openTabs:['/README.md'],activePath:'/README.md',updatedAt:Date.now()};save(K,[...listWS(),ws]);return ws}
export function saveWS(w:Workspace){save(K,listWS().map(x=>x.id===w.id?w:x))}
export function deleteWS(id:string){save(K,listWS().filter(x=>x.id!==id))}
