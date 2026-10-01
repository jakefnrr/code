export type Cap='fs:write'|'preview:run'|'term:run';
export const allowed:Set<Cap>=new Set(['fs:write','preview:run','term:run']);
export const can=(c:Cap)=>allowed.has(c);
