export function zipEntrySafe(name:string){return !!name&&!name.includes('..')&&!name.startsWith('/')&&!name.startsWith('\\')&&name.length<512}
