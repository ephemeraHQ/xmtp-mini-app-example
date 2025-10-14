import { Agent } from "@xmtp/agent-sdk";
import { getTestUrl } from "@xmtp/agent-sdk/debug";
import {
  resolveMentionsInMessage,
  extractMentions,
  extractMemberAddresses,
} from "./resolver";

process.loadEnvFile(".env");

const agent = await Agent.createFromEnv({
  env: process.env.XMTP_ENV as "local" | "dev" | "production",
});

// Get frontend URL from environment or use default
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

agent.on("text", async (ctx) => {
  const content = ctx.message.content;
  if(ctx.isGroup() && content.includes("@game")) {
      const mentions = extractMentions(content);
    if (mentions.length === 0) return;
    console.log(mentions);

    // Get group members for shortened address matching
    const memberAddresses =
        extractMemberAddresses(await ctx.conversation.members())
  
    // Resolve all mentions
    const resolved = await resolveMentionsInMessage(
      content,
      memberAddresses,
    );

    // Filter out unresolved addresses and collect successful ones
    const resolvedAddresses: string[] = [];
    const failedIdentifiers: string[] = [];

    for (const [identifier, address] of Object.entries(resolved)) {
      if (!address) {
        failedIdentifiers.push(identifier);
      } else {
        resolvedAddresses.push(address);
        console.log(identifier, address);
      }
    }

    // Build response with mini app link if we have resolved addresses
    let response = "🔍 Mini App:\n\n";
    
    if (resolvedAddresses.length > 0) {
      // Construct mini app URL with resolved addresses
      const miniAppUrl = `${FRONTEND_URL}?users=${resolvedAddresses.join(",")}`;
      
      response += `✅ Found ${resolvedAddresses.length} address${resolvedAddresses.length > 1 ? "es" : ""}!\n\n`;
      response += `🚀 View in Mini App:\n${miniAppUrl}\n\n`;
      
      // Show the resolved addresses
      for (const [identifier, address] of Object.entries(resolved)) {
        if (address) {
          response += `✅ ${identifier} → ${address.substring(0, 6)}...${address.substring(38)}\n`;
        }
      }
    }
    
    await ctx.sendText(response);
  }else if(ctx.isDm() && content.includes("/start")) {
    await ctx.sendText("🔍 Start:\n\n");
    await ctx.sendText(`${FRONTEND_URL}`);
  }else if(ctx.isDm() ) {
    await ctx.sendText("send /start to open the mini app");
  }

});

agent.on("start", () => {
  console.log(`Waiting for messages...`);
  console.log(`Address: ${agent.address}`);
  console.log(`🔗${getTestUrl(agent.client)}`);
});

await agent.start();

