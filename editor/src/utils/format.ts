export const fmtBytes=(n:number)=>n<1024?n+' B':(n/1024).toFixed(1)+' KB';
export const fmtTime=(t:number)=>new Date(t).toLocaleString();
