"use client";

import { useCallback, useState, useEffect, useRef } from "react";
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
const METAMASK_CONNECTION_PENDING = "metamask_connection_pending";

export default function WalletConnection() {
  const { initialize, initializing, client } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const connectionAttemptedRef = useRef(false);

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback((signer: any) => {
    void initialize({
      dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
      env: env.NEXT_PUBLIC_XMTP_ENV,
      loggingLevel: "off",
      signer,
    });
  }, [initialize]);

  // Helper function to check if connection is already pending
  const checkConnectionPending = (): boolean => {
    return sessionStorage.getItem(METAMASK_CONNECTION_PENDING) === 'true';
  };

  // Helper function to set connection pending state
  const setConnectionPending = (isPending: boolean): void => {
    if (isPending) {
      sessionStorage.setItem(METAMASK_CONNECTION_PENDING, 'true');
    } else {
      sessionStorage.removeItem(METAMASK_CONNECTION_PENDING);
    }
  };

  // Helper function to safely request accounts - wrapped in useCallback
  const safeRequestAccounts = useCallback(async () => {
    if (checkConnectionPending() || !window.ethereum) {
      return null;
    }

    try {
      setConnectionPending(true);
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      // Only proceed with wallet_requestPermissions if we don't have accounts
      if (!accounts || accounts.length === 0) {
        return await window.ethereum.request({ 
          method: 'wallet_requestPermissions', 
          params: [{ eth_accounts: {} }] 
        }).then(() => {
          return window.ethereum!.request({ method: 'eth_requestAccounts' });
        });
      }
      
      return accounts;
    } catch (error) {
      console.error("Error requesting accounts:", error);
      return null;
    } finally {
      setConnectionPending(false);
    }
  }, []);

  // Load saved connection on mount
  useEffect(() => {
    // Prevent multiple connection attempts during a session
    if (connectionAttemptedRef.current) return;
    connectionAttemptedRef.current = true;

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
        // Add a small delay before auto-connecting
        const timer = setTimeout(() => {
          // Try to reconnect EOA wallet with the safer approach
          safeRequestAccounts().then(accounts => {
            if (accounts && accounts.length > 0) {
              connect({ connector: injected() });
            }
          });
        }, 300);
        
        return () => clearTimeout(timer);
      } else if (savedConnectionType === "Smart Contract Wallet" && window.ethereum) {
        // Add a small delay for SCW connection too
        const timer = setTimeout(() => {
          // Try to reconnect SCW
          connect({ connector: injected() });
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [connect, initializeXmtp, safeRequestAccounts]);

  // Connect with EOA wallet (MetaMask)
  const connectWithEOA = useCallback(() => {
    setConnectionType("EOA Wallet");
    
    // For MetaMask, request accounts with safeguards
    if (window.ethereum?.isMetaMask) {
      safeRequestAccounts()
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            // Save connection type
            localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
            
            // Connect with injected provider
            connect({ connector: injected() });
            
            // If wallet data is already available, initialize XMTP
            if (walletData) {
              const signer = createEOASigner(walletData.account.address, walletData);
              initializeXmtp(signer);
            }
          }
        });
    } else {
      // Not MetaMask, connect directly
      localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
      connect({ connector: injected() });
    }
  }, [connect, walletData, initializeXmtp, safeRequestAccounts]);

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
    </div>
  );
}