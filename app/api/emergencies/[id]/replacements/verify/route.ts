import{emergencyApiContext}from"@/lib/emergency/api";
export async function POST(){const ctx=await emergencyApiContext();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
return Response.json({error:"Self-declared verification is disabled. Use provider-backed verification."},{status:410});}
