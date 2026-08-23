const buckets=new Map<string,{count:number;reset:number}>();
function configuredAppOrigin(){try{const configured=process.env.APP_URL;if(!configured)return null;const url=new URL(configured);return url.protocol==="http:"||url.protocol==="https:"?url.origin:null;}catch{return null;}}
export function requireSameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{const browserOrigin=new URL(origin).origin,requestOrigin=new URL(request.url).origin;return browserOrigin===requestOrigin||browserOrigin===configuredAppOrigin();}catch{return false;}}
export function emergencyRateLimit(key:string,limit=10,windowMs=60_000,now=Date.now()){const current=buckets.get(key);
if(!current||current.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return true;}if(current.count>=limit)return false;current.count++;return true;}
