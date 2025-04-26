"use client";

import { Conversation } from "@xmtp/browser-sdk";
import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { useConversation } from "@/hooks/use-conversation";

interface SendMessageProps {
  conversation: Conversation;
  loadMessages: () => void;
  memberAddress?: `0x${string}`;
}

export const SendMessage = ({
  conversation,
  loadMessages,
  memberAddress,
}: SendMessageProps) => {
  const { send, sending } = useConversation(conversation);
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    const tmpMessage = message;
    if (tmpMessage.trim() === "") return;
    setMessage("");
    await send(tmpMessage);
    void loadMessages();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="flex flex-row items-center gap-2 w-full h-fit pt-0 pb-4">
      <Input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          } else if (e.key === "Escape") {
            inputRef.current?.blur();
          }
        }}
        placeholder="Message..."
        className="w-full h-full px-3 rounded-xl border border-gray-300 bg-gray-800 text-white"
      />
      <Button
        variant="default"
        onClick={handleSend}
        className="bg-blue-600 hover:bg-blue-600/80 text-white border border-blue-300 my-0 h-full"
        disabled={sending}>
        <Send className="size-4" />
      </Button>
    </div>
  );
};
