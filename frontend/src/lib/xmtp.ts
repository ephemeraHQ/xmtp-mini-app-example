import type { Signer } from "@xmtp/browser-sdk";
import { toBytes, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const createEphemeralSigner = (privateKey: Hex): Signer => {
  console.log("Creating ephemeral signer with key type:", typeof privateKey);
  console.log("Private key format:", {
    length: privateKey.length,
    startsWithHex: privateKey.startsWith("0x"),
    preview: `${privateKey.substring(0, 6)}...${privateKey.substring(privateKey.length - 6)}`
  });
  
  try {
    const account = privateKeyToAccount(privateKey);
    console.log("Successfully created account from private key:", account.address);
    
    return {
      type: "EOA",
      getIdentifier: () => ({
        identifier: account.address.toLowerCase(),
        identifierKind: "Ethereum",
      }),
      signMessage: async (message: string) => {
        try {
          const signature = await account.signMessage({
            message,
          });
          return toBytes(signature);
        } catch (error) {
          console.error("Error signing message with ephemeral key:", error);
          throw error;
        }
      },
    };
  } catch (error) {
    console.error("Error creating account from private key:", error);
    throw error;
  }
};

export const createEOASigner = (
  address: `0x${string}`,
  walletClient: WalletClient,
): Signer => {
  return {
    type: "EOA",
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string) => {
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });
      return toBytes(signature);
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
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });
      return toBytes(signature);
    },
    getChainId: () => {
      return chainId;
    },
  };
};
