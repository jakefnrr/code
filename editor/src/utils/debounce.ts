export const debounce=(fn:(...a:any[])=>void,ms=200)=>{let t:any;return(...a:any[])=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
