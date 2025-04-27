"use client";

import { useCallback, useState, useEffect } from "react";
import { Group } from "@xmtp/browser-sdk";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";

export default function GroupManagement() {
  const { client, conversations, setConversations, setGroupConversation } = useXMTP();
  
  // Group Chat State
  const [joining, setJoining] = useState(false);
  const [isGroupJoined, setIsGroupJoined] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupConversation, setLocalGroupConversation] = useState<Group | null>(null);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMessageCount, setGroupMessageCount] = useState(0);
  const [latestMessage, setLatestMessage] = useState<string | null>(null);

  // Message sending state
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);

  // Update the context whenever the local group conversation changes
  useEffect(() => {
    setGroupConversation(groupConversation);
  }, [groupConversation, setGroupConversation]);

  // Fetch group ID and check membership
  const fetchGroupData = useCallback(async () => {
    if (!client || !client.inboxId || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Sync conversations to ensure we have the latest data
      await client.conversations.sync();
      
      // Get group info from API
      const response = await fetch(`/api/proxy/get-group-id?inboxId=${client.inboxId}`);
      const data = await response.json();
      
      const groupId = data.groupId;
      const isMember = data.isMember;
      
      setIsGroupJoined(isMember);

      if (!isMember || !groupId) {
        setLocalGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setLatestMessage(null);
        setIsRefreshing(false);
        return;
      }
      
      // Find the group in existing conversations
      let group = conversations.find(conv => conv.id === groupId) as Group | undefined;

      if (!group) {
        // If not found, refresh conversations and try again
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        
        group = newConversations.find(conv => conv.id === groupId) as Group | undefined;
      }
      
      if (group && group.isActive) {
        setLocalGroupConversation(group);
        
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
    } catch (error) {
      console.error("Error fetching group data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [client, conversations, isRefreshing, setConversations]);

  // Fetch group data when client is available
  useEffect(() => {
    if (client && client.inboxId) {
      fetchGroupData();
    }
  }, [client?.inboxId]);

  // Join group handler
  const handleJoinGroup = async () => {
    if (!client) return;

    setJoining(true);
    
    try {
      const response = await fetch(`/api/proxy/add-inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxId: client.inboxId }),
      });
      
      const data = await response.json();

      if (data.success) {
        setIsGroupJoined(true);
        
        // Sync after joining
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        
        // Refresh group data
        await fetchGroupData();
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
      const response = await fetch(`/api/proxy/remove-inbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxId: client.inboxId }),
      });
      
      const data = await response.json();

      if (data.success) {
        // Update state after leaving
        await client.conversations.sync();
        const newConversations = await client.conversations.list();
        setConversations(newConversations);
        
        setIsGroupJoined(false);
        setLocalGroupConversation(null);
        setGroupMemberCount(0);
        setGroupMessageCount(0);
        setLatestMessage(null);
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
    
    await fetchGroupData();
  };

  // Message sending handler
  const handleSendMessage = async () => {
    if (!client || !groupConversation || !message.trim()) return;

    setSending(true);
    
    try {
      // Send the message to the group
      await groupConversation.send(message);
      
      // Update message count and latest message
      setGroupMessageCount(prev => prev + 1);
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
            disabled={isRefreshing}
            className="h-7 text-xs">
            {isRefreshing ? "..." : "Refresh"}
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
          {isGroupJoined && groupConversation && (
            <>
              <p><span className="text-gray-500">Group Name:</span> {groupConversation.name || "XMTP Group"}</p>
              <p><span className="text-gray-500">Group ID:</span> {groupConversation.id.slice(0, 8)}...{groupConversation.id.slice(-8)}</p>
              <p><span className="text-gray-500">Members:</span> {groupMemberCount}</p>
              <p><span className="text-gray-500">Messages:</span> {groupMessageCount}</p>
              {latestMessage && (
                <p className="mt-1">
                  <span className="text-gray-500">Latest Message:</span>{" "}
                  <span className="text-gray-300 italic">
                    {latestMessage.length > 50 ? `${latestMessage.substring(0, 50)}...` : latestMessage}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
        <Button
          className="w-full mt-3"
          size="sm"
          onClick={isGroupJoined ? handleLeaveGroup : handleJoinGroup}
          disabled={joining || isRefreshing || !client}>
          {joining ? "Processing..." : isRefreshing ? "Refreshing..." : isGroupJoined ? "Leave Group" : "Join Group Chat"}
        </Button>
      </div>

      {/* Group Chat Section - Only show when in a group */}
      {client && isGroupJoined && groupConversation && groupConversation.isActive && (
        <div className="w-full bg-gray-900 p-3 rounded-md">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-sm font-medium">Group Chat</h2>
            <span className="text-gray-400 text-xs">
              {groupConversation.name || "XMTP Group"}
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