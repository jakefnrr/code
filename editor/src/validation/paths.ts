export function safeName(n:string){return /^[^\/\\\0]{1,64}$/.test(n.trim())&&!n.includes('..')}
export function safePath(p:string){return !p.includes('..')&&p.startsWith('/')&&p.length<512}
export function normalize(p:string){return ('/'+p).replace(/\/+/g,'/').replace(/\/\/+/g,'/')}
