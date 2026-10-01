export const load=(k:string,f:any)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
export const save=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
