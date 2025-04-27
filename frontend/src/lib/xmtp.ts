import type { Signer } from "@xmtp/browser-sdk";
import { toBytes, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Simple in-memory signature cache to prevent duplicate signing requests
const signatureCache: Record<string, Uint8Array> = {};

// Helper to create a cache key from address and message
const createCacheKey = (address: string, message: string): string => {
  return `${address.toLowerCase()}:${message}`;
};

export const createEphemeralSigner = (privateKey: Hex): Signer => {
    const account = privateKeyToAccount(privateKey);
    
    return {
      type: "EOA",
      getIdentifier: () => ({
        identifier: account.address.toLowerCase(),
        identifierKind: "Ethereum",
      }),
      signMessage: async (message: string) => {
        const cacheKey = createCacheKey(account.address, message);
        
        // Check if we have a cached signature
        if (signatureCache[cacheKey]) {
          console.log("Using cached signature for ephemeral key");
          return signatureCache[cacheKey];
        }
        
        try {
          const signature = await account.signMessage({
            message,
          });
          const signatureBytes = toBytes(signature);
          
          // Cache the signature
          signatureCache[cacheKey] = signatureBytes;
          
          return signatureBytes;
        } catch (error) {
          console.error("Error signing message with ephemeral key:", error);
          throw error;
        }
      },
    };
};

export const createEOASigner = (
  address: `0x${string}`,
  walletClient: WalletClient,
): Signer => {
  console.log("Creating EOA signer for address:", address);
  
  // Create a unique identifier for this signer instance to help with debugging
  const signerId = `eoa_${address.slice(0, 6)}_${Date.now().toString().slice(-6)}`;
  console.log(`EOA signer ${signerId} created`);
  
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string) => {
      const cacheKey = createCacheKey(address, message);
      
      // Check if we have a cached signature
      if (signatureCache[cacheKey]) {
        console.log(`EOA signer ${signerId} using cached signature`);
        return signatureCache[cacheKey];
      }
      
      try {
        console.log(`EOA signer ${signerId} signing message: ${message.substring(0, 20)}...`);
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });
        console.log(`EOA signer ${signerId} message signed successfully`);
        
        const signatureBytes = toBytes(signature);
        
        // Cache the signature
        signatureCache[cacheKey] = signatureBytes;
        
        return signatureBytes;
      } catch (error) {
        console.error(`Error in EOA signer ${signerId} when signing message:`, error);
        // Rethrow the error so the caller can handle it
        throw error;
      }
    },
   
  };
};

export const createSCWSigner = (
  address: `0x${string}`,
  walletClient: WalletClient,
  chainId: bigint,
): Signer => {
  return {
    type: "SCW",
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string) => {
      const cacheKey = createCacheKey(address, message);
      
      // Check if we have a cached signature
      if (signatureCache[cacheKey]) {
        console.log("Using cached signature for SCW wallet");
        return signatureCache[cacheKey];
      }
      
      try {
        console.log("SCW signer signing message");
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });
        console.log("SCW message signed successfully");
        
        const signatureBytes = toBytes(signature);
        
        // Cache the signature
        signatureCache[cacheKey] = signatureBytes;
        
        return signatureBytes;
      } catch (error) {
        console.error("Error in SCW signer when signing message:", error);
        throw error;
      }
    },
    getChainId: () => {
      return chainId;
    },
  };
};
