import{alertMutation}from"@/lib/identity/alert-api";export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return alertMutation(request,(await params).id,"dismiss");}
