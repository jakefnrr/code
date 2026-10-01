import {useEffect} from 'react';
export function useKeys(map:Record<string,()=>void>){useEffect(()=>{const h=(e:KeyboardEvent)=>{const k=(e.ctrlKey||e.metaKey?'ctrl+':'')+e.key.toLowerCase();map[k]?.()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[map])}
