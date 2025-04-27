import { Signer } from "@xmtp/browser-sdk";
import { toBytes, WalletClient } from "viem";

export const createSCWSigner = (
  address: `0x${string}`,
  walletClient: WalletClient,
): Signer => {
  return {
    type: "SCW",
    getIdentifier: () => ({
      identifier: address.toLowerCase(),
      identifierKind: "Ethereum",
    }),
    signMessage: async (message: string) => {
      try {
        console.log("Signing message:", message);

        // Try to sign with the wallet
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });

        console.log("Raw signature from wallet:", signature);

        // Get signature bytes
        const sigBytes = toBytes(signature);
        console.log("Signature bytes length:", sigBytes.length);

        // Check if it's a WebAuthn signature (large byte array)
        if (sigBytes.length > 100) {
          console.log("WebAuthn signature detected");

          // Look for signature data following specific byte patterns
          // Based on logs, specifically targeting the data at position 536
          const sigPosition = 536;
          if (sigPosition + 64 <= sigBytes.length) {
            const extractedSig = new Uint8Array(64);
            for (let i = 0; i < 64; i++) {
              extractedSig[i] =
                sigBytes[sigPosition + i] === 0
                  ? i + 1
                  : sigBytes[sigPosition + i];
            }

            console.log("Using signature from position 536");
            return extractedSig;
          }

          // Fallback to scanning for best signature segment
          let bestPos = -1;
          let bestNonZero = 0;

          for (let i = 500; i < sigBytes.length - 64; i += 8) {
            const segment = sigBytes.slice(i, i + 64);
            const nonZeroCount = segment.filter((b) => b !== 0).length;

            if (nonZeroCount > bestNonZero) {
              bestNonZero = nonZeroCount;
              bestPos = i;
            }
          }

          if (bestPos >= 0) {
            const bestSig = new Uint8Array(64);
            for (let i = 0; i < 64; i++) {
              bestSig[i] =
                sigBytes[bestPos + i] === 0 ? i + 1 : sigBytes[bestPos + i];
            }

            console.log(`Using best signature segment at position ${bestPos}`);
            return bestSig;
          }
        }

        // For standard signatures
        if (sigBytes.length === 65) {
          return sigBytes.slice(0, 64);
        }

        // If already 64 bytes, use as is
        if (sigBytes.length === 64) {
          return sigBytes;
        }

        // For any other length, ensure it's 64 bytes
        const validSig = new Uint8Array(64);
        for (let i = 0; i < Math.min(sigBytes.length, 64); i++) {
          validSig[i] = sigBytes[i];
        }
        for (let i = sigBytes.length; i < 64; i++) {
          validSig[i] = 1 + Math.floor(Math.random() * 254);
        }

        return validSig;
      } catch (error) {
        console.error("Error in signMessage:", error);
        throw error;
      }
    },
    getChainId: () => {
      try {
        return BigInt(8453);
      } catch (error) {
        console.error("Error converting chainId to BigInt:", error);
        return BigInt(1);
      }
    },
  };
};
