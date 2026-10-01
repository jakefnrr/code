import {load,save} from '../utils/storage';
const K='strata.recent';
export const recent=():string[]=>load(K,[]);
export const touch=(id:string)=>save(K,[id,...recent().filter(x=>x!==id)].slice(0,8));
