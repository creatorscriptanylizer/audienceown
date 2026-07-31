import{createHash,randomBytes,timingSafeEqual}from"node:crypto";
export function generateVerificationChallenge(){const token=randomBytes(18).toString("base64url");return{token,phrase:`audienceown-verification=${token}`,hash:hashChallenge(token)};}
export function hashChallenge(token:string){return createHash("sha256").update(token,"utf8").digest("hex");}
export function challengeMatches(token:string,hash:string){const actual=Buffer.from(hashChallenge(token),"hex"),expected=Buffer.from(hash,"hex");
return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function challengeIsUsable(input:{expiresAt:string;attempts:number;maxAttempts:number;consumedAt?:string|null},now=Date.now()){
return!input.consumedAt&&input.attempts<input.maxAttempts&&Date.parse(input.expiresAt)>now;}
