"use client";

import { useCallback, useState, useEffect } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { mainnet } from "viem/chains";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { createOnchainKitSigner } from "@/lib/xmtp";

// OnchainKit imports
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Address, Identity } from "@coinbase/onchainkit/identity";
import { useAccount, useSignMessage } from "wagmi";

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_INITIALIZING = "xmtp:initializing";
const XMTP_INIT_TIMESTAMP = "xmtp:initTimestamp";

export default function WalletConnection() {
  const { initialize, initializing, client, error } = useXMTP();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [localInitializing, setLocalInitializing] = useState(false);

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback(async (signer: any) => {
    // Prevent duplicate initialization
    if (initializing || localInitializing) {
      console.log("XMTP initialization already in progress");
      return;
    }
    
    // Check for stale initialization flag
    const initTimestamp = sessionStorage.getItem(XMTP_INIT_TIMESTAMP);
    if (initTimestamp) {
      const now = Date.now();
      const elapsed = now - parseInt(initTimestamp, 10);
      
      // If it's been more than 30 seconds, clear the flag
      if (elapsed > 30000) {
        console.log("Clearing stale initialization flag");
        sessionStorage.removeItem(XMTP_INITIALIZING);
        sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);
      } else if (sessionStorage.getItem(XMTP_INITIALIZING) === 'true') {
        console.log("XMTP initialization flag active and recent");
        return;
      }
    }
    
    // Set initializing flags
    setLocalInitializing(true);
    sessionStorage.setItem(XMTP_INITIALIZING, 'true');
    sessionStorage.setItem(XMTP_INIT_TIMESTAMP, Date.now().toString());
    
    try {
      console.log("Initializing XMTP with signer");
      await initialize({
        dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
        env: env.NEXT_PUBLIC_XMTP_ENV,
        loggingLevel: "off",
        signer,
      });
    } catch (error) {
      console.error("Error initializing XMTP:", error);
      
      // If there was a signature error, clear stored connection type to prevent loops
      if (error && (error as any).message?.includes("Signature")) {
        console.log("Signature error detected, clearing connection type to prevent loops");
        localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
        setConnectionType("");
      }
    } finally {
      // Clear initializing flags
      sessionStorage.removeItem(XMTP_INITIALIZING);
      sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);
      setLocalInitializing(false);
    }
  }, [initialize, initializing]);

  // Effect to initialize XMTP when Smart Contract Wallet is connected
  useEffect(() => {
    // If no address or signer, or already initialized, skip
    if (!address || !signMessageAsync || initializing || localInitializing || client) return;
    
    // Check if we should initialize with Smart Contract Wallet
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (savedConnectionType === "Smart Contract Wallet") {
      console.log("Initializing with Smart Contract Wallet", address);
      
      const signer = createOnchainKitSigner(
        address,
        signMessageAsync,
        BigInt(mainnet.id)
      );
      
      initializeXmtp(signer);
    }
  }, [address, signMessageAsync, client, initializeXmtp, initializing, localInitializing]);

  // Comprehensive watcher for wallet connection state changes
  useEffect(() => {
    // If wallet is connected, XMTP is not initialized, and we're not currently initializing
    if (address && signMessageAsync && !client && !initializing && !localInitializing) {
      // Only proceed if we have a saved connection type
      const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      if (savedConnectionType === "Smart Contract Wallet") {
        console.log("Wallet detected but XMTP not initialized, attempting initialization", {
          address,
          connectionType: savedConnectionType,
        });
        
        const signer = createOnchainKitSigner(
          address,
          signMessageAsync,
          BigInt(mainnet.id)
        );
        
        // Delay slightly to avoid potential race conditions
        setTimeout(() => {
          initializeXmtp(signer);
        }, 500);
      }
    }
  }, [address, signMessageAsync, client, initializing, localInitializing, initializeXmtp]);

  // This is called when the wallet connects via OnchainKit
  const handleWalletConnect = useCallback(async () => {
    console.log("Smart Contract Wallet connected through OnchainKit");
    setConnectionType("Smart Contract Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Smart Contract Wallet");
    
    // Check if we can initialize immediately
    if (address && signMessageAsync && !initializing && !localInitializing && !client) {
      console.log("Initializing XMTP immediately after wallet connection", address);
      try {
        const signer = createOnchainKitSigner(
          address,
          signMessageAsync,
          BigInt(mainnet.id)
        );
        
        await initializeXmtp(signer);
      } catch (error) {
        console.error("Error initializing with Smart Contract Wallet:", error);
      }
    } else {
      console.log("Will initialize XMTP when address becomes available", {
        hasAddress: !!address,
        hasSignMessage: !!signMessageAsync,
        isInitializing: initializing || localInitializing,
        hasClient: !!client
      });
    }
  }, [address, signMessageAsync, client, initializeXmtp, initializing, localInitializing]);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Connect Your Smart Contract Wallet</h2>
          <p className="text-sm text-gray-600">
            Connect your Smart Contract Wallet to start using XMTP messaging
          </p>
        </div>
        
        <div className="w-full p-4 bg-white rounded-xl shadow-md">
          <Wallet>
            <ConnectWallet 
              disconnectedLabel="Connect Smart Contract Wallet"
              className="w-full py-3 px-4 rounded-xl font-medium text-base bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              onConnect={handleWalletConnect}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6" />
                <Name />
              </div>
            </ConnectWallet>
            <WalletDropdown>
              <Identity 
                className="px-4 pt-3 pb-2 hover:bg-gray-50" 
                hasCopyAddressOnClick
              >
                <Avatar />
                <Name />
                <Address className="text-gray-500 text-sm" />
              </Identity>
              <WalletDropdownDisconnect className="hover:bg-gray-50" />
            </WalletDropdown>
          </Wallet>
        </div>
        
        {/* Connection status display */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium mb-3">Connection Status</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Wallet Connected:</span>
              <span className={`font-medium ${address ? 'text-green-600' : 'text-gray-400'}`}>
                {address ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>XMTP Initialized:</span>
              <span className={`font-medium ${client ? 'text-green-600' : 'text-gray-400'}`}>
                {client ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Initializing:</span>
              <span className={`font-medium ${(initializing || localInitializing) ? 'text-yellow-600' : 'text-gray-400'}`}>
                {(initializing || localInitializing) ? 'In Progress' : 'No'}
              </span>
            </div>
            
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600">
                Error: {error.message || 'An unknown error occurred'}
              </div>
            )}
          </div>
          
          {address && !client && !initializing && !localInitializing && (
            <button
              onClick={() => {
                if (address && signMessageAsync) {
                  const signer = createOnchainKitSigner(
                    address,
                    signMessageAsync,
                    BigInt(mainnet.id)
                  );
                  initializeXmtp(signer);
                }
              }}
              className="mt-4 w-full py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Reinitialize XMTP
            </button>
          )}
        </div>
        
        {(initializing || localInitializing) && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Connecting to XMTP network...
          </div>
        )}
      </div>
    </div>
  );
}