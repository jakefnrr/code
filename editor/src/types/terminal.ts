export interface TermLine{id:number;text:string;kind:"in"|"out"|"err"} 
export interface TermSession{id:string;name:string;lines:TermLine[];history:string[]} 
