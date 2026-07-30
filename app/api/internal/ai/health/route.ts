import{isDeliveryWorkerAuthorized}from"@/lib/delivery-worker-auth";import{createAdminClient}from"@/lib/supabase/admin";
export async function GET(request:Request){if(!isDeliveryWorkerAuthorized(request.headers.get("authorization"),process.env.AI_WORKER_SECRET))return Response.json({error:"Unauthorized"},{status:401});
const admin=createAdminClient();if(!admin)return Response.json({error:"Not configured"},{status:503});const now=new Date().toISOString(),month=new Date();month.setUTCDate(1);month.setUTCHours(0,0,0,0);
const[{data:jobs},{data:usage}]=await Promise.all([admin.from("ai_draft_enhancement_jobs").select("status,lease_expires_at,created_at,last_error_code,completed_at").order("created_at",{ascending:false}).limit(1000),
admin.from("ai_usage_events").select("estimated_cost_minor_units,success,created_at").gte("created_at",month.toISOString())]);
return Response.json({pending:(jobs??[]).filter((j)=>j.status==="pending").length,processing:(jobs??[]).filter((j)=>j.status==="processing").length,
expiredLeases:(jobs??[]).filter((j)=>j.status==="processing"&&j.lease_expires_at&&j.lease_expires_at<now).length,
oldestPending:(jobs??[]).filter((j)=>j.status==="pending").at(-1)?.created_at??null,recentFailures:(jobs??[]).filter((j)=>j.last_error_code).slice(0,20).map((j)=>j.last_error_code),
currentMonthUsage:(usage??[]).length,estimatedCostMinorUnits:(usage??[]).reduce((sum,row)=>sum+(row.estimated_cost_minor_units??0),0),
lastSuccessfulEnhancement:(jobs??[]).find((j)=>j.status==="completed")?.completed_at??null},{headers:{"cache-control":"no-store"}});}
