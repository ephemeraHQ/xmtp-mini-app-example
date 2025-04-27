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

// Constants for local storage keys
const XMTP_CONNECTION_TYPE_KEY = "xmtp:connectionType";
const XMTP_EPHEMERAL_KEY = "xmtp:ephemeralKey";

export default function WalletConnection() {
  const { initialize, initializing, client } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  const { isConnected } = useAccount();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedAutoConnect, setAttemptedAutoConnect] = useState(false);

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback((signer: any) => {
    console.log("Initializing XMTP with signer");
    
    void initialize({
      dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
      env: env.NEXT_PUBLIC_XMTP_ENV,
      loggingLevel: "off",
      signer,
    }).then((result) => {
      console.log("XMTP initialization result:", !!result);
      setAttemptedAutoConnect(true);
    }).catch(error => {
      console.error("Failed to initialize XMTP client:", error);
      setErrorMessage("Failed to initialize XMTP client");
      // Clear the stored connection type to prevent getting stuck
      localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
      if (connectionType === "Ephemeral Wallet") {
        localStorage.removeItem(XMTP_EPHEMERAL_KEY);
      }
      setAttemptedAutoConnect(true);
    });
  }, [initialize, connectionType]);

  // Immediately try to reconnect with ephemeral wallet on mount
  useEffect(() => {
    const immediatelyReconnect = async () => {
      // Only attempt this if we're not already connected or initializing
      if (client || initializing || attemptedAutoConnect) {
        return;
      }

      console.log("Attempting immediate reconnect on mount");
      
      try {
        const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
        console.log("Immediate reconnect - saved connection type:", savedConnectionType);
        
        if (savedConnectionType === "Ephemeral Wallet") {
          const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
          console.log("Immediate reconnect - has ephemeral key:", !!savedPrivateKey);
          
          if (savedPrivateKey) {
            // Set state to show we're trying to connect
            setConnectionType("Ephemeral Wallet");
            
            try {
              // Ensure the key has 0x prefix
              const formattedKey = savedPrivateKey.startsWith('0x') 
                ? savedPrivateKey as `0x${string}` 
                : `0x${savedPrivateKey}` as `0x${string}`;
                
              console.log("Immediate reconnect - formatted key:", {
                original: savedPrivateKey.length,
                formatted: formattedKey.length,
                hasPrefix: formattedKey.startsWith('0x')
              });
              
              // Create account and address
              const account = privateKeyToAccount(formattedKey);
              setEphemeralAddress(account.address);
              
              // Create signer and initialize
              console.log("Immediate reconnect - creating signer");
              const ephemeralSigner = createEphemeralSigner(formattedKey);
              initializeXmtp(ephemeralSigner);
              
              // Mark as attempted
              console.log("Immediate reconnect - marked as attempted");
              setAttemptedAutoConnect(true);
            } catch (error) {
              console.error("Immediate reconnect - Error recreating ephemeral wallet:", error);
              localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
              localStorage.removeItem(XMTP_EPHEMERAL_KEY);
              setConnectionType("");
              setAttemptedAutoConnect(true);
            }
          } else {
            console.warn("Immediate reconnect - No ephemeral key found");
            localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
            setAttemptedAutoConnect(true);
          }
        }
      } catch (error) {
        console.error("Immediate reconnect - Error:", error);
        setAttemptedAutoConnect(true);
      }
    };
    
    // Run immediately
    immediatelyReconnect();
  }, [client, initializing, attemptedAutoConnect, initializeXmtp]);

  // Debug logging on component mount
  useEffect(() => {
    console.log("WalletConnection mounted");
    
    // Log localStorage state
    try {
      const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      const hasEphemeralKey = !!localStorage.getItem(XMTP_EPHEMERAL_KEY);
      
      console.log("Initial localStorage state:", {
        savedConnectionType,
        hasEphemeralKey,
        client: !!client,
        initializing,
        isConnected,
        hasWalletData: !!walletData
      });
    } catch (err) {
      console.error("Error reading localStorage:", err);
    }
  }, []);
  
  // Debug log whenever client or initializing changes
  useEffect(() => {
    console.log("XMTP state change:", { 
      client: !!client, 
      initializing, 
      connectionType,
      attemptedAutoConnect
    });
  }, [client, initializing, connectionType, attemptedAutoConnect]);

  // Try to auto-connect on page load
  useEffect(() => {
    const attemptAutoConnect = async () => {
      console.log("Attempting auto-connect...", { client: !!client, attemptedAutoConnect });
      
      try {
        // Don't auto-connect if already connected or if we've already tried
        if (client || attemptedAutoConnect) {
          console.log("Skipping auto-connect:", { 
            alreadyConnected: !!client, 
            alreadyAttempted: attemptedAutoConnect 
          });
          return;
        }
        
        const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
        console.log("Saved connection type:", savedConnectionType);
        
        if (savedConnectionType === "Ephemeral Wallet") {
          const savedPrivateKey = localStorage.getItem(XMTP_EPHEMERAL_KEY);
          console.log("Has ephemeral private key:", !!savedPrivateKey);
          
          if (savedPrivateKey) {
            console.log("Attempting to reconnect with ephemeral wallet");
            setConnectionType("Ephemeral Wallet");
            
            try {
              // Make sure the key is properly formatted as a hex string
              const formattedKey = savedPrivateKey.startsWith('0x') 
                ? savedPrivateKey as `0x${string}` 
                : `0x${savedPrivateKey}` as `0x${string}`;
              
              console.log("Formatted ephemeral key:", {
                originalLength: savedPrivateKey.length,
                formattedLength: formattedKey.length,
                startsWithHex: formattedKey.startsWith('0x'),
                preview: `${formattedKey.substring(0, 6)}...${formattedKey.substring(formattedKey.length - 6)}`
              });
                
              // Recreate the account from saved private key
              const account = privateKeyToAccount(formattedKey);
              console.log("Recreated ephemeral account address:", account.address);
              setEphemeralAddress(account.address);
              
              // Create a signer and initialize XMTP
              console.log("Creating ephemeral signer");
              const ephemeralSigner = createEphemeralSigner(formattedKey);
              console.log("Calling initializeXmtp with ephemeral signer");
              initializeXmtp(ephemeralSigner);
            } catch (error) {
              console.error("Error recreating ephemeral wallet:", error);
              // Clear saved data to prevent getting stuck in a bad state
              localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
              localStorage.removeItem(XMTP_EPHEMERAL_KEY);
              setConnectionType("");
              setEphemeralAddress("");
            }
          } else {
            // No private key found, clear the connection type
            console.warn("Ephemeral wallet type saved but no private key found");
            localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
          }
        } else if (savedConnectionType === "EOA Wallet" || savedConnectionType === "Smart Contract Wallet") {
          // For wallet connections, we just need to wait for wagmi to reconnect automatically
          // and then we'll pick up the connection in the useEffect below
          console.log("Waiting for wallet reconnection");
        } else {
          console.log("No saved connection type found");
        }
      } catch (error) {
        console.error("Error during auto-connect:", error);
        // Clear any saved connection data to prevent getting stuck
        localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
        localStorage.removeItem(XMTP_EPHEMERAL_KEY);
      } finally {
        console.log("Marking auto-connect as attempted");
        setAttemptedAutoConnect(true);
      }
    };
    
    // Set a timeout to make sure we don't stay stuck forever
    const timeoutId = setTimeout(() => {
      if (initializing && !client) {
        console.log("Connection attempt timed out");
        setAttemptedAutoConnect(true);
        localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
        localStorage.removeItem(XMTP_EPHEMERAL_KEY);
      }
    }, 10000); // 10 seconds timeout
    
    attemptAutoConnect();
    
    return () => {
      console.log("Clearing timeout");
      clearTimeout(timeoutId);
    };
  }, [client, initializeXmtp, attemptedAutoConnect, initializing]);
  
  // Handle wallet reconnection
  useEffect(() => {
    const connectWithWallet = async () => {
      console.log("Checking wallet reconnection...", {
        client: !!client,
        isConnected,
        hasWalletData: !!walletData,
        attemptedAutoConnect
      });
      
      if (client || !isConnected || !walletData || !attemptedAutoConnect) {
        console.log("Skipping wallet reconnection");
        return;
      }
      
      const savedConnectionType = localStorage.getItem(XMTP_CONNECTION_TYPE_KEY);
      console.log("Reconnecting wallet with saved type:", savedConnectionType);
      
      if (savedConnectionType === "EOA Wallet") {
        console.log("Reconnecting with EOA wallet");
        setConnectionType("EOA Wallet");
        try {
          initializeXmtp(createEOASigner(walletData.account.address, walletData));
        } catch (error) {
          console.error("Failed to reconnect with EOA wallet:", error);
          localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
        }
      } else if (savedConnectionType === "Smart Contract Wallet") {
        console.log("Reconnecting with Smart Contract wallet");
        setConnectionType("Smart Contract Wallet");
        try {
          initializeXmtp(
            createSCWSigner(
              walletData.account.address,
              walletData,
              BigInt(mainnet.id),
            )
          );
        } catch (error) {
          console.error("Failed to reconnect with Smart Contract wallet:", error);
          localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
        }
      }
    };
    
    connectWithWallet();
  }, [isConnected, walletData, client, initializeXmtp, attemptedAutoConnect]);

  // Connect with EOA wallet
  const connectWithEOA = useCallback(() => {
    try {
      console.log("Connecting with EOA wallet...");
      if (connectionType === "EOA Wallet" && initializing) {
        console.log("Already connecting with EOA wallet, skipping");
        return;
      }
      
      setConnectionType("EOA Wallet");
      setErrorMessage(null);
      
      console.log("Connecting with injected connector");
      connect({ connector: injected() });
      
      // Save connection type
      localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "EOA Wallet");
      console.log("Saved EOA wallet connection type to localStorage");
      
      // In a real implementation, we would initialize after wallet connection
      if (walletData) {
        console.log("Wallet data available, initializing XMTP");
        initializeXmtp(createEOASigner(walletData.account.address, walletData));
      } else {
        console.log("No wallet data available yet");
      }
    } catch (error) {
      console.error("Error connecting with EOA:", error);
      setErrorMessage("Failed to connect with EOA wallet");
      localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
    }
  }, [connect, initializing, walletData, initializeXmtp, connectionType]);

  // Connect with Smart Contract Wallet
  const connectWithSCW = useCallback(() => {
    try {
      console.log("Connecting with Smart Contract wallet...");
      if (connectionType === "Smart Contract Wallet" && initializing) {
        console.log("Already connecting with SCW, skipping");
        return;
      }
      
      setErrorMessage(null);
      setConnectionType("Smart Contract Wallet");
      
      console.log("Connecting with injected connector");
      connect({ connector: injected() });
      
      // Save connection type
      localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Smart Contract Wallet");
      console.log("Saved SCW connection type to localStorage");
      
      // In a real implementation, we would initialize after wallet connection
      if (walletData?.account) {
        console.log("Wallet data available, initializing XMTP");
        initializeXmtp(
          createSCWSigner(
            walletData.account.address,
            walletData,
            BigInt(mainnet.id),
          )
        );
      } else {
        console.log("No wallet data available yet");
      }
    } catch (error) {
      console.error("Error connecting with SCW:", error);
      setErrorMessage("Failed to connect with Smart Contract wallet");
      localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
    }
  }, [connect, initializeXmtp, walletData, initializing, connectionType]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    try {
      console.log("Connecting with ephemeral wallet...");
      if (connectionType === "Ephemeral Wallet" && initializing) {
        console.log("Already connecting with ephemeral wallet, skipping");
        return;
      }
      
      setErrorMessage(null);
      setConnectionType("Ephemeral Wallet");
      
      // Generate a new private key
      const privateKey = generatePrivateKey();
      console.log("Generated new ephemeral private key:", {
        type: typeof privateKey,
        length: privateKey.length,
        preview: `${privateKey.substring(0, 6)}...${privateKey.substring(privateKey.length - 6)}`
      });
      
      // Generate and store the address from the private key
      const account = privateKeyToAccount(privateKey);
      console.log("Created ephemeral account:", account.address);
      setEphemeralAddress(account.address);
      
      // Save the private key and connection type - ensure it's saved with the 0x prefix
      localStorage.setItem(XMTP_EPHEMERAL_KEY, privateKey);
      localStorage.setItem(XMTP_CONNECTION_TYPE_KEY, "Ephemeral Wallet");
      console.log("Saved ephemeral key and connection type to localStorage", {
        keyLength: privateKey.length,
        key: `${privateKey.substring(0, 6)}...${privateKey.substring(privateKey.length - 6)}`
      });
      
      const ephemeralSigner = createEphemeralSigner(privateKey);
      console.log("Created ephemeral signer, initializing XMTP");
      initializeXmtp(ephemeralSigner);
    } catch (error) {
      console.error("Error connecting with ephemeral wallet:", error);
      setErrorMessage("Failed to connect with ephemeral wallet");
      localStorage.removeItem(XMTP_CONNECTION_TYPE_KEY);
      localStorage.removeItem(XMTP_EPHEMERAL_KEY);
    }
  }, [initializeXmtp, initializing, connectionType]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full flex flex-col gap-3 mt-2">
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEOA}
          disabled={initializing}>
          Connect with EOA Wallet
        </Button>
        
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithEphemeral}
          disabled={initializing}>
          Connect with Ephemeral Wallet
        </Button>
        
        <Button 
          className="w-full" 
          size="lg" 
          onClick={connectWithSCW}
          disabled={initializing}>
          Connect with Smart Contract Wallet
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
            {initializing && <p className="text-yellow-500">Connecting to XMTP...</p>}
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2 p-2 bg-red-900/20 rounded-md">
          {errorMessage}
        </div>
      )}
    </div>
  );
} 