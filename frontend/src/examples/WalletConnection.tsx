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
import {  createEphemeralSigner, createEOASigner, createSignerForCoinbaseSmartWallet } from "@/lib/xmtp";

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";
const XMTP_INITIALIZING = "xmtp:initializing";

export default function WalletConnection() {
  const { initialize, initializing, client } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected, connector } = useAccount();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback(async (signer: any) => {
    // Prevent duplicate initialization
    if (initializing || sessionStorage.getItem(XMTP_INITIALIZING) === 'true') {
      console.log("XMTP initialization already in progress");
      return;
    }
    
    // Set initializing flag
    sessionStorage.setItem(XMTP_INITIALIZING, 'true');
    
    console.log("Initializing XMTP with signer");
    await initialize({
      dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
      env: env.NEXT_PUBLIC_XMTP_ENV,
      loggingLevel: "off",
      signer,
    });
    
    // Clear initializing flag
    sessionStorage.removeItem(XMTP_INITIALIZING);
  }, [initialize, initializing]);

  // Load saved connection on mount
  useEffect(() => {
    // Clear any stale flags
    sessionStorage.removeItem(XMTP_INITIALIZING);

    // Check for existing connection
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (!savedConnectionType || client) return;
    
    console.log(`Restoring connection: ${savedConnectionType}`);
    setConnectionType(savedConnectionType);

    // Handle each connection type
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
    } else if (isConnected && walletData) {
      // Handle wallet connections if already connected
      if (savedConnectionType === "EOA Wallet") {
        initializeXmtp(createEOASigner(walletData.account.address, walletData));
      } else if (savedConnectionType === "Coinbase Smart Wallet" && 
                 connector?.id === 'coinbaseWalletSDK') {
        initializeXmtp(createSignerForCoinbaseSmartWallet(
          walletData.account.address,
          walletData,
          BigInt(mainnet.id)
        ));
      }
    }
  }, [client, initializeXmtp, isConnected, walletData, connector]);

  // Watch for wallet data becoming available to complete initialization
  useEffect(() => {
    if (!walletData || client || initializing || !isConnected) return;
    
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (!savedConnectionType) return;
    
    console.log(`Wallet data available for ${savedConnectionType}, initializing XMTP`);
    
    if (savedConnectionType === "EOA Wallet") {
      initializeXmtp(createEOASigner(walletData.account.address, walletData));
    }  else if (savedConnectionType === "Coinbase Smart Wallet") {
      initializeXmtp(createSignerForCoinbaseSmartWallet(
        walletData.account.address,
        walletData,
        BigInt(mainnet.id)
      ));
    }
  }, [walletData, client, initializing, isConnected, initializeXmtp]);

  // Connect with EOA wallet
  const connectWithEOA = useCallback(() => {
    if (initializing) return;
    
    setConnectionType("EOA Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
    
    if (isConnected && walletData) {
      initializeXmtp(createEOASigner(walletData.account.address, walletData));
    } else {
      connect({ connector: injected() });
    }
  }, [connect, walletData, initializeXmtp, isConnected, initializing]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    if (initializing) return;
    
    setConnectionType("Ephemeral Wallet");
    
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    setEphemeralAddress(account.address);
    
    localStorage.setItem(XMTP_EPHEMERAL_KEY, privateKey);
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Ephemeral Wallet");
    
    initializeXmtp(createEphemeralSigner(privateKey));
  }, [initializeXmtp, initializing]);

 
  // Connect with Coinbase Smart Wallet
  const connectWithCoinbaseSmartWallet = useCallback(() => {
    if (initializing) return;
    
    setConnectionType("Coinbase Smart Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Coinbase Smart Wallet");
    
    if (isConnected && walletData && connector?.id === 'coinbaseWalletSDK') {
      initializeXmtp(createSignerForCoinbaseSmartWallet(
        walletData.account.address,
        walletData,
        BigInt(mainnet.id)
      ));
    } else {
      connect({ 
        connector: coinbaseWallet({
          appName: "XMTP Mini App",
          preference: { options: "smartWalletOnly" }
        }) 
      });
    }
  }, [connect, initializing, walletData, isConnected, connector, initializeXmtp]);

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
          onClick={connectWithCoinbaseSmartWallet}
          disabled={initializing}>
          {initializing && connectionType === "Coinbase Smart Wallet" 
            ? "Connecting Coinbase Smart Wallet..." 
            : "Connect with Coinbase Smart Wallet"}
        </Button>
      </div>
    </div>
  );
}