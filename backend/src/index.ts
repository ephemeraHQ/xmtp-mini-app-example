import fs from "fs";
import { Client, type Group } from "@xmtp/node-sdk";
import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import {
  createSigner,
  env,
  generateEncryptionKeyHex,
  getEncryptionKeyFromHex,
} from "./helper";

// Global XMTP client
let xmtpClient: Client;

// Initialize XMTP client
const initializeXmtpClient = async () => {
  const signer = createSigner(env.XMTP_PRIVATE_KEY);
  const encryptionKey = env.XMTP_ENCRYPTION_KEY || generateEncryptionKeyHex();

  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp";
  fs.mkdirSync(volumePath, { recursive: true });

  const identifier = await signer.getIdentifier();
  const address = identifier.identifier;
  const dbPath = `${volumePath}/${address}-${env.XMTP_ENV}`;
  const dbEncryptionKey = getEncryptionKeyFromHex(encryptionKey);
  xmtpClient = await Client.create(signer, {
    env: env.XMTP_ENV,
    dbPath,
    dbEncryptionKey,
  });

  console.log("XMTP Client initialized with inbox ID:", xmtpClient.inboxId);
  await xmtpClient.conversations.sync();
  await ensureSuperAdmin();
};

// Ensure the client is a super admin of the default group
const ensureSuperAdmin = async () => {
  try {
    await xmtpClient.conversations.sync();
    const conversation = await xmtpClient.conversations.getConversationById(
      env.XMTP_DEFAULT_CONVERSATION_ID,
    );

    if (!conversation) {
      throw new Error(
        `Conversation not found with id: ${env.XMTP_DEFAULT_CONVERSATION_ID} on env: ${env.XMTP_ENV}`,
      );
    }

    const metadata = await conversation.metadata();
    if (metadata.conversationType !== "group") {
      throw new Error("Conversation is not a group");
    }

    const group = conversation as Group;
    try {
      const isAdmin = group.isSuperAdmin(xmtpClient.inboxId);
      console.log("Client is admin of the group:", isAdmin);
    } catch {
      console.log("Continuing with existing permissions");
    }
  } catch (error) {
    console.error("Error ensuring admin status:", error);
  }
};

// XMTP Service Functions
const addUserToDefaultGroupChat = async (
  newUserInboxId: string,
): Promise<boolean> => {
  try {
    const conversation = await xmtpClient.conversations.getConversationById(
      env.XMTP_DEFAULT_CONVERSATION_ID,
    );

    if (!conversation) {
      throw new Error(
        `Conversation not found with id: ${env.XMTP_DEFAULT_CONVERSATION_ID} on env: ${env.XMTP_ENV}`,
      );
    }

    const metadata = await conversation.metadata();
    if (metadata.conversationType !== "group") {
      throw new Error("Conversation is not a group");
    }

    const group = conversation as Group;
    const groupMembers = await group.members();
    const isMember = groupMembers.some(
      (member) => member.inboxId === newUserInboxId,
    );

    if (!isMember) {
      await group.addMembers([newUserInboxId]);
    }

    return true;
  } catch (error) {
    console.error("Error adding user to default group chat:", error);
    return false;
  }
};

const removeUserFromDefaultGroupChat = async (
  userInboxId: string,
): Promise<boolean> => {
  try {
    const conversation = await xmtpClient.conversations.getConversationById(
      env.XMTP_DEFAULT_CONVERSATION_ID,
    );

    if (!conversation) {
      throw new Error(
        `Conversation not found with id: ${env.XMTP_DEFAULT_CONVERSATION_ID} on env: ${env.XMTP_ENV}`,
      );
    }

    const group = conversation as Group;
    await group.removeMembers([userInboxId]);
    return true;
  } catch (error) {
    console.error("Error removing user from default group chat:", error);
    return false;
  }
};

// API Middleware
const validateApiSecret = (req: Request, res: Response, next: () => void) => {
  const apiSecret = req.headers["x-api-secret"];
  if (apiSecret !== env.API_SECRET_KEY) {
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
    res.json({ groupId: env.XMTP_DEFAULT_CONVERSATION_ID });
  },
);

// Start Server
void (async () => {
  try {
    await initializeXmtpClient();
    app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize XMTP client:", error);
    process.exit(1);
  }
})();
