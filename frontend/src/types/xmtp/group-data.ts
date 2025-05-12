export interface GroupData {
  groupId: string;
  groupName: string;
  isMember: boolean;
  memberCount: number;
  messageCount: number;
  lastMessage?: {
    content: string;
    displaySenderId: string;
    id: string;
    senderInboxId: string;
    sentAt: string;
  };
  members: [
    {
      inboxId: string;
      displayInboxId: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
    },
  ];
}
