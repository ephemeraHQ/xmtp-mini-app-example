import { getRandomValues } from "node:crypto";
import { IdentifierKind, type Signer } from "@xmtp/node-sdk";
import { fromString, toString } from "uint8arrays";
import { createWalletClient, http, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

interface User {
  key: `0x${string}`;
  account: ReturnType<typeof privateKeyToAccount>;
  wallet: ReturnType<typeof createWalletClient>;
}

export const createUser = (key: string): User => {
  const account = privateKeyToAccount(key as `0x${string}`);
  return {
    key: key as `0x${string}`,
    account,
    wallet: createWalletClient({
      account,
      chain: sepolia,
      transport: http(),
    }),
  };
};

// Check if we're in a browser environment and if Coinbase wallet extension is available
const isCoinbaseWalletAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.coinbaseWallet !== 'undefined';
};

/**
 * Adapts a signature to be compatible with the Rust validator 
 * which only accepts 64 or 65 byte signatures
 */
const adaptSignatureForValidator = (signature: Uint8Array): Uint8Array => {
  // If it's already a standard size (64 or 65 bytes), return as is
  if (signature.length === 64 || signature.length === 65) {
    return signature;
  }
  
  // For SCW signatures (which are longer), we need to extract the actual signature part
  // SCW signatures typically include the standard r, s, v components plus additional data
  
  // Convert to hex for easier handling
  const sigHex = toString(signature, 'hex');
  
  // Most Ethereum signatures (including those from SCW) follow the format:
  // - First 32 bytes: r value
  // - Next 32 bytes: s value
  // - Last byte: v value (recovery id)
  
  // Extract first 65 bytes (which should contain r, s, v)
  // Even in SCW signatures, these components are typically at the start
  const standardSigHex = sigHex.slice(0, 130); // 65 bytes = 130 hex chars
  
  // Convert back to Uint8Array
  return fromString(standardSigHex, 'hex');
};

// Create a signer that works with both standard and Coinbase wallet
export const createSigner = (key: string): Signer => {
  // If Coinbase wallet is available, use it
  if (isCoinbaseWalletAvailable()) {
    // Use the Coinbase wallet extension for signing
    const provider = window.coinbaseWallet.makeWeb3Provider();
    
    return {
      type: "EOA", // Keep the type as EOA to maintain compatibility
      getIdentifier: async () => {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        return {
          identifierKind: IdentifierKind.Ethereum,
          identifier: accounts[0].toLowerCase(),
        };
      },
      signMessage: async (message: string) => {
        try {
          const accounts = await provider.request({ method: 'eth_requestAccounts' });
          const signature = await provider.request({
            method: 'personal_sign',
            params: [message, accounts[0]],
          });
          
          // Convert the signature to bytes
          const sigBytes = toBytes(signature as `0x${string}`);
          
          // Adapt the signature to work with the validator
          return adaptSignatureForValidator(sigBytes);
        } catch (error) {
          console.error("Error signing with Coinbase wallet:", error);
          throw error;
        }
      },
    };
  } else {
    // Fall back to standard EOA signing with key
    const sanitizedKey = key.startsWith("0x") ? key : `0x${key}`;
    const user = createUser(sanitizedKey);
    
    return {
      type: "EOA",
      getIdentifier: () => ({
        identifierKind: IdentifierKind.Ethereum,
        identifier: user.account.address.toLowerCase(),
      }),
      signMessage: async (message: string) => {
        try {
          // For standard EOA signatures, use the wallet client
          const signature = await user.wallet.signMessage({
            message,
            account: user.account,
          });
          
          // Convert to bytes and return
          return toBytes(signature);
        } catch (error) {
          console.error("Error signing with EOA wallet:", error);
          throw error;
        }
      },
    };
  }
};

/**
 * Generate a random encryption key
 * @returns The encryption key
 */
export const generateEncryptionKeyHex = () => {
  /* Generate a random encryption key */
  const uint8Array = getRandomValues(new Uint8Array(32));
  /* Convert the encryption key to a hex string */
  return toString(uint8Array, "hex");
};

/**
 * Get the encryption key from a hex string
 * @param hex - The hex string
 * @returns The encryption key
 */
export const getEncryptionKeyFromHex = (hex: string) => {
  /* Convert the hex string to an encryption key */
  return fromString(hex, "hex");
};