import { useCallback, useState } from "react";
import { hexToUint8Array } from "uint8array-extras";
import { injected, useConnect, useWalletClient } from "wagmi";
import { mainnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Button } from "@/components/Button";
import { useXMTP } from "@/context/xmtp-context";
import { env } from "@/lib/env";
import { createSCWSigner, createEphemeralSigner, createEOASigner } from "@/lib/xmtp";

export default function WalletConnection() {
  const { initialize, initializing } = useXMTP();
  const { data: walletData } = useWalletClient();
  const { connect } = useConnect();
  
  const [connectionType, setConnectionType] = useState<string>("");
  const [ephemeralAddress, setEphemeralAddress] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize XMTP client with wallet signer
  const initializeXmtp = useCallback((signer: any) => {
    void initialize({
      dbEncryptionKey: hexToUint8Array(env.NEXT_PUBLIC_ENCRYPTION_KEY),
      env: env.NEXT_PUBLIC_XMTP_ENV,
      loggingLevel: "off",
      signer,
    });
  }, [initialize]);

  // Connect with EOA wallet
  const connectWithEOA = useCallback(() => {
    try {
      if (connectionType === "EOA Wallet" && initializing) return;
      
      setConnectionType("EOA Wallet");
      setErrorMessage(null);
      
      connect({ connector: injected() });
      
      // In a real implementation, we would initialize after wallet connection
      if (walletData) {
        initializeXmtp(createEOASigner(walletData.account.address, walletData));
      }
    } catch (error) {
      console.error("Error connecting with EOA:", error);
      setErrorMessage("Failed to connect with EOA wallet");
    }
  }, [connect, initializing, walletData, initializeXmtp, connectionType]);

  // Connect with Smart Contract Wallet
  const connectWithSCW = useCallback(() => {
    try {
      if (connectionType === "Smart Contract Wallet" && initializing) return;
      
      setErrorMessage(null);
      setConnectionType("Smart Contract Wallet");
      
      connect({ connector: injected() });
      
      // In a real implementation, we would initialize after wallet connection
      if (walletData?.account) {
        initializeXmtp(
          createSCWSigner(
            walletData.account.address,
            walletData,
            BigInt(mainnet.id),
          )
        );
      }
    } catch (error) {
      console.error("Error connecting with SCW:", error);
      setErrorMessage("Failed to connect with Smart Contract wallet");
    }
  }, [connect, initializeXmtp, walletData, initializing, connectionType]);

  // Connect with Ephemeral Wallet
  const connectWithEphemeral = useCallback(() => {
    try {
      if (connectionType === "Ephemeral Wallet" && initializing) return;
      
      setErrorMessage(null);
      setConnectionType("Ephemeral Wallet");
      const privateKey = generatePrivateKey();
      
      // Generate and store the address from the private key
      const account = privateKeyToAccount(privateKey);
      setEphemeralAddress(account.address);
      
      const ephemeralSigner = createEphemeralSigner(privateKey);
      initializeXmtp(ephemeralSigner);
    } catch (error) {
      console.error("Error connecting with ephemeral wallet:", error);
      setErrorMessage("Failed to connect with ephemeral wallet");
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