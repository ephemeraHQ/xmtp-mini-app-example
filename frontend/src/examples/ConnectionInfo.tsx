"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { privateKeyToAccount } from "viem/accounts";

// Constants for local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

interface ConnectionInfoProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export default function ConnectionInfo({ onConnectionChange }: ConnectionInfoProps) {
  const { client, conversations } = useXMTP();
  const { isConnected, address } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const [isActuallyConnected, setIsActuallyConnected] = useState(false);

  // Get ephemeral wallet address from localStorage if available
  useEffect(() => {
    try {
      const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
      
      if (savedConnectionType === "Ephemeral Wallet" && savedPrivateKey) {
        try {
          // Format the key properly
          const formattedKey = savedPrivateKey.startsWith('0x') 
            ? savedPrivateKey as `0x${string}` 
            : `0x${savedPrivateKey}` as `0x${string}`;
          
          // Get the account address
          const account = privateKeyToAccount(formattedKey);
          setEphemeralAddress(account.address);
        } catch (error) {
          console.error("Error retrieving ephemeral address:", error);
        }
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, []);

  // Detect connection type based on client properties and localStorage
  useEffect(() => {
    if (client) {
      try {
        const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
        if (savedConnectionType) {
          setConnectionType(savedConnectionType);
        } else if (address) {
          setConnectionType("EOA Wallet");
        } else {
          setConnectionType("Ephemeral Wallet");
        }
      } catch (error) {
        console.error("Error reading connection type:", error);
      }
    }
  }, [client, address]);

  // Determine actual connection status - consider both normal and ephemeral connections
  useEffect(() => {
    const isEphemeralConnected = 
      client && 
      connectionType === "Ephemeral Wallet" && 
      ephemeralAddress !== "";
      
    const newConnectionState = isConnected || Boolean(isEphemeralConnected);
    setIsActuallyConnected(newConnectionState);
    
    // Notify parent component about connection status changes
    if (typeof onConnectionChange === 'function') {
      onConnectionChange(newConnectionState);
    }
  }, [isConnected, client, connectionType, ephemeralAddress, onConnectionChange]);

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
        <p><span className="text-gray-500">Connected:</span> {isActuallyConnected ? "Yes" : "No"}</p>
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