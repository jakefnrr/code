import {useState} from 'react';
import {load,save} from '../utils/storage';
export function useLocal<T>(k:string,f:T){const [v,setV]=useState<T>(()=>load(k,f));return[v,(x:T)=>{setV(x);save(k,x)}] as const}
