import {useMemo} from 'react';
import {bundle} from '../../preview/bundle';
import type {FileNode} from '../../types';
export function PreviewPane({files}:{files:FileNode[]}){const html=useMemo(()=>bundle(files),[files]);return <iframe title='preview' sandbox='allow-scripts allow-modals' srcDoc={html} style={{width:'100%',height:'100%',border:0,background:'#fff'}}/>}
