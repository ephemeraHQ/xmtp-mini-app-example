"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
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
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const [isActuallyConnected, setIsActuallyConnected] = useState(false);

  // Get ephemeral wallet address if available
  useEffect(() => {
    try {
      const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
      
      if (savedConnectionType === "Ephemeral Wallet" && savedPrivateKey) {
        const formattedKey = savedPrivateKey.startsWith('0x') 
          ? savedPrivateKey as `0x${string}` 
          : `0x${savedPrivateKey}` as `0x${string}`;
        
        const account = privateKeyToAccount(formattedKey);
        setEphemeralAddress(account.address);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, []);

  // Detect connection type
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

  // Determine actual connection status
  useEffect(() => {
    const newConnectionState = isConnected || 
      (client && connectionType === "Ephemeral Wallet" && ephemeralAddress !== "");
    
    setIsActuallyConnected(newConnectionState || false);
    
    if (typeof onConnectionChange === 'function') {
      onConnectionChange(newConnectionState || false);
    }
  }, [isConnected, client, connectionType, ephemeralAddress, onConnectionChange]);

  return (
    <div className="w-full bg-gray-900 p-3 rounded-md">
      <h2 className="text-white text-sm font-medium">Connection Status</h2>
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