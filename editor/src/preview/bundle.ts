import type {FileNode} from '../types';
import {flatten} from '../utils/tree';
export function bundle(files:FileNode[]):string{const all=flatten(files);const html=all.find(f=>f.path.endsWith('.html'));if(!html?.content)return '<p>No HTML file found. Create web/index.html</p>';return html.content}
export function sandboxAttrs(){return 'allow-scripts allow-modals'}
