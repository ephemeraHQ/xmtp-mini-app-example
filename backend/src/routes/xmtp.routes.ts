import express, { type Request, type Response } from "express";
import {
  addUserToDefaultGroupChatController,
  removeUserFromDefaultGroupChatController,
} from "../controllers/xmtp.controller";
import { env } from "../lib/env";

const router = express.Router();

router.post("/add-inbox", (req: Request, res: Response) => {
  addUserToDefaultGroupChatController(req, res).catch((err: unknown) => {
    console.error("Error adding user to inbox:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

router.post("/remove-inbox", (req: Request, res: Response) => {
  removeUserFromDefaultGroupChatController(req, res).catch((err: unknown) => {
    console.error("Error removing user from inbox:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

router.get("/get-group-id", (req: Request, res: Response) => {
  console.log(
    "env.XMTP_DEFAULT_CONVERSATION_ID",
    env.XMTP_DEFAULT_CONVERSATION_ID,
  );
  return res.json({ groupId: env.XMTP_DEFAULT_CONVERSATION_ID });
});

export default router;
