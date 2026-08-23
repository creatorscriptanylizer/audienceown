import { z } from "zod";
import { getCreator, getOptionalViewer } from "@/lib/dal";
import { requireSameOrigin } from "@/lib/emergency/request-security";
import { BillingIntervalSwitchError, cancelBillingIntervalSwitch, scheduleBillingIntervalSwitch } from "@/lib/billing/interval-switch";

const schema=z.object({interval:z.enum(["monthly","yearly"])}).strict();
function failure(error:unknown){const known=error instanceof BillingIntervalSwitchError;return Response.json({error:known?error.code:"billing_interval_change_failed"},{status:known?error.status:500});}
async function creator(){const user=await getOptionalViewer();return user?getCreator():null;}

export async function POST(request:Request){if(!requireSameOrigin(request))return Response.json({error:"invalid_origin"},{status:403});const owned=await creator();if(!owned)return Response.json({error:"unauthorized"},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"invalid_billing_interval"},{status:400});try{return Response.json(await scheduleBillingIntervalSwitch(owned.id,parsed.data.interval));}catch(error){return failure(error);}}
export async function DELETE(request:Request){if(!requireSameOrigin(request))return Response.json({error:"invalid_origin"},{status:403});const owned=await creator();if(!owned)return Response.json({error:"unauthorized"},{status:401});try{return Response.json(await cancelBillingIntervalSwitch(owned.id));}catch(error){return failure(error);}}
