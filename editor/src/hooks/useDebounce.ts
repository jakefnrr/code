import {useEffect,useState} from 'react';
export function useDebounce<T>(v:T,ms=300){const [x,setX]=useState(v);useEffect(()=>{const t=setTimeout(()=>setX(v),ms);return()=>clearTimeout(t)},[v,ms]);return x}
