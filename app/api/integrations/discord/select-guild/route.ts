import { z } from "zod";
import { getCreator } from "@/lib/dal";
import { emergencyRateLimit,requireSameOrigin } from "@/lib/emergency/request-security";
import { selectOAuthDiscordGuild } from "@/lib/providers/discord-oauth-server";
const schema=z.object({connectionId:z.string().uuid(),guildId:z.string().regex(/^\d{5,25}$/),invite:z.string().url().optional()}).strict();
export const runtime="nodejs";
export async function POST(request:Request){const creator=await getCreator();if(!creator)return Response.json({error:"Unauthorized"},{status:401});if(!requireSameOrigin(request))return Response.json({error:"Cross-origin request rejected"},{status:403});if(!emergencyRateLimit(`${creator.id}:discord-select-guild`,10))return Response.json({error:"Rate limit exceeded"},{status:429});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid guild selection"},{status:400});try{return Response.json(await selectOAuthDiscordGuild(creator.id,parsed.data.connectionId,parsed.data.guildId,parsed.data.invite));}catch(error){const code=error instanceof Error?error.message:"selection_failed";return Response.json({error:code},{status:code==="already_connected"?409:400});}}
