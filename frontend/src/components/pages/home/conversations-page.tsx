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
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  // Only fetch group ID when component mounts or client changes
  useEffect(() => {
    if (client) {
      handleFetchGroupId();
    }
  }, [client]);

  // Check for group when conversations change, with debounce
  useEffect(() => {
    if (conversations.length > 0 && !isGroupJoined && !hasAttemptedRefresh) {
      // Debounce the check to avoid multiple rapid checks
      const timer = setTimeout(() => {
        handleFetchGroupId();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [conversations, isGroupJoined, hasAttemptedRefresh]);

  // Add monitoring for conversations changes
  useEffect(() => {
    console.log("Conversations updated in ConversationsPage:", conversations.length);
    if (conversations.length > 0) {
      console.log("First conversation ID:", conversations[0].id);
    }
  }, [conversations]);

  // Add monitoring for isGroupJoined and groupConversation changes
  useEffect(() => {
    console.log("isGroupJoined changed:", isGroupJoined);
    console.log("groupConversation:", groupConversation);
  }, [isGroupJoined, groupConversation]);

  const handleLeaveGroup = async () => {
    if (!client) return;

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
      // If we're already refreshing, don't trigger another refresh
      if (isRefreshing) {
        return;
      }
      
      const getGroupId = async () => {
        const res = await fetch("/api/proxy/get-group-id");
        const data = await res.json();
        return { groupId: data.groupId, isMember: data.isMember };
      };

      const { groupId, isMember } = await getGroupId();
      console.log("groupId", groupId);
      console.log("isMember", isMember);
      console.log("Conversations count:", conversations.length);

      // IMPORTANT: Always set isGroupJoined based on isMember status from API
      // This ensures the Leave Group button appears whenever the user is a member
      setIsGroupJoined(isMember);
      console.log("Setting isGroupJoined to:", isMember);

      const foundGroup = conversations.find((conv) => conv.id === groupId);
      console.log("Found group:", foundGroup ? foundGroup.id : "not found");
      
      if (foundGroup) {
        await foundGroup?.sync();
        console.log("Group isActive:", (foundGroup as Group).isActive);
        if ((foundGroup as Group).isActive) {
          setGroupName((foundGroup as Group).name ?? "XMTP Mini app");
          setGroupConversation(foundGroup);
          console.log("Group conversation set:", foundGroup.id);
        } else {
          console.log("Group found but not active");
        }
      } else if (isMember && client && !hasAttemptedRefresh) {
        // If user is a member but conversation is not loaded yet
        // Refresh the conversation list to try to load it - but only once
        console.log("User is a member but conversation not found, refreshing (once)");
        setIsRefreshing(true);
        setHasAttemptedRefresh(true);
        try {
          const newConversations = await list(undefined, true);
          console.log("After refresh, new conversations count:", newConversations.length);
          setConversations(newConversations);
        } catch (error) {
          console.error("Error refreshing conversations:", error);
          // If refresh fails, stop trying
        } finally {
          setIsRefreshing(false);
        }
      } else {
        console.log("Group not found and not refreshing");
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
      // Reset the flag when manually refreshing
      setHasAttemptedRefresh(false);
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

        {isGroupJoined && groupConversation ? (
          <button
            onClick={() => {
              console.log("Enter button clicked, passing conversation:", groupConversation.id);
              if (groupConversation && groupConversation.id) {
                // Validate the conversation object before passing it
                onSelectConversation(groupConversation);
              } else {
                console.error("Invalid group conversation:", groupConversation);
                // Try to refresh the conversation list
                handleRefresh();
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200">
            Enter {groupName}
          </button>
        ) : isGroupJoined ? (
          // User is a member but conversation object isn't loaded
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-colors duration-200"
            disabled={isRefreshing}>
            {isRefreshing ? "Loading group..." : "Reload group chat"}
          </button>
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

        {isGroupJoined && (
          <Button
            variant="link"
            onClick={handleLeaveGroup}
            disabled={joining}
            className="text-xs text-red-400">
            {joining ? "Leaving..." : "Leave group"}
          </Button>
        )}
      </div>
    </div>
  );
}

