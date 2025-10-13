import { Agent } from "@xmtp/agent-sdk";
import { getTestUrl } from "@xmtp/agent-sdk/debug";
import {
  resolveMentionsInMessage,
  extractMentions,
  extractMemberAddresses,
} from "./resolver.js";

process.env

const agent = await Agent.createFromEnv({
  env: process.env.XMTP_ENV as "local" | "dev" | "production",
});

agent.on("text", async (ctx) => {
  console.log(ctx.message.content);
  const mentions = extractMentions(ctx.message.content);
  if (mentions.length === 0) return;
  console.log(mentions);

  // Get group members for shortened address matching
  const memberAddresses = ctx.isGroup()
    ? extractMemberAddresses(await ctx.conversation.members())
    : [];

  // Resolve all mentions
  const resolved = await resolveMentionsInMessage(
    ctx.message.content,
    memberAddresses,
  );

  // Build response
  let response = "🔍 Resolved:\n\n";
  for (const [identifier, address] of Object.entries(resolved)) {
    if (!address) {
      response += `❌ ${identifier} → Not found\n`;
      continue;
    }
    response += `✅ ${identifier} → ${address}\n\n`;
    console.log(identifier, address);
  }

  await ctx.sendText(response);
});

agent.on("start", () => {
  console.log(`Waiting for messages...`);
  console.log(`Address: ${agent.address}`);
  console.log(`🔗${getTestUrl(agent.client)}`);
});

await agent.start();
