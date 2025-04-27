import { useCallback, useState, useEffect } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { injected, useConnect, useWalletClient, useAccount ,useConnectors} from "wagmi";
import { mainnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { createSCWSigner, createEphemeralSigner, createEOASigner } from "@/lib/xmtp";

// Simple local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

export default function WalletConnection() {
  const { initialize, initializing, client } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect, status: connectStatus } = useConnect();
  const { isConnected } = useAccount();
  const connectors = useConnectors();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>();

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback((signer: any) => {
    void initialize({
      dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
      env: env.NEXT_PUBLIC_XMTP_ENV,
      loggingLevel: "off",
      signer,
    });
  }, [initialize]);

  // Connect with EOA wallet (MetaMask or Injected)
  const connectWithEOA = useCallback(() => {
    setConnectionType("EOA Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
    
    // Use the injected connector
    connect({ connector: injected() });
  }, [connect]);

  // Connect with Coinbase Wallet
  const connectWithCoinbase = useCallback(() => {
    setConnectionType("Coinbase Wallet");
    localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Coinbase Wallet");
    
    // Use injected for Coinbase if available
    connect({ connector: injected() });
  }, [connect]);

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

  // Try to reconnect on page load
  useEffect(() => {
    const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
    if (savedConnectionType) {
      setConnectionType(savedConnectionType);

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
      }
      // For wallet connections, try to reconnect if not already connected
      else if ((savedConnectionType === "EOA Wallet" || savedConnectionType === "Coinbase Wallet") 
               && !isConnected && window.ethereum) {
        // Use a small delay to avoid connection conflicts
        setTimeout(() => {
          if (!isConnected) {
            connect({ connector: injected() });
          }
        }, 300);
      }
    }
  }, [initializeXmtp, connect, isConnected]);

  // Initialize XMTP when wallet is connected
  useEffect(() => {
    const initializeWithWallet = async () => {
      if (!walletData?.account || !isConnected) return;
      
      // Don't initialize if already connected
      if (client || initializing) return;
      
      // Check if we need to use SCW signer
      let isSCW = false;
      
      try {
        // Check if wallet is a Smart Contract Wallet
        // Note: This approach has been updated for viem/wagmi compatibility
        // Previously with ethers.js, we could check connector.getProvider()
        // Now we examine the transport provider directly
        
        if (walletData && walletData.transport && typeof walletData.transport === 'object') {
          const transportProvider = (walletData.transport as any).provider;
          if (transportProvider && 'connectionType' in transportProvider) {
            isSCW = transportProvider.connectionType === "scw_connection_type";
          }
        }

        // Alternative detection method can be added here if needed
      } catch (error) {
        console.error("Error checking wallet type:", error);
      }
      
      // Create appropriate signer and initialize
      if (isSCW) {
        initializeXmtp(
          createSCWSigner(
            walletData.account.address,
            walletData,
            BigInt(mainnet.id),
          )
        );
      } else {
        initializeXmtp(
          createEOASigner(walletData.account.address, walletData)
        );
      }
    };
    
    void initializeWithWallet();
  }, [walletData, isConnected, client, initializing, initializeXmtp]);

  // Determine if UI should be disabled
  const isDisabled = initializing || connectStatus === "pending";

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full flex flex-col gap-3 mt-2">
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEOA}
          disabled={isDisabled}>
          {initializing && connectionType === "EOA Wallet" 
            ? "Connecting EOA Wallet..." 
            : connectStatus === "pending" && !initializing
              ? "Waiting for wallet..."
              : "Connect with MetaMask"}
        </Button>
        
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithCoinbase}
          disabled={isDisabled}>
          {initializing && connectionType === "Coinbase Wallet" 
            ? "Connecting Coinbase Wallet..." 
            : "Connect with Coinbase"}
        </Button>
        
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEphemeral}
          disabled={isDisabled}>
          {initializing && connectionType === "Ephemeral Wallet" 
            ? "Connecting Ephemeral Wallet..." 
            : "Connect with Ephemeral Wallet"}
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
            {isConnected && walletData && (
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