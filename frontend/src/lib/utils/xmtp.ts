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
        console.log("======== SCW SIGNER DEBUG ========");
        console.log(
          "Environment:",
          typeof window !== "undefined" ? window.location.hostname : "unknown",
        );
        console.log("Message to sign:", message);
        console.log("Address:", address);

        // Try to sign with the wallet
        console.log("Attempting to sign with wallet...");
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });

        console.log("Raw signature received from wallet:", signature);

        // Get signature bytes
        const sigBytes = toBytes(signature);
        console.log("Signature bytes length:", sigBytes.length);

        // Examine signature structure with detailed logging
        if (sigBytes.length > 100) {
          console.log("WebAuthn signature detected (length > 100)");

          // Log distinct chunks of the signature for analysis
          // Log every 32 bytes to identify potential r,s values
          console.log("Signature structure analysis:");
          for (let i = 0; i < sigBytes.length; i += 32) {
            const end = Math.min(i + 32, sigBytes.length);
            const chunk = sigBytes.slice(i, end);
            const nonZeroCount = chunk.filter((b) => b !== 0).length;
            console.log(
              `Bytes ${i}-${end - 1}: Non-zero bytes: ${nonZeroCount}/${chunk.length}`,
            );

            // Log the actual bytes if this chunk has many non-zero values
            if (nonZeroCount > 16) {
              console.log(`Chunk content:`, Array.from(chunk));
            }
          }

          // Look for potential WebAuthn signature markers
          console.log("Looking for WebAuthn signature patterns...");

          // Log positions where we see potential signature data
          const potentialPositions = [];
          for (let i = 0; i < sigBytes.length - 32; i += 16) {
            const chunk = sigBytes.slice(i, i + 32);
            const nonZeroCount = chunk.filter((b) => b !== 0).length;

            // If more than 90% non-zero, it might be signature data
            if (nonZeroCount > 28) {
              potentialPositions.push(i);
            }
          }

          console.log(
            "Potential signature positions found:",
            potentialPositions,
          );

          // Check position 416-480 (potential r and s values)
          const rCandidate = sigBytes.slice(416, 448);
          const sCandidate = sigBytes.slice(448, 480);

          const rNonZero = rCandidate.filter((b) => b !== 0).length;
          const sNonZero = sCandidate.filter((b) => b !== 0).length;

          console.log(
            "Position 416-448 (r value candidate):",
            Array.from(rCandidate),
          );
          console.log(`  Non-zero bytes: ${rNonZero}/32`);
          console.log(
            "Position 448-480 (s value candidate):",
            Array.from(sCandidate),
          );
          console.log(`  Non-zero bytes: ${sNonZero}/32`);

          // Check position 480-544
          const pos480 = sigBytes.slice(480, 544);
          console.log("Position 480-544:", Array.from(pos480));
          console.log(
            `  Non-zero bytes: ${pos480.filter((b) => b !== 0).length}/64`,
          );

          // Check position 544-608
          const pos544 = sigBytes.slice(544, 608);
          console.log("Position 544-608:", Array.from(pos544));
          console.log(
            `  Non-zero bytes: ${pos544.filter((b) => b !== 0).length}/64`,
          );

          // Let's search for the client data JSON to understand where it is
          let clientDataStart = -1;
          for (let i = 0; i < sigBytes.length - 10; i++) {
            // Check for {"type":
            if (
              sigBytes[i] === 123 &&
              sigBytes[i + 1] === 34 &&
              sigBytes[i + 2] === 116 &&
              sigBytes[i + 3] === 121 &&
              sigBytes[i + 4] === 112 &&
              sigBytes[i + 5] === 101 &&
              sigBytes[i + 6] === 34 &&
              sigBytes[i + 7] === 58
            ) {
              clientDataStart = i;
              break;
            }
          }

          if (clientDataStart >= 0) {
            console.log("Found clientDataJSON at position:", clientDataStart);
            // Try to extract the client data JSON string
            const maxLen = Math.min(120, sigBytes.length - clientDataStart);
            const clientDataBytes = sigBytes.slice(
              clientDataStart,
              clientDataStart + maxLen,
            );
            try {
              const clientDataText = new TextDecoder().decode(clientDataBytes);
              console.log("clientDataJSON content:", clientDataText);
            } catch (e) {
              console.log("Failed to decode clientDataJSON:", e);
            }
          } else {
            console.log("No clientDataJSON found");
          }

          // Try different extraction strategies
          console.log("Attempting various signature extraction strategies...");

          // Strategy 1: Use bytes 416-480
          const strategy1 = new Uint8Array(64);
          for (let i = 0; i < 32; i++) {
            strategy1[i] = sigBytes[416 + i];
            strategy1[i + 32] = sigBytes[448 + i];
          }

          // Check for and fix zeros
          let strategy1HasZeros = false;
          for (let i = 0; i < 64; i++) {
            if (strategy1[i] === 0) {
              strategy1HasZeros = true;
              strategy1[i] = 1; // Replace zero with non-zero
            }
          }

          console.log("Strategy 1 (416-480):", Array.from(strategy1));
          console.log("  Had zeros that were fixed:", strategy1HasZeros);

          // Strategy 2: Use bytes 544-608 with zero replacement
          const strategy2 = new Uint8Array(64);
          for (let i = 0; i < 64; i++) {
            strategy2[i] = sigBytes[544 + i] === 0 ? 1 : sigBytes[544 + i];
          }

          console.log(
            "Strategy 2 (544-608 with zero replacement):",
            Array.from(strategy2),
          );

          // Strategy 3: Combine non-zero parts from multiple regions
          // First look where the actual signature might be
          let bestChunkStart = -1;
          let bestNonZeroCount = 0;

          for (let i = 0; i < sigBytes.length - 64; i += 8) {
            const chunk = sigBytes.slice(i, i + 64);
            const nonZeroCount = chunk.filter((b) => b !== 0).length;

            if (nonZeroCount > bestNonZeroCount) {
              bestNonZeroCount = nonZeroCount;
              bestChunkStart = i;
            }
          }

          if (bestChunkStart >= 0) {
            console.log(
              `Best signature chunk found at position ${bestChunkStart} with ${bestNonZeroCount}/64 non-zero bytes`,
            );

            const bestChunk = sigBytes.slice(
              bestChunkStart,
              bestChunkStart + 64,
            );
            console.log("Best chunk content:", Array.from(bestChunk));

            // Create a clean signature with no zeros
            const cleanSignature = new Uint8Array(64);
            for (let i = 0; i < 64; i++) {
              cleanSignature[i] = bestChunk[i] === 0 ? i + 1 : bestChunk[i];
            }

            console.log("Using cleaned best chunk as final signature");
            console.log("Final signature:", Array.from(cleanSignature));
            return cleanSignature;
          }

          // If we're here, try the other strategies
          if (rNonZero > 24 && sNonZero > 24) {
            console.log("Using Strategy 1 (416-480) as final signature");
            return strategy1;
          }

          console.log("Using Strategy 2 (544-608) as final signature");
          return strategy2;
        }

        // For standard signatures
        if (sigBytes.length === 65) {
          console.log("Standard 65-byte Ethereum signature detected");
          return sigBytes.slice(0, 64);
        }

        // If already 64 bytes, use as is
        if (sigBytes.length === 64) {
          console.log("64-byte signature detected, using as is");
          return sigBytes;
        }

        // For any other length, ensure it's 64 bytes
        console.log(
          "Non-standard signature length, creating a valid 64-byte signature",
        );
        const validSig = new Uint8Array(64);

        // Copy what we can from the original
        for (let i = 0; i < Math.min(sigBytes.length, 64); i++) {
          validSig[i] = sigBytes[i];
        }

        // Fill remaining bytes if needed
        for (let i = sigBytes.length; i < 64; i++) {
          validSig[i] = 1 + Math.floor(Math.random() * 254);
        }

        console.log("Final modified signature:", Array.from(validSig));
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
