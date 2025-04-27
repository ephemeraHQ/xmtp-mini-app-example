import type { Signer } from "@xmtp/browser-sdk";
import { toBytes, type Hex, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const createEphemeralSigner = (privateKey: Hex): Signer => {
 
    const account = privateKeyToAccount(privateKey);
    
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
      try {
        console.log("EOA signer signing message");
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });
        console.log("EOA message signed successfully");
        return toBytes(signature);
      } catch (error) {
        console.error("Error in EOA signer when signing message:", error);
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
