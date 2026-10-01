export const mimeOf=(p:string)=>p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'text/plain';
