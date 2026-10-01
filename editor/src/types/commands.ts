export interface Command{id:string;title:string;hint?:string;run:()=>void|Promise<void>} 
