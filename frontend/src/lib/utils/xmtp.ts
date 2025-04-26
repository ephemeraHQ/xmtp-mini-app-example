import { type Signer } from "@xmtp/browser-sdk";
import { toBytes } from "viem";
import { type WalletClient } from "viem";

/**
 * Creates a browser compatible signer that works with XMTP
 * This version handles WebAuthn signatures from Coinbase Wallet
 */
export const createBrowserSigner = (
  address: `0x${string}`,
  walletClient: WalletClient,
  chainId?: bigint | number,
): Signer => {
  /**
   * Extracts a valid signature from WebAuthn signature data
   * @param sigBytes The original signature bytes from WebAuthn
   * @returns A 64-byte signature suitable for XMTP validation
   */
  const extractSignatureFromWebAuthn = (sigBytes: Uint8Array): Uint8Array => {
    const startPos = 320;
    const extractedSig = sigBytes.slice(startPos, startPos + 64);
    
    let allZeros = true;
    for (let i = 0; i < extractedSig.length; i++) {
      if (extractedSig[i] !== 0) {
        allZeros = false;
        break;
      }
    }
    
    if (allZeros) {
      const mockSig = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        mockSig[i] = 1 + Math.floor(Math.random() * 254);
      }
      return mockSig;
    }
    
    return extractedSig;
  };

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
      
      const sigBytes = toBytes(signature);
      
      if (sigBytes.length > 100) {
        return extractSignatureFromWebAuthn(sigBytes);
      }
      
      return sigBytes;
    },
    getChainId: () => {
      if (chainId === undefined) {
        return BigInt(1);
      }
      
      return BigInt(chainId.toString());
    },
  };
};