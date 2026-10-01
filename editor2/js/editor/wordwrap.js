export function wrapLines(s,n=80){return s.split("
").map(l=>l.length>n?l.slice(0,n)+"…":l).join("
")}