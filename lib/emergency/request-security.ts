const buckets=new Map<string,{count:number;reset:number}>();
export function requireSameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}}
export function emergencyRateLimit(key:string,limit=10,windowMs=60_000,now=Date.now()){const current=buckets.get(key);
if(!current||current.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return true;}if(current.count>=limit)return false;current.count++;return true;}
