import {
  Client,
  type Conversation,
  type Group,
  type XmtpEnv,
} from "@xmtp/node-sdk";
import cors from "cors";
import "dotenv/config";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import {
  appendToEnv,
  createSigner,
  defaultInboxes,
  getDbPath,
  getEncryptionKeyFromHex,
  validateEnvironment,
} from "./helper";

const { WALLET_KEY, API_SECRET_KEY, ENCRYPTION_KEY, XMTP_ENV, PORT } =
  validateEnvironment([
    "WALLET_KEY",
    "API_SECRET_KEY",
    "ENCRYPTION_KEY",
    "XMTP_ENV",
    "PORT",
  ]);

let GROUP_ID = process.env.GROUP_ID;
// Global XMTP client
let xmtpClient: Client;

// Initialize XMTP client
const initializeXmtpClient = async () => {
  // Create wallet signer and encryption key
  const signer = createSigner(WALLET_KEY);
  const dbEncryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);
  const dbPath = getDbPath(XMTP_ENV);
  // Create installation A (receiver) client
  xmtpClient = await Client.create(signer, {
    dbEncryptionKey,
    env: XMTP_ENV as XmtpEnv,
    dbPath,
  });

  console.log("XMTP Client initialized with inbox ID:", xmtpClient.inboxId);
  await xmtpClient.conversations.sync();
  let conversation: Conversation | undefined;
  if (GROUP_ID) {
    conversation = await xmtpClient.conversations.getConversationById(GROUP_ID);
  } else {
    conversation = await xmtpClient.conversations.newGroup(defaultInboxes);

    GROUP_ID = conversation.id;
    appendToEnv("GROUP_ID", GROUP_ID);
  }

  if (!conversation) {
    console.error("Failed to initialize XMTP client");
    return;
  }

  await xmtpClient.conversations.sync();

  const isAdmin = (conversation as Group).isSuperAdmin(xmtpClient.inboxId);
  console.log("Client is admin of the group:", isAdmin);
};

// XMTP Service Functions
const removeUserFromDefaultGroupChat = async (
  newUserInboxId: string,
): Promise<boolean> => {
  try {
    const conversation = await xmtpClient.conversations.getConversationById(
      GROUP_ID ?? "",
    );

    if (!conversation) {
      throw new Error(
        `Conversation not found with id: ${GROUP_ID} on env: ${XMTP_ENV}`,
      );
    }
    await conversation.sync();
    console.log("conversation", conversation.id);
    const groupMembers = await (conversation as Group).members();
    const isMember = groupMembers.some(
      (member) => member.inboxId === newUserInboxId,
    );
    if (isMember) {
      await conversation.sync();
      await (conversation as Group).removeMembers([newUserInboxId]);
      console.log("Removed user from group");
    } else {
      console.log("User not in group");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error adding user to default group chat:", error);
    return false;
  }
};
// XMTP Service Functions
const addUserToDefaultGroupChat = async (
  newUserInboxId: string,
): Promise<boolean> => {
  try {
    const conversation = await xmtpClient.conversations.getConversationById(
      GROUP_ID ?? "",
    );

    if (!conversation) {
      throw new Error(
        `Conversation not found with id: ${GROUP_ID} on env: ${XMTP_ENV}`,
      );
    }
    await conversation.sync();
    console.log("conversation", conversation.id);
    const groupMembers = await (conversation as Group).members();
    const isMember = groupMembers.some(
      (member) => member.inboxId === newUserInboxId,
    );
    if (!isMember) {
      await conversation.sync();
      await (conversation as Group).addMembers([newUserInboxId]);
      console.log("Added user to group");
    } else {
      console.log("User already in group");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error adding user to default group chat:", error);
    return false;
  }
};

// API Middleware
const validateApiSecret = (req: Request, res: Response, next: () => void) => {
  console.log("🔑 validateApiSecret called for path:", req.path);
  const apiSecret = req.headers["x-api-secret"];
  if (apiSecret !== API_SECRET_KEY) {
    console.log("❌ Invalid API secret:", apiSecret);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  console.log("✅ API secret validated successfully");
  next();
};

// Express App Setup
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Add global request logger
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get("/health", (req, res) => {
  console.log("✅ HEALTH CHECK ENDPOINT HIT");
  res.json({ status: "ok" });
});

app.post(
  "/api/xmtp/add-inbox",
  validateApiSecret,
  (req: Request, res: Response) => {
    void (async () => {
      try {
        const { inboxId } = req.body as { inboxId: string };
        console.log(
          "Adding user to default group chat with id:",
          GROUP_ID,
          "and inboxId:",
          inboxId,
        );
        const result = await addUserToDefaultGroupChat(inboxId);
        res.status(200).json({
          success: result,
          message: result
            ? "Successfully added user to default group chat"
            : "You are already in the group",
        });
      } catch (error) {
        console.error("Error adding user to default group chat:", error);
        res.status(500).json({
          message: "You are not in the group",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
  },
);

app.post(
  "/api/xmtp/remove-inbox",
  validateApiSecret,
  (req: Request, res: Response) => {
    void (async () => {
      try {
        const { inboxId } = req.body as { inboxId: string };
        const result = await removeUserFromDefaultGroupChat(inboxId);
        res.status(200).json({
          success: result,
          message: result
            ? "Successfully removed user from default group chat"
            : "Failed to remove user from default group chat",
        });
      } catch (error) {
        console.error("Error removing user from default group chat:", error);
        res.status(500).json({
          message: "Failed to remove user from default group chat",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
  },
);

app.get(
  "/api/xmtp/get-group-id",
  validateApiSecret,
  (req: Request, res: Response) => {
    console.log("🔴🔴🔴 GET-GROUP-ID ROUTE HANDLER STARTED 🔴🔴🔴");
    console.log("Request headers:", req.headers);
    void (async () => {
      try {
        console.log("🔵 Inside get-group-id async block");
        console.log("Current client inbox ID:", xmtpClient.inboxId);
        console.log("Looking for group with ID:", GROUP_ID);
        const conversation = await xmtpClient.conversations.getConversationById(
          GROUP_ID ?? "",
        );
        console.log("🟢 Conversation fetched:", conversation?.id);
        if (!conversation) {
          console.log("⚠️ No conversation found");
          return res.status(404).json({ error: "Group not found" });
        }
        await conversation.sync();
        console.log("🟡 Conversation synced");

        const groupMembers = await (conversation as Group).members();
        console.log("📋 Group members count:", groupMembers.length);
        console.log(
          "📋 Group members details:",
          groupMembers.map((member) => ({
            inboxId: member.inboxId,
            permissionLevel: member.permissionLevel,
          })),
        );

        const isMember = groupMembers.some(
          (member) => member.inboxId === xmtpClient.inboxId,
        );
        console.log("🟣 isMember check complete:", isMember);
        console.log("🟣 Client inbox ID:", xmtpClient.inboxId);

        const responseObject = { groupId: process.env.GROUP_ID, isMember };
        console.log("🔵 Full response object:", JSON.stringify(responseObject));

        res.json(responseObject);
        console.log("⚪ Response sent for get-group-id");
      } catch (error) {
        console.error("❌ Error in get-group-id:", error);
        res.status(500).json({ error: "Failed to fetch group info" });
      }
    })();
  },
);

// Start Server
void (async () => {
  try {
    await initializeXmtpClient();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize XMTP client:", error);
    process.exit(1);
  }
})();
