"use client";

import { useCallback, useState } from "react";
import { Group } from "@xmtp/browser-sdk";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";

export default function GroupManagement() {
  const { client, conversations, setConversations } = useXMTP();
  
  // Group Chat State
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupConversation, setGroupConversation] = useState<Group | null>(null);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMessageCount, setGroupMessageCount] = useState(0);

  // Fetch group ID and check membership
  const handleFetchGroupId = useCallback(async () => {
    if (!client || !client.inboxId) {
      console.log("Cannot fetch group: No client or inboxId available");
      return;
    }
    
    if (isRefreshing) {
      console.log("Already refreshing, skipping fetch");
      return;
    }

    try {
      setIsRefreshing(true);
      console.log("Fetching group ID for inbox:", client.inboxId);
      
      // This API endpoint would return group info from your backend
      const response = await fetch(
        `/api/proxy/get-group-id?inboxId=${client.inboxId}`,
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group ID: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Group data received:", data);
      
      const groupId = data.groupId;
      const isMember = data.isMember;
      
      setIsGroupJoined(isMember);
      console.log(`Group membership status: ${isMember ? "Member" : "Not a member"}, Group ID: ${groupId || "none"}`);

      if (!isMember || !groupId) {
        console.log("Not a member or no group ID, clearing group data");
        setGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setIsRefreshing(false);
        return;
      }
      
      // Try to find the group in existing conversations
      let foundGroup = conversations.find(
        (conv) => conv.id === groupId,
      ) as Group | undefined;

      if (foundGroup) {
        console.log("Found group in existing conversations:", foundGroup.id);
        // Refresh group data
        await foundGroup.sync();
        
        if (foundGroup.isActive) {
          setGroupConversation(foundGroup);
          
          // Fetch members and messages
          const members = await foundGroup.members();
          setGroupMemberCount(members.length);
          
          const messages = await foundGroup.messages();
          setGroupMessageCount(messages.length);
        }
      } else if (isMember && client && groupId) {
        console.log("Not found in conversations but is a member, refreshing...");
        // If we're a member but don't have the conversation locally, refresh conversations
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
      }
    } catch (error) {
      console.error("Error fetching group ID:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch group ID");
    } finally {
      setIsRefreshing(false);
    }
  }, [client, conversations, isRefreshing, setConversations]);

  // Leave group handler
  const handleLeaveGroup = async () => {
    if (!client) return;

    try {
      setJoining(true);
      setErrorMessage(null);
      
      const response = await fetch(`/api/proxy/remove-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxId: client.inboxId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        // Successfully left the group - refresh conversations
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        setIsGroupJoined(false);
        setGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
      } else {
        console.warn("Failed to leave group", data);
        throw new Error(data.message || "Failed to leave group");
      }
    } catch (error) {
      console.error("Error leaving group", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to leave group");
    } finally {
      setJoining(false);
    }
  };

  // Join group handler
  const handleJoinGroup = async () => {
    if (!client) return;

    try {
      setJoining(true);
      setErrorMessage(null);
      
      const response = await fetch(`/api/proxy/add-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inboxId: client.inboxId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Join group response:", data);

      if (data.success) {
        // Clear any potential outdated state immediately
        setGroupConversation(null);
        
        // Refresh after a delay to allow network updates to propagate
        setTimeout(async () => {
          try {
            await client.conversations.sync();
            const newConversations = await client.conversations.list();
            setConversations(newConversations);
            
            // Refresh group information
            await handleFetchGroupId();
          } catch (syncError) {
            console.error("Error syncing after join:", syncError);
          }
        }, 2000);
      } else {
        console.warn("Failed to join group", data);
        throw new Error(data.message || "Failed to join group");
      }
    } catch (error) {
      console.error("Error joining group", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (!client) return;
    
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      
      console.log("Manual refresh requested");
      
      // Sync all conversations
      await client.conversations.sync();
      const newConversations = await client.conversations.list();
      setConversations(newConversations);
      
      // Re-fetch group information
      await handleFetchGroupId();
    } catch (error) {
      console.error("Error refreshing data:", error);
      setErrorMessage("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full bg-gray-900 p-3 rounded-md">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-sm font-medium">Group Status</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-7 text-xs">
            {isRefreshing ? "..." : "Refresh"}
          </Button>
        </div>
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
        {isGroupJoined && groupConversation && (
          <>
            <p><span className="text-gray-500">Group Name:</span> {groupConversation.name || "XMTP Group"}</p>
            <p><span className="text-gray-500">Group ID:</span> {groupConversation.id.slice(0, 8)}...{groupConversation.id.slice(-8)}</p>
            <p><span className="text-gray-500">Active:</span> {groupConversation.isActive ? "Yes" : "No"}</p>
            <p><span className="text-gray-500">Members:</span> {groupMemberCount}</p>
            <p><span className="text-gray-500">Messages:</span> {groupMessageCount}</p>
          </>
        )}
      </div>
      <Button
        className="w-full mt-3"
        size="sm"
        variant={joining || isRefreshing ? "outline" : "default"}
        onClick={isGroupJoined ? handleLeaveGroup : handleJoinGroup}
        disabled={joining || isRefreshing || !client}>
        {joining 
          ? "Processing..." 
          : isRefreshing
            ? "Refreshing..."
            : isGroupJoined 
              ? `Leave Group${groupConversation ? `: ${groupConversation.name || ""}` : ""}` 
              : "Join Group Chat"}
      </Button>
      
      {/* Error Message */}
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2 p-2 bg-red-900/20 rounded-md">
          {errorMessage}
        </div>
      )}
    </div>
  );
} 