import { Agent } from "@xmtp/agent-sdk";
import { getTestUrl } from "@xmtp/agent-sdk/debug";
import {  resolveMentionsInMessage } from "./resolver";

  
if(process.env.NODE_ENV !== "production")  process.loadEnvFile(".env");


const agent = await Agent.createFromEnv({
  env: process.env.XMTP_ENV as "local" | "dev" | "production",
});

const AGENT_MENTION = "@game";
// Get frontend URL from environment or use default
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";


agent.on("text", async (ctx) => {
  const content = ctx.message.content;
  if(ctx.isGroup() && content.includes(AGENT_MENTION)) {
   // Resolve all mentions in the message
   const resolved = await resolveMentionsInMessage(
    content,
    await ctx.conversation.members(),
  );
    // Send tags as comma-separated string to frontend for resolution
    const tagsString = `?tags=${Object.values(resolved).filter(Boolean).join(",")}`;

    console.log("📤 Sending mini app link:", `${FRONTEND_URL}${tagsString}`);
    await ctx.sendText(`🚀 View in Mini App:`);
    await ctx.sendText(`${FRONTEND_URL}${tagsString}`);
    console.log("✅ Messages sent!");
    
  } else if(ctx.isDm() && content.includes("/start")) {
    await ctx.sendText("🔍 Start:\n\n");
    await ctx.sendText(`${FRONTEND_URL}`);
  } else if(ctx.isDm()) {
    await ctx.sendText("send /start to open the mini app");
  }

});



agent.on("start", () => {
  console.log(`Waiting for messages...`);
  console.log(`Address: ${agent.address}`);
  console.log(`🔗${getTestUrl(agent.client)}`);
});

await agent.start();

