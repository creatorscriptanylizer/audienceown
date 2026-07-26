import { integrationStatus } from "@/lib/env";
export function GET(){const integrations=integrationStatus();return Response.json({status:integrations.supabase?"ok":"degraded",service:"ownsignal",integrations:{supabase:integrations.supabase,turnstile:integrations.turnstile,resend:integrations.resend},timestamp:new Date().toISOString()},{headers:{"cache-control":"no-store"}})}
