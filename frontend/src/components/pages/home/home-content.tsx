"use client";

import { useEffect } from "react";
import { useXMTP } from "@/context/xmtp-context";
import ConversationsPage from "./conversations-page";

export default function HomeContent() {
  const { client } = useXMTP();

  useEffect(() => {
    const loadConversations = async () => {
      if (!client) {
        return;
      }

      const conversations = await client.conversations.list();
      console.log("Loaded conversations:", conversations.length);
    };

    void loadConversations();
  }, [client]);

  return (
    <div className="flex flex-col gap-2 px-4 py-1 h-full">
      <ConversationsPage />
    </div>
  );
}
