"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Group } from "@xmtp/browser-sdk";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";

export default function GroupManagement() {
  const { client, conversations, setConversations, setGroupConversation } = useXMTP();
  
  // Group Chat State
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localGroupConversation, setLocalGroupConversation] = useState<Group | null>(null);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMessageCount, setGroupMessageCount] = useState(0);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);
  const didInitialFetch = useRef(false);
  const apiErrorCount = useRef(0);
  const lastApiCallTime = useRef<number>(0);

  // Message sending state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);

  // Update the context whenever the local group conversation changes
  useEffect(() => {
    console.log("GroupManagement: Setting groupConversation in context:", localGroupConversation);
    setGroupConversation(localGroupConversation);
  }, [localGroupConversation, setGroupConversation]);

  // Add API rate limiting to prevent infinite loops
  const shouldSkipApiCall = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime.current;
    
    // If we've had multiple errors in a row, add increasing backoff
    if (apiErrorCount.current > 3) {
      const backoffTime = Math.min(30000, 1000 * Math.pow(2, apiErrorCount.current - 3));
      if (timeSinceLastCall < backoffTime) {
        console.log(`Rate limiting API call (backoff: ${backoffTime}ms, time since last call: ${timeSinceLastCall}ms)`);
        return true;
      }
    }
    
    // Basic rate limiting - don't call more than once per second
    if (timeSinceLastCall < 1000) {
      console.log(`Rate limiting API call (time since last call: ${timeSinceLastCall}ms)`);
      return true;
    }
    
    return false;
  }, []);

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

    // Apply rate limiting to prevent infinite loops
    if (shouldSkipApiCall()) {
      return;
    }
    
    lastApiCallTime.current = Date.now();

    try {
      setIsRefreshing(true);
      console.log("Fetching group ID for inbox:", client.inboxId);
      
      // Force sync conversations first to ensure we have the latest data
      // This helps with EOA wallets that might not properly sync on initialization
      console.log("Force syncing conversations before fetching group data");
      await client.conversations.sync();
      
      // This API endpoint would return group info from your backend
      const response = await fetch(
        `/api/proxy/get-group-id?inboxId=${client.inboxId}`,
      );
      
      if (!response.ok) {
        apiErrorCount.current += 1;
        throw new Error(`Failed to fetch group ID: ${response.status} ${response.statusText}`);
      }
      
      // Reset error counter after successful request
      apiErrorCount.current = 0;
      
      const data = await response.json();
      console.log("Group data received:", data);
      
      const groupId = data.groupId;
      const isMember = data.isMember;
      
      setIsGroupJoined(isMember);
      console.log(`Group membership status: ${isMember ? "Member" : "Not a member"}, Group ID: ${groupId || "none"}`);

      if (!isMember || !groupId) {
        console.log("Not a member or no group ID, clearing group data");
        setLocalGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setLatestMessage(null);
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
          console.log("Found active group after refresh:", foundGroup.id);
          
          // Explicit cast to make sure we set a Group object
          const group = foundGroup as Group;
          setLocalGroupConversation(group);
          
          const members = await group.members();
          setGroupMemberCount(members.length);
          
          const messages = await group.messages();
          setGroupMessageCount(messages.length);
          
          // Get the latest message if available
          if (messages.length > 0) {
            setLatestMessage(String(messages[messages.length - 1].content));
          } else {
            setLatestMessage(null);
          }
        } else {
          console.log("Found group is not active, refreshing conversations");
          await client.conversations.sync();
          const newConversations = await client.conversations.list();
          setConversations(newConversations);
          
          // Try to find the group again after refresh
          foundGroup = newConversations.find(
            (conv) => conv.id === groupId,
          ) as Group | undefined;
          
          if (foundGroup && foundGroup.isActive) {
            console.log("Found active group after refresh:", foundGroup.id);
            
            // Explicit cast to make sure we set a Group object
            const group = foundGroup as Group;
            setLocalGroupConversation(group);
            
            const members = await group.members();
            setGroupMemberCount(members.length);
            
            const messages = await group.messages();
            setGroupMessageCount(messages.length);
            
            // Get the latest message if available
            if (messages.length > 0) {
              setLatestMessage(String(messages[messages.length - 1].content));
            } else {
              setLatestMessage(null);
            }
          }
        }
      } else if (isMember && client && groupId) {
        console.log("Not found in conversations but is a member, refreshing...");
        // If we're a member but don't have the conversation locally, refresh conversations
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        
        // Try again after sync
        const syncedGroup = newConversations.find(
          (conv) => conv.id === groupId,
        ) as Group | undefined;
        
        if (syncedGroup) {
          console.log("Found group after sync:", syncedGroup.id);
          
          // Explicit cast to make sure we set a Group object
          const group = syncedGroup as Group;
          setLocalGroupConversation(group);
          
          const members = await group.members();
          setGroupMemberCount(members.length);
          
          const messages = await group.messages();
          setGroupMessageCount(messages.length);
          
          // Get the latest message if available
          if (messages.length > 0) {
            setLatestMessage(String(messages[messages.length - 1].content));
          } else {
            setLatestMessage(null);
          }
        } else {
          console.log("Still cannot find group after sync, may need another refresh");
        }
      }
    } catch (error) {
      console.error("Error fetching group ID:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch group ID");
    } finally {
      setIsRefreshing(false);
    }
  }, [client, conversations, isRefreshing, setConversations, shouldSkipApiCall]);

  // Effect to fetch group status on component mount or when client changes
  useEffect(() => {
    if (client && client.inboxId && !isRefreshing && !didInitialFetch.current) {
      // Check the connection type to add additional synchronization for EOA wallets
      try {
        const connectionType = localStorage.getItem("xmtp:connectionType");
        console.log(`Initializing group data for ${connectionType || "unknown"} wallet type`);
        
        // For EOA wallets, ensure we sync one more time before first fetch
        if (connectionType === "EOA Wallet") {
          console.log("EOA wallet detected, ensuring sync is complete");
          // Set the ref first to prevent multiple initialization attempts
          didInitialFetch.current = true;
          
          // Sync the conversations first, then fetch group data
          void client.conversations.sync().then(() => {
            console.log("Initial EOA sync complete, now fetching group data");
            handleFetchGroupId();
          }).catch(error => {
            console.error("Error in initial EOA sync:", error);
            // Still try to fetch even if sync fails
            handleFetchGroupId();
          });
        } else {
          // For other wallet types, proceed as normal
          didInitialFetch.current = true;
          handleFetchGroupId();
        }
      } catch (error) {
        // If localStorage access fails, fall back to normal initialization
        console.error("Error checking wallet type:", error);
        didInitialFetch.current = true;
        handleFetchGroupId();
      }
    }
  }, [client, handleFetchGroupId, isRefreshing]);

  // Effect to re-fetch group data if needed, with rate limiting
  useEffect(() => {
    // Also run fetchGroupId if we're marked as a member but don't have the group conversation
    if (client && client.inboxId && isGroupJoined && !localGroupConversation && !isRefreshing && !shouldSkipApiCall()) {
      console.log("Member but no group conversation, fetching group data");
      handleFetchGroupId();
    }
  }, [client, isGroupJoined, localGroupConversation, isRefreshing, handleFetchGroupId, shouldSkipApiCall]);

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
        setLocalGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setLatestMessage(null);
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
        // Mark as joined immediately after API success
        setIsGroupJoined(true);
        
        // Clear any potential outdated state immediately
        setLocalGroupConversation(null);
        
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
          } finally {
            // Only set joining to false after sync completes
            setJoining(false);
          }
        }, 2000);
      } else {
        console.warn("Failed to join group", data);
        throw new Error(data.message || "Failed to join group");
      }
    } catch (error) {
      console.error("Error joining group", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to join group");
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

  // Message sending handler
  const handleSendMessage = async () => {
    if (!client || !localGroupConversation || !message.trim()) return;

    try {
      setSending(true);
      setSendError(null);
      console.log("Attempting to send message:", message);

      // Send the message to the group
      await localGroupConversation.send(message);
      console.log("Message sent successfully");
      
      // Update message count and latest message
      setGroupMessageCount(prev => prev + 1);
      setLatestMessage(message);
      
      // Clear input and set last sent message
      setLastSentMessage(message);
      setMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
      setSendError(err instanceof Error ? err.message : "Failed to send message");
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
            ) : joining && isGroupJoined ? (
              <span className="text-yellow-500"> Member - Syncing data...</span>
            ) : joining ? (
              <span className="text-yellow-500"> Processing...</span>
            ) : isGroupJoined ? (
              <span className="text-green-500"> Member</span>
            ) : (
              <span className="text-red-500"> Not a member</span>
            )}
          </p>
          {isGroupJoined && localGroupConversation && (
            <>
              <p><span className="text-gray-500">Group Name:</span> {localGroupConversation.name || "XMTP Group"}</p>
              <p><span className="text-gray-500">Group ID:</span> {localGroupConversation.id.slice(0, 8)}...{localGroupConversation.id.slice(-8)}</p>
              <p><span className="text-gray-500">Active:</span> {localGroupConversation.isActive ? "Yes" : "No"}</p>
              <p><span className="text-gray-500">Members:</span> {groupMemberCount}</p>
              <p><span className="text-gray-500">Messages:</span> {groupMessageCount}</p>
              {latestMessage && (
                <p className="mt-1">
                  <span className="text-gray-500">Latest Message:</span>{" "}
                  <span className="text-gray-300 italic">{latestMessage.length > 50 ? `${latestMessage.substring(0, 50)}...` : latestMessage}</span>
                </p>
              )}
            </>
          )}
        </div>
        <Button
          className="w-full mt-3"
          size="sm"
          variant={joining || isRefreshing ? "outline" : "default"}
          onClick={isGroupJoined ? handleLeaveGroup : handleJoinGroup}
          disabled={joining || isRefreshing || !client}>
          {joining && isGroupJoined
            ? "Syncing Group Data..." 
            : joining 
              ? "Processing..." 
              : isRefreshing
                ? "Refreshing..."
                : isGroupJoined 
                  ? `Leave Group` 
                  : "Join Group Chat"}
        </Button>
        
        {/* Error Message */}
        {errorMessage && (
          <div className="text-red-500 text-sm mt-2 p-2 bg-red-900/20 rounded-md">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Group Chat Section - Only show when in a group */}
      {client && isGroupJoined && localGroupConversation && localGroupConversation.isActive && (
        <div className="w-full bg-gray-900 p-3 rounded-md">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-sm font-medium">Group Chat</h2>
            <span className="text-gray-400 text-xs">
              {localGroupConversation.name || "XMTP Group"}
            </span>
          </div>
          
          <div className="mt-3">
            <div className="relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full bg-gray-800 text-white p-2 pr-16 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending}
              />
              <Button
                size="sm"
                className="absolute right-1 top-1 h-7 text-xs"
                onClick={handleSendMessage}
                disabled={!message.trim() || sending}
              >
                {sending ? "..." : "Send"}
              </Button>
            </div>
            
            {sendError && (
              <div className="text-red-500 text-xs mt-2 p-2 bg-red-900/20 rounded-md">
                {sendError}
              </div>
            )}
            
            {lastSentMessage && (
              <div className="text-green-500 text-xs mt-2 p-2 bg-green-900/20 rounded-md">
                Message sent: {lastSentMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 