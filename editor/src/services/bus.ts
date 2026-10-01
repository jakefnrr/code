type Fn=(...a:any[])=>void;const m=new Map<string,Fn[]>();
export const on=(e:string,f:Fn)=>{m.set(e,[...(m.get(e)??[]),f])};
export const emit=(e:string,...a:any[])=>m.get(e)?.forEach(f=>f(...a));
