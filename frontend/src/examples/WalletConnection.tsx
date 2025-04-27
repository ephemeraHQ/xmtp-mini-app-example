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

// Extend window type with ethereum property that matches global Window type
declare global {
  interface Window {
    ethereum?: any; // Use any type to avoid conflicts with existing declarations
  }
}

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";
const METAMASK_CONNECTION_PENDING = "metamask_connection_pending";
const XMTP_INITIALIZATION_IN_PROGRESS = "xmtp:initialization_in_progress";
const WALLET_CONNECTED_WAITING_FOR_DATA = "xmtp:wallet_connected_waiting";

export default function WalletConnection() {
  const { initialize, initializing, client } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const connectionAttemptedRef = useRef(false);
  const xmtpInitializedRef = useRef(false);
  const pendingConnectionRef = useRef<string | null>(null);

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback(async (signer: any) => {
    // Check if initialization is already in progress
    if (xmtpInitializedRef.current || sessionStorage.getItem(XMTP_INITIALIZATION_IN_PROGRESS) === 'true') {
      console.log("XMTP initialization already in progress, skipping duplicate call");
      return;
    }
    
    // Set flag to prevent multiple initializations
    xmtpInitializedRef.current = true;
    sessionStorage.setItem(XMTP_INITIALIZATION_IN_PROGRESS, 'true');
    
    try {
      console.log("Initializing XMTP with signer");
      await initialize({
        dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
        env: env.NEXT_PUBLIC_XMTP_ENV,
        loggingLevel: "off",
        signer,
      });
      console.log("XMTP initialization successful");
      
      // Clear any pending connection flag
      pendingConnectionRef.current = null;
      sessionStorage.removeItem(WALLET_CONNECTED_WAITING_FOR_DATA);
    } catch (error) {
      console.error("XMTP initialization failed:", error);
    } finally {
      // Clear the initialization flag only after completion
      sessionStorage.removeItem(XMTP_INITIALIZATION_IN_PROGRESS);
    }
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

    // Clear initialization flags on component mount
    sessionStorage.removeItem(XMTP_INITIALIZATION_IN_PROGRESS);
    sessionStorage.removeItem(WALLET_CONNECTED_WAITING_FOR_DATA);
    xmtpInitializedRef.current = false;
    pendingConnectionRef.current = null;

    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (savedConnectionType) {
      console.log(`Restoring saved connection type: ${savedConnectionType}, isConnected: ${isConnected}`);
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
      } else if (savedConnectionType === "EOA Wallet") {
        if (isConnected && walletData) {
          // If wallet is already connected, initialize XMTP directly
          console.log("Wallet already connected, initializing XMTP with existing wallet data");
          const signer = createEOASigner(walletData.account.address, walletData);
          initializeXmtp(signer);
        } else if (window.ethereum && !isConnected) {
          // Only try to reconnect EOA wallet if not already connected
          console.log("Attempting to reconnect EOA wallet");
          const timer = setTimeout(() => {
            // Try to reconnect EOA wallet with the safer approach
            safeRequestAccounts().then(accounts => {
              if (accounts && accounts.length > 0) {
                console.log("Accounts found, connecting to EOA wallet");
                // Set pending connection type before connecting
                pendingConnectionRef.current = "EOA Wallet";
                sessionStorage.setItem(WALLET_CONNECTED_WAITING_FOR_DATA, "EOA Wallet");
                connect({ connector: injected() });
              }
            });
          }, 300);
          
          return () => clearTimeout(timer);
        }
      } else if (savedConnectionType === "Smart Contract Wallet") {
        if (isConnected && walletData) {
          // If wallet is already connected, initialize XMTP directly
          console.log("SCW already connected, initializing XMTP with existing wallet data");
          initializeXmtp(
            createSCWSigner(
              walletData.account.address,
              walletData,
              BigInt(mainnet.id),
            )
          );
        } else if (window.ethereum && !isConnected) {
          // Only try to reconnect SCW if not already connected
          console.log("Attempting to reconnect Smart Contract Wallet");
          const timer = setTimeout(() => {
            // Set pending connection type before connecting
            pendingConnectionRef.current = "Smart Contract Wallet";
            sessionStorage.setItem(WALLET_CONNECTED_WAITING_FOR_DATA, "Smart Contract Wallet");
            // Try to reconnect SCW
            connect({ connector: injected() });
          }, 300);
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [connect, initializeXmtp, safeRequestAccounts, isConnected, walletData]);

  // Connect with EOA wallet (MetaMask)
  const connectWithEOA = useCallback(() => {
    if (initializing) {
      console.log("XMTP initialization already in progress, ignoring connection attempt");
      return;
    }
    
    setConnectionType("EOA Wallet");
    console.log("Connecting with EOA wallet, isConnected:", isConnected);
    
    // For MetaMask, request accounts with safeguards
    if (window.ethereum?.isMetaMask) {
      if (isConnected && walletData) {
        console.log("Already connected, initializing XMTP with existing wallet data");
        localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
        
        const signer = createEOASigner(walletData.account.address, walletData);
        initializeXmtp(signer);
        return;
      }
      
      safeRequestAccounts()
        .then(accounts => {
          if (accounts && accounts.length > 0) {
            console.log("Accounts found, connecting to wallet");
            // Save connection type
            localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
            
            // Set pending connection type before connecting
            pendingConnectionRef.current = "EOA Wallet";
            sessionStorage.setItem(WALLET_CONNECTED_WAITING_FOR_DATA, "EOA Wallet");
            
            // Connect with injected provider
            connect({ connector: injected() });
          }
        });
    } else {
      // Not MetaMask, connect directly
      localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
      if (!isConnected) {
        // Set pending connection type before connecting
        pendingConnectionRef.current = "EOA Wallet";
        sessionStorage.setItem(WALLET_CONNECTED_WAITING_FOR_DATA, "EOA Wallet");
        connect({ connector: injected() });
      } else if (walletData) {
        const signer = createEOASigner(walletData.account.address, walletData);
        initializeXmtp(signer);
      }
    }
  }, [connect, walletData, initializeXmtp, safeRequestAccounts, isConnected, initializing]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    if (initializing) {
      console.log("XMTP initialization already in progress, ignoring connection attempt");
      return;
    }
    
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
  }, [initializeXmtp, initializing]);

  // Connect with Smart Contract Wallet
  const connectWithSCW = useCallback(() => {
    if (initializing) {
      console.log("XMTP initialization already in progress, ignoring connection attempt");
      return;
    }
    
    setConnectionType("Smart Contract Wallet");
    console.log("Connecting with Smart Contract Wallet, isConnected:", isConnected);
    
    // Save connection type
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Smart Contract Wallet");
    
    if (!isConnected) {
      // Set pending connection type before connecting
      pendingConnectionRef.current = "Smart Contract Wallet";
      sessionStorage.setItem(WALLET_CONNECTED_WAITING_FOR_DATA, "Smart Contract Wallet");
      // Connect to wallet
      connect({ connector: injected() });
    } else if (walletData?.account) {
      // Initialize XMTP if already connected and have wallet data
      initializeXmtp(
        createSCWSigner(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id),
        )
      );
    }
  }, [connect, initializeXmtp, walletData, isConnected, initializing]);

  // Watch for wallet data becoming available to complete initialization
  useEffect(() => {
    // Skip if we don't have wallet data or if client already exists or initializing
    if (!walletData || client || initializing || xmtpInitializedRef.current) {
      return;
    }
    
    // Check if we have a pending connection that needs to be completed
    const pendingType = pendingConnectionRef.current || sessionStorage.getItem(WALLET_CONNECTED_WAITING_FOR_DATA);
    
    if (!pendingType) {
      return;
    }
    
    console.log(`Wallet data available, completing initialization for ${pendingType}`);
    
    if (pendingType === "EOA Wallet") {
      const signer = createEOASigner(walletData.account.address, walletData);
      initializeXmtp(signer);
    } else if (pendingType === "Smart Contract Wallet") {
      initializeXmtp(
        createSCWSigner(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id),
        )
      );
    }
    
    // Clear the pending connection flag
    pendingConnectionRef.current = null;
    sessionStorage.removeItem(WALLET_CONNECTED_WAITING_FOR_DATA);
    
  }, [walletData, client, initializing, initializeXmtp]);

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