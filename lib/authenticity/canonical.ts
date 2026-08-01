function normalize(value:unknown):unknown{if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==="object"){return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize((value as Record<string,unknown>)[key])]).filter(([,item])=>item!==undefined));}return value;}
export function canonicalize(value:unknown){return JSON.stringify(normalize(value));}
export function base64url(value:Buffer|string){return Buffer.from(value).toString("base64url");}
