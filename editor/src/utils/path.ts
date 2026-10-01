export const join=(...p:string[])=>p.join('/').replace(/\/+/g,'/');
export const base=(p:string)=>p.split('/').pop()||p;
export const dir=(p:string)=>p.split('/').slice(0,-1).join('/')||'/';
export const ext=(p:string)=>(p.split('.').pop()||'').toLowerCase();
