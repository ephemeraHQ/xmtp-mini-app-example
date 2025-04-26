import fs from "fs";
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
  getEncryptionKeyFromHex,
  validateEnvironment,
} from "./helper";

const {
  XMTP_PRIVATE_KEY,
  API_SECRET_KEY,
  XMTP_ENCRYPTION_KEY,
  XMTP_ENV,
  PORT,
} = validateEnvironment([
  "XMTP_PRIVATE_KEY",
  "API_SECRET_KEY",
  "XMTP_ENCRYPTION_KEY",
  "XMTP_ENV",
  "PORT",
]);

let XMTP_DEFAULT_CONVERSATION_ID = process.env.XMTP_DEFAULT_CONVERSATION_ID;
// Global XMTP client
let xmtpClient: Client;

// Initialize XMTP client
const initializeXmtpClient = async () => {
  const signer = createSigner(XMTP_PRIVATE_KEY);
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp";
  fs.mkdirSync(volumePath, { recursive: true });

  const identifier = await signer.getIdentifier();
  const address = identifier.identifier;
  const dbPath = `${volumePath}/${address}-${XMTP_ENV}.db3`;
  const dbEncryptionKey = getEncryptionKeyFromHex(XMTP_ENCRYPTION_KEY);
  xmtpClient = await Client.create(signer, {
    env: XMTP_ENV as XmtpEnv,
    dbPath,
    dbEncryptionKey,
  });

  console.log("XMTP Client initialized with inbox ID:", xmtpClient.inboxId);
  await xmtpClient.conversations.sync();
  let conversation: Conversation | undefined;
  if (XMTP_DEFAULT_CONVERSATION_ID) {
    conversation = await xmtpClient.conversations.getConversationById(
      XMTP_DEFAULT_CONVERSATION_ID,
    );
  } else {
    conversation = await xmtpClient.conversations.newGroup([
      xmtpClient.inboxId,
    ]);

    XMTP_DEFAULT_CONVERSATION_ID = conversation.id;
    appendToEnv("XMTP_DEFAULT_CONVERSATION_ID", XMTP_DEFAULT_CONVERSATION_ID);
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
const addUserToDefaultGroupChat = async (
  newUserInboxId: string,
): Promise<boolean> => {
  try {
    const conversation = await xmtpClient.conversations.getConversationById(
      process.env.XMTP_DEFAULT_CONVERSATION_ID ?? "",
    );

    if (!conversation) {
      throw new Error(
        `Conversation not found with id: ${process.env.XMTP_DEFAULT_CONVERSATION_ID} on env: ${XMTP_ENV}`,
      );
    }
    console.log("conversation", conversation.id);
    const groupMembers = await (conversation as Group).members();
    const isMember = groupMembers.some(
      (member) => member.inboxId === newUserInboxId,
    );
    console.log("isMember", isMember);
    console.log("newUserInboxId", newUserInboxId);
    if (!isMember) {
      await (conversation as Group).addMembers([newUserInboxId]);
      console.log("Added user to group");
    } else {
      await (conversation as Group).removeMembers([newUserInboxId]);
      console.log("Removed user from group");
    }

    return true;
  } catch (error) {
    console.error("Error adding user to default group chat:", error);
    return false;
  }
};

// API Middleware
const validateApiSecret = (req: Request, res: Response, next: () => void) => {
  const apiSecret = req.headers["x-api-secret"];
  if (apiSecret !== API_SECRET_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

// Express App Setup
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/api/xmtp/add-inbox",
  validateApiSecret,
  (req: Request, res: Response) => {
    void (async () => {
      try {
        const { inboxId } = req.body as { inboxId: string };
        console.log("Adding user to default group chat:", inboxId);
        const result = await addUserToDefaultGroupChat(inboxId);
        res.status(200).json({
          success: result,
          message: result
            ? "Successfully added user to default group chat"
            : "Failed to add user to default group chat",
        });
      } catch (error) {
        console.error("Error adding user to default group chat:", error);
        res.status(500).json({
          message: "Failed to add user to default group chat",
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
        const result = await addUserToDefaultGroupChat(inboxId);
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
    res.json({ groupId: process.env.XMTP_DEFAULT_CONVERSATION_ID });
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
