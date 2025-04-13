import fs from "fs";
import { type Group } from "@xmtp/node-sdk";
import { xmtpClient } from "../index";
import { env } from "../lib/env";
import {
  createSigner,
  createUser,
  generateEncryptionKeyHex,
  getEncryptionKeyFromHex,
} from "../lib/xmtp-utils";

// create random encryption key
const encryptionKey = env.XMTP_ENCRYPTION_KEY
  ? env.XMTP_ENCRYPTION_KEY
  : generateEncryptionKeyHex();

/**
 * Add a user to the default group chat
 * @param newUserInboxId - The inbox ID of the user to add
 * @returns true if the user was added, false otherwise
 */
export const addUserToDefaultGroupChat = async (
  newUserInboxId: string,
): Promise<boolean> => {
  console.log("Adding user to default group chat", newUserInboxId);

  try {
    // Check if XMTP client is initialized
    if (!xmtpClient) {
      throw new Error("XMTP client not initialized");
    }

    // Get the group chat by id
    const conversation = await xmtpClient.conversations.getConversationById(
      env.XMTP_DEFAULT_CONVERSATION_ID,
    );

    if (!conversation)
      throw new Error(
        `Conversation not found with id: ${env.XMTP_DEFAULT_CONVERSATION_ID} on env: ${env.XMTP_ENV}`,
      );

    // Get the metadata
    const metadata = await conversation.metadata();
    console.log("Conversation found", metadata);

    if (metadata.conversationType !== "group")
      throw new Error("Conversation is not a group");

    // load members from the group
    const group = conversation as Group;
    const groupMembers = await group.members();

    console.log(
      "Group members",
      groupMembers.map((member) => member.inboxId),
    );

    const isMember = groupMembers.some(
      (member) => member.inboxId === newUserInboxId,
    );

    if (isMember) {
      console.warn("User already in group, skipping...");
    } else {
      // Add the user to the group chat
      await group.addMembers([newUserInboxId]);
      console.log("User added to group successfully");
    }

    return true;
  } catch (error) {
    console.error("Error adding user to default group chat:", error);
    return false;
  }
};
