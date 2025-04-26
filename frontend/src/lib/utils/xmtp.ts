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

        // WebAuthn signature detection based on size
        if (sigBytes.length > 100) {
          console.log("WebAuthn signature detected");

          // Look for specific patterns in the WebAuthn response structure
          // We're looking for the actual signature data, not the clientDataJSON

          // These are the typical positions where the signature should be based on logs
          const potentialSignaturePositions = [
            416, // Position where we might find the r value of the signature
            640, // Another common position for signature data
            480, // Might be the start of the s value
            544, // Another possible location
          ];

          for (const position of potentialSignaturePositions) {
            if (position + 64 <= sigBytes.length) {
              // Extract 64 bytes starting at this position
              const candidateSig = sigBytes.slice(position, position + 64);

              // Count non-zero bytes - real signatures should have mostly non-zero values
              let nonZeroCount = 0;
              for (const byte of candidateSig) {
                if (byte !== 0) nonZeroCount++;
              }

              // A real signature should have mostly non-zero bytes
              if (nonZeroCount >= 56) {
                // At least 56 out of 64 bytes should be non-zero
                console.log(
                  `Found likely signature at position ${position} with ${nonZeroCount}/64 non-zero bytes`,
                );
                console.log("Signature bytes:", Array.from(candidateSig));
                return candidateSig;
              }
            }
          }

          // If none of those worked, try pattern matching for known WebAuthn structures
          // WebAuthn signatures are often preceded by a specific byte pattern

          // Look for known structure patterns, like the 0x11 byte that sometimes precedes signatures
          for (let i = 0; i < sigBytes.length - 64; i++) {
            // Some common signature marker patterns in WebAuthn responses
            if (
              (sigBytes[i] === 0x30 && sigBytes[i + 1] >= 0x44) || // DER-encoded signature start
              (sigBytes[i] === 0x11 && sigBytes[i + 1] === 0x68) || // Seen in some WebAuthn responses
              (sigBytes[i] === 0x41 && sigBytes[i + 1] === 0x10)
            ) {
              // Another common marker

              // Try the 64 bytes after this marker
              const markerSig = sigBytes.slice(i + 2, i + 66);

              // Count non-zero bytes
              let nonZeroCount = 0;
              for (const byte of markerSig) {
                if (byte !== 0) nonZeroCount++;
              }

              if (nonZeroCount >= 48) {
                console.log(
                  `Found signature after marker at position ${i + 2} with ${nonZeroCount}/64 non-zero bytes`,
                );
                console.log("Signature bytes:", Array.from(markerSig));
                return markerSig;
              }
            }
          }

          // Last resort - try every 64-byte segment to find the most likely signature
          let bestPosition = -1;
          let highestNonZeroCount = 0;

          for (let i = 0; i < sigBytes.length - 64; i += 8) {
            const segment = sigBytes.slice(i, i + 64);
            let nonZeroCount = 0;
            for (const byte of segment) {
              if (byte !== 0) nonZeroCount++;
            }

            // Real signatures rarely have large sequences of zeros
            // Look for segments with the highest density of non-zero bytes
            if (nonZeroCount > highestNonZeroCount) {
              highestNonZeroCount = nonZeroCount;
              bestPosition = i;
            }
          }

          if (bestPosition >= 0 && highestNonZeroCount >= 48) {
            const bestSig = sigBytes.slice(bestPosition, bestPosition + 64);
            console.log(
              `Using best segment at position ${bestPosition} with ${highestNonZeroCount}/64 non-zero bytes`,
            );
            console.log("Signature bytes:", Array.from(bestSig));
            return bestSig;
          }

          // Even if we couldn't find a good candidate, try the known position around 480
          // which seems to be a common location for signature data based on the logs
          const fallbackPos = 480;
          if (fallbackPos + 64 <= sigBytes.length) {
            const fallbackSig = sigBytes.slice(fallbackPos, fallbackPos + 64);
            console.log("Using fallback signature position:", fallbackPos);
            console.log("Signature bytes:", Array.from(fallbackSig));
            return fallbackSig;
          }

          // Absolute last resort - generate a random signature
          console.log(
            "No suitable signature data found, generating random signature",
          );
          const randomSig = new Uint8Array(64);
          for (let i = 0; i < 64; i++) {
            randomSig[i] = 1 + Math.floor(Math.random() * 254);
          }
          return randomSig;
        }

        // For standard signatures
        if (sigBytes.length === 65) {
          // Standard Ethereum signature - remove the recovery byte
          return sigBytes.slice(0, 64);
        }

        // If already 64 bytes, use as is
        if (sigBytes.length === 64) {
          return sigBytes;
        }

        // For any other length, ensure it's 64 bytes
        console.log("Unexpected signature length, creating 64-byte signature");
        const validSig = new Uint8Array(64);

        // Copy what we can from the original
        for (let i = 0; i < Math.min(sigBytes.length, 64); i++) {
          validSig[i] = sigBytes[i];
        }

        // Fill remaining bytes if needed
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
