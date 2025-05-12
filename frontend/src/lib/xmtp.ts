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

      // Sign the message
      const signature = await account.signMessage({ message });
      const signatureBytes = toBytes(signature);

      // Cache the signature
      signatureCache[cacheKey] = signatureBytes;

      return signatureBytes;
    },
  };
};

export const createEOASigner = (
  address: `0x${string}`,
  walletClient: WalletClient,
): Signer => {
  console.log("Creating EOA signer for address:", address);

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
        console.log("Using cached EOA signature");
        return signatureCache[cacheKey];
      }

      // Sign the message
      console.log("EOA signer signing message");
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });

      const signatureBytes = toBytes(signature);

      // Cache the signature
      signatureCache[cacheKey] = signatureBytes;

      return signatureBytes;
    },
  };
};

export const createSCWSigner = (
  address: `0x${string}`,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
  chainId: bigint | number = 1,
): Signer => {
  console.log("Creating Smart Contract Wallet signer for address:", address);

  return {
    // Mark this as a Smart Contract Wallet signer
    type: "SCW",
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string) => {
      const cacheKey = createCacheKey(address, message);

      // Check if we have a cached signature
      if (signatureCache[cacheKey]) {
        console.log("Using cached Smart Contract Wallet signature");
        return signatureCache[cacheKey];
      }

      // Sign the message using the smart contract wallet
      console.log("Smart Contract Wallet signing message");
      try {
        const signature = await signMessageAsync({ message });
        console.log("Smart Contract Wallet signature received:", signature);

        const signatureBytes = toBytes(signature);
        console.log("Signature bytes length:", signatureBytes.length);

        // Cache the signature
        signatureCache[cacheKey] = signatureBytes;

        return signatureBytes;
      } catch (error) {
        console.error("Error in Smart Contract Wallet signMessage:", error);
        throw error;
      }
    },
    // Include getChainId for SCW compatibility
    getChainId: () => {
      console.log("SCW getChainId called, value:", chainId);
      return typeof chainId === "undefined"
        ? BigInt(1)
        : BigInt(chainId.toString());
    },
  };
};
