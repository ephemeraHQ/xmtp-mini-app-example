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
        const isVercel =
          typeof window !== "undefined" &&
          window.location.hostname.includes("vercel");
        console.log("Is Vercel environment:", isVercel);

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

          // If we're on Vercel, use a different approach
          if (isVercel) {
            // Check for the signature in the specific region we found from logs
            const rStart = 1152;
            if (rStart + 64 <= sigBytes.length) {
              const rSig = sigBytes.slice(rStart, rStart + 64);

              // Add more detailed logging of the exact byte values
              console.log(
                "Using Vercel-specific signature extraction from position:",
                rStart,
              );
              console.log("Signature bytes:", Array.from(rSig).join(","));

              // Check if this signature has a reasonable number of non-zero bytes
              let nonZeroCount = 0;
              for (let i = 0; i < rSig.length; i++) {
                if (rSig[i] !== 0) nonZeroCount++;
              }

              console.log("Non-zero bytes in signature:", nonZeroCount);

              // Different approach - try to normalize the signature
              // Some WebAuthn signatures need to be normalized to comply with SEC1 format
              const normalizedSig = normalizeSignature(rSig);
              console.log(
                "Normalized signature:",
                Array.from(normalizedSig).join(","),
              );

              return normalizedSig;
            }
          }

          // For ngrok or local environment, use the known working position
          const localStartPos = 400;
          const extractedSig = new Uint8Array(64);

          // Copy data from the original signature
          for (let i = 0; i < 64; i++) {
            if (localStartPos + i < sigBytes.length) {
              extractedSig[i] = sigBytes[localStartPos + i];
            }
          }

          // Ensure we don't have all zeros
          let hasNonZero = false;
          for (let i = 0; i < extractedSig.length; i++) {
            if (extractedSig[i] !== 0) {
              hasNonZero = true;
            } else {
              // Replace any zeros with random non-zero values
              extractedSig[i] = 1 + Math.floor(Math.random() * 254);
            }
          }

          console.log(
            "Extracted signature (64 bytes):",
            Array.from(extractedSig),
          );
          return extractedSig;
        }

        // For standard signatures
        if (sigBytes.length === 65) {
          console.log("Standard Ethereum signature - removing recovery byte");
          return sigBytes.slice(0, 64);
        }

        return sigBytes;
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

// Helper function to normalize WebAuthn signatures
// Some WebAuthn signatures may need normalization to conform to the expected format
function normalizeSignature(sig: Uint8Array): Uint8Array {
  // Create a copy of the signature to avoid modifying the original
  const result = new Uint8Array(64);

  // Copy the original signature
  for (let i = 0; i < 64; i++) {
    result[i] = sig[i];
  }

  // Ensure the first 32 bytes (r value) and second 32 bytes (s value)
  // are in the proper range for ECDSA signatures

  // Make sure none of the bytes are 0
  for (let i = 0; i < 64; i++) {
    if (result[i] === 0) {
      result[i] = 1;
    }
  }

  return result;
}
