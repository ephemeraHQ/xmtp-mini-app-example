import { Conversation, Group } from "@xmtp/browser-sdk";
import ky from "ky";
import { useEffect, useState } from "react";
import { Button } from "@/components/shadcn/button";
import { useXMTP } from "@/context/xmtp-context";
import { useConversations } from "@/hooks/use-conversations";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

interface ConversationsPageProps {
  onSelectConversation: (conv: Conversation) => void;
}

export default function ConversationsPage({
  onSelectConversation,
}: ConversationsPageProps) {
  const { client, conversations, setConversations } = useXMTP();
  const [joining, setJoining] = useState(false);
  const { loading, list } = useConversations();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupConversation, setGroupConversation] =
    useState<Conversation | null>(null);

  useEffect(() => {
    if (conversations.length >= 0) {
      handleFetchGroupId();
    }
  }, [conversations]);

  const handleLeaveGroup = async () => {
    if (!client || !groupConversation) return;

    try {
      setJoining(true);
      // call nextjs backend to set header without exposing the API_SECRET_KEY
      const data = await ky
        .post<{ success: boolean; message: string }>(
          `/api/proxy/remove-inbox`,
          {
            json: {
              inboxId: client.inboxId,
            },
          },
        )
        .json();
      setJoining(false);

      if (data.success) {
        const newConversations = await list(undefined, true);
        setConversations(newConversations);
        setIsGroupJoined(false);
        setGroupConversation(null);
      } else {
        console.warn("Failed to remove me from the default conversation", data);
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error removing me from the default conversation", error);
      setErrorMessage("Failed to remove me from the default conversation");
      setJoining(false);
    }
  };

  const handleFetchGroupId = async () => {
    try {
      const getGroupId = async () => {
        const res = await fetch("/api/proxy/get-group-id");
        const data = await res.json();
        return data.groupId;
      };

      const groupId = await getGroupId();
      console.log("groupId", groupId);
      const foundGroup = conversations.find((conv) => conv.id === groupId);
      console.log("foundGroup", foundGroup);
      if (foundGroup) {
        await foundGroup?.sync();
        console.log("foundGroup", foundGroup);
        if ((foundGroup as Group).isActive) {
          setIsGroupJoined(true);
          setGroupName((foundGroup as Group).name ?? "XMTP Mini app");
          setGroupConversation(foundGroup);
        }
      }
    } catch (error) {
      console.error("Error fetching group ID:", error);
      setErrorMessage("Failed to fetch group ID");
    }
  };

  const handleAddMeToDefaultConversation = async () => {
    if (!client) return;

    try {
      setJoining(true);
      // call nextjs backend to set header without exposing the API_SECRET_KEY
      const data = await ky
        .post<{ success: boolean; message: string }>(`/api/proxy/add-inbox`, {
          json: {
            inboxId: client.inboxId,
          },
        })
        .json();
      setJoining(false);

      if (data.success) {
        const newConversations = await list(undefined, true);
        setConversations(newConversations);
      } else {
        console.warn("Failed to add me to the default conversation", data);
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error adding me to the default conversation", error);
      setErrorMessage("Failed to add me to the default conversation");
      setJoining(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const newConversations = await list(undefined, true);
      setConversations(newConversations);
    } catch (error) {
      console.error("Error refreshing conversations", error);
      setErrorMessage("Failed to refresh conversations");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 text-center mt-4">
      <h2 className="text-2xl font-bold text-white">Group chat</h2>

      <div className="flex flex-col gap-4 items-center">
        <p className="text-xs text-gray-400">
          Inbox ID: {client?.inboxId?.slice(0, 6)}...
          {client?.inboxId?.slice(-4)}
        </p>

        {isGroupJoined ? (
          <div className="flex flex-col gap-2">
            <p className="text-green-500">Already in group chat</p>
            <button
              onClick={() => onSelectConversation(groupConversation!)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200">
              Enter {groupName}
            </button>
            <Button
              variant="link"
              onClick={handleLeaveGroup}
              disabled={joining}
              className="text-xs text-red-400">
              {joining ? "Leaving..." : "Leave group"}
            </Button>
          </div>
        ) : (
          <button
            onClick={handleAddMeToDefaultConversation}
            className={cn(
              "px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200",
              {
                "opacity-50":
                  isRefreshing ||
                  loading ||
                  joining ||
                  !client ||
                  !client.inboxId,
              },
            )}
            disabled={
              isRefreshing || loading || joining || !client || !client.inboxId
            }>
            {loading || joining ? "Joining..." : "Join chat"}
          </button>
        )}

        {errorMessage ? (
          <div className="text-red-500 text-sm">{errorMessage}</div>
        ) : null}

        <Button
          variant="link"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-xs text-gray-400">
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
}
