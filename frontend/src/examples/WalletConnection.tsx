"use client";

import { useCallback, useState, useEffect } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { injected, useConnect, useWalletClient, useAccount } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { mainnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { createEphemeralSigner, createEOASigner, createOnchainKitSigner } from "@/lib/xmtp";

// OnchainKit imports
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Address, Identity } from "@coinbase/onchainkit/identity";
import { useSignMessage } from "wagmi";

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";
const XMTP_INITIALIZING = "xmtp:initializing";
const XMTP_INIT_TIMESTAMP = "xmtp:initTimestamp";

export default function WalletConnection() {
  const { initialize, initializing, client, error } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected, connector } = useAccount();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
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

  // Comprehensive watcher for wallet connection state changes - for Smart Contract Wallet
  useEffect(() => {
    // If wallet is connected, XMTP is not initialized, and we're not currently initializing
    if (address && signMessageAsync && !client && !initializing && !localInitializing) {
      // Only proceed if we have a saved connection type
      const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      if (savedConnectionType === "Smart Contract Wallet") {
        console.log("Smart Contract Wallet detected but XMTP not initialized, attempting initialization", {
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

  // Connect with EOA wallet
  const connectWithEOA = useCallback(() => {
    if (initializing || localInitializing) return;
    
    setConnectionType("EOA Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
    
    if (isConnected && walletData) {
      initializeXmtp(createEOASigner(walletData.account.address, walletData));
    } else {
      connect({ connector: injected() });
    }
  }, [connect, walletData, initializeXmtp, isConnected, initializing, localInitializing]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    if (initializing || localInitializing) return;
    
    setConnectionType("Ephemeral Wallet");
    
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    setEphemeralAddress(account.address);
    
    localStorage.setItem(XMTP_EPHEMERAL_KEY, privateKey);
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Ephemeral Wallet");
    
    initializeXmtp(createEphemeralSigner(privateKey));
  }, [initializeXmtp, initializing, localInitializing]);

  // This is called when the wallet connects via OnchainKit
  const handleSmartContractWallet = useCallback(async () => {
    console.log("Smart Contract Wallet connected through OnchainKit");
    setConnectionType("Smart Contract Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Smart Contract Wallet");
    
    // Check if we can initialize immediately
    if (address && signMessageAsync && !initializing && !localInitializing && !client) {
      console.log("Initializing XMTP immediately after Smart Contract Wallet connection", address);
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
      console.log("Will initialize Smart Contract Wallet when address becomes available", {
        hasAddress: !!address,
        hasSignMessage: !!signMessageAsync,
        isInitializing: initializing || localInitializing,
        hasClient: !!client
      });
    }
  }, [address, signMessageAsync, client, initializeXmtp, initializing, localInitializing]);

  // Watch for wallet data becoming available to complete initialization
  useEffect(() => {
    if (!walletData || client || initializing || !isConnected) return;
    
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (!savedConnectionType) return;
    
    // Don't try to initialize if we have an error
    if (error) {
      console.log("Error detected, not initializing XMTP:", error);
      return;
    }
    
    console.log(`Wallet data available for ${savedConnectionType}, initializing XMTP`);
    
    if (savedConnectionType === "EOA Wallet") {
      initializeXmtp(createEOASigner(walletData.account.address, walletData));
    } else if (savedConnectionType === "Coinbase Smart Wallet" && connector?.id === 'coinbaseWalletSDK') {
      initializeXmtp(createOnchainKitSigner(
        walletData.account.address,
        signMessageAsync!,
        BigInt(mainnet.id)
      ));
    }
  }, [walletData, client, initializing, localInitializing, isConnected, initializeXmtp, error, connector, signMessageAsync]);

  // Load saved connection on mount for ephemeral wallet only
  useEffect(() => {
    // Don't restore if already initialized or currently initializing
    if (client || initializing || localInitializing) return;
    
    // Don't try to restore if we have an error
    if (error) {
      console.log("Error detected, not restoring connection:", error);
      return;
    }
    
    // Clear any stale flags
    const initTimestamp = sessionStorage.getItem(XMTP_INIT_TIMESTAMP);
    if (initTimestamp) {
      const now = Date.now();
      const elapsed = now - parseInt(initTimestamp, 10);
      
      if (elapsed > 30000) {
        sessionStorage.removeItem(XMTP_INITIALIZING);
        sessionStorage.removeItem(XMTP_INIT_TIMESTAMP);
      } else if (sessionStorage.getItem(XMTP_INITIALIZING) === 'true') {
        console.log("XMTP initialization in progress, not restoring");
        return;
      }
    }

    // Check for existing connection
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (!savedConnectionType) return;
    
    console.log(`Restoring connection: ${savedConnectionType}`);
    setConnectionType(savedConnectionType);

    // Handle Ephemeral wallet connection restoration
    if (savedConnectionType === "Ephemeral Wallet") {
      const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
      if (savedPrivateKey) {
        const formattedKey = savedPrivateKey.startsWith('0x') 
          ? savedPrivateKey as `0x${string}` 
          : `0x${savedPrivateKey}` as `0x${string}`;
        
        const account = privateKeyToAccount(formattedKey);
        setEphemeralAddress(account.address);
        
        initializeXmtp(createEphemeralSigner(formattedKey));
      }
    }
    // Note: Other wallet connections will be restored when wallet reconnects
  }, [client, initializeXmtp, initializing, localInitializing, error]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full flex flex-col gap-3 mt-2">
        {/* Smart Contract Wallet */}
        <div className="w-full mb-2">
          <Wallet>
            <ConnectWallet 
              disconnectedLabel="Connect with Smart Contract Wallet"
              className="w-full py-3 px-4 rounded-xl font-medium text-base bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              onConnect={handleSmartContractWallet}
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
        
        {/* EOA Wallet Button */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEOA}
          disabled={initializing || localInitializing}>
          {(initializing || localInitializing) && connectionType === "EOA Wallet" 
            ? "Connecting EOA Wallet..." 
            : "Connect with EOA Wallet"}
        </Button>
        
        {/* Ephemeral Wallet Button */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEphemeral}
          disabled={initializing || localInitializing}>
          {(initializing || localInitializing) && connectionType === "Ephemeral Wallet" 
            ? "Connecting Ephemeral Wallet..." 
            : "Connect with Ephemeral Wallet"}
        </Button>
        
        {/* Connection status - collapsible */}
        {(initializing || localInitializing || error) && (
          <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Connection Status</h4>
            </div>
            
            {(initializing || localInitializing) && (
              <div className="mt-2 text-sm text-gray-600">
                Connecting to XMTP network...
              </div>
            )}
            
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                Error: {error.message || 'An unknown error occurred'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}