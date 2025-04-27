import { useState } from "react";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";

type GroupMember = {
  inboxId: string;
  displayInboxId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

type GroupMessage = {
  id: string;
  content: string;
  sentAt: string;
  senderInboxId: string;
  displaySenderId: string;
};

type GroupData = {
  groupId: string;
  groupName: string;
  members: GroupMember[];
  lastMessage: GroupMessage | null;
  memberCount: number;
  messageCount: number;
};

export default function BackendInfo() {
  const { client } = useXMTP();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendInfo, setBackendInfo] = useState<GroupData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch group info from backend
  const handleRefresh = async () => {
    if (!client || !client.inboxId) return;
    
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      
      // This endpoint would return group data from your backend
      const response = await fetch(
        `/api/proxy/get-group-id?inboxId=${client.inboxId}`,
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group info: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate the data before setting it
      if (data && typeof data === 'object') {
        setBackendInfo(data);
      } else {
        throw new Error("Received invalid data format from backend");
      }
    } catch (error) {
      console.error("Error fetching backend info:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to fetch backend info");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full bg-gray-900 p-3 rounded-md">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-sm font-medium">Backend Server Info</h2>
        <Button
          size="sm"
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing || !client}
          className="h-7 text-xs">
          {isRefreshing ? "..." : "Refresh"}
        </Button>
      </div>
      
      {!backendInfo ? (
        <div className="text-gray-400 text-xs mt-2">
          {client ? (
            <p>Click refresh to load group data from backend</p>
          ) : (
            <p>Connect to XMTP first to load group data</p>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-xs mt-1">
          <p><span className="text-gray-500">Server Group ID:</span> {
            backendInfo.groupId
              ? `${backendInfo.groupId.slice(0, 8)}...${backendInfo.groupId.slice(-8)}` 
              : "None"
          }</p>
          <p><span className="text-gray-500">Group Name:</span> {
            backendInfo.groupName || "Unnamed Group"
          }</p>
          <p><span className="text-gray-500">Total Members:</span> {backendInfo.memberCount || 0}</p>
          <p><span className="text-gray-500">Total Messages:</span> {backendInfo.messageCount || 0}</p>
          
          {/* Last message display */}
          {backendInfo.lastMessage && (
            <div className="mt-2 p-2 bg-gray-800 rounded-md">
              <p className="text-sm font-medium text-gray-300">Last Message</p>
              <p className="text-xs text-green-400">{
                backendInfo.lastMessage.displaySenderId || "Unknown sender"
              }</p>
              <p className="text-xs text-white mt-1">{
                backendInfo.lastMessage.content || "No content"
              }</p>
              <p className="text-xs text-gray-500 mt-1">
                {backendInfo.lastMessage.sentAt
                  ? new Date(backendInfo.lastMessage.sentAt).toLocaleString()
                  : "Unknown time"
                }
              </p>
            </div>
          )}
          
          {/* Members list collapsible */}
          {backendInfo.members && backendInfo.members.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm font-medium text-gray-300 cursor-pointer">
                Members ({backendInfo.members.length})
              </summary>
              <ul className="mt-1 ml-2">
                {backendInfo.members.map((member, index) => (
                  <li key={index} className="text-xs flex items-center gap-2">
                    <span className="text-gray-400">{member.displayInboxId || "Unknown member"}</span>
                    {member.isAdmin && <span className="text-xs text-blue-400">Admin</span>}
                    {member.isSuperAdmin && <span className="text-xs text-purple-400">Super Admin</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      
      {/* Error Message */}
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2 p-2 bg-red-900/20 rounded-md">
          {errorMessage}
        </div>
      )}
    </div>
  );
} 