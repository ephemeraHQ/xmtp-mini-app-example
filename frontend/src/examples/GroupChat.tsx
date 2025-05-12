"use client";

import { useQuery } from "@tanstack/react-query";
import { Group } from "@xmtp/browser-sdk";
import ky from "ky";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { GroupData } from "@/types/xmtp";

export default function GroupManagement() {
  const { client, conversations, setConversations, setGroupConversation } =
    useXMTP();

  // Group Chat State
  const [joining, setJoining] = useState(false);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupConversation, setLocalGroupConversation] = useState<Group | null>(
    null,
  );
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMessageCount, setGroupMessageCount] = useState(0);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  // Message sending state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);

  const {
    data: groupData,
    error: groupError,
    isLoading: isGroupLoading,
    isRefetching: isGroupRefetching,
    refetch: refetchGroupData,
  } = useQuery({
    queryKey: ["group-id", client?.inboxId],
    queryFn: async () => {
      const data = await ky
        .get(`/api/proxy/get-group-id?inboxId=${client?.inboxId}`)
        .json<GroupData>();
      return data;
    },
    enabled: client && !!client.inboxId,
  });

  useEffect(() => {
    async function updateConversations(groupId: string) {
      // Sync conversations to make sure we have the latest data
      if (!client || !client.inboxId || isRefreshing) return;

      await client.conversations.sync();
      const newConversations = await client.conversations.list();
      setConversations(newConversations);

      // Find the group in existing conversations
      let group = newConversations.find((conv) => conv.id === groupId) as
        | Group
        | undefined;

      console.log("Found group:", group?.id, "Is Active:", group?.isActive);

      if (group && group.isActive) {
        setLocalGroupConversation(group);
        setGroupName(group.name || "");

        // Get group members
        const members = await group.members();
        setGroupMemberCount(members.length);

        // Get group messages
        const messages = await group.messages();
        setGroupMessageCount(messages.length);

        // Get latest message
        if (messages.length > 0) {
          setLatestMessage(String(messages[messages.length - 1].content));
        }
      }
    }
    if (groupData && !isGroupLoading && !isGroupRefetching) {
      const groupId = groupData.groupId;
      const isMember = groupData.isMember;
      setIsGroupJoined(isMember);
      updateConversations(groupId);
      if (groupData.lastMessage) {
        setLastSentMessage(groupData.lastMessage.content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, groupData, isGroupLoading, isGroupRefetching]);

  // Join group handler
  const handleJoinGroup = async () => {
    if (!client) return;

    setJoining(true);

    try {
      const data = await ky
        .post(`/api/proxy/add-inbox`, {
          json: { inboxId: client.inboxId },
        })
        .json<{ success: boolean }>();

      if (data.success) {
        setIsGroupJoined(true);

        const newConversations = await client.conversations.list();
        setConversations(newConversations);

        // Refresh group data
        refetchGroupData();
      }
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setJoining(false);
    }
  };

  // Leave group handler
  const handleLeaveGroup = async () => {
    if (!client) return;

    setJoining(true);

    try {
      const data = await ky
        .post(`/api/proxy/remove-inbox`, {
          json: { inboxId: client.inboxId },
        })
        .json<{ success: boolean }>();

      if (data.success) {
        const newConversations = await client.conversations.list();
        setConversations(newConversations);

        setIsGroupJoined(false);
        setLocalGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setLatestMessage(null);
        setGroupName(null);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
    } finally {
      setJoining(false);
    }
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (!client) return;

    try {
      refetchGroupData();
    } catch (error) {
      console.error("Error refreshing group data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Message sending handler
  const handleSendMessage = async () => {
    console.log("Sending message:", groupConversation);
    if (!client || !groupConversation || !message.trim()) return;

    setSending(true);

    try {
      // Send the message to the group
      await groupConversation.send(message);

      // Update message count and latest message
      setGroupMessageCount((prev) => prev + 1);
      setLatestMessage(message);

      // Clear input and set last sent message
      setLastSentMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Group Status Section */}
      <div className="w-full bg-gray-900 p-3 rounded-md">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-sm font-medium">Group Status</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isRefreshing || !client}
            className="h-7 text-xs text-black">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        <div className="text-gray-400 text-xs mt-1">
          <p>
            <span className="text-gray-500">Status:</span>
            {!client ? (
              <span className="text-yellow-500"> Not connected</span>
            ) : isRefreshing ? (
              <span className="text-yellow-500"> Refreshing...</span>
            ) : joining ? (
              <span className="text-yellow-500"> Processing...</span>
            ) : isGroupJoined ? (
              <span className="text-green-500"> Member</span>
            ) : (
              <span className="text-red-500"> Not a member</span>
            )}
          </p>
          <p>
            <span className="text-gray-500">Group Name:</span>{" "}
            {groupName || "No group"}
          </p>
          <p>
            <span className="text-gray-500">Group ID:</span>{" "}
            {groupConversation?.id ?? "No ID"}
          </p>
          <p>
            <span className="text-gray-500">Members:</span>{" "}
            {groupMemberCount || 0}
          </p>
          <p>
            <span className="text-gray-500">Messages:</span>{" "}
            {groupMessageCount || 0}
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Latest Message:</span>{" "}
            <span className="text-gray-300 italic">
              {latestMessage
                ? latestMessage.length > 50
                  ? `${latestMessage.substring(0, 50)}...`
                  : latestMessage
                : "No messages"}
            </span>
          </p>
        </div>
        {client && isGroupJoined && (
          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !sending) {
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="w-full bg-gray-800 text-white p-2 pr-16 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              />
              <Button
                size="sm"
                className="absolute right-1 top-1 h-7 text-xs"
                onClick={handleSendMessage}
                disabled={!message.trim() || sending}>
                {sending ? "..." : "Send"}
              </Button>
            </div>

            {lastSentMessage && (
              <div className="text-green-500 text-xs mt-2 p-2 bg-green-900/20 rounded-md">
                Message sent: {lastSentMessage}
              </div>
            )}
          </div>
        )}

        <Button
          className="w-full mt-3"
          size="sm"
          onClick={isGroupJoined ? handleLeaveGroup : handleJoinGroup}
          disabled={joining || isRefreshing || !client}>
          {joining
            ? "Processing..."
            : isRefreshing
              ? "Refreshing..."
              : isGroupJoined
                ? "Leave Group"
                : "Join Group Chat"}
        </Button>
      </div>
    </div>
  );
}
