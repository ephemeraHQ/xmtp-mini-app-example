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

const AGENT_MENTION = "@game";
// Get frontend URL from environment or use default
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

agent.on("text", async (ctx) => {
  const content = ctx.message.content;
  if(ctx.isGroup() && content.includes(AGENT_MENTION)) {
      const mentions = extractMentions(content);
    if (mentions.length === 0) return;
    console.log("📝 Extracted mentions:", mentions);

    // Get group members for shortened address matching
    const memberAddresses =
        extractMemberAddresses(await ctx.conversation.members())
  
    // Resolve all mentions
    console.log("🔍 Resolving mentions...");
    const resolved = await resolveMentionsInMessage(
      content.replace(AGENT_MENTION, ""),
      memberAddresses,
    );
    console.log("✅ Resolved:", resolved);

    // Filter out unresolved addresses and collect successful ones
    const resolvedAddresses: string[] = [];
    const failedIdentifiers: string[] = [];

    for (const [identifier, address] of Object.entries(resolved)) {
      if (!address) {
        failedIdentifiers.push(identifier);
      } else {
        resolvedAddresses.push(address);
      }
    }

    console.log("✅ Resolved addresses:", resolvedAddresses);
    console.log("❌ Failed identifiers:", failedIdentifiers);

    const membersString= `?users=${resolvedAddresses.join(",")}`

    console.log("📤 Sending mini app link:", `${FRONTEND_URL}${membersString}`);
    await ctx.sendText(`🚀 View in Mini App:`)
    await ctx.sendText(`${FRONTEND_URL}${membersString}`);
    console.log("✅ Messages sent!");
    
    
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

