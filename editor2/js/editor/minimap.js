export function mini(s){return s.split("
").slice(0,60).map(l=>l.slice(0,40)).join("
")}