import { Agent } from "@xmtp/agent-sdk";
import { getTestUrl } from "@xmtp/agent-sdk/debug";


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

    // Send tags as comma-separated string to frontend for resolution
    const tagsString = `?tags=${mentions.join(",")}`;

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




/**
 * Extracts mentions/domains from a message
 * Supports formats: @domain.eth, @username, domain.eth, @0xabc...def, @0xabcdef123456
 * @param message - The message text to parse
 * @returns Array of extracted identifiers
 */
export const extractMentions = (message: string): string[] => {
  const mentions: string[] = [];

  // Match full Ethereum addresses @0x followed by 40 hex chars (check this FIRST)
  const fullAddresses = message.match(/(0x[a-fA-F0-9]{40})\b/g);
  if (fullAddresses) {
    mentions.push(...fullAddresses); // Remove @
  }

  // Match @0xabc...def (shortened address with ellipsis or dots)
  const shortenedAddresses = message.match(
    /@(0x[a-fA-F0-9]+(?:…|\.{2,3})[a-fA-F0-9]+)/g,
  );
  if (shortenedAddresses) {
    mentions.push(...shortenedAddresses.map((m) => m.slice(1))); // Remove @
  }

  // Match @username.eth or @username (but not if it starts with 0x)
  const atMentions = message.match(/@(?!0x)([\w.-]+\.eth|[\w.-]+)/g);
  if (atMentions) {
    mentions.push(...atMentions.map((m) => m.slice(1))); // Remove @
  }

  // Match standalone domain.eth (not preceded by @ and with word boundaries)
  // Updated to match multi-level domains like byteai.base.eth
  const domains = message.match(/\b(?<!@)([\w-]+(?:\.[\w-]+)*\.eth)\b/g);
  if (domains) {
    mentions.push(...domains);
  }

  // Remove duplicates
  const uniqueMentions = [...new Set(mentions)];

  // Filter out parent domains when subdomains are present
  // e.g., if "byteai.base.eth" exists, remove "base.eth"
  return uniqueMentions.filter((mention) => {
    // Check if this mention is a parent domain of any other mention
    const isParentOfAnother = uniqueMentions.some(
      (other) => other !== mention && other.endsWith(`.${mention}`),
    );
    return !isParentOfAnother;
  });
};