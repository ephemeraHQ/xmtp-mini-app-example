"use client";

import { useEffect, useState } from "react";
import { privateKeyToAccount } from "viem/accounts";
import { useAccount } from "wagmi";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";

// Constants for local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

interface ConnectionInfoProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export default function ConnectionInfo({
  onConnectionChange,
}: ConnectionInfoProps) {
  const { client, conversations } = useXMTP();
  const { isConnected, address, connector } = useAccount();
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const [isActuallyConnected, setIsActuallyConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string>("");
  const [walletInfo, setWalletInfo] = useState<{
    provider?: string;
    isInApp?: boolean;
    isCoinbase?: boolean;
    isSCW?: boolean;
    injectors?: string[];
  }>({});

  // Detect wallet environment and injectors
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch("/api/proxy/health");
        const data = await response.json();
        console.log("Backend health:", data);
        setBackendStatus(data.status === "ok" ? "online" : "offline");
      } catch (error) {
        console.error("Error checking backend health:", error);
        setBackendStatus("offline");
      }
    };
    const detectEnvironment = () => {
      const info: {
        provider?: string;
        isInApp?: boolean;
        isCoinbase?: boolean;
        isSCW?: boolean;
        injectors?: string[];
      } = {
        injectors: [],
      };

      // Detect available ethereum providers
      if (typeof window !== "undefined") {
        // Check for Coinbase Wallet
        if (window.ethereum?.isCoinbaseWallet) {
          info.isCoinbase = true;
          info.provider = "Coinbase Wallet";
        }

        // Check for mobile browser/in-app browser
        const userAgent =
          navigator.userAgent || navigator.vendor || (window as any).opera;
        if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
          info.isInApp = true;
        }

        // Detect available injected providers
        if (window.ethereum) {
          info.injectors?.push("ethereum");

          // Check for specific provider properties
          if (window.ethereum.isMetaMask) info.injectors?.push("MetaMask");
          if (window.ethereum.isCoinbaseWallet)
            info.injectors?.push("CoinbaseWallet");
          if (window.ethereum.isWalletConnect)
            info.injectors?.push("WalletConnect");

          // Check for Smart Contract Wallet indicators
          try {
            // Many SCWs expose a specific method or property
            if (
              window.ethereum._addresses &&
              window.ethereum._addresses.length > 0
            ) {
              info.isSCW = true;
            }
            // Specific check for Coinbase Smart Wallet
            if (
              window.ethereum.isCoinbaseWallet &&
              window.ethereum.isSmartContractWallet
            ) {
              info.isSCW = true;
            }
          } catch (error) {
            console.log("Error checking for SCW:", error);
          }
        }

        // Additional window injectors
        for (const key in window) {
          if (
            key.includes("ethereum") ||
            key.includes("wallet") ||
            key.includes("solana") ||
            key.includes("phantom")
          ) {
            info.injectors?.push(key);
          }
        }
      }

      // Log connector info
      if (connector) {
        info.provider = connector.name || info.provider;
        console.log("Connector details:", {
          name: connector.name,
          id: connector.id,
          type: connector.type,
        });
      }

      console.log("Wallet environment detected:", info);
      setWalletInfo(info);
    };

    detectEnvironment();
    checkBackendHealth();
  }, [connector]);

  // Get ephemeral wallet address if available
  useEffect(() => {
    try {
      const savedConnectionType = localStorage.getItem(
        XMTP_CONNECTION_TYPE_KEY,
      );
      const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);

      if (savedConnectionType === "Ephemeral Wallet" && savedPrivateKey) {
        const formattedKey = savedPrivateKey.startsWith("0x")
          ? (savedPrivateKey as `0x${string}`)
          : (`0x${savedPrivateKey}` as `0x${string}`);

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
        const savedConnectionType = localStorage.getItem(
          XMTP_CONNECTION_TYPE_KEY,
        );
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
    const newConnectionState =
      isConnected ||
      (client &&
        connectionType === "Ephemeral Wallet" &&
        ephemeralAddress !== "");

    setIsActuallyConnected(newConnectionState || false);

    if (typeof onConnectionChange === "function") {
      onConnectionChange(newConnectionState || false);
    }
  }, [
    isConnected,
    client,
    connectionType,
    ephemeralAddress,
    onConnectionChange,
  ]);

  return (
    <div className="w-full bg-gray-900 p-3 rounded-md">
      <h2 className="text-white text-sm font-medium">Connection Status</h2>
      <div className="text-gray-400 text-xs mt-1">
        <p>
          <span className="text-gray-500">Connected:</span>{" "}
          {isActuallyConnected ? "Yes" : "No"}
        </p>
        <p>
          <span className="text-gray-500">Type:</span>{" "}
          {connectionType || "Not connected"}
        </p>
        <p>
          <span className="text-gray-500">Address:</span>{" "}
          {connectionType === "Ephemeral Wallet" && ephemeralAddress
            ? `${ephemeralAddress}`
            : address
              ? `${address}`
              : "None"}
        </p>
        {connector && (
          <p>
            <span className="text-gray-500">Connector:</span> {connector.name} (
            {connector.type})
          </p>
        )}
        {walletInfo.provider && (
          <p>
            <span className="text-gray-500">Provider:</span>{" "}
            {walletInfo.provider}
          </p>
        )}
        {walletInfo.isCoinbase && (
          <p>
            <span className="text-gray-500">Coinbase Wallet:</span> Yes
          </p>
        )}
        {walletInfo.isSCW !== undefined && (
          <p>
            <span className="text-gray-500">Smart Contract Wallet:</span>{" "}
            {walletInfo.isSCW ? "Yes" : "No"}
          </p>
        )}
        {walletInfo.isInApp && (
          <p>
            <span className="text-gray-500">In-App Browser:</span> Yes
          </p>
        )}
        {walletInfo.injectors && walletInfo.injectors.length > 0 && (
          <p>
            <span className="text-gray-500">Injectors:</span>{" "}
            {walletInfo.injectors.slice(0, 3).join(", ")}
            {walletInfo.injectors.length > 3 ? "..." : ""}
          </p>
        )}
        {client && (
          <p>
            <span className="text-gray-500">XMTP:</span>{" "}
            <span className="text-green-500">Connected</span>
          </p>
        )}
        {client && (
          <p>
            <span className="text-gray-500">Environment:</span>{" "}
            {env.NEXT_PUBLIC_XMTP_ENV}
          </p>
        )}
        {client && (
          <p>
            <span className="text-gray-500">Inbox ID:</span>{" "}
            {client.inboxId
              ? `${client.inboxId.slice(0, 6)}...${client.inboxId.slice(-6)}`
              : "None"}
          </p>
        )}
        {client && (
          <p>
            <span className="text-gray-500">Conversations:</span>{" "}
            {conversations.length}
          </p>
        )}
        <p>
          <span className="text-gray-500">Backend:</span>{" "}
          {backendStatus === "online" ? (
            <span className="text-green-500">Online</span>
          ) : backendStatus === "offline" ? (
            <span className="text-red-500">Offline</span>
          ) : (
            <span className="text-yellow-500">Checking...</span>
          )}
        </p>
      </div>
    </div>
  );
}
