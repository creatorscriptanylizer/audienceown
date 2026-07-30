import{isDeliveryWorkerAuthorized}from"@/lib/delivery-worker-auth";import{processAiEnhancementJobs}from"@/lib/ai/enhancement";
export const runtime="nodejs";export async function POST(request:Request){
if(!isDeliveryWorkerAuthorized(request.headers.get("authorization"),process.env.AI_WORKER_SECRET))return Response.json({error:"Unauthorized"},{status:401});
let limit=Number(process.env.AI_MAX_CONCURRENCY??3);try{const body=await request.json()as{limit?:unknown};if(body.limit!==undefined)limit=Number(body.limit);}catch{return Response.json({error:"Invalid JSON"},{status:400});}
if(!Number.isInteger(limit)||limit<1||limit>10)return Response.json({error:"Limit must be between 1 and 10"},{status:400});
try{return Response.json(await processAiEnhancementJobs(limit),{headers:{"cache-control":"no-store"}});}catch{return Response.json({error:"Enhancement batch failed"},{status:500});}}
