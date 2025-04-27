"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";

export default function ConnectionInfo() {
  const { client, conversations } = useXMTP();
  const { isConnected, address } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");

  // This would be set by the parent component in a real implementation
  useEffect(() => {
    // Detect connection type based on client properties
    if (client) {
      if (address) {
        setConnectionType("EOA Wallet");
      } else {
        setConnectionType("Ephemeral Wallet");
      }
    }
  }, [client, address]);

  const handleManualRefresh = async () => {
    if (!client) return;
    
    try {
      setIsRefreshing(true);
      console.log("Manual refresh requested");
      
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Refreshed");
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full bg-gray-900 p-3 rounded-md">
      <div className="flex justify-between items-center">
        <h2 className="text-white text-sm font-medium">Connection Status</h2>
        {client && (
          <Button
            size="sm"
            variant="outline" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-7 text-xs">
            {isRefreshing ? "..." : "Refresh"}
          </Button>
        )}
      </div>
      <div className="text-gray-400 text-xs mt-1">
        <p><span className="text-gray-500">Connected:</span> {isConnected ? "Yes" : "No"}</p>
        <p><span className="text-gray-500">Type:</span> {connectionType || "Not connected"}</p>
        <p><span className="text-gray-500">Address:</span> {
          connectionType === "Ephemeral Wallet" && ephemeralAddress 
            ? `${ephemeralAddress}` 
            : address 
              ? `${address}` 
              : "None"
        }</p>
        {client && <p><span className="text-gray-500">XMTP:</span> <span className="text-green-500">Connected</span></p>}
        {client && <p><span className="text-gray-500">Environment:</span> {env.NEXT_PUBLIC_XMTP_ENV}</p>}
        {client && <p><span className="text-gray-500">Inbox ID:</span> {client.inboxId ? `${client.inboxId.slice(0, 6)}...${client.inboxId.slice(-6)}` : "None"}</p>}
        {client && <p><span className="text-gray-500">Conversations:</span> {conversations.length}</p>}
      </div>
    </div>
  );
} 