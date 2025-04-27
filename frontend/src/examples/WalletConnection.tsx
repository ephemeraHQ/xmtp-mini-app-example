"use client";

import { useCallback, useState, useEffect } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { injected, useConnect, useWalletClient, useAccount } from "wagmi";
import { mainnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { createSCWSigner, createEphemeralSigner, createEOASigner } from "@/lib/xmtp";

// Add Ethereum provider type
interface EthereumProvider {
  request: (args: {method: string, params?: any[]}) => Promise<any>;
  isMetaMask?: boolean;
}

// Extend window type to include ethereum
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

export default function WalletConnection() {
  const { initialize, initializing, client } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback((signer: any) => {
    void initialize({
      dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
      env: env.NEXT_PUBLIC_XMTP_ENV,
      loggingLevel: "off",
      signer,
    });
  }, [initialize]);

  // Load saved connection on mount
  useEffect(() => {
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (savedConnectionType) {
      setConnectionType(savedConnectionType);

      // For ephemeral wallets, reconnect immediately
      if (savedConnectionType === "Ephemeral Wallet") {
        const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
        if (savedPrivateKey) {
          try {
            // Format key properly
            const formattedKey = savedPrivateKey.startsWith('0x') 
              ? savedPrivateKey as `0x${string}` 
              : `0x${savedPrivateKey}` as `0x${string}`;
            
            // Create account from saved key
            const account = privateKeyToAccount(formattedKey);
            setEphemeralAddress(account.address);
            
            // Connect with ephemeral signer
            const ephemeralSigner = createEphemeralSigner(formattedKey);
            initializeXmtp(ephemeralSigner);
          } catch (error) {
            console.error("Error reconnecting ephemeral wallet:", error);
          }
        }
      } else if (savedConnectionType === "EOA Wallet" && window.ethereum) {
        // Try to reconnect EOA wallet
        window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
          if (accounts && accounts.length > 0) {
            connect({ connector: injected() });
          }
        }).catch(error => {
          console.error("Error checking for connected accounts:", error);
        });
      } else if (savedConnectionType === "Smart Contract Wallet" && window.ethereum) {
        // Try to reconnect SCW
        connect({ connector: injected() });
      }
    }
  }, [connect, initializeXmtp]);

  // Connect with EOA wallet (MetaMask)
  const connectWithEOA = useCallback(() => {
    setConnectionType("EOA Wallet");
    
    // For MetaMask, request accounts first to ensure proper connection
    if (window.ethereum?.isMetaMask) {
      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then(() => {
          // Save connection type
          localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
          
          // Connect with injected provider
          connect({ connector: injected() });
          
          // If wallet data is already available, initialize XMTP
          if (walletData) {
            const signer = createEOASigner(walletData.account.address, walletData);
            initializeXmtp(signer);
          }
        });
    } else {
      // Not MetaMask, connect directly
      localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
      connect({ connector: injected() });
    }
  }, [connect, walletData, initializeXmtp]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    setConnectionType("Ephemeral Wallet");
    
    // Generate a new private key
    const privateKey = generatePrivateKey();
    
    // Create account from private key
    const account = privateKeyToAccount(privateKey);
    setEphemeralAddress(account.address);
    
    // Save to localStorage
    localStorage.setItem(XMTP_EPHEMERAL_KEY, privateKey);
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Ephemeral Wallet");
    
    // Initialize XMTP with ephemeral signer
    const ephemeralSigner = createEphemeralSigner(privateKey);
    initializeXmtp(ephemeralSigner);
  }, [initializeXmtp]);

  // Connect with Smart Contract Wallet
  const connectWithSCW = useCallback(() => {
    setConnectionType("Smart Contract Wallet");
    
    // Save connection type
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Smart Contract Wallet");
    
    // Connect to wallet
    connect({ connector: injected() });
    
    // Initialize XMTP if wallet data is available
    if (walletData?.account) {
      initializeXmtp(
        createSCWSigner(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id),
        )
      );
    }
  }, [connect, initializeXmtp, walletData]);

  // Auto-initialize when wallet data becomes available
  useEffect(() => {
    if (connectionType === "EOA Wallet" && walletData && !client && !initializing) {
      const signer = createEOASigner(walletData.account.address, walletData);
      initializeXmtp(signer);
    } else if (connectionType === "Smart Contract Wallet" && walletData && !client && !initializing) {
      initializeXmtp(
        createSCWSigner(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id),
        )
      );
    }
  }, [connectionType, walletData, client, initializing, initializeXmtp]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full flex flex-col gap-3 mt-2">
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEOA}
          disabled={initializing}>
          {initializing && connectionType === "EOA Wallet" 
            ? "Connecting EOA Wallet..." 
            : "Connect with EOA Wallet"}
        </Button>
        
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEphemeral}
          disabled={initializing}>
          {initializing && connectionType === "Ephemeral Wallet" 
            ? "Connecting Ephemeral Wallet..." 
            : "Connect with Ephemeral Wallet"}
        </Button>
        
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithSCW}
          disabled={initializing}>
          {initializing && connectionType === "Smart Contract Wallet" 
            ? "Connecting Smart Contract Wallet..." 
            : "Connect with Smart Contract Wallet"}
        </Button>
      </div>
      
      {/* Connection Status */}
      {connectionType && (
        <div className="w-full bg-gray-900 p-3 rounded-md">
          <h2 className="text-white text-sm font-medium">Connection Status</h2>
          <div className="text-gray-400 text-xs mt-1">
            <p><span className="text-gray-500">Type:</span> {connectionType}</p>
            {connectionType === "Ephemeral Wallet" && ephemeralAddress && (
              <p><span className="text-gray-500">Address:</span> {ephemeralAddress}</p>
            )}
            {connectionType === "EOA Wallet" && walletData && (
              <p><span className="text-gray-500">Address:</span> {walletData.account.address}</p>
            )}
            {initializing && <p className="text-yellow-500">Connecting to XMTP...</p>}
            {client && <p className="text-green-500">Connected</p>}
          </div>
        </div>
      )}
    </div>
  );
}