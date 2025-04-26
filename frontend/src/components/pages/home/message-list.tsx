import {
  Conversation,
  DecodedMessage,
  SafeGroupMember,
} from "@xmtp/browser-sdk";

import {
  TextMessage,
} from "@/components/ui/message";

interface MessageListProps {
  messages: DecodedMessage[];
  groupMembers: SafeGroupMember[];
  clientInboxId?: string;
  conversation: Conversation;
  refreshMessages: () => void;
}

export default function MessageList({
  messages,
  groupMembers,
  clientInboxId,
  conversation,
  refreshMessages,
}: MessageListProps) {
  return (
    <div className="flex flex-col gap-2 w-full justify-start">
      {messages.map((message) => {
        const isSender = clientInboxId === message.senderInboxId;
        const member = groupMembers.find(
          (member) => member.inboxId === message.senderInboxId,
        );
        const senderDisplayName = member
          ? member.accountIdentifiers[0].identifier
          : message.senderInboxId;

        return (
          <TextMessage
            key={message.id}
            message={message}
            isSender={isSender}
            senderDisplayName={senderDisplayName}
          />
        );
      })}
    </div>
  );
}
