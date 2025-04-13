import { type Request, type Response } from "express";
import {
  addUserToDefaultGroupChat,
  removeUserFromDefaultGroupChat,
} from "../services/xmtp.service";

export const addUserToDefaultGroupChatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { inboxId } = req.body as { inboxId: string };
    const result = await addUserToDefaultGroupChat(inboxId);
    if (!result) {
      res.status(200).json({
        success: false,
        message: "Failed to add user to default group chat",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Successfully added user to default group chat",
      });
    }
  } catch (error) {
    console.error("Error adding user to default group chat:", error);
    res.status(500).json({
      message: "Failed to add user to default group chat",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const removeUserFromDefaultGroupChatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { inboxId } = req.body as { inboxId: string };
    const result = await removeUserFromDefaultGroupChat(inboxId);
    if (!result) {
      res.status(200).json({
        success: false,
        message: "Failed to remove user from default group chat",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Successfully removed user from default group chat",
      });
    }
  } catch (error) {
    console.error("Error removing user from default group chat:", error);
    res.status(500).json({
      message: "Failed to remove user from default group chat",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
