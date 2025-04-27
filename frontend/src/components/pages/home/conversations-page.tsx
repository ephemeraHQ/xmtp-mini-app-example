import { Group } from "@xmtp/browser-sdk";
import ky from "ky";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shadcn/button";
import { useXMTP } from "@/context/xmtp-context";
import { cn } from "@/lib/utils";

export default function ConversationsPage() {
  const { client, conversations, setConversations } = useXMTP();
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupConversation, setGroupConversation] = useState<Group | null>(
    null,
  );
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);

  const handleFetchGroupId = useCallback(async () => {
    try {
      // If we're already refreshing, don't trigger another refresh
      if (isRefreshing) {
        return;
      }

      // Make sure we have a client with an inboxId
      if (!client || !client.inboxId) {
        console.log("No client or inboxId available");
        return;
      }

      const getGroupId = async () => {
        const res = await fetch(
          `/api/proxy/get-group-id?inboxId=${client.inboxId}`,
        );
        const data = await res.json();
        return { groupId: data.groupId, isMember: data.isMember };
      };
      console.log("client", "2.2.2");
      const { groupId, isMember } = await getGroupId();

      // IMPORTANT: Always set isGroupJoined based on isMember status from API
      // This ensures the Leave Group button appears whenever the user is a member
      setIsGroupJoined(isMember);
      console.log("Setting isGroupJoined to:", isMember);

      const foundGroup = conversations.find(
        (conv) => conv.id === groupId,
      ) as Group;
      console.log("Found group:", foundGroup ? foundGroup.id : "not found");

      if (foundGroup) {
        await foundGroup?.sync();
        console.log("Group isActive:", foundGroup.isActive);
        if (foundGroup.isActive) {
          setGroupName(foundGroup.name ?? "XMTP Mini app");
          setGroupConversation(foundGroup);
          console.log("Group conversation set:", foundGroup.id);
        } else {
          console.log("Group found but not active");
        }
      } else if (isMember && client && !hasAttemptedRefresh) {
        // If user is a member but conversation is not loaded yet
        // Refresh the conversation list to try to load it - but only once
        console.log(
          "User is a member but conversation not found, refreshing (once)",
        );
        setIsRefreshing(true);
        setHasAttemptedRefresh(true);
        try {
          if (!client) {
            return;
          }
          const newConversations = await client.conversations.list();
          console.log(
            "After refresh, new conversations count:",
            newConversations.length,
          );
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
  }, [
    client,
    conversations,
    hasAttemptedRefresh,
    isRefreshing,
    setConversations,
  ]);

  // Only fetch group ID when component mounts or client changes
  useEffect(() => {
    if (client) {
      handleFetchGroupId();
    }
  }, [client, handleFetchGroupId]);

  // Check for group when conversations change, with debounce
  useEffect(() => {
    if (conversations.length > 0 && !isGroupJoined && !hasAttemptedRefresh) {
      // Debounce the check to avoid multiple rapid checks
      const timer = setTimeout(() => {
        handleFetchGroupId();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversations, isGroupJoined, hasAttemptedRefresh, handleFetchGroupId]);

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
        const newConversations = await client.conversations.list();
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
        const newConversations = await client.conversations.list();
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
    setIsRefreshing(true);
    try {
      if (!client) {
        return;
      }
      const newConversations = await client.conversations.list();
      setConversations(newConversations);
      await handleFetchGroupId();
    } catch (error) {
      console.error("Error refreshing conversations:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Main button action based on joined state
  const mainButtonAction = isGroupJoined
    ? handleLeaveGroup
    : handleAddMeToDefaultConversation;

  const mainButtonText = isGroupJoined
    ? `Leave Group${groupName ? `: ${groupName}` : ""}`
    : "Join Group Chat";

  const buttonColor = isGroupJoined ? "destructive" : "default";

  return (
    <>
      <div className={cn("flex flex-col items-center justify-start h-full")}>
        <div className="w-full flex flex-col items-center justify-center gap-4 py-4">
          <Button
            className="w-full"
            size="lg"
            variant={buttonColor}
            onClick={mainButtonAction}
            disabled={joining || isRefreshing}>
            {joining ? "Processing..." : mainButtonText}
          </Button>

          <Button
            className="w-full"
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={joining || isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {errorMessage && (
            <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
          )}
        </div>

        {groupConversation && isGroupJoined && (
          <div className="mt-4 text-center text-slate-400">
            You have joined the group: {groupName}
          </div>
        )}
      </div>
    </>
  );
}
