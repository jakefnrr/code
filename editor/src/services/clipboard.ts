export async function copyText(t:string){try{await navigator.clipboard.writeText(t);return true}catch{return false}}
