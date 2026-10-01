export interface FileNode{id:string;name:string;path:string;kind:"file"|"folder";children?:FileNode[];content?:string;dirty?:boolean;lang?:string} 
export interface Tab{id:string;path:string;dirty:boolean} 
export interface Workspace{id:string;name:string;files:FileNode[];openTabs:string[];activePath:string|null;updatedAt:number} 
export interface Settings{theme:string;fontSize:number;tabSize:number;wordWrap:boolean;minimap:boolean;autosave:boolean;terminalFont:number;preview:string} 
export interface SearchOptions{query:string;regex:boolean;caseSensitive:boolean;wholeWord:boolean;include:string} 
