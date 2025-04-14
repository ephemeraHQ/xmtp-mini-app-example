import fs from "fs";
import { Client, type Group } from "@xmtp/node-sdk";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { env } from "./lib/env.js";
import {
  createSigner,
  createUser,
  generateEncryptionKeyHex,
  getEncryptionKeyFromHex,
} from "./lib/xmtp-utils.js";
import { validateApiSecret } from "./middleware/auth.middleware.js";
import xmtpRoutes from "./routes/xmtp.routes.js";

// Load environment variables
dotenv.config();

// Global XMTP client
export let xmtpClient: Client;

// Initialize XMTP client
const initializeXmtpClient = async () => {
  // create ephemeral node signer
  const signer = createSigner(env.XMTP_PRIVATE_KEY);
  const user = createUser(env.XMTP_PRIVATE_KEY);

  // Get or create encryption key
  const encryptionKey = env.XMTP_ENCRYPTION_KEY
    ? env.XMTP_ENCRYPTION_KEY
    : generateEncryptionKeyHex();

  console.log("Creating XMTP Node client with encryption key", encryptionKey);

  // Railway deployment support
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp";
  console.log("volumePath", volumePath);
  const dbPath = `${volumePath}/${user.account.address.toLowerCase()}-${env.XMTP_ENV}`;
  console.log("dbPath", dbPath);
  // Create database directory if it doesn't exist
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true });
  }

  // Create and initialize the client
  xmtpClient = await Client.create(
    signer,
    getEncryptionKeyFromHex(encryptionKey),
    {
      env: env.XMTP_ENV,
      dbPath,
    },
  );

  console.log("XMTP Client initialized with inbox ID:", xmtpClient.inboxId);

  // Sync the conversations from the network to update the local db
  await xmtpClient.conversations.sync();

  // Ensure client is super admin of the default group
  await ensureSuperAdmin();
};

// Ensure the client is a super admin of the default group
const ensureSuperAdmin = async () => {
  try {
    await xmtpClient.requestHistorySync();
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
    console.log("Conversation found", metadata);

    if (metadata.conversationType !== "group") {
      throw new Error("Conversation is not a group");
    }

    const group = conversation as Group;

    // Attempt to add the client as an admin
    try {
      const isAdmin = group.isAdmin(xmtpClient.inboxId);
      console.log("Client is admin of the group:", isAdmin);
    } catch (error) {
      console.error("Error checking if client is admin:", error);
      // This could happen if the client is already an admin or there are permission issues
      console.log("Continuing with existing permissions");
    }
  } catch (error) {
    console.error("Error ensuring admin status:", error);
  }
};

const app = express();
const port = env.PORT;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route (unprotected)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Protected API routes
app.use("/api/xmtp", validateApiSecret, xmtpRoutes);

// Initialize XMTP client and start the server
void (async () => {
  try {
    await initializeXmtpClient();

    // Start the server after XMTP client is initialized
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize XMTP client:", error);
    process.exit(1);
  }
})();
