import { createHmac,timingSafeEqual } from "node:crypto";import { SocialProviderError } from "./errors";
function safeEqual(a:string,b:string){const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);}
export async function verifyTwitchWebhook(request:Request){
  const secret=process.env.TWITCH_EVENTSUB_SECRET;if(!secret)throw new SocialProviderError("provider_not_configured","twitch","EventSub secret unavailable.");
  const id=request.headers.get("twitch-eventsub-message-id")??"",timestamp=request.headers.get("twitch-eventsub-message-timestamp")??"";
  const signature=request.headers.get("twitch-eventsub-message-signature")??"";if(!id||!timestamp||Math.abs(Date.now()-Date.parse(timestamp))>10*60_000)
    throw new SocialProviderError("webhook_replay","twitch","Webhook timestamp is outside the replay window.");
  const body=await request.text();const expected=`sha256=${createHmac("sha256",secret).update(id+timestamp+body).digest("hex")}`;
  if(!safeEqual(expected,signature))throw new SocialProviderError("webhook_verification_failed","twitch","Invalid EventSub signature.");
  const payload=JSON.parse(body) as Record<string,unknown>;payload._provider_event_timestamp=timestamp;
  return{eventId:id,eventType:request.headers.get("twitch-eventsub-subscription-type")??"unknown",payload};
}
