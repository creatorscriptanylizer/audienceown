import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/dal";
import { checkRecoveryPassNameAvailability } from "@/lib/creator-slug-availability";

const requestSchema=z.object({slug:z.string().max(80)});

export async function POST(request:Request){
  const viewer=await getViewer();
  if(!viewer)return NextResponse.json({status:"error",code:"unauthenticated"},{status:401});
  let body:unknown;
  try{body=await request.json()}catch{return NextResponse.json({status:"error",code:"invalid_request"},{status:400})}
  const parsed=requestSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({status:"error",code:"invalid_request"},{status:400});
  const result=await checkRecoveryPassNameAvailability(parsed.data.slug);
  return NextResponse.json(result,{status:result.status==="error"?503:200});
}
