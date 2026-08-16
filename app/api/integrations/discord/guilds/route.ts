import { getCreator } from "@/lib/dal";
import { emergencyRateLimit } from "@/lib/emergency/request-security";
import { listEligibleDiscordGuilds } from "@/lib/providers/discord-oauth-server";
export const runtime="nodejs";
export async function GET(request:Request){const creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});if(!emergencyRateLimit(`${creator.id}:discord-guilds`,20))return Response.json({error:"Rate limit exceeded"},{status:429});const connectionId=new URL(request.url).searchParams.get("connectionId");if(!connectionId||!/^[0-9a-f-]{36}$/i.test(connectionId))return Response.json({error:"Invalid connection"},{status:400});try{return Response.json({guilds:await listEligibleDiscordGuilds(creator.id,connectionId)});}catch{return Response.json({error:"Discord guilds could not be loaded"},{status:409});}}
