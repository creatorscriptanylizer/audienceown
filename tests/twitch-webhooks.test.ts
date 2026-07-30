import { createHmac } from "node:crypto";import { beforeEach,describe,expect,it } from "vitest";import { verifyTwitchWebhook } from "@/lib/social-providers/webhooks";
describe("Twitch EventSub verification",()=>{beforeEach(()=>{process.env.TWITCH_EVENTSUB_SECRET="event-secret";});
 it("verifies signed messages",async()=>{const body=JSON.stringify({event:{id:"stream"}}),id="event-1",timestamp=new Date().toISOString();
  const signature=`sha256=${createHmac("sha256","event-secret").update(id+timestamp+body).digest("hex")}`;
  const result=await verifyTwitchWebhook(new Request("https://example.test",{method:"POST",body,headers:{
    "twitch-eventsub-message-id":id,"twitch-eventsub-message-timestamp":timestamp,"twitch-eventsub-message-signature":signature,
    "twitch-eventsub-subscription-type":"stream.online"}}));expect(result.eventId).toBe(id);});
 it("rejects replayed timestamps",async()=>{const timestamp=new Date(0).toISOString();await expect(verifyTwitchWebhook(new Request("https://example.test",{method:"POST",body:"{}",
  headers:{"twitch-eventsub-message-id":"x","twitch-eventsub-message-timestamp":timestamp,"twitch-eventsub-message-signature":"x"}}))).rejects.toMatchObject({code:"webhook_replay"});});
});
